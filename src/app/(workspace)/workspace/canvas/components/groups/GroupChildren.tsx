import React from 'react';
import { Node } from '../../lib/store/canvas-store';

interface GroupChildrenProps {
  children: Node[];
}

const GroupChildren: React.FC<GroupChildrenProps> = ({ children }) => {
  return (
    <div 
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {children.map(childNode => {
        if (!childNode.dimensions) return null;

        const childContainerStyle: React.CSSProperties = {
          position: 'absolute',
          left: `${childNode.position.x}px`,
          top: `${childNode.position.y}px`,
          width: `${childNode.dimensions.width}px`,
          height: `${childNode.dimensions.height}px`,
          pointerEvents: 'none',
        };

        return (
          <div key={childNode.id} style={childContainerStyle}>
            {/* Child node content will be rendered by ShapeRenderer */}
          </div>
        );
      })}
    </div>
  );
};

export default GroupChildren; 