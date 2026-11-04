// One job: the agreement, and the one next step for whoever is looking at it.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import {
  useAccept, useAgree, useAnswerBrief, useAssign, useDecideChange, useJob, useMe, useProposeChange, useRequestChanges,
  useSubmit, useTake, useTeam, useTemplate,
} from '@/api/hooks';
import type { JobDetail } from '@/api/types';
import { Checkbox, Field, useErrorText } from '@/components/forms';
import { CheckView, LevelTag, SplitRows, StateTag, useBadge, useClientName, useSkillName } from '@/components/guthi';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Bullet, Button, Chip, Panel, Row, Section, StateView, Tag } from '@/components/ui';
import { useT } from '@/i18n';
import { money } from '@/lib/format';
import { colors, space } from '@/theme';

/** States where the agreement is locked but the job isn't finished: changes go through the client. */
const AMENDABLE = ['agreed', 'assigned', 'working', 'submitted', 'sent_back', 'anchor_approved'];

function Agreement({ d }: { d: JobDetail }) {
  const { t, digits } = useT();
  const amount = (field: string, v: number) => (field === 'budget_minor' ? money(v, d.job.currency) : t('job.days', { count: v }));
  const fields = useTemplate().data?.skill_fields[d.job.skill] ?? [];
  const j = d.job;
  return (
    <Panel>
      <Txt variant="h3">{t('job.agreement')}</Txt>
      <Txt variant="label">{t('post.f_deliverables')}</Txt>
      {j.deliverables.map((x) => <Bullet key={x}>{x}</Bullet>)}
      <Txt variant="label">{t('post.f_done_when')}</Txt>
      {j.done_when.map((x) => <Bullet key={x} mark="☐">{x}</Bullet>)}
      {Object.entries(j.details).map(([k, v]) => <Row key={k} label={fields.find((f) => f.key === k)?.label ?? k} value={v} />)}
      {j.references.map((r, i) => (
        <Button key={i} kind="quiet" icon="eye" label={`${t(r.kind === 'like' ? 'post.like' : 'post.notLike')}: ${r.note || r.link}`}
          onPress={() => Linking.openURL(r.link)} />
      ))}
      <Row label={t('post.f_deadline_days')} value={t('job.days', { count: j.deadline_days })} />
      <Row label={t('post.f_revisions')} value={digits(j.revisions)} />
      <SplitRows job={j} />
      <Tag tone={j.allow_ai ? 'honey' : 'clay'} label={t(j.allow_ai ? 'job.aiAllowed' : 'job.aiNotAllowed')} />
      {j.agreed_at ? (
        <Txt variant="small" color={colors.green}>{t('agree.agreedOn', { date: new Date(j.agreed_at).toLocaleDateString() })}</Txt>
      ) : <Txt variant="small" color={colors.warnInk}>{t('agree.notYet')}</Txt>}
      {j.amendments.map((a) => (
        <Txt key={`${a.field}-${a.at}`} variant="small" color={colors.inkSoft}>
          {t('agree.amended', { field: t(`post.f_${a.field}`), old: amount(a.field, a.old), new: amount(a.field, a.new), note: a.note })}
        </Txt>
      ))}
    </Panel>
  );
}

function ProposeChange({ d }: { d: JobDetail }) {
  const { t } = useT();
  const propose = useProposeChange();
  const errorText = useErrorText();
  const clientName = useClientName();
  const j = d.job;
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(String(j.deadline_days));
  const [budget, setBudget] = useState(String(j.budget_minor / 100));
  const [note, setNote] = useState('');
  if (j.pending_change) {
    return <Panel tone="honey"><Txt>{t('agree.changeWaiting', { client: clientName(j) })}</Txt></Panel>;
  }
  if (!open) return <Button kind="quiet" label={t('agree.proposeOpen')} onPress={() => setOpen(true)} />;
  return (
    <Section title={t('agree.proposeTitle')} help={t('agree.proposeHelp')}>
      <Field label={t('post.f_deadline_days')} keyboardType="number-pad" value={days} onChangeText={(v) => setDays(v.replace(/\D/g, ''))} />
      <Field label={t('post.f_budget_minor')} keyboardType="decimal-pad" value={budget}
        onChangeText={(v) => setBudget(v.replace(/[^\d.]/g, ''))} />
      <Field label={t('agree.why')} placeholder={t('agree.whyEx')} value={note} onChangeText={setNote} multiline />
      <Button label={t('agree.proposeSend')} disabled={note.trim().length < 3} busy={propose.isPending}
        onPress={() => propose.mutate({ id: j.id, deadline_days: Number(days) || 0,
          budget_minor: Math.round((Number(budget) || 0) * 100), note }, { onSuccess: () => setOpen(false) })} />
      {propose.error ? <Txt color={colors.brick}>{errorText(propose.error, { nothing_changed: t('agree.nothingChanged'),
        below_minimum: t('agree.belowMinimum') })}</Txt> : null}
    </Section>
  );
}

