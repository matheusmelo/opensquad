-- 1. SQUADS table
CREATE TABLE public.squads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Users',
  triggers TEXT[] NOT NULL DEFAULT '{}',
  pipeline_file TEXT,
  response_max_chars INTEGER NOT NULL DEFAULT 1500,
  auto_run BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'idle',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, code)
);

ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view squads" ON public.squads FOR SELECT
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners insert squads" ON public.squads FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update squads" ON public.squads FOR UPDATE
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners delete squads" ON public.squads FOR DELETE
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_squads_updated
  BEFORE UPDATE ON public.squads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. AGENTS: new columns + new status enum
CREATE TYPE public.agent_status_v2 AS ENUM ('idle','working','delivering','done','checkpoint');

ALTER TABLE public.agents
  ADD COLUMN squad_id UUID REFERENCES public.squads(id) ON DELETE SET NULL,
  ADD COLUMN role TEXT,
  ADD COLUMN gender TEXT DEFAULT 'neutral',
  ADD COLUMN desk_col INTEGER DEFAULT 0,
  ADD COLUMN desk_row INTEGER DEFAULT 0,
  ADD COLUMN status_v2 public.agent_status_v2 NOT NULL DEFAULT 'idle';

UPDATE public.agents SET status_v2 = CASE
  WHEN status::text = 'active' THEN 'idle'::public.agent_status_v2
  WHEN status::text = 'paused' THEN 'checkpoint'::public.agent_status_v2
  WHEN status::text = 'error' THEN 'done'::public.agent_status_v2
  ELSE 'idle'::public.agent_status_v2
END;

ALTER TABLE public.agents DROP COLUMN status;
ALTER TABLE public.agents RENAME COLUMN status_v2 TO status;
DROP TYPE public.agent_status;
ALTER TYPE public.agent_status_v2 RENAME TO agent_status;

-- 3. RUNS: pipeline tracking
ALTER TABLE public.runs
  ADD COLUMN step_current INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN step_total INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN step_label TEXT,
  ADD COLUMN pipeline_file TEXT,
  ADD COLUMN squad_id UUID REFERENCES public.squads(id) ON DELETE SET NULL;

-- 4. HANDOFFS table
CREATE TABLE public.handoffs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  from_agent UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  to_agent UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  message TEXT,
  step_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.handoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View handoffs if owns run agent" ON public.handoffs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.runs r
    JOIN public.agents a ON a.id = r.agent_id
    WHERE r.id = handoffs.run_id
      AND (a.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Insert handoffs if owns run agent" ON public.handoffs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.runs r
    JOIN public.agents a ON a.id = r.agent_id
    WHERE r.id = handoffs.run_id AND a.owner_id = auth.uid()
  ));

CREATE POLICY "Update handoffs if owns run agent" ON public.handoffs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.runs r
    JOIN public.agents a ON a.id = r.agent_id
    WHERE r.id = handoffs.run_id AND a.owner_id = auth.uid()
  ));

CREATE INDEX idx_handoffs_run ON public.handoffs(run_id);
CREATE INDEX idx_agents_squad ON public.agents(squad_id);
CREATE INDEX idx_runs_squad ON public.runs(squad_id);