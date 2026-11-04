// Junior home: profile nudge, my teams and level, my jobs (things to fix first).
import { router } from 'expo-router';
import { View } from 'react-native';

import { useJuniorHome, useMe, useSignOut } from '@/api/hooks';
import { BadgeChangeLine, BadgeProgress, Bell, JobCard, LevelTag, useBadge, useSkillName } from '@/components/guthi';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button, NextAction, Panel, Section, StateView } from '@/components/ui';
import { useT } from '@/i18n';
import { money } from '@/lib/format';
import { colors, space } from '@/theme';

export default function JuniorHome() {
  const { t } = useT();
  const q = useJuniorHome();
  const me = useMe().data;
  const skill = useSkillName();
  const badge = useBadge();
  const signOut = useSignOut();
  const h = q.data;
  return (
    <Screen title={me ? t('junior.hello', { name: me.display_name.split(' ')[0] }) : t('tabs.home')} right={<Bell />}>
      {q.isLoading ? <StateView state="loading" /> : null}
      {h ? (
        <>
          {!h.profile_complete ? (
            <NextAction title={t('junior.profileTitle')} body={t('junior.profileBody')} cta={t('common.open')}
              onPress={() => router.push('/junior/profile')} />
          ) : null}
          {!h.teams.length ? (
            <NextAction title={t('junior.noTeamTitle')} body={t('junior.noTeamBody', { count: h.open_teams })} cta={t('common.open')}
              onPress={() => router.push('/junior/teams')} />
          ) : null}
          {h.teams.map((team) => {
            const status = h.team_status?.find((s) => s.team_id === team.id);
            return (
              <Panel key={team.id}>
                <Txt variant="h3">{team.name}</Txt>
                <Txt variant="small" color={colors.inkSoft}>{t('junior.anchor', { name: team.anchor.display_name, where: team.anchor.headline })}</Txt>
                <Txt variant="small">{skill(team.skill)}</Txt>
                <LevelTag level={h.levels[team.id]} />
                {status ? (
                  <>
                    <BadgeChangeLine c={status.last_change} />
                    <BadgeProgress p={status.progress} />
                    <Txt variant="small" color={colors.inkSoft}>{t('badge.rulesHelp')}</Txt>
                    <View style={{ gap: 4 }}>
                      <Txt variant="label">{t('badge.sharing')}</Txt>
                      {status.sharing.map((r) => (
                        <View key={r.person.id} style={{ flexDirection: 'row', gap: space.sm }}>
                          <Txt variant="small" style={{ flex: 1 }}>{r.person.display_name} · {badge(r.level)}</Txt>
                          <Txt variant="small" color={colors.inkSoft}>{t('team.jobs30', { count: r.jobs_30d })}</Txt>
                        </View>
                      ))}
                      <Txt variant="small" color={colors.inkSoft}>{t('badge.sharingHelp')}</Txt>
                    </View>
                  </>
                ) : null}
              </Panel>
            );
          })}
          {h.earnings?.map((m) => (
            <Panel key={m.currency} tone="pine" style={{ gap: 2 }}>
              <Txt variant="label" color={colors.pineSoft}>{t('junior.earned')}</Txt>
              <Txt variant="money" color={colors.white}>{money(m.paid_out_minor, m.currency)}</Txt>
              {m.held_minor ? (
                <Txt variant="small" color={colors.pineSoft}>{t('junior.earnedHeld', { amount: money(m.held_minor, m.currency) })}</Txt>
              ) : null}
            </Panel>
          ))}
          {h.open_jobs?.length ? (
            <Section title={t('junior.openJobs')} help={t('junior.openJobsHelp')}>
              {h.open_jobs.map((j) => <JobCard key={j.id} job={j} />)}
            </Section>
          ) : null}
          <Section title={t('junior.myJobs')}>
            {h.jobs.length ? h.jobs.map((j) => <JobCard key={j.id} job={j} />)
              : <Txt color={colors.inkSoft}>{t('junior.noJobs')}</Txt>}
          </Section>
        </>
      ) : null}
      <Button kind="quiet" label={t('common.signOut')} onPress={async () => { await signOut(); router.replace('/'); }} />
    </Screen>
  );
}
