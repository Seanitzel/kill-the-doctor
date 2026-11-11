// One layout for tables, seats and diners. The far row leaves a clear service
// bay under the back windows, including space to approach the cutlery counter.
export function cafeteriaTables(room){
 const minX=(room.x-11)*3-1.5,maxX=minX+room.w*3,minZ=(room.z-11)*3-1.5,maxZ=minZ+room.h*3;
 const rows=room.h>=6?[minZ+3,room.center.z,maxZ-4.5]:[minZ+4.5,minZ+8.25,maxZ-3];
 return rows.flatMap(z=>[minX+2,maxX-2].map(x=>({x,z})));
}
