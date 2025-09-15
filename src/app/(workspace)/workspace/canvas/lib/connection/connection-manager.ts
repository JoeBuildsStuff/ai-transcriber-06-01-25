// connection-manager.ts
// Centralized connection logic for the canvas

import { Node } from '../store/canvas-store';
import { 
  Connection, 
  ConnectionOptions, 
  ConnectionPointPosition,
  ConnectionResult,
  Point
} from './connection-types';
import { calculateBoundingBox, deepClone } from './geometry-utils';
import { isElbowLine, generateElbowConnector } from './line-routing-utils';

// Constants
export const CONNECTION_SNAP_THRESHOLD = 25;
export const CONNECTION_POINT_OFFSET = 12;
export const LINE_BOUNDING_BOX_PADDING = 10;

// Trigonometric constants
const COS_45_DEG = 0.7071;
const SIN_45_DEG = 0.7071;

/**
 * Connection Manager class
 * Centralizes all connection-related logic
 */
export class ConnectionManager {
  /**
   * Calculate the position of a connection point on a shape
   */
  calculateConnectionPoint(
    node: Node,
    position: ConnectionPointPosition,
    options: ConnectionOptions = {}
  ): Point {
    const { startOrEnd, startMarker, endMarker, lineNode } = options;
    
    if (!node.dimensions) {
      return { x: node.position.x, y: node.position.y };
    }
    
    const { x, y } = node.position;
    let connectionX = x;
    let connectionY = y;
    let directionX = 0;
    let directionY = 0;
    
    // Get connection point offset
    const connectionPointOffset = CONNECTION_POINT_OFFSET;
    
    // Calculate position based on shape type
    let result;
    if (node.type === 'circle') {
      result = this.calculateCircleConnectionPoint(node, position, connectionX, connectionY, directionX, directionY);
    } else if (node.type === 'diamond') {
      result = this.calculateDiamondConnectionPoint(node, position, connectionX, connectionY, directionX, directionY);
    } else if (node.type === 'triangle') {
      result = this.calculateTriangleConnectionPoint(node, position, connectionX, connectionY, directionX, directionY);
    } else {
      result = this.calculateRectangleConnectionPoint(node, position, connectionX, connectionY, directionX, directionY);
    }
    
    connectionX = result.x;
    connectionY = result.y;
    directionX = result.dirX;
    directionY = result.dirY;
    
    // Normalize direction vector for diagonal positions
    if (directionX !== 0 && directionY !== 0) {
      const length = Math.sqrt(directionX * directionX + directionY * directionY);
      directionX /= length;
      directionY /= length;
    }
    
    // Apply offset for markers
    if (connectionPointOffset > 0) {
      // Check if using the line node (for backward compatibility)
      if (lineNode?.data) {
        const lineData = lineNode.data as { startMarker?: string, endMarker?: string };
        const hasMarker = (lineData.startMarker && lineData.startMarker !== 'none') && startOrEnd === 'start' || 
                          (lineData.endMarker && lineData.endMarker !== 'none') && startOrEnd === 'end';
        if (hasMarker) {
          connectionX += directionX * connectionPointOffset;
          connectionY += directionY * connectionPointOffset;
        }
      } 
      // Use the provided marker info
      else if ((startMarker && startMarker !== 'none' && startOrEnd === 'start') || 
              (endMarker && endMarker !== 'none' && startOrEnd === 'end')) {
        connectionX += directionX * connectionPointOffset;
        connectionY += directionY * connectionPointOffset;
      }
    }
    
    return { x: connectionX, y: connectionY };
  }
  
  /**
   * Helper methods for calculating connection points for different shape types
   */
  private calculateCircleConnectionPoint(
    node: Node, position: ConnectionPointPosition, 
    connectionX: number, connectionY: number,
    directionX: number, directionY: number
  ): { x: number; y: number; dirX: number; dirY: number } {
    const { x, y } = node.position;
    const { width, height } = node.dimensions!;
    
    const radius = Math.min(width, height) / 2;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    let result = { x: connectionX, y: connectionY, dirX: directionX, dirY: directionY };
    
    switch (position) {
      case 'n':
        result = { x: centerX, y: centerY - radius, dirX: 0, dirY: -1 };
        break;
      case 's':
        result = { x: centerX, y: centerY + radius, dirX: 0, dirY: 1 };
        break;
      case 'w':
        result = { x: centerX - radius, y: centerY, dirX: -1, dirY: 0 };
        break;
      case 'e':
        result = { x: centerX + radius, y: centerY, dirX: 1, dirY: 0 };
        break;
    }
    return result;
  }
  
