import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Plus, Crown, Shuffle, Lock, Unlock, RotateCcw, Trash2, Columns, BookOpen, ChevronLeft, LayoutGrid, Calendar, Users, PlayCircle, Settings2, Save, Check, HelpCircle, RefreshCw } from 'lucide-react';
import { Team, MatchType, GamePhase, Match, DragData, BracketMode, LayoutMode, Tournament } from './types';
import { MAX_TEAMS, MAX_TOURNAMENTS } from './constants';
import * as bracketService from './services/bracketService';
import Confetti from './components/Confetti';
import MatchCard from './components/MatchCard';
import DraggableTeam from './components/DraggableTeam';
import Modal from './components/Modal';
import InfoTooltip from './components/InfoTooltip';

const STORAGE_KEY = 'bracket_master_data';

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const App: React.FC = () => {
  // --- Global State ---
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'tournament'>('dashboard');

  // --- Local Tournament State (Working Copy) ---
  const [currentName, setCurrentName] = useState('');
  const [phase, setPhase] = useState<GamePhase>('draft');
  const [matchType, setMatchType] = useState<MatchType>('single');
  const [bracketMode, setBracketMode] = useState<BracketMode>('compact');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('double');
  const [createdTeams, setCreatedTeams] = useState<Team[]>([]);
  const [bracketSlots, setBracketSlots] = useState<(Team | null)[]>([null, null]);
  const [rounds, setRounds] = useState<Match[][]>([]);
  const [champion, setChampion] = useState<Team | null>(null);

  // --- UI State ---
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);
  const [showByeWarning, setShowByeWarning] = useState(false);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [newTourneyName, setNewTourneyName] = useState('');
  const [inputTeamName, setInputTeamName] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // --- Persistence ---

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Tournament[];
        setTournaments(parsed);
      } catch (e) {
        console.error("Failed to parse saved data", e);
      }
    }
  }, []);

  const saveToStorage = (updatedTournaments: Tournament[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTournaments));
    setTournaments(updatedTournaments);
  };

  const syncActiveTournamentToGlobal = useCallback((force = false) => {
    if (!activeId) return;
    if (force) setSaveStatus('saving');
    
    const updatedTournaments = tournaments.map(t => {
      if (t.id === activeId) {
        return {
          ...t,
          name: currentName,
          phase,
          matchType,
          bracketMode,
          layoutMode,
          createdTeams,
          bracketSlots,
          rounds,
          champion,
          updatedAt: Date.now()
        };
      }
      return t;
    });
    saveToStorage(updatedTournaments);
    
    if (force) {
      setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 300);
    }
  }, [activeId, currentName, phase, matchType, bracketMode, layoutMode, createdTeams, bracketSlots, rounds, champion, tournaments]);

  // Auto-sync whenever local changes happen
  useEffect(() => {
    if (activeId && view === 'tournament') {
      const timer = setTimeout(() => syncActiveTournamentToGlobal(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [currentName, phase, matchType, bracketMode, layoutMode, createdTeams, bracketSlots, rounds, champion, activeId, view, syncActiveTournamentToGlobal]);

  // --- Dashboard Actions ---

  const handleOpenCreateModal = () => {
    if (tournaments.length >= MAX_TOURNAMENTS) {
      setErrorModalMsg(`You have reached the limit of ${MAX_TOURNAMENTS} tournaments. Please delete an existing one to create more.`);
      return;
    }
    setNewTourneyName('');
    setShowNamingModal(true);
  };

  const createNewTournament = () => {
    if (!newTourneyName.trim()) return;
    const newId = generateId();
    const newT: Tournament = {
      id: newId,
      name: newTourneyName.trim(),
      phase: 'draft',
      matchType: 'single',
      bracketMode: 'compact',
      layoutMode: 'double',
      createdTeams: [],
      bracketSlots: [null, null],
      rounds: [],
      champion: null,
      updatedAt: Date.now()
    };

    const updated = [newT, ...tournaments];
    saveToStorage(updated);
    loadTournament(newId);
    setShowNamingModal(false);
  };

  const loadTournament = (id: string) => {
    const t = tournaments.find(x => x.id === id);
    if (!t) return;

    setActiveId(t.id);
    setCurrentName(t.name);
    setPhase(t.phase);
    setMatchType(t.matchType);
    setBracketMode(t.bracketMode);
    setLayoutMode(t.layoutMode);
    setCreatedTeams(t.createdTeams);
    setBracketSlots(t.bracketSlots);
    setRounds(t.rounds);
    setChampion(t.champion);
    setView('tournament');
    setShowVictoryModal(false);
    setSaveStatus('idle');
  };

  const confirmDelete = (id: string) => {
    setDeleteCandidate(id);
  };

  const handleDeleteTournament = () => {
    if (!deleteCandidate) return;
    const updated = tournaments.filter(t => t.id !== deleteCandidate);
    saveToStorage(updated);
    setDeleteCandidate(null);
  };

  // --- Bracket Actions ---

  useEffect(() => {
    if (view === 'tournament') {
        const newSlots = bracketService.resizeBracketSlots(bracketSlots, createdTeams.length);
        if (newSlots.length !== bracketSlots.length) {
            setBracketSlots(newSlots);
        }
    }
  }, [createdTeams.length, view]);

  useEffect(() => {
    if (view === 'tournament' && phase === 'draft') {
        const newRounds = bracketService.generateRounds(bracketSlots);
        setRounds(newRounds);
    }
  }, [bracketSlots, phase, view]);

  const addTeam = () => {
    if (!inputTeamName.trim()) return;
    if (createdTeams.length >= MAX_TEAMS) {
        setErrorModalMsg(`Maximum limit of ${MAX_TEAMS} teams reached.`);
        return;
    }
    const newTeam: Team = { id: generateId(), name: inputTeamName.trim() };
    setCreatedTeams([...createdTeams, newTeam]);
    setInputTeamName('');
  };

  const removeTeam = (id: string) => {
    setCreatedTeams(createdTeams.filter(t => t.id !== id));
    setBracketSlots(bracketSlots.map(s => (s && s.id === id ? null : s)));
  };

  const balanceAndFill = () => {
    if (createdTeams.length === 0) return;
    const balancedSlots = bracketService.generateBalancedAssignments(
        createdTeams, 
        bracketSlots.length, 
        bracketMode,
        layoutMode
    );
    setBracketSlots(balancedSlots);
  };

  const handleStartRequest = () => {
      const count = createdTeams.length;
      if (count < 2) {
          setErrorModalMsg("You need at least 2 teams to start a tournament.");
          return;
      }
      const unassigned = createdTeams.filter(t => !bracketSlots.some(s => s && s.id === t.id));
      if (unassigned.length > 0) {
          setErrorModalMsg("Please assign all teams before starting.");
          return;
      }
      if (!bracketService.isPowerOfTwo(createdTeams.length) && bracketMode === 'compact') {
          setShowByeWarning(true);
          return;
      }
      startTournament();
  };
  
  const startTournament = () => {
      setShowByeWarning(false);
      setPhase('play');
      const { newRounds, champion: autoChamp } = bracketService.resolveByes(rounds);
      setRounds(newRounds);
      if (autoChamp) {
          setChampion(autoChamp);
          setShowVictoryModal(true);
      }
      syncActiveTournamentToGlobal(true);
  };

  const handleUpdateMatch = (roundIndex: number, matchIndex: number, teamIndex: 0 | 1, newWins: number) => {
      const { newRounds, champion: newChamp } = bracketService.updateMatchAndPropagate(
          rounds, roundIndex, matchIndex, teamIndex, newWins, matchType
      );
      setRounds(newRounds);
      if (newChamp) {
          setChampion(newChamp);
          setShowVictoryModal(true);
      }
  };

  const handleSlotDrop = (dragData: DragData, targetSlotIndex: number) => {
    const { team, sourceSlotIndex } = dragData;
    const newSlots = [...bracketSlots];
    const targetTeam = newSlots[targetSlotIndex];
    if (sourceSlotIndex !== -1) {
      newSlots[sourceSlotIndex] = targetTeam; 
      newSlots[targetSlotIndex] = team;      
    } else {
      newSlots[targetSlotIndex] = team;
    }
    setBracketSlots(newSlots);
  };

  const handlePoolDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('team');
      if (!raw) return;
      const { sourceSlotIndex }: DragData = JSON.parse(raw);
      if (sourceSlotIndex !== -1) {
          const newSlots = [...bracketSlots];
          newSlots[sourceSlotIndex] = null;
          setBracketSlots(newSlots);
      }
  };

  // --- Render Helpers ---

  const poolTeams = createdTeams.filter(t => !bracketSlots.some(s => s && s.id === t.id));
  const finalRoundIndex = rounds.length - 1;
  const hasMultipleRounds = rounds.length > 1;
  
  const leftSideRounds: Match[][] = [];
  const rightSideRounds: Match[][] = [];
  
  if (hasMultipleRounds) {
    for (let i = 0; i < finalRoundIndex; i++) {
        const roundMatches = rounds[i];
        const half = Math.ceil(roundMatches.length / 2);
        leftSideRounds.push(roundMatches.slice(0, half));
        rightSideRounds.push(roundMatches.slice(half));
    }
  }

  const renderBracketContent = () => {
      if (rounds.length === 0) return <div className="text-slate-400 font-medium italic">Generating bracket structure...</div>;

      if (layoutMode === 'single') {
          return (
              <div className="flex gap-16 items-center">
                  {rounds.map((round, rIndex) => (
                      <div key={`round-${rIndex}`} className="flex flex-col justify-around h-full gap-8">
                          <h4 className="text-center text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest whitespace-nowrap">
                              {rIndex === finalRoundIndex ? 'Finals' : `Round ${rIndex + 1}`}
                          </h4>
                          <div className="flex flex-col justify-around h-full gap-8 flex-1">
                              {round.map((match, mIndex) => (
                                  <MatchCard 
                                      key={`${match.id}-${rIndex}`} 
                                      match={match} 
                                      roundIndex={rIndex}
                                      matchIndex={mIndex} 
                                      matchType={matchType}
                                      onUpdateMatch={handleUpdateMatch}
                                      isDrafting={phase === 'draft'}
                                      onSlotDrop={handleSlotDrop}
                                      onSlotDragStart={()=>{}}
                                      align="left"
                                      p1Active={bracketService.hasInput(rounds, rIndex, mIndex, 'p1')}
                                      p2Active={bracketService.hasInput(rounds, rIndex, mIndex, 'p2')}
                                  />
                              ))}
                          </div>
                      </div>
                  ))}
                  <div className="flex flex-col justify-center items-center h-full ml-8">
                      <div className="h-40 flex items-center justify-center">
                            {champion ? (
                                <div className="flex flex-col items-center animate-bounce">
                                    <Trophy className="w-20 h-20 text-yellow-500 mb-4 drop-shadow-xl" strokeWidth={1.5} />
                                    <div className="text-2xl font-black text-slate-800 tracking-tight text-center">{champion.name}</div>
                                    <div className="text-xs text-green-600 font-bold uppercase tracking-wider mt-1 bg-green-100 px-3 py-1 rounded-full">Champion</div>
                                </div>
                            ) : (
                                <div className="w-28 h-28 border-4 border-dashed border-slate-300 rounded-full flex items-center justify-center opacity-30">
                                    <Crown className="text-slate-400 w-12 h-12" />
                                </div>
                            )}
                      </div>
                  </div>
              </div>
          );
      }

      return (
          <div className="flex gap-16 items-stretch">
            {hasMultipleRounds && (
                <div className="flex gap-12">
                    {leftSideRounds.map((roundMatches, rIndex) => (
                        <div key={`left-${rIndex}`} className="flex flex-col justify-around">
                            {rIndex === 0 && <h4 className="text-center text-xs font-bold text-slate-400 uppercase mb-6 tracking-widest">Round {rIndex + 1}</h4>}
                            <div className="flex flex-col justify-around h-full gap-8">
                                {roundMatches.map((match, mIndex) => (
                                    <MatchCard 
                                        key={`${match.id}-${rIndex}`} 
                                        match={match} 
                                        roundIndex={rIndex}
                                        matchIndex={mIndex} 
                                        matchType={matchType}
                                        onUpdateMatch={handleUpdateMatch}
                                        isDrafting={phase === 'draft'}
                                        onSlotDrop={handleSlotDrop}
                                        onSlotDragStart={()=>{}}
                                        align="left"
                                        p1Active={bracketService.hasInput(rounds, rIndex, mIndex, 'p1')}
                                        p2Active={bracketService.hasInput(rounds, rIndex, mIndex, 'p2')}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex flex-col justify-center items-center px-8 z-10 relative">
                <div className="mb-12">
                    <h4 className="text-center text-xs font-bold text-yellow-600 uppercase mb-6 tracking-[0.2em]">
                        {rounds.length === 1 ? 'Match' : 'Championship'}
                    </h4>
                    {rounds[finalRoundIndex] && rounds[finalRoundIndex].map((match, mIndex) => (
                        <MatchCard 
                            key={`${match.id}-${finalRoundIndex}`} 
                            match={match} 
                            roundIndex={finalRoundIndex}
                            matchIndex={mIndex}
                            matchType={matchType}
                            onUpdateMatch={handleUpdateMatch}
                            isDrafting={phase === 'draft'}
                            onSlotDrop={handleSlotDrop}
                            onSlotDragStart={()=>{}}
                            align="center"
                            p1Active={bracketService.hasInput(rounds, finalRoundIndex, mIndex, 'p1')}
                            p2Active={bracketService.hasInput(rounds, finalRoundIndex, mIndex, 'p2')}
                        />
                    ))}
                </div>
                <div className="h-40 flex items-center justify-center">
                    {champion ? (
                        <div className="flex flex-col items-center animate-bounce">
                            <Trophy className="w-20 h-20 text-yellow-500 mb-4 drop-shadow-xl" strokeWidth={1.5} />
                            <div className="text-2xl font-black text-slate-800 tracking-tight text-center">{champion.name}</div>
                            <div className="text-xs text-green-600 font-bold uppercase tracking-wider mt-1 bg-green-100 px-3 py-1 rounded-full">Champion</div>
                        </div>
                    ) : (
                        <div className="w-28 h-28 border-4 border-dashed border-slate-300 rounded-full flex items-center justify-center opacity-30">
                            <Crown className="text-slate-400 w-12 h-12" />
                        </div>
                    )}
                </div>
            </div>

            {hasMultipleRounds && (
                <div className="flex gap-12 flex-row-reverse">
                    {rightSideRounds.map((roundMatches, rIndex) => (
                        <div key={`right-${rIndex}`} className="flex flex-col justify-around">
                            {rIndex === 0 && <h4 className="text-center text-xs font-bold text-slate-400 uppercase mb-6 tracking-widest">Round {rIndex + 1}</h4>}
                            <div className="flex flex-col justify-around h-full gap-8">
                                {roundMatches.map((match, mIndex) => {
                                    const leftCount = Math.ceil(rounds[rIndex].length / 2);
                                    const realIndex = leftCount + mIndex;
                                    return (
                                        <MatchCard 
                                            key={`${match.id}-${rIndex}`} 
                                            match={match} 
                                            roundIndex={rIndex}
                                            matchIndex={realIndex} 
                                            matchType={matchType}
                                            onUpdateMatch={handleUpdateMatch}
                                            isDrafting={phase === 'draft'}
                                            onSlotDrop={handleSlotDrop}
                                            onSlotDragStart={()=>{}}
                                            align="right"
                                            p1Active={bracketService.hasInput(rounds, rIndex, realIndex, 'p1')}
                                            p2Active={bracketService.hasInput(rounds, rIndex, realIndex, 'p2')}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
      );
  };

  const InstructionList = () => (
    <div className="text-left space-y-4 text-slate-600 overflow-y-auto max-h-[60vh] pr-2">
      <div>
        <h4 className="font-bold text-slate-900 flex items-center gap-2"><Plus size={16} className="text-indigo-600"/> 1. Create</h4>
        <p>Start by creating a tournament. Enter a name that reflects your event (e.g., "Company Ping Pong Open").</p>
      </div>
      <div>
        <h4 className="font-bold text-slate-900 flex items-center gap-2"><Users size={16} className="text-indigo-600"/> 2. Roster</h4>
        <p>In the Draft phase, add team or player names to the roster pool. You can have up to 16 teams.</p>
      </div>
      <div>
        <h4 className="font-bold text-slate-900 flex items-center gap-2"><Shuffle size={16} className="text-indigo-600"/> 3. Assignment</h4>
        <p>Drag names from the pool into the bracket slots. Or use <strong>Auto Fill</strong> to randomly assign everyone in seconds.</p>
      </div>
      <div>
        <h4 className="font-bold text-slate-900 flex items-center gap-2"><LayoutGrid size={16} className="text-indigo-600"/> 4. Choose Layout</h4>
        <p><strong>Split View:</strong> Arranges matches on two sides (Left/Right) meeting in the middle. Best for balanced visualization. <br/><strong>Single View:</strong> Arranges matches in a straight line from left to right. Great for a classic sequential timeline.</p>
      </div>
      <div>
        <h4 className="font-bold text-slate-900 flex items-center gap-2"><Settings2 size={16} className="text-indigo-600"/> 5. Choose Style</h4>
        <p><strong>Standard Mode:</strong> Maintains a traditional symmetrical bracket using power-of-two sizes (e.g., 4, 8, 16). If the count isn't perfect, Byes are placed in the first round. <br/><strong>Compact Mode:</strong> Minimizes first-round Byes by pairing as many teams as possible immediately. Byes may appear in later rounds instead.</p>
      </div>
      <div>
        <h4 className="font-bold text-slate-900 flex items-center gap-2"><Lock size={16} className="text-indigo-600"/> 6. Play</h4>
        <p>Click <strong>Begin Tournament</strong> to lock the bracket. This generates the match structure and handles any initial Byes.</p>
      </div>
      <div>
        <h4 className="font-bold text-slate-900 flex items-center gap-2"><Check size={16} className="text-indigo-600"/> 7. Record Wins</h4>
        <p>Click the circular "pips" next to a team's name to record a win. Winners automatically advance to the next round.</p>
      </div>
    </div>
  );

  if (view === 'dashboard') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
        <div className="bg-white border-b border-slate-200 p-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <Trophy size={40} className="text-yellow-500 drop-shadow-md" strokeWidth={1.5} />
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Bracket Master</h1>
                <p className="text-slate-500 text-sm font-medium">Manage your ongoing tournaments</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowInstructions(true)}
                className="flex items-center gap-2 text-slate-600 px-5 py-3 rounded-full font-bold hover:bg-slate-100 transition-all border border-slate-200"
              >
                <HelpCircle size={20} /> Help
              </button>
              <button 
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-full font-bold hover:bg-indigo-700 shadow-lg hover:shadow-indigo-200 transition-all active:scale-95"
              >
                <Plus size={20} /> Create Tournament
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-6xl w-full mx-auto p-8">
          {tournaments.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12">
              <div className="bg-slate-50 p-6 rounded-full mb-6">
                <LayoutGrid size={48} className="text-slate-300" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">No Tournaments Yet</h2>
              <p className="text-slate-500 max-w-md">Start your first tournament and manage it here. You can have up to 10 ongoing brackets at once.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.sort((a,b) => b.updatedAt - a.updatedAt).map(t => (
                <div 
                  key={t.id} 
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-indigo-200 transition-all group overflow-hidden flex flex-col"
                >
                  <div className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${t.phase === 'play' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {t.phase === 'play' ? 'Ongoing' : 'Drafting'}
                      </div>
                      <button 
                        onClick={() => confirmDelete(t.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 group-hover:text-indigo-600 transition-colors line-clamp-1">{t.name}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <Users size={14} />
                        <span>{t.createdTeams.length} Teams</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <Calendar size={14} />
                        <span>Last updated: {new Date(t.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <Settings2 size={14} />
                        <span className="capitalize">{t.bracketMode} • {t.layoutMode}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => loadTournament(t.id)}
                    className="w-full bg-slate-50 border-t border-slate-100 py-4 px-5 text-sm font-bold text-indigo-600 flex items-center justify-between hover:bg-indigo-50 transition-colors"
                  >
                    <span>{t.phase === 'play' ? 'Continue Play' : 'Edit Draft'}</span>
                    <PlayCircle size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Modal 
          isOpen={showNamingModal} 
          onClose={() => setShowNamingModal(false)} 
          title="New Tournament"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Enter a name for your tournament to get started.</p>
            <input 
              autoFocus
              value={newTourneyName}
              onChange={e => setNewTourneyName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createNewTournament()}
              placeholder="e.g. Summer Smash 2024"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
            <button 
              onClick={createNewTournament}
              disabled={!newTourneyName.trim()}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              Start Tournament
            </button>
          </div>
        </Modal>

        <Modal 
          isOpen={!!deleteCandidate} 
          onClose={() => setDeleteCandidate(null)} 
          title="Delete Tournament?"
          type="warning"
          confirmLabel="Delete Permanently"
          cancelLabel="Cancel"
          onConfirm={handleDeleteTournament}
        >
          <p>Are you sure you want to delete this tournament? This action cannot be undone.</p>
        </Modal>

        <Modal 
            isOpen={!!errorModalMsg} 
            onClose={() => setErrorModalMsg(null)} 
            title="Notification" 
            type="info"
        >
            <p className="whitespace-pre-line">{errorModalMsg}</p>
        </Modal>

        <Modal 
          isOpen={showInstructions} 
          onClose={() => setShowInstructions(false)} 
          title="How to use Bracket Master"
        >
          <InstructionList />
        </Modal>
      </div>
    );
  }

  // --- Main Tournament View ---
  return (
    <>
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
        
        {/* TOP BAR */}
        <div className={`bg-white border-b border-slate-200 shadow-sm z-20 transition-all ${phase === 'draft' ? 'p-6' : 'p-3'}`}>
          <div className="max-w-7xl mx-auto">
            
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
               <div className="flex items-center gap-3">
                   <button 
                    onClick={() => { syncActiveTournamentToGlobal(); setView('dashboard'); }}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                   >
                     <ChevronLeft size={24} />
                   </button>
                   <div className="h-6 w-px bg-slate-200 mx-1"></div>
                   <Trophy size={32} className="text-yellow-500 drop-shadow-md" strokeWidth={1.5} />
                   <div>
                     <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">{currentName}</h1>
                     <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mt-1">Status: {phase === 'draft' ? 'Drafting' : 'Tournament Live'}</div>
                   </div>
                   
                   <div className="h-6 w-px bg-slate-300 mx-2 hidden md:block"></div>
                   
                   {phase === 'draft' && (
                     <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                          onClick={() => setMatchType('single')}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${matchType === 'single' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Single Match
                        </button>
                        <button 
                          onClick={() => setMatchType('bestOf3')}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${matchType === 'bestOf3' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Best of 3
                        </button>
                     </div>
                   )}
               </div>
               
               <div className="flex items-center gap-3">
                   <button 
                    onClick={() => setShowInstructions(true)}
                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Instructions"
                   >
                     <HelpCircle size={22} />
                   </button>
                   {phase === 'play' && (
                     <button 
                        onClick={() => syncActiveTournamentToGlobal(true)}
                        disabled={saveStatus !== 'idle'}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all text-sm shadow-sm active:scale-95 border ${
                          saveStatus === 'saved' 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                     >
                       {saveStatus === 'saving' ? (
                          <>
                            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            Saving...
                          </>
                       ) : saveStatus === 'saved' ? (
                          <>
                            <Check size={16} /> Saved!
                          </>
                       ) : (
                          <>
                            <Save size={16} /> Save Progress
                          </>
                       )}
                     </button>
                   )}

                   {phase === 'draft' && (
                        <>
                            <button 
                                onClick={handleStartRequest}
                                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-full font-bold hover:bg-indigo-700 shadow-lg hover:shadow-indigo-200 transition-all text-sm active:scale-95"
                            >
                                <Lock size={16} /> Begin Tournament
                            </button>
                        </>
                   )}
                   
                   {phase === 'play' && !champion && (
                      <button 
                        onClick={() => setPhase('draft')}
                        className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition text-sm"
                      >
                        <Unlock size={16} /> Edit Bracket
                      </button>
                   )}
               </div>
            </div>

            {/* Draft Area */}
            {phase === 'draft' && (
                <div className="animate-in slide-in-from-top-4 duration-300 mt-2">
                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        {/* Input */}
                        <div className="w-full lg:w-96 flex-shrink-0 flex flex-col gap-4">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex justify-between items-center">
                                    <span>Roster</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${createdTeams.length === MAX_TEAMS ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-600'}`}>
                                        {createdTeams.length} / {MAX_TEAMS}
                                    </span>
                                </h3>
                                <div className="flex gap-2 mb-2">
                                    <input 
                                        value={inputTeamName}
                                        onChange={e => setInputTeamName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addTeam()}
                                        placeholder={createdTeams.length >= MAX_TEAMS ? "Limit reached" : "Enter Team Name..."}
                                        disabled={createdTeams.length >= MAX_TEAMS}
                                        className="flex-1 px-3 py-2 text-sm text-gray-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-slate-100 transition-all"
                                    />
                                    <button 
                                        onClick={addTeam} 
                                        disabled={createdTeams.length >= MAX_TEAMS}
                                        className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                    >
                                        <Plus size={20}/>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Settings</h3>
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-2">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase">Style</div>
                                        <div className="flex gap-2">
                                            <label className={`flex-1 flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${bracketMode === 'standard' ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500' : 'bg-slate-100 border-transparent hover:bg-white'}`}>
                                                <div className="flex items-center gap-2">
                                                    <input type="radio" checked={bracketMode === 'standard'} onChange={() => setBracketMode('standard')} className="w-3.5 h-3.5 text-indigo-600" />
                                                    <span className="text-xs font-medium">Standard</span>
                                                </div>
                                                <InfoTooltip title="Standard" description="Expanded power-of-2 size." strengths="Fairness" weaknesses="Idle time" />
                                            </label>
                                            <label className={`flex-1 flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${bracketMode === 'compact' ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500' : 'bg-slate-100 border-transparent hover:bg-white'}`}>
                                                <div className="flex items-center gap-2">
                                                    <input type="radio" checked={bracketMode === 'compact'} onChange={() => setBracketMode('compact')} className="w-3.5 h-3.5 text-indigo-600" />
                                                    <span className="text-xs font-medium">Compact</span>
                                                </div>
                                                <InfoTooltip title="Compact" description="Minimized empty slots." strengths="Efficiency" weaknesses="Byes later" />
                                            </label>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase">Layout</div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setLayoutMode('double')} className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all ${layoutMode === 'double' ? 'bg-white border-indigo-500 ring-1 ring-indigo-500 text-indigo-700' : 'bg-slate-100'}`}>
                                                <BookOpen size={14} /> Split
                                            </button>
                                            <button onClick={() => setLayoutMode('single')} className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all ${layoutMode === 'single' ? 'bg-white border-indigo-500 ring-1 ring-indigo-500 text-indigo-700' : 'bg-slate-100'}`}>
                                                <Columns size={14} /> Single
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div 
                            className="flex-1 w-full bg-slate-50 p-4 rounded-xl border border-slate-200 min-h-[200px] shadow-sm relative group flex flex-col"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handlePoolDrop}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Unassigned Pool</h3>
                                    <p className="text-[11px] text-slate-400 font-normal">Drag teams to slots</p>
                                </div>
                                <button 
                                    onClick={balanceAndFill}
                                    disabled={createdTeams.length < 2}
                                    className="flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md border border-indigo-200 transition disabled:opacity-50"
                                >
                                    <Shuffle size={14} /> Auto Fill
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2 flex-1 content-start">
                                {poolTeams.length === 0 && <span className="text-sm text-slate-400 italic p-2">Pool empty.</span>}
                                {poolTeams.map(team => (
                                    <DraggableTeam 
                                        key={team.id} 
                                        team={team} 
                                        onDragStart={()=>{}} 
                                        allowRemove={true}
                                        onRemove={removeTeam}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
          </div>
        </div>

        {/* BRACKET AREA */}
        <div className="flex-1 bg-slate-200 overflow-auto cursor-grab active:cursor-grabbing relative">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            <div className="min-w-[1200px] min-h-full p-12 flex items-center justify-center">
                {renderBracketContent()}
            </div>
        </div>

        <Modal isOpen={!!errorModalMsg} onClose={() => setErrorModalMsg(null)} title="Action Required" type="error">
            <p className="whitespace-pre-line">{errorModalMsg}</p>
        </Modal>

        <Modal isOpen={showByeWarning} onClose={() => setShowByeWarning(false)} title="Imperfect Bracket" type="warning" onConfirm={startTournament} confirmLabel="Start Anyway">
            <p>You have {createdTeams.length} teams. Starting now will create a Condensed bracket with Byes.</p>
        </Modal>

        <Modal 
          isOpen={showInstructions} 
          onClose={() => setShowInstructions(false)} 
          title="How to use Bracket Master"
        >
          <InstructionList />
        </Modal>

        {showVictoryModal && champion && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowVictoryModal(false)}></div>
              <Confetti />
              <div className="bg-white rounded-2xl shadow-2xl p-12 border-4 border-yellow-400 text-center animate-in zoom-in relative overflow-hidden">
                  <h2 className="text-4xl font-black text-slate-800 mb-2 uppercase">Winner!</h2>
                  <div className="text-5xl font-bold text-indigo-600 mb-8">{champion.name}</div>
                  <button onClick={() => setShowVictoryModal(false)} className="text-sm text-slate-400 hover:underline">Close</button>
              </div>
            </div>
        )}
      </div>
    </>
  );
};

export default App;