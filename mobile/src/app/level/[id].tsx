// Changing a junior's level: the five steps, the facts, and a short reason. Only the Anchor decides.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useSetLevel, useTeam, useTemplate } from '@/api/hooks';
import { Field, useErrorText } from '@/components/forms';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button, Panel } from '@/components/ui';
import { useT } from '@/i18n';
import { colors, radius, space } from '@/theme';

export default function Level() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, pick, digits } = useT();
  const member = useTeam().data?.members.find((m) => m.person.id === id);
  const levels = useTemplate().data?.levels ?? {};
  const save = useSetLevel();
  const errorText = useErrorText();
  const [level, setLevel] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const chosen = level ?? member?.level ?? 2;
  if (!member) return <Screen back title={t('team.changeLevel')}><Txt>{t('common.loading')}</Txt></Screen>;
  return (
    <Screen back title={member.person.display_name} footer={
      <Button label={t('common.save')} disabled={reason.trim().length < 3 || chosen === member.level} busy={save.isPending}
        onPress={() => save.mutate({ junior_id: member.person.id, level: chosen, reason }, { onSuccess: () => router.back() })} />
    }>
      <Txt color={colors.inkSoft}>{t('levelScreen.help')}</Txt>
      <Panel tone="honey">
        <Txt variant="small">{t('team.evidence', { jobs: digits(member.evidence.signed_jobs),
          streak: digits(member.evidence.first_try_streak), back: digits(member.evidence.sent_back_total) })}</Txt>
      </Panel>
      {Object.entries(levels).map(([n, l]) => {
        const on = Number(n) === chosen;
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
      <Field label={t('levelScreen.reason')} placeholder={t('levelScreen.reasonEx')} value={reason} onChangeText={setReason} multiline />
      {save.error ? <Txt color={colors.brick}>{errorText(save.error)}</Txt> : null}
    </Screen>
  );
}