  private calculateDiamondConnectionPoint(
    node: Node, position: ConnectionPointPosition, 
    connectionX: number, connectionY: number,
    directionX: number, directionY: number
  ): { x: number; y: number; dirX: number; dirY: number } {
    const { x, y } = node.position;
    const { width, height } = node.dimensions!;
    
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    // Get the position on the rectangle
    let rectX = 0;
    let rectY = 0;
    
    switch (position) {
      case 'n':
        rectX = centerX;
        rectY = y;
        directionX = 0;
        directionY = -1;
        break;
      case 's':
        rectX = centerX;
        rectY = y + height;
        directionX = 0;
        directionY = 1;
        break;
      case 'w':
        rectX = x;
        rectY = centerY;
        directionX = -1;
        directionY = 0;
        break;
      case 'e':
        rectX = x + width;
        rectY = centerY;
        directionX = 1;
        directionY = 0;
        break;
    }
    
    // Apply 45-degree rotation
    connectionX = centerX + (rectX - centerX) * COS_45_DEG - (rectY - centerY) * SIN_45_DEG;
    connectionY = centerY + (rectX - centerX) * SIN_45_DEG + (rectY - centerY) * COS_45_DEG;
    
    // Rotate the direction vector as well
    const rotatedDirX = directionX * COS_45_DEG - directionY * SIN_45_DEG;
    const rotatedDirY = directionX * SIN_45_DEG + directionY * COS_45_DEG;
    directionX = rotatedDirX;
    directionY = rotatedDirY;
    
    return { x: connectionX, y: connectionY, dirX: directionX, dirY: directionY };
  }
  
  private calculateTriangleConnectionPoint(
    node: Node, position: ConnectionPointPosition, 
    connectionX: number, connectionY: number,
    directionX: number, directionY: number
  ): { x: number; y: number; dirX: number; dirY: number } {
    const { x, y } = node.position;
    const { width, height } = node.dimensions!;
    
    const centerX = x + width / 2;
    
    switch (position) {
      case 'n':
        connectionX = centerX;
        connectionY = y;
        directionX = 0;
        directionY = -1;
        break;
      case 's':
        connectionX = centerX;
        connectionY = y + height;
        directionX = 0;
        directionY = 1;
        break;
      case 'w':
        connectionX = x + width / 4;
        connectionY = y + height / 2;
        directionX = -1;
        directionY = 0;
        break;
      case 'e':
        connectionX = x + width * 3 / 4;
        connectionY = y + height / 2;
        directionX = 1;
        directionY = 0;
        break;
    }
    
    return { x: connectionX, y: connectionY, dirX: directionX, dirY: directionY };
  }
  
  private calculateRectangleConnectionPoint(
    node: Node, position: ConnectionPointPosition, 
    connectionX: number, connectionY: number,
    directionX: number, directionY: number
  ): { x: number; y: number; dirX: number; dirY: number } {
    const { x, y } = node.position;
    const { width, height } = node.dimensions!;
    
    switch (position) {
      case 'n':
        connectionX = x + width / 2;
        connectionY = y;
        directionX = 0;
        directionY = -1;
        break;
      case 's':
        connectionX = x + width / 2;
        connectionY = y + height;
        directionX = 0;
        directionY = 1;
        break;
      case 'w':
        connectionX = x;
        connectionY = y + height / 2;
        directionX = -1;
        directionY = 0;
        break;
      case 'e':
        connectionX = x + width;
        connectionY = y + height / 2;
        directionX = 1;
        directionY = 0;
        break;
    }
    
    return { x: connectionX, y: connectionY, dirX: directionX, dirY: directionY };
  }
  
