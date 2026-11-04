import { View } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { Button, Card, Screen, Txt, styles } from './ui';
import { useLogout } from './useLogout';
import { RiderPerformanceOverview } from './RiderPerformanceOverview';

export function RiderOverviewDashboardDesign() {
  const user = useAuthStore(state => state.user);
  const logout = useLogout();
  return <Screen title="Dashboard" brandedHeader back={false} right={<Button title="Sign Out" compact outline onPress={logout} />}>
    <View style={styles.stack}>
      <View style={{ gap: 5 }}>
        <Txt style={styles.title}>Hello, {user?.name.split(' ')[0] || 'rider'}</Txt>
        <Txt style={styles.muted}>Your pickups, deliveries and performance at a glance.</Txt>
      </View>
      <RiderPerformanceOverview />
      <Card style={{ gap: 12 }}>
        <Txt style={styles.heading}>Ready for your next trip?</Txt>
        <Txt style={styles.muted}>Open Available Jobs to go online, browse pickups and deliveries, and claim a job. Your accepted assignments stay in My Jobs.</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Button title="Browse available jobs" onPress={() => router.push('/rider/available')} />
          <Button title="Open my jobs" outline onPress={() => router.push('/rider/jobs')} />
        </View>
      </Card>
    </View>
  </Screen>;
}
