// Core primitives, v2. Fewer, more opinionated parts:
//  - Button: brick, 52 px, square-ish 12 px radius, one per screen.
//  - Panel: white on stone, no border, no shadow.
//  - Tag: *text* with a small mark, not a tinted pill (pills everywhere are a template tell).
//  - Tabs: underline tabs for switching views; Chip only for filters.
//  - Section: a real title in sentence case, not a small-caps eyebrow.
import { type ReactNode, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useT } from '@/i18n';
import { colors, radius, space, touchMin } from '@/theme';

import { hexPath } from './brand/geometry';
import { Icon, type IconName } from './Icon';
import { PressScale, Skeleton } from './motion';
import { Txt } from './Txt';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  kind?: 'primary' | 'secondary' | 'quiet';
  icon?: IconName;
  disabled?: boolean;
  busy?: boolean;
  accessibilityHint?: string;
  style?: ViewStyle;
};

export function Button({ label, onPress, kind = 'primary', icon, disabled, busy, accessibilityHint, style }: ButtonProps) {
  const off = disabled || busy;
  const fg = kind === 'primary' ? colors.white : colors.ink;
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      onPress={off ? undefined : onPress}
      disabled={!!off}
      style={[
        styles.button,
        kind === 'primary' && { backgroundColor: off ? colors.inkFaint : colors.brick },
        kind === 'secondary' && styles.secondary,
        kind === 'quiet' && styles.quiet,
        off && kind !== 'primary' ? { opacity: 0.5 } : null,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={20} color={fg} strokeWidth={2} /> : null}
          <Txt variant="h3" color={fg} style={kind === 'quiet' ? styles.quietText : undefined}>{label}</Txt>
        </View>
      )}
    </PressScale>
  );
}

type Tone = 'white' | 'clay' | 'warn' | 'sage' | 'honey' | 'ink' | 'pine' | 'brick';
const PANEL_BG: Record<Tone, string> = {
  white: colors.white,
  clay: colors.white,
  warn: colors.honeyWash,
  sage: colors.white,
  honey: colors.honeyWash,
  ink: colors.ink,
  pine: colors.pine,
  brick: colors.brick,
};

export function Panel({ children, tone = 'white', style }: { children: ReactNode; tone?: Tone; style?: ViewStyle }) {
  return <View style={[styles.panel, { backgroundColor: PANEL_BG[tone] }, style]}>{children}</View>;
}

const TAG_COLOR = {
  clay: colors.inkSoft,
  brick: colors.brick,
  sage: colors.green,
  demo: colors.warnInk,
  honey: colors.honeyDeep,
} as const;

/** Status / meta as coloured text with a small hex mark. */
export function Tag({ label, tone = 'clay', icon }: { label: string; tone?: keyof typeof TAG_COLOR; icon?: IconName }) {
  const c = TAG_COLOR[tone];
  return (
    <View style={styles.tag}>
      {icon ? (
        <Icon name={icon} size={15} color={c} strokeWidth={2} />
      ) : tone !== 'clay' ? (
        <Svg width={9} height={10} viewBox="0 0 18 20"><Path d={hexPath(9, 10, 9)} fill={c} /></Svg>
      ) : null}
      <Txt variant="label" color={c}>{label}</Txt>
    </View>
  );
}

/** A filter toggle (e.g. Pahilo Kaam). Selected = ink fill + check, so state is not colour alone. */
export function Chip({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      onPress={onToggle}
      style={({ pressed }) => [styles.chip, on ? styles.chipOn : null, pressed ? { opacity: 0.8 } : null]}
    >
      {on ? <Icon name="check" size={16} color={colors.white} strokeWidth={2.4} /> : null}
      <Txt variant="label" color={on ? colors.white : colors.ink}>{label}</Txt>
    </Pressable>
  );
}

