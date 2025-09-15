import React, { useState, useEffect, useRef } from 'react';
import { Node } from '../../lib/store/canvas-store';

interface TextShapeProps {
  node: Node;
  isSelected: boolean;
  onTextChange?: (nodeId: string, text: string) => void;
  onEmpty?: (nodeId: string) => void;
}

// Utility function to convert Tailwind color names to CSS color values
const convertTailwindColorToCss = (colorName: string): string => {
  // Special case for "none" color
  if (colorName === "none") {
    return "transparent";
  }

  // Handle basic colors
  if (colorName === "black") return "#000000";
  if (colorName === "white") return "#FFFFFF";

  // Handle color with shade (e.g., "red-500")
  const parts = colorName.split('-');
  if (parts.length === 2) {
    const [colorBase, shade] = parts;
    
    // Handle black shades
    if (colorBase === 'black') {
      const blackShades: Record<string, string> = {
        '100': '#e6e6e6',
        '200': '#cccccc',
        '300': '#b3b3b3',
        '400': '#999999',
        '500': '#808080',
        '600': '#666666',
        '700': '#4d4d4d',
        '800': '#333333',
        '900': '#1a1a1a',
        '950': '#000000',
      };
      return blackShades[shade] || '#000000';
    }
    
    // Handle white shades
    if (colorBase === 'white') {
      const whiteShades: Record<string, string> = {
        '100': '#ffffff',
        '200': '#fafafa',
        '300': '#f5f5f5',
        '400': '#f0f0f0',
        '500': '#ebebeb',
        '600': '#e0e0e0',
        '700': '#d6d6d6',
        '800': '#cccccc',
        '900': '#bfbfbf',
        '950': '#b3b3b3',
      };
      return whiteShades[shade] || '#ffffff';
    }
    
    // Common color shades
    const colorShades: Record<string, Record<string, string>> = {
      slate: {
        '100': '#f1f5f9', '200': '#e2e8f0', '300': '#cbd5e1', '400': '#94a3b8',
        '500': '#64748b', '600': '#475569', '700': '#334155', '800': '#1e293b',
        '900': '#0f172a', '950': '#020617',
      },
      gray: {
        '100': '#f3f4f6', '200': '#e5e7eb', '300': '#d1d5db', '400': '#9ca3af',
        '500': '#6b7280', '600': '#4b5563', '700': '#374151', '800': '#1f2937',
        '900': '#111827', '950': '#030712',
      },
      zinc: {
        '100': '#f4f4f5', '200': '#e4e4e7', '300': '#d4d4d8', '400': '#a1a1aa',
        '500': '#71717a', '600': '#52525b', '700': '#3f3f46', '800': '#27272a',
        '900': '#18181b', '950': '#09090b',
      },
      neutral: {
        '100': '#f5f5f5', '200': '#e5e5e5', '300': '#d4d4d4', '400': '#a3a3a3',
        '500': '#737373', '600': '#525252', '700': '#404040', '800': '#262626',
        '900': '#171717', '950': '#0a0a0a',
      },
      stone: {
        '100': '#f5f5f4', '200': '#e7e5e4', '300': '#d6d3d1', '400': '#a8a29e',
        '500': '#78716c', '600': '#57534e', '700': '#44403c', '800': '#292524',
        '900': '#1c1917', '950': '#0c0a09',
      },
      red: {
        '100': '#fee2e2', '200': '#fecaca', '300': '#fca5a5', '400': '#f87171',
        '500': '#ef4444', '600': '#dc2626', '700': '#b91c1c', '800': '#991b1b',
        '900': '#7f1d1d', '950': '#450a0a',
      },
      orange: {
        '100': '#ffedd5', '200': '#fed7aa', '300': '#fdba74', '400': '#fb923c',
        '500': '#f97316', '600': '#ea580c', '700': '#c2410c', '800': '#9a3412',
        '900': '#7c2d12', '950': '#431407',
      },
      amber: {
        '100': '#fef3c7', '200': '#fde68a', '300': '#fcd34d', '400': '#fbbf24',
        '500': '#f59e0b', '600': '#d97706', '700': '#b45309', '800': '#92400e',
        '900': '#78350f', '950': '#451a03',
      },
      yellow: {
        '100': '#fef9c3', '200': '#fef08a', '300': '#fde047', '400': '#facc15',
        '500': '#eab308', '600': '#ca8a04', '700': '#a16207', '800': '#854d0e',
        '900': '#713f12', '950': '#422006',
      },
      lime: {
        '100': '#ecfccb', '200': '#d9f99d', '300': '#bef264', '400': '#a3e635',
        '500': '#84cc16', '600': '#65a30d', '700': '#4d7c0f', '800': '#3f6212',
        '900': '#365314', '950': '#1a2e05',
      },
      green: {
        '100': '#dcfce7', '200': '#bbf7d0', '300': '#86efac', '400': '#4ade80',
        '500': '#22c55e', '600': '#16a34a', '700': '#15803d', '800': '#166534',
        '900': '#14532d', '950': '#052e16',
      },
      emerald: {
        '100': '#d1fae5', '200': '#a7f3d0', '300': '#6ee7b7', '400': '#34d399',
        '500': '#10b981', '600': '#059669', '700': '#047857', '800': '#065f46',
        '900': '#064e3b', '950': '#022c22',
      },
      teal: {
        '100': '#ccfbf1', '200': '#99f6e4', '300': '#5eead4', '400': '#2dd4bf',
        '500': '#14b8a6', '600': '#0d9488', '700': '#0f766e', '800': '#115e59',
        '900': '#134e4a', '950': '#042f2e',
      },
      cyan: {
        '100': '#cffafe', '200': '#a5f3fc', '300': '#67e8f9', '400': '#22d3ee',
        '500': '#06b6d4', '600': '#0891b2', '700': '#0e7490', '800': '#155e75',
        '900': '#164e63', '950': '#083344',
      },
      sky: {
        '100': '#e0f2fe', '200': '#bae6fd', '300': '#7dd3fc', '400': '#38bdf8',
        '500': '#0ea5e9', '600': '#0284c7', '700': '#0369a1', '800': '#075985',
        '900': '#0c4a6e', '950': '#082f49',
      },
      blue: {
        '100': '#dbeafe', '200': '#bfdbfe', '300': '#93c5fd', '400': '#60a5fa',
        '500': '#3b82f6', '600': '#2563eb', '700': '#1d4ed8', '800': '#1e40af',
        '900': '#1e3a8a', '950': '#172554',
      },
      indigo: {
        '100': '#e0e7ff', '200': '#c7d2fe', '300': '#a5b4fc', '400': '#818cf8',
        '500': '#6366f1', '600': '#4f46e5', '700': '#4338ca', '800': '#3730a3',
        '900': '#312e81', '950': '#1e1b4b',
      },
      violet: {
        '100': '#ede9fe', '200': '#ddd6fe', '300': '#c4b5fd', '400': '#a78bfa',
        '500': '#8b5cf6', '600': '#7c3aed', '700': '#6d28d9', '800': '#5b21b6',
        '900': '#4c1d95', '950': '#2e1065',
      },
      purple: {
        '100': '#f3e8ff', '200': '#e9d5ff', '300': '#d8b4fe', '400': '#c084fc',
        '500': '#a855f7', '600': '#9333ea', '700': '#7e22ce', '800': '#6b21a8',
        '900': '#581c87', '950': '#3b0764',
      },
      fuchsia: {
        '100': '#fae8ff', '200': '#f5d0fe', '300': '#f0abfc', '400': '#e879f9',
        '500': '#d946ef', '600': '#c026d3', '700': '#a21caf', '800': '#86198f',
        '900': '#701a75', '950': '#4a044e',
      },
      pink: {
        '100': '#fce7f3', '200': '#fbcfe8', '300': '#f9a8d4', '400': '#f472b6',
        '500': '#ec4899', '600': '#db2777', '700': '#be185d', '800': '#9d174d',
        '900': '#831843', '950': '#500724',
      },
      rose: {
        '100': '#ffe4e6', '200': '#fecdd3', '300': '#fda4af', '400': '#fb7185',
        '500': '#f43f5e', '600': '#e11d48', '700': '#be123c', '800': '#9f1239',
        '900': '#881337', '950': '#4c0519',
      },
    };

    return colorShades[colorBase]?.[shade] || colorName;
  }

  // For basic colors without shades
  const basicColors: Record<string, string> = {
    'black': '#000000',
    'white': '#FFFFFF',
    'slate': '#64748b',
    'gray': '#6b7280',
    'zinc': '#71717a',
    'neutral': '#737373',
    'stone': '#78716c',
    'red': '#ef4444',
    'orange': '#f97316',
    'amber': '#f59e0b',
    'yellow': '#eab308',
    'lime': '#84cc16',
    'green': '#22c55e',
    'emerald': '#10b981',
    'teal': '#14b8a6',
    'cyan': '#06b6d4',
    'sky': '#0ea5e9',
    'blue': '#3b82f6',
    'indigo': '#6366f1',
    'violet': '#8b5cf6',
    'purple': '#a855f7',
    'fuchsia': '#d946ef',
    'pink': '#ec4899',
    'rose': '#f43f5e',
  };

  return basicColors[colorName] || colorName;
};

