/**
 * Tailwind Color Utilities
 * 
 * This file contains centralized utilities for handling Tailwind colors,
 * including conversion between Tailwind color names, HSL values, and hex colors.
 * 
 * Use these utilities to maintain consistent color handling across components.
 */

// Base color options (without shade)
export const baseColorOptions = [
    { name: "none", hsl: "0 0% 0%", special: true },
    { name: "white", hsl: "0 0% 100%" },
    { name: "black", hsl: "0 0% 0%" },
    { name: "slate", hsl: "215 16% 47%" },
    { name: "gray", hsl: "220 9% 46%" },
    { name: "zinc", hsl: "240 4% 46%" },
    { name: "neutral", hsl: "0 0% 46%" },
    { name: "stone", hsl: "25 6% 46%" },
    { name: "red", hsl: "0 84% 60%" },
    { name: "orange", hsl: "25 95% 53%" },
    { name: "amber", hsl: "38 92% 50%" },
    { name: "yellow", hsl: "48 96% 53%" },
    { name: "lime", hsl: "84 81% 44%" },
    { name: "green", hsl: "142 71% 45%" },
    { name: "emerald", hsl: "152 69% 31%" },
    { name: "teal", hsl: "173 80% 40%" },
    { name: "cyan", hsl: "186 94% 41%" },
    { name: "sky", hsl: "199 89% 48%" },
    { name: "blue", hsl: "217 91% 60%" },
    { name: "indigo", hsl: "239 84% 67%" },
    { name: "violet", hsl: "250 83% 71%" },
    { name: "purple", hsl: "270 91% 65%" },
    { name: "fuchsia", hsl: "292 91% 69%" },
    { name: "pink", hsl: "330 81% 60%" },
    { name: "rose", hsl: "355 90% 67%" },
  ];
  
  // Black shades with HSL values
  export const blackShades: Record<string, string> = {
    '100': '0 0% 90%',  // Very light gray
    '200': '0 0% 80%',
    '300': '0 0% 70%',
    '400': '0 0% 60%',
    '500': '0 0% 50%',  // Medium gray
    '600': '0 0% 40%',
    '700': '0 0% 30%',
    '800': '0 0% 20%',
    '900': '0 0% 10%',  // Very dark gray
    '950': '0 0% 0%',   // Pure black
  };
  
  // White shades with HSL values
  export const whiteShades: Record<string, string> = {
    '100': '0 0% 100%', // Pure white
    '200': '0 0% 98%',
    '300': '0 0% 96%',
    '400': '0 0% 94%',
    '500': '0 0% 92%',
    '600': '0 0% 88%',
    '700': '0 0% 84%',
    '800': '0 0% 80%',
    '900': '0 0% 75%',
    '950': '0 0% 70%',  // Light gray
  };
  
  // Tailwind color shades with HSL values
  export const colorShades: Record<string, Record<string, string>> = {
    slate: {
      '100': '210 40% 96.1%',
      '200': '214 32% 91.0%',
      '300': '213 27% 84.3%',
      '400': '215 20% 65.1%',
      '500': '215 16% 47.0%',
      '600': '215 19% 35.3%',
      '700': '215 25% 27.5%',
      '800': '217 33% 17.3%',
      '900': '222 47% 11.2%',
      '950': '229 84% 5%',
    },
    gray: {
      '100': '220 14% 96.1%',
      '200': '220 13% 91.0%',
      '300': '216 12% 83.9%',
      '400': '218 11% 65.1%',
      '500': '220 9% 46.1%',
      '600': '215 14% 34.1%',
      '700': '217 19% 27.1%',
      '800': '215 28% 17.3%',
      '900': '221 39% 11.0%',
      '950': '224 71% 4%',
    },
    zinc: {
      '100': '240 5% 96.1%',
      '200': '240 6% 90.0%',
      '300': '240 5% 84.0%',
      '400': '240 5% 65.1%',
      '500': '240 4% 46.1%',
      '600': '240 5% 34.0%',
      '700': '240 5% 26.0%',
      '800': '240 4% 16.0%',
      '900': '240 6% 10.0%',
      '950': '240 10% 4%',
    },
    neutral: {
      '100': '0 0% 96.1%',
      '200': '0 0% 90.0%',
      '300': '0 0% 83.1%',
      '400': '0 0% 64.7%',
      '500': '0 0% 45.9%',
      '600': '0 0% 32.2%',
      '700': '0 0% 25.1%',
      '800': '0 0% 14.9%',
      '900': '0 0% 9.0%',
      '950': '0 0% 4%',
    },
    stone: {
      '100': '60 5% 96.1%',
      '200': '20 6% 90.0%',
      '300': '24 6% 83.1%',
      '400': '24 5% 64.7%',
      '500': '25 6% 45.9%',
      '600': '33 5% 32.2%',
      '700': '30 6% 25.1%',
      '800': '12 6% 15.1%',
      '900': '24 10% 10.0%',
      '950': '20 14% 4%',
    },
    red: {
      '100': '0 86% 97.3%',
      '200': '0 93% 94.1%',
      '300': '0 96% 89.0%',
      '400': '0 91% 71.4%',
      '500': '0 84% 60.0%',
      '600': '0 72% 50.6%',
      '700': '0 74% 42.0%',
      '800': '0 70% 35.3%',
      '900': '0 63% 31.0%',
      '950': '0 80% 17%',
    },
    orange: {
      '100': '34 100% 97.1%',
      '200': '32 98% 83.5%',
      '300': '31 97% 72.2%',
      '400': '27 96% 61.0%',
      '500': '25 95% 53.1%',
      '600': '21 90% 48.0%',
      '700': '17 88% 40.0%',
      '800': '15 79% 33.7%',
      '900': '15 75% 28.4%',
      '950': '14 80% 14%',
    },
    amber: {
      '100': '48 96% 89.0%',
      '200': '48 97% 77.1%',
      '300': '46 97% 65.1%',
      '400': '43 96% 56.1%',
      '500': '38 92% 50.0%',
      '600': '32 95% 44.0%',
      '700': '26 90% 37.1%',
      '800': '23 83% 31.8%',
      '900': '22 78% 26.1%',
      '950': '21 80% 12%',
    },
    yellow: {
      '100': '55 92% 95.1%',
      '200': '53 98% 77.1%',
      '300': '50 98% 64.1%',
      '400': '48 96% 53.1%',
      '500': '48 96% 53.1%',
      '600': '45 93% 47.5%',
      '700': '35 92% 33.1%',
      '800': '32 81% 29.0%',
      '900': '28 73% 26.5%',
      '950': '28 80% 13%',
    },
    lime: {
      '100': '73 92% 93.9%',
      '200': '77 76% 85.1%',
      '300': '81 67% 74.9%',
      '400': '82 77% 61.2%',
      '500': '84 81% 44.1%',
      '600': '85 85% 35.3%',
      '700': '86 78% 26.9%',
      '800': '86 69% 22.7%',
      '900': '88 61% 20.2%',
      '950': '89 80% 10%',
    },
    green: {
      '100': '142 77% 94.9%',
      '200': '141 79% 85.1%',
      '300': '142 77% 73.3%',
      '400': '142 69% 58.0%',
      '500': '142 71% 45.1%',
      '600': '142 76% 36.3%',
      '700': '142 72% 29.0%',
      '800': '143 64% 24.3%',
      '900': '144 61% 20.2%',
      '950': '145 80% 10%',
    },
    emerald: {
      '100': '152 81% 95.9%',
      '200': '149 80% 90.0%',
      '300': '152 76% 80.4%',
      '400': '156 72% 67.1%',
      '500': '152 69% 31.0%',
      '600': '153 74% 26.9%',
      '700': '155 66% 23.1%',
      '800': '156 66% 19.2%',
      '900': '157 61% 15.9%',
      '950': '160 84% 7%',
    },
    teal: {
      '100': '166 76% 97.1%',
      '200': '168 84% 93.9%',
      '300': '171 77% 64.1%',
      '400': '172 66% 50.4%',
      '500': '173 80% 40.0%',
      '600': '175 84% 32.2%',
      '700': '175 77% 26.1%',
      '800': '176 69% 22.0%',
      '900': '176 61% 18.6%',
      '950': '180 85% 8%',
    },
    cyan: {
      '100': '183 100% 96.1%',
      '200': '185 96% 90.0%',
      '300': '186 94% 82.0%',
      '400': '186 93% 61.0%',
      '500': '186 94% 41.0%',
      '600': '186 91% 32.9%',
      '700': '186 91% 26.1%',
      '800': '186 91% 18.8%',
      '900': '186 91% 15.3%',
      '950': '187 92% 10%',
    },
    sky: {
      '100': '204 94% 94.1%',
      '200': '201 94% 86.1%',
      '300': '199 95% 74.3%',
      '400': '198 93% 60.0%',
      '500': '199 89% 48.0%',
      '600': '200 98% 39.4%',
      '700': '201 96% 32.2%',
      '800': '201 90% 27.5%',
      '900': '202 80% 24.0%',
      '950': '205 94% 13%',
    },
    blue: {
      '100': '214 100% 96.9%',
      '200': '213 97% 87.1%',
      '300': '212 96% 78.0%',
      '400': '213 94% 68.0%',
      '500': '217 91% 60.0%',
      '600': '221 83% 53.3%',
      '700': '224 76% 48.0%',
      '800': '226 71% 40.0%',
      '900': '224 64% 33.1%',
      '950': '226 83% 18%',
    },
    indigo: {
      '100': '226 100% 96.9%',
      '200': '228 96% 88.8%',
      '300': '230 94% 82.4%',
      '400': '234 89% 74.1%',
      '500': '239 84% 67.1%',
      '600': '243 75% 59.0%',
      '700': '245 58% 51.0%',
      '800': '244 55% 41.0%',
      '900': '242 47% 34.3%',
      '950': '244 75% 20%',
    },
    violet: {
      '100': '250 100% 97.6%',
      '200': '251 91% 95.5%',
      '300': '252 95% 93.2%',
      '400': '250 87% 83.1%',
      '500': '250 83% 71.0%',
      '600': '252 62% 54.9%',
      '700': '256 56% 46.5%',
      '800': '260 50% 38.0%',
      '900': '258 42% 32.0%',
      '950': '262 83% 16%',
    },
    purple: {
      '100': '270 100% 98.0%',
      '200': '269 100% 95.1%',
      '300': '269 97% 85.1%',
      '400': '270 95% 75.3%',
      '500': '270 91% 65.1%',
      '600': '271 81% 55.9%',
      '700': '272 72% 47.1%',
      '800': '273 67% 39.4%',
      '900': '274 66% 32.0%',
      '950': '275 80% 18%',
    },
    fuchsia: {
      '100': '287 100% 97.6%',
      '200': '288 96% 95.5%',
      '300': '291 93% 82.9%',
      '400': '292 91% 73.3%',
      '500': '292 91% 69.0%',
      '600': '293 84% 59.4%',
      '700': '295 72% 50.0%',
      '800': '295 70% 41.0%',
      '900': '297 64% 32.0%',
      '950': '297 90% 18%',
    },
    pink: {
      '100': '327 73% 97.1%',
      '200': '326 85% 90.0%',
      '300': '327 87% 81.8%',
      '400': '329 86% 70.2%',
      '500': '330 81% 60.0%',
      '600': '333 71% 50.6%',
      '700': '335 78% 42.0%',
      '800': '336 74% 35.3%',
      '900': '336 69% 30.4%',
      '950': '336 85% 18%',
    },
    rose: {
      '100': '356 100% 97.3%',
      '200': '353 96% 90.0%',
      '300': '353 95% 81.8%',
      '400': '351 95% 71.4%',
      '500': '355 90% 67.1%',
      '600': '356 73% 57.5%',
      '700': '356 75% 47.3%',
      '800': '355 76% 39.2%',
      '900': '355 75% 31.4%',
      '950': '355 90% 18%',
    },
  };
  
  // Black shades with hex values
  const blackShadesHex: Record<string, string> = {
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
  
  // White shades with hex values
  const whiteShadesHex: Record<string, string> = {
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
  
  // Tailwind color shades with hex values
  const colorShadesHex: Record<string, Record<string, string>> = {
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
  
  // Basic colors lookup (without shade)
  const basicColorsHex: Record<string, string> = {
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
  
  /**
   * Convert a Tailwind color name to CSS HSL value
   * @param colorName The color name (e.g., "red-500", "blue", "none")
   * @returns HSL value as a string (e.g., "0 84% 60%")
   */
  export function getTailwindColorHsl(colorName: string): string {
    if (colorName === 'none') return '0 0% 0%';
    
    const parts = colorName.split('-');
    if (parts.length === 2) {
      const [base, shade] = parts;
      
      if (base === 'white') {
        return whiteShades[shade] || '0 0% 100%';
      }
      
      if (base === 'black') {
        return blackShades[shade] || '0 0% 0%';
      }
      
      return colorShades[base]?.[shade] || '0 0% 0%';
    }
    
    // Handle basic colors
    if (colorName === 'white') return '0 0% 100%';
    if (colorName === 'black') return '0 0% 0%';
    
    // Find in base colors
    const baseColor = baseColorOptions.find(c => c.name === colorName);
    return baseColor?.hsl || '0 0% 0%';
  }
  
  /**
   * Convert a Tailwind color name to CSS hex value
   * @param colorName The color name (e.g., "red-500", "blue", "none")
   * @returns Hex color value (e.g., "#ef4444")
   */
  export function getTailwindColorHex(colorName: string): string {
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
        return blackShadesHex[shade] || '#000000';
      }
      
      // Handle white shades
      if (colorBase === 'white') {
        return whiteShadesHex[shade] || '#ffffff';
      }
      
      // Look up in color shades
      return colorShadesHex[colorBase]?.[shade] || colorName;
    }
  
    // For backward compatibility with old format (e.g., "red-500" stored as a single string)
    return basicColorsHex[colorName] || colorName;
  }
  
  /**
   * Convert a CSS hex color value back to Tailwind color name
   * @param hexColor The hex color value (e.g., "#ef4444")
   * @returns Tailwind color name (e.g., "red-500")
   */
  export function getHexToTailwindName(hexColor: string): string {
    // Special case for transparent color
    if (hexColor === "transparent") {
      return "none";
    }
  
    // Convert hex to lowercase for case-insensitive comparison
    const lowerHex = hexColor.toLowerCase();
    
    // Check for black and white shades first
    for (const [shade, hex] of Object.entries(blackShadesHex)) {
      if (hex.toLowerCase() === lowerHex) {
        return `black-${shade}`;
      }
    }
    
    for (const [shade, hex] of Object.entries(whiteShadesHex)) {
      if (hex.toLowerCase() === lowerHex) {
        return `white-${shade}`;
      }
    }
    
    // Try to match with all color shades
    for (const [color, shades] of Object.entries(colorShadesHex)) {
      for (const [shade, hex] of Object.entries(shades)) {
        if (hex.toLowerCase() === lowerHex) {
          return `${color}-${shade}`;
        }
      }
    }
    
    // Try to match with basic colors
    for (const [color, hex] of Object.entries(basicColorsHex)) {
      if (hex.toLowerCase() === lowerHex) {
        return color;
      }
    }
    
    // If no match, return the original hex
    return hexColor;
  }
  
  /**
   * Get equivalent shade in the new theme when theme changes
   * @param currentShade Current shade value
   * @param isDarkMode Whether the theme is dark mode
   * @param isStroke Whether this is for stroke or fill
   */
  export function getEquivalentShade(currentShade: string, isDarkMode: boolean, isStroke: boolean): string {
    const allShades = ['100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
    
    // Get the index of the current shade in the full list
    const currentIndex = allShades.indexOf(currentShade);
    if (currentIndex === -1) return getDefaultShade(isDarkMode, isStroke); // Use default if not found
    
    // For stroke: map 100-500 to 600-950 and vice versa
    if (isStroke) {
      if (isDarkMode) {
        // Light to dark: map 600-950 (index 5-9) to 100-500 (index 0-4)
        if (currentIndex >= 5) {
          return allShades[currentIndex - 5];
        }
      } else {
        // Dark to light: map 100-500 (index 0-4) to 600-950 (index 5-9)
        if (currentIndex < 5) {
          return allShades[currentIndex + 5];
        }
      }
    } 
    // For fill: map 600-950 to 100-500 and vice versa
    else {
      if (isDarkMode) {
        // Light to dark: map 100-500 (index 0-4) to 600-950 (index 5-9)
        if (currentIndex < 5) {
          return allShades[currentIndex + 5];
        }
      } else {
        // Dark to light: map 600-950 (index 5-9) to 100-500 (index 0-4)
        if (currentIndex >= 5) {
          return allShades[currentIndex - 5];
        }
      }
    }
    
    // If the shade is already in the correct range, keep it
    return currentShade;
  }
  
  // Map color names to Tailwind text color classes
  export const colorClassMap: Record<string, string> = {
    none: "text-foreground",
    white: "text-white",
    black: "text-black",
    slate: "text-slate-500",
    gray: "text-gray-500",
    zinc: "text-zinc-500",
    neutral: "text-neutral-500",
    stone: "text-stone-500",
    red: "text-red-500",
    orange: "text-orange-500",
    amber: "text-amber-500",
    yellow: "text-yellow-500",
    lime: "text-lime-500",
    green: "text-green-500",
    emerald: "text-emerald-500",
    teal: "text-teal-500",
    cyan: "text-cyan-500",
    sky: "text-sky-500",
    blue: "text-blue-500",
    indigo: "text-indigo-500",
    violet: "text-violet-500",
    purple: "text-purple-500",
    fuchsia: "text-fuchsia-500",
    pink: "text-pink-500",
    rose: "text-rose-500",
  };
  
  /**
   * Determine if we're in dark mode based on the theme
   * This is useful for component logic based on theme
   */
  /**
   * Determine if we're in dark mode based on the theme
   * This is useful for component logic based on theme
   */
  export function isDarkTheme(resolvedTheme?: string): boolean {
    return resolvedTheme === 'dark';
  }
  
  /**
   * Get the default shade based on theme and control type
   * @param isDark Whether the theme is dark
   * @param isStroke Whether we're dealing with stroke/border as opposed to fill
   */
  export function getDefaultShade(isDark: boolean, isStroke: boolean): string {
    if (isStroke) {
      return isDark ? '300' : '800';
    } else {
      return isDark ? '800' : '300';
    }
  }
  
  /**
   * Get the appropriate shades based on theme and control type
   * @param isDark Whether the theme is dark
   * @param isStroke Whether we're dealing with stroke/border as opposed to fill
   */
  export function getAvailableShades(isDark: boolean, isStroke: boolean): string[] {
    const allShades = ['100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
    
    if (isStroke) {
      // For stroke: dark mode = 100-500, light mode = 600-950
      return isDark 
        ? allShades.slice(0, 5) // 100-500 for dark mode
        : allShades.slice(5);   // 600-950 for light mode
    } else {
      // For fill: dark mode = 600-950, light mode = 100-500
      return isDark 
        ? allShades.slice(5)    // 600-950 for dark mode
        : allShades.slice(0, 5); // 100-500 for light mode
    }
  }