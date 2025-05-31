import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { fetchAvailableMarathons } from '../../services/marathonService';

export default function MarathonList() {
  const [marathons, setMarathons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMarathons = async () => {
      try {
        const data = await fetchAvailableMarathons();
        setMarathons(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadMarathons();
  }, []);

  if (loading) return <ActivityIndicator size="large" color="#0000ff" />;
  if (error) return <Text>Error: {error}</Text>;

  return (
    <View>
      {marathons.map((marathon) => (
        <Text key={marathon.id}>{marathon.name}</Text>
      ))}
    </View>
  );
}
