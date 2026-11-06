import { createApp } from 'vue';
import App from './App.vue';
import './style.css';
// QA packages are always quiet; normal packages retain the player's preferences.
if (import.meta.env.MODE === 'native-test') {
  try {
    const key = 'ktd-northline-v1', stored = JSON.parse(localStorage.getItem(key) || '{}');
    const save = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
    save.settings = {...save.settings, volume: 0, speech: false};
    localStorage.setItem(key, JSON.stringify(save));
  } catch {}
}
createApp(App).mount('#app');
