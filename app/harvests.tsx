import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/src/features/auth";
import { HarvestsScreen } from "@/src/features/harvests/HarvestsScreen";

export default function HarvestsRoute() {
  const { isLoading, isAuthenticated, hasActiveMembership } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (!hasActiveMembership) {
    return <Redirect href="/organization-setup" />;
  }

  return <HarvestsScreen />;
}
