import { useCallback, useEffect, useRef, useState } from 'react';
import { GameScreen } from './components/GameScreen';
import { GameSetup } from './components/GameSetup';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { HowToPlay } from './components/HowToPlay';
import { SettingsModal } from './components/SettingsModal';
import { EMPTY_SCOREBOARD, recordResult } from './game/scoreboard';
import {
  DEFAULT_SETTINGS,
  toConfig,
  type GameMode,
  type GameResult,
  type GameSettings,
} from './game/types';
import { useAI } from './hooks/useAI';
import { useGame } from './hooks/useGame';
import { useLocalStorage } from './hooks/useLocalStorage';
import { SoundContext, useGameSounds, useSound } from './hooks/useSound';
import { useTheme } from './hooks/useTheme';
import { isGameSettings, isScoreboard } from './utils/guards';

type Screen = 'home' | 'setup' | 'game';
type ModalName = 'howto' | 'settings' | null;

export function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [modal, setModal] = useState<ModalName>(null);
  const [settings, setSettings] = useLocalStorage<GameSettings>('caro:settings', DEFAULT_SETTINGS, isGameSettings);
  const [scoreboard, setScoreboard] = useLocalStorage('caro:scoreboard', EMPTY_SCOREBOARD, isScoreboard);
  const { theme, toggle: toggleTheme, setTheme } = useTheme();
  const { enabled: soundEnabled, setEnabled: setSoundEnabled, play } = useSound();
  const { state, start, place, computerMove, undo, restart, reset, canUndo } = useGame();

  useAI(state, computerMove);
  useGameSounds(state, play);

  // Record each finished game exactly once.
  const recorded = useRef<GameResult | null>(null);
  useEffect(() => {
    if (!state.result || recorded.current === state.result) return;
    recorded.current = state.result;
    setScoreboard((sb) => recordResult(sb, state));
  }, [state, setScoreboard]);

  const startGame = useCallback(() => {
    start(toConfig(settings));
    setScreen('game');
  }, [start, settings]);

  const newGame = useCallback(() => {
    setScoreboard(EMPTY_SCOREBOARD);
    start(toConfig(settings));
  }, [start, settings, setScoreboard]);

  const chooseMode = useCallback(
    (mode: GameMode) => {
      setSettings((s) => ({ ...s, mode }));
      setScreen('setup');
    },
    [setSettings],
  );

  const goHome = useCallback(() => {
    reset();
    setScreen('home');
  }, [reset]);

  const backToSetup = useCallback(() => {
    reset();
    setScreen('setup');
  }, [reset]);

  const openSettings = useCallback(() => setModal('settings'), []);
  const closeModal = useCallback(() => setModal(null), []);

  return (
    <SoundContext.Provider value={{ enabled: soundEnabled, play }}>
      <div className="app">
        <Header
          theme={theme}
          onToggleTheme={toggleTheme}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          onHome={screen === 'home' ? undefined : goHome}
        />
        <main className="main">
          <div className="screen" key={screen}>
            {screen === 'home' && (
              <HomeScreen onStart={chooseMode} onHowToPlay={() => setModal('howto')} onSettings={openSettings} />
            )}
            {screen === 'setup' && (
              <GameSetup settings={settings} onChange={setSettings} onStart={startGame} onBack={goHome} />
            )}
            {screen === 'game' && (
              <GameScreen
                state={state}
                scoreboard={scoreboard}
                canUndo={canUndo}
                onPlace={place}
                onUndo={undo}
                onRestart={restart}
                onNewGame={newGame}
                onBackToSetup={backToSetup}
                onHome={goHome}
                onSettings={openSettings}
              />
            )}
          </div>
        </main>
        <HowToPlay open={modal === 'howto'} onClose={closeModal} />
        <SettingsModal
          open={modal === 'settings'}
          onClose={closeModal}
          theme={theme}
          onThemeChange={setTheme}
          soundEnabled={soundEnabled}
          onSoundChange={setSoundEnabled}
          settings={settings}
          onSettingsChange={setSettings}
          onResetScore={() => setScoreboard(EMPTY_SCOREBOARD)}
        />
      </div>
    </SoundContext.Provider>
  );
}
