import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';

function parseLatLng(coord: string | undefined): { lat: number; lng: number } | null {
  if (!coord) return null;
  if (coord.startsWith('place_id:')) {
    // Format: place_id:PLACE_ID,lat,lng
    const parts = coord.split(',');
    if (parts.length === 3) {
      const lat = parseFloat(parts[1]);
      const lng = parseFloat(parts[2]);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
  } else if (coord.includes(',')) {
    const [lat, lng] = coord.split(',').map(Number);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }
  return null;
}

// Color mapping for deal stages
const stageColors: Record<string, string> = {
  '1. New': '#2196F3', // blue
  '2. Attempting to Contact': '#FFC107', // amber
  '3. Nurture Stage': '#FF9800', // orange
  '4. Appointment Set': '#4CAF50', // green
  '5. Under Contract': '#9C27B0', // purple
  '6. Closed Won': '#388E3C', // dark green
  '7. Closed Lost': '#F44336', // red
};
const defaultColor = '#607D8B'; // blue-grey

const CompleteMapScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const deals = route.params?.deals || [];

  // Center map on first deal, or default
  const firstCoord = deals.length > 0 ? parseLatLng(deals[0].Coordinates) : { lat: 37.0902, lng: -95.7129 };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>{'< Back'}</Text>
      </TouchableOpacity>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: firstCoord?.lat || 37.0902,
          longitude: firstCoord?.lng || -95.7129,
          latitudeDelta: 5,
          longitudeDelta: 5,
        }}
      >
        {deals.map((deal: any) => {
          const coord = parseLatLng(deal.Coordinates);
          if (!coord) return null;
          const pinColor = stageColors[deal.Stage] || defaultColor;
          return (
            <Marker
              key={deal.id}
              coordinate={{ latitude: coord.lat, longitude: coord.lng }}
              title={deal.Deal_Name}
              description={deal.Stage}
              pinColor={pinColor}
            />
          );
        })}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
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
    fontWeight: 'bold',
  },
});

export default CompleteMapScreen; 