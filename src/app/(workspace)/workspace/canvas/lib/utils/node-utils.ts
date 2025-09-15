// ======================================================
// node-utils.ts - Node Calculation and Processing Utilities
// ======================================================
//
// Purpose:
// - Provides utility functions for node operations
// - Implements geometric calculations for nodes
// - Contains helper functions for node positioning and detection
// - Manages alignment, intersection, and proximity calculations
//
// This file should contain:
// - Pure utility functions for working with nodes
// - Geometric algorithms (distance, intersection, etc.)
// - Bounding box and collision detection logic
// - Alignment and snapping calculations
// - Position and dimension calculations
//
// Add to this file when:
// - Creating new mathematical utilities for nodes
// - Implementing geometric algorithms for canvas operations
// - Adding helper functions for node manipulation
// - Creating detection/calculation utilities
// - Adding export/import utilities for nodes
//
// Example future additions:
// - Implementing grid-snap adjustment utilities
// - Adding automatic layout algorithms
// - Creating distribution and alignment helpers
// - Implementing connection path optimization
// - Adding node grouping/ungrouping utilities
//
// DON'T add to this file:
// - React component code
// - UI rendering logic
// - State management logic
// - Event handlers (use hooks)
// - Store-specific operations
// ======================================================

import { Node } from '../store/canvas-store';
// Use centralized geometry and routing utilities
import { distanceToLineSegment, lineSegmentsIntersect, isElbowLine } from './../connection';

// Find a node at a specific position
export function findNodeAtPosition(
  x: number, 
  y: number, 
  nodes: Node[],
  transform: { x: number; y: number; zoom: number }
): Node | undefined {
  if (!nodes) return undefined;
  
  // First check groups
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    const { position, dimensions } = node;
    
    if (node.data?.isGroup === true && dimensions) {
      if (
        x >= position.x && 
        x <= position.x + dimensions.width && 
        y >= position.y && 
        y <= position.y + dimensions.height
      ) {
        return node;
      }
    }
  }
  
  // Check for line segments first - use proximity detection instead of bounding box
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    
    // For lines and arrows, check if the click is close to any segment
    if ((node.type === 'line' || node.type === 'arrow') && node.points && node.points.length > 1) {
      // Check each segment of the line
      for (let j = 0; j < node.points.length - 1; j++) {
        const p1 = {
          x: node.position.x + node.points[j].x,
          y: node.position.y + node.points[j].y
        };
        const p2 = {
          x: node.position.x + node.points[j + 1].x,
          y: node.position.y + node.points[j + 1].y
        };
        
        // Calculate distance from click to this line segment
        const distance = distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
        
        // If click is close enough to the line segment (within 10px / zoom), return this node
        if (distance * transform.zoom <= 10) {
          return node;
        }
      }
    }
  }
  
  // Then check regular nodes using bounding box
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    const { position, dimensions, parentId } = node;
    
    // Skip lines (already checked above), groups, and nodes with parents
    if (parentId || node.data?.isGroup === true || node.type === 'line' || node.type === 'arrow') continue;
    
    if (!dimensions) continue;
    
    if (
      x >= position.x && 
      x <= position.x + dimensions.width && 
      y >= position.y && 
      y <= position.y + dimensions.height
    ) {
      return node;
    }
  }
  
  return undefined;
}

// Check if a node is within the selection box
export function isNodeInSelectionBox(
  node: Node, 
  selectionBox: { start: { x: number, y: number }, end: { x: number, y: number } }
): boolean {
  if (!node.dimensions) return false;
  
  const boxLeft = Math.min(selectionBox.start.x, selectionBox.end.x);
  const boxRight = Math.max(selectionBox.start.x, selectionBox.end.x);
  const boxTop = Math.min(selectionBox.start.y, selectionBox.end.y);
  const boxBottom = Math.max(selectionBox.start.y, selectionBox.end.y);
  
  // Special handling for line and arrow nodes
  if ((node.type === 'line' || node.type === 'arrow') && node.points && node.points.length > 1) {
    // Check if any segment of the line intersects with the selection box
    for (let i = 0; i < node.points.length - 1; i++) {
      const p1 = {
        x: node.position.x + node.points[i].x,
        y: node.position.y + node.points[i].y
      };
      const p2 = {
        x: node.position.x + node.points[i + 1].x,
        y: node.position.y + node.points[i + 1].y
      };
      
      // Check if either endpoint is inside the box
      const p1Inside = 
        p1.x >= boxLeft && p1.x <= boxRight && 
        p1.y >= boxTop && p1.y <= boxBottom;
      
      const p2Inside = 
        p2.x >= boxLeft && p2.x <= boxRight && 
        p2.y >= boxTop && p2.y <= boxBottom;
      
      // If either endpoint is inside, the segment intersects
      if (p1Inside || p2Inside) {
        return true;
      }
      
      // Check if the line segment intersects any of the four edges of the selection box
      // Line-line intersection check for all four edges of the selection box
      if (
        lineSegmentsIntersect(p1.x, p1.y, p2.x, p2.y, boxLeft, boxTop, boxRight, boxTop) || // Top edge
        lineSegmentsIntersect(p1.x, p1.y, p2.x, p2.y, boxLeft, boxBottom, boxRight, boxBottom) || // Bottom edge
        lineSegmentsIntersect(p1.x, p1.y, p2.x, p2.y, boxLeft, boxTop, boxLeft, boxBottom) || // Left edge
        lineSegmentsIntersect(p1.x, p1.y, p2.x, p2.y, boxRight, boxTop, boxRight, boxBottom)   // Right edge
      ) {
        return true;
      }
    }
    
    // No segments intersect
    return false;
  }
  
  // Regular bounding box check for other shapes
  const nodeLeft = node.position.x;
  const nodeRight = node.position.x + node.dimensions.width;
  const nodeTop = node.position.y;
  const nodeBottom = node.position.y + node.dimensions.height;
  
  return (
    nodeLeft < boxRight &&
    nodeRight > boxLeft &&
    nodeTop < boxBottom &&
    nodeBottom > boxTop
  );
}

