import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Settings, User, Bell, DollarSign, Plug } from "lucide-react";

export function SettingsPage() {
  return (
    <div className="p-6 overflow-y-auto w-full flex-1 bg-zinc-950">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
          <Settings className="h-6 w-6" /> Settings
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Configure your OpenSquad workspace</p>
      </header>

      <div className="max-w-3xl">
        <Tabs defaultValue="appearance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="appearance">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><span>🎨</span> Appearance</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">Theme</p>
                    <p className="text-xs text-zinc-500">Toggle between light, dark, and system themes</p>
                  </div>
                  <ThemeToggle />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-4 w-4" /> Account</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Name</label>
                  <Input placeholder="Your name" defaultValue="Mateus" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Email</label>
                  <Input placeholder="email@example.com" type="email" />
                </div>
                <Button variant="destructive" size="sm">Logout</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm text-zinc-300">
                <p>Configure which events trigger toasts and sounds.</p>
                <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                  <span>Task Completed</span>
                  <Badge variant="default">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                  <span>Task Failed</span>
                  <Badge variant="destructive">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                  <span>New AI Call</span>
                  <Badge variant="outline">Disabled</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="budget">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Daily Budget</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Max daily AI spend (USD)</label>
                  <Input type="number" defaultValue="5.00" step="0.50" />
                </div>
                <Button size="sm">Save Budget</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Plug className="h-4 w-4" /> Integrations</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">💬</span>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">WhatsApp</p>
                      <p className="text-xs text-zinc-500">Bot relay via MCP server</p>
                    </div>
                  </div>
                  <Badge variant="working">Connected</Badge>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📡</span>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">Orchestrator API</p>
                      <p className="text-xs text-zinc-500">localhost:3001</p>
                    </div>
                  </div>
                  <Badge variant="working">Online</Badge>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🧠</span>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">Dialagram (Qwen 3.6+)</p>
                      <p className="text-xs text-zinc-500">LLM inference provider</p>
                    </div>
                  </div>
                  <Badge variant="done">Active</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
