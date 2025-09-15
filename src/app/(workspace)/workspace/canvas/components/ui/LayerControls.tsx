'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Layers, ChevronsUp, ChevronUp, ChevronDown, ChevronsDown } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuShortcut 
} from '@/components/ui/dropdown-menu';
import { useCanvasStore } from '../../lib/store/canvas-store';

const LayerControls = () => {
  const { 
    moveSelectedToFront, 
    moveSelectedToBack, 
    moveSelectedForward, 
    moveSelectedBackward 
  } = useCanvasStore();

  return (
    <div className="flex flex-row items-center justify-between w-full">
      <Label className="text-sm font-medium text-muted-foreground">Order</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Layers className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" sideOffset={15} align="start" className="w-fit">
          <DropdownMenuLabel>Layer Order</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={moveSelectedToFront}>
              <ChevronsUp className="mr-2 h-4 w-4" />
              <span>Bring to Front</span>
              <DropdownMenuShortcut>⇧⌘↑</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={moveSelectedForward}>
              <ChevronUp className="mr-2 h-4 w-4" />
              <span>Bring Forward</span>
              <DropdownMenuShortcut>⌘↑</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={moveSelectedBackward}>
              <ChevronDown className="mr-2 h-4 w-4" />
              <span>Send Backward</span>
              <DropdownMenuShortcut>⌘↓</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={moveSelectedToBack}>
              <ChevronsDown className="mr-2 h-4 w-4" />
              <span>Send to Back</span>
              <DropdownMenuShortcut>⇧⌘↓</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default LayerControls; 