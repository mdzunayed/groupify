import { useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";

const DESIGN_WIDTH = 1448;
const DESIGN_HEIGHT = 1086;

// The supplied design sheet contains the same mountain-road scene used by the
// onboarding mockup. This crops that panel at runtime so the app stays self-contained.
const PHONE_IMAGE_X = 204;
const PHONE_IMAGE_Y = 153;
const PHONE_IMAGE_WIDTH = 153;

export function ReferenceBackdrop() {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 430);
  const scale = contentWidth / PHONE_IMAGE_WIDTH;

  return (
    <View
      pointerEvents="none"
      style={{
        height: "70%",
        left: 0,
        overflow: "hidden",
        position: "absolute",
        right: 0,
        top: 0,
      }}
    >
      <Image
        accessible={false}
        source={require("../../design/app-design-ref.png")}
        contentFit="fill"
        style={{
          height: DESIGN_HEIGHT * scale,
          left: -PHONE_IMAGE_X * scale,
          position: "absolute",
          top: -PHONE_IMAGE_Y * scale,
          width: DESIGN_WIDTH * scale,
        }}
      />
      <View
        style={{
          backgroundColor: "rgba(5, 10, 18, 0.18)",
          bottom: 0,
          left: 0,
          position: "absolute",
          right: 0,
          top: 0,
        }}
      />
    </View>
  );
}