// Re-export centralized helpers for any external callers
export { lineSegmentsIntersect };

// Use centralized isElbowLine from connection utils

// Find the closest line segment to the given point
export function findClosestLineSegment(
  x: number, 
  y: number,
  nodes: Node[],
  transform: { x: number; y: number; zoom: number }
): { nodeId: string; segmentIndex: number; distance: number } | null {
  if (!nodes) return null;
  
  let closestSegment: { nodeId: string; segmentIndex: number; distance: number } | null = null;
  
  for (const node of nodes) {
    // Skip nodes without points or with fewer than 2 points
    if (!node.points || node.points.length < 2) continue;
    
    // Skip elbow lines - we don't allow adding points to them
    if (isElbowLine(node)) continue;
    
    for (let i = 0; i < node.points.length - 1; i++) {
      const p1 = {
        x: node.position.x + node.points[i].x,
        y: node.position.y + node.points[i].y
      };
      const p2 = {
        x: node.position.x + node.points[i + 1].x,
        y: node.position.y + node.points[i + 1].y
      };
      
      const distance = distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
      
      if (closestSegment === null || distance < closestSegment.distance) {
        closestSegment = {
          nodeId: node.id,
          segmentIndex: i,
          distance
        };
      }
    }
  }
  
  return closestSegment && closestSegment.distance * transform.zoom <= 10 
    ? closestSegment 
    : null;
}

export { distanceToLineSegment };

export interface AlignmentGuides {
  horizontal: { y: number, start: number, end: number, type?: 'top' | 'bottom' | 'center' }[];
  vertical: { x: number, start: number, end: number, type?: 'left' | 'right' | 'center' }[];
}

