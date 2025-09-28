import React from 'react';
import { useGameStore } from '../game/store';

export const GameUI: React.FC = () => {
  const { gameState, setGameState, playerPosition } = useGameStore();

  const togglePause = () => {
    setGameState(gameState === 'running' ? 'paused' : 'running');
  };

  return (
    <div className="game-ui">
      <div className="game-controls">
        <button 
          onClick={togglePause}
          className={`btn ${gameState === 'paused' ? 'btn--primary' : 'btn--secondary'}`}
        >
          {gameState === 'paused' ? '▶️ Fortsetzen' : '⏸️ Pausieren'}
        </button>
      </div>

      <div className="player-info">
        <div className="info-item">
          <span className="info-label">Position:</span>
          <span className="info-value">
            X: {Math.round(playerPosition.x)} 
            Y: {Math.round(playerPosition.y)} 
            Z: {Math.round(playerPosition.z)}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Status:</span>
          <span className={`info-value status-${gameState}`}>
            {gameState === 'running' ? 'Aktiv' : 
             gameState === 'paused' ? 'Pausiert' : 'Lädt...'}
          </span>
        </div>
      </div>

      <div className="controls-help">
        <h4>Steuerung:</h4>
        <div className="controls-grid">
          <span>W A S D</span>
          <span>Bewegung</span>
        </div>
      </div>
    </div>
  );
};