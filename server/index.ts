import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { serveStatic } from "./static";

const app = express();
const httpServer = createServer(app);

/* -------------------- TYPES -------------------- */
declare module "http" {
  interface IncomingMessage {
    rawBody?: unknown;
  }
}

/* -------------------- MIDDLEWARE -------------------- */
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

/* -------------------- BOOTSTRAP -------------------- */
(async () => {
  try {
    // Auth setup
    setupAuth(app);

    // API routes
    await registerRoutes(httpServer, app);

    // Error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error(err);
      res.status(err.status || 500).json({
        message: err.message || "Internal Server Error",
      });
    });

    /* -------------------- FRONTEND -------------------- */
    if (process.env.NODE_ENV === "production") {
      // Production: serve built frontend
      serveStatic(app);
      log("Serving static frontend", "static");
    } else {
      // Development: attach Vite frontend
      try {
        const { setupVite } = await import("./vite");
        await setupVite(httpServer, app);
        log("Vite frontend attached", "vite");
      } catch (e) {
        console.error("Vite setup failed", e);
      }
    }

    /* -------------------- SERVER -------------------- */
    const PORT = Number(process.env.PORT) || 5000;

    // Health check endpoint for keep-alive
    app.get('/api/health', (_req, res) => {
      res.status(200).json({ status: 'ok' });
    });

    httpServer.listen(PORT, "0.0.0.0", () => {
      log(`Server running at http://0.0.0.0:${PORT}`);
    });

    // Keep-Alive Mechanism for Render Free Tier
    const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
    if (RENDER_EXTERNAL_URL) {
      log(`Starting Keep-Alive for ${RENDER_EXTERNAL_URL}`, "keep-alive");
      const intervalMs = 14 * 60 * 1000; // 14 minutes (Render sleeps after 15)

      setInterval(async () => {
        try {
          const { default: axios } = await import("axios");
          await axios.get(`${RENDER_EXTERNAL_URL}/api/health`);
          log("Keep-Alive ping success", "keep-alive");
        } catch (e: any) {
          log(`Keep-Alive ping failed: ${e.message}`, "keep-alive");
        }
      }, intervalMs);
    }
  } catch (e) {
    console.error("Startup failed", e);
    process.exit(1);
  }
})();
