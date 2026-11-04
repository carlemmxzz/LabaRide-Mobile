import { useLocalSearchParams } from 'expo-router';
import { RiderDashboardDesign } from '../../src/design/DeliveryScreens';

export default function RiderJobs() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const id = Number(orderId);
  return <RiderDashboardDesign orderId={Number.isSafeInteger(id) && id > 0 ? id : undefined} />;
}