  /**
   * Find the optimal connection point on a shape for connecting to a target point
   */
  findOptimalConnectionPoint(
    shape: Node,
    targetPoint: Point,
    options: ConnectionOptions = {}
  ): { position: ConnectionPointPosition, point: Point } {
    // All possible connection positions
    const connectionPositions: ConnectionPointPosition[] = ['n', 's', 'e', 'w'];
    
    let minDistance = Number.MAX_VALUE;
    let optimalPosition: ConnectionPointPosition = 'n'; // Default
    let optimalPoint = { x: 0, y: 0 };
    
    // Check each connection point position
    for (const position of connectionPositions) {
      const connectionPoint = this.calculateConnectionPoint(shape, position, options);
      
      // Calculate distance to target point
      const dx = connectionPoint.x - targetPoint.x;
      const dy = connectionPoint.y - targetPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Update if this is the closest point so far
      if (distance < minDistance) {
        minDistance = distance;
        optimalPosition = position;
        optimalPoint = connectionPoint;
      }
    }
    
    return { position: optimalPosition, point: optimalPoint };
  }
  
  /**
   * Find the nearest connection point on any node to a given position
   */
  findNearestConnectionPoint(
    nodes: Node[],
    point: Point,
    excludeNodeId?: string,
    options: ConnectionOptions = {}
  ): ConnectionResult | null {
    // Skip line nodes and the excluded node
    const eligibleNodes = nodes.filter(node => 
      node.id !== excludeNodeId && 
      node.type !== 'line' && 
      node.type !== 'arrow' &&
      !node.data?.isGroup
    );
    
    if (eligibleNodes.length === 0) return null;
    
    // All possible connection positions
    const connectionPositions: ConnectionPointPosition[] = ['n', 's', 'e', 'w'];
    
    let nearestPoint: ConnectionResult | null = null;
    let minDistance = CONNECTION_SNAP_THRESHOLD; // Only consider points within threshold
    
    // Check each node and each connection point
    for (const node of eligibleNodes) {
      for (const position of connectionPositions) {
        // Calculate the connection point position
        const pointPos = this.calculateConnectionPoint(
          node, 
          position, 
          { 
            ...options,
            isConnected: true
          }
        );
        
        const dx = pointPos.x - point.x;
        const dy = pointPos.y - point.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If this point is closer than the current nearest, update
        if (distance < minDistance) {
          minDistance = distance;
          nearestPoint = {
            node,
            position,
            absolutePosition: pointPos,
            distance
          };
        }
      }
    }
    
    return nearestPoint;
  }
  
  /**
   * Update a line when one of its endpoints is connected to a shape
   */
  updateConnectedLine(
    line: Node,
    connection: Connection,
    connectionPoint: Point
  ): Node {
    if (!line.points || line.points.length <= connection.pointIndex) {
      return line;
    }
  
    // Create a copy of the line to avoid direct mutation
    const updatedLine = { ...line, points: [...line.points] };
    
    // Create a copy of the connection to avoid modifying the original
    const connectionCopy = { ...connection };
    
    // Calculate the relative position for the line point
    const relativeX = connectionPoint.x - line.position.x;
    const relativeY = connectionPoint.y - line.position.y;
    
    // Update the line point
    updatedLine.points[connectionCopy.pointIndex] = { x: relativeX, y: relativeY };
    
    // Recalculate the bounding box
    const boundingBox = calculateBoundingBox(updatedLine.points, LINE_BOUNDING_BOX_PADDING);
    
    // Update dimensions
    updatedLine.dimensions = boundingBox.dimensions;
    
    // Apply position adjustment if needed
    if (boundingBox.positionAdjustment) {
      updatedLine.position = {
        x: updatedLine.position.x + boundingBox.positionAdjustment.x,
        y: updatedLine.position.y + boundingBox.positionAdjustment.y
      };
      
      // Adjust all points
      for (let i = 0; i < updatedLine.points.length; i++) {
        updatedLine.points[i] = {
          x: updatedLine.points[i].x + boundingBox.pointAdjustments.x,
          y: updatedLine.points[i].y + boundingBox.pointAdjustments.y
        };
      }
    }
  
    return updatedLine;
  }
  
