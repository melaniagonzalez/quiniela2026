import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { APP_VERSION } from "./src/version";

dotenv.config();

const app = express();
app.use(express.json());

// Cache for different competitions
let competitionsCache: Record<string, { teams: any[]; matches: any[]; standings: any[]; scorers: any[]; players?: any[]; timestamp: number }> = {};
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

const TEAM_TRANSLATIONS: Record<string, string> = {
  "Croatia": "Croacia",
  "Germany": "Alemania",
  "Spain": "España",
  "France": "Francia",
  "Brazil": "Brasil",
  "Italy": "Italia",
  "Japan": "Japón",
  "Morocco": "Marruecos",
  "Netherlands": "Países Bajos",
  "Switzerland": "Suiza",
  "Poland": "Polonia",
  "Denmark": "Dinamarca",
  "Belgium": "Bélgica",
  "Portugal": "Portugal",
  "Argentina": "Argentina",
  "England": "Inglaterra",
  "United States": "Estados Unidos",
  "USA": "EE. UU.",
  "Mexico": "México",
  "Uruguay": "Uruguay",
  "Saudi Arabia": "Arabia Saudita",
  "Tunisia": "Túnez",
  "Senegal": "Senegal",
  "South Korea": "Corea del Sur",
  "Ecuador": "Ecuador",
  "Canada": "Canadá",
  "Sweden": "Suecia",
  "Czechia": "República Checa",
  "Turkey": "Turquía",
  "Colombia": "Colombia",
  "Egypt": "Egipto",
  "Norway": "Noruega",
  "Scotland": "Escocia",
  "Wales": "Gales",
  "Iran": "Irán",
  "Qatar": "Qatar",
  "Australia": "Australia",
  "Algeria": "Argelia",
  "New Zealand": "Nueva Zelanda",
  "South Africa": "Sudáfrica",
  "Paraguay": "Paraguay",
  "Ghana": "Ghana",
  "Bosnia-Herzegovina": "Bosnia y Herzegovina",
  "Panama": "Panamá",
  "Cape Verde Islands": "Cabo Verde",
  "Congo DR": "RD Congo",
  "Ivory Coast": "Costa de Marfil",
  "Jordan": "Jordania",
  "Iraq": "Irak",
  "Uzbekistan": "Uzbekistán",
  "Austria": "Austria",
  "Ukraine": "Ucrania",
  "Slovakia": "Eslovaquia",
  "Slovenia": "Eslovenia",
  "Romania": "Rumania",
  "Georgia": "Georgia",
  "Albania": "Albania",
  "Hungary": "Hungría",
  "Serbia": "Serbia",
  "Greece": "Grecia",
  "Haiti": "Haití",
  "Curaçao": "Curazao"
};

const translateTeamName = (name: string): string => {
  if (!name) return name;
  return TEAM_TRANSLATIONS[name] || TEAM_TRANSLATIONS[name.trim()] || name;
};

app.get("/api/db-status", (req, res) => {
  try {
    const filePath = path.join(process.cwd(), "src/constants.ts");
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return res.json({ lastUpdated: stats.mtime.toISOString() });
    }
    return res.json({ lastUpdated: null });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/time", (req, res) => {
  res.json({ serverTime: new Date().toISOString() });
});

// Generate a unique, static version ID based on the production build output.
// Since the built assets (under /dist) are identical on all server replicas spawned from the same deployment image,
// this hash is guaranteed to remain perfectly uniform across concurrent active instances.
let appVersion = APP_VERSION;
if (appVersion === "dev" || !appVersion) {
  try {
    const versionPath = path.join(process.cwd(), "dist/version.txt");
    if (fs.existsSync(versionPath)) {
      appVersion = fs.readFileSync(versionPath, "utf-8").trim();
    } else {
      const distIndexPath = path.join(process.cwd(), "dist/index.html");
      if (fs.existsSync(distIndexPath)) {
        const fileBuffer = fs.readFileSync(distIndexPath);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        appVersion = hashSum.digest('hex').substring(0, 16);
      } else {
        // Fallback for local development environment
        const devPath = path.join(process.cwd(), "src/App.tsx");
        if (fs.existsSync(devPath)) {
          const fileBuffer = fs.readFileSync(devPath);
          const hashSum = crypto.createHash('sha256');
          hashSum.update(fileBuffer);
          appVersion = "dev-" + hashSum.digest('hex').substring(0, 12);
        }
      }
    }
  } catch (e) {
    console.warn("Failed to generate deployment-based version hash:", e);
  }
}

app.get("/api/version", (req, res) => {
  res.json({ version: appVersion });
});

app.get("/api/sync/:competition", async (req, res) => {
  const competition = (req.params.competition || "WC").toUpperCase();
  const now = Date.now();
  
  if (competitionsCache[competition] && now - competitionsCache[competition].timestamp < CACHE_DURATION) {
    console.log(`Serving ${competition} data from cache`);
    return res.json(competitionsCache[competition]);
  }

  const apiKey = process.env.FOOTBALL_DATA_KEY;
  if (!apiKey || apiKey === "MY_API_KEY") {
    console.warn("FOOTBALL_DATA_KEY not configured. Returning empty data.");
    return res.json({ teams: [], matches: [] });
  }

  try {
    console.log(`Fetching fresh ${competition} data from football-data.org...`);
    
    const [matchesResponse, teamsResponse, standingsResponse, scorersResponse] = await Promise.all([
      axios.get(`https://api.football-data.org/v4/competitions/${competition}/matches`, { headers: { "X-Auth-Token": apiKey } }),
      axios.get(`https://api.football-data.org/v4/competitions/${competition}/teams`, { headers: { "X-Auth-Token": apiKey } }),
      axios.get(`https://api.football-data.org/v4/competitions/${competition}/standings`, { headers: { "X-Auth-Token": apiKey } }),
      axios.get(`https://api.football-data.org/v4/competitions/${competition}/scorers`, { headers: { "X-Auth-Token": apiKey } })
    ]);

    const teamsMap = new Map();
    const formattedTeams = teamsResponse.data.teams.map((t: any) => {
      const teamData = {
        id: `${t.id}`,
        name: translateTeamName(t.name),
        shortName: translateTeamName(t.shortName || t.name),
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
        if (m.homeTeam?.id && teamsMap.has(m.homeTeam.id)) teamsMap.get(m.homeTeam.id).group = group;
        if (m.awayTeam?.id && teamsMap.has(m.awayTeam.id)) teamsMap.get(m.awayTeam.id).group = group;
      }

      let matchday = m.matchday;
      if (competition === "CL") {
        if (m.stage === "LEAGUE_STAGE") {
          matchday = m.matchday || 1;
        } else if (m.stage === "KNOCKOUT_STAGE_PLAY_OFFS") {
          matchday = 8 + (m.matchday || 1); // 9, 10
        } else if (m.stage === "ROUND_OF_16") {
          matchday = 10 + (m.matchday || 1); // 11, 12
        } else if (m.stage === "QUARTER_FINALS") {
          matchday = 12 + (m.matchday || 1); // 13, 14
        } else if (m.stage === "SEMI_FINALS") {
          matchday = 14 + (m.matchday || 1); // 15, 16
        } else if (m.stage === "FINAL") {
          matchday = 17;
        }
      } else if (competition === "WC") {
        // World Cup 2026 Stages mapping to sequential days
        if (m.stage === "GROUP_STAGE") matchday = m.matchday || 1;
        else if (m.stage === "LAST_32") matchday = 4;
        else if (m.stage === "LAST_16") matchday = 5;
        else if (m.stage === "QUARTER_FINALS") matchday = 6;
        else if (m.stage === "SEMI_FINALS") matchday = 7;
        else if (m.stage === "FINAL" || m.stage === "THIRD_PLACE") matchday = 8;
      }

      return {
        id: `m${m.id}`,
        homeTeamId: m.homeTeam?.id ? `${m.homeTeam.id}` : null,
        awayTeamId: m.awayTeam?.id ? `${m.awayTeam.id}` : null,
        homeTeamName: translateTeamName(m.homeTeam?.name) || "TBD",
        awayTeamName: translateTeamName(m.awayTeam?.name) || "TBD",
        homeTeamLogo: m.homeTeam?.crest || null,
        awayTeamLogo: m.awayTeam?.crest || null,
        date: m.utcDate,
        group: group,
        stage: m.stage,
        stadium: m.venue || "TBD",
        matchday: matchday || 1,
        status: m.status,
        actualHomeScore: m.score.fullTime.home,
        actualAwayScore: m.score.fullTime.away
      };
    });

    const translatedStandings = (standingsResponse.data.standings || []).map((s: any) => {
      if (!s.table) return s;
      return {
        ...s,
        table: s.table.map((row: any) => {
          if (!row.team) return row;
          return {
            ...row,
            team: {
              ...row.team,
              name: translateTeamName(row.team.name),
              shortName: translateTeamName(row.team.shortName || row.team.name)
            }
          };
        })
      };
    });

    const translatedScorers = (scorersResponse.data.scorers || []).map((s: any) => {
      if (!s.team) return s;
      return {
        ...s,
        team: {
          ...s.team,
          name: translateTeamName(s.team.name)
        }
      };
    });

    const activePlayers: any[] = [];
    if (teamsResponse.data && Array.isArray(teamsResponse.data.teams)) {
      teamsResponse.data.teams.forEach((t: any) => {
        const teamName = translateTeamName(t.name);
        const teamFlag = t.crest || "⚽";
        if (Array.isArray(t.squad)) {
          t.squad.forEach((p: any) => {
            if (p && p.name) {
              activePlayers.push({
                name: p.name,
                team: teamName,
                flag: teamFlag
              });
            }
          });
        }
      });
    }

    competitionsCache[competition] = { 
      teams: Array.from(teamsMap.values()), 
      matches: formattedMatches,
      standings: translatedStandings,
      scorers: translatedScorers,
      players: activePlayers,
      timestamp: now 
    };
    
    res.json(competitionsCache[competition]);
  } catch (error: any) {
    console.error(`Error syncing ${competition} data:`, error.response?.data || error.message);
    res.status(500).json({ error: "Failed to sync data" });
  }
});

