import { Platform, StyleSheet, View } from 'react-native';

/** Slim cobalt crescent. Cutout color should match the surface behind it. */
export function Crescent({
  size = 26,
  cutoutColor = '#05070C',
}: {
  size?: number;
  cutoutColor?: string;
}) {
  const cover = size * 0.78;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size * 0.92, height: size }}
    >
      <View
        style={[
          styles.disc,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: Math.max(2, size * 0.11),
          },
        ]}
      />
      <View
        style={{
          position: 'absolute',
          width: cover,
          height: cover,
          borderRadius: cover / 2,
          backgroundColor: cutoutColor,
          left: size * 0.3,
          top: size * 0.08,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    borderColor: '#8FD4FF',
    backgroundColor: 'transparent',
    shadowColor: '#3DA0FF',
    shadowOpacity: 0.95,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    ...Platform.select({
      android: { elevation: 6 },
      default: {},
    }),
  },
});
