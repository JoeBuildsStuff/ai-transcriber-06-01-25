// ======================================================
// useKeyboardShortcuts.ts - Keyboard Interaction Logic
// ======================================================
//
// Purpose:
// - Implements all keyboard-based interactions for the canvas
// - Manages keyboard shortcuts and key combinations
// - Handles clipboard operations (copy, paste, cut)
// - Controls keyboard-based node manipulation
//
// This file should contain:
// - Keyboard event listeners and handlers
// - Key combination detection logic
// - Implementation of shortcut behaviors
// - Keyboard navigation and selection logic
// - Clipboard operation handlers
//
// Add to this file when:
// - Adding new keyboard shortcuts
// - Enhancing keyboard navigation/selection
// - Implementing new clipboard behaviors
// - Adding keyboard modifiers for mouse operations
// - Creating keyboard-triggered commands
//
// Example future additions:
// - Implementing undo/redo shortcuts
// - Adding support for custom key bindings
// - Implementing multi-key gestures
// - Adding support for accessibility keyboard navigation
// - Implementing keyboard shortcuts panel/help
//
// DON'T add to this file:
// - Mouse-only interaction logic
// - Visual rendering code
// - State logic not related to keyboard interactions
// - Complex algorithms (use utils)
// ======================================================

import { useEffect, useRef } from 'react';
import { useCanvasStore, Node, MarkerShape } from '../lib/store/canvas-store';
import { useCanvasMouse } from '../hooks/useCanvasMouse';
import { toast } from 'sonner';

