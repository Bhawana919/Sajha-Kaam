// The Team Leader's Today: first what needs them (one card, one button each), then the numbers,
// then the jobs in progress. Explanations hide behind ⓘ.
import { router } from 'expo-router';

import { useDesk, useMe, useSignOut } from '@/api/hooks';
import { Bell, JobCard } from '@/components/guthi';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { ActionCard, Button, DoNow, Section, StateView, Stats } from '@/components/ui';
import { useT } from '@/i18n';
import { money } from '@/lib/format';
import { colors } from '@/theme';

export default function Desk() {
  const { t, digits } = useT();
  const q = useDesk();
  const me = useMe().data;
  const signOut = useSignOut();
  const d = q.data;
  const first = me?.display_name.split(' ')[0] ?? '';
  const name = (full?: string | null) => full?.split(' ')[0] ?? '';
  const usd = d?.money?.[0];
  return (
    <Screen title={t('desk.hi', { name: first })} right={<Bell />}>
      {d ? <Txt color={colors.inkSoft}>{d.team.name}</Txt> : null}
      {q.isLoading ? <StateView state="loading" /> : null}
      {q.error ? <StateView state="error" onRetry={() => q.refetch()} /> : null}
      {d ? (
        <>
          <DoNow empty={t('desk.allClear')}>
            {[
              ...d.waiting_review.map((w, i) => (
                <ActionCard key={w.job.id} strong={i === 0} icon="review" title={t('desk.doCheck', { name: name(w.job.junior?.display_name) })}
                  line={w.job.title} cta={t('desk.ctaCheck')} onPress={() => router.push(`/review/${w.job.id}`)} />
              )),
              ...d.agreements.filter((j) => j.state === 'with_anchor' || j.state === 'draft').map((j) => (
                <ActionCard key={j.id} icon="post" title={t(j.state === 'draft' ? 'desk.doChanges' : 'desk.doAgree',
                  { client: j.client.display_name.split(' ')[0] })} line={j.title} cta={t('common.open')}
                  onPress={() => router.push(`/job/${j.id}`)} />
              )),
              ...d.to_assign.map((j) => (
                <ActionCard key={j.id} icon="work" title={t('desk.doAssign')} line={j.title} cta={t('desk.ctaChoose')}
                  onPress={() => router.push(`/job/${j.id}`)} />
              )),
              d.join_requests ? (
                <ActionCard key="requests" icon="board" title={t('desk.doRequests', { count: d.join_requests })}
                  cta={t('common.open')} onPress={() => router.push('/requests')} />
              ) : null,
              ...d.open_jobs.slice(0, 2).map((j) => (
                <ActionCard key={j.id} icon="search" title={t('desk.doApply')} line={`${j.title} · ${money(j.budget_minor, j.currency)}`}
                  cta={t('common.open')} onPress={() => router.push(`/job/${j.id}`)} />
              )),
            ]}
          </DoNow>

          <Stats items={[
            { value: `${digits(d.supervising ?? 0)}/${digits(d.supervise_limit ?? 8)}`, label: t('desk.statSupervising') },
            { value: money(usd?.anchor_minor ?? 0, usd?.currency ?? 'USD'), label: t('desk.statYourShare'), tone: 'pine' },
            { value: money(usd?.held_minor ?? 0, usd?.currency ?? 'USD'), label: t('desk.statHeld') },
          ]} />
          <Button kind="secondary" icon="wallet" label={t('wallet.open')} onPress={() => router.push('/wallet')} />
          {me?.leader_verified === false ? (
            <ActionCard icon="stamp" title={t('leader.verifyTitle')} line={t('leader.verifyCard')} cta={t('common.open')}
              onPress={() => router.push('/leader')} />
          ) : null}

          {d.applied_jobs?.length ? (
            <Section title={t('apply.appliedTitle')}>
              {d.applied_jobs.map((j) => <JobCard key={j.id} job={j} />)}
            </Section>
          ) : null}

          <Section title={t('desk.inProgress')} help={t('desk.deadlinesHelp')}>
            {d.deadlines?.length ? d.deadlines.map((j) => <JobCard key={j.id} job={j} />)
              : <Txt color={colors.inkSoft}>{t('desk.nothingInProgress')}</Txt>}
          </Section>

          {d.agreements.some((j) => j.state === 'with_client') ? (
            <Section title={t('desk.waitingClients')} help={t('desk.agreementsHelp')}>
              {d.agreements.filter((j) => j.state === 'with_client').map((j) => <JobCard key={j.id} job={j} />)}
            </Section>
          ) : null}

          <Button kind="secondary" icon="plus" label={t('desk.write')} onPress={() => router.push('/write')} />
        </>
      ) : null}
      <Button kind="quiet" label={t('common.signOut')} onPress={async () => { await signOut(); router.replace('/'); }} />
    </Screen>
  );
}
