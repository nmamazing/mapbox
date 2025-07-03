import { Location } from '../types';

interface StopDetails {
  location: Location;
  name: string;
  address: string;
  placeId?: string;
}

interface RouteLeg {
  start: StopDetails;
  end: StopDetails;
  distance: number;
  duration: number;
  polyline: string;
}

class MapsService {
  async getDirections(origin: Location, destination: Location): Promise<any> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      return await response.json();
    } catch (error) {
      console.error('Error getting directions:', error);
      throw error;
    }
  }

  async geocodeAddress(address: string): Promise<Location> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        return {
          latitude: lat,
          longitude: lng,
          address: data.results[0].formatted_address
        };
      }
      throw new Error('No results found');
    } catch (error) {
      console.error('Error geocoding address:', error);
      throw error;
    }
  }

  calculateDistance(origin: Location, destination: Location): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(destination.latitude - origin.latitude);
    const dLon = this.toRad(destination.longitude - origin.longitude);
    const lat1 = this.toRad(origin.latitude);
    const lat2 = this.toRad(destination.latitude);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  async getStopDetails(address: string): Promise<StopDetails> {
    try {
      // Clean up the address
      const cleanAddress = address
        .replace(/,/g, ' ')  // Remove commas
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .trim();  // Remove leading/trailing spaces

      console.log('Geocoding address:', cleanAddress);
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanAddress)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.status === 'ZERO_RESULTS') {
        console.error('No results found for address:', cleanAddress);
        throw new Error(`No results found for address: ${cleanAddress}`);
      }
      
      if (data.status !== 'OK') {
        console.error('Geocoding error:', data.status, data.error_message);
        throw new Error(`Geocoding error: ${data.status} - ${data.error_message}`);
      }
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const { lat, lng } = result.geometry.location;
        return {
          location: {
            latitude: lat,
            longitude: lng,
            address: result.formatted_address
          },
          name: result.formatted_address,
          address: result.formatted_address,
          placeId: result.place_id
        };
      }
      throw new Error('No results found');
    } catch (error) {
      console.error('Error getting stop details:', error);
      throw error;
    }
  }

  async getRouteLeg(origin: StopDetails, destination: StopDetails): Promise<RouteLeg> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.location.latitude},${origin.location.longitude}&destination=${destination.location.latitude},${destination.location.longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0].legs[0];
        return {
          start: origin,
          end: destination,
          distance: route.distance.value,
          duration: route.duration.value,
          polyline: route.steps.map((step: any) => step.polyline.points).join('')
        };
      }
      throw new Error('No route found');
    } catch (error) {
      console.error('Error getting route leg:', error);
      throw error;
    }
  }

  async optimizeRoute(stops: StopDetails[]): Promise<StopDetails[]> {
    // Simple nearest neighbor algorithm for route optimization
    const unvisited = [...stops];
    const optimized: StopDetails[] = [];
    
    // Start with the first stop
    let current = unvisited.shift()!;
    optimized.push(current);
    
    while (unvisited.length > 0) {
      // Find the nearest unvisited stop
      let nearestIndex = 0;
      let minDistance = Infinity;
      
      for (let i = 0; i < unvisited.length; i++) {
        const distance = this.calculateDistance(current.location, unvisited[i].location);
        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }
      
      // Move to the nearest stop
      current = unvisited.splice(nearestIndex, 1)[0];
      optimized.push(current);
    }
    
    return optimized;
  }

  async getOptimizedRoute(stops: StopDetails[]): Promise<RouteLeg[]> {
    // First optimize the order of stops
    const optimizedStops = await this.optimizeRoute(stops);
    
    // Then get route details for each leg
    const legs: RouteLeg[] = [];
    for (let i = 0; i < optimizedStops.length - 1; i++) {
      const leg = await this.getRouteLeg(optimizedStops[i], optimizedStops[i + 1]);
      legs.push(leg);
    }
    
    return legs;
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
        const route = directions.routes[0].legs[0];
        const durationMinutes = Math.round(route.duration.value / 60);
        const durationText = durationMinutes < 60 
          ? `${durationMinutes} min` 
          : `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60} min`;
        
        // Calculate ETA
        const now = new Date();
        const eta = new Date(now.getTime() + route.duration.value * 1000);
        const etaText = eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return {
          duration: durationText,
          eta: etaText
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting route info:', error);
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
}

export const mapsService = new MapsService(); 