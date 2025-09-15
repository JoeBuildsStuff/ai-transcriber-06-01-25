'use client';

import React from 'react';
import { Node } from '../../lib/store/canvas-store';
import { iconMap } from '../../lib/icons';
import { useTailwindColors } from '../../lib/utils/use-tailwind-colors';

interface IconShapeProps {
  node: Node;
}

const IconShape: React.FC<IconShapeProps> = ({ node }) => {
  const { style, data, dimensions } = node;
  const { getColorHsl } = useTailwindColors();
  
  // Get the icon name from the node data
  const iconName = data?.iconName as string;
  
  // Get the icon color from the style with better handling of color format
  const getIconColor = () => {
    // First check for iconColor in style
    if (style?.iconColor) {
      const colorName = style.iconColor as string;
      
      // If it's already a hex or HSL value, use it directly
      if (colorName.startsWith('#') || colorName.startsWith('hsl')) {
        return colorName;
      }
      
      // If it's a Tailwind color name, convert to HSL
      if (colorName.includes('-')) {
        return `hsl(${getColorHsl(colorName)})`;
      }
      
      return colorName;
    }
    
    // Fallback to data if not in style
    if (data?.iconColor) {
      return data.iconColor as string;
    }
    
    // Default
    return 'var(--foreground)';
  };
  
  // Get the stroke width with better handling
  const getStrokeWidth = () => {
    // First check style
    if (style?.iconStrokeWidth !== undefined) {
      return typeof style.iconStrokeWidth === 'number' 
        ? style.iconStrokeWidth 
        : parseFloat(style.iconStrokeWidth as string);
    }
    
    // Then check data
    if (data?.iconStrokeWidth !== undefined) {
      return typeof data.iconStrokeWidth === 'number' 
        ? data.iconStrokeWidth 
        : parseFloat(data.iconStrokeWidth as string);
    }
    
    // Default
    return 2;
  };
  
  const iconColor = getIconColor();
  const strokeWidth = getStrokeWidth();
  
  // Calculate the size to fit within the node dimensions
  const size = Math.min(dimensions?.width || 48, dimensions?.height || 48);
  
  // Get the icon component from the map
  const IconComponent = iconName ? iconMap[iconName] : null;
  
  return (
    <div 
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
      }}
    >
      {IconComponent ? (
        <IconComponent 
          size={size} 
          color={iconColor} 
          strokeWidth={strokeWidth}
        />
      ) : (
        <div style={{ color: 'red', fontSize: '12px', textAlign: 'center' }}>
          {iconName ? `Icon "${iconName}" not found` : 'No icon selected'}
        </div>
      )}
    </div>
  );
};

// Add display name
IconShape.displayName = 'IconShape';

export default IconShape; 