import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useUser } from '../contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { TextInput } from 'react-native-gesture-handler';
import { zohoService } from '../services/zohoService';
import { colors } from '../theme/colors';
import StageIcon from '../components/StageIcon';
import { 
  roundToQuarterMile, 
  formatRadiusDisplay, 
  validateAndFormatRadius,
  handleRadiusSliderChange,
  handleRadiusInputChange
} from '../utils/radiusUtils';
import Constants from 'expo-constants';
import { 
  updateDealCoordinates,
  saveUserDealsToStorage,
  loadUserDealsFromStorage,
  getUserDealsStorageInfo,
  clearUserDealsFromStorage
} from '../services/zohoService';

export default function ProfileScreen() {
  console.log('ProfileScreen: Starting to render');
  
  try {
    const { signOut, user } = useAuth();
    console.log('ProfileScreen: Auth context loaded');
    
    const { settings, updateSettings, getStageDisplayName, getStageIcon } = useSettings();
    console.log('ProfileScreen: Settings context loaded', settings);
    
    const { 
      selectedUser, 
      setSelectedUser, 
      availableUsers, 
      setAvailableUsers, 
      isLoadingUsers, 
      setIsLoadingUsers 
    } = useUser();
    
    const [isMapSettingsExpanded, setIsMapSettingsExpanded] = useState(false);
    const [customRadius, setCustomRadius] = useState(formatRadiusDisplay(settings.routingRadius));
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // New state for user deals
    const [userDeals, setUserDeals] = useState<any[]>([]);
    const [isLoadingDeals, setIsLoadingDeals] = useState(false);
    const [isDealsExpanded, setIsDealsExpanded] = useState(false);
    
    // User selection state
    const [isUserSelectorVisible, setIsUserSelectorVisible] = useState(false);
    const [userDropdownLoading, setUserDropdownLoading] = useState(false);
    
    // New state for Place ID verification
    const [isVerifyingPlaceIds, setIsVerifyingPlaceIds] = useState(false);
    const [placeIdStatus, setPlaceIdStatus] = useState<string>("");
    
    // New state for local storage
    const [localDealsInfo, setLocalDealsInfo] = useState<{ count: number; lastUpdated: string } | null>(null);
    const [isLoadingLocalDeals, setIsLoadingLocalDeals] = useState(false);
    const [isSavingLocalDeals, setIsSavingLocalDeals] = useState(false);
    const [dataSource, setDataSource] = useState<'local' | 'server' | null>(null);
    
    console.log('ProfileScreen: State initialized');

    useEffect(() => {
      console.log('ProfileScreen mounted');
      console.log('Current settings:', settings);
      // Removed automatic loading - users will be loaded manually
    }, []);

    // Removed automatic loading of user deals - will be loaded manually

    const loadAvailableUsers = async () => {
      setIsLoadingUsers(true);
      try {
        console.log('Loading available users from Zoho deals...');
        
        // Fetch deals with minimal fields needed for user extraction
        // This is much faster than fetching all deal data
        const allDeals = await zohoService.getAllDeals(
          'id,Owner,Secondary_Acquisition',
          'Created_Time',
          'desc',
          undefined, // No criteria - we need all deals to find all users
          200 // Limit to 200 deals for speed while still getting good user coverage
        );
        
        // Log the first few deals for debugging
        console.log('First 5 deals:', allDeals.slice(0, 5));
        
        // Extract unique users from both Owner and Secondary_Acquisition fields
        const users = new Map<string, {id: string, name: string, type: 'Owner' | 'Secondary'}>();
        
        allDeals.forEach(deal => {
          // Add owners
          let ownerName = (deal.Owner && typeof deal.Owner.name === 'string' && deal.Owner.name.trim()) ? deal.Owner.name.trim() : 'Unassigned';
          let ownerId = (deal.Owner && typeof deal.Owner.id === 'string' && deal.Owner.id.trim()) ? deal.Owner.id.trim() : `unassigned_${ownerName}`;
          if (ownerName) {
            users.set(ownerId, {
              id: ownerId,
              name: ownerName,
              type: 'Owner'
            });
          }
          // Add secondary acquisition agents
          if (deal.Secondary_Acquisition && typeof deal.Secondary_Acquisition === 'string' && deal.Secondary_Acquisition.trim()) {
            const secondaryName = deal.Secondary_Acquisition.trim();
            const secondaryId = `secondary_${secondaryName}`;
            users.set(secondaryId, {
              id: secondaryId,
              name: secondaryName,
              type: 'Secondary'
            });
          }
        });
        
        const usersList = Array.from(users.values()).sort((a, b) => a.name.localeCompare(b.name));
        setAvailableUsers(usersList);
        
        console.log(`Found ${usersList.length} unique users from efficient query`);
        
        // Set current user as default if available and no user is selected
        if (user && !selectedUser) {
          const currentUser = usersList.find(u => u.name === user.name);
          if (currentUser) {
            setSelectedUser(currentUser);
          }
        }
      } catch (error) {
        console.error('Error loading available users:', error);
        Alert.alert('Error', 'Failed to load available users');
      } finally {
        setIsLoadingUsers(false);
      }
    };

    const loadUserDeals = async () => {
      if (!user || !selectedUser) return;
      
      setIsLoadingDeals(true);
      let localDeals: any[] | null = null;
      
      try {
        console.log('Loading deals for selected user:', selectedUser.name);
        
        // Step 1: Try to load from local storage first for instant response
        localDeals = await loadUserDealsFromStorage(selectedUser.name);
        if (localDeals && localDeals.length > 0) {
          console.log(`Loaded ${localDeals.length} deals from local storage for ${selectedUser.name}`);
          setUserDeals(localDeals);
          setDataSource('local');
          
          // Step 2: Check if local data is fresh (within 1 hour)
          const storageInfo = await getUserDealsStorageInfo(selectedUser.name);
          const isFresh = storageInfo && (Date.now() - new Date(storageInfo.lastUpdated).getTime()) < 3600000; // 1 hour
          
          if (isFresh) {
            console.log('Local data is fresh, skipping server sync');
            setIsLoadingDeals(false);
            
            // Trigger background sync for future updates
            setTimeout(() => {
              syncDealsInBackground(selectedUser.name);
            }, 2000); // Wait 2 seconds before starting background sync
            
            return;
          }
        }
        
        // Step 3: Load from server using client-side filtering (matching MapScreen approach)
        console.log('Fetching deals from server...');
        const allDeals = await zohoService.getAllDeals(
          'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_State,Property_Zip,Modified_Time',
          'Created_Time',
          'desc',
          undefined, // No criteria - fetch all deals
          500 // Higher limit to get more deals
        );
        
        // Step 4: Filter deals for selected user (client-side filtering)
        const userDeals = allDeals.filter(deal => {
          const isOwner = deal.Owner?.name === selectedUser.name;
          const isSecondary = deal.Secondary_Acquisition === selectedUser.name;
          return isOwner || isSecondary;
        });
        
        console.log(`Found ${userDeals.length} deals for user ${selectedUser.name} out of ${allDeals.length} total deals`);
        
        // Step 5: Save to local storage and update UI
        if (userDeals.length > 0) {
          await saveUserDealsToStorage(selectedUser.name, userDeals);
          await checkLocalStorageInfo(selectedUser.name);
        }
        
        setUserDeals(userDeals);
        setDataSource('server');
      } catch (error) {
        console.error('Error loading user deals:', error);
        
        // Fallback to local data if server fails
        if (localDeals && localDeals.length > 0) {
          console.log('Server failed, using local data as fallback');
          setUserDeals(localDeals);
        } else {
          Alert.alert('Error', 'Failed to load deals from server and no local data available');
        }
      } finally {
        setIsLoadingDeals(false);
      }
    };

    const handleUserSelect = (userId: string) => {
      const userData = availableUsers.find(u => u.id === userId);
      if (userData) {
        setSelectedUser(userData);
        setIsUserSelectorVisible(false);
        
        // Check local storage info for the selected user
        checkLocalStorageInfo(userData.name);
        
        // Reload deals for the new user
        if (isDealsExpanded) {
          loadUserDeals();
        }
      }
    };

    const syncDealsInBackground = async (userName: string) => {
      try {
        console.log('Starting background sync for user:', userName);
        
        // Get local storage info to check last sync time
        const storageInfo = await getUserDealsStorageInfo(userName);
        if (!storageInfo) {
          console.log('No local data found, skipping background sync');
          return;
        }
        
        const lastSyncTime = new Date(storageInfo.lastUpdated).getTime();
        const oneHourAgo = Date.now() - 3600000; // 1 hour ago
        
        // Only sync if data is older than 1 hour
        if (lastSyncTime > oneHourAgo) {
          console.log('Local data is recent, skipping background sync');
          return;
        }
        
        // Fetch only deals modified since last sync
        const allDeals = await zohoService.getAllDeals(
          'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_State,Property_Zip,Modified_Time',
          'Modified_Time',
          'desc',
          undefined,
          500
        );
        
        // Filter for user and check modification time
        const userDeals = allDeals.filter(deal => {
          const isOwner = deal.Owner?.name === userName;
          const isSecondary = deal.Secondary_Acquisition === userName;
          const isModified = deal.Modified_Time && new Date(deal.Modified_Time).getTime() > lastSyncTime;
          return (isOwner || isSecondary) && isModified;
        });
        
        if (userDeals.length > 0) {
          console.log(`Found ${userDeals.length} modified deals, updating local storage`);
          
          // Load current local deals
          const currentLocalDeals = await loadUserDealsFromStorage(userName) || [];
          
          // Merge deals (replace existing, add new)
          const dealMap = new Map();
          currentLocalDeals.forEach(deal => dealMap.set(deal.id, deal));
          userDeals.forEach(deal => dealMap.set(deal.id, deal));
          
          const updatedDeals = Array.from(dealMap.values());
          
          // Save updated deals
          await saveUserDealsToStorage(userName, updatedDeals);
          await checkLocalStorageInfo(userName);
          
          // Update UI if this user is currently selected
          if (selectedUser?.name === userName) {
            setUserDeals(updatedDeals);
            console.log('Updated UI with synced deals');
          }
        } else {
          console.log('No modified deals found in background sync');
        }
      } catch (error) {
        console.error('Background sync failed:', error);
        // Don't show error to user for background sync
      }
    };

    const checkLocalStorageInfo = async (userName: string) => {
      try {
        const info = await getUserDealsStorageInfo(userName);
        setLocalDealsInfo(info);
      } catch (error) {
        console.error('Error checking local storage info:', error);
        setLocalDealsInfo(null);
      }
    };

    const getSelectedUserName = () => {
      return selectedUser ? selectedUser.name : 'Select User';
    };

    const getSelectedUserType = () => {
      return selectedUser ? selectedUser.type : '';
    };

    const handleDealPress = (deal: any) => {
      Alert.alert(
        deal.Deal_Name,
        `Stage: ${deal.Stage}\nAddress: ${deal.Property_Address}, ${deal.Property_City}, ${deal.US_State} ${deal.Property_Zip}\nRole: ${deal.Owner?.name === selectedUser?.name ? 'Primary Owner' : 'Secondary Acquisition'}\nCreated: ${new Date(deal.Created_Time).toLocaleDateString()}`,
        [{ text: 'OK' }]
      );
    };

    const renderDealItem = ({ item }: { item: any }) => {
      return (
        <TouchableOpacity style={styles.dealItem} onPress={() => handleDealPress(item)}>
          <View style={styles.dealHeader}>
            <Text style={styles.dealName} numberOfLines={1}>{item.Deal_Name}</Text>
            <Text style={styles.dealStage}>{item.Stage}</Text>
          </View>
          <Text style={styles.dealAddress}>
            {item.Property_Address}, {item.Property_City}, {item.US_State} {item.Property_Zip}
          </Text>
          <Text style={styles.dealRole}>
            {item.Owner?.name === selectedUser?.name ? 'Primary Owner' : 'Secondary Acquisition'}
          </Text>
        </TouchableOpacity>
      );
    };

    const handleLogout = async () => {
      try {
        await signOut();
      } catch (error) {
        console.error('Error during logout:', error);
        Alert.alert('Error', 'Failed to logout');
      }
    };

    const handleDealRefresh = async () => {
      if (!selectedUser) return;
      
      setIsRefreshing(true);
      try {
        console.log('Force refreshing deals from server for user:', selectedUser.name);
        
        // Force refresh: skip local storage and fetch from server
        const allDeals = await zohoService.getAllDeals(
          'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_State,Property_Zip,Modified_Time',
          'Created_Time',
          'desc',
          undefined,
          500
        );
        
        // Filter deals for selected user
        const userDeals = allDeals.filter(deal => {
          const isOwner = deal.Owner?.name === selectedUser.name;
          const isSecondary = deal.Secondary_Acquisition === selectedUser.name;
          return isOwner || isSecondary;
        });
        
        console.log(`Force refresh: Found ${userDeals.length} deals for user ${selectedUser.name}`);
        
        // Update local storage and UI
        if (userDeals.length > 0) {
          await saveUserDealsToStorage(selectedUser.name, userDeals);
          await checkLocalStorageInfo(selectedUser.name);
        }
        
        setUserDeals(userDeals);
        setDataSource('server');
        Alert.alert('Success', `Refreshed ${userDeals.length} deals from server`);
      } catch (error) {
        console.error('Error force refreshing deals:', error);
        Alert.alert('Error', 'Failed to refresh deals from server');
      } finally {
        setIsRefreshing(false);
      }
    };

    const handleSaveDealsLocally = async () => {
      if (!selectedUser || userDeals.length === 0) {
        Alert.alert('No Deals', 'No deals available to save locally');
        return;
      }
      
      setIsSavingLocalDeals(true);
      try {
        await saveUserDealsToStorage(selectedUser.name, userDeals);
        await checkLocalStorageInfo(selectedUser.name);
        Alert.alert('Success', `Saved ${userDeals.length} deals locally for ${selectedUser.name}`);
      } catch (error) {
        console.error('Error saving deals locally:', error);
        Alert.alert('Error', 'Failed to save deals locally');
      } finally {
        setIsSavingLocalDeals(false);
      }
    };

    const handleLoadDealsLocally = async () => {
      if (!selectedUser) return;
      
      setIsLoadingLocalDeals(true);
      try {
        const localDeals = await loadUserDealsFromStorage(selectedUser.name);
        if (localDeals && localDeals.length > 0) {
          setUserDeals(localDeals);
          Alert.alert('Success', `Loaded ${localDeals.length} deals from local storage`);
        } else {
          Alert.alert('No Local Data', 'No deals found in local storage for this user');
        }
      } catch (error) {
        console.error('Error loading deals locally:', error);
        Alert.alert('Error', 'Failed to load deals from local storage');
      } finally {
        setIsLoadingLocalDeals(false);
      }
    };

    const handleClearLocalDeals = async () => {
      if (!selectedUser) return;
      
      Alert.alert(
        'Clear Local Data',
        `Are you sure you want to clear all locally stored deals for ${selectedUser.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear',
            style: 'destructive',
            onPress: async () => {
              try {
                await clearUserDealsFromStorage(selectedUser.name);
                setLocalDealsInfo(null);
                Alert.alert('Success', 'Local deals cleared successfully');
              } catch (error) {
                console.error('Error clearing local deals:', error);
                Alert.alert('Error', 'Failed to clear local deals');
              }
            }
          }
        ]
      );
    };

    const handleVerifyPlaceIds = async () => {
      if (!selectedUser) {
        Alert.alert('Error', 'Please select a user first');
        return;
      }
      
      setIsVerifyingPlaceIds(true);
      setPlaceIdStatus("Starting Place ID verification...");
      
      try {
        console.log('Verifying Place IDs for user:', selectedUser.name);
        
        // Fetch all deals for the selected user (no stage filter)
        const criteria = `(Owner.name:equals:${selectedUser.name}) OR (Secondary_Acquisition.name:equals:${selectedUser.name})`;
        
        // Fetch deals with coordinates field included
        const deals = await zohoService.getAllDeals(
          'id,Deal_Name,Stage,Coordinates,Property_Address,Property_City,Property_State,Property_Zip',
          'Created_Time',
          'desc',
          criteria,
          500 // Higher limit to get more deals
        );
        
        console.log(`Found ${deals.length} deals for Place ID verification`);
        
        // Analyze deals for Place ID status
        let dealsWithPlaceIds = 0;
        let dealsWithoutPlaceIds = 0;
        let dealsWithoutAddress = 0;
        
        deals.forEach(deal => {
          if (!deal.Property_Address || !deal.Property_City || !deal.Property_State || !deal.Property_Zip) {
            dealsWithoutAddress++;
          } else if (deal.Coordinates && deal.Coordinates.includes(",")) {
            dealsWithPlaceIds++;
          } else {
            dealsWithoutPlaceIds++;
          }
        });
        
        const summary = `Verification Complete!\n\nTotal Deals: ${deals.length}\n✅ With Place IDs: ${dealsWithPlaceIds}\n❌ Missing Place IDs: ${dealsWithoutPlaceIds}\n⚠️ Missing Address: ${dealsWithoutAddress}`;
        
        setPlaceIdStatus(summary);
        
        // Show alert with detailed summary and migration option if needed
        if (dealsWithoutPlaceIds > 0) {
          const eligibleDeals = deals.filter(deal => 
            deal.Property_Address && deal.Property_City && deal.Property_State && deal.Property_Zip && 
            (!deal.Coordinates || !deal.Coordinates.includes(","))
          );
          
          Alert.alert(
            'Place ID Verification Results',
            `${summary}\n\nWould you like to add Place IDs to the ${dealsWithoutPlaceIds} deals that are missing them?\n\n⚠️ This will make:\n• ${eligibleDeals.length} Google Geocoding API calls\n• ${eligibleDeals.length} Zoho CRM API calls\n\n⏱️ Estimated time: ${Math.ceil(eligibleDeals.length / 10) * 3 + Math.ceil(eligibleDeals.length * 0.1)} seconds with rate limiting.\n\n📊 Rate limiting: 10 geocoding calls/second + 20 Zoho calls/minute`,
            [
              { text: 'No', style: 'cancel' },
              { text: 'Yes', onPress: () => handleAddPlaceIds(eligibleDeals) }
            ]
          );
        } else {
          Alert.alert(
            'Place ID Verification Results',
            summary,
            [{ text: 'OK' }]
          );
        }
        
      } catch (error) {
        console.error('Error verifying Place IDs:', error);
        const errorMessage = `Place ID verification failed: ${(error as any)?.message || "Unknown error"}`;
        setPlaceIdStatus(errorMessage);
        Alert.alert('Error', errorMessage);
      } finally {
        setIsVerifyingPlaceIds(false);
      }
    };

    const handleAddPlaceIds = async (dealsToUpdate: any[]) => {
      if (dealsToUpdate.length === 0) {
        Alert.alert('No Deals to Update', 'All deals already have Place IDs or are missing address information.');
        return;
      }

      setPlaceIdStatus(`Starting Place ID migration for ${dealsToUpdate.length} deals...`);
      
      try {
        const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY;
        if (!GOOGLE_MAPS_API_KEY) {
          throw new Error('Google Maps API key not configured');
        }

        let updated = 0;
        let failed = 0;

        for (let i = 0; i < dealsToUpdate.length; i++) {
          const deal = dealsToUpdate[i];
          setPlaceIdStatus(`Processing ${i + 1} of ${dealsToUpdate.length}: ${deal.Deal_Name}`);
          
          try {
            // Get coordinates using Geocoding API
            const address = `${deal.Property_Address}, ${deal.Property_City}, ${deal.Property_State} ${deal.Property_Zip}`;
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
            } else {
              console.warn(`Geocoding failed for deal ${deal.Deal_Name}: ${data.status}`);
              failed++;
            }
            
            // Rate limiting: Add delay every 10 deals to respect Zoho's 200 calls/minute limit
            if ((i + 1) % 10 === 0 && i < dealsToUpdate.length - 1) {
              setPlaceIdStatus(`Processing ${i + 1} of ${dealsToUpdate.length}: ${deal.Deal_Name}\n\nRate limiting: Pausing for 3 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay every 10 deals
            }
            
            // Google Geocoding API rate limiting: Add small delay between geocoding calls
            // Google allows 50 requests/second, but we'll be conservative with 10 requests/second
            if (i < dealsToUpdate.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay between geocoding calls
            }
          } catch (error) {
            console.error(`Error updating deal ${deal.Deal_Name}:`, error);
            failed++;
          }
        }

        const finalStatus = `Place ID migration complete!\n\n✅ Successfully updated: ${updated} deals\n❌ Failed to update: ${failed} deals`;
        setPlaceIdStatus(finalStatus);
        
        Alert.alert(
          'Migration Complete',
          finalStatus,
          [{ text: 'OK' }]
        );

      } catch (error) {
        console.error('Error during Place ID migration:', error);
        const errorMessage = `Place ID migration failed: ${(error as any)?.message || "Unknown error"}`;
        setPlaceIdStatus(errorMessage);
        Alert.alert('Error', errorMessage);
      }
    };

    const toggleDealStage = (stage: string) => {
      const newStages = settings.visibleDealStages.includes(stage)
        ? settings.visibleDealStages.filter((s: string) => s !== stage)
        : [...settings.visibleDealStages, stage];
      updateSettings({ visibleDealStages: newStages });
    };

    const handleRadiusChange = (value: number) => {
      const roundedValue = roundToQuarterMile(value);
      updateSettings({ routingRadius: roundedValue });
      setCustomRadius(formatRadiusDisplay(roundedValue));
    };

    const handleCustomRadiusSubmit = () => {
      const result = handleRadiusInputChange(customRadius);
      
      if (result.value !== null) {
        handleRadiusChange(result.value);
      } else {
        setCustomRadius(formatRadiusDisplay(settings.routingRadius));
        Alert.alert('Invalid Input', 'Please enter a number between 0.25 and 50 miles');
      }
    };

    const handleCustomRadiusChange = (text: string) => {
      // Allow typing but format on blur
      setCustomRadius(text);
    };

    // Get all available stages from settings context
    const allStages = [
      // Early stage deals (Gold)
      'Initial Contact',
      'New Lead',
      'Qualification',
      'Lead',
      'New',
      '1. Assigned to Agent',
      
      // Nurturing deals (Green)
      'In Progress',
      'Nurturing',
      'Nurture',
      'Development',
      '3. Nurture',
      '3. Check Back',
      
      // Contact attempts (Cyan)
      '2. Attempting to Contact',
      
      // Working offers (Blue)
      '4. Working Offer Made',
      '4. Working Need to Offer',
      
      // Under contract (Blue)
      '6. Under Contract',
      '6. Buyer Assigned',
      'Under Contract',
      'Proposal',
      'Negotiation',
      'Contract',
      'Pending',
      
      // Successful deals (Purple)
      'Closed',
      'Won',
      'Closed Won',
      'Completed',
      'Success',
      '8. Closed: Transaction Done',
      
      // Failed deals (Red)
      'Lost',
      'Cancelled',
      'Closed Lost',
      'Failed',
      'Rejected',
      'Dead Lead/Deal',
      '9. Lost Deal: Unknown',
      '9. Lost Deal: Other Wholesale Company',
      '9. Lost Deal: Auction',
      'Closed Lost to Competition',
      'Out of Foreclosure: Unknown',
      'Out of Foreclosure: Follow Up',
      
      // On hold deals (Orange)
      'On Hold',
      'Hold',
      'Paused',
      'Suspended',
      '5. Limbo',
      
      // Follow up deals (Cyan)
      'Follow Up',
      'Follow-up',
      'Followup',
      'Review',
      'Evaluation',
    ];

    // New: Fetch users from Zoho CRM Users API when dropdown is pressed
    const handleUserDropdownPress = async () => {
      setUserDropdownLoading(true);
      try {
        console.log('ProfileScreen: Fetching all users from Zoho CRM...');
        const users = await zohoService.getAllUsers();
        console.log('ProfileScreen: Users fetched from Zoho:', users);
        // Map ZohoUser to UserData (add type)
        const userDataList = users.map(u => ({ ...u, type: 'Owner' as const }));
        setAvailableUsers(userDataList);
        setIsUserSelectorVisible(true);
      } catch (error) {
        console.error('ProfileScreen: Error fetching users from Zoho:', error);
        Alert.alert('Error', 'Failed to fetch users from Zoho CRM');
      } finally {
        setUserDropdownLoading(false);
      }
    };

    return (
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <TouchableOpacity style={styles.button} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#007AFF" />
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.expandableHeader}
            onPress={() => setIsMapSettingsExpanded(!isMapSettingsExpanded)}
          >
            <Text style={styles.sectionTitle}>Map Settings</Text>
            <Ionicons 
              name={isMapSettingsExpanded ? "chevron-up" : "chevron-down"} 
              size={24} 
              color="#007AFF" 
            />
          </TouchableOpacity>
          
          {isMapSettingsExpanded && (
            <View style={styles.mapSettings}>
              {allStages.map((stage) => (
                <View key={stage} style={styles.settingRow}>
                  <View style={styles.settingContent}>
                    <StageIcon stage={stage} size={24} />
                    <Text style={styles.settingText}>{getStageDisplayName(stage)}</Text>
                  </View>
                  <Switch
                    value={settings.visibleDealStages.includes(stage)}
                    onValueChange={() => toggleDealStage(stage)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Selection</Text>
          <TouchableOpacity
            style={styles.userDropdownButton}
            onPress={handleUserDropdownPress}
            disabled={userDropdownLoading}
          >
            <Text style={styles.userDropdownButtonText}>
              {userDropdownLoading ? 'Loading users...' : getSelectedUserName()}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.primary} />
          </TouchableOpacity>
          
          {/* Load Users Button */}
          <TouchableOpacity 
            style={[styles.loadUsersButton, isLoadingUsers && styles.buttonDisabled]}
            onPress={loadAvailableUsers}
            disabled={isLoadingUsers}
          >
            {isLoadingUsers ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="people" size={16} color="#FFFFFF" />
            )}
            <Text style={styles.loadUsersButtonText}>
              {isLoadingUsers ? 'Loading Users...' : 'Load Available Users'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.userSelectorHelp}>
            Select a user to view their deals and filter map markers
          </Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.expandableHeader}
            onPress={() => setIsDealsExpanded(!isDealsExpanded)}
          >
            <Text style={styles.sectionTitle}>User Deals</Text>
            <Ionicons 
              name={isDealsExpanded ? "chevron-up" : "chevron-down"} 
              size={24} 
              color="#007AFF" 
            />
          </TouchableOpacity>
          
          {isDealsExpanded && (
            <View style={styles.dealsContent}>
              {!selectedUser ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="person-outline" size={48} color="#C7C7CC" />
                  <Text style={styles.emptyText}>No User Selected</Text>
                  <Text style={styles.emptySubtext}>Please select a user to view their deals</Text>
                </View>
              ) : (
                <>
                  {/* Load Deals Button */}
                  <TouchableOpacity 
                    style={[styles.loadDealsButton, isLoadingDeals && styles.buttonDisabled]}
                    onPress={loadUserDeals}
                    disabled={isLoadingDeals}
                  >
                    {isLoadingDeals ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="download" size={16} color="#FFFFFF" />
                    )}
                    <Text style={styles.loadDealsButtonText}>
                      {isLoadingDeals ? 'Loading Deals...' : 'Load User Deals'}
                    </Text>
                  </TouchableOpacity>
                  
                  {isLoadingDeals ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.loadingText}>Loading deals...</Text>
                </View>
              ) : userDeals.length > 0 ? (
                <View>
                  <View style={styles.dealsHeader}>
                    <View style={styles.dealsHeaderLeft}>
                      <Text style={styles.dealsCount}>{userDeals.length} deals found</Text>
                      {dataSource && (
                        <Text style={[styles.dataSourceIndicator, dataSource === 'local' ? styles.localIndicator : styles.serverIndicator]}>
                          {dataSource === 'local' ? '📱 Local' : '🌐 Server'}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity 
                      style={[styles.refreshButton, isRefreshing && styles.buttonDisabled]}
                      onPress={handleDealRefresh}
                      disabled={isRefreshing}
                    >
                      <Ionicons name="refresh" size={16} color="#007AFF" />
                      <Text style={styles.refreshButtonText}>Refresh</Text>
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={userDeals}
                    style={styles.dealsList}
                    renderItem={renderDealItem}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="document-outline" size={48} color="#C7C7CC" />
                  <Text style={styles.emptyText}>No deals found</Text>
                  <Text style={styles.emptySubtext}>This user doesn't have any deals assigned as Owner or Secondary Acquisition</Text>
                </View>
              )}
              
              {/* Place ID Verification Button */}
              {selectedUser && (
                <View style={styles.verificationSection}>
                  <TouchableOpacity 
                    style={[styles.verifyButton, isVerifyingPlaceIds && styles.buttonDisabled]}
                    onPress={handleVerifyPlaceIds}
                    disabled={isVerifyingPlaceIds}
                  >
                    {isVerifyingPlaceIds ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="location" size={16} color="#FFFFFF" />
                    )}
                    <Text style={styles.verifyButtonText}>
                      {isVerifyingPlaceIds ? 'Verifying...' : 'Verify Place IDs'}
                    </Text>
                  </TouchableOpacity>
                  
                  {placeIdStatus && (
                    <Text style={styles.verificationStatus}>{placeIdStatus}</Text>
                  )}
                </View>
              )}

              {/* Local Storage Section */}
              {selectedUser && (
                <View style={styles.localStorageSection}>
                  <Text style={styles.localStorageTitle}>Local Storage</Text>
                  
                  {/* Local Storage Info */}
                  {localDealsInfo && (
                    <View style={styles.localStorageInfo}>
                      <Text style={styles.localStorageInfoText}>
                        📱 {localDealsInfo.count} deals stored locally
                      </Text>
                      <Text style={styles.localStorageInfoText}>
                        📅 Last updated: {new Date(localDealsInfo.lastUpdated).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                  
                  {/* Local Storage Buttons */}
                  <View style={styles.localStorageButtons}>
                    <TouchableOpacity 
                      style={[styles.localStorageButton, styles.saveButton, isSavingLocalDeals && styles.buttonDisabled]}
                      onPress={handleSaveDealsLocally}
                      disabled={isSavingLocalDeals || userDeals.length === 0}
                    >
                      {isSavingLocalDeals ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="save" size={16} color="#FFFFFF" />
                      )}
                      <Text style={styles.localStorageButtonText}>
                        {isSavingLocalDeals ? 'Saving...' : 'Save Locally'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.localStorageButton, styles.loadButton, isLoadingLocalDeals && styles.buttonDisabled]}
                      onPress={handleLoadDealsLocally}
                      disabled={isLoadingLocalDeals || !localDealsInfo}
                    >
                      {isLoadingLocalDeals ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="download" size={16} color="#FFFFFF" />
                      )}
                      <Text style={styles.localStorageButtonText}>
                        {isLoadingLocalDeals ? 'Loading...' : 'Load Local'}
                      </Text>
                    </TouchableOpacity>
                    
                    {localDealsInfo && (
                      <TouchableOpacity 
                        style={[styles.localStorageButton, styles.clearButton]}
                        onPress={handleClearLocalDeals}
                      >
                        <Ionicons name="trash" size={16} color="#FFFFFF" />
                        <Text style={styles.localStorageButtonText}>Clear Local</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <Text style={styles.localStorageHelp}>
                    💾 Data is stored on your device and will be removed when the app is uninstalled
                  </Text>
                </View>
              )}
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Routing Configuration</Text>
          <View style={styles.radiusContainer}>
            <Text style={styles.radiusLabel}>Search Radius: {formatRadiusDisplay(settings.routingRadius)} miles</Text>
            <Slider
              style={styles.slider}
              minimumValue={0.25}
              maximumValue={50}
              step={0.25}
              value={settings.routingRadius}
              onValueChange={handleRadiusChange}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#D1D1D6"
            />
            <TextInput
              style={styles.radiusInput}
              value={customRadius}
              onChangeText={handleCustomRadiusChange}
              onBlur={handleCustomRadiusSubmit}
              keyboardType="decimal-pad"
              placeholder="Enter radius (0.25-50)"
            />
          </View>
        </View>

        {/* User Selection Modal */}
        <Modal
          visible={isUserSelectorVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsUserSelectorVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select User</Text>
                <TouchableOpacity onPress={() => setIsUserSelectorVisible(false)}>
                  <Ionicons name="close" size={24} color="#007AFF" />
                </TouchableOpacity>
              </View>
              
              {isLoadingUsers ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.loadingText}>Loading users...</Text>
                </View>
              ) : (
                <FlatList
                  data={availableUsers}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.userItem,
                        selectedUser?.id === item.id && styles.selectedUserItem
                      ]}
                      onPress={() => handleUserSelect(item.id)}
                    >
                      <View style={styles.userItemContent}>
                        <Text style={styles.userItemName}>{item.name}</Text>
                        <Text style={styles.userItemType}>{item.type}</Text>
                      </View>
                      {selectedUser?.id === item.id && (
                        <Ionicons name="checkmark" size={20} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  )}
                  style={styles.userList}
                />
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  } catch (error: any) {
    console.error('ProfileScreen: Error during initialization:', error);
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          Error loading profile: {error?.message || 'Unknown error occurred'}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginVertical: 8,
    padding: 16,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#000000',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  buttonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#007AFF',
  },
  logoutText: {
    color: '#FF3B30',
  },
  expandableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapSettings: {
    marginTop: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    color: '#000000',
    marginLeft: 8,
  },
  radiusContainer: {
    marginTop: 8,
  },
  radiusLabel: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  radiusInput: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
  dealList: {
    marginTop: 8,
  },
  dealItem: {
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    marginRight: 8,
  },
  dealStage: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#E5E5EA',
  },
  dealAddress: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  dealRole: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  dealsContent: {
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#007AFF',
  },
  dealsList: {
    marginTop: 8,
  },
  dealsCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#000000',
  },
  userSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  userSelectorText: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userSelectorName: {
    fontSize: 16,
    color: '#007AFF',
  },
  userSelectorType: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 8,
  },
  userSelectorHelp: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
  },
  loadUsersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  loadUsersButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadDealsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34A853',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  loadDealsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  userItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userItemName: {
    fontSize: 16,
    color: '#007AFF',
  },
  userItemType: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 8,
  },
  selectedUserItem: {
    backgroundColor: '#E5E5EA',
  },
  userList: {
    maxHeight: '80%',
    marginBottom: 20,
  },
  dealsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  refreshButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
  },
  verificationSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  verifyButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  verificationStatus: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  localStorageSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E8F0',
  },
  localStorageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  localStorageInfo: {
    marginBottom: 12,
  },
  localStorageInfoText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  localStorageButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  localStorageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 2,
  },
  saveButton: {
    backgroundColor: '#28A745',
  },
  loadButton: {
    backgroundColor: '#007AFF',
  },
  clearButton: {
    backgroundColor: '#DC3545',
  },
  localStorageButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  localStorageHelp: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
  },
  dealsHeaderLeft: {
    flex: 1,
  },
  dataSourceIndicator: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  localIndicator: {
    color: '#28A745',
  },
  serverIndicator: {
    color: '#007AFF',
  },
  userDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  userDropdownButtonText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
  },
}); 