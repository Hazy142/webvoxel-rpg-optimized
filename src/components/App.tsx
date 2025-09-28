import React from 'react';
import Scene from './Scene';  // ✅ Ohne "./components/"
import { PerformanceMonitor } from './PerformanceMonitor';  // ✅ Ohne "./components/"
import { GameUI } from './GameUI';  // ✅ Ohne "./components/"
import { useGameStore } from '../game/store';  // ✅ Ein Ordner hoch zu game/
import { ErrorBoundary } from './ErrorBoundary';  // ✅ Ohne "./components/"
import '../styles/App.css';  // ✅ Ein Ordner hoch zu styles/

const App: React.FC = () => {
  const { gameState } = useGameStore();
  
  if (gameState === 'loading') {
    return <LoadingScreen />;
  }
  
  if (gameState === 'error') {
    return <ErrorScreen />;
  }
  
  return (
    <ErrorBoundary>
      <div className="app">
        <div className="game-container">
          <Scene />
          <PerformanceMonitor />
          <GameUI />
        </div>
      </div>
    </ErrorBoundary>
  );
};

const LoadingScreen: React.FC = () => (
  <div className="loading-screen">
    <div className="loading-content">
      <h1>WebVoxel RPG</h1>
      <div className="loading-spinner"></div>
      <p>Welt wird generiert...</p>
    </div>
  </div>
);

const ErrorScreen: React.FC = () => {
  const { setGameState } = useGameStore();
  
  return (
    <div className="error-screen">
      <div className="error-content">
        <h1>🚨 Fehler beim Laden</h1>
        <p>Die WebVoxel RPG Welt konnte nicht geladen werden.</p>
        <button 
          onClick={() => setGameState('loading')}
          className="btn btn--primary"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
};

export default App;
