'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LayoutTemplate } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuGroup, 
} from '@/components/ui/dropdown-menu';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceAround,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceAround
} from 'lucide-react';
import { useCanvasStore } from '../../lib/store/canvas-store';

const AlignmentControls = () => {
  // Get alignment functions from the canvas store
  const { 
    alignTop, 
    alignMiddle, 
    alignBottom, 
    alignLeft, 
    alignCenter, 
    alignRight, 
    distributeHorizontally, 
    distributeVertically 
  } = useCanvasStore();

  // Helper function to handle alignment
  const handleAlignment = (alignFn: () => void) => {
    alignFn();
  };

  return (
    <div className="flex flex-row items-center justify-between w-full">
      <Label className="text-sm font-medium text-muted-foreground mr-2">Alignment</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon"><LayoutTemplate className="w-4 h-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" sideOffset={15} align="start" className="w-fit">
          <DropdownMenuLabel>Alignment</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 py-1 text-xs font-medium text-muted-foreground">Vertical</DropdownMenuLabel>
            <div className="flex flex-row px-2 space-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                aria-label="Align Top" 
                onClick={() => handleAlignment(alignTop)}
              >
                <AlignStartHorizontal className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                aria-label="Align Middle" 
                onClick={() => handleAlignment(alignMiddle)}
              >
                <AlignCenterHorizontal className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                aria-label="Align Bottom" 
                onClick={() => handleAlignment(alignBottom)}
              >
                <AlignEndHorizontal className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                aria-label="Distribute Vertically" 
                onClick={() => handleAlignment(distributeVertically)}
              >
                <AlignVerticalSpaceAround className="w-4 h-4" />
              </Button>
            </div>
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 py-1 text-xs font-medium text-muted-foreground">Horizontal</DropdownMenuLabel>
            <div className="flex flex-row px-2 space-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                aria-label="Align Left" 
                onClick={() => handleAlignment(alignLeft)}
              >
                <AlignStartVertical className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                aria-label="Align Center" 
                onClick={() => handleAlignment(alignCenter)}
              >
                <AlignCenterVertical className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                aria-label="Align Right" 
                onClick={() => handleAlignment(alignRight)}
              >
                <AlignEndVertical className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                aria-label="Distribute Horizontally" 
                onClick={() => handleAlignment(distributeHorizontally)}
              >
                <AlignHorizontalSpaceAround className="w-4 h-4" />
              </Button>
            </div>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default AlignmentControls; 