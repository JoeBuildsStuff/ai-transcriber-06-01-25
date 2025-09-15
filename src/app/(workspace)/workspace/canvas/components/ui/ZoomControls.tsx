'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Minus, Plus} from 'lucide-react';
import { useCanvasStore } from '../../lib/store/canvas-store';

const ZoomControls = () => {
  const { transform, zoomIn, zoomOut } = useCanvasStore();
  
  // Convert zoom from 0-1 scale to percentage for display
  const zoomPercentage = Math.round(transform.zoom * 100);

  return (
    <div className="absolute bottom-4 left-4">
      <Card className="flex flex-row items-center bg-background/80 backdrop-blur-sm p-1 gap-0">
        <Button variant="ghost" size="icon" onClick={zoomOut}>
          <Minus className="size-4 shrink-0" />
        </Button>
        <span className="px-2">{zoomPercentage}%</span>
        <Button variant="ghost" size="icon" onClick={zoomIn}>
          <Plus className="size-4 shrink-0" />
        </Button>
      </Card>
    </div>
  );
};

export default ZoomControls; 