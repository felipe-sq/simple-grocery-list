import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';

import { useAisles } from '@/hooks/useAisles';
import type { Aisle, GroceryItemWithAisle } from '@/types';

type Props = {
  item: GroceryItemWithAisle | null;
  householdId: string;
  onMove: (aisle: Pick<Aisle, 'id' | 'name' | 'sort_order'>) => void;
  onClose: () => void;
};

export function MoveAisleSheet({ item, householdId, onMove, onClose }: Props) {
  const modalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['40%'], []);

  const { aisles } = useAisles(item?.store_id ?? '', householdId);

  useEffect(() => {
    if (item) {
      modalRef.current?.present();
    } else {
      modalRef.current?.dismiss();
    }
  }, [item]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    [],
  );

  const otherAisles = aisles.filter((a) => a.id !== item?.aisle_id);

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      onDismiss={onClose}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Move to aisle</Text>
      </View>

      <BottomSheetScrollView contentContainerStyle={styles.content}>
        {otherAisles.length === 0 ? (
          <Text style={styles.emptyText}>No other aisles available.</Text>
        ) : (
          otherAisles.map((aisle, index) => (
            <View key={aisle.id}>
              {index > 0 && <View style={styles.divider} />}
              <Pressable
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                onPress={() => {
                  onMove({ id: aisle.id, name: aisle.name, sort_order: aisle.sort_order });
                  onClose();
                }}
              >
                <Text style={styles.optionText}>{aisle.name}</Text>
              </Pressable>
            </View>
          ))
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#6b7280',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  option: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionPressed: {
    backgroundColor: '#f9fafb',
  },
  optionText: {
    fontSize: 16,
    color: '#111827',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 20,
  },
});
