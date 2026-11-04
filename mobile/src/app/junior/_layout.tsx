import { RoleTabs } from '@/components/RoleTabs';

export default function JuniorTabs() {
  return (
    <RoleTabs tabs={[
      { name: 'home', titleKey: 'tabs.home', icon: 'work' },
      { name: 'teams', titleKey: 'tabs.teams', icon: 'search' },
      { name: 'logbook', titleKey: 'tabs.logbook', icon: 'stamp' },
      { name: 'profile', titleKey: 'tabs.profile', icon: 'passport' },
    ]} />
  );
}
