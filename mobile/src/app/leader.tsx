// Become a verified Team Leader: a Mentor's record does it at once; anyone else sends proof for review.
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useLeaderApply, useLeaderStatus, useTemplate } from '@/api/hooks';
import { Field, useErrorText } from '@/components/forms';
import { useSkillName } from '@/components/guthi';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button, Chip, HelpLine, Panel, Section } from '@/components/ui';
import { useT } from '@/i18n';
import { colors, space } from '@/theme';

export default function BecomeLeader() {
  const { t } = useT();
  const st = useLeaderStatus().data;
  const skills = useTemplate().data?.skills ?? [];
  const skillName = useSkillName();
  const apply = useLeaderApply();
  const errorText = useErrorText();
  const [skill, setSkill] = useState('');
  const [team, setTeam] = useState('');
  const [about, setAbout] = useState('');
  const [proof, setProof] = useState(['', '']);
  if (!st) return <Screen back title={t('leader.title')}><Txt>{t('common.loading')}</Txt></Screen>;
  const a = st.application;
  const isLeader = st.role === 'anchor';
  const chosen = skill || st.mentor_skills[0] || '';
  const byRecord = !isLeader && st.mentor_skills.includes(chosen);
  const send = () => apply.mutate({ skill: chosen, team_name: team, about, proof }, {
    onSuccess: (s) => { if (s.role === 'anchor' && s.verified && !isLeader) router.replace('/anchor/desk'); },
  });

  if (st.verified) {
    return (
      <Screen back title={t('leader.title')}>
        <Panel tone="honey" style={{ gap: space.sm }}>
          <Txt variant="h3">{t('leader.verified')}</Txt>
          <Txt>{t('leader.verifiedLine')}</Txt>
        </Panel>
        <Button label={t('leader.goDesk')} onPress={() => router.replace('/anchor/desk')} />
      </Screen>
    );
  }
  return (
    <Screen back title={t(isLeader ? 'leader.verifyTitle' : 'leader.title')}>
      <HelpLine text={t(isLeader ? 'leader.verifyHelp' : 'leader.help')} />

      {a?.status === 'pending' ? (
        <Panel tone="honey" style={{ gap: space.xs }}>
          <Txt variant="h3">{t('leader.waiting')}</Txt>
          <Txt>{t('leader.waitingLine', { team: a.team_name })}</Txt>
        </Panel>
      ) : (
        <>
          {a?.status === 'declined' ? (
            <Panel style={{ gap: space.xs }}>
              <Txt variant="label" color={colors.brick}>{t('leader.declined')}</Txt>
              <Txt>{a.reason}</Txt>
            </Panel>
          ) : null}
          {!isLeader ? (
            <Section title={t('leader.skill')}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {skills.map((s) => <Chip key={s.id} label={skillName(s.id)} on={chosen === s.id} onToggle={() => setSkill(s.id)} />)}
              </View>
              {byRecord ? (
                <Panel tone="honey"><Txt>{t('leader.byRecord', { skill: skillName(chosen) })}</Txt></Panel>
              ) : null}
            </Section>
          ) : null}
          {!isLeader ? <Field label={t('leader.team')} value={team} onChangeText={setTeam} placeholder={t('leader.teamEx')} /> : null}
          {!byRecord ? (
            <>
              <Field label={t('leader.about')} value={about} onChangeText={setAbout} placeholder={t('leader.aboutEx')} multiline />
              {proof.map((p, i) => (
                <Field key={i} label={t('leader.proof', { n: i + 1 })} value={p} autoCapitalize="none" keyboardType="url"
                  placeholder="https://" onChangeText={(v) => setProof(proof.map((x, j) => (j === i ? v : x)))} />
              ))}
            </>
          ) : null}
          <Button label={t(byRecord ? 'leader.start' : 'leader.send')} busy={apply.isPending}
            disabled={(!isLeader && (!chosen || team.trim().length < 3)) || (!byRecord && !proof.some((p) => p.trim()))}
            onPress={send} />
          {apply.error ? <Txt color={colors.brick}>{errorText(apply.error, { proof_required: t('leader.proofNeeded'),
            link_must_be_https: t('room.httpsOnly') })}</Txt> : null}
        </>
      )}
    </Screen>
  );
}
