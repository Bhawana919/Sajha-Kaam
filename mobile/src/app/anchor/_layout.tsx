import { RoleTabs } from '@/components/RoleTabs';

export default function AnchorTabs() {
  return (
    <RoleTabs tabs={[
      { name: 'desk', titleKey: 'tabs.desk', icon: 'review' },
      { name: 'team', titleKey: 'tabs.team', icon: 'cards' },
      { name: 'notes', titleKey: 'tabs.notes', icon: 'message' },
    ]} />
  );
}
