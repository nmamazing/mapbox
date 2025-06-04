import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { locationService } from '../services/locationService';

const LOCATION_TASK_NAME = 'background-location-task';

interface LocationTaskData {
  locations: Location.LocationObject[];
}

// Define the task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  const locationData = data as LocationTaskData;
  if (locationData?.locations) {
    for (const location of locationData.locations) {
      try {
        await locationService.createLocation({
          user: 'currentUser', // You might want to get this from your auth context
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy || 0, // Provide default value if null
          timestamp: new Date().toISOString(),
          message: 'Background location update'
        });
      } catch (error) {
        console.error('Error sending location to backend:', error);
      }
    }
  }
});

// Start background location updates
export const startBackgroundLocationUpdates = async () => {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      throw new Error('Foreground location permission not granted');
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      throw new Error('Background location permission not granted');
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000, // 5 seconds
      distanceInterval: 10, // 10 meters
      foregroundService: {
        notificationTitle: 'Location Tracking',
        notificationBody: 'Tracking your location in the background',
        notificationColor: '#4CAF50',
      },
    });

    console.log('Background location updates started');
  } catch (error) {
    console.error('Error starting background location updates:', error);
    throw error;
  }
};

// Stop background location updates
export const stopBackgroundLocationUpdates = async () => {
  try {
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isTracking) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('Background location updates stopped');
    }
  } catch (error) {
    console.error('Error stopping background location updates:', error);
    throw error;
  }
}; 