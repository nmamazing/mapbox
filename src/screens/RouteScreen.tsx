import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from 'react-native-maps';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { decode } from '@mapbox/polyline';

interface RouteScreenProps {
  route: {
    params: {
      routeLegs: Array<{
        start: {
          location: {
            latitude: number;
            longitude: number;
          };
          name: string;
          address: string;
        };
        end: {
          location: {
            latitude: number;
            longitude: number;
          };
          name: string;
          address: string;
        };
        distance: number;
        duration: number;
        polyline: string;
      }>;
      mainDeal: any;
      selectedDeals: any[];
    };
  };
}

const RouteScreen: React.FC<RouteScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const { routeLegs, mainDeal, selectedDeals } = route.params;
  const [region, setRegion] = useState({
    latitude: routeLegs[0].start.location.latitude,
    longitude: routeLegs[0].start.location.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Decode polylines for each leg
  const decodedPolylines = routeLegs.map(leg => {
    try {
      return decode(leg.polyline).map(([lat, lng]: [number, number]) => ({
        latitude: lat,
        longitude: lng,
      }));
    } catch (error) {
      console.error('Error decoding polyline:', error);
      return [];
    }
  });

  // Calculate total distance and duration
  const totalDistance = routeLegs.reduce((sum, leg) => sum + leg.distance, 0);
  const totalDuration = routeLegs.reduce((sum, leg) => sum + leg.duration, 0);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>{'< Back'}</Text>
      </TouchableOpacity>

      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        onRegionChangeComplete={setRegion}
      >
        {/* Markers for all stops */}
        {routeLegs.map((leg, index) => (
          <React.Fragment key={index}>
            <Marker
              coordinate={leg.start.location}
              title={leg.start.name}
              description={leg.start.address}
              pinColor={index === 0 ? colors.primary : colors.secondary}
            />
            {index === routeLegs.length - 1 && (
              <Marker
                coordinate={leg.end.location}
                title={leg.end.name}
                description={leg.end.address}
                pinColor={colors.primary}
              />
            )}
          </React.Fragment>
        ))}

        {/* Polylines for each leg */}
        {decodedPolylines.map((points, index) => (
          <Polyline
            key={index}
            coordinates={points}
            strokeColor={colors.primary}
            strokeWidth={3}
          />
        ))}
      </MapView>

      <ScrollView style={styles.detailsContainer}>
        <Text style={styles.title}>Route Details</Text>
        <Text style={styles.detail}>Total Distance: {(totalDistance / 1000).toFixed(1)} km</Text>
        <Text style={styles.detail}>Estimated Time: {Math.round(totalDuration / 60)} minutes</Text>
        
        <Text style={styles.subtitle}>Stops:</Text>
        {routeLegs.map((leg, index) => (
          <View key={index} style={styles.stopContainer}>
            <Text style={styles.stopNumber}>{index + 1}.</Text>
            <View style={styles.stopDetails}>
              <Text style={styles.stopName}>{leg.start.name}</Text>
              <Text style={styles.stopDistance}>
                {index < routeLegs.length - 1 ? 
                  `→ ${(leg.distance / 1000).toFixed(1)} km (${Math.round(leg.duration / 60)} min)` : 
                  'Final Stop'}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '50%',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 16,
  },
  detail: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  stopContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stopNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginRight: 12,
  },
  stopDetails: {
    flex: 1,
  },
  stopName: {
    fontSize: 16,
    color: colors.text,
  },
  stopDistance: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default RouteScreen; 