// Fictional local casts. Appearance is independent of behavior and voice accent.
const SKIN={dark:['#3b241b','#4e3022','#62402b','#754b33','#875b40','#9c6b4a'],brown:['#835538','#966849','#ab7854','#bd8b65','#c89975','#d5a987'],light:['#d5a185','#dfb195','#e6bea4','#edc9af','#d4a78c','#f0d0b7'],east:['#c6946c','#d3a77d','#dfb48c','#e8c19c','#cba17d','#efd0ac']};
const NAMES={
 france:[['Camille','Elise','Juliette','Manon','Claire','Lea'],['Luc','Antoine','Hugo','Louis','Gabriel','Theo'],['Laurent','Moreau','Petit','Roux','Bernard','Durand']],
 nigeria:[['Adaeze','Chiamaka','Amina','Zainab','Folake','Ifeoma'],['Chinedu','Emeka','Yusuf','Tunde','Ibrahim','Femi'],['Okafor','Adeyemi','Bello','Nwosu','Balogun','Musa']],
 china:[['Mei','Xia','Lina','Jing','Yan','Hui'],['Wei','Jun','Ming','Bo','Jian','Tao'],['Shen','Li','Wang','Zhang','Chen','Liu']],
 japan:[['Yui','Aiko','Hana','Naomi','Emi','Yuna'],['Ren','Haruto','Kenji','Daichi','Hiro','Sota'],['Takahashi','Sato','Suzuki','Tanaka','Ito','Watanabe']],
 india:[['Priya','Ananya','Kavya','Asha','Meera','Nisha'],['Arjun','Rohan','Vikram','Aditya','Ravi','Kunal'],['Mehta','Patel','Rao','Sharma','Singh','Nair']],
 congo:[['Mireille','Aline','Chantal','Nadine','Estelle','Sylvie'],['Patrice','Alain','Jean','Serge','Emmanuel','Didier'],['Mbala','Mabiala','Ngoma','Makaya','Kouka','Massamba']],
 kenya:[['Wanjiku','Akinyi','Njeri','Atieno','Nyambura','Wambui'],['Kamau','Otieno','Kiptoo','Mwangi','Omondi','Maina'],['Kamau','Odhiambo','Njoroge','Kiprono','Ochieng','Kariuki']],
 pakistan:[['Sana','Ayesha','Fatima','Zainab','Maryam','Hira'],['Ahmed','Bilal','Hamza','Omar','Ali','Hassan'],['Qureshi','Khan','Malik','Ahmed','Iqbal','Shah']],
};
const FALLBACK=[['Elena','Amara','Sofia','Nora','Maya','Leila','Grace','Anna','Zoe','Clara'],['Isaac','Jonas','Owen','Samir','Felix','Mateo','Oliver','Daniel','Lucas','James'],['Reed','Beck','Walsh','Ruiz','Ellis','Mercer','Shaw','Lane','Park','Bennett']];
export function identityHash(value){let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;}
export function skinGroup(country,index){const id=country?.id;if(['nigeria','congo','kenya','south-africa','sudan'].includes(id))return index%10<8?'dark':'brown';if(['india','pakistan','morocco'].includes(id))return index%10<8?'brown':'dark';if(['china','japan'].includes(id))return index%10<9?'east':'brown';if(['america','spain','brazil','canada'].includes(id))return ['light','brown','dark'][index%3];return index%10<8?'light':index%2?'brown':'dark';}
export function countryPerson(person,role,country,seed,id,ordinal=0){
 const h=identityHash(`${seed}:${id}`),gender=person.gender==='female'?'female':'male',group=skinGroup(country,ordinal),pool=SKIN[group],staff=['doctor','nurse'].includes(role),names=NAMES[country?.id]||FALLBACK;
 const first=names[gender==='female'?0:1],last=names[2],name=staff?(id==='target'||id==='operation-doctor-0'?country.doctor:`${role==='nurse'?'Nurse':'Dr.'} ${first[ordinal%first.length]} ${last[Math.floor(ordinal/first.length)%last.length]}`):person.name;
 const hairstyles=gender==='female'?['ponytail','cropped','straight','curls-short','braids','ponytail-side']:['cropped','slick','original','curls-short','afro'];
 return {...person,name,gender,skin:pool[(h+ordinal)%pool.length],hair:['#181718','#34251f','#564033','#77614a','#967b56','#aaa09a'][(h>>>3)%6],eyes:['#4b3528','#775c3e','#3c574c','#5b7182','#85846b'][(h>>>7)%5],hairstyle:hairstyles[(h>>>11)%hairstyles.length],glasses:staff&&h%5===0,eyeShape:['natural','almond','round','lifted'][h%4],noseShape:['natural','slender','broad','defined'][(h>>>4)%4],mouthShape:['natural','full','soft','wide'][(h>>>6)%4],castCountry:country?.id};
}
export function coffeeLevel(level){return [2,4,7,11,14,19].includes(level);}
