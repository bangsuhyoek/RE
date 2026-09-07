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

  const geminiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || "";
  const geminiModel = env.VITE_GEMINI_MODEL || env.GEMINI_MODEL || "gemini-3.5-flash";

  return {
    plugins: [react(), localOcrApiPlugin()],
    define: {
      "import.meta.env.VITE_GEMINI_API_KEY": JSON.stringify(geminiKey),
      "import.meta.env.VITE_GEMINI_MODEL": JSON.stringify(geminiModel),
    },
  };
});
