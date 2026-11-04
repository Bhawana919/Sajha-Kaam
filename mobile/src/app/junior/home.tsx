// Junior home: profile nudge, my teams and level, my jobs (things to fix first).
import { router } from 'expo-router';

import { useJuniorHome, useMe, useSignOut } from '@/api/hooks';
import { Bell, JobCard, LevelTag, useSkillName } from '@/components/guthi';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button, NextAction, Panel, Section, StateView } from '@/components/ui';
import { useT } from '@/i18n';
import { colors } from '@/theme';

export default function JuniorHome() {
  const { t } = useT();
  const q = useJuniorHome();
  const me = useMe().data;
  const skill = useSkillName();
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
          {h.teams.map((team) => (
            <Panel key={team.id}>
              <Txt variant="h3">{team.name}</Txt>
              <Txt variant="small" color={colors.inkSoft}>{t('junior.anchor', { name: team.anchor.display_name, where: team.anchor.headline })}</Txt>
              <Txt variant="small">{skill(team.skill)}</Txt>
              <LevelTag level={h.levels[team.id]} />
            </Panel>
          ))}
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
