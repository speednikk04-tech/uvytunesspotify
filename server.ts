import express from "express";
import path from "path";
import app, { hostedStore, refreshHostedItem } from "./api/app.ts";

async function startServer() {
  const PORT = 3000;

  // Background Daily Auto-Refresh Job (runs every 1 hour on continuous servers)
  setInterval(async () => {
    try {
      const now = new Date();
      for (const item of Object.values(hostedStore)) {
        if (item.autoUpdateDaily && new Date(item.nextRefreshAt) <= now) {
          console.log(`[Scheduled Daily Job] Triggering daily refresh for ${item.slug}`);
          await refreshHostedItem(item.id);
        }
      }
    } catch (err: any) {
      console.error("[Scheduled Daily Job Error]:", err.message);
    }
  }, 60 * 60 * 1000);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== '1') {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // @ts-ignore
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

const isServerless = process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

if (!isServerless) {
  startServer();
}

export default app;
