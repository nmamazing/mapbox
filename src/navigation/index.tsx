import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UserRole } from '../types';
import { colors } from '../theme/colors';

// Import screens (we'll create these next)
import HomeScreen from '../screens/HomeScreen';
import LeadDetailsScreen from '../screens/LeadDetailsScreen';
import MapScreen from '../screens/MapScreen';
import PhotoScreen from '../screens/PhotoScreen';
import TestScreen from '../screens/TestScreen';
import DealsListScreen from '../screens/DealsListScreen';
import DealOwnersScreen from '../screens/DealOwnersScreen';
import CompleteMapScreen from '../screens/CompleteMapScreen';
import HouseHuntingScreen from '../screens/HouseHuntingScreen';
import RouteScreen from '../screens/RouteScreen';
import ProfileScreen from '../screens/ProfileScreen';
import DealDetailsScreen from '../screens/DealDetailsScreen';

export type RootStackParamList = {
  Home: undefined;
  LeadDetails: { leadId: string };
  Map: { leadId: string };
  Photo: { leadId: string };
  Test: undefined;
  DealsList: { deals: any[]; ownerId?: string; ownerName?: string };
  DealOwners: undefined;
  CompleteMap: undefined;
  HouseHunting: undefined;
  Route: {
    routeLegs: Array<{
      start: {
        location: {
          latitude: number;
          longitude: number;
        };
        name: string;
        address: string;
      };
      end: {
        location: {
          latitude: number;
          longitude: number;
        };
        name: string;
        address: string;
      };
      distance: number;
      duration: number;
      polyline: string;
    }>;
    mainDeal: any;
    selectedDeals: any[];
  };
  Profile: undefined;
  DealDetails: { deal: any };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const Navigation = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Leads' }}
      />
      <Stack.Screen 
        name="LeadDetails" 
        component={LeadDetailsScreen}
        options={{ title: 'Lead Details' }}
      />
      <Stack.Screen 
        name="Map" 
        component={MapScreen}
        options={{ title: 'Navigation' }}
      />
      <Stack.Screen 
        name="Photo" 
        component={PhotoScreen}
        options={{ title: 'Take Photo' }}
      />
      <Stack.Screen 
        name="Test" 
        component={TestScreen}
        options={{ title: 'API Test' }}
      />
      <Stack.Screen 
        name="DealsList" 
        component={DealsListScreen}
        options={{ title: 'Deals List' }}
      />
      <Stack.Screen 
        name="DealOwners" 
        component={DealOwnersScreen}
        options={{ title: 'Deal Owners' }}
      />
      <Stack.Screen 
        name="CompleteMap" 
        component={CompleteMapScreen}
        options={{ title: 'Complete Map' }}
      />
      <Stack.Screen 
        name="HouseHunting" 
        component={HouseHuntingScreen}
        options={{ title: 'House Hunting' }}
      />
      <Stack.Screen 
        name="Route" 
        component={RouteScreen}
        options={{ title: 'Route' }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen 
        name="DealDetails" 
        component={DealDetailsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}; 