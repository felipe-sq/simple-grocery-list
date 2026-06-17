import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { GroceryItemWithAisle } from '@/types';

type Props = {
  item: GroceryItemWithAisle;
  onEdit: () => void;
  onMoveAisle: () => void;
  onDelete: () => Promise<{ error: string | null }>;
  onClose: () => void;
};

export function ItemContextMenu({ item, onEdit, onMoveAisle, onDelete, onClose }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleConfirmDelete() {
    setDeleting(true);
    setDeleteError(null);
    const { error } = await onDelete();
    setDeleting(false);
    if (error) {
      setDeleteError(error);
    } else {
      onClose();
    }
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.menu} onPress={() => {}}>
          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>

          {!confirming ? (
            <>
              <Pressable style={styles.option} onPress={onEdit}>
                <Text style={styles.optionText}>Edit item</Text>
              </Pressable>
              <View style={styles.divider} />
              <Pressable style={styles.option} onPress={onMoveAisle}>
                <Text style={styles.optionText}>Move to different aisle</Text>
              </Pressable>
              <View style={styles.divider} />
              <Pressable style={styles.option} onPress={() => setConfirming(true)}>
                <Text style={[styles.optionText, styles.destructive]}>Delete from list</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.confirmSection}>
              <Text style={styles.confirmText}>Delete "{item.name}"?</Text>
              {deleteError !== null && (
                <Text style={styles.errorText}>{deleteError}</Text>
              )}
              <View style={styles.confirmButtons}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => { setConfirming(false); setDeleteError(null); }}
                  disabled={deleting}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.deleteBtn, deleting && styles.deleteBtnDisabled]}
                  onPress={handleConfirmDelete}
                  disabled={deleting}
                >
                  <Text style={styles.deleteBtnText}>{deleting ? '…' : 'Delete'}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 14,
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  option: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 16,
    color: '#111827',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 0,
  },
  destructive: {
    color: '#dc2626',
  },
  confirmSection: {
    padding: 20,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    marginBottom: 8,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },
  deleteBtnDisabled: {
    backgroundColor: '#fca5a5',
  },
  deleteBtnText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
});
