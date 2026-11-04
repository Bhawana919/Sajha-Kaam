// The Anchor's own review notes. The first check quotes these when something is missing, so
// juniors hear the Anchor's real words. Every "send back" note is added here automatically.
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useNoteActions, useNotes } from '@/api/hooks';
import { Field } from '@/components/forms';
import { Bell } from '@/components/guthi';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button, Panel, StateView, Tag } from '@/components/ui';
import { useT } from '@/i18n';
import { colors, space, touchMin } from '@/theme';

export default function Notes() {
  const { t } = useT();
  const q = useNotes();
  const { add, remove } = useNoteActions();
  const [text, setText] = useState('');
  return (
    <Screen title={t('notes.title')} right={<Bell />}>
      <Txt color={colors.inkSoft}>{t('notes.help')}</Txt>
      <Field label={t('notes.add')} placeholder={t('notes.addEx')} value={text} onChangeText={setText} multiline />
      <Button label={t('common.save')} disabled={text.trim().length < 3} busy={add.isPending}
        onPress={() => add.mutate(text, { onSuccess: () => setText('') })} />
      {q.isLoading ? <StateView state="loading" /> : null}
      {q.data?.map((n) => (
        <Panel key={n.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
          <View style={{ flex: 1, gap: space.xs }}>
            <Txt>{n.text}</Txt>
            {n.source === 'send_back' ? <Tag label={t('notes.fromSendBack')} /> : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.remove', { item: n.text })}
            onPress={() => remove.mutate(n.id)} style={{ minWidth: touchMin, minHeight: touchMin, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={18} color={colors.inkSoft} />
          </Pressable>
        </Panel>
      ))}
    </Screen>
  );
}
