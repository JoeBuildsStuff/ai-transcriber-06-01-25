import React from 'react';

interface SelectionBoxProps {
  selectionBox: {
    start: { x: number; y: number };
    end: { x: number; y: number };
  };
  transform: {
    x: number;
    y: number;
    zoom: number;
  };
}

const SelectionBox: React.FC<SelectionBoxProps> = ({ selectionBox, transform }) => {
  return (
    <div
      className="absolute border border-blue-500 bg-blue-500/10 pointer-events-none"
      style={{
        left: `${Math.min(selectionBox.start.x, selectionBox.end.x) * transform.zoom + transform.x}px`,
        top: `${Math.min(selectionBox.start.y, selectionBox.end.y) * transform.zoom + transform.y}px`,
        width: `${Math.abs(selectionBox.end.x - selectionBox.start.x) * transform.zoom}px`,
        height: `${Math.abs(selectionBox.end.y - selectionBox.start.y) * transform.zoom}px`,
      }}
    />
  );
};

export default SelectionBox; 