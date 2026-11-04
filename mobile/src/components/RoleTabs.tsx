// Bottom tabs: our own icons; the active tab gets ink colour, a heavier stroke and a short honey
// bar at the top edge (position + weight + colour, so it never relies on colour alone).
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';

import { useT } from '@/i18n';
import { EASE_OUT, NATIVE, useMotionOK } from '@/lib/motion';
import { colors, fonts } from '@/theme';

import { Icon, type IconName } from './Icon';

type Tab = { name: string; titleKey: string; icon: IconName };

function TabIcon({ name, focused, color }: { name: IconName; focused: boolean; color: string }) {
  const ok = useMotionOK();
  const [v] = useState(() => new Animated.Value(focused ? 1 : 0));
  useEffect(() => {
    if (!ok) {
      v.setValue(focused ? 1 : 0);
      return;
    }
    Animated.timing(v, { toValue: focused ? 1 : 0, duration: 200, easing: EASE_OUT, useNativeDriver: NATIVE }).start();
  }, [focused, ok, v]);
  return (
    <View style={{ alignItems: 'center', paddingTop: 2 }}>
      <Animated.View
        style={{
          position: 'absolute',
          top: -9,
          width: 22,
          height: 3,
          borderRadius: 2,
          backgroundColor: colors.honey,
          opacity: v,
          transform: [{ scaleX: v }],
        }}
      />
      <Icon name={name} size={24} color={color} strokeWidth={focused ? 2.2 : 1.7} />
    </View>
  );
}

export function RoleTabs({ tabs }: { tabs: Tab[] }) {
  const { t } = useT();
  const ok = useMotionOK();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: ok ? 'shift' : 'none',
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: { backgroundColor: colors.white, borderTopWidth: 0, minHeight: 64, paddingTop: 8, elevation: 0 },
        tabBarLabelStyle: { fontFamily: fonts.body.medium, fontSize: 12 },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.titleKey),
            tabBarAccessibilityLabel: t(tab.titleKey),
            tabBarIcon: ({ color, focused }) => <TabIcon name={tab.icon} focused={focused} color={color as string} />,
          }}
        />
      ))}
    </Tabs>
  );
}
