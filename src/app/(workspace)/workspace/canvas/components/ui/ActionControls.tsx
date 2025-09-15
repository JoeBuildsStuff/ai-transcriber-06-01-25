'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ChevronRight, Copy, Delete, Group, Ungroup } from 'lucide-react';
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

const ActionControls = () => {
  const { 
    duplicateSelectedNodes, 
    deleteSelectedNodes,
    groupSelectedNodes,
    ungroupSelectedNodes
  } = useCanvasStore();

  // Add keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the event target is an input or textarea element
      const target = e.target as HTMLElement;
      const isEditingText = target.tagName === 'INPUT' || 
                           target.tagName === 'TEXTAREA' || 
                           target.isContentEditable;
      
      // Check if Command/Control + D is pressed for duplicate
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault(); // Prevent browser's default behavior
        duplicateSelectedNodes();
      }
      
      // Check if Delete or Backspace is pressed for delete
      // Only delete nodes if not editing text
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditingText) {
        deleteSelectedNodes();
      }
      
      // Check if Command/Control + G is pressed for group
      if ((e.metaKey || e.ctrlKey) && e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        groupSelectedNodes();
      }
      
      // Check if Command/Control + Shift + G is pressed for ungroup
      if ((e.metaKey || e.ctrlKey) && e.key === 'g' && e.shiftKey) {
        e.preventDefault();
        ungroupSelectedNodes();
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [duplicateSelectedNodes, deleteSelectedNodes, groupSelectedNodes, ungroupSelectedNodes]);

  return (
    <div className="flex flex-row items-center justify-between w-full">
      <Label className="text-sm font-medium text-muted-foreground">Actions</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon"><ChevronRight className="w-4 h-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" sideOffset={15} align="start" className="w-fit">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={duplicateSelectedNodes}>
              <Copy className="mr-2 h-4 w-4" />
              <span>Duplicate</span>
              <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={deleteSelectedNodes}>
              <Delete className="mr-2 h-4 w-4" />
              <span>Delete</span>
              <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={groupSelectedNodes}>
              <Group className="mr-2 h-4 w-4" />
              <span>Group</span>
              <DropdownMenuShortcut>⌘G</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={ungroupSelectedNodes}>
              <Ungroup className="mr-2 h-4 w-4" />
              <span>Ungroup</span>
              <DropdownMenuShortcut>⇧⌘G</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ActionControls; 