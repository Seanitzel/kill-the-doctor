// Geometry and decorative finishes must agree about openings in wall bays.
export const WALL_HEIGHT=3.64;
export const WINDOW_SILL=1.12;
export const WINDOW_HEAD=2.61;
export const WINDOW_HEADER_HEIGHT=1.04;
export function wallHasWindow(wall){return !wall.door&&!wall.exterior&&Math.round(wall.x+wall.z)%4===0;}
export function floralWallBand(wall){
 const bottom=wallHasWindow(wall)?WINDOW_HEAD+.05:1.24,top=WALL_HEIGHT-.08;
 return {bottom,top,height:top-bottom,center:(bottom+top)/2,window:wallHasWindow(wall)};
}
