import { Location } from '../types';

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
}

export const mapsService = new MapsService(); 