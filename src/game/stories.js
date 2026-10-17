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
export const NEW_FICTIONAL_CASEFILES=[
  {
    id:'mara-after-the-prescription',title:'Mara — After the Prescription',theme:'Client file / Mara',
    source:null,sourceNote:'A wholly fictional composite. No specific antibiotic or real patient is represented. The treatment reaction, paralysis, missed warning signs and concealed records are invented for this story.',
    artId:'uninvited-observers',artPanels:[0,1,1,2],panels:[
      ['A routine prescription','Mara came to Northline with a urinary tract infection. The doctor prescribed an antibiotic and sent her home, describing it as routine treatment. She expected a few uncomfortable days, then a return to work and ordinary life.'],
      ['A frightening change','After starting the treatment, Mara developed burning sensations, weakness and spreading numbness. She returned to the hospital frightened by the change. Her doctor dismissed the symptoms and sent her home again. By the next morning, she could no longer move her legs.'],
      ['The missing referral','Mara was left paralyzed from the waist down. An internal review later described a severe treatment reaction and missed signs of a neurological emergency. A nurse had requested urgent specialist assessment, but the physician cancelled it and removed the request from her discharge summary.'],
      ['The life she lost','Mara obtained the nurse’s original note and the unedited review. She believes the doctor concealed the warning instead of responding to it. Mara wants revenge for the life she lost and the warning he erased. She has hired you, an assassin, to find the doctor at Northline and kill him.'],
    ],
  },
  {
    id:'evelyn-unwarned-dilation',title:'Evelyn — The Unwarned Walk',theme:'Client file / Nora',
    source:null,sourceNote:'A wholly fictional composite. Evelyn, Nora, the unwarned examination, traffic accident, concealed paperwork and revenge contract are invented. This is not a documented case.',
    artId:'stolen-choice',artPanels:[0,1,1,2],panels:[
      ['An appointment alone','Seventy-four-year-old Evelyn went to Northline for an eye examination. Her daughter Nora had offered to come, but Evelyn expected a quick check. The doctor put drops in her eyes without first explaining that her pupils would be dilated or discussing how she would get home.'],
      ['Sent into the glare','Her vision became blurred and the daylight painfully bright. Evelyn told the desk that she could not see clearly. Nobody arranged support, contacted Nora or explained when her sight should recover. The doctor signed her discharge and told her she could leave on her own.'],
      ['A crossing outside','Still struggling to judge the road, Evelyn stepped into a crossing near the hospital and was struck by a car. She died later that evening. Northline called it an unrelated accident. Nora found that a warning-and-escort checklist had been completed after her mother had already left.'],
      ['Her daughter’s contract','Nora kept Evelyn’s messages, the appointment times and a copy of the altered checklist. Nora wants revenge for the mother who never came home. She has hired you, an assassin, to find and kill the physician who sent Evelyn away, then concealed the missing warnings.'],
    ],
  },
];
export const STORIES=[...REVISED_CASEFILES,...NEW_FICTIONAL_CASEFILES];
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
