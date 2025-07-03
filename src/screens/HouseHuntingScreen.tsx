import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import MapboxGL from '@rnmapbox/maps';
import locationService from '../services/locationService';
import DealSearchBox from '../components/DealSearchBox';
import DealMarker from '../components/DealMarker';
import { Lead } from '../types';
import { zohoService } from '../services/zohoService';
import { useAuth } from '../contexts/AuthContext';

// Mapbox configuration
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1Ijoibmlrb2F6IiwiYSI6ImNtYmgzbzIyNjA1ajkya29ua3pyMDlha3AifQ.1Ws2P9AaCDnp-sLI6PjX_w';

try {
  console.log('Setting Mapbox access token...');
  MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);
  console.log('Mapbox access token set successfully');
  
  // Disable telemetry for development
  MapboxGL.setTelemetryEnabled(false);
} catch (error) {
  console.error('Error setting Mapbox access token:', error);
}

// Stage color mapping
const STAGE_COLORS: { [key: string]: string } = {
  'Initial Contact': '#FFD700', // Gold
  'New Lead': '#FFD700',
  'In Progress': '#4CAF50', // Green
  'Nurturing': '#4CAF50',
  'Under Contract': '#2196F3', // Blue
  'Closed': '#9C27B0', // Purple
  'Won': '#9C27B0',
  'Lost': '#F44336', // Red
  'Cancelled': '#F44336',
  'On Hold': '#FF9800', // Orange
  'Follow Up': '#00BCD4', // Cyan
  'default': colors.primary // Default color if stage not found
};

