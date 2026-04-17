import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import firebase config to allow backend to interact if needed
// though for now we'll simulate the DB storage or use a proxy
// Since it's a sandbox, we'll keep it simple: the server acts as a proxy for the free API

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Simple in-memory cache for data
  let worldCupCache: { teams: any[]; matches: any[]; standings: any[]; scorers: any[]; timestamp: number } | null = null;
  const CACHE_DURATION = 1000 * 60 * 60 * 6; // 6 hours

  app.get("/api/world-cup-sync", async (req, res) => {
    const now = Date.now();
    
    if (worldCupCache && now - worldCupCache.timestamp < CACHE_DURATION) {
      console.log("Serving World Cup data from sync cache");
      return res.json(worldCupCache);
    }

    const apiKey = process.env.FOOTBALL_DATA_KEY;
    if (!apiKey || apiKey === "MY_API_KEY") {
      console.warn("FOOTBALL_DATA_KEY not configured. Returning empty data.");
      return res.json({ teams: [], matches: [] });
    }

    try {
      console.log("Fetching fresh data from football-data.org...");
      
      // Fetch Matches
      const matchesResponse = await axios.get("https://api.football-data.org/v4/competitions/WC/matches", {
        headers: { "X-Auth-Token": apiKey }
      });

      // Fetch Teams
      const teamsResponse = await axios.get("https://api.football-data.org/v4/competitions/WC/teams", {
        headers: { "X-Auth-Token": apiKey }
      });

      // Fetch Official Standings
      const standingsResponse = await axios.get("https://api.football-data.org/v4/competitions/WC/standings", {
        headers: { "X-Auth-Token": apiKey }
      });

      // Fetch Scorers
      const scorersResponse = await axios.get("https://api.football-data.org/v4/competitions/WC/scorers", {
        headers: { "X-Auth-Token": apiKey }
      });

      const teamsMap = new Map();
      const formattedTeams = teamsResponse.data.teams.map((t: any) => {
        const teamData = {
          id: `${t.id}`,
          name: t.name,
          shortName: t.shortName,
          tla: t.tla,
          flag: t.crest,
          group: "" 
        };
        teamsMap.set(t.id, teamData);
        return teamData;
      });

      const formattedMatches = matchesResponse.data.matches.map((m: any) => {
        const group = m.group ? m.group.replace('GROUP_', '') : m.stage;
        
        if (m.stage === 'GROUP_STAGE') {
          if (teamsMap.has(m.homeTeam.id)) teamsMap.get(m.homeTeam.id).group = group;
          if (teamsMap.has(m.awayTeam.id)) teamsMap.get(m.awayTeam.id).group = group;
        }

        return {
          id: `m${m.id}`,
          homeTeamId: m.homeTeam?.id ? `${m.homeTeam.id}` : null,
          awayTeamId: m.awayTeam?.id ? `${m.awayTeam.id}` : null,
          homeTeamName: m.homeTeam?.name || "TBD",
          awayTeamName: m.awayTeam?.name || "TBD",
          homeTeamLogo: m.homeTeam?.crest || null,
          awayTeamLogo: m.awayTeam?.crest || null,
          date: m.utcDate,
          group: group,
          stage: m.stage,
          stadium: m.venue || "TBD",
          matchday: m.matchday,
          status: m.status,
          actualHomeScore: m.score.fullTime.home,
          actualAwayScore: m.score.fullTime.away
        };
      });

      worldCupCache = { 
        teams: Array.from(teamsMap.values()), 
        matches: formattedMatches,
        standings: standingsResponse.data.standings,
        scorers: scorersResponse.data.scorers,
        timestamp: now 
      };
      
      res.json(worldCupCache);
    } catch (error: any) {
      console.error("Error syncing football-data.org:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to sync data from football-data.org" });
    }
  });

  // Legacy individual endpoints for backward compatibility
  app.get("/api/world-cup-results", async (req, res) => {
    // Return just matches from the common cache or fetch if needed
    if (!worldCupCache) {
      return res.redirect("/api/world-cup-sync");
    }
    res.json({ matches: worldCupCache.matches.map(m => ({
      ...m,
      // Restore format expected by News tab
      homeTeam: { name: worldCupCache?.teams.find(t => t.id === m.homeTeamId)?.name, logo: worldCupCache?.teams.find(t => t.id === m.homeTeamId)?.flag },
      awayTeam: { name: worldCupCache?.teams.find(t => t.id === m.awayTeamId)?.name, logo: worldCupCache?.teams.find(t => t.id === m.awayTeamId)?.flag },
      homeScore: m.actualHomeScore,
      awayScore: m.actualAwayScore
    })) });
  });

  app.get("/api/world-cup-data", async (req, res) => {
    res.redirect("/api/world-cup-sync");
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
