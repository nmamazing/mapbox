import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getRealm } from '../config/realm';
import { syncWithMongoDB } from '../services/mongodb';

const BACKEND_URL = 'http://<YOUR_BACKEND_IP>:4000/add-location'; // Replace with your backend IP or domain

async function sendLocationToBackend({
  user,
  latitude,
  longitude,
  accuracy,
  timestamp,
  message,
}: {
  user?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  message?: string;
}) {
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user,
        latitude,
        longitude,
        accuracy,
        timestamp,
        message,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to send location');
    return data;
  } catch (err) {
    console.error('Error sending location to backend:', err);
    throw err;
  }
}

TaskManager.defineTask('location-tracking', async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      await saveUserLocation(locations[0]);
    }
  }
});

async function saveUserLocation(location: Location.LocationObject) {
  try {
    // Send to backend
    await sendLocationToBackend({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: new Date().toISOString(),
      message: 'Tracked location',
    });
    console.log('Location sent to backend successfully');
  } catch (error) {
    console.error('Error saving location:', error);
  }
}

export async function startLocationTracking() {
  try {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== 'granted') {
      console.error('Background location permission not granted');
      return;
    }

    await Location.startLocationUpdatesAsync('location-tracking', {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000,
      distanceInterval: 10,
      foregroundService: {
        notificationTitle: 'Location Tracking',
        notificationBody: 'Tracking your location in the background',
      },
    });

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (location) => {
        saveUserLocation(location);
      }
    );
  } catch (error) {
    console.error('Error starting location tracking:', error);
  }
}

export async function stopLocationTracking() {
  try {
    await Location.stopLocationUpdatesAsync('location-tracking');
  } catch (error) {
    console.error('Error stopping location tracking:', error);
  }
} 