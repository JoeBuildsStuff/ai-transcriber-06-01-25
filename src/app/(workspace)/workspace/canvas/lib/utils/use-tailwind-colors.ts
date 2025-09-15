import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  getAvailableShades,
  getDefaultShade,
  getTailwindColorHsl,
  getTailwindColorHex,
  getHexToTailwindName,
  getEquivalentShade,
  isDarkTheme
} from './tailwind-color-utils';

/**
 * React hook for handling Tailwind colors with theme awareness
 * This hook provides color utilities that automatically adapt to theme changes
 */
export function useTailwindColors() {
  const { resolvedTheme } = useTheme();
  const isDark = isDarkTheme(resolvedTheme);
  
  // Track previous theme to detect changes
  const [prevTheme, setPrevTheme] = useState<string | undefined>(resolvedTheme);
  
  // Get available shades for current theme
  const getStrokeShades = () => getAvailableShades(isDark, true);
  const getFillShades = () => getAvailableShades(isDark, false);
  
  // Get default shade for current theme
  const getStrokeDefaultShade = () => getDefaultShade(isDark, true);
  const getFillDefaultShade = () => getDefaultShade(isDark, false);
  
  // Convert color to HSL format
  const getColorHsl = (colorName: string): string => getTailwindColorHsl(colorName);
  
  // Convert color to Hex format
  const getColorHex = (colorName: string): string => getTailwindColorHex(colorName);
  
  // Handle color changes across themes
  const getThemeAdjustedColor = (colorName: string, isStrokeColor: boolean): string => {
    if (colorName === 'none') return 'none';
    
    const parts = colorName.split('-');
    if (parts.length === 2) {
      const [base, shade] = parts;
      const adjustedShade = getEquivalentShade(shade, isDark, isStrokeColor);
      return `${base}-${adjustedShade}`;
    }
    
    return colorName;
  };
  
  // React to theme changes
  useEffect(() => {
    if (prevTheme !== resolvedTheme) {
      setPrevTheme(resolvedTheme);
    }
  }, [resolvedTheme, prevTheme]);
  
  return {
    isDarkMode: isDark,
    isLightMode: !isDark,
    resolvedTheme,
    hasThemeChanged: prevTheme !== resolvedTheme,
    
    // Available color shades based on theme
    strokeShades: getStrokeShades(),
    fillShades: getFillShades(),
    
    // Default shades based on theme
    defaultStrokeShade: getStrokeDefaultShade(),
    defaultFillShade: getFillDefaultShade(),
    
    // Color conversion utilities
    getColorHsl,
    getColorHex,
    colorToTailwindName: getHexToTailwindName,
    
    // Theme-aware color adjustments
    getThemeAdjustedStrokeColor: (color: string) => getThemeAdjustedColor(color, true),
    getThemeAdjustedFillColor: (color: string) => getThemeAdjustedColor(color, false),
    
    // Shade transformation
    getEquivalentShade: (shade: string, isStroke: boolean) => 
      getEquivalentShade(shade, isDark, isStroke)
  };
}