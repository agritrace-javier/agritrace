import { Stack } from "expo-router";

import { AuthProvider } from "../src/features/auth";
import { LotsProvider } from "./lots-store";

export default function RootLayout() {
  return (
    <AuthProvider>
      <LotsProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </LotsProvider>
    </AuthProvider>
  );
}
