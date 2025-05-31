// app/(auth)/index.tsx

import { Colors } from '@/constants/Theme';
import React, { useState } from 'react';
import { ActivityIndicator, Button, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function SignInScreen() {
  const { session, isLoading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, you can return null or a spinner, but
  // normally, RootLayoutNav will handle the navigation for you.
  if (session) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.blue[2]} />
      </View>
    );
  }

  const handleSignIn = async () => {
    setError(null);
    try {
      await signIn(email, password);
      // No need to manually redirect! The stack logic will take care of it.
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontWeight: 'bold', fontSize: 22, marginBottom: 20 }}>Sign In</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={{
          borderWidth: 1,
          borderColor: Colors.blue[2],
          borderRadius: 6,
          marginBottom: 10,
          padding: 10,
        }}
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{
          borderWidth: 1,
          borderColor: Colors.blue[2],
          borderRadius: 6,
          marginBottom: 20,
          padding: 10,
        }}
      />
      <Button title={isLoading ? "Signing in..." : "Sign In"} onPress={handleSignIn} disabled={isLoading} />
      {error && <Text style={{ color: 'red', marginTop: 10 }}>{error}</Text>}
    </View>
  );
}
