import React from 'react';
import { Node } from '../../lib/store/canvas-store';

interface GroupNodeProps {
  node: Node;
  children?: React.ReactNode;
}

const GroupNode: React.FC<GroupNodeProps> = ({ node, children }) => {
  const { selected } = node;

  return (
    <>
      {selected && (
        <div 
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            border: '2px dashed #3b82f6',
            borderRadius: '4px',
            pointerEvents: 'none',
            boxSizing: 'border-box',
            zIndex: 1,
          }}
        />
      )}
      {children}
    </>
  );
};

export default GroupNode; 