// Backward compatibility redirects
app.get("/api/world-cup-sync", (req, res) => res.redirect("/api/sync/WC"));
app.get("/api/world-cup-results", (req, res) => {
  const competition = "WC";
  if (!competitionsCache[competition]) return res.redirect("/api/sync/WC");
  
  const data = competitionsCache[competition];
  res.json({ matches: data.matches.map(m => ({
    ...m,
    homeTeam: { name: data.teams.find(t => t.id === m.homeTeamId)?.name, logo: data.teams.find(t => t.id === m.homeTeamId)?.flag },
    awayTeam: { name: data.teams.find(t => t.id === m.awayTeamId)?.name, logo: data.teams.find(t => t.id === m.awayTeamId)?.flag },
    homeScore: m.actualHomeScore,
    awayScore: m.actualAwayScore
  })) });
});

app.get("/api/results/:competition", async (req, res) => {
  const competition = (req.params.competition || "WC").toUpperCase();
  if (!competitionsCache[competition]) {
     return res.status(404).json({ error: "Sync this competition first" });
  }
  const data = competitionsCache[competition];
  res.json({ matches: data.matches.map(m => ({
    ...m,
    homeTeam: { name: data.teams.find(t => t.id === m.homeTeamId)?.name, logo: data.teams.find(t => t.id === m.homeTeamId)?.flag },
    awayTeam: { name: data.teams.find(t => t.id === m.awayTeamId)?.name, logo: data.teams.find(t => t.id === m.awayTeamId)?.flag },
    homeScore: m.actualHomeScore,
    awayScore: m.actualAwayScore
  })) });
});

app.get("/api/world-cup-data", (req, res) => res.redirect("/api/sync/WC"));

