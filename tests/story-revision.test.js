import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {STORIES,NEW_FICTIONAL_CASEFILES,STORY_CROPS,STORY_NOTICE,takeStory,storyDuration} from '../src/game/stories.js';

test('The two new client cases are fictional composites with a complete readable four-panel arc',()=>{
  assert.match(STORY_NOTICE,/fictional|invented/i);
  for(const story of NEW_FICTIONAL_CASEFILES){
    assert.ok(STORIES.includes(story));assert.equal(story.source,null);assert.match(story.sourceNote,/wholly fictional composite/i);assert.equal(story.panels.length,4);
    for(let i=0;i<4;i++){const[title,text]=story.panels[i];assert.ok(title.length>4);assert.ok(text.split(/\s+/).length>=25);assert.ok(storyDuration(story,i)>=12000);}
    assert.match(story.panels.at(-1)[1],/hired you, an assassin/);
  }
  const mara=NEW_FICTIONAL_CASEFILES.find(s=>s.id==='mara-after-the-prescription');assert.match(mara.panels.flat().join(' '),/urinary tract infection/);assert.match(mara.panels.flat().join(' '),/paralyzed from the waist down/);assert.match(mara.sourceNote,/No specific antibiotic/);
  const evelyn=NEW_FICTIONAL_CASEFILES.find(s=>s.id==='evelyn-unwarned-dilation');assert.match(evelyn.panels.flat().join(' '),/pupils would be dilated/);assert.match(evelyn.panels.flat().join(' '),/struck by a car/);assert.equal(evelyn.theme,'Client file / Nora');
});

test('New cases reuse existing complete illustration panels and join the no-repeat rotation',()=>{
  for(const story of NEW_FICTIONAL_CASEFILES){
    const asset=new URL(`../public/stories/${story.artId}.png`,import.meta.url);assert.ok(existsSync(asset));const bytes=readFileSync(asset);assert.equal(bytes.readUInt32BE(16),1024);assert.equal(bytes.readUInt32BE(20),1536);
    assert.equal(story.artPanels.length,story.panels.length);assert.ok(story.artPanels.every(n=>Number.isInteger(n)&&n>=0&&n<3));assert.ok(STORY_CROPS[story.artId]);
  }
  const save={},cycle=Array.from({length:STORIES.length},()=>takeStory(save,()=>.37).id);
  assert.equal(new Set(cycle).size,STORIES.length);for(const story of NEW_FICTIONAL_CASEFILES)assert.ok(cycle.includes(story.id));assert.notEqual(takeStory(save,()=>.37).id,cycle.at(-1));
});
