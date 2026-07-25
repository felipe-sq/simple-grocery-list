import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { SheetModal, SheetScrollView } from '@/components/SheetModal';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AddItemInput, ParsedVoiceItem } from '@/types';

interface ReviewItemState {
  key: string;
  name: string;
  qty: string;
  unit: string;
  checked: boolean;
  parsed: boolean;
  error: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  // Tag applied to every added item (the list's active filter tag, if any).
  tag: string | null;
  items: ParsedVoiceItem[];
  addItem: (data: AddItemInput) => Promise<{ error: string | null }>;
}

export function VoiceReviewSheet({ visible, onClose, tag, items, addItem }: Props) {
  const colors = useThemeColors();
  const [reviewItems, setReviewItems] = useState<ReviewItemState[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const ts = Date.now();
    const initial: ReviewItemState[] = items.map((item, idx) => ({
      key: `${ts}-${idx}`,
      name: item.name,
      qty: String(item.qty),
      unit: item.unit ?? '',
      checked: true,
      parsed: item.parsed,
      error: null,
    }));
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setReviewItems(initial);
      setSubmitting(false);
    });
    return () => { active = false; };
  }, [visible, items]);

  const styles = useThemedStyles((c) => ({
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 20,
      paddingBottom: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: c.separator,
    },
    title: { flex: 1, fontSize: 18, fontWeight: '700' as const, color: c.foreground },
    closeIcon: { fontSize: 18, color: c.mutedForeground },
    subtitle: { fontSize: 14, color: c.mutedForeground, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
    scrollContent: { paddingBottom: 16 },
    card: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      marginHorizontal: 16,
      marginTop: 10,
      padding: 12,
      borderRadius: 10,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderColor: c.border,
    },
    checkboxOn: { backgroundColor: c.accent, borderColor: c.accent },
    checkMark: { color: c.accentForeground, fontSize: 13, fontWeight: '700' as const },
    nameInput: { flex: 1, fontSize: 15, color: c.foreground, padding: 0 },
    qtyInput: {
      width: 44,
      fontSize: 15,
      color: c.foreground,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      textAlign: 'center' as const,
      padding: 2,
    },
    unitInput: {
      width: 64,
      fontSize: 15,
      color: c.foreground,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      padding: 2,
    },
    errorText: { fontSize: 12, color: c.destructive, marginHorizontal: 16, marginTop: 4 },
    unparsedNote: { fontSize: 12, color: '#d97706', marginHorizontal: 16, marginTop: 4 },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 16,
      borderTopWidth: 0.5,
      borderTopColor: c.separator,
      backgroundColor: c.card,
      flexDirection: 'row' as const,
      gap: 10,
    },
    addBtn: {
      flex: 1,
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center' as const,
    },
    addBtnDisabled: { opacity: 0.5 },
    addBtnText: { color: c.primaryForeground, fontSize: 15, fontWeight: '600' as const },
    cancelBtn: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingVertical: 14,
      paddingHorizontal: 20,
      alignItems: 'center' as const,
    },
    cancelBtnText: { color: c.mutedForeground, fontSize: 15 },
  }));

  function handleUpdate(key: string, update: Partial<ReviewItemState>) {
    setReviewItems((prev) => prev.map((r) => (r.key === key ? { ...r, ...update } : r)));
  }

  const checkedItems = reviewItems.filter((r) => r.checked);
  const btnDisabled = submitting || checkedItems.length === 0;
  const btnLabel =
    checkedItems.length === reviewItems.length
      ? `Add All (${checkedItems.length})`
      : `Add Selected (${checkedItems.length})`;

  async function handleAdd() {
    if (btnDisabled) return;
    setSubmitting(true);
    let anyError = false;

    for (const r of checkedItems) {
      const result = await addItem({
        name: r.name.trim(),
        tag,
        quantity: r.qty ? parseFloat(r.qty) : null,
        unit: r.unit.trim() || null,
        notes: null,
        source: 'voice',
      });

      if (result.error) {
        const errMsg = result.error;
        setReviewItems((prev) => prev.map((item) => (item.key === r.key ? { ...item, error: errMsg } : item)));
        anyError = true;
      } else {
        setReviewItems((prev) => prev.filter((item) => item.key !== r.key));
      }
    }

    setSubmitting(false);
    if (!anyError) onClose();
  }

  return (
    <SheetModal visible={visible} onClose={onClose} snapPoint="90%">
      <View style={styles.header}>
        <Text style={styles.title}>Review Items</Text>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close review">
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        We heard {items.length} item{items.length !== 1 ? 's' : ''}. Review before adding:
      </Text>

      <SheetScrollView contentContainerStyle={styles.scrollContent}>
        {reviewItems.map((item) => (
          <View key={item.key}>
            <View style={styles.card}>
              <Pressable
                style={[styles.checkbox, item.checked && styles.checkboxOn]}
                onPress={() => handleUpdate(item.key, { checked: !item.checked })}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.checked }}
                accessibilityLabel={`Include ${item.name}`}
              >
                {item.checked && <Text style={styles.checkMark}>✓</Text>}
              </Pressable>
              <TextInput
                style={styles.nameInput}
                value={item.name}
                onChangeText={(t) => handleUpdate(item.key, { name: t })}
                placeholder="Item name"
                placeholderTextColor={colors.mutedForeground}
              />
              <TextInput
                style={styles.qtyInput}
                value={item.qty}
                onChangeText={(t) => handleUpdate(item.key, { qty: t })}
                keyboardType="numeric"
                accessibilityLabel={`Quantity for ${item.name}`}
              />
              <TextInput
                style={styles.unitInput}
                value={item.unit}
                onChangeText={(t) => handleUpdate(item.key, { unit: t })}
                placeholder="unit"
                placeholderTextColor={colors.mutedForeground}
                accessibilityLabel={`Unit for ${item.name}`}
              />
            </View>
            {!item.parsed && item.error === null && (
              <Text style={styles.unparsedNote}>Couldn't parse — edit the name before adding.</Text>
            )}
            {item.error !== null && <Text style={styles.errorText}>{item.error}</Text>}
          </View>
        ))}
      </SheetScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.addBtn, btnDisabled && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={btnDisabled}
          accessibilityRole="button"
          accessibilityLabel={submitting ? 'Adding items' : btnLabel}
          accessibilityState={{ disabled: btnDisabled }}
        >
          <Text style={styles.addBtnText}>{submitting ? 'Adding…' : btnLabel}</Text>
        </Pressable>
        <Pressable style={styles.cancelBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancel and discard">
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>
      </View>
    </SheetModal>
  );
}
