import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../theme/tokens";

type BrandMarkProps = {
  size?: number;
  showName?: boolean;
  showTagline?: boolean;
  light?: boolean;
};

export function BrandMark({ size = 40, showName = false, showTagline = false, light = false }: BrandMarkProps) {
  return (
    <View style={styles.wrapper}>
      <Image
        source={require("../../assets/brand/groupify-mark.svg")}
        style={{ width: size, height: size }}
        contentFit="contain"
        tintColor={light ? colors.onBrand : undefined}
        accessible={!showName}
        accessibilityLabel="Groupify"
      />
      {showName ? (
        <View>
          <Text style={[styles.name, { color: light ? colors.onBrand : colors.text }]}>Groupify</Text>
          {showTagline ? <Text style={[styles.tagline, { color: light ? colors.onBrand : colors.brand }]}>Move Together.</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  name: { fontFamily: "Inter_800ExtraBold", fontSize: 20, lineHeight: 28 },
  tagline: { fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 16 },
});
