import { RequireFamily } from '@/components/RequireFamily';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { colors, fonts } from '@/constants/theme';

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontFamily: fonts.bodySemi, fontSize: 11, color: focused ? colors.coral : colors.inkMuted }}>
      {label}
    </Text>
  );
}

export default function ParentLayout() {
  return (
    <RequireFamily parentOnly><Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.coral,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.mist },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Perfil',
          tabBarLabel: ({ focused }) => <TabLabel label="Perfil" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tareas',
          tabBarLabel: ({ focused }) => <TabLabel label="Tareas" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Cursos',
          tabBarLabel: ({ focused }) => <TabLabel label="Cursos" focused={focused} />,
        }}
      />
      <Tabs.Screen name="assessments" options={{ title: 'Prácticas', tabBarLabel: ({ focused }) => <TabLabel label="Prácticas" focused={focused} /> }} />
      <Tabs.Screen
        name="focus"
        options={{
          title: 'Enfoque',
          tabBarLabel: ({ focused }) => <TabLabel label="Enfoque" focused={focused} />,
        }}
      />
    </Tabs></RequireFamily>
  );
}
