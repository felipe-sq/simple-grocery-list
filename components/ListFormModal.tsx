import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { List } from '@/types';

const LIST_COLORS = [
  '#007AFF', '#34C759', '#FF3B30', '#FF9500', '#FFCC00',
  '#AF52DE', '#FF2D55', '#5AC8FA', '#FF6B35', '#00C7BE',
];

const LIST_ICONS = ['cart', 'basket', 'storefront', 'bag', 'pricetag', 'home', 'gift', 'heart'] as const;
type IoniconName = keyof typeof Ionicons.glyphMap;

interface Props {
  visible: boolean;
  // When set, the modal edits this list; otherwise it creates a new one.
  list?: List | null;
  onClose: () => void;
  onSubmit: (name: string, color: string, icon: string) => Promise<string | null>;
}

export function ListFormModal({ visible, list, onClose, onSubmit }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {/* Conditional render = fresh state every time the modal opens */}
      {visible && <FormBody list={list ?? null} onClose={onClose} onSubmit={onSubmit} />}
    </Modal>
  );
}

function FormBody({ list, onClose, onSubmit }: { list: List | null; onClose: () => void; onSubmit: Props['onSubmit'] }) {
  const colors = useThemeColors();
  const [name, setName] = useState(list?.name ?? '');
  const [selectedColor, setSelectedColor] = useState(list?.color ?? LIST_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState<string>(list?.icon ?? LIST_ICONS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: c.separator,
    },
    headerBtnText: { fontSize: 17, color: c.primary },
    headerBtnDisabled: { color: c.mutedForeground },
    bold: { fontWeight: '600' as const },
    title: { fontSize: 17, fontWeight: '600' as const, color: c.foreground },
    body: { padding: 20 },
    previewRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14, marginBottom: 28 },
    colorPreview: {
      width: 52,
      height: 52,
      borderRadius: 14,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: `${selectedColor}20`,
    },
    nameInput: {
      flex: 1,
      fontSize: 18,
      paddingVertical: 8,
      borderBottomWidth: 1,
      color: c.foreground,
      borderBottomColor: c.border,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600' as const,
      letterSpacing: 0.4,
      marginBottom: 10,
      color: c.mutedForeground,
    },
    grid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12, marginBottom: 28 },
    swatch: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    iconSwatch: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.card,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    errorText: { color: c.destructive, fontSize: 14, marginBottom: 12 },
  }));

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    const err = await onSubmit(trimmed, selectedColor, selectedIcon);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    onClose();
  }

  const canSubmit = name.trim().length > 0 && !loading;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancel">
          <Text style={styles.headerBtnText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{list ? 'Edit List' : 'New List'}</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel={list ? 'Save' : 'Create'}
          accessibilityState={{ disabled: !canSubmit }}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.headerBtnText, styles.bold, !canSubmit && styles.headerBtnDisabled]}>
              {list ? 'Save' : 'Create'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {error !== null && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.previewRow}>
          <View style={styles.colorPreview}>
            <Ionicons name={selectedIcon as IoniconName} size={26} color={selectedColor} />
          </View>
          <TextInput
            ref={inputRef}
            style={styles.nameInput}
            placeholder="List name"
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={setName}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            maxLength={60}
          />
        </View>

        <Text style={styles.sectionLabel}>COLOR</Text>
        <View style={styles.grid}>
          {LIST_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setSelectedColor(c)}
              style={[styles.swatch, { backgroundColor: c }]}
              accessibilityRole="button"
              accessibilityLabel={`Color ${c}`}
              accessibilityState={{ selected: selectedColor === c }}
            >
              {selectedColor === c && <Ionicons name="checkmark" size={20} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>ICON</Text>
        <View style={styles.grid}>
          {LIST_ICONS.map((ic) => (
            <TouchableOpacity
              key={ic}
              onPress={() => setSelectedIcon(ic)}
              style={[styles.iconSwatch, selectedIcon === ic && { borderColor: selectedColor }]}
              accessibilityRole="button"
              accessibilityLabel={`Icon ${ic}`}
              accessibilityState={{ selected: selectedIcon === ic }}
            >
              <Ionicons
                name={ic as IoniconName}
                size={22}
                color={selectedIcon === ic ? selectedColor : colors.mutedForeground}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
