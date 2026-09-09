import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { localOcrApiPlugin } from "./vite/localOcrApiPlugin.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (env.GOOGLE_VISION_API_KEY) {
    process.env.GOOGLE_VISION_API_KEY = env.GOOGLE_VISION_API_KEY;
  }

  return {
    plugins: [react(), localOcrApiPlugin()],
  };
});
