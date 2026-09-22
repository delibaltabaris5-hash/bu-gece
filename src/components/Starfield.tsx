import { StyleSheet, View } from 'react-native';

const STARS = Array.from({ length: 48 }, (_, index) => {
  const seed = (index + 1) * 92821;
  return {
    left: (seed % 1000) / 10,
    top: ((seed * 13) % 1000) / 10,
    size: index % 7 === 0 ? 2.4 : 1.4,
    opacity: 0.2 + (index % 5) * 0.1,
  };
});

export function Starfield() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {STARS.map((star, index) => (
        <View
          key={index}
          style={[
            styles.star,
            {
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  star: {
    position: 'absolute',
    borderRadius: 2,
    backgroundColor: '#D5E7F8',
  },
});
