import express, { type Express } from "express";
import fs from "fs";
import path from "path";

import { fileURLToPath } from "url";

export function serveStatic(app: Express) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const distPath = path.resolve(__dirname, "..", "dist");
  if (!fs.existsSync(distPath)) {
    console.error(`❌ Static files directory not found: ${distPath}`);
  }

  app.use(express.static(distPath));

  // FALLBACK: Serve index.html for all non-API routes (SPA support)
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