function AnchorActions({ d }: { d: JobDetail }) {
  const { t } = useT();
  const team = useTeam().data;
  const take = useTake();
  const agree = useAgree();
  const assign = useAssign();
  const errorText = useErrorText();
  const clientName = useClientName();
  const [junior, setJunior] = useState<string | null>(d.job.junior?.id ?? null);
  const j = d.job;
  const edit = <Button kind="secondary" icon="post" label={t('agree.edit')} onPress={() => router.push(`/write?id=${j.id}`)} />;
  if (j.state === 'open') {
    return (
      <Section title={t('agree.takeTitle')} help={t('agree.takeHelp')}>
        <Button label={t('job.take')} busy={take.isPending} onPress={() => take.mutate(j.id)} />
      </Section>
    );
  }
  if (j.state === 'with_anchor') {
    return (
      <Section title={t('agree.fromClient', { client: clientName(j) })} help={t('agree.fromClientHelp')}>
        <Button label={t('agree.agree')} busy={agree.isPending} onPress={() => agree.mutate(j.id)} />
        {edit}
      </Section>
    );
  }
  if (j.state === 'draft') {
    return (
      <Panel tone="honey">
        <Txt variant="label">{t('agree.clientAsked', { client: clientName(j) })}</Txt>
        <Txt>“{j.change_note}”</Txt>
        {edit}
      </Panel>
    );
  }
  if (j.state === 'with_client') {
    return (
      <Panel tone="honey">
        <Txt>{t('agree.waitingClient', { client: clientName(j) })}</Txt>
        {edit}
      </Panel>
    );
  }
  const change = AMENDABLE.includes(j.state) ? <ProposeChange d={d} /> : null;
  if (j.state === 'agreed' || j.state === 'assigned') {
    return (
      <>
        {j.state === 'assigned' && j.junior ? (
          <Panel tone="honey"><Txt>{t('agree.waitingJunior', { name: j.junior.display_name })}</Txt></Panel>
        ) : null}
        <Section title={t('job.assignTitle')} help={t('job.assignHelp')}>
          {(team?.members ?? []).map((m) => (
            <View key={m.person.id} style={{ gap: space.xs }}>
              <Chip label={m.person.display_name} on={junior === m.person.id} onToggle={() => setJunior(m.person.id)} />
              <LevelTag level={m.level} />
            </View>
          ))}
          <Button label={t('job.assign')} disabled={!junior || junior === j.junior?.id} busy={assign.isPending}
            onPress={() => junior && assign.mutate({ id: j.id, junior_id: junior })} />
          {assign.error ? <Txt color={colors.brick}>{errorText(assign.error)}</Txt> : null}
        </Section>
        {change}
      </>
    );
  }
  if (j.state === 'submitted') {
    return (
      <>
        <Button label={t('job.checkWork')} onPress={() => router.push(`/review/${j.id}`)} />
        {change}
      </>
    );
  }
  return change;
}

