import { useUser } from "@clerk/expo";
import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandMark } from "../components/BrandMark";
import { SignOutButton } from "../components/SignOutButton";

export default function Home() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 18) }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>GOOD MORNING,</Text>
          <Text style={styles.greeting}>{user?.firstName || "Rider"} 👋</Text>
        </View>
        <BrandMark size={30} />
      </View>

      <Text style={styles.sectionTitle}>Your ride, connected.</Text>
      <View style={styles.mapCard}>
        <View style={styles.mapGrid} />
        <View style={styles.pin} />
        <Text style={styles.mapLabel}>Nearby riders</Text>
      </View>

      <View style={styles.nextRide}>
        <View>
          <Text style={styles.cardEyebrow}>UPCOMING RIDE</Text>
          <Text style={styles.rideTitle}>Lakeside Loop Ride</Text>
          <Text style={styles.rideMeta}>Sun, Jan 26 · 7:00 AM</Text>
        </View>
        <Text style={styles.cardArrow}>›</Text>
      </View>

      <SignOutButton />

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Text style={styles.activeTab}>⌂{`\n`}Home</Text>
        <Text style={styles.tab}>♧{`\n`}Groups</Text>
        <Text style={styles.tab}>⌁{`\n`}Rides</Text>
        <Text style={styles.tab}>♙{`\n`}Profile</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#F7FAFC",
    flex: 1,
    paddingHorizontal: 22,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: "#788598",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  greeting: {
    color: "#111923",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 2,
  },
  sectionTitle: {
    color: "#111923",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 32,
  },
  mapCard: {
    backgroundColor: "#D7E8E5",
    borderRadius: 18,
    height: 230,
    marginTop: 14,
    overflow: "hidden",
    position: "relative",
  },
  mapGrid: {
    backgroundColor: "#C6DDDA",
    height: 380,
    left: -50,
    opacity: 0.8,
    position: "absolute",
    top: -60,
    transform: [{ rotate: "20deg" }],
    width: 500,
  },
  pin: {
    backgroundColor: "#2563FF",
    borderColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 4,
    height: 24,
    left: "50%",
    marginLeft: -12,
    marginTop: -12,
    position: "absolute",
    top: "50%",
    width: 24,
  },
  mapLabel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    bottom: 14,
    color: "#111923",
    fontSize: 12,
    fontWeight: "700",
    left: 14,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: "absolute",
  },
  nextRide: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    padding: 17,
  },
  cardEyebrow: {
    color: "#7C8A9C",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  rideTitle: {
    color: "#111923",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 5,
  },
  rideMeta: {
    color: "#6C7889",
    fontSize: 12,
    marginTop: 4,
  },
  cardArrow: {
    color: "#2563FF",
    fontSize: 27,
    fontWeight: "300",
  },
  tabBar: {
    alignItems: "flex-end",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    left: 0,
    paddingTop: 12,
    position: "absolute",
    right: 0,
  },
  activeTab: {
    color: "#2563FF",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 17,
    textAlign: "center",
  },
  tab: {
    color: "#7C8A9C",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
});
