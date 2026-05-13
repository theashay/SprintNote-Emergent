import { useState } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Mail, ChevronRight, Lock, AlertCircle } from 'lucide-react-native';
import { colors, radius, shadows, spacing, typography } from '../lib/theme';
import { Text } from '../components/Text';
import AnimatedPressable from '../components/Pressable';
import { api } from '../lib/api';
import { useAuth } from '../lib/store';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup' | 'otp'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const signInStore = useAuth((s) => s.signIn);

  const showErr = (msg: string) => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      window.alert(msg);
    } else {
      Alert.alert('Error', msg);
    }
  };

  const handleEmail = async () => {
    if (!email || !email.includes('@')) return showErr('Please enter a valid email');
    if (!password || password.length < 6) return showErr('Password must be at least 6 characters');
    if (mode === 'signup' && !name) return showErr('Please enter your name');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const r: any = await api.signup({ email, password, name });
        setDevOtp(r.dev_otp || null);
        setMode('otp');
      } else {
        const r: any = await api.login({ email, password });
        if (r.otp_required) {
          setDevOtp(r.dev_otp || null);
          setMode('otp');
        } else if (r.token) {
          await signInStore(r.token, r.user);
          router.replace('/dashboard');
        }
      }
    } catch (e: any) {
      showErr(e.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) return showErr('Enter the 6-digit code');
    setLoading(true);
    try {
      const r = await api.verifyOtp({ email, otp });
      await signInStore(r.token, r.user);
      router.replace('/dashboard');
    } catch (e: any) {
      showErr(e.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      const redirectUrl =
        Platform.OS === 'web'
          ? typeof window !== 'undefined'
            ? window.location.origin + '/'
            : 'https://sprintnote.app/'
          : Linking.createURL('/');
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === 'web') {
        // Browser handles the redirect natively
        if (typeof window !== 'undefined') window.location.href = authUrl;
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      if (result.type !== 'success' || !result.url) {
        setLoading(false);
        return;
      }
      // Parse session_id from URL fragment or query
      const url = result.url;
      const hashMatch = url.match(/[#&?]session_id=([^&]+)/);
      const sessionId = hashMatch ? decodeURIComponent(hashMatch[1]) : null;
      if (!sessionId) {
        showErr('No session returned from Google');
        setLoading(false);
        return;
      }
      const r = await api.emergentSession(sessionId);
      await signInStore(r.token, r.user);
      router.replace('/dashboard');
    } catch (e: any) {
      showErr(e.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.lg }} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={[typography.h1 as any, { color: colors.textPrimary }]}>
              {mode === 'otp' ? 'Check your inbox' : mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </Text>
            <Text variant="bodyLg" color={colors.textSecondary} style={{ marginTop: 6 }}>
              {mode === 'otp'
                ? `We sent a 6-digit code to ${email}.`
                : mode === 'signup'
                ? 'Start turning voice into clear text in seconds.'
                : 'Sign in to capture and shape your thoughts.'}
            </Text>
          </View>

          {mode === 'otp' ? (
            <View style={styles.form}>
              {devOtp ? (
                <View style={styles.devBanner} testID="dev-otp-banner">
                  <AlertCircle size={16} color={colors.primary} />
                  <Text variant="caption" color={colors.primary} style={{ marginLeft: 8 }}>
                    DEV mode — your OTP is{' '}
                    <Text style={{ fontWeight: '800', color: colors.primary }}>{devOtp}</Text>
                  </Text>
                </View>
              ) : null}
              <View style={styles.inputRow}>
                <TextInput
                  testID="otp-input"
                  placeholder="000000"
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={[styles.input, { textAlign: 'center', fontSize: 28, letterSpacing: 14, fontWeight: '700' }]}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <AnimatedPressable testID="verify-otp-btn" onPress={handleVerify} style={styles.primaryBtn}>
                {loading ? <ActivityIndicator color={colors.white} /> : (
                  <>
                    <Text style={styles.primaryBtnText}>Verify & continue</Text>
                    <ChevronRight size={18} color={colors.white} />
                  </>
                )}
              </AnimatedPressable>

              <AnimatedPressable onPress={() => setMode('login')} style={{ marginTop: spacing.md, alignSelf: 'center' }}>
                <Text variant="caption" color={colors.textSecondary}>
                  Use a different email
                </Text>
              </AnimatedPressable>
            </View>
          ) : (
            <View style={styles.form}>
              {mode === 'signup' ? (
                <View style={styles.inputRow}>
                  <TextInput
                    testID="name-input"
                    placeholder="Your name"
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              ) : null}
              <View style={styles.inputRow}>
                <Mail size={18} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  testID="email-input"
                  placeholder="you@work.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={[styles.input, { paddingLeft: 44 }]}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <View style={styles.inputRow}>
                <Lock size={18} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  testID="password-input"
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  style={[styles.input, { paddingLeft: 44 }]}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <AnimatedPressable testID="primary-auth-btn" onPress={handleEmail} style={styles.primaryBtn}>
                {loading ? <ActivityIndicator color={colors.white} /> : (
                  <>
                    <Text style={styles.primaryBtnText}>
                      {mode === 'signup' ? 'Create account' : 'Continue'}
                    </Text>
                    <ChevronRight size={18} color={colors.white} />
                  </>
                )}
              </AnimatedPressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text variant="small" color={colors.textTertiary} style={{ paddingHorizontal: 12 }}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <AnimatedPressable testID="google-auth-btn" onPress={handleGoogle} style={styles.googleBtn}>
                <View style={styles.gIcon}>
                  <Text style={{ fontWeight: '900', color: '#4285F4' }}>G</Text>
                </View>
                <Text style={[typography.body as any, { color: colors.textPrimary, fontWeight: '600' }]}>
                  Continue with Google
                </Text>
              </AnimatedPressable>

              <AnimatedPressable
                testID="toggle-auth-mode"
                onPress={() => setMode(mode === 'signup' ? 'login' : 'signup')}
                style={{ marginTop: spacing.lg, alignSelf: 'center' }}
              >
                <Text variant="caption" color={colors.textSecondary}>
                  {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
                </Text>
              </AnimatedPressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { marginTop: spacing.lg, marginBottom: spacing.xl },
  form: { gap: spacing.md },
  inputRow: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 16, top: 18, zIndex: 1 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textPrimary,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    ...shadows.lg,
  },
  primaryBtnText: { color: colors.white, fontWeight: '700', fontSize: 16, marginRight: 8 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  googleBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...shadows.sm,
  },
  gIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
});