// Function to find alignment guides with other shapes
export function findAlignmentGuides(
  movingNodes: Node[],
  allNodes: Node[],
  dx: number,
  dy: number,
  nodeStartPos: Record<string, { x: number, y: number }>,
  threshold: number = 5,
  extensionAmount: number = 50
): AlignmentGuides {
  const horizontalGuides: { y: number, start: number, end: number, type: 'top' | 'bottom' | 'center' }[] = [];
  const verticalGuides: { x: number, start: number, end: number, type: 'left' | 'right' | 'center' }[] = [];
  
  // Get the bounding boxes of the moving nodes with the proposed movement applied
  const movingBoxes = movingNodes.map(node => {
    if (!node.dimensions) return null;
    
    const startPos = nodeStartPos[node.id] || { x: node.position.x, y: node.position.y };
    const newX = startPos.x + dx;
    const newY = startPos.y + dy;
    const width = node.dimensions.width;
    const height = node.dimensions.height;
    
    return {
      id: node.id,
      left: newX,
      top: newY,
      right: newX + width,
      bottom: newY + height,
      centerX: newX + width / 2,
      centerY: newY + height / 2
    };
  }).filter(Boolean) as {
    id: string;
    left: number;
    top: number;
    right: number;
    bottom: number;
    centerX: number;
    centerY: number;
  }[];
  
  // Skip if no moving boxes with dimensions
  if (movingBoxes.length === 0) return { horizontal: [], vertical: [] };
  
  // Get the bounding boxes of the static nodes (not being moved)
  const staticBoxes = allNodes
    .filter(node => !node.selected && node.dimensions && !['line', 'arrow'].includes(node.type))
    .map(node => {
      const x = node.position.x;
      const y = node.position.y;
      const width = node.dimensions!.width;
      const height = node.dimensions!.height;
      
      return {
        id: node.id,
        left: x,
        top: y,
        right: x + width,
        bottom: y + height,
        centerX: x + width / 2,
        centerY: y + height / 2
      };
    });
  
  // Skip if no static boxes to align with
  if (staticBoxes.length === 0) return { horizontal: [], vertical: [] };
  
  // Helper function to add a horizontal guide if it doesn't exist yet
  const addHorizontalGuide = (y: number, movingBox: {
    id: string;
    left: number;
    top: number;
    right: number;
    bottom: number;
    centerX: number;
    centerY: number;
  }, alignmentType: string) => {
    // Check if a similar guide already exists (within 1 pixel)
    const existingGuide = horizontalGuides.find(g => Math.abs(g.y - y) < 1);
    
    if (existingGuide) {
      // Extend the existing guide if needed
      existingGuide.start = Math.min(existingGuide.start, movingBox.left - extensionAmount);
      existingGuide.end = Math.max(existingGuide.end, movingBox.right + extensionAmount);
      // If this is a center guide, mark it as such
      if (alignmentType === 'center') {
        existingGuide.type = 'center';
      }
    } else {
      // Add a new guide
      horizontalGuides.push({
        y,
        start: movingBox.left - extensionAmount,
        end: movingBox.right + extensionAmount,
        type: alignmentType as 'top' | 'bottom' | 'center'
      });
    }
  };
  
  // Helper function to add a vertical guide if it doesn't exist yet
  const addVerticalGuide = (x: number, movingBox: {
    id: string;
    left: number;
    top: number;
    right: number;
    bottom: number;
    centerX: number;
    centerY: number;
  }, alignmentType: string) => {
    // Check if a similar guide already exists (within 1 pixel)
    const existingGuide = verticalGuides.find(g => Math.abs(g.x - x) < 1);
    
    if (existingGuide) {
      // Extend the existing guide if needed
      existingGuide.start = Math.min(existingGuide.start, movingBox.top - extensionAmount);
      existingGuide.end = Math.max(existingGuide.end, movingBox.bottom + extensionAmount);
      // If this is a center guide, mark it as such
      if (alignmentType === 'center') {
        existingGuide.type = 'center';
      }
    } else {
      // Add a new guide
      verticalGuides.push({
        x,
        start: movingBox.top - extensionAmount,
        end: movingBox.bottom + extensionAmount,
        type: alignmentType as 'left' | 'right' | 'center'
      });
    }
  };
  
  // Track which nodes have center alignment
  const nodesWithCenterYAlignment = new Set<string>();
  const nodesWithCenterXAlignment = new Set<string>();
  
  // First pass: check for center alignments
  for (const movingBox of movingBoxes) {
    for (const staticBox of staticBoxes) {
      // Check for center alignment (horizontal)
      if (Math.abs(movingBox.centerY - staticBox.centerY) < threshold) {
        addHorizontalGuide(staticBox.centerY, movingBox, 'center');
        nodesWithCenterYAlignment.add(movingBox.id);
      }
      
      // Check for center alignment (vertical)
      if (Math.abs(movingBox.centerX - staticBox.centerX) < threshold) {
        addVerticalGuide(staticBox.centerX, movingBox, 'center');
        nodesWithCenterXAlignment.add(movingBox.id);
      }
    }
  }
  
  // Second pass: check for edge alignments, but only for nodes that don't have center alignment
  for (const movingBox of movingBoxes) {
    // Skip edge alignment checks if this node has center alignment
    const hasCenterYAlignment = nodesWithCenterYAlignment.has(movingBox.id);
    const hasCenterXAlignment = nodesWithCenterXAlignment.has(movingBox.id);
    
    for (const staticBox of staticBoxes) {
      // Check for horizontal alignments (top, bottom) only if no center alignment
      if (!hasCenterYAlignment) {
        // Top edge alignment
        if (Math.abs(movingBox.top - staticBox.top) < threshold) {
          addHorizontalGuide(staticBox.top, movingBox, 'top');
        }
        
        // Bottom edge alignment
        if (Math.abs(movingBox.bottom - staticBox.bottom) < threshold) {
          addHorizontalGuide(staticBox.bottom, movingBox, 'bottom');
        }
        
        // Top to bottom alignment
        if (Math.abs(movingBox.top - staticBox.bottom) < threshold) {
          addHorizontalGuide(staticBox.bottom, movingBox, 'bottom');
        }
        
        // Bottom to top alignment
        if (Math.abs(movingBox.bottom - staticBox.top) < threshold) {
          addHorizontalGuide(staticBox.top, movingBox, 'top');
        }
      }
      
      // Check for vertical alignments (left, right) only if no center alignment
      if (!hasCenterXAlignment) {
        // Left edge alignment
        if (Math.abs(movingBox.left - staticBox.left) < threshold) {
          addVerticalGuide(staticBox.left, movingBox, 'left');
        }
        
        // Right edge alignment
        if (Math.abs(movingBox.right - staticBox.right) < threshold) {
          addVerticalGuide(staticBox.right, movingBox, 'right');
        }
        
        // Left to right alignment
        if (Math.abs(movingBox.left - staticBox.right) < threshold) {
          addVerticalGuide(staticBox.right, movingBox, 'right');
        }
        
        // Right to left alignment
        if (Math.abs(movingBox.right - staticBox.left) < threshold) {
          addVerticalGuide(staticBox.left, movingBox, 'left');
        }
      }
    }
  }
  
  return { 
    horizontal: horizontalGuides, 
    vertical: verticalGuides
  };
}

