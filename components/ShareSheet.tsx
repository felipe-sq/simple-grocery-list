import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { SheetModal } from '@/components/SheetModal';
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';
import { useHouseholdMembers } from '@/hooks/useHouseholdMembers';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { supabase } from '@/lib/supabase';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ShareSheet({ visible, onClose }: Props) {
  const colors = useThemeColors();
  const { session } = useAuth();
  const { householdId } = useHousehold();
  const { members } = useHouseholdMembers(visible ? householdId : null);
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

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
    body: { padding: 20, gap: 20 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600' as const,
      letterSpacing: 0.4,
      marginBottom: 8,
      color: c.mutedForeground,
    },
    memberRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      paddingVertical: 8,
    },
    avatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.primary,
    },
    avatarText: { color: c.primaryForeground, fontSize: 15, fontWeight: '700' as const },
    memberName: { fontSize: 15, color: c.foreground },
    youBadge: { fontSize: 13, color: c.mutedForeground },
    description: { fontSize: 14, lineHeight: 20, color: c.mutedForeground, marginBottom: 12 },
    button: {
      backgroundColor: c.primary,
      borderRadius: 10,
      padding: 13,
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      justifyContent: 'center' as const,
      gap: 8,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: c.primaryForeground, fontWeight: '600' as const, fontSize: 15 },
    feedback: { fontSize: 13, color: c.accent, textAlign: 'center' as const, marginTop: 10 },
  }));

  async function handleGenerateInvite() {
    if (!householdId || !session) return;
    setGenerating(true);
    setFeedback(null);

    // Generate a cryptographically random token.
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

    const { error } = await supabase.from('household_invites').insert({
      household_id: householdId,
      token,
      created_by: session.user.id,
    });

    setGenerating(false);

    if (error) {
      setFeedback('Failed to generate invite link. Please try again.');
      return;
    }

    const appUrl = process.env.EXPO_PUBLIC_APP_URL?.replace(/\/$/, '');
    const url = appUrl
      ? `${appUrl}/join?token=${encodeURIComponent(token)}`
      : Linking.createURL('join', { queryParams: { token } });

    await Clipboard.setStringAsync(url);
    setFeedback('Invite link copied to clipboard!');
  }

  return (
    <SheetModal visible={visible} onClose={onClose} snapPoint="60%">
      <View style={styles.header}>
        <Text style={styles.title}>Household</Text>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <View>
          <Text style={styles.sectionLabel}>MEMBERS</Text>
          {members.map((m) => (
            <View key={m.user_id} style={styles.memberRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{m.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.memberName}>{m.name}</Text>
              {m.user_id === session?.user.id && <Text style={styles.youBadge}>(you)</Text>}
            </View>
          ))}
        </View>

        <View>
          <Text style={styles.sectionLabel}>INVITE</Text>
          <Text style={styles.description}>
            Generate a single-use invite link valid for 48 hours. Anyone with the link can join your
            household and see all lists.
          </Text>
          <Pressable
            style={[styles.button, generating && styles.buttonDisabled]}
            onPress={handleGenerateInvite}
            disabled={generating}
            accessibilityRole="button"
            accessibilityLabel={generating ? 'Generating invite link' : 'Generate invite link'}
            accessibilityState={{ disabled: generating }}
          >
            <Ionicons name="link-outline" size={18} color={colors.primaryForeground} />
            <Text style={styles.buttonText}>{generating ? 'Generating…' : 'Generate Invite Link'}</Text>
          </Pressable>
          {feedback !== null && <Text style={styles.feedback}>{feedback}</Text>}
        </View>
      </View>
    </SheetModal>
  );
}
