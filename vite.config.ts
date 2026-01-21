import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Optional Replit plugins - only load in development
const getReplitPlugins = async () => {
  if (process.env.NODE_ENV === "production" || !process.env.REPL_ID) {
    return [];
  }

  try {
    const [errorModal, cartographer, devBanner] = await Promise.all([
      import("@replit/vite-plugin-runtime-error-modal").catch(() => null),
      import("@replit/vite-plugin-cartographer").catch(() => null),
      import("@replit/vite-plugin-dev-banner").catch(() => null),
    ]);

    return [
      errorModal?.default?.(),
      cartographer?.cartographer?.(),
      devBanner?.devBanner?.(),
    ].filter(Boolean);
  } catch {
    return [];
  }
};

export default defineConfig(async () => ({
  plugins: [
    react(),
    ...(await getReplitPlugins()),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
}));
