import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation';
import * as ImagePicker from 'expo-image-picker';
import { zohoService } from '../services/zohoService';

type PhotoScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Photo'>;
  route: RouteProp<RootStackParamList, 'Photo'>;
};

const PhotoScreen: React.FC<PhotoScreenProps> = ({ navigation, route }) => {
  const { leadId } = route.params;
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos');
      navigation.goBack();
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const uploadPhoto = async () => {
    if (!photo) {
      Alert.alert('Error', 'Please take a photo first');
      return;
    }

    setUploading(true);
    try {
      await zohoService.uploadPhoto(leadId, photo);
      Alert.alert('Success', 'Photo uploaded successfully', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Home')
        }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {photo ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photo }} style={styles.preview} />
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.retakeButton]}
              onPress={takePhoto}
            >
              <Text style={styles.buttonText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.uploadButton]}
              onPress={uploadPhoto}
              disabled={uploading}
            >
              <Text style={styles.buttonText}>
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.cameraContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cameraButton]}
            onPress={takePhoto}
          >
            <Text style={styles.buttonText}>Take Photo</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  previewContainer: {
    flex: 1,
    padding: 16,
  },
  preview: {
    flex: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cameraButton: {
    backgroundColor: '#2196F3',
    width: '80%',
  },
  retakeButton: {
    backgroundColor: '#FFA000',
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PhotoScreen; 