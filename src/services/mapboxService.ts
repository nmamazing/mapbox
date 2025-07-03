import { Location } from '../types';
import Constants from 'expo-constants';

interface MapboxDirectionsResponse {
  routes: Array<{
    duration: number;
    distance: number;
    geometry: {
      coordinates: Array<[number, number]>;
    };
  }>;
}

interface MapboxGeocodingResponse {
  features: Array<{
    center: [number, number];
    place_name: string;
  }>;
}

class MapboxService {
  private accessToken: string;
  private baseUrl = 'https://api.mapbox.com';

  constructor() {
    // Get Mapbox access token from environment variable
    this.accessToken = process.env.MAPBOX_DOWNLOADS_TOKEN || 'pk.eyJ1Ijoibmlrb2F6IiwiYSI6ImNtYmgzbzIyNjA1ajkya29ua3pyMDlha3AifQ.1Ws2P9AaCDnp-sLI6PjX_w';
  }

  async geocodeAddress(address: string): Promise<Location> {
    try {
      const response = await fetch(
        `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${this.accessToken}&country=US`
      );
      const data: MapboxGeocodingResponse = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [longitude, latitude] = data.features[0].center;
        return {
          latitude,
          longitude,
          address: data.features[0].place_name
        };
      }
      throw new Error('No results found');
    } catch (error) {
      console.error('Error geocoding address with Mapbox:', error);
      throw error;
    }
  }

  async getDirections(origin: Location, destination: Location): Promise<MapboxDirectionsResponse> {
    try {
      const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
      const response = await fetch(
        `${this.baseUrl}/directions/v5/mapbox/driving/${coordinates}?access_token=${this.accessToken}&geometries=geojson`
      );
      return await response.json();
    } catch (error) {
      console.error('Error getting directions with Mapbox:', error);
      throw error;
    }
  }

  async getRouteInfo(destinationAddress: string): Promise<{duration: string, eta: string} | null> {
    try {
      // Get current location (you might want to pass this as a parameter)
      const currentLocation = await this.getCurrentLocation();
      
      // Geocode the destination address
      const destinationLocation = await this.geocodeAddress(destinationAddress);
      
      // Get directions
      const directions = await this.getDirections(currentLocation, destinationLocation);
      
      if (directions.routes && directions.routes.length > 0) {
        const route = directions.routes[0];
        const durationMinutes = Math.round(route.duration / 60);
        const durationText = durationMinutes < 60 
          ? `${durationMinutes} min` 
          : `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60} min`;
        
        // Calculate ETA
        const now = new Date();
        const eta = new Date(now.getTime() + route.duration * 1000);
        const etaText = eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return {
          duration: durationText,
          eta: etaText
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting route info with Mapbox:', error);
      return null;
    }
  }

  private async getCurrentLocation(): Promise<Location> {
    // For now, return a default location (you might want to use expo-location)
    // In a real app, you'd get this from the device's GPS
    return {
      latitude: 40.7128, // Default to NYC coordinates
      longitude: -74.0060,
      address: 'New York, NY'
    };
  }

  // Method to open Mapbox navigation
  openMapboxNavigation(destinationAddress: string) {
    // For now, we'll use a web URL that opens Mapbox navigation
    // In a real app, you might want to use the Mapbox Navigation SDK
    const url = `https://www.mapbox.com/directions/driving/${encodeURIComponent(destinationAddress)}`;
    return url;
  }

  // Method to get optimized route for multiple waypoints
  async getOptimizedRoute(waypoints: string[]): Promise<string[] | null> {
    try {
      // For now, we'll return the waypoints as-is since Mapbox doesn't have a free optimization API
      // In a production app, you might want to use a third-party optimization service
      // or implement a simple nearest neighbor algorithm
      return waypoints;
    } catch (error) {
      console.error('Error optimizing route with Mapbox:', error);
      return null;
    }
  }

  // Method to get access token
  getAccessToken(): string {
    return this.accessToken;
  }
}

export const mapboxService = new MapboxService(); 