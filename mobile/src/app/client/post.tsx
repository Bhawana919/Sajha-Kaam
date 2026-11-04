// Post a job: the client fills the agreement template. Sent to their own Anchor, it waits for the
// Anchor to agree; posted to everyone, Anchors and Mentors with the skill apply and the client chooses.
import { useClientHome } from '@/api/hooks';
import { JobForm } from '@/components/JobForm';

export default function Post() {
  const anchors = useClientHome().data?.anchors ?? [];
  return <JobForm who="client" anchors={anchors} />;
}
