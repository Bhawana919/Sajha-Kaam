// The join link a Team Leader sends to a client they know: on WhatsApp in one tap, or any other app.
// The client opens it, joins, and (when the link carries a job) finds the agreement waiting to agree.
import { Linking, Share, View } from 'react-native';

import { PUBLIC_BASE } from '@/api/client';
import { useT } from '@/i18n';
import { colors, space } from '@/theme';

import { Txt } from './Txt';
import { Button, Panel } from './ui';

export function joinLink(code: string): string {
  return `${PUBLIC_BASE}/join/${code}`;
}

export function InviteShare({ code, team, jobTitle }: { code: string; team: string; jobTitle?: string | null }) {
  const { t } = useT();
  const link = joinLink(code);
  const message = jobTitle
    ? t('invite.messageJob', { title: jobTitle, link })
    : t('invite.message', { team, link });
  return (
    <Panel tone="honey" style={{ gap: space.md }}>
      <Txt variant="h3">{jobTitle ? t('invite.readyJob') : t('invite.ready')}</Txt>
      <Txt variant="small" color={colors.inkSoft} selectable>{link}</Txt>
      <View style={{ gap: space.sm }}>
        <Button icon="message" label={t('invite.whatsapp')}
          onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`)} />
        <Button kind="secondary" icon="share" label={t('invite.share')} onPress={() => Share.share({ message })} />
      </View>
    </Panel>
  );
}
