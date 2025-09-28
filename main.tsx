import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { useGameStore } from './game/store';

// Initialize game
const initializeGame = async () => {
  const { setGameState } = useGameStore.getState();

  try {
    // Simuliere Asset-Loading
    await new Promise(resolve => setTimeout(resolve, 1000));

    setGameState('running');
    console.log('WebVoxel RPG erfolgreich gestartet');
  } catch (error) {
    console.error('Fehler beim Starten des Spiels:', error);
    setGameState('error');
  }
};

// Start the game
initializeGame();

// Render React App
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('Root-Element nicht gefunden');
}