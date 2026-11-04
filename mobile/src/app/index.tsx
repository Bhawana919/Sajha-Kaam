// Welcome: what Sajha Kaam is in three lines, then sign in. In demo mode, one tap on a sample person.
import { Redirect, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useMe, useSampleLogin, useSamples } from '@/api/hooks';
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

export default function Welcome() {
  const { t } = useT();
  const signedIn = useSession((s) => !!s.tokens);
  const me = useMe();
  const samples = useSamples();
  const login = useSampleLogin();
  const errorText = useErrorText();
  if (signedIn && me.data) return <Redirect href={homeFor(me.data) as never} />;

  const go = (id: string) => login.mutate(id, { onSuccess: (m) => router.replace(homeFor(m) as never) });
  const roles = ['anchor', 'junior', 'client'] as const;

  return (
    <Screen>
      <View style={styles.brand}>
        <Txt variant="display" color={colors.white}>{t('common.appName')}</Txt>
        <Txt variant="h3" color={colors.honeyLight}>{t('welcome.tagline')}</Txt>
      </View>
      <View style={{ gap: space.md }}>
        {(['how1', 'how2', 'how3'] as const).map((k, i) => (
          <View key={k} style={styles.how}>
            <View style={styles.num}><Txt variant="label" color={colors.white}>{i + 1}</Txt></View>
            <Txt style={{ flex: 1 }}>{t(`welcome.${k}`)}</Txt>
          </View>
        ))}
      </View>
      <View style={{ gap: space.sm }}>
        <Button label={t('auth.signIn')} onPress={() => router.push('/sign-in')} />
        <Button kind="secondary" label={t('auth.createAccount')} onPress={() => router.push('/sign-up')} />
      </View>
      {samples.data?.length ? (
        <Section title={t('welcome.samplesTitle')} help={t('welcome.samplesHelp')}>
          {login.error ? <Txt color={colors.brick}>{errorText(login.error)}</Txt> : null}
          {roles.map((role) => (
            <View key={role} style={{ gap: space.sm }}>
              <Txt variant="label" color={colors.inkSoft}>{t(`role.${role}`)}</Txt>
              {samples.data.filter((s) => s.role === role).map((s) => (
                <PressScale key={s.user_id} accessibilityRole="button" accessibilityLabel={s.display_name}
                  onPress={() => go(s.user_id)} disabled={login.isPending} style={styles.sample}>
                  <View style={{ flex: 1 }}>
                    <Txt variant="h3">{s.display_name}</Txt>
                    {s.headline ? <Txt variant="small" color={colors.inkSoft}>{s.headline}</Txt> : null}
                  </View>
                  <Icon name="chevronRight" size={20} color={colors.inkFaint} />
                </PressScale>
              ))}
            </View>
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { backgroundColor: colors.pine, borderRadius: radius.lg, padding: space.xl, gap: space.sm },
  how: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  sample: { backgroundColor: colors.white, borderRadius: radius.md, padding: space.md, flexDirection: 'row', alignItems: 'center' },
});
