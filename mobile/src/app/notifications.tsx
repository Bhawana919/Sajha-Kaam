// What happened, newest first, in the reader's language. Tapping opens the thing it is about.
import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { useMe, useNotifications, useReadAll } from '@/api/hooks';
import type { Notification } from '@/api/types';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { StateView } from '@/components/ui';
import { useT } from '@/i18n';
import { colors, radius, space } from '@/theme';

const JOB_KINDS = ['job_sent', 'job_open', 'job_taken', 'job_assigned', 'work_submitted', 'work_approved',
  'work_sent_back', 'ready_for_you', 'log_signed', 'client_accepted', 'agreement_ready', 'client_agreed',
  'changes_requested', 'change_proposed', 'change_accepted', 'change_declined', 'job_changed', 'brief_accepted',
  'brief_declined', 'job_application', 'application_chosen', 'application_not_chosen', 'mentor_chosen', 'payment_held', 'room_file', 'payment_released', 'job_opening', 'job_join_request', 'worker_approved'];

export default function Notifications() {
  const { t } = useT();
  const q = useNotifications();
  const role = useMe().data?.role;
  const readAll = useReadAll();
  const { mutate } = readAll;
  useEffect(() => {
    if (q.data?.some((n) => !n.read)) mutate();
  }, [q.data, mutate]);

  const open = (n: Notification) => {
    if (n.kind === 'room_file') router.push(`/job/${n.ref}?tab=room`);
    else if (JOB_KINDS.includes(n.kind)) router.push(`/job/${n.ref}`);
    else if (n.kind === 'join_request') router.push('/requests');
    else if (n.kind === 'seats_open') router.push('/junior/teams');
    else if (role === 'anchor') router.push('/anchor/team');
    else if (role === 'junior') router.push('/junior/home');
  };

  return (
    <Screen title={t('notif.title')} back>
      {q.isLoading ? <StateView state="loading" /> : null}
      {q.data && !q.data.length ? <StateView state="empty" message={t('notif.empty')} /> : null}
      {q.data?.map((n) => (
        <PressScale key={n.id} accessibilityRole="button" onPress={() => open(n)}
          style={{ backgroundColor: colors.white, borderRadius: radius.md, padding: space.md, flexDirection: 'row', gap: space.md }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 7, backgroundColor: n.read ? colors.line : colors.brick }} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt>{t(`notif.${n.kind}`)}</Txt>
            <Txt variant="small" color={colors.inkSoft}>{new Date(n.created_at).toLocaleString()}</Txt>
          </View>
          <Icon name="chevronRight" size={18} color={colors.inkFaint} />
        </PressScale>
      ))}
    </Screen>
  );
}
