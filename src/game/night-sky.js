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
 group.userData.nightSky={root:sky,stars,haze};return sky;
}
export function updateNightSky(group,outside,time){const sky=group?.userData.nightSky;if(!sky)return;sky.root.visible=outside;if(outside){sky.stars.material.opacity=.78+Math.sin(time*.8)*.07;sky.haze.scale.setScalar(1+Math.sin(time*.24)*.04);}}
