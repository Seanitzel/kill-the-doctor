import * as T from 'three';
// Deterministic, small geometry: no per-star objects, textures, lights or timers.
export function addNightSky(group){
 const sky=new T.Group();sky.name='Starry night';sky.visible=false;group.add(sky);
 const positions=[],colors=[];let seed=34671;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<400;i++){const angle=random()*Math.PI*2,y=.06+random()*.92,r=Math.sqrt(1-y*y);positions.push(Math.cos(angle)*r*65,y*65,40+Math.sin(angle)*r*65);const light=.5+random()*.5;colors.push(light*.87,light*.93,light);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 const stars=new T.Points(geometry,new T.PointsMaterial({size:.095,vertexColors:true,fog:false,transparent:true,opacity:.85,depthWrite:false}));stars.name='Distant stars';sky.add(stars);
 const moon=new T.Mesh(new T.SphereGeometry(1.1,16,12),new T.MeshBasicMaterial({color:'#dbe6f0',fog:false}));moon.name='Moon';moon.position.set(23,26,1);sky.add(moon);
 const haze=new T.Mesh(new T.SphereGeometry(1.7,16,12),new T.MeshBasicMaterial({color:'#b4cde8',fog:false,transparent:true,opacity:.045,depthWrite:false}));haze.position.copy(moon.position);sky.add(haze);
 const drift=new T.Mesh(new T.SphereGeometry(62,24,16),new T.ShaderMaterial({side:T.BackSide,transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec3 p;uniform float time;void main(){vec3 n=normalize(p);float a=atan(n.z,n.x);float h=n.y;float t=time*.075;float bend=sin(a*2.3+t)*.07+sin(a*4.7-t*.6)*.025;float curtain=exp(-pow((h-(.32+bend+sin(a*.8+t*.3)*.1))/.10,2.));float ribbons=.55+.45*sin(a*17.+sin(a*3.+t)*2.5+t);float fade=smoothstep(.06,.27,h);float hue=.5+.5*sin(a*.9+t*.23);vec3 col=mix(vec3(.22,.48,.37),vec3(.30,.32,.52),hue);col=mix(col,vec3(.45,.30,.48),smoothstep(.7,1.,hue)*.45);gl_FragColor=vec4(col,curtain*ribbons*.22*fade);}'}));drift.name='Smoke break shifting sky patterns';drift.position.z=40;drift.visible=false;sky.add(drift);
 const streak=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),new T.LineBasicMaterial({color:'#d2e0e9',transparent:true,opacity:0,depthWrite:false,fog:false}));streak.name='Occasional shooting star';streak.visible=false;sky.add(streak);group.userData.nightSky={root:sky,stars,haze,drift,streak};return sky;
}
export function updateNightSky(group,outside,time,smoking=false){
 const sky=group?.userData.nightSky;if(!sky)return;sky.root.visible=outside;
 const active=outside&&smoking;sky.drift.visible=active;sky.drift.material.uniforms.time.value=time;
 if(active&&!sky.smoking){sky.sessionStart=time;sky.nextStar=time+8;sky.starAt=null;sky.starCount=0;}
 sky.smoking=active;sky.streak.visible=false;
 if(active){
  if(time>=sky.nextStar){sky.starAt=sky.nextStar;sky.starCount++;sky.nextStar=time+19+(sky.starCount*13%17);}
  if(sky.starAt!==null){const age=time-sky.starAt;if(age<1.7){const t=age/1.7,angle=sky.starCount*2.399,x=Math.sin(angle)*27,z=24+Math.cos(angle)*22,positions=sky.streak.geometry.attributes.position;positions.setXYZ(0,x+t*12,33-t*9,z);positions.setXYZ(1,x+Math.max(0,t-.10)*12,33-Math.max(0,t-.10)*9,z);positions.needsUpdate=true;sky.streak.geometry.computeBoundingSphere();sky.streak.material.opacity=Math.sin(t*Math.PI)*.55;sky.streak.visible=true;}}
 }else sky.starAt=null;
 if(outside){sky.stars.material.opacity=.78+Math.sin(time*.8)*.07;sky.haze.scale.setScalar(1+Math.sin(time*.24)*.04);}
}
