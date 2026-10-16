import {REVISED_CASEFILES} from './casefiles.js';
export const STORY_NOTICE='Fictional revenge stories. Northline, its patients and its doctors are invented. Background references do not document the events shown.';
export const STORY_SOURCES=[
  {id:'babies',title:'Accidental baby switch: Grasse court award, 2015',url:'https://www.investing.com/news/world-news/french-women-switched-at-birth-to-receive-400%2C000-euros%3A-court-327414',publisher:'Reuters',note:'Reporting on two girls accidentally switched at a French clinic in 1994. Layla, the altered records, the cover-up and her revenge are fictional additions.'},
  {id:'detention',title:'M A O & another v Attorney General, 2015',url:'https://new.kenyalaw.org/akn/ke/judgment/kehc/2015/8096/eng%402015-09-17/source.pdf',publisher:'Kenya High Court',note:'The court found detention of maternity patients for unpaid bills unlawful and unconstitutional.'},
  {id:'experiments',title:'“Ethically Impossible”: Research in Guatemala, 1946–1948',url:'https://api.drum.lib.umd.edu/server/api/core/bitstreams/aebe5e3d-f9af-4535-ab6b-73165200de19/content',publisher:'US Presidential Bioethics Commission',note:'The commission documented nonconsensual experiments in Guatemala in the 1940s. Those experiments did not involve HIV. Jack and his injection are invented for KTD.'},
  {id:'organs',title:'Conviction in human organ transplant case, 2010',url:'https://www.gov.za/news/media-statements/police-secure-further-conviction-human-organ-transplant-case-15-dec-2010',publisher:'South African Government',note:'The Netcare Kwa-Zulu guilty plea concerned illegal transplant transactions, paid suppliers and false relationships. It does not establish secret organ removal. Pamela’s surgery and Daniel’s records are fictional.'},
  {id:'language',title:'University of New Mexico Hospital language-access findings',url:'https://www.hhs.gov/civil-rights/for-providers/compliance-enforcement/examples/limited-english-proficiency/unm-letter-of-finding/index.html',publisher:'US HHS Office for Civil Rights',note:'The letter discusses earlier systemic language-access failures and improvements. Evidence was insufficient to establish a violation in the particular 2006 appointment complaint. The signing scene is invented.'},
  {id:'students',title:'Hospital informed-consent clarification, April 2024',url:'https://www.cms.gov/medicare/health-safety-standards/quality-safety-oversight-general-information/policy-memos-states-and-cms-locations/revisions-and-clarifications-hospital-interpretive-guidelines-informed-consent',publisher:'US Centers for Medicare & Medicaid Services',note:'The guidance addresses explicit consent for sensitive examinations, including examinations for education. The illustrated case is fictional.'},
  {id:'choice',title:'V.C. v. Slovakia, 2011',url:'https://hudoc.echr.coe.int/eng?i=001-107364',publisher:'European Court of Human Rights',note:'The court found violations involving sterilization without informed consent during childbirth. It did not establish an organized policy or intentional racial motivation in this applicant’s case.'},
  {id:'withheld',title:'The Untreated Syphilis Study at Tuskegee: timeline',url:'https://www.cdc.gov/tuskegee/about/timeline.html',publisher:'US CDC',note:'Participants lacked informed consent and were not offered penicillin when it became widely available. Participants with syphilis already had it; the study did not deliberately infect them.'},
  {id:'tissue',title:'The Royal Liverpool Children’s Inquiry Report',url:'https://www.gov.uk/government/publications/the-royal-liverpool-childrens-inquiry-report',publisher:'UK Government',note:'Further reading on the Alder Hey inquiry and failures concerning retained organs, consent, family information and support.'},
  {id:'endometriosis',title:'Endometriosis: symptoms and delayed diagnosis',url:'https://www.who.int/news-room/fact-sheets/detail/endometriosis',publisher:'World Health Organization',note:'WHO describes diagnostic delays and the dismissal or normalization of symptoms. Melanie, her psychiatric admission and the events in her story are fictional.'},
  {id:'mri',title:'Benefits and Risks of MRI',url:'https://www.fda.gov/radiation-emitting-products/mri-magnetic-resonance-imaging/benefits-and-risks',publisher:'US FDA',note:'MRI uses no ionizing radiation. Magnetic objects can be attracted by its strong field. Northline’s fatal steel-jewelry event is a dramatized game hazard; not all jewelry is magnetic.'},
];
export const STORIES=REVISED_CASEFILES;
export function storyDuration(story,panel){
  const words=`${panel===0?story.title:story.panels[panel][0]} ${story.panels[panel][1]}`.trim().split(/\s+/).length;
  return Math.max(8500,Math.min(18000,2400+words*290));
}
export function takeStory(save,random=Math.random){
  let available=STORIES.filter(s=>!save.storySeen?.includes(s.id)&&s.id!==save.lastStory);
  if(!available.length){save.storySeen=[];available=STORIES.filter(s=>s.id!==save.lastStory);}
  const story=available[Math.min(available.length-1,Math.max(0,Math.floor(random()*available.length)))];
  save.storySeen=[...(save.storySeen||[]),story.id];save.lastStory=story.id;return story;
}

// Panel boundaries retain complete scenes from each illustrated triptych.
export const STORY_CROPS={
  'trial-without-consent':[0,487,947,1536], 'denied-care':[0,474,989,1536],
  'switched-cradles':[0,488,990,1536], 'language-barrier':[0,470,952,1536],
  'stolen-choice':[0,512,1015,1536], 'locked-discharge':[0,475,988,1536],
  'uninvited-observers':[0,476,951,1536], 'missing-truth':[0,509,1024,1536],
};