// Function to calculate adjusted position based on alignment guides
export function getSnappedPosition(
  node: Node,
  dx: number,
  dy: number,
  guides: {
    horizontal: { y: number, start: number, end: number, type?: 'top' | 'bottom' | 'center' }[];
    vertical: { x: number, start: number, end: number, type?: 'left' | 'right' | 'center' }[];
  },
  nodeStartPos: Record<string, { x: number, y: number }>,
  threshold: number = 5
): { x: number, y: number } {
  if (!node.dimensions) return { x: dx, y: dy };
  
  const startPos = nodeStartPos[node.id] || { x: node.position.x, y: node.position.y };
  let adjustedDx = dx;
  let adjustedDy = dy;
  
  // Calculate the box with the proposed movement
  const width = node.dimensions.width;
  const height = node.dimensions.height;
  const box = {
    left: startPos.x + dx,
    top: startPos.y + dy,
    right: startPos.x + dx + width,
    bottom: startPos.y + dy + height,
    centerX: startPos.x + dx + width / 2,
    centerY: startPos.y + dy + height / 2
  };
  
  // Find the closest horizontal guide to snap to
  let closestHorizontalDist = threshold;
  let closestHorizontalSnap = null;
  
  for (const guide of guides.horizontal) {
    // Top edge alignment
    const topDist = Math.abs(box.top - guide.y);
    if (topDist < closestHorizontalDist) {
      closestHorizontalDist = topDist;
      closestHorizontalSnap = { edge: 'top', y: guide.y };
    }
    
    // Bottom edge alignment
    const bottomDist = Math.abs(box.bottom - guide.y);
    if (bottomDist < closestHorizontalDist) {
      closestHorizontalDist = bottomDist;
      closestHorizontalSnap = { edge: 'bottom', y: guide.y };
    }
    
    // Center alignment (horizontal)
    const centerYDist = Math.abs(box.centerY - guide.y);
    if (centerYDist < closestHorizontalDist) {
      closestHorizontalDist = centerYDist;
      closestHorizontalSnap = { edge: 'centerY', y: guide.y };
    }
  }
  
  // Apply the closest horizontal snap if found
  if (closestHorizontalSnap) {
    if (closestHorizontalSnap.edge === 'top') {
      adjustedDy = closestHorizontalSnap.y - startPos.y;
    } else if (closestHorizontalSnap.edge === 'bottom') {
      adjustedDy = closestHorizontalSnap.y - height - startPos.y;
    } else if (closestHorizontalSnap.edge === 'centerY') {
      adjustedDy = closestHorizontalSnap.y - height / 2 - startPos.y;
    }
  }
  
  // Find the closest vertical guide to snap to
  let closestVerticalDist = threshold;
  let closestVerticalSnap = null;
  
  for (const guide of guides.vertical) {
    // Left edge alignment
    const leftDist = Math.abs(box.left - guide.x);
    if (leftDist < closestVerticalDist) {
      closestVerticalDist = leftDist;
      closestVerticalSnap = { edge: 'left', x: guide.x };
    }
    
    // Right edge alignment
    const rightDist = Math.abs(box.right - guide.x);
    if (rightDist < closestVerticalDist) {
      closestVerticalDist = rightDist;
      closestVerticalSnap = { edge: 'right', x: guide.x };
    }
    
    // Center alignment (vertical)
    const centerXDist = Math.abs(box.centerX - guide.x);
    if (centerXDist < closestVerticalDist) {
      closestVerticalDist = centerXDist;
      closestVerticalSnap = { edge: 'centerX', x: guide.x };
    }
  }
  
  // Apply the closest vertical snap if found
  if (closestVerticalSnap) {
    if (closestVerticalSnap.edge === 'left') {
      adjustedDx = closestVerticalSnap.x - startPos.x;
    } else if (closestVerticalSnap.edge === 'right') {
      adjustedDx = closestVerticalSnap.x - width - startPos.x;
    } else if (closestVerticalSnap.edge === 'centerX') {
      adjustedDx = closestVerticalSnap.x - width / 2 - startPos.x;
    }
  }
  
  return { x: adjustedDx, y: adjustedDy };
}
