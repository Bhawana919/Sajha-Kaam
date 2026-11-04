import { AnekDevanagari_600SemiBold, AnekDevanagari_700Bold } from '@expo-google-fonts/anek-devanagari';
import { Mukta_400Regular, Mukta_500Medium, Mukta_600SemiBold } from '@expo-google-fonts/mukta';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { applyLocale } from '@/i18n';
import { useMotionOK } from '@/lib/motion';
import '@/lib/offline';
import { usePrefs } from '@/state/prefs';
import { useSession } from '@/state/session';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000, gcTime: 10 * 60_000 } } });

function usePrefsHydrated() {
  const [hydrated, setHydrated] = useState(usePrefs.persist.hasHydrated());
  useEffect(() => usePrefs.persist.onFinishHydration(() => setHydrated(true)), []);
  return hydrated;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    AnekDevanagari_600SemiBold, AnekDevanagari_700Bold, Mukta_400Regular, Mukta_500Medium, Mukta_600SemiBold,
  });
  const hydrated = usePrefsHydrated();
  const locale = usePrefs((s) => s.locale);
  const { loaded: sessionLoaded, load } = useSession();
  const motionOK = useMotionOK();

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (hydrated && locale) applyLocale(locale);
  }, [hydrated, locale]);

  const ready = (fontsLoaded || !!fontError) && hydrated && sessionLoaded;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);
  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper },
          animation: motionOK ? 'ios_from_right' : 'none', animationDuration: 240 }} />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
