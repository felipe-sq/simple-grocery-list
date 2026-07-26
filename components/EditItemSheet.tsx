import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { SheetModal, SheetScrollView } from '@/components/SheetModal';
import { getTagColor } from '@/components/TagPill';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { GroceryItem } from '@/types';

export interface EditItemInput {
  name: string;
  tag: string | null;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
}

interface Props {
  item: GroceryItem | null;
  // Existing tags on the list, offered as quick picks.
  tags: string[];
  onClose: () => void;
  onSave: (itemId: string, data: EditItemInput) => Promise<string | null>;
}

// NOTE: content must render unconditionally inside SheetModal — the native
// bottom sheet sizes itself from its children, and conditional (false)
// children present an invisible zero-height sheet.
export function EditItemSheet({ item, tags, onClose, onSave }: Props) {
  const colors = useThemeColors();
  const [name, setName] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the tapped item's fields whenever the sheet opens for a new item.
  useEffect(() => {
    if (!item) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setName(item.name);
      setTag(item.tag);
      setNewTag('');
      setQty(item.quantity !== null ? String(item.quantity) : '');
      setUnit(item.unit ?? '');
      setNotes(item.notes ?? '');
      setSaving(false);
      setError(null);
    });
    return () => { active = false; };
  }, [item]);

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
    body: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24, gap: 14 },
    label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.4, color: c.mutedForeground, marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: c.input,
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      backgroundColor: c.card,
      color: c.foreground,
    },
    row: { flexDirection: 'row' as const, gap: 10 },
    flex1: { flex: 1 },
    tagRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, alignItems: 'center' as const },
    newTagInput: {
      minWidth: 100,
      fontSize: 13,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 100,
      borderWidth: 1,
      borderColor: c.border,
      color: c.foreground,
    },
    errorText: { color: c.destructive, fontSize: 14 },
    saveBtn: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center' as const,
      marginTop: 4,
    },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { color: c.primaryForeground, fontSize: 15, fontWeight: '600' as const },
  }));

  const canSave = name.trim().length > 0 && !saving && item !== null;

  async function handleSave() {
    if (!canSave || !item) return;
    setSaving(true);
    setError(null);
    const parsedQty = qty.trim() ? parseFloat(qty) : null;
    const err = await onSave(item.id, {
      name: name.trim(),
      tag,
      quantity: parsedQty !== null && !Number.isNaN(parsedQty) ? parsedQty : null,
      unit: unit.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    onClose();
  }

  function handleNewTag() {
    const t = newTag.trim();
    if (!t) return;
    setTag(t);
    setNewTag('');
  }

  return (
    <SheetModal visible={item !== null} onClose={onClose} snapPoint="75%">
      <View style={styles.header}>
        <Text style={styles.title}>Edit Item</Text>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
      </View>

      <SheetScrollView contentContainerStyle={styles.body}>
        {error !== null && <Text style={styles.errorText}>{error}</Text>}

        <View>
          <Text style={styles.label}>NAME</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Item name"
            placeholderTextColor={colors.mutedForeground}
            maxLength={100}
            accessibilityLabel="Item name"
          />
        </View>

        <View>
          <Text style={styles.label}>TAG</Text>
          <View style={styles.tagRow}>
            <TagChip label="None" color={colors.mutedForeground} selected={tag === null} onPress={() => setTag(null)} />
            {tags.map((t) => (
              <TagChip key={t} label={t} color={getTagColor(t)} selected={tag === t} onPress={() => setTag(t)} />
            ))}
            {tag !== null && !tags.includes(tag) && (
              <TagChip label={tag} color={getTagColor(tag)} selected onPress={() => setTag(null)} />
            )}
            <TextInput
              style={styles.newTagInput}
              placeholder="New tag…"
              placeholderTextColor={colors.mutedForeground}
              value={newTag}
              onChangeText={setNewTag}
              onSubmitEditing={handleNewTag}
              returnKeyType="done"
              maxLength={30}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.label}>QUANTITY</Text>
            <TextInput
              style={styles.input}
              value={qty}
              onChangeText={setQty}
              keyboardType="numeric"
              placeholder="—"
              placeholderTextColor={colors.mutedForeground}
              accessibilityLabel="Quantity"
            />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.label}>UNIT</Text>
            <TextInput
              style={styles.input}
              value={unit}
              onChangeText={setUnit}
              placeholder="e.g. lbs"
              placeholderTextColor={colors.mutedForeground}
              maxLength={20}
              accessibilityLabel="Unit"
            />
          </View>
        </View>

        <View>
          <Text style={styles.label}>NOTES</Text>
          <TextInput
            style={styles.input}
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional note"
            placeholderTextColor={colors.mutedForeground}
            maxLength={200}
            accessibilityLabel="Notes"
          />
        </View>

        <Pressable
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel={saving ? 'Saving' : 'Save changes'}
          accessibilityState={{ disabled: !canSave }}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      </SheetScrollView>
    </SheetModal>
  );
}

function TagChip({ label, color, selected, onPress }: { label: string; color: string; selected: boolean; onPress: () => void }) {
  const styles = useThemedStyles((c) => ({
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 100,
      borderWidth: 1,
      backgroundColor: selected ? color : c.card,
      borderColor: selected ? color : c.border,
    },
    text: { fontSize: 13, fontWeight: '600' as const, color: selected ? '#fff' : c.mutedForeground },
  }));
  return (
    <Pressable
      onPress={onPress}
      style={styles.chip}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}
