import React, { useEffect } from "react";

import { Button, View, StyleSheet } from "react-native";

import * as AuthSession from "expo-auth-session";

import { router } from "expo-router";

import { discovery, redirectUri } from "@/Util";

const scopes = ["ZohoCRM.modules.ALL", "aaaserver.profile.READ"];

export default function Index() {
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env["EXPO_PUBLIC_ZOHO_CLIENT_ID"],

      scopes,

      redirectUri,

      usePKCE: true,

      extraParams: {
        access_type: "offline",

        prompt: "consent",
      },
    },

    discovery
  );

  useEffect(() => {
    if (response?.type === "success") {
      const { code } = response.params;

      (async () => {
        try {
          const res = await fetch(
            `${process.env["EXPO_PUBLIC_API_BASE_URL"]}/api/auth`,

            {
              method: "POST",

              headers: {
                "Content-Type": "application/json",
              },

              body: JSON.stringify({
                code,

                redirectUri,

                codeVerifier: request?.codeVerifier,
              }),
            }
          );

          const data = await res.json();

          router.push({
            pathname: "/secure",

            params: {
              accessToken: data.accessToken,

              apiDomain: data.apiDomain,

              expiresIn: data,

              refreshToken: data.refreshToken,

              tokenType: data.tokenType,
            },
          });
        } catch (err) {
          console.error("Token exchange failed:", err);
        }
      })();
    }
  }, [response, request?.codeVerifier]);

  return (
    <View style={styles.container}>
      <Button
        title="Login with Zoho"
        disabled={!request}
        onPress={() => promptAsync()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

    justifyContent: "center",

    padding: 24,

    backgroundColor: "#fff",
  },

  title: {
    fontSize: 22,

    marginBottom: 24,

    textAlign: "center",
  },
});
