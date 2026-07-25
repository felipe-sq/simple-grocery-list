import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddItemBar } from '@/components/AddItemBar';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { FilterBar } from '@/components/FilterBar';
import { ListeningOverlay } from '@/components/ListeningOverlay';
import { ListItemsView } from '@/components/ListItemsView';
import { ShareSheet } from '@/components/ShareSheet';
import { VoiceReviewSheet } from '@/components/VoiceReviewSheet';
import { useAuth } from '@/hooks/useAuth';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useHousehold } from '@/hooks/useHousehold';
import { useItems } from '@/hooks/useItems';
import { useLists } from '@/hooks/useLists';
import { usePresence } from '@/hooks/usePresence';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { alert } from '@/lib/alert';
import { parseVoiceInput } from '@/lib/parseVoiceInput';
import type { GroceryItem, ParsedVoiceItem } from '@/types';

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const { householdId } = useHousehold();
  const { lists } = useLists();
  const list = lists.find((l) => l.id === id) ?? null;
  const { items, loading, toggleItem, addItem, deleteItem, clearCompleted } = useItems(id, householdId);

  const userName = session?.user.email?.split('@')[0] ?? 'User';
  const presence = usePresence(householdId, session?.user.id ?? null, userName, id);
  const othersHere = presence.get(id) ?? [];

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [shareVisible, setShareVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceItems, setVoiceItems] = useState<ParsedVoiceItem[]>([]);
  const [voiceReviewVisible, setVoiceReviewVisible] = useState(false);
  const [prefillName, setPrefillName] = useState<string | null>(null);

  const { lookupBarcode } = useBarcodeScanner();

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 8,
      paddingBottom: 8,
    },
    backBtn: { padding: 6 },
    headerCenter: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
    },
    listColorDot: { width: 10, height: 10, borderRadius: 5 },
    presenceDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent },
    headerTitle: { fontSize: 17, fontWeight: '600' as const, color: c.foreground, maxWidth: '70%' as const },
    shareBtn: { padding: 6 },
    loadingCenter: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  }));

  const tags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.tag) set.add(i.tag);
    });
    return [...set].sort();
  }, [items]);

  async function handleAdd(name: string, tag: string | null) {
    const { error } = await addItem({ name, tag: tag ?? selectedTag });
    if (error) alert('Could not add item', error);
  }

  const handleToggle = (item: GroceryItem) => void toggleItem(item.id);
  const handleDelete = (item: GroceryItem) => void deleteItem(item.id);

  function handleClearCompleted() {
    alert(
      'Clear completed items?',
      'All checked-off items will be permanently removed. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => void clearCompleted() },
      ],
    );
  }

  async function handleBarcodeScanned(barcode: string) {
    setScannerVisible(false);
    const prefill = await lookupBarcode(barcode);
    if (prefill.name) {
      setPrefillName(prefill.name);
    } else if (prefill.offline) {
      alert('Offline', 'Could not look up the barcode. Type the item name instead.');
    } else {
      alert('Not found', 'No product found for that barcode. Type the item name instead.');
    }
  }

  function handleTranscribed(transcript: string) {
    setListening(false);
    const parsed = parseVoiceInput(transcript);
    if (parsed.length === 0) return;
    setVoiceItems(parsed);
    setVoiceReviewVisible(true);
  }

  const listColor = list?.color ?? colors.primary;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back to lists"
        >
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.listColorDot, { backgroundColor: listColor }]} />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {list?.name ?? ''}
          </Text>
          {othersHere.length > 0 && (
            <View style={styles.presenceDot} accessibilityLabel={`${othersHere.join(', ')} viewing`} />
          )}
        </View>
        <TouchableOpacity
          onPress={() => setShareVisible(true)}
          hitSlop={12}
          style={styles.shareBtn}
          accessibilityRole="button"
          accessibilityLabel="Household sharing"
        >
          <Ionicons name="person-add-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FilterBar tags={tags} selectedTag={selectedTag} onSelect={setSelectedTag} />

      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ListItemsView
          items={items}
          selectedTag={selectedTag}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onTagPress={(tag) => setSelectedTag(selectedTag === tag ? null : tag)}
          onClearCompleted={handleClearCompleted}
        />
      )}

      <AddItemBar
        tags={tags}
        prefillName={prefillName}
        onAdd={(name, tag) => {
          setPrefillName(null);
          void handleAdd(name, tag);
        }}
        onScanBarcode={() => setScannerVisible(true)}
        onVoice={Platform.OS === 'android' ? undefined : () => setListening(true)}
      />

      <ShareSheet visible={shareVisible} onClose={() => setShareVisible(false)} />

      <BarcodeScanner
        visible={scannerVisible}
        onScan={(barcode) => void handleBarcodeScanned(barcode)}
        onCancel={() => setScannerVisible(false)}
      />

      <ListeningOverlay
        visible={listening}
        onTranscribed={handleTranscribed}
        onCancel={() => setListening(false)}
        onTypeInstead={() => setListening(false)}
      />

      <VoiceReviewSheet
        visible={voiceReviewVisible}
        onClose={() => setVoiceReviewVisible(false)}
        tag={selectedTag}
        items={voiceItems}
        addItem={addItem}
      />
    </KeyboardAvoidingView>
  );
}
