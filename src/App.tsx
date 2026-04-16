/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Calendar, Table as TableIcon, Share2, Save, RotateCcw, ChevronRight, ChevronLeft, Settings, FlaskConical } from 'lucide-react';
import { TEAMS, MATCHES } from './constants';
import { TEAMS_2022, MATCHES_2022 } from './simulationData';
import { Prediction, GroupStanding, Match, Team } from './types';
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
import { doc, setDoc, getDoc, collection, onSnapshot, query, orderBy, limit, writeBatch } from 'firebase/firestore';

export default function App() {
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [simulatedDate, setSimulatedDate] = useState('2022-11-23T00:00:00Z');
  const [clickCount, setClickCount] = useState(0);

  const currentMatches = useMemo(() => {
    const baseMatches = isSimulationMode ? MATCHES_2022 : MATCHES;
    return [...baseMatches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [isSimulationMode]);

  const currentTeams = isSimulationMode ? TEAMS_2022 : TEAMS;

  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>(() => 
    currentMatches.map(m => ({ matchId: m.id, homeScore: null, awayScore: null }))
  );

  // Update predictions when switching modes
  useEffect(() => {
    setPredictions(currentMatches.map(m => ({ matchId: m.id, homeScore: null, awayScore: null })));
    setNewsData(null);
  }, [isSimulationMode]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [newsData, setNewsData] = useState<any>(null);
  const [loadingNews, setLoadingNews] = useState(false);
  const [activeTab, setActiveTab] = useState('quiniela');

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
    if (activeTab === 'leaderboard') {
      const usersRef = collection(db, 'users');
      // Remove orderBy to avoid potential index/permission issues during debug
      const q = query(usersRef, limit(100));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data());
        // Sort client-side
        const sortedData = data.sort((a: any, b: any) => (b.totalPoints || 0) - (a.totalPoints || 0));
        setLeaderboard(sortedData);
      }, (error) => {
        console.error("Leaderboard error:", error);
        toast.error('Error al cargar el ranking');
        handleFirestoreError(error, OperationType.LIST, 'users');
      });
      
      return () => unsubscribe();
    }
  }, [activeTab]);

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
      const response = await fetch('/api/world-cup-data');
      if (!response.ok) throw new Error('Error al cargar noticias');
      const data = await response.json();
      setNewsData(data);
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar las noticias. Verifica tu API Key.');
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

    // If logged in, sync to Firestore
    if (user) {
      const predictionRef = doc(db, 'users', user.uid, 'predictions', matchId);
      try {
        const currentPred = newPredictions.find(p => p.matchId === matchId)!;
        // We allow partial saves (only one score) now that rules are relaxed
        await setDoc(predictionRef, {
          ...currentPred,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error("Score change error:", error);
        toast.error('Error al guardar predicción');
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/predictions/${matchId}`);
      }
    }
  };

  const resetPredictions = async () => {
    if (confirm('¿Estás seguro de que quieres reiniciar todas tus predicciones?')) {
      const empty = MATCHES.map(m => ({ matchId: m.id, homeScore: null, awayScore: null }));
      setPredictions(empty);
      
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

  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

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
      <header className="px-6 lg:px-16 pt-10 pb-6 border-b border-border flex flex-col md:flex-row justify-between items-end gap-6 bg-gradient-to-br from-purple/10 via-background to-primary/10">
        <div className="flex flex-col">
          <h1 className="text-[60px] lg:text-[80px] font-black leading-[0.8] tracking-[-0.05em] uppercase">
            <span className="text-purple">Quiniela</span><br />
            <span className="text-primary drop-shadow-[0_0_15px_rgba(237,28,36,0.3)]">Mundial</span>
          </h1>
        </div>
        
        <div className="flex flex-col items-end text-right">
          <button 
            onClick={() => {
              setClickCount(prev => prev + 1);
              if (clickCount + 1 >= 5) {
                setIsSimulationMode(!isSimulationMode);
                setClickCount(0);
                toast.info(isSimulationMode ? 'Modo 2026 Activado' : 'Modo Simulación 2022 Activado');
              }
            }}
            className="bg-lime text-black px-3 py-1 text-[10px] font-black uppercase tracking-widest mb-3 hover:scale-105 transition-transform"
          >
            {isSimulationMode ? 'Simulación 2022' : 'United 2026'}
          </button>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase tracking-widest">{user.displayName}</span>
                  <button onClick={handleLogout} className="text-[9px] text-muted-foreground hover:text-primary uppercase font-bold tracking-widest">Cerrar Sesión</button>
                </div>
                {user.photoURL && <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-primary/30" referrerPolicy="no-referrer" />}
              </div>
            ) : (
              <Button size="sm" onClick={handleLogin} className="bg-white text-black hover:bg-white/90 uppercase text-[10px] font-black tracking-widest px-6 h-10">
                Iniciar Sesión
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={resetPredictions} className="text-muted-foreground hover:text-foreground hover:bg-white/5 uppercase text-[10px] font-black tracking-widest">
              <RotateCcw className="h-3 w-3 mr-2" />
              Reiniciar
            </Button>
          </div>
        </div>
      </header>

      <main className="px-6 lg:px-16 py-12">
        <Toaster position="top-center" />
        
        {/* Secret Simulation Panel */}
        {isSimulationMode && (
          <div className="mb-12 p-6 bg-purple/10 border border-purple/30 rounded-lg space-y-4">
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
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Fecha Simulada (Qatar 2022)</label>
                  <input 
                    type="date" 
                    min="2022-11-20" 
                    max="2022-12-18"
                    value={simulatedDate.split('T')[0]}
                    onChange={(e) => setSimulatedDate(`${e.target.value}T12:00:00Z`)}
                    className="w-full bg-background border border-border px-3 py-2 text-xs font-mono"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Saltar a Jornada</label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map(day => (
                      <Button
                        key={day}
                        size="sm"
                        variant={currentMatchday === day ? "default" : "outline"}
                        onClick={() => {
                          const dates = {
                            1: '2022-11-20T12:00:00Z',
                            2: '2022-11-25T12:00:00Z',
                            3: '2022-11-29T12:00:00Z',
                            4: '2022-12-03T12:00:00Z',
                            5: '2022-12-09T12:00:00Z',
                            6: '2022-12-13T12:00:00Z',
                            7: '2022-12-17T12:00:00Z'
                          };
                          setSimulatedDate(dates[day as keyof typeof dates]);
                        }}
                        className="text-[10px] font-black h-8 flex-1 min-w-[40px]"
                      >
                        J{day}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-wider bg-black/20 p-4 border-l-2 border-purple">
                  Al seleccionar una jornada, la fecha se ajustará al inicio de la misma. Los partidos anteriores aparecerán como finalizados.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-12 flex border-b border-border overflow-x-auto">
          <button
            onClick={() => setActiveTab('quiniela')}
            className={cn(
              "px-8 py-4 text-[12px] font-black uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap",
              activeTab === 'quiniela' 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Mi Quiniela
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={cn(
              "px-8 py-4 text-[12px] font-black uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap",
              activeTab === 'leaderboard' 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Ranking
          </button>
          <button
            onClick={() => setActiveTab('noticias')}
            className={cn(
              "px-8 py-4 text-[12px] font-black uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap",
              activeTab === 'noticias' 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Noticias & Resultados
          </button>
        </div>

        {activeTab === 'quiniela' ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-16">
            {/* Left Column: Matches */}
            <div className="space-y-10">
              {!user && (
                <div className="bg-primary/10 border border-primary/30 p-4 mb-6">
                  <p className="text-[11px] font-black uppercase tracking-widest text-primary text-center">
                    Inicia sesión para guardar tus predicciones en la nube y participar en el ranking global.
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[9px] font-black uppercase tracking-widest px-2 py-0.5">
                      Jornada Actual: {currentMatchday}
                    </Badge>
                  </div>
                  
                  {/* Countdown Section moved here */}
                  <div className="bg-primary/5 border border-primary/20 px-4 py-2 flex items-center gap-5">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-primary" />
                      <div className="flex flex-col">
                        <h3 className="text-[11px] font-black text-primary uppercase tracking-widest leading-none">Límite J{currentMatchday}</h3>
                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">Cierre de predicciones</p>
                      </div>
                    </div>
                    <span className="text-lg font-black tracking-tighter text-primary">
                      14H 22M
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-12">
                {matchdays.filter(day => day === viewingMatchday).map(day => (
                  <div key={day} className="space-y-6">
                    <div className="flex items-center gap-4">
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
                          
                          <h3 className="text-[16px] font-black text-primary uppercase tracking-[0.4em] px-8 py-2 border border-primary/30 bg-primary/5 min-w-[200px] text-center">
                            Jornada {day}
                          </h3>

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
                        {day === currentMatchday && (
                          <span className="text-[9px] font-black text-lime uppercase tracking-widest animate-pulse">
                            • En Calificación •
                          </span>
                        )}
                      </div>
                      <div className="h-[1px] flex-1 bg-border" />
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
                                  (match.matchday === 4 && new Date(simulatedDate) < new Date('2022-12-03T00:00:00Z')) ||
                                  (match.matchday === 5 && new Date(simulatedDate) < new Date('2022-12-07T00:00:00Z')) ||
                                  (match.matchday === 6 && new Date(simulatedDate) < new Date('2022-12-11T00:00:00Z')) ||
                                  (match.matchday === 7 && new Date(simulatedDate) < new Date('2022-12-15T00:00:00Z'))
                                );

                                const displayHome = isTBD ? { name: 'Por definir', flag: '🏳️' } : homeTeam;
                                const displayAway = isTBD ? { name: 'Por definir', flag: '🏳️' } : awayTeam;

                                const prediction = predictions.find(p => p.matchId === match.id) || { matchId: match.id, homeScore: null, awayScore: null };

                                const isFinished = isSimulationMode && new Date(match.date) < new Date(simulatedDate);
                                const actualMatch = isSimulationMode ? (MATCHES_2022.find(m => m.id === match.id)) : null;

                                return (
                                  <motion.div
                                    key={match.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.02 }}
                                  >
                                    <div className="bg-card border border-border p-6 grid grid-cols-[1fr_auto_1fr] items-center gap-6 group hover:border-primary/50 transition-colors relative overflow-hidden">
                                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple via-primary to-lime opacity-50" />
                                      
                                      <div className="absolute top-2 right-2 flex gap-2">
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
                                      <div className="flex items-center gap-4">
                                        <span className={cn("text-3xl transition-all", isTBD && "opacity-20")}>{displayHome.flag}</span>
                                        <span className={cn("text-lg font-black uppercase tracking-tight", isTBD && "text-muted-foreground/50")}>{displayHome.name}</span>
                                      </div>

                                      {/* Score Inputs / Result */}
                                      <div className="flex items-center gap-3">
                                        {isFinished ? (
                                          <div className="flex items-center gap-4">
                                            <span className="text-2xl font-black">{actualMatch?.actualHomeScore}</span>
                                            <span className="text-muted-foreground font-bold text-xs">X</span>
                                            <span className="text-2xl font-black">{actualMatch?.actualAwayScore}</span>
                                          </div>
                                        ) : (
                                          <>
                                            <Input
                                              type="number"
                                              disabled={isTBD}
                                              className="w-12 h-12 bg-background border-border text-center text-xl font-black focus-visible:ring-primary focus-visible:border-primary p-0 disabled:opacity-20"
                                              value={prediction.homeScore ?? ''}
                                              onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                                              placeholder="-"
                                            />
                                            <span className="text-muted-foreground font-bold text-xs">X</span>
                                            <Input
                                              type="number"
                                              disabled={isTBD}
                                              className="w-12 h-12 bg-background border-border text-center text-xl font-black focus-visible:ring-primary focus-visible:border-primary p-0 disabled:opacity-20"
                                              value={prediction.awayScore ?? ''}
                                              onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                                              placeholder="-"
                                            />
                                          </>
                                        )}
                                      </div>

                                      {/* Away Team */}
                                      <div className="flex items-center justify-end gap-4 text-right">
                                        <span className={cn("text-lg font-black uppercase tracking-tight", isTBD && "text-muted-foreground/50")}>{displayAway.name}</span>
                                        <span className={cn("text-3xl transition-all", isTBD && "opacity-20")}>{displayAway.flag}</span>
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

              {/* Simplified Progress Section */}
              <div className="mt-12 bg-card border border-border p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-[9px] font-black text-lime uppercase tracking-[0.2em]">Progreso Quiniela</h3>
                  <span className="text-[14px] font-black">
                    {predictions.filter(p => p.homeScore !== null && p.awayScore !== null).length} / {currentMatches.length}
                  </span>
                </div>
                <div className="h-[1px] w-full bg-white/10">
                  <motion.div 
                    className="h-full bg-lime shadow-[0_0_8px_rgba(163,230,53,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${(predictions.filter(p => p.homeScore !== null && p.awayScore !== null).length / currentMatches.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="pt-6 flex justify-center sm:justify-start">
                <Button 
                  onClick={() => toast.success('Pronósticos guardados correctamente')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground uppercase text-[11px] font-black tracking-widest px-10 h-14 w-full sm:w-auto shadow-[0_0_20px_rgba(237,28,36,0.2)]"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Mis Pronósticos
                </Button>
              </div>
            </div>

            {/* Right Column: Standings */}
            <div className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-[12px] font-bold text-primary uppercase tracking-[0.3em]">
                  Tu Tabla Proyectada
                </h2>
                <p className="text-[9px] text-muted-foreground uppercase leading-tight font-bold">
                  * Esta tabla se calcula automáticamente según los marcadores que ingresas. No son resultados oficiales.
                </p>
              </div>

              <div className="space-y-12">
                {allGroupStandings.map(({ group, standings }) => (
                  <div key={group} className="space-y-4">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest border-l-2 border-primary pl-3">
                      Posiciones Grupo {group}
                    </h3>
                    <div className="border-t border-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-border hover:bg-transparent">
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
                                  className="border-b border-border hover:bg-white/5 transition-colors"
                                >
                                  <TableCell className="py-3 text-[13px] font-black text-primary">
                                    {(idx + 1).toString().padStart(2, '0')}
                                  </TableCell>
                                  <TableCell className="py-3">
                                    <div className="flex items-center gap-3">
                                      <span className="text-lg">{team.flag}</span>
                                      <span className="font-bold text-[13px] uppercase tracking-tight">{team.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-3 text-right font-black text-[13px]">
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
      <div className="space-y-12 max-w-4xl mx-auto">
        <div className="text-center space-y-4">
          <h2 className="text-[12px] font-bold text-muted-foreground uppercase tracking-[0.4em]">
            Ranking Global de Expertos
          </h2>
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest">
            Los puntos se calculan comparando tus predicciones con los resultados oficiales.
          </p>
        </div>

        <div className="border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="w-[60px] text-[10px] font-black text-purple uppercase tracking-widest text-center">Pos</TableHead>
                <TableHead className="text-[10px] font-black text-purple uppercase tracking-widest">Usuario</TableHead>
                <TableHead className="text-center text-[10px] font-black text-purple uppercase tracking-widest">Exactos</TableHead>
                <TableHead className="text-center text-[10px] font-black text-purple uppercase tracking-widest">Ganadores</TableHead>
                <TableHead className="text-right text-[10px] font-black text-purple uppercase tracking-widest">Total Pts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.length > 0 ? (
                leaderboard.map((entry, idx) => (
                  <motion.tr
                    key={entry.uid}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "border-b border-border hover:bg-white/5 transition-colors",
                      user?.uid === entry.uid && "bg-primary/5"
                    )}
                  >
                    <TableCell className="py-6 text-center">
                      <span className={cn(
                        "text-[14px] font-black",
                        idx === 0 ? "text-primary" : "text-muted-foreground"
                      )}>
                        {(idx + 1).toString().padStart(2, '0')}
                      </span>
                    </TableCell>
                    <TableCell className="py-6">
                      <div className="flex items-center gap-4">
                        {entry.photoURL ? (
                          <img src={entry.photoURL} alt="" className="w-8 h-8 rounded-full border border-border" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black">
                            {entry.displayName?.charAt(0) || '?'}
                          </div>
                        )}
                        <span className="font-black text-[14px] uppercase tracking-tight">
                          {entry.displayName}
                          {user?.uid === entry.uid && <span className="ml-2 text-[9px] text-primary">(Tú)</span>}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-6 text-center font-bold text-[13px] text-muted-foreground">
                      {entry.correctResults || 0}
                    </TableCell>
                    <TableCell className="py-6 text-center font-bold text-[13px] text-muted-foreground">
                      {entry.correctWinners || 0}
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
                  <TableCell colSpan={5} className="py-20 text-center">
                    <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                      Aún no hay usuarios en el ranking. ¡Sé el primero!
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    ) : (
          <div className="space-y-12">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-bold text-muted-foreground uppercase tracking-[0.3em]">
                Resultados en Vivo & Próximos Partidos
              </h2>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchNews} 
                disabled={loadingNews}
                className="text-[10px] font-black uppercase tracking-widest border-border"
              >
                Actualizar
              </Button>
            </div>

            {loadingNews ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-card border border-border p-6 space-y-4">
                    <Skeleton className="h-4 w-1/2 bg-white/5" />
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-10 w-10 rounded-full bg-white/5" />
                      <Skeleton className="h-8 w-12 bg-white/5" />
                      <Skeleton className="h-10 w-10 rounded-full bg-white/5" />
                    </div>
                    <Skeleton className="h-3 w-full bg-white/5" />
                  </div>
                ))}
              </div>
            ) : newsData?.response ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {newsData.response.map((fixture: any) => (
                  <motion.div
                    key={fixture.fixture.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-card border border-border p-6 flex flex-col justify-between hover:border-primary/30 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        {new Date(fixture.fixture.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-primary/30 text-primary">
                        {fixture.fixture.status.short}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center gap-4 mb-6">
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <img src={fixture.teams.home.logo} alt={fixture.teams.home.name} className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
                        <span className="text-[11px] font-black uppercase text-center truncate w-full">{fixture.teams.home.name}</span>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <span className="text-2xl font-black tracking-tighter">
                          {fixture.goals.home ?? '-'} : {fixture.goals.away ?? '-'}
                        </span>
                      </div>

                      <div className="flex flex-col items-center gap-2 flex-1">
                        <img src={fixture.teams.away.logo} alt={fixture.teams.away.name} className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
                        <span className="text-[11px] font-black uppercase text-center truncate w-full">{fixture.teams.away.name}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border mt-auto">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest text-center">
                        {fixture.fixture.venue.name}, {fixture.fixture.venue.city}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border p-12 text-center">
                <p className="text-muted-foreground uppercase text-[12px] font-black tracking-widest">
                  No hay datos disponibles. Configura tu APISPORTS_KEY en los secretos.
                </p>
              </div>
            )}
          </div>
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
