// The job agreement form: a fixed template, like a Europass CV. A rule check flags
// missing parts, "done when" items too vague to check, and budgets below the fair minimum.
// Used by clients (post a job) and by Anchors (write one for a client, or edit a draft).
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { errorDetail } from '@/api/client';
import { useCheckAgreement, useEditJob, useInvite, usePostJob, useTemplate, useWriteJob } from '@/api/hooks';
import type { Job, JobIn, Person, Problem } from '@/api/types';
import { Field, useErrorText } from '@/components/forms';
import { Bell, ListEditor, useSkillName } from '@/components/guthi';
import { InviteShare } from '@/components/InviteShare';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button, Chip, HelpLine, Panel, Section } from '@/components/ui';
import { useT } from '@/i18n';
import { money } from '@/lib/format';
import { colors, space } from '@/theme';

type Ref = { link: string; note: string; kind: 'like' | 'not_like' };

type Props =
  | { who: 'client'; anchors: Person[] }
  | { who: 'anchor'; skill: string; clients: Person[]; editing?: Job; clientId?: string };

const NEW_CLIENT = '__new';

export function JobForm(props: Props) {
  const { t, digits } = useT();
  const tpl = useTemplate().data;
  const skillName = useSkillName();
  const check = useCheckAgreement();
  const post = usePostJob();
  const write = useWriteJob();
  const invite = useInvite();
  const edit = useEditJob();
  const errorText = useErrorText();
  const anchorSide = props.who === 'anchor';
  const editing = anchorSide ? props.editing : undefined;

  const [skill, setSkill] = useState(anchorSide ? props.skill : 'video');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [deliverables, setDeliverables] = useState<string[]>(editing?.deliverables ?? []);
  const [doneWhen, setDoneWhen] = useState<string[]>(editing?.done_when ?? []);
  const [details, setDetails] = useState<Record<string, string>>(editing?.details ?? {});
  const [refs, setRefs] = useState<Ref[]>(editing?.references ?? []);
  const [refLink, setRefLink] = useState('');
  const [refNote, setRefNote] = useState('');
  const [refKind, setRefKind] = useState<'like' | 'not_like'>('like');
  const [days, setDays] = useState(String(editing?.deadline_days ?? 3));
  const [budget, setBudget] = useState(editing ? String(editing.budget_minor / 100) : '');
  const [revisions, setRevisions] = useState(editing?.revisions ?? 1);
  const [sendTo, setSendTo] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(anchorSide ? props.clientId ?? null : null);

  const fields = tpl?.skill_fields[skill] ?? [];
  const minimum = tpl?.minimum_budget_minor[skill] ?? 0;
  const job: JobIn = useMemo(() => ({
    skill, title, deliverables, done_when: doneWhen, references: refs, details,
    deadline_days: Number(days) || 0, budget_minor: Math.round((Number(budget) || 0) * 100), currency: 'USD',
    revisions, allow_ai: false, send_to_anchor: anchorSide ? null : sendTo,
  }), [skill, title, deliverables, doneWhen, refs, details, days, budget, revisions, sendTo, anchorSide]);

  const fieldLabel = (f: string) => {
    if (f.startsWith('details.')) return fields.find((x) => x.key === f.slice(8))?.label ?? f;
    return t(`post.f_${f}`);
  };
  const problemText = (p: Problem) => {
    if (p.code === 'vague') return t('post.p_vague', { item: doneWhen[p.index ?? 0] ?? '', words: (p.words ?? []).join(', ') });
    if (p.code === 'below_minimum') return t('post.p_below', { min: money(p.minimum ?? 0, 'USD') });
    return t(`post.p_${p.code}`, { field: fieldLabel(p.field) });
  };
  const saving = editing ? edit : anchorSide ? write : post;
  const serverProblems = (errorDetail(saving.error) as { problems?: Problem[] } | null)?.problems;
  const problems = serverProblems ?? check.data?.problems ?? [];
  const needsClient = anchorSide && !editing && !clientId;
  const newClient = clientId === NEW_CLIENT;
  const [invited, setInvited] = useState<{ code: string; job_title?: string | null } | null>(null);

  const done = (created: unknown) => router.replace(`/job/${(created as { id: string }).id}`);
  const submit = () => check.mutate(job, {
    onSuccess: (r) => {
      if (!r.ok) return;
      if (editing) edit.mutate({ id: editing.id, job }, { onSuccess: done });
      else if (anchorSide && newClient) invite.mutate(job, { onSuccess: (inv) => setInvited(inv) });
      else if (anchorSide && clientId) write.mutate({ ...job, client_id: clientId }, { onSuccess: done });
      else if (!anchorSide) post.mutate(job, { onSuccess: done });
    },
  });

  const screenTitle = editing ? t('write.editTitle') : anchorSide ? t('write.title') : t('post.title');
  return (
    <Screen back={anchorSide} title={screenTitle} right={<Bell />} footer={
      <View style={{ gap: space.sm }}>
        {problems.length ? (
          <Panel tone="honey" style={{ gap: space.xs, padding: space.md }}>
            <Txt variant="label">{t('post.fixFirst')}</Txt>
            {problems.slice(0, 3).map((p, i) => <Txt key={i} variant="small">• {problemText(p)}</Txt>)}
            {problems.length > 3 ? <Txt variant="small">{t('post.more', { count: problems.length - 3 })}</Txt> : null}
          </Panel>
        ) : check.data?.ok ? <Txt variant="small" color={colors.green}>{t('post.allGood')}</Txt> : null}
        {needsClient ? <Txt variant="small" color={colors.warnInk}>{t('write.chooseClient')}</Txt> : null}
        {invited ? <InviteShare code={invited.code} team={anchorSide ? props.skill : ''} jobTitle={invited.job_title} /> : (
          <Button label={newClient ? t('invite.makeLink') : anchorSide ? t('write.send') : t('post.post')} disabled={needsClient}
            busy={check.isPending || saving.isPending || invite.isPending} onPress={submit} />
        )}
      </View>
    }>
      <HelpLine text={anchorSide ? t('write.help') : t('post.help')} />
      {editing?.change_note ? (
        <Panel tone="honey">
          <Txt variant="label">{t('write.clientAsked')}</Txt>
          <Txt>“{editing.change_note}”</Txt>
        </Panel>
      ) : null}

      {anchorSide && !editing ? (
        <Section title={t('write.forClient')} help={props.clients.length ? undefined : t('write.noClients')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {props.clients.map((c) => (
              <Chip key={c.id} label={c.headline || c.display_name} on={clientId === c.id} onToggle={() => setClientId(c.id)} />
            ))}
            <Chip label={t('invite.newClient')} on={newClient} onToggle={() => setClientId(NEW_CLIENT)} />
          </View>
          {newClient ? <Txt variant="small" color={colors.inkSoft}>{t('invite.newClientHelp')}</Txt> : null}
        </Section>
      ) : null}

      <Section title={t('post.s_what')}>
        {anchorSide ? null : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {(tpl?.skills ?? []).map((s) => (
              <Chip key={s.id} label={skillName(s.id)} on={skill === s.id} onToggle={() => { setSkill(s.id); setDetails({}); }} />
            ))}
          </View>
        )}
        <Field label={t('post.f_title')} placeholder={t('post.titleEx')} value={title} onChangeText={setTitle} />
        <ListEditor label={t('post.f_deliverables')} help={t('post.deliverablesHelp')} items={deliverables}
          onChange={setDeliverables} placeholder={t(`post.deliverablesEx_${skill}`)} />
      </Section>

      <Section title={t('post.s_done')} help={t('post.doneHelp')}>
        <ListEditor label={t('post.f_done_when')} items={doneWhen} onChange={setDoneWhen}
          suggestions={tpl?.done_when_examples[skill] ?? []} placeholder={tpl?.done_when_examples[skill]?.[0]} />
      </Section>

      <Section title={t('post.s_details', { skill: skillName(skill) })}>
        {fields.map((f) => (
          <Field key={f.key} label={f.required ? f.label : `${f.label} (${t('common.optional')})`} placeholder={f.example}
            value={details[f.key] ?? ''} onChangeText={(v) => setDetails((d) => ({ ...d, [f.key]: v }))} />
        ))}
      </Section>

      <Section title={t('post.s_refs')} help={t('post.refsHelp')}>
        {refs.map((r, i) => (
          <View key={`${r.link}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Txt style={{ flex: 1 }}>{t(r.kind === 'like' ? 'post.like' : 'post.notLike')}: {r.link}{r.note ? ` · ${r.note}` : ''}</Txt>
            <Button kind="quiet" label={t('common.removeShort')} onPress={() => setRefs(refs.filter((_, j) => j !== i))} />
          </View>
        ))}
        <Field label={t('post.refLink')} value={refLink} onChangeText={setRefLink} autoCapitalize="none" placeholder="https://" />
        <Field label={t('post.refNote')} placeholder={t('post.refNoteEx')} value={refNote} onChangeText={setRefNote} />
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Chip label={t('post.like')} on={refKind === 'like'} onToggle={() => setRefKind('like')} />
          <Chip label={t('post.notLike')} on={refKind === 'not_like'} onToggle={() => setRefKind('not_like')} />
        </View>
        <Button kind="secondary" icon="plus" label={t('post.addRef')} disabled={!refLink.startsWith('http')}
          onPress={() => { setRefs([...refs, { link: refLink.trim(), note: refNote.trim(), kind: refKind }]); setRefLink(''); setRefNote(''); }} />
      </Section>

      <Section title={t('post.s_terms')}>
        <Field label={t('post.f_deadline_days')} keyboardType="number-pad" value={days} onChangeText={(v) => setDays(v.replace(/\D/g, ''))} />
        <Field label={t('post.f_budget_minor')} help={t('post.budgetHelp', { min: money(minimum, 'USD') })} keyboardType="decimal-pad"
          value={budget} onChangeText={(v) => setBudget(v.replace(/[^\d.]/g, ''))} placeholder="80" />
        <Txt variant="label">{t('post.f_revisions')}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Button kind="secondary" label="−" disabled={revisions <= 0} onPress={() => setRevisions(revisions - 1)} />
          <Txt variant="h2">{digits(revisions)}</Txt>
          <Button kind="secondary" label="+" disabled={revisions >= 5} onPress={() => setRevisions(revisions + 1)} />
        </View>
      </Section>

      {props.who === 'client' ? (
        <Section title={t('post.s_who')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {props.anchors.map((a) => <Chip key={a.id} label={a.display_name} on={sendTo === a.id} onToggle={() => setSendTo(a.id)} />)}
            <Chip label={t('post.anyAnchor')} on={sendTo === null} onToggle={() => setSendTo(null)} />
          </View>
          <Txt variant="small" color={colors.inkSoft}>{t(sendTo ? 'post.sendToHelp' : 'post.anyAnchorHelp')}</Txt>
        </Section>
      ) : null}

      {saving.error && !serverProblems ? (
        <Txt color={colors.brick}>{errorText(saving.error, { not_your_anchor: t('post.notYourAnchor'),
          anchor_skill_mismatch: t('post.skillMismatch'), already_agreed: t('write.alreadyAgreed') })}</Txt>
      ) : null}
    </Screen>
  );
}
