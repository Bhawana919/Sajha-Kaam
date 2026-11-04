// The job room: once the agreement is final, the member and the Team Leader work here together.
// The deadline, a task list (from the agreement's deliverables, plus their own), and files.
// The client follows the tasks and the deadline; files stay between member and Leader until approved.
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { api } from '@/api/client';
import { useRoom, useRoomActions, useUploads } from '@/api/hooks';
import type { Job } from '@/api/types';
import { useT } from '@/i18n';
import { colors, radius, space, touchMin } from '@/theme';

import { Field, useErrorText } from './forms';
import { useDue } from './guthi';
import { Icon } from './Icon';
import { Txt } from './Txt';
import { Button, Chip, HelpLine, Panel, Section, StateView } from './ui';
import { upload, type UploadSignature } from './VideoUpload';

const DAY_MS = 24 * 60 * 60 * 1000;
const isoIn = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);

export function Room({ job }: { job: Job }) {
  const { t, digits } = useT();
  const q = useRoom(job.id);
  const act = useRoomActions(job.id);
  const uploads = useUploads().data;
  const errorText = useErrorText();
  const due = useDue()(job);
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState<number | null>(null);
  const [label, setLabel] = useState('');
  const [link, setLink] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [upErr, setUpErr] = useState('');
  const [adding, setAdding] = useState<'task' | 'file' | null>(null);
  const [draft, setDraft] = useState('');
  const r = q.data;
  if (q.isLoading) return <StateView state="loading" />;
  if (!r) return null;
  const done = r.tasks.filter((x) => x.done).length;

  const pickAndUpload = async () => {
    setUpErr('');
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
    if (picked.canceled || !picked.assets?.length) return;
    const asset = picked.assets[0];
    try {
      setProgress(0);
      const sig = await api<UploadSignature>('/v1/uploads/file', { method: 'POST' });
      const res = await upload(sig, asset, asset.file ?? null, setProgress);
      act.addFile.mutate({ label: asset.fileName ?? t('room.uploadedFile'), link: res.secure_url });
    } catch {
      setUpErr(t('upload.failed'));
    } finally {
      setProgress(null);
    }
  };

  return (
    <View style={{ gap: space.lg }}>
      {/* The deadline, big, with how the tasks are going. */}
      <Panel tone="pine" style={{ gap: space.sm }}>
        <Txt variant="label" color={colors.pineSoft}>{t('room.deadline')}</Txt>
        <Txt variant="h2" color={colors.white}>
          {due ? due.label : r.due_at ? new Date(r.due_at).toLocaleDateString() : '—'}
        </Txt>
        <Txt variant="small" color={colors.pineSoft}>{t('room.progress', { done: digits(done), total: digits(r.tasks.length) })}</Txt>
        <View style={styles.bar}>
          <View style={[styles.fill, { width: `${r.tasks.length ? (100 * done) / r.tasks.length : 0}%` }]} />
        </View>
      </Panel>

      <Section title={t('room.tasks')} help={t('room.tasksHelp')}>
        {r.tasks.map((task) => (
          <View key={task.id} style={styles.task}>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: task.done, disabled: !r.can_edit }}
              accessibilityLabel={task.title} disabled={!r.can_edit}
              onPress={() => act.setDone.mutate({ id: task.id, done: !task.done })} style={styles.check} hitSlop={6}>
              <View style={[styles.box, task.done && styles.boxOn]}>
                {task.done ? <Icon name="check" size={16} color={colors.white} strokeWidth={2.6} /> : null}
              </View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Txt color={task.done ? colors.inkSoft : colors.ink} style={task.done ? styles.struck : undefined}>{task.title}</Txt>
              {task.due_date ? (
                <Txt variant="small" color={colors.inkSoft}>{t('room.dueOn', { date: new Date(task.due_date).toLocaleDateString() })}</Txt>
              ) : null}
            </View>
            {r.can_edit ? (
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.remove', { item: task.title })} hitSlop={8}
                onPress={() => act.removeTask.mutate(task.id)} style={styles.remove}>
                <Icon name="close" size={16} color={colors.inkFaint} />
              </Pressable>
            ) : null}
          </View>
        ))}
        {r.can_edit && adding !== 'task' ? (
          <Button kind="quiet" icon="plus" label={t('room.addTask')} onPress={() => setAdding('task')} />
        ) : null}
        {r.can_edit && adding === 'task' ? (
          <View style={{ gap: space.sm }}>
            <Field label={t('room.newTask')} placeholder={t('room.newTaskEx')} value={title} onChangeText={setTitle} />
            <View style={styles.chips}>
              {([[null, t('room.noDate')], [0, t('room.today')], [1, t('room.tomorrow')], [3, t('room.in3')]] as const).map(([d, l]) => (
                <Chip key={l} label={l} on={when === d} onToggle={() => setWhen(d)} />
              ))}
            </View>
            <Button kind="secondary" icon="plus" label={t('room.addTask')} disabled={title.trim().length < 2}
              busy={act.addTask.isPending}
              onPress={() => act.addTask.mutate({ title, due_date: when === null ? '' : isoIn(when) },
                { onSuccess: () => { setTitle(''); setWhen(null); setAdding(null); } })} />
          </View>
        ) : null}
      </Section>

      {r.role !== 'client' ? (
        <Section title={t('room.messages')} help={t('room.messagesHelp')}>
          {r.messages?.length ? r.messages.map((m) => (
            <View key={m.id} style={[styles.bubble, m.mine ? styles.mine : styles.theirs]}>
              {!m.mine ? <Txt variant="label" color={colors.brick}>{m.author}</Txt> : null}
              <Txt color={m.mine ? colors.white : colors.ink}>{m.text}</Txt>
              <Txt variant="small" color={m.mine ? colors.brickSoft : colors.inkSoft}>
                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Txt>
            </View>
          )) : <Txt color={colors.inkSoft}>{t('room.noMessages')}</Txt>}
          {r.can_edit ? (
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Field label={t('room.message')} value={draft} onChangeText={setDraft} placeholder={t('room.messageEx')} multiline />
              </View>
              <Button label={t('room.send')} disabled={!draft.trim()} busy={act.send.isPending}
                onPress={() => act.send.mutate(draft, { onSuccess: () => setDraft('') })} />
            </View>
          ) : null}
        </Section>
      ) : null}

      {r.role === 'client' ? <HelpLine text={t('room.clientNote')} /> : (
        <Section title={t('room.files')} help={t('room.filesHelp')}>
          {r.files.length ? r.files.map((f) => (
            <Pressable key={f.id} accessibilityRole="link" onPress={() => Linking.openURL(f.link)} style={styles.file}>
              <Icon name="cards" size={20} color={colors.brick} />
              <View style={{ flex: 1 }}>
                <Txt variant="h3" numberOfLines={1}>{f.label}</Txt>
                <Txt variant="small" color={colors.inkSoft}>{f.added_by} · {new Date(f.created_at).toLocaleDateString()}</Txt>
              </View>
              <Icon name="chevronRight" size={18} color={colors.inkFaint} />
            </Pressable>
          )) : <Txt color={colors.inkSoft}>{t('room.noFiles')}</Txt>}
          {r.can_edit && adding !== 'file' ? (
            <Button kind="quiet" icon="plus" label={t('room.addFile')} onPress={() => setAdding('file')} />
          ) : null}
          {r.can_edit && adding === 'file' ? (
            <View style={{ gap: space.sm }}>
              {uploads?.video ? (
                progress !== null ? (
                  <View style={{ gap: space.xs }} accessibilityLabel={t('upload.uploading', { percent: digits(progress) })}>
                    <Txt variant="label">{t('upload.uploading', { percent: digits(progress) })}</Txt>
                    <View style={styles.barTrack}><View style={[styles.barFill, { width: `${Math.max(4, progress)}%` }]} /></View>
                  </View>
                )
                  : <Button kind="secondary" icon="upload" label={t('room.upload')} onPress={pickAndUpload} />
              ) : null}
              {upErr ? <Txt variant="small" color={colors.brick}>{upErr}</Txt> : null}
              <Field label={t('room.linkLabel')} placeholder={t('room.linkLabelEx')} value={label} onChangeText={setLabel} />
              <Field label={t('room.link')} placeholder="https://" value={link} onChangeText={setLink} autoCapitalize="none" keyboardType="url" />
              <Button kind="quiet" icon="plus" label={t('room.addLink')} disabled={!link.trim()} busy={act.addFile.isPending}
                onPress={() => act.addFile.mutate({ label, link }, { onSuccess: () => { setLabel(''); setLink(''); setAdding(null); } })} />
              {act.addFile.error ? <Txt variant="small" color={colors.brick}>{errorText(act.addFile.error,
                { link_must_be_https: t('room.httpsOnly') })}</Txt> : null}
            </View>
          ) : null}
        </Section>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 8, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  fill: { height: 8, backgroundColor: colors.honey },
  task: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.white, borderRadius: radius.md,
    paddingHorizontal: space.sm, minHeight: touchMin },
  check: { minWidth: touchMin - 8, minHeight: touchMin, alignItems: 'center', justifyContent: 'center' },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.inkSoft, alignItems: 'center',
    justifyContent: 'center' },
  boxOn: { backgroundColor: colors.green, borderColor: colors.green },
  struck: { textDecorationLine: 'line-through' },
  remove: { minWidth: 36, minHeight: touchMin, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  file: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.white, borderRadius: radius.md,
    padding: space.md },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: colors.lineStrong, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5, backgroundColor: colors.pine },
  bubble: { maxWidth: '82%', borderRadius: radius.lg, paddingHorizontal: space.md, paddingVertical: space.sm, gap: 2 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.brick, borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.white, borderBottomLeftRadius: 6 },
});
