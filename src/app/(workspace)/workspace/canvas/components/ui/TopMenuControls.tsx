'use client';

import React, { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Presentation, PencilRuler, HelpCircle, Grip, Download, FileJson, Clipboard, Check, ArrowBigUpDash, FileUp, AlertTriangle, BookOpen, Copy, Moon, Sun } from 'lucide-react';
import { Node, Connection, useCanvasStore } from '../../lib/store/canvas-store';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'motion/react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { AnimatePresence } from 'motion/react';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogClose
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { useTheme } from 'next-themes';

interface TopMenuControlsProps {
  position: 'left' | 'right';
  presentationModeOnly?: boolean;
}

interface ImportData {
  nodes: Node[];
  connections: Connection[];
  version: string;
  exportDate: string;
}

const TopMenuControls = ({ position, presentationModeOnly = false }: TopMenuControlsProps) => {
  const [copied, setCopied] = useState(false);
  const [jsonVisible, setJsonVisible] = useState(false);
  
  // Import functionality states
  const [jsonInput, setJsonInput] = useState('');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Instructions states
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [instructionsCopied, setInstructionsCopied] = useState(false);
  
  const { presentationMode, togglePresentationMode } = useCanvasStore();
  const { resolvedTheme, setTheme } = useTheme();
  
  const handleTogglePresentationMode = () => {
    togglePresentationMode();
  };

  const { snapToGrid, gridSize, setSnapToGrid, setGridSize } = useCanvasStore();

  const handleToggleSnapToGrid = (checked: boolean) => {
    setSnapToGrid(checked);
  };

  const handleGridSizeChange = (value: number[]) => {
    setGridSize(value[0]);
  };

  // Export functions 
  const { nodes, connections, deselectAllNodes, pushToHistory } = useCanvasStore();

  // Prepare the export data
  const prepareExportData = () => {
    return {
      nodes,
      connections,
      version: "1.0",
      exportDate: new Date().toISOString()
    };
  };

  // Export the diagram as a JSON file
  const exportAsJson = () => {
    const exportData = prepareExportData();
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create a temporary link element and trigger the download
    const link = document.createElement('a');
    link.href = url;
    link.download = `canvas-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Show toast notification
    toast.success("Export Successful", {
      description: "Your canvas has been exported as a JSON file."
    });
  };

  // Copy the JSON data to clipboard
  const copyToClipboard = () => {
    const exportData = prepareExportData();
    const jsonString = JSON.stringify(exportData, null, 2);
    
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      
      // Show toast notification
      toast.success("Copied to Clipboard", {
        description: "The JSON data has been copied to your clipboard."
      });
      
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Could not copy text: ', err);
      
      // Show error toast
      toast.error("Copy Failed", {
        description: "Failed to copy to clipboard. Please try again.",
      });
    });
  };

  // View JSON
  const viewJson = () => {
    setJsonVisible(!jsonVisible);
    // This would typically show a modal or expand the menu to show JSON
    // For now, just log it to console
    if (!jsonVisible) {
      console.log(JSON.stringify(prepareExportData(), null, 2));
    }
  };

  // Import functionality
  
  // Handle JSON input changes
  const handleJsonInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonInput(e.target.value);
    setImportError(null);
  };
  
  // Validate the JSON input
  const validateJsonInput = (jsonData: unknown): jsonData is ImportData => {
    if (!jsonData) return false;
    
    // Check for required fields
    if (!jsonData || typeof jsonData !== 'object' || !Array.isArray((jsonData as Record<string, unknown>).nodes)) {
      setImportError("Invalid JSON: 'nodes' field is missing or not an array");
      return false;
    }
    
    // Check if nodes have required properties
    for (const node of (jsonData as ImportData).nodes) {
      if (!node.id || !node.type || !node.position) {
        setImportError("Invalid JSON: Node is missing required properties (id, type, position)");
        return false;
      }
    }
    
    // Validate connections if present
    if ((jsonData as ImportData).connections && !Array.isArray((jsonData as ImportData).connections)) {
      setImportError("Invalid JSON: 'connections' field is not an array");
      return false;
    }
    
    return true;
  };
  
  // Import data into the canvas
  const importData = () => {
    try {
      // Parse the JSON input
      const jsonData = JSON.parse(jsonInput);
      
      // Validate the parsed data
      if (!validateJsonInput(jsonData)) {
        return;
      }
      
      // Get current store state to save to history
      pushToHistory();
      
      // Reset the canvas
      useCanvasStore.setState(state => {
        // Deselect all nodes first
        deselectAllNodes();
        
        // Replace the nodes with imported ones
        state.nodes = jsonData.nodes as Node[]; // Fixed TS error
        
        // Replace connections if available
        if (jsonData.connections) {
          state.connections = jsonData.connections as Connection[]; // Fixed TS error
        }
        
        return state;
      });
      
      // Close the dialog
      setIsImportDialogOpen(false);
      setJsonInput('');
      
      // Show success toast
      toast.success("Import Successful", {
        description: `Imported ${jsonData.nodes.length} nodes to the canvas.`,
      });
    } catch (error) {
      // Handle JSON parsing errors
      setImportError(`Invalid JSON: ${(error as Error).message}`);
      
      toast.error("Import Failed", {
        description: "There was an error importing the JSON data.",
      });
    }
  };
  
  // Handle file selection
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if the file is JSON
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setImportError("Please select a valid JSON file");
      return;
    }
    
    // Read the file
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const content = event.target.result as string;
        setJsonInput(content);
        setImportError(null);
      }
    };
    
    reader.onerror = () => {
      setImportError("Failed to read the file");
    };
    
    reader.readAsText(file);
  };
  
  // Handle file upload button click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Instructions content from InstructionsComponent
  const markdownContent = `# Canvas Import JSON Format Guide

This document explains the structure of the JSON format used for importing diagrams into the Canvas application. The import JSON contains nodes (shapes, text, lines, etc.), connections between nodes, metadata, and version information.

## Top-Level Structure

\`\`\`json
{
  "nodes": [...],         // Array of node objects (required)
  "connections": [...],   // Array of connection objects (optional)
  "version": "1.0",       // Version string (optional)
  "exportDate": "..."     // ISO date string of when it was exported (optional)
}
\`\`\`

## Node Objects

Each node represents a visual element on the canvas. All nodes have some common properties, while specific node types have additional properties.

### Common Node Properties

| Property | Type | Description |
|----------|------|-------------|
| \`id\` | string | Unique identifier for the node |
| \`type\` | string | Type of node ("rectangle", "circle", "diamond", "cylinder", "triangle", "line", "text", "icon", etc.) |
| \`position\` | object | Position of the node on the canvas |
| \`position.x\` | number | X coordinate |
| \`position.y\` | number | Y coordinate |
| \`dimensions\` | object | Size of the node |
| \`dimensions.width\` | number | Width in pixels |
| \`dimensions.height\` | number | Height in pixels |
| \`style\` | object | Styling properties for the node |
| \`data\` | object | Additional type-specific data |
| \`selected\` | boolean | Whether the node is currently selected (usually \`false\` for imports) |

### Style Properties

Style properties can include a mix of hex color values and tailwind-style color names:

| Property | Type | Description |
|----------|------|-------------|
| \`backgroundColor\` | string | Background color (e.g., "#7dd3fc", "transparent", "blue-500") |
| \`borderColor\` | string | Border color (e.g., "#0284c7", "black-500") |
| \`borderWidth\` | number | Border width in pixels |
| \`borderStyle\` | string | Border style ("solid", "dashed", "dotted") |
| \`borderRadius\` | string | Border radius for rounded corners with units (e.g., "8px") |
| \`stroke\` | string | Stroke color (e.g., "black-800") |
| \`fill\` | string | Fill color (e.g., "white-300") |
| \`strokeWidth\` | number | Width of stroke in pixels |
| \`strokeStyle\` | string | Style of stroke ("solid", "dashed", "dotted") |
| \`textColor\` | string | Text color (e.g., "sky-800", "black") |
| \`fontSize\` | string | Font size with units (e.g., "16px") |
| \`fontFamily\` | string | Font family (e.g., "sans-serif") |
| \`textAlign\` | string | Text alignment ("left", "center", "right") |
| \`verticalAlign\` | string | Vertical alignment ("top", "middle", "bottom") |
| \`iconColor\` | string | Color for icon nodes |
| \`iconSize\` | string | Size for icon nodes (e.g., "24px") |

### Shape-Specific Properties

Different shape types may have specific style properties. For example:

#### Text Nodes

\`\`\`json
{
  "id": "text-1",
  "type": "text",
  "position": { "x": 100, "y": 100 },
  "dimensions": { "width": 175, "height": 41 },
  "style": {
    "backgroundColor": "#7dd3fc",
    "borderColor": "#0284c7",
    "borderWidth": 1,
    "borderStyle": "solid",
    "borderRadius": "8px",
    "textColor": "sky-800",
    "fontSize": "16px",
    "fontFamily": "sans-serif",
    "textAlign": "center",
    "verticalAlign": "middle",
    "stroke": "black-800",
    "fill": "white-300",
    "strokeWidth": 2,
    "strokeStyle": "solid"
  },
  "data": {
    "text": "This is a text node",
    "isNew": false,
    "isDarkTheme": false
  }
}
\`\`\`

#### Icon Nodes

\`\`\`json
{
  "id": "icon-1",
  "type": "icon",
  "position": { "x": 200, "y": 200 },
  "dimensions": { "width": 48, "height": 48 },
  "style": {
    "backgroundColor": "transparent",
    "borderColor": "transparent",
    "iconColor": "black-500",
    "iconSize": "24px"
  },
  "data": {
    "iconName": "User",
    "isIcon": true
  }
}
\`\`\`

#### Line Nodes

Line nodes can be straight lines or elbow connectors with markers at either end:

\`\`\`json
{
  "id": "line-1",
  "type": "line",
  "position": { "x": 50, "y": 300 },
  "dimensions": { "width": 150, "height": 2 },
  "style": {
    "borderColor": "black-500",
    "borderWidth": 2,
    "borderStyle": "solid"
  },
  "points": [
    { "x": 0, "y": 0 },
    { "x": 150, "y": 0 }
  ],
  "data": {
    "lineType": "straight",
    "startMarker": "none",
    "endMarker": "triangle",
    "markerFillStyle": "filled"
  }
}
\`\`\`

For elbow connectors, use \`"lineType": "elbow"\` and provide appropriate points.

## Connection Objects

Connections define how lines are attached to other nodes. This allows lines to stay connected to shapes even when the shapes are moved.

\`\`\`json
{
  "sourceNodeId": "line-1",
  "sourcePointIndex": 0,
  "targetNodeId": "rectangle-1", 
  "targetPosition": "e"
}
\`\`\`

| Property | Type | Description |
|----------|------|-------------|
| \`sourceNodeId\` | string | ID of the line node |
| \`sourcePointIndex\` | number | Index of the point on the line (0 for start, 1 for end) |
| \`targetNodeId\` | string | ID of the target node that the line is connected to |
| \`targetPosition\` | string | Position on the target node where the line connects |

Target positions can be cardinal directions ("n", "s", "e", "w").

## Color Format

Colors in the canvas can be specified in several formats:

1. Hex color codes: \`"#7dd3fc"\`, \`"#0284c7"\`, etc.
2. Base color with shade: \`"blue-500"\`, \`"red-300"\`, \`"sky-800"\`, etc.
3. Single colors: \`"black"\`, \`"white"\`
4. Special value: \`"none"\` or \`"transparent"\`

Your application supports a mix of these formats, with some properties typically using hex codes (like \`backgroundColor\` and \`borderColor\`) and others using the named colors with intensity (like \`textColor\`, \`stroke\`, and \`fill\`).

When using named colors with shades, the first part is the color name, and the second part (after the hyphen) is the shade intensity.

## Complete Example

Here's a simplified example of a complete import JSON with different types of nodes:

\`\`\`json
{
  "nodes": [
    {
      "id": "rectangle-1",
      "type": "rectangle",
      "position": { "x": 100, "y": 100 },
      "dimensions": { "width": 120, "height": 80 },
      "style": {
        "backgroundColor": "#dbeafe",
        "borderColor": "#3b82f6",
        "borderWidth": 2,
        "borderRadius": "8px",
        "stroke": "blue-500",
        "fill": "blue-100",
        "strokeWidth": 2,
        "strokeStyle": "solid"
      },
      "data": {
        "isNew": false,
        "isDarkTheme": false
      },
      "selected": false
    },
    {
      "id": "text-1",
      "type": "text",
      "position": { "x": 110, "y": 130 },
      "dimensions": { "width": 100, "height": 40 },
      "style": {
        "backgroundColor": "transparent",
        "borderColor": "transparent",
        "textColor": "black-800",
        "fontSize": "14px",
        "fontFamily": "sans-serif",
        "textAlign": "center",
        "verticalAlign": "middle",
        "stroke": "black-800",
        "fill": "white-300"
      },
      "data": {
        "text": "Hello World",
        "isNew": false,
        "isDarkTheme": false
      },
      "selected": false
    },
    {
      "id": "line-1",
      "type": "line",
      "position": { "x": 220, "y": 140 },
      "dimensions": { "width": 100, "height": 2 },
      "style": {
        "borderColor": "#1e293b",
        "borderWidth": 2,
        "borderStyle": "solid"
      },
      "points": [
        { "x": 0, "y": 0 },
        { "x": 100, "y": 0 }
      ],
      "data": {
        "lineType": "straight",
        "endMarker": "triangle",
        "markerFillStyle": "filled",
        "isNew": false,
        "isDarkTheme": false
      },
      "selected": false
    }
  ],
  "connections": [
    {
      "sourceNodeId": "line-1",
      "sourcePointIndex": 0,
      "targetNodeId": "rectangle-1",
      "targetPosition": "e"
    }
  ],
  "version": "1.0",
  "exportDate": "2025-03-17T12:00:00Z"
}
\`\`\`

## Tips for Creating Valid Imports

1. **All nodes must have unique IDs**: Duplicate IDs will cause issues with rendering and interactions.
2. **Required properties**: Ensure that all nodes have the minimum required properties (id, type, position).
3. **Consistent connections**: Any connection defined should reference valid node IDs.
4. **Appropriate dimension values**: Width and height should be appropriate for the node type.
5. **Coordinate system**: The top-left of the canvas is (0,0), with x increasing to the right and y increasing downward.
6. **Data properties**: Include \`"isNew": false\` and \`"isDarkTheme": false\` in the data object for each node.
7. **Style consistency**: Maintain the style structure shown in the examples, including the mix of hex colors and named colors.
8. **Use the export feature**: The easiest way to understand the format is to create a diagram and use the export feature to see the resulting JSON.
9. **Data validation**: Before importing, check that your JSON is well-formed and follows the structure outlined above.`;

  // Copy instructions to clipboard
  const handleCopyInstructions = () => {
    navigator.clipboard.writeText(markdownContent)
      .then(() => {
        setInstructionsCopied(true);
        toast.success("Copied!", {
          description: "Instructions have been copied to clipboard",
        });
        setTimeout(() => setInstructionsCopied(false), 2000);
      })
      .catch((err) => {
        toast.error("Error", {
          description: "Failed to copy instructions",
        });
        console.error('Failed to copy content: ', err);
      });
  };

  return (
    <div className={`absolute top-4 ${position === 'left' ? 'left-4' : 'right-4'} ${position === 'right' ? 'flex space-x-2' : ''}`}>
      {position === 'left' ? (
        <DropdownMenu> 
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="size-4" />
              <span className="sr-only">Canvas Controls</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-fit">
            <DropdownMenuLabel>Canvas Controls</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Grid Settings Submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Grip className="size-4 mr-2" />
                <span>Grid Settings (⌘G)</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="p-4 w-72">
                  {/* Grid Toggle */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Grip className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">Snap to Grid</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help mr-2" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1">
                              <h4 className="font-medium">About Grid Feature</h4>
                              <ul className="text-sm space-y-1">
                                <li>• Grid helps align elements precisely</li>
                                <li>• Smaller grid size offers finer control</li>
                                <li>• Hold Shift to temporarily disable snapping</li>
                                <li>• Double-click grid toggle to reset to defaults</li>
                                <li>• Use ⌘G / Ctrl+G to toggle grid</li>
                              </ul>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Switch 
                      checked={snapToGrid} 
                      onCheckedChange={handleToggleSnapToGrid} 
                      aria-label="Toggle grid" 
                    />
                  </div>

                  {/* Grid Size Slider - Only shown when grid is enabled */}
                  <AnimatePresence>
                    {snapToGrid && (
                      <motion.div
                        className="space-y-2"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm">Grid Size</p>
                          <span className="text-sm font-medium">{gridSize}px</span>
                        </div>
                        <Slider
                          min={5}
                          max={50}
                          step={5}
                          value={[gridSize]}
                          onValueChange={handleGridSizeChange}
                          aria-label="Grid size"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            
            {/* Export Submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Download className="size-4 mr-2" />
                <span>Export Canvas</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={exportAsJson}>
                    <Download className="size-4" />
                    <span>Save as JSON</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={copyToClipboard}>
                    {copied ? (
                      <Check className="size-4 text-green-500" />
                    ) : (
                      <Clipboard className="size-4" />
                    )}
                    <span>{copied ? "Copied!" : "Copy to Clipboard"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={viewJson}>
                    <FileJson className="size-4" />
                    <span>View JSON</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            
            {/* Import Dialog Trigger */}
            <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)}>
              <ArrowBigUpDash className="size-4" />
              <span>Import Canvas</span>
            </DropdownMenuItem>
            
            {/* Instructions Dialog Trigger */}
            <DropdownMenuItem onClick={() => setIsInstructionsOpen(true)}>
              <BookOpen className="size-4" />
              <span>LLM Instructions</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
              {resolvedTheme === "dark" ? (
                <>
                  <Sun className="size-4" strokeWidth={1.5}/>
                  <span>Toggle Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="size-4" strokeWidth={1.5}/>
                  <span>Toggle Dark Mode</span>
                </>
              )}
              <span className="sr-only">Toggle Theme</span>
          
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <>
          {!presentationMode && !presentationModeOnly && (
            <>
              {/* Keep empty */}
            </>
          )}
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="bg-background/80 backdrop-blur-sm"
                  onClick={handleTogglePresentationMode}
                >
                  {presentationMode ? (
                    <PencilRuler className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Presentation className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{presentationMode ? "Exit presentation mode" : "Enter presentation mode"}</p>
                <p className="text-xs text-muted-foreground">Shortcut: F5 or Ctrl+P</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}
      
      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Canvas</DialogTitle>
            <DialogDescription>
              Paste JSON data or upload a file to import a canvas.
            </DialogDescription>
          </DialogHeader>
          
          {importError && (
            <Alert variant="destructive" className="my-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="json-input">JSON Data</Label>
              <Textarea 
                id="json-input"
                placeholder='Paste JSON data here...'
                value={jsonInput}
                onChange={handleJsonInputChange}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button 
                variant="outline" 
                onClick={handleUploadClick}
                type="button"
                className="w-full"
              >
                <FileUp className="mr-2 h-4 w-4" />
                <span>Upload JSON File</span>
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsImportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={importData}
              disabled={!jsonInput.trim()}
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Instructions Dialog */}
      <Dialog open={isInstructionsOpen} onOpenChange={setIsInstructionsOpen}>
        <DialogContent>
          <DialogHeader className="">
            <DialogTitle>LLM Instructions</DialogTitle>
            <DialogDescription>Share these instructions with the LLM to get the best results.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ScrollArea className="rounded-md border">
              <div className="prose prose-sm dark:prose-invert h-[500px] max-w-[475px] overflow-y-auto p-4">
                <ReactMarkdown>
                  {markdownContent}
                </ReactMarkdown>
              </div>
            </ScrollArea>
          </div>
          <DialogFooter className="flex justify-between">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleCopyInstructions}
              className="flex gap-2"
            >
              {instructionsCopied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {instructionsCopied ? "Copied!" : "Copy Instructions"}
            </Button>
            <DialogClose asChild>
              <Button variant="default" size="sm">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TopMenuControls; 