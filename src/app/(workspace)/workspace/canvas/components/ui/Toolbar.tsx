'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card } from '@/components/ui/card';
import {
  Hand,
  MousePointer,
  Square,
  Circle,
  ArrowRight,
  Minus,
  Pen,
  Type,
  Diamond,
  Cylinder,
  Triangle,
  Smile,
  Network,
} from 'lucide-react';
import { useCanvasStore, ToolType } from '../../lib/store/canvas-store';
import { useTheme } from 'next-themes';

const Toolbar = () => {
  const { activeTool, setActiveTool, transform, createShapeAtPosition, toggleIconSheet, toggleExamplesSheet } = useCanvasStore();
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === 'dark';
  
  // Map tool IDs to tool types
  const toolMap: Record<number, ToolType> = {
    0: 'hand',
    1: 'select',
    2: 'rectangle',
    3: 'triangle',
    4: 'diamond',
    5: 'circle',
    6: 'cylinder' as ToolType,
    7: 'arrow',
    8: 'line',
    9: 'pen',
    10: 'text',
    12: 'icon',
    13: 'examples',
  };
  
  const tools = [
    // Navigation tools
    { id: 0, icon: <Hand className="" size={16} />, name: "Hand" },
    { id: 1, icon: <MousePointer className="" size={16} />, name: "Select"},
    { type: 'separator' },
    // Shape tools
    { id: 2, icon: <Square className="" size={16} />, name: "Rectangle"},
    { id: 3, icon: <Triangle className="" size={16} />, name: "Triangle"},
    { id: 4, icon: <Diamond className="" size={16} />, name: "Diamond"},
    { id: 5, icon: <Circle className="" size={16} />, name: "Circle"},
    { id: 6, icon: <Cylinder className="" size={16} />, name: "Cylinder"},
    { type: 'separator' },
    // Line tools
    { id: 7, icon: <ArrowRight className="" size={16} />, name: "Arrow"},
    { id: 8, icon: <Minus className="" size={16} />, name: "Line"},
    { id: 9, icon: <Pen className="" size={16} />, name: "Pen"},
    { type: 'separator' },
    // Content tools
    { id: 10, icon: <Type className="" size={16} />, name: "Text"},
    { type: 'separator' },
    // Icon tool
    { id: 12, icon: <Smile className="" size={16} />, name: "Icons"},
    { id: 13, icon: <Network className="" size={16} />, name: "Examples"}
  ];

  // Handle tool selection
  const handleToolSelect = (toolId: number) => {
    const toolType = toolMap[toolId];
    if (toolType) {
      setActiveTool(toolType);
      
      // If icon tool is selected, open the icon sheet
      if (toolType === 'icon') {
        toggleIconSheet();
        setActiveTool('select');
        return;
      }

      // If network tool is selected, open the network sheet
      if (toolType === 'examples') {
        toggleExamplesSheet();
        setActiveTool('select');
        return;
      }
      
      // If a shape tool is selected, create the shape below the toolbar
      if (['rectangle', 'triangle', 'diamond', 'circle', 'cylinder', 'text'].includes(toolType)) {
        // Calculate position below the toolbar
        const toolbarHeight = 100; // Approximate height of toolbar + margin
        
        // Calculate the center of the screen horizontally
        const centerX = window.innerWidth / 3;
        
        // Calculate the position in canvas coordinates
        const canvasX = (centerX - transform.x) / transform.zoom;
        const canvasY = (toolbarHeight - transform.y) / transform.zoom;
        
        // Create the shape at the calculated position with theme information
        createShapeAtPosition(toolType, canvasX, canvasY, { isDarkTheme });
      }
    }
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2" data-testid="toolbar">
      <Card className="flex flex-row items-center bg-background/80 backdrop-blur-sm p-1 gap-0">
        <TooltipProvider>
          {tools.map((tool, index) => (
            tool.type === 'separator' ? (
              <div key={`separator-${index}`} className="h-6 w-px bg-border mx-1" />
            ) : (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`relative ${activeTool === (tool.id !== undefined ? toolMap[tool.id] : '') ? 'bg-secondary' : ''}`}
                    onClick={() => tool.id !== undefined && handleToolSelect(tool.id)}
                    aria-label={tool.name || ''}
                    data-testid={tool.name ? `tool-${tool.name.toLowerCase()}` : ''}
                    name={tool.name || ''}
                  >
                    {tool.icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={15}>
                  <p>{tool.name}</p>
                </TooltipContent>
              </Tooltip>
            )
          ))}
        </TooltipProvider>
      </Card>
    </div>
  );
};

export default Toolbar; 