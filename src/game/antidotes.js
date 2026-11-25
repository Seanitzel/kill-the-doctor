import {buildAntidoteCabinet} from './antidote-prop.js';
import {disposeObjectResources} from './resources.js';
export class AntidoteStations {
  constructor(engine){
    this.e=engine;this.stations=[];
    const selected=0;for(const layout of engine.levels.filter(l=>l.floor===selected)){const station=buildAntidoteCabinet(layout);if(!station)continue;this.stations.push(station);engine.scene.add(station.root);engine.hospitals[layout.floor].colliders.push(station.collider);}this.update();
  }
  interactions(){return this.stations.filter(s=>s.interaction.floor===this.e.floor).map(s=>({...s.interaction,station:s,label:s.available?'Use contamination antidote':'Antidote cabinet · empty'}));}
  use(item){
    const e=this.e,s=item.station;if(!s||!this.stations.includes(s)||s.interaction.floor!==e.floor)return false;
    if(Math.hypot(e.playerPos.x-item.x,e.playerPos.z-item.z)>2.45)return false;
    if(!s.available){e.notify('This cabinet is empty. A fresh dose is available next assignment.');return false;}
    if(!(e.impairment>0)){e.notify('No contamination detected. Save this antidote for later.');return false;}
    s.setAvailable(false);e.impairment=0;e.impairmentTotal=0;e.exposureSource=null;e.antidoteProtectionUntil=e.mission.elapsed+8;e.coughCooldown=Math.max(e.coughCooldown||0,8);
    e.audio.sound('clue');e.notify('Antidote used · vision restored','clue');e.hooks.soundCaption?.('The contamination clears. Your vision is steady again.');e.emitHUD();return true;
  }
  update(){for(const s of this.stations)s.root.visible=s.interaction.floor===this.e.floor;}
  hud(){return this.stations.map(s=>({...s.interaction,available:s.available}));}
  dispose(){if(!this.e)return;for(const s of this.stations){const colliders=this.e.hospitals[s.interaction.floor].colliders,index=colliders.indexOf(s.collider);if(index>=0)colliders.splice(index,1);s.root.removeFromParent();disposeObjectResources(s.root,{textures:true});s.root.clear();}this.stations=[];this.e=null;}
}
