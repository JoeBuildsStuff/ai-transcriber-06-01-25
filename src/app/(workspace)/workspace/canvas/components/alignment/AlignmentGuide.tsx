import React, { memo } from 'react';

interface AlignmentGuideProps {
  orientation: 'horizontal' | 'vertical';
  position: number;
  start: number;
  end: number;
  transform: {
    x: number;
    y: number;
    zoom: number;
  };
}

const AlignmentGuide: React.FC<AlignmentGuideProps> = ({
  orientation,
  position,
  start,
  end,
  transform
  // type parameter removed as it's not used anymore
}) => {
  // Apply canvas transform to the guide position
  const transformedPosition = orientation === 'horizontal'
    ? position * transform.zoom + transform.y
    : position * transform.zoom + transform.x;
  
  const transformedStart = orientation === 'horizontal'
    ? start * transform.zoom + transform.x
    : start * transform.zoom + transform.y;
  
  const transformedEnd = orientation === 'horizontal'
    ? end * transform.zoom + transform.x
    : end * transform.zoom + transform.y;
  
  const length = transformedEnd - transformedStart;
  
  // Skip rendering if the guide is too short
  if (length < 2) return null;
  
  // Use consistent styling for all guide types
  const guideColor = 'var(--border)';
  const thickness = 1;
  
  const style = orientation === 'horizontal'
    ? {
        left: transformedStart,
        top: transformedPosition,
        width: length,
        height: thickness,
        backgroundColor: guideColor
      }
    : {
        left: transformedPosition,
        top: transformedStart,
        width: thickness,
        height: length,
        backgroundColor: guideColor
      };
  
  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{
        ...style,
        transition: 'opacity 0.1s ease-in-out'
      }}
    >
      {/* Add small circles at the ends of the guide for better visibility */}
      {orientation === 'horizontal' && (
        <>
          <div 
            className="absolute rounded-full"
            style={{
              width: 4,
              height: 4,
              left: -2,
              top: -1.5,
              backgroundColor: guideColor
            }}
          />
          <div 
            className="absolute rounded-full"
            style={{
              width: 4,
              height: 4,
              right: -2,
              top: -1.5,
              backgroundColor: guideColor
            }}
          />
        </>
      )}
      
      {orientation === 'vertical' && (
        <>
          <div 
            className="absolute rounded-full"
            style={{
              width: 4,
              height: 4,
              left: -1.5,
              top: -2,
              backgroundColor: guideColor
            }}
          />
          <div 
            className="absolute rounded-full"
            style={{
              width: 4,
              height: 4,
              left: -1.5,
              bottom: -2,
              backgroundColor: guideColor
            }}
          />
        </>
      )}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(AlignmentGuide); 