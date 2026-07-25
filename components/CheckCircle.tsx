import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  checked: boolean;
  color?: string;
  size?: number;
  onPress: () => void;
  accessibilityLabel: string;
}

export function CheckCircle({ checked, color, size = 26, onPress, accessibilityLabel }: Props) {
  const colors = useThemeColors();
  const activeColor = color ?? colors.accent;

  // useNativeDriver:false needed for backgroundColor/borderColor interpolation
  const [fillAnim] = useState(() => new Animated.Value(checked ? 1 : 0));
  const [scaleAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: checked ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [checked, fillAnim]);

  const borderColor = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, activeColor],
  });

  const backgroundColor = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', activeColor],
  });

  const checkOpacity = fillAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.8, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
    >
      {/* Outer scale wrapper — nativeDriver: true (only transform) */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {/* Inner color wrapper — nativeDriver: false (background/border color) */}
        <Animated.View
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor,
              backgroundColor,
            },
          ]}
        >
          <Animated.View style={{ opacity: checkOpacity }}>
            <Ionicons name="checkmark" size={size * 0.58} color="#fff" />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
