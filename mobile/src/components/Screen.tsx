// Every screen: a quiet top bar (back, DEMO mark, language), then a large left-aligned title
// that scrolls with the content. No header border, no centred titles, no subtitle under every title.
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { applyLocale, useT } from '@/i18n';
import { useOffline } from '@/lib/offline';
import { usePrefs } from '@/state/prefs';
import { colors, contentMaxWidth, radius, space, touchMin } from '@/theme';

import { Icon } from './Icon';
import { Txt } from './Txt';

/** One button that names the *other* language (the convention on bilingual sites): one tap switches. */
export function LangSwitch({ onDark = false }: { onDark?: boolean }) {
  const { t, locale } = useT();
  const setLocale = usePrefs((s) => s.setLocale);
  const other = locale === 'ne' ? 'en' : 'ne';
  const choose = () => {
    setLocale(other);
    applyLocale(other);
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('lang.switchA11y')}
      onPress={choose}
      hitSlop={8}
      style={({ pressed }) => [styles.lang, onDark && styles.langDark, pressed && { opacity: 0.7 }]}
    >
      <Icon name="globe" size={16} color={onDark ? colors.white : colors.ink} strokeWidth={2} />
      <Txt variant="label" color={onDark ? colors.white : colors.ink}>{other === 'ne' ? 'नेपाली' : 'English'}</Txt>
    </Pressable>
  );
}

/** "DEMO" in the top bar of every screen: the whole build runs on fictional sample data. */
export function DemoMark({ onDark = false }: { onDark?: boolean }) {
  const { t } = useT();
  return (
    <View accessibilityRole="text" accessibilityLabel={t('common.sampleData')} style={[styles.demo, onDark && { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
      <Txt variant="label" color={onDark ? colors.white : colors.warnInk}>{t('common.demoShort')}</Txt>
    </View>
  );
}

/** Shown under the top bar while the phone has no connection. Calm, no countdowns. */
export function OfflineBanner() {
  const { t } = useT();
  if (!useOffline()) return null;
  return (
    <View style={styles.offline} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon name="wifiOff" size={20} color={colors.white} />
      <Txt variant="small" color={colors.white} style={{ flex: 1 }}>{t('common.offline')}</Txt>
    </View>
  );
}

export function TopBar({ back, right }: { back?: boolean; right?: ReactNode }) {
  const { t } = useT();
  return (
    <View style={styles.bar}>
      <View style={styles.barRow}>
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={styles.back}
            hitSlop={8}
          >
            <Icon name="chevronLeft" size={26} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }} />
        {right}
        <DemoMark />
        <LangSwitch />
      </View>
    </View>
  );
}

type Props = {
  title?: string;
  back?: boolean;
  scroll?: boolean;
  children: ReactNode;
  edges?: ('top' | 'bottom')[];
  /** false hides the top bar (screens that carry their own brand block). */
  header?: boolean;
  /** Children are laid out edge to edge (for screens with a full-bleed block). */
  bare?: boolean;
  /** Pinned under the scroll area (the screen's one primary action). */
  footer?: ReactNode;
  /** Extra control in the top bar (for example the notifications bell). */
  right?: ReactNode;
};

export function Screen({ title, back, scroll = true, children, edges = ['top'], header = true, bare = false, footer, right }: Props) {
  const body = (
    <View style={bare ? { flex: 1 } : styles.body}>
      {title ? <Txt variant="h1" accessibilityRole="header" style={styles.title}>{title}</Txt> : null}
      {children}
    </View>
  );
  return (
    <SafeAreaView style={styles.root} edges={header ? edges : []}>
      {header ? <TopBar back={back} right={right} /> : null}
      <OfflineBanner />
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: space.xxxl }} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        body
      )}
      {footer ? <View style={styles.footer}><View style={styles.footerInner}>{footer}</View></View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  bar: { paddingHorizontal: space.lg, paddingTop: space.xs },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: touchMin, width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' },
  back: { minWidth: touchMin - 8, minHeight: touchMin, justifyContent: 'center', marginLeft: -6 },
  title: { marginBottom: space.xs },
  body: { flex: 1, paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.lg, width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' },
  footer: { backgroundColor: colors.paper, paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  footerInner: { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' },
  offline: { backgroundColor: colors.ink, paddingHorizontal: space.lg, paddingVertical: space.xs, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  lang: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: colors.white },
  langDark: { backgroundColor: 'rgba(255,255,255,0.16)' },
  demo: { height: 26, paddingHorizontal: space.sm, borderRadius: radius.sm, backgroundColor: colors.honeyWash, justifyContent: 'center' },
});
