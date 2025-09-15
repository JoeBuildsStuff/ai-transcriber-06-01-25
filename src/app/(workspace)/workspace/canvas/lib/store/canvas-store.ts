import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { ConnectionPointPosition, isElbowLine, adjustElbowMiddlePoint, generateElbowConnector } from './../connection';
import { deepClone, calculateBoundingBox, LINE_BOUNDING_BOX_PADDING, connectionManager } from './../connection';
// Import the elbow line utilities
// Old elbow utilities removed in favor of centralized connection system
// Always import the node registry to start with default node types and styles
import { nodeRegistry } from '../../components/NodeRegistry';

// Import the color utilities
import {
  getTailwindColorHex,
  getHexToTailwindName,
  getEquivalentShade,
} from '../utils/tailwind-color-utils';

// Define the types for our canvas state
export interface Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  dimensions?: { width: number; height: number };
  style?: Record<string, unknown>;
  selected?: boolean;
  dragHandle?: string;
  parentId?: string; // For grouping/nesting
  points?: Array<{ x: number, y: number }>; // For multi-point lines
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  type?: string; // straight, bezier, etc.
  style?: Record<string, unknown>;
  label?: string | React.ReactNode;
  selected?: boolean;
  animated?: boolean;
  points?: Array<{ x: number; y: number }>; // For custom paths
}

export type ToolType = 
  | 'select' 
  | 'hand' 
  | 'rectangle' 
  | 'triangle'
  | 'diamond' 
  | 'circle' 
  | 'arrow' 
  | 'line' 
  | 'pen' 
  | 'text' 
  | 'eraser'
  | 'lock'
  | 'icon'
  | 'examples';

// Add marker types
export type MarkerShape = 'none' | 'triangle' | 'circle' | 'square' | 'diamond';
export type FillStyle = 'filled' | 'outlined';

// Add this interface to track connections between shapes and lines
export interface Connection {
  lineId: string;
  pointIndex: number;
  shapeId: string;
  position: ConnectionPointPosition;
  dynamic: boolean; // Whether to dynamically recalculate the optimal connection point
}

// Add line type to the CanvasState interface
export type LineType = 'straight' | 'elbow';

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedElements: Array<Node | Edge>;
  transform: { x: number; y: number; zoom: number };
  activeTool: ToolType;
  gridSize: number;
  snapToGrid: boolean;
  strokeColor: string;
  fillColor: string;
  defaultShade: string;
  borderRadius: number;
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  textColor: string;
  presentationMode: boolean;
  
  // Line marker settings
  startMarker: MarkerShape;
  endMarker: MarkerShape;
  markerFillStyle: FillStyle;
  // Add animated property
  animated: boolean;
  
  // Line drawing state
  lineInProgress: Node | null;
  selectedPointIndices: number[] | null;
  
  // Connection tracking
  connections: Connection[];
  createConnection: (connection: {
    sourceNodeId: string;
    sourcePointIndex: number;
    targetNodeId: string;
    targetPosition: ConnectionPointPosition;
  }) => void;
  
  // History tracking
  history: Array<{
    nodes: Node[];
    edges: Edge[];
    connections: Connection[];
  }>;
  historyIndex: number;
  
  // Actions
  setTransform: (transform: Partial<{ x: number; y: number; zoom: number }>) => void;
  setActiveTool: (tool: ToolType) => void;
  setSnapToGrid: (snap: boolean) => void;
  setGridSize: (size: number) => void;
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setDefaultShade: (shade: string) => void;
  setBorderRadius: (radius: number) => void;
  setStrokeWidth: (width: number) => void;
  setStrokeStyle: (style: 'solid' | 'dashed' | 'dotted') => void;
  updateSelectedNodeStyles: () => void;
  deselectAllNodes: () => void;
  selectMultipleNodes: (nodeIds: string[]) => void;
  moveSelectedToFront: () => void;
  moveSelectedToBack: () => void;
  moveSelectedForward: () => void;
  moveSelectedBackward: () => void;
  duplicateSelectedNodes: () => void;
  deleteSelectedNodes: () => void;
  togglePresentationMode: () => void;
  
  // History actions
  pushToHistory: () => void;
  undo: () => void;
  redo: () => void;
  
  // Group actions
  groupSelectedNodes: () => void;
  ungroupSelectedNodes: () => void;
  
  // Alignment actions
  alignTop: () => void;
  alignMiddle: () => void;
  alignBottom: () => void;
  alignLeft: () => void;
  alignCenter: () => void;
  alignRight: () => void;
  distributeHorizontally: () => void;
  distributeVertically: () => void;
  
  // Viewport actions
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  panCanvas: (dx: number, dy: number) => void;
  
  // Node actions
  addNode: (node: Node) => void;
  selectNode: (nodeId: string) => void;
  createShapeAtPosition: (type: string, x: number, y: number, data?: Record<string, unknown>) => Node;
  updateNodePosition: (nodeId: string, x: number, y: number) => void;
  updateNodeDimensions: (nodeId: string, width: number, height: number, direction?: string) => void;
  
  // Line drawing actions
  startLineDraw: (x: number, y: number, type: 'line' | 'arrow') => void;
  updateLineDraw: (x: number, y: number, isShiftPressed?: boolean) => void;
  addPointToLine: () => void;
  finishLineDraw: () => void;
  cancelLineDraw: () => void;
  
  // Line point editing actions
  selectLinePoint: (nodeId: string, pointIndex: number, multiSelect?: boolean) => void;
  deselectLinePoints: () => void;
  moveLinePoint: (nodeId: string, pointIndex: number, x: number, y: number) => void;
  addPointToExistingLine: (nodeId: string, segmentIndex: number, x: number, y: number) => void;
  deleteSelectedPoints: () => void;
  
  // Text properties
  fontSize: number;
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  fontWeight: number; // Add fontWeight property
  
  // Text actions
  setTextColor: (color: string) => void;
  setFontSize: (size: number) => void;
  setTextAlign: (align: 'left' | 'center' | 'right') => void;
  setVerticalAlign: (align: 'top' | 'middle' | 'bottom') => void;
  setFontWeight: (weight: number) => void; // Add setFontWeight function
  
  // Add this new function after the duplicateSelectedNodes function
  duplicateNodeToRight: (nodeId: string, spacing: number) => Node | undefined;
  
  // Line marker actions
  setStartMarker: (marker: MarkerShape) => void;
  setEndMarker: (marker: MarkerShape) => void;
  setMarkerFillStyle: (style: FillStyle) => void;
  updateSelectedLineMarkers: () => void;

  // Add a function to update colors based on theme changes
  updateColorsForTheme: (isDark: boolean) => void;
  
  // Add line type setting
  lineType: LineType;
  
  // Add setter for line type
  setLineType: (type: LineType) => void;
  
  // Add a new function to update selected line types
  updateSelectedLineTypes: () => void;
  
  // Add setter for line animation
  setLineAnimation: (animated: boolean) => void;
  
  // Add a new function to update selected line animations
  updateSelectedLineAnimations: () => void;

  // Add this to the CanvasState interface
  toggleNodeSelection: (nodeId: string) => void;
  
  // Icon sheet state
  isIconSheetOpen: boolean;
  toggleIconSheet: () => void;

  // Examples sheet state
  isExamplesSheetOpen: boolean;
  toggleExamplesSheet: () => void;
  
  // Add this new function to the CanvasState interface
  updateSelectedIconStyles: () => void;
}

// Add this helper function to determine if we're in dark mode
// This is used for initial state only - components will use useTheme for reactivity
const getInitialThemeMode = (): boolean => {
  if (typeof window !== 'undefined') {
    // Check for theme in localStorage
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark') return true;
    if (storedTheme === 'light') return false;
    
    // Check for system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }
  }
  
  // Default to light mode
  return false;
};

// Get initial default shades based on theme
const isDarkMode = getInitialThemeMode();
const initialStrokeDefaultShade = isDarkMode ? '300' : '800';
const initialFillDefaultShade = isDarkMode ? '800' : '300';

// Replace the existing getTailwindColor function with our utility
const getTailwindColor = (colorName: string): string => {
  return getTailwindColorHex(colorName);
};

// Replace the existing getTailwindColorName function with our utility
const getTailwindColorName = (hexColor: string): string => {
  return getHexToTailwindName(hexColor);
};

// Add a function to handle theme-aware color adjustments
const getThemeAdjustedColor = (colorName: string, isStroke: boolean, isDark: boolean): string => {
  if (colorName === 'none') return 'none';
  
  const parts = colorName.split('-');
  if (parts.length === 2) {
    const [base, shade] = parts;
    const adjustedShade = getEquivalentShade(shade, isDark, isStroke);
    return `${base}-${adjustedShade}`;
  }
  
  return colorName;
};

