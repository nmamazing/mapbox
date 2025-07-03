import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import DealSearchBox from '../components/DealSearchBox';
import { zohoService } from '../services/zohoService';
import { colors } from '../theme/colors';
import { ZohoDeal } from '../types/zoho';

const HomeScreenv2 = () => {
  const [recentDeals, setRecentDeals] = useState<ZohoDeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Placeholder handler for now
  const handleDealSelect = (deal: any) => {
    // You can navigate or show deal details here
    console.log('Selected deal:', deal);
  };

  const loadRecentDeals = async () => {
    setLoading(true);
    setError(null);
    try {
      const deals = await zohoService.getAllDeals(
        'id,Deal_Name,Stage,Created_Time,Owner',
        'Created_Time',
        'desc',
        undefined,
        5
      );
      setRecentDeals(deals.slice(0, 5));
    } catch (err: any) {
      setError('Failed to load recent deals.');
    } finally {
      setLoading(false);
    }
  };

  const renderDeal = ({ item }: { item: ZohoDeal }) => (
    <TouchableOpacity style={styles.dealItem} onPress={() => handleDealSelect(item)}>
      <View style={styles.dealHeader}>
        <Text style={styles.dealName}>{item.Deal_Name}</Text>
        <Text style={[
          styles.dealStage,
          { color: item.Stage === 'Closed Won' ? colors.accent : colors.textSecondary }
        ]}>
          {item.Stage}
        </Text>
      </View>
      <Text style={styles.dealDate}>
        Created: {new Date(item.Created_Time).toLocaleDateString()}
      </Text>
      <Text style={styles.dealOwner}>
        Owner: {item.Owner?.name || 'N/A'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <DealSearchBox onDealSelect={handleDealSelect} />
      <View style={styles.recentDealsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Deals</Text>
          <TouchableOpacity 
            style={styles.loadButton} 
            onPress={loadRecentDeals}
            disabled={loading}
          >
            <Text style={styles.loadButtonText}>
              {loading ? 'Loading...' : 'Load Recent Deals'}
            </Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : recentDeals.length > 0 ? (
          <FlatList
            data={recentDeals}
            keyExtractor={(item) => item.id}
            renderItem={renderDeal}
            contentContainerStyle={styles.list}
          />
        ) : (
          <Text style={styles.noDealsText}>No deals loaded. Tap "Load Recent Deals" to fetch from Zoho.</Text>
        )}
      </View>
      
      {/* Test Button */}
      <View style={styles.testButtonContainer}>
        <TouchableOpacity style={styles.testButton}>
          <Text style={styles.testButtonText}>Test Screen</Text>
        </TouchableOpacity>
      </View>
      
      {/* Add the rest of your Figma-based layout here */}
      <Text style={styles.text}>HomeScreenv2 (Figma layout goes here)</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 80, // To avoid overlap with the search bar
  },
  recentDealsSection: {
    marginTop: 70, // below search bar
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  loadButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  loadButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    paddingBottom: 8,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  dealStage: {
    fontSize: 14,
    fontWeight: '500',
  },
  dealDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dealOwner: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 8,
  },
  noDealsText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 16,
    fontStyle: 'italic',
  },
  testButtonContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  testButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  testButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreenv2; 