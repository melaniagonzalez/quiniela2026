/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Calendar, Table as TableIcon, Share2, Save, RotateCcw, ChevronRight, ChevronLeft, Settings, FlaskConical, Users, Plus, UserPlus, UserMinus, Trash2, Home, Search, Check, Edit, Info, Newspaper, FileText, LayoutDashboard, Eye, X } from 'lucide-react';
import { TEAMS, MATCHES } from './constants';
import { TEAMS_2022, MATCHES_2022, SCORERS_MOCK } from './simulationData';
import { Prediction, GroupStanding, Match, Team, League, LeagueMember } from './types';
import { calculateStandings } from './lib/calculations';
import { cn } from './lib/utils';

// UI Components from shadcn
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';
import { ScrollArea } from './components/ui/scroll-area';
import { Separator } from './components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';

import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { Skeleton } from './components/ui/skeleton';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, onSnapshot, query, orderBy, limit, writeBatch, where, addDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc, getDocs } from 'firebase/firestore';

const ADMIN_EMAILS = ['melaniagonzalez@gmail.com'];
const DYNAMIC_ADMIN_EMAILS = [...ADMIN_EMAILS];

const isAdminEmail = (email: string | null) => {
  if (!email) return false;
  const lower = email.toLowerCase();
  return DYNAMIC_ADMIN_EMAILS.includes(lower) || lower === 'melaniagonzalez@gmail.com';
};

const getDeterministicSimulationScore = (matchId: string): { home: number; away: number } => {
  let hash = 0;
  for (let i = 0; i < matchId.length; i++) {
    hash = matchId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const home = Math.abs(hash % 4); // 0 to 3 goals
  const away = Math.abs((hash >> 3) % 4); // 0 to 3 goals
  return { home, away };
};

const AVATARS_LIST = [
  { name: 'Sofia (Chica - Piel clara, pelo negro)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sofia&skinColor=ffdbb4&hairColor=000000' },
  { name: 'Elena (Chica - Piel clara, pelo castaño)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Elena&skinColor=ffdbb4&hairColor=4a3728' },
  { name: 'Clara (Chica - Piel clara, pelo naranja)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Clara&skinColor=ffdbb4&hairColor=b55716' },
  { name: 'Luna (Chica - Piel clara, pelo rosa)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&skinColor=ffdbb4&hairColor=e54b80' },
  { name: 'Maya (Chica - Piel morena, pelo negro)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Maya&skinColor=edb98a&hairColor=000000' },
  { name: 'Chloe (Chica - Piel morena, pelo castaño)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Chloe&skinColor=d28943&hairColor=4a3728' },
  { name: 'Zara (Chica - Piel negra, pelo negro)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Zara&skinColor=804005&hairColor=000000' },
  { name: 'Zoe (Chica - Piel negra, pelo azul)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe&skinColor=804005&hairColor=2c45ea' },
  { name: 'Kael (Chico - Piel clara, pelo negro)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Kael&skinColor=ffdbb4&hairColor=000000' },
  { name: 'Leo (Chico - Piel clara, pelo castaño)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&skinColor=ffdbb4&hairColor=4a3728' },
  { name: 'Max (Chico - Piel clara, pelo rubio)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Max&skinColor=ffdbb4&hairColor=e5c158' },
  { name: 'Oliver (Chico - Piel clara, pelo azul)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver&skinColor=ffdbb4&hairColor=2c45ea' },
  { name: 'Alex (Chico - Piel morena, pelo negro)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alex&skinColor=edb98a&hairColor=000000' },
  { name: 'Sam (Chico - Piel morena, pelo castaño)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sam&skinColor=d28943&hairColor=4a3728' },
  { name: 'Mateo (Chico - Piel morena, pelo naranja)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Mateo&skinColor=d28943&hairColor=b55716' },
  { name: 'Ryan (Chico - Piel negra, pelo negro)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Ryan&skinColor=804005&hairColor=1c1c1c' },
  { name: 'Emma (Chica - Piel clara, pelo rubio)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Emma&skinColor=ffdbb4&hairColor=e5c158' },
  { name: 'Julia (Chica - Piel clara, pelo largo café)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Julia&skinColor=ffdbb4&hairColor=4a3728' },
  { name: 'Lucas (Chico - Piel clara, pelo verde corto)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Lucas&skinColor=ffdbb4&hairColor=2ca74a' },
  { name: 'Sara (Chica - Piel clara, pelo corto castaño)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sara&skinColor=ffdbb4&hairColor=4a3728' },
  { name: 'Héctor (Chico - Piel morena, pelo canoso)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Hector&skinColor=edb98a&hairColor=e1e1e1' },
  { name: 'Mia (Chica - Piel morena, pelo café)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Mia&skinColor=edb98a&hairColor=4a3728' },
  { name: 'Aria (Chica - Piel clara, pelo morado)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aria&skinColor=ffdbb4&hairColor=6c2ca7' },
  { name: 'Marta (Señora - Piel morena, pelo gris)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Marta&skinColor=d28943&hairColor=e1e1e1' }
];

const getAvatarForUser = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % AVATARS_LIST.length);
  return AVATARS_LIST[index].url;
};

