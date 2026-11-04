// The Anchor desk: only what needs the Anchor. Work to check first, then agreements not agreed yet,
// jobs to give out, new client jobs for this skill and people asking to join.
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useDesk, useMe, useSignOut } from '@/api/hooks';
import { Bell, JobCard } from '@/components/guthi';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import type { Desk as DeskData } from '@/api/types';
import { Button, NextAction, Panel, Section, StateView } from '@/components/ui';
import { useT } from '@/i18n';
import { money } from '@/lib/format';
import { colors, space } from '@/theme';

/** The team's demo money: paid out, held, the Leader's 10% and each member's 75%. */
function Earnings({ d }: { d: DeskData }) {
  const { t } = useT();
  const money_ = d.money ?? [];
  return (
    <Section title={t('desk.money')} help={t('desk.moneyHelp')}>
      {money_.length ? money_.map((m) => (
        <Panel key={m.currency} tone="pine" style={{ gap: space.sm }}>
          <Txt variant="label" color={colors.pineSoft}>{t('desk.paidOut')}</Txt>
          <Txt variant="money" color={colors.white}>{money(m.paid_out_minor, m.currency)}</Txt>
          <Row light label={t('desk.yourShare')} value={money(m.anchor_minor, m.currency)} />
          <Row light label={t('desk.held')} value={money(m.held_minor, m.currency)} />
        </Panel>
      )) : <Txt color={colors.inkSoft}>{t('desk.noMoney')}</Txt>}
      {d.member_earnings?.length ? (
        <Panel style={{ gap: space.sm }}>
          <Txt variant="label" color={colors.inkSoft}>{t('desk.byMember')}</Txt>
          {d.member_earnings.map((m) => (
            <View key={`${m.person.id}-${m.currency}`} style={styles.member}>
              <View style={{ flex: 1 }}>
                <Txt variant="h3">{m.person.display_name}</Txt>
                <Txt variant="small" color={colors.inkSoft}>{t('desk.memberJobs', { count: m.jobs })}</Txt>
              </View>
              <Txt variant="money" style={{ fontSize: 20 }}>{money(m.amount_minor, m.currency)}</Txt>
            </View>
          ))}
        </Panel>
      ) : null}
    </Section>
  );
}

/** A label / value line on the dark pine block. */
function Row({ label, value, light }: { label: string; value: string; light?: boolean }) {
  return (
    <View style={styles.member}>
      <Txt variant="small" color={light ? colors.pineSoft : colors.inkSoft} style={{ flex: 1 }}>{label}</Txt>
      <Txt variant="h3" color={light ? colors.white : colors.ink}>{value}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  member: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});

export default function Desk() {
  const { t, digits } = useT();
  const q = useDesk();
  const me = useMe().data;
  const signOut = useSignOut();
  const d = q.data;
  return (
    <Screen title={t('desk.title')} right={<Bell />}>
      {me ? <Txt color={colors.inkSoft}>{t('desk.hello', { name: me.display_name, team: d?.team.name ?? '' })}</Txt> : null}
      {q.isLoading ? <StateView state="loading" /> : null}
      {q.error ? <StateView state="error" onRetry={() => q.refetch()} /> : null}
      {d ? (
        <>
          {d.join_requests ? (
            <NextAction title={t('desk.requestsTitle')} body={t('desk.requests', { count: d.join_requests })}
              cta={t('common.open')} onPress={() => router.push('/requests')} />
          ) : null}
          <Section title={t('desk.toCheck', { n: digits(d.waiting_review.length) })} help={t('desk.toCheckHelp')}>
            {d.waiting_review.length ? d.waiting_review.map((w) => (
              <JobCard key={w.job.id} job={w.job} href={`/review/${w.job.id}`} />
            )) : <Txt color={colors.inkSoft}>{t('desk.nothingToCheck')}</Txt>}
          </Section>
          <Section title={t('desk.agreements')} help={t('desk.agreementsHelp')}
            action={<Button kind="secondary" icon="plus" label={t('desk.write')} onPress={() => router.push('/write')} />}>
            {d.agreements.length ? d.agreements.map((j) => <JobCard key={j.id} job={j} />)
              : <Txt color={colors.inkSoft}>{t('desk.noAgreements')}</Txt>}
          </Section>
          <Section title={t('desk.deadlines')} help={t('desk.deadlinesHelp')}>
            {d.deadlines?.length ? d.deadlines.map((j) => <JobCard key={j.id} job={j} />)
              : <Txt color={colors.inkSoft}>{t('desk.nothingToCheck')}</Txt>}
          </Section>
          {d.to_assign.length ? (
            <Section title={t('desk.toAssign')} help={t('desk.toAssignHelp')}>
              {d.to_assign.map((j) => <JobCard key={j.id} job={j} />)}
            </Section>
          ) : null}
          <Section title={t('desk.openJobs')} help={t('desk.openJobsHelp')}>
            {d.open_jobs.length ? d.open_jobs.map((j) => <JobCard key={j.id} job={j} />)
              : <Txt color={colors.inkSoft}>{t('desk.noOpenJobs')}</Txt>}
          </Section>
          <Earnings d={d} />
        </>
      ) : null}
      <Button kind="quiet" label={t('common.signOut')} onPress={async () => { await signOut(); router.replace('/'); }} />
    </Screen>
  );
}
