"use client";
import { useEffect, useRef, useState } from "react";
import { Clock3, Volume2, ChevronDown } from "lucide-react";

export type TimerPreset={id:string;label:string;minutes:number};
type Timer={deadline:number|null;remaining:number;label:string};
const initial:Timer={deadline:null,remaining:0,label:"Brew timer"};
export default function BrewTimer({ownerKey,showSetup,preset}:{ownerKey:string;showSetup:boolean;preset:TimerPreset|null}) {
  const [timer,setTimer]=useState<Timer>(initial),[minutes,setMinutes]=useState(""),[now,setNow]=useState(0),[ready,setReady]=useState(false);
  const [sound,setSound]=useState(false),[audioReady,setAudioReady]=useState(false),[problem,setProblem]=useState("");
  const section=useRef<HTMLElement|null>(null);
  const audio=useRef<AudioContext|null>(null),rang=useRef<number|null>(null),presetUsed=useRef("");
  const seconds=Math.max(0,Math.ceil((timer.deadline?timer.deadline-now:timer.remaining)/1000));
  const active=timer.deadline!==null||timer.remaining>0,done=timer.deadline!==null&&seconds===0;
  useEffect(()=>{
    if(!ownerKey)return;
    try{const value=JSON.parse(localStorage.getItem(ownerKey)||"null");if(value&&typeof value.label==="string"&&Number.isFinite(value.remaining)&&value.remaining>=0&&(value.deadline===null||Number.isFinite(value.deadline)))setTimer(value);}
    catch{setProblem("Timer recovery is unavailable. Keep this page open and use a separate alarm.");}
    setNow(Date.now());setReady(true);
  },[ownerKey]);
  useEffect(()=>{if(ready&&ownerKey)try{localStorage.setItem(ownerKey,JSON.stringify(timer));}catch{setProblem("This browser cannot save the timer. Reload recovery is unavailable.");}},[timer,ready,ownerKey]);
  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(id);},[]);
  useEffect(()=>()=>{void audio.current?.close();},[]);
  function chime(){const ctx=audio.current;if(!ctx||ctx.state!=="running")return;for(let i=0;i<3;i++){const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=660+i*110;const t=ctx.currentTime+i*.3;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.2);o.start(t);o.stop(t+.22);}}
  async function enableSound(){try{audio.current??=new AudioContext();await audio.current.resume();const running=audio.current.state==="running";setAudioReady(running);setSound(running);if(running)chime();else setProblem("Sound was blocked. The visual timer still works; use a separate alarm.");}catch{setProblem("Sound is unavailable in this browser. Use a separate alarm.");}}
  useEffect(()=>{if(done&&rang.current!==timer.deadline){rang.current=timer.deadline;if(sound&&audioReady)chime();}},[done,timer.deadline,sound,audioReady]);
  useEffect(()=>{if(!preset||presetUsed.current===preset.id||active)return;setTimer({...initial,label:preset.label});setMinutes(String(preset.minutes));presetUsed.current=preset.id;},[preset,active]);
  useEffect(()=>{if(preset){section.current?.scrollIntoView({block:"start"});section.current?.focus({preventScroll:true});}},[preset]);
  function reset(){setTimer(initial);setMinutes("");rang.current=null;}
  const display=`${Math.floor(seconds/60).toString().padStart(2,"0")}:${(seconds%60).toString().padStart(2,"0")}`;
  if(!showSetup&&!active)return null;
  return <section ref={section} tabIndex={-1} className={`brew-timer ${active?"timer-sticky":""} ${done?"timer-finished":""}`} aria-label="Brew timer">
    {active?<><div className="timer-running"><div><span className="eyebrow"><Clock3 size={16}/>{done?"Timer finished":timer.deadline?"Timer running":"Timer paused"}</span><strong>{timer.label}</strong></div><output role="timer" aria-label={`${seconds} seconds remaining`}>{display}</output><div className="timer-actions">{!done&&<button type="button" className="button light compact" onClick={()=>{setNow(Date.now());setTimer(t=>t.deadline?{...t,deadline:null,remaining:Math.max(0,t.deadline-Date.now())}:{...t,deadline:Date.now()+t.remaining});}}>{timer.deadline?"Pause":"Resume"}</button>}<button type="button" className="button light compact" onClick={reset}>{done?"Dismiss timer":"Reset timer"}</button></div></div>
    {done&&<p role="alert" className="timer-alert">Time’s up for {timer.label}. Check your brew and acknowledge the timer.</p>}
    {!audioReady&&<button type="button" className="text-button timer-sound" onClick={enableSound}><Volume2 size={16}/>Enable and test sound</button>}
    </>:<details className="timer-setup" open={!!preset}><summary><Clock3 size={18}/><span>Set a brew timer</span><ChevronDown className="timer-chevron" size={16} aria-hidden="true"/><span className="small">Stays visible as you work</span></summary><div className="timer-inputs"><label>Timer name<input maxLength={80} value={timer.label} onChange={e=>setTimer(t=>({...t,label:e.target.value}))}/></label><label>Minutes<input aria-label="Timer minutes" type="number" min="0.1" max="180" step="any" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label><button className="button light" disabled={!ready||!(Number(minutes)>=.1&&Number(minutes)<=180)} onClick={()=>{const duration=Number(minutes)*60000;setNow(Date.now());rang.current=null;setTimer(t=>({...t,deadline:Date.now()+duration,remaining:duration}));}}>Start timer</button></div><button type="button" className="text-button timer-sound" onClick={enableSound}><Volume2 size={16}/>{audioReady?"Test sound":"Enable and test sound"}</button></details>}
    {audioReady&&<label className="timer-mute"><input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)}/>Sound enabled while this page is open</label>}
    <details className="timer-help"><summary><span>{audioReady&&sound?"Sound enabled":"Sound is off"} · alerts and background limits</span><ChevronDown className="timer-chevron" size={16} aria-hidden="true"/></summary><p className="timer-limit">Keep this page open. A locked phone, background tab or closed page may not alert; use a separate alarm when timing matters. Re-enable sound after reload.</p></details>
    {preset&&presetUsed.current!==preset.id&&active&&<p role="status">Reset this timer to load {preset.label} ({preset.minutes} min).</p>}
    {problem&&<p role="status">{problem}</p>}
  </section>;
}
