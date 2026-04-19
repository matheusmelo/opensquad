-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'member');
CREATE TYPE public.agent_status AS ENUM ('active', 'paused', 'error', 'draft');
CREATE TYPE public.task_status AS ENUM ('backlog', 'queued', 'running', 'done', 'failed');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.run_status AS ENUM ('queued', 'running', 'success', 'failed', 'cancelled');
CREATE TYPE public.log_level AS ENUM ('debug', 'info', 'warn', 'error');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- handle new user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- AGENTS
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  system_prompt TEXT,
  params JSONB NOT NULL DEFAULT '{"temperature":0.7,"max_tokens":2048}'::jsonb,
  status agent_status NOT NULL DEFAULT 'draft',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view agents" ON public.agents FOR SELECT USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners insert agents" ON public.agents FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update agents" ON public.agents FOR UPDATE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners delete agents" ON public.agents FOR DELETE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_agents_updated BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_agents_owner ON public.agents(owner_id);

-- SKILLS (catalog: built-in + custom per-user)
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Skills visible to all auth users" ON public.skills FOR SELECT TO authenticated USING (is_custom = false OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners insert custom skills" ON public.skills FOR INSERT WITH CHECK (auth.uid() = owner_id AND is_custom = true);
CREATE POLICY "Owners update own skills" ON public.skills FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners delete own skills" ON public.skills FOR DELETE USING (auth.uid() = owner_id);
CREATE TRIGGER trg_skills_updated BEFORE UPDATE ON public.skills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AGENT_SKILLS
CREATE TABLE public.agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, skill_id)
);
ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View agent skills if owns agent" ON public.agent_skills FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND (a.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Manage agent skills if owns agent" ON public.agent_skills FOR ALL USING (
  EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.owner_id = auth.uid())
);

-- TASKS
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority task_priority NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'backlog',
  due_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  progress INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own tasks" ON public.tasks FOR SELECT USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Insert own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Update own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Delete own tasks" ON public.tasks FOR DELETE USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_agent ON public.tasks(agent_id);

-- RUNS
CREATE TABLE public.runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  status run_status NOT NULL DEFAULT 'queued',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  tokens_in INT NOT NULL DEFAULT 0,
  tokens_out INT NOT NULL DEFAULT 0,
  cost NUMERIC(10,6) NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View runs if owns agent" ON public.runs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND (a.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Insert runs if owns agent" ON public.runs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.owner_id = auth.uid())
);
CREATE POLICY "Update runs if owns agent" ON public.runs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.owner_id = auth.uid())
);
CREATE POLICY "Delete runs if owns agent" ON public.runs FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.owner_id = auth.uid())
);
CREATE INDEX idx_runs_agent ON public.runs(agent_id);
CREATE INDEX idx_runs_started ON public.runs(started_at DESC);

-- RUN LOGS
CREATE TABLE public.run_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  level log_level NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.run_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View logs if owns run agent" ON public.run_logs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.runs r JOIN public.agents a ON a.id = r.agent_id
    WHERE r.id = run_id AND (a.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);
CREATE POLICY "Insert logs if owns run agent" ON public.run_logs FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.runs r JOIN public.agents a ON a.id = r.agent_id
    WHERE r.id = run_id AND a.owner_id = auth.uid()
  )
);
CREATE INDEX idx_run_logs_run ON public.run_logs(run_id, ts DESC);

-- Seed built-in skills (global, owner_id = null, is_custom = false)
INSERT INTO public.skills (owner_id, name, description, icon, is_custom) VALUES
  (NULL, 'Web Search', 'Search the web for up-to-date information', 'Globe', false),
  (NULL, 'Email', 'Send and receive emails', 'Mail', false),
  (NULL, 'Slack', 'Post messages and read channels in Slack', 'MessageSquare', false),
  (NULL, 'Database Query', 'Query SQL databases', 'Database', false),
  (NULL, 'Code Exec', 'Execute sandboxed code', 'Terminal', false),
  (NULL, 'Custom API', 'Call arbitrary HTTP APIs', 'Webhook', false),
  (NULL, 'File Read', 'Read files from storage', 'FileText', false),
  (NULL, 'Calendar', 'Manage calendar events', 'Calendar', false);