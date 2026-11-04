import { router } from 'expo-router';
import { useState } from 'react';

import { useLogin } from '@/api/hooks';
import { Field, useErrorText } from '@/components/forms';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/ui';
import { useT } from '@/i18n';
import { colors } from '@/theme';

import { homeFor } from '@/lib/nav';

export default function SignIn() {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();
  const errorText = useErrorText();
  return (
    <Screen title={t('auth.signIn')} back footer={
      <Button label={t('auth.signIn')} busy={login.isPending} disabled={!email || !password}
        onPress={() => login.mutate({ email, password }, { onSuccess: (m) => router.replace(homeFor(m) as never) })} />
    }>
      <Field label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
        autoComplete="email" />
      <Field label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      {login.error ? (
        <Txt color={colors.brick}>{errorText(login.error, { wrong_email_or_password: t('auth.wrong') })}</Txt>
      ) : null}
      <Txt variant="small" color={colors.inkSoft}>{t('auth.demoPassword')}</Txt>
    </Screen>
  );
}