const FAMOUS_PLAYERS = [
  // --- ARGENTINA (🇦🇷) ---
  { name: "Lionel Messi", team: "Argentina", flag: "🇦🇷" },
  { name: "Julián Álvarez", team: "Argentina", flag: "🇦🇷" },
  { name: "Julian Álvarez", team: "Argentina", flag: "🇦🇷" },
  { name: "Lautaro Martínez", team: "Argentina", flag: "🇦🇷" },
  { name: "Alexis Mac Allister", team: "Argentina", flag: "🇦🇷" },
  { name: "Enzo Fernández", team: "Argentina", flag: "🇦🇷" },
  { name: "Rodrigo de Paul", team: "Argentina", flag: "🇦🇷" },
  { name: "Alejandro Garnacho", team: "Argentina", flag: "🇦🇷" },
  { name: "Ángel Di María", team: "Argentina", flag: "🇦🇷" },
  { name: "Emiliano Martínez", team: "Argentina", flag: "🇦🇷" },
  { name: "Nahuel Molina", team: "Argentina", flag: "🇦🇷" },
  { name: "Cristian Romero", team: "Argentina", flag: "🇦🇷" },
  { name: "Nicolás Otamendi", team: "Argentina", flag: "🇦🇷" },
  { name: "Lisandro Martínez", team: "Argentina", flag: "🇦🇷" },
  { name: "Nicolás Tagliafico", team: "Argentina", flag: "🇦🇷" },
  { name: "Leandro Paredes", team: "Argentina", flag: "🇦🇷" },
  { name: "Gerónimo Rulli", team: "Argentina", flag: "🇦🇷" },
  { name: "Franco Armani", team: "Argentina", flag: "🇦🇷" },
  { name: "Gonzalo Montiel", team: "Argentina", flag: "🇦🇷" },
  { name: "Marcos Acuña", team: "Argentina", flag: "🇦🇷" },
  { name: "Giovani Lo Celso", team: "Argentina", flag: "🇦🇷" },
  { name: "Exequiel Palacios", team: "Argentina", flag: "🇦🇷" },
  { name: "Guido Rodríguez", team: "Argentina", flag: "🇦🇷" },
  { name: "Paulo Dybala", team: "Argentina", flag: "🇦🇷" },
  { name: "Angel Correa", team: "Argentina", flag: "🇦🇷" },

  // --- FRANCIA (🇫🇷) ---
  { name: "Kylian Mbappé", team: "Francia", flag: "🇫🇷" },
  { name: "Antoine Griezmann", team: "Francia", flag: "🇫🇷" },
  { name: "Olivier Giroud", team: "Francia", flag: "🇫🇷" },
  { name: "Ousmane Dembélé", team: "Francia", flag: "🇫🇷" },
  { name: "Marcus Thuram", team: "Francia", flag: "🇫🇷" },
  { name: "Aurélien Tchouaméni", team: "Francia", flag: "🇫🇷" },
  { name: "Eduardo Camavinga", team: "Francia", flag: "🇫🇷" },
  { name: "Kingsley Coman", team: "Francia", flag: "🇫🇷" },
  { name: "Mike Maignan", team: "Francia", flag: "🇫🇷" },
  { name: "Brice Samba", team: "Francia", flag: "🇫🇷" },
  { name: "Alphonse Areola", team: "Francia", flag: "🇫🇷" },
  { name: "Jules Koundé", team: "Francia", flag: "🇫🇷" },
  { name: "Benjamin Pavard", team: "Francia", flag: "🇫🇷" },
  { name: "Dayot Upamecano", team: "Francia", flag: "🇫🇷" },
  { name: "William Saliba", team: "Francia", flag: "🇫🇷" },
  { name: "Ibrahima Konaté", team: "Francia", flag: "🇫🇷" },
  { name: "Theo Hernández", team: "Francia", flag: "🇫🇷" },
  { name: "Lucas Hernández", team: "Francia", flag: "🇫🇷" },
  { name: "Adrien Rabiot", team: "Francia", flag: "🇫🇷" },
  { name: "Warren Zaïre-Emery", team: "Francia", flag: "🇫🇷" },
  { name: "Youssouf Fofana", team: "Francia", flag: "🇫🇷" },
  { name: "Bradley Barcola", team: "Francia", flag: "🇫🇷" },
  { name: "Randal Kolo Muani", team: "Francia", flag: "🇫🇷" },

  // --- BRASIL (🇧🇷) ---
  { name: "Vinícius Júnior", team: "Brasil", flag: "🇧🇷" },
  { name: "Rodrygo Goes", team: "Brasil", flag: "🇧🇷" },
  { name: "Neymar Jr", team: "Brasil", flag: "🇧🇷" },
  { name: "Richarlison", team: "Brasil", flag: "🇧🇷" },
  { name: "Raphinha", team: "Brasil", flag: "🇧🇷" },
  { name: "Gabriel Jesus", team: "Brasil", flag: "🇧🇷" },
  { name: "Lucas Paquetá", team: "Brasil", flag: "🇧🇷" },
  { name: "Bruno Guimarães", team: "Brasil", flag: "🇧🇷" },
  { name: "Endrick Felipe", team: "Brasil", flag: "🇧🇷" },
  { name: "Alisson Becker", team: "Brasil", flag: "🇧🇷" },
  { name: "Ederson Moraes", team: "Brasil", flag: "🇧🇷" },
  { name: "Danilo da Silva", team: "Brasil", flag: "🇧🇷" },
  { name: "Marquinhos", team: "Brasil", flag: "🇧🇷" },
  { name: "Gabriel Magalhães", team: "Brasil", flag: "🇧🇷" },
  { name: "Éder Militão", team: "Brasil", flag: "🇧🇷" },
  { name: "Lucas Beraldo", team: "Brasil", flag: "🇧🇷" },
  { name: "Bremer da Silva", team: "Brasil", flag: "🇧🇷" },
  { name: "Wendell Borges", team: "Brasil", flag: "🇧🇷" },
  { name: "Douglas Luiz", team: "Brasil", flag: "🇧🇷" },
  { name: "Andreas Pereira", team: "Brasil", flag: "🇧🇷" },
  { name: "João Gomes", team: "Brasil", flag: "🇧🇷" },
  { name: "Savinho Moreira", team: "Brasil", flag: "🇧🇷" },
  { name: "Gabriel Martinelli", team: "Brasil", flag: "🇧🇷" },

  // --- ESPAÑA (🇪🇸) ---
  { name: "Lamine Yamal", team: "España", flag: "🇪🇸" },
  { name: "Nico Williams", team: "España", flag: "🇪🇸" },
  { name: "Álvaro Morata", team: "España", flag: "🇪🇸" },
  { name: "Dani Olmo", team: "España", flag: "🇪🇸" },
  { name: "Pedri González", team: "España", flag: "🇪🇸" },
  { name: "Gavi (Pablo Martín)", team: "España", flag: "🇪🇸" },
  { name: "Rodri Hernández", team: "España", flag: "🇪🇸" },
  { name: "Ferran Torres", team: "España", flag: "🇪🇸" },
  { name: "Mikel Oyarzabal", team: "España", flag: "🇪🇸" },
  { name: "Unai Simón", team: "España", flag: "🇪🇸" },
  { name: "David Raya", team: "España", flag: "🇪🇸" },
  { name: "Álex Remiro", team: "España", flag: "🇪🇸" },
  { name: "Dani Carvajal", team: "España", flag: "🇪🇸" },
  { name: "Robin Le Normand", team: "España", flag: "🇪🇸" },
  { name: "Aymeric Laporte", team: "España", flag: "🇪🇸" },
  { name: "Marc Cucurella", team: "España", flag: "🇪🇸" },
  { name: "Alejandro Grimaldo", team: "España", flag: "🇪🇸" },
  { name: "Dani Vivian", team: "España", flag: "🇪🇸" },
  { name: "Jesús Navas", team: "España", flag: "🇪🇸" },
  { name: "Nacho Fernández", team: "España", flag: "🇪🇸" },
  { name: "Fabián Ruiz", team: "España", flag: "🇪🇸" },
  { name: "Mikel Merino", team: "España", flag: "🇪🇸" },
  { name: "Martin Zubimendi", team: "España", flag: "🇪🇸" },
  { name: "Alex Baena", team: "España", flag: "🇪🇸" },
  { name: "Joselu Mato", team: "España", flag: "🇪🇸" },

  // --- ALEMANIA (🇩🇪) ---
  { name: "Jamal Musiala", team: "Alemania", flag: "🇩🇪" },
  { name: "Florian Wirtz", team: "Alemania", flag: "🇩🇪" },
  { name: "Kai Havertz", team: "Alemania", flag: "🇩🇪" },
  { name: "Thomas Müller", team: "Alemania", flag: "🇩🇪" },
  { name: "Leroy Sané", team: "Alemania", flag: "🇩🇪" },
  { name: "Serge Gnabry", team: "Alemania", flag: "🇩🇪" },
  { name: "Niclas Füllkrug", team: "Alemania", flag: "🇩🇪" },
  { name: "Ilkay Gündogan", team: "Alemania", flag: "🇩🇪" },
  { name: "Manuel Neuer", team: "Alemania", flag: "🇩🇪" },
  { name: "Marc-André ter Stegen", team: "Alemania", flag: "🇩🇪" },
  { name: "Oliver Baumann", team: "Alemania", flag: "🇩🇪" },
  { name: "Joshua Kimmich", team: "Alemania", flag: "🇩🇪" },
  { name: "Antonio Rüdiger", team: "Alemania", flag: "🇩🇪" },
  { name: "Jonathan Tah", team: "Alemania", flag: "🇩🇪" },
  { name: "David Raum", team: "Alemania", flag: "🇩🇪" },
  { name: "Nico Schlotterbeck", team: "Alemania", flag: "🇩🇪" },
  { name: "Robin Koch", team: "Alemania", flag: "🇩🇪" },
  { name: "Maximilian Mittelstädt", team: "Alemania", flag: "🇩🇪" },
  { name: "Benjamin Henrichs", team: "Alemania", flag: "🇩🇪" },
  { name: "Waldemar Anton", team: "Alemania", flag: "🇩🇪" },
  { name: "Toni Kroos", team: "Alemania", flag: "🇩🇪" },
  { name: "Robert Andrich", team: "Alemania", flag: "🇩🇪" },
  { name: "Pascal Gross", team: "Alemania", flag: "🇩🇪" },
  { name: "Emre Can", team: "Alemania", flag: "🇩🇪" },
  { name: "Chris Führich", team: "Alemania", flag: "🇩🇪" },
  { name: "Maximilian Beier", team: "Alemania", flag: "🇩🇪" },
  { name: "Deniz Undav", team: "Alemania", flag: "🇩🇪" },

  // --- PORTUGAL (🇵🇹) ---
  { name: "Cristiano Ronaldo", team: "Portugal", flag: "🇵🇹" },
  { name: "Gonçalo Ramos", team: "Portugal", flag: "🇵🇹" },
  { name: "Bernardo Silva", team: "Portugal", flag: "🇵🇹" },
  { name: "Bruno Fernandes", team: "Portugal", flag: "🇵🇹" },
  { name: "Rafael Leão", team: "Portugal", flag: "🇵🇹" },
  { name: "João Félix", team: "Portugal", flag: "🇵🇹" },
  { name: "Diogo Jota", team: "Portugal", flag: "🇵🇹" },
  { name: "Diogo Costa", team: "Portugal", flag: "🇵🇹" },
  { name: "José Sá", team: "Portugal", flag: "🇵🇹" },
  { name: "Rui Patrício", team: "Portugal", flag: "🇵🇹" },
  { name: "João Cancelo", team: "Portugal", flag: "🇵🇹" },
  { name: "Diogo Dalot", team: "Portugal", flag: "🇵🇹" },
  { name: "Rúben Dias", team: "Portugal", flag: "🇵🇹" },
  { name: "Pepe (Képler Laveran)", team: "Portugal", flag: "🇵🇹" },
  { name: "Nuno Mendes", team: "Portugal", flag: "🇵🇹" },
  { name: "Nélson Semedo", team: "Portugal", flag: "🇵🇹" },
  { name: "António Silva", team: "Portugal", flag: "🇵🇹" },
  { name: "Gonçalo Inácio", team: "Portugal", flag: "🇵🇹" },
  { name: "Danilo Pereira", team: "Portugal", flag: "🇵🇹" },
  { name: "João Palhinha", team: "Portugal", flag: "🇵🇹" },
  { name: "Vitinha (Vítor Ferreira)", team: "Portugal", flag: "🇵🇹" },
  { name: "Rúben Neves", team: "Portugal", flag: "🇵🇹" },
  { name: "João Neves", team: "Portugal", flag: "🇵🇹" },
  { name: "Matheus Nunes", team: "Portugal", flag: "🇵🇹" },
  { name: "Francisco Conceição", team: "Portugal", flag: "🇵🇹" },
  { name: "Pedro Neto", team: "Portugal", flag: "🇵🇹" },

  // --- INGLATERRA (🏴󠁧󠁢󠁥󠁮󠁧󠁿) ---
  { name: "Harry Kane", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Jude Bellingham", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Bukayo Saka", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Phil Foden", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Marcus Rashford", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Ollie Watkins", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Cole Palmer", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Jordan Pickford", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Aaron Ramsdale", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Dean Henderson", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Kyle Walker", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "John Stones", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Harry Maguire", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Kieran Trippier", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Luke Shaw", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Marc Guéhi", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Ezri Konsa", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Joe Gomez", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Lewis Dunk", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Trent Alexander-Arnold", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Declan Rice", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Conor Gallagher", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Kobbie Mainoo", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Adam Wharton", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Ivan Toney", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Anthony Gordon", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Jarrod Bowen", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Eberechi Eze", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },

  // --- BÉLGICA (🇧🇪) ---
  { name: "Thibaut Courtois", team: "Bélgica", flag: "🇧🇪" },
  { name: "Romelu Lukaku", team: "Bélgica", flag: "🇧🇪" },
  { name: "Kevin De Bruyne", team: "Bélgica", flag: "🇧🇪" },
  { name: "Leandro Trossard", team: "Bélgica", flag: "🇧🇪" },
  { name: "Jérémy Doku", team: "Bélgica", flag: "🇧🇪" },
  { name: "Yannick Carrasco", team: "Bélgica", flag: "🇧🇪" },
  { name: "Lois Openda", team: "Bélgica", flag: "🇧🇪" },
  { name: "Koen Casteels", team: "Bélgica", flag: "🇧🇪" },
  { name: "Thomas Kaminski", team: "Bélgica", flag: "🇧🇪" },
  { name: "Thomas Meunier", team: "Bélgica", flag: "🇧🇪" },
  { name: "Jan Vertonghen", team: "Bélgica", flag: "🇧🇪" },
  { name: "Wout Faes", team: "Bélgica", flag: "🇧🇪" },
  { name: "Timothy Castagne", team: "Bélgica", flag: "🇧🇪" },
  { name: "Arthur Theate", team: "Bélgica", flag: "🇧🇪" },
  { name: "Zeno Debast", team: "Bélgica", flag: "🇧🇪" },
  { name: "Amadou Onana", team: "Bélgica", flag: "🇧🇪" },
  { name: "Orel Mangala", team: "Bélgica", flag: "🇧🇪" },
  { name: "Youri Tielemans", team: "Bélgica", flag: "🇧🇪" },
  { name: "Arthur Vermeeren", team: "Bélgica", flag: "🇧🇪" },
  { name: "Aster Vranckx", team: "Bélgica", flag: "🇧🇪" },
  { name: "Dodi Lukebakio", team: "Bélgica", flag: "🇧🇪" },
  { name: "Johan Bakayoko", team: "Bélgica", flag: "🇧🇪" },
  { name: "Charles De Ketelaere", team: "Bélgica", flag: "🇧🇪" },

  // --- URUGUAY (🇺🇾) ---
  { name: "Darwin Núñez", team: "Uruguay", flag: "🇺🇾" },
  { name: "Luis Suárez", team: "Uruguay", flag: "🇺🇾" },
  { name: "Federico Valverde", team: "Uruguay", flag: "🇺🇾" },
  { name: "Giorgian de Arrascaeta", team: "Uruguay", flag: "🇺🇾" },
  { name: "Facundo Pellistri", team: "Uruguay", flag: "🇺🇾" },
  { name: "Sergio Rochet", team: "Uruguay", flag: "🇺🇾" },
  { name: "Santiago Mele", team: "Uruguay", flag: "🇺🇾" },
  { name: "Ronald Araújo", team: "Uruguay", flag: "🇺🇾" },
  { name: "José María Giménez", team: "Uruguay", flag: "🇺🇾" },
  { name: "Mathias Olivera", team: "Uruguay", flag: "🇺🇾" },
  { name: "Matías Viña", team: "Uruguay", flag: "🇺🇾" },
  { name: "Guillermo Varela", team: "Uruguay", flag: "🇺🇾" },
  { name: "Sebastián Cáceres", team: "Uruguay", flag: "🇺🇾" },
  { name: "Lucas Olaza", team: "Uruguay", flag: "🇺🇾" },
  { name: "Manuel Ugarte", team: "Uruguay", flag: "🇺🇾" },
  { name: "Rodrigo Bentancur", team: "Uruguay", flag: "🇺🇾" },
  { name: "Nicolás de la Cruz", team: "Uruguay", flag: "🇺🇾" },
  { name: "Maximiliano Araújo", team: "Uruguay", flag: "🇺🇾" },
  { name: "Brian Rodríguez", team: "Uruguay", flag: "🇺🇾" },
  { name: "Facundo Torres", team: "Uruguay", flag: "🇺🇾" },

  // --- PAÍSES BAJOS (🇳🇱) ---
  { name: "Cody Gakpo", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Memphis Depay", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Xavi Simons", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Wout Weghorst", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Donyell Malen", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Bart Verbruggen", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Mark Flekken", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Justin Bijlow", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Denzel Dumfries", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Virgil van Dijk", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Nathan Aké", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Matthijs de Ligt", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Stefan de Vrij", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Jeremie Frimpong", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Micky van de Ven", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Daley Blind", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Frenkie de Jong", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Tijjani Reijnders", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Joey Veerman", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Jerdy Schouten", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Georginio Wijnaldum", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Ryan Gravenberch", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Steven Bergwijn", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Brian Brobbey", team: "Países Bajos", flag: "🇳🇱" },

  // --- ESTADOS UNIDOS (🇺🇸) ---
  { name: "Christian Pulisic", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Folarin Balogun", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Timothy Weah", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Giovanni Reyna", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Weston McKennie", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Matt Turner", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Ethan Horvath", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Sean Johnson", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Antonee Robinson", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Tim Ream", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Chris Richards", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Sergiño Dest", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Joe Scally", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Miles Robinson", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Cameron Carter-Vickers", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Tyler Adams", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Yunus Musah", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Johnny Cardoso", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Malik Tillman", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Ricardo Pepi", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Brenden Aaronson", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Haji Wright", team: "Estados Unidos", flag: "🇺🇸" },

  // --- MÉXICO (🇲🇽) ---
  { name: "Santiago Giménez", team: "México", flag: "🇲🇽" },
  { name: "Henry Martín", team: "México", flag: "🇲🇽" },
  { name: "Hirving Lozano", team: "México", flag: "🇲🇽" },
  { name: "Uriel Antuna", team: "México", flag: "🇲🇽" },
  { name: "Edson Álvarez", team: "México", flag: "🇲🇽" },
  { name: "Luis Malagón", team: "México", flag: "🇲🇽" },
  { name: "Guillermo Ochoa", team: "México", flag: "🇲🇽" },
  { name: "Julio González", team: "México", flag: "🇲🇽" },
  { name: "César Montes", team: "México", flag: "🇲🇽" },
  { name: "Johan Vásquez", team: "México", flag: "🇲🇽" },
  { name: "Gerardo Arteaga", team: "México", flag: "🇲🇽" },
  { name: "Jorge Sánchez", team: "México", flag: "🇲🇽" },
  { name: "Israel Reyes", team: "México", flag: "🇲🇽" },
  { name: "Bryan González", team: "México", flag: "🇲🇽" },
  { name: "Luis Chávez", team: "México", flag: "🇲🇽" },
  { name: "Érick Sánchez", team: "México", flag: "🇲🇽" },
  { name: "Orbelín Pineda", team: "México", flag: "🇲🇽" },
  { name: "Luis Romo", team: "México", flag: "🇲🇽" },
  { name: "Carlos Rodríguez", team: "México", flag: "🇲🇽" },
  { name: "Alexis Vega", team: "México", flag: "🇲🇽" },
  { name: "Julián Quiñones", team: "México", flag: "🇲🇽" },
  { name: "César Huerta", team: "México", flag: "🇲🇽" },

  // --- COLOMBIA (🇨🇴) ---
  { name: "Luis Díaz", team: "Colombia", flag: "🇨🇴" },
  { name: "James Rodríguez", team: "Colombia", flag: "🇨🇴" },
  { name: "Jhon Durán", team: "Colombia", flag: "🇨🇴" },
  { name: "Rafael Santos Borré", team: "Colombia", flag: "🇨🇴" },
  { name: "Camilo Vargas", team: "Colombia", flag: "🇨🇴" },
  { name: "David Ospina", team: "Colombia", flag: "🇨🇴" },
  { name: "Daniel Muñoz", team: "Colombia", flag: "🇨🇴" },
  { name: "Davinson Sánchez", team: "Colombia", flag: "🇨🇴" },
  { name: "Carlos Cuesta", team: "Colombia", flag: "🇨🇴" },
  { name: "Jhon Lucumí", team: "Colombia", flag: "🇨🇴" },
  { name: "Johan Mojica", team: "Colombia", flag: "🇨🇴" },
  { name: "Santiago Arias", team: "Colombia", flag: "🇨🇴" },
  { name: "Yerry Mina", team: "Colombia", flag: "🇨🇴" },
  { name: "Jefferson Lerma", team: "Colombia", flag: "🇨🇴" },
  { name: "Richard Ríos", team: "Colombia", flag: "🇨🇴" },
  { name: "Jhon Arias", team: "Colombia", flag: "🇨🇴" },
  { name: "Kevin Castaño", team: "Colombia", flag: "🇨🇴" },
  { name: "Mateus Uribe", team: "Colombia", flag: "🇨🇴" },
  { name: "Juan Fernando Quintero", team: "Colombia", flag: "🇨🇴" },
  { name: "Jhon Córdoba", team: "Colombia", flag: "🇨🇴" },
  { name: "Luis Sinisterra", team: "Colombia", flag: "🇨🇴" },
  { name: "Miguel Borja", team: "Colombia", flag: "🇨🇴" },

  // --- MARRUECOS (🇲🇦) ---
  { name: "Youssef En-Nesyri", team: "Marruecos", flag: "🇲🇦" },
  { name: "Hakim Ziyech", team: "Marruecos", flag: "🇲🇦" },
  { name: "Brahim Díaz", team: "Marruecos", flag: "🇲🇦" },
  { name: "Yassine Bounou", team: "Marruecos", flag: "🇲🇦" },
  { name: "Munir Mohamedi", team: "Marruecos", flag: "🇲🇦" },
  { name: "Achraf Hakimi", team: "Marruecos", flag: "🇲🇦" },
  { name: "Noussair Mazraoui", team: "Marruecos", flag: "🇲🇦" },
  { name: "Nayef Aguerd", team: "Marruecos", flag: "🇲🇦" },
  { name: "Romain Saïss", team: "Marruecos", flag: "🇲🇦" },
  { name: "Yahia Attiyat Allah", team: "Marruecos", flag: "🇲🇦" },
  { name: "Sofyan Amrabat", team: "Marruecos", flag: "🇲🇦" },
  { name: "Azzedine Ounahi", team: "Marruecos", flag: "🇲🇦" },
  { name: "Sofiane Boufal", team: "Marruecos", flag: "🇲🇦" },
  { name: "Amine Adli", team: "Marruecos", flag: "🇲🇦" },
  { name: "Soufiane Rahimi", team: "Marruecos", flag: "🇲🇦" },

  // --- CROACIA (🇭🇷) ---
  { name: "Luka Modric", team: "Croacia", flag: "🇭🇷" },
  { name: "Andrej Kramaric", team: "Croacia", flag: "🇭🇷" },
  { name: "Dominik Livaković", team: "Croacia", flag: "🇭🇷" },
  { name: "Joško Gvardiol", team: "Croacia", flag: "🇭🇷" },
  { name: "Mateo Kovačić", team: "Croacia", flag: "🇭🇷" },
  { name: "Marcelo Brozović", team: "Croacia", flag: "🇭🇷" },
  { name: "Ivan Perišić", team: "Croacia", flag: "🇭🇷" },
  { name: "Josip Stanišić", team: "Croacia", flag: "🇭🇷" },
  { name: "Josip Šutalo", team: "Croacia", flag: "🇭🇷" },
  { name: "Mario Pašalić", team: "Croacia", flag: "🇭🇷" },

  // --- SUIZA (🇨🇭) ---
  { name: "Yann Sommer", team: "Suiza", flag: "🇨🇭" },
  { name: "Gregor Kobel", team: "Suiza", flag: "🇨🇭" },
  { name: "Granit Xhaka", team: "Suiza", flag: "🇨🇭" },
  { name: "Manuel Akanji", team: "Suiza", flag: "🇨🇭" },
  { name: "Xherdan Shaqiri", team: "Suiza", flag: "🇨🇭" },
  { name: "Remo Freuler", team: "Suiza", flag: "🇨🇭" },
  { name: "Breel Embolo", team: "Suiza", flag: "🇨🇭" },
  { name: "Ruben Vargas", team: "Suiza", flag: "🇨🇭" },
  { name: "Dan Ndoye", team: "Suiza", flag: "🇨🇭" },
  { name: "Michel Aebischer", team: "Suiza", flag: "🇨🇭" },
  { name: "Fabian Schär", team: "Suiza", flag: "🇨🇭" },
  { name: "Silvan Widmer", team: "Suiza", flag: "🇨🇭" },
  { name: "Denis Zakaria", team: "Suiza", flag: "🇨🇭" },
  { name: "Zeki Amdouni", team: "Suiza", flag: "🇨🇭" },

  // --- ECUADOR (🇪🇨) ---
  { name: "Moíses Caicedo", team: "Ecuador", flag: "🇪🇨" },
  { name: "Enner Valencia", team: "Ecuador", flag: "🇪🇨" },
  { name: "Piero Hincapié", team: "Ecuador", flag: "🇪🇨" },
  { name: "Kendry Páez", team: "Ecuador", flag: "🇪🇨" },
  { name: "Pervis Estupiñán", team: "Ecuador", flag: "🇪🇨" },
  { name: "Jeremy Sarmiento", team: "Ecuador", flag: "🇪🇨" },
  { name: "Kevin Rodríguez", team: "Ecuador", flag: "🇪🇨" },
  { name: "Alexander Domínguez", team: "Ecuador", flag: "🇪🇨" },
  { name: "Félix Torres", team: "Ecuador", flag: "🇪🇨" },
  { name: "Willian Pacho", team: "Ecuador", flag: "🇪🇨" },
  { name: "Ángelo Preciado", team: "Ecuador", flag: "🇪🇨" },
  { name: "Alan Franco", team: "Ecuador", flag: "🇪🇨" },

  // --- CANADÁ (🇨🇦) ---
  { name: "Alphonso Davies", team: "Canadá", flag: "🇨🇦" },
  { name: "Jonathan David", team: "Canadá", flag: "🇨🇦" },
  { name: "Cyle Larin", team: "Canadá", flag: "🇨🇦" },
  { name: "Tajon Buchanan", team: "Canadá", flag: "🇨🇦" },
  { name: "Stephen Eustáquio", team: "Canadá", flag: "🇨🇦" },
  { name: "Ismaël Koné", team: "Canadá", flag: "🇨🇦" },
  { name: "Alistair Johnston", team: "Canadá", flag: "🇨🇦" },
  { name: "Kamal Miller", team: "Canadá", flag: "🇨🇦" },
  { name: "Maxime Crépeau", team: "Canadá", flag: "🇨🇦" },
  { name: "Jacob Shaffelburg", team: "Canadá", flag: "🇨🇦" },
  { name: "Richie Laryea", team: "Canadá", flag: "🇨🇦" },

  // --- SENEGAL (🇸🇳) ---
  { name: "Sadio Mané", team: "Senegal", flag: "🇸🇳" },
  { name: "Édouard Mendy", team: "Senegal", flag: "🇸🇳" },
  { name: "Kalidou Koulibaly", team: "Senegal", flag: "🇸🇳" },
  { name: "Nicolas Jackson", team: "Senegal", flag: "🇸🇳" },
  { name: "Ismaïla Sarr", team: "Senegal", flag: "🇸🇳" },
  { name: "Iliman Ndiaye", team: "Senegal", flag: "🇸🇳" },
  { name: "Lamine Camara", team: "Senegal", flag: "🇸🇳" },
  { name: "Pape Matar Sarr", team: "Senegal", flag: "🇸🇳" },
  { name: "Habib Diallo", team: "Senegal", flag: "🇸🇳" },
  { name: "Abdou Diallo", team: "Senegal", flag: "🇸🇳" },
  { name: "Moussa Niakhaté", team: "Senegal", flag: "🇸🇳" },

  // --- JAPÓN (🇯🇵) ---
  { name: "Takefusa Kubo", team: "Japón", flag: "🇯🇵" },
  { name: "Kaoru Mitoma", team: "Japón", flag: "🇯🇵" },
  { name: "Wataru Endo", team: "Japón", flag: "🇯🇵" },
  { name: "Takumi Minamino", team: "Japón", flag: "🇯🇵" },
  { name: "Ritsu Doan", team: "Japón", flag: "🇯🇵" },
  { name: "Ayase Ueda", team: "Japón", flag: "🇯🇵" },
  { name: "Hiroki Ito", team: "Japón", flag: "🇯🇵" },
  { name: "Ko Itakura", team: "Japón", flag: "🇯🇵" },
  { name: "Takehiro Tomiyasu", team: "Japón", flag: "🇯🇵" },
  { name: "Zion Suzuki", team: "Japón", flag: "🇯🇵" },
  { name: "Yukinari Sugawara", team: "Japón", flag: "🇯🇵" },
  { name: "Daichi Kamada", team: "Japón", flag: "🇯🇵" },

  // --- COREA DEL SUR (🇰🇷) ---
  { name: "Heung-min Son", team: "Corea del Sur", flag: "🇰🇷" },
  { name: "Kim Min-jae", team: "Corea del Sur", flag: "🇰🇷" },
  { name: "Lee Kang-in", team: "Corea del Sur", flag: "🇰🇷" },
  { name: "Hwang Hee-chan", team: "Corea del Sur", flag: "🇰🇷" },
  { name: "Cho Gue-sung", team: "Corea del Sur", flag: "🇰🇷" },
  { name: "Lee Jae-sung", team: "Corea del Sur", flag: "🇰🇷" },
  { name: "Seol Young-woo", team: "Corea del Sur", flag: "🇰🇷" },
  { name: "Jo Hyeon-woo", team: "Corea del Sur", flag: "🇰🇷" },
  { name: "Hwang In-beom", team: "Corea del Sur", flag: "🇰🇷" },

  // --- GHANA (🇬🇭) ---
  { name: "Mohammed Kudus", team: "Ghana", flag: "🇬🇭" },
  { name: "Inaki Williams", team: "Ghana", flag: "🇬🇭" },
  { name: "Thomas Partey", team: "Ghana", flag: "🇬🇭" },
  { name: "Jordan Ayew", team: "Ghana", flag: "🇬🇭" },
  { name: "Antoine Semenyo", team: "Ghana", flag: "🇬🇭" },
  { name: "Ernest Nuamah", team: "Ghana", flag: "🇬🇭" },
  { name: "Salis Abdul Samed", team: "Ghana", flag: "🇬🇭" },
  { name: "Alexander Djiku", team: "Ghana", flag: "🇬🇭" },

  // --- AUSTRALIA (🇦🇺) ---
  { name: "Mathew Ryan", team: "Australia", flag: "🇦🇺" },
  { name: "Harry Souttar", team: "Australia", flag: "🇦🇺" },
  { name: "Jackson Irvine", team: "Australia", flag: "🇦🇺" },
  { name: "Mitchell Duke", team: "Australia", flag: "🇦🇺" },
  { name: "Craig Goodwin", team: "Australia", flag: "🇦🇺" },
  { name: "Nestory Irankunda", team: "Australia", flag: "🇦🇺" },

  // --- ARABIA SAUDITA (🇸🇦) ---
  { name: "Salem Al-Dawsari", team: "Arabia Saudita", flag: "🇸🇦" },
  { name: "Firas Al-Buraikan", team: "Arabia Saudita", flag: "🇸🇦" },
  { name: "Saud Abdulhamid", team: "Arabia Saudita", flag: "🇸🇦" },
  { name: "Yasir Al-Shahrani", team: "Arabia Saudita", flag: "🇸🇦" },
  { name: "Mohamed Kanno", team: "Arabia Saudita", flag: "🇸🇦" },
  { name: "Mohammed Al-Owais", team: "Arabia Saudita", flag: "🇸🇦" },

  // --- TÚNEZ (🇹🇳) ---
  { name: "Ellyes Skhiri", team: "Túnez", flag: "🇹🇳" },
  { name: "Youssef Msakni", team: "Túnez", flag: "🇹🇳" },
  { name: "Wajdi Kechrida", team: "Túnez", flag: "🇹🇳" },
  { name: "Montassar Talbi", team: "Túnez", flag: "🇹🇳" },
  { name: "Aïssa Laïdouni", team: "Túnez", flag: "🇹🇳" },

  // --- IRÁN (🇮🇷) ---
  { name: "Mehdi Taremi", team: "Irán", flag: "🇮🇷" },
  { name: "Sardar Azmoun", team: "Irán", flag: "🇮🇷" },
  { name: "Alireza Jahanbakhsh", team: "Irán", flag: "🇮🇷" },
  { name: "Saman Ghoddos", team: "Irán", flag: "🇮🇷" },
  { name: "Alireza Beiranvand", team: "Irán", flag: "🇮🇷" },

  // --- QATAR (🇶🇦) ---
  { name: "Akram Afif", team: "Qatar", flag: "🇶🇦" },
  { name: "Almoez Ali", team: "Qatar", flag: "🇶🇦" },
  { name: "Hassan Al-Haydos", team: "Qatar", flag: "🇶🇦" },
  { name: "Saad Al Sheeb", team: "Qatar", flag: "🇶🇦" },

  // --- PARAGUAY (🇵🇾) ---
  { name: "Miguel Almirón", team: "Paraguay", flag: "🇵🇾" },
  { name: "Julio Enciso", team: "Paraguay", flag: "🇵🇾" },
  { name: "Antonio Sanabria", team: "Paraguay", flag: "🇵🇾" },
  { name: "Gustavo Gómez", team: "Paraguay", flag: "🇵🇾" },
  { name: "Mathías Villasanti", team: "Paraguay", flag: "🇵🇾" },
  { name: "Omar Alderete", team: "Paraguay", flag: "🇵🇾" },
  { name: "Junior Alonso", team: "Paraguay", flag: "🇵🇾" },

  // --- SUDÁFRICA (🇿🇦) ---
  { name: "Percy Tau", team: "Sudáfrica", flag: "🇿🇦" },
  { name: "Themba Zwane", team: "Sudáfrica", flag: "🇿🇦" },
  { name: "Teboho Mokoena", team: "Sudáfrica", flag: "🇿🇦" },
  { name: "Ronwen Williams", team: "Sudáfrica", flag: "🇿🇦" },
  { name: "Khuliso Mudau", team: "Sudáfrica", flag: "🇿🇦" },
  { name: "Mothobi Mvala", team: "Sudáfrica", flag: "🇿🇦" },
  { name: "Evidence Makgopa", team: "Sudáfrica", flag: "🇿🇦" },

  // --- ARGELIA (🇩🇿) ---
  { name: "Riyad Mahrez", team: "Argelia", flag: "🇩🇿" },
  { name: "Amine Gouiri", team: "Argelia", flag: "🇩🇿" },
  { name: "Houssem Aouar", team: "Argelia", flag: "🇩🇿" },
  { name: "Ismaël Bennacer", team: "Argelia", flag: "🇩🇿" },
  { name: "Said Benrahma", team: "Argelia", flag: "🇩🇿" },
  { name: "Rayan Aït-Nouri", team: "Argelia", flag: "🇩🇿" },
  { name: "Youcef Atal", team: "Argelia", flag: "🇩🇿" },
  { name: "Anthony Mandrea", team: "Argelia", flag: "🇩🇿" },

  // --- NUEVA ZELANDA (🇳🇿) ---
  { name: "Chris Wood", team: "Nueva Zelanda", flag: "🇳🇿" },
  { name: "Marko Stamenic", team: "Nueva Zelanda", flag: "🇳🇿" },
  { name: "Liberato Cacace", team: "Nueva Zelanda", flag: "🇳🇿" },
  { name: "Sarpreet Singh", team: "Nueva Zelanda", flag: "🇳🇿" },
  { name: "Matthew Garbett", team: "Nueva Zelanda", flag: "🇳🇿" },
  { name: "Tyler Bindon", team: "Nueva Zelanda", flag: "🇳🇿" },
  { name: "Alex Paulsen", team: "Nueva Zelanda", flag: "🇳🇿" },

  // --- SUECIA (🇸🇪) ---
  { name: "Alexander Isak", team: "Suecia", flag: "🇸🇪" },
  { name: "Dejan Kulusevski", team: "Suecia", flag: "🇸🇪" },
  { name: "Viktor Gyökeres", team: "Suecia", flag: "🇸🇪" },
  { name: "Emil Forsberg", team: "Suecia", flag: "🇸🇪" },
  { name: "Victor Lindelöf", team: "Suecia", flag: "🇸🇪" },
  { name: "Ludwig Augustinsson", team: "Suecia", flag: "🇸🇪" },
  { name: "Robin Olsen", team: "Suecia", flag: "🇸🇪" },

  // --- REPÚBLICA CHECA (🇨🇿) ---
  { name: "Patrik Schick", team: "República Checa", flag: "🇨🇿" },
  { name: "Tomáš Souček", team: "República Checa", flag: "🇨🇿" },
  { name: "Vladimír Coufal", team: "República Checa", flag: "🇨🇿" },
  { name: "Adam Hložek", team: "República Checa", flag: "🇨🇿" },
  { name: "Antonín Barák", team: "República Checa", flag: "🇨🇿" },
  { name: "Ladislav Krejčí", team: "República Checa", flag: "🇨🇿" },
  { name: "Jindřich Staněk", team: "República Checa", flag: "🇨🇿" },

  // --- TURQUÍA (🇹🇷) ---
  { name: "Arda Güler", team: "Turquía", flag: "🇹🇷" },
  { name: "Hakan Çalhanoğlu", team: "Turquía", flag: "🇹🇷" },
  { name: "Kenan Yıldız", team: "Turquía", flag: "🇹🇷" },
  { name: "Barış Alper Yılmaz", team: "Turquía", flag: "🇹🇷" },
  { name: "Kerem Aktürkoğlu", team: "Turquía", flag: "🇹🇷" },
  { name: "Orkun Kökçü", team: "Turquía", flag: "🇹🇷" },
  { name: "Ferdi Kadıoğlu", team: "Turquía", flag: "🇹🇷" },
  { name: "Altay Bayındır", team: "Turquía", flag: "🇹🇷" },

  // --- AUSTRIA (🇦🇹) ---
  { name: "Marcel Sabitzer", team: "Austria", flag: "🇦🇹" },
  { name: "Christoph Baumgartner", team: "Austria", flag: "🇦🇹" },
  { name: "Konrad Laimer", team: "Austria", flag: "🇦🇹" },
  { name: "Marko Arnautović", team: "Austria", flag: "🇦🇹" },
  { name: "Michael Gregoritsch", team: "Austria", flag: "🇦🇹" },
  { name: "Patrick Wimmer", team: "Austria", flag: "🇦🇹" },
  { name: "Alexander Schlager", team: "Austria", flag: "🇦🇹" },

  // --- EGIPTO (🇪🇬) ---
  { name: "Mohamed Salah", team: "Egipto", flag: "🇪🇬" },
  { name: "Mostafa Mohamed", team: "Egipto", flag: "🇪🇬" },
  { name: "Mahmoud Hassan Trézéguet", team: "Egipto", flag: "🇪🇬" },
  { name: "Omar Marmoush", team: "Egipto", flag: "🇪🇬" },
  { name: "Mohamed Elneny", team: "Egipto", flag: "🇪🇬" },
  { name: "Ahmed Hegazi", team: "Egipto", flag: "🇪🇬" },
  { name: "Mohamed El Shenawy", team: "Egipto", flag: "🇪🇬" },

  // --- HAITÍ (🇭🇹) ---
  { name: "Frantzdy Pierrot", team: "Haití", flag: "🇭🇹" },
  { name: "Duckens Nazon", team: "Haití", flag: "🇭🇹" },
  { name: "Derrick Etienne Jr.", team: "Haití", flag: "🇭🇹" },
  { name: "Danley Jean Jacques", team: "Haití", flag: "🇭🇹" },
  { name: "Carlens Arcus", team: "Haití", flag: "🇭🇹" },
  { name: "Johny Placide", team: "Haití", flag: "🇭🇹" },

  // --- BOSNIA Y HERZEGOVINA (🇧🇦) ---
  { name: "Edin Džeko", team: "Bosnia y Herzegovina", flag: "🇧🇦" },
  { name: "Ermedin Demirović", team: "Bosnia y Herzegovina", flag: "🇧🇦" },
  { name: "Miralem Pjanić", team: "Bosnia y Herzegovina", flag: "🇧🇦" },
  { name: "Amar Dedić", team: "Bosnia y Herzegovina", flag: "🇧🇦" },
  { name: "Sead Kolašinac", team: "Bosnia y Herzegovina", flag: "🇧🇦" },
  { name: "Rade Krunić", team: "Bosnia y Herzegovina", flag: "🇧🇦" },
  { name: "Kenan Pirić", team: "Bosnia y Herzegovina", flag: "🇧🇦" },

  // --- PANAMÁ (🇵🇦) ---
  { name: "Adalberto Carrasquilla", team: "Panamá", flag: "🇵🇦" },
  { name: "José Fajardo", team: "Panamá", flag: "🇵🇦" },
  { name: "Michael Amir Murillo", team: "Panamá", flag: "🇵🇦" },
  { name: "Ismael Díaz", team: "Panamá", flag: "🇵🇦" },
  { name: "Yoel Bárcenas", team: "Panamá", flag: "🇵🇦" },
  { name: "Aníbal Godoy", team: "Panamá", flag: "🇵🇦" },
  { name: "Orlando Mosquera", team: "Panamá", flag: "🇵🇦" },

  // --- CABO VERDE (🇨🇻) ---
  { name: "Ryan Mendes", team: "Cabo Verde", flag: "🇨🇻" },
  { name: "Garry Rodrigues", team: "Cabo Verde", flag: "🇨🇻" },
  { name: "Jovane Cabral", team: "Cabo Verde", flag: "🇨🇻" },
  { name: "Bebé", team: "Cabo Verde", flag: "🇨🇻" },
  { name: "Jamiro Monteiro", team: "Cabo Verde", flag: "🇨🇻" },
  { name: "Logan Costa", team: "Cabo Verde", flag: "🇨🇻" },
  { name: "Vozinha", team: "Cabo Verde", flag: "🇨🇻" },

  // --- RD CONGO (🇨🇩) ---
  { name: "Chancel Mbemba", team: "RD Congo", flag: "🇨🇩" },
  { name: "Yoane Wissa", team: "RD Congo", flag: "🇨🇩" },
  { name: "Cédric Bakambu", team: "RD Congo", flag: "🇨🇩" },
  { name: "Meschack Elia", team: "RD Congo", flag: "🇨🇩" },
  { name: "Samuel Moutoussamy", team: "RD Congo", flag: "🇨🇩" },
  { name: "Arthur Masuaku", team: "RD Congo", flag: "🇨🇩" },
  { name: "Lionel Mpasi", team: "RD Congo", flag: "🇨🇩" },

  // --- COSTA DE MARFIL (🇨🇮) ---
  { name: "Sébastien Haller", team: "Costa de Marfil", flag: "🇨🇮" },
  { name: "Simon Adingra", team: "Costa de Marfil", flag: "🇨🇮" },
  { name: "Franck Kessié", team: "Costa de Marfil", flag: "🇨🇮" },
  { name: "Ibrahim Sangaré", team: "Costa de Marfil", flag: "🇨🇮" },
  { name: "Seko Fofana", team: "Costa de Marfil", flag: "🇨🇮" },
  { name: "Ousmane Diomande", team: "Costa de Marfil", flag: "🇨🇮" },
  { name: "Odilon Kossounou", team: "Costa de Marfil", flag: "🇨🇮" },
  { name: "Yahia Fofana", team: "Costa de Marfil", flag: "🇨🇮" },

  // --- JORDANIA (🇯🇴) ---
  { name: "Mousa Al-Tamari", team: "Jordania", flag: "🇯🇴" },
  { name: "Yazan Al-Naimat", team: "Jordania", flag: "🇯🇴" },
  { name: "Ali Olwan", team: "Jordania", flag: "🇯🇴" },
  { name: "Mahmoud Al-Mardi", team: "Jordania", flag: "🇯🇴" },
  { name: "Nizar Al-Rashdan", team: "Jordania", flag: "🇯🇴" },
  { name: "Yazeed Abulaila", team: "Jordania", flag: "🇯🇴" },

  // --- IRAK (🇮🇶) ---
  { name: "Aymen Hussein", team: "Irak", flag: "🇮🇶" },
  { name: "Ali Jasim", team: "Irak", flag: "🇮🇶" },
  { name: "Zidane Iqbal", team: "Irak", flag: "🇮🇶" },
  { name: "Ibrahim Bayesh", team: "Irak", flag: "🇮🇶" },
  { name: "Amir Al-Ammari", team: "Irak", flag: "🇮🇶" },
  { name: "Jalal Hassan", team: "Irak", flag: "🇮🇶" },

  // --- UZBEKISTÁN (🇺🇿) ---
  { name: "Eldor Shomurodov", team: "Uzbekistán", flag: "🇺🇿" },
  { name: "Abbosbek Fayzullaev", team: "Uzbekistán", flag: "🇺🇿" },
  { name: "Oston Urunov", team: "Uzbekistán", flag: "🇺🇿" },
  { name: "Jaloliddin Masharipov", team: "Uzbekistán", flag: "🇺🇿" },
  { name: "Odiljon Hamrobekov", team: "Uzbekistán", flag: "🇺🇿" },
  { name: "Utkir Yusupov", team: "Uzbekistán", flag: "🇺🇿" },

  // --- NORUEGA (🇳🇴) ---
  { name: "Erling Haaland", team: "Noruega", flag: "🇳🇴" },
  { name: "Martin Ødegaard", team: "Noruega", flag: "🇳🇴" },
  { name: "Alexander Sørloth", team: "Noruega", flag: "🇳🇴" },
  { name: "Antonio Nusa", team: "Noruega", flag: "🇳🇴" },
  { name: "Julian Ryerson", team: "Noruega", flag: "🇳🇴" },
  { name: "Leo Østigård", team: "Noruega", flag: "🇳🇴" },
  { name: "Ørjan Nyland", team: "Noruega", flag: "🇳🇴" },

  // --- ESCOCIA (🏴󠁧󠁢󠁳󠁣󠁴󠁿) ---
  { name: "Scott McTominay", team: "Escocia", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { name: "John McGinn", team: "Escocia", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { name: "Andy Robertson", team: "Escocia", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { name: "Billy Gilmour", team: "Escocia", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { name: "Che Adams", team: "Escocia", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { name: "Callum McGregor", team: "Escocia", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { name: "Angus Gunn", team: "Escocia", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },

  // --- CURAZAO (🇨🇼) ---
  { name: "Juninho Bacuna", team: "Curazao", flag: "🇨🇼" },
  { name: "Jurnee Bacuna", team: "Curazao", flag: "🇨🇼" },
  { name: "Brandley Kuwas", team: "Curazao", flag: "🇨🇼" },
  { name: "Kenji Gorré", team: "Curazao", flag: "🇨🇼" },
  { name: "Vurnon Anita", team: "Curazao", flag: "🇨🇼" },
  { name: "Eloy Room", team: "Curazao", flag: "🇨🇼" },

  // --- OTROS JUGADORES DESTACADOS/MUNDIALISTAS ---
  { name: "Victor Osimhen", team: "Nigeria", flag: "🇳🇬" },
  { name: "Jan Oblak", team: "Eslovenia", flag: "🇸🇮" }
];

app.get("/api/players/search", (req, res) => {
  const query = (req.query.q as string || "").toLowerCase().trim();
  if (query.length < 3) {
    return res.json([]);
  }

  const allPlayers = [...FAMOUS_PLAYERS];

  const comp = (req.query.competition as string || "WC").toUpperCase();

  // Incorporar jugadores de plantilla si están cacheados
  if (competitionsCache[comp] && Array.isArray(competitionsCache[comp].players)) {
    competitionsCache[comp].players.forEach((p: any) => {
      const alreadyExists = allPlayers.some(ap => ap.name.toLowerCase() === p.name.toLowerCase());
      if (!alreadyExists) {
        allPlayers.push(p);
      }
    });
  }

  if (competitionsCache[comp] && competitionsCache[comp].scorers) {
    competitionsCache[comp].scorers.forEach((s: any) => {
      if (s.player && s.player.name) {
        const alreadyExists = allPlayers.some(p => p.name.toLowerCase() === s.player.name.toLowerCase());
        if (!alreadyExists) {
          allPlayers.push({
            name: s.player.name,
            team: translateTeamName(s.team?.name || s.player.nationality || "Desconocido"),
            flag: "⚽"
          });
        }
      }
    });
  }

  const removeAccents = (str: string): string => {
    return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
  };

  const normalizedQuery = removeAccents(query);

  const results = allPlayers.filter(p => {
    const normName = removeAccents(p.name);
    const normTeam = removeAccents(p.team);
    return normName.includes(normalizedQuery) || normTeam.includes(normalizedQuery);
  });

  res.json(results);
});

app.get("/api/teams/search", (req, res) => {
  const query = (req.query.q as string || "").toLowerCase().trim();
  if (query.length < 3) {
    return res.json([]);
  }
  const comp = (req.query.competition as string || "WC").toUpperCase();

  let teamsList: any[] = [];
  if (competitionsCache[comp] && competitionsCache[comp].teams) {
    teamsList = competitionsCache[comp].teams;
  }

  const fallbackTeams = [
    { name: "Argentina", flag: "https://crests.football-data.org/762.png" },
    { name: "Francia", flag: "https://crests.football-data.org/773.svg" },
    { name: "Brasil", flag: "https://crests.football-data.org/764.svg" },
    { name: "España", flag: "https://crests.football-data.org/760.svg" },
    { name: "Alemania", flag: "https://crests.football-data.org/759.svg" },
    { name: "Portugal", flag: "https://crests.football-data.org/765.svg" },
    { name: "Inglaterra", flag: "https://crests.football-data.org/770.svg" },
    { name: "Uruguay", flag: "https://crests.football-data.org/758.svg" },
    { name: "Países Bajos", flag: "https://crests.football-data.org/8601.svg" },
    { name: "Estados Unidos", flag: "https://crests.football-data.org/usa.svg" },
    { name: "México", flag: "https://crests.football-data.org/769.svg" },
    { name: "Bélgica", flag: "https://crests.football-data.org/805.svg" },
    { name: "Croacia", flag: "https://crests.football-data.org/799.svg" },
    { name: "Marruecos", flag: "https://crests.football-data.org/morocco.svg" },
    { name: "Colombia", flag: "https://crests.football-data.org/818.svg" },
    { name: "Italia", flag: "https://crests.football-data.org/813.svg" },
    { name: "Ecuador", flag: "https://crests.football-data.org/791.svg" },
    { name: "Senegal", flag: "https://crests.football-data.org/senegal.svg" },
    { name: "Japón", flag: "https://crests.football-data.org/766.svg" }
  ];

  const mergedTeams = teamsList.map(t => ({
    ...t,
    name: translateTeamName(t.name)
  }));
  fallbackTeams.forEach(ft => {
    const exists = mergedTeams.some(t => t.name.toLowerCase() === ft.name.toLowerCase());
    if (!exists) {
      mergedTeams.push({
        id: ft.name.toLowerCase(),
        name: ft.name,
        flag: ft.flag
      });
    }
  });

  const removeAccents = (str: string): string => {
    return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
  };

  const normalizedQuery = removeAccents(query);

  const results = mergedTeams.filter(t => 
    removeAccents(t.name).includes(normalizedQuery)
  );

  res.json(results);
});

export default app;