/** The junior's own short agreement: what to deliver, when, and their share. */
function Brief({ d }: { d: JobDetail }) {
  const { t, digits } = useT();
  const badge = useBadge();
  const answer = useAnswerBrief();
  const errorText = useErrorText();
  const j = d.job;
  return (
    <Section title={t('brief.title')} help={t('brief.help', { name: j.anchor?.display_name ?? '' })}>
      <Panel tone="honey">
        <Row label={t('brief.deliver')} value={digits(j.deliverables.length)} />
        <Row label={t('brief.doneWhen')} value={digits(j.done_when.length)} />
        <Row label={t('post.f_deadline_days')} value={t('job.days', { count: j.deadline_days })} />
        <Row label={t('brief.yourShare')} value={money(j.split.junior, j.currency)} />
        <Row label={t('brief.level')} value={badge(j.supervision_level)} />
      </Panel>
      <Txt variant="small" color={colors.inkSoft}>{t('brief.readBelow')}</Txt>
      <Button label={t('brief.accept')} busy={answer.isPending} onPress={() => answer.mutate({ id: j.id, accept: true })} />
      <Button kind="quiet" label={t('brief.decline')} onPress={() => answer.mutate({ id: j.id, accept: false })} />
      {answer.error ? <Txt color={colors.brick}>{errorText(answer.error)}</Txt> : null}
    </Section>
  );
}

function JuniorActions({ d }: { d: JobDetail }) {
  const { t } = useT();
  const submit = useSubmit();
  const errorText = useErrorText();
  const [link, setLink] = useState('');
  const [content, setContent] = useState('');
  const [note, setNote] = useState('');
  const j = d.job;
  const last = d.submissions[0];
  if (j.state === 'assigned') return <Brief d={d} />;
  if (j.state === 'submitted' && last) {
    return (
      <>
        <Panel tone="honey"><Txt>{t('job.waitingAnchor', { name: j.anchor?.display_name ?? '' })}</Txt></Panel>
        <CheckView check={last.check} />
      </>
    );
  }
  if (j.state !== 'working' && j.state !== 'sent_back') return null;
  return (
    <>
      {j.state === 'sent_back' && last ? (
        <Panel tone="honey">
          <Txt variant="label">{t('job.anchorNote', { name: j.anchor?.display_name ?? '' })}</Txt>
          <Txt>{last.anchor_note}</Txt>
        </Panel>
      ) : null}
      {j.state === 'sent_back' && last ? <CheckView check={last.check} /> : null}
      <Section title={t('job.submitTitle')} help={t('job.submitHelp')}>
        <Field label={t('job.link')} help={t('job.linkHelp')} value={link} onChangeText={setLink} autoCapitalize="none" placeholder="https://" />
        <Field label={t('job.paste')} help={t('job.pasteHelp')} value={content} onChangeText={setContent} multiline />
        <Field label={t('job.note')} value={note} onChangeText={setNote} multiline />
        <Button label={t('job.submit')} disabled={!link.trim() && !content.trim()} busy={submit.isPending}
          onPress={() => submit.mutate({ id: j.id, link, content, note }, { onSuccess: () => { setLink(''); setContent(''); setNote(''); } })} />
        {submit.error ? <Txt color={colors.brick}>{errorText(submit.error)}</Txt> : null}
      </Section>
    </>
  );
}

/** The client reads the agreement the Anchor wrote, then agrees or asks for changes. */
function ClientAgree({ d }: { d: JobDetail }) {
  const { t } = useT();
  const agree = useAgree();
  const changes = useRequestChanges();
  const errorText = useErrorText();
  const [note, setNote] = useState('');
  const j = d.job;
  return (
    <Section title={t('agree.reviewTitle')} help={t('agree.reviewHelp', { name: j.anchor?.display_name ?? '' })}>
      <Button label={t('agree.agree')} busy={agree.isPending} onPress={() => agree.mutate(j.id)} />
      <Txt variant="small" color={colors.inkSoft}>{t('agree.agreeMeans')}</Txt>
      <Field label={t('agree.changesLabel')} placeholder={t('agree.changesEx')} value={note} onChangeText={setNote} multiline />
      <Button kind="secondary" label={t('agree.askChanges')} disabled={note.trim().length < 3} busy={changes.isPending}
        onPress={() => changes.mutate({ id: j.id, note }, { onSuccess: () => setNote('') })} />
      {agree.error || changes.error ? <Txt color={colors.brick}>{errorText(agree.error ?? changes.error)}</Txt> : null}
    </Section>
  );
}

