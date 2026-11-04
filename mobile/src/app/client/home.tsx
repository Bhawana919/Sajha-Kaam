// Client home: agreements and changes to answer first, then work ready to accept, then the rest.
import { router } from 'expo-router';

import { useClientHome, useMe, useSignOut } from '@/api/hooks';
import { Bell, JobCard } from '@/components/guthi';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button, NextAction, Section, StateView } from '@/components/ui';
import { useT } from '@/i18n';
import { colors } from '@/theme';

export default function ClientHomeScreen() {
  const { t } = useT();
  const q = useClientHome();
  const me = useMe().data;
  const signOut = useSignOut();
  const h = q.data;
  return (
    <Screen title={t('client.title')} right={<Bell />}>
      {me ? <Txt color={colors.inkSoft}>{me.headline || me.display_name}</Txt> : null}
      {q.isLoading ? <StateView state="loading" /> : null}
      {h ? (
        <>
          {h.anchors.length ? (
            <Txt>{t('client.yourAnchors', { names: h.anchors.map((a) => `${a.display_name} (${a.headline})`).join(', ') })}</Txt>
          ) : <Txt color={colors.inkSoft}>{t('client.noAnchor')}</Txt>}
          {h.to_agree.length ? (
            <Section title={t('client.toAgree')} help={t('client.toAgreeHelp')}>
              {h.to_agree.map((j) => <JobCard key={j.id} job={j} showClient={false} />)}
            </Section>
          ) : null}
          {h.to_choose?.length ? (
            <Section title={t('client.toChoose')} help={t('client.toChooseHelp')}>
              {h.to_choose.map((j) => <JobCard key={j.id} job={j} showClient={false} />)}
            </Section>
          ) : null}
          {h.ready.length ? (
            <Section title={t('client.ready')} help={t('client.readyHelp')}>
              {h.ready.map((r) => <JobCard key={r.job.id} job={r.job} showClient={false} />)}
            </Section>
          ) : null}
          <Section title={t('client.inProgress')}>
            {h.in_progress.length ? h.in_progress.map((j) => <JobCard key={j.id} job={j} showClient={false} />)
              : <NextAction title={t('client.postTitle')} body={t('client.postBody')} cta={t('common.open')}
                  onPress={() => router.push('/client/post')} />}
          </Section>
          {h.done.length ? (
            <Section title={t('client.done')}>
              {h.done.map((j) => <JobCard key={j.id} job={j} showClient={false} />)}
            </Section>
          ) : null}
        </>
      ) : null}
      <Button kind="quiet" label={t('common.signOut')} onPress={async () => { await signOut(); router.replace('/'); }} />
    </Screen>
  );
}