/**
 * TextShape component renders a text node with editing capabilities
 * It handles both display and editing modes with appropriate styling
 */
const TextShape: React.FC<TextShapeProps> = ({ node, isSelected, onTextChange, onEmpty }) => {
  const { id, style, data } = node;
  // Initialize editing state based on whether this is a new text shape
  const [isEditing, setIsEditing] = useState(data?.isNew || false);
  const [text, setText] = useState(data?.text as string || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus and select the textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Place cursor at the start for new text shapes
      textareaRef.current.setSelectionRange(0, 0);
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isSelected) {
      e.stopPropagation();
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    
    // Check if text is empty or only whitespace
    if (!text.trim()) {
      // If onEmpty is provided, call it with the node id to trigger deletion
      if (onEmpty) {
        onEmpty(id);
      }
      return;
    }
    
    if (onTextChange) {
      onTextChange(id, text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setIsEditing(false);
      
      // Check if text is empty or only whitespace
      if (!text.trim()) {
        // If onEmpty is provided, call it with the node id to trigger deletion
        if (onEmpty) {
          onEmpty(id);
        }
        return;
      }
      
      if (onTextChange) {
        onTextChange(id, text);
      }
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      // Revert to original text if ESC is pressed
      setText(data?.text as string || '');
    }
  };

  // Base styles that are common to both display and edit modes
  const baseStyles: React.CSSProperties = {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    color: style?.textColor ? convertTailwindColorToCss(style.textColor as string) : 'var(--foreground)',
    backgroundColor: (style?.backgroundColor as string) || 'transparent',
    fontSize: (style?.fontSize as string) || '14px',
    fontFamily: (style?.fontFamily as string) || 'sans-serif',
    fontWeight: (style?.fontWeight as number) || 400,
    textAlign: (style?.textAlign as 'left' | 'center' | 'right') || 'left',
  };

  // Container styles for the outer div
  const containerStyle: React.CSSProperties = {
    ...baseStyles,
    position: 'relative',
    // Use the shape's border properties
    border: style?.borderWidth ? 
      `${style.borderWidth}px ${style.borderStyle || 'solid'} ${style.borderColor || 'transparent'}` : 'none',
    borderRadius: (style?.borderRadius as string) || '12px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: style?.verticalAlign === 'bottom' ? 'flex-end' : 
                   style?.verticalAlign === 'middle' ? 'center' : 
                   'flex-start',
    overflow: 'hidden',
  };

  // Styles specific to the text display mode
  const textDisplayStyle: React.CSSProperties = {
    ...baseStyles,
    padding: '8px',
    outline: 'none',
    userSelect: 'none',
    cursor: 'default',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: style?.verticalAlign === 'bottom' ? 'flex-end' : 
                   style?.verticalAlign === 'middle' ? 'center' : 
                   'flex-start',
  };

  // Styles for the inner content div that handles alignment
  const contentStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: style?.verticalAlign === 'middle' ? 'center' : 
               style?.verticalAlign === 'bottom' ? 'flex-end' : 
               'flex-start',
    justifyContent: style?.textAlign === 'center' ? 'center' : 
                   style?.textAlign === 'right' ? 'flex-end' : 
                   'flex-start',
    textAlign: (style?.textAlign as 'left' | 'center' | 'right') || 'left',
  };

  // Styles specific to the textarea in edit mode
  const textareaStyle: React.CSSProperties = {
    ...baseStyles,
    padding: '8px',
    userSelect: 'text',
    cursor: 'text',
    background: 'transparent',
    outline: 'none',
    resize: 'none',
    display: 'block', // Override flex display for textarea
    justifyContent: 'normal', // Override justifyContent for textarea
    height: style?.verticalAlign === 'bottom' ? 'auto' : '100%',
    alignSelf: style?.verticalAlign === 'middle' ? 'center' : 
              style?.verticalAlign === 'bottom' ? 'flex-end' : 
              'flex-start',
    caretColor: 'var(--primary)', // Blinking cursor color
  };

  // Render the editing textarea
  if (isEditing) {
    return (
      <div style={containerStyle}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={textareaStyle}
        />
      </div>
    );
  }

  // Render the display view
  return (
    <div style={containerStyle}>
      <div style={textDisplayStyle} onDoubleClick={handleDoubleClick}>
        <div style={contentStyle}>
          {text}
        </div>
      </div>
    </div>
  );
};

export default TextShape; 