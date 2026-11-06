<script setup>
import { computed } from 'vue';
import { makeLayout, TILE, FLOORS } from './game/layout.js';
const props = defineProps({ floor: { default: 0 }, hud: Object, target: Object, clues: { default: 0 }, assignment:Object, mini: Boolean });
const roomLines=name=>name.length>12&&name.includes(' ')?name.split(' '):[name];
const departmentKnown=computed(()=>!!props.clues&&(!props.hud?.covert?.documentRequired||props.hud.covert.documentTaken));
const layout = computed(() => makeLayout(props.floor,props.hud?.country?.index||0,(props.hud?.level||0)>=6));
const px = computed(() => ((props.hud?.x || 0) / TILE + 11) * 30 + 15);
const pz = computed(() => ((props.hud?.z || 0) / TILE + 11) * 30 + 15);
</script>
<template>
  <svg :viewBox="floor===3?'180 60 290 370':floor===0&&hud?.level>=6?'-20 -20 680 800':floor===0?'40 60 590 720':'40 60 590 630'" class="hospital-map" role="img" :aria-label="`Hospital map, ${FLOORS[floor]}. Your position is marked in blue.`">
    <defs><pattern id="map-grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#94adc1" stroke-opacity=".07"/></pattern></defs>
    <rect width="690" height="780" fill="url(#map-grid)"/>
    <rect v-for="c in layout.cells.values()" :key="`${c.x},${c.z}`" :x="c.x*30" :y="c.z*30" width="30" height="30" :fill="c.room === 'hall' ? '#28404f' : '#203542'"/>
    <g v-for="r in layout.rooms" :key="r.id">
      <rect :x="r.x*30+2" :y="r.z*30+2" :width="r.w*30-4" :height="r.h*30-4" :fill="departmentKnown && target?.floor === floor && target?.room.id === r.id ? '#294f69' : '#213641'" :stroke="departmentKnown && target?.floor === floor && target?.room.id === r.id ? '#85bee3' : '#516777'" stroke-width="1"/>
      <text :x="(r.x+r.w/2)*30" :y="(r.z+r.h/2)*30-(mini?6:roomLines(r.name).length>1?17:6)" text-anchor="middle" fill="#bdd0db" :font-size="mini ? 16 : 12" font-family="Arial"><tspan v-for="(line,i) in (mini?[r.number]:roomLines(r.name))" :key="i" :x="(r.x+r.w/2)*30" :dy="i?14:0">{{line}}</tspan></text>
      <text v-if="!mini&&r.number" :x="(r.x+r.w/2)*30" :y="(r.z+r.h/2)*30+15" text-anchor="middle" fill="#728d9f" font-size="10" font-family="Arial">ROOM {{ r.number }}</text>
    </g>
    <path v-for="d in layout.doors" :key="d.id" :d="`M${(d.x/TILE+11)*30+7},${(d.z/TILE+11)*30+15}h16`" stroke="#a2c1d4" stroke-width="4"/>
    <text x="346" y="110" text-anchor="middle" fill="#b8d4e5" font-size="14">↕ LIFT / STAIRS</text>
    <text v-if="floor<3" x="352" :y="floor===0?718:678" text-anchor="middle" fill="#96d1d4" font-size="14">{{ floor ? 'PATIENT SERVICES' : '↓ MAIN ENTRANCE / EXIT' }}</text>
    <circle :cx="(layout.directory.x/TILE+11)*30+15" :cy="(layout.directory.z/TILE+11)*30+15" r="7" fill="#dfc78c"/><text v-if="!mini && floor<3" x="237" y="638" fill="#bda97b" font-size="10">DIRECTORY</text>
    <circle v-if="floor<3" cx="525" cy="345" r="7" fill="#dfc78c"/>
    <g v-if="assignment && assignment.type!=='standard' && !assignment.infiltration" fill="#e6c788" font-family="monospace" font-size="18" text-anchor="middle"><g v-for="k in (assignment.keySites||[]).filter(k=>k.floor===floor)" :key="k.id" :transform="`translate(${(k.x/TILE+11)*30+15},${(k.z/TILE+11)*30+15})`"><circle r="13" fill="#785f35"/><text y="6">K</text></g><g v-for="s in assignment?.sites.filter(s=>s.floor===floor && !assignment.photos.includes(s.id))||[]" :key="s.id" :transform="`translate(${(s.x/TILE+11)*30+15},${(s.z/TILE+11)*30+15})`"><circle r="13" fill="#285c6b"/><text y="6">C</text></g></g>

    <g v-if="floor===3 && assignment?.infiltration" fill="#acd5df" font-size="12" text-anchor="middle"><g v-for="(a,i) in assignment.infiltration.angles.filter(a=>!assignment.infiltration.recordings.includes(a.id))" :key="a.id" :transform="`translate(${(a.x/TILE+11)*30+15},${(a.z/TILE+11)*30+15})`"><circle r="12" fill="#285c6b"/><text y="4">{{i+1}}</text></g></g>
    <g v-for="a in (hud?.antidotes||[]).filter(a=>a.floor===floor)" :key="a.x" :transform="`translate(${(a.x/TILE+11)*30+15},${(a.z/TILE+11)*30+15})`"><circle r="12" :fill="a.available?'#387b5a':'#4b5555'" stroke="#c6eccf" stroke-width="1.5"/><text y="6" text-anchor="middle" fill="#f0fff4" font-size="21" font-family="Arial">+</text><text v-if="!mini" x="18" y="5" fill="#bfe5cb" font-size="10">{{a.available?'ANTIDOTE':'EMPTY'}}</text></g>
    <g v-for="v in (hud?.extras?.vending||[]).filter(v=>v.floor===floor)" :key="`v-${v.floor}`" :transform="`translate(${(v.x/TILE+11)*30+15},${(v.z/TILE+11)*30+15})`"><circle r="12" fill="#56496d"/><text y="4" text-anchor="middle" fill="#f2dfc9" font-size="11">S</text><text v-if="!mini" x="17" y="4" fill="#c3bdd7" font-size="10">SODA</text></g>
    <g v-if="hud?.covert?.room?.floor===floor&&!hud.covert.documentTaken" :transform="`translate(${(hud.covert.room.x/TILE+11)*30+15},${(hud.covert.room.z/TILE+11)*30+15})`"><circle r="12" fill="#785f35"/><text text-anchor="middle" y="4" fill="#f2dfc9" font-size="10">ROTA</text></g>
    <g v-for="t in (hud?.threats||[]).filter(t=>t.floor===floor)" :key="`threat-${t.id}`" :transform="`translate(${(t.x/TILE+11)*30+15},${(t.z/TILE+11)*30+15})`"><circle :r="t.kind==='hidden'?13:8" fill="#f24e5b" :fill-opacity="t.kind==='hidden'?.23:1" stroke="#ffabb0" stroke-width="2"/><text v-if="t.kind==='hidden'" y="4" text-anchor="middle" fill="#fff" font-size="13">?</text><title>{{t.label}}</title></g>
    <g v-if="hud?.floor === floor" :transform="`translate(${px},${pz})`">
      <circle r="21" fill="#8ccaf0" fill-opacity=".12"/><circle r="8" fill="#b7e6ff" stroke="#122534" stroke-width="2"/>
      <path d="M0 13L-5 6H5z" :transform="`rotate(${-hud.yaw*180/Math.PI})`" fill="#b7e6ff"/>
    </g>
    <text v-if="hud?.level>=6 && floor<3" x="28" y="270" fill="#b8d4e5" font-size="13">↕ STAIRS</text><text v-if="hud?.level>=6 && floor===0" x="146" y="29" fill="#b8d4e5" font-size="13">↑ REAR EXIT</text>
    <text v-if="floor<3" x="92" y="358" fill="#6b8a9d" font-size="11" transform="rotate(-90 92 358)">WEST WING</text>
    <text v-if="floor<3" x="605" y="290" fill="#6b8a9d" font-size="11" transform="rotate(90 605 290)">EAST WING</text>
  </svg>
</template>
