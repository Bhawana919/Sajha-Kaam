// The Anchor checks a junior's work: the work itself, the first check, then Approve or Send back.
// A send-back note goes to the junior and into the Anchor's notes for future first checks.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';

import { useApprove, useJob, useSendBack } from '@/api/hooks';
import { Field, useErrorText } from '@/components/forms';
import { CheckView, LevelTag } from '@/components/guthi';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Bullet, Button, Panel, Section, StateView } from '@/components/ui';
import { useT } from '@/i18n';
import { colors, space } from '@/theme';

export default function Review() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const q = useJob(id);
  const approve = useApprove();
  const sendBack = useSendBack();
  const errorText = useErrorText();
  const [note, setNote] = useState('');
  const d = q.data;
  const sub = d?.submissions.find((s) => s.status === 'waiting');
  const done = () => router.replace('/anchor/desk');

  return (
    <Screen back title={d?.job.title ?? t('review.title')}>
      {q.isLoading ? <StateView state="loading" /> : null}
      {d && !sub ? <StateView state="empty" message={t('review.nothing')} /> : null}
      {d && sub ? (
        <>
          <Txt color={colors.inkSoft}>{t('review.by', { name: d.job.junior?.display_name ?? '' })}</Txt>
          {d.job.supervision_level ? <LevelTag level={d.job.supervision_level} /> : null}
          <Section title={t('review.work')}>
            {sub.link ? <Button kind="secondary" icon="eye" label={t('job.openWork')} onPress={() => Linking.openURL(sub.link)} /> : null}
            {sub.content ? (
              <Panel><Txt variant="small" selectable style={{ fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) }}>{sub.content}</Txt></Panel>
            ) : null}
            {sub.note ? <Txt>“{sub.note}”</Txt> : null}
          </Section>
          <CheckView check={sub.check} />
          <Panel>
            <Txt variant="label">{t('post.f_done_when')}</Txt>
            {d.job.done_when.map((x) => <Bullet key={x} mark="☐">{x}</Bullet>)}
          </Panel>
          <Button label={t('review.approve')} busy={approve.isPending} onPress={() => approve.mutate(sub.id, { onSuccess: done })} />
          <View style={{ gap: space.sm }}>
            <Field label={t('review.sendBackNote')} help={t('review.sendBackHelp')} value={note} onChangeText={setNote} multiline />
            <Button kind="secondary" label={t('review.sendBack')} disabled={note.trim().length < 3} busy={sendBack.isPending}
              onPress={() => sendBack.mutate({ id: sub.id, note }, { onSuccess: done })} />
          </View>
          {approve.error || sendBack.error ? <Txt color={colors.brick}>{errorText(approve.error ?? sendBack.error)}</Txt> : null}
        </>
      ) : null}
    </Screen>
  );
}
