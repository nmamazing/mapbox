import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert, Image as RNImage, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { colors } from '../theme/colors';

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY;

const HouseHuntingScreen = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [route, setRoute] = useState<{ latitude: number; longitude: number }[]>([]);
  const [markers, setMarkers] = useState<{ latitude: number; longitude: number }[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [staticMapUrl, setStaticMapUrl] = useState<string | null>(null);
  const watchId = useRef<Location.LocationSubscription | null>(null);

  // Helper to encode polyline for Google Static Maps
  const encodePolyline = (points: { latitude: number; longitude: number }[]) => {
    // Simple polyline encoding for small routes (for demo)
    // For production, use a polyline encoding library
    return points.map(p => `${p.latitude},${p.longitude}`).join("|");
  };

  // Generate the static map URL
  const updateStaticMap = (loc = location, routePoints = route, markerPoints = markers) => {
    if (!loc) return;
    const center = `${loc.coords.latitude},${loc.coords.longitude}`;
    let url = `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=15&size=400x300&style=feature:poi|visibility:off&key=${GOOGLE_MAPS_API_KEY}`;
    // Add route polyline
    if (routePoints.length > 1) {
      url += `&path=color:0xff0000ff|weight:4|${encodePolyline(routePoints)}`;
    }
    // Add house markers
    markerPoints.forEach(m => {
      url += `&markers=color:blue|label:H|${m.latitude},${m.longitude}`;
    });
    // Add current location marker
    url += `&markers=color:red|label:U|${loc.coords.latitude},${loc.coords.longitude}`;
    setStaticMapUrl(url);
  };

  // Get current location on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      setRoute([{ latitude: loc.coords.latitude, longitude: loc.coords.longitude }]);
      updateStaticMap(loc, [{ latitude: loc.coords.latitude, longitude: loc.coords.longitude }], []);
    })();
    return () => {
      if (watchId.current) {
        watchId.current.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update static map when route or markers change
  useEffect(() => {
    if (location) updateStaticMap(location, route, markers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, markers]);

  const startTracking = async () => {
    setIsTracking(true);
    setRoute([]);
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
        setLocation(newLocation);
        setRoute(prev => [...prev, { latitude: newLocation.coords.latitude, longitude: newLocation.coords.longitude }]);
      }
    );
  };

  const stopTracking = async () => {
    if (watchId.current) {
      watchId.current.remove();
      watchId.current = null;
    }
    setIsTracking(false);
  };

  const markHouse = () => {
    if (!location) return;
    setMarkers(prev => [...prev, { latitude: location.coords.latitude, longitude: location.coords.longitude }]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>House Hunting (Static Map)</Text>
      {staticMapUrl && (
        <RNImage
          source={{ uri: staticMapUrl }}
          style={styles.map}
          resizeMode="cover"
        />
      )}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, isTracking ? styles.stopButton : styles.startButton]}
          onPress={isTracking ? stopTracking : startTracking}
        >
          <Text style={styles.buttonText}>
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.markButton]}
          onPress={markHouse}
        >
          <Text style={styles.buttonText}>Mark House</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.refreshButton]}
          onPress={() => updateStaticMap()}
        >
          <Text style={styles.buttonText}>Refresh Map</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.primary,
  },
  map: {
    width: 400,
    height: 300,
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: '#eee',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    width: '100%',
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
    marginHorizontal: 4,
  },
  startButton: {
    backgroundColor: colors.primary,
  },
  stopButton: {
    backgroundColor: colors.error,
  },
  markButton: {
    backgroundColor: colors.accent,
  },
  refreshButton: {
    backgroundColor: colors.secondary,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HouseHuntingScreen; 