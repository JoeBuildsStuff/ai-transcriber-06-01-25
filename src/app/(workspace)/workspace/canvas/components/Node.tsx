'use client';

import React, { useRef } from 'react';
import { Node as NodeType } from '../lib/store/canvas-store';

interface NodeProps {
  node: NodeType;
  onSelect: (nodeId: string, event: React.MouseEvent) => void;
  onDragStart: (nodeId: string, x: number, y: number) => void;
  onDrag: (nodeId: string, dx: number, dy: number) => void;
  onDragEnd: () => void;
  onResizeStart: (nodeId: string, direction: string, x: number, y: number) => void;
  onResizeEnd: () => void;
  snapToGrid: boolean;
  gridSize: number;
  isSelected: boolean;
  zIndex?: number;
}

const Node: React.FC<NodeProps> = ({
  node,
  onSelect,
  onDragStart,
  onResizeStart,
  isSelected,
  zIndex = 1
}) => {
  const { id, type, position, dimensions, style } = node;
  const nodeRef = useRef<HTMLDivElement>(null);
  
  if (!dimensions) return null;
  
  // Base styles for all nodes
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${position.x}px`,
    top: `${position.y}px`,
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
    backgroundColor: (style?.backgroundColor as string) || 'white',
    border: `${(style?.borderWidth as number) || 2}px solid ${(style?.borderColor as string) || 'black'}`,
    boxSizing: 'border-box',
    cursor: 'move',
    zIndex: zIndex,
    ...(isSelected ? { boxShadow: '0 0 0 2px blue' } : {})
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(id, e);
    
    // Check if we're clicking on a resize handle
    const target = e.target as HTMLElement;
    if (target.dataset.handle) {
      onResizeStart(id, target.dataset.handle, e.clientX, e.clientY);
    } else {
      onDragStart(id, e.clientX, e.clientY);
    }
  };
  
  // Render different shapes based on type
  let shapeElement;
  switch (type) {
    case 'rectangle':
      shapeElement = <div style={baseStyle} onMouseDown={handleMouseDown} data-testid="node-element" />;
      break;
      
    case 'circle':
      shapeElement = (
        <div 
          style={{ 
            ...baseStyle, 
            borderRadius: '50%' 
          }} 
          onMouseDown={handleMouseDown}
          data-testid="node-element"
        />
      );
      break;
      
    case 'diamond':
      shapeElement = (
        <div 
          style={{ 
            ...baseStyle,
            transform: 'rotate(45deg)',
            transformOrigin: 'center'
          }} 
          onMouseDown={handleMouseDown}
          data-testid="node-element"
        />
      );
      break;
      
    case 'cylinder':
      shapeElement = (
        <div 
          style={{ 
            ...baseStyle,
            borderRadius: '50% 50% 0 0 / 20% 20% 0 0',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseDown={handleMouseDown}
          data-testid="node-element"
        >
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '20%',
            borderTop: `${(style?.borderWidth as number) || 2}px solid ${(style?.borderColor as string) || 'black'}`,
            borderRadius: '0 0 50% 50% / 0 0 20% 20%',
          }} />
        </div>
      );
      break;
      
    case 'arrow':
    case 'line':
      shapeElement = (
        <div 
          style={{ 
            ...baseStyle,
            height: `${(style?.borderWidth as number) || 2}px`,
            border: 'none',
            backgroundColor: (style?.borderColor as string) || 'black',
          }} 
          onMouseDown={handleMouseDown}
          data-testid="node-element"
        >
          {type === 'arrow' && (
            <div style={{
              position: 'absolute',
              right: '-10px',
              top: '-8px',
              width: '0',
              height: '0',
              borderTop: '10px solid transparent',
              borderBottom: '10px solid transparent',
              borderLeft: `15px solid ${(style?.borderColor as string) || 'black'}`,
            }} />
          )}
        </div>
      );
      break;
      
    case 'text':
      shapeElement = (
        <div
          style={{
            ...baseStyle,
            border: 'none',
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontFamily: 'sans-serif',
            color: (style?.color as string) || 'black',
            padding: '8px',
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
          }}
          onMouseDown={handleMouseDown}
          data-testid="node-element"
        >
          {(node.data?.text as string) || 'Text'}
        </div>
      );
      break;
      
    default:
      shapeElement = <div style={baseStyle} onMouseDown={handleMouseDown} data-testid="node-element" />;
  }
  
  // If selected, add resize handles
  if (isSelected) {
    // For other node types, use the existing resize handles
    if (!['line', 'arrow'].includes(type)) {
      const handleSize = 8;
      const handleStyle: React.CSSProperties = {
        position: 'absolute',
        width: `${handleSize}px`,
        height: `${handleSize}px`,
        backgroundColor: 'white',
        border: '1px solid blue',
        borderRadius: '50%',
        zIndex: zIndex + 1,
      };
      
      const handleResizeStart = (e: React.MouseEvent, direction: string) => {
        e.stopPropagation();
        onResizeStart(id, direction, e.clientX, e.clientY);
      };
      
      return (
        <div ref={nodeRef}>
          {shapeElement}
          
          {/* Resize handles */}
          <div 
            data-handle="nw" 
            style={{ ...handleStyle, left: `${position.x - handleSize / 2}px`, top: `${position.y - handleSize / 2}px`, cursor: 'nwse-resize' }}
            onMouseDown={(e) => handleResizeStart(e, "nw")}
          />
          <div 
            data-handle="ne" 
            style={{ ...handleStyle, left: `${position.x + dimensions.width - handleSize / 2}px`, top: `${position.y - handleSize / 2}px`, cursor: 'nesw-resize' }}
            onMouseDown={(e) => handleResizeStart(e, "ne")}
          />
          <div 
            data-handle="sw" 
            style={{ ...handleStyle, left: `${position.x - handleSize / 2}px`, top: `${position.y + dimensions.height - handleSize / 2}px`, cursor: 'nesw-resize' }}
            onMouseDown={(e) => handleResizeStart(e, "sw")}
          />
          <div 
            data-handle="se" 
            style={{ ...handleStyle, left: `${position.x + dimensions.width - handleSize / 2}px`, top: `${position.y + dimensions.height - handleSize / 2}px`, cursor: 'nwse-resize' }}
            onMouseDown={(e) => handleResizeStart(e, "se")}
          />
          
          {/* Edge handles */}
          <div 
            data-handle="w" 
            style={{ ...handleStyle, left: `${position.x - handleSize / 2}px`, top: `${position.y + dimensions.height / 2 - handleSize / 2}px`, cursor: 'ew-resize' }}
            onMouseDown={(e) => handleResizeStart(e, "w")}
          />
          <div 
            data-handle="e" 
            style={{ ...handleStyle, left: `${position.x + dimensions.width - handleSize / 2}px`, top: `${position.y + dimensions.height / 2 - handleSize / 2}px`, cursor: 'ew-resize' }}
            onMouseDown={(e) => handleResizeStart(e, "e")}
          />
          <div 
            data-handle="n" 
            style={{ ...handleStyle, left: `${position.x + dimensions.width / 2 - handleSize / 2}px`, top: `${position.y - handleSize / 2}px`, cursor: 'ns-resize' }}
            onMouseDown={(e) => handleResizeStart(e, "n")}
          />
          <div 
            data-handle="s" 
            style={{ ...handleStyle, left: `${position.x + dimensions.width / 2 - handleSize / 2}px`, top: `${position.y + dimensions.height - handleSize / 2}px`, cursor: 'ns-resize' }}
            onMouseDown={(e) => handleResizeStart(e, "s")}
          />
        </div>
      );
    }
  }
  
  return <div ref={nodeRef}>{shapeElement}</div>;
};

export default Node; 