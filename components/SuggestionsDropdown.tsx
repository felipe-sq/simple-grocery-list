import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SuggestionResult } from '@/types';

type Props = {
  suggestions: SuggestionResult[];
  onSelect: (suggestion: SuggestionResult) => void;
};

export function SuggestionsDropdown({ suggestions, onSelect }: Props) {
  if (suggestions.length === 0) return null;

  return (
    <View style={styles.container}>
      {suggestions.map((s, index) => (
        <Pressable
          key={`${s.store_id}-${s.aisle_id}-${s.name}`}
          style={[styles.row, index < suggestions.length - 1 && styles.rowBorder]}
          onPress={() => onSelect(s)}
          accessibilityRole="button"
          accessibilityLabel={`${s.name}, ${s.store_name}${s.aisle_name ? `, ${s.aisle_name}` : ''}`}
        >
          <Text style={styles.icon}>🕐</Text>
          <View style={styles.content}>
            <Text style={styles.name} numberOfLines={1}>{s.name}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {s.store_name}{s.aisle_name ? ` · ${s.aisle_name}` : ''}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginTop: 4,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  icon: { fontSize: 14, marginRight: 10 },
  content: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
});
