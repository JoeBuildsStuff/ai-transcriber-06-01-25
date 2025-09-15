import React from 'react';
import { MarkerShape, FillStyle } from '../../lib/store/canvas-store';

interface MarkerProps {
  shape: MarkerShape;
  fillStyle: FillStyle;
  isStart: boolean;
  color?: string;
  fillColor?: string;
  x: number;
  y: number;
  angle: number;
}

const Marker: React.FC<MarkerProps> = ({ 
  shape, 
  fillStyle, 
  isStart, 
  color = 'black',
  fillColor,
  x,
  y,
  angle
}) => {
  if (shape === 'none') return null;
  
  const isFilled = fillStyle === 'filled';
  const fill = isFilled ? (fillColor || color) : 'transparent';
  const stroke = color;
  const strokeWidth = 1.5;
  
  // Adjust angle for start marker (point away from the line)
  const adjustedAngle = isStart ? angle + 180 : angle;
  
  // Calculate offset position 5px beyond the endpoint
  const offsetX = x + 6 * Math.cos(adjustedAngle * Math.PI / 180);
  const offsetY = y + 6 * Math.sin(adjustedAngle * Math.PI / 180);
  
  switch (shape) {
    case 'triangle':
      // Position the triangle with its center 5px beyond the endpoint
      return (
        <polygon 
          points="5,0 -5,5 -5,-5"
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          transform={`translate(${offsetX}, ${offsetY}) rotate(${adjustedAngle})`}
        />
      );
    case 'circle':
      // Center the circle 5px beyond the endpoint
      return (
        <circle 
          cx={offsetX}
          cy={offsetY}
          r={5}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
    case 'square':
      // Center the square 5px beyond the endpoint
      return (
        <rect 
          x={-5}
          y={-5}
          width={10}
          height={10}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          transform={`translate(${offsetX}, ${offsetY}) rotate(${adjustedAngle})`}
        />
      );
    case 'diamond':
      // Center the diamond 5px beyond the endpoint
      return (
        <rect 
          x={-5}
          y={-5}
          width={10}
          height={10}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          transform={`translate(${offsetX}, ${offsetY}) rotate(${adjustedAngle + 45})`}
        />
      );
    default:
      return null;
  }
};

export default Marker;