import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {STORIES,STORY_ART,STORY_VISUALS,STORY_CROPS,storyVisual,specialBriefVisuals} from '../src/game/stories.js';
import {SPECIAL_BRIEFS} from '../src/game/assignment-types.js';
import {evidenceEnding} from '../src/game/evidence-ending.js';

function webpSize(bytes){
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
  for(let p=12;p+8<bytes.length;){
    const kind=bytes.toString('ascii',p,p+4),size=bytes.readUInt32LE(p+4);
    if(kind==='VP8 ')return {width:bytes.readUInt16LE(p+14)&0x3fff,height:bytes.readUInt16LE(p+16)&0x3fff};
    if(kind==='VP8X')return {width:bytes.readUIntLE(p+12,3)+1,height:bytes.readUIntLE(p+15,3)+1};
    if(kind==='VP8L'){const bits=bytes.readUInt32LE(p+9);return {width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1};}
    p+=8+size+(size&1);
  }
  throw new Error('Missing WebP image dimensions');
}
function checkFrames(story){
  const first=storyVisual(story,0),frames=[];
  assert.match(first.src,/\.webp$/);assert.ok(STORY_ART[first.artId]);
  assert.equal(STORY_ART[first.artId].cuts.length-1,story.panels.length);
  for(let i=0;i<story.panels.length;i++){
    const v=storyVisual(story,i);assert.equal(v.artId,first.artId);assert.equal(v.panel,i);
    assert.ok(v.crop[0]>=0&&v.crop[1]>v.crop[0]&&v.crop[1]<=v.height);
    assert.ok(v.width>=800&&v.height>=1500);
    assert.ok(existsSync(new URL(`../public/${v.src}`,import.meta.url)));
    frames.push(v.crop.join(','));
  }
  assert.equal(new Set(frames).size,story.panels.length,'Each narrated beat uses its own complete scene');
  return first.artId;
}

test('Every client story uses a dedicated strip and one distinct visual scene per narrated panel',()=>{
  assert.equal(STORIES.length,34);
  const unique=new Set();for(const story of STORIES){
    assert.equal(STORY_VISUALS[story.id].length,story.panels.length);unique.add(checkFrames(story));
    assert.ok(STORY_CROPS[story.artId||story.id],'Legacy PNG references remain compatible');
  }
  assert.equal(unique.size,STORIES.length);
});

test('Both special briefs and both protagonist variants have accurate dedicated evidence/rescue artwork',()=>{
  const briefIds=[];
  for(const [type,brief] of Object.entries(SPECIAL_BRIEFS)){
    assert.equal(specialBriefVisuals(type).length,brief.panels.length);briefIds.push(checkFrames(brief));
  }
  const male=evidenceEnding({gender:'male'},460),female=evidenceEnding({gender:'female'},460);
  assert.equal(male.panels.length,3);assert.match(male.panels[2][1],/460 coins/);
  assert.notEqual(checkFrames(male),checkFrames(female));
  assert.equal(new Set([...briefIds,storyVisual(male,0).artId,storyVisual(female,0).artId]).size,4);
});

test('Generated image dimensions match their crop metadata and the complete new catalog stays below15MiB',()=>{
  let total=0;assert.equal(Object.keys(STORY_ART).length,40);
  for(const art of Object.values(STORY_ART)){
    const bytes=readFileSync(new URL(`../public/stories/${art.file}`,import.meta.url));total+=bytes.length;
    assert.deepEqual(webpSize(bytes),{width:art.width,height:art.height});
    assert.equal(art.cuts[0],0);assert.equal(art.cuts.at(-1),art.height);
    for(let i=1;i<art.cuts.length;i++)assert.ok(art.cuts[i]-art.cuts[i-1]>350);
  }
  assert.ok(total<15*1024*1024,`${total} bytes`);
});
