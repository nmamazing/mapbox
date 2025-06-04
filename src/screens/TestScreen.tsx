import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Button,
  Alert,
  TouchableOpacity,
  Image,
} from "react-native";
import { zohoService } from "../services/zohoService";
import { mapsService } from "../services/mapsService";
import * as ExpoLocation from "expo-location";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme/colors";
import {
  getDealCoordinates,
  updateDealCoordinates,
} from "../services/zohoService";
import Constants from "expo-constants";
import MapView, { Marker } from "react-native-maps";
import { API_ENDPOINTS } from "../config/api";
import CollapsibleSection from "../components/CollapsibleSection";
import { Image as RNImage } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { locationService } from '../services/locationService';
import { startBackgroundLocationUpdates, stopBackgroundLocationUpdates } from '../utils/bgLocation';

// Set your Mapbox access token
MapboxGL.setAccessToken('pk.eyJ1Ijoibmlrb2F6IiwiYSI6ImNtYmgzbzIyNjA1ajkya29ua3pyMDlha3AifQ.1Ws2P9AaCDnp-sLI6PjX_w');

const TestScreen: React.FC = () => {
  const [zohoStatus, setZohoStatus] = useState<string>("Testing...");
  const [mapsStatus, setMapsStatus] = useState<string>("Testing...");
  const [error, setError] = useState<string | null>(null);
  const [searchedDealStatus, setSearchedDealStatus] = useState<string>("");
  const [ryansDealsStatus, setRyansDealsStatus] = useState<string>("");
  const [ryansDeals, setRyansDeals] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [deals, setDeals] = useState<any[]>([]);
  const [migrationStatus, setMigrationStatus] = useState<string>("");
  const navigation = useNavigation();
  const [location, setLocation] = useState<ExpoLocation.LocationObject | null>(null);
  const [staticMapUrl, setStaticMapUrl] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState(MapboxGL.StyleURL.Street);
  const [showGeoJSON, setShowGeoJSON] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('');
  const [dealsStatus, setDealsStatus] = useState<string>("");

  useEffect(() => {
    testConnections();
  }, []);

  const testConnections = async () => {
    try {
      // Test Google Maps connection using current location
      try {
        const { status } =
          await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setMapsStatus(
            "Google Maps Connection Failed: Location permission denied"
          );
          return;
        }
        const location = await ExpoLocation.getCurrentPositionAsync({});
        const lat = location.coords.latitude;
        const lng = location.coords.longitude;
        setMapsStatus("Google Maps Connection: Got current location!");
      } catch (mapsError: any) {
        setMapsStatus(
          `Google Maps Connection Failed: ${(mapsError as any)?.message || "Unknown error"}`
        );
      }
    } catch (error) {
      setMapsStatus(`Error: ${(error as any)?.message || "Unknown error"}`);
    }
  };

  // Migration handler
  const handleMigrateNurtureDeals = async () => {
    setMigrationStatus("Starting migration...");
    try {
      // Fetch all nurture deals with cursor-based pagination
      let allNurtureDeals: any[] = [];
      let pageToken: string | undefined = undefined;
      const perPage = 200;
      const GOOGLE_MAPS_API_KEY =
        Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY;
      const fields =
        "id,Deal_Name,Stage,Coordinates,Property_Address,Property_City,Property_Zip,US_State";
      const sortBy = "Created_Time";
      const sortOrder = "desc";
      const criteria = "Stage:equals:3. Nurture Stage";
      let page = 1;
      while (true) {
        setMigrationStatus(
          `Fetching page ${page}${pageToken ? " (cursor)" : ""}...`
        );
        const response = await zohoService.getDeals(
          fields,
          sortBy,
          sortOrder,
          criteria,
          page,
          perPage,
          pageToken
        );
        const deals = response.data || [];
        if (deals.length === 0) break;
        allNurtureDeals = allNurtureDeals.concat(deals);
        // Check for next_page_token
        const nextPageToken = response.info?.next_page_token;
        if (nextPageToken) {
          pageToken = nextPageToken;
          page++;
        } else {
          break;
        }
      }
      let updated = 0;
      for (let i = 0; i < allNurtureDeals.length; i++) {
        const deal = allNurtureDeals[i];
        setMigrationStatus(
          `Processing ${i + 1} of ${allNurtureDeals.length}: ${deal.Deal_Name}`
        );
        // If already has coordinates, skip
        if (deal.Coordinates && deal.Coordinates.includes(",")) continue;
        // Get coordinates using Geocoding API
        const address = `${deal.Property_Address}, ${deal.Property_City}, ${deal.US_State} ${deal.Property_Zip}`;
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            address
          )}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();
        if (data.status === "OK" && data.results && data.results.length > 0) {
          const { lat, lng } = data.results[0].geometry.location;
          const coordString = `${lat},${lng}`;
          await updateDealCoordinates(deal.id, coordString);
          updated++;
        }
      }
      setMigrationStatus(`Migration complete! Updated ${updated} deals.`);
    } catch (err: any) {
      setMigrationStatus(
        "Migration failed: " + ((err as any)?.message || "Unknown error")
      );
    }
  };

  // Handler for Complete Map
  const handleShowCompleteMap = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all deals with Coordinates
      const allDeals: any[] = [];
      let pageToken: string | undefined = undefined;
      const perPage = 200;
      const fields =
        "id,Deal_Name,Stage,Coordinates,Property_Address,Property_City,Property_Zip,US_State";
      const sortBy = "Created_Time";
      const sortOrder = "desc";
      let page = 1;
      while (true) {
        const response = await zohoService.getDeals(
          fields,
          sortBy,
          sortOrder,
          undefined,
          page,
          perPage,
          pageToken
        );
        const deals = response.data || [];
        if (deals.length === 0) break;
        allDeals.push(...deals.filter((d: any) => d.Coordinates));
        // Check for next_page_token
        const nextPageToken = response.info?.next_page_token;
        if (nextPageToken) {
          pageToken = nextPageToken;
          page++;
        } else {
          break;
        }
      }
      setLoading(false);
      // Cast navigation and zohoService.getDeals calls to any for testing
      // (navigation as any).navigate('CompleteMap', { deals: allDeals || [] });
      // const deals = await (zohoService.getDeals as any)({ per_page: 10, sort_by: 'Created_Time', sort_order: 'desc' });
      // (navigation as any).navigate('DealsList', { deals: deals || [] });
    } catch (err: any) {
      setError((err as any)?.message || "Error fetching deals");
      setLoading(false);
    }
  };

  const handleGetLocation = async () => {
    try {
      console.log("Requesting location permissions...");
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      console.log("Location permission status:", status);

      if (status !== "granted") {
        setError("Location permission denied");
        return;
      }

      console.log("Getting current position...");
      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });
      console.log("Location received:", location);

      setLocation(location);
    } catch (err: any) {
      console.error("Error getting location:", err);
      setError((err as any)?.message || "Error getting location");
    }
  };

  const handleStartWatching = async () => {
    try {
      console.log("Requesting background location permissions...");
      const { status } = await ExpoLocation.requestBackgroundPermissionsAsync();
      console.log("Background location permission status:", status);

      if (status !== "granted") {
        setError("Background location permission denied");
        return;
      }

      console.log("Starting location updates...");
      await ExpoLocation.startLocationUpdatesAsync("location-tracking", {
        accuracy: ExpoLocation.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
        foregroundService: {
          notificationTitle: "Location Tracking",
          notificationBody: "Tracking your location in the background",
        },
      });

      console.log("Getting last known position...");
      const location = await ExpoLocation.getLastKnownPositionAsync();
      console.log("Last known position:", location);

      setLocation(location);
    } catch (err: any) {
      console.error("Error starting location updates:", err);
      setError((err as any)?.message || "Error starting location updates");
    }
  };

  const handleStopWatching = async () => {
    try {
      await ExpoLocation.stopLocationUpdatesAsync("location-tracking");
      setLocation(null);
    } catch (err: any) {
      setError((err as any)?.message || "Error stopping location updates");
    }
  };

  // Fix the deals API response type
  interface DealsResponse {
    deals: Array<{
      id: string;
      title: string;
      description: string;
      created_at: string;
    }>;
  }

  const handleTestDealsAPI = async () => {
    try {
      setDealsStatus('Testing Deals API...');
      const queryParams = new URLSearchParams({
        per_page: '10',
        sort_by: 'created_at',
        sort_order: 'desc'
      });
      const response = await fetch(`${API_ENDPOINTS.DEALS}?${queryParams.toString()}`);
      const data = await response.json() as DealsResponse;
      setDealsStatus(`Deals API test successful! Found ${data.deals?.length || 0} deals`);
    } catch (error: any) {
      setDealsStatus(`Deals API test failed: ${(error as any)?.message || "Unknown error"}`);
    }
  };

  const handleImportStaticMap = async () => {
    console.log('Import Static Google Map button pressed');
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required.");
        return;
      }
      const location = await ExpoLocation.getCurrentPositionAsync({});
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=400x300&markers=color:red%7C${lat},${lng}&style=feature:poi|visibility:off&key=${GOOGLE_MAPS_API_KEY}`;
      setStaticMapUrl(url);
    } catch (err: any) {
      Alert.alert("Error", (err as any)?.message || "Failed to load static map");
    }
  };

  const mapStyles = [
    { label: 'Day (Light)', url: MapboxGL.StyleURL.Light },
    { label: 'Night (Dark)', url: MapboxGL.StyleURL.Dark },
    { label: 'Satellite', url: MapboxGL.StyleURL.Satellite },
    { label: 'Streets', url: MapboxGL.StyleURL.Street },
    { label: 'Outdoors', url: MapboxGL.StyleURL.Outdoors },
  ];

  const sampleGeoJSON = {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]
        }
      }
    ]
  };

  const handleTestLocation = async () => {
    try {
      setLocationStatus('Testing location API...');
      const response = await locationService.createLocation({
        user: 'testUser',
        latitude: location?.coords.latitude || 0,
        longitude: location?.coords.longitude || 0,
        accuracy: location?.coords.accuracy || 0,
        timestamp: new Date().toISOString(),
        message: 'Test location from mobile app'
      });
      setLocationStatus('Location API test successful!');
    } catch (error: any) {
      setLocationStatus(`Location API test failed: ${(error as any)?.message || "Unknown error"}`);
    }
  };

  const handleStartLocationTracking = async () => {
    try {
      setLocationStatus('Starting location tracking...');
      await startBackgroundLocationUpdates();
      setLocationStatus('Location tracking started successfully!');
    } catch (error: any) {
      setLocationStatus(`Failed to start location tracking: ${(error as any)?.message || "Unknown error"}`);
    }
  };

  const handleStopLocationTracking = async () => {
    try {
      setLocationStatus('Stopping location tracking...');
      await stopBackgroundLocationUpdates();
      setLocationStatus('Location tracking stopped successfully!');
    } catch (error: any) {
      setLocationStatus(`Failed to stop location tracking: ${(error as any)?.message || "Unknown error"}`);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <CollapsibleSection title="API Connection Tests">
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>{"< Back"}</Text>
        </TouchableOpacity>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: colors.primary }]}>
          API Connection Tests
        </Text>

        <View style={styles.statusContainer}>
          <Text style={styles.label}>Google Maps Status:</Text>
          <Text
            style={[
              styles.status,
              mapsStatus.includes("Failed") ? styles.error : styles.success,
            ]}
          >
            {mapsStatus}
          </Text>
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.label}>Google Maps API Key (process.env):</Text>
          <Text style={styles.status}>
            {process.env.GOOGLE_MAPS_API_KEY || "Not found"}
          </Text>
        </View>

        <View style={styles.statusContainer}>
          <Button
            title="Ryan's Deals"
            onPress={async () => {
              setLoading(true);
              setError(null);
              try {
                const deals = await zohoService.getDeals({
                  per_page: 10,
                  sort_by: "Created_Time",
                  sort_order: "desc",
                }) as any[];
                navigation.navigate('DealsList', { deals: deals || [] });
              } catch (err: any) {
                setError((err as any)?.message || "Error fetching deals");
              } finally {
                setLoading(false);
              }
            }}
          />
          <Text style={styles.label}>Ryan's Deals Status:</Text>
          <Text style={styles.status}>{ryansDealsStatus}</Text>
          {ryansDeals.length > 0 && (
            <View style={{ marginTop: 8 }}>
              {ryansDeals.map((name, idx) => (
                <Text key={idx} style={styles.status}>
                  • {name}
                </Text>
              ))}
            </View>
          )}
        </View>

        <Button
          title="Migrate Nurture Deals to Place IDs"
          onPress={handleMigrateNurtureDeals}
        />
        {migrationStatus ? (
          <Text style={styles.status}>{migrationStatus}</Text>
        ) : null}

        <Button title="Complete Map" onPress={handleShowCompleteMap} />
      </CollapsibleSection>

      <CollapsibleSection title="Location Tests">
        <Text style={styles.sectionTitle}>Location Tests</Text>
        <TouchableOpacity style={styles.button} onPress={handleTestLocation}>
          <Text style={styles.buttonText}>Test Location API</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleStartLocationTracking}>
          <Text style={styles.buttonText}>Start Location Tracking</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleStopLocationTracking}>
          <Text style={styles.buttonText}>Stop Location Tracking</Text>
        </TouchableOpacity>
        {locationStatus ? <Text style={styles.status}>{locationStatus}</Text> : null}
      </CollapsibleSection>

      <CollapsibleSection title="Deals API Tests">
        <Text style={styles.sectionTitle}>Deals API Tests</Text>
        <TouchableOpacity style={styles.button} onPress={handleTestDealsAPI}>
          <Text style={styles.buttonText}>Test Deals API</Text>
        </TouchableOpacity>
        {dealsStatus ? <Text style={styles.status}>{dealsStatus}</Text> : null}
      </CollapsibleSection>

      <CollapsibleSection title="Static Map Tests">
        <TouchableOpacity style={styles.button} onPress={handleImportStaticMap}>
          <Text style={styles.buttonText}>Import Static Google Map</Text>
        </TouchableOpacity>
        {staticMapUrl && (
          <RNImage
            source={{ uri: staticMapUrl }}
            style={{ width: 400, height: 300, marginTop: 16, borderRadius: 8 }}
            resizeMode="cover"
          />
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Mapbox Map Tests">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
          {mapStyles.map(style => (
            <TouchableOpacity
              key={style.label}
              style={{
                backgroundColor: selectedStyle === style.url ? '#007AFF' : '#eee',
                padding: 10,
                borderRadius: 8,
                margin: 4,
              }}
              onPress={() => {
                setSelectedStyle(style.url);
                setShowGeoJSON(false);
              }}
            >
              <Text style={{ color: selectedStyle === style.url ? '#fff' : '#333' }}>
                {style.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={{
              backgroundColor: showGeoJSON ? '#007AFF' : '#eee',
              padding: 10,
              borderRadius: 8,
              margin: 4,
            }}
            onPress={() => setShowGeoJSON(!showGeoJSON)}
          >
            <Text style={{ color: showGeoJSON ? '#fff' : '#333' }}>GeoJSON Example</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 300, borderRadius: 8, overflow: 'hidden' }}>
          <MapboxGL.MapView style={{ flex: 1 }} styleURL={selectedStyle}>
            <MapboxGL.Camera
              zoomLevel={14}
              centerCoordinate={[-122.483696, 37.833818]}
            />
            {showGeoJSON && (
              <MapboxGL.ShapeSource id="geojson" shape={sampleGeoJSON}>
                <MapboxGL.FillLayer
                  id="fill"
                  style={{ fillColor: 'rgba(255,0,0,0.4)' }}
                />
              </MapboxGL.ShapeSource>
            )}
          </MapboxGL.MapView>
        </View>
      </CollapsibleSection>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    padding: 20,
  },
  logo: {
    width: 180,
    height: 60,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: colors.primary,
    textAlign: "center",
  },
  statusContainer: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
    color: colors.navy,
  },
  status: {
    fontSize: 14,
    color: colors.black,
  },
  success: {
    color: colors.primary,
  },
  error: {
    color: "#F44336",
  },
  errorContainer: {
    backgroundColor: "#FFEBEE",
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  errorText: {
    color: "#F44336",
    fontSize: 14,
  },
  backButton: {
    position: "absolute",
    top: 10,
    left: 10,
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
    fontWeight: "bold",
  },
  button: {
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: colors.primary,
  },
  locationInfo: {
    marginTop: 20,
    padding: 15,
    backgroundColor: colors.white,
    borderRadius: 8,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});

export default TestScreen;
