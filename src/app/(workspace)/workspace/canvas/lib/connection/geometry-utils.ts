// geometry-utils.ts
// Pure geometric calculations without node or shape dependencies

import { Point } from './connection-types';

/**
 * Calculate distance from a point to a line segment
 */
export function distanceToLineSegment(
  x: number, y: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const lengthSquared = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  
  if (lengthSquared === 0) return Math.sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1));
  
  const t = Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / lengthSquared));
  
  const projectionX = x1 + t * (x2 - x1);
  const projectionY = y1 + t * (y2 - y1);
  
  return Math.sqrt((x - projectionX) * (x - projectionX) + (y - projectionY) * (y - projectionY));
}

/**
 * Check if two line segments intersect
 */
export function lineSegmentsIntersect(
  x1: number, y1: number, x2: number, y2: number, // First line segment
  x3: number, y3: number, x4: number, y4: number  // Second line segment
): boolean {
  // Calculate the direction of the lines
  const d1x = x2 - x1;
  const d1y = y2 - y1;
  const d2x = x4 - x3;
  const d2y = y4 - y3;
  
  // Calculate the determinant
  const det = d1x * d2y - d1y * d2x;
  
  // If determinant is zero, lines are parallel
  if (det === 0) return false;
  
  // Calculate the parameters for the intersection point
  const s = ((x1 - x3) * d2y - (y1 - y3) * d2x) / det;
  const t = ((x1 - x3) * d1y - (y1 - y3) * d1x) / det;
  
  // Check if the intersection point is within both line segments
  return s >= 0 && s <= 1 && t >= 0 && t <= 1;
}

/**
 * Calculate the bounding box for an array of points
 */
export function calculateBoundingBox(
  points: Point[], 
  padding: number = 10
): { 
  dimensions: { width: number; height: number }; 
  positionAdjustment: Point | null;
  pointAdjustments: Point;
} {
  // Find the min/max coordinates from all points
  const allX = points.map(p => p.x);
  const allY = points.map(p => p.y);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  
  // Add padding to the bounding box
  const paddedMinX = minX - padding;
  const paddedMaxX = maxX + padding;
  const paddedMinY = minY - padding;
  const paddedMaxY = maxY + padding;
  
  // Calculate dimensions with padding
  const width = Math.max(paddedMaxX - paddedMinX, 1);
  const height = Math.max(paddedMaxY - paddedMinY, 1);
  
  // Check if we need to adjust the position
  if (paddedMinX < 0 || paddedMinY < 0) {
    // Need to adjust position and all points
    return {
      dimensions: { width, height },
      positionAdjustment: { x: paddedMinX, y: paddedMinY },
      pointAdjustments: { x: -paddedMinX, y: -paddedMinY }
    };
  } else {
    // No position adjustment needed
    return {
      dimensions: { 
        width: Math.max(paddedMaxX, 1), 
        height: Math.max(paddedMaxY, 1) 
      },
      positionAdjustment: null,
      pointAdjustments: { x: 0, y: 0 }
    };
  }
}

/**
 * Create a deep copy of an object without using JSON.parse/stringify
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }

  const clonedObj = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }

  return clonedObj;
}

/**
 * Check if a point is inside a rectangle
 */
export function pointInsideRect(
  point: Point,
  rectPosition: Point,
  rectDimensions: { width: number; height: number }
): boolean {
  return (
    point.x >= rectPosition.x &&
    point.x <= rectPosition.x + rectDimensions.width &&
    point.y >= rectPosition.y &&
    point.y <= rectPosition.y + rectDimensions.height
  );
} 