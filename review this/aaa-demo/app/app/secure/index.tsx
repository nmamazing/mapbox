import { getZohoUserProfile } from "@/Util";

import { useLocalSearchParams } from "expo-router";

import React, { useEffect } from "react";

import { View, Text } from "react-native";

const Index = () => {
  const { accessToken } = useLocalSearchParams() as {
    accessToken: string;

    apiDomain: string;

    expiresIn: string;

    refreshToken: string;

    tokenType: string;
  };

  const [profile, setProfile] = React.useState<{
    name?: string;

    email: any;

    id: any;
  } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const profile = await getZohoUserProfile(accessToken);

      setProfile(profile);
    };

    fetchProfile();
  }, [accessToken]);

  return (
    <View
      style={{
        flex: 1,
      }}
    >
      {profile && (
        <>
          <Text>ZOHO User ID: {profile.id}</Text>

          <Text>ZOHO User Email: {profile.email}</Text>

          <Text>ZOHO User Name: {profile.name || "Undefined"}</Text>
        </>
      )}
    </View>
  );
};

export default Index;
