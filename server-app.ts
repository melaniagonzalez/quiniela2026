import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();
app.use(express.json());

// Cache for different competitions
let competitionsCache: Record<string, { teams: any[]; matches: any[]; standings: any[]; scorers: any[]; timestamp: number }> = {};
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
  "Greece": "Grecia"
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

    competitionsCache[competition] = { 
      teams: Array.from(teamsMap.values()), 
      matches: formattedMatches,
      standings: translatedStandings,
      scorers: translatedScorers,
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
  { name: "Lionel Messi", team: "Argentina", flag: "🇦🇷" },
  { name: "Julian Álvarez", team: "Argentina", flag: "🇦🇷" },
  { name: "Lautaro Martínez", team: "Argentina", flag: "🇦🇷" },
  { name: "Alexis Mac Allister", team: "Argentina", flag: "🇦🇷" },
  { name: "Enzo Fernández", team: "Argentina", flag: "🇦🇷" },
  { name: "Rodrigo de Paul", team: "Argentina", flag: "🇦🇷" },
  { name: "Alejandro Garnacho", team: "Argentina", flag: "🇦🇷" },
  { name: "Ángel Di María", team: "Argentina", flag: "🇦🇷" },
  { name: "Kylian Mbappé", team: "Francia", flag: "🇫🇷" },
  { name: "Antoine Griezmann", team: "Francia", flag: "🇫🇷" },
  { name: "Olivier Giroud", team: "Francia", flag: "🇫🇷" },
  { name: "Ousmane Dembélé", team: "Francia", flag: "🇫🇷" },
  { name: "Marcus Thuram", team: "Francia", flag: "🇫🇷" },
  { name: "Aurélien Tchouaméni", team: "Francia", flag: "🇫🇷" },
  { name: "Eduardo Camavinga", team: "Francia", flag: "🇫🇷" },
  { name: "Kingsley Coman", team: "Francia", flag: "🇫🇷" },
  { name: "Vinícius Júnior", team: "Brasil", flag: "🇧🇷" },
  { name: "Rodrygo Goes", team: "Brasil", flag: "🇧🇷" },
  { name: "Neymar Jr", team: "Brasil", flag: "🇧🇷" },
  { name: "Richarlison", team: "Brasil", flag: "🇧🇷" },
  { name: "Raphinha", team: "Brasil", flag: "🇧🇷" },
  { name: "Gabriel Jesus", team: "Brasil", flag: "🇧🇷" },
  { name: "Lucas Paquetá", team: "Brasil", flag: "🇧🇷" },
  { name: "Bruno Guimarães", team: "Brasil", flag: "🇧🇷" },
  { name: "Endrick Felipe", team: "Brasil", flag: "🇧🇷" },
  { name: "Álvaro Morata", team: "España", flag: "🇪🇸" },
  { name: "Lamine Yamal", team: "España", flag: "🇪🇸" },
  { name: "Nico Williams", team: "España", flag: "🇪🇸" },
  { name: "Dani Olmo", team: "España", flag: "🇪🇸" },
  { name: "Pedri González", team: "España", flag: "🇪🇸" },
  { name: "Gavi (Pablo Martín)", team: "España", flag: "🇪🇸" },
  { name: "Rodri Hernández", team: "España", flag: "🇪🇸" },
  { name: "Ferran Torres", team: "España", flag: "🇪🇸" },
  { name: "Jamal Musiala", team: "Alemania", flag: "🇩🇪" },
  { name: "Florian Wirtz", team: "Alemania", flag: "🇩🇪" },
  { name: "Kai Havertz", team: "Alemania", flag: "🇩🇪" },
  { name: "Thomas Müller", team: "Alemania", flag: "🇩🇪" },
  { name: "Leroy Sané", team: "Alemania", flag: "🇩🇪" },
  { name: "Serge Gnabry", team: "Alemania", flag: "🇩🇪" },
  { name: "Niclas Füllkrug", team: "Alemania", flag: "🇩🇪" },
  { name: "Ilkay Gündogan", team: "Alemania", flag: "🇩🇪" },
  { name: "Cristiano Ronaldo", team: "Portugal", flag: "🇵🇹" },
  { name: "Gonçalo Ramos", team: "Portugal", flag: "🇵🇹" },
  { name: "Bernardo Silva", team: "Portugal", flag: "🇵🇹" },
  { name: "Bruno Fernandes", team: "Portugal", flag: "🇵🇹" },
  { name: "Rafael Leão", team: "Portugal", flag: "🇵🇹" },
  { name: "João Félix", team: "Portugal", flag: "🇵🇹" },
  { name: "Diogo Jota", team: "Portugal", flag: "🇵🇹" },
  { name: "Harry Kane", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Jude Bellingham", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Bukayo Saka", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Phil Foden", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Marcus Rashford", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Ollie Watkins", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Cole Palmer", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Darwin Núñez", team: "Uruguay", flag: "🇺🇾" },
  { name: "Luis Suárez", team: "Uruguay", flag: "🇺🇾" },
  { name: "Federico Valverde", team: "Uruguay", flag: "🇺🇾" },
  { name: "Giorgian de Arrascaeta", team: "Uruguay", flag: "🇺🇾" },
  { name: "Facundo Pellistri", team: "Uruguay", flag: "🇺🇾" },
  { name: "Cody Gakpo", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Memphis Depay", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Xavi Simons", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Wout Weghorst", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Donyell Malen", team: "Países Bajos", flag: "🇳🇱" },
  { name: "Christian Pulisic", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Folarin Balogun", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Timothy Weah", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Giovanni Reyna", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Weston McKennie", team: "Estados Unidos", flag: "🇺🇸" },
  { name: "Santiago Giménez", team: "México", flag: "🇲🇽" },
  { name: "Henry Martín", team: "México", flag: "🇲🇽" },
  { name: "Hirving Lozano", team: "México", flag: "🇲🇽" },
  { name: "Uriel Antuna", team: "México", flag: "🇲🇽" },
  { name: "Edson Álvarez", team: "México", flag: "🇲🇽" },
  { name: "Erling Haaland", team: "Noruega", flag: "🇳🇴" },
  { name: "Martin Ødegaard", team: "Noruega", flag: "🇳🇴" },
  { name: "Romelu Lukaku", team: "Bélgica", flag: "🇧🇪" },
  { name: "Kevin De Bruyne", team: "Bélgica", flag: "🇧🇪" },
  { name: "Leandro Trossard", team: "Bélgica", flag: "🇧🇪" },
  { name: "Jérémy Doku", team: "Bélgica", flag: "🇧🇪" },
  { name: "Luis Díaz", team: "Colombia", flag: "🇨🇴" },
  { name: "James Rodríguez", team: "Colombia", flag: "🇨🇴" },
  { name: "Jhon Durán", team: "Colombia", flag: "🇨🇴" },
  { name: "Rafael Santos Borré", team: "Colombia", flag: "🇨🇴" },
  { name: "Mateo Retegui", team: "Italia", flag: "🇮🇹" },
  { name: "Federico Chiesa", team: "Italia", flag: "🇮🇹" },
  { name: "Gianluca Scamacca", team: "Italia", flag: "🇮🇹" },
  { name: "Youssef En-Nesyri", team: "Marruecos", flag: "🇲🇦" },
  { name: "Hakim Ziyech", team: "Marruecos", flag: "🇲🇦" },
  { name: "Brahim Díaz", team: "Marruecos", flag: "🇲🇦" },
  { name: "Luka Modric", team: "Croacia", flag: "🇭🇷" },
  { name: "Andrej Kramaric", team: "Croacia", flag: "🇭🇷" },
  { name: "Robert Lewandowski", team: "Polonia", flag: "🇵🇱" },
  { name: "Heung-min Son", team: "Corea del Sur", flag: "🇰🇷" },
  { name: "Sadio Mané", team: "Senegal", flag: "🇸🇳" },
  { name: "Mohamed Salah", team: "Egipto", flag: "🇪🇬" },
  { name: "Victor Osimhen", team: "Nigeria", flag: "🇳🇬" }
];

app.get("/api/players/search", (req, res) => {
  const query = (req.query.q as string || "").toLowerCase().trim();
  if (query.length < 3) {
    return res.json([]);
  }

  const allPlayers = [...FAMOUS_PLAYERS];

  const comp = (req.query.competition as string || "WC").toUpperCase();
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

  const results = allPlayers.filter(p => 
    p.name.toLowerCase().includes(query) || 
    p.team.toLowerCase().includes(query)
  );

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

  const results = mergedTeams.filter(t => 
    t.name.toLowerCase().includes(query)
  );

  res.json(results);
});

export default app;
