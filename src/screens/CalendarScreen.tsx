import React,{useCallback,useEffect,useMemo,useState}from'react';
import{Alert,AppState,Pressable,ScrollView,StyleSheet,Text,View}from'react-native';
import{listCalendarBlocks}from'../data/calendarRepository';
import{CalendarBlock}from'../domain/types';
import{listMealSchedules}from'../data/mealScheduleRepository';
import{getSleepSchedule}from'../data/sleepScheduleRepository';
import{listScheduledRoutines}from'../data/scheduledRoutineRepository';
import{listTasks}from'../data/taskRepository';
import{syncDeviceCalendars}from'../integrations/deviceCalendar';

type Item={id:string;date:string;start:string;end?:string;title:string;kind:'event'|'routine'|'meal'|'sleep'|'deadline'};
const dateKey=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const clock=(d:Date)=>d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false});
const monday=(d=new Date())=>{const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x};
const addDays=(d:Date,n:number)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const dayBounds=(d:Date)=>({start:new Date(d.getFullYear(),d.getMonth(),d.getDate()).toISOString(),end:new Date(d.getFullYear(),d.getMonth(),d.getDate()+1).toISOString()});
const label=(d:Date)=>d.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});

export function CalendarScreen(){
 const weekStart=useMemo(()=>monday(),[]),days=useMemo(()=>Array.from({length:14},(_,i)=>addDays(weekStart,i)),[weekStart]);
 const[items,setItems]=useState<Item[]>([]),[syncing,setSyncing]=useState(false),[lastSync,setLastSync]=useState<Date|null>(null);
 const load=useCallback(async()=>{
  const [routines,tasks,sleep]=await Promise.all([listScheduledRoutines(),listTasks(),getSleepSchedule()]);
  const out:Item[]=[];
  for(const d of days){const k=dateKey(d),b=dayBounds(d);const[events,meals]=await Promise.all([listCalendarBlocks(b.start,b.end),listMealSchedules(k)]);
   events.forEach((e:CalendarBlock)=>out.push({id:`e:${e.id}`,date:k,start:clock(new Date(e.startAt)),end:clock(new Date(e.endAt)),title:e.title,kind:'event'}));
   routines.forEach(r=>out.push({id:`r:${r.id}:${k}`,date:k,start:r.windowStart,end:r.windowEnd,title:r.name,kind:'routine'}));
   meals.forEach(m=>out.push({id:`m:${m.id}`,date:k,start:clock(new Date(m.startAt)),end:clock(new Date(m.endAt)),title:m.label,kind:'meal'}));
   if(sleep)out.push({id:`s:${k}`,date:k,start:sleep.startTime,title:'Sleep · planned 8h',kind:'sleep'});
  }
  tasks.forEach(t=>{if(!t.deadlineAt)return;const d=new Date(t.deadlineAt),k=dateKey(d);if(days.some(x=>dateKey(x)===k))out.push({id:`t:${t.id}`,date:k,start:clock(d),title:`Deadline · ${t.name}`,kind:'deadline'})});
  out.sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));setItems(out);
 },[days]);
 const sync=useCallback(async(silent=false)=>{if(syncing)return;setSyncing(true);try{await syncDeviceCalendars();setLastSync(new Date());await load()}catch(e){if(!silent)Alert.alert('Calendar sync failed',e instanceof Error?e.message:String(e));else await load()}finally{setSyncing(false)}},[load,syncing]);
 useEffect(()=>{sync(true)},[]);
 useEffect(()=>{const sub=AppState.addEventListener('change',state=>{if(state==='active')sync(true)});return()=>sub.remove()},[sync]);
 return <ScrollView contentContainerStyle={s.container}><View style={s.header}><View><Text style={s.heading}>Calendar</Text><Text style={s.sub}>This week + next week</Text></View><Pressable onPress={()=>sync(false)} disabled={syncing} style={s.sync}><Text style={s.syncText}>{syncing?'Syncing…':lastSync?'↻ Synced':'↻ Sync'}</Text></Pressable></View>
 {days.map((d,i)=>{const k=dateKey(d),dayItems=items.filter(x=>x.date===k);return <View key={k} style={[s.day,i===7&&s.nextWeek]}><View style={s.dayHead}><Text style={s.dayTitle}>{label(d)}</Text>{k===dateKey(new Date())?<Text style={s.today}>TODAY</Text>:null}</View>{dayItems.length===0?<Text style={s.empty}>Free</Text>:dayItems.map(x=><View key={x.id} style={s.item}><View style={[s.dot,s[`dot_${x.kind}`]]}/><Text style={s.time}>{x.start}{x.end?`–${x.end}`:''}</Text><View style={{flex:1}}><Text style={s.title}>{x.title}</Text><Text style={s.kind}>{x.kind==='routine'?'default routine':x.kind}</Text></View></View>)}</View>})}
 <Text style={s.foot}>Outlook/device events sync automatically. Default routines repeat daily. Meals and planned sleep are included; task deadlines appear as markers.</Text></ScrollView>
}
const s=StyleSheet.create({container:{padding:18,paddingBottom:90,gap:10},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:3},heading:{fontSize:30,fontWeight:'900'},sub:{opacity:.5,marginTop:2},sync:{paddingHorizontal:13,paddingVertical:9,borderRadius:12,backgroundColor:'#EEF1F6'},syncText:{fontWeight:'900',fontSize:12},day:{backgroundColor:'white',borderRadius:18,padding:14,gap:7,elevation:1},nextWeek:{marginTop:8,borderTopWidth:3,borderTopColor:'#E4E8F0'},dayHead:{flexDirection:'row',alignItems:'center',gap:8},dayTitle:{fontSize:16,fontWeight:'900'},today:{fontSize:9,fontWeight:'900',paddingHorizontal:7,paddingVertical:3,borderRadius:999,backgroundColor:'#172033',color:'white'},empty:{fontSize:12,opacity:.35,paddingVertical:5},item:{flexDirection:'row',alignItems:'flex-start',gap:8,paddingVertical:5,borderTopWidth:1,borderTopColor:'#F2F3F6'},dot:{width:7,height:7,borderRadius:99,marginTop:6,backgroundColor:'#697386'},dot_event:{backgroundColor:'#246BFD'},dot_routine:{backgroundColor:'#7A55C7'},dot_meal:{backgroundColor:'#D08A28'},dot_sleep:{backgroundColor:'#44546A'},dot_deadline:{backgroundColor:'#B83B3B'},time:{width:92,fontSize:11,fontWeight:'800',opacity:.65},title:{fontSize:13,fontWeight:'800'},kind:{fontSize:10,opacity:.4,marginTop:1},foot:{fontSize:11,opacity:.4,lineHeight:16,textAlign:'center',paddingHorizontal:8,paddingTop:5}});
