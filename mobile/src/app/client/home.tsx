// Client home: first what needs the client (agree, choose, pay, accept), each as one card with one
// button; then jobs in progress and finished. Explanations hide behind ⓘ.
import { router } from 'expo-router';

import { useClientHome, useMe, useSignOut } from '@/api/hooks';
import { Bell, JobCard } from '@/components/guthi';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { ActionCard, Button, DoNow, Section, StateView } from '@/components/ui';
import { useT } from '@/i18n';
import { money } from '@/lib/format';
import { colors } from '@/theme';

export default function ClientHomeScreen() {
  const { t } = useT();
  const q = useClientHome();
  const me = useMe().data;
  const signOut = useSignOut();
  const h = q.data;
  const toPay = (h?.in_progress ?? []).filter((j) => j.agreed_at && j.payment === 'unpaid');
  const go = (id: string) => router.push(`/job/${id}`);
  return (
    <Screen title={me ? (me.headline || me.display_name) : t('client.title')} right={<Bell />}>
      {q.isLoading ? <StateView state="loading" /> : null}
      {h ? (
        <>
          <DoNow empty={t('client.allClear')}>
            {[
              ...h.ready.map((r, i) => (
                <ActionCard key={r.job.id} strong={i === 0} icon="stamp" title={t('client.doAccept')} line={r.job.title}
                  cta={t('client.ctaSee')} onPress={() => go(r.job.id)} />
              )),
              ...(h.to_choose ?? []).map((j) => (
                <ActionCard key={j.id} icon="search" title={t('client.doChoose')} line={j.title} cta={t('client.ctaChoose')}
                  onPress={() => go(j.id)} />
              )),
              ...h.to_agree.map((j) => (
                <ActionCard key={j.id} icon="post" title={t(j.pending_change ? 'client.doChange' : 'client.doAgree')} line={j.title}
                  cta={t('common.open')} onPress={() => go(j.id)} />
              )),
              ...toPay.map((j) => (
                <ActionCard key={j.id} icon="lock" title={t('client.doPay', { amount: money(j.budget_minor, j.currency) })}
                  line={j.title} cta={t('client.ctaPay')} onPress={() => go(j.id)} />
              )),
            ]}
          </DoNow>

          <Section title={t('client.inProgress')}>
            {h.in_progress.filter((j) => !toPay.includes(j)).length
              ? h.in_progress.filter((j) => !toPay.includes(j)).map((j) => <JobCard key={j.id} job={j} showClient={false} />)
              : <Txt color={colors.inkSoft}>{t('client.nothingInProgress')}</Txt>}
          </Section>

          <Button icon="plus" kind="secondary" label={t('client.postNew')} onPress={() => router.push('/client/post')} />

          {h.done.length ? (
            <Section title={t('client.done')}>
              {h.done.map((j) => <JobCard key={j.id} job={j} showClient={false} />)}
            </Section>
          ) : null}

          {h.anchors.length ? (
            <Txt variant="small" color={colors.inkSoft}>
              {t('client.yourAnchors', { names: h.anchors.map((a) => a.display_name).join(', ') })}
            </Txt>
          ) : null}
        </>
      ) : null}
      <Button kind="quiet" label={t('common.signOut')} onPress={async () => { await signOut(); router.replace('/'); }} />
    </Screen>
  );
}
