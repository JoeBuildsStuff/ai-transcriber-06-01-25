import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { AArrowDown, AArrowUp, ALargeSmall, AlignCenter, AlignLeft, AlignRight, Type, Square, Slash} from "lucide-react"
import { Card } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useCanvasStore } from "../../lib/store/canvas-store"
import { baseColorOptions, colorClassMap } from "../../lib/utils/tailwind-color-utils"
import { useTailwindColors } from "../../lib/utils/use-tailwind-colors"
import { Slider } from "@/components/ui/slider"

export default function TextControls() {
  const { 
    nodes, 
    textColor, 
    setTextColor, 
    setFontSize, 
    setTextAlign, 
    setVerticalAlign,
    setFontWeight,
    updateColorsForTheme,
    pushToHistory,
    updateSelectedNodeStyles
  } = useCanvasStore();
  
  // Use the tailwind colors hook for theme-aware color handling
  const {
    defaultStrokeShade,
    hasThemeChanged,
    isDarkMode,
    strokeShades,
    getColorHsl
  } = useTailwindColors();

  // Get the selected text node
  const selectedTextNode = nodes.find(node => node.selected && node.type === 'text')
  const textStyle = selectedTextNode?.style || {}

  // Helper function to extract base color from a color with shade
  const getBaseColor = (colorName: string): string => {
    if (!colorName || colorName === 'none') return 'none';
    
    const parts = colorName.split('-');
    if (parts.length === 2) {
      return parts[0];
    }
    
    return colorName;
  };

  // Helper function to extract shade from a color
  const getShade = (colorName: string): string => {
    if (!colorName || colorName === 'none') return defaultStrokeShade;
    
    const parts = colorName.split('-');
    if (parts.length === 2) {
      return parts[1];
    }
    
    return defaultStrokeShade;
  };

  // Initialize state from the selected node or defaults
  const [fontSize, setLocalFontSize] = useState(
    textStyle.fontSize ? parseInt(textStyle.fontSize.toString().replace('px', '')) : 14
  )
  const [fontWeight, setLocalFontWeight] = useState(
    textStyle.fontWeight ? Number(textStyle.fontWeight) : 400
  )
  const [horizontalAlignment, setLocalHorizontalAlignment] = useState(textStyle.textAlign?.toString() || "left")
  const [verticalAlignment, setLocalVerticalAlignment] = useState(textStyle.verticalAlign?.toString() || "top")
  const [selectedColorBase, setSelectedColorBase] = useState<string>(
    getBaseColor(textStyle.textColor as string || textColor)
  )
  const [selectedColorShade, setSelectedColorShade] = useState<string>(
    getShade(textStyle.textColor as string || textColor)
  )

  // Update text color when theme changes
  useEffect(() => {
    if (hasThemeChanged && selectedColorBase && selectedColorBase !== 'none') {
      // When theme changes, update the text color with the appropriate shade
      const newColor = `${selectedColorBase}-${defaultStrokeShade}`;
      setTextColor(newColor);
      setSelectedColorShade(defaultStrokeShade);
      
      // Use the centralized function to update all node colors
      updateColorsForTheme(isDarkMode);

      // Push to history
      pushToHistory();
    }
  }, [
    hasThemeChanged, 
    selectedColorBase, 
    defaultStrokeShade, 
    setTextColor, 
    updateColorsForTheme, 
    isDarkMode,
    pushToHistory
  ]);

  // Update selected color when text node selection changes
  useEffect(() => {
    if (textColor) {
      const parts = textColor.split('-');
      if (parts.length === 2) {
        setSelectedColorBase(parts[0]);
        setSelectedColorShade(parts[1]);
      } else {
        setSelectedColorBase(textColor);
        setSelectedColorShade(defaultStrokeShade);
      }
    }
  }, [textColor, defaultStrokeShade]);

  // Get the appropriate Tailwind class for the selected color
  const getColorClass = (colorName: string): string => {
    if (!colorName || colorName === 'none') return "text-foreground";
    
    const baseColor = getBaseColor(colorName);
    return colorClassMap[baseColor] || "text-foreground";
  };

  // Handle font size change
  const handleFontSizeChange = (value: number[]) => {
    const size = value[0];
    setLocalFontSize(size);
    setFontSize(size);
  }

  // Handle font weight change
  const handleFontWeightChange = (value: number[]) => {
    const weight = value[0];
    setLocalFontWeight(weight);
    setFontWeight(weight);
  }

  // Handle horizontal alignment change
  const handleHorizontalAlignmentChange = (value: string) => {
    setLocalHorizontalAlignment(value)
    setTextAlign(value as 'left' | 'center' | 'right')
  }

  // Handle vertical alignment change
  const handleVerticalAlignmentChange = (value: string) => {
    setLocalVerticalAlignment(value)
    setVerticalAlign(value as 'top' | 'middle' | 'bottom')
  }

  // Handle color change
  const handleColorChange = (colorBase: string) => {
    setSelectedColorBase(colorBase)
    
    if (colorBase === 'none') {
      setTextColor(colorBase);
      return;
    }
    
    if (colorBase === 'black' || colorBase === 'white') {
      // Use appropriate shade based on theme
      const shade = isDarkMode ? '300' : '800';
      const newColor = `${colorBase}-${shade}`;
      setTextColor(newColor);
      setSelectedColorShade(shade);
      return;
    }
    
    // Use the appropriate shade based on the theme
    const newColor = `${colorBase}-${selectedColorShade || defaultStrokeShade}`;
    setTextColor(newColor);
    updateSelectedNodeStyles();
  }

  // Handle color shade change
  const handleColorShadeChange = (shade: string) => {
    if (selectedColorBase === 'none') {
      return;
    }
    
    const newColor = `${selectedColorBase}-${shade}`;
    setTextColor(newColor);
    setSelectedColorShade(shade);
    updateSelectedNodeStyles();
  }

  // Render color buttons
  const renderColorButtons = () => {
    // Group colors into rows of 5
    const rows = [];
    for (let i = 0; i < baseColorOptions.length; i += 5) {
      rows.push(baseColorOptions.slice(i, i + 5));
    }
    
    return (
      <div>
        <ToggleGroup type="single" className="justify-start" value={selectedColorBase} onValueChange={handleColorChange}>
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

  // Render shade buttons
  const renderShadeButtons = () => {
    const isDisabled = selectedColorBase === 'none';
    
    return (
      <div>
        <ToggleGroup type="single" className="justify-start" value={selectedColorShade} onValueChange={handleColorShadeChange} disabled={isDisabled}>
          <div className="flex gap-1">
            {strokeShades.map((shade) => {
              const colorWithShade = selectedColorBase === 'none' ? 'none' : `${selectedColorBase}-${shade}`;
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

  return (
    <div className="flex flex-row items-center justify-between w-full">
      <Label htmlFor="fill-color" className="text-sm font-medium text-muted-foreground mr-2">Text</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon">
            <Type className={`w-4 h-4 ${getColorClass(textColor)}`} />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="right" sideOffset={15} align="start" className="w-auto p-2">

          {/* Color selection */}
          <Card className="p-2 border-none">
            <Label className="text-xs text-muted-foreground mb-2 block">Color</Label>
            {renderColorButtons()}
          </Card>

          {/* Shade selection */}
          <Card className="p-2 border-none">
            <Label className="text-xs text-muted-foreground mb-2 block">Shade</Label>
            {renderShadeButtons()}
          </Card>

          {/* Weight selection */}
          <Card className="p-2 border-none">
            <Label className="text-xs text-muted-foreground mb-2 block">Weight</Label>
            <div className="flex flex-row items-center space-x-2">
              <span className="font-thin text-xs">A</span>
              <Slider 
                value={[fontWeight]} 
                onValueChange={handleFontWeightChange} 
                max={800} 
                min={100} 
                step={100} 
                className="flex-1"
              />
              <span className="font-black text-xs">B</span>
            </div>
          </Card>

          {/* Size selection */}
          <Card className="p-2 border-none">
            <Label className="text-xs text-muted-foreground mb-2 block">Size</Label>
            <div className="flex flex-row items-center space-x-2">
              <span className="text-xs">S</span>
              <Slider 
                value={[fontSize]} 
                onValueChange={handleFontSizeChange} 
                max={36} 
                min={8} 
                step={1} 
                className="flex-1"
              />
              <span className="text-xs">XL</span>
            </div>
          </Card>

          {/* Horizontal Alignment */}
          <Card className="p-2 border-none">
            <Label className="text-xs text-muted-foreground mb-2 block">Horizontal Alignment</Label>
            <ToggleGroup type="single" value={horizontalAlignment} onValueChange={handleHorizontalAlignmentChange} className="justify-start">
              <ToggleGroupItem variant="outline" value="left" className="shadow-none"><AlignLeft className="w-4 h-4" /></ToggleGroupItem>
              <ToggleGroupItem variant="outline" value="center" className="shadow-none"><AlignCenter className="w-4 h-4" /></ToggleGroupItem>
              <ToggleGroupItem variant="outline" value="right" className="shadow-none"><AlignRight className="w-4 h-4" /></ToggleGroupItem>
            </ToggleGroup>
          </Card>

          {/* Vertical Alignment */}
          <Card className="p-2 border-none">
            <Label className="text-xs text-muted-foreground mb-2 block">Vertical Alignment</Label>
            <ToggleGroup type="single" value={verticalAlignment} onValueChange={handleVerticalAlignmentChange} className="justify-start">
              <ToggleGroupItem variant="outline" value="top" className="justify-start items-start pt-1 shadow-none"><AArrowUp className="w-4 h-4" /></ToggleGroupItem>
              <ToggleGroupItem variant="outline" value="middle" className="justify-center items-center shadow-none"><ALargeSmall className="w-4 h-4" /></ToggleGroupItem>
              <ToggleGroupItem variant="outline" value="bottom" className="justify-end items-end pb-1 shadow-none"><AArrowDown className="w-4 h-4" /></ToggleGroupItem>
            </ToggleGroup>
          </Card>

        </PopoverContent>
      </Popover>
    </div>      
  )
}