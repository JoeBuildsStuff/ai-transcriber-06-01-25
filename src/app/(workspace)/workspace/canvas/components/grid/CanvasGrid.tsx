import React from 'react';

interface CanvasGridProps {
  snapToGrid: boolean;
  gridSize: number;
  transform: {
    x: number;
    y: number;
    zoom: number;
  };
  presentationMode: boolean;
}

const CanvasGrid: React.FC<CanvasGridProps> = ({
  snapToGrid,
  gridSize,
  transform,
  presentationMode
}) => {
  // Don't render grid if snap to grid is disabled or if in presentation mode
  if (!snapToGrid || presentationMode) return null;

  const scaledGridSize = gridSize * transform.zoom;

  return (
    <div 
      className="absolute inset-0 pointer-events-none" 
      style={{
        backgroundSize: `${scaledGridSize}px ${scaledGridSize}px`,
        backgroundImage: 'radial-gradient(circle, var(--secondary) 1px, transparent 1px)',
        backgroundPosition: `${transform.x % scaledGridSize}px ${transform.y % scaledGridSize}px`,
      }}
    />
  );
};

export default CanvasGrid; 