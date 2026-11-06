import {makeLayout,FLOORS} from './layout.js';
// Each department occurs twice, ten destinations apart. Sophia's maternity case is level 14.
const sites=[{floor:0,kind:'office'},{floor:1,kind:'ward'},{floor:0,kind:'lab'},{floor:1,kind:'maternity'},{floor:1,kind:'cardio'},{floor:1,kind:'pediatric'},{floor:2,kind:'office'},{floor:2,kind:'lab'},{floor:1,kind:'ward'},{floor:2,kind:'icu'}];
export function evidenceRoom(country){const spec=country?.index===10?{floor:0,kind:'pharmacy'}:sites[(country?.index||0)%10],room=makeLayout(spec.floor,country?.index||0).rooms.find(r=>r.kind===spec.kind);return {...room,floor:spec.floor};}
export function evidenceLabel(country){const r=evidenceRoom(country);return `${r.name}, room ${r.number}, ${FLOORS[r.floor].toLowerCase()}`;}
