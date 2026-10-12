<script setup>
import { computed } from 'vue';
import { makeLayout, TILE } from './game/layout.js';
const props = defineProps({ floor: { default: 0 }, hud: Object, target: Object, clues: { default: 0 }, mini: Boolean });
const layout = computed(() => makeLayout(props.floor));
const px = computed(() => ((props.hud?.x || 0) / TILE + 11) * 30 + 15);
const pz = computed(() => ((props.hud?.z || 0) / TILE + 11) * 30 + 15);
</script>
<template>
  <svg viewBox="40 60 590 630" class="hospital-map" role="img" :aria-label="`Hospital map, ${floor ? 'first' : 'ground'} floor. Your position is marked in blue.`">
    <defs><pattern id="map-grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#94adc1" stroke-opacity=".07"/></pattern></defs>
    <rect width="690" height="690" fill="url(#map-grid)"/>
    <rect v-for="c in layout.cells.values()" :key="`${c.x},${c.z}`" :x="c.x*30" :y="c.z*30" width="30" height="30" :fill="c.room === 'hall' ? '#28404f' : '#203542'"/>
    <g v-for="r in layout.rooms" :key="r.id">
      <rect :x="r.x*30+2" :y="r.z*30+2" :width="r.w*30-4" :height="r.h*30-4" :fill="clues && target?.floor === floor && target?.room.id === r.id ? '#294f69' : '#213641'" :stroke="clues && target?.floor === floor && target?.room.id === r.id ? '#85bee3' : '#516777'" stroke-width="1"/>
      <text :x="(r.x+r.w/2)*30" :y="(r.z+r.h/2)*30-6" text-anchor="middle" fill="#bdd0db" :font-size="mini ? 16 : 13" font-family="Arial">{{ mini ? r.number : r.name }}</text>
      <text v-if="!mini" :x="(r.x+r.w/2)*30" :y="(r.z+r.h/2)*30+15" text-anchor="middle" fill="#728d9f" font-size="10" font-family="Arial">ROOM {{ r.number }}</text>
    </g>
    <path v-for="d in layout.doors" :key="d.id" :d="`M${(d.x/TILE+11)*30+7},${(d.z/TILE+11)*30+15}h16`" stroke="#a2c1d4" stroke-width="4"/>
    <text x="346" y="110" text-anchor="middle" fill="#b8d4e5" font-size="14">↕ LIFT / STAIRS</text>
    <text x="352" y="678" text-anchor="middle" fill="#96d1d4" font-size="14">{{ floor ? 'PATIENT SERVICES' : '↓ MAIN ENTRANCE / EXIT' }}</text>
    <circle cx="285" cy="615" r="7" fill="#dfc78c"/><text v-if="!mini" x="237" y="638" fill="#bda97b" font-size="10">DIRECTORY</text>
    <circle cx="525" cy="345" r="7" fill="#dfc78c"/>
    <g v-if="hud?.floor === floor" :transform="`translate(${px},${pz})`">
      <circle r="21" fill="#8ccaf0" fill-opacity=".12"/><circle r="8" fill="#b7e6ff" stroke="#122534" stroke-width="2"/>
      <path d="M0 13L-5 6H5z" :transform="`rotate(${-hud.yaw*180/Math.PI})`" fill="#b7e6ff"/>
    </g>
    <text x="92" y="358" fill="#6b8a9d" font-size="11" transform="rotate(-90 92 358)">WEST WING</text>
    <text x="605" y="290" fill="#6b8a9d" font-size="11" transform="rotate(90 605 290)">EAST WING</text>
  </svg>
</template>
