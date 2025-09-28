import React from 'react';
import { useGameStore } from '../game/store';
import { BlockType } from '../types/game';

export const GameUI: React.FC = () => {
  const { 
    gameState, 
    setGameState, 
    playerPosition, 
    inventory,
    selectedBlockType,
    setSelectedBlockType,
    dayTime,
    isMouseLocked
  } = useGameStore();

  const handlePause = () => {
    setGameState(gameState === 'paused' ? 'running' : 'paused');
  };

  const formatTime = (time: number) => {
    const hours = Math.floor(time * 24);
    const minutes = Math.floor((time * 24 - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getBlockColor = (blockType: BlockType) => {
    const colors: Record<BlockType, string> = { // ✅ Fix: Proper typing + include AIR
      [BlockType.AIR]: '#ffffff',
      [BlockType.GRASS]: '#4a8b3b',
      [BlockType.DIRT]: '#8b4513',
      [BlockType.STONE]: '#666666',
      [BlockType.WOOD]: '#8B4513',
      [BlockType.LEAVES]: '#228B22',
      [BlockType.SAND]: '#F4A460',
      [BlockType.WATER]: '#1E90FF',
      [BlockType.COAL]: '#36454F',
      [BlockType.IRON]: '#C0C0C0',
    };
    return colors[blockType] || '#ffffff';
  };

  return (
    <div className="game-ui">
      {/* Control Instructions */}
      {!isMouseLocked && (
        <div className="controls-hint">
          <h3>🎮 Steuerung</h3>
          <div className="controls-grid">
            <div><strong>WASD:</strong> Bewegung</div>
            <div><strong>Maus:</strong> Umschauen</div>
            <div><strong>Leertaste:</strong> Springen</div>
            <div><strong>Shift:</strong> Sprinten</div>
            <div><strong>Linksklick:</strong> Block abbauen</div>
            <div><strong>Rechtsklick:</strong> Block platzieren</div>
            <div><strong>1-9:</strong> Block auswählen</div>
            <div><strong>ESC:</strong> Pausieren</div>
          </div>
          <p className="click-hint">👆 Klicken für Maus-Look</p>
        </div>
      )}

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-item">
          <strong>Position:</strong> 
          X: {Math.round(playerPosition.x)}, 
          Y: {Math.round(playerPosition.y)}, 
          Z: {Math.round(playerPosition.z)}
        </div>
        <div className="status-item">
          <strong>Zeit:</strong> {formatTime(dayTime)}
        </div>
        <div className="status-item">
          <strong>Status:</strong> {gameState === 'running' ? 'Aktiv' : 'Pausiert'}
        </div>
      </div>

      {/* Crosshair */}
      {isMouseLocked && (
        <div className="crosshair">
          <div className="crosshair-line crosshair-horizontal"></div>
          <div className="crosshair-line crosshair-vertical"></div>
        </div>
      )}

      {/* Hotbar */}
      <div className="hotbar">
        {inventory.slice(0, 9).map((item, index) => (
          <div 
            key={item.id}
            className={`hotbar-slot ${selectedBlockType === item.type ? 'selected' : ''}`}
            onClick={() => setSelectedBlockType(item.type)}
          >
            <div 
              className="block-preview"
              style={{ backgroundColor: getBlockColor(item.type) }}
            ></div>
            <div className="item-count">{item.count}</div>
            <div className="slot-number">{index + 1}</div>
          </div>
        ))}
      </div>

      {/* Pause Menu */}
      {gameState === 'paused' && (
        <div className="pause-overlay">
          <div className="pause-menu">
            <h2>🎮 WebVoxel RPG</h2>
            <div className="pause-stats">
              <p><strong>Position:</strong> {Math.round(playerPosition.x)}, {Math.round(playerPosition.y)}, {Math.round(playerPosition.z)}</p>
              <p><strong>Zeit:</strong> {formatTime(dayTime)}</p>
              <p><strong>Inventar:</strong> {inventory.length} Gegenstände</p>
            </div>
            <div className="pause-buttons">
              <button onClick={handlePause} className="btn btn--primary">
                Weiterspielen
              </button>
              <button onClick={() => window.location.reload()} className="btn btn--secondary">
                Neu starten
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="game-controls">
        <button onClick={handlePause} className="btn btn--small">
          {gameState === 'paused' ? '▶️' : '⏸️'}
        </button>
      </div>
    </div>
  );
};
