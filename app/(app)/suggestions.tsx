import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SuggestionCard } from '@/components/SuggestionCard';
import { useHousehold } from '@/hooks/useHousehold';
import { useSuggestions } from '@/hooks/useSuggestions';

export default function SuggestionsScreen() {
  const { householdId, loading: householdLoading } = useHousehold();
  const { mightBeLow, aiPicks, loading, refreshing, refresh, dismiss, addToList, activeItemNames } =
    useSuggestions(householdId);

  if (householdLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#2563eb" />
  );

  if (mightBeLow.length === 0 && aiPicks.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.emptyContainer} refreshControl={refreshControl}>
        <Text style={styles.emptyEmoji}>💡</Text>
        <Text style={styles.emptyHeading}>No suggestions yet</Text>
        <Text style={styles.emptyBody}>
          Add more items and complete a few trips — suggestions will improve over time.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} refreshControl={refreshControl}>
      {mightBeLow.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Might be running low</Text>
          {mightBeLow.map((s) => (
            <SuggestionCard
              key={`${s.item_name}_${s.store_id}`}
              suggestion={s}
              alreadyOnList={activeItemNames.has(s.item_name.toLowerCase().trim())}
              onAdd={() => addToList(s)}
              onDismiss={() => dismiss(s)}
            />
          ))}
        </View>
      )}

      {aiPicks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI picks for you</Text>
          {aiPicks.map((s) => (
            <SuggestionCard
              key={`${s.item_name}_${s.store_id}`}
              suggestion={s}
              alreadyOnList={activeItemNames.has(s.item_name.toLowerCase().trim())}
              onAdd={() => addToList(s)}
              onDismiss={() => dismiss(s)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f9fafb',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});
