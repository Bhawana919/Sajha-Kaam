// Teams with open seats in my skills. Asking to join = a work sample link (the right kind for the
// skill), a short note and the team's test task. The Anchor sees it without my name.
import { useState } from 'react';
import { View } from 'react-native';

import { useJoin, useOpenTeams, useTemplate } from '@/api/hooks';
import type { OpenTeam } from '@/api/types';
import { Field, useErrorText } from '@/components/forms';
import { Bell, useSkillName } from '@/components/guthi';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button, Panel, StateView, Tag } from '@/components/ui';
import { useT } from '@/i18n';
import { colors, space } from '@/theme';

function JoinForm({ item }: { item: OpenTeam }) {
  const { t } = useT();
  const hint = useTemplate().data?.skills.find((s) => s.id === item.team.skill)?.sample_hint ?? '';
  const join = useJoin();
  const errorText = useErrorText();
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [answer, setAnswer] = useState('');
  return (
    <View style={{ gap: space.md }}>
      <Field label={t('teams.sample')} help={hint} value={link} onChangeText={setLink} autoCapitalize="none" placeholder="https://" />
      <Txt variant="small" color={colors.warnInk}>{t('teams.noNameWarning')}</Txt>
      <Field label={t('teams.note')} placeholder={t('teams.noteEx')} value={note} onChangeText={setNote} multiline />
      {item.team.test_task ? (
        <>
          <Txt variant="label">{t('team.testTask')}</Txt>
          <Txt>{item.team.test_task}</Txt>
          <Field label={t('teams.answer')} value={answer} onChangeText={setAnswer} multiline />
        </>
      ) : null}
      <Button label={t('teams.send')} disabled={!link.startsWith('http')} busy={join.isPending}
        onPress={() => join.mutate({ team_id: item.team.id, sample_link: link, note, test_answer: answer })} />
      {join.error ? (
        <Txt color={colors.brick}>{errorText(join.error, { skill_not_in_profile: t('teams.addSkillFirst'),
          already_requested: t('teams.already') })}</Txt>
      ) : null}
    </View>
  );
}

export default function Teams() {
  const { t, digits } = useT();
  const q = useOpenTeams();
  const skill = useSkillName();
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <Screen title={t('teams.title')} right={<Bell />}>
      <Txt color={colors.inkSoft}>{t('teams.help')}</Txt>
      {q.isLoading ? <StateView state="loading" /> : null}
      {q.data && !q.data.length ? <StateView state="empty" message={t('teams.empty')} /> : null}
      {q.data?.map((item) => (
        <Panel key={item.team.id}>
          <Txt variant="h3">{item.team.name}</Txt>
          <Txt variant="small" color={colors.inkSoft}>
            {t('junior.anchor', { name: item.team.anchor.display_name, where: item.team.anchor.headline })}
          </Txt>
          <Tag label={`${skill(item.team.skill)} · ${t('teams.seats', { n: digits(item.team.seats_open) })}`} />
          {item.team.about ? <Txt>{item.team.about}</Txt> : null}
          {item.my_request ? <Tag tone={item.my_request === 'declined' ? 'brick' : 'sage'} label={t(`teams.status_${item.my_request}`)} />
            : openId === item.team.id ? <JoinForm item={item} />
            : <Button kind="secondary" label={t('teams.ask')} onPress={() => setOpenId(item.team.id)} />}
        </Panel>
      ))}
    </Screen>
  );
}
