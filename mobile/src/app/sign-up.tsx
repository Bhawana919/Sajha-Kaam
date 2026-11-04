// One form for all three roles. A client invited by an Anchor enters the invite code, which links
// them to that Anchor's team. An Anchor names their team and its skill.
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useRegister, useTemplate } from '@/api/hooks';
import type { RegisterIn } from '@/api/types';
import { Field, useErrorText } from '@/components/forms';
import { useSkillName } from '@/components/guthi';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button, Chip } from '@/components/ui';
import { useT } from '@/i18n';
import { colors, space } from '@/theme';

import { homeFor } from '@/lib/nav';

export default function SignUp() {
  const { t } = useT();
  const skills = useTemplate().data?.skills ?? [];
  const skillName = useSkillName();
  const register = useRegister();
  const errorText = useErrorText();
  const [f, setF] = useState<RegisterIn>({ role: 'junior', display_name: '', email: '', password: '', headline: '',
    country: '', invite_code: '', team_name: '', team_skill: '' });
  const set = (k: keyof RegisterIn) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const anchor = f.role === 'anchor';
  const client = f.role === 'client';
  const ready = f.display_name.trim().length >= 2 && f.email.includes('@') && f.password.length >= 8 &&
    (!anchor || (f.team_name.trim().length >= 3 && !!f.team_skill));

  return (
    <Screen title={t('auth.createAccount')} back footer={
      <Button label={t('auth.createAccount')} busy={register.isPending} disabled={!ready}
        onPress={() => register.mutate(f, { onSuccess: (m) => router.replace(homeFor(m) as never) })} />
    }>
      <View style={{ gap: space.sm }}>
        <Txt variant="label">{t('auth.iAm')}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {(['junior', 'anchor', 'client'] as const).map((r) => (
            <Chip key={r} label={t(`role.${r}`)} on={f.role === r} onToggle={() => set('role')(r)} />
          ))}
        </View>
        <Txt variant="small" color={colors.inkSoft}>{t(`auth.roleHelp_${f.role}`)}</Txt>
      </View>
      <Field label={t('auth.name')} value={f.display_name} onChangeText={set('display_name')} />
      <Field label={t('auth.email')} value={f.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" />
      <Field label={t('auth.password')} help={t('auth.passwordHelp')} value={f.password} onChangeText={set('password')} secureTextEntry />
      {anchor || client ? (
        <Field label={t(client ? 'auth.business' : 'auth.workAbroad')} placeholder={t(client ? 'auth.businessEx' : 'auth.workAbroadEx')}
          value={f.headline} onChangeText={set('headline')} />
      ) : null}
      {anchor || client ? <Field label={t('auth.country')} value={f.country} onChangeText={set('country')} /> : null}
      {client ? (
        <Field label={t('auth.invite')} help={t('auth.inviteHelp')} value={f.invite_code} onChangeText={set('invite_code')}
          autoCapitalize="characters" />
      ) : null}
      {anchor ? (
        <>
          <Field label={t('auth.teamName')} placeholder={t('auth.teamNameEx')} value={f.team_name} onChangeText={set('team_name')} />
          <Txt variant="label">{t('auth.teamSkill')}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {skills.map((s) => <Chip key={s.id} label={skillName(s.id)} on={f.team_skill === s.id} onToggle={() => set('team_skill')(s.id)} />)}
          </View>
        </>
      ) : null}
      {register.error ? (
        <Txt color={colors.brick}>
          {errorText(register.error, { email_taken: t('auth.emailTaken'), invite_not_found: t('auth.badInvite') })}
        </Txt>
      ) : null}
    </Screen>
  );
}
