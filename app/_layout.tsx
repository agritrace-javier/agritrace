// app/_layout.tsx
import { Stack } from "expo-router";
import { LotsProvider } from "./lots-store";

export default function RootLayout() {
  return (
    <LotsProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </LotsProvider>
  );
}
