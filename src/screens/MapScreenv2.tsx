import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert, ActivityIndicator, Modal } from 'react-native';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import MapboxGL from '@rnmapbox/maps';
import locationService from '../services/locationService';
import { useUser } from '../contexts/UserContext';
import { useSettings } from '../contexts/SettingsContext';
import { zohoService } from '../services/zohoService';
import DealMarker from '../components/DealMarker';
import AdvancedRoutingModal from '../components/AdvancedRoutingModal';
import { mapboxService } from '../services/mapboxService';

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

interface Deal {
  id: string;
  Deal_Name: string;
  Stage: string;
  Property_Address: string;
  Property_City: string;
  Property_Zip: string;
  US_State: string;
  Owner?: { id: string; name: string };
  Secondary_Acquisition?: string;
  Created_Time: string;
  coordinates?: { lat: number; lng: number };
}

const MapScreenv2: React.FC = () => {
  const { selectedUser } = useUser();
  const { settings } = useSettings();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showDealPopup, setShowDealPopup] = useState(false);
  const [showAdvancedRouting, setShowAdvancedRouting] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<any>(null);
  const [routeInfo, setRouteInfo] = useState<any>(null);

  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Clear deals when selected user changes (no longer auto-load)
  useEffect(() => {
    if (!selectedUser) {
      setDeals([]);
      setFilteredDeals([]);
    }
  }, [selectedUser]);

  // Filter deals when settings change
  useEffect(() => {
    filterDeals();
  }, [deals, settings.visibleDealStages]);

  const filterDeals = () => {
    const filtered = deals.filter(deal => 
      settings.visibleDealStages.includes(deal.Stage)
    );
    setFilteredDeals(filtered);
    console.log(`Filtered ${filtered.length} deals from ${deals.length} total deals based on settings`);
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
        console.log('Location permission granted and location obtained');
      } else {
        console.log('Location permission denied');
        Alert.alert('Location Permission', 'Location permission is required for this app to function properly.');
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const onMapReady = () => {
    console.log('Map is ready');
    setIsMapReady(true);
  };

  const loadUserDeals = async () => {
    if (!selectedUser) return;

    setIsLoadingDeals(true);
    try {
      console.log('Loading deals for user:', selectedUser.name);
      
      // Fetch all deals from Zoho
      const allDeals = await zohoService.getAllDeals(
        'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_Zip,US_State',
        'Created_Time',
        'desc'
      );
      
      // Filter deals for selected user
      const userDeals = allDeals.filter(deal => 
        deal.Owner?.name === selectedUser.name || 
        deal.Secondary_Acquisition === selectedUser.name
      );
      
      // Get coordinates for each deal
      const dealsWithCoords = await Promise.all(
        userDeals.map(async (deal) => {
          if (deal.Property_Address) {
            try {
              const address = `${deal.Property_Address}, ${deal.Property_City}, ${deal.US_State} ${deal.Property_Zip}`;
              const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_ACCESS_TOKEN}`
              );
              const data = await response.json();
              if (data.features && data.features.length > 0) {
                const [longitude, latitude] = data.features[0].center;
                return {
                  ...deal,
                  coordinates: { lat: latitude, lng: longitude }
                };
              }
            } catch (error) {
              console.error('Error geocoding address:', error);
            }
          }
          return deal;
        })
      );
      
      // Only include deals with valid coordinates
      const validDeals = dealsWithCoords.filter(deal => deal.coordinates);
      setDeals(validDeals);
      
      // Debug: Log unique stage values
      const uniqueStages = [...new Set(validDeals.map(deal => deal.Stage))];
      console.log('Unique deal stages from Zoho:', uniqueStages);
      console.log('Sample deal stages:', validDeals.slice(0, 3).map(deal => ({ name: deal.Deal_Name, stage: deal.Stage })));
      
      console.log(`Loaded ${validDeals.length} deals with coordinates for ${selectedUser.name}`);
    } catch (error) {
      console.error('Error loading user deals:', error);
      Alert.alert('Error', 'Failed to load deals');
    } finally {
      setIsLoadingDeals(false);
    }
  };

  const handleDealPress = (deal: Deal) => {
    setSelectedDeal(deal);
    setShowDealPopup(true);
  };

  const handleDirectRoute = async (deal: Deal) => {
    if (!deal.coordinates) {
      Alert.alert('Error', 'No coordinates available for this deal');
      return;
    }

    try {
      const address = `${deal.Property_Address}, ${deal.Property_City}, ${deal.US_State} ${deal.Property_Zip}`;
      const mapboxUrl = mapboxService.openMapboxNavigation(address);
      
      // Try to open in Mapbox app, fallback to browser
      Alert.alert(
        'Direct Route',
        `Navigate to ${deal.Deal_Name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Navigate', onPress: () => {
            console.log('Opening direct route to:', address);
            // In a real app, you would use Linking.openURL(mapboxUrl)
          }}
        ]
      );
    } catch (error) {
      console.error('Error opening direct route:', error);
      Alert.alert('Error', 'Failed to open route');
    }
    
    setShowDealPopup(false);
  };

  const handleAdvancedRouting = () => {
    setShowDealPopup(false);
    setShowAdvancedRouting(true);
  };

  const handleCloseAdvancedRouting = () => {
    setShowAdvancedRouting(false);
    setSelectedDeal(null);
  };

  const handleRouteOptimized = (routeData: {
    coordinates: Array<[number, number]>;
    totalDistance: string;
    totalDuration: string;
    waypointOrder: number[];
    deals: Deal[];
  }) => {
    setOptimizedRoute(routeData);
    setRouteInfo({
      totalDistance: routeData.totalDistance,
      totalDuration: routeData.totalDuration,
      dealsCount: routeData.deals.length
    });
    setShowAdvancedRouting(false);
    
    // Auto-fit camera to show the entire route
    if (routeData && routeData.coordinates && routeData.coordinates.length > 0) {
      const bounds = routeData.coordinates.reduce(
        (acc: any, coord: [number, number]) => {
          if (!acc.minLng || coord[0] < acc.minLng) acc.minLng = coord[0];
          if (!acc.maxLng || coord[0] > acc.maxLng) acc.maxLng = coord[0];
          if (!acc.minLat || coord[1] < acc.minLat) acc.minLat = coord[1];
          if (!acc.maxLat || coord[1] > acc.maxLat) acc.maxLat = coord[1];
          return acc;
        },
        {}
      );
      
      if (cameraRef.current && bounds.minLng && bounds.maxLng && bounds.minLat && bounds.maxLat) {
        const padding = 0.1; // 10% padding
        const latDelta = (bounds.maxLat - bounds.minLat) * (1 + padding);
        const lngDelta = (bounds.maxLng - bounds.minLng) * (1 + padding);
        
        cameraRef.current.setCamera({
          centerCoordinate: [
            (bounds.minLng + bounds.maxLng) / 2,
            (bounds.minLat + bounds.maxLat) / 2
          ],
          zoomLevel: Math.min(15, Math.max(10, 15 - Math.log2(Math.max(latDelta, lngDelta)))),
          animationDuration: 2000,
        });
      }
    }
  };

  const markVacantHouse = () => {
    Alert.alert(
      'Mark Vacant House',
      'This feature will allow you to mark a house as vacant. Would you like to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark Vacant', onPress: () => {
          console.log('Marking house as vacant');
          // Implementation for marking vacant house
        }}
      ]
    );
  };

  const clearRoute = () => {
    setOptimizedRoute(null);
    setRouteInfo(null);
  };

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
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
        {isMapReady && location && (
          <>
            <MapboxGL.Camera
              ref={cameraRef}
              zoomLevel={15}
              centerCoordinate={[location.coords.longitude, location.coords.latitude]}
              animationMode="flyTo"
              animationDuration={2000}
            />
            
            <MapboxGL.UserLocation
              visible={true}
              animated={true}
            />

            {/* Deal markers - only show filtered deals */}
            {filteredDeals.map((deal) => (
              <MapboxGL.PointAnnotation
                key={`deal-${deal.id}`}
                id={`deal-${deal.id}`}
                coordinate={[deal.coordinates!.lng, deal.coordinates!.lat]}
                title={deal.Deal_Name}
                onSelected={() => handleDealPress(deal)}
              >
                <DealMarker stage={deal.Stage} size={35} />
              </MapboxGL.PointAnnotation>
            ))}

            {/* Vacant house markers */}
            {/* Add vacant house markers here when implemented */}

            {/* Optimized route overlay */}
            {optimizedRoute && (
              <>
                <MapboxGL.ShapeSource
                  id="routeSource"
                  shape={{
                    type: 'Feature',
                    properties: {},
                    geometry: {
                      type: 'LineString',
                      coordinates: optimizedRoute.coordinates
                    }
                  }}
                >
                  <MapboxGL.LineLayer
                    id="routeLayer"
                    style={{
                      lineColor: '#007AFF',
                      lineWidth: 4,
                      lineOpacity: 0.8
                    }}
                  />
                </MapboxGL.ShapeSource>

                {/* Waypoint markers */}
                {optimizedRoute.waypoints && optimizedRoute.waypoints.map((waypoint: any, index: number) => (
                  <MapboxGL.PointAnnotation
                    key={`waypoint-${index}`}
                    id={`waypoint-${index}`}
                    coordinate={waypoint.coordinates}
                    title={`Waypoint ${index + 1}`}
                  >
                    <View style={styles.waypointMarker}>
                      <Text style={styles.waypointText}>{index + 1}</Text>
                    </View>
                  </MapboxGL.PointAnnotation>
                ))}
              </>
            )}
          </>
        )}
      </MapboxGL.MapView>

      {/* Route Info Panel */}
      {routeInfo && (
        <View style={styles.routeInfoPanel}>
          <View style={styles.routeInfoHeader}>
            <Text style={styles.routeInfoTitle}>Optimized Route</Text>
            <TouchableOpacity onPress={clearRoute} style={styles.clearRouteButton}>
              <Text style={styles.clearRouteText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.routeInfoText}>
            Total Distance: {routeInfo.totalDistance}
          </Text>
          <Text style={styles.routeInfoText}>
            Total Duration: {routeInfo.totalDuration}
          </Text>
          <Text style={styles.routeInfoText}>
            Deals in Route: {routeInfo.dealsCount}
          </Text>
        </View>
      )}

      {/* Loading overlay */}
      {isLoadingDeals && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading deals...</Text>
        </View>
      )}

      {/* Action Buttons - positioned to avoid bottom navigation */}
      <View style={styles.buttonContainer}>
        {selectedUser && (
          <TouchableOpacity
            style={[styles.markButton, styles.loadButton]}
            onPress={loadUserDeals}
            disabled={isLoadingDeals}
          >
            <Text style={styles.buttonText}>
              {isLoadingDeals ? 'Loading Deals...' : 'Load User Deals'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.markButton}
          onPress={markVacantHouse}
        >
          <Text style={styles.buttonText}>Mark Vacant House</Text>
        </TouchableOpacity>
      </View>

      {/* Deal Popup Modal */}
      <Modal
        visible={showDealPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDealPopup(false)}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupContainer}>
            {selectedDeal && (
              <>
                <View style={styles.popupHeader}>
                  <Text style={styles.popupTitle}>{selectedDeal.Deal_Name}</Text>
                  <TouchableOpacity 
                    onPress={() => setShowDealPopup(false)}
                    style={styles.popupCloseButton}
                  >
                    <Text style={styles.popupCloseText}>×</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.popupContent}>
                  <Text style={styles.popupText}>
                    Stage: {selectedDeal.Stage}
                  </Text>
                  <Text style={styles.popupText}>
                    Address: {selectedDeal.Property_Address}, {selectedDeal.Property_City}, {selectedDeal.US_State} {selectedDeal.Property_Zip}
                  </Text>
                  <Text style={styles.popupText}>
                    Role: {selectedDeal.Owner?.name === selectedUser?.name ? 'Primary Owner' : 'Secondary Acquisition'}
                  </Text>
                  <Text style={styles.popupText}>
                    Created: {new Date(selectedDeal.Created_Time).toLocaleDateString()}
                  </Text>
                </View>
                
                <View style={styles.popupButtons}>
                  <TouchableOpacity
                    style={styles.popupButton}
                    onPress={() => handleDirectRoute(selectedDeal)}
                  >
                    <Text style={styles.popupButtonText}>Direct Route</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.popupButton}
                    onPress={handleAdvancedRouting}
                  >
                    <Text style={styles.popupButtonText}>Advanced Routing</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Advanced Routing Modal */}
      <AdvancedRoutingModal
        visible={showAdvancedRouting}
        onClose={handleCloseAdvancedRouting}
        selectedDeal={selectedDeal}
        allDeals={deals}
        userLocation={location ? { 
          latitude: location.coords.latitude, 
          longitude: location.coords.longitude 
        } : null}
        onRouteOptimized={handleRouteOptimized}
      />
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
  buttonContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
  },
  markButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.75)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 10,
  },
  loadButton: {
    backgroundColor: 'rgba(34, 139, 34, 0.75)',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
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
    color: colors.textSecondary,
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupContainer: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 20,
    margin: 20,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  popupCloseButton: {
    padding: 5,
  },
  popupCloseText: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  popupContent: {
    marginBottom: 20,
  },
  popupText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  popupButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  popupButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  popupButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  routeInfoPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  routeInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  routeInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  clearRouteButton: {
    padding: 5,
  },
  clearRouteText: {
    color: colors.primary,
    fontSize: 14,
  },
  routeInfoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  waypointMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  waypointText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
});

export default MapScreenv2; 