  /**
   * Update all connections for a line
   */
  updateAllLineConnections(
    line: Node,
    connections: Connection[],
    nodes: Node[]
  ): Node {
    // Check if this line uses elbow routing
    if (isElbowLine(line)) {
      return this.updateElbowLine(line, connections, nodes);
    }
    
    // For straight lines
    // Create a copy of the line to avoid direct mutation
    const updatedLine = { ...line, points: [...(line.points || [])] };
    
    // Find all connections for this line
    const lineConnections = connections.filter(conn => conn.lineId === line.id);
    
    // If there are no connections or no points, return the line as is
    if (lineConnections.length === 0 || !updatedLine.points || updatedLine.points.length < 2) {
      return updatedLine;
    }
    
    // Identify the connections for the first and last points (endpoints)
    const firstPointConnection = lineConnections.find(conn => conn.pointIndex === 0);
    const lastPointConnection = lineConnections.find(conn => 
      conn.pointIndex === updatedLine.points!.length - 1
    );
    
    // Process connections
    this.processEndpointConnections(
      updatedLine, nodes, firstPointConnection, lastPointConnection
    );
    
    // Process other connections
    for (const connection of lineConnections) {
      if (!connection.dynamic) continue;
      
      // Skip endpoints if already processed
      if ((connection.pointIndex === 0 && firstPointConnection) || 
          (connection.pointIndex === updatedLine.points.length - 1 && lastPointConnection)) {
        continue;
      }
      
      this.processMidpointConnection(updatedLine, connection, nodes);
    }
    
    // Recalculate the bounding box
    if (updatedLine.points && updatedLine.points.length > 0) {
      const boundingBox = calculateBoundingBox(updatedLine.points, LINE_BOUNDING_BOX_PADDING);
      
      // Update dimensions
      updatedLine.dimensions = boundingBox.dimensions;
      
      // Apply position adjustment if needed
      if (boundingBox.positionAdjustment) {
        this.applyPositionAdjustment(updatedLine, boundingBox);
      }
    }
    
    return updatedLine;
  }
  
  /**
   * Process endpoint connections for a line
   */
  private processEndpointConnections(
    line: Node,
    nodes: Node[],
    firstPointConnection?: Connection,
    lastPointConnection?: Connection
  ): void {
    // Skip if no connections
    if (!firstPointConnection && !lastPointConnection) return;
    
    // Create copies to avoid modifying originals
    const firstPointConnectionInfo = firstPointConnection ? { 
      ...firstPointConnection,
      position: firstPointConnection.position 
    } : null;
    
    const lastPointConnectionInfo = lastPointConnection ? { 
      ...lastPointConnection,
      position: lastPointConnection.position 
    } : null;
    
    // If both endpoints are connected, we need to optimize both
    if (firstPointConnectionInfo && lastPointConnectionInfo && 
        firstPointConnectionInfo.dynamic && lastPointConnectionInfo.dynamic) {
      this.processBothEndpointsConnected(line, nodes, firstPointConnectionInfo, lastPointConnectionInfo);
    }
  }
  
  /**
   * Process a line with both endpoints connected
   */
  private processBothEndpointsConnected(
    line: Node,
    nodes: Node[],
    firstPointConnectionInfo: Connection,
    lastPointConnectionInfo: Connection
  ): void {
    // Find the shapes for both connections
    const firstShape = nodes.find(n => n.id === firstPointConnectionInfo.shapeId);
    const lastShape = nodes.find(n => n.id === lastPointConnectionInfo.shapeId);
    
    if (!firstShape || !lastShape || !line.points) return;
    
    // Start with the current positions
    let firstPoint = {
      x: line.position.x + line.points[0].x,
      y: line.position.y + line.points[0].y
    };
    
    let lastPoint = {
      x: line.position.x + line.points[line.points.length - 1].x,
      y: line.position.y + line.points[line.points.length - 1].y
    };
    
    // Iterate to converge on optimal points
    for (let i = 0; i < 3; i++) {
      // Find optimal connection point for first endpoint based on last point
      const optimalFirst = this.findOptimalConnectionPoint(
        firstShape, 
        lastPoint, 
        { isConnected: true, lineNode: line, startOrEnd: 'start' }
      );
      
      firstPoint = optimalFirst.point;
      firstPointConnectionInfo.position = optimalFirst.position;
      
      // Find optimal connection point for last endpoint based on first point
      const optimalLast = this.findOptimalConnectionPoint(
        lastShape, 
        firstPoint, 
        { isConnected: true, lineNode: line, startOrEnd: 'end' }
      );
      
      lastPoint = optimalLast.point;
      lastPointConnectionInfo.position = optimalLast.position;
    }
    
    // Update the line points with the final optimal positions
    line.points[0] = {
      x: firstPoint.x - line.position.x,
      y: firstPoint.y - line.position.y
    };
    
    line.points[line.points.length - 1] = {
      x: lastPoint.x - line.position.x,
      y: lastPoint.y - line.position.y
    };
  }
  
