import { StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, { DragEndParams } from 'react-native-draggable-flatlist';

import { AddAisleRow } from '@/components/AddAisleRow';
import { AisleRow } from '@/components/AisleRow';
import { StoreHeader } from '@/components/StoreHeader';
import type { Aisle, Store } from '@/types';

const MAX_AISLES = 10;

type Props = {
  store: Store;
  aisles: Aisle[];
  allStores: Store[];
  onStoreRename: (storeId: string, name: string) => Promise<string | null>;
  onAisleAdd: (storeId: string, name: string) => Promise<string | null>;
  onAisleRename: (aisleId: string, name: string) => Promise<string | null>;
  onAisleReorder: (storeId: string, aisles: Aisle[]) => Promise<void>;
};

export function StoreSection({
  store,
  aisles,
  allStores,
  onStoreRename,
  onAisleAdd,
  onAisleRename,
  onAisleReorder,
}: Props) {
  function handleDragEnd({ data }: DragEndParams<Aisle>) {
    onAisleReorder(store.id, data);
  }

  return (
    <View style={styles.block}>
      <StoreHeader store={store} allStores={allStores} onRename={onStoreRename} />

      <DraggableFlatList
        data={aisles}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item, drag, isActive }) => (
          <AisleRow
            aisle={item}
            storeAisles={aisles}
            drag={drag}
            isActive={isActive}
            onSaveName={onAisleRename}
          />
        )}
        onDragEnd={handleDragEnd}
      />

      {aisles.length < MAX_AISLES ? (
        <AddAisleRow
          existingAisles={aisles}
          onAdd={(name) => onAisleAdd(store.id, name)}
        />
      ) : (
        <Text style={styles.limitText}>Maximum of 10 aisles reached.</Text>
      )}

      {/* EC8-5: store deletion deferred */}
      <View style={styles.deleteHint}>
        <Text style={styles.deleteHintText}>To remove a store, contact support.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  limitText: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: '#9ca3af',
    fontSize: 14,
  },
  deleteHint: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f3f4f6',
  },
  deleteHintText: {
    color: '#9ca3af',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
