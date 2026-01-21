import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { serveStatic } from "./static";
import cors from "cors";

const app = express();

/* -------------------- TYPES -------------------- */
declare module "http" {
  interface IncomingMessage {
    rawBody?: unknown;
  }
}

/* -------------------- MIDDLEWARE -------------------- */
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: false }));

/* -------------------- LOGGER -------------------- */
function log(message: string, source = "express") {
  const time = new Date().toLocaleTimeString();
  console.log(`${time} [${source}] ${message}`);
}

/* -------------------- REQUEST LOG -------------------- */
app.use((req, res, next) => {
  const start = Date.now();
  const originalJson = res.json;

  res.json = function (body: any) {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
    return originalJson.call(this, body);
  };

  next();
});

// Auth setup
setupAuth(app);

// API routes - MUST AWAIT to ensure routes are ready
await registerRoutes(null, app);

// API 404 handler - prevents API calls from hitting SPA fallback
app.use("/api/*", (req, res) => {
  res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

/* -------------------- FRONTEND -------------------- */
if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
  // Production: serve built frontend (only if not on Vercel)
  serveStatic(app);
}

/* -------------------- STARTUP LOGIC -------------------- */
if (process.env.VERCEL) {
  // Vercel handles this via api/index.ts, do nothing here.
} else if (process.env.NODE_ENV === "production") {
  const { createServer } = await import("http");
  const httpServer = createServer(app);
  // Hostinger provides the PORT automatically
  const PORT = Number(process.env.PORT) || 3000;

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`\n-----------------------------------------`);
    console.log(`🚀 APP STARTED SUCCESSFULLY`);
    console.log(`📡 Listening on: http://0.0.0.0:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`-----------------------------------------\n`);
  });
} else {
  // 🛠️ DEVELOPMENT
  const { createServer } = await import("http");
  const { setupVite } = await import("./vite");
  const httpServer = createServer(app);
  const PORT = Number(process.env.PORT) || 5000;

  await setupVite(httpServer, app);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Local Dev Server running at http://localhost:${PORT}`);
  });
}

export default app;
