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

    httpServer.listen(PORT, "0.0.0.0", () => {
      log(`Server running at http://0.0.0.0:${PORT}`);
    });
  } catch (e) {
    console.error("Startup failed", e);
    process.exit(1);
  }
  // Forced restart to pick up stock calculation fixes
})();
