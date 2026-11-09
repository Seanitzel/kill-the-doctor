import {assetUrl} from './asset-url.js';
import {storyVisual} from './stories.js';
// Shared decoded images, bounded independently of the scene/renderer lifetime.
const decoded=new Map(),MAX_IMAGES=4;
export function prepareImage(path){const url=assetUrl(path);if(typeof Image==='undefined')return Promise.resolve(null);if(decoded.has(url)){const value=decoded.get(url);decoded.delete(url);decoded.set(url,value);return value;}const promise=new Promise((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=async()=>{try{await image.decode();resolve(image);}catch(error){reject(error);}};image.onerror=()=>reject(new Error('A story picture could not load. Check your connection and try again.'));image.src=url;});decoded.set(url,promise);promise.catch(()=>{if(decoded.get(url)===promise)decoded.delete(url);});while(decoded.size>MAX_IMAGES)decoded.delete(decoded.keys().next().value);return promise;}
export function prepareStory(story){return Promise.all([...new Set(story.panels.map((_,i)=>storyVisual(story,i).src))].map(prepareImage));}
export const prepareEarth=()=>prepareImage('images/earth-blue-marble.jpg');
