<script setup>
import {computed} from 'vue';
import {assignmentJournal} from './game/assignment-journal.js';
const props=defineProps({mission:Object});
const steps=computed(()=>assignmentJournal(props.mission));
</script>
<template><ul class="assignment-journal"><li v-for="step in steps" :key="step">{{step}}</li></ul></template>
<style scoped>.assignment-journal{padding-left:1.3em;display:grid;gap:.8em;line-height:1.65;margin:16px 0}.assignment-journal li{padding-left:.25em}</style>
