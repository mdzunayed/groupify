import { StyleSheet, Text, View } from "react-native";

type BrandMarkProps = {
  size?: number;
  showName?: boolean;
  showTagline?: boolean;
  light?: boolean;
};

export function BrandMark({
  size = 40,
  showName = false,
  showTagline = false,
  light = false,
}: BrandMarkProps) {
  const markBackground = light ? "#111923" : "#F7FAFC";
  const markText = light ? "#F7FAFC" : "#111923";

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.mark,
          {
            width: size,
            height: size,
            borderRadius: size * 0.27,
            backgroundColor: markBackground,
          },
        ]}
      >
        <Text
          style={[
            styles.markText,
            {
              color: markText,
              fontSize: size * 0.72,
              lineHeight: size * 0.82,
            },
          ]}
        >
          G
        </Text>
        <View
          style={[
            styles.markSlash,
            {
              width: size * 0.42,
              height: Math.max(2, size * 0.09),
              left: size * 0.3,
              top: size * 0.54,
              transform: [{ rotate: "-18deg" }],
            },
          ]}
        />
      </View>
      {showName ? (
        <View style={styles.wordmark}>
          <Text style={[styles.name, { color: light ? "#F7FAFC" : "#111923" }]}>Groupify</Text>
          {showTagline ? <Text style={styles.tagline}>Move Together.</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  mark: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  markText: {
    fontStyle: "italic",
    fontWeight: "900",
    includeFontPadding: false,
    letterSpacing: -2,
    marginLeft: -2,
  },
  markSlash: {
    backgroundColor: "#2563FF",
    borderRadius: 99,
    position: "absolute",
  },
  wordmark: {
    justifyContent: "center",
  },
  name: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  tagline: {
    color: "#2563FF",
    fontSize: 11,
    fontStyle: "italic",
    fontWeight: "800",
    lineHeight: 14,
  },
});
