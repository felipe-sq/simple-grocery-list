import { useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Suggestion } from '@/types';

interface Props {
  suggestion: Suggestion;
  alreadyOnList: boolean;
  onAdd: () => Promise<{ error: string | null }>;
  onDismiss: () => void;
}

function formatLastPurchased(daysSince: number | null): string {
  if (daysSince === null) return 'Never purchased';
  if (daysSince === 0) return 'Last bought today';
  if (daysSince === 1) return 'Last bought yesterday';
  return `Last bought ${daysSince}d ago`;
}

export function SuggestionCard({ suggestion, alreadyOnList, onAdd, onDismiss }: Props) {
  const [adding, setAdding] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const [animValue] = useState(() => new Animated.Value(1));

  function handleDismiss() {
    Animated.timing(animValue, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start(() => onDismiss());
  }

  async function handleAdd() {
    if (alreadyOnList || adding) return;
    setAdding(true);
    await onAdd();
    setAdding(false);
  }

  const maxHeightAnim = measuredHeight > 0
    ? animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, measuredHeight + 8],
      })
    : undefined;

  return (
    <Animated.View
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (measuredHeight === 0 && h > 0) setMeasuredHeight(h);
      }}
      style={[
        styles.card,
        {
          opacity: animValue,
          maxHeight: maxHeightAnim,
          overflow: 'hidden',
        },
      ]}
    >
      <View style={styles.info}>
        <Text style={styles.itemName} numberOfLines={1}>{suggestion.item_name}</Text>
        <Text style={styles.storeLine} numberOfLines={1}>
          {suggestion.store_name} · {suggestion.aisle_name}
        </Text>
        <Text style={styles.dateLine}>
          {formatLastPurchased(suggestion.days_since_last_purchase)}
        </Text>
      </View>

      <View style={styles.actions}>
        {alreadyOnList ? (
          <View style={styles.alreadyTag}>
            <Text style={styles.alreadyText}>Already on list</Text>
          </View>
        ) : (
          <Pressable
            style={[styles.addButton, adding && styles.addButtonBusy]}
            onPress={handleAdd}
            disabled={adding}
            accessibilityRole="button"
            accessibilityLabel={adding ? 'Adding suggestion' : `Add ${suggestion.item_name}`}
            accessibilityState={{ disabled: adding }}
          >
            <Text style={styles.addButtonText}>{adding ? '...' : '+ Add'}</Text>
          </Pressable>
        )}

        <Pressable
          style={styles.dismissButton}
          onPress={handleDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Dismiss ${suggestion.item_name}`}
        >
          <Text style={styles.dismissText}>✕</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    ...Platform.select({
      android: { elevation: 1 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
      web: { boxShadow: '0px 1px 2px rgba(0,0,0,0.04)' } as object,
    }),
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  storeLine: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  dateLine: {
    fontSize: 12,
    color: '#6b7280',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 7,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  addButtonBusy: {
    backgroundColor: '#93c5fd',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  alreadyTag: {
    borderRadius: 7,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f3f4f6',
  },
  alreadyText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  dismissButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
});
