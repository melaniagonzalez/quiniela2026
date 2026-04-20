/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Calendar, Table as TableIcon, Share2, Save, RotateCcw, ChevronRight, ChevronLeft, Settings, FlaskConical, Users, Plus, UserPlus, UserMinus, Trash2, Home, Search, Check, Edit, Info, Newspaper, FileText, LayoutDashboard } from 'lucide-react';
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

export default function App() {
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [simulatedDate, setSimulatedDate] = useState('2026-06-11T00:00:00Z');
  const [clickCount, setClickCount] = useState(0);

  const [apiTeams, setApiTeams] = useState<Team[]>([]);
  const [apiMatches, setApiMatches] = useState<Match[]>([]);
  const [apiStandings, setApiStandings] = useState<any[]>([]);
  const [apiScorers, setApiScorers] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const currentMatches = useMemo(() => {
    // Both modes now use 2026 data, but simulation uses local constants with mocked results
    const baseMatches = isSimulationMode ? MATCHES : (apiMatches.length > 0 ? apiMatches : MATCHES);
    return [...baseMatches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [isSimulationMode, apiMatches]);

  const currentTeams = isSimulationMode ? TEAMS : (apiTeams.length > 0 ? apiTeams : TEAMS);

  const currentScorers = useMemo(() => {
    return isSimulationMode ? SCORERS_MOCK : apiScorers;
  }, [isSimulationMode, apiScorers]);

  const simulatedStandings = useMemo(() => {
    if (!isSimulationMode) return [];
    
    const groupsMap: Record<string, any[]> = {};
    MATCHES.forEach(m => {
      if (m.group && m.group.length === 1) { // Standard groups A-H in constants
        if (!groupsMap[m.group]) groupsMap[m.group] = [];
        groupsMap[m.group].push(m);
      }
    });

    return Object.entries(groupsMap).sort().map(([groupName, matches]) => {
      const stats: Record<string, any> = {};
      
      matches.forEach(m => {
        [m.homeTeamId, m.awayTeamId].forEach(id => {
          if (!stats[id]) {
            const team = TEAMS.find(t => t.id === id);
            stats[id] = { id, name: team?.name || id, crest: team?.flag || '🏳️', playedGames: 0, points: 0, goalDifference: 0 };
          }
        });

        if (new Date(m.date) < new Date(simulatedDate)) {
          const hs = m.actualHomeScore ?? 0;
          const as = m.actualAwayScore ?? 0;
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
      });

      return {
        group: `GROUP_${groupName}`,
        table: Object.values(stats).sort((a,b) => b.points - a.points || b.goalDifference - a.goalDifference)
      };
    });
  }, [isSimulationMode, simulatedDate]);

  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>(() => 
    currentMatches.map(m => ({ matchId: m.id, homeScore: null, awayScore: null }))
  );

  // Update predictions when switching modes or when API data arrives
  useEffect(() => {
    setPredictions(currentMatches.map(m => ({ matchId: m.id, homeScore: null, awayScore: null })));
    setNewsData(null);
  }, [isSimulationMode, apiMatches]);

  // Sync World Cup Data on Mount
  useEffect(() => {
    if (!isSimulationMode) {
      syncWorldCupData();
    }
  }, [isSimulationMode]);

  const syncWorldCupData = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/world-cup-sync');
      if (!response.ok) throw new Error('Sync failed');
      const data = await response.json();
      if (data.teams && data.matches) {
        setApiTeams(data.teams);
        setApiMatches(data.matches);
        setApiStandings(data.standings || []);
        setApiScorers(data.scorers || []);
        toast.success('Datos del Mundial 2026 sincronizados');
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
  const [activeTab, setActiveTab] = useState('quiniela');

  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const selectedLeague = useMemo(() => leagues.find(l => l.id === selectedLeagueId), [leagues, selectedLeagueId]);

  const [isCreatingLeague, setIsCreatingLeague] = useState(false);
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

  const handleCreateLeague = async () => {
    if (!user) return;
    if (!newLeagueName.trim()) {
      toast.error('El nombre de la liga es obligatorio');
      return;
    }

    const userLeagues = leagues.filter(l => l.creatorId === user.uid);
    if (userLeagues.length >= 3) {
      toast.error('Solo puedes crear hasta 3 ligas privadas');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'leagues'), {
        name: newLeagueName,
        creatorId: user.uid,
        creatorName: user.displayName || 'Usuario',
        memberUids: [user.uid],
        createdAt: new Date().toISOString(),
        isPrivate: true
      });
      setNewLeagueName('');
      setIsCreatingLeague(false);
      setSelectedLeagueId(docRef.id);
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

  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [foundUsers, setFoundUsers] = useState<any[]>([]);
  const [isRenaming, setIsRenaming] = useState(false);
  const [editLeagueName, setEditLeagueName] = useState('');

  const searchUsers = async (term: string) => {
    setUserSearchTerm(term);
    if (term.trim().length < 3) {
      setFoundUsers([]);
      return;
    }
    
    try {
      const q = query(
        collection(db, 'users'),
        where('displayName', '>=', term),
        where('displayName', '<=', term + '\uf8ff'),
        limit(5)
      );
      const snapshot = await getDocs(q);
      const results = snapshot.docs
        .map(doc => doc.data())
        .filter(u => !selectedLeague?.memberUids.includes(u.uid));
      setFoundUsers(results);
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };

  const updateLeagueName = async () => {
    if (!selectedLeagueId || !editLeagueName.trim()) return;
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

      const actualMatch = isSimulationMode 
        ? MATCHES.find(m => m.id === pred.matchId) 
        : apiMatches.find(m => m.id === pred.matchId);
      
      if (!actualMatch) return;

      const isFinished = isSimulationMode 
        ? new Date(actualMatch.date) < new Date(simulatedDate)
        : actualMatch.status === 'FINISHED';
      
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
      setUser(currentUser);
      if (currentUser) {
        // Ensure user profile exists in Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'Usuario Anónimo',
              photoURL: currentUser.photoURL || '',
              totalPoints: 0,
              correctResults: 0,
              correctWinners: 0
            });
          }
        } catch (error) {
          console.error("Error setting up user profile:", error);
          handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
        }
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Sync Predictions from Firestore
  useEffect(() => {
    if (!user || !isAuthReady) {
      // If not logged in, use local storage as fallback/guest mode
      const saved = localStorage.getItem('wc_predictions');
      setPredictions(saved ? JSON.parse(saved) : MATCHES.map(m => ({ matchId: m.id, homeScore: null, awayScore: null })));
      return;
    }

    const predictionsRef = collection(db, 'users', user.uid, 'predictions');
    const unsubscribe = onSnapshot(predictionsRef, (snapshot) => {
      const firestorePredictions = snapshot.docs.map(doc => doc.data() as Prediction);
      
      // Merge with all matches to ensure we have a full list
      const fullPredictions = currentMatches.map(m => {
        const found = firestorePredictions.find(p => p.matchId === m.id);
        return found || { matchId: m.id, homeScore: null, awayScore: null };
      });
      
      setPredictions(fullPredictions);
    }, (error) => {
      toast.error('Error al sincronizar predicciones');
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/predictions`);
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Sync Leaderboard
  useEffect(() => {
    if (activeTab === 'leaderboard' && user) {
      const usersRef = collection(db, 'users');
      // If a quiniela is selected, we want to filter, but Firestore "in" is limited.
      // We'll fetch the top 100 and filter client-side for simplicity in this demo.
      // For a production app, we might need a different data structure or Cloud Functions.
      const q = query(usersRef, limit(100));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data());
        
        let filteredData = data;
        if (selectedLeagueId && selectedLeague) {
          filteredData = data.filter((u: any) => selectedLeague.memberUids.includes(u.uid));
        }

        const sortedData = filteredData.sort((a: any, b: any) => (b.totalPoints || 0) - (a.totalPoints || 0));
        setLeaderboard(sortedData);
      }, (error) => {
        console.error("Leaderboard error:", error);
        toast.error('Error al cargar el ranking');
        handleFirestoreError(error, OperationType.LIST, 'users');
      });
      
      return () => unsubscribe();
    }
  }, [activeTab, selectedLeagueId, leagues, user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('¡Bienvenido a la Quiniela!');
    } catch (error) {
      console.error(error);
      toast.error('Error al iniciar sesión');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Sesión cerrada');
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (activeTab === 'quiniela' && !user) {
      localStorage.setItem('wc_predictions', JSON.stringify(predictions));
    }
  }, [predictions, user, activeTab]);

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
      const response = await fetch('/api/world-cup-results');
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
        const batch = writeBatch(db);
        predictions.forEach(p => {
          const predictionRef = doc(db, 'users', user.uid, 'predictions', p.matchId);
          batch.set(predictionRef, {
            ...p,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        });

        const { totalPoints, correctResults, correctWinners } = calculateUserPoints(predictions);
        const userRef = doc(db, 'users', user.uid);
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

  const currentMatchday = useMemo(() => {
    const unfinished = currentMatches.find(m => {
      const isFinished = isSimulationMode && new Date(m.date) < new Date(simulatedDate);
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
        
        <div className="flex items-center gap-3 sm:gap-6">
          <button 
            onClick={() => {
              setClickCount(prev => prev + 1);
              if (clickCount + 1 >= 5) {
                setIsSimulationMode(!isSimulationMode);
                setClickCount(0);
                toast.info(isSimulationMode ? 'Modo 2026 Activado' : 'Modo Simulación 2022 Activado');
              }
            }}
            className="hidden sm:block bg-lime text-black px-3 py-1 text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-transform shrink-0"
          >
            {isSimulationMode ? 'Simulador 22' : 'United 2026'}
          </button>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-4">
                {selectedLeagueId && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedLeagueId(null)}
                    className="hidden md:flex text-[9px] font-black uppercase tracking-widest gap-2 opacity-60 hover:opacity-100"
                  >
                    <Home className="w-3 h-3" /> Mis Quinielas
                  </Button>
                )}
                <div className="flex flex-col items-end">
                  <span className="text-[11px] sm:text-[12px] font-black uppercase tracking-widest max-w-[140px] sm:max-w-none truncate">{user.displayName}</span>
                  <button onClick={handleLogout} className="text-[12px] text-muted-foreground hover:text-primary uppercase font-bold tracking-widest">Salir</button>
                </div>
                {user.photoURL && <img src={user.photoURL} alt="Profile" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-primary/30" referrerPolicy="no-referrer" />}
              </div>
            ) : (
              <Button size="sm" onClick={handleLogin} className="bg-white text-black hover:bg-white/90 uppercase text-[9px] sm:text-[10px] font-black tracking-widest px-3 sm:px-6 h-8 sm:h-10">
                Entrar
              </Button>
            )}
          </div>
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
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Saltar a Jornada</label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(day => (
                      <Button
                        key={day}
                        size="sm"
                        variant={currentMatchday === day ? "default" : "outline"}
                        onClick={() => {
                          const dates: Record<number, string> = {
                            1: '2026-06-11T12:00:00Z', // Grupos J1
                            2: '2026-06-23T12:00:00Z', // Grupos J2
                            3: '2026-07-05T12:00:00Z', // Grupos J3
                            4: '2026-07-15T12:00:00Z', // Round of 32
                            5: '2026-07-21T12:00:00Z', // Round of 16
                            6: '2026-07-25T12:00:00Z', // Quarter Final
                            7: '2026-07-28T12:00:00Z', // Semi Final
                            8: '2026-08-02T12:00:00Z'  // Final
                          };
                          setSimulatedDate(dates[day]);
                        }}
                        className="text-[10px] font-black h-8 flex-1 min-w-[32px] px-1"
                      >
                        J{day}
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

        {!user ? (
           <div className="py-20 text-center space-y-8">
              <div className="inline-flex p-4 bg-primary/10 border border-primary/30 rounded-full mb-4">
                <Trophy className="w-12 h-12 text-primary" />
              </div>
              <div className="max-w-md mx-auto space-y-4">
                <h2 className="text-3xl font-black uppercase tracking-tight">Bienvenido a la Quiniela</h2>
                <p className="text-muted-foreground uppercase text-[11px] font-bold tracking-widest leading-relaxed">
                  Crea tus grupos, invita a tus amigos y compite por ser el mejor pronosticador del Mundial United 2026.
                </p>
                <Button onClick={handleLogin} className="w-full h-14 text-sm font-black uppercase tracking-[0.2em] mt-8 shadow-[0_0_20px_rgba(237,28,36,0.3)]">
                  Iniciar Sesión con Google
                </Button>
              </div>
           </div>
        ) : !selectedLeagueId ? (
          <div className="space-y-12 max-w-5xl mx-auto py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-border">
              <div className="space-y-2">
                <h2 className="text-[24px] font-black uppercase tracking-tight text-primary">Mis Quinielas</h2>
                <p className="text-[11px] text-muted-foreground uppercase font-black tracking-widest">Selecciona una quiniela para ver tus resultados y ranking</p>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => {
                    const id = prompt('Ingresa el ID de la quiniela:');
                    if (id) joinLeagueById(id);
                  }}
                  className="h-12 text-[10px] font-black uppercase tracking-widest px-8 bg-sky-600 hover:bg-sky-700 text-white border-none transition-all"
                >
                  Unirse con ID
                </Button>
                <div className="relative group">
                   <Button 
                    onClick={() => setIsCreatingLeague(true)} 
                    className="h-12 text-[10px] font-black uppercase tracking-widest px-8 shadow-lg shadow-primary/20"
                    disabled={leagues.filter(l => l.creatorId === user?.uid).length >= 3}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Crear Nueva
                  </Button>
                  {leagues.filter(l => l.creatorId === user?.uid).length >= 3 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-purple text-white text-[9px] font-black uppercase px-2 py-1 whitespace-nowrap hidden group-hover:block z-10">
                      Límite de 3 quinielas alcanzado
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
                  <h3 className="text-2xl font-black uppercase tracking-tight">Personaliza tu Quiniela</h3>
                  <Input 
                    placeholder="NOMBRE DE TU QUINIELA (EJ: MUNDIALISTAS 2026)" 
                    value={newLeagueName}
                    onChange={(e) => setNewLeagueName(e.target.value)}
                    className="h-16 text-[18px] font-black uppercase tracking-tight bg-background border-2 border-border focus:border-primary transition-all rounded-none"
                  />
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
                      <CardDescription className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 pt-2">
                        {league.memberUids.length} Participantes
                      </CardDescription>
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
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-border pt-[5px] pb-4">
              <div className="flex items-center gap-4">
                 <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedLeagueId(null)}
                  className="h-10 w-10 p-0 hover:bg-primary/5 text-muted-foreground hover:text-primary"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <div className="flex flex-col">
                  <h2 className="text-[14px] sm:text-[18px] font-black uppercase tracking-tight">{selectedLeague?.name}</h2>
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Cambiar de Quiniela</span>
                </div>
              </div>

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
            </div>

            {activeTab !== 'settings' && (
              <div className="grid grid-cols-4 sm:flex border-b border-border">
                <button
                  onClick={() => setActiveTab('quiniela')}
                  className={cn(
                    "px-2 sm:px-8 py-3 sm:py-4 text-[10px] sm:text-[12px] font-black uppercase tracking-wider sm:tracking-[0.2em] transition-all border-b-2 flex flex-col sm:flex-row items-center gap-1 sm:gap-2",
                    activeTab === 'quiniela' 
                      ? "border-primary text-primary" 
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="text-[8px] sm:text-[12px] text-center"> Quiniela</span>
                </button>
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

            {activeTab === 'quiniela' ? (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-16">
            {/* Left Column: Matches */}
            <div className="space-y-6">
              {!user && (
                <div className="bg-primary/10 border border-primary/30 p-4 mb-6">
                  <p className="text-[11px] font-black uppercase tracking-widest text-primary text-center">
                    Inicia sesión para guardar tus predicciones en la nube y participar en el ranking global.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-12">
                {matchdays.filter(day => day === viewingMatchday).map(day => (
                  <div key={day} className="space-y-6 mt-[5px] mb-[14px]">
                    <div className="flex items-center gap-4 pt-[5px]">
                      <div className="h-[1px] flex-1 bg-border" />
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={viewingMatchday <= 1}
                            onClick={() => setViewingMatchday(prev => Math.max(1, prev - 1))}
                            className="h-10 w-10 p-0 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-20"
                          >
                            <ChevronLeft className="h-6 w-6" />
                          </Button>
                          
                          <span className="text-[10px] sm:text-[12px] font-black text-primary uppercase tracking-[0.2em] px-10 py-2 border border-primary/30 bg-primary/5 min-w-[205px] sm:min-w-[230px] text-center block relative overflow-hidden">
                            Jornada {day}
                            {day === currentMatchday && (
                              <span className="absolute top-0 left-0 h-full flex items-center pl-4">
                                <span className="text-[8px] font-black tracking-widest text-[#FFD700] animate-pulse">ACTUAL</span>
                              </span>
                            )}
                          </span>

                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={viewingMatchday >= matchdays.length}
                            onClick={() => setViewingMatchday(prev => Math.min(matchdays.length, prev + 1))}
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
                        {day === currentMatchday && (
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                            Cierre de predicciones: <span className="text-primary font-black text-[11px] ml-1">14H 22M</span>
                          </span>
                        )}
                      </div>
                      <Button 
                        onClick={handleSavePredictions}
                        disabled={!hasUnsavedChanges || isSyncing}
                        className="bg-sky-600 hover:bg-sky-700 text-white uppercase text-[10px] font-black tracking-widest px-4 h-9 w-fit shadow-[0_0_20px_rgba(2,132,199,0.2)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        {isSyncing ? 'Guardando...' : 'Guardar'}
                      </Button>
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
                              {groupName && groupName.length === 1 ? `Grupo ${groupName}` : groupName}
                            </h4>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            <AnimatePresence mode="popLayout">
                              {currentMatches.filter(m => m.matchday === day && m.group === groupName).map((match, idx) => {
                                const homeTeam = currentTeams.find(t => t.id === match.homeTeamId);
                                const awayTeam = currentTeams.find(t => t.id === match.awayTeamId);
                                
                                if (!homeTeam || !awayTeam) return null;

                                // Logic to hide teams in knockout stages until they are "known"
                                const isTBD = match.matchday >= 4 && (
                                  !isSimulationMode || 
                                  (match.matchday === 4 && new Date(simulatedDate) < new Date('2026-07-12T00:00:00Z')) ||
                                  (match.matchday === 5 && new Date(simulatedDate) < new Date('2026-07-15T00:00:00Z')) ||
                                  (match.matchday === 6 && new Date(simulatedDate) < new Date('2026-07-19T00:00:00Z')) ||
                                  (match.matchday === 7 && new Date(simulatedDate) < new Date('2026-07-22T00:00:00Z')) ||
                                  (match.matchday === 8 && new Date(simulatedDate) < new Date('2026-07-24T00:00:00Z'))
                                );

                                const displayHome = isTBD ? { name: 'Por definir', flag: '🏳️' } : homeTeam;
                                const displayAway = isTBD ? { name: 'Por definir', flag: '🏳️' } : awayTeam;

                                const prediction = predictions.find(p => p.matchId === match.id) || { matchId: match.id, homeScore: null, awayScore: null };

                                const isFinished = isSimulationMode && new Date(match.date) < new Date(simulatedDate);
                                const actualMatch = isSimulationMode ? (MATCHES.find(m => m.id === match.id)) : null;

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
                                          {new Date(match.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        {isFinished && (
                                          <div className="bg-primary/20 text-primary text-[8px] font-black px-2 py-0.5 uppercase tracking-widest">
                                            Finalizado
                                          </div>
                                        )}
                                      </div>

                                      {/* Home Team */}
                                      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                                        {displayHome.flag.startsWith('http') ? (
                                          <img src={displayHome.flag} alt="" className="w-5 h-5 sm:w-8 sm:h-8 object-contain shrink-0" referrerPolicy="no-referrer" />
                                        ) : (
                                          <span className={cn("text-xl sm:text-3xl transition-all shrink-0", isTBD && "opacity-20")}>{displayHome.flag}</span>
                                        )}
                                        <span className={cn("text-[11px] sm:text-lg font-black uppercase tracking-tight truncate", isTBD && "text-muted-foreground/50")}>{displayHome.name}</span>
                                      </div>

                                      {/* Score Inputs / Result */}
                                      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
                                        {isFinished ? (
                                          <div className="flex items-center gap-2 sm:gap-4">
                                            <span className="text-xl sm:text-2xl font-black">{actualMatch?.actualHomeScore}</span>
                                            <span className="text-muted-foreground font-bold text-[10px] sm:text-xs">X</span>
                                            <span className="text-xl sm:text-2xl font-black">{actualMatch?.actualAwayScore}</span>
                                          </div>
                                        ) : (
                                          <>
                                            <Input
                                              type="number"
                                              disabled={isTBD}
                                              className="w-8 h-8 sm:w-12 sm:h-12 bg-background border-border text-center text-sm sm:text-xl font-black focus-visible:ring-primary focus-visible:border-primary p-0 disabled:opacity-20"
                                              value={prediction.homeScore ?? ''}
                                              onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                                              placeholder="-"
                                            />
                                            <span className="text-muted-foreground font-bold text-[10px] sm:text-xs">X</span>
                                            <Input
                                              type="number"
                                              disabled={isTBD}
                                              className="w-8 h-8 sm:w-12 sm:h-12 bg-background border-border text-center text-sm sm:text-xl font-black focus-visible:ring-primary focus-visible:border-primary p-0 disabled:opacity-20"
                                              value={prediction.awayScore ?? ''}
                                              onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                                              placeholder="-"
                                            />
                                          </>
                                        )}
                                      </div>

                                      {/* Away Team */}
                                      <div className="flex items-center justify-end gap-2 sm:gap-4 text-right min-w-0">
                                        <span className={cn("text-[11px] sm:text-lg font-black uppercase tracking-tight truncate", isTBD && "text-muted-foreground/50")}>{displayAway.name}</span>
                                        {displayAway.flag.startsWith('http') ? (
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

              <div className="pt-6 flex justify-end">
                <Button 
                  onClick={handleSavePredictions}
                  disabled={!hasUnsavedChanges || isSyncing}
                  className="bg-sky-600 hover:bg-sky-700 text-white uppercase text-[10px] font-black tracking-widest px-4 h-9 w-fit shadow-[0_0_20px_rgba(2,132,199,0.2)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  {isSyncing ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </div>

            {/* Right Column: Standings */}
            <div className="space-y-8 bg-sky-950/20 border border-sky-500/10 p-6 rounded-xl">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  <h2 className="text-[12px] font-bold text-sky-400 uppercase tracking-[0.3em]">
                    Tu Tabla Proyectada
                  </h2>
                </div>
                <p className="text-[9px] text-muted-foreground uppercase leading-tight font-bold">
                  * Esta tabla se calcula automáticamente según tus marcadores.
                </p>
              </div>

              <div className="space-y-12">
                {allGroupStandings.map(({ group, standings }) => (
                  <div key={group} className="space-y-4">
                    <span className="text-[10px] font-black text-sky-400/70 uppercase tracking-widest border-l-2 border-sky-500/50 pl-3 block">
                      Posiciones Grupo {group}
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
          </div>
        ) : activeTab === 'leaderboard' ? (
          <div className="space-y-12">
            <div className="max-w-4xl mx-auto bg-card border border-border">
              <div className="p-8 border-b border-border bg-primary/5 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="space-y-1 text-center md:text-left">
                  <h2 className="text-[14px] font-black uppercase tracking-widest text-primary">Ranking de Mi Quiniela</h2>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight">Participantes de {selectedLeague?.name}</p>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-[18px] font-black text-lime">{leaderboard.length}</p>
                    <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-tight">Usuarios</p>
                  </div>
                  <div className="w-[1px] h-8 bg-border" />
                  <div className="text-center">
                    <p className="text-[18px] font-black text-lime">{leaderboard.find(u => u.uid === user?.uid)?.totalPoints || 0}</p>
                    <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-tight">Mis Puntos</p>
                  </div>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="w-[60px] text-center text-[10px] font-black uppercase py-6">Pos</TableHead>
                    <TableHead className="text-[10px] font-black uppercase py-6">Usuario</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase py-6">Puntos</TableHead>
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
                        className={cn(
                          "group hover:bg-white/5 border-b border-white/5 transition-colors",
                          entry.uid === user?.uid && "bg-primary/5"
                        )}
                      >
                        <TableCell className="py-6 text-center">
                          <span className={cn(
                            "text-[12px] font-black",
                            index === 0 ? "text-lime" : index === 1 ? "text-gray-300" : index === 2 ? "text-amber-600" : ""
                          )}>
                            {(index + 1).toString().padStart(2, '0')}
                          </span>
                        </TableCell>
                        <TableCell className="py-6">
                          <div className="flex items-center gap-3">
                            <img src={entry.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.uid}`} className="w-8 h-8 rounded-full border border-border" referrerPolicy="no-referrer" />
                            <div className="flex flex-col">
                              <span className="text-[12px] font-black uppercase truncate max-w-[200px]">
                                {entry.displayName || 'Anonimo'}
                              </span>
                              {entry.uid === user?.uid && <span className="text-[8px] font-black text-primary uppercase tracking-widest">Tú</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-6 text-right">
                          <span className="text-[16px] font-black text-lime">
                            {entry.totalPoints || 0} <span className="text-[10px] text-muted-foreground ml-1">PTS</span>
                          </span>
                        </TableCell>
                      </motion.tr>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="py-20 text-center">
                        <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                          Aún no hay usuarios en esta quiniela.
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : activeTab === 'noticias' ? (
      <div className="space-y-12">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-12">
          {/* Content from the original 'resultados' sub-tab: Matches and Scorers */}
          <div className="space-y-8">
            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-border pt-[5px] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[9px]! font-black uppercase tracking-tight leading-none block">{isSimulationMode ? `Resultados Simulados` : 'Últimos Resultados Sincronizados'}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={syncWorldCupData} 
                  disabled={isSyncing}
                  className="text-[9px] font-black uppercase tracking-widest border-border h-8 px-4"
                >
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar Datos'}
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  const displayResults = isSimulationMode 
                    ? MATCHES.filter(m => new Date(m.date) < new Date(simulatedDate))
                    : apiMatches.filter(m => m.status === 'FINISHED' || m.status === 'LIVE' || m.status === 'IN_PLAY');
                  
                  if (displayResults.length > 0) {
                    return displayResults
                      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 8)
                      .map(match => {
                        const homeTeam = TEAMS.find(t => t.id === match.homeTeamId);
                        const awayTeam = TEAMS.find(t => t.id === match.awayTeamId);
                        return (
                          <div key={match.id} className="bg-card border border-border p-5 flex flex-col gap-4 hover:border-primary/40 transition-colors">
                            <div className="flex justify-between items-center text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                              <span>{new Date(match.date).toLocaleDateString()}</span>
                              <span className={(!isSimulationMode && (match.status === 'LIVE' || match.status === 'IN_PLAY')) ? "text-lime animate-pulse" : "text-muted-foreground"}>
                                {isSimulationMode ? "FINALIZADO (SIM)" : match.status}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                {isSimulationMode ? <span className="text-xl">{homeTeam?.flag}</span> : ((match as any).homeTeamLogo ? <img src={(match as any).homeTeamLogo} className="w-6 h-6 object-contain" referrerPolicy="no-referrer" /> : <span className="w-6 text-center">🏳️</span>)}
                                <span className="text-[11px] font-black uppercase truncate">{isSimulationMode ? homeTeam?.name : (match as any).homeTeamName}</span>
                              </div>
                              <div className="bg-white/5 px-3 py-1 border border-border min-w-[60px] text-center">
                                <span className="text-[14px] font-black tracking-tight">{match.actualHomeScore ?? '-'} : {match.actualAwayScore ?? '-'}</span>
                              </div>
                              <div className="flex items-center gap-3 flex-1 justify-end text-right overflow-hidden">
                                <span className="text-[11px] font-black uppercase truncate">{isSimulationMode ? awayTeam?.name : (match as any).awayTeamName}</span>
                                {isSimulationMode ? <span className="text-xl">{awayTeam?.flag}</span> : ((match as any).awayTeamLogo ? <img src={(match as any).awayTeamLogo} className="w-6 h-6 object-contain" referrerPolicy="no-referrer" /> : <span className="w-6 text-center">🏳️</span>)}
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
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(() => {
                    const displayUpcoming = isSimulationMode
                      ? MATCHES.filter(m => new Date(m.date) >= new Date(simulatedDate))
                      : apiMatches.filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED');
                    
                    if (displayUpcoming.length > 0) {
                      return displayUpcoming
                        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .slice(0, 6)
                        .map(match => {
                          const homeTeam = TEAMS.find(t => t.id === match.homeTeamId);
                          const awayTeam = TEAMS.find(t => t.id === match.awayTeamId);
                          return (
                            <div key={match.id} className="bg-card border border-border p-5 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                {isSimulationMode ? <span className="text-lg">{homeTeam?.flag}</span> : ((match as any).homeTeamLogo ? <img src={(match as any).homeTeamLogo} className="w-6 h-6 object-contain" referrerPolicy="no-referrer" /> : <span className="w-6 text-center">🏳️</span>)}
                                <span className="text-[10px] font-black uppercase truncate">{isSimulationMode ? homeTeam?.name : (match as any).homeTeamName}</span>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black text-primary uppercase">VS</span>
                                <span className="text-[8px] text-muted-foreground whitespace-nowrap">{new Date(match.date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-3 flex-1 justify-end text-right overflow-hidden">
                                <span className="text-[10px] font-black uppercase truncate">{isSimulationMode ? awayTeam?.name : (match as any).awayTeamName}</span>
                                {isSimulationMode ? <span className="text-lg">{awayTeam?.flag}</span> : ((match as any).awayTeamLogo ? <img src={(match as any).awayTeamLogo} className="w-6 h-6 object-contain" referrerPolicy="no-referrer" /> : <span className="w-6 text-center">🏳️</span>)}
                              </div>
                            </div>
                          );
                        });
                    }
                    return null;
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
          <div className="max-w-4xl mx-auto space-y-12 pb-20">
            {/* Header section (Renaming - Only for Creator) */}
            {selectedLeague?.creatorId === user?.uid && (
              <div className="bg-card border border-border p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <Edit className="w-5 h-5 text-primary" />
                  <h2 className="text-[14px] font-black uppercase tracking-widest text-primary">Gestionar Quiniela</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nombre de la Quiniela</label>
                    <Input 
                      value={editLeagueName}
                      onChange={(e) => setEditLeagueName(e.target.value)}
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

            {/* Invitations section (Only for Creator) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {selectedLeague?.creatorId === user?.uid && (
                <div className="bg-card border border-border p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    <UserPlus className="w-5 h-5 text-sky-400" />
                    <h3 className="text-[12px] font-black uppercase tracking-widest text-primary">Invitar Usuarios</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="BUSCAR POR NOMBRE..." 
                        className="pl-10 h-11 text-[11px] font-black uppercase tracking-widest"
                        value={userSearchTerm}
                        onChange={(e) => searchUsers(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {foundUsers.length > 0 ? (
                        foundUsers.map(u => (
                          <div key={u.uid} className="flex items-center justify-between p-3 bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors">
                            <div className="flex items-center gap-3">
                              <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                              <span className="text-[11px] font-black uppercase truncate max-w-[120px]">{u.displayName}</span>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => inviteUser(u.uid)}
                              className="h-8 w-8 p-0 text-sky-400 hover:bg-sky-400 hover:text-white"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        ))
                      ) : userSearchTerm.length >= 3 ? (
                        <p className="text-[10px] text-muted-foreground uppercase text-center py-4">No se encontraron usuarios</p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground uppercase text-center py-10 opacity-50 italic">Busca amigos para invitarlos a tu quiniela</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className={cn("bg-card border border-border p-8 space-y-6", selectedLeague?.creatorId !== user?.uid && "col-span-full")}>
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
            </div>

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
      <div className="space-y-12">
        <div className="space-y-20">
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[9px]! font-black uppercase tracking-tight leading-none block">
                  {isSimulationMode ? "Tablas de Clasificación (Simuladas)" : "Tablas de Clasificación Oficiales"}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {(isSimulationMode ? simulatedStandings : apiStandings.filter(s => s.type === 'TOTAL')).map((standing: any) => (
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
                        {standing.table.map((row: any) => (
                          <TableRow key={isSimulationMode ? row.id : row.team.id} className="hover:bg-white/5 border-b border-white/5">
                            <TableCell className="py-2">
                              <div className="flex items-center gap-2">
                                {isSimulationMode ? (
                                  <span className="text-lg">{row.crest}</span>
                                ) : (
                                  <img src={row.team.crest} className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
                                )}
                                <span className="text-[10px] font-bold uppercase truncate">
                                  {isSimulationMode ? row.name : (row.team.shortName || row.team.name)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-mono text-[10px]">{row.playedGames}</TableCell>
                            <TableCell className="text-right font-black text-lime text-[11px]">{row.points}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
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
                          ? MATCHES.filter(m => m.matchday === 4)
                          : apiMatches.filter(m => m.stage === 'LAST_32');
                        
                        if (knockoutMatches.length > 0) {
                          return knockoutMatches.slice(0, 16).map(m => {
                            const home = TEAMS.find(t => t.id === m.homeTeamId);
                            const away = TEAMS.find(t => t.id === m.awayTeamId);
                            const isFinished = isSimulationMode ? new Date(m.date) < new Date(simulatedDate) : m.status === 'FINISHED';
                            return (
                              <div key={m.id} className="bg-card border border-border p-2 text-[9px] font-black uppercase tracking-tighter hover:border-primary/50 transition-all">
                                <div className="flex justify-between border-b border-white/5 pb-1 mb-1">
                                  <div className="flex items-center gap-1.5 overflow-hidden">
                                    <span className="text-[10px] grayscale-0">{home?.flag}</span>
                                    <span className="truncate">{isSimulationMode ? home?.name : (m as any).homeTeamName}</span>
                                  </div>
                                  <span>{isFinished ? m.actualHomeScore : '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <div className="flex items-center gap-1.5 overflow-hidden">
                                    <span className="text-[10px] grayscale-0">{away?.flag}</span>
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
                          ? MATCHES.filter(m => m.matchday === 5)
                          : apiMatches.filter(m => m.stage === 'LAST_16');
                        
                        if (knockoutMatches.length > 0) {
                          return knockoutMatches.slice(0, 8).map(m => {
                            const home = TEAMS.find(t => t.id === m.homeTeamId);
                            const away = TEAMS.find(t => t.id === m.awayTeamId);
                            const isFinished = isSimulationMode ? new Date(m.date) < new Date(simulatedDate) : m.status === 'FINISHED';
                            return (
                              <div key={m.id} className="bg-card border border-primary/20 p-3 text-[10px] font-black uppercase tracking-tighter shadow-[0_0_15px_rgba(237,28,36,0.05)]">
                                <div className="flex justify-between border-b border-white/5 pb-1 mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs">{home?.flag}</span>
                                    <span>{isSimulationMode ? home?.name : (m as any).homeTeamName}</span>
                                  </div>
                                  <span className="text-primary">{isFinished ? m.actualHomeScore : '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs">{away?.flag}</span>
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
                          ? MATCHES.filter(m => m.matchday === 6)
                          : apiMatches.filter(m => m.stage === 'QUARTER_FINALS');
                        
                        if (knockoutMatches.length > 0) {
                          return knockoutMatches.slice(0, 4).map(m => {
                            const home = TEAMS.find(t => t.id === m.homeTeamId);
                            const away = TEAMS.find(t => t.id === m.awayTeamId);
                            const isFinished = isSimulationMode ? new Date(m.date) < new Date(simulatedDate) : m.status === 'FINISHED';
                            return (
                              <div key={m.id} className="bg-primary/5 border border-primary/30 p-4 text-[11px] font-black uppercase tracking-tighter">
                                <div className="flex justify-between border-b border-primary/10 pb-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base">{home?.flag}</span>
                                    <span>{isSimulationMode ? home?.name : (m as any).homeTeamName}</span>
                                  </div>
                                  <span>{isFinished ? m.actualHomeScore : '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base">{away?.flag}</span>
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
                          ? MATCHES.filter(m => m.matchday === 7)
                          : apiMatches.filter(m => m.stage === 'SEMI_FINALS');
                        
                        if (knockoutMatches.length > 0) {
                          return knockoutMatches.slice(0, 2).map(m => {
                            const home = TEAMS.find(t => t.id === m.homeTeamId);
                            const away = TEAMS.find(t => t.id === m.awayTeamId);
                            const isFinished = isSimulationMode ? new Date(m.date) < new Date(simulatedDate) : m.status === 'FINISHED';
                            return (
                              <div key={m.id} className="bg-primary/10 border-2 border-primary/40 p-5 text-[12px] font-black uppercase tracking-tighter">
                                <div className="flex justify-between border-b border-primary/20 pb-2 mb-2">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xl">{home?.flag}</span>
                                    <span>{isSimulationMode ? home?.name : (m as any).homeTeamName}</span>
                                  </div>
                                  <span className="text-lime">{isFinished ? m.actualHomeScore : '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xl">{away?.flag}</span>
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
                          ? MATCHES.filter(m => m.matchday === 8)
                          : apiMatches.filter(m => m.stage === 'FINAL');
                        
                        return finalMatches.map(m => {
                          const home = TEAMS.find(t => t.id === m.homeTeamId);
                          const away = TEAMS.find(t => t.id === m.awayTeamId);
                          const isFinished = isSimulationMode ? new Date(m.date) < new Date(simulatedDate) : m.status === 'FINISHED';
                          return (
                            <div key={m.id} className="w-full bg-gradient-to-br from-primary/20 to-purple/20 border-2 border-primary p-6 rounded-none text-[14px] font-black uppercase text-center">
                              <div className="flex flex-col items-center gap-2 mb-2">
                                <span className="text-4xl mb-1">{home?.flag}</span>
                                <span>{isSimulationMode ? home?.name : (m as any).homeTeamName}</span>
                              </div>
                              <div className="text-4xl text-primary my-4">
                                {isFinished ? (m.actualHomeScore ?? '-') : '-'} : {isFinished ? (m.actualAwayScore ?? '-') : '-'}
                              </div>
                              <div className="flex flex-col items-center gap-2">
                                <span className="text-4xl mb-1">{away?.flag}</span>
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


      {/* Footer */}
      <footer className="px-6 lg:px-16 py-12 border-t border-border flex flex-col sm:flex-row justify-center items-center gap-6">
        <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          © 2026 Quiniela Mundial
        </div>
      </footer>
    </div>
  );
}
