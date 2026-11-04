// Welcome: what Sajha Kaam is in three lines, then sign in. In demo mode, the story's people come
// first, in the order the demo uses them; everyone else is one tap away.
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useMe, useSampleLogin, useSamples } from '@/api/hooks';
import type { SampleIdentity } from '@/api/types';
import { DhakaBand } from '@/components/brand/Dhaka';
import { useErrorText } from '@/components/forms';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button, Section } from '@/components/ui';
import { useT } from '@/i18n';
import { useSession } from '@/state/session';
import { colors, radius, space } from '@/theme';

import { homeFor } from '@/lib/nav';

/** The demo story's cast, in the order the demo script uses them. */
const STORY = ['u-client-momo', 'u-junior-sita', 'u-anchor-rajan', 'u-junior-pemba', 'u-anchor-anusha', 'u-junior-bikash',
  'u-anchor-nima'];

export default function Welcome() {
  const { t } = useT();
  const signedIn = useSession((s) => !!s.tokens);
  const me = useMe();
  const samples = useSamples();
  const login = useSampleLogin();
  const errorText = useErrorText();
  const [more, setMore] = useState(false);
  if (signedIn && me.data) return <Redirect href={homeFor(me.data) as never} />;

  const go = (id: string) => login.mutate(id, { onSuccess: (m) => router.replace(homeFor(m) as never) });
  const all = samples.data ?? [];
  const cast = STORY.map((id) => all.find((s) => s.user_id === id)).filter(Boolean) as SampleIdentity[];
  const others = all.filter((s) => !STORY.includes(s.user_id));

  const person = (s: SampleIdentity) => (
    <PressScale key={s.user_id} accessibilityRole="button" accessibilityLabel={s.display_name}
      onPress={() => go(s.user_id)} disabled={login.isPending} style={styles.sample}>
      <View style={[styles.dot, { backgroundColor: s.role === 'client' ? colors.brick : s.role === 'anchor' ? colors.pine : colors.honey }]} />
      <View style={{ flex: 1 }}>
        <Txt variant="h3">{s.display_name}</Txt>
        <Txt variant="small" color={colors.inkSoft}>{t(`role.${s.role}`)}{s.headline ? ` · ${s.headline}` : ''}</Txt>
      </View>
      <Icon name="chevronRight" size={20} color={colors.inkFaint} />
    </PressScale>
  );

  return (
    <Screen>
      <View style={styles.brand}>
        <View style={styles.brandText}>
          {/* The name is always in both scripts: Devanagari first, as it is said at home. */}
          <Txt variant="display" color={colors.white} style={{ fontSize: 40 }}>साझा काम</Txt>
          <Txt variant="label" color={colors.brickSoft} style={{ letterSpacing: 2 }}>SAJHA KAAM</Txt>
          <Txt variant="h3" color={colors.white} style={{ marginTop: space.sm }}>{t('welcome.tagline')}</Txt>
        </View>
        <DhakaBand height={18} />
      </View>
      <View style={{ gap: space.md }}>
        {(['how1', 'how2', 'how3'] as const).map((k, i) => (
          <View key={k} style={styles.how}>
            <View style={styles.num}><Txt variant="label" color={colors.white}>{i + 1}</Txt></View>
            <Txt style={{ flex: 1 }}>{t(`welcome.${k}`)}</Txt>
          </View>
        ))}
      </View>
      {cast.length ? (
        <Section title={t('welcome.samplesTitle')} help={t('welcome.samplesHelp')}>
          {login.error ? <Txt color={colors.brick}>{errorText(login.error)}</Txt> : null}
          {cast.map(person)}
          {others.length ? (
            <Pressable accessibilityRole="button" onPress={() => setMore(!more)} hitSlop={8}>
              <Txt variant="label" color={colors.brick}>{more ? t('common.less') : t('welcome.morePeople', { count: others.length })}</Txt>
            </Pressable>
          ) : null}
          {more ? others.map(person) : null}
        </Section>
      ) : null}
      <View style={{ gap: space.sm }}>
        <Button kind="secondary" label={t('auth.signIn')} onPress={() => router.push('/sign-in')} />
        <Button kind="quiet" label={t('auth.createAccount')} onPress={() => router.push('/sign-up')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { backgroundColor: colors.brick, borderRadius: radius.lg, overflow: 'hidden' },
  brandText: { padding: space.xl, gap: 2 },
  how: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.pine, alignItems: 'center', justifyContent: 'center' },
  sample: { backgroundColor: colors.white, borderRadius: radius.md, padding: space.md, flexDirection: 'row', alignItems: 'center',
    gap: space.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