/** An amendment the Anchor proposed after agreement: nothing changes until the client accepts. */
function ClientChange({ d }: { d: JobDetail }) {
  const { t } = useT();
  const decide = useDecideChange();
  const j = d.job;
  const c = j.pending_change;
  if (!c) return null;
  return (
    <Section title={t('agree.changeTitle')} help={t('agree.changeHelp', { name: j.anchor?.display_name ?? '' })}>
      <Panel tone="honey">
        {c.deadline_days !== j.deadline_days ? (
          <Row label={t('post.f_deadline_days')}
            value={`${t('job.days', { count: j.deadline_days })} → ${t('job.days', { count: c.deadline_days })}`} />
        ) : null}
        {c.budget_minor !== j.budget_minor ? (
          <Row label={t('post.f_budget_minor')} value={`${money(j.budget_minor, j.currency)} → ${money(c.budget_minor, j.currency)}`} />
        ) : null}
        <Txt>“{c.note}”</Txt>
      </Panel>
      <Button label={t('agree.acceptChange')} busy={decide.isPending} onPress={() => decide.mutate({ id: j.id, accept: true })} />
      <Button kind="quiet" label={t('agree.declineChange')} onPress={() => decide.mutate({ id: j.id, accept: false })} />
    </Section>
  );
}

function ClientActions({ d }: { d: JobDetail }) {
  const { t } = useT();
  const accept = useAccept();
  const errorText = useErrorText();
  const [show, setShow] = useState(false);
  const j = d.job;
  const approved = d.submissions[0];
  if (j.state === 'with_client') return <ClientAgree d={d} />;
  if (j.state === 'client_accepted') return <Panel tone="pine"><Txt color={colors.white}>{t('job.acceptedDone')}</Txt></Panel>;
  if (j.state !== 'anchor_approved') {
    return (
      <>
        <ClientChange d={d} />
        <Txt color={colors.inkSoft}>{t(`job.clientWait_${j.state}`, { name: j.anchor?.display_name ?? '' })}</Txt>
      </>
    );
  }
  return (
    <>
      <ClientChange d={d} />
      <Section title={t('job.readyTitle')} help={t('job.readyHelp', { name: j.anchor?.display_name ?? '' })}>
        {approved?.link ? <Button kind="secondary" icon="eye" label={t('job.openWork')} onPress={() => Linking.openURL(approved.link)} /> : null}
        {approved?.content ? <Panel><Txt variant="small" selectable>{approved.content}</Txt></Panel> : null}
        {approved?.note ? <Txt>“{approved.note}”</Txt> : null}
        <Checkbox label={t('job.showName')} checked={show} onChange={setShow} />
        <Txt variant="small" color={colors.inkSoft}>{t('job.showNameHelp')}</Txt>
        <Button label={t('job.accept')} busy={accept.isPending} onPress={() => accept.mutate({ id: j.id, show_client: show })} />
        {accept.error ? <Txt color={colors.brick}>{errorText(accept.error)}</Txt> : null}
      </Section>
    </>
  );
}

export default function JobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const q = useJob(id);
  const role = useMe().data?.role;
  const skill = useSkillName();
  const clientName = useClientName();
  const d = q.data;
  return (
    <Screen back title={d?.job.title}>
      {q.isLoading ? <StateView state="loading" /> : null}
      {q.error ? <StateView state="error" onRetry={() => q.refetch()} /> : null}
      {d ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            <StateTag state={d.job.state} />
            <Tag label={skill(d.job.skill)} />
            {d.job.supervision_level ? <LevelTag level={d.job.supervision_level} /> : null}
          </View>
          <Txt color={colors.inkSoft}>
            {t('job.people', { client: clientName(d.job),
              anchor: d.job.anchor?.display_name ?? t('job.noAnchorYet'), junior: d.job.junior?.display_name ?? '—' })}
          </Txt>
          {role === 'anchor' ? <AnchorActions d={d} /> : null}
          {role === 'junior' ? <JuniorActions d={d} /> : null}
          {role === 'client' ? <ClientActions d={d} /> : null}
          <Agreement d={d} />
          {role !== 'client' && d.submissions.length ? (
            <Section title={t('job.history')}>
              {d.submissions.map((s) => (
                <Panel key={s.id}>
                  <Tag tone={s.status === 'approved' ? 'sage' : s.status === 'sent_back' ? 'brick' : 'clay'} label={t(`job.sub_${s.status}`)} />
                  <Txt variant="small" color={colors.inkSoft}>{new Date(s.created_at).toLocaleString()}</Txt>
                  {s.anchor_note ? <Txt>“{s.anchor_note}”</Txt> : null}
                </Panel>
              ))}
            </Section>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
