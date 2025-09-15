import React from 'react';
import { Node, MarkerShape, FillStyle } from '../../lib/store/canvas-store';
import Marker from '../shapes/Marker';
import { isElbowLine, generateRoundedElbowPathData } from './../../lib/connection';
import { useCanvasStore } from '../../lib/store/canvas-store';

interface LineInProgressProps {
  lineInProgress: Node;
}

const LineInProgress: React.FC<LineInProgressProps> = ({
  lineInProgress
}) => {
  const { position, dimensions, points, style, type, data } = lineInProgress;
  // Get global fillColor from store to use for markers
  const globalFillColor = useCanvasStore(state => state.fillColor);

  // Extract marker settings from node data
  const startMarker = (data?.startMarker as MarkerShape) || 'none';
  const endMarker = (data?.endMarker as MarkerShape) || (type === 'arrow' ? 'triangle' : 'none');
  const markerFillStyle = (data?.markerFillStyle as FillStyle) || 'filled';

  if (!points || points.length < 1 || !dimensions) return null;

  // Get colors for markers
  const markerColor = (style?.borderColor as string) || 'black';
  // Use the node's backgroundColor, or data.fillColor, or the global fill color, or fall back to a default
  const markerFillColor = (style?.backgroundColor as string) || 
                         (data?.fillColor as string) || 
                         (typeof globalFillColor === 'string' ? globalFillColor : '#4299e1'); // Use global fill or default

  // Calculate angles for markers if we have enough points
  let startAngle = 0;
  let endAngle = 0;

  if (points.length > 1) {
    const isElbowLineNode = isElbowLine(lineInProgress);
    
    if (isElbowLineNode && points.length > 2) {
      // For elbow connectors, use the angle of the first segment for start marker
      startAngle = Math.atan2(
        points[1].y - points[0].y,
        points[1].x - points[0].x
      ) * 180 / Math.PI;
      
      // And the angle of the last segment for end marker
      const lastIndex = points.length - 1;
      endAngle = Math.atan2(
        points[lastIndex].y - points[lastIndex-1].y,
        points[lastIndex].x - points[lastIndex-1].x
      ) * 180 / Math.PI;
    } else {
      // For straight lines, calculate the angle between endpoints
      startAngle = Math.atan2(
        points[points.length-1].y - points[0].y,
        points[points.length-1].x - points[0].x
      ) * 180 / Math.PI;
      
      endAngle = startAngle;
    }
  }

  // Create SVG path
  let pathData = '';
  
  const isElbowLineNode = isElbowLine(lineInProgress);
  
  if (isElbowLineNode && points.length >= 3) {
    // For elbow connectors, use rounded corners
    // Use the border radius from style, or default to 8
    const cornerRadius = parseInt((style?.borderRadius as string) || '8', 10);
    pathData = generateRoundedElbowPathData(points, cornerRadius);
  } else if (points.length >= 2) {
    // For straight lines or incomplete elbow, just connect the points we have
    pathData = points.reduce((path, point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }
      return `${path} L ${point.x} ${point.y}`;
    }, '');
  } else {
    // Just a single point
    pathData = `M ${points[0].x} ${points[0].y}`;
  }

  return (
    <div 
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        pointerEvents: 'none',
      }}
    >
      <svg 
        width="100%" 
        height="100%" 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'visible'
        }}
      >
        {/* Main path */}
        <path 
          d={pathData}
          fill="none"
          stroke={markerColor}
          strokeWidth={(style?.borderWidth as number) || 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={(style?.borderStyle as string) === 'dashed' ? '5,5' : (style?.borderStyle as string) === 'dotted' ? '2,2' : 'none'}
        />
        
        {/* Start marker */}
        {startMarker !== 'none' && points.length > 1 && (
          <Marker
            shape={startMarker}
            fillStyle={markerFillStyle}
            isStart={true}
            color={markerColor}
            fillColor={markerFillColor}
            x={points[0].x}
            y={points[0].y}
            angle={startAngle}
          />
        )}
        
        {/* End marker */}
        {endMarker !== 'none' && points.length > 1 && (
          <Marker
            shape={endMarker}
            fillStyle={markerFillStyle}
            isStart={false}
            color={markerColor}
            fillColor={markerFillColor}
            x={points[points.length-1].x}
            y={points[points.length-1].y}
            angle={endAngle}
          />
        )}
        
        {/* Control points */}
        {points.map((point, index) => (
          <circle
            key={`point-${index}`}
            cx={point.x}
            cy={point.y}
            r={6}
            className="stroke-border stroke-[1.5] cursor-move fill-background"
          />
        ))}
      </svg>
    </div>
  );
};

export default LineInProgress; 
