// line-routing-utils.ts
// Line routing and path generation utilities

import { ConnectionPointPosition, ElbowRouteOptions, Point } from './connection-types';

/**
 * Check if a node is an elbow line by looking at its data properties
 */
export function isElbowLine(node: { data?: { lineType?: string } }): boolean {
  return node.data?.lineType === 'elbow';
}

/**
 * Generate points for a single elbow connector between two points
 */
export function generateElbowConnector(
  startPoint: Point,
  endPoint: Point,
  startPosition?: ConnectionPointPosition,
  endPosition?: ConnectionPointPosition,
  options?: ElbowRouteOptions
): Point[] {
  // Start with the simplest case - just the two endpoints in a straight line
  const points: Point[] = [
    { x: startPoint.x, y: startPoint.y },
    { x: endPoint.x, y: endPoint.y }
  ];
  
  // Calculate the direct distance between the two points
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // If the points are very close, just use a straight line
  if (distance < 20) {
    return points;
  }
  
  // Determine which direction to go first (horizontal or vertical)
  const startHorizontal = determineOptimalElbowDirection(
    startPoint, 
    endPoint, 
    startPosition, 
    endPosition,
    options
  );
  
  // Clear the existing points array and rebuild with a single elbow
  points.length = 0;
  
  // First point is always the start point
  points.push({ x: startPoint.x, y: startPoint.y });
  
  // Calculate the elbow point
  let elbowX: number;
  let elbowY: number;
  
  if (startHorizontal) {
    elbowX = endPoint.x;
    elbowY = startPoint.y;
  } else {
    elbowX = startPoint.x;
    elbowY = endPoint.y;
  }
  
  // Add the elbow point
  points.push({ x: elbowX, y: elbowY });
  
  // Add the end point
  points.push({ x: endPoint.x, y: endPoint.y });
  
  return points;
}

/**
 * Determine the optimal direction for the elbow connector
 */
export function determineOptimalElbowDirection(
  startPoint: Point,
  endPoint: Point,
  startPosition?: ConnectionPointPosition,
  endPosition?: ConnectionPointPosition,
  options?: ElbowRouteOptions
): boolean {
  // If options explicitly specify a preference, use that
  if (options?.preferHorizontalFirst !== undefined) {
    return options.preferHorizontalFirst;
  }
  
  // Calculate the direct distances
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  
  // Default to horizontal first
  let startHorizontal = true;
  
  // If we have a defined start position, use that to help determine direction
  if (startPosition) {
    if (startPosition === 'n' || startPosition === 's') {
      startHorizontal = false;
    }
    else if (startPosition === 'e' || startPosition === 'w') {
      startHorizontal = true;
    }
    else {
      startHorizontal = Math.abs(dx) > Math.abs(dy);
    }
  } 
  // If no start position but we have end position
  else if (endPosition) {
    if (endPosition === 'n' || endPosition === 's') {
      startHorizontal = true;
    }
    else if (endPosition === 'e' || endPosition === 'w') {
      startHorizontal = false;
    }
    else {
      startHorizontal = Math.abs(dx) > Math.abs(dy);
    }
  }
  // If no connection positions specified, use the dominant axis
  else {
    startHorizontal = Math.abs(dx) > Math.abs(dy);
  }
  
  return startHorizontal;
}

/**
 * Adjust the middle point of an elbow connection when an endpoint is dragged
 */
export function adjustElbowMiddlePoint(
  points: Point[],
  draggedPointIndex: number
): Point[] {
  // Only works for 3-point elbow lines
  if (points.length !== 3) return [...points];
  
  // Make a copy of the points array
  const adjustedPoints = [...points];
  
  // Determine which point is being dragged (0 for start, 2 for end)
  if (draggedPointIndex === 0 || draggedPointIndex === 2) {
    const startPoint = points[0];
    const endPoint = points[2];
    const middlePoint = points[1];
    
    // If start point is dragged, adjust middle point's y to match new start
    if (draggedPointIndex === 0) {
      adjustedPoints[1] = { 
        x: middlePoint.x, 
        y: startPoint.y 
      };
    } 
    // If end point is dragged, adjust middle point's x to match new end
    else {
      adjustedPoints[1] = { 
        x: endPoint.x, 
        y: middlePoint.y 
      };
    }
  }
  
  return adjustedPoints;
}

