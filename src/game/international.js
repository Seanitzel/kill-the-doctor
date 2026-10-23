// Fictional hospitals and characters. Coordinates only locate the travel animation.
export const COUNTRIES=[
 ['france','France','Paris',48.9,2.3,'Velmoraine','#728ca7','Dr. Camille Laurent','female'],
 ['nigeria','Nigeria','Lagos',6.5,3.4,'Avelune','#538b82','Dr. Adaeze Okafor','female'],
 ['china','China','Shanghai',31.2,121.5,'Linthaven','#3a6985','Dr. Wei Shen','male'],
 ['japan','Japan','Tokyo',35.7,139.7,'Orivelle','#ac8e9d','Dr. Ren Takahashi','male'],
 ['israel','Israel','Tel Aviv',32.1,34.8,'Nhalewick','#7b9caf','Dr. Noa Ben-Ami','female'],
 ['india','India','Mumbai',19.1,72.9,'Serevane','#b69a6c','Dr. Priya Mehta','female'],
 ['italy','Italy','Rome',41.9,12.5,'Valedrisse','#999a77','Dr. Luca Moretti','male'],
 ['germany','Germany','Berlin',52.5,13.4,'Eldervoss','#6a9096','Dr. Anika Weber','female'],
 ['congo','Congo','Brazzaville',-4.3,15.3,'Lumerive','#619d8b','Dr. Patrice Mbala','male'],
 ['canada','Canada','Toronto',43.7,-79.4,'Caelwick','#7d8da7','Dr. Amara Desjardins','female'],
 ['england','England','London',51.5,-.1,'Brindleve','#8c959a','Dr. Oliver Ashford','male'],
 ['america','America','New York',40.7,-74,'Veylcrest','#648fbb','Dr. Elena Brooks','female'],
 ['spain','Spain','Madrid',40.4,-3.7,'Solmirelle','#b4977a','Dr. Ines Navarro','female'],
 ['brazil','Brazil','São Paulo',-23.6,-46.6,'Aurivane','#68a29a','Dr. Rafael Costa','male'],
 ['kenya','Kenya','Nairobi',-1.3,36.8,'Elunara','#a6a06d','Dr. Wanjiku Kamau','female'],
 ['morocco','Morocco','Casablanca',33.6,-7.6,'Merivane','#b49a83','Dr. Youssef El Amrani','male'],
 ['pakistan','Pakistan','Karachi',24.9,67,'Tiravelle','#6f9e92','Dr. Sana Qureshi','female'],
 ['ireland','Ireland','Dublin',53.3,-6.3,'Dunavelle','#81a294','Dr. Cian O’Connell','male'],
 ['south-africa','South Africa','Cape Town',-33.9,18.4,'Asterweft','#9b89aa','Dr. Naledi Mokoena','female'],
 ['sudan','Sudan','Port Sudan',19.6,37.2,'Sorelvane','#b19c85','Dr. Samir Idris','male'],
].map(([id,name,city,lat,lon,hospital,accent,doctor,gender],index)=>({id,name,city,lat,lon,hospital,accent,doctor,gender,index}));
export function completedCountries(save){
 if(Array.isArray(save.completedCountryIds))return COUNTRIES.filter(c=>save.completedCountryIds.includes(c.id)).map(c=>c.id);
 const count=Math.min(20,Math.max(0,Math.floor(Number(save.campaignCompleted??save.completed)||0)));return COUNTRIES.slice(0,count).map(c=>c.id);
}
export function campaignProgress(save){return completedCountries(save).length;}
export function campaignLevel(save){return save.playMode==='freestyle'?Math.max(1,(COUNTRIES.find(c=>c.id===save.countryId)?.index||0)+1):Math.min(20,campaignProgress(save)+1);}
export function countryFor(save){return save.playMode==='freestyle'?(COUNTRIES.find(c=>c.id===save.countryId)||COUNTRIES[0]):COUNTRIES.find(c=>!completedCountries(save).includes(c.id))||COUNTRIES.at(-1);}
export function unlockedCountries(save){return COUNTRIES.filter(c=>completedCountries(save).includes(c.id));}
export function setPlayMode(save,mode,id){if(!['story','freestyle'].includes(mode))return false;if(mode==='freestyle'&&!unlockedCountries(save).some(c=>c.id===(id||save.countryId)))return false;save.playMode=mode;if(id)save.countryId=id;save.activeAssignment=null;return true;}
export function migrateInternational(data){
 const count=Math.min(20,Math.max(0,Math.floor(Number(data.campaignCompleted??data.completed)||0))),oldOrder=[COUNTRIES[1],COUNTRIES[0],...COUNTRIES.slice(2)];
 const ids=Array.isArray(data.completedCountryIds)?completedCountries(data):((data.internationalVersion||0)>=2?COUNTRIES:oldOrder).slice(0,count).map(c=>c.id);
 const country=COUNTRIES.find(c=>c.id===data.countryId&&ids.includes(c.id));
 const pending=data.pendingTravel,valid=pending&&COUNTRIES.some(c=>c.id===pending.from)&&COUNTRIES.some(c=>c.id===pending.to)&&pending.from!==pending.to;
 return {internationalVersion:2,completedCountryIds:data.completedCountryIds===null&&count===0?null:ids,campaignCompleted:data.campaignCompleted===null&&count===0?null:ids.length,playMode:data.playMode==='freestyle'&&country?'freestyle':'story',countryId:country?.id||COUNTRIES[0].id,pendingTravel:valid?{from:pending.from,to:pending.to}:null,countryAttempts:Array.from({length:20},(_,i)=>Math.max(0,Math.floor(Number(data.countryAttempts?.[(data.internationalVersion||0)<2&&i<2?1-i:i])||0)))};
}
export function recordInternationalResult(save,mission,success){
 save.completedCountryIds=completedCountries(save);save.campaignCompleted=save.completedCountryIds.length;save.internationalVersion=2;save.countryAttempts??=Array(20).fill(0);save.countryAttempts[mission.country.index]=(save.countryAttempts[mission.country.index]||0)+1;
 if(success&&mission.playMode==='story'){
 if(!save.completedCountryIds.includes(mission.country.id))save.completedCountryIds.push(mission.country.id);
 save.campaignCompleted=save.completedCountryIds.length;save.countryId=mission.country.id;
 if(save.campaignCompleted<20)save.pendingTravel={from:mission.country.id,to:countryFor({...save,playMode:'story'}).id};
 }
}
export function lateContactRound(level,attempt){if(level<5)return null;const slot=Math.max(0,attempt)%10;return [0,2,4,7,9].includes(slot);}

// Derive a departure from the completed result, never the mutable menu selection.
export function nextFlight(result,save){
 if(!result?.success||result.playMode!=='story')return null;
 const from=COUNTRIES.find(c=>c.id===result.countryId),to=countryFor({...save,playMode:'story'});
 return from&&to&&from.id!==to.id&&completedCountries(save).includes(from.id)&&campaignProgress(save)<20?{from,to}:null;
}

export function pendingFlight(save){
 if(save.playMode!=='story'||!save.pendingTravel||campaignProgress(save)>=20)return null;
 const from=COUNTRIES.find(c=>c.id===save.pendingTravel.from),to=countryFor(save);
 return from&&completedCountries(save).includes(from.id)&&from.id!==to.id?{from,to}:null;
}
