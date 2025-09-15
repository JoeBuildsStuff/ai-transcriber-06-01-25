'use client';

import React from 'react';
import { Node } from '../../lib/store/canvas-store';
import { ResizeHandleDirection } from './ResizeHandles';

interface LineResizeHandlesProps {
  node: Node;
  onResize: (nodeId: string, direction: ResizeHandleDirection, dx: number, dy: number) => void;
}

const LineResizeHandles: React.FC<LineResizeHandlesProps> = ({ node, onResize }) => {
  const { points } = node;
  const handleSize = 12; // Size of resize handles
  const padding = 15; // Padding around the line points
  
  if (!points || points.length < 2) return null;
  
  // Calculate the bounding box dimensions based on the points
  const allX = points.map(p => p.x);
  const allY = points.map(p => p.y);
  const minX = Math.min(...allX);
  const minY = Math.min(...allY);
  const maxX = Math.max(...allX);
  const maxY = Math.max(...allY);
  
  // Calculate the bounding box with padding
  const boundingBox = {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + (padding * 2),
    height: maxY - minY + (padding * 2)
  };
  
  // Handle mouse down on a resize handle
  const handleMouseDown = (e: React.MouseEvent, direction: ResizeHandleDirection) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent any default behavior
    
    // Starting position
    const startX = e.clientX;
    const startY = e.clientY;
    
    // Function to handle mouse move
    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault(); // Prevent any default behavior
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      onResize(node.id, direction, dx, dy);
    };
    
    // Function to handle mouse up
    const handleMouseUp = (upEvent: MouseEvent) => {
      upEvent.preventDefault(); // Prevent any default behavior
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Common styles for all resize handles
  const commonHandleStyle: React.CSSProperties = {
    position: 'absolute',
    width: `${handleSize}px`,
    height: `${handleSize}px`,
    backgroundColor: 'var(--background)',
    border: '1px solid var(--border)',
    borderRadius: '3px',
    zIndex: 100,
    pointerEvents: 'auto',
    touchAction: 'none',
  };
  
  // Calculate positions for each handle
  const handlePositions = {
    n: { top: boundingBox.y - handleSize / 2, left: boundingBox.x + boundingBox.width / 2 - handleSize / 2, cursor: 'ns-resize' },
    s: { top: boundingBox.y + boundingBox.height - handleSize / 2, left: boundingBox.x + boundingBox.width / 2 - handleSize / 2, cursor: 'ns-resize' },
    w: { top: boundingBox.y + boundingBox.height / 2 - handleSize / 2, left: boundingBox.x - handleSize / 2, cursor: 'ew-resize' },
    e: { top: boundingBox.y + boundingBox.height / 2 - handleSize / 2, left: boundingBox.x + boundingBox.width - handleSize / 2, cursor: 'ew-resize' },
    nw: { top: boundingBox.y - handleSize / 2, left: boundingBox.x - handleSize / 2, cursor: 'nwse-resize' },
    ne: { top: boundingBox.y - handleSize / 2, left: boundingBox.x + boundingBox.width - handleSize / 2, cursor: 'nesw-resize' },
    sw: { top: boundingBox.y + boundingBox.height - handleSize / 2, left: boundingBox.x - handleSize / 2, cursor: 'nesw-resize' },
    se: { top: boundingBox.y + boundingBox.height - handleSize / 2, left: boundingBox.x + boundingBox.width - handleSize / 2, cursor: 'nwse-resize' },
  };
  
  // Draw the bounding box
  const boundingBoxStyle: React.CSSProperties = {
    position: 'absolute',
    top: boundingBox.y,
    left: boundingBox.x,
    width: boundingBox.width,
    height: boundingBox.height,
    border: '1px solid var(--border)',
    pointerEvents: 'none', // Don't interfere with mouse events
    zIndex: 90,
  };
  
  return (
    <>
      {/* Bounding box */}
      <div style={boundingBoxStyle} />
      
      {/* Resize handles */}
      {Object.entries(handlePositions).map(([direction, position]) => (
        <div
          key={direction}
          style={{
            ...commonHandleStyle,
            top: position.top,
            left: position.left,
            cursor: position.cursor,
          }}
          onMouseDown={(e) => handleMouseDown(e, direction as ResizeHandleDirection)}
          className="resize-handle"
        />
      ))}
    </>
  );
};

export default LineResizeHandles; 