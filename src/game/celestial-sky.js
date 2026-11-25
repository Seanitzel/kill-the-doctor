import * as T from 'three';

// Small, texture-free lunar geometry: shared procedural maria/craters and a
// fixed light direction produce an illuminated sphere, including its crescent.
function moonMaterial(crescent){
 return new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{visibility:{value:1},sunDirection:{value:new T.Vector3(...(crescent?[.52,-.08,.85]:[-.10,.12,-1])).normalize()}},vertexShader:`
  varying vec3 lunarNormal;
  void main(){lunarNormal=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
 `,fragmentShader:`
  varying vec3 lunarNormal;uniform vec3 sunDirection;uniform float visibility;
  float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  void main(){
   vec3 n=normalize(lunarNormal);float maria=noise(n*5.+vec3(13,6,9));
   float crater=noise(n*51.),fine=noise(n*113.);
   float surface=.68-.25*smoothstep(.48,.68,maria)+.10*(crater-.5)+.055*(fine-.5);
   float light=max(0.,dot(n,normalize(sunDirection)));
   float earthshine=.018;vec3 colour=vec3(.91,.92,.90)*surface*(earthshine+pow(light,.65)*1.8);
   gl_FragColor=vec4(colour,visibility);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }
 `});
}

export function addStoryCelestials(sky,moon,haze,country){
 if(!['america','egypt'].includes(country))return null;
 moon.geometry.dispose();moon.material.dispose();moon.geometry=new T.SphereGeometry(.48,48,32);moon.material=moonMaterial(country==='egypt');moon.name=country==='egypt'?'Nighttime crescent moon':'Full moon with lunar surface detail';moon.position.set(-15,20,94);haze.visible=false;
 if(country==='america')return {moon};
 // A soft solar limb and broad atmospheric glow share one small billboard.
 // No bloom render targets or opaque sphere silhouette on mobile GPUs.
 const sun=new T.Mesh(new T.PlaneGeometry(5,5),new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms:{colour:{value:new T.Color('#ffdbab')},visibility:{value:1}},vertexShader:`
 varying vec2 solarUv;void main(){solarUv=uv;vec4 center=modelViewMatrix*vec4(0.,0.,0.,1.);center.xy+=position.xy;gl_Position=projectionMatrix*center;}
 `,fragmentShader:`
 varying vec2 solarUv;uniform vec3 colour;uniform float visibility;
 void main(){float r=length(solarUv-.5)*2.;float core=1.-smoothstep(.18,.29,r);float glow=exp(-r*r*7.)*.22*(1.-smoothstep(.65,1.,r));float alpha=(core*.88+glow)*visibility;gl_FragColor=vec4(colour,alpha);
 #include <colorspace_fragment>
 }
 `}));sun.name='Setting sun';sun.position.set(3,15,104);sky.add(sun);
 const atmosphere=new T.Mesh(new T.SphereGeometry(64,32,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{horizon:{value:new T.Color()},zenith:{value:new T.Color()}},vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w;}',fragmentShader:`
  varying vec3 direction;uniform vec3 horizon;uniform vec3 zenith;
  void main(){float elevation=normalize(direction).y;gl_FragColor=vec4(mix(horizon,zenith,smoothstep(0.,.72,elevation)),1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  }
 `}));atmosphere.name='Continuous sunset atmosphere';atmosphere.renderOrder=-10;atmosphere.frustumCulled=false;sky.add(atmosphere);
 return {moon,sun,atmosphere};
}

const GOLD=new T.Color('#d8ae83'),RED=new T.Color('#ad654f'),BLUE=new T.Color('#344756'),NIGHT=new T.Color('#070f20'),EMBER=new T.Color('#e68143');
export function updateStoryCelestials(state,age,camera){
 const bodies=state.celestials;if(!bodies)return;
 if(!bodies.sun){bodies.moon.visible=true;return;}
 const dark=T.MathUtils.smoothstep(age,60,150),setting=T.MathUtils.smoothstep(age,0,115),night=age>=150;
 bodies.sun.position.y=15-19*setting;bodies.sun.visible=!night&&bodies.sun.position.y>-.62;bodies.sun.material.uniforms.colour.value.set('#ffdbab').lerp(EMBER,setting);bodies.sun.material.uniforms.visibility.value=1-T.MathUtils.smoothstep(setting,.83,1);
 bodies.moon.visible=night;bodies.moon.material.uniforms.visibility.value=T.MathUtils.smoothstep(age,150,162);
 const uniforms=bodies.atmosphere.material.uniforms;uniforms.horizon.value.copy(GOLD).lerp(RED,T.MathUtils.smoothstep(age,0,60)).lerp(NIGHT,dark);uniforms.zenith.value.copy(BLUE).lerp(NIGHT,dark);
 if(camera)bodies.atmosphere.position.copy(camera.position);
}
