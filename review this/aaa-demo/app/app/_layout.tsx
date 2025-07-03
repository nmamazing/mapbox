import "expo-dev-client";

import { Stack } from "expo-router";

const Layout = () => (
  <Stack>
    <Stack.Screen name="index" />

    <Stack.Screen name="secure/index" />
  </Stack>
);

export default Layout;
