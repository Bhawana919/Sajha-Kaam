// The page a client opens from the Team Leader's link (WhatsApp, email): who invited them, the job
// waiting for them, and a short sign-up. After joining, the agreement is the first thing on their home.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useInviteInfo, useRegister } from '@/api/hooks';
import { Field, useErrorText } from '@/components/forms';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button, Panel, StateView } from '@/components/ui';
import { useT } from '@/i18n';
import { money } from '@/lib/format';
import { colors, space } from '@/theme';

import { homeFor } from '@/lib/nav';

export default function Join() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { t } = useT();
  const info = useInviteInfo(code ?? '');
  const register = useRegister();
  const errorText = useErrorText();
  const [name, setName] = useState('');
  const [business, setBusiness] = useState('');
  const [country, setCountry] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const i = info.data;
  const ready = name.trim().length >= 2 && email.includes('@') && password.length >= 8;

  if (info.isLoading) return <Screen><StateView state="loading" /></Screen>;
  if (!i) return <Screen><StateView state="error" message={t('invite.notFound')} /></Screen>;
  if (i.used) return <Screen><StateView state="empty" message={t('invite.used')} action={
    <Button kind="secondary" label={t('auth.signIn')} onPress={() => router.replace('/sign-in')} />} /></Screen>;

  return (
    <Screen title={t('invite.joinTitle')} footer={
      <Button label={t('invite.join')} disabled={!ready} busy={register.isPending}
        onPress={() => register.mutate({ role: 'client', display_name: name, email, password, headline: business, country,
          invite_code: i.code, team_name: '', team_skill: '' }, { onSuccess: (m) => router.replace(homeFor(m) as never) })} />
    }>
      <Panel tone="brick" style={{ gap: space.sm }}>
        <Txt variant="label" color={colors.brickSoft}>{t('invite.invitedBy')}</Txt>
        <Txt variant="h2" color={colors.white}>{i.leader.display_name}</Txt>
        <Txt variant="small" color={colors.brickSoft}>{i.leader.headline} · {i.team_name}</Txt>
        {i.job_title ? (
          <View style={{ marginTop: space.sm, gap: 2 }}>
            <Txt variant="label" color={colors.brickSoft}>{t('invite.jobWaiting')}</Txt>
            <Txt variant="h3" color={colors.white}>{i.job_title}{i.budget_minor ? ` · ${money(i.budget_minor, 'USD')}` : ''}</Txt>
          </View>
        ) : null}
      </Panel>
      <Txt color={colors.inkSoft}>{t('invite.joinHelp')}</Txt>
      <Field label={t('auth.name')} value={name} onChangeText={setName} />
      <Field label={t('auth.business')} placeholder={t('auth.businessEx')} value={business} onChangeText={setBusiness} />
      <Field label={t('auth.country')} value={country} onChangeText={setCountry} />
      <Field label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label={t('auth.password')} help={t('auth.passwordHelp')} value={password} onChangeText={setPassword} secureTextEntry />
      {register.error ? (
        <Txt color={colors.brick}>{errorText(register.error, { email_taken: t('auth.emailTaken'), invite_not_found: t('auth.badInvite') })}</Txt>
      ) : null}
    </Screen>
  );
}
