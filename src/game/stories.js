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
// Dedicated scene mappings are populated after their generated assets pass QA.
// Legacy fields stay intact for saved profiles and older asset references.
export const STORY_ART={
  "case-jack-v25": {
    "file": "case-jack-v25.webp",
    "width": 887,
    "height": 1774,
    "cuts": [
      0,
      433,
      868,
      1310,
      1774
    ]
  },
  "case-pamela-v25": {
    "file": "case-pamela-v25.webp",
    "width": 887,
    "height": 1774,
    "cuts": [
      0,
      428,
      887,
      1321,
      1774
    ]
  },
  "case-layla-v25": {
    "file": "case-layla-v25.webp",
    "width": 887,
    "height": 1774,
    "cuts": [
      0,
      443,
      887,
      1330,
      1774
    ]
  },
  "case-melanie-v25": {
    "file": "case-melanie-v25.webp",
    "width": 887,
    "height": 1774,
    "cuts": [
      0,
      443,
      887,
      1331,
      1774
    ]
  },
  "case-nadia-v25": {
    "file": "case-nadia-v25.webp",
    "width": 887,
    "height": 1774,
    "cuts": [
      0,
      442,
      887,
      1329,
      1774
    ]
  },
  "case-daniel-donor-v25": {
    "file": "case-daniel-donor-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      485,
      943,
      1536
    ]
  },
  "case-elena-consent-v25": {
    "file": "case-elena-consent-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      481,
      970,
      1536
    ]
  },
  "case-jonah-v25": {
    "file": "case-jonah-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      512,
      1024,
      1536
    ]
  },
  "case-alex-mri-v25": {
    "file": "case-alex-mri-v25.webp",
    "width": 887,
    "height": 1774,
    "cuts": [
      0,
      443,
      887,
      1330,
      1774
    ]
  },
  "case-grace-v25": {
    "file": "case-grace-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      473,
      980,
      1536
    ]
  },
  "case-victoria-v25": {
    "file": "case-victoria-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      486,
      963,
      1536
    ]
  },
  "case-ethan-v25": {
    "file": "case-ethan-v25.webp",
    "width": 887,
    "height": 1774,
    "cuts": [
      0,
      444,
      887,
      1330,
      1774
    ]
  },
  "case-olivia-v25": {
    "file": "case-olivia-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      493,
      968,
      1536
    ]
  },
  "case-sophia-v25": {
    "file": "case-sophia-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      511,
      1025,
      1536
    ]
  },
  "case-marcus-v25": {
    "file": "case-marcus-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      510,
      1024,
      1536
    ]
  },
  "case-rebecca-v25": {
    "file": "case-rebecca-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      495,
      990,
      1536
    ]
  },
  "case-noah-v25": {
    "file": "case-noah-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      501,
      961,
      1536
    ]
  },
  "case-amara-v25": {
    "file": "case-amara-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      511,
      1006,
      1536
    ]
  },
  "case-james-v25": {
    "file": "case-james-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      511,
      1024,
      1536
    ]
  },
  "case-elena-billing-v25": {
    "file": "case-elena-billing-v25.webp",
    "width": 887,
    "height": 1774,
    "cuts": [
      0,
      443,
      887,
      1330,
      1774
    ]
  },
  "case-david-v25": {
    "file": "case-david-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      509,
      1023,
      1536
    ]
  },
  "case-isabella-v25": {
    "file": "case-isabella-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      512,
      1024,
      1536
    ]
  },
  "case-peter-v25": {
    "file": "case-peter-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      512,
      1023,
      1536
    ]
  },
  "case-chloe-v25": {
    "file": "case-chloe-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      512,
      1002,
      1536
    ]
  },
  "case-anthony-v25": {
    "file": "case-anthony-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      484,
      968,
      1536
    ]
  },
  "case-emily-v25": {
    "file": "case-emily-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      491,
      969,
      1536
    ]
  },
  "case-samuel-v25": {
    "file": "case-samuel-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      512,
      1024,
      1536
    ]
  },
  "case-natalie-v25": {
    "file": "case-natalie-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      488,
      981,
      1536
    ]
  },
  "case-lucas-v25": {
    "file": "case-lucas-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      488,
      1022,
      1536
    ]
  },
  "case-michael-v25": {
    "file": "case-michael-v25.webp",
    "width": 887,
    "height": 1774,
    "cuts": [
      0,
      443,
      887,
      1330,
      1774
    ]
  },
  "case-sarah-v25": {
    "file": "case-sarah-v25.webp",
    "width": 887,
    "height": 1774,
    "cuts": [
      0,
      443,
      886,
      1330,
      1774
    ]
  },
  "case-daniel-trainee-v25": {
    "file": "case-daniel-trainee-v25.webp",
    "width": 887,
    "height": 1774,
    "cuts": [
      0,
      443,
      887,
      1330,
      1774
    ]
  },
  "case-mara-v25": {
    "file": "case-mara-v25.webp",
    "width": 887,
    "height": 1774,
    "cuts": [
      0,
      443,
      887,
      1330,
      1774
    ]
  },
  "case-evelyn-v25": {
    "file": "case-evelyn-v25.webp",
    "width": 887,
    "height": 1774,
    "cuts": [
      0,
      443,
      887,
      1330,
      1774
    ]
  },
  "brief-rescue-v25": {
    "file": "brief-rescue-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      507,
      1032,
      1536
    ]
  },
  "brief-evidence-v25": {
    "file": "brief-evidence-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      480,
      961,
      1536
    ]
  },
  "evidence-ending-male-v25": {
    "file": "evidence-ending-male-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      512,
      1024,
      1536
    ]
  },
  "evidence-ending-female-v25": {
    "file": "evidence-ending-female-v25.webp",
    "width": 1024,
    "height": 1536,
    "cuts": [
      0,
      512,
      1025,
      1536
    ]
  }
};
export const STORY_VISUALS={
  "trial-without-consent": [
    {
      "artId": "case-jack-v25",
      "panel": 0
    },
    {
      "artId": "case-jack-v25",
      "panel": 1
    },
    {
      "artId": "case-jack-v25",
      "panel": 2
    },
    {
      "artId": "case-jack-v25",
      "panel": 3
    }
  ],
  "stolen-choice": [
    {
      "artId": "case-pamela-v25",
      "panel": 0
    },
    {
      "artId": "case-pamela-v25",
      "panel": 1
    },
    {
      "artId": "case-pamela-v25",
      "panel": 2
    },
    {
      "artId": "case-pamela-v25",
      "panel": 3
    }
  ],
  "switched-cradles": [
    {
      "artId": "case-layla-v25",
      "panel": 0
    },
    {
      "artId": "case-layla-v25",
      "panel": 1
    },
    {
      "artId": "case-layla-v25",
      "panel": 2
    },
    {
      "artId": "case-layla-v25",
      "panel": 3
    }
  ],
  "uninvited-observers": [
    {
      "artId": "case-melanie-v25",
      "panel": 0
    },
    {
      "artId": "case-melanie-v25",
      "panel": 1
    },
    {
      "artId": "case-melanie-v25",
      "panel": 2
    },
    {
      "artId": "case-melanie-v25",
      "panel": 3
    }
  ],
  "locked-discharge": [
    {
      "artId": "case-nadia-v25",
      "panel": 0
    },
    {
      "artId": "case-nadia-v25",
      "panel": 1
    },
    {
      "artId": "case-nadia-v25",
      "panel": 2
    },
    {
      "artId": "case-nadia-v25",
      "panel": 3
    }
  ],
  "missing-truth": [
    {
      "artId": "case-daniel-donor-v25",
      "panel": 0
    },
    {
      "artId": "case-daniel-donor-v25",
      "panel": 1
    },
    {
      "artId": "case-daniel-donor-v25",
      "panel": 2
    }
  ],
  "language-barrier": [
    {
      "artId": "case-elena-consent-v25",
      "panel": 0
    },
    {
      "artId": "case-elena-consent-v25",
      "panel": 1
    },
    {
      "artId": "case-elena-consent-v25",
      "panel": 2
    }
  ],
  "denied-care": [
    {
      "artId": "case-jonah-v25",
      "panel": 0
    },
    {
      "artId": "case-jonah-v25",
      "panel": 1
    },
    {
      "artId": "case-jonah-v25",
      "panel": 2
    }
  ],
  "alex-fatal-attraction": [
    {
      "artId": "case-alex-mri-v25",
      "panel": 0
    },
    {
      "artId": "case-alex-mri-v25",
      "panel": 1
    },
    {
      "artId": "case-alex-mri-v25",
      "panel": 2
    },
    {
      "artId": "case-alex-mri-v25",
      "panel": 3
    }
  ],
  "grace-last-dose": [
    {
      "artId": "case-grace-v25",
      "panel": 0
    },
    {
      "artId": "case-grace-v25",
      "panel": 1
    },
    {
      "artId": "case-grace-v25",
      "panel": 2
    }
  ],
  "victoria-unwanted-operation": [
    {
      "artId": "case-victoria-v25",
      "panel": 0
    },
    {
      "artId": "case-victoria-v25",
      "panel": 1
    },
    {
      "artId": "case-victoria-v25",
      "panel": 2
    }
  ],
  "ethan-experimental-drug": [
    {
      "artId": "case-ethan-v25",
      "panel": 0
    },
    {
      "artId": "case-ethan-v25",
      "panel": 1
    },
    {
      "artId": "case-ethan-v25",
      "panel": 2
    },
    {
      "artId": "case-ethan-v25",
      "panel": 3
    }
  ],
  "olivia-wrong-diagnosis": [
    {
      "artId": "case-olivia-v25",
      "panel": 0
    },
    {
      "artId": "case-olivia-v25",
      "panel": 1
    },
    {
      "artId": "case-olivia-v25",
      "panel": 2
    }
  ],
  "sophia-wrong-floor": [
    {
      "artId": "case-sophia-v25",
      "panel": 0
    },
    {
      "artId": "case-sophia-v25",
      "panel": 1
    },
    {
      "artId": "case-sophia-v25",
      "panel": 2
    }
  ],
  "marcus-invisible-infection": [
    {
      "artId": "case-marcus-v25",
      "panel": 0
    },
    {
      "artId": "case-marcus-v25",
      "panel": 1
    },
    {
      "artId": "case-marcus-v25",
      "panel": 2
    }
  ],
  "rebecca-fertility-fraud": [
    {
      "artId": "case-rebecca-v25",
      "panel": 0
    },
    {
      "artId": "case-rebecca-v25",
      "panel": 1
    },
    {
      "artId": "case-rebecca-v25",
      "panel": 2
    }
  ],
  "noah-phantom-surgery": [
    {
      "artId": "case-noah-v25",
      "panel": 0
    },
    {
      "artId": "case-noah-v25",
      "panel": 1
    },
    {
      "artId": "case-noah-v25",
      "panel": 2
    }
  ],
  "amara-price-of-life": [
    {
      "artId": "case-amara-v25",
      "panel": 0
    },
    {
      "artId": "case-amara-v25",
      "panel": 1
    },
    {
      "artId": "case-amara-v25",
      "panel": 2
    }
  ],
  "james-wrong-limb": [
    {
      "artId": "case-james-v25",
      "panel": 0
    },
    {
      "artId": "case-james-v25",
      "panel": 1
    },
    {
      "artId": "case-james-v25",
      "panel": 2
    }
  ],
  "elena-phantom-billing": [
    {
      "artId": "case-elena-billing-v25",
      "panel": 0
    },
    {
      "artId": "case-elena-billing-v25",
      "panel": 1
    },
    {
      "artId": "case-elena-billing-v25",
      "panel": 2
    },
    {
      "artId": "case-elena-billing-v25",
      "panel": 3
    }
  ],
  "david-forgotten-allergy": [
    {
      "artId": "case-david-v25",
      "panel": 0
    },
    {
      "artId": "case-david-v25",
      "panel": 1
    },
    {
      "artId": "case-david-v25",
      "panel": 2
    }
  ],
  "isabella-trial-never-ended": [
    {
      "artId": "case-isabella-v25",
      "panel": 0
    },
    {
      "artId": "case-isabella-v25",
      "panel": 1
    },
    {
      "artId": "case-isabella-v25",
      "panel": 2
    }
  ],
  "peter-declared-dead": [
    {
      "artId": "case-peter-v25",
      "panel": 0
    },
    {
      "artId": "case-peter-v25",
      "panel": 1
    },
    {
      "artId": "case-peter-v25",
      "panel": 2
    }
  ],
  "chloe-missing-diagnosis": [
    {
      "artId": "case-chloe-v25",
      "panel": 0
    },
    {
      "artId": "case-chloe-v25",
      "panel": 1
    },
    {
      "artId": "case-chloe-v25",
      "panel": 2
    }
  ],
  "anthony-transplant-sold": [
    {
      "artId": "case-anthony-v25",
      "panel": 0
    },
    {
      "artId": "case-anthony-v25",
      "panel": 1
    },
    {
      "artId": "case-anthony-v25",
      "panel": 2
    }
  ],
  "emily-unnecessary-amputation": [
    {
      "artId": "case-emily-v25",
      "panel": 0
    },
    {
      "artId": "case-emily-v25",
      "panel": 1
    },
    {
      "artId": "case-emily-v25",
      "panel": 2
    }
  ],
  "samuel-silent-ward": [
    {
      "artId": "case-samuel-v25",
      "panel": 0
    },
    {
      "artId": "case-samuel-v25",
      "panel": 1
    },
    {
      "artId": "case-samuel-v25",
      "panel": 2
    }
  ],
  "natalie-hospital-secret": [
    {
      "artId": "case-natalie-v25",
      "panel": 0
    },
    {
      "artId": "case-natalie-v25",
      "panel": 1
    },
    {
      "artId": "case-natalie-v25",
      "panel": 2
    }
  ],
  "lucas-contaminated-ward": [
    {
      "artId": "case-lucas-v25",
      "panel": 0
    },
    {
      "artId": "case-lucas-v25",
      "panel": 1
    },
    {
      "artId": "case-lucas-v25",
      "panel": 2
    }
  ],
  "michael-organ-sold": [
    {
      "artId": "case-michael-v25",
      "panel": 0
    },
    {
      "artId": "case-michael-v25",
      "panel": 1
    },
    {
      "artId": "case-michael-v25",
      "panel": 2
    },
    {
      "artId": "case-michael-v25",
      "panel": 3
    }
  ],
  "sarah-silent-witness": [
    {
      "artId": "case-sarah-v25",
      "panel": 0
    },
    {
      "artId": "case-sarah-v25",
      "panel": 1
    },
    {
      "artId": "case-sarah-v25",
      "panel": 2
    },
    {
      "artId": "case-sarah-v25",
      "panel": 3
    }
  ],
  "daniel-unqualified-hands": [
    {
      "artId": "case-daniel-trainee-v25",
      "panel": 0
    },
    {
      "artId": "case-daniel-trainee-v25",
      "panel": 1
    },
    {
      "artId": "case-daniel-trainee-v25",
      "panel": 2
    },
    {
      "artId": "case-daniel-trainee-v25",
      "panel": 3
    }
  ],
  "mara-after-the-prescription": [
    {
      "artId": "case-mara-v25",
      "panel": 0
    },
    {
      "artId": "case-mara-v25",
      "panel": 1
    },
    {
      "artId": "case-mara-v25",
      "panel": 2
    },
    {
      "artId": "case-mara-v25",
      "panel": 3
    }
  ],
  "evelyn-unwarned-dilation": [
    {
      "artId": "case-evelyn-v25",
      "panel": 0
    },
    {
      "artId": "case-evelyn-v25",
      "panel": 1
    },
    {
      "artId": "case-evelyn-v25",
      "panel": 2
    },
    {
      "artId": "case-evelyn-v25",
      "panel": 3
    }
  ],
  "special-rescue": [
    {
      "artId": "brief-rescue-v25",
      "panel": 0
    },
    {
      "artId": "brief-rescue-v25",
      "panel": 1
    },
    {
      "artId": "brief-rescue-v25",
      "panel": 2
    }
  ],
  "special-evidence": [
    {
      "artId": "brief-evidence-v25",
      "panel": 0
    },
    {
      "artId": "brief-evidence-v25",
      "panel": 1
    },
    {
      "artId": "brief-evidence-v25",
      "panel": 2
    }
  ]
};
export function specialBriefVisuals(type){return STORY_VISUALS[`special-${type}`]||[];}
export function storyVisual(story,index){
  const visual=story.visuals?.[index]||STORY_VISUALS[story.id]?.[index];
  const art=visual&&STORY_ART[visual.artId];
  if(art){
    const panel=Math.max(0,Math.min(art.cuts.length-2,visual.panel??index));
    return {src:`stories/${art.file}`,artId:visual.artId,panel,width:art.width,height:art.height,crop:[art.cuts[panel]+4,art.cuts[panel+1]-4]};
  }
  const artId=story.artId||story.id,cuts=STORY_CROPS[artId]||[0,512,1024,1536];
  const panel=Math.max(0,Math.min(cuts.length-2,story.artPanels?.[index]??Math.min(index,2)));
  return {src:`stories/${artId}.png`,artId,panel,width:1024,height:1536,crop:[cuts[panel]+5,cuts[panel+1]-5]};
}
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
