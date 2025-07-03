import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface MapOverlayProps {
  isTracking?: boolean;
  onStartTracking?: () => void;
  onStopTracking?: () => void;
  onMarkHouse?: () => void;
}

export const MapOverlay: React.FC<MapOverlayProps> = ({
  isTracking = false,
  onStartTracking,
  onStopTracking,
  onMarkHouse,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={isTracking ? onStopTracking : onStartTracking}
        >
          <Icon
            name={isTracking ? 'stop-circle' : 'play-circle'}
            size={24}
            color="white"
          />
          <Text style={styles.buttonText}>
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.colors.secondary },
          ]}
          onPress={onMarkHouse}
          disabled={!isTracking}
        >
          <Icon name="home-marker" size={24} color="white" />
          <Text style={styles.buttonText}>Mark House</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    minWidth: 150,
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 