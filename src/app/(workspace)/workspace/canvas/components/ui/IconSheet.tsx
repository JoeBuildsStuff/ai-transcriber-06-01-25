'use client';

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, Pencil, Ruler } from 'lucide-react';
import { useCanvasStore } from '../../lib/store/canvas-store';
import { iconLibrary } from '../../lib/icons';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';

const IconSheet = () => {
  const { isIconSheetOpen, toggleIconSheet } = useCanvasStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [iconSize, setIconSize] = useState(28); // Default icon size
  const [sliderValue, setSliderValue] = useState([28]); // Slider state
  const [strokeWidth, setStrokeWidth] = useState(1.5); // Default stroke width
  const [strokeSliderValue, setStrokeSliderValue] = useState([1.5]); // Stroke width slider state

  // Filter icons based on search query
  const filteredIcons = iconLibrary.filter(icon => 
    icon.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Update icon size when slider changes
  useEffect(() => {
    setIconSize(sliderValue[0]);
  }, [sliderValue]);

  // Update stroke width when slider changes
  useEffect(() => {
    setStrokeWidth(strokeSliderValue[0]);
  }, [strokeSliderValue]);

  return (
    <Sheet open={isIconSheetOpen} onOpenChange={toggleIconSheet}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0 overflow-y-auto">
        <SheetHeader className="p-6 border-b">
          <SheetTitle>Icon Library</SheetTitle>
          <SheetDescription className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search icons..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SheetDescription>
          {/* Hidden for now */}
          <div className="mt-4 space-y-4 hidden">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Ruler className="h-4 w-4 mr-2" />
                  <span className="text-sm">Size</span>
                </div>
                <span className="text-sm font-medium">{iconSize}px</span>
              </div>
              <Slider
                value={sliderValue}
                min={16}
                max={64}
                step={4}
                onValueChange={setSliderValue}
              />
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Pencil className="h-4 w-4 mr-2" />
                  <span className="text-sm">Stroke Width</span>
                </div>
                <span className="text-sm font-medium">{strokeWidth}px</span>
              </div>
              <Slider
                value={strokeSliderValue}
                min={0.5}
                max={4}
                step={0.5}
                onValueChange={setStrokeSliderValue}
              />
            </Card>
          </div>
        </SheetHeader>
        <div className="flex flex-row flex-wrap justify-between gap-2 p-6">
          <TooltipProvider>
            {filteredIcons.map(icon => {
              const { Icon } = icon;
              return (
                <Tooltip key={icon.id}>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="p-2"
                      style={{ 
                        width: `${iconSize * 2}px`, 
                        height: `${iconSize * 2}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onClick={() => {  
                        // This is where you would add code to use the selected icon
                        const { transform, createShapeAtPosition } = useCanvasStore.getState();
                        
                        // Calculate position in the center of the canvas
                        const centerX = window.innerWidth / 2;
                        const centerY = window.innerHeight / 2;
                        
                        // Convert to canvas coordinates
                        const canvasX = (centerX - transform.x) / transform.zoom;
                        const canvasY = (centerY - transform.y) / transform.zoom;
                        
                        // Create a shape with the icon information
                        createShapeAtPosition('icon', canvasX, canvasY, { 
                          iconName: icon.name,
                          isIcon: true,
                          iconSize,
                          iconStrokeWidth: strokeWidth,
                          customDimensions: {
                            width: iconSize,
                            height: iconSize
                          }
                        });
                        
                        // Close the sheet after selection
                        toggleIconSheet();
                      }}
                    >
                      <div style={{ width: `${iconSize}px`, height: `${iconSize}px` }}>
                        <Icon style={{ width: '100%', height: '100%', strokeWidth: strokeWidth }} />
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {icon.name}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
          
          {filteredIcons.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No icons found matching &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default IconSheet;