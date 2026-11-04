// Sajha Kaam Review: new Team Leaders waiting to be checked. Approve, or decline with a reason they see.
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { useDecideLeader, useLeaderQueue, useSignOut } from '@/api/hooks';
import { Field } from '@/components/forms';
import { LevelTag } from '@/components/guthi';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button, HelpLine, Panel, Section } from '@/components/ui';
import { useT } from '@/i18n';
import { colors, space } from '@/theme';

export default function Review() {
  const { t, digits } = useT();
  const queue = useLeaderQueue().data ?? [];
  const decide = useDecideLeader();
  const signOut = useSignOut();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  return (
    <Screen title={t('vet.title')}>
      <HelpLine text={t('vet.help')} />
      <Section title={t('vet.waiting', { n: digits(queue.length) })}>
        {queue.length ? queue.map((a) => (
          <Panel key={a.id} style={{ gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Txt variant="h3" style={{ flex: 1 }}>{a.person.display_name}</Txt>
              {a.top_level ? <LevelTag level={a.top_level} /> : null}
            </View>
            <Txt variant="small" color={colors.inkSoft}>
              {a.team_name} · {t('vet.jobs', { count: a.signed_jobs })}{a.person.headline ? ` · ${a.person.headline}` : ''}
            </Txt>
            {a.about ? <Txt>{a.about}</Txt> : null}
            {a.proof.map((p) => (
              <Txt key={p} color={colors.brick} onPress={() => Linking.openURL(p)}>{p}</Txt>
            ))}
            <Button label={t('vet.approve')} busy={decide.isPending} onPress={() => decide.mutate({ id: a.id, approve: true })} />
            <Field label={t('vet.reason')} value={reasons[a.id] ?? ''} placeholder={t('vet.reasonEx')}
              onChangeText={(v) => setReasons({ ...reasons, [a.id]: v })} />
            <Button kind="secondary" label={t('vet.decline')} disabled={(reasons[a.id] ?? '').trim().length < 5}
              onPress={() => decide.mutate({ id: a.id, approve: false, reason: reasons[a.id] })} />
          </Panel>
        )) : <Panel tone="honey"><Txt>{t('vet.none')}</Txt></Panel>}
      </Section>
      <Button kind="quiet" label={t('common.signOut')} onPress={async () => { await signOut(); router.replace('/'); }} />
    </Screen>
  );
}
