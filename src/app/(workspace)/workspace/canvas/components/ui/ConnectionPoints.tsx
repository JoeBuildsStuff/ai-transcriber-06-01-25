'use client';

import React, { useMemo } from 'react';
import { LazyMotion, domAnimation, m } from "motion/react";
import { Node } from '../../lib/store/canvas-store';
import { connectionManager, ConnectionPointPosition } from './../../lib/connection';

// Use centralized type from connection system

interface ConnectionPointsProps {
  node: Node;
  onConnectionPointClick: (nodeId: string, position: ConnectionPointPosition) => void;
  hoveredPosition?: ConnectionPointPosition;
  onConnectionPointHover?: (position: ConnectionPointPosition | null) => void;
  showAll?: boolean; // Re-add the showAll prop
}

// Constants
const HANDLE_SIZE = 10; // Increased size for better clickability

// Common styles for all connection points
const getCommonHandleStyle = (isHovered: boolean): React.CSSProperties => {
  const size = isHovered ? HANDLE_SIZE + 4 : HANDLE_SIZE;
  
  return {
    position: 'absolute',
    width: size,
    height: size,
    backgroundColor: 'var(--background)',
    border: '1px solid var(--border)',
    borderRadius: '50%', // Make them circular
    zIndex: isHovered ? 1001 : 1000,
    pointerEvents: 'auto',
    touchAction: 'none',
    cursor: 'crosshair',
    // Position the handle so its center is at the connection point
    marginLeft: -(size / 2),
    marginTop: -(size / 2),
  };
};

const ConnectionPoints: React.FC<ConnectionPointsProps> = ({ 
  node, 
  onConnectionPointClick, 
  hoveredPosition, 
  onConnectionPointHover,
  showAll = false // Default to false for backward compatibility
}) => {
  // Handle interaction with a connection point
  const handleInteraction = (e: React.MouseEvent, position: ConnectionPointPosition) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (onConnectionPointClick && node.dimensions) {
      onConnectionPointClick(node.id, position);
    }
  };
  
  // Calculate the positions of all connection points based on the node's dimensions and position
  const connectionPoints = useMemo(() => {
    if (!node.dimensions) return {};
    
    // All possible connection positions
    const positions: ConnectionPointPosition[] = ['n', 's', 'e', 'w'];
    
    // Calculate the absolute position for each connection point
    const points = positions.reduce((acc, position) => {
      const absolutePos = connectionManager.calculateConnectionPoint(node, position as ConnectionPointPosition, {});
      
      // Convert to relative position within the container
      const relativeX = absolutePos.x - node.position.x;
      const relativeY = absolutePos.y - node.position.y;
      
      acc[position] = { x: relativeX, y: relativeY };
      return acc;
    }, {} as Record<string, { x: number, y: number }>);
  
    return points;
  }, [node]);
  
  // Memoize container style to prevent recalculation on every render
  const containerStyle = useMemo((): React.CSSProperties => {
    // For all shapes, ensure the container is positioned correctly
    return {
      position: 'absolute',
      width: '100%',
      height: '100%',
      // For diamond shapes, apply rotation
      transform: node.type === 'diamond' ? 'rotate(45deg)' : 'none',
      transformOrigin: node.type === 'diamond' ? 'center' : 'initial',
      // Ensure the container is positioned at the top-left corner of the shape
      top: 0,
      left: 0,
      pointerEvents: 'none', // Allow clicks to pass through to the shape
      zIndex: 1000, // Ensure connection points are above the shape
    };
  }, [node.type]); // Only recalculate when node type changes
  
  // Determine if the node is being interacted with (for conditional rendering)
  const isNodeInteractive = hoveredPosition !== undefined || showAll;
  
  return (
    <LazyMotion features={domAnimation}>
      {/* Connection points container */}
      <div style={containerStyle}>
        {/* Connection points */}
        {Object.entries(connectionPoints).map(([position, point]) => {
          const positionKey = position as ConnectionPointPosition;
          const isHovered = hoveredPosition === positionKey;
          
          // Improved conditional rendering - only render if:
          // 1. The point is hovered, OR
          // 2. showAll is true, OR
          // 3. The node is being interacted with (any point is hovered)
          if (!isHovered && !showAll && !isNodeInteractive) {
            return null;
          }
          
          // Get the common handle style
          const handleStyle = getCommonHandleStyle(isHovered);
          
          // Position the handle at the exact calculated position
          const pointStyle: React.CSSProperties = {
            ...handleStyle,
            position: 'absolute',
            left: point.x,
            top: point.y,
          };
          
          return (
            <m.div
              key={`connection-${position}`}
              style={pointStyle}
              onClick={(e: React.MouseEvent) => handleInteraction(e, positionKey)}
              onMouseDown={(e: React.MouseEvent) => handleInteraction(e, positionKey)}
              onMouseEnter={() => onConnectionPointHover?.(positionKey)}
              onMouseLeave={() => onConnectionPointHover?.(null)}
              className="connection-point"
              data-testid={`connection-point-${position}`}
              // Only apply animations to hovered points for better performance
              animate={isHovered ? {
                boxShadow: [
                  '0 0 0 0 var(--primary)',    // Primary color
                  '0 0 0 12px transparent',   // Primary color expanded with 0% opacity
                  '0 0 0 0 transparent'       // Back to no shadow
                ]
              } : undefined}
              transition={isHovered ? {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              } : undefined}
            />
          );
        })}
      </div>
    </LazyMotion>
  );
};

export default ConnectionPoints; 
