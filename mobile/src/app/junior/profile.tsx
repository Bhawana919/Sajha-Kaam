// The junior's CV, from a fixed template (like Europass). District stays private.
import { useState } from 'react';
import { View } from 'react-native';

import { useProfile, useSaveProfile, useTemplate } from '@/api/hooks';
import type { Profile as ProfileData, ProfileIn } from '@/api/types';
import { Field, useErrorText } from '@/components/forms';
import { Bell, ListEditor, useSkillName } from '@/components/guthi';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button, Chip, Section, StateView } from '@/components/ui';
import { useT } from '@/i18n';
import { colors, space } from '@/theme';

type Form = Required<ProfileIn>;

const EMPTY: Form = { about: '', skills: [], languages: [], tools: [], samples: [], hours_per_week: 10, education: '', district: '' };

export default function Profile() {
  const { t } = useT();
  const q = useProfile();
  if (!q.data) {
    return <Screen title={t('profile.title')} right={<Bell />}><StateView state={q.error ? 'error' : 'loading'} /></Screen>;
  }
  return <ProfileForm initial={q.data} />;
}

function ProfileForm({ initial }: { initial: ProfileData }) {
  const { t } = useT();
  const save = useSaveProfile();
  const skills = useTemplate().data?.skills ?? [];
  const skillName = useSkillName();
  const errorText = useErrorText();
  const { complete, ...rest } = initial;
  const [p, setP] = useState<Form>({ ...EMPTY, ...rest } as Form);
  const [sTitle, setSTitle] = useState('');
  const [sLink, setSLink] = useState('');
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setP((x) => ({ ...x, [k]: v }));
  const toggleSkill = (id: string) =>
    set('skills', p.skills.includes(id) ? p.skills.filter((s) => s !== id) : [...p.skills, id].slice(0, 5));

  return (
    <Screen title={t('profile.title')} right={<Bell />} footer={
      <Button label={t('common.save')} disabled={!p.skills.length} busy={save.isPending} onPress={() => save.mutate(p)} />
    }>
      <Txt color={colors.inkSoft}>{t('profile.help')}</Txt>
      {!complete && !save.data?.complete ? <Txt variant="small" color={colors.warnInk}>{t('profile.incomplete')}</Txt> : null}
      <Section title={t('profile.skills')} help={t('profile.skillsHelp')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {skills.map((s) => <Chip key={s.id} label={skillName(s.id)} on={p.skills.includes(s.id)} onToggle={() => toggleSkill(s.id)} />)}
        </View>
      </Section>
      <Field label={t('profile.about')} help={t('profile.aboutHelp')} value={p.about} onChangeText={(v) => set('about', v)} multiline />
      <ListEditor label={t('profile.languages')} items={p.languages} onChange={(v) => set('languages', v)}
        suggestions={['Nepali', 'English', 'Hindi']} placeholder={t('profile.languagesEx')} />
      <ListEditor label={t('profile.tools')} items={p.tools} onChange={(v) => set('tools', v)} placeholder={t('profile.toolsEx')} />
      <Section title={t('profile.samples')} help={t('profile.samplesHelp')}>
        {p.samples.map((s, i) => (
          <View key={`${s.link}-${i}`} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <Txt style={{ flex: 1 }}>{s.title} · {s.link}</Txt>
            <Button kind="quiet" label={t('common.removeShort')} onPress={() => set('samples', p.samples.filter((_, j) => j !== i))} />
          </View>
        ))}
        {p.samples.length < 3 ? (
          <>
            <Field label={t('profile.sampleTitle')} value={sTitle} onChangeText={setSTitle} />
            <Field label={t('profile.sampleLink')} value={sLink} onChangeText={setSLink} autoCapitalize="none" placeholder="https://" />
            <Button kind="secondary" icon="plus" label={t('common.add')} disabled={!sTitle.trim() || !sLink.startsWith('http')}
              onPress={() => { set('samples', [...p.samples, { title: sTitle.trim(), link: sLink.trim() }]); setSTitle(''); setSLink(''); }} />
          </>
        ) : null}
      </Section>
      <Field label={t('profile.hours')} keyboardType="number-pad" value={String(p.hours_per_week)}
        onChangeText={(v) => set('hours_per_week', Math.max(1, Math.min(60, Number(v.replace(/\D/g, '')) || 1)))} />
      <Field label={t('profile.education')} value={p.education} onChangeText={(v) => set('education', v)} />
      <Field label={t('profile.district')} help={t('profile.districtHelp')} value={p.district} onChangeText={(v) => set('district', v)} />
      {save.isSuccess ? <Txt color={colors.green}>{t('profile.saved')}</Txt> : null}
      {save.error ? <Txt color={colors.brick}>{errorText(save.error)}</Txt> : null}
    </Screen>
  );
}
