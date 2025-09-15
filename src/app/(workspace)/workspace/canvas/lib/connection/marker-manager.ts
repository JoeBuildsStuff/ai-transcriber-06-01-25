// marker-manager.ts
// Manages marker styles, positioning, and rendering

import { Node } from '../store/canvas-store';
import { ConnectionPointPosition, FillStyle, MarkerInfo, MarkerShape, Point } from './connection-types';

/**
 * MarkerManager handles all marker-related operations
 */
export class MarkerManager {
  /**
   * Calculate offset for connection point based on marker
   */
  calculateMarkerOffset(
    position: ConnectionPointPosition,
    markerInfo: MarkerInfo
  ): number {
    // Default offset is 12px
    const baseOffset = 12;
    
    // If no marker or shape is 'none', no offset is needed
    if (!markerInfo || markerInfo.shape === 'none') {
      return 0;
    }
    
    // Different marker shapes may need different offsets
    let sizeMultiplier = 1;
    
    switch (markerInfo.shape) {
      case 'triangle':
        sizeMultiplier = 1.2;
        break;
      case 'arrow':
        sizeMultiplier = 1;
        break;
      case 'circle':
        sizeMultiplier = 0.8;
        break;
      case 'diamond':
        sizeMultiplier = 1.2;
        break;
      case 'square':
        sizeMultiplier = 1;
        break;
      default:
        sizeMultiplier = 1;
    }
    
    return baseOffset * sizeMultiplier;
  }
  
  /**
   * Calculate the angle for rendering a marker
   */
  calculateMarkerAngle(
    points: Point[],
    isStart: boolean,
    isElbowLineType: boolean
  ): number {
    if (points.length < 2) {
      return 0;
    }
    
    if (isElbowLineType && points.length > 2) {
      // For elbow lines, use the angle of the first or last segment
      if (isStart) {
        // Start marker - angle of first segment
        return Math.atan2(
          points[1].y - points[0].y,
          points[1].x - points[0].x
        ) * 180 / Math.PI;
      } else {
        // End marker - angle of last segment
        const lastIndex = points.length - 1;
        return Math.atan2(
          points[lastIndex].y - points[lastIndex-1].y,
          points[lastIndex].x - points[lastIndex-1].x
        ) * 180 / Math.PI;
      }
    } else {
      // For straight lines, calculate angle between endpoints
      const angle = Math.atan2(
        points[points.length-1].y - points[0].y,
        points[points.length-1].x - points[0].x
      ) * 180 / Math.PI;
      
      return angle;
    }
  }
  
  /**
   * Get marker properties from a line node
   */
  getMarkerPropertiesFromLine(
    line: Node, 
    isStartPoint: boolean,
    globalFillColor: string = '#4299e1'
  ): MarkerInfo {
    const { style, type, data } = line;
    
    // Extract marker settings from node data
    const startMarker = (data?.startMarker as MarkerShape) || 'none';
    const endMarker = (data?.endMarker as MarkerShape) || (type === 'arrow' ? 'triangle' : 'none');
    const markerFillStyle = (data?.markerFillStyle as FillStyle) || 'filled';
    
    // Get colors for markers
    const markerColor = (style?.borderColor as string) || 'black';
    // Use the node's backgroundColor, or data.fillColor, or the global fill color
    const markerFillColor = (style?.backgroundColor as string) || 
                           (data?.fillColor as string) || 
                           globalFillColor;
    
    return {
      shape: isStartPoint ? startMarker : endMarker,
      fillStyle: markerFillStyle,
      isStart: isStartPoint,
      color: markerColor,
      fillColor: markerFillColor
    };
  }
  
  /**
   * Create SVG path for a marker
   */
  createMarkerPath(markerInfo: MarkerInfo): string {
    const { shape } = markerInfo;
    const size = 10; // Base size for markers
    
    switch (shape) {
      case 'arrow':
        return `M 0,0 L ${-size},${-size/2} L ${-size*0.8},0 L ${-size},${size/2} Z`;
      
      case 'triangle':
        return `M 0,0 L ${-size},${-size/2} L ${-size},${size/2} Z`;
      
      case 'circle':
        return `M 0,0 A ${size/2} ${size/2} 0 1 0 0.001 0 Z`;
      
      case 'diamond':
        return `M 0,0 L ${-size/2},${-size/2} L ${-size},0 L ${-size/2},${size/2} Z`;
      
      case 'square':
        return `M ${-size/1.5},${-size/2} L ${-size/1.5},${size/2} L 0,${size/2} L 0,${-size/2} Z`;
      
      default:
        return '';
    }
  }
}

// Create and export the singleton instance
export const markerManager = new MarkerManager(); 