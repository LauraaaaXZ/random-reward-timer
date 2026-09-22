import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const blocks = [
  ['09:00', 'MAIB Class'],
  ['11:00', 'FREE · 70 min   30  ·  60'],
  ['12:10', 'Lunch'],
  ['14:00', 'Meeting'],
  ['15:30', 'FREE · 90 min   30  ·  60  ·  90'],
  ['18:00', 'Exercise'],
  ['23:30', 'Sleep'],
];

export default function App() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>TODAY</Text><Text style={styles.title}>Your timeline</Text></View>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  container: { padding: 20, gap: 18 },
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
});
