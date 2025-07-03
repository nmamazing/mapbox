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
  ActivityIndicator,
} from "react-native";
import { zohoService } from "../services/zohoService";
import { mapsService } from "../services/mapsService";
import * as ExpoLocation from "expo-location";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
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
import locationService from '../services/locationService';
import { startBackgroundLocationUpdates, stopBackgroundLocationUpdates } from '../utils/bgLocation';

// Mapbox configuration
try {
  // Initialize Mapbox with your protected token
  // This token should have styles:tiles and styles:read scopes
  const accessToken = 'pk.eyJ1Ijoibmlrb2F6IiwiYSI6ImNtYmgzbzIyNjA1ajkya29ua3pyMDlha3AifQ.1Ws2P9AaCDnp-sLI6PjX_w';
  console.log('Setting Mapbox access token...');
  MapboxGL.setAccessToken(accessToken);
  console.log('Mapbox access token set successfully');
  
  // Disable telemetry for development
  MapboxGL.setTelemetryEnabled(false);
} catch (error) {
  console.error('Error setting Mapbox access token:', error);
}

// DoorDash style ZIP available in project files for reference

// Removed STAGE_ICONS constant - no longer needed

const TestScreen: React.FC = () => {
  const [zohoStatus, setZohoStatus] = useState<string>("Testing...");
  const [mapsStatus, setMapsStatus] = useState<string>("Testing...");
  const [error, setError] = useState<string | null>(null);
  const [searchedDealStatus, setSearchedDealStatus] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [deals, setDeals] = useState<any[]>([]);
  const [migrationStatus, setMigrationStatus] = useState<string>("");
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Test'>>();
  const [location, setLocation] = useState<ExpoLocation.LocationObject | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<ExpoLocation.LocationSubscription | null>(null);
  const [staticMapUrl, setStaticMapUrl] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>(MapboxGL.StyleURL.Street);
  const [showGeoJSON, setShowGeoJSON] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('');
  const [dealsStatus, setDealsStatus] = useState<string>("");
  const [userDealTestResults, setUserDealTestResults] = useState<string>("");

  useEffect(() => {
    testConnections();
    // Request location permissions and start watching location
    const setupLocation = async () => {
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied');
          return;
        }

        // Get initial location
        const initialLocation = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.High
        });
        setLocation(initialLocation);

        // Start watching location
        const subscription = await ExpoLocation.watchPositionAsync(
          {
            accuracy: ExpoLocation.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 10
          },
          (newLocation) => {
            setLocation(newLocation);
          }
        );
        setLocationSubscription(subscription);
      } catch (error) {
        console.error('Error setting up location:', error);
        setError('Failed to setup location tracking');
      }
    };

    setupLocation();

    // Cleanup subscription on unmount
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
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

  const handleTestLocation = async () => {
    try {
      setLocationStatus('Testing location API...');
      
      if (!location) {
        setLocationStatus('No location available');
        return;
      }

      // Try to add location to API
      try {
        const response = await locationService.addLocation({
          user: 'testUser',
          latitude: location.coords.latitude || 0,
          longitude: location.coords.longitude || 0,
          accuracy: location.coords.accuracy || 0,
          message: 'Test location from mobile app'
        });
        setLocationStatus('Location API test successful!');
      } catch (apiError: any) {
        console.error('API Error:', apiError);
        setLocationStatus(`Location API test failed: ${apiError?.message || "Unknown error"}`);
      }
    } catch (error: any) {
      console.error('Location Error:', error);
      setLocationStatus(`Location test failed: ${error?.message || "Unknown error"}`);
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
    { label: 'DoorDash', url: 'mapbox://styles/nikoaz/cmbjox8q5006q01sq38kqdmgz' },
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

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const dealsData = await zohoService.getAllDeals(
        'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_Zip,US_State',
        'Created_Time',
        'desc'
      );
      setDeals(dealsData);
    } catch (err) {
      setError('Failed to fetch deals');
      console.error('Error fetching deals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTest1_OwnerFilter = async () => {
    try {
      setUserDealTestResults('Testing Owner Field Filter...');
      const deals = await zohoService.getDeals(
        'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_Zip,US_State',
        'Created_Time',
        'desc',
        'Owner:equals:503',
        1,
        100
      );
      const totalCount = deals.info?.count || 0;
      setUserDealTestResults(
        `Owner Field Filter test successful!\n` +
        `• Deals in this page: ${deals.data?.length || 0}\n` +
        `• Total deals available: ${totalCount}\n` +
        `• Note: Limited to 100 per page`
      );
    } catch (error: any) {
      setUserDealTestResults(`Owner Field Filter test failed: ${(error as any)?.message || "Unknown error"}`);
    }
  };

  const handleTest2_SecondaryFilter = async () => {
    try {
      setUserDealTestResults('Testing Secondary Acquisition Filter...');
      const deals = await zohoService.getDeals(
        'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_Zip,US_State',
        'Created_Time',
        'desc',
        'Secondary_Acquisition:equals:49',
        1,
        100
      );
      const totalCount = deals.info?.count || 0;
      setUserDealTestResults(
        `Secondary Acquisition Filter test successful!\n` +
        `• Deals in this page: ${deals.data?.length || 0}\n` +
        `• Total deals available: ${totalCount}\n` +
        `• Note: Limited to 100 per page`
      );
    } catch (error: any) {
      setUserDealTestResults(`Secondary Acquisition Filter test failed: ${(error as any)?.message || "Unknown error"}`);
    }
  };

  const handleTest3_CombinedFilter = async () => {
    try {
      setUserDealTestResults('Testing Combined OR Filter...');
      const deals = await zohoService.getDeals(
        'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_Zip,US_State',
        'Created_Time',
        'desc',
        'Owner:equals:503 OR Secondary_Acquisition:equals:49',
        1,
        100
      );
      const totalCount = deals.info?.count || 0;
      setUserDealTestResults(
        `Combined OR Filter test successful!\n` +
        `• Deals in this page: ${deals.data?.length || 0}\n` +
        `• Total deals available: ${totalCount}\n` +
        `• Note: Limited to 100 per page`
      );
    } catch (error: any) {
      setUserDealTestResults(`Combined OR Filter test failed: ${(error as any)?.message || "Unknown error"}`);
    }
  };

  const handleTest4_SearchParam = async () => {
    try {
      setUserDealTestResults('Testing Search Parameter...');
      const deals = await zohoService.getDeals(
        'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_Zip,US_State',
        'Created_Time',
        'desc',
        'Deal_Name:contains:Devin',
        1,
        100
      );
      setUserDealTestResults(`Search Parameter test successful! Found ${deals.data?.length || 0} deals`);
    } catch (error: any) {
      setUserDealTestResults(`Search Parameter test failed: ${(error as any)?.message || "Unknown error"}`);
    }
  };

  const handleTest5_CustomCriteria = async () => {
    try {
      setUserDealTestResults('Testing Custom Field Criteria...');
      const deals = await zohoService.getDeals(
        'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_Zip,US_State',
        'Created_Time',
        'desc',
        'Stage:equals:3. Nurture Stage',
        1,
        100
      );
      setUserDealTestResults(`Custom Field Criteria test successful! Found ${deals.data?.length || 0} deals`);
    } catch (error: any) {
      setUserDealTestResults(`Custom Field Criteria test failed: ${(error as any)?.message || "Unknown error"}`);
    }
  };

  const handleTest6_TimeFilter = async () => {
    try {
      setUserDealTestResults('Testing Time Filter...');
      const deals = await zohoService.getDeals(
        'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_Zip,US_State',
        'Created_Time',
        'desc',
        'Created_Time:after:2023-01-01',
        1,
        100
      );
      setUserDealTestResults(`Time Filter test successful! Found ${deals.data?.length || 0} deals`);
    } catch (error: any) {
      setUserDealTestResults(`Time Filter test failed: ${(error as any)?.message || "Unknown error"}`);
    }
  };

  const handleTest7_StageFilter = async () => {
    try {
      setUserDealTestResults('Testing Stage Filter...');
      const deals = await zohoService.getDeals(
        'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_Zip,US_State',
        'Created_Time',
        'desc',
        'Stage:equals:3. Nurture Stage',
        1,
        100
      );
      setUserDealTestResults(`Stage Filter test successful! Found ${deals.data?.length || 0} deals`);
    } catch (error: any) {
      setUserDealTestResults(`Stage Filter test failed: ${(error as any)?.message || "Unknown error"}`);
    }
  };

  const handleTest8_PaginationFilter = async () => {
    try {
      setUserDealTestResults('Testing Pagination Filter...');
      const deals = await zohoService.getDeals(
        'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_Zip,US_State',
        'Created_Time',
        'desc',
        'Stage:equals:3. Nurture Stage',
        1,
        100
      );
      setUserDealTestResults(`Pagination Filter test successful! Found ${deals.data?.length || 0} deals (Page 1 only)`);
    } catch (error: any) {
      setUserDealTestResults(`Pagination Filter test failed: ${(error as any)?.message || "Unknown error"}`);
    }
  };

  const handleTest9_AllDevinDeals = async () => {
    try {
      setUserDealTestResults('Fetching ALL deals for Devin Hilliard (Owner:503 OR Secondary:49)...');
      
      let allDeals: any[] = [];
      let pageToken: string | undefined = undefined;
      let page = 1;
      const perPage = 200; // Use larger page size for efficiency
      
      while (true) {
        setUserDealTestResults(`Fetching page ${page}... (${allDeals.length} deals so far)`);
        
        const response = await zohoService.getDeals(
          'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_Zip,US_State',
          'Created_Time',
          'desc',
          'Owner:equals:503 OR Secondary_Acquisition:equals:49',
          page,
          perPage,
          pageToken
        );
        
        const deals = response.data || [];
        if (deals.length === 0) break;
        
        allDeals = allDeals.concat(deals);
        
        // Check for next_page_token
        const nextPageToken = response.info?.next_page_token;
        if (nextPageToken) {
          pageToken = nextPageToken;
          page++;
        } else {
          break;
        }
      }
      
      // Analyze the results
      const ownerDeals = allDeals.filter(deal => deal.Owner === '503');
      const secondaryDeals = allDeals.filter(deal => deal.Secondary_Acquisition === '49');
      const uniqueDeals = allDeals.filter((deal, index, self) => 
        index === self.findIndex(d => d.id === deal.id)
      );
      
      setUserDealTestResults(
        `Complete Devin Hilliard Deal Analysis:\n` +
        `• Total deals fetched: ${allDeals.length}\n` +
        `• Unique deals: ${uniqueDeals.length}\n` +
        `• As Owner (503): ${ownerDeals.length}\n` +
        `• As Secondary (49): ${secondaryDeals.length}\n` +
        `• Pages fetched: ${page}\n` +
        `• Average per page: ${Math.round(allDeals.length / page)}`
      );
    } catch (error: any) {
      setUserDealTestResults(`Complete Devin Deals test failed: ${(error as any)?.message || "Unknown error"}`);
    }
  };

  const handleTest10_DealCounts = async () => {
    try {
      setUserDealTestResults('Testing individual deal counts...');
      
      // Test Owner count
      const ownerResponse = await zohoService.getDeals(
        'id',
        'Created_Time',
        'desc',
        'Owner:equals:503',
        1,
        1
      );
      const ownerCount = ownerResponse.info?.count || 0;
      
      // Test Secondary count
      const secondaryResponse = await zohoService.getDeals(
        'id',
        'Created_Time',
        'desc',
        'Secondary_Acquisition:equals:49',
        1,
        1
      );
      const secondaryCount = secondaryResponse.info?.count || 0;
      
      // Test combined count
      const combinedResponse = await zohoService.getDeals(
        'id',
        'Created_Time',
        'desc',
        'Owner:equals:503 OR Secondary_Acquisition:equals:49',
        1,
        1
      );
      const combinedCount = combinedResponse.info?.count || 0;
      
      setUserDealTestResults(
        `Deal Count Analysis:\n` +
        `• Total deals as Owner (503): ${ownerCount}\n` +
        `• Total deals as Secondary (49): ${secondaryCount}\n` +
        `• Combined unique deals: ${combinedCount}\n` +
        `• Note: Combined may be less than sum due to overlap`
      );
    } catch (error: any) {
      setUserDealTestResults(`Deal Counts test failed: ${(error as any)?.message || "Unknown error"}`);
    }
  };

  // Handler: Log Sample Deal
  const handleLogSampleDeal = async () => {
    try {
      setUserDealTestResults('Fetching deals for sample log...');
      let allDeals: any[] = [];
      let pageToken: string | undefined = undefined;
      let page = 1;
      const perPage = 200;
      while (true) {
        const response = await zohoService.getDeals(
          'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_Zip,US_State',
          'Created_Time',
          'desc',
          'Owner:equals:503 OR Secondary_Acquisition:equals:49',
          page,
          perPage,
          pageToken
        );
        const deals = response.data || [];
        if (deals.length === 0) break;
        allDeals = allDeals.concat(deals);
        const nextPageToken = response.info?.next_page_token;
        if (nextPageToken) {
          pageToken = nextPageToken;
          page++;
        } else {
          break;
        }
      }
      if (allDeals.length > 0) {
        console.log('Sample deal:', JSON.stringify(allDeals[0], null, 2));
        setUserDealTestResults('Sample deal logged to console.');
      } else {
        setUserDealTestResults('No deals found to log.');
      }
    } catch (error: any) {
      setUserDealTestResults(`Log Sample Deal failed: ${(error as any)?.message || "Unknown error"}`);
    }
  };

  // Handler: Log Unique Owner/Secondary IDs
  const handleLogUniqueOwnerSecondaryIDs = async () => {
    try {
      setUserDealTestResults('Fetching deals for unique ID log...');
      let allDeals: any[] = [];
      let pageToken: string | undefined = undefined;
      let page = 1;
      const perPage = 200;
      while (true) {
        const response = await zohoService.getDeals(
          'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_Zip,US_State',
          'Created_Time',
          'desc',
          'Owner:equals:503 OR Secondary_Acquisition:equals:49',
          page,
          perPage,
          pageToken
        );
        const deals = response.data || [];
        if (deals.length === 0) break;
        allDeals = allDeals.concat(deals);
        const nextPageToken = response.info?.next_page_token;
        if (nextPageToken) {
          pageToken = nextPageToken;
          page++;
        } else {
          break;
        }
      }
      const ownerIds = new Set(allDeals.map(d => d.Owner?.id || d.Owner));
      const secondaryIds = new Set(allDeals.map(d => d.Secondary_Acquisition?.id || d.Secondary_Acquisition));
      console.log('Unique Owner IDs:', Array.from(ownerIds));
      console.log('Unique Secondary_Acquisition IDs:', Array.from(secondaryIds));
      setUserDealTestResults('Unique Owner/Secondary IDs logged to console.');
    } catch (error: any) {
      setUserDealTestResults(`Log Unique IDs failed: ${(error as any)?.message || "Unknown error"}`);
    }
  };

  const handleForceTokenRefresh = async () => {
    setLoading(true);
    try {
      console.log('Force refreshing Zoho access token...');
      const newToken = await zohoService.forceTokenRefresh();
      setUserDealTestResults(`Token refreshed successfully: ${newToken.substring(0, 20)}...`);
    } catch (error: any) {
      console.error('Error forcing token refresh:', error);
      setUserDealTestResults(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExtractUsersFromDeals = async () => {
    setLoading(true);
    try {
      console.log('Extracting users from deals data...');
      const deals = await zohoService.getAllDeals();
      
      const users = new Map();
      
      deals.forEach(deal => {
        if (deal.Owner) {
          const ownerId = deal.Owner.id || deal.Owner;
          const ownerName = deal.Owner.name || deal.Owner;
          if (!users.has(ownerId)) {
            users.set(ownerId, {
              id: ownerId,
              name: ownerName,
              email: '',
              type: 'Owner'
            });
          }
        }
        
        if (deal.Secondary_Acquisition) {
          const secondaryId = deal.Secondary_Acquisition.id || deal.Secondary_Acquisition;
          const secondaryName = deal.Secondary_Acquisition.name || deal.Secondary_Acquisition;
          if (!users.has(secondaryId)) {
            users.set(secondaryId, {
              id: secondaryId,
              name: secondaryName,
              email: '',
              type: 'Secondary'
            });
          }
        }
      });
      
      const userList = Array.from(users.values());
      console.log('Users extracted from deals:', userList);
      setUserDealTestResults(`Extracted ${userList.length} users from deals data. Check console for details.`);
    } catch (error: any) {
      console.error('Error extracting users from deals:', error);
      setUserDealTestResults(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Fetching deals from Zoho...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDeals}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Removed stage analysis variables - no longer needed

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

      <CollapsibleSection title="Map Tests">
        <Text style={styles.sectionTitle}>Map Tests</Text>
        <View style={{ height: 400, borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
          <MapboxGL.MapView 
            style={{ flex: 1, height: 400 }} 
            styleURL={selectedStyle}
            onDidFailLoadingMap={() => {
              console.error('Mapbox failed to load map');
              setError('Mapbox failed to load map');
            }}
            onDidFinishLoadingMap={() => {
              console.log('Mapbox map loaded successfully');
            }}
            onDidFinishLoadingStyle={() => {
              console.log('Mapbox style loaded successfully');
            }}
            logoEnabled={false}
            attributionEnabled={true}
            compassEnabled={true}
            scaleBarEnabled={true}
          >
            {location && (
              <>
                <MapboxGL.Camera
                  zoomLevel={14}
                  centerCoordinate={[location.coords.longitude, location.coords.latitude]}
                  animationMode="flyTo"
                  animationDuration={2000}
                />
                <MapboxGL.UserLocation
                  visible={true}
                  animated={true}
                  showsUserHeadingIndicator={true}
                />
              </>
            )}
            {showGeoJSON && (
              <MapboxGL.ShapeSource 
                id="geojson" 
                shape={sampleGeoJSON}
                onPress={(e) => {
                  console.log('Shape pressed:', e);
                }}
              >
                <MapboxGL.FillLayer
                  id="fill"
                  style={{ fillColor: 'rgba(255,0,0,0.4)' }}
                />
              </MapboxGL.ShapeSource>
            )}
          </MapboxGL.MapView>
        </View>
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
      </CollapsibleSection>

      <CollapsibleSection title="👤 User Deal Tests">
        <Text style={styles.sectionTitle}>User Deal Tests - Devin Hilliard</Text>
        <Text style={styles.status}>
          Testing different methods to query deals for Devin Hilliard (503 as Owner, 49 as Secondary)
        </Text>
        
        {/* Test 1: Using Owner field filter */}
        <TouchableOpacity style={styles.button} onPress={handleTest1_OwnerFilter}>
          <Text style={styles.buttonText}>Test 1: Owner Field Filter</Text>
        </TouchableOpacity>
        
        {/* Test 2: Using Secondary_Acquisition field filter */}
        <TouchableOpacity style={styles.button} onPress={handleTest2_SecondaryFilter}>
          <Text style={styles.buttonText}>Test 2: Secondary Acquisition Filter</Text>
        </TouchableOpacity>
        
        {/* Test 3: Using OR criteria with both fields */}
        <TouchableOpacity style={styles.button} onPress={handleTest3_CombinedFilter}>
          <Text style={styles.buttonText}>Test 3: Combined OR Filter</Text>
        </TouchableOpacity>
        
        {/* Test 4: Using search parameter */}
        <TouchableOpacity style={styles.button} onPress={handleTest4_SearchParam}>
          <Text style={styles.buttonText}>Test 4: Search Parameter</Text>
        </TouchableOpacity>
        
        {/* Test 5: Using custom field criteria */}
        <TouchableOpacity style={styles.button} onPress={handleTest5_CustomCriteria}>
          <Text style={styles.buttonText}>Test 5: Custom Field Criteria</Text>
        </TouchableOpacity>
        
        {/* Test 6: Using modified time filter with user criteria */}
        <TouchableOpacity style={styles.button} onPress={handleTest6_TimeFilter}>
          <Text style={styles.buttonText}>Test 6: Time + User Filter</Text>
        </TouchableOpacity>
        
        {/* Test 7: Using stage filter with user criteria */}
        <TouchableOpacity style={styles.button} onPress={handleTest7_StageFilter}>
          <Text style={styles.buttonText}>Test 7: Stage + User Filter</Text>
        </TouchableOpacity>
        
        {/* Test 8: Using pagination with user filter */}
        <TouchableOpacity style={styles.button} onPress={handleTest8_PaginationFilter}>
          <Text style={styles.buttonText}>Test 8: Pagination + User Filter</Text>
        </TouchableOpacity>
        
        {/* Test 9: Fetch ALL deals for Devin with pagination */}
        <TouchableOpacity style={styles.button} onPress={handleTest9_AllDevinDeals}>
          <Text style={styles.buttonText}>Test 9: ALL Devin Deals (Paginated)</Text>
        </TouchableOpacity>
        
        {/* Test 10: Get total deal counts */}
        <TouchableOpacity style={styles.button} onPress={handleTest10_DealCounts}>
          <Text style={styles.buttonText}>Test 10: Deal Count Analysis</Text>
        </TouchableOpacity>
        
        {/* Log Sample Deal */}
        <TouchableOpacity style={styles.button} onPress={handleLogSampleDeal}>
          <Text style={styles.buttonText}>Log Sample Deal (Console)</Text>
        </TouchableOpacity>
        {/* Log Unique Owner/Secondary IDs */}
        <TouchableOpacity style={styles.button} onPress={handleLogUniqueOwnerSecondaryIDs}>
          <Text style={styles.buttonText}>Log Unique Owner/Secondary IDs (Console)</Text>
        </TouchableOpacity>
        
        {/* Force Token Refresh */}
        <TouchableOpacity style={styles.button} onPress={handleForceTokenRefresh}>
          <Text style={styles.buttonText}>Force Token Refresh</Text>
        </TouchableOpacity>
        
        {/* Extract Users from Deals */}
        <TouchableOpacity style={styles.button} onPress={handleExtractUsersFromDeals}>
          <Text style={styles.buttonText}>Extract Users from Deals</Text>
        </TouchableOpacity>
        
        {/* Results Display */}
        {userDealTestResults && (
          <View style={styles.testResultsContainer}>
            <Text style={styles.testResultsTitle}>Test Results:</Text>
            <Text style={styles.testResultsText}>{userDealTestResults}</Text>
          </View>
        )}
      </CollapsibleSection>

      <TouchableOpacity style={styles.refreshButton} onPress={fetchDeals}>
        <Text style={styles.refreshButtonText}>Refresh Data</Text>
      </TouchableOpacity>

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
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 16,
  },
  refreshButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  testResultsContainer: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  testResultsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: colors.primary,
  },
  testResultsText: {
    fontSize: 14,
    color: colors.black,
  },
});

export default TestScreen;
