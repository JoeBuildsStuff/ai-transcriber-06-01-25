// index.ts - Central exports for connection system

// Export all types
export * from './connection-types';

// Export all utilities
export {
  distanceToLineSegment,
  lineSegmentsIntersect,
  calculateBoundingBox,
  pointInsideRect,
  deepClone
} from './geometry-utils';

// Export line routing utilities
export {
  isElbowLine,
  generateElbowConnector,
  determineOptimalElbowDirection,
  adjustElbowMiddlePoint,
  generateRoundedElbowPathData,
  convertStraightToElbow,
  convertElbowToStraight
} from './line-routing-utils';

// Export connection manager
export {
  ConnectionManager,
  connectionManager,
  CONNECTION_SNAP_THRESHOLD,
  CONNECTION_POINT_OFFSET,
  LINE_BOUNDING_BOX_PADDING
} from './connection-manager';

// Export marker manager
export {
  MarkerManager,
  markerManager
} from './marker-manager'; 