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

// API routes
registerRoutes(null, app).catch(e => {
  console.error("Failed to register routes:", e);
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

/* -------------------- SERVER -------------------- */
// ✅ VERCEL ONLY - No traditional server needed!
// Vercel handles all server infrastructure automatically

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', environment: 'local-development' });
});

// ✅ LOCAL DEVELOPMENT ONLY
// This listener is required for 'npm run dev' to work on your machine.
// Vercel ignores this file and uses api/index.ts instead.
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const { createServer } = await import("http");
  const httpServer = createServer(app);
  const PORT = Number(process.env.PORT) || 5000;

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Local Server running at http://localhost:${PORT}`);
    console.log(`📝 API available at http://localhost:${PORT}/api`);
  });
}

export default app;
