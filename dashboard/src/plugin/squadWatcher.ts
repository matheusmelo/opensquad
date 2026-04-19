import type { Plugin } from "vite";

export function squadWatcherPlugin(): Plugin {
  return {
    name: "squad-watcher",
    configureServer(server) {
      const squadPath = process.env.OPENSQUAD_BASE_PATH || "C:/inetpub/opensquad";
      server.watcher.add(`${squadPath}/squads/**/*.json`);
      server.watcher.on("change", (file) => {
        if (file.includes("squads") || file.includes("state.json")) {
          server.ws.send({ type: "full-reload" });
        }
      });
    },
  };
}
