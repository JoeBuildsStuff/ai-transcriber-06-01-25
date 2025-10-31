// ======================================================
// useCanvasMouse.ts - Mouse Interaction Logic
// ======================================================
//
// Purpose:
// - Manages all mouse-related interactions for the canvas
// - Handles mouse events (down, move, up, double-click)
// - Manages selection, dragging, line drawing states
// - Implements pointer-based editing behaviors
//
// This file should contain:
// - Mouse event handlers for canvas interactions
// - Logic for detecting mouse interactions with nodes
// - Support for drag, selection, and movement operations
// - Position calculation for mouse-based operations
// - Management of mouse state (hover, drag, etc.)
//
// Add to this file when:
// - Implementing new mouse gestures/interactions
// - Enhancing selection/dragging mechanics
// - Adding point/connection detection logic
// - Implementing new drawing interactions
// - Adding snapping, guides, or alignment behaviors
//
// Example future additions:
// - Implementing multi-touch support
// - Adding lasso selection support
// - Supporting context menus at specific positions
// - Adding hover effects and tooltips
// - Implementing scroll-to-zoom behavior variations
//
// DON'T add to this file:
// - Keyboard-only interaction logic
// - Visual rendering code (this is for behavior only)
// - Complex shape algorithms (use utils)
// - State management not related to mouse interactions
// ======================================================

'use client';


import { useState, RefObject, useEffect } from 'react';
import { useCanvasStore, Node, MarkerShape } from '../lib/store/canvas-store';
import { connectionManager, isElbowLine, ConnectionPointPosition } from './../lib/connection';
import { findAlignmentGuides, findClosestLineSegment, findNodeAtPosition, isNodeInSelectionBox, getSnappedPosition } from '../lib/utils/node-utils';


