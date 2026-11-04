// Building blocks shared by the Anchor, junior and client screens.
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useNotifications, useTemplate } from '@/api/hooks';
import type { FirstCheck, Job, JobState } from '@/api/types';
import { useT } from '@/i18n';
import { money } from '@/lib/format';
import { colors, radius, space, touchMin } from '@/theme';

import { Field } from './forms';
import { Icon } from './Icon';
import { PressScale } from './motion';
import { Txt } from './Txt';
import { Button, Panel, Row, Tag } from './ui';

const STATE_TONE: Record<JobState, 'clay' | 'honey' | 'sage' | 'brick'> = {
  draft: 'brick', with_client: 'honey', with_anchor: 'honey', open: 'honey', agreed: 'clay', assigned: 'honey',
  working: 'clay', submitted: 'clay', sent_back: 'brick', anchor_approved: 'sage', client_accepted: 'sage',
};

export function useSkillName() {
  const { pick } = useT();
  const tpl = useTemplate().data;
  return (id: string) => {
    const s = tpl?.skills.find((x) => x.id === id);
    return s ? pick(s.ne, s.en) : id;
  };
}

export function useLevelName() {
  const { pick } = useT();
  const tpl = useTemplate().data;
  return (level: number | null | undefined) => {
    const l = level ? tpl?.levels[String(level)] : undefined;
    return l ? pick(l.ne, l.en) : '';
  };
}

export function StateTag({ state }: { state: JobState }) {
  const { t } = useT();
  return <Tag tone={STATE_TONE[state]} label={t(`state.${state}`)} />;
}

/** A badge: one star per level plus a simple name, e.g. "★★★ Trusted". Readable without words. */
export function useBadge() {
  const name = useLevelName();
  return (level: number | null | undefined) => (level ? `${'★'.repeat(level)} ${name(level)}` : '');
}

export function LevelTag({ level }: { level: number }) {
  const badge = useBadge();
  return <Tag tone="honey" label={badge(level)} />;
}

/** The client's name. Juniors get only the country: the client relationship is the Anchor's. */
export function useClientName() {
  const { t } = useT();
  return (job: Job) => job.client.headline || job.client.display_name || t('logbook.clientIn', { country: job.client.country });
}

/** One job in a list: title, who it's for, state and money. Tapping opens the job. */
export function JobCard({ job, showClient = true, href }: { job: Job; showClient?: boolean; href?: string }) {
  const { t } = useT();
  const skill = useSkillName();
  const clientName = useClientName();
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={job.title} onPress={() => router.push((href ?? `/job/${job.id}`) as never)}
      style={styles.card}>
      <View style={styles.cardHead}>
        <Txt variant="h3" style={{ flex: 1 }}>{job.title}</Txt>
        <Icon name="chevronRight" size={20} color={colors.inkFaint} />
      </View>
      <View style={styles.tags}>
        <StateTag state={job.state} />
        <Tag label={skill(job.skill)} />
      </View>
      {showClient ? <Txt variant="small" color={colors.inkSoft}>{clientName(job)}</Txt> : null}
      <View style={styles.cardFoot}>
        <Txt variant="small" color={colors.inkSoft}>{t('job.days', { count: job.deadline_days })}</Txt>
        <Txt variant="label">{money(job.budget_minor, job.currency)}</Txt>
      </View>
      {job.junior ? <Txt variant="small" color={colors.inkSoft}>{t('job.doneBy', { name: job.junior.display_name })}</Txt> : null}
    </PressScale>
  );
}

/** How the payment is shared. Sajha Kaam never holds the money: this is shown, not processed. */
export function SplitRows({ job }: { job: Job }) {
  const { t } = useT();
  return (
    <View style={{ gap: 2 }}>
      <Row label={t('job.budget')} value={money(job.budget_minor, job.currency)} />
      <Row label={t('job.toJunior')} value={money(job.split.junior, job.currency)} />
      <Row label={t('job.toAnchor')} value={money(job.split.anchor, job.currency)} />
      <Row label={t('job.toPlatform')} value={money(job.split.platform, job.currency)} />
      <Txt variant="small" color={colors.inkSoft}>{t('job.splitNote')}</Txt>
    </View>
  );
}

