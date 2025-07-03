import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, Text, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Lead, Location as LocationType } from '../types';
import { zohoService } from '../services/zohoService';
import { mapsService } from '../services/mapsService';

type MapScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Map'>;
  route: RouteProp<RootStackParamList, 'Map'>;
};

const MapScreen: React.FC<MapScreenProps> = ({ navigation, route }) => {
  const { leadId } = route.params;
  const [lead, setLead] = useState<Lead | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationType | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<LocationType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setupLocation();
    fetchLeadDetails();
  }, []);

  const setupLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for navigation');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const currentLoc: LocationType = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: 'Current Location'
      };
      setCurrentLocation(currentLoc);
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  const fetchLeadDetails = async () => {
    try {
      const leads = await zohoService.getLeads();
      const foundLead = leads.find(l => l.id === leadId);
      if (foundLead) {
        setLead(foundLead);
        const location = await mapsService.geocodeAddress(foundLead.address);
        setDestinationLocation(location);
      } else {
        Alert.alert('Error', 'Lead not found');
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch lead details');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !currentLocation || !destinationLocation) {
    return (
      <View style={styles.centered}>
        <Text>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>{'< Back'}</Text>
      </TouchableOpacity>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        <Marker
          coordinate={{
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          }}
          title="Your Location"
          pinColor="blue"
        />
        <Marker
          coordinate={{
            latitude: destinationLocation.latitude,
            longitude: destinationLocation.longitude,
          }}
          title={lead?.name}
          description={lead?.address}
          pinColor="red"
        />
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default MapScreen; 