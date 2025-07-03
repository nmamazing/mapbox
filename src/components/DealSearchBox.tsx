import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { zohoService } from '../services/zohoService';
import { Lead } from '../types';

interface DealSearchBoxProps {
  onDealSelect: (deal: Lead) => void;
}

const DealSearchBox: React.FC<DealSearchBoxProps> = ({ onDealSelect }) => {
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout>();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  const searchDeals = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const deals = await zohoService.getDeals(
        'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_Zip,US_State',
        'Created_Time',
        'desc',
        `(Property_Address:contains:${query}*)`
      );

      if (deals?.data) {
        setSuggestions(deals.data);
      }
    } catch (error) {
      console.error('Error searching deals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    setShowSuggestions(true);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (text.length >= 3) {
      searchTimeout.current = setTimeout(() => {
        searchDeals(text);
      }, 300); // Debounce for 300ms
    } else {
      setSuggestions([]);
    }
  };

  const handleDealSelect = (deal: Lead) => {
    setSearchText(deal.address || '');
    setShowSuggestions(false);
    onDealSelect(deal);
    inputRef.current?.blur();
  };

  const renderSuggestion = ({ item }: { item: Lead }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleDealSelect(item)}
    >
      <Text style={styles.suggestionText} numberOfLines={1}>
        {item.address}
      </Text>
      <Text style={styles.suggestionSubtext} numberOfLines={1}>
        {item.name} • {item.status}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder="Search My Deals"
          placeholderTextColor={colors.textSecondary}
          value={searchText}
          onChangeText={handleSearchChange}
          onFocus={() => setShowSuggestions(true)}
        />
        {isLoading && (
          <ActivityIndicator
            style={styles.loader}
            color={colors.primary}
            size="small"
          />
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            style={styles.suggestionsList}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: colors.background,
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    padding: 0,
  },
  loader: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    marginTop: 4,
    backgroundColor: colors.white,
    borderRadius: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 300,
  },
  suggestionsList: {
    borderRadius: 8,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary,
  },
  suggestionText: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  suggestionSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default DealSearchBox; 