const MARK = { looks_done: { icon: 'check', color: colors.green }, needs_work: { icon: 'flag', color: colors.brick },
  cant_tell: { icon: 'eye', color: colors.inkSoft } } as const;

/** The first check, item by item, with where the comment came from. */
export function CheckView({ check }: { check: FirstCheck }) {
  const { t, digits } = useT();
  return (
    <Panel style={{ gap: space.md }}>
      <View style={styles.cardHead}>
        <Txt variant="h3" style={{ flex: 1 }}>{t('check.title')}</Txt>
        <Tag tone={check.source === 'ai' ? 'honey' : 'clay'} label={t(check.source === 'ai' ? 'check.byAi' : 'check.offline')} />
      </View>
      <Txt>{t('check.summary', { done: digits(check.done_count), total: digits(check.total) })}</Txt>
      {check.link_note ? <Txt variant="small" color={colors.warnInk}>{t(`check.link_${check.link_note}`)}</Txt> : null}
      {check.items.map((item, i) => {
        const m = MARK[item.status];
        return (
          <View key={i} style={styles.item}>
            <Icon name={m.icon} size={18} color={m.color} strokeWidth={2.2} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="label">{item.item}</Txt>
              <Txt variant="small" color={colors.inkSoft}>
                {item.status === 'needs_work' && check.source === 'offline' && check.anchor_examples.includes(item.comment)
                  ? t('check.anchorSays', { note: item.comment }) : item.comment}
              </Txt>
            </View>
          </View>
        );
      })}
      {check.summary ? <Txt variant="small">{check.summary}</Txt> : null}
      <Txt variant="small" color={colors.inkSoft}>{t('check.anchorDecides')}</Txt>
    </Panel>
  );
}

/** Add and remove short lines (deliverables, "done when" items, languages, tools). */
export function ListEditor({ label, help, items, onChange, placeholder, suggestions = [] }: {
  label: string; help?: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string; suggestions?: string[];
}) {
  const { t } = useT();
  const [draft, setDraft] = useState('');
  const add = (v: string) => {
    const s = v.trim();
    if (s && !items.includes(s)) onChange([...items, s]);
    setDraft('');
  };
  return (
    <View style={{ gap: space.sm }}>
      <Field label={label} help={help} value={draft} onChangeText={setDraft} placeholder={placeholder}
        onSubmitEditing={() => add(draft)} returnKeyType="done" />
      {draft.trim() ? <Button kind="quiet" icon="plus" label={t('common.add')} onPress={() => add(draft)} /> : null}
      {items.map((it, i) => (
        <View key={`${it}-${i}`} style={styles.listRow}>
          <Txt style={{ flex: 1 }}>{it}</Txt>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.remove', { item: it })} hitSlop={8}
            onPress={() => onChange(items.filter((_, j) => j !== i))} style={styles.remove}>
            <Icon name="close" size={18} color={colors.inkSoft} />
          </Pressable>
        </View>
      ))}
      {suggestions.filter((s) => !items.includes(s)).length ? (
        <View style={styles.tags}>
          {suggestions.filter((s) => !items.includes(s)).map((s) => (
            <Pressable key={s} accessibilityRole="button" accessibilityLabel={t('common.addThis', { item: s })}
              onPress={() => add(s)} style={styles.suggest}>
              <Txt variant="small">+ {s}</Txt>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Bell in the top bar with the unread count. */
export function Bell() {
  const { t, digits } = useT();
  const unread = (useNotifications().data ?? []).filter((n) => !n.read).length;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('notif.a11y', { count: unread })}
      onPress={() => router.push('/notifications')} hitSlop={8} style={styles.bell}>
      <Icon name="inbox" size={22} />
      {unread ? <View style={styles.badge}><Txt variant="label" color={colors.white}>{digits(unread)}</Txt></View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  item: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.white, borderRadius: radius.md,
    paddingLeft: space.md, minHeight: touchMin },
  remove: { minWidth: touchMin, minHeight: touchMin, alignItems: 'center', justifyContent: 'center' },
  suggest: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 6,
    backgroundColor: colors.white },
  bell: { minWidth: touchMin - 8, minHeight: touchMin, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 4, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.brick,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
});
