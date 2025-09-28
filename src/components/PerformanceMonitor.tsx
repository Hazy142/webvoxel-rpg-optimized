import React from 'react';
import { usePerformanceStore } from '../game/store';

export const PerformanceMonitor: React.FC = () => {
  const { fps, frameTime, memoryUsage, chunkCount } = usePerformanceStore();

  const getPerformanceColor = (fps: number): string => {
    if (fps >= 50) return 'performance-good';
    if (fps >= 30) return 'performance-ok';
    return 'performance-poor';
  };

  return (
    <div className="performance-monitor">
      <div className="performance-header">
        <h3>Performance</h3>
      </div>
      <div className="performance-metrics">
        <div className={`metric ${getPerformanceColor(fps)}`}>
          <span className="metric-label">FPS:</span>
          <span className="metric-value">{fps}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Frame Time:</span>
          <span className="metric-value">{frameTime.toFixed(1)}ms</span>
        </div>
        <div className="metric">
          <span className="metric-label">Memory:</span>
          <span className="metric-value">{memoryUsage}MB</span>
        </div>
        <div className="metric">
          <span className="metric-label">Chunks:</span>
          <span className="metric-value">{chunkCount}</span>
        </div>
      </div>
    </div>
  );
};