export function useCanvasMouse(canvasRef: RefObject<HTMLDivElement | null>) {
  // Extract relevant state from Canvas.tsx
    // State for tracking mouse interactions
    const [isDragging, setIsDragging] = useState(false);
    const [isMovingNode, setIsMovingNode] = useState(false);
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionBox, setSelectionBox] = useState<{ start: { x: number, y: number }, end: { x: number, y: number } } | null>(null);
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    const [nodeStartPos, setNodeStartPos] = useState<Record<string, { x: number, y: number }>>({});
    const [isShiftPressed, setIsShiftPressed] = useState(false);
    const [isDrawingLine, setIsDrawingLine] = useState(false);
    const [isDraggingPoint, setIsDraggingPoint] = useState(false);
    const [activePointData, setActivePointData] = useState<{
      nodeId: string;
      pointIndex: number;
      startX: number;
      startY: number;
    } | null>(null);
    
    const [hoveredConnectionPoint, setHoveredConnectionPoint] = useState<{ nodeId: string; position: ConnectionPointPosition } | null>(null);
    const [selectedLineEndpoint, setSelectedLineEndpoint] = useState<{ nodeId: string; pointIndex: number } | null>(null);
    const [alignmentGuides, setAlignmentGuides] = useState<{
      horizontal: { y: number, start: number, end: number, type?: 'top' | 'bottom' | 'center' }[];
      vertical: { x: number, start: number, end: number, type?: 'left' | 'right' | 'center' }[];
    }>({
      horizontal: [],
      vertical: []
    });
    
    // Get store functions
    const { 
      transform, 
      activeTool, 
      gridSize, 
      snapToGrid,
      panCanvas,
      createShapeAtPosition,
      selectNode,
      updateNodePosition,
      deselectAllNodes,
      selectMultipleNodes,
      presentationMode,
      startLineDraw,
      updateLineDraw,
      finishLineDraw,
      lineInProgress,
      addPointToLine,
      selectLinePoint,
      deselectLinePoints,
      moveLinePoint,
      addPointToExistingLine,
      createConnection,
      toggleNodeSelection,
      startMarker,
      endMarker,
    } = useCanvasStore();
    
    // Get nodes from the store
    const displayNodes = useCanvasStore(state => state.nodes);

  // Handle mouse down for panning, shape creation, or node interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only handle left mouse button
    
    // If we're in presentation mode, don't allow editing
    if (presentationMode) return;
    
    // If we're in the middle of a drag operation, don't start a new one
    if (isDragging || isMovingNode || isDraggingPoint) return;
    
    // Get canvas rect
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Calculate mouse position in canvas coordinates
    const x = (e.clientX - rect.left - transform.x) / transform.zoom;
    const y = (e.clientY - rect.top - transform.y) / transform.zoom;
    
    // Apply grid snapping if enabled
    const snappedX = snapToGrid ? Math.round(x / gridSize) * gridSize : x;
    const snappedY = snapToGrid ? Math.round(y / gridSize) * gridSize : y;
    
    // Check if shift key is pressed for angle constraints
    const isShiftPressed = e.shiftKey;
    
    // Handle different tools
    if (activeTool === 'hand') {
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (['rectangle', 'circle', 'triangle', 'diamond', 'text'].includes(activeTool)) {
      // Create a new shape at the clicked position
      const newNode = createShapeAtPosition(activeTool, snappedX, snappedY);
      
      // Select the new node
      selectNode(newNode.id);
      
      // Start moving the new node
      setIsMovingNode(true);
      setActiveNodeId(newNode.id);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      
      const startPositions: Record<string, { x: number, y: number }> = {};
      startPositions[newNode.id] = {
        x: newNode.position.x,
        y: newNode.position.y
      };
      
      setNodeStartPos(startPositions);
    } else if (['line', 'arrow'].includes(activeTool)) {
      // Check if we're hovering over a connection point
      const connectionPointData = findNearbyConnectionPoint(x, y);
      
      if (connectionPointData) {
       // TODO: I dont think this is needed anymore as we are using handleConnectionPointClick
       // handleMouseDown is not fired when clicking on a connection point
       // handleConnectionPointClick is fired when clicking on a connection point
      } else {
        // If no connection point is hovered, proceed with normal line drawing
        if (lineInProgress) {
          updateLineDraw(x, y, isShiftPressed);
          addPointToLine();
        } else {
          startLineDraw(snappedX, snappedY, activeTool as 'line' | 'arrow');
          setIsDrawingLine(true);
        }
      }
    } else if (activeTool === 'select') {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - transform.x) / transform.zoom;
        const y = (e.clientY - rect.top - transform.y) / transform.zoom;
        
        const pointData = findPointAtPosition(x, y);
        if (pointData) {
          selectLinePoint(pointData.nodeId, pointData.pointIndex, e.shiftKey);
          setIsDraggingPoint(true);
          setActivePointData({
            ...pointData,
            startX: x,
            startY: y
          });
          setLastMousePos({ x: e.clientX, y: e.clientY });
          
          // If we're clicking on a line endpoint, check if there's an existing connection
          if (selectedLineEndpoint) {
            const existingConnection = useCanvasStore.getState().connections.find(
              conn => conn.lineId === selectedLineEndpoint.nodeId && conn.pointIndex === selectedLineEndpoint.pointIndex
            );
            
            // If there's an existing connection, show it as hovered
            if (existingConnection) {
              setHoveredConnectionPoint({
                nodeId: existingConnection.shapeId,
                position: existingConnection.position
              });
            }
          }
          
          e.stopPropagation();
          return;
        }
        
        if (e.altKey) {
          const segmentData = findClosestLineSegment(x, y, displayNodes, transform);
          if (segmentData) {
            // Check if this is an elbow line - don't allow adding points to elbow lines
            const node = displayNodes?.find((n: Node) => n.id === segmentData.nodeId);
            const isElbowLineNode = node && isElbowLine(node);
            
            if (!isElbowLineNode) {
              addPointToExistingLine(segmentData.nodeId, segmentData.segmentIndex, x, y);
            }
          }
        }
        
        const clickedNode = findNodeAtPosition(x, y, displayNodes, transform);
        if (clickedNode) {
          // Check if shift key is pressed for multi-selection
          if (e.shiftKey) {
            // Toggle selection state of the clicked node
            toggleNodeSelection(clickedNode.id);
            deselectLinePoints();
          } else {
            // Normal click behavior - deselect others and select this one
            if (!clickedNode.selected) {
              selectNode(clickedNode.id);
              deselectLinePoints();
            }
          }
          
          setIsMovingNode(true);
          setActiveNodeId(clickedNode.id);
          setLastMousePos({ x: e.clientX, y: e.clientY });
          
          const startPositions: Record<string, { x: number, y: number }> = {};
          displayNodes.forEach((node: Node) => {
            if (node.selected) {
              startPositions[node.id] = {
                x: node.position.x,
                y: node.position.y
              };
            }
          });
          
          setNodeStartPos(startPositions);
        } else {
          // Check if we're clicking within the bounding box of an already selected line
          // This allows dragging a selected line by its bounding box
          const selectedLineNode = displayNodes?.find((node: Node) => 
            node.selected && 
            (node.type === 'line' || node.type === 'arrow') && 
            node.dimensions &&
            x >= node.position.x && 
            x <= node.position.x + node.dimensions.width && 
            y >= node.position.y && 
            y <= node.position.y + node.dimensions.height
          );
          
          if (selectedLineNode) {
            setIsMovingNode(true);
            setActiveNodeId(selectedLineNode.id);
            setLastMousePos({ x: e.clientX, y: e.clientY });
            
            const startPositions: Record<string, { x: number, y: number }> = {};
            startPositions[selectedLineNode.id] = {
              x: selectedLineNode.position.x,
              y: selectedLineNode.position.y
            };
            
            setNodeStartPos(startPositions);
          } else {
            setIsSelecting(true);
            setSelectionBox({
              start: { x, y },
              end: { x, y }
            });
            deselectAllNodes();
            deselectLinePoints();
          }
        }
      }
    }
  };


  // helper function for handle mousedown
  const findPointAtPosition = (x: number, y: number): { nodeId: string; pointIndex: number } | null => {
    const selectedNodes = displayNodes?.filter((node: Node) => 
      node.selected && 
      node.points && 
      node.points.length > 0 &&
      (node.type === 'line' || node.type === 'arrow')
    ) || [];
    
    if (selectedNodes.length === 0) return null;
    
    for (const node of selectedNodes) {
      if (!node.points) continue;
      
      // Check if this is an elbow line
      const isElbowLineNode = isElbowLine(node);
      
      for (let i = 0; i < node.points.length; i++) {
        // For elbow lines, only allow selecting endpoints (first and last points)
        if (isElbowLineNode && i > 0 && i < node.points.length - 1) {
          continue; // Skip middle points for elbow lines
        }
        
        const point = node.points[i];
        const pointX = node.position.x + point.x;
        const pointY = node.position.y + point.y;
        
        const distance = Math.sqrt(
          Math.pow((pointX - x) * transform.zoom, 2) + 
          Math.pow((pointY - y) * transform.zoom, 2)
        );
        
        if (distance <= 10) {
          // Check if this is an endpoint (first or last point)
          const isEndpoint = i === 0 || i === node.points.length - 1;
          
          // Set the selected line endpoint if it's an endpoint
          if (isEndpoint) {
            setSelectedLineEndpoint({ nodeId: node.id, pointIndex: i });
          } else {
            setSelectedLineEndpoint(null);
          }
          
          return { nodeId: node.id, pointIndex: i };
        }
      }
    }
    
    setSelectedLineEndpoint(null);
    return null;
  };

  // Helper function to find a nearby connection point with a larger radius
  // this is used when hovering over shape to show the connection points for users to click on
  const findNearbyConnectionPoint = (x: number, y: number): { nodeId: string; position: ConnectionPointPosition } | null => {
    // Get all nodes that can have connection points (exclude the line in progress and groups)
    const nodesWithConnectionPoints = displayNodes?.filter((node: Node) => {
      // Skip the node if:
      // 1. It's a line (has points)
      // 2. It's a group
      // 3. It's the current line in progress
      // 4. It's the line we're currently dragging an endpoint of
      const isCurrentLine = lineInProgress && node.id === lineInProgress.id;
      const isDraggedLine = selectedLineEndpoint && node.id === selectedLineEndpoint.nodeId;
      
      return !node.points && !node.data?.isGroup && !isCurrentLine && !isDraggedLine;
    }) || [];
    
    // Use a larger radius for nearby detection
    const nearbyRadius = 50; // Increased from 40 to 50 for better detection
    
    // First check if there's a currently hovered connection point
    if (hoveredConnectionPoint) {
      const node = displayNodes?.find((n: Node) => n.id === hoveredConnectionPoint.nodeId);
      if (node) {
        // Get marker information if we have a selected line
        let startOrEnd: 'start' | 'end' | undefined = undefined;
        let startMarker: MarkerShape | undefined = undefined;
        let endMarker: MarkerShape | undefined = undefined;
        
        // If we have a selected line with an endpoint, get marker info
        if (selectedLineEndpoint) {
          const lineNode = displayNodes?.find((n: Node) => n.id === selectedLineEndpoint.nodeId);
          
          if (lineNode) {
            // Determine if this is a start or end point
            const { pointIndex } = selectedLineEndpoint;
            
            if (lineNode.points && (pointIndex === 0 || pointIndex === lineNode.points.length - 1)) {
              startOrEnd = pointIndex === 0 ? 'start' : 'end';
              
              // Get marker info from line data
              const lineData = lineNode.data || {};
              startMarker = lineData.startMarker as MarkerShape || 'none';
              endMarker = lineData.endMarker as MarkerShape || 'none';
            }
          }
        } else if (lineInProgress) {
          // If we're drawing a new line, use its marker settings
          const lineData = lineInProgress.data || {};
          startOrEnd = 'end'; // Always end for a line in progress
          startMarker = lineData.startMarker as MarkerShape || 'none';
          endMarker = lineData.endMarker as MarkerShape || 'none';
        }
        
        const connectionPoint = connectionManager.calculateConnectionPoint(
          node,
          hoveredConnectionPoint.position,
          {
            isConnected: true,
            startOrEnd,
            startMarker,
            endMarker
          }
        );
        
        const distance = Math.sqrt(
          Math.pow(x - connectionPoint.x, 2) + 
          Math.pow(y - connectionPoint.y, 2)
        );
        
        // If we're still reasonably close to the hovered point, prioritize it
        if (distance <= nearbyRadius * 1.5) {
          return hoveredConnectionPoint;
        }
      }
    }
    
    // Check each node for connection points
    let closestPoint: { nodeId: string; position: ConnectionPointPosition; distance: number } | null = null;
    let minDistance = nearbyRadius;
    
    // Get marker information if we have a selected line
    let startOrEnd: 'start' | 'end' | undefined = undefined;
    let startMarker: MarkerShape | undefined = undefined;
    let endMarker: MarkerShape | undefined = undefined;
    
    // If we have a selected line with an endpoint, get marker info
    if (selectedLineEndpoint) {
      const lineNode = displayNodes?.find((n: Node) => n.id === selectedLineEndpoint.nodeId);
      
      if (lineNode) {
        // Determine if this is a start or end point
        const { pointIndex } = selectedLineEndpoint;
        
        if (lineNode.points && (pointIndex === 0 || pointIndex === lineNode.points.length - 1)) {
          startOrEnd = pointIndex === 0 ? 'start' : 'end';
          
          // Get marker info from line data
          const lineData = lineNode.data || {};
          startMarker = lineData.startMarker as MarkerShape || 'none';
          endMarker = lineData.endMarker as MarkerShape || 'none';
        }
      }
    } else if (lineInProgress) {
      // If we're drawing a new line, use its marker settings
      const lineData = lineInProgress.data || {};
      startOrEnd = 'end'; // Always end for a line in progress
      startMarker = lineData.startMarker as MarkerShape || 'none';
      endMarker = lineData.endMarker as MarkerShape || 'none';
    }
    
    for (const node of nodesWithConnectionPoints) {
      if (!node.dimensions) continue;
      
      // Check each possible connection point position
      const connectionPositions: ConnectionPointPosition[] = ['n', 's', 'e', 'w'];
      
      for (const position of connectionPositions) {
        // Calculate the connection point position with marker information
        const connectionPoint = connectionManager.calculateConnectionPoint(
          node,
          position,
          {
            isConnected: true,
            startOrEnd,
            startMarker,
            endMarker
          }
        );
        
        // Calculate distance from mouse to connection point
        const distance = Math.sqrt(
          Math.pow(x - connectionPoint.x, 2) + 
          Math.pow(y - connectionPoint.y, 2)
        );
        
        // If mouse is close enough to the connection point and it's closer than any previous point
        if (distance <= nearbyRadius && distance < minDistance) {
          minDistance = distance;
          closestPoint = {
            nodeId: node.id,
            position,
            distance
          };
        }
      }
    }
    
    return closestPoint;
  };
  
  // Helper function to connect a line endpoint to a connection point
  const connectLineToPoint = (
    lineId: string,
    pointIndex: number,
    connectionPointData: { nodeId: string; position: ConnectionPointPosition }
  ) => {
    const { nodeId, position } = connectionPointData;
    
    // First, check if this is a line in progress
    let lineNode = null;
    
    if (lineInProgress && lineId === lineInProgress.id) {
      // If it's a line in progress, use that directly
      lineNode = lineInProgress;
    } else {
      // Otherwise, look for it in displayNodes
      lineNode = displayNodes?.find((n: Node) => n.id === lineId);
    }
    
    const node = displayNodes?.find((n: Node) => n.id === nodeId);
    
    if (!node || !lineNode) {
      console.error('Failed to find nodes for connection:', { 
        nodeId, 
        lineId, 
        node: !!node, 
        lineNode: !!lineNode 
      });
      return;
    }

    const startOrEnd = pointIndex === 0 ? 'start' : 'end';

    // Extract marker information from the line node
    const startMarker = lineNode.data?.startMarker as MarkerShape || 'none';
    const endMarker = lineNode.data?.endMarker as MarkerShape || 'none';

    // Calculate the exact connection point position, passing marker information directly
    const connectionPoint = connectionManager.calculateConnectionPoint(
      node,
      position,
      {
        isConnected: true,
        lineNode,
        startOrEnd,
        startMarker,
        endMarker
      }
    );
    
    // Create the connection in the store
    createConnection({
      sourceNodeId: lineId,
      sourcePointIndex: pointIndex,
      targetNodeId: nodeId,
      targetPosition: position
    });
    
    // If this is a line in progress (new line being drawn)
    if (lineInProgress && lineId === lineInProgress.id) {
      // Update the line to end at this connection point
      // Pass false for isShiftPressed to ensure we don't apply angle constraints
      updateLineDraw(connectionPoint.x, connectionPoint.y, false);
    } else {
      // This is an existing line, move the point directly
      moveLinePoint(
        lineId,
        pointIndex,
        connectionPoint.x,
        connectionPoint.y
      );
    }
  }; 

  
  // Handle mouse move for panning, node movement, or selection box
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      
      panCanvas(dx, dy);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (isDraggingPoint && activePointData) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - transform.x) / transform.zoom;
        const y = (e.clientY - rect.top - transform.y) / transform.zoom;
        
        // Check if we're dragging a line endpoint
        const isEndpoint = selectedLineEndpoint !== null && 
                          activePointData.nodeId === selectedLineEndpoint.nodeId && 
                          activePointData.pointIndex === selectedLineEndpoint.pointIndex;
        
        if (isEndpoint) {
          // Use the more comprehensive check that includes nearby points
          const connectionPointData = findNearbyConnectionPoint(x, y);
          
          // Update the hovered connection point state
          if (JSON.stringify(connectionPointData) !== JSON.stringify(hoveredConnectionPoint)) {
            setHoveredConnectionPoint(connectionPointData);
          }
          
          // If we're hovering over a connection point, snap the line to it
          if (connectionPointData) {
            // Connect the line endpoint to the connection point
            connectLineToPoint(
              activePointData.nodeId,
              activePointData.pointIndex,
              connectionPointData
            );
            return;
          } else {
            // If not hovering over a connection point, move the point normally
            moveLinePoint(
              activePointData.nodeId,
              activePointData.pointIndex,
              x,
              y
            );
          }
        }
      }
    } else if (isMovingNode && activeNodeId) {
      const dx = (e.clientX - lastMousePos.x) / transform.zoom;
      const dy = (e.clientY - lastMousePos.y) / transform.zoom;
      
      const selectedNodes = displayNodes?.filter((node: Node) => node.selected) || [];
      
      // Find alignment guides (now works with grid on too)
      if (displayNodes) {
        // Only calculate guides if we have nodes to move
        if (selectedNodes.length > 0) {
          const guides = findAlignmentGuides(selectedNodes, displayNodes, dx, dy, nodeStartPos);
          setAlignmentGuides(guides);
        }
        
        // Apply snapping for each selected node
        selectedNodes.forEach(node => {
          if (!nodeStartPos[node.id]) {
            nodeStartPos[node.id] = { x: node.position.x, y: node.position.y };
          }
          
          if (snapToGrid) {
            // With grid on, we still show guides but snap to grid
            const gridX = Math.round((nodeStartPos[node.id].x + dx) / gridSize) * gridSize;
            const gridY = Math.round((nodeStartPos[node.id].y + dy) / gridSize) * gridSize;
            
            updateNodePosition(
              node.id,
              gridX,
              gridY
            );
          } else {
            // Without grid, use alignment guide snapping
            const { x: adjustedDx, y: adjustedDy } = getSnappedPosition(node, dx, dy, alignmentGuides, nodeStartPos);
            
            updateNodePosition(
              node.id,
              nodeStartPos[node.id].x + adjustedDx,
              nodeStartPos[node.id].y + adjustedDy
            );
          }
        });
      }
    } else if (isSelecting && selectionBox) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - transform.x) / transform.zoom;
        const y = (e.clientY - rect.top - transform.y) / transform.zoom;
        
        setSelectionBox({
          ...selectionBox,
          end: { x, y }
        });
        
        if (displayNodes) {
          const nodesInBox = displayNodes
            .filter(node => isNodeInSelectionBox(node, { ...selectionBox, end: { x, y } }));
          
          if (e.shiftKey) {
            // With shift, add these nodes to the current selection
            const currentSelectedIds = displayNodes
              .filter(node => node.selected)
              .map(node => node.id);
              
            const newSelectedIds = nodesInBox
              .filter(node => !node.selected)
              .map(node => node.id);
              
            selectMultipleNodes([...currentSelectedIds, ...newSelectedIds]);
          } else {
            // Without shift, select only the nodes in the box
            const selectedNodeIds = nodesInBox.map(node => node.id);
            selectMultipleNodes(selectedNodeIds);
          }
        }
      }
    } else if (lineInProgress) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - transform.x) / transform.zoom;
        const y = (e.clientY - rect.top - transform.y) / transform.zoom;
        
        // Check if we're hovering over a connection point
        const connectionPointData = findNearbyConnectionPoint(x, y);
        
        // Update the hovered connection point state
        if (JSON.stringify(connectionPointData) !== JSON.stringify(hoveredConnectionPoint)) {
          setHoveredConnectionPoint(connectionPointData);
        }
        
        // If we're hovering over a connection point, snap the line to it
        if (connectionPointData) {
          // Use the unified helper function to temporarily connect the line to the connection point
          // We don't create a permanent connection yet since the user hasn't released the mouse
          
          // Get the connection point position without creating a connection
          const { nodeId, position } = connectionPointData;
          const node = displayNodes?.find(n => n.id === nodeId);
          
          if (node) {
            // Calculate with marker-aware offset using centralized manager
            const connectionPoint = connectionManager.calculateConnectionPoint(
              node,
              position,
              { isConnected: true, lineNode: lineInProgress || undefined, startOrEnd: 'end' }
            );
            // Pass false for isShiftPressed to ensure we don't apply angle constraints
            updateLineDraw(connectionPoint.x, connectionPoint.y, false);
          }
          return;
        }
        
        // Otherwise, just update the line normally
        updateLineDraw(x, y, isShiftPressed);
      }
    } else {
      // Check for nearby connection points when the line tool is active, even before starting to draw
      if (['line', 'arrow'].includes(activeTool)) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const x = (e.clientX - rect.left - transform.x) / transform.zoom;
          const y = (e.clientY - rect.top - transform.y) / transform.zoom;
          
          // Check for nearby connection points
          const nearbyConnectionPoint = findNearbyConnectionPoint(x, y);
          
          // Update the hovered connection point state
          if (JSON.stringify(nearbyConnectionPoint) !== JSON.stringify(hoveredConnectionPoint)) {
            setHoveredConnectionPoint(nearbyConnectionPoint);
          }
        }
      } else {
        // Reset hovered connection point when not using line tool or drawing a line
        if (hoveredConnectionPoint !== null) {
          setHoveredConnectionPoint(null);
        }
      }
    }
  };
  
  // Handle mouse up for ending panning, node movement, or selection box
  const handleMouseUp = (e: React.MouseEvent) => {
    // If we were dragging a point and it's a line endpoint
    if (isDraggingPoint && activePointData && selectedLineEndpoint) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - transform.x) / transform.zoom;
        const y = (e.clientY - rect.top - transform.y) / transform.zoom;
        
        // Check if we're dropping on a connection point
        const connectionPointData = findNearbyConnectionPoint(x, y);
        
        if (connectionPointData) {
          // Use the unified helper function to connect the line endpoint to the connection point
          connectLineToPoint(
            selectedLineEndpoint.nodeId,
            selectedLineEndpoint.pointIndex,
            connectionPointData
          );
        }
      }
    }
    
    // If we were drawing a line, finalize it
    if (lineInProgress && isDrawingLine) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - transform.x) / transform.zoom;
        const y = (e.clientY - rect.top - transform.y) / transform.zoom;
        
        // Check for nearby connection points
        const connectionPointData = findNearbyConnectionPoint(x, y);

        if (connectionPointData) {
          // Use the unified helper function to connect the line endpoint to the connection point
          const pointIndex = 1; // if we are mouseUp while LineInProgress, we are connecting the second point - the end point
          
          connectLineToPoint(
            lineInProgress.id,
            pointIndex,
            connectionPointData
          );
        }
        
        setIsDrawingLine(false);
        // Important: Only finish the line draw AFTER we've completed any connection
        finishLineDraw();
      }
    }
    
    // Reset states
    setIsDragging(false);
    setIsDraggingPoint(false);
    setIsMovingNode(false);
    setActiveNodeId(null);
    setActivePointData(null);
    // Clear the hovered connection point when mouse up
    setHoveredConnectionPoint(null);
    
    // If we were selecting, finalize the selection
    if (isSelecting && selectionBox) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - transform.x) / transform.zoom;
        const y = (e.clientY - rect.top - transform.y) / transform.zoom;
        
        setSelectionBox({
          ...selectionBox,
          end: { x, y }
        });
        
        if (displayNodes) {
          const nodesInBox = displayNodes
            .filter((node: Node) => isNodeInSelectionBox(node, { ...selectionBox, end: { x, y } }));
          
          if (e.shiftKey) {
            // With shift, add these nodes to the current selection
            const currentSelectedIds = displayNodes
              .filter((node: Node) => node.selected)
              .map((node: Node) => node.id);
              
            const newSelectedIds = nodesInBox
              .filter((node: Node) => !node.selected)
              .map((node: Node) => node.id);
              
            selectMultipleNodes([...currentSelectedIds, ...newSelectedIds]);
          } else {
            // Without shift, select only the nodes in the box
            const selectedNodeIds = nodesInBox.map((node: Node) => node.id);
            selectMultipleNodes(selectedNodeIds);
          }
        }
      }
    }
    
    setSelectedLineEndpoint(null);
    setIsDragging(false);
    setIsMovingNode(false);
    setIsSelecting(false);
    setSelectionBox(null);
    setNodeStartPos({});
    setIsDraggingPoint(false);
    setActivePointData(null);
    
    // Clear alignment guides
    setAlignmentGuides({ 
      horizontal: [], 
      vertical: [] 
    });
  };
  
  // Handle double click to finish line drawing
  //move this to useCanvasMouse.ts
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (lineInProgress && !isDrawingLine) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - transform.x) / transform.zoom;
        const y = (e.clientY - rect.top - transform.y) / transform.zoom;
        
        updateLineDraw(x, y, isShiftPressed);
        finishLineDraw();
      } else {
        finishLineDraw();
      }
      
      e.stopPropagation();
    } else {
      // Add text node on double click when no line is in progress
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - transform.x) / transform.zoom;
        const y = (e.clientY - rect.top - transform.y) / transform.zoom;
        
        // Apply grid snapping if enabled
        const snappedX = snapToGrid ? Math.round(x / gridSize) * gridSize : x;
        const snappedY = snapToGrid ? Math.round(y / gridSize) * gridSize : y;
        
        // Check if we clicked on an existing node
        const clickedNode = findNodeAtPosition(x, y, displayNodes, transform);
        
        // Only create a text node if we didn't click on an existing node
        if (!clickedNode && !presentationMode) {
          // Create a new text node at the clicked position
          const newNode = createShapeAtPosition('text', snappedX, snappedY);
          
          // Select the new node
          selectNode(newNode.id);
        }
      }
    }
  };

    // Handle connection point click
    const handleConnectionPointClick = (nodeId: string, position: ConnectionPointPosition) => {
        // Make sure we're using the line or arrow tool
        if (!['line', 'arrow'].includes(activeTool)) {
          return;
        }
        
        try {
          // Find the node to get its actual position
          const node = displayNodes?.find((n: Node) => n.id === nodeId);
          if (!node) return;
          
          // Calculate the exact connection point position using our utility
          if (lineInProgress) {
            // If we already have a line in progress, finish it at this connection point
            // Use the unified helper function to connect the line endpoint to the connection point
            const pointIndex = lineInProgress.points ? lineInProgress.points.length - 1 : 1;
            
            // Get marker information from line in progress
            const lineData = lineInProgress.data || {};
            console.log('Connecting line with markers:', lineData.startMarker, lineData.endMarker);
            
            createConnection({
              sourceNodeId: lineInProgress.id,   
              sourcePointIndex: pointIndex,     
              targetNodeId: nodeId,     
              targetPosition: position   
            });
          
            // Important: Only finish the line draw AFTER we've established the connection
            finishLineDraw();
          } else {
            // Start a new line from this connection point - use startMarker and endMarker from the store state
            const connectionPoint = connectionManager.calculateConnectionPoint(
              node,
              position,
              { isConnected: true, startOrEnd: 'start', startMarker, endMarker }
            );
          
            startLineDraw(connectionPoint.x, connectionPoint.y, activeTool as 'line' | 'arrow');
            setIsDrawingLine(true);
            
            // Store the connection information for the start point
            const lineId = useCanvasStore.getState().lineInProgress?.id;
            if (lineId) {
              createConnection({
                sourceNodeId: lineId,     
                sourcePointIndex: 0,     
                targetNodeId: nodeId,     
                targetPosition: position   
              });
            }
          }
        } catch (error) {
          console.error('Error handling connection point click:', error);
        }
      };

        // Add effect for wheel event (with passive: false option)
  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;
    
    const wheelHandler = (e: WheelEvent) => {
      // Prevent default scrolling behavior
      e.preventDefault();
      
      // Check if we're in presentation mode
      if (presentationMode) return;
      
      // Get the delta values
      const deltaX = e.deltaX;
      const deltaY = e.deltaY;

      // Check for Cmd/Ctrl key for zooming
      if (e.metaKey || e.ctrlKey) {
        // Get canvas rect
        const rect = canvasElement.getBoundingClientRect();
        if (!rect) return;
        
        // Calculate mouse position in canvas coordinates (before zoom change)
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate position relative to the content (account for current transform)
        const contentX = (mouseX - transform.x) / transform.zoom;
        const contentY = (mouseY - transform.y) / transform.zoom;
        
        // Current zoom level
        const oldZoom = transform.zoom;
        
        // New zoom level based on scroll direction
        let newZoom;
        if (deltaY < 0) {
          // Zoom in - wheel up (limit to max zoom of 2.0)
          newZoom = Math.min(oldZoom + 0.1, 2.0);
        } else {
          // Zoom out - wheel down (limit to min zoom of 0.1)
          newZoom = Math.max(oldZoom - 0.1, 0.1);
        }
        
        // Calculate new transform to keep the point under the mouse fixed
        const newX = mouseX - contentX * newZoom;
        const newY = mouseY - contentY * newZoom;
        
        // Update the transform in one operation to avoid flickering
        useCanvasStore.setState(state => {
          state.transform = {
            x: newX,
            y: newY,
            zoom: newZoom
          };
        });
      } else {
        // Handle both horizontal and vertical panning
        // This supports the MX Master's thumb scroll wheel for horizontal panning
        if (deltaX !== 0) {
          // Horizontal panning - using the thumb wheel or Shift+scroll on other mice
          panCanvas(-deltaX, 0);
        }
        
        if (deltaY !== 0) {
          // Vertical panning with main wheel
          panCanvas(0, -deltaY);
        }
      }
    };
    
    // Add event listener with { passive: false } to allow preventDefault()
    canvasElement.addEventListener('wheel', wheelHandler, { passive: false });
    
    // Cleanup function to remove event listener
    return () => {
      canvasElement.removeEventListener('wheel', wheelHandler);
    };
  }, [transform, presentationMode, panCanvas, canvasRef]);

  return {
    isDragging,
    isMovingNode,
    isSelecting,
    selectionBox,
    activeNodeId,
    lastMousePos,
    nodeStartPos,
    alignmentGuides,
    isShiftPressed,
    hoveredConnectionPoint,
    selectedLineEndpoint,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    handleConnectionPointClick,
    setIsShiftPressed
  };
}