// Add this helper function before the store definition
const resizeLineNode = (
  node: Node, 
  direction: string, 
  dx: number, 
  dy: number, 
  snapToGrid: boolean, 
  gridSize: number
) => {
  if (!node.points || node.points.length < 2) return;
  
  // Calculate the current bounding box of the line
  const allX = node.points.map(p => p.x);
  const allY = node.points.map(p => p.y);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  
  // Calculate the current width and height
  const width = maxX - minX;
  const height = maxY - minY;
  
  // Apply the resize based on the direction
  switch (direction) {
    case 'n': // North - resize top edge
      // Scale all y-coordinates above the midpoint
      for (let i = 0; i < node.points.length; i++) {
        if (node.points[i].y < minY + height / 2) {
          const relativeY = (node.points[i].y - minY) / height;
          node.points[i].y = minY + relativeY * (height - dy);
        }
      }
      break;
      
    case 's': // South - resize bottom edge
      // Scale all y-coordinates below the midpoint
      for (let i = 0; i < node.points.length; i++) {
        if (node.points[i].y > minY + height / 2) {
          const relativeY = (node.points[i].y - minY) / height;
          node.points[i].y = minY + relativeY * (height + dy);
        }
      }
      break;
      
    case 'w': // West - resize left edge
      // Scale all x-coordinates to the left of the midpoint
      for (let i = 0; i < node.points.length; i++) {
        if (node.points[i].x < minX + width / 2) {
          const relativeX = (node.points[i].x - minX) / width;
          node.points[i].x = minX + relativeX * (width - dx);
        }
      }
      break;
      
    case 'e': // East - resize right edge
      // Scale all x-coordinates to the right of the midpoint
      for (let i = 0; i < node.points.length; i++) {
        if (node.points[i].x > minX + width / 2) {
          const relativeX = (node.points[i].x - minX) / width;
          node.points[i].x = minX + relativeX * (width + dx);
        }
      }
      break;
      
    case 'nw': // Northwest - resize top-left corner
      // Scale all coordinates in the top-left quadrant
      for (let i = 0; i < node.points.length; i++) {
        if (node.points[i].x < minX + width / 2) {
          const relativeX = (node.points[i].x - minX) / width;
          node.points[i].x = minX + relativeX * (width - dx);
        }
        if (node.points[i].y < minY + height / 2) {
          const relativeY = (node.points[i].y - minY) / height;
          node.points[i].y = minY + relativeY * (height - dy);
        }
      }
      break;
      
    case 'ne': // Northeast - resize top-right corner
      // Scale all coordinates in the top-right quadrant
      for (let i = 0; i < node.points.length; i++) {
        if (node.points[i].x > minX + width / 2) {
          const relativeX = (node.points[i].x - minX) / width;
          node.points[i].x = minX + relativeX * (width + dx);
        }
        if (node.points[i].y < minY + height / 2) {
          const relativeY = (node.points[i].y - minY) / height;
          node.points[i].y = minY + relativeY * (height - dy);
        }
      }
      break;
      
    case 'sw': // Southwest - resize bottom-left corner
      // Scale all coordinates in the bottom-left quadrant
      for (let i = 0; i < node.points.length; i++) {
        if (node.points[i].x < minX + width / 2) {
          const relativeX = (node.points[i].x - minX) / width;
          node.points[i].x = minX + relativeX * (width - dx);
        }
        if (node.points[i].y > minY + height / 2) {
          const relativeY = (node.points[i].y - minY) / height;
          node.points[i].y = minY + relativeY * (height + dy);
        }
      }
      break;
      
    case 'se': // Southeast - resize bottom-right corner
      // Scale all coordinates in the bottom-right quadrant
      for (let i = 0; i < node.points.length; i++) {
        if (node.points[i].x > minX + width / 2) {
          const relativeX = (node.points[i].x - minX) / width;
          node.points[i].x = minX + relativeX * (width + dx);
        }
        if (node.points[i].y > minY + height / 2) {
          const relativeY = (node.points[i].y - minY) / height;
          node.points[i].y = minY + relativeY * (height + dy);
        }
      }
      break;
  }
  
  // Apply grid snapping if enabled
  if (snapToGrid) {
    for (let i = 0; i < node.points.length; i++) {
      node.points[i].x = Math.round(node.points[i].x / gridSize) * gridSize;
      node.points[i].y = Math.round(node.points[i].y / gridSize) * gridSize;
    }
  }
  
  // Recalculate dimensions based on the updated points
  const newAllX = node.points.map(p => p.x);
  const newAllY = node.points.map(p => p.y);
  const newMinX = Math.min(...newAllX);
  const newMaxX = Math.max(...newAllX);
  const newMinY = Math.min(...newAllY);
  const newMaxY = Math.max(...newAllY);
  
  // Add padding to the bounding box
  const paddedMinX = newMinX - LINE_BOUNDING_BOX_PADDING;
  const paddedMaxX = newMaxX + LINE_BOUNDING_BOX_PADDING;
  const paddedMinY = newMinY - LINE_BOUNDING_BOX_PADDING;
  const paddedMaxY = newMaxY + LINE_BOUNDING_BOX_PADDING;
  
  // Update position and dimensions to properly contain all points with padding
  if (paddedMinX < 0 || paddedMinY < 0) {
    // Adjust position to the top-left corner of the padded bounding box
    node.position.x += paddedMinX;
    node.position.y += paddedMinY;
    
    // Adjust all points to be relative to the new position
    for (let i = 0; i < node.points.length; i++) {
      node.points[i].x -= paddedMinX;
      node.points[i].y -= paddedMinY;
    }
    
    // Update dimensions to the size of the padded bounding box
    node.dimensions = {
      width: Math.max(paddedMaxX - paddedMinX, 1),
      height: Math.max(paddedMaxY - paddedMinY, 1)
    };
  } else {
    // No need to adjust position, just update dimensions with padding
    node.dimensions = {
      width: Math.max(paddedMaxX, 1),
      height: Math.max(paddedMaxY, 1)
    };
  }
};

/**
 * Utility function to merge node styles based on node type and current state
 * This consolidates style logic that was previously duplicated across different node creation methods
 */
const mergeNodeStyles = (
  baseStyle: Record<string, unknown> | undefined,
  state: CanvasState,
  nodeType: string
): Record<string, unknown> => {
  const style = { ...baseStyle } as Record<string, unknown>;
  
  // Apply stroke color if not already set
  if (state.strokeColor && !style.stroke) {
    style.stroke = state.strokeColor;
  }
  
  // Apply fill color if not already set
  if (state.fillColor && !style.fill) {
    style.fill = state.fillColor;
  }
  
  // Apply text color for text nodes
  if (nodeType === 'text' && state.textColor && !style.textColor) {
    style.textColor = state.textColor;
  }
  
  // Apply stroke width if not already set
  if (state.strokeWidth && !style.strokeWidth) {
    style.strokeWidth = state.strokeWidth;
  }
  
  // Apply stroke style if not already set
  if (state.strokeStyle && !style.strokeStyle) {
    style.strokeStyle = state.strokeStyle;
  }
  
  // Apply border radius for rectangle nodes
  if (nodeType === 'rectangle' && state.borderRadius && !style.borderRadius) {
    style.borderRadius = state.borderRadius;
  }
  
  // Apply font size for text nodes
  if (nodeType === 'text' && state.fontSize && !style.fontSize) {
    style.fontSize = `${state.fontSize}px`;
  }
  
  // Apply text alignment for text nodes
  if (nodeType === 'text' && state.textAlign && !style.textAlign) {
    style.textAlign = state.textAlign;
  }
  
  // Apply vertical alignment for text nodes
  if (nodeType === 'text' && state.verticalAlign && !style.verticalAlign) {
    style.verticalAlign = state.verticalAlign;
  }
  
  return style;
};

