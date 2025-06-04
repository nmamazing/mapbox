import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface Location {
  user: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  message?: string;
}

export interface LocationResponse {
  success: boolean;
  data: Location[];
  error?: string;
}

class LocationService {
  private readonly API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'https://aaabe.amazingoffer.com/api/agent/v1';
  private readonly TOKEN_KEY = '@auth_token';

  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  // Create a new location
  async createLocation(location: Location): Promise<LocationResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(`${this.API_BASE_URL}/locations`, location, { headers });
      return response.data;
    } catch (error: any) {
      console.error('Error creating location:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Failed to create location');
    }
  }

  // Get recent locations
  async getRecentLocations(): Promise<LocationResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${this.API_BASE_URL}/locations/recent`, { headers });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching recent locations:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Failed to fetch recent locations');
    }
  }

  // Get locations by user
  async getLocationsByUser(user: string): Promise<LocationResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${this.API_BASE_URL}/locations/user/${user}`, { headers });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching user locations:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Failed to fetch user locations');
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

export const locationService = new LocationService(); 