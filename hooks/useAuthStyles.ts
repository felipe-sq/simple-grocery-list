import { useThemedStyles } from '@/hooks/useThemedStyles';

// Shared styles for the (auth) and (onboarding) form screens.
export function useAuthStyles() {
  return useThemedStyles((c) => ({
    container: {
      flex: 1,
      justifyContent: 'center' as const,
      padding: 24,
      backgroundColor: c.background,
    },
    title: {
      fontSize: 28,
      fontWeight: '700' as const,
      marginBottom: 16,
      textAlign: 'center' as const,
      color: c.foreground,
    },
    body: {
      fontSize: 15,
      color: c.mutedForeground,
      textAlign: 'center' as const,
      marginBottom: 24,
      lineHeight: 22,
    },
    input: {
      borderWidth: 1,
      borderColor: c.input,
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
      fontSize: 16,
      backgroundColor: c.card,
      color: c.foreground,
    },
    button: {
      backgroundColor: c.primary,
      borderRadius: 10,
      padding: 14,
      alignItems: 'center' as const,
      marginBottom: 16,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: {
      color: c.primaryForeground,
      fontWeight: '600' as const,
      fontSize: 16,
    },
    linkBtn: { alignItems: 'center' as const, marginBottom: 12 },
    link: {
      textAlign: 'center' as const,
      color: c.primary,
      fontSize: 14,
    },
    errorText: {
      color: c.destructive,
      fontSize: 14,
      textAlign: 'center' as const,
      marginBottom: 12,
    },
    topContainer: {
      flex: 1,
      padding: 24,
      paddingTop: 32,
      backgroundColor: c.background,
    },
    description: {
      fontSize: 15,
      color: c.mutedForeground,
      marginBottom: 24,
      lineHeight: 22,
    },
    multilineInput: {
      height: 90,
      textAlignVertical: 'top' as const,
    },
    buttonSecondary: {
      borderWidth: 1.5,
      borderColor: c.primary,
      borderRadius: 10,
      padding: 14,
      alignItems: 'center' as const,
    },
    buttonSecondaryText: {
      color: c.primary,
      fontWeight: '600' as const,
      fontSize: 16,
    },
  }));
}
