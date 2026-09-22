import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DailyPoolMode, Difficulty, Task } from '../domain/types';
import { listTasks } from '../data/taskRepository';
import { createTaskWithDependencies, markTaskCompleted } from '../services/taskService';

const difficulties: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'super_difficult', label: 'Super Difficult' },
];

const dailyModes: { value: DailyPoolMode; label: string }[] = [
  { value: 'fragment', label: 'Fragment time' },
  { value: 'easy_pool', label: 'Main draw pool' },
  { value: 'both', label: 'Both' },
];

export function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [name, setName] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [prerequisiteIds, setPrerequisiteIds] = useState<string[]>([]);
  const [isDaily, setIsDaily] = useState(false);
  const [dailyPoolMode, setDailyPoolMode] = useState<DailyPoolMode>('fragment');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setTasks(await listTasks());
  }, []);

  useEffect(() => {
    reload().catch((error) => Alert.alert('Could not load tasks', String(error)));
  }, [reload]);

  const candidates = useMemo(
    () => tasks.filter((task) => task.status !== 'completed' && task.status !== 'archived'),
    [tasks],
  );

  async function addTask() {
    const parsedMinutes = Number(minutes);
    if (!name.trim()) {
      Alert.alert('Task name required');
      return;
    }
    if (!Number.isFinite(parsedMinutes) || parsedMinutes <= 0) {
      Alert.alert('Estimated time must be greater than 0');
      return;
    }

    try {
      setSaving(true);
      await createTaskWithDependencies({
        name,
        estimatedMinutes: Math.round(parsedMinutes),
        difficulty,
        prerequisiteIds,
        dailyPoolMode: isDaily ? dailyPoolMode : undefined,
      });
      setName('');
      setMinutes('30');
      setDifficulty('medium');
      setPrerequisiteIds([]);
      setIsDaily(false);
      setDailyPoolMode('fragment');
      await reload();
      setNotice(`✓ New task confirmed · ${name.trim()} · ${Math.round(parsedMinutes)} min`);
      setTimeout(() => setNotice(null), 4000);
    } catch (error) {
      Alert.alert('Could not create task', error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function complete(taskId: string) {
    try {
      const completedTask = tasks.find((task) => task.id === taskId);
      await markTaskCompleted(taskId);
      await reload();
      setNotice(`✓ Task completed · ${completedTask?.name ?? 'Task'}`);
      setTimeout(() => setNotice(null), 4000);
    } catch (error) {
      Alert.alert('Could not complete task', error instanceof Error ? error.message : String(error));
    }
  }

  function togglePrerequisite(taskId: string) {
    setPrerequisiteIds((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId],
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {notice ? <View style={styles.notice}><Text style={styles.noticeText}>{notice}</Text></View> : null}
      <Text style={styles.heading}>Tasks</Text>
      <Text style={styles.subheading}>Quick add with daily tasks and prerequisites.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Task name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Daily news reading"
          style={styles.input}
        />

        <Text style={styles.label}>Estimated minutes</Text>
        <TextInput
          value={minutes}
          onChangeText={setMinutes}
          keyboardType="number-pad"
          style={styles.input}
        />

        <Text style={styles.label}>Task type</Text>
        <View style={styles.wrap}>
          <Pressable onPress={() => setIsDaily(false)} style={[styles.chip, !isDaily && styles.chipSelected]}>
            <Text style={!isDaily ? styles.chipTextSelected : styles.chipText}>One-off</Text>
          </Pressable>
          <Pressable onPress={() => setIsDaily(true)} style={[styles.chip, isDaily && styles.chipSelected]}>
            <Text style={isDaily ? styles.chipTextSelected : styles.chipText}>Daily</Text>
          </Pressable>
        </View>

        {isDaily ? (
          <>
            <Text style={styles.label}>Daily pool</Text>
            <View style={styles.wrap}>
              {dailyModes.map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => setDailyPoolMode(item.value)}
                  style={[styles.chip, dailyPoolMode === item.value && styles.chipSelected]}
                >
                  <Text style={dailyPoolMode === item.value ? styles.chipTextSelected : styles.chipText}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.helper}>
              After you complete it today, it disappears from active draw pools until tomorrow.
            </Text>
          </>
        ) : null}

        <Text style={styles.label}>Difficulty</Text>
        <View style={styles.wrap}>
          {difficulties.map((item) => {
            const selected = difficulty === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => setDifficulty(item.value)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={selected ? styles.chipTextSelected : styles.chipText}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Prerequisite tasks</Text>
        {candidates.length === 0 ? (
          <Text style={styles.muted}>No existing tasks yet.</Text>
        ) : (
          <View style={styles.wrap}>
            {candidates.map((task) => {
              const selected = prerequisiteIds.includes(task.id);
              return (
                <Pressable
                  key={task.id}
                  onPress={() => togglePrerequisite(task.id)}
                  style={[styles.prerequisite, selected && styles.prerequisiteSelected]}
                >
                  <Text numberOfLines={1} style={selected ? styles.chipTextSelected : styles.chipText}>
                    {selected ? '✓ ' : ''}{task.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable disabled={saving} onPress={addTask} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Add task'}</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Current tasks</Text>
      {tasks.length === 0 ? (
        <Text style={styles.muted}>Create your first task above.</Text>
      ) : (
        tasks.map((task) => (
          <View key={task.id} style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <View style={styles.taskTitleArea}>
                <Text style={styles.taskName}>
                  {task.status === 'locked' ? '🔒 ' : ''}{task.dailyPoolMode ? '↻ ' : ''}{task.name}
                </Text>
                <Text style={styles.taskMeta}>
                  {task.estimatedMinutes} min · {task.difficulty.replace('_', ' ')} · {task.dailyPoolMode ? 'daily · ' + task.dailyPoolMode.replace('_', ' ') : task.status}
                </Text>
                {task.dailyPoolMode && task.dailyLastCompletedDate ? (
                  <Text style={styles.dailyState}>Last completed: {task.dailyLastCompletedDate}</Text>
                ) : null}
              </View>
              {task.status === 'active' ? (
                <Pressable onPress={() => complete(task.id)} style={styles.completeButton}>
                  <Text style={styles.completeText}>Done</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 80, gap: 14 },
  notice: { backgroundColor: '#172033', borderRadius: 16, padding: 14 },
  noticeText: { color: 'white', fontWeight: '800' },
  heading: { fontSize: 30, fontWeight: '800' },
  subheading: { opacity: 0.58, marginTop: -8 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 18, gap: 10, elevation: 2 },
  label: { fontSize: 12, fontWeight: '800', marginTop: 4, opacity: 0.72 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E1E5EC',
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#FAFBFC',
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: '#EEF1F6' },
  chipSelected: { backgroundColor: '#246BFD' },
  prerequisite: {
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#EEF1F6',
  },
  prerequisiteSelected: { backgroundColor: '#246BFD' },
  chipText: { fontSize: 13, fontWeight: '700' },
  chipTextSelected: { fontSize: 13, fontWeight: '700', color: 'white' },
  helper: { fontSize: 12, opacity: 0.5, lineHeight: 17 },
  muted: { opacity: 0.5 },
  primaryButton: {
    minHeight: 50,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: '#246BFD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: 'white', fontWeight: '800', fontSize: 16 },
  sectionTitle: { fontSize: 19, fontWeight: '800', marginTop: 4 },
  taskCard: { backgroundColor: 'white', borderRadius: 18, padding: 16, elevation: 1 },
  taskHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  taskTitleArea: { flex: 1 },
  taskName: { fontSize: 16, fontWeight: '800' },
  taskMeta: { fontSize: 12, opacity: 0.55, marginTop: 4, textTransform: 'capitalize' },
  dailyState: { fontSize: 11, opacity: 0.45, marginTop: 4 },
  completeButton: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: '#E6F7ED' },
  completeText: { color: '#15743A', fontWeight: '800' },
});
