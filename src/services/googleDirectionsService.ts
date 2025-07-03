interface GoogleDirectionsResponse {
  routes: Array<{
    legs: Array<{
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      steps: Array<{
        polyline: { points: string };
        distance: { text: string; value: number };
        duration: { text: string; value: number };
      }>;
    }>;
    overview_polyline: { points: string };
  }>;
  status: string;
}

interface OptimizedRouteResult {
  coordinates: Array<[number, number]>; // [longitude, latitude] for Mapbox
  totalDistance: string;
  totalDuration: string;
  waypointOrder: number[];
}

class GoogleDirectionsService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api/directions/json';

  constructor() {
    // Get Google API key from environment variable
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('Google Maps API key not found. Please set GOOGLE_MAPS_API_KEY environment variable.');
    }
  }

  /**
   * Decode Google's polyline format to coordinates
   */
  private decodePolyline(encoded: string): Array<[number, number]> {
    const poly: Array<[number, number]> = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let shift = 0, result = 0;

      do {
        let b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (result >= 0x20);

      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        let b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (result >= 0x20);

      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push([lng / 1E5, lat / 1E5]); // Return [longitude, latitude] for Mapbox
    }

    return poly;
  }

  /**
   * Get optimized route using Google Directions API
   */
  async getOptimizedRoute(
    origin: [number, number], // [latitude, longitude]
    destination: [number, number], // [latitude, longitude]
    waypoints: Array<[number, number]> // Array of [latitude, longitude]
  ): Promise<OptimizedRouteResult | null> {
    if (!this.apiKey) {
      console.error('Google Maps API key not available');
      return null;
    }

    try {
      // Build waypoints string
      const waypointsStr = waypoints
        .map(wp => `${wp[0]},${wp[1]}`)
        .join('|');

      // Build URL with optimization
      const url = `${this.baseUrl}?origin=${origin[0]},${origin[1]}&destination=${destination[0]},${destination[1]}&waypoints=optimize:true|${waypointsStr}&key=${this.apiKey}`;

      console.log('Requesting optimized route from Google Directions API...');
      
      const response = await fetch(url);
      const data: GoogleDirectionsResponse = await response.json();

      if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
        console.error('Google Directions API error:', data.status);
        return null;
      }

      const route = data.routes[0];
      
      // Decode the overview polyline to get coordinates
      const coordinates = this.decodePolyline(route.overview_polyline.points);

      // Calculate total distance and duration
      let totalDistance = 0;
      let totalDuration = 0;
      
      route.legs.forEach(leg => {
        totalDistance += leg.distance.value;
        totalDuration += leg.duration.value;
      });

      // Get waypoint order (Google's optimization result)
      const waypointOrder = this.extractWaypointOrder(data);

      return {
        coordinates,
        totalDistance: this.formatDistance(totalDistance),
        totalDuration: this.formatDuration(totalDuration),
        waypointOrder
      };

    } catch (error) {
      console.error('Error getting optimized route from Google:', error);
      return null;
    }
  }

  /**
   * Extract waypoint order from Google's response
   */
  private extractWaypointOrder(data: any): number[] {
    // Google returns waypoint order in the response
    // This tells us the optimal order of waypoints
    return data.routes[0]?.waypoint_order || [];
  }

  /**
   * Format distance in miles
   */
  private formatDistance(meters: number): string {
    const miles = meters * 0.000621371;
    return `${miles.toFixed(1)} mi`;
  }

  /**
   * Format duration in hours and minutes
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Get simple route without optimization (fallback)
   */
  async getSimpleRoute(
    origin: [number, number],
    destination: [number, number],
    waypoints: Array<[number, number]>
  ): Promise<OptimizedRouteResult | null> {
    if (!this.apiKey) {
      console.error('Google Maps API key not available');
      return null;
    }

    try {
      // Build waypoints string without optimization
      const waypointsStr = waypoints
        .map(wp => `${wp[0]},${wp[1]}`)
        .join('|');

      const url = `${this.baseUrl}?origin=${origin[0]},${origin[1]}&destination=${destination[0]},${destination[1]}&waypoints=${waypointsStr}&key=${this.apiKey}`;

      const response = await fetch(url);
      const data: GoogleDirectionsResponse = await response.json();

      if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
        console.error('Google Directions API error:', data.status);
        return null;
      }

      const route = data.routes[0];
      const coordinates = this.decodePolyline(route.overview_polyline.points);

      let totalDistance = 0;
      let totalDuration = 0;
      
      route.legs.forEach(leg => {
        totalDistance += leg.distance.value;
        totalDuration += leg.duration.value;
      });

      return {
        coordinates,
        totalDistance: this.formatDistance(totalDistance),
        totalDuration: this.formatDuration(totalDuration),
        waypointOrder: Array.from({ length: waypoints.length }, (_, i) => i)
      };

    } catch (error) {
      console.error('Error getting simple route from Google:', error);
      return null;
    }
  }
}

export const googleDirectionsService = new GoogleDirectionsService(); 