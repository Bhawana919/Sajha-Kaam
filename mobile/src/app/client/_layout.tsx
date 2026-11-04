import { RoleTabs } from '@/components/RoleTabs';

export default function ClientTabs() {
  return (
    <RoleTabs tabs={[
      { name: 'home', titleKey: 'tabs.myJobs', icon: 'cards' },
      { name: 'post', titleKey: 'tabs.post', icon: 'post' },
    ]} />
  );
}
