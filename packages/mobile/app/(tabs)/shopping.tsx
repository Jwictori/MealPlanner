import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function Shopping() {
  const { user, shoppingLists, loadShoppingLists } = useStore();
  const [items, setItems] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState<any>(null);

  useEffect(() => {
    if (user) loadShoppingLists();
  }, [user]);

  useEffect(() => {
    const activeList = shoppingLists.find(l => l.status === 'active');
    if (activeList) {
      setSelectedList(activeList);
      loadItems(activeList.id);
    }
  }, [shoppingLists]);

  const loadItems = async (listId: string) => {
    const { data } = await supabase
      .from('shopping_list_items')
      .select('*')
      .eq('shopping_list_id', listId)
      .order('checked', { ascending: true });
    if (data) setItems(data);
  };

  const toggleItem = async (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i));
    await supabase.from('shopping_list_items').update({ checked: !item.checked }).eq('id', item.id);
  };

  if (!selectedList) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>🛒 Ingen aktiv lista</Text>
      </View>
    );
  }

  const unchecked = items.filter(i => !i.checked);
  const checked = items.filter(i => i.checked);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.listName}>{selectedList.name}</Text>
        <Text style={styles.progress}>{checked.length} / {items.length}</Text>
      </View>
      <FlatList
        data={unchecked}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => toggleItem(item)}>
            <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
              {item.checked && <Ionicons name="checkmark" size={20} color="#fff" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.ingredient_name}</Text>
              <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  listName: { fontSize: 24, fontWeight: 'bold' },
  progress: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  item: { backgroundColor: '#fff', padding: 16, marginHorizontal: 12, marginTop: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  itemName: { fontSize: 16, fontWeight: '500' },
  itemQty: { fontSize: 14, color: '#6B7280' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, color: '#6B7280' },
});
