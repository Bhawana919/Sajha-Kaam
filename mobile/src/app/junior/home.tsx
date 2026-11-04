// Member home: first the one thing to do (offer, fix, send, apply), then three numbers (badge, earned,
// jobs in hand), then the next badge, then the jobs. How jobs were shared is one tap away.
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useJuniorHome, useMe, useSignOut } from '@/api/hooks';
import { BadgeChangeLine, BadgeProgress, Bell, JobCard, useBadge } from '@/components/guthi';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { ActionCard, Button, DoNow, Panel, Section, StateView, Stats } from '@/components/ui';
import { useT } from '@/i18n';
import { money } from '@/lib/format';
import { colors, space } from '@/theme';

export default function JuniorHome() {
  const { t, digits } = useT();
  const q = useJuniorHome();
  const me = useMe().data;
  const badge = useBadge();
  const signOut = useSignOut();
  const [sharing, setSharing] = useState<string | null>(null);
  const h = q.data;
  const go = (id: string) => router.push(`/job/${id}`);
  const todo = (h?.jobs ?? []).filter((j) => ['assigned', 'sent_back', 'working'].includes(j.state));
  const top = h ? Math.max(0, ...Object.values(h.levels)) : 0;
  const earned = h?.earnings?.[0];
  return (
    <Screen title={me ? t('junior.hello', { name: me.display_name.split(' ')[0] }) : t('tabs.home')} right={<Bell />}>
      {q.isLoading ? <StateView state="loading" /> : null}
      {h ? (
        <>
          <DoNow empty={t('junior.allClear')}>
            {[
              !h.profile_complete ? (
                <ActionCard key="profile" icon="passport" title={t('junior.profileTitle')} line={t('junior.profileBody')}
                  cta={t('common.open')} onPress={() => router.push('/junior/profile')} />
              ) : null,
              !h.teams.length ? (
                <ActionCard key="teams" icon="search" title={t('junior.noTeamTitle')} line={t('junior.noTeamBody', { count: h.open_teams })}
                  cta={t('common.open')} onPress={() => router.push('/junior/teams')} />
              ) : null,
              ...todo.map((j, i) => (
                <ActionCard key={j.id} strong={i === 0} icon={j.state === 'assigned' ? 'post' : j.state === 'sent_back' ? 'flag' : 'upload'}
                  title={t(`junior.do_${j.state}`, { name: j.anchor?.display_name.split(' ')[0] ?? '' })} line={j.title}
                  cta={t(j.state === 'assigned' ? 'junior.ctaRead' : j.state === 'sent_back' ? 'junior.ctaFix' : 'junior.ctaSend')}
                  onPress={() => go(j.id)} />
              )),
              ...(h.openings ?? []).map((j) => (
                <ActionCard key={j.id} icon="search" title={t('opening.card')} line={`${j.title} · ${money(j.budget_minor, j.currency)}`}
                  cta={t('common.open')} onPress={() => go(j.id)} />
              )),
              ...(h.open_jobs ?? []).map((j) => (
                <ActionCard key={j.id} icon="search" title={t('junior.doApply')} line={`${j.title} · ${money(j.budget_minor, j.currency)}`}
                  cta={t('common.open')} onPress={() => go(j.id)} />
              )),
            ]}
          </DoNow>

          {h.applied_jobs?.length ? (
            <Section title={t('apply.appliedTitle')}>
              {h.applied_jobs.map((j) => <JobCard key={j.id} job={j} mine />)}
            </Section>
          ) : null}

          {h.teams.length ? (
            <Stats items={[
              { value: '★'.repeat(top || 1), label: badge(top || 1).replace(/^★+ /, '') },
              { value: money(earned?.paid_out_minor ?? 0, earned?.currency ?? 'USD'), label: t('junior.statEarned'), tone: 'pine' },
              { value: `${digits(h.active_jobs ?? 0)}/${digits(h.job_limit ?? 1)}`, label: t('junior.statJobs') },
            ]} />
          ) : null}
          {earned?.held_minor ? (
            <Txt variant="small" color={colors.inkSoft}>{t('junior.earnedHeld', { amount: money(earned.held_minor, earned.currency) })}</Txt>
          ) : null}
          {h.teams.length ? <Button kind="secondary" icon="wallet" label={t('wallet.open')} onPress={() => router.push('/wallet')} /> : null}

          {h.teams.map((team) => {
            const status = h.team_status?.find((s) => s.team_id === team.id);
            return (
              <Panel key={team.id} style={{ gap: space.sm }}>
                <Txt variant="h3">{team.name}</Txt>
                <Txt variant="small" color={colors.inkSoft}>{t('junior.leader', { name: team.anchor.display_name })} · {badge(h.levels[team.id])}</Txt>
                {status ? (
                  <>
                    <BadgeProgress p={status.progress} />
                    <BadgeChangeLine c={status.last_change} />
                    <Pressable accessibilityRole="button" onPress={() => setSharing(sharing === team.id ? null : team.id)} hitSlop={6}>
                      <Txt variant="label" color={colors.brick}>{t('badge.sharing')}</Txt>
                    </Pressable>
                    {sharing === team.id ? (
                      <View style={{ gap: 4 }}>
                        {status.sharing.map((r) => (
                          <View key={r.person.id} style={{ flexDirection: 'row', gap: space.sm }}>
                            <Txt variant="small" style={{ flex: 1 }}>{r.person.display_name} · {badge(r.level)}</Txt>
                            <Txt variant="small" color={colors.inkSoft}>{t('team.jobs30', { count: r.jobs_30d })}</Txt>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </>
                ) : null}
              </Panel>
            );
          })}

          <Section title={t('junior.myJobs')} help={t('badge.rulesHelp')}>
            {h.jobs.filter((j) => !todo.includes(j)).length
              ? h.jobs.filter((j) => !todo.includes(j)).slice(0, 3).map((j) => <JobCard key={j.id} job={j} mine />)
              : <Txt color={colors.inkSoft}>{t('junior.noJobs')}</Txt>}
            {h.jobs.filter((j) => !todo.includes(j)).length > 3 ? (
              <Button kind="quiet" label={t('junior.seeAll', { count: h.log_entries })} onPress={() => router.push('/junior/logbook')} />
            ) : null}
          </Section>
        </>
      ) : null}
      <Button kind="quiet" label={t('common.signOut')} onPress={async () => { await signOut(); router.replace('/'); }} />
    </Screen>
  );
}
