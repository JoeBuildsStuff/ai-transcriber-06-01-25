'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Minus, 
  Circle,
  Triangle,
  CornerUpRight,
  MoveUpRight,
  Square,
  Diamond
} from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCanvasStore, MarkerShape, FillStyle } from '../../lib/store/canvas-store';
import { connectionManager } from './../../lib/connection';
import { useTailwindColors } from '../../lib/utils/use-tailwind-colors';
import { Switch } from '@/components/ui/switch';

// Define types
type LineType = 'straight' | 'elbow';

interface LineEndpointConfig {
  lineType: LineType;
  fillStyle: FillStyle;
  startMarker: MarkerShape;
  endMarker: MarkerShape;
  animated: boolean;
}

interface LineEndpointProps {
  defaultConfig?: LineEndpointConfig;
  onChange?: (config: LineEndpointConfig) => void;
}

// Marker component for consistent rendering
const Marker: React.FC<{ 
  shape: MarkerShape; 
  fillStyle: FillStyle; 
  isStart: boolean;
  className?: string;
  fillColor?: string;
  strokeColor?: string;
  includeLine?: boolean;
}> = ({ shape, fillStyle, isStart, className = '', fillColor, strokeColor, includeLine = true }) => {
  if (shape === 'none') return null;
  
  const isFilled = fillStyle === 'filled';
  const fillValue = isFilled && fillColor ? fillColor : 'none';
  const marginClass = isStart ? '-mr-1' : '-ml-1';
  
  const renderShape = () => {
    switch (shape) {
      case 'triangle':
        return (
          <Triangle 
            className={`${isStart ? '-rotate-90' : 'rotate-90'} ${marginClass} ${className}`} 
            style={{
              width: '12px', 
              height: '12px',
              fill: fillValue,
              stroke: strokeColor
            }}
          />
        );
      case 'circle':
        return (
          <Circle 
            className={`${marginClass} ${className}`} 
            style={{
              width: '12px', 
              height: '12px',
              fill: fillValue,
              stroke: strokeColor
            }}
          />
        );
      case 'square':
        return (
          <Square 
            className={`${marginClass} ${className}`} 
            style={{
              width: '12px', 
              height: '12px',
              fill: fillValue,
              stroke: strokeColor
            }}
          />
        );
      case 'diamond':
        return (
          <Diamond 
            className={`${marginClass} ${className}`} 
            style={{
              width: '14px', 
              height: '14px',
              fill: fillValue,
              stroke: strokeColor
            }}
          />
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="flex items-center">
      {isStart ? (
        <>
          {renderShape()}
          {includeLine && <Minus className="w-3 h-3" style={{ stroke: strokeColor }} />}
        </>
      ) : (
        <>
          {includeLine && <Minus className="w-3 h-3" style={{ stroke: strokeColor }} />}
          {renderShape()}
        </>
      )}
    </div>
  );
};

// Toggle section component for DRY code
const ToggleSection: React.FC<{
  label: string;
  value: string;
  options: Array<{
    value: string;
    label: string;
    icon: React.ReactNode;
  }>;
  onChange: (value: string) => void;
  className?: string;
}> = ({ label, value, options, onChange, className = '' }) => (
  <div className={`flex flex-col ${className}`}>
    <div className="flex items-center justify-between">
      <Label className="text-xs text-muted-foreground mb-2 block">{label}</Label>
    </div>
    <ToggleGroup 
      className="w-full justify-start gap-2" 
      type="single" 
      value={value} 
      onValueChange={(value) => value && onChange(value)}
    >
      {options.map(option => (
        <ToggleGroupItem key={option.value} value={option.value} aria-label={option.label}>
          {option.icon}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  </div>
);

// Main component
const LineEndpointControls: React.FC<LineEndpointProps> = ({ 
  defaultConfig,
  onChange 
}) => {
  // Get marker settings from canvas store
  const { 
    startMarker, 
    endMarker, 
    markerFillStyle,
    lineType,
    animated,
    setStartMarker,
    setEndMarker,
    setMarkerFillStyle,
    setLineType,
    setLineAnimation,
    updateSelectedLineMarkers,
    updateSelectedLineTypes,
    updateSelectedLineAnimations,
    strokeColor,
    fillColor,
    updateColorsForTheme
  } = useCanvasStore();
  
  // Use the tailwind colors hook for theme-aware color handling
  const {
    getColorHsl,
    hasThemeChanged,
    isDarkMode
  } = useTailwindColors();
  
  // Default configuration
  const defaultValues: LineEndpointConfig = {
    lineType: lineType,
    fillStyle: markerFillStyle,
    startMarker: startMarker,
    endMarker: endMarker,
    animated: animated,
    ...defaultConfig
  };
  
  // State
  const [config, setConfig] = useState<LineEndpointConfig>(defaultValues);

  // Get stroke and fill colors in HSL format
  const strokeHsl = getColorHsl(strokeColor);
  const fillHsl = getColorHsl(fillColor);
  
  // Update local state when store changes
  useEffect(() => {
    // Get the currently selected line node, if any
    const selectedNodes = useCanvasStore.getState().nodes.filter(node => 
      node.selected && (node.type === 'line' || node.type === 'arrow')
    );
    
    // If a line/arrow is selected, use its properties
    if (selectedNodes.length === 1) {
      const selectedLine = selectedNodes[0];
      const lineData = selectedLine.data || {};
      
      setConfig(prev => ({
        ...prev,
        lineType: (lineData.lineType as LineType) || lineType,
        fillStyle: (lineData.markerFillStyle as FillStyle) || markerFillStyle,
        startMarker: (lineData.startMarker as MarkerShape) || startMarker,
        endMarker: (lineData.endMarker as MarkerShape) || endMarker,
        animated: (lineData.animated as boolean) || animated
      }));
    } else {
      // If no line is selected or multiple lines selected, use the global settings
      setConfig(prev => ({
        ...prev,
        lineType: lineType,
        fillStyle: markerFillStyle,
        startMarker: startMarker,
        endMarker: endMarker,
        animated: animated
      }));
    }
  }, [lineType, markerFillStyle, startMarker, endMarker, animated, strokeColor, fillColor]);
  
  // Add a new effect to listen for changes in selection
  useEffect(() => {
    // Setup a subscription to the store
    const unsubscribe = useCanvasStore.subscribe((state) => {
      // When selection changes, update the config
      const selectedLines = state.nodes.filter(node => 
        node.selected && (node.type === 'line' || node.type === 'arrow')
      );
      
      if (selectedLines.length === 1) {
        const selectedLine = selectedLines[0];
        const lineData = selectedLine.data || {};
        
        setConfig(prev => ({
          ...prev,
          lineType: (lineData.lineType as LineType) || lineType,
          fillStyle: (lineData.markerFillStyle as FillStyle) || markerFillStyle,
          startMarker: (lineData.startMarker as MarkerShape) || startMarker,
          endMarker: (lineData.endMarker as MarkerShape) || endMarker,
          animated: (lineData.animated as boolean) || animated
        }));
      }
    });
    
    // Clean up the subscription
    return () => unsubscribe();
  }, [lineType, markerFillStyle, startMarker, endMarker, animated]);
  
  // Update parent component when config changes
  useEffect(() => {
    onChange?.(config);
  }, [config, onChange]);
  
  // Update line markers when theme changes
  useEffect(() => {
    if (hasThemeChanged) {
      // Use the centralized function to update all node colors
      updateColorsForTheme(isDarkMode);
    }
  }, [hasThemeChanged, updateColorsForTheme, isDarkMode]);
  
  // Update selected lines
  const updateConfig = <K extends keyof LineEndpointConfig>(
    key: K, 
    value: LineEndpointConfig[K]
  ) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Update store based on property
    if (key === 'startMarker') {
      setStartMarker(value as MarkerShape);
    } else if (key === 'endMarker') {
      setEndMarker(value as MarkerShape);
    } else if (key === 'fillStyle') {
      setMarkerFillStyle(value as FillStyle);
    } else if (key === 'lineType') {
      setLineType(value as LineType);
      // Update selected lines to use the new line type
      updateSelectedLineTypes();
      return; // Skip the rest of the function since updateSelectedLineTypes handles everything
    } else if (key === 'animated') {
      setLineAnimation(value as boolean);
      // Update selected lines to use the new animation state
      updateSelectedLineAnimations();
      return; // Skip the rest of the function since updateSelectedLineAnimations handles everything
    }
    
    // Update selected lines
    updateSelectedLineMarkers();
    
    // Update connections for all selected lines
    const allNodes = useCanvasStore.getState().nodes;
    const connections = useCanvasStore.getState().connections;
    
    // Only process line/arrow nodes that are selected
    const selectedLines = allNodes
      .filter(node => node.selected && (node.type === 'line' || node.type === 'arrow'))
      .map(node => node.id);
    
    if (selectedLines.length > 0) {
      // For each selected line, update its connections
      selectedLines.forEach((lineId: string) => {
        const lineNode = allNodes.find(n => n.id === lineId);
        if (lineNode) {
          // Use the imported utility function to update connections
          const updatedLine = connectionManager.updateAllLineConnections(lineNode, connections, allNodes);
          
          // Update the node in the store
          useCanvasStore.getState().updateNodePosition(
            updatedLine.id, 
            updatedLine.position.x, 
            updatedLine.position.y
          );
          
          if (updatedLine.dimensions) {
            useCanvasStore.getState().updateNodeDimensions(
              updatedLine.id, 
              updatedLine.dimensions.width, 
              updatedLine.dimensions.height
            );
          }
        }
      });
    }
  };
  
  // Line type options
  const lineTypeOptions = [
    { 
      value: 'straight', 
      label: 'Straight Line', 
      icon: <MoveUpRight className="w-4 h-4" style={{ stroke: `hsl(${strokeHsl})` }} /> 
    },
    { 
      value: 'elbow', 
      label: 'Elbow Connector', 
      icon: <CornerUpRight className="w-4 h-4" style={{ stroke: `hsl(${strokeHsl})` }} /> 
    },
  ];
  
  // Fill style options
  const fillStyleOptions = [
    { 
      value: 'filled', 
      label: 'Filled', 
      icon: <Circle className="w-4 h-4" style={{ fill: `hsl(${fillHsl})`, stroke: `hsl(${strokeHsl})` }} /> 
    },
    { 
      value: 'outlined', 
      label: 'Outlined', 
      icon: <Circle className="w-4 h-4" style={{ fill: 'none', stroke: `hsl(${strokeHsl})` }} /> 
    },
  ];
  
  // Create marker options with proper colors
  const createMarkerOptions = (isStart: boolean) => {
    // Use the current config's fillStyle instead of the global state
    const fillValue = config.fillStyle === 'filled' ? `hsl(${fillHsl})` : 'none';
    const strokeValue = `hsl(${strokeHsl})`;
    
    return [
      { 
        value: 'none', 
        label: 'None', 
        icon: <Minus className="w-4 h-4" style={{ stroke: strokeValue }} /> 
      },
      { 
        value: 'triangle', 
        label: 'Triangle', 
        icon: <Marker 
          shape="triangle" 
          fillStyle={config.fillStyle} 
          isStart={isStart}
          fillColor={fillValue}
          strokeColor={strokeValue}
          includeLine={true}
        /> 
      },
      { 
        value: 'circle', 
        label: 'Circle', 
        icon: <Marker 
          shape="circle" 
          fillStyle={config.fillStyle} 
          isStart={isStart}
          fillColor={fillValue}
          strokeColor={strokeValue}
          includeLine={true}
        /> 
      },
      { 
        value: 'square', 
        label: 'Square', 
        icon: <Marker 
          shape="square" 
          fillStyle={config.fillStyle} 
          isStart={isStart}
          fillColor={fillValue}
          strokeColor={strokeValue}
          includeLine={true}
        /> 
      },
      { 
        value: 'diamond', 
        label: 'Diamond', 
        icon: <Marker 
          shape="diamond" 
          fillStyle={config.fillStyle} 
          isStart={isStart}
          fillColor={fillValue}
          strokeColor={strokeValue}
          includeLine={true}
        /> 
      },
    ];
  };
  
  const renderPreview = () => {
    const fillValue = config.fillStyle === 'filled' ? `hsl(${fillHsl})` : 'none';
    const strokeValue = `hsl(${strokeHsl})`;
    
    return (
      <div className="flex items-center h-4 w-8 justify-center">
        {config.startMarker !== 'none' && (
          <Marker 
            shape={config.startMarker} 
            fillStyle={config.fillStyle} 
            isStart={true}
            fillColor={fillValue}
            strokeColor={strokeValue}
            className="h-3 w-3"
            includeLine={false}
          />
        )}
        <Minus className="h-4 w-4" style={{ stroke: strokeValue }} />
        {config.endMarker !== 'none' && (
          <Marker 
            shape={config.endMarker} 
            fillStyle={config.fillStyle} 
            isStart={false}
            fillColor={fillValue}
            strokeColor={strokeValue}
            className="h-3 w-3"
            includeLine={false}
          />
        )}
      </div>
    );
  };
  
  return (
    <div className="flex flex-row items-center justify-between w-full">
      <Label className="text-sm font-medium text-muted-foreground">Line</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon">
            {renderPreview()}
          </Button>
        </PopoverTrigger>
        <PopoverContent side="right" className="w-fit space-y-4" sideOffset={15} align="start">
          
          {/* Line type toggle for straight or elbow */}
          <ToggleSection 
            label="Type" 
            value={config.lineType} 
            options={lineTypeOptions} 
            onChange={(value) => updateConfig('lineType', value as LineType)}
            className="mb-4"
          />

          {/* Fill style toggle for filled or outlined */}
          <ToggleSection 
            label="Fill" 
            value={config.fillStyle} 
            options={fillStyleOptions} 
            onChange={(value) => updateConfig('fillStyle', value as FillStyle)}
            className="mb-4"
          />

          {/* Start marker toggle for triangle, circle, square, or diamond */}
          <ToggleSection 
            label="Start" 
            value={config.startMarker} 
            options={createMarkerOptions(true)} 
            onChange={(value) => updateConfig('startMarker', value as MarkerShape)}
            className="mb-4"
          />

          {/* End marker toggle for triangle, circle, square, or diamond */}
          <ToggleSection 
            label="End" 
            value={config.endMarker} 
            options={createMarkerOptions(false)} 
            onChange={(value) => updateConfig('endMarker', value as MarkerShape)}
          />

          <div className={`flex flex-col`}>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground mb-2 block">Animate</Label>
            </div>
            <Switch 
              checked={config.animated}
              onCheckedChange={(checked) => {
                updateConfig('animated', checked);
              }}
            />
          </div>


        </PopoverContent>
      </Popover>
    </div>
  );
};

export default LineEndpointControls;