export function useKeyboardShortcuts() {
    const canvasRef = useRef<HTMLDivElement>(null);
    
    const { 
        gridSize, 
        snapToGrid,
        updateNodePosition,
        selectMultipleNodes,
        cancelLineDraw,
        lineInProgress,
        selectedPointIndices,
        deleteSelectedPoints,
        markerFillStyle,
        setStartMarker,
        setMarkerFillStyle,
        updateSelectedLineMarkers,
        setSnapToGrid,
        presentationMode,
      } = useCanvasStore();

  // Get the mouse interactions from our custom hook
  const {
    setIsShiftPressed,
  } = useCanvasMouse(canvasRef);

  // Get nodes from the store for use in keyboard shortcuts
  const getNodesFromStore = () => useCanvasStore.getState().nodes;
  
  // Copy canvas data to clipboard
  const copyCanvasToClipboard = () => {
    const { nodes, connections } = useCanvasStore.getState();
    
    // Check if any nodes are selected
    const selectedNodes = nodes.filter(node => node.selected);
    
    // If nodes are selected, only copy those nodes and their connections
    const nodesToCopy = selectedNodes.length > 0 ? selectedNodes : nodes;
    
    // Get only the connections that involve the nodes being copied
    const nodeIds = nodesToCopy.map(node => node.id);
    const relevantConnections = connections.filter(conn => 
      nodeIds.includes(conn.lineId) && nodeIds.includes(conn.shapeId)
    );
    
    // Prepare the export data
    const exportData = {
      nodes: nodesToCopy,
      connections: relevantConnections,
      version: "1.0",
      exportDate: new Date().toISOString()
    };
    
    // Convert to JSON string
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // Copy to clipboard
    navigator.clipboard.writeText(jsonString)
      .then(() => {
        toast.success("Copied to Clipboard", {
          description: selectedNodes.length > 0 
            ? `Copied ${selectedNodes.length} selected node${selectedNodes.length === 1 ? '' : 's'} to clipboard.`
            : "The canvas JSON data has been copied to your clipboard."
        });
      })
      .catch(err => {
        console.error('Could not copy text: ', err);
        toast.error("Copy Failed", {
          description: "Failed to copy to clipboard. Please try again.",
        });
      });
  };
  
  // Add event listeners for keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the event target is an input or textarea element
      const target = e.target as HTMLElement;
      const isEditingText = target.tagName === 'INPUT' || 
                           target.tagName === 'TEXTAREA' || 
                           target.isContentEditable;
      
      // Add arrow key detection
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        // Only handle arrow keys if we're not editing text
        if (!isEditingText) {
          e.preventDefault(); // Prevent page scrolling
          
          // Get selected nodes
          const nodes = getNodesFromStore();
          const selectedNodes = nodes.filter((node: Node) => node.selected);
          
          // If any nodes are selected, move them in the direction of the arrow key
          if (selectedNodes.length > 0) {
            // Determine base distance to move
            const baseDistance = snapToGrid ? gridSize : 1;
            
            // Use a multiplier of 5 when Shift is pressed
            const multiplier = e.shiftKey ? 5 : 1;
            const moveDistance = baseDistance * multiplier;
            
            // Calculate the movement based on key pressed
            let dx = 0;
            let dy = 0;
            
            switch (e.key) {
              case 'ArrowUp':
                dy = -moveDistance;
                break;
              case 'ArrowDown':
                dy = moveDistance;
                break;
              case 'ArrowLeft':
                dx = -moveDistance;
                break;
              case 'ArrowRight':
                dx = moveDistance;
                break;
            }
            
            // Move each selected node
            selectedNodes.forEach((node: Node) => {
              updateNodePosition(
                node.id,
                node.position.x + dx,
                node.position.y + dy
              );
            });
            
            // Push to history to preserve the movement
            useCanvasStore.getState().pushToHistory();
          }
        }
      }
      
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      } else if (e.key === 'Escape') {
        if (lineInProgress) {
          cancelLineDraw();
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditingText) {
        if (selectedPointIndices && selectedPointIndices.length > 0) {
          deleteSelectedPoints();
          e.preventDefault();
        }
      } else if (e.key === 'c' && (e.metaKey || e.ctrlKey) && !isEditingText) {
        // Handle Cmd+C / Ctrl+C to copy canvas JSON to clipboard
        e.preventDefault();
        copyCanvasToClipboard();
      } else if (e.key === 'a' && (e.metaKey || e.ctrlKey) && !isEditingText) {
        // Handle Cmd+A / Ctrl+A to select all nodes
        e.preventDefault();
        
        // Get all node IDs
        const nodes = getNodesFromStore();
        const allNodeIds = nodes.map((node: Node) => node.id);
        
        // Select all nodes
        selectMultipleNodes(allNodeIds);
      } else if (e.key === 'g' && (e.metaKey || e.ctrlKey) && !e.shiftKey && !isEditingText) {
        // Handle Cmd+G / Ctrl+G to toggle grid
        e.preventDefault();
        setSnapToGrid(!snapToGrid);
      }
      
      // Shortcuts for line markers - only when a line is selected
      const nodes = getNodesFromStore();
      const selectedLine = nodes.find((node: Node) => 
        node.selected && (node.type === 'line' || node.type === 'arrow')
      );
      
      if (selectedLine) {
        // Alt+1-5 for start marker types
        if (e.key >= '1' && e.key <= '5' && e.altKey) {
          e.preventDefault();
          const markerIndex = parseInt(e.key) - 1;
          const markers: MarkerShape[] = ['none', 'triangle', 'circle', 'square', 'diamond'];
          if (markerIndex >= 0 && markerIndex < markers.length) {
            setStartMarker(markers[markerIndex]);
            updateSelectedLineMarkers();
          }
        }
        
        // Shift+F to toggle fill style
        if (e.key === 'f' && e.shiftKey) {
          e.preventDefault();
          setMarkerFillStyle(markerFillStyle === 'filled' ? 'outlined' : 'filled');
          updateSelectedLineMarkers();
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    lineInProgress, 
    cancelLineDraw, 
    selectedPointIndices, 
    deleteSelectedPoints, 
    setStartMarker, 
    setMarkerFillStyle, 
    updateSelectedLineMarkers, 
    copyCanvasToClipboard, 
    snapToGrid, 
    setIsShiftPressed,
    gridSize,
    selectMultipleNodes,
    markerFillStyle,
    setSnapToGrid,
    updateNodePosition
  ]);

  // Handle paste event for JSON data
  const handlePaste = (e: React.ClipboardEvent) => {
    // If we're in presentation mode, don't allow pasting
    if (presentationMode) return;
    
    // Check if we're editing text (input or textarea)
    const target = e.target as HTMLElement;
    const isEditingText = target.tagName === 'INPUT' || 
                         target.tagName === 'TEXTAREA' || 
                         target.isContentEditable;
    
    // If we're editing text, let the default paste behavior happen
    if (isEditingText) return;
    
    // Get clipboard data as text
    const clipboardText = e.clipboardData.getData('text');
    
    try {
      // Try to parse the clipboard text as JSON
      const jsonData = JSON.parse(clipboardText);
      
      // Validate the JSON data
      if (!jsonData || typeof jsonData !== 'object' || !Array.isArray(jsonData.nodes)) {
        // Not valid canvas JSON data, ignore
        return;
      }
      
      // Check if nodes have required properties
      for (const node of jsonData.nodes) {
        if (!node.id || !node.type || !node.position) {
          // Invalid node data, ignore
          return;
        }
      }
      
      // Get current store state to save to history
      useCanvasStore.getState().pushToHistory();
      
      // Generate new IDs for the pasted nodes to avoid conflicts
      const idMap = new Map<string, string>();
      const newNodes = jsonData.nodes.map((node: Node) => {
        const newId = `${node.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        idMap.set(node.id, newId);
        
        // Create a new node with a new ID
        return {
          ...node,
          id: newId,
          // Offset the position slightly to make it clear it's a new node
          position: {
            x: node.position.x + 20,
            y: node.position.y + 20
          },
          // Make sure the node is selected
          selected: true
        };
      });
      
      // Update connections to use the new IDs
      const newConnections = jsonData.connections && Array.isArray(jsonData.connections) 
        ? jsonData.connections.map((conn: { lineId: string; shapeId: string }) => {
            // Skip connections that reference nodes not in the paste data
            if (!idMap.has(conn.lineId) || !idMap.has(conn.shapeId)) {
              return null;
            }
            
            return {
              ...conn,
              lineId: idMap.get(conn.lineId) || conn.lineId,
              shapeId: idMap.get(conn.shapeId) || conn.shapeId
            };
          }).filter(Boolean)
        : [];
      
      // Add the new nodes and connections to the canvas
      useCanvasStore.setState(state => {
        // Deselect all existing nodes
        state.nodes.forEach(node => {
          node.selected = false;
        });
        
        // Add the new nodes to the existing ones
        state.nodes = [...state.nodes, ...newNodes];
        
        // Add the new connections to the existing ones
        if (newConnections.length > 0) {
          state.connections = [...state.connections, ...newConnections];
        }
        
        return state;
      });
      
      // Prevent default paste behavior
      e.preventDefault();
      
      // Show success toast
      toast.success("Import Successful", {
        description: `Pasted ${newNodes.length} nodes to the canvas.`,
      });
    } catch {
      // Not JSON or other error, let default paste behavior happen
      return;
    }
  };

  return {
    handlePaste
  };
}