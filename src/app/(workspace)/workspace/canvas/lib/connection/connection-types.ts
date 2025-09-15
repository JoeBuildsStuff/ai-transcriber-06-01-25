// connection-types.ts
// Contains all type definitions for the connection system

import { Node } from '../store/canvas-store';

export type ConnectionPointPosition = 'n' | 's' | 'e' | 'w';

export type MarkerShape = 'none' | 'arrow' | 'triangle' | 'circle' | 'diamond' | 'square';

export type FillStyle = 'filled' | 'outlined';

export type LineRoutingType = 'straight' | 'elbow' | 'curved';

export interface Point {
  x: number;
  y: number;
}

export interface ConnectionPoint {
  nodeId: string;
  position: ConnectionPointPosition;
  absolutePosition: Point;
}

export interface Connection {
  lineId: string;
  pointIndex: number;
  shapeId: string;
  position: ConnectionPointPosition;
  dynamic: boolean;
}

export interface ConnectionOptions {
  isConnected?: boolean;
  startOrEnd?: 'start' | 'end';
  startMarker?: MarkerShape;
  endMarker?: MarkerShape;
  lineNode?: Node;
}

export interface ConnectionResult {
  node: Node;
  position: ConnectionPointPosition;
  absolutePosition: Point;
  distance: number;
}

export interface LineBoundingBoxResult {
  dimensions: { width: number; height: number };
  positionAdjustment: Point | null;
  pointAdjustments: Point;
}

export interface MarkerInfo {
  shape: MarkerShape;
  fillStyle: FillStyle;
  isStart: boolean;
  color: string;
  fillColor: string;
}

export interface ElbowRouteOptions {
  preferHorizontalFirst?: boolean;
  minSegmentLength?: number;
} 