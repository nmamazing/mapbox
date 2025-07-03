import React, { useLayoutEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { colors } from "../theme/colors";
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';

const logo = require("../../assets/logo.png");

const HomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 16 }}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person-circle-outline" size={28} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.dealsButton]}
          onPress={() => navigation.navigate("DealOwners")}
        >
          <Text style={styles.buttonText}>Deals</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.houseHuntingButton]}
          onPress={() => navigation.navigate("HouseHunting")}
        >
          <Text style={styles.buttonText}>House Hunting</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={() => navigation.navigate("Test")}
        >
          <Text style={styles.buttonText}>Test</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  logoContainer: {
    marginBottom: 48,
    alignItems: "center",
    width: "100%",
  },
  logo: {
    width: 220,
    height: 100,
  },
  buttonContainer: {
    width: "100%",
    gap: 16,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 10,
    alignItems: "center",
    elevation: 2,
  },
  dealsButton: {
    backgroundColor: colors.accent,
  },
  houseHuntingButton: {
    backgroundColor: colors.secondary,
  },
  testButton: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});

export default HomeScreen;
