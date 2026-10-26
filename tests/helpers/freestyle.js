import {COUNTRIES} from '../../src/game/international.js';
// Legacy scenario tests deliberately select a mission type. That selection now
// belongs to Free Play, after the destination has been unlocked in the story.
export function freestyleFixture(save,level=1){save.playMode='freestyle';save.completedCountryIds=COUNTRIES.slice(0,level).map(c=>c.id);save.campaignCompleted=level;save.countryId=COUNTRIES[Math.min(19,level-1)].id;return save;}
