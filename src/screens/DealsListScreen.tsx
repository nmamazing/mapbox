import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Platform, Linking, Modal, Pressable, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation';
import { zohoService, getDealCoordinates, saveDealsToStorage, loadDealsFromStorage } from '../services/zohoService';
import { colors } from '../theme/colors';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

type DealsListScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DealsList'>;
  route: RouteProp<RootStackParamList, 'DealsList'>;
};

export default function DealsListScreen({ navigation, route }: DealsListScreenProps) {
  const { ownerId, ownerName } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  // Filter states
  const [stage, setStage] = useState<string>('');
  const [allStages, setAllStages] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [selectedDeal, setSelectedDeal] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [routing, setRouting] = useState(false);
  const [closestDeals, setClosestDeals] = useState<Array<{deal: any, distance: number}>>([]);
  const [showClosestDeals, setShowClosestDeals] = useState(false);
  const [selectedClosestDeals, setSelectedClosestDeals] = useState<{ [id: string]: boolean }>({});

  useEffect(() => {
    loadDeals();
  }, [ownerId, stage, startDate, endDate]);

  useEffect(() => {
    if (showClosestDeals && closestDeals.length > 0) {
      const initialSelected: { [id: string]: boolean } = {};
      closestDeals.forEach(({ deal }) => {
        initialSelected[deal.id] = true;
      });
      setSelectedClosestDeals(initialSelected);
    }
  }, [showClosestDeals, closestDeals]);

  const loadDeals = async () => {
    try {
      setLoading(true);
      setError(null);
      // 1. Try to load from AsyncStorage first
      const cachedDeals = await loadDealsFromStorage();
      if (cachedDeals && Array.isArray(cachedDeals)) {
        let filteredDeals = cachedDeals;
        if (ownerId) {
          filteredDeals = filteredDeals.filter(
            d => d.Owner?.id === ownerId || d.Owner?.name === ownerName || d.Secondary_Acquisition === ownerName
          );
        }
        if (stage) {
          filteredDeals = filteredDeals.filter(d => d.Stage === stage);
        }
        if (startDate) {
          filteredDeals = filteredDeals.filter(d => {
            if (!d.Created_Time) return false;
            const created = new Date(d.Created_Time);
            return created >= startDate;
          });
        }
        if (endDate) {
          filteredDeals = filteredDeals.filter(d => {
            if (!d.Created_Time) return false;
            const created = new Date(d.Created_Time);
            return created <= endDate;
          });
        }
        setDeals(filteredDeals);
        setTotal(filteredDeals.length);
        // Extract unique stages
        const uniqueStages: string[] = Array.from(new Set(cachedDeals.map((d: any) => d.Stage).filter((s: any): s is string => typeof s === 'string')));
        setAllStages(uniqueStages);
      }
      // 2. Fetch from Zoho in the background and update AsyncStorage
      zohoService.getAllDeals(
        'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_Zip,US_State',
        'Created_Time',
        'desc'
      ).then(async (allDeals) => {
        await saveDealsToStorage(allDeals);
        let filteredDeals = allDeals;
        if (ownerId) {
          filteredDeals = filteredDeals.filter(
            d => d.Owner?.id === ownerId || d.Owner?.name === ownerName || d.Secondary_Acquisition === ownerName
          );
        }
        if (stage) {
          filteredDeals = filteredDeals.filter(d => d.Stage === stage);
        }
        if (startDate) {
          filteredDeals = filteredDeals.filter(d => {
            if (!d.Created_Time) return false;
            const created = new Date(d.Created_Time);
            return created >= startDate;
          });
        }
        if (endDate) {
          filteredDeals = filteredDeals.filter(d => {
            if (!d.Created_Time) return false;
            const created = new Date(d.Created_Time);
            return created <= endDate;
          });
        }
        setDeals(filteredDeals);
        setTotal(filteredDeals.length);
        // Extract unique stages
        const uniqueStages: string[] = Array.from(new Set(allDeals.map((d: any) => d.Stage).filter((s: any): s is string => typeof s === 'string')));
        setAllStages(uniqueStages);
      }).catch((err) => {
        console.error('Error fetching deals from Zoho:', err);
      }).finally(() => {
        setLoading(false);
      });
      // If we loaded from cache, stop loading spinner
      if (cachedDeals) setLoading(false);
    } catch (err) {
      setError('Failed to load deals. Please try again.');
      console.error('Error loading deals:', err);
      setLoading(false);
    }
  };

  // Date picker handlers
  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selectedDate) setStartDate(selectedDate);
  };
  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selectedDate) setEndDate(selectedDate);
  };

  const handleDealPress = (deal: any) => {
    setSelectedDeal(deal);
    setModalVisible(true);
  };

  const handleRouteToAddress = () => {
    if (!selectedDeal) return;
    const address = `${selectedDeal.Property_Address}, ${selectedDeal.Property_City}, ${selectedDeal.US_State} ${selectedDeal.Property_Zip}`;
    const url = Platform.select({
      ios: `maps://?daddr=${encodeURIComponent(address)}`,
      android: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
    });
    Linking.openURL(url!);
    setModalVisible(false);
  };

  // Helper to get lat,lng from Coordinates field
  function getPlaceOrLatLng(coord: string | undefined) {
    if (!coord) return '';
    if (coord.startsWith('place_id:')) {
      // Format: place_id:PLACE_ID,lat,lng
      const [, lat, lng] = coord.split(',');
      return `${lat},${lng}`;
    } else {
      return coord; // already in lat,lng format
    }
  }

  const handleRouteNurture = async () => {
    if (!selectedDeal) return;
    setRouting(true);
    try {
      console.log('Starting Route + Nurture for deal:', selectedDeal.Deal_Name);
      console.log('Total deals loaded:', deals.length);
      // 1. Get coordinates for the selected deal
      const mainCoords = await getDealCoordinates(selectedDeal);
      if (!mainCoords) throw new Error('Could not get coordinates for main address');
      console.log('Main deal coordinates:', mainCoords);
      
      // 2. Find all deals in any Nurture stage for the selected owner (excluding the selected deal)
      const nurtureStageDeals = deals.filter(d => d.Stage && d.Stage.toLowerCase().includes('nurture'));
      console.log('Deals with "nurture" in stage:', nurtureStageDeals.length);
      const notSelectedDeal = nurtureStageDeals.filter(d => d.id !== selectedDeal.id);
      console.log('Deals in Nurture Stage (not selected):', notSelectedDeal.length);
      const ownerFiltered = notSelectedDeal.filter(d =>
        d.Owner?.id === ownerId ||
        d.Owner?.name === ownerName ||
        d.Secondary_Acquisition === ownerName
      );
      console.log('Deals after owner filter:', ownerFiltered.length);
      
      // 3. Get coordinates for each nurture deal (skip if missing address)
      const nurtureWithCoords = [];
      for (const deal of ownerFiltered) {
        const coords = await getDealCoordinates(deal);
        if (coords) {
          nurtureWithCoords.push({ deal, coords });
        } else {
          console.log('Deal missing coordinates:', deal.Deal_Name, deal.id);
        }
      }
      console.log('Deals with coordinates:', nurtureWithCoords.length);
      
      // 4. Find the 10 closest nurture deals
      function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
        const toRad = (x: number) => (x * Math.PI) / 180;
        const R = 3958.8; // miles
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      }
      let sortedNurture = nurtureWithCoords
        .map(n => ({
          deal: n.deal,
          distance: haversine(mainCoords.lat, mainCoords.lng, n.coords.lat, n.coords.lng)
        }))
        .sort((a, b) => a.distance - b.distance);
      // Uncomment to filter by minimum radius, e.g., 50km
      // sortedNurture = sortedNurture.filter(n => n.distance <= 50);
      sortedNurture = sortedNurture.slice(0, 10);
      
      console.log('Sorted closest deals:', sortedNurture.length);
      if (sortedNurture.length > 0) {
        console.log('First closest deal:', sortedNurture[0].deal.Deal_Name, 'Distance:', sortedNurture[0].distance.toFixed(1), 'mi');
      }
      
      setClosestDeals(sortedNurture);
      setShowClosestDeals(true);
      setModalVisible(false);
    } catch (err) {
      console.error('Error in handleRouteNurture:', err);
      alert('Failed to find closest deals: ' + (err as Error).message);
    } finally {
      setRouting(false);
    }
  };

  const handleToggleDeal = (dealId: string) => {
    setSelectedClosestDeals(prev => ({ ...prev, [dealId]: !prev[dealId] }));
  };

  const handleStartRoute = async () => {
    if (!selectedDeal || closestDeals.length === 0) return;
    try {
      const mainCoords = await getDealCoordinates(selectedDeal);
      if (!mainCoords) throw new Error('Could not get coordinates for main address');
      // Only include checked deals
      const checkedDeals = closestDeals.filter(({ deal }) => selectedClosestDeals[deal.id]);
      if (checkedDeals.length === 0) {
        alert('Please select at least one address to include in the route.');
        return;
      }
      // Get coordinates for all checked deals
      const dealsWithCoords = await Promise.all(
        checkedDeals.map(async ({ deal }) => {
          const coords = await getDealCoordinates(deal);
          return coords;
        })
      );
      // Build Google Maps route with optimize:true
      const origin = `${mainCoords.lat},${mainCoords.lng}`;
      const waypoints = dealsWithCoords
        .filter((coords): coords is { lat: number; lng: number } => coords !== null)
        .map(coords => `${coords.lat},${coords.lng}`)
        .join('|');
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${origin}&travelmode=driving&waypoints=optimize:true|${waypoints}`;
      await Linking.openURL(url);
      setShowClosestDeals(false);
    } catch (err) {
      alert('Failed to build route: ' + (err as Error).message);
    }
  };

  // Add a refresh handler
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const allDeals = await zohoService.getAllDeals(
        'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_Zip,US_State',
        'Created_Time',
        'desc'
      );
      await saveDealsToStorage(allDeals);
      let filteredDeals = allDeals;
      if (ownerId) {
        filteredDeals = filteredDeals.filter(
          d => d.Owner?.id === ownerId || d.Owner?.name === ownerName || d.Secondary_Acquisition === ownerName
        );
      }
      if (stage) {
        filteredDeals = filteredDeals.filter(d => d.Stage === stage);
      }
      if (startDate) {
        filteredDeals = filteredDeals.filter(d => {
          if (!d.Created_Time) return false;
          const created = new Date(d.Created_Time);
          return created >= startDate;
        });
      }
      if (endDate) {
        filteredDeals = filteredDeals.filter(d => {
          if (!d.Created_Time) return false;
          const created = new Date(d.Created_Time);
          return created <= endDate;
        });
      }
      setDeals(filteredDeals);
      setTotal(filteredDeals.length);
      // Extract unique stages
      const uniqueStages: string[] = Array.from(new Set(allDeals.map((d: any) => d.Stage).filter((s: any): s is string => typeof s === 'string')));
      setAllStages(uniqueStages);
    } catch (err) {
      setError('Failed to refresh deals. Please try again.');
      console.error('Error refreshing deals:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDeals}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Deals</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
      {/* Filters */}
      <View style={styles.filters}>
        <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.dateInput}>
          <Text style={styles.filterLabel}>Start Date:</Text>
          <Text>{startDate ? startDate.toLocaleDateString() : 'Any'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.dateInput}>
          <Text style={styles.filterLabel}>End Date:</Text>
          <Text>{endDate ? endDate.toLocaleDateString() : 'Any'}</Text>
        </TouchableOpacity>
        {showStartPicker && (
          <DateTimePicker
            value={startDate || new Date()}
            mode="date"
            display="default"
            onChange={onStartDateChange}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={endDate || new Date()}
            mode="date"
            display="default"
            onChange={onEndDateChange}
          />
        )}
        <View style={styles.stagePicker}>
          <Text style={styles.filterLabel}>Stage:</Text>
          <TouchableOpacity
            style={styles.stageDropdown}
            onPress={() => {
              // Cycle through stages for simplicity
              if (allStages.length === 0) return;
              const idx = allStages.indexOf(stage);
              setStage(allStages[(idx + 1) % allStages.length] || '');
            }}
          >
            <Text>{stage || 'Any'}</Text>
          </TouchableOpacity>
          {stage ? (
            <TouchableOpacity onPress={() => setStage('')} style={styles.clearStageBtn}>
              <Text style={{ color: colors.error }}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      {ownerName && (
        <View style={styles.header}>
          <Text style={styles.title}>Deals for {ownerName}</Text>
          <Text style={styles.subtitle}>{total} total deals</Text>
        </View>
      )}
      <FlatList
        data={deals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.dealItem} onPress={() => handleDealPress(item)}>
            <View style={styles.dealHeader}>
              <Text style={styles.dealName}>{item.Deal_Name}</Text>
              <Text style={[
                styles.dealStage,
                { color: item.Stage === 'Closed Won' ? colors.accent : colors.textSecondary }
              ]}>
                {item.Stage}
              </Text>
            </View>
            <Text style={styles.dealAddress}>
              {item.Property_Address}, {item.Property_City}, {item.US_State} {item.Property_Zip}
            </Text>
            <Text style={styles.dealDate}>
              Created: {new Date(item.Created_Time).toLocaleDateString()}
            </Text>
            <Text style={styles.dealRole}>
              Role: {item.Owner?.id === ownerId ? 'Primary Owner' : 'Secondary Acquisition'}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
      />
      {/* Modal for deal actions */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Deal Actions</Text>
            <Text style={styles.modalDealName}>{selectedDeal?.Deal_Name}</Text>
            <Pressable style={styles.modalButton} onPress={handleRouteToAddress}>
              <Text style={styles.modalButtonText}>Route to Address</Text>
            </Pressable>
            <Pressable style={styles.modalButton} onPress={handleRouteNurture} disabled={routing}>
              <Text style={styles.modalButtonText}>{routing ? 'Finding Closest Deals...' : 'Route + Nurture'}</Text>
            </Pressable>
            <Pressable style={styles.modalCancel} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal for closest deals */}
      <Modal
        visible={showClosestDeals}
        transparent
        animationType="slide"
        onRequestClose={() => setShowClosestDeals(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Closest Nurture Deals</Text>
            {closestDeals.length === 0 ? (
              <Text style={styles.noDealsText}>No nurture deals found nearby</Text>
            ) : (
              <ScrollView style={styles.closestDealsList}>
                {closestDeals.map(({ deal, distance }, index) => (
                  <View key={deal.id} style={styles.closestDealItem}>
                    <View style={styles.checkboxRow}>
                      <TouchableOpacity onPress={() => handleToggleDeal(deal.id)} style={styles.jsCheckbox}>
                        {selectedClosestDeals[deal.id] ? (
                          <Ionicons name="checkbox" size={24} color={colors.primary} />
                        ) : (
                          <Ionicons name="square-outline" size={24} color={colors.textSecondary} />
                        )}
                      </TouchableOpacity>
                      <Text style={styles.closestDealName}>{deal.Deal_Name}</Text>
                    </View>
                    <Text style={styles.closestDealAddress}>
                      {deal.Property_Address}, {deal.Property_City}, {deal.US_State} {deal.Property_Zip}
                    </Text>
                    <Text style={styles.closestDealDistance}>
                      {distance.toFixed(1)} mi away
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
            <View style={styles.closestDealsButtons}>
              <Pressable 
                style={[styles.modalButton, closestDeals.length === 0 && styles.disabledButton]} 
                onPress={handleStartRoute}
                disabled={closestDeals.length === 0}
              >
                <Text style={styles.modalButtonText}>Start Route</Text>
              </Pressable>
              <Pressable style={styles.modalCancel} onPress={() => setShowClosestDeals(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.8,
  },
  list: {
    padding: 16,
  },
  dealItem: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dealName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  dealStage: {
    fontSize: 14,
    fontWeight: '500',
  },
  dealAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dealDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dealRole: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '500',
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: colors.card,
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateInput: {
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    marginRight: 8,
    minWidth: 120,
  },
  filterLabel: {
    fontWeight: 'bold',
    fontSize: 12,
    color: colors.textSecondary,
  },
  stagePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stageDropdown: {
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    marginLeft: 4,
    minWidth: 80,
  },
  clearStageBtn: {
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    padding: 24,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.text,
  },
  modalDealName: {
    fontSize: 16,
    marginBottom: 16,
    color: colors.textSecondary,
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 8,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancel: {
    marginTop: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: 'bold',
  },
  closestDealsList: {
    width: '100%',
    marginVertical: 16,
  },
  closestDealItem: {
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  closestDealName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  closestDealAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  closestDealDistance: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '500',
  },
  closestDealsButtons: {
    width: '100%',
    marginTop: 8,
  },
  noDealsText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
  refreshButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  jsCheckbox: {
    marginRight: 8,
  },
  testButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
}); 