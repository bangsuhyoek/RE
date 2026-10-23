import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { localOcrApiPlugin } from "./vite/localOcrApiPlugin.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (env.GOOGLE_VISION_API_KEY) {
    process.env.GOOGLE_VISION_API_KEY = env.GOOGLE_VISION_API_KEY;
  }
  if (env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  }
  if (env.SUPABASE_URL || env.VITE_SUPABASE_URL) {
    process.env.SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    process.env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  }
  if (env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY) {
    process.env.SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
    process.env.VITE_SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  }

  const geminiModel = env.VITE_GEMINI_MODEL || env.GEMINI_MODEL || "gemini-3.5-flash-lite";

  return {
    plugins: [react(), localOcrApiPlugin()],
    server: {
      host: "127.0.0.1",
      port: 3000,
    },
    define: {
      "import.meta.env.VITE_GEMINI_MODEL": JSON.stringify(geminiModel),
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
              return "react-vendor";
            }
            if (id.includes("node_modules/@supabase/")) {
              return "supabase-vendor";
            }
            if (id.includes("node_modules/@capacitor/")) {
              return "capacitor-vendor";
            }
            if (id.includes("node_modules/lucide-react/")) {
              return "icons-vendor";
            }
          },
        },
      },
    },
  };
});
