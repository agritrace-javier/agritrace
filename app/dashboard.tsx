import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../src/features/auth";
import { Dashboard } from "../src/features/lots/Dashboard";

export default function DashboardScreen() {
  const router = useRouter();

  const {
    isAuthenticated,
    isLoading,
    hasActiveMembership,
  } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!hasActiveMembership) {
      router.replace(
        "/organization-setup"
      );
    }
  }, [
    isLoading,
    isAuthenticated,
    hasActiveMembership,
    router,
  ]);

  if (
    isLoading ||
    !isAuthenticated ||
    !hasActiveMembership
  ) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Preparing your AgriTrace workspace...
        </Text>
      </View>
    );
  }

  return <Dashboard />;
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