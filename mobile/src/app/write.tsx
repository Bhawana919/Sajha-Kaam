// The Anchor writes a job agreement for a client (usually after a call), or edits one that isn't
// agreed yet. It then goes to the client to agree. Juniors see nothing until the client agrees.
import { useLocalSearchParams } from 'expo-router';

import { useJob, useTeam } from '@/api/hooks';
import { Bell } from '@/components/guthi';
import { JobForm } from '@/components/JobForm';
import { Screen } from '@/components/Screen';
import { StateView } from '@/components/ui';
import { useT } from '@/i18n';

export default function Write() {
  const { id, client } = useLocalSearchParams<{ id?: string; client?: string }>();
  const { t } = useT();
  const team = useTeam();
  const job = useJob(id ?? '');
  const tm = team.data;
  if (!tm || (id && !job.data)) {
    const failed = team.error || job.error;
    return (
      <Screen back title={t('write.title')} right={<Bell />}>
        <StateView state={failed ? 'error' : 'loading'} />
      </Screen>
    );
  }
  return <JobForm who="anchor" skill={tm.team.skill} skills={tm.team.skills} clients={tm.clients} editing={job.data?.job} clientId={client} />;
}
