import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar } from '@capacitor/status-bar';
export const native=Capacitor.isNativePlatform();
export const platform=Capacitor.getPlatform();
export function touchDevice(){return native || new URLSearchParams(window.location.search).get('controls')==='touch' || window.matchMedia('(pointer:coarse)').matches;}
export async function nativeFeedback(type='tap') {
  if(!native)return;
  try {if(type==='success')await Haptics.notification({type:NotificationType.Success});else if(type==='warning')await Haptics.notification({type:NotificationType.Warning});else await Haptics.impact({style:type==='shot'?ImpactStyle.Medium:ImpactStyle.Light});}catch{}
}
export async function initializeNative({background,back}) {
  if(!native)return ()=>{};
  await Promise.allSettled([StatusBar.hide(),ScreenOrientation.lock({orientation:'landscape'})]);
  const handles=[];
  handles.push(await App.addListener('appStateChange',({isActive})=>{if(!isActive)background();}));
  if(platform==='android')handles.push(await App.addListener('backButton',()=>back()));
  return ()=>handles.forEach(h=>h.remove());
}

export async function nativeAnnouncement(text,volume){if(!native)return;try{await TextToSpeech.speak({text,lang:"en-US",rate:.95,pitch:1,volume,category:"playback"});}catch{}}
export function stopNativeSpeech(){if(native)TextToSpeech.stop().catch(()=>{});}
