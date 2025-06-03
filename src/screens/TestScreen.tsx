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
import { getRealm, closeRealm } from "../config/realm";
import {
  connectToMongoDB,
  closeMongoDBConnection,
  syncWithMongoDB,
} from "../services/mongodb";
import { TestDocument } from "../config/realm";
import { API_ENDPOINTS } from "../config/api";
import CollapsibleSection from "../components/CollapsibleSection";
import { Image as RNImage } from 'react-native';
import MapboxGL from '@rnmapbox/maps';

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
  const [location, setLocation] = useState<ExpoLocation.LocationObject | null>(
    null
  );
  const [realmStatus, setRealmStatus] = useState<string>("Testing...");
  const [mongoStatus, setMongoStatus] = useState<string>("Testing...");
  const [writeStatus, setWriteStatus] = useState<string>("");
  const [syncStatus, setSyncStatus] = useState<string>("");
  const [backendStatus, setBackendStatus] = useState<string>("");
  const [staticMapUrl, setStaticMapUrl] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState(MapboxGL.StyleURL.Street);
  const [showGeoJSON, setShowGeoJSON] = useState(false);

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
          `Google Maps Connection Failed: ${
            mapsError?.message || "Unknown error"
          }`
        );
      }
    } catch (error) {
      setMapsStatus(`Error: ${error?.message || "Unknown error"}`);
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
        "Migration failed: " + (err.message || "Unknown error")
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
      navigation.navigate("CompleteMap", { deals: allDeals });
    } catch (err: any) {
      setError(err.message || "Error fetching deals");
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
      // Write to userLocation schema
      const realm = await getRealm();
      realm.write(() => {
        realm.create("userLocation", {
          _id: new Realm.BSON.ObjectId(),
          message: "Manual location capture",
          timestamp: new Date(),
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
        });
      });
    } catch (err: any) {
      console.error("Error getting location:", err);
      setError(err?.message || "Error getting location");
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
      // Write to userLocation schema
      if (location) {
        const realm = await getRealm();
        realm.write(() => {
          realm.create("userLocation", {
            _id: new Realm.BSON.ObjectId(),
            message: "Background location capture",
            timestamp: new Date(),
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
          });
        });
      }
    } catch (err: any) {
      console.error("Error starting location updates:", err);
      setError(err?.message || "Error starting location updates");
    }
  };

  const handleStopWatching = async () => {
    try {
      await ExpoLocation.stopLocationUpdatesAsync("location-tracking");
      setLocation(null);
    } catch (err: any) {
      setError(err?.message || "Error stopping location updates");
    }
  };

  const handleTestRealm = async () => {
    try {
      const realm = await getRealm();
      setRealmStatus("Realm connection successful");
    } catch (err: any) {
      setRealmStatus(
        "Realm connection failed: " + (err.message || "Unknown error")
      );
    }
  };

  const handleTestSync = async () => {
    try {
      const realm = await getRealm();
      await syncWithMongoDB(realm);
      setMongoStatus("Realm sync successful");
    } catch (err: any) {
      setMongoStatus("Realm sync failed: " + (err.message || "Unknown error"));
    }
  };

  const handleTestWrite = async () => {
    setWriteStatus("Writing test document...");
    try {
      const realm = await getRealm();
      realm.write(() => {
        realm.create("userLocation", {
          _id: new Realm.BSON.ObjectId(),
          message: "Hello from Test Write!",
          timestamp: new Date(),
          latitude: 33.4484, // Example latitude
          longitude: -112.074, // Example longitude
          accuracy: 5.0, // Example accuracy in meters
        });
      });
      await syncWithMongoDB(realm);
      setWriteStatus("Test document written and synced successfully!");
    } catch (err: any) {
      setWriteStatus("Test write failed: " + (err.message || "Unknown error"));
    }
  };

  const handleSyncToBackend = async () => {
    try {
      if (!location) {
        setSyncStatus("No location data available. Get location first.");
        return;
      }

      setSyncStatus("Syncing to backend...");
      const response = await fetch(API_ENDPOINTS.ADD_LOCATION, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          timestamp: new Date().toISOString(),
          message: "Manual sync from mobile app",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to sync with backend");
      }

      setSyncStatus("Successfully synced to backend!");
    } catch (err: any) {
      setSyncStatus(`Sync failed: ${err.message || "Unknown error"}`);
    }
  };

  const handleCheckBackendStatus = async () => {
    try {
      setBackendStatus("Checking backend status...");
      console.log("Checking backend at:", API_ENDPOINTS.HEALTH);
      const response = await fetch(API_ENDPOINTS.HEALTH);
      console.log("Backend response status:", response.status);
      const data = await response.json();
      console.log("Backend response data:", data);

      if (response.ok && data.status === "ok") {
        setBackendStatus(
          `Backend is running! Last checked: ${new Date().toLocaleTimeString()}`
        );
      } else {
        throw new Error("Backend responded with invalid status");
      }
    } catch (err: any) {
      console.error("Backend check error:", err);
      setBackendStatus(
        `Backend is not running: ${err.message || "Connection failed"}`
      );
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
      Alert.alert("Error", err.message || "Failed to load static map");
    }
  };

  const mapStyles = [
    { label: 'Day (Light)', url: MapboxGL.StyleURL.Light },
    { label: 'Night (Dark)', url: MapboxGL.StyleURL.Dark },
    { label: 'Satellite', url: MapboxGL.StyleURL.Satellite },
    { label: 'Streets', url: MapboxGL.StyleURL.Street },
    { label: 'Outdoors', url: MapboxGL.StyleURL.Outdoors },
  ];

  const geojsonExample = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-122.483696, 37.833818],
              [-122.483482, 37.833174],
              [-122.483396, 37.8327],
              [-122.483568, 37.832056],
              [-122.48404, 37.831141],
              [-122.48404, 37.830497],
              [-122.483482, 37.82992],
              [-122.483568, 37.829548],
              [-122.48507, 37.829446],
              [-122.4861, 37.828802],
              [-122.486958, 37.82931],
              [-122.487001, 37.830802],
              [-122.487516, 37.831683],
              [-122.488031, 37.832158],
              [-122.488889, 37.832971],
              [-122.489876, 37.832632],
              [-122.490434, 37.832937],
              [-122.49125, 37.832429],
              [-122.491636, 37.832564],
              [-122.492237, 37.833378],
              [-122.493782, 37.833683],
              [-122.493782, 37.834925],
              [-122.4934, 37.835255],
              [-122.493782, 37.835582],
              [-122.493782, 37.836096],
              [-122.492237, 37.836096],
              [-122.491636, 37.835582],
              [-122.49125, 37.835255],
              [-122.490434, 37.835582],
              [-122.489876, 37.835255],
              [-122.488889, 37.835582],
              [-122.488031, 37.835255],
              [-122.487516, 37.834925],
              [-122.487001, 37.834925],
              [-122.486958, 37.833683],
              [-122.4861, 37.833378],
              [-122.48507, 37.833683],
              [-122.483696, 37.833818]
            ]
          ]
        }
      }
    ]
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
                });
                navigation.navigate("DealsList", { deals });
              } catch (err: any) {
                setError(err.message || "Error fetching deals");
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
        <TouchableOpacity style={styles.button} onPress={handleGetLocation}>
          <Text style={styles.buttonText}>Get Current Location</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleStartWatching}>
          <Text style={styles.buttonText}>Start Watching Location</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleStopWatching}>
          <Text style={styles.buttonText}>Stop Watching Location</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleCheckBackendStatus}
        >
          <Text style={styles.buttonText}>Check Backend Status</Text>
        </TouchableOpacity>
        {backendStatus ? (
          <Text style={styles.status}>{backendStatus}</Text>
        ) : null}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={handleSyncToBackend}
        >
          <Text style={styles.buttonText}>Sync to Backend</Text>
        </TouchableOpacity>
        {syncStatus ? <Text style={styles.status}>{syncStatus}</Text> : null}
        {location && (
          <View style={styles.locationInfo}>
            <Text>Latitude: {location.coords.latitude}</Text>
            <Text>Longitude: {location.coords.longitude}</Text>
            <Text>Accuracy: {location.coords.accuracy}</Text>
          </View>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Database Tests">
        <Text style={styles.sectionTitle}>Database Tests</Text>
        <TouchableOpacity style={styles.button} onPress={handleTestRealm}>
          <Text style={styles.buttonText}>Test Realm</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleTestSync}>
          <Text style={styles.buttonText}>Test Sync</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleTestWrite}>
          <Text style={styles.buttonText}>Test Write to Mongo</Text>
        </TouchableOpacity>
        {writeStatus ? <Text style={styles.status}>{writeStatus}</Text> : null}
      </CollapsibleSection>

      <CollapsibleSection title="Connection Status">
        <Text style={styles.sectionTitle}>Connection Status</Text>
        <Text>Realm: {realmStatus}</Text>
        <Text>Sync: {mongoStatus}</Text>
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
              <MapboxGL.ShapeSource id="geojson" shape={geojsonExample}>
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