const HouseHuntingScreen = () => {
  const { user } = useAuth();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [route, setRoute] = useState<{ latitude: number; longitude: number }[]>([]);
  const [markers, setMarkers] = useState<{ latitude: number; longitude: number }[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [deals, setDeals] = useState<Lead[]>([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(false);
  const watchId = useRef<Location.LocationSubscription | null>(null);
  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const [streetSegments, setStreetSegments] = useState<{
    coordinates: [number, number][];
    streetName?: string;
    timestamp: number;
  }[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Lead | null>(null);

  // Fetch deals for the current user
  const fetchUserDeals = async () => {
    if (!user) return;
    
    setIsLoadingDeals(true);
    try {
      const response = await zohoService.getDeals(
        'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_Zip,US_State',
        'Created_Time',
        'desc',
        `(Owner:equals:${user.name}) OR (Secondary_Acquisition:equals:${user.name})`
      );

      if (response?.data) {
        // Process deals to add coordinates
        const processedDeals = await Promise.all(
          response.data.map(async (deal: Lead) => {
            if (deal.address) {
              try {
                const response = await fetch(
                  `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(deal.address)}.json?access_token=${MAPBOX_ACCESS_TOKEN}`
                );
                const data = await response.json();
                if (data.features && data.features.length > 0) {
                  const [longitude, latitude] = data.features[0].center;
                  return {
                    ...deal,
                    coordinates: [longitude, latitude]
                  };
                }
              } catch (error) {
                console.error('Error geocoding address:', error);
              }
            }
            return deal;
          })
        );

        setDeals(processedDeals.filter(deal => deal.coordinates));
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
      Alert.alert('Error', 'Failed to load deals');
    } finally {
      setIsLoadingDeals(false);
    }
  };

  // Load deals when user is available
  useEffect(() => {
    if (user) {
      fetchUserDeals();
    }
  }, [user]);

  // Initialize Mapbox
  useEffect(() => {
    const initializeMapbox = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required.');
          return;
        }
        
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
        setRoute([{ latitude: loc.coords.latitude, longitude: loc.coords.longitude }]);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing map:', error);
        Alert.alert('Error', 'Failed to initialize map');
      }
    };

    initializeMapbox();
    return () => {
      if (watchId.current) {
        watchId.current.remove();
      }
    };
  }, []);

  // Function to calculate opacity based on timestamp
  const calculateOpacity = (timestamp: number) => {
    const now = Date.now();
    const ageInDays = (now - timestamp) / (1000 * 60 * 60 * 24); // Convert to days
    const maxAge = 90; // 90 days
    return Math.max(0, 1 - (ageInDays / maxAge));
  };

  // Function to get street name from coordinates using Mapbox's geocoding
  const getStreetName = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?types=address&access_token=${MAPBOX_ACCESS_TOKEN}`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        return data.features[0].text;
      }
      return null;
    } catch (error) {
      console.error('Error getting street name:', error);
      return null;
    }
  };

  // Function to process route points into street segments
  const processRoutePoints = async (points: { latitude: number; longitude: number }[]) => {
    if (points.length < 2) return;

    const segments: {
      coordinates: [number, number][];
      streetName?: string;
      timestamp: number;
    }[] = [];
    
    const currentTime = Date.now();
    
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      
      // Get street name for the start point
      const streetName = await getStreetName(start.latitude, start.longitude);
      
      segments.push({
        coordinates: [
          [start.longitude, start.latitude],
          [end.longitude, end.latitude]
        ],
        streetName,
        timestamp: currentTime
      });
    }
    
    setStreetSegments(prev => [...prev, ...segments]);
  };

  // Update the startTracking function to process route points
  const startTracking = async () => {
    setIsTracking(true);
    setRoute([]);
    setStreetSegments([]);
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
      async (newLocation) => {
        setLocation(newLocation);
        const newPoint = { 
          latitude: newLocation.coords.latitude, 
          longitude: newLocation.coords.longitude 
        };
        const newRoute = [...route, newPoint];
        setRoute(newRoute);
        
        // Process route points to get street segments
        await processRoutePoints(newRoute);
        
        // Save location to backend
        try {
          await locationService.addLocation({
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            accuracy: newLocation.coords.accuracy || 0,
            message: 'Route tracking point'
          });
        } catch (error) {
          console.error('Failed to save location:', error);
        }
      }
    );
  };

  // Load historical street segments
  useEffect(() => {
    const loadHistoricalSegments = async () => {
      try {
        const response = await locationService.getRecentLocations();
        if (response.locations && response.locations.length > 1) {
          const points = response.locations.map(loc => ({
            latitude: loc.latitude,
            longitude: loc.longitude
          }));
          await processRoutePoints(points);
        }
      } catch (error) {
        console.error('Error loading historical segments:', error);
      }
    };

    loadHistoricalSegments();
  }, []);

  const stopTracking = async () => {
    if (watchId.current) {
      watchId.current.remove();
      watchId.current = null;
    }
    setIsTracking(false);
  };

  const markHouse = async () => {
    if (!location) return;
    const newMarker = { 
      latitude: location.coords.latitude, 
      longitude: location.coords.longitude 
    };
    setMarkers(prev => [...prev, newMarker]);
    
    // Save house location to backend
    try {
      await locationService.addLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        message: 'House marked'
      });
    } catch (error) {
      console.error('Failed to save house location:', error);
    }
  };

  const onMapReady = () => {
    console.log('Map is ready');
    setIsMapReady(true);
  };

  const handleDealSelect = (deal: Lead) => {
    setSelectedDeal(deal);
    if (deal.address) {
      // Geocode the address to get coordinates
      fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(deal.address)}.json?access_token=${MAPBOX_ACCESS_TOKEN}`
      )
        .then(response => response.json())
        .then(data => {
          if (data.features && data.features.length > 0) {
            const [longitude, latitude] = data.features[0].center;
            if (cameraRef.current) {
              cameraRef.current.setCamera({
                centerCoordinate: [longitude, latitude],
                zoomLevel: 16,
                animationDuration: 1000
              });
            }
          }
        })
        .catch(error => {
          console.error('Error geocoding address:', error);
          Alert.alert('Error', 'Could not find the location of this deal');
        });
    }
  };

  // Function to get color based on stage
  const getStageColor = (stage?: string) => {
    if (!stage) return STAGE_COLORS.default;
    return STAGE_COLORS[stage] || STAGE_COLORS.default;
  };

  if (!isInitialized) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DealSearchBox onDealSelect={handleDealSelect} />
      
      <MapboxGL.MapView 
        ref={mapRef}
        style={[styles.map, { marginTop: 60 }]}
        styleURL={MapboxGL.StyleURL.Light}
        onDidFailLoadingMap={() => {
          console.error('Mapbox failed to load map');
          Alert.alert('Error', 'Failed to load map');
        }}
        onDidFinishLoadingMap={onMapReady}
        logoEnabled={false}
        attributionEnabled={true}
        compassEnabled={true}
        scaleBarEnabled={true}
      >
        {isMapReady && (
          <>
            {location && (
              <MapboxGL.Camera
                ref={cameraRef}
                zoomLevel={14}
                centerCoordinate={[location.coords.longitude, location.coords.latitude]}
                animationMode="flyTo"
                animationDuration={2000}
              />
            )}
            
            {location && (
              <MapboxGL.UserLocation
                visible={true}
                animated={true}
              />
            )}

            {/* Street segments layer */}
            {streetSegments.map((segment, index) => {
              const opacity = calculateOpacity(segment.timestamp);
              if (opacity <= 0) return null;

              return (
                <MapboxGL.ShapeSource
                  key={`street-${index}`}
                  id={`street-${index}`}
                  shape={{
                    type: 'Feature',
                    properties: {
                      streetName: segment.streetName || 'Unknown Street',
                      timestamp: segment.timestamp
                    },
                    geometry: {
                      type: 'LineString',
                      coordinates: segment.coordinates
                    }
                  }}
                >
                  <MapboxGL.LineLayer
                    id={`streetLine-${index}`}
                    style={{
                      lineColor: colors.error,
                      lineWidth: 6,
                      lineOpacity: opacity,
                      lineCap: 'round',
                      lineJoin: 'round'
                    }}
                  />
                </MapboxGL.ShapeSource>
              );
            })}

            {/* Route line */}
            {route.length > 1 && (
              <MapboxGL.ShapeSource
                id="route"
                shape={{
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: route.map(point => [point.longitude, point.latitude])
                  }
                }}
              >
                <MapboxGL.LineLayer
                  id="routeLine"
                  style={{
                    lineColor: colors.primary,
                    lineWidth: 4,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                />
              </MapboxGL.ShapeSource>
            )}

            {/* House markers */}
            {isMapReady && markers.map((marker, index) => (
              <MapboxGL.PointAnnotation
                key={`house-${index}`}
                id={`house-${index}`}
                coordinate={[marker.longitude, marker.latitude]}
                title="House"
              >
                <View style={styles.markerContainer}>
                  <View style={styles.marker} />
                </View>
              </MapboxGL.PointAnnotation>
            ))}

            {/* Selected deal marker */}
            {isMapReady && selectedDeal && selectedDeal.address && (
              <MapboxGL.PointAnnotation
                id="selected-deal"
                coordinate={[0, 0]}
                title={selectedDeal.name}
              >
                <View style={styles.selectedMarkerContainer}>
                  <View style={styles.selectedMarker} />
                </View>
              </MapboxGL.PointAnnotation>
            )}

            {/* Properties Layer */}
            {deals.map((deal, index) => (
              <MapboxGL.PointAnnotation
                key={`deal-${index}`}
                id={`deal-${index}`}
                coordinate={deal.coordinates || [0, 0]}
                title={deal.name}
                snippet={`${deal.stage} • ${deal.address}`}
              >
                <DealMarker stage={deal.stage} size={40} />
              </MapboxGL.PointAnnotation>
            ))}
          </>
        )}
      </MapboxGL.MapView>

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
      </View>

      {isLoadingDeals && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Properties...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  markerContainer: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.white,
  },
  selectedMarkerContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.white,
  },
  dealMarkerContainer: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.white,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text,
  },
});

export default HouseHuntingScreen; 