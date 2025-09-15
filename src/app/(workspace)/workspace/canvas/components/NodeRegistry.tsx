'use client';

import React from 'react';
import { Node as NodeType } from '../lib/store/canvas-store';

// Define the structure for node templates
export interface NodeTemplate {
  type: string;
  label: string;
  defaultDimensions: { width: number; height: number };
  defaultStyle: Record<string, unknown>;
  defaultData?: Record<string, unknown>;
  renderPreview?: () => React.ReactNode;
}

// Default node templates
export const defaultNodeTemplates: Record<string, NodeTemplate> = {
  rectangle: {
    type: 'rectangle',
    label: 'Rectangle',
    defaultDimensions: { width: 100, height: 100 },
    defaultStyle: {
      borderStyle: "solid",
      borderRadius: "8px",
      borderColor: "black",
      stroke: "black",
      fill: "none",
      backgroundColor: "transparent",
      strokeWidth: 2,
      strokeStyle: "solid",
    },
  },
  circle: {
    type: 'circle',
    label: 'Circle',
    defaultDimensions: { width: 100, height: 100 },
    defaultStyle: {
      borderStyle: "solid",
      borderRadius: "8px",
      borderColor: "black",
      stroke: "black",
      fill: "none",
      backgroundColor: "transparent",
      strokeWidth: 2,
      strokeStyle: "solid",
    },
  },
  diamond: {
    type: 'diamond',
    label: 'Diamond',
    defaultDimensions: { width: 100, height: 100 },
    defaultStyle: {
      borderStyle: "solid",
      borderRadius: "8px",
      borderColor: "black",
      stroke: "black",
      fill: "none",
      backgroundColor: "transparent",
      strokeWidth: 2,
      strokeStyle: "solid",
    },
  },
  cylinder: {
    type: 'cylinder',
    label: 'Cylinder',
    defaultDimensions: { width: 100, height: 100 },
    defaultStyle: {
      borderStyle: "solid",
      // borderRadius: "8px",
      borderColor: "black",
      stroke: "black",
      fill: "none",
      backgroundColor: "transparent",
      strokeWidth: 2,
      strokeStyle: "solid",
    },
  },
  triangle: {
    type: 'triangle',
    label: 'Triangle',
    defaultDimensions: { width: 100, height: 100 },
    defaultStyle: {
      borderStyle: "solid",
      borderRadius: "8px",
      borderColor: "black",
      stroke: "black",
      fill: "none",
      backgroundColor: "transparent",
      strokeWidth: 2,
      strokeStyle: "solid",
    },
  },
  line: {
    type: 'line',
    label: 'Line',
    defaultDimensions: { width: 150, height: 2 },
    defaultStyle: {
      borderColor: "black",
      borderWidth: 2,
      borderRadius: "8px",
    },
  },
  text: {
    type: 'text',
    label: 'Text',
    defaultDimensions: { width: 175, height: 41 },
    defaultStyle: {
      backgroundColor: "transparent",
      borderColor: "transparent",
      borderWidth: 2,
      borderStyle: "solid",
      borderRadius: "8px",
      textColor: undefined,
      fontSize: "14px",
      fontFamily: "sans-serif",
      textAlign: "left",
      verticalAlign: "middle",
      fontWeight: 400,
    },
    defaultData: {
      text: "",
      isNew: true,
    },
  },
  icon: {
    type: 'icon',
    label: 'Icon',
    defaultDimensions: { width: 48, height: 48 },
    defaultStyle: {
      backgroundColor: "transparent",
      borderColor: "transparent",
      borderWidth: 0,
      borderStyle: "none",
      borderRadius: "0",
      iconColor: "black",
      iconSize: "24px",
    },
    defaultData: {
      iconName: "",
      isIcon: true,
    },
  },
};

// NodeRegistry class to manage node templates
class NodeRegistry {
  private templates: Record<string, NodeTemplate>;
  
  constructor(initialTemplates: Record<string, NodeTemplate> = {}) {
    this.templates = { ...defaultNodeTemplates, ...initialTemplates };
  }
  
  // Register a new node template
  registerTemplate(template: NodeTemplate): void {
    this.templates[template.type] = template;
  }
  
  // Get a template by type
  getTemplate(type: string): NodeTemplate | undefined {
    return this.templates[type];
  }
  
  // Get all registered templates
  getAllTemplates(): Record<string, NodeTemplate> {
    return this.templates;
  }
  
  // Create a node from a template with theme awareness
  createNode(type: string, position: { x: number; y: number }, id: string, isDark: boolean = false): NodeType {
    const template = this.getTemplate(type);
    
    if (!template) {
      throw new Error(`Node template for type "${type}" not found`);
    }
    
    // Apply theme-aware colors to the style
    const themeAwareStyle = { ...template.defaultStyle };
    
    // Update colors based on theme
    if (themeAwareStyle.borderColor === "black" && isDark) {
      themeAwareStyle.borderColor = "white";
    }
    if (themeAwareStyle.stroke === "black" && isDark) {
      themeAwareStyle.stroke = "white";
    }
    // Don't override textColor here as it will be set by mergeNodeStyles
    // from the canvasStore state
    
    return {
      id,
      type,
      position,
      dimensions: { ...template.defaultDimensions },
      style: themeAwareStyle,
      data: template.defaultData ? { ...template.defaultData } : {},
      selected: false,
    };
  }
}

// Create and export a singleton instance
export const nodeRegistry = new NodeRegistry();

export default nodeRegistry; 