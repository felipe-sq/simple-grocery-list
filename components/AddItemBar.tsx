import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getTagColor } from '@/components/TagPill';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useThemedStyles } from '@/hooks/useThemedStyles';

interface Props {
  tags: string[];
  prefillName?: string | null;
  onAdd: (name: string, tag: string | null) => void;
  onScanBarcode?: () => void;
  onVoice?: () => void;
}

export function AddItemBar({ tags, prefillName, onAdd, onScanBarcode, onVoice }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showTags, setShowTags] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Track keyboard so we can drop the safe-area padding while it's up.
  // The keyboard itself covers that zone — adding the inset on top creates a gap.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (!prefillName) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setName(prefillName);
      inputRef.current?.focus();
    });
    return () => { active = false; };
  }, [prefillName]);

  const bottomPad = Platform.OS === 'web' ? 24 : keyboardOpen ? 0 : insets.bottom || 8;

  const styles = useThemedStyles((c) => ({
    wrapper: {
      backgroundColor: c.card,
      borderTopWidth: 0.5,
      borderTopColor: c.separator,
      paddingBottom: bottomPad,
    },
    tagRow: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    newTagInput: {
      minWidth: 90,
      fontSize: 13,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 100,
      borderWidth: 1,
      borderColor: c.border,
      color: c.foreground,
    },
    inputRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 12,
      paddingTop: 8,
      gap: 8,
    },
    iconBtn: { padding: 6 },
    input: {
      flex: 1,
      fontSize: 16,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 100,
      backgroundColor: c.secondary,
      color: c.foreground,
    },
  }));

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed, selectedTag);
    setName('');
  }

  function handleNewTag() {
    const t = newTag.trim();
    if (!t) return;
    setSelectedTag(t);
    setNewTag('');
  }

  return (
    <View style={styles.wrapper}>
      {showTags && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagRow}
          keyboardShouldPersistTaps="handled"
        >
          <TagChip label="None" color={colors.mutedForeground} selected={selectedTag === null} onPress={() => setSelectedTag(null)} />
          {tags.map((tag) => (
            <TagChip
              key={tag}
              label={tag}
              color={getTagColor(tag)}
              selected={selectedTag === tag}
              onPress={() => setSelectedTag(selectedTag === tag ? null : tag)}
            />
          ))}
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
        </ScrollView>
      )}

      <View style={styles.inputRow}>
        <TouchableOpacity
          onPress={() => setShowTags((v) => !v)}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={selectedTag ? `Tag: ${selectedTag}` : 'Choose tag'}
        >
          <Ionicons
            name="pricetag-outline"
            size={22}
            color={selectedTag ? getTagColor(selectedTag) : colors.mutedForeground}
          />
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Add an item…"
          placeholderTextColor={colors.mutedForeground}
          value={name}
          onChangeText={setName}
          onSubmitEditing={handleAdd}
          blurOnSubmit={false}
          returnKeyType="done"
          maxLength={100}
        />
        {onScanBarcode !== undefined && (
          <TouchableOpacity onPress={onScanBarcode} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Scan barcode">
            <Ionicons name="barcode-outline" size={24} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
        {onVoice !== undefined && (
          <TouchableOpacity onPress={onVoice} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Add by voice">
            <Ionicons name="mic-outline" size={24} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleAdd}
          style={styles.iconBtn}
          disabled={!name.trim()}
          accessibilityRole="button"
          accessibilityLabel="Add item"
          accessibilityState={{ disabled: !name.trim() }}
        >
          <Ionicons name="add-circle" size={30} color={name.trim() ? colors.primary : colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
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
    text: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: selected ? '#fff' : c.mutedForeground,
    },
  }));
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.chip}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}
