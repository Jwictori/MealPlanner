import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useEffect } from 'react';
import { useStore } from '../../store/useStore';

export default function Home() {
  const { user, mealPlans, loadMealPlans } = useStore();

  useEffect(() => {
    if (user) loadMealPlans();
  }, [user]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Välkommen! 🍽️</Text>
        <Text style={styles.subtitle}>{mealPlans.length} planerade måltider</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#6B7280' },
});
