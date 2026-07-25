import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShareSheet } from '@/components/ShareSheet';
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';
import { useHouseholdMembers } from '@/hooks/useHouseholdMembers';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { alert } from '@/lib/alert';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const { householdId } = useHousehold();
  const { members } = useHouseholdMembers(householdId);
  const [shareVisible, setShareVisible] = useState(false);

  const email = session?.user.email ?? '';
  const name = email.split('@')[0] || 'User';
  const initial = name.charAt(0).toUpperCase();

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 8,
      paddingBottom: 8,
    },
    backBtn: { padding: 6 },
    headerTitle: { flex: 1, textAlign: 'center' as const, fontSize: 17, fontWeight: '600' as const, color: c.foreground },
    headerSpacer: { width: 38 },
    scrollContent: { padding: 20, paddingBottom: 60 },
    profile: { alignItems: 'center' as const, marginBottom: 28 },
    avatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.primary,
      marginBottom: 12,
    },
    avatarText: { color: c.primaryForeground, fontSize: 36, fontWeight: '700' as const },
    profileName: { fontSize: 24, fontWeight: '700' as const, color: c.foreground },
    profileEmail: { fontSize: 15, color: c.mutedForeground, marginTop: 2 },
    section: {
      backgroundColor: c.card,
      borderRadius: 14,
      marginBottom: 18,
      overflow: 'hidden' as const,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600' as const,
      letterSpacing: 0.4,
      color: c.mutedForeground,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 6,
    },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderTopWidth: 0.5,
      borderTopColor: c.border,
    },
    rowIcon: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: `${c.primary}18`,
    },
    rowLabel: { flex: 1, fontSize: 16, color: c.foreground },
    rowValue: { fontSize: 15, color: c.mutedForeground, maxWidth: '55%' as const },
    signOutBtn: {
      backgroundColor: `${c.destructive}12`,
      borderWidth: 1,
      borderColor: `${c.destructive}33`,
      borderRadius: 14,
      paddingVertical: 15,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
    },
    signOutText: { color: c.destructive, fontWeight: '600' as const, fontSize: 16 },
  }));

  function handleSignOut() {
    alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => void supabase.auth.signOut() },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="mail-outline" size={17} color={colors.primary} />
            </View>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {email}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HOUSEHOLD</Text>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="people-outline" size={17} color={colors.primary} />
            </View>
            <Text style={styles.rowLabel}>Members</Text>
            <Text style={styles.rowValue}>{members.length}</Text>
          </View>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setShareVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Invite a member"
          >
            <View style={styles.rowIcon}>
              <Ionicons name="link-outline" size={17} color={colors.primary} />
            </View>
            <Text style={styles.rowLabel}>Invite a member</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ABOUT</Text>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="cart-outline" size={17} color={colors.primary} />
            </View>
            <Text style={styles.rowLabel}>Grocery List</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="shield-checkmark-outline" size={17} color={colors.primary} />
            </View>
            <Text style={styles.rowLabel}>Privacy</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              Your data is securely stored
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <ShareSheet visible={shareVisible} onClose={() => setShareVisible(false)} />
    </View>
  );
}
