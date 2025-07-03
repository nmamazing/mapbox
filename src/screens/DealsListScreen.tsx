import React, { useEffect, useState, useLayoutEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Pressable
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useUser } from '../contexts/UserContext';
import { useSettings } from '../contexts/SettingsContext';
import StageIcon from '../components/StageIcon';
import { Ionicons } from '@expo/vector-icons';

// Define the deals stack param list
type DealsStackParamList = {
  DealsList: undefined;
  DealDetails: { deal: any };
};

type DealsListScreenProps = {
  route?: RouteProp<DealsStackParamList, 'DealsList'>;
};

const HEADER_BLUE = colors.primary;
const BUTTON_WIDTH = 140;
const BUTTON_HEIGHT = 44;
const BUTTON_MARGIN = 12;

export default function DealsListScreen({ route }: DealsListScreenProps = {}) {
  const navigation = useNavigation<StackNavigationProp<DealsStackParamList>>();
  const { selectedUser } = useUser();
  const { settings, getStageDisplayName, getStageIcon } = useSettings();
  const [loading, setLoading] = useState(true);
  const [dealsCount, setDealsCount] = useState(0);
  const [search, setSearch] = useState('');
  const [allDeals, setAllDeals] = useState<any[]>([]); // All deals for the user
  const [filteredDeals, setFilteredDeals] = useState<any[]>([]); // Filtered by search and stage
  const [selectedStages, setSelectedStages] = useState<string[]>([]); // Multi-select
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const buttonAnim = useRef(new Animated.Value(-BUTTON_WIDTH * 2 - BUTTON_MARGIN)).current;

  useLayoutEffect(() => {
    if (selectedUser) {
      navigation.setOptions({
        headerTitle: () => (
          <View>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#000' }}>Deals</Text>
            <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>Viewing deals for {selectedUser.name}</Text>
          </View>
        ),
      });
    }
  }, [navigation, selectedUser]);

  useEffect(() => {
    // Don't automatically fetch deals from Zoho API
    // Deals will be loaded manually or through other means
    setLoading(false);
  }, [selectedUser]);

  useEffect(() => {
    // Filter deals by selected stages and search
    let deals = allDeals;
    if (selectedStages.length > 0) {
      deals = deals.filter(deal => selectedStages.includes(deal.Stage));
    }
    if (search.trim()) {
      deals = deals.filter(deal =>
        deal.Deal_Name.toLowerCase().includes(search.trim().toLowerCase()) ||
        deal.Address.toLowerCase().includes(search.trim().toLowerCase())
      );
    }
    setFilteredDeals(deals);
    setDealsCount(deals.length);
  }, [allDeals, selectedStages, search]);

  // Animate buttons in/out when selectedDealId changes
  useEffect(() => {
    if (selectedDealId !== null) {
      Animated.spring(buttonAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(buttonAnim, {
        toValue: -BUTTON_WIDTH * 2 - BUTTON_MARGIN,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedDealId]);

  console.log('DealsListScreen: Rendering component, selectedUser:', selectedUser?.name, 'loading:', loading);

  if (!selectedUser) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No User Selected</Text>
          <Text style={styles.emptyStateSubtext}>
            Please select a user from the Profile tab to view their deals
          </Text>
        </View>
      </View>
    );
  }

  // Handle chip toggle
  const toggleStage = (stage: string) => {
    setSelectedStages(prev =>
      prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]
    );
  };

  // Deselect on background press
  const handleBackgroundPress = () => {
    setSelectedDealId(null);
  };

  // Actions
  const handleDealDetails = (deal: any) => {
    console.log('DealsListScreen: handleDealDetails called with deal:', deal);
    console.log('DealsListScreen: Navigating to DealDetails');
    navigation.navigate('DealDetails', { deal });
  };
  
  const handleRouteTo = (deal: any) => {
    // TODO: Implement navigation or modal
    alert(`Route To ${deal.Deal_Name}`);
  };

  return (
    <Pressable style={styles.container} onPress={handleBackgroundPress}>
      {/* Blue Header with search and filter chips */}
      <View style={styles.blueHeader}>
        <View style={styles.searchBarWrapper}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchBar}
            placeholder="Search deals by name or address..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#888"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer} contentContainerStyle={styles.filtersContent}>
          {settings.visibleDealStages.map(stage => {
            const { color } = getStageIcon(stage);
            const displayName = getStageDisplayName(stage);
            const selected = selectedStages.includes(stage);
            return (
              <TouchableOpacity
                key={stage}
                style={[styles.chip, { backgroundColor: selected ? color : '#fff', borderColor: color }, selected && styles.chipSelected]}
                onPress={() => toggleStage(stage)}
                activeOpacity={0.7}
              >
                <StageIcon stage={stage} size={18} />
                <Text style={[styles.chipText, { color: selected ? '#fff' : color }]}>{displayName}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      {/* Main Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading deals...</Text>
        </View>
      ) : allDeals.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyStateText}>No Deals Loaded</Text>
          <Text style={styles.emptyStateSubtext}>
            Deals will be loaded when available
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.dealsList} contentContainerStyle={{ paddingBottom: 16 }}>
          {filteredDeals.length === 0 ? (
            <Text style={styles.placeholder}>No deals match your filters</Text>
          ) : (
            filteredDeals.map((deal, idx) => {
              const iconConfig = getStageIcon(deal.Stage);
              const displayName = getStageDisplayName(deal.Stage);
              const isSelected = selectedDealId === deal.id;
              return (
                <View key={deal.id} style={[styles.dealCard, isSelected && { borderColor: HEADER_BLUE, borderWidth: 2 }]}
                >
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={e => {
                      e.stopPropagation();
                      setSelectedDealId(isSelected ? null : deal.id);
                    }}
                    style={{ flex: 1 }}
                  >
                    <View style={styles.dealCardHeader}>
                      <StageIcon stage={deal.Stage} size={22} />
                      <Text style={styles.dealCardTitle}>{deal.Deal_Name}</Text>
                      <View style={[styles.stagePill, { backgroundColor: iconConfig.color + '22' }]}> 
                        <Text style={[styles.stagePillText, { color: iconConfig.color }]}>{displayName}</Text>
                      </View>
                    </View>
                    <Text style={styles.dealCardAddress}>{deal.Address}</Text>
                    <View style={styles.dealCardFooter}>
                      <Ionicons name="time-outline" size={16} color="#888" style={{ marginRight: 4 }} />
                      <Text style={styles.dealCardEta}>{Math.floor(deal.etaMins / 60)}h {deal.etaMins % 60} min</Text>
                      <Text style={styles.dealCardEtaLabel}>  ETA: <Text style={styles.dealCardEtaTime}>{deal.eta}</Text></Text>
                    </View>
                  </TouchableOpacity>
                  {/* Animated Action Buttons */}
                  {isSelected && (
                    <Animated.View style={[styles.animatedButtons, { transform: [{ translateX: buttonAnim }] }]}
                    >
                      <TouchableOpacity style={[styles.actionButton, { backgroundColor: HEADER_BLUE }]} onPress={() => handleDealDetails(deal)}>
                        <Ionicons name="information-circle-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.actionButtonText}>Deal Details</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionButton, { backgroundColor: HEADER_BLUE }]} onPress={() => handleRouteTo(deal)}>
                        <Ionicons name="navigate-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.actionButtonText}>Route To</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  blueHeader: {
    backgroundColor: colors.primary,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 10,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 4,
    marginTop: 0,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchBar: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 16,
    fontSize: 16,
    color: '#000',
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  filtersContainer: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingBottom: 0,
    minHeight: 40,
  },
  filtersContent: {
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 4,
    backgroundColor: '#fff',
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chipText: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  dealsList: {
    flex: 1,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  placeholder: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 32,
  },
  dealCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
    borderColor: 'transparent',
    borderWidth: 2,
    overflow: 'visible',
  },
  dealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dealCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginLeft: 8,
    flex: 1,
  },
  stagePill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  stagePillText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  dealCardAddress: {
    fontSize: 15,
    color: '#666',
    marginBottom: 6,
    marginLeft: 2,
  },
  dealCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginLeft: 2,
  },
  dealCardEta: {
    fontSize: 14,
    color: '#888',
    marginRight: 8,
  },
  dealCardEtaLabel: {
    fontSize: 14,
    color: '#888',
  },
  dealCardEtaTime: {
    color: '#FFA000',
    fontWeight: 'bold',
    fontSize: 15,
  },
  animatedButtons: {
    position: 'absolute',
    left: 0,
    top: '50%',
    flexDirection: 'row',
    transform: [{ translateY: -BUTTON_HEIGHT / 2 }],
    zIndex: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    borderRadius: 22,
    marginRight: BUTTON_MARGIN,
    backgroundColor: HEADER_BLUE,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 16,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
}); 