  /**
   * Process a midpoint connection
   */
  private processMidpointConnection(
    line: Node,
    connection: Connection,
    nodes: Node[]
  ): void {
    if (!line.points) return;
    
    // Create a copy of the connection
    const connectionInfo = { 
      ...connection,
      position: connection.position 
    };
    
    // Find the shape node
    const shapeNode = nodes.find(n => n.id === connectionInfo.shapeId);
    
    if (!shapeNode) return;
    
    // Determine which point to use as reference
    let referencePoint: Point | null = null;
    
    if (connectionInfo.pointIndex === 0 && line.points.length > 1) {
      // First point - use the last point as reference
      referencePoint = {
        x: line.position.x + line.points[line.points.length - 1].x,
        y: line.position.y + line.points[line.points.length - 1].y
      };
    } else if (connectionInfo.pointIndex === line.points.length - 1) {
      // Last point - use the first point as reference
      referencePoint = {
        x: line.position.x + line.points[0].x,
        y: line.position.y + line.points[0].y
      };
    } else if (connectionInfo.pointIndex > 0 && connectionInfo.pointIndex < line.points.length - 1) {
      // Middle point - use the average of adjacent points
      const prevPoint = {
        x: line.position.x + line.points[connectionInfo.pointIndex - 1].x,
        y: line.position.y + line.points[connectionInfo.pointIndex - 1].y
      };
      
      const nextPoint = {
        x: line.position.x + line.points[connectionInfo.pointIndex + 1].x,
        y: line.position.y + line.points[connectionInfo.pointIndex + 1].y
      };
      
      referencePoint = {
        x: (prevPoint.x + nextPoint.x) / 2,
        y: (prevPoint.y + nextPoint.y) / 2
      };
    }
    
    // Find optimal connection point
    if (referencePoint) {
      const startOrEnd = 
        connectionInfo.pointIndex === 0 ? 'start' : 
        connectionInfo.pointIndex === line.points.length - 1 ? 'end' : 
        undefined;
      
      const optimalConnection = this.findOptimalConnectionPoint(
        shapeNode, 
        referencePoint, 
        { isConnected: true, lineNode: line, startOrEnd }
      );
      
      // Update the connection position
      connectionInfo.position = optimalConnection.position;
      
      // Calculate the relative position for the line point
      const relativeX = optimalConnection.point.x - line.position.x;
      const relativeY = optimalConnection.point.y - line.position.y;
      
      // Update the line point
      line.points[connectionInfo.pointIndex] = { x: relativeX, y: relativeY };
    }
  }
  
  /**
   * Apply position adjustment to a line and its points
   */
  private applyPositionAdjustment(
    line: Node,
    boundingBox: { 
      dimensions: { width: number; height: number };
      positionAdjustment: Point | null;
      pointAdjustments: Point;
    }
  ): void {
    if (!boundingBox.positionAdjustment || !line.points) return;
    
    line.position = {
      x: line.position.x + boundingBox.positionAdjustment.x,
      y: line.position.y + boundingBox.positionAdjustment.y
    };
    
    // Adjust all points
    for (let i = 0; i < line.points.length; i++) {
      line.points[i] = {
        x: line.points[i].x + boundingBox.pointAdjustments.x,
        y: line.points[i].y + boundingBox.pointAdjustments.y
      };
    }
  }
  
