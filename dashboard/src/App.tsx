import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Overview from "./pages/Overview";
import Agents from "./pages/Agents";
import AgentDetail from "./pages/AgentDetail";
import Squads from "./pages/Squads";
import SquadDetail from "./pages/SquadDetail";
import Skills from "./pages/Skills";
import Tasks from "./pages/Tasks";
import Runs from "./pages/Runs";
import Costs from "./pages/Costs";
import Command from "./pages/Command";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner theme="dark" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={<ProtectedRoute><AppLayout><Overview /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/agents"
              element={<ProtectedRoute><AppLayout><Agents /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/agents/:id"
              element={<ProtectedRoute><AppLayout><AgentDetail /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/squads"
              element={<ProtectedRoute><AppLayout><Squads /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/squads/:code"
              element={<ProtectedRoute><AppLayout><SquadDetail /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/skills"
              element={<ProtectedRoute><AppLayout><Skills /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/tasks"
              element={<ProtectedRoute><AppLayout><Tasks /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/runs"
              element={<ProtectedRoute><AppLayout><Runs /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/command"
              element={<ProtectedRoute><AppLayout><Command /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/costs"
              element={<ProtectedRoute><AppLayout><Costs /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/settings"
              element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
