import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';

export default function NotFoundScreen() {
  const styles = useThemedStyles((c) => ({
    container: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: 20,
      backgroundColor: c.background,
    },
    title: { fontSize: 20, fontWeight: 'bold' as const, color: c.foreground },
    link: { marginTop: 15, paddingVertical: 15 },
    linkText: { fontSize: 14, color: c.primary },
  }));

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn't exist.</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}
