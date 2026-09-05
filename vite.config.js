import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { localOcrApiPlugin } from "./vite/localOcrApiPlugin.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of ["GEMINI_API_KEY", "GEMINI_MODEL", "GOOGLE_VISION_API_KEY"]) {
    if (env[key]) process.env[key] = env[key];
  }

  return {
    plugins: [react(), localOcrApiPlugin()],
  };
});
