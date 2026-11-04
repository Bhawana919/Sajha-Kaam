// Core primitives, v2. Fewer, more opinionated parts:
//  - Button: brick, 52 px, square-ish 12 px radius, one per screen.
//  - Panel: white on stone, no border, no shadow.
//  - Tag: *text* with a small mark, not a tinted pill (pills everywhere are a template tell).
//  - Tabs: underline tabs for switching views; Chip only for filters.
//  - Section: a real title in sentence case, not a small-caps eyebrow.
import type { ReactNode } from 'react';
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

export function Section({ title, help, action, children }: { title: string; help?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: 2 }}>
        <View style={styles.sectionHead}>
          <Txt variant="h2" accessibilityRole="header" style={{ flex: 1 }}>{title}</Txt>
          {action}
        </View>
        {help ? <Txt variant="small" color={colors.inkSoft}>{help}</Txt> : null}
      </View>
      {children}
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
  kv: { flexDirection: 'row', gap: space.md, paddingVertical: 2 },
  emptyMark: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  state: { paddingVertical: space.xxl, paddingHorizontal: space.lg, gap: space.md, alignItems: 'center' },
  next: { backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center' },
  nextArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.honey, alignItems: 'center', justifyContent: 'center' },
  demo: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
