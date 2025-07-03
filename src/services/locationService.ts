import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { API_ENDPOINTS } from '../config/api';

// Types
interface Location {
  user?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  message?: string;
}

interface LocationResponse {
  request: {
    requestId: string;
    started: string;
    completed: string;
  };
  locations: Location[];
}

class LocationService {
  private readonly TOKEN_KEY = '@auth_token';

  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async getHeaders() {
    const token = await this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  // Add a new location
  async addLocation(location: Omit<Location, 'timestamp'>): Promise<string> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(API_ENDPOINTS.ADD_LOCATION, {
        ...location,
        timestamp: new Date().toISOString()
      }, { headers });
      return response.data.locationId;
    } catch (error: any) {
      console.error('Error adding location:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errorMessage || 'Failed to add location');
    }
  }

  // Get recent locations
  async getRecentLocations(): Promise<LocationResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(API_ENDPOINTS.GET_LOCATIONS, { headers });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching recent locations:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errorMessage || 'Failed to fetch recent locations');
    }
  }

  // Get locations by user
  async getUserLocations(user: string): Promise<LocationResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(API_ENDPOINTS.GET_USER_LOCATIONS(user), { headers });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching user locations:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errorMessage || 'Failed to fetch user locations');
    }
  }

  // Set authentication token
  async setAuthToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.TOKEN_KEY, token);
    } catch (error) {
      console.error('Error setting auth token:', error);
      throw new Error('Failed to set authentication token');
    }
  }

  // Clear authentication token
  async clearAuthToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing auth token:', error);
      throw new Error('Failed to clear authentication token');
    }
  }
}

export default new LocationService(); 