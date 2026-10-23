// Connected hospital seating with upholstered seats and a shared steel beam.
export function waitingBench(batch,m,x,z,rotation=0,count=2){
 const point=(a,c)=>[x+Math.cos(rotation)*a+Math.sin(rotation)*c,z-Math.sin(rotation)*a+Math.cos(rotation)*c];
 const box=(mat,a,y,c,w,h,d)=>{const[px,pz]=point(a,c);batch.box(mat,px,y,pz,w,h,d,rotation);};
 const width=count*.84;
 box(m.steel,0,.34,0,width+.08,.10,.11);
 for(let i=0;i<count;i++){const a=(i-(count-1)/2)*.84;box(m.steel,a,.48,0,.79,.08,.68);box(m.chair,a,.535,.02,.70,.065,.59);box(m.steel,a,.86,-.27,.79,.68,.075);box(m.chair,a,.87,-.222,.70,.58,.06);batch.collider?.(...point(a,0),.82,.8,1.23,rotation,'waiting-bench');}
 for(const a of[-width/2+.16,width/2-.16]){box(m.steel,a,.19,0,.055,.35,.08);box(m.steel,a,.035,0,.07,.045,.67);}
 for(const a of[-width/2,width/2]){box(m.steel,a,.65,.02,.04,.30,.04);box(m.steel,a,.795,.02,.055,.045,.53);}
 return Array.from({length:count},(_,i)=>{const[px,pz]=point((i-(count-1)/2)*.84,0);return{x:px,z:pz,rotation,waiting:true};});
}
