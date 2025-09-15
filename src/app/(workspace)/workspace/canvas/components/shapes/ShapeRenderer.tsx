import React from 'react';
import { Node } from '../../lib/store/canvas-store';
import ResizeHandles, { ResizeHandleDirection } from '../ui/ResizeHandles';
import ConnectionPoints from '../ui/ConnectionPoints';
import { ConnectionPointPosition } from './../../lib/connection';
import LineShape from './LineShape';
import LineResizeHandles from '../ui/LineResizeHandles';
import TextShape from './TextShape';
import IconShape from './IconShape';
import DuplicateButton from '../ui/DuplicateButton';

interface ShapeRendererProps {
  node: Node;
  isSelected?: boolean;
  activeTool: string;
  onSelect: (id: string) => void;
  onResize: (nodeId: string, direction: ResizeHandleDirection, dx: number, dy: number) => void;
  onConnectionPointClick: (nodeId: string, position: ConnectionPointPosition) => void;
  hoveredConnectionPoint: { nodeId: string; position: ConnectionPointPosition } | null;
  selectedLineEndpoint: { nodeId: string; pointIndex: number } | null;
  onTextChange?: (nodeId: string, text: string) => void;
  onEmptyText?: (nodeId: string) => void;
}

const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  node,
  isSelected = false,
  activeTool,
  onSelect,
  onResize,
  onConnectionPointClick,
  hoveredConnectionPoint,
  selectedLineEndpoint,
  onTextChange,
  onEmptyText
}) => {
  const { id, type, position, dimensions, style, data } = node;

  if (!dimensions) return null;

  // Determine if we should show connection points
  // Show connection points when:
  // 1. Line/arrow tool is active, OR
  // 2. A line endpoint is selected (to allow connecting it to a shape)
  // 3. OR when a connection point is being hovered
  const showConnectionPoints = 
    ((['arrow', 'line'].includes(activeTool) || selectedLineEndpoint !== null) && 
     !data?.isGroup && 
     !node.points) ||
    // Don't show connection points on the line that has the selected endpoint
    (selectedLineEndpoint !== null && 
     selectedLineEndpoint.nodeId !== id && 
     !data?.isGroup && 
     !node.points) ||
    // Show connection points when one is being hovered
    (hoveredConnectionPoint && hoveredConnectionPoint.nodeId === id);

  // Always enable pointer events for the container when line/arrow tool is active
  // or when a line endpoint is selected
  const pointerEventsValue = isSelected || ['arrow', 'line'].includes(activeTool) || selectedLineEndpoint !== null ? 'auto' : 'none';

  // Determine if this node has a hovered connection point
  const hoveredPosition = hoveredConnectionPoint && hoveredConnectionPoint.nodeId === id 
    ? hoveredConnectionPoint.position 
    : undefined;

  // Determine if this shape is a potential connection target
  const isPotentialTarget = selectedLineEndpoint !== null && 
                           selectedLineEndpoint.nodeId !== id && 
                           !data?.isGroup && 
                           !node.points;

  // For line and arrow shapes, we want to make the container non-interactive
  // so that clicks only register on the actual line segments (handled in Canvas.tsx)
  const isLineShape = ['line', 'arrow'].includes(type) && node.points && node.points.length >= 2;
  
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${position.x}px`,
    top: `${position.y}px`,
    width: dimensions ? `${dimensions.width}px` : 'auto',
    height: dimensions ? `${dimensions.height}px` : 'auto',
    zIndex: isSelected ? 10 : 1,
    pointerEvents: isLineShape && !isSelected ? 'none' : pointerEventsValue,
    cursor: isSelected ? 'move' : 'default',
    userSelect: 'none',
    touchAction: 'none',
    boxSizing: 'border-box',
  };

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    backgroundColor: (style?.backgroundColor as string) || 'white',
    border: `${(style?.borderWidth as number) || 2}px ${(style?.borderStyle as string) || 'solid'} ${(style?.borderColor as string) || 'black'}`,
    borderRadius: (style?.borderRadius as string) || '0px',
    boxSizing: 'border-box',
    cursor: 'move',
  };

  const renderShape = () => {
    switch (type) {
      case 'rectangle':
        // If this is an icon rectangle, render the IconShape component
        if (data?.isIcon) {
          return <IconShape node={node} />;
        }
        return <div style={baseStyle} />;

      case 'circle':
        return <div style={{ ...baseStyle, borderRadius: '50%' }} />;

      case 'diamond':
        return (
          <div 
            style={{ 
              ...baseStyle,
              transform: 'rotate(45deg)',
              transformOrigin: 'center'
            }} 
          />
        );

      case 'cylinder':
        const cylinderTopRadius = '50% 50% 0 0 / 20% 20% 0 0';
        const customRadius = (style?.borderRadius as string) || '0px';
        const radiusValue = parseInt((customRadius.match(/\d+/) || ['0'])[0], 10);
        const cylinderBottomRadius = `0 0 ${radiusValue * 2}% ${radiusValue * 2}% / 0 0 ${radiusValue}% ${radiusValue}%`;
        
        return (
          <div 
            style={{ 
              ...baseStyle,
              borderRadius: cylinderTopRadius,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: '20%',
              borderTop: `${(style?.borderWidth as number) || 2}px solid ${(style?.borderColor as string) || 'black'}`,
              borderRadius: cylinderBottomRadius,
            }} />
          </div>
        );

      case 'triangle':
        return (
          <svg 
            width={dimensions.width} 
            height={dimensions.height} 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          >
            <polygon 
              points={`${dimensions.width/2},0 0,${dimensions.height} ${dimensions.width},${dimensions.height}`}
              fill={style?.backgroundColor as string || 'transparent'}
              stroke={style?.borderColor as string || 'black'}
              strokeWidth={style?.borderWidth as number || 2}
              strokeLinejoin="round"
              strokeDasharray={style?.borderStyle === 'dashed' ? '5,5' : style?.borderStyle === 'dotted' ? '2,2' : 'none'}
            />
          </svg>
        );

      case 'text':
        return (
          <TextShape 
            node={node} 
            isSelected={isSelected}
            onTextChange={onTextChange}
            onEmpty={onEmptyText}
          />
        );

      case 'icon':
        return <IconShape node={node} />;

      case 'arrow':
      case 'line':
        if (node.points && node.points.length > 1) {
          // Determine if this line has a selected endpoint
          const selectedEndpointIndex = selectedLineEndpoint && selectedLineEndpoint.nodeId === id
            ? selectedLineEndpoint.pointIndex
            : undefined;
          
          return <LineShape 
            node={node} 
            isSelected={isSelected} 
            selectedEndpoint={selectedEndpointIndex}
          />;
        }
        return null;

      default:
        return <div style={baseStyle} />;
    }
  };

  // Handle connection point click
  const handleConnectionPointClick = (nodeId: string, position: ConnectionPointPosition) => {
    onConnectionPointClick(nodeId, position);
  };

  return (
    <div 
      style={containerStyle}
      className={`node ${isSelected ? 'selected' : ''} ${isPotentialTarget ? 'potential-target' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        if (activeTool === 'select') {
          onSelect(id);
        }
      }}
    >
      {renderShape()}
      {isSelected && dimensions && (
        <>
          {['line', 'arrow'].includes(type) && node.points && node.points.length >= 2 ? (
            <LineResizeHandles 
              node={node} 
              onResize={onResize} 
            />
          ) : (
            <ResizeHandles 
              node={node} 
              onResize={onResize} 
            />
          )}
        </>
      )}
      {showConnectionPoints && dimensions && (
        <ConnectionPoints 
          node={node}
          onConnectionPointClick={handleConnectionPointClick}
          hoveredPosition={hoveredPosition}
        />
      )}
      
      {/* Add DuplicateButton for non-line shapes */}
      {!['line', 'arrow'].includes(type) && !data?.isGroup && dimensions && (
        <DuplicateButton node={node} />
      )}
    </div>
  );
};

export default ShapeRenderer; 