/** Underline tabs for switching between views of one list. Scrolls sideways when labels are long. */
export function Tabs<T extends string>({ items, value, onChange }: { items: { key: T; label: string; count?: number }[]; value: T; onChange: (k: T) => void }) {
  const { digits } = useT();
  return (
    <View style={styles.tabsWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.xl }} accessibilityRole="tablist">
        {items.map((it) => {
          const on = it.key === value;
          return (
            <Pressable key={it.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(it.key)} style={styles.tab}>
              <Txt variant="h3" color={on ? colors.ink : colors.inkFaint}>
                {it.label}
                {it.count ? <Txt variant="label" color={on ? colors.brick : colors.inkFaint}>{`  ${digits(it.count)}`}</Txt> : null}
              </Txt>
              <View style={[styles.tabBar, on && { backgroundColor: colors.ink }]} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** A small ⓘ that shows a short explanation only when tapped, so screens stay quiet. */
export function InfoToggle({ text, open, onToggle }: { text: string; open: boolean; onToggle: () => void }) {
  const { t } = useT();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('common.moreInfo')} accessibilityHint={text}
      accessibilityState={{ expanded: open }} onPress={onToggle} hitSlop={10} style={styles.info}>
      <Icon name="help" size={18} color={open ? colors.ink : colors.inkFaint} strokeWidth={1.9} />
    </Pressable>
  );
}

/** "ⓘ How this works": one quiet line that opens a screen's explanation only when tapped. */
export function HelpLine({ text }: { text: string }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)}
        hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
        <Icon name="help" size={16} color={colors.inkSoft} strokeWidth={1.9} />
        <Txt variant="small" color={colors.inkSoft}>{t('common.howItWorks')}</Txt>
      </Pressable>
      {open ? <Txt variant="small" color={colors.inkSoft}>{text}</Txt> : null}
    </View>
  );
}

/** A heading for a group. Its explanation hides behind ⓘ. */
export function Section({ title, help, action, children }: { title: string; help?: string; action?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: 2 }}>
        <View style={styles.sectionHead}>
          <Txt variant="h2" accessibilityRole="header" style={{ flexShrink: 1 }}>{title}</Txt>
          {help ? <InfoToggle text={help} open={open} onToggle={() => setOpen(!open)} /> : null}
          <View style={{ flex: 1 }} />
          {action}
        </View>
        {help && open ? <Txt variant="small" color={colors.inkSoft}>{help}</Txt> : null}
      </View>
      {children}
    </View>
  );
}

/** The one thing to do next: an icon, a short line, one button. Leads every home screen. */
export function ActionCard({ icon, title, line, cta, onPress, strong }: {
  icon: IconName; title: string; line?: string; cta: string; onPress: () => void; strong?: boolean;
}) {
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={`${title}. ${line ?? ''}`} onPress={onPress}
      style={[styles.action, strong && { backgroundColor: colors.brick }]}>
      <View style={[styles.actionIcon, strong && { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
        <Icon name={icon} size={22} color={strong ? colors.white : colors.brick} strokeWidth={2} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="h3" color={strong ? colors.white : colors.ink}>{title}</Txt>
        {line ? <Txt variant="small" color={strong ? colors.brickSoft : colors.inkSoft}>{line}</Txt> : null}
      </View>
      <View style={[styles.actionCta, strong && { backgroundColor: colors.white }]}>
        <Txt variant="label" color={strong ? colors.brickDeep : colors.white}>{cta}</Txt>
      </View>
    </PressScale>
  );
}

/** "Do now": the action cards, or a calm all-clear line when nothing needs this person. */
export function DoNow({ children, empty }: { children: ReactNode[]; empty: string }) {
  const { t } = useT();
  const cards = children.filter(Boolean);
  return (
    <View style={{ gap: space.sm }}>
      <Txt variant="label" color={colors.inkSoft} accessibilityRole="header">{t('common.doNow')}</Txt>
      {cards.length ? cards : (
        <View style={[styles.panel, { backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center' }]}>
          <Icon name="check" size={20} color={colors.green} strokeWidth={2.4} />
          <Txt color={colors.inkSoft} style={{ flex: 1 }}>{empty}</Txt>
        </View>
      )}
    </View>
  );
}

/** Big numbers in a row ("1 of 2 jobs", "$35 earned"): numbers first, few words. */
export function Stats({ items }: { items: { value: string; label: string; tone?: 'pine' | 'white' }[] }) {
  return (
    <View style={styles.stats}>
      {items.map((it) => (
        <View key={it.label} style={[styles.stat, it.tone === 'pine' && { backgroundColor: colors.pine }]}>
          <Txt variant="money" color={it.tone === 'pine' ? colors.white : colors.ink}>{it.value}</Txt>
          <Txt variant="small" color={it.tone === 'pine' ? colors.pineSoft : colors.inkSoft}>{it.label}</Txt>
        </View>
      ))}
    </View>
  );
}

/** A line inside a group. Symbol marks are vectors (☐ ✗ ✓ are missing from many Android fonts). */
export function Bullet({ children, mark = '•' }: { children: string; mark?: string }) {
  const icon =
    mark === '☐' ? <Svg width={14} height={16} viewBox="0 0 14 16"><Path d={hexPath(7, 8, 6.5)} fill="none" stroke={colors.inkSoft} strokeWidth={1.6} /></Svg> :
    mark === '✗' ? <Icon name="close" size={16} color={colors.brick} strokeWidth={2.4} /> :
    mark === '✓' ? <Icon name="check" size={16} color={colors.green} strokeWidth={2.4} /> : null;
  return (
    <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
      {icon ? <View style={{ paddingTop: 4, width: 16, alignItems: 'center' }}>{icon}</View> : <Txt color={colors.inkSoft}>{mark}</Txt>}
      <Txt style={{ flex: 1 }}>{children}</Txt>
    </View>
  );
}

/** Label / value row, for details. Values align to one column. */
export function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kv}>
      <Txt variant="small" color={colors.inkSoft} style={{ width: 112 }}>{label}</Txt>
      <Txt variant="small" style={{ flex: 1 }} selectable>{value}</Txt>
    </View>
  );
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line }} />;
}