/**
 * Generate SVG path data for a rounded elbow connector
 */
export function generateRoundedElbowPathData(
  points: Point[],
  cornerRadius: number = 8
): string {
  if (points.length < 2) return '';
  
  // If only 2 points, it's a straight line
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  
  // For elbow lines with corners
  let pathData = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 1; i < points.length - 1; i++) {
    const curr = points[i];
    const prev = points[i - 1];
    const next = points[i + 1];
    
    // Calculate the direction vectors
    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };
    
    // Normalize the vectors
    const v1Length = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const v2Length = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    
    if (v1Length === 0 || v2Length === 0) {
      // If either segment has zero length, just draw a straight line to the next point
      pathData += ` L ${next.x} ${next.y}`;
      continue;
    }
    
    const v1Norm = { x: v1.x / v1Length, y: v1.y / v1Length };
    const v2Norm = { x: v2.x / v2Length, y: v2.y / v2Length };
    
    // Calculate the rounded corner radius (can't be larger than half of either segment)
    const maxRadius = Math.min(v1Length / 2, v2Length / 2, cornerRadius);
    
    // Calculate the start and end points of the curve
    const curveStart = {
      x: curr.x - v1Norm.x * maxRadius,
      y: curr.y - v1Norm.y * maxRadius
    };
    
    const curveEnd = {
      x: curr.x + v2Norm.x * maxRadius,
      y: curr.y + v2Norm.y * maxRadius
    };
    
    // Add a line to the start of the curve, then a quadratic bezier curve
    pathData += ` L ${curveStart.x} ${curveStart.y} Q ${curr.x} ${curr.y}, ${curveEnd.x} ${curveEnd.y}`;
  }
  
  // Add the final line to the last point
  pathData += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
  
  return pathData;
}

/**
 * Convert a straight line to an elbow line
 */
export function convertStraightToElbow(line: { 
  points?: Point[],
  data?: Record<string, unknown>,
  position?: Point,
  dimensions?: { width: number, height: number }
}): typeof line {
  // Check if it's already an elbow line
  if (isElbowLine(line)) return line;
  
  // Must have at least 2 points to convert
  if (!line.points || line.points.length < 2) return line;
  
  // Create a deep copy of the line
  const updatedLine = { ...line, points: [...line.points] };
  
  // Get the start and end points
  const startPoint = line.points[0];
  const endPoint = line.points[line.points.length - 1];
  
  // Calculate the midpoint - only use midX since we're going horizontally first
  const midX = (startPoint.x + endPoint.x) / 2;
  
  // Create an elbow connector with three points
  // For simplicity, we'll make the elbow go horizontally first
  updatedLine.points = [
    { x: startPoint.x, y: startPoint.y },
    { x: midX, y: startPoint.y },
    { x: endPoint.x, y: endPoint.y }
  ];
  
  // Mark as an elbow line
  if (!updatedLine.data) updatedLine.data = {};
  updatedLine.data.lineType = 'elbow';
  
  return updatedLine;
}

/**
 * Convert an elbow line to a straight line
 */
export function convertElbowToStraight(line: {
  points?: Point[],
  data?: Record<string, unknown>
}): typeof line {
  // Check if it's an elbow line
  if (!isElbowLine(line)) return line;
  
  // Create a deep copy of the line
  const updatedLine = { ...line };
  
  // Must have points to convert
  if (!line.points || line.points.length < 2) return line;
  
  // Keep only the first and last points
  updatedLine.points = [
    line.points[0],
    line.points[line.points.length - 1]
  ];
  
  // Remove the elbow line marker
  if (updatedLine.data) {
    updatedLine.data = { ...updatedLine.data };
    delete updatedLine.data.lineType;
  }
  
  return updatedLine;
} 