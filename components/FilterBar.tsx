import { ScrollView, Text, TouchableOpacity } from 'react-native';

import { getTagColor } from '@/components/TagPill';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useThemedStyles } from '@/hooks/useThemedStyles';

interface Props {
  tags: string[];
  selectedTag: string | null;
  onSelect: (tag: string | null) => void;
}

export function FilterBar({ tags, selectedTag, onSelect }: Props) {
  const colors = useThemeColors();
  const styles = useThemedStyles((c) => ({
    scroll: { backgroundColor: c.background, flexGrow: 0 },
    container: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
      flexDirection: 'row' as const,
    },
  }));

  if (tags.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Chip label="All" selected={selectedTag === null} color={colors.primary} onPress={() => onSelect(null)} />
      {tags.map((tag) => (
        <Chip
          key={tag}
          label={tag}
          selected={selectedTag === tag}
          color={getTagColor(tag)}
          onPress={() => onSelect(selectedTag === tag ? null : tag)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({ label, selected, color, onPress }: { label: string; selected: boolean; color: string; onPress: () => void }) {
  const styles = useThemedStyles((c) => ({
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 100,
      borderWidth: 1,
      backgroundColor: selected ? color : c.card,
      borderColor: selected ? color : c.border,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: selected ? '#fff' : c.mutedForeground,
    },
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.chip}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Text style={styles.chipText}>{label}</Text>
    </TouchableOpacity>
  );
}