// Create the store with immer middleware for immutable updates
export const useCanvasStore = create<CanvasState>()(
  immer((set, get) => ({
    // Initial state
    nodes: [] as Node[],
    edges: [] as Edge[],
    selectedElements: [] as Array<Node | Edge>,
    transform: { x: 0, y: 0, zoom: 1 },
    activeTool: 'select' as ToolType,
    gridSize: 20,
    snapToGrid: false,
    strokeColor: `black-${initialStrokeDefaultShade}`,
    fillColor: `white-${initialFillDefaultShade}`,
    defaultShade: initialStrokeDefaultShade,
    borderRadius: 0,
    strokeWidth: 2,
    strokeStyle: 'solid' as const,
    textColor: `black-${initialStrokeDefaultShade}`,
    presentationMode: false,
    // Line marker settings
    startMarker: 'none' as MarkerShape,
    endMarker: 'none' as MarkerShape,
    markerFillStyle: 'filled' as FillStyle,
    animated: false,
    // Line drawing state
    lineInProgress: null,
    selectedPointIndices: null,
    
    // Connection tracking
    connections: [] as Connection[],
    createConnection: ({ sourceNodeId, sourcePointIndex, targetNodeId, targetPosition }) => {
      set(state => {
        // First, remove any existing connection for this line point
        state.connections = state.connections.filter((conn: Connection) => 
          !(conn.lineId === sourceNodeId && conn.pointIndex === sourcePointIndex)
        );
        
        // Then add the new connection
        state.connections.push({
          lineId: sourceNodeId,
          pointIndex: sourcePointIndex,
          shapeId: targetNodeId,
          position: targetPosition,
          dynamic: true // Enable dynamic connection points
        });
        
        // Push to history
        get().pushToHistory();
      });
    },
    
    // History tracking
    history: [],
    historyIndex: -1,
    
    // History actions
    pushToHistory: () => 
      set((state) => {

        // Create a deep copy of the current state
        const currentState = {
          nodes: deepClone(state.nodes),
          edges: deepClone(state.edges),
          connections: deepClone(state.connections)
        };
        
        // If we're not at the end of the history, remove future states
        if (state.historyIndex < state.history.length - 1) {
          console.log('Removing future history states');
          state.history = state.history.slice(0, state.historyIndex + 1);
        }
        
        // Add the current state to history
        state.history.push(currentState);
        state.historyIndex = state.history.length - 1;
        
        // Limit history size to prevent memory issues
        if (state.history.length > 50) {
          state.history.shift();
          state.historyIndex--;
          console.log('History limit reached, removed oldest state');
        }
      }),
    
    undo: () => 
      set((state) => {
        console.log('Undo called, current index:', state.historyIndex, 'history length:', state.history.length);
        
        if (state.historyIndex > 0) {
          state.historyIndex--;
          console.log('Undoing to index:', state.historyIndex);
          
          const previousState = state.history[state.historyIndex];
          console.log('Previous state has', previousState.nodes.length, 'nodes');
          
          state.nodes = deepClone(previousState.nodes);
          state.edges = deepClone(previousState.edges);
          state.connections = deepClone(previousState.connections);
          
          console.log('Undo complete, now at index:', state.historyIndex);
        } else {
          console.log('Cannot undo: already at oldest state');
        }
      }),
    
    redo: () => 
      set((state) => {
        console.log('Redo called, current index:', state.historyIndex, 'history length:', state.history.length);
        
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex++;
          console.log('Redoing to index:', state.historyIndex);
          
          const nextState = state.history[state.historyIndex];
          console.log('Next state has', nextState.nodes.length, 'nodes');
          
          state.nodes = deepClone(nextState.nodes);
          state.edges = deepClone(nextState.edges);
          state.connections = deepClone(nextState.connections);
          
          console.log('Redo complete, now at index:', state.historyIndex);
        } else {
          console.log('Cannot redo: already at newest state');
        }
      }),
    
    // Actions
    setTransform: (newTransform) => 
      set((state) => {
        if (newTransform.x !== undefined) state.transform.x = newTransform.x;
        if (newTransform.y !== undefined) state.transform.y = newTransform.y;
        if (newTransform.zoom !== undefined) state.transform.zoom = newTransform.zoom;
      }),
    
    setActiveTool: (tool) => 
      set((state) => {
        state.activeTool = tool;
      }),
    
    setSnapToGrid: (snap) => 
      set((state) => {
        state.snapToGrid = snap;
      }),
    
    setGridSize: (size) => 
      set((state) => {
        state.gridSize = size;
      }),
    
    setStrokeColor: (color) =>
      set((state) => {
        state.strokeColor = color;
        
        // Directly update selected nodes
        const strokeColorHex = getTailwindColor(color);
        
        let updatedAnyNode = false;
        let shouldPushToHistory = false;
        
        // Check if any node will be updated
        state.nodes.forEach((node: Node) => {
          if (node.selected) {
            shouldPushToHistory = true;
          }
        });
        
        // Push to history before making changes
        if (shouldPushToHistory) {
          // Create a deep copy of the current state
          const currentState = {
            nodes: deepClone(state.nodes),
            edges: deepClone(state.edges),
            connections: deepClone(state.connections)
          };
          
          // Add the current state to history
          state.history.push(currentState);
          state.historyIndex = state.history.length - 1;
        }
        
        // Now update the nodes
        state.nodes.forEach((node: Node) => {
          if (node.selected) {
            
            // If this is a group, only update its children, not the group container
            if (node.data?.isGroup === true) {
              const childNodes = state.nodes.filter((n: Node) => n.parentId === node.id);
              childNodes.forEach((childNode: Node) => {
                if (!childNode.style) {
                  childNode.style = {};
                }
                childNode.style.borderColor = strokeColorHex;
              });
              updatedAnyNode = true;
            } else {
              // For regular nodes, update as normal
              if (!node.style) {
                node.style = {};
              }
              node.style.borderColor = strokeColorHex;
              updatedAnyNode = true;
            }
          }
        });
        
        // Create a new nodes array to trigger a re-render
        if (updatedAnyNode) {
          state.nodes = [...state.nodes];
        }
      }),
      
    setFillColor: (color) =>
      set((state) => {
        state.fillColor = color;
        
        // Directly update selected nodes
        const fillColorHex = getTailwindColor(color);
        console.log('Setting fill color to:', fillColorHex);
        
        let updatedAnyNode = false;
        
        state.nodes.forEach((node: Node) => {
          if (node.selected) {
            // Push current state to history before making changes
            if (!updatedAnyNode) {
              get().pushToHistory();
              updatedAnyNode = true;
            }
            
            console.log('Updating fill for node:', node.id);
            
            // If this is a group, only update its children, not the group container
            if (node.data?.isGroup === true) {
              const childNodes = state.nodes.filter((n: Node) => n.parentId === node.id);
              childNodes.forEach((childNode: Node) => {
                if (!childNode.style) {
                  childNode.style = {};
                }
                childNode.style.backgroundColor = fillColorHex;
              });
            } else {
              // For regular nodes, update as normal
              if (!node.style) {
                node.style = {};
              }
              node.style.backgroundColor = fillColorHex;
            }
          }
        });
        
        // Create a new nodes array to trigger a re-render
        if (updatedAnyNode) {
          state.nodes = [...state.nodes];
        }
      }),
      
    setDefaultShade: (shade) =>
      set((state) => {
        state.defaultShade = shade;
      }),
    
    setBorderRadius: (radius) =>
      set((state) => {
        state.borderRadius = radius;
        console.log('Setting border radius to:', radius);
        
        // Update selected nodes with new border radius
        let updatedAnyNode = false;
        
        state.nodes.forEach((node: Node) => {
          if (node.selected) {
            // Push current state to history before making changes
            if (!updatedAnyNode) {
              get().pushToHistory();
              updatedAnyNode = true;
            }
            
            console.log('Updating border radius for node:', node.id);
            
            // If this is a group, only update its children, not the group container
            if (node.data?.isGroup === true) {
              const childNodes = state.nodes.filter((n: Node) => n.parentId === node.id);
              childNodes.forEach((childNode: Node) => {
                if (!childNode.style) {
                  childNode.style = {};
                }
                // For circles, maintain the 50% border radius
                if (childNode.type === 'circle') {
                  childNode.style.borderRadius = '50%';
                } else {
                  childNode.style.borderRadius = `${radius}px`;
                }
              });
            } else {
              // For regular nodes, update as normal
              if (!node.style) {
                node.style = {};
              }
              node.style.borderRadius = `${radius}px`;
              console.log('Node style after update:', node.style);
            }
          }
        });
        
        // Create a new nodes array to trigger a re-render
        if (updatedAnyNode) {
          state.nodes = [...state.nodes];
        } else {
          console.log('No nodes were selected to update border radius');
        }
      }),
      
    setStrokeWidth: (width) =>
      set((state) => {
        state.strokeWidth = width;
        
        // Update selected nodes
        let updatedAnyNode = false;
        
        state.nodes.forEach((node: Node) => {
          if (node.selected) {
            // Push current state to history before making changes
            if (!updatedAnyNode) {
              get().pushToHistory();
              updatedAnyNode = true;
            }
            
            // If this is a group, only update its children, not the group container
            if (node.data?.isGroup === true) {
              const childNodes = state.nodes.filter((n: Node) => n.parentId === node.id);
              childNodes.forEach((childNode: Node) => {
                if (!childNode.style) {
                  childNode.style = {};
                }
                childNode.style.borderWidth = width;
              });
            } else {
              // For regular nodes, update as normal
              if (!node.style) {
                node.style = {};
              }
              node.style.borderWidth = width;
            }
          }
        });
        
        // Create a new nodes array to trigger a re-render
        if (updatedAnyNode) {
          state.nodes = [...state.nodes];
        }
      }),
      
    setStrokeStyle: (style) =>
      set((state) => {
        state.strokeStyle = style;
        
        // Update selected nodes
        let updatedAnyNode = false;
        
        state.nodes.forEach((node: Node) => {
          if (node.selected) {
            // Push current state to history before making changes
            if (!updatedAnyNode) {
              get().pushToHistory();
              updatedAnyNode = true;
            }
            
            // If this is a group, only update its children, not the group container
            if (node.data?.isGroup === true) {
              const childNodes = state.nodes.filter((n: Node) => n.parentId === node.id);
              childNodes.forEach((childNode: Node) => {
                if (!childNode.style) {
                  childNode.style = {};
                }
                childNode.style.borderStyle = style;
              });
            } else {
              // For regular nodes, update as normal
              if (!node.style) {
                node.style = {};
              }
              node.style.borderStyle = style;
            }
          }
        });
        
        // Create a new nodes array to trigger a re-render
        if (updatedAnyNode) {
          state.nodes = [...state.nodes];
        }
      }),
      
    updateSelectedNodeStyles: () =>
      set((state) => {
        const strokeColorHex = getTailwindColor(state.strokeColor);
        const fillColorHex = getTailwindColor(state.fillColor);
        
        let updatedAnyNode = false;
        
        state.nodes.forEach((node: Node) => {
          if (node.selected) {
            // Push current state to history before making changes
            if (!updatedAnyNode) {
              get().pushToHistory();
              updatedAnyNode = true;
            }
            
            // If this is a group, only update its children, not the group container
            if (node.data?.isGroup === true) {
              const childNodes = state.nodes.filter((n: Node) => n.parentId === node.id);
              childNodes.forEach((childNode: Node) => {
                if (!childNode.style) {
                  childNode.style = {};
                }
                childNode.style.borderColor = strokeColorHex;
                childNode.style.backgroundColor = fillColorHex;
                
                // For circles, maintain the 50% border radius
                if (childNode.type === 'circle') {
                  childNode.style.borderRadius = '50%';
                } else {
                  childNode.style.borderRadius = `${state.borderRadius}px`;
                }
                
                childNode.style.borderWidth = state.strokeWidth;
                childNode.style.borderStyle = state.strokeStyle;
                
                // Update text color for text nodes within groups
                if (childNode.type === 'text') {
                  childNode.style.textColor = state.textColor;
                }
              });
            } else {
              // For regular nodes, update as normal
              if (!node.style) {
                node.style = {};
              }
              node.style.borderColor = strokeColorHex;
              
              // Apply backgroundColor to all nodes, including lines
              // For lines, this won't affect the line itself, but will be used for marker fills
              node.style.backgroundColor = fillColorHex;
              
              // Store fillColor in data as well for easier reference
              if (!node.data) node.data = {};
              node.data.fillColor = fillColorHex;
              
              // Only set borderRadius for non-line nodes (unless they need it)
              if (!['line', 'arrow'].includes(node.type) || node.data?.needsBorderRadius) {
                node.style.borderRadius = `${state.borderRadius}px`;
              }
              
              node.style.borderWidth = state.strokeWidth;
              node.style.borderStyle = state.strokeStyle;
              
              // Update text color and font settings for text nodes
              if (node.type === 'text') {
                node.style.textColor = state.textColor;
                node.style.fontSize = `${state.fontSize}px`;
                node.style.textAlign = state.textAlign;
                node.style.verticalAlign = state.verticalAlign;
                node.style.fontWeight = state.fontWeight;
              }
            }
          }
        });
      }),
    
    deselectAllNodes: () =>
      set((state) => {
        state.nodes.forEach((node: Node) => {
          node.selected = false;
        });
        state.selectedElements = [];
      }),
      
    selectMultipleNodes: (nodeIds) =>
      set((state) => {
        const updatedNodes = state.nodes.map((node: Node) => ({
          ...node,
          selected: nodeIds.includes(node.id)
        }));
        
        return {
          nodes: updatedNodes,
          selectedElements: updatedNodes.filter((node: Node) => node.selected)
        };
      }),
    
    moveSelectedToFront: () =>
      set((state) => {
        // Get all selected nodes
        const selectedNodes = state.nodes.filter((node: Node) => node.selected);
        if (selectedNodes.length === 0) return;
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        // Remove selected nodes from the array
        state.nodes = state.nodes.filter((node: Node) => !node.selected);
        
        // Add them back at the end (top)
        state.nodes.push(...selectedNodes);
      }),
      
    moveSelectedToBack: () =>
      set((state) => {
        // Get all selected nodes
        const selectedNodes = state.nodes.filter((node: Node) => node.selected);
        if (selectedNodes.length === 0) return;
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        // Remove selected nodes from the array
        state.nodes = state.nodes.filter((node: Node) => !node.selected);
        
        // Add them at the beginning (bottom)
        state.nodes.unshift(...selectedNodes);
      }),
      
    moveSelectedForward: () =>
      set((state) => {
        // Get indices of selected nodes
        const selectedIndices = state.nodes
          .map((node: Node, index: number) => node.selected ? index : -1)
          .filter((index: number) => index !== -1);
        
        if (selectedIndices.length === 0) return;
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        // Process from last to first to avoid index shifting problems
        for (let i = selectedIndices.length - 1; i >= 0; i--) {
          const currentIndex = selectedIndices[i];
          if (currentIndex < state.nodes.length - 1) {
            // Swap with the next node
            [state.nodes[currentIndex], state.nodes[currentIndex + 1]] = 
            [state.nodes[currentIndex + 1], state.nodes[currentIndex]];
          }
        }
      }),
      
    moveSelectedBackward: () =>
      set((state) => {
        // Get indices of selected nodes
        const selectedIndices = state.nodes
          .map((node: Node, index: number) => node.selected ? index : -1)
          .filter((index: number) => index !== -1);
        
        if (selectedIndices.length === 0) return;
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        // Process from first to last to avoid index shifting problems
        for (let i = 0; i < selectedIndices.length; i++) {
          const currentIndex = selectedIndices[i];
          if (currentIndex > 0) {
            // Swap with the previous node
            [state.nodes[currentIndex], state.nodes[currentIndex - 1]] = 
            [state.nodes[currentIndex - 1], state.nodes[currentIndex]];
          }
        }
      }),
    
    duplicateSelectedNodes: () =>
      set((state) => {
        const selectedNodes = state.nodes.filter((node: Node) => node.selected);
        if (selectedNodes.length === 0) return;
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        // Deselect all nodes first
        state.nodes.forEach((node: Node) => {
          node.selected = false;
        });
        
        // Create duplicates with new IDs and slightly offset positions
        const duplicates = selectedNodes.map((node: Node) => ({
          ...node,
          id: `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          position: {
            x: node.position.x + 20,
            y: node.position.y + 20
          },
          selected: true
        }));
        
        // Add duplicates to the nodes array
        state.nodes.push(...duplicates);
        
        // Update selected elements
        state.selectedElements = duplicates;
      }),
      
    deleteSelectedNodes: () =>
      set((state) => {
        // Push current state to history before making changes
        get().pushToHistory();
        
        // Remove selected nodes from the array
        state.nodes = state.nodes.filter((node: Node) => !node.selected);
        // Clear selected elements
        state.selectedElements = [];
      }),
    
    // Viewport actions
    zoomIn: () => 
      set((state) => {
        // Limit zoom to a maximum of 2 (200%)
        state.transform.zoom = Math.min(state.transform.zoom + 0.1, 2);
      }),
    
    zoomOut: () => 
      set((state) => {
        // Limit zoom to a minimum of 0.1 (10%)
        state.transform.zoom = Math.max(state.transform.zoom - 0.1, 0.1);
      }),
    
    resetView: () => 
      set((state) => {
        state.transform = { x: 0, y: 0, zoom: 1 };
      }),
    
    panCanvas: (dx, dy) => 
      set((state) => {
        state.transform.x += dx;
        state.transform.y += dy;
      }),
    
    // Node actions
    addNode: (node) =>
      set((state) => {
        state.nodes.push(node);
      }),
    
    selectNode: (nodeId) =>
      set((state) => {
        // Deselect all nodes first
        state.nodes.forEach((node: Node) => {
          node.selected = false;
        });
        
        // Find and select the target node
        const node = state.nodes.find((n: Node) => n.id === nodeId);
        if (node) {
          node.selected = true;
          state.selectedElements = [node];
          
          // Only update the current style settings if this is not a group
          if (!node.data?.isGroup) {
            // Update the current stroke and fill colors based on the selected node
            if (node.style) {
              const borderColor = node.style.borderColor as string;
              const backgroundColor = node.style.backgroundColor as string;
              const borderRadius = node.style.borderRadius as string;
              const borderWidth = node.style.borderWidth as number;
              const borderStyle = node.style.borderStyle as string;
              
              if (borderColor) {
                state.strokeColor = getTailwindColorName(borderColor);
              }
              
              if (backgroundColor) {
                state.fillColor = getTailwindColorName(backgroundColor);
              }
              
              if (borderRadius) {
                // Extract the numeric value from the borderRadius string (e.g., "10px" -> 10)
                const radiusValue = parseInt((borderRadius.match(/\d+/) || ['0'])[0], 10);
                state.borderRadius = radiusValue;
              }
              
              if (borderWidth !== undefined) {
                state.strokeWidth = borderWidth;
              }
              
              if (borderStyle && ['solid', 'dashed', 'dotted'].includes(borderStyle)) {
                state.strokeStyle = borderStyle as 'solid' | 'dashed' | 'dotted';
              }
            }
          }
        }
      }),
      
    createShapeAtPosition: (type, x, y, data = {}) => {
      let createdNode: Node | null = null;
      
      set((state) => {
        // Generate a unique ID for the new node
        const id = `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Get the theme information from the data object
        const isDark = data.isDarkTheme === true;
        
        // Create the node using NodeRegistry with theme awareness
        const baseNode = nodeRegistry.createNode(type, { x, y }, id, isDark);
        
        // Apply current state settings and merge with any provided data
        const newNode: Node = {
          ...baseNode,
          data: {
            ...baseNode.data,
            ...data,
          },
          // Apply custom dimensions if provided
          dimensions: data.customDimensions ? 
            { width: (data.customDimensions as { width: number; height: number }).width, 
              height: (data.customDimensions as { width: number; height: number }).height } : 
            baseNode.dimensions,
          selected: true,
          // Use the utility function to merge styles consistently
          style: mergeNodeStyles(baseNode.style, state, type)
        };
        
        // Add the node to the canvas
        state.nodes.push(newNode);
        
        // Select the new node
        state.nodes.forEach((node: Node) => {
          node.selected = node.id === id;
        });
        
        state.selectedElements = [newNode];
        
        // Switch to select tool for all shapes
        state.activeTool = 'select';
        
        // Store the created node
        createdNode = newNode;
        
        // Handle history
        const newState = {
          nodes: deepClone(state.nodes),
          edges: deepClone(state.edges),
          connections: deepClone(state.connections)
        };
        
        // If this is the first node, initialize history with empty state first
        if (state.history.length === 0) {
          state.history.push({
            nodes: [],
            edges: [],
            connections: []
          });
          state.historyIndex = 0;
        }
        
        // Add the new state to history
        state.history.push(newState);
        state.historyIndex = state.history.length - 1;
      });
      
      return createdNode!;
    },
    
    updateNodePosition: (nodeId, x, y) => {
      set((state) => {
        const nodeIndex = state.nodes.findIndex((n: Node) => n.id === nodeId);
        if (nodeIndex === -1) return state;
        
        // Update the node position
        state.nodes[nodeIndex] = {
          ...state.nodes[nodeIndex],
          position: { x, y }
        };
        
        // Find all connections that involve this node
        const nodeConnections = state.connections.filter((conn: Connection) => conn.shapeId === nodeId);
        
        // If there are connections, update the connected lines
        if (nodeConnections.length > 0) {
          // For each connection, update the line
          nodeConnections.forEach((connection: Connection) => {
            const lineIndex = state.nodes.findIndex((n: Node) => n.id === connection.lineId);
            if (lineIndex !== -1) {
              const lineNode = state.nodes[lineIndex];
              
              // Create a deep copy of the line node to avoid modifying the original
              const lineCopy = deepClone(lineNode);
              
              // Update the line based on its type
              const updatedLine = connectionManager.updateAllLineConnections(lineCopy, state.connections, state.nodes);
              
              // Update the line in the nodes array
              state.nodes[lineIndex] = updatedLine;
            }
          });
        }
        
        // With Immer, we don't need to return anything when we modify the draft state
      });
    },
      
    updateNodeDimensions: (nodeId, width, height, direction = 'se') =>
      set((state) => {
        const node = state.nodes.find((n: Node) => n.id === nodeId);
        if (!node || !node.dimensions) return;
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        // Handle line and arrow nodes differently
        if (['line', 'arrow'].includes(node.type) && node.points && node.points.length >= 2) {
          // Calculate the change in dimensions
          const dx = width - node.dimensions.width;
          const dy = height - node.dimensions.height;
          
          // Resize the line node
          resizeLineNode(node, direction, dx, dy, state.snapToGrid, state.gridSize);
          
          // Update all connections for this line
          const updatedNode = connectionManager.updateAllLineConnections(node, state.connections, state.nodes);
          
          // Update the node with the updated values
          node.points = updatedNode.points;
          node.position = updatedNode.position;
          node.dimensions = updatedNode.dimensions;
        } else {
          // Apply grid snapping if enabled
          if (state.snapToGrid) {
            node.dimensions.width = Math.round(width / state.gridSize) * state.gridSize;
            node.dimensions.height = Math.round(height / state.gridSize) * state.gridSize;
          } else {
            node.dimensions.width = width;
            node.dimensions.height = height;
          }
          
          // If this is an icon shape, update the icon size to match the new dimensions
          if (node.type === 'icon' || node.data?.isIcon === true) {
            // Use the smaller of width and height to maintain aspect ratio
            const newIconSize = Math.min(node.dimensions.width, node.dimensions.height);
            
            // Update the icon size in the node data
            if (node.data) {
              node.data.iconSize = newIconSize;
            }
          }
          
          // Find all lines connected to this shape and update them
          const connectedLineIds = new Set<string>();
          
          // Find all connections where this shape is involved
          state.connections.forEach((connection: Connection) => {
            // This shape is connected to a line
            if (connection.shapeId === nodeId) {
              connectedLineIds.add(connection.lineId);
            }
          });
          
          // Now update all the connected lines
          connectedLineIds.forEach(lineId => {
            const lineIndex = state.nodes.findIndex((n: Node) => n.id === lineId);
            if (lineIndex !== -1) {
              const line = state.nodes[lineIndex];
              
              // Use the utility function to update all connections for this line
              const updatedLine = connectionManager.updateAllLineConnections(line, state.connections, state.nodes);
              
              // Update the line with the updated values
              state.nodes[lineIndex] = updatedLine;
            }
          });
        }
      }),
    
    // Alignment actions
    alignTop: () =>
      set((state) => {
        const selectedNodes = state.nodes.filter((node: Node) => node.selected);
        if (selectedNodes.length <= 1) return; // Need at least 2 nodes to align
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        // Find the topmost position among selected nodes
        const topPosition = Math.min(...selectedNodes.map((node: Node) => node.position.y));
        console.log('Aligning to top position:', topPosition);
        
        // Align all selected nodes to the topmost position
        selectedNodes.forEach((node: Node) => {
          node.position.y = topPosition;
        });
      }),
      
    alignMiddle: () =>
      set((state) => {
        const selectedNodes = state.nodes.filter((node: Node) => node.selected);
        if (selectedNodes.length <= 1) return; // Need at least 2 nodes to align
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        // Calculate the average vertical center of all selected nodes
        const centerY = selectedNodes.reduce((sum: number, node: Node) => {
          const nodeHeight = node.dimensions?.height || 0;
          return sum + (node.position.y + nodeHeight / 2);
        }, 0) / selectedNodes.length;
        console.log('Aligning to middle position:', centerY);
        
        // Align all selected nodes to the average center
        selectedNodes.forEach((node: Node) => {
          const nodeHeight = node.dimensions?.height || 0;
          node.position.y = centerY - nodeHeight / 2;
        });
      }),
      
    alignBottom: () =>
      set((state) => {
        const selectedNodes = state.nodes.filter((node: Node) => node.selected);
        if (selectedNodes.length <= 1) return; // Need at least 2 nodes to align
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        // Find the bottommost position among selected nodes
        const bottomPosition = Math.max(...selectedNodes.map((node: Node) => {
          const nodeHeight = node.dimensions?.height || 0;
          return node.position.y + nodeHeight;
        }));
        console.log('Aligning to bottom position:', bottomPosition);
        
        // Align all selected nodes to the bottommost position
        selectedNodes.forEach((node: Node) => {
          const nodeHeight = node.dimensions?.height || 0;
          node.position.y = bottomPosition - nodeHeight;
        });
      }),
      
    alignLeft: () =>
      set((state) => {
        const selectedNodes = state.nodes.filter((node: Node) => node.selected);
        if (selectedNodes.length <= 1) return; // Need at least 2 nodes to align
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        // Find the leftmost position among selected nodes
        const leftPosition = Math.min(...selectedNodes.map((node: Node) => node.position.x));
        console.log('Aligning to left position:', leftPosition);
        
        // Align all selected nodes to the leftmost position
        selectedNodes.forEach((node: Node) => {
          node.position.x = leftPosition;
        });
      }),
      
    alignCenter: () =>
      set((state) => {
        const selectedNodes = state.nodes.filter((node: Node) => node.selected);
        if (selectedNodes.length <= 1) return; // Need at least 2 nodes to align
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        // Calculate the average horizontal center of all selected nodes
        const centerX = selectedNodes.reduce((sum: number, node: Node) => {
          const nodeWidth = node.dimensions?.width || 0;
          return sum + (node.position.x + nodeWidth / 2);
        }, 0) / selectedNodes.length;
        console.log('Aligning to center position:', centerX);
        
        // Align all selected nodes to the average center
        selectedNodes.forEach((node: Node) => {
          const nodeWidth = node.dimensions?.width || 0;
          node.position.x = centerX - nodeWidth / 2;
        });
      }),
      
    alignRight: () =>
      set((state) => {
        const selectedNodes = state.nodes.filter((node: Node) => node.selected);
        if (selectedNodes.length <= 1) return; // Need at least 2 nodes to align
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        // Find the rightmost position among selected nodes
        const rightPosition = Math.max(...selectedNodes.map((node: Node) => {
          const nodeWidth = node.dimensions?.width || 0;
          return node.position.x + nodeWidth;
        }));
        console.log('Aligning to right position:', rightPosition);
        
        // Align all selected nodes to the rightmost position
        selectedNodes.forEach((node: Node) => {
          const nodeWidth = node.dimensions?.width || 0;
          node.position.x = rightPosition - nodeWidth;
        });
      }),
      
    distributeHorizontally: () =>
      set((state) => {
        const selectedNodes = state.nodes.filter((node: Node) => node.selected);
        if (selectedNodes.length <= 2) return; // Need at least 3 nodes to distribute
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        // Sort nodes by their x position
        const sortedNodes = [...selectedNodes].sort((a, b) => a.position.x - b.position.x);
        
        // Find the leftmost and rightmost positions
        const leftmostNode = sortedNodes[0];
        const rightmostNode = sortedNodes[sortedNodes.length - 1];
        
        const leftX = leftmostNode.position.x;
        const rightX = rightmostNode.position.x + (rightmostNode.dimensions?.width || 0);
        const totalWidth = rightX - leftX;
        
        console.log('Distributing horizontally from', leftX, 'to', rightX);
        
        // Calculate the spacing between nodes
        const spacing = totalWidth / (sortedNodes.length - 1);
        
        // Distribute the nodes evenly
        sortedNodes.forEach((node, index) => {
          if (index === 0 || index === sortedNodes.length - 1) return; // Skip first and last nodes
          
          const nodeWidth = node.dimensions?.width || 0;
          const newX = leftX + spacing * index - nodeWidth / 2;
          console.log(`Node ${index} positioned at ${newX}`);
          node.position.x = newX;
        });
      }),
      
    distributeVertically: () =>
      set((state) => {
        const selectedNodes = state.nodes.filter((node: Node) => node.selected);
        if (selectedNodes.length <= 2) return; // Need at least 3 nodes to distribute
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        // Sort nodes by their y position
        const sortedNodes = [...selectedNodes].sort((a, b) => a.position.y - b.position.y);
        
        // Find the topmost and bottommost positions
        const topmostNode = sortedNodes[0];
        const bottommostNode = sortedNodes[sortedNodes.length - 1];
        
        const topY = topmostNode.position.y;
        const bottomY = bottommostNode.position.y + (bottommostNode.dimensions?.height || 0);
        const totalHeight = bottomY - topY;
        
        console.log('Distributing vertically from', topY, 'to', bottomY);
        
        // Calculate the spacing between nodes
        const spacing = totalHeight / (sortedNodes.length - 1);
        
        // Distribute the nodes evenly
        sortedNodes.forEach((node, index) => {
          if (index === 0 || index === sortedNodes.length - 1) return; // Skip first and last nodes
          
          const nodeHeight = node.dimensions?.height || 0;
          const newY = topY + spacing * index - nodeHeight / 2;
          console.log(`Node ${index} positioned at ${newY}`);
          node.position.y = newY;
        });
      }),
      
    // Group selected nodes
    groupSelectedNodes: () =>
      set((state) => {
        console.log('groupSelectedNodes called');
        
        const selectedNodes = state.nodes.filter((node: Node) => node.selected);
        if (selectedNodes.length <= 1) {
          console.log('Not enough nodes selected for grouping, need at least 2');
          return;
        }
        
        console.log('Grouping', selectedNodes.length, 'nodes');
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        // Generate a unique ID for the group
        const groupId = `group-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Calculate the bounding box of all selected nodes
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        
        selectedNodes.forEach((node: Node) => {
          const nodeWidth = node.dimensions?.width || 0;
          const nodeHeight = node.dimensions?.height || 0;
          
          minX = Math.min(minX, node.position.x);
          minY = Math.min(minY, node.position.y);
          maxX = Math.max(maxX, node.position.x + nodeWidth);
          maxY = Math.max(maxY, node.position.y + nodeHeight);
        });
        
        // Calculate group dimensions before padding
        const groupWidth = maxX - minX;
        const groupHeight = maxY - minY;
        
        // Calculate proportional padding (5% of the group's width/height, with a minimum of 10px and maximum of 40px)
        const paddingX = Math.min(Math.max(groupWidth * 0.05, 10), 40);
        const paddingY = Math.min(Math.max(groupHeight * 0.05, 10), 40);
        
        // Apply padding
        minX -= paddingX;
        minY -= paddingY;
        maxX += paddingX;
        maxY += paddingY;
        
        // Update group dimensions with padding
        const paddedGroupWidth = maxX - minX;
        const paddedGroupHeight = maxY - minY;
        
        // Create a group node with invisible border by default
        // The border will only be visible when selected
        const groupNode: Node = {
          id: groupId,
          type: 'rectangle',
          position: { x: minX, y: minY },
          data: { 
            isGroup: true,
            // Store original positions of child nodes relative to the group
            // This will help with proper ungrouping if the group is moved
            originalChildPositions: selectedNodes.map((node: Node) => ({
              nodeId: node.id,
              relativePosition: {
                x: node.position.x - minX,
                y: node.position.y - minY
              }
            }))
          },
          dimensions: { width: paddedGroupWidth, height: paddedGroupHeight },
          style: {
            backgroundColor: 'transparent', // Always transparent
            borderColor: 'transparent', // Invisible by default
            borderWidth: 2,
            borderStyle: 'dashed',
            borderRadius: '4px',
            pointerEvents: 'all', // Make sure the group is interactive
          },
          selected: true,
        };
        
        // Set the parentId for all selected nodes
        selectedNodes.forEach((node: Node) => {
          node.parentId = groupId;
          node.selected = false;
          
          // Adjust positions to be relative to the group
          node.position = {
            x: node.position.x - minX,
            y: node.position.y - minY
          };
        });
        
        // Deselect all nodes and select only the group
        state.nodes.forEach((node: Node) => {
          node.selected = false;
        });
        
        // Add the group node to the nodes array
        state.nodes.push(groupNode);
        
        // Update selected elements
        state.selectedElements = [groupNode];
        
        console.log('Grouping complete, created group with ID:', groupId);
      }),
      
    // Ungroup selected nodes
    ungroupSelectedNodes: () =>
      set((state) => {
        console.log('ungroupSelectedNodes called');
        
        const selectedGroups = state.nodes.filter((node: Node) => 
          node.selected && node.data?.isGroup === true
        );
        
        if (selectedGroups.length === 0) {
          console.log('No groups selected for ungrouping');
          return;
        }
        
        console.log('Ungrouping', selectedGroups.length, 'groups');
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        // Process each selected group
        selectedGroups.forEach((group: Node) => {
          console.log('Processing group:', group.id);
          
          // Find all child nodes of this group
          const childNodes = state.nodes.filter((node: Node) => node.parentId === group.id);
          console.log('Found', childNodes.length, 'child nodes in group');
          
          // Check if we have stored original positions
          const originalPositions = group.data?.originalChildPositions as Array<{
            nodeId: string;
            relativePosition: { x: number; y: number };
          }> | undefined;
          
          // Adjust positions back to absolute coordinates
          childNodes.forEach((node: Node) => {
            // If we have the original relative position for this node, use it
            // This ensures proper positioning even if the group has been moved
            const originalPosition = originalPositions?.find(p => p.nodeId === node.id)?.relativePosition;
            
            if (originalPosition) {
              // Use the original relative position plus the current group position
              node.position = {
                x: originalPosition.x + group.position.x,
                y: originalPosition.y + group.position.y
              };
            } else {
              // Fallback to the current relative position
              node.position = {
                x: node.position.x + group.position.x,
                y: node.position.y + group.position.y
              };
            }
            
            node.parentId = undefined;
            node.selected = true;
          });
          
          // Remove the group node
          state.nodes = state.nodes.filter((node: Node) => node.id !== group.id);
        });
        
        // Update selected elements to be the child nodes
        state.selectedElements = state.nodes.filter((node: Node) => node.selected);
        
        console.log('Ungrouping complete, selected', state.selectedElements.length, 'child nodes');
      }),
    
    // Toggle presentation mode
    togglePresentationMode: () => {
      set(state => {
        state.presentationMode = !state.presentationMode;
      });
    },
    
    // Line drawing actions
    startLineDraw: (x, y, type) =>
      set((state) => {
        if (state.lineInProgress) {
          // Add the current line to the canvas
          state.nodes.push(state.lineInProgress);
          
          // Reset line in progress
          state.lineInProgress = null;
        }
        
        // Generate a unique ID for the new line
        const id = `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Determine if we're in dark mode
        let isDark = false;
        if (typeof window !== 'undefined') {
          const storedTheme = localStorage.getItem('theme');
          if (storedTheme === 'dark') isDark = true;
          else if (storedTheme !== 'light' && window.matchMedia && 
                   window.matchMedia('(prefers-color-scheme: dark)').matches) {
            isDark = true;
          }
        }
        
        // Get the current fill color for markers
        const fillColorHex = getTailwindColor(state.fillColor);
        
        // Create a new line node using NodeRegistry with theme awareness
        const baseNode = nodeRegistry.createNode(type, { x, y }, id, isDark);
        
        // Create a new line node with initial points
        const newLine: Node = {
          ...baseNode,
          dimensions: { width: 1, height: 1 }, // Will be calculated based on points
          // Use the utility function to merge styles consistently
          style: {
            ...mergeNodeStyles(baseNode.style, state, type),
            backgroundColor: fillColorHex, // Add fill color for markers
          },
          points: [
            { x: 0, y: 0 }, // First point is at the origin (relative to position)
            { x: 0, y: 0 }  // Second point starts at the same place, will be updated
          ],
          data: {
            ...baseNode.data,
            startMarker: state.startMarker,
            endMarker: state.endMarker,
            markerFillStyle: state.markerFillStyle,
            fillColor: fillColorHex // Store fill color in data too
          }
        };
        
        state.lineInProgress = newLine;
        
        // Keep the line tool active
        state.activeTool = type === 'arrow' ? 'arrow' : 'line';
      }),
    
    updateLineDraw: (x, y, isShiftPressed = false) =>
      set((state) => {
        if (!state.lineInProgress) return;
        
        // Get the current line
        const line = state.lineInProgress;
        
        // Calculate the position relative to the line's origin
        const relativeX = x - line.position.x;
        const relativeY = y - line.position.y;
        
        // Check if this is a direct connection point coordinate
        // If isShiftPressed is explicitly false (not just falsy), we're connecting to a connection point
        // and should use exact coordinates without any snapping or constraints
        const isExactConnectionPoint = isShiftPressed === false;
        
        // Apply grid snapping if enabled and not connecting to a connection point
        let snappedX = isExactConnectionPoint ? relativeX : 
          (state.snapToGrid ? Math.round(relativeX / state.gridSize) * state.gridSize : relativeX);
        let snappedY = isExactConnectionPoint ? relativeY :
          (state.snapToGrid ? Math.round(relativeY / state.gridSize) * state.gridSize : relativeY);
        
        // If shift is pressed, constrain to perfect angles
        if (isShiftPressed && line.points && line.points.length > 0) {
          const lastPoint = line.points[line.points.length - 2]; // Get the previous point
          const dx = snappedX - lastPoint.x;
          const dy = snappedY - lastPoint.y;
          
          // Calculate the angle
          const angle = Math.atan2(dy, dx);
          
          // Snap to 45-degree increments
          const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          
          // Calculate the distance
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Calculate the new point position
          snappedX = lastPoint.x + Math.cos(snappedAngle) * distance;
          snappedY = lastPoint.y + Math.sin(snappedAngle) * distance;
          
          // Re-apply grid snapping if enabled
          if (state.snapToGrid) {
            snappedX = Math.round(snappedX / state.gridSize) * state.gridSize;
            snappedY = Math.round(snappedY / state.gridSize) * state.gridSize;
          }
        }
        
        // Update the last point
        if (line.points && line.points.length > 0) {
          // If this is an exact connection point, use the exact relative coordinates
          line.points[line.points.length - 1] = { x: snappedX, y: snappedY };
          
          // Use the utility function to calculate the bounding box
      const boundingBox = calculateBoundingBox(line.points, LINE_BOUNDING_BOX_PADDING);
          
          // Update dimensions
          line.dimensions = boundingBox.dimensions;
          
          // Apply position adjustment if needed
          if (boundingBox.positionAdjustment) {
            line.position.x += boundingBox.positionAdjustment.x;
            line.position.y += boundingBox.positionAdjustment.y;
            
            // Adjust all points
            for (let i = 0; i < line.points.length; i++) {
              line.points[i].x += boundingBox.pointAdjustments.x;
              line.points[i].y += boundingBox.pointAdjustments.y;
            }
          }
        }
      }),
    
    addPointToLine: () =>
      set((state) => {
        if (!state.lineInProgress || !state.lineInProgress.points) return;
        
        // Get the current line
        const line = state.lineInProgress;
        
        // We've already checked that line.points exists
        const points = line.points!;
        
        // Get the last point
        const lastPoint = points[points.length - 1];
        
        // Add a new point at the same position as the last point
        points.push({ ...lastPoint });
      }),
    
    finishLineDraw: () =>
      set((state) => {
        if (!state.lineInProgress) return;
        
        // Only add the line if it has at least two distinct points
        if (state.lineInProgress.points && state.lineInProgress.points.length >= 2) {
          // Add the line to the canvas
          state.nodes.push(state.lineInProgress);
          
          // Select the new line
          state.nodes.forEach((node: Node) => {
            node.selected = node.id === state.lineInProgress?.id;
          });
          
          state.selectedElements = state.lineInProgress ? [state.lineInProgress] : [];
          
          // Push to history
          get().pushToHistory();
        }
        
        // Reset line in progress
        state.lineInProgress = null;
        
        // Switch to select tool
        state.activeTool = 'select';
      }),
    
    cancelLineDraw: () =>
      set((state) => {
        // Reset line in progress
        state.lineInProgress = null;
        
        // Switch to select tool
        state.activeTool = 'select';
      }),
    
    // Line point editing actions
    selectLinePoint: (nodeId, pointIndex, multiSelect = false) =>
      set((state) => {
        // Find the node
        const node = state.nodes.find((n: Node) => n.id === nodeId);
        if (!node || !node.points) return;
        
        // Check if this is an elbow line
        const isElbowLineNode = isElbowLine(node);
        
        // For elbow lines, only allow selecting endpoints (first and last points)
        if (isElbowLineNode && pointIndex > 0 && pointIndex < node.points.length - 1) {
          return; // Ignore selection of middle points for elbow lines
        }
        
        // Select the node first
        state.nodes.forEach((n: Node) => {
          n.selected = n.id === nodeId;
        });
        
        state.selectedElements = node ? [node] : [];
        
        // Update selected point indices
        if (multiSelect && state.selectedPointIndices) {
          // If already selected, deselect it
          if (state.selectedPointIndices.includes(pointIndex)) {
            state.selectedPointIndices = state.selectedPointIndices.filter((i: number) => i !== pointIndex);
          } else {
            state.selectedPointIndices = [...state.selectedPointIndices, pointIndex];
          }
        } else {
          // Single select
          state.selectedPointIndices = [pointIndex];
        }
      }),
    
    deselectLinePoints: () =>
      set((state) => {
        state.selectedPointIndices = null;
      }),
    
    moveLinePoint: (nodeId, pointIndex, x, y) =>
      set((state) => {
        // Find the node
        const node = state.nodes.find((n: Node) => n.id === nodeId);
        if (!node || !node.points || pointIndex >= node.points.length) return;
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        // Determine if this is a start or end point, and get marker info
        const isStart = pointIndex === 0;
        const isEnd = pointIndex === node.points.length - 1;
        const startOrEnd = isStart ? 'start' : isEnd ? 'end' : undefined;
        
        // Get marker information from the node's data if available
        const nodeData = node.data || {};
        const startMarker = nodeData.startMarker as MarkerShape || 'none';
        const endMarker = nodeData.endMarker as MarkerShape || 'none';
        
        // Check if we should snap to a connection point on another node
        const nearestConnectionPoint = connectionManager.findNearestConnectionPoint(
          state.nodes,
          { x, y },
          nodeId, // Exclude the current line node
          { isConnected: true, startOrEnd, startMarker, endMarker }
        );
        
        let finalX = x;
        let finalY = y;
        
        if (nearestConnectionPoint) {
          // Snap to the connection point
          finalX = nearestConnectionPoint.absolutePosition.x;
          finalY = nearestConnectionPoint.absolutePosition.y;
          
          // Create or update a connection
          state.connections = state.connections.filter((conn: Connection) => 
            !(conn.lineId === nodeId && conn.pointIndex === pointIndex)
          );
          
          // Add the new connection
          state.connections.push({
            lineId: nodeId,
            pointIndex: pointIndex,
            shapeId: nearestConnectionPoint.node.id,
            position: nearestConnectionPoint.position,
            dynamic: true // Enable dynamic connection points
          });
          
          console.log(`Connected line point ${pointIndex} to node ${nearestConnectionPoint.node.id} at position ${nearestConnectionPoint.position}`);
        } else {
          // Remove any existing connection for this point
          state.connections = state.connections.filter((conn: Connection) => 
            !(conn.lineId === nodeId && conn.pointIndex === pointIndex)
          );
          
          // Apply grid snapping if enabled and not snapping to a connection point
          if (state.snapToGrid) {
            finalX = Math.round(finalX / state.gridSize) * state.gridSize;
            finalY = Math.round(finalY / state.gridSize) * state.gridSize;
          }
        }
        
        // Calculate the position relative to the node's origin
        const relativeX = finalX - node.position.x;
        const relativeY = finalY - node.position.y;
        
        // Update the point
        node.points[pointIndex] = { x: relativeX, y: relativeY };
        
        // Check if this is an elbow line and we're moving an endpoint
        const isElbowLineNode = isElbowLine(node);
        const isEndpoint = pointIndex === 0 || pointIndex === node.points.length - 1;
        
        if (isElbowLineNode && isEndpoint && node.points.length === 3) {
          // Adjust middle point to maintain L-shape after moving an endpoint
          node.points = adjustElbowMiddlePoint([...node.points], pointIndex);
        }
        
        // Use the utility function to calculate the bounding box
        const boundingBox = calculateBoundingBox(node.points, LINE_BOUNDING_BOX_PADDING);
        
        // Update dimensions
        node.dimensions = boundingBox.dimensions;
        
        // Apply position adjustment if needed
        if (boundingBox.positionAdjustment) {
          node.position.x += boundingBox.positionAdjustment.x;
          node.position.y += boundingBox.positionAdjustment.y;
          
          // Adjust all points
          for (let i = 0; i < node.points.length; i++) {
            node.points[i].x += boundingBox.pointAdjustments.x;
            node.points[i].y += boundingBox.pointAdjustments.y;
          }
        }
      }),
    
    addPointToExistingLine: (nodeId, segmentIndex, x, y) =>
      set((state) => {
        // Find the node
        const node = state.nodes.find((n: Node) => n.id === nodeId);
        if (!node || !node.points || segmentIndex >= node.points.length - 1) return;
        
        // Check if this is an elbow line - don't allow adding points to elbow lines
        const isElbowLineNode = isElbowLine(node);
        if (isElbowLineNode) return;
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        // Get marker information from the node's data if available
        const nodeData = node.data || {};
        const startMarker = nodeData.startMarker as MarkerShape || 'none';
        const endMarker = nodeData.endMarker as MarkerShape || 'none';
        
        // Check if we should snap to a connection point on another node
        const nearestConnectionPoint = connectionManager.findNearestConnectionPoint(
          state.nodes,
          { x, y },
          nodeId, // Exclude the current line node
          { isConnected: true, startOrEnd: undefined, startMarker, endMarker }
        );
        
        let finalX = x;
        let finalY = y;
        
        if (nearestConnectionPoint) {
          // Snap to the connection point
          finalX = nearestConnectionPoint.absolutePosition.x;
          finalY = nearestConnectionPoint.absolutePosition.y;
        } else if (state.snapToGrid) {
          // Apply grid snapping if enabled and not snapping to a connection point
          finalX = Math.round(finalX / state.gridSize) * state.gridSize;
          finalY = Math.round(finalY / state.gridSize) * state.gridSize;
        }
        
        // Calculate the position relative to the node's origin
        const relativeX = finalX - node.position.x;
        const relativeY = finalY - node.position.y;
        
        // Create a new point
        const newPoint = { x: relativeX, y: relativeY };
        
        // Insert the new point after the segment index
        node.points.splice(segmentIndex + 1, 0, newPoint);
        
        // Select the new point
        state.selectedPointIndices = [segmentIndex + 1];
        
        // If we snapped to a connection point, create a connection
        if (nearestConnectionPoint) {
          // Add the new connection
          state.connections.push({
            lineId: nodeId,
            pointIndex: segmentIndex + 1, // The index of our new point
            shapeId: nearestConnectionPoint.node.id,
            position: nearestConnectionPoint.position,
            dynamic: true // Enable dynamic connection points
          });
        }
        
        // Use the utility function to calculate the bounding box
        const boundingBox = calculateBoundingBox(node.points, LINE_BOUNDING_BOX_PADDING);
        
        // Update dimensions
        node.dimensions = boundingBox.dimensions;
        
        // Apply position adjustment if needed
        if (boundingBox.positionAdjustment) {
          node.position.x += boundingBox.positionAdjustment.x;
          node.position.y += boundingBox.positionAdjustment.y;
          
          // Adjust all points
          for (let i = 0; i < node.points.length; i++) {
            node.points[i].x += boundingBox.pointAdjustments.x;
            node.points[i].y += boundingBox.pointAdjustments.y;
          }
        }
      }),
    
    deleteSelectedPoints: () =>
      set((state) => {
        if (!state.selectedPointIndices || state.selectedPointIndices.length === 0) return;
        
        // Find the selected node
        const selectedNode = state.nodes.find((node: Node) => node.selected);
        if (!selectedNode || !selectedNode.points) return;
        
        // Ensure we don't delete all points - need at least 2 for a line
        if (selectedNode.points.length - state.selectedPointIndices.length < 2) {
          // If trying to delete too many points, just delete the node
          state.nodes = state.nodes.filter((node: Node) => node.id !== selectedNode.id);
          state.selectedPointIndices = null;
          return;
        }
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        // Sort indices in descending order to avoid index shifting during removal
        const sortedIndices = [...state.selectedPointIndices].sort((a, b) => b - a);
        
        // Remove the points
        for (const index of sortedIndices) {
          if (index < selectedNode.points.length) {
            selectedNode.points.splice(index, 1);
          }
        }
        
        // Clear selected point indices
        state.selectedPointIndices = null;
        
        // Recalculate dimensions based on points
        const allX = selectedNode.points.map((p: { x: number; y: number }) => p.x);
        const allY = selectedNode.points.map((p: { x: number; y: number }) => p.y);
        const minX = Math.min(...allX);
        const maxX = Math.max(...allX);
        const minY = Math.min(...allY);
        const maxY = Math.max(...allY);
        
        // Add padding to the bounding box
        const paddedMinX = minX - LINE_BOUNDING_BOX_PADDING;
        const paddedMaxX = maxX + LINE_BOUNDING_BOX_PADDING;
        const paddedMinY = minY - LINE_BOUNDING_BOX_PADDING;
        const paddedMaxY = maxY + LINE_BOUNDING_BOX_PADDING;
        
        // Update position and dimensions to properly contain all points with padding
        if (paddedMinX < 0 || paddedMinY < 0) {
          // Adjust position to the top-left corner of the padded bounding box
          selectedNode.position.x += paddedMinX;
          selectedNode.position.y += paddedMinY;
          
          // Adjust all points to be relative to the new position
          for (let i = 0; i < selectedNode.points.length; i++) {
            selectedNode.points[i].x -= paddedMinX;
            selectedNode.points[i].y -= paddedMinY;
          }
          
          // Update dimensions to the size of the padded bounding box
          selectedNode.dimensions = {
            width: Math.max(paddedMaxX - paddedMinX, 1),
            height: Math.max(paddedMaxY - paddedMinY, 1)
          };
        } else {
          // No need to adjust position, just update dimensions with padding
          selectedNode.dimensions = {
            width: Math.max(paddedMaxX, 1),
            height: Math.max(paddedMaxY, 1)
          };
        }
      }),
    
    // Text state
    fontSize: 14,
    textAlign: 'left' as const,
    verticalAlign: 'top' as const,  // Add this line
    fontWeight: 400, // Add fontWeight property
    
    // Text actions
    setTextColor: (color: string) => {
      set(state => {
        state.textColor = color;
        state.nodes.forEach((node: Node) => {
          if (node.selected && node.type === 'text') {
            if (!node.style) node.style = {};
            node.style.textColor = color;
          }
        });
      });
    },
    
    setFontSize: (size: number) => {
      set(state => {
        state.fontSize = size;
        state.nodes.forEach((node: Node) => {
          if (node.selected && node.type === 'text') {
            if (!node.style) node.style = {};
            node.style.fontSize = `${size}px`;
          }
        });
      });
    },
    
    setTextAlign: (align: 'left' | 'center' | 'right') => {
      set(state => {
        state.textAlign = align;
        state.nodes.forEach((node: Node) => {
          if (node.selected && node.type === 'text') {
            if (!node.style) node.style = {};
            node.style.textAlign = align;
          }
        });
      });
    },
    
    setVerticalAlign: (align: 'top' | 'middle' | 'bottom') => {
      set(state => {
        state.verticalAlign = align;
        state.nodes.forEach((node: Node) => {
          if (node.selected && node.type === 'text') {
            if (!node.style) node.style = {};
            node.style.verticalAlign = align;
          }
        });
      });
    },
    
    setFontWeight: (weight: number) => {
      set(state => {
        state.fontWeight = weight;
        state.nodes.forEach((node: Node) => {
          if (node.selected && node.type === 'text') {
            if (!node.style) node.style = {};
            node.style.fontWeight = weight;
          }
        });
      });
    },

    // Add this new function after the duplicateSelectedNodes function
    duplicateNodeToRight: (nodeId: string, spacing: number) => {
      let duplicatedNode: Node | undefined;
      
      set((state) => {
        // Find the node to duplicate
        const nodeToDuplicate = state.nodes.find((node: Node) => node.id === nodeId);
        if (!nodeToDuplicate) return;
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        // Deselect all nodes first
        state.nodes.forEach((node: Node) => {
          node.selected = false;
        });
        
        // Create duplicate with new ID and position to the right
        const duplicate = {
          ...nodeToDuplicate,
          id: `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          position: {
            x: nodeToDuplicate.position.x + (nodeToDuplicate.dimensions?.width || 0) + spacing,
            y: nodeToDuplicate.position.y
          },
          selected: true
        };
        
        // Add duplicate to the nodes array
        state.nodes.push(duplicate);
        
        // Update selected elements
        state.selectedElements = [duplicate];
        
        // Store the duplicated node to return it
        duplicatedNode = duplicate;
      });
      
      return duplicatedNode;
    },
    
    // Line marker actions
    setStartMarker: (marker: MarkerShape) =>
      set((state) => {
        state.startMarker = marker;
      }),
    
    setEndMarker: (marker: MarkerShape) =>
      set((state) => {
        state.endMarker = marker;
      }),
    
    setMarkerFillStyle: (style: FillStyle) =>
      set((state) => {
        state.markerFillStyle = style;
      }),
    
    updateSelectedLineMarkers: () =>
      set((state) => {
        // Push current state to history before making changes
        get().pushToHistory();
        
        // Get the current fill color 
        const fillColorHex = getTailwindColor(state.fillColor);
        
        let updatedAnyNode = false;
        
        state.nodes.forEach((node: Node) => {
          if (node.selected && (node.type === 'line' || node.type === 'arrow')) {
            if (!node.data) node.data = {};
            
            // Update marker settings
            node.data.startMarker = state.startMarker;
            node.data.endMarker = state.endMarker;
            node.data.markerFillStyle = state.markerFillStyle;
            
            // Ensure fillColor is set in both data and style
            // Use existing fillColor if available, otherwise use current fillColor
            const currentFillColor = node.data.fillColor || fillColorHex;
            node.data.fillColor = currentFillColor;
            
            if (!node.style) node.style = {};
            node.style.backgroundColor = currentFillColor;
            
            updatedAnyNode = true;
          }
        });
        
        // Create a new nodes array to trigger a re-render
        if (updatedAnyNode) {
          state.nodes = [...state.nodes];
        }
      }),

    // Add a function to update colors based on theme changes
    updateColorsForTheme: (isDark: boolean) => {
      const { nodes } = get();
      
      // Update colors for all nodes
      const updatedNodes = nodes.map(node => {
        if (node.style) {
          const nodeStyle = { ...node.style };
          let updated = false;
          
          // Update stroke color if present
          if (nodeStyle.stroke && typeof nodeStyle.stroke === 'string' && nodeStyle.stroke !== 'none') {
            const adjustedStrokeColor = getThemeAdjustedColor(nodeStyle.stroke, true, isDark);
            if (adjustedStrokeColor !== nodeStyle.stroke) {
              nodeStyle.stroke = adjustedStrokeColor;
              updated = true;
            }
          }
          
          // Update fill color if present
          if (nodeStyle.fill && typeof nodeStyle.fill === 'string' && nodeStyle.fill !== 'none') {
            const adjustedFillColor = getThemeAdjustedColor(nodeStyle.fill, false, isDark);
            if (adjustedFillColor !== nodeStyle.fill) {
              nodeStyle.fill = adjustedFillColor;
              updated = true;
            }
          }
          
          // Update text color if present
          if (nodeStyle.textColor && typeof nodeStyle.textColor === 'string' && nodeStyle.textColor !== 'none') {
            const adjustedTextColor = getThemeAdjustedColor(nodeStyle.textColor, true, isDark);
            if (adjustedTextColor !== nodeStyle.textColor) {
              nodeStyle.textColor = adjustedTextColor;
              updated = true;
            }
          }
          
          if (updated) {
            return { ...node, style: nodeStyle };
          }
        }
        return node;
      });
      
      // Only update if there were changes
      if (updatedNodes.some((node, i) => node !== nodes[i])) {
        set({ nodes: updatedNodes });
      }
    },
    
    lineType: 'straight',
    
    setLineType: (type) => {
      set({ lineType: type });
      // Update selected lines to use the new line type
      get().updateSelectedLineTypes();
    },
    
    updateSelectedLineTypes: () => {
      set((state) => {
        const selectedLines = state.nodes.filter(
          (node: Node) => node.selected && (node.type === 'line' || node.type === 'arrow')
        );

        if (selectedLines.length === 0) return;
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        const updatedNodes = [...state.nodes];
        
        for (const line of selectedLines) {
          const index = updatedNodes.findIndex((n: Node) => n.id === line.id);

          if (index !== -1) {
            updatedNodes[index] = {
              ...updatedNodes[index],
              data: {
                ...updatedNodes[index].data,
                lineType: state.lineType
              }
            };
            
            // If we're changing to elbow, recalculate the path and update connections
            if (state.lineType === 'elbow' && updatedNodes[index].points && updatedNodes[index].points.length >= 2) {
              // Find connections for this line
              const lineConnections = state.connections.filter((conn: Connection) => conn.lineId === line.id);

              if (lineConnections.length > 0) {
                // If there are connections, use centralized manager to update all connections (elbow-aware)
                updatedNodes[index] = connectionManager.updateAllLineConnections(updatedNodes[index], state.connections, state.nodes);
              } else {
                // If no connections, just use simple elbow points
                const startPoint = updatedNodes[index].points![0];
                const endPoint = updatedNodes[index].points![updatedNodes[index].points!.length - 1];
                updatedNodes[index].points = generateElbowConnector(startPoint, endPoint);
              }
            }
          }
        }
        
        // Update the nodes in the state
        state.nodes = updatedNodes;
      });
    },
    
    // Add setter for line animation
    setLineAnimation: (animated) => {
      set({ animated });
      // Update selected lines with the new animation state
      get().updateSelectedLineAnimations();
    },
    
    // Add function to update selected line animations
    updateSelectedLineAnimations: () =>
      set((state) => {
        const selectedLines = state.nodes.filter(
          (node: Node) => node.selected && (node.type === 'line' || node.type === 'arrow')
        );

        if (selectedLines.length === 0) return;
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        let updatedAnyNode = false;
        
        state.nodes.forEach((node: Node) => {
          if (node.selected && (node.type === 'line' || node.type === 'arrow')) {
            if (!node.data) node.data = {};
            
            // Update animation setting
            node.data.animated = state.animated;
            
            updatedAnyNode = true;
          }
        });
        
        // Create a new nodes array to trigger a re-render
        if (updatedAnyNode) {
          state.nodes = [...state.nodes];
        }
      }),

    // Add this to the CanvasState interface
    toggleNodeSelection: (nodeId) => 
      set((state) => {
        const updatedNodes = state.nodes.map((node: Node) => {
          if (node.id === nodeId) {
            return { ...node, selected: !node.selected };
          }
          return node;
        });
        
        return {
          nodes: updatedNodes,
          selectedElements: updatedNodes.filter((node: Node) => node.selected)
        };
      }),
    
      // Icon sheet state
      isIconSheetOpen: false,
      toggleIconSheet: () => set(state => {
        state.isIconSheetOpen = !state.isIconSheetOpen;
      }),

      // Examples sheet state
      isExamplesSheetOpen: false,
      toggleExamplesSheet: () => set(state => {
        state.isExamplesSheetOpen = !state.isExamplesSheetOpen;
      }),
    
    // Add this new function to the CanvasState interface
    updateSelectedIconStyles: () =>
      set((state) => {
        const strokeColorHex = getTailwindColor(state.strokeColor);
        
        // Push current state to history before making changes
        get().pushToHistory();
        
        let updatedAnyNode = false;
        
        state.nodes.forEach((node: Node) => {
          if (node.selected && node.type === 'icon') {
            if (!node.style) node.style = {};
            
            // Update icon color and stroke width
            node.style.iconColor = strokeColorHex;
            node.style.iconStrokeWidth = state.strokeWidth;
            
            // Update data properties for the icon if needed
            if (!node.data) node.data = {};
            node.data.iconStrokeWidth = state.strokeWidth;
            
            updatedAnyNode = true;
          }
        });
        
        // Create a new nodes array to trigger a re-render
        if (updatedAnyNode) {
          state.nodes = [...state.nodes];
        }
      }),
  }))
); 
