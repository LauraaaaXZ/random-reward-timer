import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { migrateDatabase } from './data/migrations';
import { refreshTaskLocks } from './services/taskService';
import { TaskManager } from './screens/TaskManager';

const blocks = [
  ['09:00', 'MAIB Class'],
  ['11:00', 'FREE · 70 min   30  ·  60'],
  ['12:10', 'Lunch'],
  ['14:00', 'Meeting'],
  ['15:30', 'FREE · 90 min   30  ·  60  ·  90'],
  ['18:00', 'Exercise'],
  ['23:30', 'Sleep'],
];

type Tab = 'today' | 'tasks';

export default function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('today');

  useEffect(() => {
    (async () => {
      await migrateDatabase();
      await refreshTaskLocks();
      setReady(true);
    })().catch((error) => {
      console.error('App bootstrap failed', error);
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <SafeAreaView style={styles.loading}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Preparing your local workspace…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      {tab === 'today' ? <TodayTimeline /> : <TaskManager />}
      <View style={styles.nav}>
        <Pressable onPress={() => setTab('today')} style={styles.navItem}>
          <Text style={tab === 'today' ? styles.navActive : styles.navText}>Today</Text>
        </Pressable>
        <Pressable onPress={() => setTab('tasks')} style={styles.navItem}>
          <Text style={tab === 'tasks' ? styles.navActive : styles.navText}>Tasks</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function TodayTimeline() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>TODAY</Text>
          <Text style={styles.title}>Your timeline</Text>
        </View>
        <Text style={styles.level}>Lv. 1</Text>
      </View>

      <View style={styles.nextCard}>
        <Text style={styles.nextLabel}>CURRENT WINDOW</Text>
        <Text style={styles.nextTitle}>70 min free</Text>
        <Text style={styles.nextMeta}>Next · Lunch at 12:10</Text>
      </View>

      <View style={styles.timeline}>
        {blocks.map(([time, label]) => (
          <View key={`${time}-${label}`} style={styles.row}>
            <Text style={styles.time}>{time}</Text>
            <View style={styles.line} />
            <Text style={[styles.event, label.startsWith('FREE') && styles.free]}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.stats}>
        <Text>🔥 Difficulty  2h 10m left</Text>
        <Text>🪙 0   ·   XP 0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: '#F7F8FA' },
  loadingText: { opacity: 0.55 },
  container: { padding: 20, paddingBottom: 90, gap: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, opacity: 0.55 },
  title: { fontSize: 30, fontWeight: '700', marginTop: 4 },
  level: { fontWeight: '700' },
  nextCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, elevation: 2 },
  nextLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, opacity: 0.5 },
  nextTitle: { fontSize: 24, fontWeight: '700', marginTop: 6 },
  nextMeta: { marginTop: 5, opacity: 0.6 },
  timeline: { backgroundColor: 'white', borderRadius: 24, paddingVertical: 8, paddingHorizontal: 14 },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center' },
  time: { width: 52, fontSize: 13, opacity: 0.55 },
  line: { width: 3, height: 42, borderRadius: 2, backgroundColor: '#D8DDE6', marginRight: 14 },
  event: { flex: 1, fontSize: 15, fontWeight: '600' },
  free: { fontWeight: '800' },
  stats: { gap: 8, paddingHorizontal: 4 },
  nav: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 12,
    minHeight: 58,
    borderRadius: 22,
    backgroundColor: 'white',
    flexDirection: 'row',
    elevation: 6,
    padding: 6,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navText: { fontWeight: '700', opacity: 0.45 },
  navActive: { fontWeight: '900', color: '#246BFD' },
});
