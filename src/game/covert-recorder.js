// Three short silent evidence clips, captured from the rendered game only.
// Uses the existing frame loop; never opens a microphone or a camera device.
export class CovertRecorder{
 constructor(source,clips,{document:doc=globalThis.document,Recorder=globalThis.MediaRecorder,urls=globalThis.URL}={}){this.source=source;this.clips=clips;this.doc=doc;this.Recorder=Recorder;this.urls=urls;this.active=null;this.sessions=new Set();this.disposed=false;}
 sync(id,enabled){if(this.disposed||this.unavailable)return;if(!enabled||this.active?.id!==id)this.end(false);if(!enabled||this.active||!this.Recorder||!this.source)return;
  let openedStream;try{const canvas=this.doc.createElement('canvas');canvas.width=480;canvas.height=270;const context=canvas.getContext('2d'),stream=canvas.captureStream(12);openedStream=stream;let mimeType=['video/webm;codecs=vp8','video/mp4','video/webm'].find(t=>this.Recorder.isTypeSupported(t));const recorder=new this.Recorder(stream,{...(mimeType?{mimeType}:{}),videoBitsPerSecond:320000});const session={id,canvas,context,stream,recorder,chunks:[],bytes:0,save:false,frames:0,last:0};this.active=session;this.sessions.add(session);
   recorder.ondataavailable=event=>{if(!this.disposed&&event.data.size&&session.bytes+event.data.size<=2*1024*1024){session.chunks.push(event.data);session.bytes+=event.data.size;}};
   recorder.onstop=()=>{if(!this.disposed&&session.save&&session.chunks.length){const old=this.clips[id];if(old)this.urls.revokeObjectURL(old);this.clips[id]=this.urls.createObjectURL(new Blob(session.chunks,{type:recorder.mimeType}));}session.chunks.length=0;session.context=null;session.canvas.width=session.canvas.height=0;this.sessions.delete(session);recorder.ondataavailable=recorder.onstop=recorder.onerror=null;};
   recorder.onerror=()=>{this.unavailable=true;if(this.active===session)this.end(false);};recorder.start(500);
  }catch{this.unavailable=true;const owned=this.active?.stream===openedStream;this.end(false);if(!owned)for(const t of openedStream?.getTracks()||[])t.stop();}
 }
 capture(now){const s=this.active;if(!s||now-s.last<1000/12)return;s.last=now;if(s.frames++>=144){this.end(false);return;}s.context?.drawImage(this.source,0,0,480,270);}
 stopTracks(s){if(s.tracksStopped)return;s.tracksStopped=true;for(const t of s.stream.getTracks())t.stop();}
 end(save=false){const s=this.active;if(!s)return;this.active=null;s.save=save;try{if(s.recorder.state!=='inactive')s.recorder.stop();}catch{s.save=false;}finally{this.stopTracks(s);}}
 dispose(){if(this.disposed)return;this.disposed=true;this.end(false);for(const s of this.sessions){s.save=false;try{if(s.recorder.state!=='inactive')s.recorder.stop();}catch{}this.stopTracks(s);s.chunks.length=0;}for(const url of Object.values(this.clips))this.urls.revokeObjectURL(url);for(const key of Object.keys(this.clips))delete this.clips[key];this.source=null;}
}
