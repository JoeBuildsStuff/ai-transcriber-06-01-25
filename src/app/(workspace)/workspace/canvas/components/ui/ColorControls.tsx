'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Square, Slash, Minus, MoreHorizontal, Grip } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCanvasStore } from '../../lib/store/canvas-store';
import { Card } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { baseColorOptions } from '../../lib/utils/tailwind-color-utils';
import { useTailwindColors } from '../../lib/utils/use-tailwind-colors';

// Define types
interface IconConfig {
  iconColor: string;
  iconStrokeWidth: number;
}

interface ColorControlsProps {
  showIconControls?: boolean;
  defaultIconConfig?: IconConfig;
  onIconConfigChange?: (config: IconConfig) => void;
}

const ColorControls: React.FC<ColorControlsProps> = ({ 
  showIconControls = false,
  defaultIconConfig,
  onIconConfigChange 
}) => {
  const { 
    strokeColor, 
    fillColor, 
    defaultShade,
    strokeWidth,
    strokeStyle,
    setStrokeColor, 
    setFillColor,
    setDefaultShade,
    setStrokeWidth,
    setStrokeStyle,
    updateColorsForTheme,
    pushToHistory,
    updateSelectedIconStyles,
    textColor,
    setTextColor,
  } = useCanvasStore();
  
  // Use the tailwind colors hook for theme-aware color handling
  const {
    isDarkMode,
    strokeShades,
    fillShades,
    defaultStrokeShade,
    defaultFillShade,
    getColorHsl,
    hasThemeChanged
  } = useTailwindColors();
  
  // State for tracking selected color base and shade
  const [selectedStrokeBase, setSelectedStrokeBase] = useState<string>('');
  const [selectedStrokeShade, setSelectedStrokeShade] = useState<string>(defaultShade);
  const [selectedFillBase, setSelectedFillBase] = useState<string>('');
  const [selectedFillShade, setSelectedFillShade] = useState<string>(defaultShade);
  const [selectedTextBase, setSelectedTextBase] = useState<string>('');
  const [selectedTextShade, setSelectedTextShade] = useState<string>(defaultShade);
  
  // State for icon controls if needed
  const [iconConfig, setIconConfig] = useState<IconConfig>(defaultIconConfig || {
    iconColor: strokeColor,
    iconStrokeWidth: strokeWidth
  });
  const [selectedIconBase, setSelectedIconBase] = useState<string>('');
  const [selectedIconShade, setSelectedIconShade] = useState<string>(defaultStrokeShade);
  
  // Available stroke widths
  const strokeWidths = [1, 2, 3, 4, 6];
  
  // Available stroke styles
  const strokeStyles = [
    { name: 'solid', icon: <Minus className="h-4 w-4" /> },
    { name: 'dashed', icon: <MoreHorizontal className="h-4 w-4" /> },
    { name: 'dotted', icon: <Grip className="h-4 w-4" /> }
  ];

  // Check if a text node is selected
  // const isTextNodeSelected = nodes.some(node => node.selected && node.type === 'text');

  // Update parent component when icon config changes
  useEffect(() => {
    if (showIconControls && onIconConfigChange) {
      onIconConfigChange(iconConfig);
    }
  }, [iconConfig, onIconConfigChange, showIconControls]);

  // Handle color selection
  const handleStrokeColorChange = (colorBase: string) => {
    if (colorBase === 'none') {
      setStrokeColor(colorBase);
      setSelectedStrokeBase(colorBase);
      setSelectedIconBase(colorBase);
      return;
    }
    
    if (colorBase === 'black' || colorBase === 'white') {
      // Use appropriate shade based on theme
      const shade = isDarkMode ? '300' : '800';
      const newColor = `${colorBase}-${shade}`;
      setStrokeColor(newColor);
      setSelectedStrokeBase(colorBase);
      setSelectedStrokeShade(shade);
      setSelectedIconBase(colorBase);
      setSelectedIconShade(shade);
      return;
    }
    
    // Use the default shade for the current theme
    const newColor = `${colorBase}-${defaultStrokeShade}`;
    setStrokeColor(newColor);
    setSelectedStrokeBase(colorBase);
    setSelectedStrokeShade(defaultStrokeShade);

        // Update selected icons
        updateSelectedIconStyles();

            // Update icon config
    setIconConfig(prev => ({
      ...prev,
      iconColor: newColor
    }));
  };

  const handleFillColorChange = (colorBase: string) => {
    if (colorBase === 'none') {
      setFillColor(colorBase);
      setSelectedFillBase(colorBase);
      return;
    }
    
    if (colorBase === 'black' || colorBase === 'white') {
      // Use appropriate shade based on theme
      const shade = isDarkMode ? '800' : '300';
      const newColor = `${colorBase}-${shade}`;
      setFillColor(newColor);
      setSelectedFillBase(colorBase);
      setSelectedFillShade(shade);
      return;
    }
    
    // Use the default shade for the current theme
    const newColor = `${colorBase}-${defaultFillShade}`;
    setFillColor(newColor);
    setSelectedFillBase(colorBase);
    setSelectedFillShade(defaultFillShade);
  };

  const handleStrokeShadeChange = (shade: string) => {
    if (selectedStrokeBase === 'none') {
      return;
    }
    
    const newColor = `${selectedStrokeBase}-${shade}`;
    setStrokeColor(newColor);
    setSelectedStrokeShade(shade);
    setDefaultShade(shade);

    setSelectedIconShade(shade);
    
    // Update selected icons
    updateSelectedIconStyles();

    // Update icon config
    setIconConfig(prev => ({
      ...prev,
      iconColor: newColor
    }));
  };

  const handleFillShadeChange = (shade: string) => {
    if (selectedFillBase === 'none') {
      return;
    }
    
    const newColor = `${selectedFillBase}-${shade}`;
    setFillColor(newColor);
    setSelectedFillShade(shade);
    setDefaultShade(shade);
  };

  // Handle preset width click
  const handlePresetWidthClick = (width: number) => {
    setStrokeWidth(width);

        // Update selected icons
        updateSelectedIconStyles();

        // Update icon config
        setIconConfig(prev => ({
          ...prev,
          iconStrokeWidth: width
        }));
  };

  // Handle stroke style change
  const handleStrokeStyleChange = (style: 'solid' | 'dashed' | 'dotted') => {
    setStrokeStyle(style);
  };

  // Handle text color selection
  // const handleTextColorChange = (colorBase: string) => {
  //   if (colorBase === 'none') {
  //     setTextColor(colorBase);
  //     setSelectedTextBase(colorBase);
  //     return;
  //   }
    
  //   if (colorBase === 'black' || colorBase === 'white') {
  //     // Use appropriate shade based on theme
  //     const shade = isDarkMode ? '300' : '800';
  //     const newColor = `${colorBase}-${shade}`;
  //     setTextColor(newColor);
  //     setSelectedTextBase(colorBase);
  //     setSelectedTextShade(shade);
  //     return;
  //   }
    
  //   // Use the default shade for the current theme
  //   const newColor = `${colorBase}-${defaultStrokeShade}`;
  //   setTextColor(newColor);
  //   setSelectedTextBase(colorBase);
  //   setSelectedTextShade(defaultStrokeShade);
  // };

  // const handleTextShadeChange = (shade: string) => {
  //   if (selectedTextBase === 'none') {
  //     return;
  //   }
    
  //   const newColor = `${selectedTextBase}-${shade}`;
  //   setTextColor(newColor);
  //   setSelectedTextShade(shade);
  //   setDefaultShade(shade);
  // };

  // Initialize selected base colors from current colors and set default shades based on theme
  useEffect(() => {
    if (strokeColor) {
      const parts = strokeColor.split('-');
      if (parts.length === 2) {
        setSelectedStrokeBase(parts[0]);
        setSelectedStrokeShade(parts[1]);
        if (showIconControls) {
          setSelectedIconBase(parts[0]);  
          setSelectedIconShade(parts[1]);
        }
      } else {
        setSelectedStrokeBase(strokeColor);
        if (showIconControls) {
          setSelectedIconBase(strokeColor);
        }
      }
    }
    
    if (fillColor) {
      const parts = fillColor.split('-');
      if (parts.length === 2) {
        setSelectedFillBase(parts[0]);
        setSelectedFillShade(parts[1]);
      } else {
        setSelectedFillBase(fillColor);
      }
    }

    if (textColor) {
      const parts = textColor.split('-');
      if (parts.length === 2) {
        setSelectedTextBase(parts[0]);
        setSelectedTextShade(parts[1]);
      } else {
        setSelectedTextBase(textColor);
      }
    }

    // Initialize icon config
    if (showIconControls) {
      setIconConfig({
        iconColor: strokeColor,
        iconStrokeWidth: strokeWidth
      });
    }
  }, []);

  // Update selected colors when the node selection changes
  useEffect(() => {
    if (strokeColor) {
      const parts = strokeColor.split('-');
      if (parts.length === 2) {
        setSelectedStrokeBase(parts[0]);
        setSelectedStrokeShade(parts[1]);
        if (showIconControls) {
          setSelectedIconBase(parts[0]);
          setSelectedIconShade(parts[1]);
        }
      } else {
        setSelectedStrokeBase(strokeColor);
        if (showIconControls) {
          setSelectedIconBase(strokeColor);
        }
      }
    }
    
    if (fillColor) {
      const parts = fillColor.split('-');
      if (parts.length === 2) {
        setSelectedFillBase(parts[0]);
        setSelectedFillShade(parts[1]);
      } else {
        setSelectedFillBase(fillColor);
      }
    }
    
    if (textColor) {
      const parts = textColor.split('-');
      if (parts.length === 2) {
        setSelectedTextBase(parts[0]);
        setSelectedTextShade(parts[1]);
      } else {
        setSelectedTextBase(textColor);
      }
    }
    
    // Update icon config when node selection changes
    if (showIconControls) {
      setIconConfig({
        iconColor: strokeColor,
        iconStrokeWidth: strokeWidth
      });
    }
  }, [strokeColor, fillColor, textColor, strokeWidth, showIconControls, setSelectedStrokeBase, setSelectedStrokeShade, setSelectedIconBase, setSelectedIconShade, setSelectedFillBase, setSelectedFillShade, setSelectedTextBase, setSelectedTextShade, setIconConfig]);

  // Update colors when theme changes
  useEffect(() => {
    if (hasThemeChanged) {
      // For stroke
      if (selectedStrokeBase && selectedStrokeBase !== 'none') {
        if (!strokeShades.includes(selectedStrokeShade)) {
          setSelectedStrokeShade(defaultStrokeShade);
          setStrokeColor(`${selectedStrokeBase}-${defaultStrokeShade}`);
        }
      }
      
      // For fill
      if (selectedFillBase && selectedFillBase !== 'none') {
        if (!fillShades.includes(selectedFillShade)) {
          setSelectedFillShade(defaultFillShade);
          setFillColor(`${selectedFillBase}-${defaultFillShade}`);
        }
      }
      
      // For icon (if showing)
      if (showIconControls && selectedIconBase && selectedIconBase !== 'none') {
        if (!strokeShades.includes(selectedIconShade)) {
          setSelectedIconShade(defaultStrokeShade);
          setStrokeColor(`${selectedIconBase}-${defaultStrokeShade}`);
          
          // Update icon config
          setIconConfig(prev => ({
            ...prev,
            iconColor: `${selectedIconBase}-${defaultStrokeShade}`
          }));
        }
      }
      
      // For text
      if (selectedTextBase && selectedTextBase !== 'none') {
        if (!strokeShades.includes(selectedTextShade)) {
          setSelectedTextShade(defaultStrokeShade);
          setTextColor(`${selectedTextBase}-${defaultStrokeShade}`);
        }
      }
      
      // Update the default shade in the store
      setDefaultShade(defaultStrokeShade);
      
      // Use the centralized function to update all node colors
      updateColorsForTheme(isDarkMode);
      
      // Push to history
      pushToHistory();
    }
  }, [
    hasThemeChanged,
    selectedStrokeBase,
    selectedStrokeShade,
    selectedFillBase,
    selectedFillShade,
    selectedTextBase,
    selectedTextShade,
    selectedIconBase,
    selectedIconShade,
    strokeShades,
    fillShades,
    defaultStrokeShade,
    defaultFillShade,
    setDefaultShade,
    setStrokeColor,
    setFillColor,
    setTextColor,
    updateColorsForTheme,
    isDarkMode,
    pushToHistory,
    showIconControls
  ]);

  // Render the color button in the trigger based on whether it's "none" or a regular color
  const renderColorButton = (colorName: string, isStroke: boolean, isText: boolean = false) => {
    console.log('isText', isText);

    if (colorName === "none") {
      return (
        <div className="relative h-4 w-4">
          <Square 
            className="h-4 w-4 absolute" 
            style={{ 
              stroke: "var(--border)",
              fill: "transparent",
              strokeWidth: "1px"
            }} 
          />
          <Slash 
            className="h-4 w-4 absolute text-muted-foreground" 
          />
        </div>
      );
    }

    const hsl = getColorHsl(colorName);
    
    if (isStroke) {
      // For stroke trigger, use the same style as the line style toggle group items
      return (
        <div 
          className="w-4 h-4" 
          style={{ 
            border: `${strokeWidth}px ${strokeStyle} hsl(${hsl})`,
            borderRadius: '2px',
            backgroundColor: 'transparent'
          }}
        />
      );
    }
    
    // For fill trigger, use Square with fill color and border
    return (
      <Square 
        className="h-4 w-4" 
        style={{ 
          stroke: "var(--border)",
          fill: `hsl(${hsl})`,
          strokeWidth: "1px"
        }} 
      />
    );
  };

  // Render shade buttons
  const renderShadeButtons = (baseColor: string, selectedShade: string, handleShadeChange: (shade: string) => void, isStroke: boolean) => {
    const isDisabled = baseColor === 'none';
    
    // Get the appropriate shades based on whether this is for stroke or fill
    const availableShades = isStroke ? strokeShades : fillShades;
    
    return (
      <div>
        <ToggleGroup type="single" className="justify-start" value={selectedShade} onValueChange={(value) => handleShadeChange(value)} disabled={isDisabled}>
          <div className="flex gap-1">
            {availableShades.map((shade) => {
              const colorWithShade = baseColor === 'none' ? 'none' : `${baseColor}-${shade}`;
              const hsl = getColorHsl(colorWithShade);
              
              return (
                <ToggleGroupItem 
                  key={`shade-${shade}`} 
                  value={shade}
                  className="h-8 w-8 p-0 flex items-center justify-center rounded-sm"
                >
                  <div 
                    className="w-4 h-4 rounded-sm" 
                    style={{
                      background: `hsl(${hsl})`,
                      opacity: isDisabled ? 0.5 : 1,
                      border: '1px solid var(--border)'
                    }}
                  />
                </ToggleGroupItem>
              );
            })}
          </div>
        </ToggleGroup>
      </div>
    );
  };

  // Render color buttons
  const renderColorButtons = (selectedBase: string, handleColorChange: (colorBase: string) => void) => {
    // Group colors into rows of 5
    const rows = [];
    for (let i = 0; i < baseColorOptions.length; i += 5) {
      rows.push(baseColorOptions.slice(i, i + 5));
    }
    
    return (
      <div>
        <ToggleGroup type="single" className="justify-start" value={selectedBase} onValueChange={(value) => handleColorChange(value)}>
          <div className="flex flex-col gap-1">
            {rows.map((row, rowIndex) => (
              <div key={`color-row-${rowIndex}`} className="flex gap-1">
                {row.map((color) => (
                  <ToggleGroupItem 
                    key={`color-${color.name}`} 
                    value={color.name}
                    className="h-8 w-8 p-0 flex items-center justify-center rounded-sm"
                  >
                    {color.name === "none" ? (
                      <div className="relative w-4 h-4">
                        <Square className="h-4 w-4 absolute" style={{ stroke: "var(--border)", fill: "transparent" }} />
                        <Slash className="h-4 w-4 absolute text-muted-foreground" />
                      </div>
                    ) : (
                      <div 
                        className="w-4 h-4 rounded-sm" 
                        style={{ 
                          background: `hsl(${color.hsl})`,
                          border: '1px solid var(--border)'
                        }}
                      />
                    )}
                  </ToggleGroupItem>
                ))}
              </div>
            ))}
          </div>
        </ToggleGroup>
      </div>
    );
  };

  return (
    <div className="space-y-4">
          {/* Stroke color picker */}
          <div className="flex flex-row items-center justify-between w-full">
            <Label htmlFor="stroke-color" className="text-sm font-medium text-muted-foreground mr-2">Stroke</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  {renderColorButton(strokeColor, true)}
                </Button>
              </PopoverTrigger>
              <PopoverContent side="right" sideOffset={15} align="start" className="w-auto p-2">
                {/* Color grid */}
                <Card className="p-2 border-none shadow-none gap-0">
                  <Label className="text-xs text-muted-foreground mb-2 block">Color</Label>
                  {renderColorButtons(selectedStrokeBase, handleStrokeColorChange)}
                </Card>
                
                {/* Shade selector */}
                <Card className="p-2 border-none shadow-none gap-0">
                  <Label className="text-xs text-muted-foreground mb-2 block">Shade</Label>
                  {renderShadeButtons(selectedStrokeBase, selectedStrokeShade, handleStrokeShadeChange, true)}
                </Card>
              
                {/* Stroke width */}
                <Card className="p-2 border-none shadow-none gap-0">
                  {/* width buttons */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Width</Label>
                    <ToggleGroup type="single" className="justify-start" value={strokeWidth.toString()} onValueChange={(value) => handlePresetWidthClick(Number(value))}>
                      <div className="flex gap-1">
                        {strokeWidths.map((width) => (
                          <ToggleGroupItem 
                            key={`width-${width}`}
                            value={width.toString()}
                            className="h-8 w-8 p-0 flex items-center justify-center"
                          >
                            <div 
                              className="w-4 h-4" 
                              style={{ 
                                border: `${width}px solid ${selectedStrokeBase === 'none' ? 'var(--muted-foreground)' : `hsl(${getColorHsl(strokeColor)})`}`,
                                borderRadius: '2px',
                                backgroundColor: 'transparent'
                              }}
                            />
                          </ToggleGroupItem>
                        ))}
                      </div>
                    </ToggleGroup>
                  </div>
                </Card>

                {/* Stroke style selector */}
                <Card className="p-2 border-none shadow-none gap-0">
                  <Label className="text-xs text-muted-foreground mb-2 block">Line Style</Label>
                  <ToggleGroup type="single" className="justify-start" value={strokeStyle} onValueChange={(value) => handleStrokeStyleChange(value as 'solid' | 'dashed' | 'dotted')}>
                    <div className="flex flex-row">
                      {strokeStyles.map((style) => (
                        <ToggleGroupItem 
                          key={`style-${style.name}`}
                          value={style.name}
                          className="h-8 w-8 p-0 flex items-center justify-center"
                        >
                          <div 
                            className="w-4 h-4" 
                            style={{ 
                              border: `2px ${style.name} ${selectedStrokeBase === 'none' ? 'var(--muted-foreground)' : `hsl(${getColorHsl(strokeColor)})`}`,
                              borderRadius: '2px',
                              backgroundColor: 'transparent'
                            }}
                          />
                        </ToggleGroupItem>
                      ))}
                    </div>
                  </ToggleGroup>
                </Card>
              </PopoverContent>
            </Popover>
          </div>

          {/* Fill color picker */}
          <div className="flex flex-row items-center justify-between w-full">
            <Label htmlFor="fill-color" className="text-sm font-medium text-muted-foreground mr-2">Fill</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  {renderColorButton(fillColor, false)}
                </Button>
              </PopoverTrigger>
              <PopoverContent side="right" sideOffset={15} align="start" className="w-auto p-2">
                <div className="space-y-1">
                  {/* Color grid */}
                  <Card className="p-2 border-none shadow-none gap-0">
                    <Label className="text-xs text-muted-foreground mb-2 block">Color</Label>
                    {renderColorButtons(selectedFillBase, handleFillColorChange)}
                  </Card>
                  
                  {/* Shade selector */}
                  <Card className="p-2 border-none shadow-none gap-0">
                    <Label className="text-xs text-muted-foreground mb-2 block">Shade</Label>
                    {renderShadeButtons(selectedFillBase, selectedFillShade, handleFillShadeChange, false)}
                  </Card>
                </div>
              </PopoverContent>
            </Popover>
          </div>
    </div>
  );
};

export default ColorControls; 