  /**
   * Update an elbow line
   */
  private updateElbowLine(
    line: Node,
    connections: Connection[],
    nodes: Node[]
  ): Node {
    // Create a copy of the line
    const updatedLine = deepClone(line);
    
    // Find connections for this line
    const lineConnections = connections.filter(conn => conn.lineId === line.id);
    
    // If there are no connections or no points, return the line as is
    if (lineConnections.length === 0 || !updatedLine.points || updatedLine.points.length < 2) {
      return updatedLine;
    }
    
    // Find start and end connections (if any)
    const startConnection = lineConnections.find(conn => conn.pointIndex === 0);
    const endConnection = lineConnections.find(conn => 
      conn.pointIndex === updatedLine.points!.length - 1
    );
    
    // If both endpoints are connected, regenerate the entire elbow path
    if (startConnection && endConnection) {
      this.regenerateElbowPath(updatedLine, startConnection, endConnection, nodes);
    }
    // Otherwise, just update the individual connection points
    else {
      for (const connection of lineConnections) {
        if (!connection.dynamic) continue;
        
        const shapeNode = nodes.find(n => n.id === connection.shapeId);
        if (!shapeNode) continue;
        
        // Find the opposite endpoint to use as reference
        const oppositePointIndex = connection.pointIndex === 0 
          ? updatedLine.points.length - 1 
          : 0;
        
        const oppositePoint = {
          x: updatedLine.position.x + updatedLine.points[oppositePointIndex].x,
          y: updatedLine.position.y + updatedLine.points[oppositePointIndex].y
        };
        
        // Find the optimal connection point
        const optimalConnection = this.findOptimalConnectionPoint(
          shapeNode, 
          oppositePoint, 
          { 
            isConnected: true, 
            lineNode: updatedLine, 
            startOrEnd: connection.pointIndex === 0 ? 'start' : 'end' 
          }
        );
        
        // Update the connection point
        const updatedPoint = optimalConnection.point;
        
        // Update the line's point (in relative coordinates)
        updatedLine.points[connection.pointIndex] = {
          x: updatedPoint.x - updatedLine.position.x,
          y: updatedPoint.y - updatedLine.position.y
        };
      }
    }
    
    // Recalculate the bounding box
    const boundingBox = calculateBoundingBox(updatedLine.points, LINE_BOUNDING_BOX_PADDING);
    
    // Update dimensions
    updatedLine.dimensions = boundingBox.dimensions;
    
    // Apply position adjustment if needed
    if (boundingBox.positionAdjustment) {
      this.applyPositionAdjustment(updatedLine, boundingBox);
    }
    
    return updatedLine;
  }
  
  /**
   * Regenerate the entire elbow path for a line with both endpoints connected
   */
  private regenerateElbowPath(
    line: Node,
    startConnection: Connection,
    endConnection: Connection,
    nodes: Node[]
  ): void {
    if (!line.points) return;
    
    // Find the shapes for both connections
    const startShape = nodes.find(n => n.id === startConnection.shapeId);
    const endShape = nodes.find(n => n.id === endConnection.shapeId);
    
    if (!startShape || !endShape) return;
    
    // Get the absolute positions of the current endpoints
    const endPoint = {
      x: line.position.x + line.points[line.points.length - 1].x,
      y: line.position.y + line.points[line.points.length - 1].y
    };
    
    // Find optimal connection points
    const startResult = this.findOptimalConnectionPoint(
      startShape, 
      endPoint, 
      { isConnected: true, lineNode: line, startOrEnd: 'start' }
    );
    
    const endResult = this.findOptimalConnectionPoint(
      endShape, 
      startResult.point, 
      { isConnected: true, lineNode: line, startOrEnd: 'end' }
    );
    
    // Generate a new elbow connector between these points
    const newPoints = generateElbowConnector(
      startResult.point,
      endResult.point,
      startResult.position,
      endResult.position
    );
    
    // Convert to relative coordinates
    for (let i = 0; i < newPoints.length; i++) {
      newPoints[i] = {
        x: newPoints[i].x - line.position.x,
        y: newPoints[i].y - line.position.y
      };
    }
    
    // Update the line points
    line.points = newPoints;
  }
  
  /**
   * Create a new connection between a line endpoint and a shape
   */
  createConnection(
    lineId: string,
    pointIndex: number,
    shapeId: string,
    position: ConnectionPointPosition,
    dynamic: boolean = true
  ): Connection {
    return {
      lineId,
      pointIndex,
      shapeId,
      position,
      dynamic
    };
  }
}

// Create and export the singleton instance
export const connectionManager = new ConnectionManager(); 