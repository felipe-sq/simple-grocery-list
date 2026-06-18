import { Modal, Pressable, StyleSheet, Text } from 'react-native';

import type { Store } from '@/types';

export type CopyTarget = Store | 'default';

type Props = {
  visible: boolean;
  stores: Store[];
  selectedCount: number;
  onSelect: (target: CopyTarget) => void;
  onClose: () => void;
};

export function StorePickerModal({ visible, stores, selectedCount, onSelect, onClose }: Props) {
  const label = `Add ${selectedCount} item${selectedCount !== 1 ? 's' : ''} to…`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.title}>{label}</Text>

          {stores.map((store) => (
            <Pressable
              key={store.id}
              style={styles.option}
              onPress={() => onSelect(store)}
              accessibilityRole="button"
              accessibilityLabel={`Add to ${store.name}`}
            >
              <Text style={styles.optionText}>{store.name}</Text>
            </Pressable>
          ))}

          <Pressable
            style={[styles.option, styles.defaultOption]}
            onPress={() => onSelect('default')}
            accessibilityRole="button"
            accessibilityLabel="Each item's default store"
          >
            <Text style={styles.optionText}>Each item's default</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
    paddingTop: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  option: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  defaultOption: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    borderBottomWidth: 0,
  },
  optionText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
  },
});
