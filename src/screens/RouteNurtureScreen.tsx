import React, { useState, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { MapOverlay } from '../components/MapOverlay';
import { colors } from '../theme/colors';

const DEFAULT_REGION: Region = {
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

interface Coordinate {
  latitude: number;
  longitude: number;
}

const RouteNurtureScreen = () => {
  const mapRef = useRef<MapView>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<Location.LocationObject[]>([]);
  const watchId = useRef<Location.LocationSubscription | null>(null);

  const startTracking = async () => {
    console.log('Start Tracking button pressed in RouteNurture');
    setIsTracking(true);
    setCurrentRoute([]);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required for tracking.');
      return;
    }

    watchId.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (newLocation) => {
        setCurrentRoute(prev => [...prev, newLocation]);
      }
    );
  };

  const stopTracking = async () => {
    console.log('Stop Tracking button pressed in RouteNurture');
    if (watchId.current) {
      watchId.current.remove();
      watchId.current = null;
    }
    setIsTracking(false);
  };

  const markHouse = async () => {
    console.log('Mark House button pressed in RouteNurture');
    if (currentRoute.length === 0) return;
    
    const lastLocation = currentRoute[currentRoute.length - 1];
    // Here you would typically save the house location to your database
    console.log('House marked at:', {
      latitude: lastLocation.coords.latitude,
      longitude: lastLocation.coords.longitude,
    });
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        followsUserLocation
        initialRegion={DEFAULT_REGION}
      >
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={colors.primary}
            strokeWidth={3}
          />
        )}
        {currentRoute.length > 0 && (
          <Polyline
            coordinates={currentRoute.map(loc => ({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            }))}
            strokeColor={colors.error}
            strokeWidth={3}
          />
        )}
      </MapView>

      <MapOverlay
        isTracking={isTracking}
        onStartTracking={startTracking}
        onStopTracking={stopTracking}
        onMarkHouse={markHouse}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

export default RouteNurtureScreen; 