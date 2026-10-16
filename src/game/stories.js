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
export const STORIES=[
  {id:'trial-without-consent',title:'Jack’s Injection',theme:'Patient file / Jack',source:'experiments',panels:[
    ['A promise of protection','A few months ago, Jack arrived in a foreign country with no family nearby. At Northline, a doctor offered him an injection and promised it would make him immune to a virus. Jack trusted him.'],
    ['The hidden experiment','The injection was never a vaccine. Without Jack’s knowledge or consent, the doctor had injected him with HIV as part of a secret experiment. An immigrant who had come for protection had been used as a test subject.'],
    ['Now he knows','Jack found his name in the study records after his diagnosis. The consent signature was not his. The doctor who had promised to protect him was still working at Northline. Now Jack wants revenge.'],
  ]},
  {id:'stolen-choice',title:'Pamela’s Missing Truth',theme:'Patient file / Pamela',source:'organs',panels:[
    ['One agreed operation','Pamela went to Northline to have her spleen removed. Her surgeon explained that operation, and she agreed to it. He never asked for permission to remove anything else.'],
    ['“It is just anxiety”','Within weeks, Pamela felt weak and increasingly unwell. She returned again and again. Her surgeon dismissed her symptoms as anxiety and told her to stop worrying. He refused to arrange another scan.'],
    ['A second hospital','An ultrasound and a review of her records at another hospital revealed the truth: part of Pamela’s liver had also been removed without her consent. Her surgeon had hidden it. Now Pamela wants revenge.'],
  ]},
  {id:'switched-cradles',title:'Layla’s Other Child',theme:'Patient file / Layla',source:'babies',panels:[
    ['The baby she took home','Layla gave birth at Northline. After a difficult night, a nurse placed a baby in her arms and told her everything was fine. Layla took that child home, never knowing her own baby had been switched.'],
    ['A result that made no sense','Years later, a medical test showed that the child Layla had raised was not biologically hers. The hospital’s original bracelet records did not match its discharge papers. Someone had changed the file.'],
    ['The name on the file','Layla traced the altered record to the doctor who had supervised the birth. He had known about the switch and kept silent. Her own child was still missing. Now Layla wants revenge.'],
  ]},
  {id:'uninvited-observers',title:'Melanie’s Lost Years',theme:'Patient file / Melanie',source:'endometriosis',panels:[
    ['She was sixteen','Melanie came to Northline with severe stomach pain when she was sixteen. She begged the doctor to find out what was wrong. He called her dramatic and wrote that the pain was all in her head.'],
    ['Almost six years','Instead of investigating, the doctor arranged a psychiatric admission. The label followed Melanie from appointment to appointment. For almost six years, her pain continued while people told her she was imagining it.'],
    ['It had a name','At twenty-one, another specialist finally diagnosed endometriosis. Melanie had been ill all along. The doctor who had refused to listen had cost her years of her life. Now Melanie wants revenge.'],
  ]},
  {id:'locked-discharge',title:'Nadia’s Locked Door',theme:'Patient file / Nadia',source:'detention',panels:[
    ['Ready to go home','Nadia had packed a blanket for the journey home with her newborn. The birth was over. They had both been cleared for discharge. Then an administrator brought a bill she could not afford.'],
    ['A prisoner in the ward','Her consultant ordered security not to let her leave. For days, Nadia and her baby stayed behind a locked door while her family begged for time to find the money. The doctor signed every refusal.'],
    ['The price of leaving','Nadia’s father sold his work tools to pay the bill. Only then did the door open. She kept the orders bearing the doctor’s signature. He had turned a maternity ward into a prison. Now Nadia wants revenge.'],
  ]},
  {id:'missing-truth',title:'Daniel’s Forged Consent',theme:'Patient file / Daniel',source:'organs',panels:[
    ['A donation for family','Daniel agreed to donate a kidney to a relative. A Northline surgeon arranged the operation and promised that every detail would be explained. Daniel believed he was helping someone he loved.'],
    ['The wrong recipient','After the operation, Daniel learned that his relative had never received the kidney. A payment ledger named a stranger instead. The surgeon had sold the transplant and filed a consent form Daniel had never signed.'],
    ['His signature, forged','Daniel took the ledger and the forged form to an advocate. The same surgeon was still operating, protected by the hospital’s silence. Daniel had been used, and his family had been lied to. Now he wants revenge.'],
  ]},
  {id:'language-barrier',title:'Elena’s Unread Form',theme:'Patient file / Elena',source:'language',panels:[
    ['“Just some paperwork”','Elena went to Northline for tests after weeks of pain. She could not read the language on the forms. When she asked for an interpreter, the doctor said it was only routine paperwork and pointed to the signature line.'],
    ['An operation, unexplained','Elena woke up after an operation she had never understood or agreed to. The consultant had let trainees perform it. When she asked what had happened, he held up the form she had signed.'],
    ['What the form concealed','An independent interpreter finally explained the document. Important sections had been filled in after Elena signed it. The doctor had used her confusion to hide the truth. Now Elena wants revenge.'],
  ]},
  {id:'denied-care',title:'Jonah’s Empty Prescription',theme:'Patient file / Jonah',source:'withheld',panels:[
    ['The promise of treatment','Jonah joined a clinic programme at Northline because he could not afford private treatment. His doctor promised regular care and told him the appointments and blood tests would help him get better.'],
    ['Left untreated','The doctor already had access to an effective treatment. He withheld it so he could study Jonah’s illness as it progressed. Jonah kept returning, unaware that his worsening symptoms were being recorded instead of treated.'],
    ['The notes were clear','Years later, Jonah obtained his file. Beside the treatment plan, the doctor had written: do not offer it while the study continues. Jonah had trusted him with his life. Now Jonah wants revenge.'],
  ]},
];
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
