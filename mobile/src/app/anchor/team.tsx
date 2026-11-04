// The team: each member in a few words (badge, jobs in hand, recent jobs, earned, next badge),
// open spots one tap away, clients and invites.
import { router } from 'expo-router';
import { useState } from 'react';
import { Share, View } from 'react-native';

import { useDesk, useInvite, useSeats, useTeam } from '@/api/hooks';
import type { Team } from '@/api/types';
import { Field, useErrorText } from '@/components/forms';
import { BadgeChangeLine, BadgeProgress, Bell, LevelTag, useSkillName } from '@/components/guthi';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button, Panel, Section, StateView } from '@/components/ui';
import { useT } from '@/i18n';
import { money } from '@/lib/format';
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
  const desk = useDesk().data;
  const invite = useInvite();
  const skill = useSkillName();
  const errorText = useErrorText();
  const [seatsOpen, setSeatsOpen] = useState(false);
  const team = q.data?.team;
  const earned = (id: string) => desk?.member_earnings?.find((e) => e.person.id === id);

  return (
    <Screen title={team?.name ?? t('tabs.team')} right={<Bell />}>
      {q.isLoading ? <StateView state="loading" /> : null}
      {q.data && team ? (
        <>
          <Txt color={colors.inkSoft}>
            {skill(team.skill)} · {t('team.supervising', { n: digits(desk?.supervising ?? 0), max: digits(desk?.supervise_limit ?? 8) })}
          </Txt>
          <Section title={t('team.members')} help={t('team.membersHelp')}>
            {q.data.members.length ? q.data.members.map((m) => {
              const e = earned(m.person.id);
              return (
                <Panel key={m.person.id} style={{ gap: space.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <Txt variant="h3" style={{ flex: 1 }}>{m.person.display_name}</Txt>
                    <LevelTag level={m.level} />
                  </View>
                  <Txt variant="small" color={colors.inkSoft}>
                    {t('team.memberLine', { active: digits(m.active_jobs ?? 0), limit: digits(m.job_limit ?? 1),
                      recent: digits(m.jobs_30d ?? 0), earned: e ? money(e.amount_minor, e.currency) : money(0, 'USD') })}
                  </Txt>
                  {m.progress ? <BadgeProgress p={m.progress} /> : null}
                  <BadgeChangeLine c={m.last_change} />
                  <Button kind="quiet" label={t('team.changeLevel')} onPress={() => router.push(`/level/${m.person.id}`)} />
                </Panel>
              );
            }) : <Txt color={colors.inkSoft}>{t('team.noMembers')}</Txt>}
          </Section>

          <Panel style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Txt style={{ flex: 1 }}>{t('team.openSpots', { count: team.seats_open })}</Txt>
            <Button kind="quiet" label={seatsOpen ? t('common.close') : t('team.change')} onPress={() => setSeatsOpen(!seatsOpen)} />
          </Panel>
          {seatsOpen ? <SeatsForm team={team} /> : null}

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

        </>
      ) : null}
    </Screen>
  );
}
