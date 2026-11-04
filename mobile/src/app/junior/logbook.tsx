// My logbook: every signed job, at which level, approved by whom. Share the public link or QR code.
import { Share, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { PUBLIC_BASE } from '@/api/client';
import { useJuniorHome, useLogbook } from '@/api/hooks';
import { Bell, useBadge, useSkillName } from '@/components/guthi';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button, Panel, StateView, Tag } from '@/components/ui';
import { useT } from '@/i18n';
import { colors, space } from '@/theme';

export default function Logbook() {
  const { t } = useT();
  const badge = useBadge();
  const q = useLogbook();
  const slug = useJuniorHome().data?.profile_slug;
  const skill = useSkillName();
  const url = slug ? `${PUBLIC_BASE}/p/${slug}` : '';
  return (
    <Screen title={t('logbook.title')} right={<Bell />}>
      <Txt color={colors.inkSoft}>{t('logbook.help')}</Txt>
      {url ? (
        <Panel style={{ alignItems: 'center' }}>
          <QRCode value={url} size={150} />
          <Txt variant="small" selectable center>{url}</Txt>
          <Button kind="secondary" icon="share" label={t('common.share')} onPress={() => Share.share({ message: url })} />
        </Panel>
      ) : null}
      {q.isLoading ? <StateView state="loading" /> : null}
      {q.data && !q.data.length ? <StateView state="empty" message={t('logbook.empty')} /> : null}
      {q.data?.map((e) => {
        const s = e.credential.credentialSubject as {
          job: string; skill: string; supervision: { level: number; name: string };
          approvedBy: { name: string }; acceptedBy: { name: string | null; country: string }; clientAcceptedAt: string;
        };
        return (
          <Panel key={e.id}>
            <Txt variant="h3">{s.job}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
              <Tag tone={e.valid ? 'sage' : 'brick'} icon={e.valid ? 'check' : 'flag'} label={t(e.valid ? 'logbook.valid' : 'logbook.invalid')} />
              <Tag label={skill(s.skill)} />
            </View>
            <Txt variant="small">{t('logbook.doneAt', { badge: badge(s.supervision.level) })}</Txt>
            <Txt variant="small" color={colors.inkSoft}>
              {t('logbook.signedBy', { anchor: s.approvedBy.name, client: s.acceptedBy.name ?? t('logbook.clientIn', { country: s.acceptedBy.country }) })}
            </Txt>
            <Txt variant="small" color={colors.inkSoft}>{s.clientAcceptedAt.slice(0, 10)}</Txt>
          </Panel>
        );
      })}
    </Screen>
  );
}
