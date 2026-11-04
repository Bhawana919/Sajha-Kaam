// A member's badge, from the Team Leader's side. Badges go up by themselves by the public rules; the
// Leader can only LOWER a badge or PAUSE the next promotion (once), always with a reason the member sees.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { usePausePromotion, useSetLevel, useTeam, useTemplate } from '@/api/hooks';
import { Field, useErrorText } from '@/components/forms';
import { BadgeChangeLine, BadgeProgress, LevelTag } from '@/components/guthi';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button, HelpLine, Panel, Section } from '@/components/ui';
import { useT } from '@/i18n';
import { colors, radius, space } from '@/theme';

export default function Level() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, pick, digits } = useT();
  const member = useTeam().data?.members.find((m) => m.person.id === id);
  const levels = useTemplate().data?.levels ?? {};
  const lower = useSetLevel();
  const pause = usePausePromotion();
  const errorText = useErrorText();
  const [level, setLevel] = useState<number | null>(null);
  const [lowerReason, setLowerReason] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  if (!member) return <Screen back title={t('team.changeLevel')}><Txt>{t('common.loading')}</Txt></Screen>;
  const below = Object.entries(levels).filter(([n]) => Number(n) < member.level);
  const paused = !!member.progress?.paused_reason;
  return (
    <Screen back title={member.person.display_name}>
      <LevelTag level={member.level} />
      <HelpLine text={t('levelScreen.help')} />
      <Panel tone="honey" style={{ gap: space.sm }}>
        <Txt variant="small">{t('team.evidence', { jobs: digits(member.evidence.signed_jobs),
          streak: digits(member.evidence.first_try_streak), back: digits(member.evidence.sent_back_total) })}</Txt>
        {member.progress ? <BadgeProgress p={member.progress} /> : null}
        <BadgeChangeLine c={member.last_change} />
      </Panel>

      {member.level < 5 && !paused ? (
        <Section title={t('levelScreen.pauseTitle')} help={t('levelScreen.pauseHelp')}>
          <Field label={t('levelScreen.reason')} placeholder={t('levelScreen.pauseEx')} value={pauseReason}
            onChangeText={setPauseReason} multiline />
          <Button kind="secondary" label={t('levelScreen.pauseSave')} disabled={pauseReason.trim().length < 3}
            busy={pause.isPending} onPress={() => pause.mutate({ junior_id: member.person.id, reason: pauseReason },
              { onSuccess: () => setPauseReason('') })} />
          {pause.error ? <Txt color={colors.brick}>{errorText(pause.error, { already_paused: t('badge.alreadyPaused') })}</Txt> : null}
        </Section>
      ) : null}

      {below.length ? (
        <Section title={t('levelScreen.lowerTitle')} help={t('levelScreen.lowerHelp')}>
          {below.map(([n, l]) => {
            const on = Number(n) === level;
            return (
              <Pressable key={n} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setLevel(Number(n))}
                style={{ backgroundColor: colors.white, borderRadius: radius.md, padding: space.md, flexDirection: 'row', gap: space.md,
                  borderWidth: 2, borderColor: on ? colors.ink : 'transparent' }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="h3">{'★'.repeat(Number(n))} {pick(l.ne, l.en)}</Txt>
                  <Txt variant="small" color={colors.inkSoft}>{t(`levelScreen.means${n}`)}</Txt>
                </View>
                {on ? <Icon name="check" size={20} color={colors.green} strokeWidth={2.4} /> : null}
              </Pressable>
            );
          })}
          <Field label={t('levelScreen.reason')} placeholder={t('levelScreen.lowerEx')} value={lowerReason}
            onChangeText={setLowerReason} multiline />
          <Button label={t('levelScreen.lowerSave')} disabled={!level || lowerReason.trim().length < 3} busy={lower.isPending}
            onPress={() => level && lower.mutate({ junior_id: member.person.id, level, reason: lowerReason },
              { onSuccess: () => router.back() })} />
          {lower.error ? <Txt color={colors.brick}>{errorText(lower.error)}</Txt> : null}
        </Section>
      ) : null}
    </Screen>
  );
}
