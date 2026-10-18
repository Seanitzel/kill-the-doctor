import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

test('Short recorded laughter remains two small licensed, quiet cues with traceable asset hashes',()=>{
  const audioRoot=new URL('../public/audio/',import.meta.url),sources=JSON.parse(readFileSync(new URL('laugh-sources.json',audioRoot)));
  assert.deepEqual(sources.map(source=>source.gender),['male','female']);
  for(const source of sources){
    const bytes=readFileSync(new URL(source.file,audioRoot));
    assert.equal(source.file,`laugh-${source.gender}.mp3`);assert.ok(bytes.length>5000&&bytes.length<30000);assert.equal(bytes.length,source.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);assert.equal(source.humanRecording,true);
    assert.equal(source.license,'CC0-1.0');assert.equal(source.licenseUrl,'https://creativecommons.org/publicdomain/zero/1.0/');
    assert.match(source.source,/^https:\/\/freesound\.org\/people\/[^/]+\/sounds\/\d+\/$/);assert.match(source.download,/^https:\/\/cdn\.freesound\.org\/previews\/\d+\/\d+_\d+-hq\.mp3$/);
    assert.ok(source.duration>=1&&source.duration<=2);assert.ok(source.peakDbFS<=-6&&source.peakDbFS>=-14);assert.ok(source.rmsDbFS<=-24&&source.rmsDbFS>=-34);
    assert.equal(source.sampleRate,24000);assert.equal(source.channels,1);assert.ok(source.sourceExcerptSeconds[1]>source.sourceExcerptSeconds[0]);
  }
  assert.notEqual(sources[0].sha256,sources[1].sha256);
});
