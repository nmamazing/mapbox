import React, { useState, useRef } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, Alert } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline, Region } from 'react-native-maps';
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

const RouteToAddressScreen = () => {
  const [address, setAddress] = useState('');
  const [destination, setDestination] = useState<Coordinate | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<Location.LocationObject[]>([]);
  const mapRef = useRef<MapView>(null);
  const watchId = useRef<Location.LocationSubscription | null>(null);

  const startTracking = async () => {
    console.log('Start Tracking button pressed in RouteToAddress');
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
    console.log('Stop Tracking button pressed in RouteToAddress');
    if (watchId.current) {
      watchId.current.remove();
      watchId.current = null;
    }
    setIsTracking(false);
  };

  const markHouse = async () => {
    console.log('Mark House button pressed in RouteToAddress');
    if (currentRoute.length === 0) return;
    
    const lastLocation = currentRoute[currentRoute.length - 1];
    setDestination({
      latitude: lastLocation.coords.latitude,
      longitude: lastLocation.coords.longitude,
    });
  };

  const handleGetDirections = () => {
    // Implement the logic to get directions based on the address
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
        {destination && (
          <Marker
            coordinate={destination}
            title="Destination"
            pinColor={colors.primary}
          />
        )}
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

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter address"
          value={address}
          onChangeText={setAddress}
        />
        <TouchableOpacity
          style={styles.button}
          onPress={handleGetDirections}
        >
          <Text style={styles.buttonText}>Get Directions</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  input: {
    flex: 1,
    padding: 10,
  },
  button: {
    padding: 10,
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RouteToAddressScreen; 