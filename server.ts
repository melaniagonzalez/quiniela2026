import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import fs from "fs";
import app from "./server-app";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MATCH_OVERRIDES: Record<string, { actualHomeScore: number | null, actualAwayScore: number | null, status?: string }> = {
  "m537327": { actualHomeScore: 2, actualAwayScore: 0, status: "FINISHED" }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, headers: any, retries = 4, initialDelay = 2000): Promise<any> {
  let delayMs = initialDelay;
  for (let i = 0; i < retries; i++) {
    try {
      const requestHeaders = {
        ...headers,
        "Connection": "close",
        "User-Agent": "PGSimpleApp/1.0.0"
      };
      return await axios.get(url, { headers: requestHeaders, timeout: 12000 });
    } catch (err: any) {
      const status = err.response?.status;
      const isRateLimit = status === 429;
      const isTransientNetworkError = !err.response || err.code === "ECONNRESET" || err.code === "ETIMEDOUT" || err.message?.toLowerCase().includes("socket hang up") || err.message?.toLowerCase().includes("timeout");
      
      if ((isRateLimit || isTransientNetworkError) && i < retries - 1) {
        const errorDesc = isRateLimit ? "Rate-limited (429)" : `Transient network error (${err.code || err.message || 'unknown'})`;
        console.info(`[Task Scheduler Info] ${errorDesc} on ${url}. Retrying in ${delayMs / 1000}s... (Attempt ${i + 1}/${retries})`);
        await delay(delayMs);
        delayMs *= 2.5; // exponential backoff with slightly larger backoff
        continue;
      }
      throw err;
    }
  }
}

async function cronUpdateLocalConstants() {
  const apiKey = process.env.FOOTBALL_DATA_KEY;
  if (!apiKey || apiKey === "MY_API_KEY") {
    console.warn("FOOTBALL_DATA_KEY not configured. Skipping periodic background constants sync.");
    return;
  }

  const competition = "WC";
  try {
    console.log(`[Task Scheduler] Periodic check starting: Fetching World Cup data of 2026 to synchronize the local database file (constants.ts) sequentially...`);
    
    const headers = { "X-Auth-Token": apiKey };
    const matchesResponse = await fetchWithRetry(`https://api.football-data.org/v4/competitions/${competition}/matches`, headers);
    await delay(500);
    const teamsResponse = await fetchWithRetry(`https://api.football-data.org/v4/competitions/${competition}/teams`, headers);

    const teamsMap = new Map();
    const formattedTeams = teamsResponse.data.teams.map((t: any) => {
      const teamData = {
        id: `${t.id}`,
        name: t.name,
        flag: t.crest,
        group: "" 
      };
      teamsMap.set(t.id, teamData);
      return teamData;
    });

    const formattedMatches = matchesResponse.data.matches.map((m: any) => {
      const group = m.group ? m.group.replace('GROUP_', '') : m.stage;
      
      if (m.stage === 'GROUP_STAGE') {
        if (m.homeTeam?.id && teamsMap.has(m.homeTeam.id)) teamsMap.get(m.homeTeam.id).group = group;
        if (m.awayTeam?.id && teamsMap.has(m.awayTeam.id)) teamsMap.get(m.awayTeam.id).group = group;
      }

      let matchday = m.matchday;
      if (m.stage === "GROUP_STAGE") matchday = m.matchday || 1;
      else if (m.stage === "LAST_32") matchday = 4;
      else if (m.stage === "LAST_16") matchday = 5;
      else if (m.stage === "QUARTER_FINALS") matchday = 6;
      else if (m.stage === "SEMI_FINALS") matchday = 7;
      else if (m.stage === "FINAL" || m.stage === "THIRD_PLACE") matchday = 8;

      const matchId = `m${m.id}`;
      const override = MATCH_OVERRIDES[matchId];

      return {
        id: matchId,
        homeTeamId: m.homeTeam?.id ? `${m.homeTeam.id}` : null,
        awayTeamId: m.awayTeam?.id ? `${m.awayTeam.id}` : null,
        date: m.utcDate,
        group: group,
        stadium: m.venue || "TBD",
        matchday: matchday || 1,
        status: override?.status || m.status,
        actualHomeScore: override !== undefined 
          ? override.actualHomeScore 
          : ((m.score?.regularTime?.home !== null && m.score?.regularTime?.home !== undefined)
              ? (m.score.regularTime.home + (m.score.extraTime?.home ?? 0))
              : (m.score?.fullTime?.home ?? null)),
        actualAwayScore: override !== undefined 
          ? override.actualAwayScore 
          : ((m.score?.regularTime?.away !== null && m.score?.regularTime?.away !== undefined)
              ? (m.score.regularTime.away + (m.score.extraTime?.away ?? 0))
              : (m.score?.fullTime?.away ?? null))
      };
    });

    const finalTeams = Array.from(teamsMap.values());
    const filePath = path.join(process.cwd(), "src/constants.ts");
    
    const content = `import { Team, Match } from './types';
 
export const TEAMS: Team[] = ${JSON.stringify(finalTeams, null, 2)};
 
export const MATCHES: Match[] = ${JSON.stringify(formattedMatches, null, 2)};
`;

    fs.writeFileSync(filePath, content, "utf-8");
    console.log("[Task Scheduler] src/constants.ts has been successfully overwritten and synced with the latest World Cup database from the API!");
  } catch (err: any) {
    const status = err.response?.status || "unknown";
    const msg = err.response?.data?.message || err.message;
    console.warn(`[Task Scheduler Warn] World Cup constants synchronization failed (Status: ${status}). Message: ${msg}. Skipping fallback update this hour.`);
  }
}

async function startServer() {
  const PORT = 3000;

  // Run initial synchronization of local constants on server startup
  // Skip immediately in development to prevent API rate-limiting due to dev server restarts
  if (process.env.NODE_ENV === "production") {
    // In production, sync after 20 seconds to allow standard boot up
    setTimeout(cronUpdateLocalConstants, 20000);
  } else {
    console.log("[Task Scheduler] Skipping immediate startup sync in development to prevent API rate-limiting.");
  }
  // Set up hourly background task to keep the file synced with real-time data from the official API
  setInterval(cronUpdateLocalConstants, 1000 * 60 * 60);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    // Serve static assets but disable default index.html serving to prevent caching
    app.use(express.static(distPath, { index: false }));
    
    const sendIndexWithNoCache = (req: express.Request, res: express.Response) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path.join(distPath, "index.html"));
    };

    app.get("/", sendIndexWithNoCache);
    app.get("/index.html", sendIndexWithNoCache);
    app.get("*", sendIndexWithNoCache);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