export default function App() {
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [simulatedDate, setSimulatedDate] = useState('2026-06-11T00:00:00Z');
  const [clickCount, setClickCount] = useState(0);

  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const selectedLeague = useMemo(() => leagues.find(l => l.id === selectedLeagueId), [leagues, selectedLeagueId]);

  const [guestLeagueId, setGuestLeagueId] = useState<string | null>(() => localStorage.getItem('guest_league_id'));
  const [guestLeague, setGuestLeague] = useState<League | null>(null);

  const [apiTeams, setApiTeams] = useState<Team[]>([]);
  const [apiMatches, setApiMatches] = useState<Match[]>([]);
  const [apiStandings, setApiStandings] = useState<any[]>([]);
  const [apiScorers, setApiScorers] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbLastUpdated, setDbLastUpdated] = useState<string | null>(null);
  const [nowTimeState, setNowTimeState] = useState<number>(Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTimeState(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    const fetchDbStatus = async () => {
      try {
        const res = await fetch('/api/db-status');
        if (res.ok) {
          const data = await res.json();
          if (data.lastUpdated) {
            setDbLastUpdated(data.lastUpdated);
          }
        }
      } catch (err) {
        console.error('Error fetching db status:', err);
      }
    };
    fetchDbStatus();
  }, [isSyncing]);

  const currentMatches = useMemo(() => {
    // Both modes now use 2026 data, but simulation uses local constants with mocked results
    const baseMatches = isSimulationMode ? MATCHES : (apiMatches.length > 0 ? apiMatches : MATCHES);
    let processedMatches = baseMatches.map(m => ({ ...m }));
    
    if (isSimulationMode) {
      // First, map simulated scores to make them actual results in simulator mode
      processedMatches = processedMatches.map(m => {
        const isFinished = new Date(m.date) < new Date(simulatedDate);
        if (isFinished) {
          const simScore = getDeterministicSimulationScore(m.id);
          return {
            ...m,
            actualHomeScore: simScore.home,
            actualAwayScore: simScore.away
          };
        }
        return m;
      });

      // Compute group standings based on simulated results
      const groups = ['A','B','C','D','E','F','G','H','I','J','K','L'];
      const groupStandings: Record<string, { teamId: string; points: number; gd: number; gf: number }[]> = {};
      
      groups.forEach(g => {
        const groupTeams = TEAMS.filter(t => t.group === g);
        const teamStats: Record<string, { teamId: string; points: number; gd: number; gf: number }> = {};
        groupTeams.forEach(t => {
          teamStats[t.id] = { teamId: t.id, points: 0, gd: 0, gf: 0 };
        });
        
        const groupMatches = processedMatches.filter(m => m.group === g && m.matchday && m.matchday <= 3);
        groupMatches.forEach(m => {
          if (!m.homeTeamId || !m.awayTeamId) return;
          const hs = m.actualHomeScore;
          const as = m.actualAwayScore;
          if (hs !== undefined && hs !== null && as !== undefined && as !== null) {
            if (teamStats[m.homeTeamId]) {
              teamStats[m.homeTeamId].gf += hs;
              teamStats[m.homeTeamId].gd += (hs - as);
            }
            if (teamStats[m.awayTeamId]) {
              teamStats[m.awayTeamId].gf += as;
              teamStats[m.awayTeamId].gd += (as - hs);
            }
            if (hs > as) {
              if (teamStats[m.homeTeamId]) teamStats[m.homeTeamId].points += 3;
            } else if (as > hs) {
              if (teamStats[m.awayTeamId]) teamStats[m.awayTeamId].points += 3;
            } else {
              if (teamStats[m.homeTeamId]) teamStats[m.homeTeamId].points += 1;
              if (teamStats[m.awayTeamId]) teamStats[m.awayTeamId].points += 1;
            }
          }
        });
        
        groupStandings[g] = Object.values(teamStats).sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
      });

      // Find the 8 best third place teams
      const thirdPlaces: { teamId: string; points: number; gd: number; gf: number }[] = [];
      groups.forEach(g => {
        if (groupStandings[g] && groupStandings[g][2]) {
          thirdPlaces.push(groupStandings[g][2]);
        }
      });
      const bestThirdPlacesSorted = [...thirdPlaces].sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
      const best8Third = bestThirdPlacesSorted.slice(0, 8).map(x => x.teamId);

      // Helper to get winner ID of a match with tie-breaker
      const getWinnerId = (m: any) => {
        if (!m.homeTeamId || !m.awayTeamId) return '';
        const hs = m.actualHomeScore;
        const as = m.actualAwayScore;
        if (hs === undefined || hs === null || as === undefined || as === null) return '';
        if (hs > as) return m.homeTeamId;
        if (as > hs) return m.awayTeamId;
        // Deterministic tie-breaker
        let val = 0;
        for (let i = 0; i < m.id.length; i++) {
          val += m.id.charCodeAt(i);
        }
        return val % 2 === 0 ? m.homeTeamId : m.awayTeamId;
      };

      // 1. Resolve Matchday 4 (LAST_32)
      const last32Matches = processedMatches.filter(m => m.matchday === 4);
      last32Matches.forEach((m, idx) => {
        let homeId = '';
        let awayId = '';
        if (idx < 12) {
          const currentGroup = groups[idx];
          const nextGroup = groups[(idx + 1) % 12];
          homeId = groupStandings[currentGroup]?.[0]?.teamId || '';
          awayId = groupStandings[nextGroup]?.[1]?.teamId || '';
        } else {
          const thirdIdx = idx - 12; // 0, 1, 2, 3
          const oppIdx = 7 - thirdIdx; // 7, 6, 5, 4
          homeId = best8Third[thirdIdx] || '';
          awayId = best8Third[oppIdx] || '';
        }
        m.homeTeamId = (homeId || null) as any;
        m.awayTeamId = (awayId || null) as any;
      });

      // 2. Resolve Matchday 5 (ROUND_OF_16)
      const last16Matches = processedMatches.filter(m => m.matchday === 5);
      last16Matches.forEach((m, idx) => {
        const matchA = last32Matches[idx * 2];
        const matchB = last32Matches[idx * 2 + 1];
        m.homeTeamId = ((matchA ? getWinnerId(matchA) : '') || null) as any;
        m.awayTeamId = ((matchB ? getWinnerId(matchB) : '') || null) as any;
      });

      // 3. Resolve Matchday 6 (QUARTER_FINALS)
      const quarterMatches = processedMatches.filter(m => m.matchday === 6);
      quarterMatches.forEach((m, idx) => {
        const matchA = last16Matches[idx * 2];
        const matchB = last16Matches[idx * 2 + 1];
        m.homeTeamId = ((matchA ? getWinnerId(matchA) : '') || null) as any;
        m.awayTeamId = ((matchB ? getWinnerId(matchB) : '') || null) as any;
      });

      // 4. Resolve Matchday 7 (SEMI_FINALS)
      const semiMatches = processedMatches.filter(m => m.matchday === 7);
      semiMatches.forEach((m, idx) => {
        const matchA = quarterMatches[idx * 2];
        const matchB = quarterMatches[idx * 2 + 1];
        m.homeTeamId = ((matchA ? getWinnerId(matchA) : '') || null) as any;
        m.awayTeamId = ((matchB ? getWinnerId(matchB) : '') || null) as any;
      });

      // 5. Resolve Matchday 8 (FINAL)
      const finalMatches = processedMatches.filter(m => m.matchday === 8);
      finalMatches.forEach((m, idx) => {
        const matchA = semiMatches[idx * 2];
        const matchB = semiMatches[idx * 2 + 1];
        m.homeTeamId = ((matchA ? getWinnerId(matchA) : '') || null) as any;
        m.awayTeamId = ((matchB ? getWinnerId(matchB) : '') || null) as any;
      });
    }
    
    return processedMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [isSimulationMode, apiMatches, simulatedDate]);

  const currentTeams = isSimulationMode ? TEAMS : (apiTeams.length > 0 ? apiTeams : TEAMS);

  const currentScorers = useMemo(() => {
    return isSimulationMode ? SCORERS_MOCK : apiScorers;
  }, [isSimulationMode, apiScorers]);

  const computedStandings = useMemo(() => {
    const groupsMap: Record<string, any[]> = {};
    currentMatches.forEach(m => {
      if (m.group && m.group.length === 1) { // Standard groups A-L
        if (!groupsMap[m.group]) groupsMap[m.group] = [];
        groupsMap[m.group].push(m);
      }
    });

    const compareDate = isSimulationMode ? new Date(simulatedDate) : new Date();

    return Object.entries(groupsMap).sort().map(([groupName, matches]) => {
      const stats: Record<string, any> = {};
      
      matches.forEach(m => {
        [m.homeTeamId, m.awayTeamId].forEach(id => {
          if (!stats[id]) {
            const team = currentTeams.find(t => t.id === id);
            stats[id] = { id, name: team?.name || id, crest: team?.flag || '🏳️', playedGames: 0, points: 0, goalDifference: 0 };
          }
        });

        if (new Date(m.date) < compareDate) {
          const hs = m.actualHomeScore !== undefined && m.actualHomeScore !== null ? m.actualHomeScore : null;
          const as = m.actualAwayScore !== undefined && m.actualAwayScore !== null ? m.actualAwayScore : null;
          if (hs !== null && as !== null) {
            stats[m.homeTeamId].playedGames++;
            stats[m.awayTeamId].playedGames++;
            stats[m.homeTeamId].goalDifference += (hs - as);
            stats[m.awayTeamId].goalDifference += (as - hs);
            if (hs > as) stats[m.homeTeamId].points += 3;
            else if (as > hs) stats[m.awayTeamId].points += 3;
            else {
              stats[m.homeTeamId].points += 1;
              stats[m.awayTeamId].points += 1;
            }
          }
        }
      });

      return {
        group: `GROUP_${groupName}`,
        table: Object.values(stats).sort((a,b) => b.points - a.points || b.goalDifference - a.goalDifference)
      };
    });
  }, [isSimulationMode, simulatedDate, currentMatches, currentTeams]);

  const [user, setUser] = useState<User | null>(null);
  const activeLeagueId = user ? selectedLeagueId : guestLeagueId;
  const activeLeague = useMemo(() => {
    if (user) {
      return leagues.find(l => l.id === selectedLeagueId) || null;
    }
    return guestLeague;
  }, [user, leagues, selectedLeagueId, guestLeague]);

  const [isAuthReady, setIsAuthReady] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>(() => 
    currentMatches.map(m => ({ matchId: m.id, homeScore: null, awayScore: null }))
  );

  const [participants, setParticipants] = useState<any[]>([]);
  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null);
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

  // Admins state & parameters
  const [dbAdmins, setDbAdmins] = useState<any[]>([]);
  const [currentUserAdminConfig, setCurrentUserAdminConfig] = useState<any | null>(null);
  const [showSuperAdminPanel, setShowSuperAdminPanel] = useState(false);
  const [superAdminTab, setSuperAdminTab] = useState<'admins' | 'requests'>('admins');
  const [requestStatusFilter, setRequestStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [adminFormEmail, setAdminFormEmail] = useState('');
  const [adminFormRole, setAdminFormRole] = useState<'admin' | 'superadmin'>('admin');
  const [adminFormMaxLeagues, setAdminFormMaxLeagues] = useState<number>(1);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [allRegisteredUsers, setAllRegisteredUsers] = useState<any[]>([]);
  const [allLeagues, setAllLeagues] = useState<any[]>([]);

  // Admin access request and login wizard states
  const [adminRequests, setAdminRequests] = useState<any[]>([]);
  const [adminLoginState, setAdminLoginState] = useState<string | null>(null);
  const [pendingApprovalUser, setPendingApprovalUser] = useState<any | null>(null);
  const [currentUserRequest, setCurrentUserRequest] = useState<any | null>(null);
  const [justRequestedInSession, setJustRequestedInSession] = useState<boolean>(false);
  const [isAdminConfigLoading, setIsAdminConfigLoading] = useState(true);

  // State variables for editing participant and delete confirmation dialog
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleteAdminConfirmOpen, setIsDeleteAdminConfirmOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<{ id: string; email: string } | null>(null);
  const [requestToDeny, setRequestToDeny] = useState<any | null>(null);
  const [isDenyRequestConfirmOpen, setIsDenyRequestConfirmOpen] = useState(false);
  const [requestToSuspend, setRequestToSuspend] = useState<any | null>(null);
  const [isSuspendConfirmOpen, setIsSuspendConfirmOpen] = useState(false);

  const isSuperAdmin = user ? (
    user.email?.toLowerCase() === 'melaniagonzalez@gmail.com' ||
    currentUserAdminConfig?.role === 'superadmin'
  ) : false;
  
  const isApprovedAdmin = isSuperAdmin || (currentUserAdminConfig !== null);
  
  // Decide if there is a restricted session active
  const isRestrictedSession = user ? (
    !isApprovedAdmin || 
    (currentUserRequest && currentUserRequest.status === 'approved' && !currentUserRequest.notified)
  ) : false;

  const maxLeaguesAllowed = isSuperAdmin ? 100 : (currentUserAdminConfig?.maxLeaguesAllowed ?? 1);

  // Clear news data when switching modes or when API data arrives
  useEffect(() => {
    setNewsData(null);
  }, [isSimulationMode, apiMatches]);

  // Sync Guest League Document if viewer is in Guest Spectator mode
  useEffect(() => {
    if (!user && guestLeagueId) {
      const getLeagueDoc = async () => {
        try {
          const docRef = doc(db, 'leagues', guestLeagueId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setGuestLeague({ id: docSnap.id, ...docSnap.data() } as League);
          } else {
            console.error("League not found");
            setGuestLeague(null);
            setGuestLeagueId(null);
            localStorage.removeItem('guest_league_id');
            toast.error('No se encontró ninguna quiniela con este código');
          }
        } catch (error) {
          console.error("Error loading guest league doc:", error);
        }
      };
      getLeagueDoc();
    } else if (user) {
      setGuestLeague(null);
      setGuestLeagueId(null);
      localStorage.removeItem('guest_league_id');
    }
  }, [user, guestLeagueId]);

  // Sync Competition Data
  useEffect(() => {
    if (!isSimulationMode && activeLeague?.competition) {
      syncCompetitionData(activeLeague.competition);
    }
  }, [isSimulationMode, activeLeague?.competition]);

  const syncCompetitionData = async (comp: string) => {
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/sync/${comp}`);
      if (!response.ok) throw new Error('Sync failed');
      const data = await response.json();
      if (data.teams && data.matches) {
        setApiTeams(data.teams);
        setApiMatches(data.matches);
        setApiStandings(data.standings || []);
        setApiScorers(data.scorers || []);
        toast.success(`Datos de ${comp === 'WC' ? 'el Mundial' : 'la Champions'} sincronizados`);
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error('Error al sincronizar datos oficiales');
    } finally {
      setIsSyncing(false);
    }
  };
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [newsData, setNewsData] = useState<any>(null);
  const [loadingNews, setLoadingNews] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [predictionsEditMode, setPredictionsEditMode] = useState(false);
  const [predictionsReadOnly, setPredictionsReadOnly] = useState(false);

  // Reset navigation and edit states when entering or leaving a pool
  useEffect(() => {
    setActiveTab('leaderboard');
    setPredictionsEditMode(false);
    setActiveParticipantId(null);
    setPredictionsReadOnly(false);
  }, [activeLeagueId]);

  const [predictionsStats, setPredictionsStats] = useState<Record<string, { filled: number; total: number }>>({});
  const [participantsPredictions, setParticipantsPredictions] = useState<Record<string, Prediction[]>>({});

  const [isCreatingLeague, setIsCreatingLeague] = useState(false);
  const [newLeagueCompetition, setNewLeagueCompetition] = useState<'WC' | 'CL'>('WC');
  const [newLeagueName, setNewLeagueName] = useState('');
  const [leagueInvites, setLeagueInvites] = useState<Record<string, string>>({});
  const [leagueLeaderboards, setLeagueLeaderboards] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'leagues'), where('memberUids', 'array-contains', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const leaguesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as League));
        setLeagues(leaguesData);
      });
      return () => unsubscribe();
    }
  }, [user]);

  // Load ALL leagues for the Super Admin
  useEffect(() => {
    if (user && isSuperAdmin && showSuperAdminPanel) {
      const unsubscribe = onSnapshot(collection(db, 'leagues'), (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllLeagues(list);
      }, (error) => {
        console.error("Error loading all leagues:", error);
      });
      return () => unsubscribe();
    }
  }, [user, isSuperAdmin, showSuperAdminPanel]);

  // Load ALL user profiles for the Super Admin
  useEffect(() => {
    if (user && isSuperAdmin && showSuperAdminPanel) {
      const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllRegisteredUsers(list);
      }, (error) => {
        console.error("Error loading all users:", error);
      });
      return () => unsubscribe();
    }
  }, [user, isSuperAdmin, showSuperAdminPanel]);

  // Load ALL admin requests for the Super Admin
  useEffect(() => {
    if (user && isSuperAdmin) {
      const unsubscribe = onSnapshot(collection(db, 'adminRequests'), (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAdminRequests(list);
      }, (error) => {
        console.error("Error loading admin requests:", error);
      });
      return () => unsubscribe();
    }
  }, [user, isSuperAdmin]);

  // Fetch and manage all authorized admins
  useEffect(() => {
    if (user) {
      if (isSuperAdmin) {
        const unsubscribe = onSnapshot(collection(db, 'admins'), async (snapshot) => {
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          
          // Perform automatic clean up of older seeded placeholders if any exist
          const dummyIds = ['admin_quiniela_com', 'administrador_quiniela_com'];
          let hasDummy = false;
          for (const docObj of snapshot.docs) {
            if (dummyIds.includes(docObj.id) || docObj.id.startsWith('admin_') || docObj.id.startsWith('administrador_')) {
              hasDummy = true;
              try {
                await deleteDoc(doc(db, 'admins', docObj.id));
              } catch (e) {
                console.error("Clean up error:", e);
              }
            }
          }

          if (hasDummy) {
            // Let the next snapshot handle the updated list cleanly
            return;
          }

          const filteredList = list.filter(adm => adm.email !== 'admin@quiniela.com' && adm.email !== 'administrador@quiniela.com');

          if (filteredList.length === 0) {
            console.log("Seeding default admins...");
            const initialAdmins = [
              { email: 'melaniagonzalez@gmail.com', role: 'superadmin', maxLeaguesAllowed: 10 }
            ];
            const batch = writeBatch(db);
            initialAdmins.forEach(adm => {
              const docId = adm.email.toLowerCase().trim();
              batch.set(doc(db, 'admins', docId), adm);
            });
            try {
              await batch.commit();
            } catch (err) {
              console.error("Error seeding initial admins:", err);
            }
          } else {
            setDbAdmins(filteredList);
            // Sync with dynamic admin emails array
            filteredList.forEach(adm => {
              const lowerEmail = adm.email.toLowerCase();
              if (!DYNAMIC_ADMIN_EMAILS.includes(lowerEmail)) {
                DYNAMIC_ADMIN_EMAILS.push(lowerEmail);
              }
            });
          }
        }, (error) => {
          console.error("Error loading admins list:", error);
        });
        return () => unsubscribe();
      }
    }
  }, [user]);

  // Fetch the current user admin permissions config and real-time request status
  useEffect(() => {
    if (user && user.email) {
      setIsAdminConfigLoading(true);
      const sanitizedId = user.email.toLowerCase().trim();
      const unsubscribeAdmin = onSnapshot(doc(db, 'admins', sanitizedId), (docSnap) => {
        if (docSnap.exists()) {
          const val = docSnap.data();
          setCurrentUserAdminConfig(val);
          const lowerEmail = user.email.toLowerCase();
          if (!DYNAMIC_ADMIN_EMAILS.includes(lowerEmail)) {
            DYNAMIC_ADMIN_EMAILS.push(lowerEmail);
          }
        } else {
          if (isAdminEmail(user.email)) {
            setCurrentUserAdminConfig({
              email: user.email,
              role: user.email === 'melaniagonzalez@gmail.com' ? 'superadmin' : 'admin',
              maxLeaguesAllowed: user.email === 'melaniagonzalez@gmail.com' ? 10 : 1
            });
          } else {
            setCurrentUserAdminConfig(null);
          }
        }
        setIsAdminConfigLoading(false);
      }, (error) => {
        setIsAdminConfigLoading(false);
        if (isAdminEmail(user.email)) {
          setCurrentUserAdminConfig({
            email: user.email,
            role: user.email === 'melaniagonzalez@gmail.com' ? 'superadmin' : 'admin',
            maxLeaguesAllowed: user.email === 'melaniagonzalez@gmail.com' ? 10 : 1
          });
        } else {
          setCurrentUserAdminConfig(null);
        }
      });

      // Real-time request subscription
      const unsubscribeRequest = onSnapshot(doc(db, 'adminRequests', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          setCurrentUserRequest(docSnap.data());
        } else {
          setCurrentUserRequest(null);
        }
      }, (error) => {
        console.error("Error subscribing to admin requests updates:", error);
        setCurrentUserRequest(null);
      });

      return () => {
        unsubscribeAdmin();
        unsubscribeRequest();
      };
    } else {
      setCurrentUserAdminConfig(null);
      setCurrentUserRequest(null);
      setIsAdminConfigLoading(false);
    }
  }, [user]);

  // If a league is selected, exit from the Super Admin Panel
  useEffect(() => {
    if (selectedLeagueId) {
      setShowSuperAdminPanel(false);
    }
  }, [selectedLeagueId]);

  // Sincronizar participantes de la quiniela seleccionada
  useEffect(() => {
    if (!activeLeagueId) {
      setParticipants([]);
      setActiveParticipantId(null);
      return;
    }

    const q = query(
      collection(db, 'users'),
      where('leagueId', '==', activeLeagueId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data());
      // Ordenar por totalPoints descendente para que actúe como leaderboard
      const sorted = list.sort((a: any, b: any) => (b.totalPoints || 0) - (a.totalPoints || 0));
      setParticipants(sorted);
      
      // Auto-seleccionar el primer participante si ninguno está seleccionado
      if (sorted.length > 0) {
        setActiveParticipantId(prev => {
          if (prev && sorted.some((p: any) => p.uid === prev)) {
            return prev;
          }
          return sorted[0].uid;
        });
      } else {
        setActiveParticipantId(null);
      }
    }, (error) => {
      console.error("Error loading participants:", error);
      toast.error("Error al cargar los participantes de la quiniela");
    });

    return () => unsubscribe();
  }, [activeLeagueId]);

  const [guestInputCode, setGuestInputCode] = useState('');

  const handleJoinAsGuest = async () => {
    const code = guestInputCode.trim();
    if (!code) {
      toast.error('Por favor ingresa un código de quiniela');
      return;
    }
    
    const loadingToast = toast.loading('Buscando quiniela...');
    try {
      const docRef = doc(db, 'leagues', code);
      const docSnap = await getDoc(docRef);
      toast.dismiss(loadingToast);
      if (docSnap.exists()) {
        const leagueData = { id: docSnap.id, ...docSnap.data() } as League;
        setGuestLeague(leagueData);
        setGuestLeagueId(code);
        localStorage.setItem('guest_league_id', code);
        toast.success(`Quiniela "${leagueData.name}" cargada correctamente`);
      } else {
        toast.error('No se encontró ninguna quiniela con este código');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error joining as guest:", error);
      toast.error('Error al unirse a la quiniela');
    }
  };

  // Admin Management Handlers
  const handleSaveAdmin = async (e: any) => {
    e.preventDefault();
    if (!adminFormEmail.trim()) {
      toast.error('El correo electrónico es obligatorio');
      return;
    }
    const emailLower = adminFormEmail.trim().toLowerCase();
    
    setIsSavingAdmin(true);
    const docId = emailLower;
    
    try {
      await setDoc(doc(db, 'admins', docId), {
        email: emailLower,
        role: adminFormRole,
        maxLeaguesAllowed: Number(adminFormMaxLeagues) || 1
      }, { merge: true });
      
      toast.success(editingAdminId ? 'Administrador actualizado' : 'Administrador autorizado');
      setAdminFormEmail('');
      setAdminFormRole('admin');
      setAdminFormMaxLeagues(1);
      setEditingAdminId(null);
    } catch (error) {
      console.error("Error saving admin:", error);
      toast.error('No se pudo guardar el administrador. Revisa tus permisos.');
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const handleEditAdminClick = (admin: any) => {
    setEditingAdminId(admin.id);
    setAdminFormEmail(admin.email);
    setAdminFormRole(admin.role);
    setAdminFormMaxLeagues(admin.maxLeaguesAllowed || 1);
  };

  // Approval and Status Management Handlers for Admin Requests
  const handleUpdateUserRequestStatus = async (request: any, newStatus: 'approved' | 'rejected' | 'pending', skipConfirm = false) => {
    const requestUid = request.id || request.uid;
    if (!requestUid) {
      toast.error("No se pudo identificar el identificador único del usuario");
      return;
    }

    // Safety check confirmations
    if (!skipConfirm) {
      if (newStatus === 'rejected') {
        setRequestToDeny(request);
        setIsDenyRequestConfirmOpen(true);
        return;
      } else if (newStatus === 'pending' && request.status === 'approved') {
        setRequestToSuspend(request);
        setIsSuspendConfirmOpen(true);
        return;
      }
    }

    try {
      const emailLower = request.email.trim().toLowerCase();
      const docId = emailLower;

      // Update adminRequests status
      await updateDoc(doc(db, 'adminRequests', requestUid), {
        status: newStatus,
        notified: newStatus === 'rejected' ? true : false
      });

      // Maintain admins collection sync
      if (newStatus === 'approved') {
        await setDoc(doc(db, 'admins', docId), {
          email: emailLower,
          role: 'admin',
          maxLeaguesAllowed: 1
        }, { merge: true });
      } else {
        try {
          await deleteDoc(doc(db, 'admins', docId));
        } catch (e) {
          // ignore if doesn't exist
        }
      }

      // Maintain users collection sync
      const isUserAdmin = newStatus === 'approved';
      const userAdminRole = newStatus === 'approved' ? 'admin' : 'none';

      try {
        await updateDoc(doc(db, 'users', requestUid), {
          isAdmin: isUserAdmin,
          adminRequestStatus: newStatus,
          adminRole: userAdminRole
        });
      } catch (err) {
        await setDoc(doc(db, 'users', requestUid), {
          uid: requestUid,
          displayName: request.displayName || 'Administrador',
          email: emailLower,
          searchName: (request.displayName || 'Administrador').toLowerCase(),
          searchEmail: emailLower,
          photoURL: request.photoURL || '',
          isAdmin: isUserAdmin,
          adminRequestStatus: newStatus,
          adminRole: userAdminRole
        }, { merge: true });
      }

      toast.success(`Solicitud de ${request.email} cambiada a ${
        newStatus === 'approved' ? 'APROBADA' : newStatus === 'rejected' ? 'RECHAZADA' : 'PENDIENTE'
      } con éxito.`);
    } catch (error) {
      console.error("Error updating user request status:", error);
      toast.error("No se pudo actualizar el estado de la solicitud");
    }
  };

  const handleApproveRequest = async (request: any) => {
    await handleUpdateUserRequestStatus(request, 'approved');
  };

  const handleRejectRequest = async (request: any) => {
    await handleUpdateUserRequestStatus(request, 'rejected');
  };

  const handleDeleteAdminClick = (adminId: string, adminEmail: string) => {
    if (adminEmail === 'melaniagonzalez@gmail.com') {
      toast.error('No puedes revocar los permisos al Súper Administrador primario');
      return;
    }
    setAdminToDelete({ id: adminId, email: adminEmail });
    setIsDeleteAdminConfirmOpen(true);
  };

  const handleConfirmDeleteAdmin = async () => {
    if (!adminToDelete) return;
    const { id: adminId, email: adminEmail } = adminToDelete;
    
    try {
      // 1. Delete admin doc
      await deleteDoc(doc(db, 'admins', adminId));
      
      // 2. Find request by email in adminRequests and set status to 'rejected'
      const matchedRequest = adminRequests.find(
        r => r.email?.trim().toLowerCase() === adminEmail.trim().toLowerCase()
      );
      
      if (matchedRequest) {
        await updateDoc(doc(db, 'adminRequests', matchedRequest.id), {
          status: 'rejected',
          notified: true
        });

        // Also update corresponding user profile so metadata matches
        try {
          await updateDoc(doc(db, 'users', matchedRequest.id), {
            isAdmin: false,
            adminRequestStatus: 'rejected',
            adminRole: 'none'
          });
        } catch (e) {
          // ignore if user profile doesn't exist
        }
      } else {
        // If they did not have a request document (e.g. they were added directly by super admin input)
        // Let's see if we can find them in allRegisteredUsers
        const matchedUser = allRegisteredUsers.find(
          u => u.email?.trim().toLowerCase() === adminEmail.trim().toLowerCase()
        );
        if (matchedUser) {
          try {
            await setDoc(doc(db, 'adminRequests', matchedUser.uid), {
              uid: matchedUser.uid,
              displayName: matchedUser.displayName || 'Administrador',
              email: adminEmail.trim().toLowerCase(),
              status: 'rejected',
              notified: true,
              createdAt: Date.now()
            }, { merge: true });

            await updateDoc(doc(db, 'users', matchedUser.uid), {
              isAdmin: false,
              adminRequestStatus: 'rejected',
              adminRole: 'none'
            });
          } catch (e) {
            // ignore if errors occur
          }
        }
      }

      toast.success(`Administrador ${adminEmail} removido. Su solicitud de acceso es ahora 'Rechazada/Denegada'`);
      
      if (editingAdminId === adminId) {
        setEditingAdminId(null);
        setAdminFormEmail('');
        setAdminFormRole('admin');
        setAdminFormMaxLeagues(1);
      }
    } catch (error) {
      console.error("Error deleting admin:", error);
      toast.error('No se pudo eliminar el administrador');
    } finally {
      setIsDeleteAdminConfirmOpen(false);
      setAdminToDelete(null);
    }
  };

  const getLeaguesCreatedCount = (email: string) => {
    const matchedUser = allRegisteredUsers.find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (!matchedUser) return 0;
    return allLeagues.filter(l => l.creatorId === matchedUser.uid).length;
  };

  const handleGoBack = () => {
    if (predictionsEditMode || isAddingParticipant || activeTab !== 'leaderboard') {
      setPredictionsEditMode(false);
      setIsAddingParticipant(false);
      setActiveTab('leaderboard');
      setPredictionsReadOnly(false);
      return;
    }
    if (user) {
      setSelectedLeagueId(null);
    } else {
      setGuestLeagueId(null);
      setGuestLeague(null);
      localStorage.removeItem('guest_league_id');
    }
  };

  const handleCreateLeague = async () => {
    if (!user) return;
    if (!newLeagueName.trim()) {
      toast.error('El nombre de la liga es obligatorio');
      return;
    }
    if (newLeagueName.length > 10) {
      toast.error('El nombre de la liga no puede tener más de 10 caracteres');
      return;
    }

    if (newLeagueCompetition === 'CL') {
      toast.error('La creación de quinielas para la Champions League está deshabilitada temporalmente porque la temporada ya terminó.');
      return;
    }

    const userLeagues = leagues.filter(l => l.creatorId === user.uid);
    if (userLeagues.length >= maxLeaguesAllowed) {
      toast.error(`Solo tienes permiso para crear hasta ${maxLeaguesAllowed} quinielas`);
      return;
    }

    try {
      // Generate a unique 5-character alphanumeric ID (uppercase A-Z and 0-9)
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let uniqueId = '';
      let isUnique = false;
      let checkAttempts = 0;

      while (!isUnique && checkAttempts < 10) {
        let tempId = '';
        for (let i = 0; i < 5; i++) {
          tempId += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Verify uniqueness
        const checkDoc = await getDoc(doc(db, 'leagues', tempId));
        if (!checkDoc.exists()) {
          uniqueId = tempId;
          isUnique = true;
        }
        checkAttempts++;
      }

      // Fallback in the extremely unlikely event of multiple collisions
      if (!uniqueId) {
        uniqueId = Math.random().toString(36).substring(2, 7).toUpperCase();
      }

      const leagueRef = doc(db, 'leagues', uniqueId);
      await setDoc(leagueRef, {
        name: newLeagueName,
        creatorId: user.uid,
        creatorName: user.displayName || 'Usuario',
        memberUids: [user.uid],
        createdAt: new Date().toISOString(),
        isPrivate: true,
        competition: newLeagueCompetition
      });

      setNewLeagueName('');
      setNewLeagueCompetition('WC');
      setIsCreatingLeague(false);
      setSelectedLeagueId(uniqueId);
      toast.success('Quiniela creada correctamente');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'leagues');
    }
  };

  const inviteToLeague = async (leagueId: string) => {
    const inviteEmail = leagueInvites[leagueId];
    if (!inviteEmail) return;

    toast.loading('Invitando...');
    // Real implementation would need a user search, but for now we'll simulate or wait for proper member management
    // In a real app, you might send an email or check if user exists.
    // Here we'll just show info how to share the league ID.
    toast.dismiss();
    toast.info(`Para invitar, comparte el ID de la liga: ${leagueId}`);
  };

  const joinLeagueById = async (id: string) => {
    if (!user) return;
    try {
      const leagueRef = doc(db, 'leagues', id);
      await updateDoc(leagueRef, {
        memberUids: arrayUnion(user.uid)
      });
      setSelectedLeagueId(id);
      toast.success('Te has unido a la quiniela');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'leagues');
    }
  };

  const leaveLeague = async (leagueId: string) => {
    if (!user) return;
    try {
      const leagueRef = doc(db, 'leagues', leagueId);
      await updateDoc(leagueRef, {
        memberUids: arrayRemove(user.uid)
      });
      toast.success('Has salido de la quiniela');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'leagues');
    }
  };

  const deleteLeague = async (leagueId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'leagues', leagueId));
      toast.success('Quiniela eliminada');
      setSelectedLeagueId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'leagues');
    }
  };

  const [isCleaningDb, setIsCleaningDb] = useState(false);
  const [cleanupProgress, setCleanupProgress] = useState(0);
  const [cleanupStatus, setCleanupStatus] = useState('');
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);

  const handleCleanDatabase = async () => {
    if (!user || !isSuperAdmin) {
      toast.error('No tienes permisos de administrador para realizar esta acción');
      return;
    }

    setIsCleaningDb(true);
    setCleanupProgress(0);
    setCleanupStatus('Iniciando limpieza y preparando conexión...');
    const toastId = toast.loading('Iniciando limpieza de base de datos...');

    try {
      setCleanupStatus('Obteniendo información de quinielas y usuarios...');
      const [leaguesSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, 'leagues')),
        getDocs(collection(db, 'users'))
      ]);

      const totalLeagues = leaguesSnap.size;
      const totalUsers = usersSnap.size;
      const totalSteps = totalLeagues + totalUsers;

      let processedSteps = 0;
      let leaguesCount = 0;
      let usersCount = 0;
      let predictionsCount = 0;

      if (totalSteps === 0) {
        setCleanupProgress(100);
        setCleanupStatus('La base de datos ya está vacía.');
        toast.success('La base de datos ya está vacía', { id: toastId });
        setIsCleaningDb(false);
        return;
      }

      setCleanupProgress(5);

      // 1. Delete all leagues
      for (const lDoc of leaguesSnap.docs) {
        setCleanupStatus(`Eliminando quiniela: "${lDoc.data()?.name || lDoc.id}" (${leaguesCount + 1}/${totalLeagues})...`);
        await deleteDoc(doc(db, 'leagues', lDoc.id));
        leaguesCount++;
        processedSteps++;
        setCleanupProgress(Math.min(95, Math.round((processedSteps / totalSteps) * 100)));
      }

      // 2. Delete all users and their predictions
      toast.loading('Eliminando perfiles de usuarios y predicciones...', { id: toastId });
      for (const uDoc of usersSnap.docs) {
        const uId = uDoc.id;
        const uData = uDoc.data();
        const displayName = uData?.displayName || 'Usuario';
        
        setCleanupStatus(`Obteniendo predicciones del usuario: ${displayName}...`);

        // Delete predictions
        const predsSnap = await getDocs(collection(db, 'users', uId, 'predictions'));
        for (const pDoc of predsSnap.docs) {
          await deleteDoc(doc(db, 'users', uId, 'predictions', pDoc.id));
          predictionsCount++;
        }
        
        setCleanupStatus(`Eliminando perfil del usuario: ${displayName}...`);
        await deleteDoc(doc(db, 'users', uId));
        usersCount++;
        processedSteps++;
        setCleanupProgress(Math.min(95, Math.round((processedSteps / totalSteps) * 100)));
      }

      setCleanupProgress(100);
      setCleanupStatus(`¡Completado con éxito! Se eliminaron: ${leaguesCount} quinielas, ${usersCount} usuarios y ${predictionsCount} predicciones.`);
      toast.success(`Base de datos limpiada con éxito: Se eliminaron ${leaguesCount} quinielas, ${usersCount} perfiles de usuario y ${predictionsCount} predicciones.`, { id: toastId });
      setSelectedLeagueId(null);
      
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error('Error al limpiar la base de datos:', error);
      toast.error('Error durante la limpieza de la base de datos', { id: toastId });
      setCleanupStatus('Error al limpiar la base de datos.');
    } finally {
      setIsCleaningDb(false);
    }
  };

  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [foundUsers, setFoundUsers] = useState<any[]>([]);
  const [isRenaming, setIsRenaming] = useState(false);
  const [editLeagueName, setEditLeagueName] = useState('');

  const searchUsers = async (term: string) => {
    setUserSearchTerm(term);
    const cleanTerm = term.trim().toLowerCase();
    if (cleanTerm.length < 3) {
      setFoundUsers([]);
      return;
    }
    
    try {
      // Intentamos buscar por nombre (lowercase) o por email
      const isEmail = cleanTerm.includes('@');
      const searchField = isEmail ? 'searchEmail' : 'searchName';
      
      const q = query(
        collection(db, 'users'),
        where(searchField, '>=', cleanTerm),
        where(searchField, '<=', cleanTerm + '\uf8ff'),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      const results = snapshot.docs
        .map(doc => doc.data())
        .filter(u => u.uid !== user?.uid && !selectedLeague?.memberUids.includes(u.uid));
      setFoundUsers(results);
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };

  const updateLeagueName = async () => {
    if (!selectedLeagueId || !editLeagueName.trim()) return;
    if (editLeagueName.length > 10) {
      toast.error('El nombre de la liga no puede tener más de 10 caracteres');
      return;
    }
    try {
      await updateDoc(doc(db, 'leagues', selectedLeagueId), {
        name: editLeagueName
      });
      setIsRenaming(false);
      toast.success('Nombre actualizado');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'leagues');
    }
  };

  const inviteUser = async (targetUid: string) => {
    if (!selectedLeagueId) return;
    try {
      await updateDoc(doc(db, 'leagues', selectedLeagueId), {
        memberUids: arrayUnion(targetUid)
      });
      toast.success('Usuario agregado a la quiniela');
      setFoundUsers(prev => prev.filter(u => u.uid !== targetUid));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'leagues');
    }
  };

  const calculateUserPoints = (userPredictions: Prediction[]) => {
    let totalPoints = 0;
    let correctResults = 0;
    let correctWinners = 0;

    userPredictions.forEach(pred => {
      if (pred.homeScore === null || pred.awayScore === null) return;

      const actualMatch = currentMatches.find(m => m.id === pred.matchId);
      
      if (!actualMatch) return;

      const isFinished = isSimulationMode 
        ? new Date(actualMatch.date) < new Date(simulatedDate)
        : (['FINISHED', 'FT', 'AWARDED'].includes(actualMatch.status || '') || (apiMatches.length === 0 && new Date(actualMatch.date) < new Date()));
      
      if (!isFinished) return;

      const homeRes = actualMatch.actualHomeScore;
      const awayRes = actualMatch.actualAwayScore;

      if (homeRes === null || awayRes === null) return;

      // Check for Exact Result (3 points)
      if (pred.homeScore === homeRes && pred.awayScore === awayRes) {
        totalPoints += 3;
        correctResults++;
      } 
      // Check for Correct Winner/Draw (1 point)
      else {
        const predResult = Math.sign(pred.homeScore - pred.awayScore);
        const actualResult = Math.sign(homeRes - awayRes);
        
        if (predResult === actualResult) {
          totalPoints += 1;
          correctWinners++;
        }
      }
    });

    return { totalPoints, correctResults, correctWinners };
  };

  // Seed Test Users
  const seedTestUsers = async () => {
    const testUsers = [
      { uid: 'test_1', displayName: 'Prueba 1', photoURL: 'https://picsum.photos/seed/p1/100/100', totalPoints: 45, correctResults: 3, correctWinners: 12 },
      { uid: 'test_2', displayName: 'Prueba 2', photoURL: 'https://picsum.photos/seed/p2/100/100', totalPoints: 38, correctResults: 2, correctWinners: 10 },
    ];

    try {
      for (const u of testUsers) {
        const ref = doc(db, 'users', u.uid);
        await setDoc(ref, u);
      }
      toast.success('Usuarios de prueba creados');
    } catch (error) {
      console.error("Seeding error:", error);
      handleFirestoreError(error, OperationType.WRITE, 'users/test_x');
    }
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const emailLower = currentUser.email?.toLowerCase();
        
        if (!emailLower) {
          setUser(null);
          await signOut(auth);
          setIsAuthReady(true);
          return;
        }

        setUser(currentUser);

        // Ensure user profile exists in Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const emailLower = currentUser.email?.toLowerCase() || '';
          const docId = emailLower;
          
          let isReallyAdmin = isAdminEmail(currentUser.email);
          let adminRole = isReallyAdmin ? (emailLower === 'melaniagonzalez@gmail.com' ? 'superadmin' : 'admin') : 'none';
          let requestStatus = 'none';

          // Check if admins document exists
          if (!isReallyAdmin && docId) {
            const adminDoc = await getDoc(doc(db, 'admins', docId));
            if (adminDoc.exists()) {
              isReallyAdmin = true;
              adminRole = adminDoc.data().role || 'admin';
            }
          }

          // Check requestStatus
          const reqDoc = await getDoc(doc(db, 'adminRequests', currentUser.uid));
          if (reqDoc.exists()) {
            requestStatus = reqDoc.data().status || 'pending';
            if (requestStatus === 'approved') {
              isReallyAdmin = true;
              adminRole = 'admin';
            }
          }

          if (isReallyAdmin && emailLower) {
            if (!DYNAMIC_ADMIN_EMAILS.includes(emailLower)) {
              DYNAMIC_ADMIN_EMAILS.push(emailLower);
            }
          }

          const userDoc = await getDoc(userRef);
          const defaultName = isReallyAdmin ? 'Administrador' : 'Usuario de Quiniela';
          const finalDisplayName = currentUser.displayName || defaultName;

          const userData: any = {
            uid: currentUser.uid,
            displayName: finalDisplayName,
            email: currentUser.email || '',
            searchName: finalDisplayName.toLowerCase(),
            searchEmail: (currentUser.email || '').toLowerCase(),
            photoURL: currentUser.photoURL || '',
            isAdmin: isReallyAdmin,
            adminRequestStatus: requestStatus,
            adminRole: adminRole
          };
          
          if (!userDoc.exists()) {
            userData.totalPoints = 0;
            userData.correctResults = 0;
            userData.correctWinners = 0;
            await setDoc(userRef, userData);
          } else {
            await updateDoc(userRef, userData);
          }
        } catch (error) {
          console.error("Error setting up user profile:", error);
        }
      } else {
        setUser(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Sync Predictions from Firestore for active participant
  useEffect(() => {
    if (!isAuthReady) return;

    const targetLeagueId = user ? selectedLeagueId : guestLeagueId;
    if (!targetLeagueId) {
      // Not in any league, load blank predictions
      setPredictions(currentMatches.map(m => ({ matchId: m.id, homeScore: null, awayScore: null })));
      return;
    }

    const targetId = activeParticipantId || (user ? user.uid : null);
    if (!targetId) {
      setPredictions(currentMatches.map(m => ({ matchId: m.id, homeScore: null, awayScore: null })));
      return;
    }

    const predictionsRef = collection(db, 'users', targetId, 'predictions');
    const unsubscribe = onSnapshot(predictionsRef, (snapshot) => {
      const firestorePredictions = snapshot.docs.map(doc => doc.data() as Prediction);
      
      // Merge with all matches to ensure we have a full list
      const fullPredictions = currentMatches.map(m => {
        const found = firestorePredictions.find(p => p.matchId === m.id);
        return found || { matchId: m.id, homeScore: null, awayScore: null };
      });
      
      setPredictions(fullPredictions);
    }, (error) => {
      console.error('Error fetching predictions:', error);
    });

    return () => unsubscribe();
  }, [user, isAuthReady, activeParticipantId, selectedLeagueId, guestLeagueId, currentMatches]);

  // Recalculate leaderboard dynamically whenever participants list, their predictions, or matches change
  useEffect(() => {
    const recalculated = participants.map(p => {
      const userPreds = participantsPredictions[p.uid];
      if (userPreds === undefined) {
        // Fallback to what is stored in Firestore user document initially (still loading)
        return {
          ...p,
          totalPoints: p.totalPoints || 0,
          correctResults: p.correctResults || 0,
          correctWinners: p.correctWinners || 0
        };
      }
      
      const { totalPoints, correctResults, correctWinners } = calculateUserPoints(userPreds);
      return {
        ...p,
        totalPoints,
        correctResults,
        correctWinners
      };
    });
    
    // Sort descending by totalPoints
    const sorted = recalculated.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
    setLeaderboard(sorted);
  }, [participants, participantsPredictions, currentMatches, isSimulationMode, simulatedDate]);

  // Obtener estadísticas de predicciones llenas y listas de predicciones para cada participante de la quiniela
  useEffect(() => {
    if (participants.length === 0) {
      setPredictionsStats({});
      setParticipantsPredictions({});
      return;
    }

    const unsubscribes = participants.map(p => {
      const predictionsRef = collection(db, 'users', p.uid, 'predictions');
      return onSnapshot(predictionsRef, (snapshot) => {
        const docs = snapshot.docs;
        const predsList = docs.map(doc => doc.data() as Prediction);
        const filledCount = predsList.filter(pred => 
          pred.homeScore !== null && pred.homeScore !== undefined && 
          pred.awayScore !== null && pred.awayScore !== undefined
        ).length;
        
        setPredictionsStats(prev => ({
          ...prev,
          [p.uid]: {
            filled: filledCount,
            total: currentMatches.length
          }
        }));

        setParticipantsPredictions(prev => ({
          ...prev,
          [p.uid]: predsList
        }));
      }, (error) => {
        console.error(`Error loading predictions for ${p.uid}:`, error);
      });
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [participants, currentMatches.length]);

  const handleGoogleLogin = async (intent: 'existing_admin' | 'request_admin') => {
    try {
      setAdminLoginState('authenticating');
      const result = await signInWithPopup(auth, googleProvider);
      const currentUser = result.user;
      
      if (!currentUser || !currentUser.email) {
        throw new Error("No se pudo obtener el correo de Google");
      }

      const emailLower = currentUser.email.toLowerCase();
      const docId = emailLower;
      
      // If Super Admin
      if (emailLower === 'melaniagonzalez@gmail.com') {
        setUser(currentUser);
        setAdminLoginState(null);
        toast.success(`¡Bienvenida Súper Admin, ${currentUser.displayName}!`);
        return;
      }

      // Check if they are in the admins collection
      const adminDoc = await getDoc(doc(db, 'admins', docId));
      if (adminDoc.exists()) {
        setUser(currentUser);
        setAdminLoginState(null);
        toast.success(`¡Bienvenido Administrador!`);
        return;
      }

      // Check access requests
      const reqDoc = await getDoc(doc(db, 'adminRequests', currentUser.uid));
      if (reqDoc.exists()) {
        setUser(currentUser);
        setAdminLoginState(null);
        toast.success('Sesión iniciada');
      } else {
        if (intent === 'existing_admin') {
          setPendingApprovalUser(currentUser);
          setAdminLoginState('not_registered');
        } else {
          // Automatic request creation
          await setDoc(doc(db, 'adminRequests', currentUser.uid), {
            uid: currentUser.uid,
            email: emailLower,
            displayName: currentUser.displayName || 'Anónimo',
            photoURL: currentUser.photoURL || '',
            status: 'pending',
            notified: false,
            createdAt: new Date().toISOString()
          });
          try {
            await updateDoc(doc(db, 'users', currentUser.uid), {
              adminRequestStatus: 'pending',
              adminRole: 'none',
              isAdmin: false
            });
          } catch (e) {
            // ignore if document doesn't exist yet
          }
          setJustRequestedInSession(true);
          setUser(currentUser);
          setAdminLoginState(null);
          toast.success('Solicitud enviada con éxito');
        }
      }
    } catch (error) {
      console.error("Authentication error during admin flow:", error);
      const errMsg = error instanceof Error ? error.message : String(error);
      toast.error(`Error al iniciar sesión: ${errMsg}`);
      setUser(null);
      await signOut(auth);
      setAdminLoginState('ask');
    }
  };

  const handleLogin = async () => {
    setAdminLoginState('ask');
  };

  const handleLogout = async () => {
    try {
      setUser(null);
      setAdminLoginState(null);
      setPendingApprovalUser(null);
      setJustRequestedInSession(false);
      setCurrentUserRequest(null);
      setCurrentUserAdminConfig(null);
      await signOut(auth);
      toast.success('Sesión cerrada');
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if ((activeTab === 'quiniela' || predictionsEditMode) && !user) {
      localStorage.setItem('wc_predictions', JSON.stringify(predictions));
    }
  }, [predictions, user, activeTab, predictionsEditMode]);

  useEffect(() => {
    if (activeTab === 'noticias' && (!newsData || newsData.simulated !== isSimulationMode)) {
      fetchNews();
    }
  }, [activeTab, isSimulationMode, simulatedDate]);

  const fetchNews = async () => {
    setLoadingNews(true);
    try {
      if (isSimulationMode) {
        // Mock 2022 News
        setTimeout(() => {
          setNewsData({
            fixtures: MATCHES_2022.filter(m => new Date(m.date) < new Date(simulatedDate)).map(m => ({
              teams: {
                home: { name: TEAMS_2022.find(t => t.id === m.homeTeamId)?.name, logo: '' },
                away: { name: TEAMS_2022.find(t => t.id === m.awayTeamId)?.name, logo: '' }
              },
              goals: { home: m.actualHomeScore, away: m.actualAwayScore },
              fixture: { status: { long: 'Match Finished' }, date: m.date }
            })),
            simulated: true
          });
          setLoadingNews(false);
        }, 800);
        return;
      }
      const competition = activeLeague?.competition || 'WC';
      const response = await fetch(`/api/results/${competition}`);
      if (response.ok) {
        const data = await response.json();
        setNewsData(data);
      } else {
        // En entornos como Netlify sin backend, usamos un fallback silencioso
        console.warn('Backend API no disponible (404). Usando datos locales.');
        setNewsData({ fixtures: [], simulated: false });
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      // Fallback para evitar que la UI se rompa
      setNewsData({ fixtures: [], simulated: false });
    } finally {
      setLoadingNews(false);
    }
  };

  const handleScoreChange = async (matchId: string, side: 'home' | 'away', value: string) => {
    const score = value === '' ? null : parseInt(value);
    if (score !== null && (isNaN(score) || score < 0)) return;

    const newPredictions = predictions.map(p => 
      p.matchId === matchId 
        ? { ...p, [side === 'home' ? 'homeScore' : 'awayScore']: score }
        : p
    );

    setPredictions(newPredictions);
    setHasUnsavedChanges(true);
  };

  const handleSavePredictions = async () => {
    if (!hasUnsavedChanges) return;
    
    setIsSyncing(true);
    try {
      if (user) {
        const targetId = activeParticipantId || user.uid;
        const batch = writeBatch(db);
        predictions.forEach(p => {
          const predictionRef = doc(db, 'users', targetId, 'predictions', p.matchId);
          batch.set(predictionRef, {
            ...p,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        });

        const { totalPoints, correctResults, correctWinners } = calculateUserPoints(predictions);
        const userRef = doc(db, 'users', targetId);
        batch.update(userRef, {
          totalPoints,
          correctResults,
          correctWinners,
          lastUpdatedAt: new Date().toISOString()
        });

        await batch.commit();
      }
      
      localStorage.setItem('wc_predictions', JSON.stringify(predictions));
      setHasUnsavedChanges(false);
      toast.success('Cambios guardados correctamente');
    } catch (error) {
      console.error("Error saving predictions:", error);
      toast.error('Error al guardar las predicciones');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddParticipant = async () => {
    if (!selectedLeagueId) return;
    const name = newParticipantName.trim();
    if (!name) {
      toast.error('El nombre del participante es obligatorio');
      return;
    }
    if (name.length > 10) {
      toast.error('El nombre del participante no puede tener más de 10 caracteres');
      return;
    }

    try {
      const participantId = `p_${selectedLeagueId}_${Date.now()}`;
      const userRef = doc(db, 'users', participantId);
      
      // Crear perfil del participante
      await setDoc(userRef, {
        uid: participantId,
        displayName: name,
        email: '',
        searchName: name.toLowerCase(),
        searchEmail: '',
        photoURL: getAvatarForUser(name),
        totalPoints: 0,
        correctResults: 0,
        correctWinners: 0,
        leagueId: selectedLeagueId,
        isParticipant: true
      });

      // Agregar a memberUids de la liga/quiniela
      const leagueRef = doc(db, 'leagues', selectedLeagueId);
      await updateDoc(leagueRef, {
        memberUids: arrayUnion(participantId)
      });

      setNewParticipantName('');
      setIsAddingParticipant(false);
      setActiveParticipantId(participantId);
      setPredictionsEditMode(true);
      toast.success(`Participante "${name}" registrado con éxito`);
    } catch (error) {
      console.error("Error adding participant:", error);
      handleFirestoreError(error, OperationType.CREATE, 'users');
    }
  };

  const handleDeleteParticipant = async (participantId: string, participantName: string, skipConfirm: boolean = false) => {
    if (!selectedLeagueId) return;
    if (!skipConfirm && !confirm(`¿Estás seguro de que deseas eliminar al participante "${participantName}"? Se borrarán todos sus marcadores y datos.`)) {
      return;
    }

    try {
      // 1. Eliminar predicciones del participante
      const predictionsRef = collection(db, 'users', participantId, 'predictions');
      const predSnapshot = await getDocs(predictionsRef);
      const batch = writeBatch(db);
      
      predSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // 2. Eliminar el documento de usuario/participante
      batch.delete(doc(db, 'users', participantId));

      // 3. Remover de la liga/quiniela
      const leagueRef = doc(db, 'leagues', selectedLeagueId);
      batch.update(leagueRef, {
        memberUids: arrayRemove(participantId)
      });

      await batch.commit();
      
      if (activeParticipantId === participantId) {
        setActiveParticipantId(null);
      }
      toast.success(`Participante "${participantName}" eliminado correctamente`);
    } catch (error) {
      console.error("Error deleting participant:", error);
      handleFirestoreError(error, OperationType.DELETE, `users/${participantId}`);
    }
  };

  const resetPredictions = async () => {
    if (confirm('¿Estás seguro de que quieres reiniciar todas tus predicciones?')) {
      const empty = MATCHES.map(m => ({ matchId: m.id, homeScore: null, awayScore: null }));
      setPredictions(empty);
      setHasUnsavedChanges(true);
      
      if (user) {
        // In a real app, we might want to delete the collection docs
        // For simplicity here, we just reset local state and user will have to overwrite
        toast.success('Predicciones reiniciadas localmente. Guarda para sincronizar.');
      } else {
        toast.success('Predicciones reiniciadas');
      }
    }
  };

  const handleShare = () => {
    const text = `¡Mira mi quiniela para el Mundial 2026! He predicho ${predictions.filter(p => p.homeScore !== null && p.awayScore !== null).length} partidos.`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success('¡Enlace copiado al portapapeles!');
    }).catch(() => {
      toast.error('No se pudo copiar el enlace');
    });
  };

  const groups = useMemo(() => {
    return Array.from(new Set(currentTeams.map(t => t.group).filter(g => g && g.length === 1))).sort();
  }, [currentTeams]);

  const matchdays = useMemo(() => {
    const days = Array.from(new Set<number>(currentMatches.map(m => m.matchday || 1))).sort((a, b) => a - b);
    return days;
  }, [currentMatches]);

  const getMatchdayLabel = (day: number) => {
    const comp = activeLeague?.competition || 'WC';
    if (comp === 'WC') {
      if (day <= 3) return `Jornada ${day}`;
      if (day === 4) return 'Dieciseisavos';
      if (day === 5) return 'Octavos';
      if (day === 6) return 'Cuartos';
      if (day === 7) return 'Semis';
      if (day === 8) return 'Final';
      return `Fase ${day}`;
    } else {
      // Champions League
      if (day <= 8) return `Jornada ${day}`;
      if (day === 9) return 'Play-off (Ida)';
      if (day === 10) return 'Play-off (Vuelta)';
      if (day === 11) return 'Octavos (Ida)';
      if (day === 12) return 'Octavos (Vuelta)';
      if (day === 13) return 'Cuartos (Ida)';
      if (day === 14) return 'Cuartos (Vuelta)';
      if (day === 15) return 'Semis (Ida)';
      if (day === 16) return 'Semis (Vuelta)';
      if (day === 17) return 'Gran Final';
      return `Ronda ${day}`;
    }
  };

  const getGroupNameLabel = (groupName: string) => {
    if (!groupName) return '';
    if (groupName.length === 1) return `Grupo ${groupName}`;
    if (groupName === 'LEAGUE_STAGE') return 'Fase de Liga';
    const translations: Record<string, string> = {
      'ROUND_OF_16': 'Octavos de Final',
      'QUARTER_FINALS': 'Cuartos de Final',
      'SEMI_FINALS': 'Semifinales',
      'FINAL': 'Gran Final',
      'LAST_32': 'Dieciseisavos de Final',
      'LAST_16': 'Octavos de Final',
      'KNOCKOUT_STAGE_PLAY_OFFS': 'Play-offs'
    };
    return translations[groupName] || groupName;
  };

  const currentMatchday = useMemo(() => {
    const unfinished = currentMatches.find(m => {
      const isFinished = isSimulationMode
        ? new Date(m.date) < new Date(simulatedDate)
        : (new Date(m.date) < new Date() || ['FINISHED', 'FT', 'AWARDED'].includes(m.status || ''));
      return !isFinished;
    });
    return unfinished?.matchday || matchdays[0];
  }, [currentMatches, isSimulationMode, simulatedDate, matchdays]);

  const [viewingMatchday, setViewingMatchday] = useState<number>(1);

  // Sync viewing matchday with current matchday on load or mode switch
  useEffect(() => {
    if (currentMatchday) {
      setViewingMatchday(currentMatchday);
    }
  }, [currentMatchday]);

  const allGroupStandings = useMemo(() => {
    return groups.map(group => {
      const groupTeams = currentTeams.filter(t => t.group === group);
      const groupMatches = currentMatches.filter(m => m.group === group);
      const groupPredictions = predictions.filter(p => groupMatches.some(m => m.id === p.matchId));
      return {
        group,
        standings: calculateStandings(groupTeams, groupMatches, groupPredictions)
      };
    });
  }, [predictions, currentTeams, currentMatches]);

  const getTimeUntilPhase = (day: number) => {
    const dayMatches = currentMatches.filter(m => m.matchday === day);
    if (dayMatches.length === 0) return "No disponible";
    
    const dates = dayMatches.map(m => new Date(m.date).getTime()).filter(t => !isNaN(t));
    if (dates.length === 0) return "No disponible";
    
    const earliestTime = Math.min(...dates);
    const nowTime = isSimulationMode ? new Date(simulatedDate).getTime() : nowTimeState;
    
    const diffMs = earliestTime - nowTime;
    if (diffMs <= 0) {
      return "Fase Iniciada";
    }
    
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    const remainingHours = diffHours % 24;
    const remainingMinutes = diffMin % 60;
    
    if (diffDays > 0) {
      return `${diffDays}D ${remainingHours}H ${remainingMinutes}M`;
    } else if (remainingHours > 0) {
      return `${remainingHours}H ${remainingMinutes}M`;
    } else {
      return `${remainingMinutes}M`;
    }
  };

  const formatDbLastUpdated = (isoString: string | null) => {
    if (!isoString) return "BASE LOCAL (Cargando...)";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "BASE LOCAL (2026)";
      
      const pad = (n: number) => n.toString().padStart(2, '0');
      const day = pad(d.getDate());
      const month = pad(d.getMonth() + 1);
      const year = d.getFullYear();
      const hours = pad(d.getHours());
      const minutes = pad(d.getMinutes());
      
      return `BASE LOCAL (${day}/${month}/${year} ${hours}:${minutes})`;
    } catch (e) {
      return "BASE LOCAL (2026)";
    }
  };



  if (!isAuthReady || (user && isAdminConfigLoading)) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        <p className="text-[11px] uppercase font-black tracking-widest text-muted-foreground animate-pulse">Iniciando sesión segura...</p>
      </div>
    );
  }

  if (isRestrictedSession) {
    // Determine which restricted UI card to show
    let statusHeading = "Solicitud en Proceso";
    let statusDescription = "Tu solicitud de acceso para el correo electrónico está actualmente en revisión por el Súper Administrador.";
    let statusExtra = "Recibirás acceso automáticamente en el sistema una vez que sea aprobada por un súper admin. ¡Vuelve a intentarlo pronto!";
    let showCongrats = false;
    let showRejected = false;
    let showJustSubmitted = false;

    if (currentUserRequest && currentUserRequest.status === 'approved' && !currentUserRequest.notified) {
      showCongrats = true;
      statusHeading = "¡Felicidades por tu Aprobación!";
      statusDescription = "Tu solicitud de acceso para ser Administrador ha sido formalmente aprobada por el Súper Administrador.";
      statusExtra = "¡Bienvenido! Ahora tienes permitido ingresar, crear tus propias ligas de quiniela, agregar participantes y actualizar marcadores.";
    } else if (currentUserRequest && currentUserRequest.status === 'rejected') {
      showRejected = true;
      statusHeading = "Solicitud Denegada / Revocada";
      statusDescription = "Lamentablemente, la solicitud de acceso para tu cuenta fue rechazada o revocada por el Súper Administrador.";
      statusExtra = "";
    } else if (justRequestedInSession) {
      showJustSubmitted = true;
      statusHeading = "¡Solicitud Enviada con éxito!";
      statusDescription = "Se ha enviado una solicitud de acceso al Súper Administrador para el correo electrónico:";
      statusExtra = "El Súper Administrador revisará tus detalles para aprobar tus permisos de Administrador de Ligas.";
    }

    return (
      <div className="min-h-screen bg-[#09090b] text-foreground flex flex-col items-center justify-center p-4 selection:bg-primary selection:text-primary-foreground">
        {/* Isolated aesthetic workspace header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-black leading-none uppercase tracking-tight">
            <span className="text-purple">Quiniela</span>
            <span className="text-primary drop-shadow-[0_0_15px_rgba(237,28,36,0.3)] ml-2 animate-pulse">Mundial</span>
          </h1>
          <p className="text-[9px] text-[#71717a] uppercase font-black tracking-widest mt-2 leading-none">Sistema Administrativo Cerrado</p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-[#18181b]/50 border border-[#27272a] p-6 sm:p-8 space-y-6 backdrop-blur-sm"
        >
          <div className="space-y-6 text-center">
            {showCongrats ? (
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500 text-emerald-500 animate-bounce">
                <Trophy className="w-7 h-7" />
              </div>
            ) : showRejected ? (
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-500">
                <UserMinus className="w-6 h-6" />
              </div>
            ) : showJustSubmitted ? (
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 text-primary">
                <Check className="w-6 h-6 animate-pulse" />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
                <FlaskConical className="w-6 h-6 animate-pulse animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            )}

            <div className="space-y-2">
              {showCongrats && (
                <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-2.5 py-0.5 font-bold uppercase tracking-widest border border-emerald-500/20 rounded-none inline-block mb-1">
                  Acceso Aprobado de Ligas
                </span>
              )}
              <h2 className="text-xl font-black uppercase tracking-tight text-foreground">{statusHeading}</h2>
              <p className="text-xs text-[#a1a1aa] font-medium leading-relaxed">
                {statusDescription}
              </p>
              
              <div className="bg-[#09090b]/40 border border-[#27272a]/50 p-2.5 text-center mt-2">
                <span className="text-primary font-mono text-xs select-all font-semibold tracking-wide lowercase block">{user?.email}</span>
              </div>
            </div>

            {statusExtra && (
              <div className="bg-[#18181b]/20 border border-[#27272a]/40 p-4 text-[10px] uppercase font-bold text-[#a1a1aa] leading-relaxed">
                {statusExtra}
              </div>
            )}

            <div className="pt-2 space-y-3">
              {showCongrats ? (
                <Button
                  onClick={async () => {
                    try {
                      // Mark request as notified to grant full access
                      await updateDoc(doc(db, 'adminRequests', user.uid), {
                        notified: true
                      });
                      toast.success('¡Bienvenido Acceso Autorizado!');
                    } catch (e) {
                      console.error("Error transitioning approved user:", e);
                    }
                  }}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-widest rounded-none shadow-lg shadow-emerald-950/20"
                >
                  Ingresar al Panel de Administrador
                </Button>
              ) : null}

              <Button
                variant={showCongrats ? "outline" : "default"}
                onClick={handleLogout}
                className={showCongrats 
                  ? "w-full h-11 text-[10px] font-black uppercase tracking-widest rounded-none border-[#27272a] hover:bg-[#18181b] text-[#a1a1aa]" 
                  : "w-full h-11 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-none"
                }
              >
                {showCongrats ? "Cerrar Sesión (Cambiar Cuenta)" : "Salir / Cerrar Sesión"}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Header */}
      <header className="px-4 lg:px-16 py-3 sm:py-6 border-b border-border flex flex-row justify-between items-center gap-4 bg-gradient-to-br from-purple/10 via-background to-primary/10 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex flex-col">
          <h1 className="text-[20px] sm:text-[32px] lg:text-[42px] font-black leading-none tracking-tight uppercase flex flex-col sm:block">
            <span className="text-purple">Quiniela</span>
            <span className="sm:inline-block sm:ml-2 text-primary drop-shadow-[0_0_15px_rgba(237,28,36,0.3)]">Mundial</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* 1. Mis Quinielas (Home icon only, matching height and design) */}
              {(selectedLeagueId || (showSuperAdminPanel && isSuperAdmin)) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setSelectedLeagueId(null);
                    setShowSuperAdminPanel(false);
                  }}
                  className="h-8 sm:h-9 w-8 sm:w-9 p-0 rounded-none border-primary/40 text-primary hover:bg-primary/5 flex items-center justify-center shrink-0 transition-all"
                  title="Mis Quinielas"
                >
                  <Home className="w-4 h-4" />
                </Button>
              )}

              {/* 2. Súper Admin Panel */}
              {isSuperAdmin && (
                <Button 
                  variant={showSuperAdminPanel ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => {
                    setShowSuperAdminPanel(!showSuperAdminPanel);
                    setSelectedLeagueId(null);
                  }}
                  className={cn(
                    "text-[9px] font-black uppercase tracking-widest gap-1.5 sm:gap-2 h-8 sm:h-9 px-2.5 sm:px-4 rounded-none relative overflow-visible shrink-0 transition-all",
                    showSuperAdminPanel ? "bg-primary text-primary-foreground" : "border-primary/40 text-primary hover:bg-primary/5"
                  )}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" /> 
                  <span className="hidden xs:inline">Panel Súper Admin</span>
                  <span className="xs:hidden">Súper Admin</span>
                  {adminRequests.filter(r => r.status === 'pending').length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 z-10">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-450 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                </Button>
              )}

              {/* 3. Simula */}
              {isSuperAdmin && (
                <Button
                  variant={isSimulationMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setClickCount(prev => prev + 1);
                    if (clickCount + 1 >= 5) {
                      setIsSimulationMode(!isSimulationMode);
                      setClickCount(0);
                      toast.info(isSimulationMode ? 'Modo 2026 Activado' : 'Modo Simulación 2022 Activado');
                    }
                  }}
                  className={cn(
                    "text-[9px] font-black uppercase tracking-widest gap-1.5 sm:gap-2 h-8 sm:h-9 px-2.5 sm:px-4 rounded-none shrink-0 transition-all",
                    isSimulationMode 
                      ? "bg-lime text-black border-lime hover:bg-lime/90 font-black" 
                      : "border-lime/40 text-lime hover:bg-lime/5 font-black"
                  )}
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>Simula</span>
                </Button>
              )}

              {/* User Profiling Area */}
              <div className="flex flex-col items-end shrink-0 ml-1">
                <span className="text-[11px] sm:text-[12px] font-black uppercase tracking-widest max-w-[140px] sm:max-w-none truncate">{user.displayName}</span>
                <button type="button" onClick={handleLogout} className="text-[10px] text-muted-foreground hover:text-primary uppercase font-bold tracking-widest transition-colors">Salir</button>
              </div>
              {user.photoURL && <img src={user.photoURL} alt="Profile" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-primary/30 shrink-0" referrerPolicy="no-referrer" />}
            </div>
          ) : (
            <Button size="sm" onClick={handleLogin} className="bg-white text-black hover:bg-white/90 uppercase text-[9px] sm:text-[10px] font-black tracking-widest px-3 sm:px-6 h-8 sm:h-10 rounded-none">
              Soy Admin
            </Button>
          )}
        </div>
      </header>

      <main className="px-6 lg:px-16 pb-16">
        <Toaster position="top-center" />
        
        {isSimulationMode && (
          <div className="mb-12 p-6 pt-[5px] bg-purple/10 border border-purple/30 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple font-black uppercase text-xs tracking-widest">
                <FlaskConical className="h-4 w-4" />
                Panel de Simulación
              </div>
              {activeLeague?.competition === 'CL' && (
                <div className="text-[10px] bg-sky-500/10 text-sky-500 px-3 py-1 font-black uppercase tracking-tight border border-sky-500/20">
                  Modo Tiempo Real (CL) Sugerido
                </div>
              )}
              <Button size="sm" variant="outline" onClick={seedTestUsers} className="text-[9px] font-black uppercase tracking-widest h-8">
                Generar Usuarios de Prueba
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Fecha Simulada (United 2026)</label>
                  <input 
                    type="date" 
                    min="2026-06-11" 
                    max="2026-07-24"
                    value={simulatedDate.split('T')[0]}
                    onChange={(e) => setSimulatedDate(`${e.target.value}T12:00:00Z`)}
                    className="w-full bg-background border border-border px-3 py-2 text-xs font-mono"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Simular por Fase</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { day: 1, label: "Grupos J1", date: '2026-06-11T12:00:00Z' },
                      { day: 2, label: "Grupos J2", date: '2026-06-18T12:00:00Z' },
                      { day: 3, label: "Grupos J3", date: '2026-06-24T12:00:00Z' },
                      { day: 4, label: "Dieciseisavos", date: '2026-06-28T12:00:00Z' },
                      { day: 5, label: "Octavos", date: '2026-07-04T12:00:00Z' },
                      { day: 6, label: "Cuartos", date: '2026-07-09T12:00:00Z' },
                      { day: 7, label: "Semifinales", date: '2026-07-14T12:00:00Z' },
                      { day: 8, label: "Gran Final", date: '2026-07-18T12:00:00Z' }
                    ].map(phase => (
                      <Button
                        key={phase.day}
                        size="sm"
                        variant={currentMatchday === phase.day ? "default" : "outline"}
                        onClick={() => {
                          setSimulatedDate(phase.date);
                        }}
                        className="text-[10px] font-bold h-8 uppercase tracking-wider rounded-none"
                      >
                        {phase.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-wider bg-black/20 p-4 border-l-2 border-purple">
                  Mueva la fecha hacia atrás or adelante para simular el avance del Mundial 2026. Los partidos anteriores a la fecha elegida aparecerán con resultados (simulados) y se calcularán tus puntos.
                </p>
              </div>
            </div>
          </div>
        )}

        {!user && !guestLeagueId ? (
           <div className="py-20 text-center space-y-12 max-w-lg mx-auto">
              <div className="inline-flex p-4 bg-primary/10 border border-primary/30 rounded-full mb-4 animate-bounce">
                <Trophy className="w-12 h-12 text-primary" />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-black uppercase tracking-tight">Ingresa el Código de tu Quiniela</h2>
                <p className="text-muted-foreground uppercase text-[11px] font-bold tracking-widest leading-relaxed">
                  Coloca el código provisto por tu Administrador para ingresar a ver tu ranking, clasificaciones, resultados en vivo y predicciones.
                </p>
                
                <div className="flex gap-2 mt-8">
                  <Input
                    type="text"
                    placeholder="INGRESA CÓDIGO"
                    value={guestInputCode}
                    onChange={(e) => setGuestInputCode(e.target.value.trim())}
                    className="h-12 text-center text-sm font-black tracking-widest uppercase rounded-none border-border"
                  />
                  <Button onClick={handleJoinAsGuest} className="h-12 text-xs font-black uppercase tracking-widest px-8">
                    Ingresar
                  </Button>
                </div>
                
                <div className="pt-8 border-t border-border mt-12 flex flex-col items-center gap-4">
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                    ¿Eres el organizador o administrador de la liga?
                  </p>
                  <Button onClick={handleLogin} variant="outline" size="sm" className="text-[9px] font-black uppercase tracking-widest h-9 border-primary/30 text-primary hover:bg-primary/10">
                    Iniciar Sesión como Administrador
                  </Button>
                </div>
              </div>
           </div>
        ) : !activeLeagueId ? (
          showSuperAdminPanel && isSuperAdmin ? (
            <div className="space-y-12 max-w-5xl mx-auto py-8">
              {/* Header de Panel Súper Admin */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-border">
                <div className="space-y-2">
                  <h2 className="text-[24px] font-black uppercase tracking-tight text-primary flex items-center gap-3">
                    <LayoutDashboard className="w-6 h-6 text-primary" /> Panel Súper Admin
                  </h2>
                  <p className="text-[11px] text-muted-foreground uppercase font-black tracking-widest">
                    Gestión de administradores autorizados, roles y límites de creación de quinielas
                  </p>
                </div>
              </div>

              {/* Sub-navegación del Panel Súper Admin */}
              <div className="flex border-b border-border">
                <button
                  type="button"
                  onClick={() => {
                    setSuperAdminTab('admins');
                    setEditingAdminId(null);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all rounded-none",
                    superAdminTab === 'admins' 
                      ? "border-primary text-primary bg-primary/5 font-black" 
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Users className="w-4 h-4 text-primary" /> Administradores Autorizados
                </button>
                <button
                  type="button"
                  onClick={() => setSuperAdminTab('requests')}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all rounded-none relative",
                    superAdminTab === 'requests' 
                      ? "border-primary text-primary bg-primary/5 font-black" 
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <UserPlus className="w-4 h-4 text-primary" /> Solicitudes de Acceso
                  {adminRequests.filter(r => r.status === 'pending').length > 0 && (
                    <span className="ml-1.5 bg-red-500 text-white font-mono text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {adminRequests.filter(r => r.status === 'pending').length}
                    </span>
                  )}
                </button>
              </div>

              {superAdminTab === 'admins' ? (
                <div className={cn("grid grid-cols-1 gap-10", editingAdminId ? "lg:grid-cols-[350px_1fr]" : "lg:grid-cols-1")}>
                  {/* Coumna de Formulario si se está editando */}
                  {editingAdminId && (
                    <Card className="bg-card border-2 border-border rounded-none h-fit">
                      <CardHeader className="border-b border-border bg-primary/5">
                        <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">
                          Editar Administrador
                        </CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">
                          Modifica los límites de creación de este administrador
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        <form onSubmit={handleSaveAdmin} className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Correo Electrónico</label>
                            <Input 
                              type="email"
                              placeholder="ejemplo@correo.com"
                              value={adminFormEmail}
                              onChange={(e) => setAdminFormEmail(e.target.value)}
                              disabled={true}
                              required
                              className="bg-background border-border text-xs rounded-none h-10 uppercase font-bold opacity-65"
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Rol de Acceso</label>
                            <select 
                              value={adminFormRole}
                              onChange={(e) => setAdminFormRole(e.target.value as any)}
                              disabled={isSavingAdmin || adminFormEmail.toLowerCase() === 'melaniagonzalez@gmail.com'}
                              className="w-full bg-background border border-border h-10 px-3 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none rounded-none uppercase font-bold"
                            >
                              <option value="admin">Administrador Regular (Admin)</option>
                              <option value="superadmin">Súper Administrador (Super Admin)</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Permiso de Creación (Máx. Quinielas)</label>
                            <Input 
                              type="number"
                              min={1}
                              max={100}
                              value={adminFormMaxLeagues}
                              onChange={(e) => setAdminFormMaxLeagues(Number(e.target.value))}
                              disabled={isSavingAdmin}
                              required
                              className="bg-background border-border text-xs rounded-none h-10 font-bold"
                            />
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button 
                              type="submit" 
                              disabled={isSavingAdmin}
                              className="flex-1 uppercase text-[10px] font-black tracking-wider h-11 rounded-none shadow-md"
                            >
                              {isSavingAdmin ? 'Guardando...' : 'Actualizar'}
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline"
                              onClick={() => {
                                setEditingAdminId(null);
                                setAdminFormEmail('');
                                setAdminFormRole('admin');
                                setAdminFormMaxLeagues(1);
                              }}
                              className="uppercase text-[10px] font-black tracking-wider border-border h-11 rounded-none"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  )}

                  {/* Columna de Tabla */}
                  <div className="space-y-4">
                    <div className="bg-card border-2 border-border overflow-hidden rounded-none">
                      <Table>
                        <TableHeader className="bg-primary/5 border-b border-border">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4">Correo Electrónico</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4">Permisos</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4 text-center">Quinielas creadas</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4 text-center">Límite Permitido</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4 text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dbAdmins.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-16 text-xs uppercase font-black tracking-widest">
                                Cargando administradores...
                              </TableCell>
                            </TableRow>
                          ) : (
                            dbAdmins.map((adm) => {
                              const leaguesCount = getLeaguesCreatedCount(adm.email);
                              const percent = Math.min(100, Math.round((leaguesCount / (adm.maxLeaguesAllowed || 1)) * 100));
                              const isSelf = user && adm.email.toLowerCase() === user.email?.toLowerCase();
                              
                              return (
                                <TableRow key={adm.id || adm.email} className="border-b border-border hover:bg-white/5 transition-colors">
                                  <TableCell className="py-4 font-black text-xs text-foreground max-w-[150px] sm:max-w-none truncate uppercase">
                                    {adm.email} {isSelf && <span className="text-primary text-[8px] ml-1 bg-primary/10 border border-primary/20 px-1 py-0.5 rounded">TÚ</span>}
                                  </TableCell>
                                  <TableCell className="py-4">
                                    {adm.role === 'superadmin' ? (
                                      <span className="bg-primary/10 border border-primary/20 text-primary text-[8px] font-black uppercase px-2 py-0.5 tracking-tight rounded-none select-none">
                                        Súper Admin
                                      </span>
                                    ) : (
                                      <span className="bg-sky-500/10 border border-sky-500/20 text-sky-450 text-[8px] font-black uppercase px-2 py-0.5 tracking-tight rounded-none select-none">
                                        Liga Admin
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-4 text-center">
                                    <div className="flex flex-col items-center justify-center gap-1">
                                      <span className="text-xs font-black text-foreground">
                                        {leaguesCount}
                                      </span>
                                      <span className="text-[9px] text-muted-foreground font-mono uppercase font-bold">
                                        {percent}% ocupado
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4 text-center font-black text-xs text-muted-foreground">
                                    {adm.maxLeaguesAllowed} 
                                  </TableCell>
                                  <TableCell className="py-4 text-right">
                                    <div className="flex justify-end gap-1.5">
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => handleEditAdminClick(adm)}
                                        className="h-8 w-8 p-0 border-border hover:bg-white/5 rounded-none"
                                        title="Editar Administrador"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </Button>
                                      {!isSelf && (
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          onClick={() => handleDeleteAdminClick(adm.id, adm.email)}
                                          className="h-8 w-8 p-0 border-border text-red hover:bg-red/10 hover:text-red hover:border-red rounded-none"
                                          title="Eliminar Administrador"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Filtro sub-navegación por estatus */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={requestStatusFilter === 'pending' ? 'default' : 'outline'}
                      onClick={() => setRequestStatusFilter('pending')}
                      className="text-[10px] uppercase font-black tracking-wider rounded-none h-10 border-border"
                    >
                      Pendientes
                      <span className={cn(
                        "ml-2 px-1.5 py-0.5 text-[9px] font-mono font-black rounded-full",
                        requestStatusFilter === 'pending' ? "bg-primary-foreground text-primary" : "bg-primary/10 text-primary"
                      )}>
                        {adminRequests.filter(r => (r.status || 'pending') === 'pending').length}
                      </span>
                    </Button>
                    <Button
                      variant={requestStatusFilter === 'approved' ? 'default' : 'outline'}
                      onClick={() => setRequestStatusFilter('approved')}
                      className="text-[10px] uppercase font-black tracking-wider rounded-none h-10 border-border"
                    >
                      Aceptadas / Aprobadas
                      <span className={cn(
                        "ml-2 px-1.5 py-0.5 text-[9px] font-mono font-black rounded-full",
                        requestStatusFilter === 'approved' ? "bg-primary-foreground text-primary" : "bg-primary/10 text-primary"
                      )}>
                        {adminRequests.filter(r => r.status === 'approved').length}
                      </span>
                    </Button>
                    <Button
                      variant={requestStatusFilter === 'rejected' ? 'default' : 'outline'}
                      onClick={() => setRequestStatusFilter('rejected')}
                      className="text-[10px] uppercase font-black tracking-wider rounded-none h-10 border-border"
                    >
                      Denegadas / Rechazadas
                      <span className={cn(
                        "ml-2 px-1.5 py-0.5 text-[9px] font-mono font-black rounded-full",
                        requestStatusFilter === 'rejected' ? "bg-primary-foreground text-primary" : "bg-primary/10 text-primary"
                      )}>
                        {adminRequests.filter(r => r.status === 'rejected').length}
                      </span>
                    </Button>
                  </div>

                  {/* Listado de Solicitudes según Estatus */}
                  <Card className="bg-card border-2 border-border rounded-none shadow-sm">
                    <CardHeader className="border-b border-border bg-primary/5">
                      <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">
                        {requestStatusFilter === 'pending' && "Peticiones de Acceso Pendientes"}
                        {requestStatusFilter === 'approved' && "Solicitudes de Acceso Aprobadas"}
                        {requestStatusFilter === 'rejected' && "Accesos Cancelados o Denegados"}
                      </CardTitle>
                      <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">
                        {requestStatusFilter === 'pending' && "Usuarios que solicitaron permisos de administrador para crear quinielas"}
                        {requestStatusFilter === 'approved' && "Usuarios aprobados que tienen rol activo de administración"}
                        {requestStatusFilter === 'rejected' && "Usuarios cuyas solicitudes fueron rechazadas o desactivadas"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      {adminRequests.filter(r => (r.status || 'pending') === requestStatusFilter).length === 0 ? (
                        <div className="text-center py-16 space-y-3">
                          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 text-primary">
                            <Info className="w-5 h-5 animate-pulse" />
                          </div>
                          <p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                            No hay solicitudes {requestStatusFilter === 'pending' ? 'pendientes' : requestStatusFilter === 'approved' ? 'aprobadas' : 'denegadas'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4 divide-y divide-border">
                          {adminRequests.filter(r => (r.status || 'pending') === requestStatusFilter).map((req, idx) => (
                            <div key={req.id || idx} className={`${idx > 0 ? 'pt-4' : ''} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
                              <div className="flex items-start gap-3">
                                {req.photoURL ? (
                                  <img 
                                    src={req.photoURL} 
                                    alt="Request Profile" 
                                    className="w-10 h-10 rounded-full border border-border shrink-0 mt-0.5" 
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-xs font-black tracking-wider uppercase text-primary mt-0.5">
                                    {req.displayName?.substring(0,2) || 'AN'}
                                  </div>
                                )}
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[12px] font-black uppercase tracking-tight text-foreground truncate">{req.displayName || 'Anónimo'}</p>
                                    {req.createdAt && (
                                      <span className="text-[9px] text-muted-foreground font-mono">
                                        ({new Date(req.createdAt).toLocaleDateString()})
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] font-mono text-muted-foreground truncate">{req.email}</p>
                                  
                                  <div className="flex items-center gap-1.5 pt-0.5">
                                    <span className="text-[9px] uppercase font-bold text-muted-foreground/80">Estatus:</span>
                                    {req.status === 'approved' ? (
                                      <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 rounded-sm">Aceptada</span>
                                    ) : req.status === 'rejected' ? (
                                      <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-sm">Denegada</span>
                                    ) : (
                                      <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-sm">Pendiente</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Cambiar Estado */}
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/80 hidden lg:inline">Cambiar estado a:</span>
                                <div className="grid grid-cols-3 sm:flex gap-1.5">
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateUserRequestStatus(req, 'pending')}
                                    disabled={req.status === 'pending' || (req.status || 'pending') === 'pending'}
                                    variant="outline"
                                    className={cn(
                                      "h-8 text-[9px] font-black uppercase tracking-wider rounded-none border-border",
                                      (req.status === 'pending' || (req.status || 'pending') === 'pending') ? "opacity-35" : "hover:bg-amber-500/5 hover:text-amber-500 hover:border-amber-500/30"
                                    )}
                                  >
                                    Pendiente
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateUserRequestStatus(req, 'approved')}
                                    disabled={req.status === 'approved'}
                                    className={cn(
                                      "h-8 text-[9px] font-black uppercase tracking-wider rounded-none",
                                      req.status === 'approved' ? "opacity-35" : "bg-emerald-600 text-white hover:bg-emerald-700"
                                    )}
                                  >
                                    Aprobar
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateUserRequestStatus(req, 'rejected')}
                                    disabled={req.status === 'rejected'}
                                    variant="outline"
                                    className={cn(
                                      "h-8 text-[9px] font-black uppercase tracking-wider rounded-none border-border",
                                      req.status === 'rejected' ? "opacity-35" : "text-red-500 hover:bg-red-500/5 hover:border-red-500/30"
                                    )}
                                  >
                                    Denegar
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-12 max-w-5xl mx-auto py-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-border">
                <div className="space-y-2">
                  <h2 className="text-[24px] font-black uppercase tracking-tight text-primary">Mis Quinielas</h2>
                  <p className="text-[11px] text-muted-foreground uppercase font-black tracking-widest">Selecciona una quiniela para ver tus resultados y ranking</p>
                </div>
                <div className="flex gap-3">
                  <div className="relative group">
                     <Button 
                      onClick={() => setIsCreatingLeague(true)} 
                      className="h-12 text-[10px] font-black uppercase tracking-widest px-8 shadow-lg shadow-primary/20"
                      disabled={leagues.filter(l => l.creatorId === user?.uid).length >= maxLeaguesAllowed}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Crear Nueva
                    </Button>
                    {leagues.filter(l => l.creatorId === user?.uid).length >= maxLeaguesAllowed && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-purple text-white text-[9px] font-black uppercase px-2 py-1 whitespace-nowrap hidden group-hover:block z-10">
                        Límite de {maxLeaguesAllowed} quinielas alcanzado
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isCreatingLeague && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card border-4 border-primary p-10 space-y-8 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rotate-45 translate-x-16 -translate-y-16" />
                <div className="space-y-3 relative">
                  <span className="text-[11px] font-black uppercase text-primary tracking-[0.3em]">Nueva Competición</span>
                  <div className="flex justify-between items-end">
                    <h3 className="text-2xl font-black uppercase tracking-tight">Personaliza tu Quiniela</h3>
                    <span className="text-[10px] font-mono text-muted-foreground font-bold tracking-wider mb-1">
                      {newLeagueName.length}/10 CARACTERES
                    </span>
                  </div>
                  <Input 
                    placeholder="NOMBRE (EJ: MI LIGA)" 
                    value={newLeagueName}
                    onChange={(e) => {
                      if (e.target.value.length <= 10) {
                        setNewLeagueName(e.target.value);
                      }
                    }}
                    maxLength={10}
                    className="h-16 text-[18px] font-black uppercase tracking-tight bg-background border-2 border-border focus:border-primary transition-all rounded-none"
                  />
                </div>

                <div className="space-y-4 relative">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Selecciona el Torneo</span>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setNewLeagueCompetition('WC')}
                      className={cn(
                        "p-6 border-2 transition-all flex flex-col items-center gap-3",
                        newLeagueCompetition === 'WC' 
                          ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(237,28,36,0.1)]" 
                          : "border-border hover:border-primary/50 opacity-50 grayscale hover:grayscale-0"
                      )}
                    >
                      <Trophy className={cn("w-8 h-8", newLeagueCompetition === 'WC' ? "text-primary" : "text-muted-foreground")} />
                      <div className="flex flex-col items-center">
                        <span className="text-[12px] font-black uppercase tracking-tight">Copa del Mundo</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Mundial 2026</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      disabled
                      className="p-6 border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 opacity-40 cursor-not-allowed relative w-full"
                    >
                      <Trophy className="w-8 h-8 rotate-12 text-muted-foreground" />
                      <div className="flex flex-col items-center">
                        <span className="text-[12px] font-black uppercase tracking-tight text-muted-foreground">Champions League</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Edición 24/25</span>
                        <span className="mt-2 text-[8px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 uppercase tracking-widest">FINALIZADA</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 relative">
                  <Button 
                    onClick={handleCreateLeague} 
                    className="flex-1 h-14 text-[12px] font-black uppercase tracking-widest"
                  >
                    Crear Quiniela
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsCreatingLeague(false)}
                    className="flex-1 h-14 text-[12px] font-black uppercase tracking-widest"
                  >
                    Cerrar
                  </Button>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {leagues.length > 0 ? (
                leagues.map((league) => (
                  <Card 
                    key={league.id} 
                    className="group relative bg-card border-2 border-border rounded-none overflow-hidden hover:border-primary transition-all flex flex-col cursor-pointer"
                    onClick={() => setSelectedLeagueId(league.id)}
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                    <CardHeader className="p-8 pb-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-primary/5 rounded-none border border-primary/20">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        {league.creatorId === user?.uid && (
                          <Badge className="bg-primary text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-none">Admin</Badge>
                        )}
                      </div>
                      <CardTitle className="text-[20px] font-black uppercase tracking-tight leading-tight group-hover:text-primary transition-colors">{league.name}</CardTitle>
                      <div className="flex flex-wrap gap-2 pt-3">
                        <Badge variant="outline" className={cn(
                          "rounded-none text-[8px] font-black uppercase px-2 py-0.5",
                          league.competition === 'CL' ? "border-sky-500/50 text-sky-500 bg-sky-500/5" : "border-primary/50 text-primary bg-primary/5"
                        )}>
                          {league.competition === 'CL' ? '🏆 Champions League 24/25' : '🌎 Mundial 2026'}
                        </Badge>
                        <Badge variant="secondary" className="rounded-none text-[8px] font-black uppercase px-2 py-0.5 bg-muted/50 text-muted-foreground border-none">
                          {league.memberUids.filter((id: string) => id !== league.creatorId).length} Participantes
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 flex-1 flex flex-col">
                      <div className="flex-1" />
                      <Button className="w-full h-12 text-[10px] font-black uppercase tracking-widest mt-6 bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all">
                        Ver Quiniela
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full py-32 text-center border-4 border-dashed border-border/50">
                  <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                  <p className="text-[14px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-8">No tienes quinielas activas</p>
                  <Button onClick={() => setIsCreatingLeague(true)} size="lg" className="h-14 text-[12px] font-black uppercase tracking-widest px-12 shadow-xl shadow-primary/30">
                    Empezar mi primera Quiniela
                  </Button>
                </div>
              )}
            </div>
          </div>
        )
      ) : (
          <>
            <div className="flex items-center justify-between border-b border-border pt-[5px] pb-[5px]">
              <div className="flex items-center gap-4">
                 <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleGoBack}
                  className="h-10 w-10 p-0 border-2 border-primary/50 text-primary bg-primary/10 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all flex items-center justify-center shadow-md scale-105"
                >
                  <ChevronLeft className="w-7 h-7" strokeWidth={3.5} />
                </Button>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setActiveTab('leaderboard');
                        setPredictionsEditMode(false);
                      }}
                      disabled={activeTab === 'leaderboard' && !predictionsEditMode}
                      className={cn(
                        "text-[14px] sm:text-[18px] font-black uppercase tracking-tight transition-colors",
                        (activeTab !== 'leaderboard' || predictionsEditMode) ? "text-muted-foreground hover:text-primary cursor-pointer" : "text-foreground"
                      )}
                    >
                      {activeLeague?.name}
                    </button>
                    {activeTab === 'settings' && (
                      <>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        <span className="text-[14px] sm:text-[18px] font-black uppercase tracking-tight text-primary">Configuración</span>
                      </>
                    )}
                    {predictionsEditMode && (
                      <>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        <span className="text-[14px] sm:text-[18px] font-black uppercase tracking-tight text-primary">
                          Perfil Usuario
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {user && !predictionsEditMode && (
                <div className="flex items-center gap-4">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setActiveTab('settings');
                      if (selectedLeague) setEditLeagueName(selectedLeague.name);
                    }}
                    className="h-9 text-[10px] font-black uppercase px-4 flex items-center gap-2 border-border hover:bg-white/5 transition-all"
                  >
                    <Settings className="w-3.5 h-3.5" /> Configurar
                  </Button>
                </div>
              )}
            </div>

            {!predictionsEditMode && activeTab !== 'settings' && (
              <div className="grid grid-cols-3 sm:flex border-b border-border">
                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className={cn(
                    "px-2 sm:px-8 py-3 sm:py-4 text-[10px] sm:text-[12px] font-black uppercase tracking-wider sm:tracking-[0.2em] transition-all border-b-2 flex flex-col sm:flex-row items-center gap-1 sm:gap-2",
                    activeTab === 'leaderboard' 
                      ? "border-primary text-primary" 
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span className="text-[8px] sm:text-[12px] text-center">Ranking</span>
                </button>
                <button
                  onClick={() => setActiveTab('noticias')}
                  className={cn(
                    "px-2 sm:px-8 py-3 sm:py-4 text-[10px] sm:text-[12px] font-black uppercase tracking-wider sm:tracking-[0.2em] transition-all border-b-2 flex flex-col sm:flex-row items-center gap-1 sm:gap-2",
                    activeTab === 'noticias' 
                      ? "border-primary text-primary" 
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Newspaper className="w-3.5 h-3.5" />
                  <span className="text-[8px] sm:text-[12px] text-center">Noticias</span>
                </button>
                <button
                  onClick={() => setActiveTab('resultados')}
                  className={cn(
                    "px-2 sm:px-8 py-3 sm:py-4 text-[10px] sm:text-[12px] font-black uppercase tracking-wider sm:tracking-[0.2em] transition-all border-b-2 flex flex-col sm:flex-row items-center gap-1 sm:gap-2",
                    activeTab === 'resultados' 
                      ? "border-primary text-primary" 
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="text-[8px] sm:text-[12px] text-center">Resultados</span>
                </button>
              </div>
            )}

            {predictionsEditMode ? (
              <div className={cn(
                "grid gap-16 w-full",
                user ? "grid-cols-1 max-w-5xl mx-auto" : "grid-cols-1 lg:grid-cols-[1fr_350px]"
              )}>
                {/* Left Column: Matches */}
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 pb-5 border-b border-border/20 -mb-[3px]">
                    <div className="flex items-center gap-4 min-w-0">
                      {user && activeParticipantId && !predictionsReadOnly ? (
                        <button
                          type="button"
                          onClick={() => setIsAvatarPickerOpen(!isAvatarPickerOpen)}
                          className="p-1 hover:bg-muted/20 border border-transparent hover:border-border/30 transition-all rounded-full cursor-pointer group active:scale-95 relative shrink-0"
                          title="Haz clic para seleccionar tu avatar"
                        >
                          <div className="relative">
                            <img 
                              src={participants.find(p => p.uid === activeParticipantId)?.photoURL || getAvatarForUser(participants.find(p => p.uid === activeParticipantId)?.displayName || 'Anónimo')} 
                              className={cn(
                                "w-11 h-11 rounded-full border-2 bg-zinc-800 transition-transform",
                                isAvatarPickerOpen ? "border-primary scale-105" : "border-border hover:border-primary/50"
                              )} 
                              referrerPolicy="no-referrer" 
                            />
                            <span className="absolute bottom-0 right-0 bg-primary text-black text-[7px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-md">
                              ▼
                            </span>
                          </div>
                        </button>
                      ) : (
                        activeParticipantId && (
                          <div className="relative p-1 shrink-0">
                            <img 
                              src={participants.find(p => p.uid === activeParticipantId)?.photoURL || getAvatarForUser(participants.find(p => p.uid === activeParticipantId)?.displayName || 'Anónimo')} 
                              className="w-11 h-11 rounded-full border-2 border-border bg-zinc-800" 
                              referrerPolicy="no-referrer" 
                            />
                          </div>
                        )
                      )}

                      <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                        {user && isAdminEmail(user.email) ? (
                          isEditingName ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingNameValue}
                                onChange={(e) => setEditingNameValue(e.target.value.toUpperCase())}
                                maxLength={10}
                                className="bg-background border-border text-xs rounded-none h-8 w-32 uppercase font-bold px-2"
                                placeholder="NOMBRE"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={async () => {
                                  if (!activeParticipantId) return;
                                  const val = editingNameValue.trim().toUpperCase();
                                  if (!val) {
                                    toast.error("El nombre no puede estar vacío");
                                    return;
                                  }
                                  if (val.length > 10) {
                                    toast.error("El nombre no puede superar los 10 caracteres");
                                    return;
                                  }
                                  try {
                                    await updateDoc(doc(db, 'users', activeParticipantId), {
                                      displayName: val
                                    });
                                    toast.success("Nombre actualizado");
                                    setIsEditingName(false);
                                  } catch (error) {
                                    console.error(error);
                                    toast.error("Error al guardar el nombre");
                                  }
                                }}
                                className="h-8 w-8 p-0 bg-primary hover:bg-primary/95 text-black rounded-none"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsEditingName(false)}
                                className="h-8 w-8 p-0 border-border hover:bg-white/5 rounded-none"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] inline-flex flex-wrap items-center gap-x-1.5 min-w-0">
                              <span className="text-foreground font-black flex items-center gap-1.5 truncate">
                                {participants.find(p => p.uid === activeParticipantId)?.displayName || 'Cargando...'}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const currentName = participants.find(p => p.uid === activeParticipantId)?.displayName || '';
                                    setEditingNameValue(currentName);
                                    setIsEditingName(true);
                                  }}
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                  title="Editar nombre"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                              </span>
                              {(() => {
                                const targetId = activeParticipantId;
                                if (!targetId) return null;
                                const userPreds = participantsPredictions[targetId] || predictions || [];
                                const { totalPoints, correctResults, correctWinners } = calculateUserPoints(userPreds);
                                return (
                                  <span className="text-lime font-black ml-2 text-[10px] sm:text-[11px] border-l border-white/20 pl-2">
                                    ({totalPoints} PTS | {correctResults} EXACTOS | {correctWinners} DE GANADOR)
                                  </span>
                                );
                              })()}
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] inline-flex flex-wrap items-center gap-x-1.5 min-w-0">
                            <span className="text-foreground font-black truncate">
                              {participants.find(p => p.uid === activeParticipantId)?.displayName || 'Cargando...'}
                            </span>
                            {(() => {
                              const targetId = activeParticipantId;
                              if (!targetId) return null;
                              const userPreds = participantsPredictions[targetId] || predictions || [];
                              const { totalPoints, correctResults, correctWinners } = calculateUserPoints(userPreds);
                              return (
                                <span className="text-lime font-black ml-2 text-[10px] sm:text-[11px] border-l border-white/20 pl-2">
                                  ({totalPoints} PTS | {correctResults} EXACTOS | {correctWinners} DE GANADOR)
                                </span>
                              );
                            })()}
                          </span>
                        )}
                      </div>
                    </div>

                    {user && isAdminEmail(user.email) && activeParticipantId && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          const p = participants.find(p => p.uid === activeParticipantId);
                          if (p) {
                            setParticipantToDelete({ id: p.uid, name: p.displayName || 'Participante' });
                            setIsDeleteConfirmOpen(true);
                          }
                        }}
                        className="h-10 text-[10px] font-black uppercase tracking-widest px-4 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500 rounded-none shrink-0"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Eliminar Participante
                      </Button>
                    )}
                  </div>

                  {user && activeParticipantId && isAvatarPickerOpen && (
                    <div className="border border-border/30 bg-card/10 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 justify-items-center">
                        {AVATARS_LIST.map((avatar) => {
                          const avUrl = avatar.url;
                          const isSelected = participants.find(p => p.uid === activeParticipantId)?.photoURL === avUrl;
                          return (
                            <button
                              key={avatar.name}
                              type="button"
                              onClick={async () => {
                                try {
                                  const pRef = doc(db, 'users', activeParticipantId);
                                  await updateDoc(pRef, { photoURL: avUrl });
                                  toast.success('¡Avatar actualizado!');
                                } catch (error) {
                                  console.error("Error al actualizar el avatar:", error);
                                  toast.error('Error al guardar el avatar');
                                }
                              }}
                              className={cn(
                                "relative p-1 border-2 transition-all hover:scale-110 flex items-center justify-center rounded-full overflow-hidden bg-zinc-800 w-10 h-10 shadow-sm",
                                isSelected 
                                  ? "border-primary bg-primary/20 scale-105" 
                                  : "border-border hover:border-primary/50"
                              )}
                            >
                              <img src={avUrl} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" alt={avatar.name} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-12 mb-6">
                     {[viewingMatchday].map(day => (
                       <div key={day} className="space-y-6 mt-[5px] mb-[14px]">
                    <div className="flex items-center gap-4 pt-[5px]">
                      <div className="h-[1px] flex-1 bg-border" />
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={matchdays.indexOf(viewingMatchday) <= 0}
                            onClick={() => {
                              const currentIndex = matchdays.indexOf(viewingMatchday);
                              if (currentIndex > 0) {
                                setViewingMatchday(matchdays[currentIndex - 1]);
                              }
                            }}
                            className="h-10 w-10 p-0 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-20"
                          >
                            <ChevronLeft className="h-6 w-6" />
                          </Button>
                          
                          <span className="text-[10px] sm:text-[12px] font-black text-primary uppercase tracking-[0.2em] px-10 py-2 border border-primary/30 bg-primary/5 min-w-[205px] sm:min-w-[230px] text-center block relative overflow-hidden">
                            {getMatchdayLabel(day)}
                            {day === currentMatchday && (
                              <span className="absolute top-0 left-0 h-full flex items-center pl-4">
                                <span className="text-[8px] font-black tracking-widest text-[#FFD700] animate-pulse">ACTUAL</span>
                              </span>
                            )}
                          </span>

                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={matchdays.indexOf(viewingMatchday) === -1 || matchdays.indexOf(viewingMatchday) >= matchdays.length - 1}
                            onClick={() => {
                              const currentIndex = matchdays.indexOf(viewingMatchday);
                              if (currentIndex !== -1 && currentIndex < matchdays.length - 1) {
                                setViewingMatchday(matchdays[currentIndex + 1]);
                              }
                            }}
                            className="h-10 w-10 p-0 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-20"
                          >
                            <ChevronRight className="h-6 w-6" />
                          </Button>
                        </div>
                      </div>
                      <div className="h-[1px] flex-1 bg-border" />
                    </div>

                    <div className="flex items-center justify-between pt-[5px] pb-0 bg-transparent">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                          Tiempo para iniciar fase: <span className="text-primary font-black text-[11px] ml-1">{getTimeUntilPhase(day)}</span>
                        </span>
                      </div>
                      {!predictionsReadOnly && (
                        <Button 
                          onClick={handleSavePredictions}
                          disabled={!hasUnsavedChanges || isSyncing}
                          className="bg-sky-600 hover:bg-sky-700 text-white uppercase text-[10px] font-black tracking-widest px-4 h-9 w-fit shadow-[0_0_20px_rgba(2,132,199,0.2)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          {isSyncing ? 'Guardando...' : 'Guardar'}
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-12">
                      {Array.from(new Set(currentMatches.filter(m => m.matchday === day).map(m => m.group)))
                        .sort((a: any, b: any) => {
                          if (a.length === 1 && b.length === 1) return a.localeCompare(b);
                          return 0;
                        })
                        .map((groupName: any) => (
                        <div key={groupName} className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="h-4 w-1 bg-primary" />
                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                              {getGroupNameLabel(groupName)}
                            </h4>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            <AnimatePresence mode="popLayout">
                              {currentMatches.filter(m => m.matchday === day && m.group === groupName).map((match, idx) => {
                                const homeTeam = currentTeams.find(t => t.id === match.homeTeamId);
                                const awayTeam = currentTeams.find(t => t.id === match.awayTeamId);
                                
                                if (match.matchday < 4 && (!homeTeam || !awayTeam)) return null;

                                // Logic to hide teams in knockout stages until they are "known"
                                const isTBD = match.matchday >= 4 && (
                                  !isSimulationMode 
                                    ? ((!homeTeam && !(match as any).homeTeamName) || (!awayTeam && !(match as any).awayTeamName))
                                    : (
                                        (match.matchday === 4 && new Date(simulatedDate) < new Date('2026-06-28T00:00:00Z')) ||
                                        (match.matchday === 5 && new Date(simulatedDate) < new Date('2026-07-04T00:00:00Z')) ||
                                        (match.matchday === 6 && new Date(simulatedDate) < new Date('2026-07-09T00:00:00Z')) ||
                                        (match.matchday === 7 && new Date(simulatedDate) < new Date('2026-07-14T00:00:00Z')) ||
                                        (match.matchday === 8 && new Date(simulatedDate) < new Date('2026-07-18T00:00:00Z'))
                                      )
                                );

                                const displayHome = (isTBD || !homeTeam) ? { name: 'Por definir', flag: '🏳️' } : homeTeam;
                                const displayAway = (isTBD || !awayTeam) ? { name: 'Por definir', flag: '🏳️' } : awayTeam;

                                const prediction = predictions.find(p => p.matchId === match.id) || { matchId: match.id, homeScore: null, awayScore: null };

                                const isLocked = isSimulationMode 
                                  ? new Date(match.date) < new Date(simulatedDate)
                                  : new Date(match.date) < new Date() || (match.status && !['SCHEDULED', 'TIMED'].includes(match.status));

                                const shouldShowResult = isSimulationMode
                                  ? isLocked
                                  : (['FINISHED', 'FT', 'IN_PLAY', 'LIVE', 'AWARDED'].includes(match.status || '') || (apiMatches.length === 0 && new Date(match.date) < new Date()));

                                return (
                                  <motion.div
                                    key={match.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.02 }}
                                  >
                                    <div className="bg-card border border-border p-4 sm:p-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-6 group hover:border-primary/50 transition-colors relative overflow-hidden">
                                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple via-primary to-lime opacity-50" />
                                      
                                      <div className="absolute top-[6px] right-2 flex gap-2">
                                        <div className="bg-white/5 text-muted-foreground text-[8px] font-black px-2 py-0.5 uppercase tracking-widest border border-border">
                                          {new Date(match.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        {isSimulationMode ? (
                                          isLocked && (
                                            <div className="bg-primary/20 text-primary text-[8px] font-black px-2 py-0.5 uppercase tracking-widest">
                                              Finalizado
                                            </div>
                                          )
                                        ) : (
                                          ['IN_PLAY', 'LIVE'].includes(match.status || '') ? (
                                            <div className="bg-red-600 text-white text-[8px] font-black px-2 py-0.5 uppercase tracking-widest animate-pulse">
                                              En Vivo
                                            </div>
                                          ) : ['FINISHED', 'FT'].includes(match.status || '') ? (
                                            <div className="bg-primary/20 text-primary text-[8px] font-black px-2 py-0.5 uppercase tracking-widest">
                                              Finalizado
                                            </div>
                                          ) : isLocked ? (
                                            <div className="bg-muted text-muted-foreground text-[8px] font-black px-2 py-0.5 uppercase tracking-widest">
                                              Cerrado
                                            </div>
                                          ) : null
                                        )}
                                      </div>

                                      {/* Home Team */}
                                      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                                        {displayHome.flag?.startsWith('http') ? (
                                          <img src={displayHome.flag} alt="" className="w-5 h-5 sm:w-8 sm:h-8 object-contain shrink-0" referrerPolicy="no-referrer" />
                                        ) : (
                                          <span className={cn("text-xl sm:text-3xl transition-all shrink-0", isTBD && "opacity-20")}>{displayHome.flag}</span>
                                        )}
                                        <span className={cn("text-[11px] sm:text-lg font-black uppercase tracking-tight truncate", isTBD && "text-muted-foreground/50")}>{displayHome.name}</span>
                                      </div>

                                      {/* Score Inputs & Display of Prediction + Real Result */}
                                      <div className="flex flex-col items-center gap-2 shrink-0 min-w-[80px] sm:min-w-[120px]">
                                        <div className="flex items-center gap-1 sm:gap-2">
                                          <Input
                                            type="number"
                                            disabled={isTBD || isLocked || !user || predictionsReadOnly}
                                            className="w-8 h-8 sm:w-12 sm:h-12 bg-background border-border text-center text-sm sm:text-xl font-black focus-visible:ring-primary focus-visible:border-primary p-0 disabled:opacity-75 disabled:text-foreground/90 disabled:bg-white/5"
                                            value={prediction.homeScore ?? ''}
                                            onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                                            placeholder="-"
                                          />
                                          <span className="text-muted-foreground font-bold text-[10px] sm:text-xs">X</span>
                                          <Input
                                            type="number"
                                            disabled={isTBD || isLocked || !user || predictionsReadOnly}
                                            className="w-8 h-8 sm:w-12 sm:h-12 bg-background border-border text-center text-sm sm:text-xl font-black focus-visible:ring-primary focus-visible:border-primary p-0 disabled:opacity-75 disabled:text-foreground/90 disabled:bg-white/5"
                                            value={prediction.awayScore ?? ''}
                                            onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                                            placeholder="-"
                                          />
                                        </div>

                                        {shouldShowResult && (
                                          <div className="flex flex-col items-center gap-1">
                                            {/* Actual/Simulated Match Score */}
                                            <div className="bg-primary/10 border border-primary/25 rounded px-2 py-0.5 flex items-center gap-1 text-[10px] font-bold text-primary">
                                              <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground/80 mr-1">R:</span>
                                              <span className="font-black text-foreground">
                                                {match.actualHomeScore ?? 0}
                                              </span>
                                              <span className="text-muted-foreground font-normal">-</span>
                                              <span className="font-black text-foreground">
                                                {match.actualAwayScore ?? 0}
                                              </span>
                                            </div>

                                            {/* Points Gained on this specific Match */}
                                            {prediction.homeScore !== null && prediction.homeScore !== undefined && prediction.awayScore !== null && prediction.awayScore !== undefined && (
                                              (() => {
                                                const actHome = match.actualHomeScore ?? 0;
                                                const actAway = match.actualAwayScore ?? 0;
                                                const predHome = prediction.homeScore;
                                                const predAway = prediction.awayScore;
                                                const isExact = (predHome === actHome) && (predAway === actAway);
                                                const isWinner = (Math.sign(predHome - predAway) === Math.sign(actHome - actAway));

                                                let ptsLabel = "";
                                                let ptsClass = "";

                                                if (isExact) {
                                                  ptsLabel = "+3 PTS (EXACTO)";
                                                  ptsClass = "bg-lime/10 border-lime/25 text-lime";
                                                } else if (isWinner) {
                                                  ptsLabel = "+1 PT (GANADOR)";
                                                  ptsClass = "bg-sky-400/10 border-sky-400/25 text-sky-400";
                                                } else {
                                                  ptsLabel = "0 PTS";
                                                  ptsClass = "bg-red-500/5 border-red-500/15 text-red-400/80";
                                                }

                                                return (
                                                  <span className={cn("text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider whitespace-nowrap", ptsClass)}>
                                                    {ptsLabel}
                                                  </span>
                                                );
                                              })()
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      {/* Away Team */}
                                      <div className="flex items-center justify-end gap-2 sm:gap-4 text-right min-w-0">
                                        <span className={cn("text-[11px] sm:text-lg font-black uppercase tracking-tight truncate", isTBD && "text-muted-foreground/50")}>{displayAway.name}</span>
                                        {displayAway.flag?.startsWith('http') ? (
                                          <img src={displayAway.flag} alt="" className="w-5 h-5 sm:w-8 sm:h-8 object-contain shrink-0" referrerPolicy="no-referrer" />
                                        ) : (
                                          <span className={cn("text-xl sm:text-3xl transition-all shrink-0", isTBD && "opacity-20")}>{displayAway.flag}</span>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {user && !predictionsReadOnly && (
                <div className="pt-6 flex justify-end">
                  <Button 
                    onClick={handleSavePredictions}
                    disabled={!hasUnsavedChanges || isSyncing}
                    className="bg-sky-600 hover:bg-sky-700 text-white uppercase text-[10px] font-black tracking-widest px-4 h-9 w-fit shadow-[0_0_20px_rgba(2,132,199,0.2)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    {isSyncing ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              )}
            </div>

            {/* Right Column: Standings */}
            {!user && (
              <div className="space-y-8 bg-sky-950/20 border border-sky-500/10 p-6 rounded-xl">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  <h2 className="text-[12px] font-bold text-sky-400 uppercase tracking-[0.3em]">
                    {user ? 'Tu Tabla Proyectada' : 'Tabla Proyectada'}
                  </h2>
                </div>
                <p className="text-[9px] text-muted-foreground uppercase leading-tight font-bold">
                  {user 
                    ? '* Esta tabla se calcula automáticamente según tus marcadores.' 
                    : '* Esta tabla se calcula automáticamente según los marcadores de este competidor.'}
                </p>
              </div>

              <div className="space-y-12">
                {allGroupStandings.map(({ group, standings }) => (
                  <div key={group} className="space-y-4">
                    <span className="text-[10px] font-black text-sky-400/70 uppercase tracking-widest border-l-2 border-sky-500/50 pl-3 block">
                      Posiciones {getGroupNameLabel(group)}
                    </span>
                    <div className="border-t border-sky-500/10">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-sky-500/10 hover:bg-transparent">
                            <TableHead className="w-[40px] text-[10px] font-black text-muted-foreground uppercase tracking-widest">#</TableHead>
                            <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Equipo</TableHead>
                            <TableHead className="text-right text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pts</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence mode="popLayout">
                            {standings.map((standing, idx) => {
                              const team = currentTeams.find(t => t.id === standing.teamId);
                              if (!team) return null;
                              return (
                                <motion.tr
                                  key={team.id}
                                  layout
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="border-b border-sky-500/5 hover:bg-sky-400/5 transition-colors"
                                >
                                  <TableCell className="py-3 text-[13px] font-black text-sky-400">
                                    {(idx + 1).toString().padStart(2, '0')}
                                  </TableCell>
                                  <TableCell className="py-3">
                                    <div className="flex items-center gap-3">
                                      {team.flag.startsWith('http') ? (
                                        <img src={team.flag} alt="" className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
                                      ) : (
                                        <span className="text-lg">{team.flag}</span>
                                      )}
                                      <span className="font-bold text-[13px] uppercase tracking-tight">{team.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-3 text-right font-black text-[13px] text-sky-400">
                                    {standing.points}
                                  </TableCell>
                                </motion.tr>
                              );
                            })}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'leaderboard' ? (
          <div className="space-y-12">
            <div className="max-w-4xl mx-auto bg-card border border-border">
              <div className="p-4 sm:p-8 border-b border-border bg-primary/5 flex flex-row justify-between items-center gap-4">
                {user && isAdminEmail(user.email) && (
                  <div className="flex items-center gap-2">
                    {!isAddingParticipant ? (
                      <Button 
                        size="sm" 
                        onClick={() => setIsAddingParticipant(true)} 
                        className="text-[9px] font-black uppercase tracking-widest h-8"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Registrar Participante
                      </Button>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <div className="flex flex-col gap-1 w-full sm:w-auto">
                          <Input
                            placeholder="NUEVO PARTICIPANTE"
                            value={newParticipantName}
                            onChange={(e) => {
                              if (e.target.value.length <= 10) {
                                setNewParticipantName(e.target.value.toUpperCase());
                              }
                            }}
                            maxLength={10}
                            className="h-8 w-44 sm:w-60 text-[10px] font-black tracking-wider uppercase rounded-none border-border bg-background"
                          />
                          <span className="text-[7px] font-mono text-muted-foreground font-bold text-right sm:text-left pr-1">
                            {newParticipantName.length}/10 CARACTERES
                          </span>
                        </div>
                        <div className="flex gap-1.5 mt-1 sm:mt-0">
                          <Button onClick={handleAddParticipant} size="sm" className="h-8 text-[9px] font-black uppercase px-4 rounded-none">
                            Agregar
                          </Button>
                          <Button variant="outline" onClick={() => setIsAddingParticipant(false)} size="sm" className="h-8 text-[9px] font-black uppercase px-3 rounded-none">
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {(!user || !isAdminEmail(user.email)) && <div />}
                <div className="flex items-center gap-8 ml-auto">
                  <div className="text-center">
                    <p className="text-[18px] font-black text-lime">{leaderboard.length}</p>
                    <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-tight">Participantes</p>
                  </div>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="w-[45px] sm:w-[60px] text-center text-[10px] font-black uppercase py-4 sm:py-6 px-1 sm:px-4">POS</TableHead>
                    <TableHead className="text-[10px] font-black uppercase py-4 sm:py-6 px-1.5 sm:px-4">Participante</TableHead>
                    <TableHead className="hidden sm:table-cell text-center text-[10px] font-black uppercase py-6">Progreso</TableHead>
                    <TableHead className="hidden md:table-cell text-right text-[10px] font-black uppercase py-6 px-4">Exactos (3 PTS)</TableHead>
                    <TableHead className="hidden md:table-cell text-right text-[10px] font-black uppercase py-6 px-4">Ganador (1 PT)</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase py-4 sm:py-6 px-1.5 sm:px-4">Puntos</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase py-4 sm:py-6 pr-3 sm:pr-8 pl-1.5 sm:pl-4">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.length > 0 ? (
                    leaderboard.map((entry, index) => (
                      <motion.tr 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        key={entry.uid}
                        className="group hover:bg-white/5 border-b border-white/5 transition-colors"
                      >
                        <TableCell className="py-4 sm:py-6 text-center px-1 sm:px-4">
                          <span className={cn(
                            "text-[12px] font-black",
                            index === 0 ? "text-lime" : index === 1 ? "text-gray-300" : index === 2 ? "text-amber-600" : ""
                          )}>
                            {(index + 1).toString().padStart(2, '0')}
                          </span>
                        </TableCell>
                        <TableCell 
                          className="py-4 sm:py-6 px-1.5 sm:px-4 cursor-pointer hover:text-primary transition-colors group/cell"
                          title={`Ver predicciones de ${entry.displayName || 'Anónimo'}`}
                          onClick={() => {
                            setActiveParticipantId(entry.uid);
                            setPredictionsEditMode(true);
                            setPredictionsReadOnly(true);
                          }}
                        >
                          <div className="flex items-center gap-1.5 sm:gap-3">
                            <img 
                              src={entry.photoURL || getAvatarForUser(entry.displayName || 'Anónimo')} 
                              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-border bg-zinc-800 transition-all group-hover/cell:border-primary group-hover/cell:scale-105" 
                              referrerPolicy="no-referrer" 
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-[12px] font-black uppercase truncate max-w-[90px] xs:max-w-[140px] sm:max-w-[200px] transition-all group-hover/cell:text-primary">
                                {entry.displayName || 'Anónimo'}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell py-6 text-center">
                          {(() => {
                            const stat = predictionsStats[entry.uid];
                            if (!stat) {
                              return (
                                <span className="text-[10px] font-black uppercase text-muted-foreground animate-pulse">
                                  Cargando...
                                </span>
                              );
                            }
                            const { filled, total } = stat;
                            const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;
                            const isCompleted = filled === total && total > 0;
                            return (
                              <div className="flex flex-col items-center gap-1.5 min-w-[85px] mx-auto">
                                <div className="flex items-center justify-center gap-1">
                                  <span className={cn(
                                    "text-[11px] font-black tracking-tight",
                                    isCompleted ? "text-lime" : filled > 0 ? "text-[#FFD700]" : "text-muted-foreground"
                                  )}>
                                    {percentage}%
                                  </span>
                                  <span className="text-[9px] text-muted-foreground font-bold">
                                    ({filled}/{total})
                                  </span>
                                </div>
                                <div className="w-16 h-1 bg-white/5 border border-white/10 rounded-none overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full transition-all duration-500",
                                      isCompleted ? "bg-lime" : "bg-primary"
                                    )}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="hidden md:table-cell py-4 sm:py-6 text-right px-4">
                          <span className="text-[12px] font-black text-white/95">
                            {entry.correctResults || 0} <span className="text-[9px] text-muted-foreground font-medium ml-1">({(entry.correctResults || 0) * 3} PTS)</span>
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell py-4 sm:py-6 text-right px-4">
                          <span className="text-[12px] font-black text-white/95">
                            {entry.correctWinners || 0} <span className="text-[9px] text-muted-foreground font-medium ml-1">({(entry.correctWinners || 0) * 1} PTS)</span>
                          </span>
                        </TableCell>
                        <TableCell className="py-4 sm:py-6 text-right px-1.5 sm:px-4">
                          <span className="text-[13px] sm:text-[16px] font-black text-lime">
                            {entry.totalPoints || 0} <span className="text-[8px] sm:text-[10px] text-muted-foreground ml-0.5 sm:ml-1">PTS</span>
                          </span>
                        </TableCell>
                        <TableCell className="py-4 sm:py-6 text-right pr-3 sm:pr-8 pl-1.5 sm:pl-4">
                          <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                            {user && isAdminEmail(user.email) ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setActiveParticipantId(entry.uid);
                                  setPredictionsEditMode(true);
                                  setPredictionsReadOnly(false);
                                  setEditingNameValue(entry.displayName || '');
                                  setIsEditingName(false);
                                }}
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0 border-primary/40 hover:bg-primary/10 text-primary hover:text-primary-foreground"
                                title="Editar Predicciones y Datos"
                              >
                                <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setActiveParticipantId(entry.uid);
                                  setPredictionsEditMode(true);
                                  setPredictionsReadOnly(!user);
                                }}
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0 border-border hover:bg-white/5 text-muted-foreground hover:text-foreground"
                                title={user ? 'Editar Predicciones' : 'Ver Predicciones'}
                              >
                                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-20 text-center">
                        <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                          Aún no hay participantes en esta quiniela.
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Reglas de puntuación */}
            <div className="max-w-4xl mx-auto bg-card border border-border p-6 sm:p-8">
              <div className="flex items-center gap-2.5 mb-6 border-b border-border pb-4">
                <div className="w-2 h-4 bg-lime" />
                <h3 className="text-[12px] font-black uppercase tracking-wider text-white">
                  Reglas de Puntuación
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-border/40 p-4 bg-white/[0.01]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-lime">
                      Resultado Exacto
                    </span>
                    <span className="text-[12px] font-black uppercase tracking-wide text-lime bg-lime/10 px-2 py-0.5 border border-lime/20">
                      3 Puntos
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed uppercase font-medium">
                    Se otorgan si tu predicción coincide exactamente con el marcador final del partido. Ej. Predicción: 2-1 | Resultado: 2-1.
                  </p>
                </div>
                
                <div className="border border-border/40 p-4 bg-white/[0.01]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-sky-400">
                      Ganador o Empate
                    </span>
                    <span className="text-[12px] font-black uppercase tracking-wide text-sky-450 bg-sky-500/10 px-2 py-0.5 border border-sky-500/20 text-sky-400">
                      1 Punto
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed uppercase font-medium">
                    Se otorgan si aciertas quién gana (o empate), pero no el marcador exacto de goles. Ej. Predicción: 3-1 | Resultado: 2-0.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-2 border-t border-border/30 pt-4 text-muted-foreground">
                <span className="text-[9px] font-mono font-bold tracking-wider uppercase">
                  * El cálculo se realiza automáticamente en tiempo real a medida que se ingresan los resultados oficiales.
                </span>
              </div>
            </div>
          </div>
        ) : activeTab === 'noticias' ? (
      <div className="space-y-12">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-12">
          {/* Content from the original 'resultados' sub-tab: Matches and Scorers */}
          <div className="space-y-8">
            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-border pt-[13px] pl-0 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[9px]! font-black uppercase tracking-tight leading-none block">{isSimulationMode ? `Resultados Simulados` : 'Últimos Resultados'}</span>
                  {isSimulationMode ? (
                    <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[8px] font-black tracking-widest uppercase rounded-none">
                      Simulado
                    </span>
                  ) : apiMatches.length > 0 ? (
                    <span className="px-2 py-0.5 bg-lime/10 border border-lime/30 text-lime text-[8px] font-black tracking-widest uppercase rounded-none">
                      API Real-Time
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-sky-550/10 border border-sky-500/30 text-sky-400 text-[8px] font-black tracking-widest uppercase rounded-none">
                      {formatDbLastUpdated(dbLastUpdated)}
                    </span>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => activeLeague?.competition && syncCompetitionData(activeLeague.competition)} 
                  disabled={isSyncing || !activeLeague?.competition}
                  className="text-[9px] font-black uppercase tracking-widest border-border h-8 px-4"
                >
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar Datos'}
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  const displayResults = isSimulationMode 
                    ? MATCHES.filter(m => new Date(m.date) < new Date(simulatedDate))
                    : (apiMatches.length > 0 
                        ? apiMatches.filter(m => m.status === 'FINISHED' || m.status === 'LIVE' || m.status === 'IN_PLAY')
                        : MATCHES.filter(m => new Date(m.date) < new Date())
                      );
                  
                  if (displayResults.length > 0) {
                    return displayResults
                      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 8)
                      .map(match => {
                        const homeTeam = currentTeams.find(t => t.id === match.homeTeamId);
                        const awayTeam = currentTeams.find(t => t.id === match.awayTeamId);
                        return (
                          <div key={match.id} className="bg-card border border-border p-5 flex flex-col gap-4 hover:border-primary/40 transition-colors">
                            <div className="flex justify-between items-center text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                              <span>{new Date(match.date).toLocaleDateString()}</span>
                              <span className={(!isSimulationMode && (match.status === 'LIVE' || match.status === 'IN_PLAY')) ? "text-lime animate-pulse" : "text-muted-foreground"}>
                                {isSimulationMode ? "FINALIZADO (SIM)" : (match.status || 'FINALIZADO')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                {homeTeam?.flag?.startsWith('http') ? (
                                  <img src={homeTeam.flag} className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0" referrerPolicy="no-referrer" />
                                ) : (
                                  <span className="text-xl shrink-0">{homeTeam?.flag || "🏳️"}</span>
                                )}
                                <span className="text-[11px] font-black uppercase truncate">{isSimulationMode ? (homeTeam?.name || "TBD") : ((match as any).homeTeamName || homeTeam?.name || "TBD")}</span>
                              </div>
                              <div className="bg-white/5 px-3 py-1 border border-border min-w-[60px] text-center">
                                <span className="text-[14px] font-black tracking-tight">{match.actualHomeScore ?? '-'} : {match.actualAwayScore ?? '-'}</span>
                              </div>
                              <div className="flex items-center gap-3 flex-1 justify-end text-right overflow-hidden">
                                <span className="text-[11px] font-black uppercase truncate">{isSimulationMode ? (awayTeam?.name || "TBD") : ((match as any).awayTeamName || awayTeam?.name || "TBD")}</span>
                                {awayTeam?.flag?.startsWith('http') ? (
                                  <img src={awayTeam.flag} className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0" referrerPolicy="no-referrer" />
                                ) : (
                                  <span className="text-xl shrink-0">{awayTeam?.flag || "🏳️"}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      });
                  }
                  return (
                    <div className="col-span-full py-12 text-center bg-white/5 border border-dashed border-border">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">Aún no hay resultados para mostrar</p>
                    </div>
                  );
                })()}
              </div>
              
              <div className="pt-8 space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[9px]! font-black uppercase tracking-tight leading-none block">Próximos Encuentros</span>
                  {isSimulationMode ? (
                    <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[8px] font-black tracking-widest uppercase rounded-none">
                      Simulado
                    </span>
                  ) : apiMatches.length > 0 ? (
                    <span className="px-2 py-0.5 bg-lime/10 border border-lime/30 text-lime text-[8px] font-black tracking-widest uppercase rounded-none">
                      API Real-Time
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-sky-550/10 border border-sky-500/30 text-sky-400 text-[8px] font-black tracking-widest uppercase rounded-none">
                      {formatDbLastUpdated(dbLastUpdated)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(() => {
                    const displayUpcoming = isSimulationMode
                      ? MATCHES.filter(m => new Date(m.date) >= new Date(simulatedDate))
                      : (apiMatches.length > 0
                          ? apiMatches.filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED')
                          : MATCHES.filter(m => new Date(m.date) >= new Date())
                        );
                    
                    if (displayUpcoming.length > 0) {
                      return displayUpcoming
                        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .slice(0, 6)
                        .map(match => {
                          const homeTeam = currentTeams.find(t => t.id === match.homeTeamId);
                          const awayTeam = currentTeams.find(t => t.id === match.awayTeamId);
                          return (
                            <div key={match.id} className="bg-card border border-border p-5 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                {homeTeam?.flag?.startsWith('http') ? (
                                  <img src={homeTeam.flag} className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0" referrerPolicy="no-referrer" />
                                ) : (
                                  <span className="text-xl shrink-0">{homeTeam?.flag || "🏳️"}</span>
                                )}
                                <span className="text-[10px] font-black uppercase truncate">{isSimulationMode ? (homeTeam?.name || "TBD") : ((match as any).homeTeamName || homeTeam?.name || "TBD")}</span>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black text-primary uppercase">VS</span>
                                <span className="text-[8px] text-muted-foreground whitespace-nowrap">{new Date(match.date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-3 flex-1 justify-end text-right overflow-hidden">
                                <span className="text-[10px] font-black uppercase truncate">{isSimulationMode ? (awayTeam?.name || "TBD") : ((match as any).awayTeamName || awayTeam?.name || "TBD")}</span>
                                {awayTeam?.flag?.startsWith('http') ? (
                                  <img src={awayTeam.flag} className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0" referrerPolicy="no-referrer" />
                                ) : (
                                  <span className="text-xl shrink-0">{awayTeam?.flag || "🏳️"}</span>
                                )}
                              </div>
                            </div>
                          );
                        });
                    }
                    return (
                      <div className="col-span-full py-8 text-center bg-white/5 border border-dashed border-border/60">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">No hay próximos encuentros programados</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Sidebar for players */}
            <div className="space-y-8 bg-sky-950/10 border border-sky-500/10 p-8">
              <div className="flex items-center gap-3 border-b border-sky-500/20 pb-4">
                <Trophy className="w-4 h-4 text-sky-400" />
                <span className="text-[9px]! font-black uppercase tracking-tight text-sky-400 leading-none block">Goleadores</span>
              </div>
              <div className="space-y-4">
                {currentScorers.length > 0 ? (
                  currentScorers.slice(0, 10).map((scorer, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-sky-500/5 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-sky-400/50">{(i+1).toString().padStart(2, '0')}</span>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black uppercase tracking-tight">{scorer.player.name}</span>
                          <div className="flex items-center gap-1.5">
                            {isSimulationMode ? <span>{scorer.team.crest}</span> : (scorer.team.crest && <img src={scorer.team.crest} className="w-3 h-3 object-contain" referrerPolicy="no-referrer" />)}
                            <span className="text-[9px] text-muted-foreground uppercase">{scorer.team.name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-sky-500/10 px-3 py-1 border border-sky-500/20">
                        <span className="text-[14px] font-black text-sky-400">{scorer.goals}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[9px] text-muted-foreground uppercase italic pb-10">Sin datos de goleadores</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
        ) : activeTab === 'settings' ? (
          <div className="max-w-4xl mx-auto space-y-12 pb-20 pt-4">
            {/* Header section (Renaming - Only for Creator) */}
            {selectedLeague?.creatorId === user?.uid && (
              <div className="bg-card border border-border p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <Edit className="w-5 h-5 text-primary" />
                  <h2 className="text-[14px] font-black uppercase tracking-widest text-primary">Gestionar Quiniela</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nombre de la Quiniela</label>
                      <span className="text-[9px] font-mono text-muted-foreground font-bold tracking-wider">
                        {editLeagueName.length}/10 CARACTERES
                      </span>
                    </div>
                    <Input 
                      value={editLeagueName}
                      onChange={(e) => {
                        if (e.target.value.length <= 10) {
                          setEditLeagueName(e.target.value);
                        }
                      }}
                      maxLength={10}
                      className="h-12 text-[14px] font-black uppercase tracking-tight"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={updateLeagueName}
                      className="w-full h-12 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                    >
                      Guardar Cambios
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Access Information section */}
            <div className="bg-card border border-border p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <Info className="w-5 h-5 text-amber-500" />
                <h3 className="text-[12px] font-black uppercase tracking-widest text-primary">Información de Acceso</h3>
              </div>
              <div className="space-y-4">
                 <p className="text-[11px] text-muted-foreground leading-relaxed uppercase font-bold">
                  ID único de la quiniela. Compártelo con las personas que desees invitar.
                </p>
                <div className="p-6 bg-black/20 border-2 border-dashed border-primary/30 text-center space-y-3">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">ID de esta Quiniela</span>
                  <p className="text-[16px] font-mono font-black text-primary select-all break-all">{selectedLeagueId}</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedLeagueId || '');
                      toast.success('ID copiado');
                    }}
                    className="text-[10px] font-black uppercase h-9 border-primary/30 shadow-inner group transition-all"
                  >
                    <Share2 className="w-3 h-3 mr-2 group-hover:scale-110 transition-transform" />
                    Copiar ID
                  </Button>
                </div>
              </div>
            </div>

            {isSuperAdmin && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-8 space-y-6">
                {!showCleanupConfirm && !isCleaningDb && (
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1 text-center md:text-left">
                      <h3 className="text-[14px] font-black uppercase tracking-tight text-amber-500">Mantenimiento de Administrador</h3>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">
                        Limpia la base de datos de todos los usuarios y las quinielas para iniciar con datos limpios de forma definitiva. No afecta los resultados generales de los partidos.
                      </p>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => setShowCleanupConfirm(true)}
                      className="h-12 px-10 text-[10px] font-black uppercase tracking-widest border-amber-500/50 hover:bg-amber-500/20 text-amber-500 hover:text-amber-400 transition-all font-black"
                    >
                      Limpiar Base de Datos
                    </Button>
                  </div>
                )}

                {showCleanupConfirm && !isCleaningDb && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="border-l-4 border-red-500 pl-4 py-2 space-y-2">
                      <h4 className="text-[12px] font-black uppercase text-red-500 tracking-wider">¡ATENCIÓN: OPERACIÓN CRÍTICA IRREVERSIBLE!</h4>
                      <p className="text-[11px] text-muted-foreground uppercase leading-relaxed font-bold">
                        ¿Estás absolutamente seguro de que deseas limpiar la base de datos? Esta acción borrará de manera definitiva:
                      </p>
                      <ul className="text-[10px] text-muted-foreground uppercase list-disc list-inside space-y-1 font-bold pl-2">
                        <li>Todas las quinielas y ligas creadas en la plataforma.</li>
                        <li>Todos los perfiles de los usuarios participantes.</li>
                        <li>Todas las predicciones y puntajes enviados.</li>
                      </ul>
                      <p className="text-[10px] text-emerald-400 font-bold uppercase">
                        Nota: Los resultados oficiales de los partidos, equipos y configuraciones generales NO sufrirán ningún cambio.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-4 pt-2">
                      <Button
                        variant="destructive"
                        className="h-11 px-8 text-[10px] font-black uppercase tracking-widest bg-red-600 hover:bg-red-700 text-white shadow-lg"
                        onClick={async () => {
                          setShowCleanupConfirm(false);
                          await handleCleanDatabase();
                        }}
                      >
                        SÍ, ELIMINAR Y LIMPIAR DATOS
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 px-8 text-[10px] font-black uppercase tracking-widest border-border text-muted-foreground hover:bg-muted/15"
                        onClick={() => setShowCleanupConfirm(false)}
                      >
                        CANCELAR
                      </Button>
                    </div>
                  </div>
                )}

                {(isCleaningDb || (cleanupProgress > 0 && cleanupProgress <= 100)) && (
                  <div className="space-y-3 pt-4 border-t border-amber-500/20">
                    <div className="flex justify-between items-center text-[10px] font-mono text-amber-500 font-bold uppercase">
                      <span className="truncate max-w-[80%]">{cleanupStatus}</span>
                      <span>{cleanupProgress}%</span>
                    </div>
                    <div className="w-full bg-black/40 h-3 rounded-full overflow-hidden border border-amber-500/20">
                      <div 
                        className="bg-amber-500 h-full rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${cleanupProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-destructive/10 border border-destructive/30 p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1 text-center md:text-left">
                  <h3 className="text-[14px] font-black uppercase tracking-tight text-destructive">Zona de Peligro</h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">
                    {selectedLeague?.creatorId === user?.uid 
                      ? 'Eliminar permanentemente la quiniela y todo su progreso.' 
                      : 'Salir de esta quiniela. Ya no podrás ver sus datos a menos que te vuelvas a unir.'}
                  </p>
                </div>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    const isCreator = selectedLeague?.creatorId === user?.uid;
                    const confirmMsg = isCreator 
                      ? '¿ESTÁS SEGURO? Se borrará permanentemente la quiniela y todos sus datos.' 
                      : '¿Seguro que deseas salir de esta quiniela?';
                    
                    if (confirm(confirmMsg)) {
                      if (isCreator) {
                        deleteLeague(selectedLeagueId || '');
                      } else {
                        leaveLeague(selectedLeagueId || '');
                      }
                      setSelectedLeagueId(null);
                    }
                  }}
                  className="h-12 px-10 text-[10px] font-black uppercase tracking-widest"
                >
                  {selectedLeague?.creatorId === user?.uid ? 'Eliminar Quiniela' : 'Salir de la Quiniela'}
                </Button>
              </div>
            </div>
          </div>
        ) : activeTab === 'resultados' ? (
      <div className="space-y-12 pt-10">
        <div className="space-y-20">
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[9px]! font-black uppercase tracking-tight leading-none block">
                  {isSimulationMode ? "Tablas de Clasificación (Simuladas)" : "Tablas de Clasificación Oficiales"}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {(() => {
                  const displayStandings = isSimulationMode 
                    ? computedStandings 
                    : (apiStandings.filter(s => s.type === 'TOTAL').length > 0 
                        ? apiStandings.filter(s => s.type === 'TOTAL') 
                        : computedStandings
                      );
                  return displayStandings.map((standing: any) => (
                    <div key={standing.group} className="bg-card border border-border overflow-hidden">
                      <div className="bg-primary/10 px-4 py-2 border-b border-border">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Grupo {standing.group.replace('GROUP_', '')}</span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-b border-border">
                            <TableHead className="text-[9px] font-black uppercase py-4">Equipo</TableHead>
                            <TableHead className="text-center text-[9px] font-black uppercase py-4">PJ</TableHead>
                            <TableHead className="text-right text-[9px] font-black uppercase py-4">PTS</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {standing.table.map((row: any) => {
                            const isStaticRow = isSimulationMode || !row.team;
                            return (
                              <TableRow key={isStaticRow ? row.id : row.team.id} className="hover:bg-white/5 border-b border-white/5">
                                <TableCell className="py-2">
                                  <div className="flex items-center gap-2">
                                    {isStaticRow ? (
                                      row.crest?.startsWith('http') ? (
                                        <img src={row.crest} className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
                                      ) : (
                                        <span className="text-lg">{row.crest}</span>
                                      )
                                    ) : (
                                      <img src={row.team.crest} className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
                                    )}
                                    <span className="text-[10px] font-bold uppercase truncate">
                                      {isStaticRow ? row.name : (row.team.shortName || row.team.name)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center font-mono text-[10px]">{row.playedGames}</TableCell>
                                <TableCell className="text-right font-black text-lime text-[11px]">{row.points}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="space-y-12 pb-20">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[9px]! font-black uppercase tracking-tight leading-none block">Llaves finales</span>
              </div>
              
              <div className="grid grid-cols-1 overflow-x-auto pb-6">
                <div className="flex min-w-[1200px] justify-between gap-8 h-auto">
                  {/* Round of 32 */}
                  <div className="flex flex-col gap-4 w-[220px]">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center border-b border-border pb-2">Round of 32 (J4)</span>
                    <div className="space-y-3">
                      {(() => {
                        const knockoutMatches = isSimulationMode 
                          ? currentMatches.filter(m => m.matchday === 4)
                          : apiMatches.filter(m => m.stage === 'LAST_32');
                        
                        if (knockoutMatches.length > 0) {
                          return knockoutMatches.slice(0, 16).map(m => {
                            const home = currentTeams.find(t => t.id === m.homeTeamId);
                            const away = currentTeams.find(t => t.id === m.awayTeamId);
                            const isFinished = isSimulationMode ? new Date(m.date) < new Date(simulatedDate) : m.status === 'FINISHED';
                            return (
                              <div key={m.id} className="bg-card border border-border p-2 text-[9px] font-black uppercase tracking-tighter hover:border-primary/50 transition-all">
                                <div className="flex justify-between border-b border-white/5 pb-1 mb-1">
                                  <div className="flex items-center gap-1.5 overflow-hidden">
                                    {home?.flag?.startsWith('http') ? (
                                      <img src={home.flag} className="w-3.5 h-3.5 object-contain shrink-0" referrerPolicy="no-referrer" />
                                    ) : (
                                      <span className="text-[10px] grayscale-0">{home?.flag || '🏳️'}</span>
                                    )}
                                    <span className="truncate">{isSimulationMode ? home?.name : (m as any).homeTeamName}</span>
                                  </div>
                                  <span>{isFinished ? m.actualHomeScore : '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <div className="flex items-center gap-1.5 overflow-hidden">
                                    {away?.flag?.startsWith('http') ? (
                                      <img src={away.flag} className="w-3.5 h-3.5 object-contain shrink-0" referrerPolicy="no-referrer" />
                                    ) : (
                                      <span className="text-[10px] grayscale-0">{away?.flag || '🏳️'}</span>
                                    )}
                                    <span className="truncate">{isSimulationMode ? away?.name : (m as any).awayTeamName}</span>
                                  </div>
                                  <span>{isFinished ? m.actualAwayScore : '-'}</span>
                                </div>
                              </div>
                            );
                          });
                        }
                        return <div className="h-full flex items-center justify-center border border-dashed border-border opacity-30 italic text-[9px] uppercase font-black px-4 text-center">Datos por definir</div>;
                      })()}
                    </div>
                  </div>

                  {/* Round of 16 */}
                  <div className="flex flex-col gap-4 w-[220px]">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center border-b border-border pb-2">Round of 16 (J5)</span>
                    <div className="space-y-8 mt-4">
                      {(() => {
                        const knockoutMatches = isSimulationMode 
                          ? currentMatches.filter(m => m.matchday === 5)
                          : apiMatches.filter(m => m.stage === 'LAST_16');
                        
                        if (knockoutMatches.length > 0) {
                          return knockoutMatches.slice(0, 8).map(m => {
                            const home = currentTeams.find(t => t.id === m.homeTeamId);
                            const away = currentTeams.find(t => t.id === m.awayTeamId);
                            const isFinished = isSimulationMode ? new Date(m.date) < new Date(simulatedDate) : m.status === 'FINISHED';
                            return (
                              <div key={m.id} className="bg-card border border-primary/20 p-3 text-[10px] font-black uppercase tracking-tighter shadow-[0_0_15px_rgba(237,28,36,0.05)]">
                                <div className="flex justify-between border-b border-white/5 pb-1 mb-1">
                                  <div className="flex items-center gap-2">
                                    {home?.flag?.startsWith('http') ? (
                                      <img src={home.flag} className="w-4 h-4 object-contain shrink-0" referrerPolicy="no-referrer" />
                                    ) : (
                                      <span className="text-xs">{home?.flag || '🏳️'}</span>
                                    )}
                                    <span>{isSimulationMode ? home?.name : (m as any).homeTeamName}</span>
                                  </div>
                                  <span className="text-primary">{isFinished ? m.actualHomeScore : '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <div className="flex items-center gap-2">
                                    {away?.flag?.startsWith('http') ? (
                                      <img src={away.flag} className="w-4 h-4 object-contain shrink-0" referrerPolicy="no-referrer" />
                                    ) : (
                                      <span className="text-xs">{away?.flag || '🏳️'}</span>
                                    )}
                                    <span>{isSimulationMode ? away?.name : (m as any).awayTeamName}</span>
                                  </div>
                                  <span className="text-primary">{isFinished ? m.actualAwayScore : '-'}</span>
                                </div>
                              </div>
                            );
                          });
                        }
                        return <div className="h-full flex items-center justify-center border border-dashed border-border opacity-30 italic text-[9px] uppercase font-black">Por definir</div>;
                      })()}
                    </div>
                  </div>

                  {/* Quarter Finals */}
                  <div className="flex flex-col gap-4 w-[220px]">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center border-b border-border pb-2">Quarter Final (J6)</span>
                    <div className="space-y-20 mt-12">
                      {(() => {
                        const knockoutMatches = isSimulationMode 
                          ? currentMatches.filter(m => m.matchday === 6)
                          : apiMatches.filter(m => m.stage === 'QUARTER_FINALS');
                        
                        if (knockoutMatches.length > 0) {
                          return knockoutMatches.slice(0, 4).map(m => {
                            const home = currentTeams.find(t => t.id === m.homeTeamId);
                            const away = currentTeams.find(t => t.id === m.awayTeamId);
                            const isFinished = isSimulationMode ? new Date(m.date) < new Date(simulatedDate) : m.status === 'FINISHED';
                            return (
                              <div key={m.id} className="bg-primary/5 border border-primary/30 p-4 text-[11px] font-black uppercase tracking-tighter">
                                <div className="flex justify-between border-b border-primary/10 pb-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    {home?.flag?.startsWith('http') ? (
                                      <img src={home.flag} className="w-5 h-5 object-contain shrink-0" referrerPolicy="no-referrer" />
                                    ) : (
                                      <span className="text-base">{home?.flag || '🏳️'}</span>
                                    )}
                                    <span>{isSimulationMode ? home?.name : (m as any).homeTeamName}</span>
                                  </div>
                                  <span>{isFinished ? m.actualHomeScore : '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <div className="flex items-center gap-2">
                                    {away?.flag?.startsWith('http') ? (
                                      <img src={away.flag} className="w-5 h-5 object-contain shrink-0" referrerPolicy="no-referrer" />
                                    ) : (
                                      <span className="text-base">{away?.flag || '🏳️'}</span>
                                    )}
                                    <span>{isSimulationMode ? away?.name : (m as any).awayTeamName}</span>
                                  </div>
                                  <span>{isFinished ? m.actualAwayScore : '-'}</span>
                                </div>
                              </div>
                            );
                          });
                        }
                        return <div className="h-full flex items-center justify-center border border-dashed border-border opacity-30 italic text-[9px] uppercase font-black">Por definir</div>;
                      })()}
                    </div>
                  </div>

                  {/* Semi Finals */}
                  <div className="flex flex-col gap-4 w-[220px]">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center border-b border-border pb-2">Semi Final (J7)</span>
                    <div className="space-y-40 mt-24">
                      {(() => {
                        const knockoutMatches = isSimulationMode 
                          ? currentMatches.filter(m => m.matchday === 7)
                          : apiMatches.filter(m => m.stage === 'SEMI_FINALS');
                        
                        if (knockoutMatches.length > 0) {
                          return knockoutMatches.slice(0, 2).map(m => {
                            const home = currentTeams.find(t => t.id === m.homeTeamId);
                            const away = currentTeams.find(t => t.id === m.awayTeamId);
                            const isFinished = isSimulationMode ? new Date(m.date) < new Date(simulatedDate) : m.status === 'FINISHED';
                            return (
                              <div key={m.id} className="bg-primary/10 border-2 border-primary/40 p-5 text-[12px] font-black uppercase tracking-tighter">
                                <div className="flex justify-between border-b border-primary/20 pb-2 mb-2">
                                  <div className="flex items-center gap-3">
                                    {home?.flag?.startsWith('http') ? (
                                      <img src={home.flag} className="w-6 h-6 object-contain shrink-0" referrerPolicy="no-referrer" />
                                    ) : (
                                      <span className="text-xl">{home?.flag || '🏳️'}</span>
                                    )}
                                    <span>{isSimulationMode ? home?.name : (m as any).homeTeamName}</span>
                                  </div>
                                  <span className="text-lime">{isFinished ? m.actualHomeScore : '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <div className="flex items-center gap-3">
                                    {away?.flag?.startsWith('http') ? (
                                      <img src={away.flag} className="w-6 h-6 object-contain shrink-0" referrerPolicy="no-referrer" />
                                    ) : (
                                      <span className="text-xl">{away?.flag || '🏳️'}</span>
                                    )}
                                    <span>{isSimulationMode ? away?.name : (m as any).awayTeamName}</span>
                                  </div>
                                  <span className="text-lime">{isFinished ? m.actualAwayScore : '-'}</span>
                                </div>
                              </div>
                            );
                          });
                        }
                        return <div className="h-full flex items-center justify-center border border-dashed border-border opacity-30 italic text-[9px] uppercase font-black">Por definir</div>;
                      })()}
                    </div>
                  </div>

                  {/* Final */}
                  <div className="flex flex-col gap-4 w-[220px]">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-center border-b-2 border-primary pb-2">Final (J8)</span>
                    <div className="flex flex-col items-center gap-4 mt-[90px]">
                      <Trophy className="w-12 h-12 text-primary animate-bounce mb-4" />
                      {(() => {
                        const finalMatches = isSimulationMode 
                          ? currentMatches.filter(m => m.matchday === 8)
                          : apiMatches.filter(m => m.stage === 'FINAL');
                        
                        return finalMatches.map(m => {
                          const home = currentTeams.find(t => t.id === m.homeTeamId);
                          const away = currentTeams.find(t => t.id === m.awayTeamId);
                          const isFinished = isSimulationMode ? new Date(m.date) < new Date(simulatedDate) : m.status === 'FINISHED';
                          return (
                            <div key={m.id} className="w-full bg-gradient-to-br from-primary/20 to-purple/20 border-2 border-primary p-6 rounded-none text-[14px] font-black uppercase text-center">
                              <div className="flex flex-col items-center gap-2 mb-2">
                                {home?.flag?.startsWith('http') ? (
                                  <img src={home.flag} className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                                ) : (
                                  <span className="text-4xl mb-1">{home?.flag || '🏳️'}</span>
                                )}
                                <span>{isSimulationMode ? home?.name : (m as any).homeTeamName}</span>
                              </div>
                              <div className="text-4xl text-primary my-4">
                                {isFinished ? (m.actualHomeScore ?? '-') : '-'} : {isFinished ? (m.actualAwayScore ?? '-') : '-'}
                              </div>
                              <div className="flex flex-col items-center gap-2">
                                {away?.flag?.startsWith('http') ? (
                                  <img src={away.flag} className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                                ) : (
                                  <span className="text-4xl mb-1">{away?.flag || '🏳️'}</span>
                                )}
                                <span>{isSimulationMode ? away?.name : (m as any).awayTeamName}</span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </>
    )}
    </main>

    {/* Custom Delete Confirmation Modal */}
    <AnimatePresence>
      {isDeleteConfirmOpen && participantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-zinc-950 border-2 border-red-500/40 p-6 sm:p-8 max-w-md w-full rounded-none space-y-6 shadow-2xl shadow-red-950/20 relative z-50"
          >
            <div className="space-y-3">
              <h3 className="text-lg font-black uppercase tracking-tight text-red-500">¿Eliminar Participante?</h3>
              <p className="text-[11px] text-muted-foreground uppercase font-black tracking-widest leading-relaxed">
                Estás a punto de eliminar a <span className="text-foreground font-black">"{participantToDelete.name}"</span>. Esta acción borrará todas sus predicciones y datos definitivamente.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={async () => {
                  const { id, name } = participantToDelete;
                  setIsDeleteConfirmOpen(false);
                  setParticipantToDelete(null);
                  await handleDeleteParticipant(id, name, true);
                }}
                className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-none shadow-md"
              >
                Sí, Eliminar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setParticipantToDelete(null);
                }}
                className="flex-1 h-11 border-border text-[10px] font-black uppercase tracking-widest hover:bg-white/5 rounded-none"
              >
                Cancelar
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Custom Delete Admin Confirmation Modal */}
    <AnimatePresence>
      {isDeleteAdminConfirmOpen && adminToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-zinc-950 border-2 border-red-500/40 p-6 sm:p-8 max-w-md w-full rounded-none space-y-6 shadow-2xl shadow-red-950/20 relative z-50"
          >
            <div className="space-y-3">
              <h3 className="text-lg font-black uppercase tracking-tight text-red-500">¿Revocar permisos de Administrador?</h3>
              <p className="text-[11px] text-muted-foreground uppercase font-black tracking-widest leading-relaxed">
                Estás a punto de revocar el acceso de administrador para <span className="text-foreground font-black">"{adminToDelete.email}"</span>.
              </p>
              <p className="text-[10px] text-red-400 uppercase font-black tracking-widest leading-relaxed">
                La solicitud de este usuario pasará automáticamente a estado DENEGADO y perderá todos sus accesos para gestionar quinielas.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleConfirmDeleteAdmin}
                className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-none shadow-md"
              >
                Sí, Revocar Acceso
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteAdminConfirmOpen(false);
                  setAdminToDelete(null);
                }}
                className="flex-1 h-11 border-border text-[10px] font-black uppercase tracking-widest hover:bg-white/5 rounded-none"
              >
                Cancelar
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Custom Deny/Reject Request Confirmation Modal */}
    <AnimatePresence>
      {isDenyRequestConfirmOpen && requestToDeny && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-zinc-950 border-2 border-red-500/40 p-6 sm:p-8 max-w-md w-full rounded-none space-y-6 shadow-2xl shadow-red-950/20 relative z-50"
          >
            <div className="space-y-3">
              <h3 className="text-lg font-black uppercase tracking-tight text-red-500">¿Denegar Solicitud de Acceso?</h3>
              <p className="text-[11px] text-muted-foreground uppercase font-black tracking-widest leading-relaxed">
                Estás a punto de denegar la solicitud de administrador para <span className="text-foreground font-black">"{requestToDeny.email}"</span>.
              </p>
              <p className="text-[10px] text-red-400 uppercase font-black tracking-widest leading-relaxed">
                El usuario pasará a estado RECHAZADA/DENEGADA y perderá o no tendrá privilegio activo de administrador para crear quinielas.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={async () => {
                  setIsDenyRequestConfirmOpen(false);
                  const req = requestToDeny;
                  setRequestToDeny(null);
                  await handleUpdateUserRequestStatus(req, 'rejected', true);
                }}
                className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-none shadow-md"
              >
                Sí, Denegar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDenyRequestConfirmOpen(false);
                  setRequestToDeny(null);
                }}
                className="flex-1 h-11 border-border text-[10px] font-black uppercase tracking-widest hover:bg-white/5 rounded-none"
              >
                Cancelar
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Custom Suspend Request Confirmation Modal */}
    <AnimatePresence>
      {isSuspendConfirmOpen && requestToSuspend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-zinc-950 border-2 border-amber-500/40 p-6 sm:p-8 max-w-md w-full rounded-none space-y-6 shadow-2xl shadow-amber-950/20 relative z-50"
          >
            <div className="space-y-3">
              <h3 className="text-lg font-black uppercase tracking-tight text-amber-500">¿Suspender Permisos de Administrador?</h3>
              <p className="text-[11px] text-muted-foreground uppercase font-black tracking-widest leading-relaxed">
                Estás a punto de suspender y dejar en estado PENDIENTE la solicitud de administrador para <span className="text-foreground font-black">"{requestToSuspend.email}"</span>.
              </p>
              <p className="text-[10px] text-amber-400 uppercase font-black tracking-widest leading-relaxed">
                El usuario perderá sus privilegios activos de administrador hasta que vuelva a ser aprobado de nuevo.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={async () => {
                  setIsSuspendConfirmOpen(false);
                  const req = requestToSuspend;
                  setRequestToSuspend(null);
                  await handleUpdateUserRequestStatus(req, 'pending', true);
                }}
                className="flex-1 h-11 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-widest rounded-none shadow-md"
              >
                Sí, Suspender
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsSuspendConfirmOpen(false);
                  setRequestToSuspend(null);
                }}
                className="flex-1 h-11 border-border text-[10px] font-black uppercase tracking-widest hover:bg-white/5 rounded-none"
              >
                Cancelar
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Admin Login Wizard Overlay */}
    <AnimatePresence>
      {adminLoginState !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-zinc-950 border-2 border-primary/30 p-6 sm:p-8 max-w-xl w-full rounded-none space-y-6 shadow-2xl shadow-red-950/5 relative z-55"
          >
            <button
              onClick={async () => {
                setAdminLoginState(null);
                setPendingApprovalUser(null);
                if (auth.currentUser && !user) {
                  await signOut(auth);
                }
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground hover:scale-110 transition-transform"
            >
              <X className="w-5 h-5" />
            </button>

            {adminLoginState === 'ask' && (
              <div className="space-y-6">
                <div className="space-y-2 text-center">
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-primary">¿Eres Admin o Deseas ser Admin?</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Option A: Ya soy Admin */}
                  <div className="border border-border p-5 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors bg-white/5">
                    <div className="space-y-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <Check className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-black uppercase tracking-wide text-foreground">Ya soy Admin</h4>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Si ya posees acceso autorizado, inicia sesión directo para gestionar quinielas.
                      </p>
                    </div>
                    <Button
                      onClick={() => handleGoogleLogin('existing_admin')}
                      className="w-full h-11 bg-white hover:bg-white/90 text-black text-[10px] font-black uppercase tracking-widest rounded-none shadow-md"
                    >
                      Iniciar Sesión
                    </Button>
                  </div>

                  {/* Option B: Deseo ser Admin */}
                  <div className="border border-border p-5 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors bg-white/5">
                    <div className="space-y-2">
                      <div className="w-8 h-8 rounded-full bg-purple/10 border border-purple/20 flex items-center justify-center text-purple">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-black uppercase tracking-wide text-foreground">Deseo ser Admin</h4>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Si no tienes acceso, conéctate con tu Google email para registrar tu solicitud.
                      </p>
                    </div>
                    <Button
                      onClick={() => handleGoogleLogin('request_admin')}
                      className="w-full h-11 bg-purple hover:bg-purple/90 text-white text-[10px] font-black uppercase tracking-widest rounded-none shadow-md"
                    >
                      Solicitar Acceso
                    </Button>
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <button
                    onClick={() => setAdminLoginState(null)}
                    className="text-[10px] uppercase font-black tracking-widest text-muted-foreground hover:text-foreground underline underline-offset-4"
                  >
                    Volver al Ranking Principal
                  </button>
                </div>
              </div>
            )}

            {adminLoginState === 'authenticating' && (
              <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                <p className="text-[11px] uppercase font-black tracking-widest text-muted-foreground">Autenticando con Google...</p>
                <p className="text-[9px] uppercase font-bold text-muted-foreground/60 text-center max-w-xs">Espera un momento mientras validamos tus credenciales en el sistema.</p>
              </div>
            )}

            {adminLoginState === 'not_registered' && (
              <div className="space-y-5 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-500">
                  <Search className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black uppercase tracking-tight text-red-500">Acceso No Registrado</h3>
                  <p className="text-[11px] text-muted-foreground uppercase font-black tracking-widest leading-relaxed max-w-md mx-auto">
                    No encontramos una cuenta de administrador registrada bajo el correo: <span className="text-foreground text-xs font-mono font-normal tracking-normal lowercase">{pendingApprovalUser?.email}</span>
                  </p>
                </div>
                <div className="border border-border p-4 bg-white/5 space-y-3">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground leading-normal">
                    ¿Deseas enviar una solicitud de acceso al Súper Administrador con esta cuenta?
                  </p>
                  <Button
                    onClick={async () => {
                      if (pendingApprovalUser && pendingApprovalUser.email) {
                        try {
                          setAdminLoginState('authenticating');
                          await setDoc(doc(db, 'adminRequests', pendingApprovalUser.uid), {
                            uid: pendingApprovalUser.uid,
                            email: pendingApprovalUser.email.toLowerCase(),
                            displayName: pendingApprovalUser.displayName || 'Anónimo',
                            photoURL: pendingApprovalUser.photoURL || '',
                            status: 'pending',
                            notified: false,
                            createdAt: new Date().toISOString()
                          });
                          try {
                            await updateDoc(doc(db, 'users', pendingApprovalUser.uid), {
                              adminRequestStatus: 'pending',
                              adminRole: 'none',
                              isAdmin: false
                            });
                          } catch (e) {
                            // ignore if document doesn't exist yet
                          }
                          setJustRequestedInSession(true);
                          setUser(pendingApprovalUser);
                          setAdminLoginState(null);
                        } catch (e) {
                          console.error(e);
                          const errMsg = e instanceof Error ? e.message : String(e);
                          toast.error(`Error al enviar la solicitud: ${errMsg}`);
                          setAdminLoginState('ask');
                        }
                      }
                    }}
                    className="w-full h-11 bg-purple hover:bg-purple/90 text-white text-[10px] font-black uppercase tracking-widest rounded-none"
                  >
                    Sí, Enviar Solicitud de Acceso
                  </Button>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setAdminLoginState('ask');
                      setPendingApprovalUser(null);
                      await signOut(auth);
                    }}
                    className="h-10 text-[9px] font-black uppercase tracking-widest rounded-none border-border px-6"
                  >
                    Intentar con otra cuenta
                  </Button>
                </div>
              </div>
            )}

            {adminLoginState === 'pending_status' && (
              <div className="space-y-6 text-center py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 animate-pulse">
                  <FlaskConical className="w-6 h-6 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black uppercase tracking-tight text-yellow-500">Solicitud en Proceso</h3>
                  <p className="text-[11px] text-muted-foreground uppercase font-black tracking-widest leading-relaxed max-w-sm mx-auto">
                    Tu solicitud de acceso para el correo electrónico <span className="text-foreground text-xs font-mono font-normal tracking-normal lowercase">{auth.currentUser?.email}</span> está actualmente en revisión por el Súper Administrador.
                  </p>
                </div>
                <div className="bg-white/5 border border-border p-4 text-[10px] uppercase font-bold text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Recibirás acceso automáticamente en el sistema una vez que sea aprobada. ¡Vuelve a intentarlo pronto!
                </div>
                <Button
                  variant="outline"
                  onClick={async () => {
                    setAdminLoginState(null);
                    setPendingApprovalUser(null);
                    await signOut(auth);
                  }}
                  className="h-11 text-[10px] font-black uppercase tracking-widest rounded-none border-border px-8"
                >
                  Cerrar y Volver
                </Button>
              </div>
            )}

            {adminLoginState === 'pending_status_new' && (
              <div className="space-y-6 text-center py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 text-primary">
                  <Check className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black uppercase tracking-tight text-primary">¡Solicitud Enviada con éxito!</h3>
                  <p className="text-[11px] text-muted-foreground uppercase font-black tracking-widest leading-relaxed max-w-sm mx-auto">
                    Se ha enviado una solicitud de acceso al Súper Administrador para el correo electrónico <span className="text-foreground text-xs font-mono font-normal tracking-normal lowercase font-bold">{auth.currentUser?.email || pendingApprovalUser?.email}</span>.
                  </p>
                </div>
                <div className="bg-white/5 border border-border p-4 text-[10px] uppercase font-bold text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  El Súper Administrador revisará tus antecedentes para aprobar tus permisos de Administrador de Ligas.
                </div>
                <Button
                  onClick={async () => {
                    setAdminLoginState(null);
                    setPendingApprovalUser(null);
                    await signOut(auth);
                  }}
                  className="h-11 text-[10px] font-black uppercase tracking-widest rounded-none bg-primary text-primary-foreground hover:bg-primary/90 px-8"
                >
                  Entendido
                </Button>
              </div>
            )}

            {adminLoginState === 'rejected_status' && (
              <div className="space-y-6 text-center py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-500">
                  <UserMinus className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black uppercase tracking-tight text-red-500">Solicitud Denegada / Revocada</h3>
                  <p className="text-[11px] text-muted-foreground uppercase font-black tracking-widest leading-relaxed max-w-sm mx-auto">
                    Lamentablemente, la solicitud de acceso para <span className="text-foreground text-xs font-mono font-normal tracking-normal lowercase">{auth.currentUser?.email}</span> fue rechazada o revocada por el Súper Administrador.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={async () => {
                    setAdminLoginState(null);
                    setPendingApprovalUser(null);
                    await signOut(auth);
                  }}
                  className="h-11 text-[10px] font-black uppercase tracking-widest rounded-none border-border px-8"
                >
                  Volver al Ranking
                </Button>
              </div>
            )}

            {adminLoginState === 'approved_congrats' && (
              <div className="space-y-6 text-center py-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500 text-emerald-500 animate-bounce">
                  <Trophy className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-3 py-1 font-black uppercase tracking-widest border border-emerald-500/20">Solicitud Aprobada</span>
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white pt-2">¡Felicidades por tu Aprobación!</h3>
                  <p className="text-[11px] text-muted-foreground uppercase font-black tracking-widest leading-relaxed max-w-sm mx-auto">
                    Tu solicitud de acceso para ser Administrador ha sido formalmente aprobada por el Súper Administrador.
                  </p>
                </div>
                <div className="bg-emerald-950/20 border border-emerald-500/25 p-5 text-[11px] uppercase font-black tracking-wider text-emerald-400 max-w-sm mx-auto leading-relaxed">
                  ¡Bienvenido! Ahora tienes permitido ingresar, crear tus propias ligas de quiniela, agregar participantes y actualizar marcadores.
                </div>
                <Button
                  onClick={async () => {
                    const targetUser = pendingApprovalUser || auth.currentUser;
                    if (targetUser) {
                      try {
                        await updateDoc(doc(db, 'adminRequests', targetUser.uid), {
                          notified: true
                        });
                        
                        setUser(targetUser);
                        setAdminLoginState(null);
                        setPendingApprovalUser(null);
                        toast.success('¡Sesión iniciada correctamente como Admin!');
                      } catch (e) {
                        console.error(e);
                        setUser(targetUser);
                        setAdminLoginState(null);
                        setPendingApprovalUser(null);
                      }
                    }
                  }}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-widest rounded-none shadow-lg shadow-emerald-950/20"
                >
                  Ingresar al Panel de Administrador
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      {/* Footer */}
      <footer className="px-6 lg:px-16 py-12 border-t border-border flex flex-col sm:flex-row justify-center items-center gap-6">
        <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          © 2026 Quiniela Mundial
        </div>
      </footer>
    </div>
  );
}
