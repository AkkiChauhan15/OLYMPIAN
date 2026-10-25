import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api": {
          target: env.API_PROXY_TARGET || "http://localhost:5000",
          changeOrigin: true,
        },
      },
    },
    build: {
      rolldownOptions: {
        output: {
          manualChunks(moduleId) {
            if (
              moduleId.includes("/recharts/") ||
              moduleId.includes("/d3-") ||
              moduleId.includes("/victory-vendor/")
            )
              return "charts";
            if (
              moduleId.includes("/motion-dom/") ||
              moduleId.includes("/framer-motion/")
            )
              return "motion";
          },
        },
      },
    },
  };
});
