import { Redirect } from 'expo-router';

export default function Page() {
  // Always redirect to login on app start
  return <Redirect href="/login" />;
}
