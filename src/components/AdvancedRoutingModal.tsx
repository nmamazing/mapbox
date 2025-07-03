import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { colors } from '../theme/colors';
import { useSettings } from '../contexts/SettingsContext';
import { mapboxService } from '../services/mapboxService';
import { googleDirectionsService } from '../services/googleDirectionsService';
import { 
  roundToQuarterMile, 
  formatRadiusDisplay, 
  validateAndFormatRadius,
  handleRadiusSliderChange,
  handleRadiusInputChange
} from '../utils/radiusUtils';

const { width: screenWidth } = Dimensions.get('window');

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

interface AdvancedRoutingModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDeal: Deal | null;
  allDeals: Deal[];
  userLocation: { latitude: number; longitude: number } | null;
  onRouteOptimized?: (routeData: {
    coordinates: Array<[number, number]>;
    totalDistance: string;
    totalDuration: string;
    waypointOrder: number[];
    deals: Deal[];
  }) => void;
}

export default function AdvancedRoutingModal({
  visible,
  onClose,
  selectedDeal,
  allDeals,
  userLocation,
  onRouteOptimized,
}: AdvancedRoutingModalProps) {
  const { settings, updateSettings } = useSettings();
  const [radius, setRadius] = useState(settings.routingRadius);
  const [customRadius, setCustomRadius] = useState(formatRadiusDisplay(radius));
  const [activeFilters, setActiveFilters] = useState<{[key: string]: boolean}>({});
  const [availableStages, setAvailableStages] = useState<string[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [dealsInRadius, setDealsInRadius] = useState<Deal[]>([]);
  const [filteredDealsInRadius, setFilteredDealsInRadius] = useState<Deal[]>([]);

  // Initialize filters when modal opens
  useEffect(() => {
    if (visible && allDeals.length > 0) {
      initializeFilters();
      calculateDealsInRadius();
    }
  }, [visible, allDeals, radius]);

  const initializeFilters = () => {
    // Get unique stages from all deals
    const stages = [...new Set(allDeals.map(deal => deal.Stage).filter(Boolean))];
    const sortedStages = sortStages(stages);
    setAvailableStages(sortedStages);
    
    // Initialize filters - default to only "Nurture" selected
    const newFilters: {[key: string]: boolean} = {};
    sortedStages.forEach(stage => {
      newFilters[stage] = stage.toLowerCase().includes('nurture');
    });
    setActiveFilters(newFilters);
  };

  const sortStages = (stages: string[]) => {
    const stageOrder = [
      '1. Assigned to Agent',
      '2. Attempting to Contact', 
      '3. Nurture',
      '3. Check Back',
      '4. Working Offer Made',
      '4. Working Need to Offer',
      '5. Limbo',
      '6. Under Contract',
      '6. Buyer Assigned',
      '8. Closed: Transaction Done',
      'Dead Lead/Deal',
      '9. Lost Deal: Unknown',
      '9. Lost Deal: Other Wholesale Company',
      '9. Lost Deal: Auction',
      'Closed Lost to Competition',
      'Closed Lost',
      'Out of Foreclosure: Unknown',
      'Out of Foreclosure: Follow Up',
      // Additional common stages
      'New Lead',
      'Contact Made', 
      'Qualified',
      'Proposal Sent',
      'Negotiation',
      'Closed Won',
      'Nurture',
      'Follow Up',
      'Under Contract',
      'Pending',
      'Active',
      'Inactive'
    ];
    
    return stages.sort((a, b) => {
      const aIndex = stageOrder.findIndex(s => s.toLowerCase() === a.toLowerCase());
      const bIndex = stageOrder.findIndex(s => s.toLowerCase() === b.toLowerCase());
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  };

  const calculateDealsInRadius = () => {
    if (!userLocation || !allDeals.length) {
      setDealsInRadius([]);
      setFilteredDealsInRadius([]);
      return;
    }

    const radiusInMeters = radius * 1609.34; // Convert miles to meters
    const dealsInRange = allDeals.filter(deal => {
      if (!deal.coordinates) return false;
      
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        deal.coordinates.lat,
        deal.coordinates.lng
      );
      
      return distance <= radiusInMeters;
    });

    setDealsInRadius(dealsInRange);
    
    // Apply filters to deals in radius
    const filtered = dealsInRange.filter(deal => activeFilters[deal.Stage] !== false);
    setFilteredDealsInRadius(filtered);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const toggleFilter = (stage: string) => {
    const newFilters = {
      ...activeFilters,
      [stage]: !activeFilters[stage]
    };
    setActiveFilters(newFilters);
    
    // Update filtered deals
    const filtered = dealsInRadius.filter(deal => newFilters[deal.Stage] !== false);
    setFilteredDealsInRadius(filtered);
  };

  const handleRadiusChange = (value: number) => {
    const quarterMileValue = handleRadiusSliderChange(value);
    setRadius(quarterMileValue);
    setCustomRadius(formatRadiusDisplay(quarterMileValue));
    updateSettings({ routingRadius: quarterMileValue });
  };

  const handleCustomRadiusSubmit = () => {
    const result = handleRadiusInputChange(customRadius);
    
    if (result.value !== null) {
      handleRadiusChange(result.value);
    } else {
      setCustomRadius(formatRadiusDisplay(radius));
      Alert.alert('Invalid Input', 'Please enter a number between 0.25 and 50 miles');
    }
  };

  const handleCustomRadiusChange = (text: string) => {
    // Allow typing but format on blur
    setCustomRadius(text);
  };

  const handleOptimizeRoute = async () => {
    if (!userLocation || filteredDealsInRadius.length === 0) {
      Alert.alert('No Deals', 'No deals found within the radius matching your filters.');
      return;
    }

    setIsOptimizing(true);
    try {
      // Prepare waypoints for Google Directions API
      const waypoints = filteredDealsInRadius.map(deal => 
        [deal.coordinates!.lat, deal.coordinates!.lng] as [number, number]
      );

      // Use Google Directions API for optimization
      const optimizedRoute = await googleDirectionsService.getOptimizedRoute(
        [userLocation.latitude, userLocation.longitude], // Origin
        [userLocation.latitude, userLocation.longitude], // Destination (return to start)
        waypoints
      );

      if (optimizedRoute) {
        // Call the callback to display route on map
        if (onRouteOptimized) {
          onRouteOptimized({
            coordinates: optimizedRoute.coordinates,
            totalDistance: optimizedRoute.totalDistance,
            totalDuration: optimizedRoute.totalDuration,
            waypointOrder: optimizedRoute.waypointOrder,
            deals: filteredDealsInRadius
          });
        }

        Alert.alert(
          'Route Optimized',
          `Found ${filteredDealsInRadius.length} deals in ${formatRadiusDisplay(radius)} mile radius.\n\nTotal Distance: ${optimizedRoute.totalDistance}\nTotal Duration: ${optimizedRoute.totalDuration}\n\nRoute will be displayed on the map.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'View Route', onPress: () => {
              onClose();
              // The route will be displayed on the map via the callback
            }}
          ]
        );
      } else {
        // Fallback to simple route without optimization
        const simpleRoute = await googleDirectionsService.getSimpleRoute(
          [userLocation.latitude, userLocation.longitude],
          [userLocation.latitude, userLocation.longitude],
          waypoints
        );

        if (simpleRoute && onRouteOptimized) {
          onRouteOptimized({
            coordinates: simpleRoute.coordinates,
            totalDistance: simpleRoute.totalDistance,
            totalDuration: simpleRoute.totalDuration,
            waypointOrder: simpleRoute.waypointOrder,
            deals: filteredDealsInRadius
          });

          Alert.alert(
            'Route Created',
            `Created route for ${filteredDealsInRadius.length} deals.\n\nTotal Distance: ${simpleRoute.totalDistance}\nTotal Duration: ${simpleRoute.totalDuration}\n\nRoute will be displayed on the map.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'View Route', onPress: () => {
                onClose();
              }}
            ]
          );
        } else {
          Alert.alert('Error', 'Failed to create route. Please check your Google Maps API key.');
        }
      }
    } catch (error) {
      console.error('Error optimizing route:', error);
      Alert.alert('Error', 'Failed to optimize route. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleExpandRadius = () => {
    Alert.prompt(
      'Expand Radius',
      'Enter new radius in miles:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: (newRadius) => {
          const result = handleRadiusInputChange(newRadius || '');
          if (result.value !== null && result.value > radius) {
            handleRadiusChange(result.value);
          } else {
            Alert.alert('Invalid Input', 'Please enter a number greater than current radius and up to 50 miles.');
          }
        }}
      ],
      'plain-text',
      formatRadiusDisplay(radius + 5)
    );
  };

  const handleDisableFilters = () => {
    // Check if there are deals in radius but filtered out
    const filteredOutDeals = dealsInRadius.filter(deal => !activeFilters[deal.Stage]);
    
    if (filteredOutDeals.length > 0) {
      Alert.alert(
        'Deals Filtered Out',
        `Found ${filteredOutDeals.length} deals in radius that are currently filtered out.\n\nWould you like to disable filters to include these deals?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Disable Filters', onPress: () => {
            // Enable all filters
            const newFilters: {[key: string]: boolean} = {};
            availableStages.forEach(stage => {
              newFilters[stage] = true;
            });
            setActiveFilters(newFilters);
            setFilteredDealsInRadius(dealsInRadius);
          }},
          { text: 'Use Direct Route', onPress: () => {
            // Close modal and use direct route to selected deal
            onClose();
            if (selectedDeal) {
              // This would trigger direct route to selected deal
              console.log('Using direct route to:', selectedDeal.Deal_Name);
            }
          }}
        ]
      );
    } else {
      Alert.alert(
        'No Deals in Radius',
        'No deals found within the current radius, even with all filters enabled.',
        [
          { text: 'Expand Radius', onPress: handleExpandRadius },
          { text: 'Use Direct Route', onPress: () => {
            onClose();
            if (selectedDeal) {
              console.log('Using direct route to:', selectedDeal.Deal_Name);
            }
          }}
        ]
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Advanced Routing</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Radius Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Search Radius</Text>
              <View style={styles.radiusContainer}>
                <Text style={styles.radiusLabel}>{formatRadiusDisplay(radius)} miles</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0.25}
                  maximumValue={50}
                  step={0.25}
                  value={radius}
                  onValueChange={handleRadiusChange}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.border}
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

            {/* Deal Filters Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Deal Filters</Text>
              <View style={styles.filtersContainer}>
                {availableStages.map((stage) => (
                  <TouchableOpacity
                    key={stage}
                    style={[
                      styles.filterButton,
                      activeFilters[stage] && styles.filterButtonActive
                    ]}
                    onPress={() => toggleFilter(stage)}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      activeFilters[stage] && styles.filterButtonTextActive
                    ]}>
                      {getStageDisplayName(stage)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Results Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Results</Text>
              <View style={styles.resultsContainer}>
                <Text style={styles.resultsText}>
                  Deals in {formatRadiusDisplay(radius)} mile radius: {dealsInRadius.length}
                </Text>
                <Text style={styles.resultsText}>
                  After filtering: {filteredDealsInRadius.length}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              {filteredDealsInRadius.length === 0 ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleDisableFilters}
                >
                  <Text style={styles.actionButtonText}>No Deals Found - Check Options</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={handleOptimizeRoute}
                  disabled={isOptimizing}
                >
                  {isOptimizing ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Ionicons name="navigate" size={20} color={colors.white} />
                  )}
                  <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
                    {isOptimizing ? 'Optimizing...' : `Optimize Route (${filteredDealsInRadius.length} deals)`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const getStageDisplayName = (stage: string) => {
  const stageMap: {[key: string]: string} = {
    'New Lead': 'New',
    'Contact Made': 'Contact',
    'Proposal Sent': 'Proposal',
    'Closed Won': 'Won',
    'Closed Lost': 'Lost',
    'Under Contract': 'Contract',
    'Follow Up': 'Follow Up',
    'Nurture': 'Nurture',
    'Active': 'Active',
    'Inactive': 'Inactive',
    'Pending': 'Pending',
    // Out of foreclosure deals - treated as Stage 9 Lost Deal
    'Out of Foreclosure: Unknown': 'Lost Deal',
    'Out of Foreclosure: Follow Up': 'Lost Deal',
    // Additional stage mappings
    '1. Assigned to Agent': 'Assigned',
    '2. Attempting to Contact': 'Contact',
    '3. Nurture': 'Nurture',
    '3. Check Back': 'Check Back',
    '4. Working Offer Made': 'Working Offer',
    '4. Working Need to Offer': 'Need Offer',
    '5. Limbo': 'Limbo',
    '6. Under Contract': 'Under Contract',
    '6. Buyer Assigned': 'Buyer Assigned',
    '8. Closed: Transaction Done': 'Closed',
    '9. Lost Deal: Unknown': 'Lost Deal',
    '9. Lost Deal: Other Wholesale Company': 'Lost Deal',
    '9. Lost Deal: Auction': 'Lost Deal',
    'Dead Lead/Deal': 'Dead Lead',
    'Closed Lost to Competition': 'Lost Deal'
  };
  
  return stageMap[stage] || stage;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 5,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 15,
  },
  radiusContainer: {
    alignItems: 'center',
  },
  radiusLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  radiusInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    width: '100%',
    marginTop: 10,
    fontSize: 16,
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  resultsContainer: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 10,
  },
  resultsText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 5,
  },
  actionsContainer: {
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 10,
  },
  primaryButtonText: {
    color: colors.white,
  },
}); 