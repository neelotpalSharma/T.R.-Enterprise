import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { authRouter } from "./server/auth";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security & parsing middlewares
  app.use(cors());
  app.use(express.json());

  // Mount Auth & Backend API Routes FIRST
  app.use("/api/auth", authRouter);

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      service: "T R Enterprise Secure Auth & POS API",
      timestamp: new Date().toISOString(),
      authEndpoints: [
        "POST /api/auth/register",
        "POST /api/auth/verify-otp",
        "GET /api/auth/verify-token",
        "POST /api/auth/resend-verification",
        "POST /api/auth/login",
        "GET /api/auth/me",
        "GET /api/auth/recent-emails",
        "GET /api/auth/schema"
      ]
    });
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
