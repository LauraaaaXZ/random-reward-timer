import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { GAME_CONFIG } from '../config/gameConfig';
import { getWallet, Wallet } from '../data/economyRepository';
import {
  getHolidayPassCount,
  listUpcomingHolidays,
  redeemHolidayPassWithCoin,
  scheduleHoliday,
  HolidayDay,
} from '../data/holidayRepository';

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function RewardsScreen() {
  const [wallet,setWallet]=useState<Wallet>({coin:0,xp:0,level:1});
  const [passes,setPasses]=useState(0);
  const [date,setDate]=useState(localDateKey());
  const [holidays,setHolidays]=useState<HolidayDay[]>([]);

  async function reload(){
    const today=localDateKey();
    const [w,p,h]=await Promise.all([getWallet(),getHolidayPassCount(),listUpcomingHolidays(today)]);
    setWallet(w);setPasses(p);setHolidays(h);
  }
  useEffect(()=>{reload().catch(console.error)},[]);

  async function redeem(){
    try{await redeemHolidayPassWithCoin();await reload();}
    catch(error){Alert.alert('Cannot redeem',error instanceof Error?error.message:String(error));}
  }

  async function usePass(){
    try{await scheduleHoliday(date);await reload();}
    catch(error){Alert.alert('Cannot schedule holiday',error instanceof Error?error.message:String(error));}
  }

  return <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.heading}>Rewards</Text>
    <Text style={styles.subheading}>Freedom rewards and holiday time.</Text>

    <View style={styles.card}>
      <Text style={styles.kicker}>HOLIDAY PASS</Text>
      <Text style={styles.big}>{passes} available</Text>
      <Text style={styles.meta}>A Holiday Pass lets you declare one calendar day as protected holiday time. Random pools and proactive daily tasks stay quiet on that day.</Text>
      <Pressable onPress={redeem} style={styles.primary}><Text style={styles.primaryText}>Redeem · {GAME_CONFIG.holidayPass.coinCost} Coin</Text></Pressable>
      <Text style={styles.wallet}>Wallet · 🪙 {wallet.coin}</Text>
      <Text style={styles.meta}>Holiday Passes can also be awarded by future prize-pool draws, milestones, or jackpots.</Text>
    </View>

    <View style={styles.card}>
      <Text style={styles.kicker}>PLAN A HOLIDAY</Text>
      <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" style={styles.input}/>
      <View style={styles.quickRow}>
        <Pressable onPress={()=>setDate(localDateKey())} style={styles.quick}><Text>Today</Text></Pressable>
        <Pressable onPress={()=>{const d=new Date();d.setDate(d.getDate()+1);setDate(localDateKey(d))}} style={styles.quick}><Text>Tomorrow</Text></Pressable>
      </View>
      <Pressable onPress={usePass} style={styles.primary}><Text style={styles.primaryText}>Use Holiday Pass</Text></Pressable>
    </View>

    <View style={styles.card}>
      <Text style={styles.kicker}>UPCOMING HOLIDAYS</Text>
      {holidays.length===0?<Text style={styles.meta}>No planned holidays yet.</Text>:holidays.map(h=><View key={h.localDate} style={styles.holidayRow}><View><Text style={styles.holidayDate}>{h.localDate}</Text>{h.name?<Text style={styles.meta}>{h.name}</Text>:null}</View><Text style={styles.meta}>{h.source==='fixed'?'HK holiday':h.source}</Text></View>)}
    </View>
  </ScrollView>;
}

const styles=StyleSheet.create({
  container:{padding:20,paddingBottom:90,gap:16},heading:{fontSize:30,fontWeight:'800'},subheading:{opacity:.58,marginTop:-8},
  card:{backgroundColor:'white',borderRadius:22,padding:18,gap:12,elevation:1},kicker:{fontSize:11,fontWeight:'800',letterSpacing:1.3,opacity:.5},
  big:{fontSize:25,fontWeight:'900'},meta:{fontSize:13,opacity:.58,lineHeight:19},wallet:{fontWeight:'800'},
  primary:{minHeight:50,borderRadius:16,backgroundColor:'#246BFD',alignItems:'center',justifyContent:'center',paddingHorizontal:16},
  primaryText:{color:'white',fontWeight:'900'},input:{minHeight:48,borderWidth:1,borderColor:'#E1E5EC',borderRadius:14,paddingHorizontal:14},
  quickRow:{flexDirection:'row',gap:8},quick:{paddingHorizontal:14,paddingVertical:9,borderRadius:12,backgroundColor:'#EEF1F6'},
  holidayRow:{flexDirection:'row',justifyContent:'space-between',paddingVertical:5},holidayDate:{fontWeight:'800'}
});
