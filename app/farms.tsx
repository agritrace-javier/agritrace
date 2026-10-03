import { Redirect } from "expo-router";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../src/features/auth";
import { FarmsScreen } from "../src/features/farms/FarmsScreen";

export default function FarmsRoute() {
  const {
    isAuthenticated,
    isLoading,
    hasActiveMembership,
  } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading Farm Management...
        </Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (!hasActiveMembership) {
    return <Redirect href="/organization-setup" />;
  }

  return <FarmsScreen />;
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: "#F4F6F1",
  },

  loadingText: {
    color: "#58675F",
    fontSize: 14,
    fontWeight: "700",
  },
});
