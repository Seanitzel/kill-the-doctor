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
 const drift=new T.Mesh(new T.SphereGeometry(62,24,16),new T.ShaderMaterial({side:T.BackSide,transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec3 p;uniform float time;void main(){vec3 n=normalize(p);float a=atan(n.z,n.x);float r=acos(n.y);float wave=sin(a*7.0+sin(r*9.0-time*.3)*2.0+time*.35);float rings=sin(r*22.0+a*2.0-time*.5);float hue=.5+.5*sin(wave*1.2+r*3.0+time*.12);vec3 col=mix(vec3(.20,.48,.38),vec3(.25,.32,.55),smoothstep(.0,.6,hue));col=mix(col,vec3(.43,.30,.54),smoothstep(.65,1.,hue));float alpha=smoothstep(-.2,.8,wave*rings)*.27*smoothstep(-.1,.3,n.y);gl_FragColor=vec4(col,alpha);}'}));drift.name='Smoke break shifting sky patterns';drift.position.z=40;drift.visible=false;sky.add(drift);
 group.userData.nightSky={root:sky,stars,haze,drift};return sky;
}
export function updateNightSky(group,outside,time,smoking=false){const sky=group?.userData.nightSky;if(!sky)return;sky.root.visible=outside;if(sky.drift){sky.drift.visible=outside&&smoking;sky.drift.material.uniforms.time.value=time;}if(outside){sky.stars.material.opacity=.78+Math.sin(time*.8)*.07;sky.haze.scale.setScalar(1+Math.sin(time*.24)*.04);}}
