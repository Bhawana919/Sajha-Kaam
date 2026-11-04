// The Anchor desk: only what needs the Anchor. Work to check first, then agreements not agreed yet,
// jobs to give out, new client jobs for this skill and people asking to join.
import { router } from 'expo-router';

import { useDesk, useMe, useSignOut } from '@/api/hooks';
import { Bell, JobCard } from '@/components/guthi';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button, NextAction, Section, StateView } from '@/components/ui';
import { useT } from '@/i18n';
import { colors } from '@/theme';

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
          {d.to_assign.length ? (
            <Section title={t('desk.toAssign')} help={t('desk.toAssignHelp')}>
              {d.to_assign.map((j) => <JobCard key={j.id} job={j} />)}
            </Section>
          ) : null}
          <Section title={t('desk.openJobs')} help={t('desk.openJobsHelp')}>
            {d.open_jobs.length ? d.open_jobs.map((j) => <JobCard key={j.id} job={j} />)
              : <Txt color={colors.inkSoft}>{t('desk.noOpenJobs')}</Txt>}
          </Section>
        </>
      ) : null}
      <Button kind="quiet" label={t('common.signOut')} onPress={async () => { await signOut(); router.replace('/'); }} />
    </Screen>
  );
}
