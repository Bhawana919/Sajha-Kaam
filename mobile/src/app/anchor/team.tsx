// The team: members with their level and the facts behind it, open seats, clients and invites,
// and the Anchor's choice about the AI helper.
import { router } from 'expo-router';
import { useState } from 'react';
import { Share, View } from 'react-native';

import { useAiHelper, useInvite, useMe, useSeats, useTeam } from '@/api/hooks';
import type { Team } from '@/api/types';
import { Checkbox, Field, useErrorText } from '@/components/forms';
import { Bell, LevelTag, useSkillName } from '@/components/guthi';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button, Panel, Section, StateView } from '@/components/ui';
import { useT } from '@/i18n';
import { colors, space } from '@/theme';

/** Open seats and the test task, starting from what's saved. */
function SeatsForm({ team }: { team: Team }) {
  const { t, digits } = useT();
  const seats = useSeats();
  const [open, setOpen] = useState(team.seats_open);
  const [task, setTask] = useState(team.test_task);
  return (
    <Section title={t('team.seats')} help={t('team.seatsHelp')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Button kind="secondary" label="−" disabled={open <= 0} onPress={() => setOpen(open - 1)} />
        <Txt variant="h2">{digits(open)}</Txt>
        <Button kind="secondary" label="+" disabled={open >= 10} onPress={() => setOpen(open + 1)} />
      </View>
      <Field label={t('team.testTask')} help={t('team.testTaskHelp')} value={task} onChangeText={setTask} multiline />
      <Button label={t('common.save')} busy={seats.isPending} onPress={() => seats.mutate({ seats_open: open, test_task: task })} />
      {seats.isSuccess ? <Txt variant="small" color={colors.green}>{t('team.saved')}</Txt> : null}
      <Button kind="quiet" label={t('team.seeRequests')} onPress={() => router.push('/requests')} />
    </Section>
  );
}

export default function TeamScreen() {
  const { t, digits } = useT();
  const q = useTeam();
  const me = useMe().data;
  const invite = useInvite();
  const ai = useAiHelper();
  const skill = useSkillName();
  const errorText = useErrorText();
  const team = q.data?.team;

  return (
    <Screen title={team?.name ?? t('tabs.team')} right={<Bell />}>
      {q.isLoading ? <StateView state="loading" /> : null}
      {q.data && team ? (
        <>
          <Txt color={colors.inkSoft}>{skill(team.skill)}</Txt>
          <Section title={t('team.members')} help={t('team.membersHelp')}>
            {q.data.members.length ? q.data.members.map((m) => (
              <Panel key={m.person.id}>
                <Txt variant="h3">{m.person.display_name}</Txt>
                <LevelTag level={m.level} />
                <Txt variant="small" color={colors.inkSoft}>
                  {t('team.evidence', { jobs: digits(m.evidence.signed_jobs), streak: digits(m.evidence.first_try_streak),
                    back: digits(m.evidence.sent_back_total) })}
                </Txt>
                <Button kind="secondary" label={t('team.changeLevel')} onPress={() => router.push(`/level/${m.person.id}`)} />
              </Panel>
            )) : <Txt color={colors.inkSoft}>{t('team.noMembers')}</Txt>}
          </Section>

          <SeatsForm team={team} />

          <Section title={t('team.clients')} help={t('team.clientsHelp')}>
            {q.data.clients.map((c) => <Txt key={c.id}>• {c.headline || c.display_name}</Txt>)}
            <Button kind="secondary" icon="share" label={t('team.invite')} busy={invite.isPending} onPress={() => invite.mutate()} />
            {invite.data ? (
              <Panel tone="honey">
                <Txt variant="label">{t('team.inviteCode')}</Txt>
                <Txt variant="h2" selectable>{invite.data.code}</Txt>
                <Txt variant="small">{t('team.inviteHow')}</Txt>
                <Button kind="quiet" label={t('common.share')}
                  onPress={() => Share.share({ message: t('team.inviteMessage', { code: invite.data.code, team: team.name }) })} />
              </Panel>
            ) : null}
            {invite.error ? <Txt color={colors.brick}>{errorText(invite.error)}</Txt> : null}
          </Section>

          <Section title={t('team.aiTitle')} help={t('team.aiHelp')}>
            <Checkbox label={t('team.aiToggle')} checked={!!me?.ai_helper} onChange={(v) => ai.mutate(v)} />
            <Txt variant="small" color={colors.inkSoft}>{t('team.aiPrivacy')}</Txt>
          </Section>
        </>
      ) : null}
    </Screen>
  );
}
