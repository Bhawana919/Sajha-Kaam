// People asking to join, shown blind as "Applicant A, B…": work sample, skills and test answer only.
import { Linking, View } from 'react-native';

import { useDecide, useRequests, useTeam } from '@/api/hooks';
import { useErrorText } from '@/components/forms';
import { useSkillName } from '@/components/guthi';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button, Panel, Row, StateView } from '@/components/ui';
import { useT } from '@/i18n';
import { colors, space } from '@/theme';

export default function Requests() {
  const { t, digits } = useT();
  const q = useRequests();
  const team = useTeam().data?.team;
  const decide = useDecide();
  const skill = useSkillName();
  const errorText = useErrorText();
  return (
    <Screen title={t('requests.title')} back>
      <Txt color={colors.inkSoft}>{t('requests.help')}</Txt>
      {team ? <Txt variant="label">{t('requests.seatsLeft', { n: digits(team.seats_open) })}</Txt> : null}
      {team?.test_task ? <Panel tone="honey"><Txt variant="label">{t('team.testTask')}</Txt><Txt>{team.test_task}</Txt></Panel> : null}
      {q.isLoading ? <StateView state="loading" /> : null}
      {q.data && !q.data.length ? <StateView state="empty" message={t('requests.empty')} /> : null}
      {decide.error ? <Txt color={colors.brick}>{errorText(decide.error, { no_seats_left: t('requests.noSeats') })}</Txt> : null}
      {q.data?.map((r) => (
        <Panel key={r.id}>
          <Txt variant="h2">{t('requests.applicant', { label: r.label })}</Txt>
          <Row label={t('requests.skills')} value={r.skills.map(skill).join(', ')} />
          <Row label={t('requests.languages')} value={r.languages.join(', ') || '—'} />
          <Row label={t('requests.tools')} value={r.tools.join(', ') || '—'} />
          <Row label={t('requests.hours')} value={digits(r.hours_per_week)} />
          <Button kind="quiet" icon="eye" label={t('requests.openSample')} onPress={() => Linking.openURL(r.sample_link)} />
          {r.note ? <Txt>“{r.note}”</Txt> : null}
          {r.test_answer ? (
            <View style={{ gap: space.xs }}>
              <Txt variant="label">{t('requests.answer')}</Txt>
              <Txt>{r.test_answer}</Txt>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button style={{ flex: 1 }} label={t('requests.accept')} busy={decide.isPending}
              onPress={() => decide.mutate({ id: r.id, accept: true })} />
            <Button style={{ flex: 1 }} kind="secondary" label={t('requests.decline')}
              onPress={() => decide.mutate({ id: r.id, accept: false })} />
          </View>
        </Panel>
      ))}
      <Txt variant="small" color={colors.inkSoft}>{t('requests.blindNote')}</Txt>
    </Screen>
  );
}
