'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SquareRoundCorner } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCanvasStore } from '../../lib/store/canvas-store';
import { useTailwindColors } from '../../lib/utils/use-tailwind-colors';

const ShapeControls = () => {
  const { 
    borderRadius, 
    setBorderRadius, 
    strokeColor, 
    fillColor,
    updateColorsForTheme,
  } = useCanvasStore();
  
  // Use the tailwind colors hook for theme-aware color handling
  const {
    getColorHsl,
    hasThemeChanged,
    isDarkMode
  } = useTailwindColors();

  // Get stroke and fill colors in HSL format
  const strokeHsl = getColorHsl(strokeColor);
  const fillHsl = getColorHsl(fillColor);

  // Determine if stroke is "none"
  const hasStroke = strokeColor !== 'none';
  
  // Determine if fill is "none"
  const hasFill = fillColor !== 'none';
  
  // Update shape colors when theme changes
  useEffect(() => {
    if (hasThemeChanged) {
      // Use the centralized function to update all node colors
      updateColorsForTheme(isDarkMode);
    }
  }, [hasThemeChanged, updateColorsForTheme, isDarkMode]);

  return (
    <div className="flex flex-row items-center justify-between w-full">
      <Label className="text-sm font-medium text-muted-foreground">Corner</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon">
            <SquareRoundCorner 
              className="w-4 h-4" 
              style={{
                fill: hasFill ? `hsl(${fillHsl})` : 'none',
                stroke: hasStroke ? `hsl(${strokeHsl})` : 'transparent',
                strokeWidth: hasStroke ? '2px' : '0'
              }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="right" className="w-fit" sideOffset={15} align="start">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm">Corner Radius</Label>
            <span className="text-sm text-muted-foreground">{borderRadius}px</span>
          </div>
          {/* Preset Toggle Group */}
          <ToggleGroup 
            className="w-full justify-between mb-4" 
            type="single" 
            value={borderRadius.toString()} 
            onValueChange={(value) => setBorderRadius(parseInt(value))}
          >
            <ToggleGroupItem value="0" aria-label="No radius">
              <div 
                className="w-6 h-6 rounded-none" 
                style={{
                  backgroundColor: hasFill ? `hsl(${fillHsl})` : 'transparent',
                  border: hasStroke ? `2px solid hsl(${strokeHsl})` : 'none',
                }}
              ></div>
            </ToggleGroupItem>
            <ToggleGroupItem value="4" aria-label="Small radius">
              <div 
                className="w-6 h-6 rounded-sm" 
                style={{
                  backgroundColor: hasFill ? `hsl(${fillHsl})` : 'transparent',
                  border: hasStroke ? `2px solid hsl(${strokeHsl})` : 'none',
                }}
              ></div>
            </ToggleGroupItem>
            <ToggleGroupItem value="8" aria-label="Medium radius">
              <div 
                className="w-6 h-6 rounded-md" 
                style={{
                  backgroundColor: hasFill ? `hsl(${fillHsl})` : 'transparent',
                  border: hasStroke ? `2px solid hsl(${strokeHsl})` : 'none',
                }}
              ></div>
            </ToggleGroupItem>
            <ToggleGroupItem value="12" aria-label="Large radius">
              <div 
                className="w-6 h-6 rounded-lg" 
                style={{
                  backgroundColor: hasFill ? `hsl(${fillHsl})` : 'transparent',
                  border: hasStroke ? `2px solid hsl(${strokeHsl})` : 'none',
                }}
              ></div>
            </ToggleGroupItem>
            <ToggleGroupItem value="9999" aria-label="Full radius">
              <div 
                className="w-6 h-6 rounded-full" 
                style={{
                  backgroundColor: hasFill ? `hsl(${fillHsl})` : 'transparent',
                  border: hasStroke ? `2px solid hsl(${strokeHsl})` : 'none',
                }}
              ></div>
            </ToggleGroupItem>
          </ToggleGroup>
          {/* Custom Slider */}
          <Slider
            value={[borderRadius]}
            onValueChange={([value]) => setBorderRadius(value)}
            max={50}
            step={1}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ShapeControls; 