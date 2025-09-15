'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, ChevronUp, ChevronLeft } from 'lucide-react';
import { Node, useCanvasStore } from '../../lib/store/canvas-store';
import { connectionManager } from './../../lib/connection';
import { nodeRegistry } from '../../components/NodeRegistry';

interface DuplicateButtonProps {
  node: Node;
}

// Define the directions and their properties
type Direction = 'n' | 'e' | 's' | 'w';

// Define the duplicate offset distance
const DUPLICATE_OFFSET_DISTANCE = 420;

// Define button position constants
const BUTTON_OFFSET = 35; // Distance from the edge of the shape
const BUTTON_SIZE = 24; // Size of the button
const BUTTON_HALF_SIZE = BUTTON_SIZE / 2; // Half the size of the button

interface DirectionConfig {
  icon: React.ReactNode;
  position: (dimensions: { width: number; height: number }) => { x: number; y: number };
  hoverArea: (dimensions: { width: number; height: number }) => { 
    left: number; 
    top: number; 
    width: number; 
    height: number;
  };
  duplicateOffset: (dimensions: { width: number; height: number }) => { 
    x: number; 
    y: number;
  };
  sourcePosition: Direction;
  targetPosition: Direction;
}

const DuplicateButton: React.FC<DuplicateButtonProps> = ({ node }) => {
  const [hoveredDirection, setHoveredDirection] = useState<Direction | null>(null);
  const addNode = useCanvasStore(state => state.addNode);
  const createConnection = useCanvasStore(state => state.createConnection);

  // Configuration for each direction button
  const directionConfigs: Record<Direction, DirectionConfig> = {
    n: {
      icon: <ChevronUp className="h-4 w-4" />,
      position: (dim) => ({ 
        x: dim.width / 2 - BUTTON_HALF_SIZE, 
        y: -BUTTON_OFFSET - BUTTON_HALF_SIZE 
      }),
      hoverArea: (dim) => ({ 
        left: dim.width / 4, 
        top: -40, 
        width: dim.width / 2, 
        height: 50 
      }),
      duplicateOffset: (dim) => ({ 
        x: 0, 
        y: -dim.height - DUPLICATE_OFFSET_DISTANCE 
      }),
      sourcePosition: 'n',
      targetPosition: 's'
    },
    e: {
      icon: <ChevronRight className="h-4 w-4" />,
      position: (dim) => ({ 
        x: dim.width + BUTTON_OFFSET, 
        y: dim.height / 2 - BUTTON_HALF_SIZE 
      }),
      hoverArea: (dim) => ({ 
        left: dim.width - 10, 
        top: 0, 
        width: 50, 
        height: dim.height 
      }),
      duplicateOffset: (dim) => ({ 
        x: dim.width + DUPLICATE_OFFSET_DISTANCE, 
        y: 0 
      }),
      sourcePosition: 'e',
      targetPosition: 'w'
    },
    s: {
      icon: <ChevronDown className="h-4 w-4" />,
      position: (dim) => ({ 
        x: dim.width / 2 - BUTTON_HALF_SIZE, 
        y: dim.height + BUTTON_OFFSET 
      }),
      hoverArea: (dim) => ({ 
        left: dim.width / 4, 
        top: dim.height - 10, 
        width: dim.width / 2, 
        height: 50 
      }),
      duplicateOffset: (dim) => ({ 
        x: 0, 
        y: dim.height + DUPLICATE_OFFSET_DISTANCE 
      }),
      sourcePosition: 's',
      targetPosition: 'n'
    },
    w: {
      icon: <ChevronLeft className="h-4 w-4" />,
      position: (dim) => ({ 
        x: -BUTTON_OFFSET - BUTTON_HALF_SIZE, 
        y: dim.height / 2 - BUTTON_HALF_SIZE 
      }),
      hoverArea: (dim) => ({ 
        left: -40, 
        top: 0, 
        width: 50, 
        height: dim.height 
      }),
      duplicateOffset: (dim) => ({ 
        x: -dim.width - DUPLICATE_OFFSET_DISTANCE, 
        y: 0 
      }),
      sourcePosition: 'w',
      targetPosition: 'e'
    }
  };

  // Handle duplication in the specified direction
  const handleDuplicate = (e: React.MouseEvent, direction: Direction) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!node.dimensions) return;
    
    // Create a duplicate node
    const duplicatedNode = createDuplicateNode(direction);
    
    // If duplication was successful and we have the duplicated node
    if (duplicatedNode) {
      // Create a line connecting the original and duplicate shapes
      createConnectingLine(node, duplicatedNode, direction);
    }
  };

  // Create a duplicate node in the specified direction
  const createDuplicateNode = (direction: Direction): Node | undefined => {
    if (!node.dimensions) return undefined;
    
    // Get the configuration for this direction
    const config = directionConfigs[direction];
    
    // Calculate the offset for the duplicate
    const offset = config.duplicateOffset(node.dimensions);
    
    // Create a new ID for the duplicate
    const duplicateId = `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create a duplicate with the new position
    const duplicate: Node = {
      ...node,
      id: duplicateId,
      position: {
        x: node.position.x + offset.x,
        y: node.position.y + offset.y
      },
      selected: true
    };
    
    // Add the duplicate to the canvas
    addNode(duplicate);
    
    // Deselect all nodes and select only the duplicate
    useCanvasStore.getState().selectNode(duplicateId);
    
    return duplicate;
  };

  // Function to create a connecting line between two shapes
  const createConnectingLine = (sourceNode: Node, targetNode: Node, direction: Direction) => {
    // Get the configuration for this direction
    const config = directionConfigs[direction];

    // Create a unique ID for the line
    const lineId = `line-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Calculate connection points
    // Currently defaulting duplicate line to not include start or end markers
    // TODO: Make this configurable, let user choose if they want markers or not from the sidecontrols lineendpointcontrols.tsx
    const sourcePoint = connectionManager.calculateConnectionPoint(sourceNode, config.sourcePosition, { isConnected: true, startOrEnd: 'start' });
    const targetPoint = connectionManager.calculateConnectionPoint(targetNode, config.targetPosition, { isConnected: true, startOrEnd: 'end' });

    // Create the line node using NodeRegistry with default settings
    const baseNode = nodeRegistry.createNode('line', { x: sourcePoint.x, y: sourcePoint.y }, lineId);
    
    // Create the line node with the correct points
    const lineNode: Node = {
      ...baseNode,
      points: [
        { x: 0, y: 0 }, // First point at origin (relative to position)
        { x: targetPoint.x - sourcePoint.x, y: targetPoint.y - sourcePoint.y } // Second point relative to first
      ]
    };
    
    // Add the line to the canvas
    addNode(lineNode);
    
    // Create connections for both endpoints
    createConnection({
      sourceNodeId: lineId,
      sourcePointIndex: 0,
      targetNodeId: sourceNode.id,
      targetPosition: config.sourcePosition
    });
    
    createConnection({
      sourceNodeId: lineId,
      sourcePointIndex: 1,
      targetNodeId: targetNode.id,
      targetPosition: config.targetPosition
    });
  };

  // Common styles for the button
  const getButtonStyle = (direction: Direction): React.CSSProperties => {
    if (!node.dimensions) return {};
    
    const config = directionConfigs[direction];
    const position = config.position(node.dimensions);
    
    return {
      position: 'absolute',
      left: position.x,
      top: position.y,
      zIndex: 1000,
      opacity: hoveredDirection === direction ? 1 : 0,
      transform: `scale(${hoveredDirection === direction ? 1 : 0.9})`,
      transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
      pointerEvents: hoveredDirection === direction ? 'auto' : 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      border: '1px solid var(--border)',
      backgroundColor: 'var(--background)',
      backdropFilter: 'blur(4px)',
      cursor: 'pointer',
    };
  };

  // Create hover areas for each direction
  const getHoverAreaStyle = (direction: Direction): React.CSSProperties => {
    if (!node.dimensions) return {};
    
    const config = directionConfigs[direction];
    const area = config.hoverArea(node.dimensions);
    
    return {
      position: 'absolute',
      left: area.left,
      top: area.top,
      width: area.width,
      height: area.height,
      zIndex: 500,
    };
  };

  // Only render if we have dimensions
  if (!node.dimensions) return null;

  return (
    <>
      {/* Render buttons for all four directions */}
      {(Object.keys(directionConfigs) as Direction[]).map(direction => (
        <React.Fragment key={direction}>
          {/* Invisible hover area */}
          <div 
            style={getHoverAreaStyle(direction)}
            onMouseEnter={() => setHoveredDirection(direction)}
            onMouseLeave={() => setHoveredDirection(null)}
            data-testid={`duplicate-hover-area-${direction}`}
          />
          
          {/* Actual button */}
          <div
            style={getButtonStyle(direction)}
            onMouseEnter={() => setHoveredDirection(direction)}
            onMouseLeave={() => setHoveredDirection(null)}
            onClick={(e) => handleDuplicate(e, direction)}
            title={`Duplicate shape to the ${direction === 'n' ? 'north' : direction === 'e' ? 'east' : direction === 's' ? 'south' : 'west'}`}
          >
            {directionConfigs[direction].icon}
          </div>
        </React.Fragment>
      ))}
    </>
  );
};

export default DuplicateButton; 
