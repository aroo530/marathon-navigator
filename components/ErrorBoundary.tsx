import * as Sentry from '@sentry/react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props { children: React.ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <TouchableOpacity style={styles.btn} onPress={() => this.setState({ error: null })}>
            <Text style={styles.btnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#0e0e12' },
  title:     { fontSize: 20, fontWeight: '700', color: '#e4e4ec', marginBottom: 12 },
  message:   { fontSize: 13, color: '#6b6b80', textAlign: 'center', marginBottom: 32 },
  btn:       { backgroundColor: '#7c3aed', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
});
