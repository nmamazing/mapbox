import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreenv2 from '../screens/HomeScreenv2';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import MapScreenv2 from '../screens/MapScreenv2';
import ProfileScreen from '../screens/ProfileScreen';
import TestScreen from '../screens/TestScreen';
import DealsListScreen from '../screens/DealsListScreen';
import DealDetailsScreen from '../screens/DealDetailsScreen';

const Tab = createBottomTabNavigator();
const DealsStack = createStackNavigator();

// Create a stack navigator for the Deals tab
const DealsStackNavigator = () => {
  return (
    <DealsStack.Navigator>
      <DealsStack.Screen 
        name="DealsList" 
        component={DealsListScreen}
        options={{ headerShown: false }}
      />
      <DealsStack.Screen 
        name="DealDetails" 
        component={DealDetailsScreen}
        options={{ headerShown: false }}
      />
    </DealsStack.Navigator>
  );
};

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName = 'home';
          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'DealsList') {
            iconName = 'list';
          } else if (route.name === 'Map') {
            iconName = 'map';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          } else if (route.name === 'Test') {
            iconName = 'flask';
          }
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreenv2} />
      <Tab.Screen 
        name="DealsList" 
        component={DealsStackNavigator} 
        options={{ 
          title: 'Deals',
        }} 
      />
      <Tab.Screen name="Map" component={MapScreenv2} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Tab.Screen name="Test" component={TestScreen} options={{ title: 'Test' }} />
    </Tab.Navigator>
  );
};

export default MainTabNavigator; 