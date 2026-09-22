import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DailyPoolMode, Difficulty, Task } from '../domain/types';
import { listTasks } from '../data/taskRepository';
import { createTaskWithDependencies, markTaskCompleted } from '../services/taskService';
import { createScheduledRoutine, listScheduledRoutines, ScheduledRoutine } from '../data/scheduledRoutineRepository';
import { archiveMealSchedule, createMealSchedule, listMealSchedules, MealSchedule } from '../data/mealScheduleRepository';
import { clearSleepSchedule, getSleepSchedule, setSleepSchedule, SleepSchedule } from '../data/sleepScheduleRepository';

const difficulties: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' }, { value: 'super_difficult', label: 'Super Difficult' },
];
const dailyModes: { value: DailyPoolMode; label: string }[] = [
  { value: 'fragment', label: 'Fragment time' }, { value: 'easy_pool', label: 'Main draw pool' }, { value: 'both', label: 'Both' },
];

export function TaskManager() {
  const [tasks,setTasks]=useState<Task[]>([]),[name,setName]=useState(''),[minutes,setMinutes]=useState('30');
  const [difficulty,setDifficulty]=useState<Difficulty>('medium'),[prerequisiteIds,setPrerequisiteIds]=useState<string[]>([]);
  const [isDaily,setIsDaily]=useState(false),[dailyPoolMode,setDailyPoolMode]=useState<DailyPoolMode>('fragment');
  const [saving,setSaving]=useState(false),[notice,setNotice]=useState<string|null>(null),[routines,setRoutines]=useState<ScheduledRoutine[]>([]);
  const [routineName,setRoutineName]=useState(''),[routineTarget,setRoutineTarget]=useState('23:00'),[routineStart,setRoutineStart]=useState('22:00'),[routineEnd,setRoutineEnd]=useState('23:30');
  const [meals,setMeals]=useState<MealSchedule[]>([]),[mealLabel,setMealLabel]=useState('Meal'),[mealTime,setMealTime]=useState('12:00');
  const [sleep,setSleep]=useState<SleepSchedule|null>(null),[sleepStart,setSleepStart]=useState('23:30'),[sleepHours,setSleepHours]=useState('8');
  const [entryMode,setEntryMode]=useState<'random'|'scheduled'|'meal'|'sleep'>('random');
  const reload=useCallback(async()=>{const[t,r,m,s]=await Promise.all([listTasks(),listScheduledRoutines(),listMealSchedules(),getSleepSchedule()]);setTasks(t);setRoutines(r);setMeals(m);setSleep(s)},[]);
  useEffect(()=>{reload().catch(e=>Alert.alert('Could not load tasks',String(e)))},[reload]);
  const currentTasks=useMemo(()=>tasks.filter(t=>t.status!=='completed'&&t.status!=='archived'),[tasks]);
  const candidates=currentTasks;
  async function addTask(){const parsed=Number(minutes);if(!name.trim())return Alert.alert('Task name required');if(!Number.isFinite(parsed)||parsed<=0)return Alert.alert('Estimated time must be greater than 0');try{setSaving(true);await createTaskWithDependencies({name,estimatedMinutes:Math.round(parsed),difficulty,prerequisiteIds,dailyPoolMode:isDaily?dailyPoolMode:undefined});const confirmed=name.trim();setName('');setMinutes('30');setDifficulty('medium');setPrerequisiteIds([]);setIsDaily(false);setDailyPoolMode('fragment');await reload();setNotice(`✓ New task confirmed · ${confirmed} · ${Math.round(parsed)} min`);setTimeout(()=>setNotice(null),4000)}catch(e){Alert.alert('Could not create task',e instanceof Error?e.message:String(e))}finally{setSaving(false)}}
  async function complete(id:string){try{const t=tasks.find(x=>x.id===id);await markTaskCompleted(id);await reload();setNotice(`✓ Task completed · ${t?.name??'Task'}`);setTimeout(()=>setNotice(null),4000)}catch(e){Alert.alert('Could not complete task',e instanceof Error?e.message:String(e))}}
  async function addRoutine(){try{setSaving(true);await createScheduledRoutine({name:routineName,targetTime:routineTarget,windowStart:routineStart,windowEnd:routineEnd});const confirmed=routineName.trim();setRoutineName('');await reload();setNotice(`✓ Routine confirmed · ${confirmed} · target ${routineTarget}`);setTimeout(()=>setNotice(null),4000)}catch(e){Alert.alert('Could not create routine',e instanceof Error?e.message:String(e))}finally{setSaving(false)}}
  async function addMeal(){try{setSaving(true);await createMealSchedule(mealLabel,mealTime);await reload();setNotice(`✓ Meal block confirmed · ${mealTime}–${new Date(`2000-01-01T${mealTime}:00`).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} + 60 min`);setTimeout(()=>setNotice(null),4000)}catch(e){Alert.alert('Could not create meal block',e instanceof Error?e.message:String(e))}finally{setSaving(false)}}
  async function removeMeal(id:string){try{await archiveMealSchedule(id);await reload();setNotice('✓ Meal block removed');setTimeout(()=>setNotice(null),4000)}catch(e){Alert.alert('Could not remove meal block',e instanceof Error?e.message:String(e))}}
  async function saveSleep(){const hours=Number(sleepHours);if(!Number.isFinite(hours))return Alert.alert('Invalid sleep duration');try{setSaving(true);await setSleepSchedule(sleepStart,Math.round(hours*60));await reload();setNotice(`✓ Sleep block confirmed · ${sleepStart} · ${hours}h daily`);setTimeout(()=>setNotice(null),4000)}catch(e){Alert.alert('Could not save sleep block',e instanceof Error?e.message:String(e))}finally{setSaving(false)}}
  async function removeSleep(){try{await clearSleepSchedule();await reload();setNotice('✓ Sleep block removed');setTimeout(()=>setNotice(null),4000)}catch(e){Alert.alert('Could not remove sleep block',e instanceof Error?e.message:String(e))}}
  function togglePrerequisite(id:string){setPrerequisiteIds(c=>c.includes(id)?c.filter(x=>x!==id):[...c,id])}
  return <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    {notice?<View style={styles.notice}><Text style={styles.noticeText}>{notice}</Text></View>:null}
    <Text style={styles.heading}>Tasks</Text><Text style={styles.subheading}>Random tasks and scheduled routines in one workspace.</Text>
    <View style={styles.card}>
      <Text style={styles.label}>Add</Text><View style={styles.wrap}>
        <Pressable onPress={()=>setEntryMode('random')} style={[styles.chip,entryMode==='random'&&styles.chipSelected]}><Text style={entryMode==='random'?styles.chipTextSelected:styles.chipText}>Random task</Text></Pressable>
        <Pressable onPress={()=>setEntryMode('scheduled')} style={[styles.chip,entryMode==='scheduled'&&styles.chipSelected]}><Text style={entryMode==='scheduled'?styles.chipTextSelected:styles.chipText}>Scheduled routine</Text></Pressable>
        <Pressable onPress={()=>setEntryMode('meal')} style={[styles.chip,entryMode==='meal'&&styles.chipSelected]}><Text style={entryMode==='meal'?styles.chipTextSelected:styles.chipText}>Meal block</Text></Pressable>
        <Pressable onPress={()=>setEntryMode('sleep')} style={[styles.chip,entryMode==='sleep'&&styles.chipSelected]}><Text style={entryMode==='sleep'?styles.chipTextSelected:styles.chipText}>Sleep block</Text></Pressable>
      </View>
      {entryMode==='random'?<>
        <Text style={styles.label}>Task name</Text><TextInput value={name} onChangeText={setName} placeholder="e.g. Daily news reading" style={styles.input}/>
        <Text style={styles.label}>Estimated minutes</Text><TextInput value={minutes} onChangeText={setMinutes} keyboardType="number-pad" style={styles.input}/>
        <Text style={styles.label}>Task type</Text><View style={styles.wrap}><Pressable onPress={()=>setIsDaily(false)} style={[styles.chip,!isDaily&&styles.chipSelected]}><Text style={!isDaily?styles.chipTextSelected:styles.chipText}>One-off</Text></Pressable><Pressable onPress={()=>setIsDaily(true)} style={[styles.chip,isDaily&&styles.chipSelected]}><Text style={isDaily?styles.chipTextSelected:styles.chipText}>Daily</Text></Pressable></View>
        {isDaily?<><Text style={styles.label}>Daily pool</Text><View style={styles.wrap}>{dailyModes.map(i=><Pressable key={i.value} onPress={()=>setDailyPoolMode(i.value)} style={[styles.chip,dailyPoolMode===i.value&&styles.chipSelected]}><Text style={dailyPoolMode===i.value?styles.chipTextSelected:styles.chipText}>{i.label}</Text></Pressable>)}</View><Text style={styles.helper}>After completion today it leaves active draw pools until tomorrow.</Text></>:null}
        <Text style={styles.label}>Difficulty</Text><View style={styles.wrap}>{difficulties.map(i=><Pressable key={i.value} onPress={()=>setDifficulty(i.value)} style={[styles.chip,difficulty===i.value&&styles.chipSelected]}><Text style={difficulty===i.value?styles.chipTextSelected:styles.chipText}>{i.label}</Text></Pressable>)}</View>
        <Text style={styles.label}>Prerequisite tasks</Text>{candidates.length===0?<Text style={styles.muted}>No existing tasks yet.</Text>:<View style={styles.wrap}>{candidates.map(t=>{const selected=prerequisiteIds.includes(t.id);return <Pressable key={t.id} onPress={()=>togglePrerequisite(t.id)} style={[styles.prerequisite,selected&&styles.prerequisiteSelected]}><Text numberOfLines={1} style={selected?styles.chipTextSelected:styles.chipText}>{selected?'✓ ':''}{t.name}</Text></Pressable>})}</View>}
        <Pressable disabled={saving} onPress={addTask} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{saving?'Saving…':'Add task'}</Text></Pressable>
      </>:entryMode==='scheduled'?<>
        <Text style={styles.helper}>For early sleep, wake-up, exercise, or other time-window routines. These do not enter random draws.</Text>
        <Text style={styles.label}>Routine name</Text><TextInput value={routineName} onChangeText={setRoutineName} placeholder="e.g. Early sleep" style={styles.input}/>
        <Text style={styles.label}>Target time</Text><TextInput value={routineTarget} onChangeText={setRoutineTarget} placeholder="23:00" style={styles.input}/>
        <Text style={styles.label}>Completion window</Text><View style={styles.timeRow}><TextInput value={routineStart} onChangeText={setRoutineStart} placeholder="22:00" style={[styles.input,styles.timeInput]}/><Text style={styles.timeDash}>to</Text><TextInput value={routineEnd} onChangeText={setRoutineEnd} placeholder="23:30" style={[styles.input,styles.timeInput]}/></View>
        <Pressable disabled={saving} onPress={addRoutine} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{saving?'Saving…':'Add routine'}</Text></Pressable>
      </>:entryMode==='meal'?<>
        <Text style={styles.helper}>Meals are fixed 60-minute protected blocks. They never enter random draws. Set 2–4 active meal blocks per day; the daily work guardrail activates only after at least 2 meals and sleep are configured.</Text>
        <Text style={styles.label}>Meal label</Text><TextInput value={mealLabel} onChangeText={setMealLabel} placeholder="Lunch" style={styles.input}/>
        <Text style={styles.label}>Start time · HH:MM</Text><TextInput value={mealTime} onChangeText={setMealTime} placeholder="12:00" style={styles.input}/>
        <Pressable disabled={saving||meals.length>=4} onPress={addMeal} style={[styles.primaryButton,meals.length>=4&&styles.disabled]}><Text style={styles.primaryButtonText}>{meals.length>=4?'4 meal blocks reached':saving?'Saving…':'Add 60 min meal block'}</Text></Pressable>
        <Text style={styles.helper}>{meals.length}/4 active · minimum 2 recommended</Text>
        {meals.map(m=><View key={m.id} style={styles.mealRow}><View><Text style={styles.taskName}>{m.label}</Text><Text style={styles.taskMeta}>{m.startTime} · 60 min · daily · protected</Text></View><Pressable onPress={()=>removeMeal(m.id)} style={styles.removeButton}><Text style={styles.removeText}>Remove</Text></Pressable></View>)}
      </>:<>
        <Text style={styles.helper}>Sleep is a recurring protected block and never enters random draws. It is deducted before daily events when calculating disposable time.</Text>
        <Text style={styles.label}>Sleep start · HH:MM</Text><TextInput value={sleepStart} onChangeText={setSleepStart} placeholder="23:30" style={styles.input}/>
        <Text style={styles.label}>Duration · hours</Text><TextInput value={sleepHours} onChangeText={setSleepHours} keyboardType="decimal-pad" placeholder="8" style={styles.input}/>
        <Pressable disabled={saving} onPress={saveSleep} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{saving?'Saving…':sleep?'Update sleep block':'Add sleep block'}</Text></Pressable>
        {sleep?<View style={styles.mealRow}><View><Text style={styles.taskName}>Sleep</Text><Text style={styles.taskMeta}>{sleep.startTime} · {(sleep.durationMinutes/60).toFixed(1)}h · daily · protected</Text></View><Pressable onPress={removeSleep} style={styles.removeButton}><Text style={styles.removeText}>Remove</Text></Pressable></View>:<Text style={styles.helper}>No sleep block configured.</Text>}
      </>}
    </View>
    <Text style={styles.sectionTitle}>Current tasks</Text>
    {currentTasks.length===0?<Text style={styles.muted}>No active tasks.</Text>:currentTasks.map(t=><View key={t.id} style={styles.taskCard}><View style={styles.taskHeader}><View style={styles.taskTitleArea}><Text style={styles.taskName}>{t.status==='locked'?'🔒 ':''}{t.dailyPoolMode?'↻ ':''}{t.name}</Text><Text style={styles.taskMeta}>{t.estimatedMinutes} min · {t.difficulty.replace('_',' ')} · {t.dailyPoolMode?'daily · '+t.dailyPoolMode.replace('_',' '):t.status}</Text>{t.dailyPoolMode&&t.dailyLastCompletedDate?<Text style={styles.dailyState}>Last completed: {t.dailyLastCompletedDate}</Text>:null}</View>{t.status==='active'?<Pressable onPress={()=>complete(t.id)} style={styles.completeButton}><Text style={styles.completeText}>Done</Text></Pressable>:null}</View></View>)}
    {routines.length>0?<><Text style={styles.sectionTitle}>Scheduled routines</Text><View style={styles.card}>{routines.map(r=><View key={r.id} style={styles.routineRow}><Text style={styles.taskName}>{r.name}</Text><Text style={styles.taskMeta}>{r.windowStart}–{r.windowEnd} · target {r.targetTime} · daily</Text></View>)}</View></>:null}
  </ScrollView>
}
const styles=StyleSheet.create({container:{padding:20,paddingBottom:80,gap:14},notice:{backgroundColor:'#172033',borderRadius:16,padding:14},noticeText:{color:'white',fontWeight:'800'},heading:{fontSize:30,fontWeight:'800'},subheading:{opacity:.58,marginTop:-8},card:{backgroundColor:'white',borderRadius:24,padding:18,gap:10,elevation:2},label:{fontSize:12,fontWeight:'800',marginTop:4,opacity:.72},input:{minHeight:48,borderWidth:1,borderColor:'#E1E5EC',borderRadius:14,paddingHorizontal:14,backgroundColor:'#FAFBFC'},wrap:{flexDirection:'row',flexWrap:'wrap',gap:8},timeRow:{flexDirection:'row',alignItems:'center',gap:8},timeInput:{flex:1},timeDash:{opacity:.5},routineRow:{paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#EEF1F6'},chip:{paddingHorizontal:12,paddingVertical:9,borderRadius:999,backgroundColor:'#EEF1F6'},chipSelected:{backgroundColor:'#246BFD'},prerequisite:{maxWidth:'100%',paddingHorizontal:12,paddingVertical:9,borderRadius:12,backgroundColor:'#EEF1F6'},prerequisiteSelected:{backgroundColor:'#246BFD'},chipText:{fontSize:13,fontWeight:'700'},chipTextSelected:{fontSize:13,fontWeight:'700',color:'white'},helper:{fontSize:12,opacity:.5,lineHeight:17},muted:{opacity:.5},primaryButton:{minHeight:50,marginTop:8,borderRadius:16,backgroundColor:'#246BFD',alignItems:'center',justifyContent:'center'},primaryButtonText:{color:'white',fontWeight:'800',fontSize:16},sectionTitle:{fontSize:19,fontWeight:'800',marginTop:4},taskCard:{backgroundColor:'white',borderRadius:18,padding:16,elevation:1},taskHeader:{flexDirection:'row',alignItems:'center',gap:12},taskTitleArea:{flex:1},taskName:{fontSize:16,fontWeight:'800'},taskMeta:{fontSize:12,opacity:.55,marginTop:4,textTransform:'capitalize'},dailyState:{fontSize:11,opacity:.45,marginTop:4},completeButton:{paddingHorizontal:14,paddingVertical:9,borderRadius:12,backgroundColor:'#E6F7ED'},completeText:{color:'#15743A',fontWeight:'800'},mealRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#EEF1F6'},removeButton:{paddingHorizontal:12,paddingVertical:8,borderRadius:10,backgroundColor:'#FCECEC'},removeText:{color:'#9B2C2C',fontWeight:'800'},disabled:{opacity:.4}});
