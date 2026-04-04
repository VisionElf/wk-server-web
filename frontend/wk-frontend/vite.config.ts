import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const usePoll =
  process.env.VITE_DEV_POLLING === "1" ||
  process.env.CHOKIDAR_USEPOLLING === "true";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Avoid HMR WebSocket / origin mismatches (localhost vs 127.0.0.1 vs LAN IP).
    host: true,
    port: 5173,
    ...(usePoll && {
      watch: {
        usePolling: true,
        interval: 300,
      },
    }),
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5122",
        changeOrigin: true,
      },
    },
  },
});
