import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { zohoService } from '../services/zohoService';
import { colors } from '../theme/colors';
import { ZohoDeal } from '../types/zoho';

const DealOwnersScreen = ({ navigation }: any) => {
  const [deals, setDeals] = useState<ZohoDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await zohoService.getDeals();
      if (response.data) {
        setDeals(response.data);
      }
    } catch (err: any) {
      console.error('Error loading deals:', err);
      setError(err.message || 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerPress = (deal: ZohoDeal) => {
    navigation.navigate('DealsList', { 
      ownerId: deal.Owner?.id,
      ownerName: deal.Owner?.name || 'Unknown Owner'
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDeals}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Group deals by owner
  const ownerDeals = deals.reduce((acc: { [key: string]: ZohoDeal[] }, deal) => {
    const ownerId = deal.Owner?.id || 'unknown';
    if (!acc[ownerId]) {
      acc[ownerId] = [];
    }
    acc[ownerId].push(deal);
    return acc;
  }, {});

  // Convert to array of owner objects with their deals
  const owners = Object.entries(ownerDeals).map(([ownerId, ownerDeals]) => ({
    id: ownerId,
    name: ownerDeals[0].Owner?.name || 'Unknown Owner',
    dealCount: ownerDeals.length
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Deal Owners</Text>
      <FlatList
        data={owners}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.ownerItem}
            onPress={() => handleOwnerPress(deals.find(d => d.Owner?.id === item.id)!)}
          >
            <Text style={styles.ownerName}>{item.name}</Text>
            <Text style={styles.dealCount}>{item.dealCount} deals</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No deal owners found</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  list: {
    gap: 12,
  },
  ownerItem: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  ownerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  dealCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.accent,
    padding: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 32,
  },
});

export default DealOwnersScreen; 