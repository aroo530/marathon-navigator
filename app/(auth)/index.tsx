// app/(auth)/index.tsx

import { Redirect } from 'expo-router';

export default function AuthIndex() {
  // Redirect to the sign-in page
  return <Redirect href="/sign-in" />;
}
