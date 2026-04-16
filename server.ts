import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Simple in-memory cache
  let cache: { data: any; timestamp: number } | null = null;
  const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

  app.get("/api/world-cup-data", async (req, res) => {
    const now = Date.now();
    
    if (cache && now - cache.timestamp < CACHE_DURATION) {
      console.log("Serving from cache");
      return res.json(cache.data);
    }

    const apiKey = process.env.APISPORTS_KEY;
    if (!apiKey || apiKey === "MY_APISPORTS_KEY") {
      return res.status(500).json({ error: "APISPORTS_KEY not configured" });
    }

    try {
      // League 1 is World Cup, Season 2022 (latest completed)
      // In a real 2026 scenario, we would use 2026
      const response = await axios.get("https://v3.football.api-sports.io/fixtures", {
        params: { league: "1", season: "2022" },
        headers: {
          "x-apisports-key": apiKey,
        },
      });

      cache = { data: response.data, timestamp: now };
      res.json(response.data);
    } catch (error: any) {
      console.error("Error fetching World Cup data:", error.message);
      res.status(500).json({ error: "Failed to fetch data from API-Football" });
    }
  });

  // Vite middleware for development
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

startServer();