/** Mauri + one sentence + one action. Empty, error and offline states. Never blames the user. */
export function EmptyState({ icon = 'inbox', message, action }: { icon?: IconName; message: string; action?: ReactNode }) {
  return (
    <View style={styles.state} accessibilityLiveRegion="polite">
      <View style={styles.emptyMark}>
        <Icon name={icon} size={28} color={colors.pine} strokeWidth={1.8} />
      </View>
      <Txt center color={colors.inkSoft} style={{ maxWidth: 280 }}>{message}</Txt>
      {action}
    </View>
  );
}

export function StateView({ state, message, onRetry, action }: {
  state: 'loading' | 'error' | 'empty';
  message?: string;
  onRetry?: () => void;
  action?: ReactNode;
}) {
  const { t } = useT();
  if (state === 'loading') {
    return (
      <View style={{ gap: space.md }} accessibilityLabel={message ?? t('common.loading')} accessibilityLiveRegion="polite">
        {[0, 1].map((i) => (
          <View key={i} style={[styles.panel, { backgroundColor: colors.white }]}>
            <Skeleton width="70%" height={18} />
            <Skeleton width="40%" height={14} />
          </View>
        ))}
      </View>
    );
  }
  return (
    <EmptyState
      icon={state === 'error' ? 'flag' : 'inbox'}
      message={message ?? (state === 'error' ? t('errors.generic') : t('common.empty'))}
      action={
        <>
          {state === 'error' && onRetry ? <Button kind="secondary" label={t('common.retry')} onPress={onRetry} /> : null}
          {action}
        </>
      }
    />
  );
}

/** The one "do this next" row: a dark block with a single sentence and an arrow. */
export function NextAction({ title, body, cta, onPress }: { title: string; body?: string; cta: string; onPress: () => void }) {
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={`${title}. ${body ?? ''} ${cta}`} onPress={onPress} style={[styles.panel, styles.next]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="label" color={colors.honeyLight}>{title}</Txt>
        <Txt variant="h3" color={colors.white}>{body ?? cta}</Txt>
      </View>
      <View style={styles.nextArrow}>
        <Icon name="chevronRight" size={20} color={colors.ink} strokeWidth={2.4} />
      </View>
    </PressScale>
  );
}

/** One quiet line where money or verification appears: the data is fictional. */
export function DemoBanner() {
  const { t } = useT();
  return (
    <View style={styles.demo} accessibilityRole="text">
      <Icon name="flag" size={15} color={colors.warnInk} strokeWidth={2} />
      <Txt variant="small" color={colors.warnInk} style={{ flex: 1 }}>{t('common.sampleData')}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 52, paddingHorizontal: space.xl, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.ink },
  quiet: { minHeight: touchMin, paddingHorizontal: 0, alignSelf: 'flex-start' },
  quietText: { textDecorationLine: 'underline' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  panel: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  tag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 },
  chip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  chipOn: { backgroundColor: colors.ink },
  tabsWrap: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  tab: { minHeight: touchMin, justifyContent: 'flex-end' },
  tabBar: { height: 3, borderRadius: 2, marginTop: space.sm, backgroundColor: 'transparent' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  info: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  action: { backgroundColor: colors.white, borderRadius: radius.lg, padding: space.md, flexDirection: 'row', alignItems: 'center',
    gap: space.md },
  actionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brickSoft, alignItems: 'center',
    justifyContent: 'center' },
  actionCta: { backgroundColor: colors.brick, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 8 },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: space.md, gap: 2 },
  kv: { flexDirection: 'row', gap: space.md, paddingVertical: 2 },
  emptyMark: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  state: { paddingVertical: space.xxl, paddingHorizontal: space.lg, gap: space.md, alignItems: 'center' },
  next: { backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center' },
  nextArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.honey, alignItems: 'center', justifyContent: 'center' },
  demo: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
