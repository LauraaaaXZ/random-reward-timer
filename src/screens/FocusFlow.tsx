import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { listTasks } from '../data/taskRepository';
import { applyReward, Wallet } from '../data/economyRepository';
import { finishSession, startSession } from '../data/sessionRepository';
import { eligibleTasks, difficultyTasks } from '../engine/eligibility';
import { commitmentMinutes, weightedTaskDraw } from '../engine/random';
import { calculateSessionReward } from '../engine/rewards';
import { DrawMode, SessionPool, Task } from '../domain/types';
import { markTaskCompleted } from '../services/taskService';

type Phase = 'draw' | 'timer' | 'settlement' | 'reward';

type RewardResult = {
  coin: number;
  xp: number;
  multiplier: number;
  overtimeMinutes: number;
  multiTask: number;
  wallet?: Wallet;
};

export function FocusFlow({ pool = 30, freeMinutes = 30, onClose }: { pool?: SessionPool; freeMinutes?: number; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('draw');
  const [mode, setMode] = useState<DrawMode>('normal');
  const [task, setTask] = useState<Task | null>(null);
  const [targetSeconds, setTargetSeconds] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [additionalTasks, setAdditionalTasks] = useState<Task[]>([]);
  const [completionCandidates, setCompletionCandidates] = useState<Task[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [reward, setReward] = useState<RewardResult | null>(null);

  useEffect(() => {
    if (phase !== 'timer') return;
    const id = setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const remaining = targetSeconds - elapsedSeconds;
  const overtime = Math.max(0, -remaining);
  const displaySeconds = Math.abs(remaining);
  const clock = useMemo(() => `${String(Math.floor(displaySeconds / 60)).padStart(2, '0')}:${String(displaySeconds % 60).padStart(2, '0')}`, [displaySeconds]);

  async function draw() {
    const tasks = await listTasks();
    const candidates = mode === 'normal' ? eligibleTasks(tasks) : difficultyTasks(tasks);
    const selected = weightedTaskDraw(candidates);
    if (!selected) {
      Alert.alert('No eligible tasks', mode === 'normal' ? 'Add or unlock a task first.' : 'No Difficulty tasks are currently eligible.');
      return;
    }
    const minutes = commitmentMinutes(selected, pool, freeMinutes);
    setTask(selected);
    setTargetSeconds(minutes * 60);
  }

  async function start() {
    if (!task) return;
    const id = await startSession({ taskId: task.id, pool, drawMode: mode, commitmentMinutes: Math.round(targetSeconds / 60) });
    setSessionId(id);
    setElapsedSeconds(0);
    setPhase('timer');
  }

  async function finish() {
    const tasks = await listTasks();
    setCompletionCandidates(eligibleTasks(tasks).filter((candidate) => candidate.id !== task?.id));
    setPhase('settlement');
  }

  function toggleAdditional(candidate: Task) {
    setAdditionalTasks((current) => {
      if (current.some((item) => item.id === candidate.id)) return current.filter((item) => item.id !== candidate.id);
      if (current.length >= 2) {
        Alert.alert('Triple task limit', 'A single session can record at most three completed tasks.');
        return current;
      }
      return [...current, candidate];
    });
  }

  async function settle() {
    if (!task || !sessionId) return;
    const workedMinutes = Math.max(1, Math.ceil(elapsedSeconds / 60));
    await finishSession(sessionId, workedMinutes);

    if (completed) await markTaskCompleted(task.id);
    for (const extra of additionalTasks) await markTaskCompleted(extra.id);

    const completedTaskCount = (completed ? 1 : 0) + additionalTasks.length;
    const calculated = calculateSessionReward({
      actualMinutes: workedMinutes,
      commitmentMinutes: Math.round(targetSeconds / 60),
      difficulty: task.difficulty,
      drawMode: mode,
      completedTaskCount,
    });
    const wallet = await applyReward({
      sessionId,
      source: completedTaskCount > 1 ? `${completedTaskCount}_task_session` : 'focus_session',
      coin: calculated.coin,
      xp: calculated.xp,
      multiplier: calculated.multiplier,
    });
    setReward({ ...calculated, wallet });
    setPhase('reward');
  }

  if (phase === 'draw') {
    return <View style={styles.page}>
      <Text style={styles.kicker}>{pool === 'deep' ? 'DEEP WORK' : `${pool} MIN POOL`}</Text>
      <Text style={styles.title}>Draw a focus session</Text>
      <View style={styles.modeRow}>{([['normal','Normal'],['difficulty_pick','Difficulty'],['difficulty_random','Difficulty 🎲']] as const).map(([value,label]) => <Pressable key={value} onPress={() => { setMode(value); setTask(null); }} style={[styles.chip, mode === value && styles.selected]}><Text style={mode === value ? styles.selectedText : styles.chipText}>{label}</Text></Pressable>)}</View>
      {task ? <View style={styles.card}><Text style={styles.task}>{task.name}</Text><Text style={styles.meta}>{task.difficulty.replace('_',' ')} · work for {Math.round(targetSeconds / 60)} min</Text><Pressable onPress={start} style={styles.primary}><Text style={styles.primaryText}>Start</Text></Pressable><Pressable onPress={draw} style={styles.secondary}><Text>↻ Reroll</Text></Pressable></View> : <Pressable onPress={draw} style={styles.primary}><Text style={styles.primaryText}>DRAW</Text></Pressable>}
      <Pressable onPress={onClose}><Text style={styles.close}>Cancel</Text></Pressable>
    </View>;
  }

  if (phase === 'timer') {
    return <View style={styles.page}><Text style={styles.kicker}>{overtime ? 'OVERTIME' : 'FOCUS'}</Text><Text style={styles.task}>{task?.name}</Text><Text style={[styles.timer, overtime > 0 && styles.overtime]}>{overtime ? '+' : ''}{clock}</Text><Text style={styles.meta}>{overtime ? 'Overtime earns a deliberately lower per-minute reward.' : `Target ${Math.round(targetSeconds / 60)} min`}</Text><Pressable onPress={finish} style={styles.primary}><Text style={styles.primaryText}>{remaining > 0 ? 'End Early' : 'Finish'}</Text></Pressable></View>;
  }

  if (phase === 'settlement') {
    return <ScrollView contentContainerStyle={styles.settlement}>
      <Text style={styles.kicker}>SETTLEMENT</Text><Text style={styles.title}>{Math.ceil(elapsedSeconds / 60)} min worked</Text>
      <Pressable onPress={() => setCompleted(false)} style={[styles.option,!completed && styles.optionSelected]}><Text>Session only</Text></Pressable>
      <Pressable onPress={() => setCompleted(true)} style={[styles.option,completed && styles.optionSelected]}><Text>Primary task completed ✓</Text></Pressable>
      <Text style={styles.section}>Also completed in this session</Text><Text style={styles.meta}>Optional · up to 2 more tasks. Dual/triple completion upgrades the reward multiplier.</Text>
      {completionCandidates.map((candidate) => { const selected = additionalTasks.some((item) => item.id === candidate.id); return <Pressable key={candidate.id} onPress={() => toggleAdditional(candidate)} style={[styles.option,selected && styles.optionSelected]}><Text>{selected ? '✓ ' : ''}{candidate.name}</Text></Pressable>; })}
      <Pressable onPress={settle} style={styles.primary}><Text style={styles.primaryText}>Confirm</Text></Pressable>
    </ScrollView>;
  }

  return <View style={styles.page}><Text style={styles.kicker}>COMPLETE ✓</Text><Text style={styles.reward}>+ {reward?.coin ?? 0} Coin</Text><Text style={styles.reward}>+ {reward?.xp ?? 0} XP</Text>{reward && reward.multiTask > 1 ? <Text style={styles.meta}>Multi-task bonus ×{reward.multiTask.toFixed(2)}</Text> : null}{reward && reward.overtimeMinutes > 0 ? <Text style={styles.meta}>Overtime: {reward.overtimeMinutes} min at reduced rate</Text> : null}<View style={styles.card}><Text style={styles.meta}>WALLET</Text><Text style={styles.wallet}>🪙 {reward?.wallet?.coin ?? 0} · XP {reward?.wallet?.xp ?? 0} · Lv. {reward?.wallet?.level ?? 1}</Text></View><Pressable onPress={onClose} style={styles.primary}><Text style={styles.primaryText}>Back to Today</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  page:{flex:1,padding:24,justifyContent:'center',gap:18,backgroundColor:'#F7F8FA'}, settlement:{padding:24,paddingBottom:70,gap:14,backgroundColor:'#F7F8FA'}, kicker:{fontSize:12,fontWeight:'800',letterSpacing:1.5,opacity:.5}, title:{fontSize:30,fontWeight:'800'}, section:{fontSize:17,fontWeight:'800',marginTop:8}, modeRow:{flexDirection:'row',flexWrap:'wrap',gap:8}, chip:{paddingHorizontal:12,paddingVertical:10,borderRadius:999,backgroundColor:'#E9EDF4'}, selected:{backgroundColor:'#246BFD'}, chipText:{fontWeight:'700'}, selectedText:{fontWeight:'800',color:'white'}, card:{padding:20,borderRadius:24,backgroundColor:'white',gap:14,elevation:2}, task:{fontSize:24,fontWeight:'800'}, meta:{opacity:.55,textTransform:'capitalize'}, timer:{fontSize:64,fontWeight:'800',fontVariant:['tabular-nums']}, overtime:{color:'#B34A00'}, primary:{minHeight:54,borderRadius:17,backgroundColor:'#246BFD',alignItems:'center',justifyContent:'center',paddingHorizontal:18}, primaryText:{color:'white',fontWeight:'900',fontSize:16}, secondary:{minHeight:46,alignItems:'center',justifyContent:'center'}, close:{textAlign:'center',opacity:.5,fontWeight:'700'}, option:{padding:16,borderRadius:16,backgroundColor:'white'}, optionSelected:{borderWidth:2,borderColor:'#246BFD'}, reward:{fontSize:28,fontWeight:'900'}, wallet:{fontSize:18,fontWeight:'800'}
});
