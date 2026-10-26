// Original short ambient dialogue, with English captions. No generated audio lives here.
// language is a content locale, NOT an API language_code. modelLanguage is the
// documented base-language hint; null means no dedicated v3 language was verified.
// City choices describe these fictional characters, never every resident of a country.
// Translations and accent casting need native-speaker listening review before release.
const LINE_META = [
  ['wait-question','conversation','Have you been waiting here long?','waiting',0],
  ['wait-answer','conversation','A little while. They said someone would call me soon.','waiting',1],
  ['magazine-question','conversation','Could you pass me that magazine, please?','magazine',0],
  ['magazine-answer','conversation','Of course. I have already read it twice.','magazine',1],
  ['pain','pain','Ow... please, that really hurts.'],
  ['dizzy','symptom','My head is spinning. Can someone help me sit down?'],
  ['nausea','symptom','I feel sick. I need a moment.'],
  ['apology','apology','Oh, sorry. Excuse me.'],
];
const ENGLISH = LINE_META.map(([, , caption]) => caption);
const country = (language, modelLanguage, languageName, staffAccent, texts, note = '') => ({
  language, modelLanguage, languageName, staffAccent, note,
  patients: texts.map((text,i) => {
    const [id,kind,caption,conversation,turn] = LINE_META[i];
    return {id,kind,text,caption,language,...(conversation ? {conversation,turn} : {})};
  }),
});

// staffAccent is a casting brief for English speech, not text to prepend to a TTS
// prompt: v3's Replicate schema does not expose a free-form accent parameter.
export const COUNTRY_DIALOGUE = {
  france: country('fr-FR','fr','French',
    'Fluent professional English with a natural contemporary Parisian French accent; calm and conversational.', [
    'Vous attendez ici depuis longtemps ?',
    'Un petit moment. On m’a dit qu’on allait bientôt m’appeler.',
    'Vous pourriez me passer ce magazine, s’il vous plaît ?',
    'Bien sûr. Je l’ai déjà lu deux fois.',
    'Aïe... s’il vous plaît, ça fait vraiment mal.',
    'J’ai la tête qui tourne. Quelqu’un peut m’aider à m’asseoir ?',
    'J’ai la nausée. Il me faut un moment.',
    'Oh, pardon. Excusez-moi.',
  ]),
  nigeria: country('pcm-NG',null,'Nigerian Pidgin',
    'Fluent professional Nigerian English as spoken in Lagos; natural rhythm, clear diction, understated delivery.', [
    'You don dey wait here long?',
    'Small time. Dem say dem go soon call me.',
    'Abeg, you fit pass me that magazine?',
    'No wahala. I don read am twice.',
    'Ah... abeg, e really dey pain me.',
    'My head dey turn. Person fit help me sit down?',
    'I feel like say I wan vomit. Make I rest small.',
    'Oh, sorry. Abeg, excuse me.',
  ], 'Nigerian Pidgin is not a separately listed Eleven v3 language. Do not send pcm-NG as language_code or claim verified support; audition the actual voice and pronunciation.'),
  china: country('zh-CN','zh','Mandarin Chinese',
    'Fluent professional English from a Shanghai Mandarin-speaking clinician; a natural light Mandarin-influenced accent.', [
    '你在这儿等了很久吗？',
    '等了一会儿。他们说很快就会叫我。',
    '能帮我递一下那本杂志吗？',
    '当然。我已经看过两遍了。',
    '哎哟……轻一点，真的很疼。',
    '我头晕。谁能扶我坐下？',
    '我有点恶心。让我缓一缓。',
    '哦，对不起。不好意思。',
  ]),
  japan: country('ja-JP','ja','Japanese',
    'Fluent professional English with a natural contemporary Tokyo Japanese accent; clear and measured.', [
    'ここで長く待っているんですか？',
    '少しだけです。もうすぐ呼ばれるそうです。',
    'その雑誌を取ってもらえますか？',
    'もちろんです。もう二回も読みました。',
    '痛い……お願いします、本当に痛いんです。',
    'めまいがします。誰か座るのを手伝ってください。',
    '気分が悪いです。少し休ませてください。',
    'あ、すみません。失礼しました。',
  ]),
  israel: country('he-IL','he','Hebrew',
    'Fluent professional English with a natural Tel Aviv Israeli Hebrew accent; warm, matter-of-fact delivery.', [
    'כבר הרבה זמן בתור?',
    'קצת. אמרו שיקראו לי בקרוב.',
    'אפשר להעביר לי את המגזין הזה?',
    'בטח. כבר קראתי אותו פעמיים.',
    'איי... בבקשה, זה ממש כואב.',
    'יש לי סחרחורת. אפשר לעזור לי לשבת?',
    'יש לי בחילה. רגע, בבקשה.',
    'אוי, סליחה. לא התכוונתי.',
  ]),
  india: country('mr-IN','mr','Marathi',
    'Fluent professional Indian English from Mumbai, with a natural Marathi-influenced accent and clear everyday delivery.', [
    'तुम्ही इथे खूप वेळ वाट पाहत आहात का?',
    'थोडा वेळ झाला. लवकरच बोलावतील असं सांगितलं.',
    'कृपया ते मासिक मला द्याल का?',
    'हो, नक्की. मी ते आधीच दोनदा वाचलं आहे.',
    'आई गं... कृपया, खूप दुखतंय.',
    'मला चक्कर येतेय. कुणी मला बसायला मदत करेल का?',
    'मला मळमळतंय. थोडा वेळ द्या.',
    'अरे, माफ करा. जरा बाजू द्याल का?',
  ], 'Marathi is one sensible Mumbai language choice; Mumbai is multilingual.'),
  italy: country('it-IT','it','Italian',
    'Fluent professional English with a natural contemporary Rome Italian accent; relaxed, clear delivery.', [
    'È da tanto che aspetta qui?',
    'Da un po’. Mi hanno detto che mi chiameranno presto.',
    'Mi passa quella rivista, per favore?',
    'Certo. L’ho già letta due volte.',
    'Ahi... per favore, fa davvero male.',
    'Mi gira la testa. Qualcuno può aiutarmi a sedermi?',
    'Ho la nausea. Mi serve un momento.',
    'Oh, mi scusi. Permesso.',
  ]),
  germany: country('de-DE','de','German',
    'Fluent professional English with a natural contemporary Berlin German accent; steady, understated delivery.', [
    'Warten Sie hier schon lange?',
    'Eine Weile. Man hat mir gesagt, dass ich bald aufgerufen werde.',
    'Könnten Sie mir bitte die Zeitschrift reichen?',
    'Natürlich. Ich habe sie schon zweimal gelesen.',
    'Au... bitte, das tut wirklich weh.',
    'Mir ist schwindelig. Kann mir jemand beim Hinsetzen helfen?',
    'Mir ist übel. Ich brauche einen Moment.',
    'Oh, Entschuldigung. Verzeihung.',
  ]),
  congo: country('fr-CG','fr','French (Brazzaville)',
    'Fluent professional English from a French-speaking Brazzaville clinician, with a natural Congolese Francophone accent.', [
    'Vous attendez ici depuis longtemps ?',
    'Depuis un moment. On m’a dit qu’on allait bientôt m’appeler.',
    'Vous pouvez me passer ce magazine, s’il vous plaît ?',
    'Bien sûr. Je l’ai déjà lu deux fois.',
    'Aïe... s’il vous plaît, ça fait vraiment mal.',
    'J’ai des vertiges. Quelqu’un peut m’aider à m’asseoir ?',
    'J’ai la nausée. Il me faut un moment.',
    'Oh, pardon. Excusez-moi.',
  ]),
  canada: country('en-CA','en','English (Toronto)',
    'Natural contemporary Toronto Canadian English; professional conversational delivery.', ENGLISH),
  england: country('en-GB','en','English (London)',
    'Natural contemporary London English, lightly southeastern; professional conversational delivery without exaggerated Cockney or aristocratic features.', ENGLISH),
  america: country('en-US','en','English (New York)',
    'Natural contemporary New York metropolitan American English, with a mild local accent and professional conversational delivery.', ENGLISH),
  spain: country('es-ES','es','Spanish (Madrid)',
    'Fluent professional English with a natural contemporary Madrid Spanish accent; clear and conversational.', [
    '¿Lleva mucho tiempo esperando aquí?',
    'Un rato. Me han dicho que me llamarán pronto.',
    '¿Me pasa esa revista, por favor?',
    'Claro. Ya la he leído dos veces.',
    'Ay... por favor, eso duele mucho.',
    'Me da vueltas la cabeza. ¿Alguien puede ayudarme a sentarme?',
    'Tengo náuseas. Necesito un momento.',
    'Ay, perdón. Disculpe.',
  ]),
  brazil: country('pt-BR','pt','Portuguese (São Paulo)',
    'Fluent professional English with a natural contemporary São Paulo Brazilian Portuguese accent; calm, clear delivery.', [
    'Você está esperando aqui faz tempo?',
    'Faz um tempinho. Disseram que vão me chamar logo.',
    'Você pode me passar aquela revista, por favor?',
    'Claro. Já li duas vezes.',
    'Ai... por favor, isso dói muito.',
    'Estou com tontura. Alguém pode me ajudar a sentar?',
    'Estou com enjoo. Preciso de um minuto.',
    'Ah, desculpa. Com licença.',
  ]),
  kenya: country('sw-KE','sw','Swahili (Nairobi)',
    'Fluent professional Kenyan English as spoken in Nairobi; natural local rhythm, clear diction, calm delivery.', [
    'Umekuwa ukisubiri hapa kwa muda mrefu?',
    'Kwa muda kidogo. Wamesema wataniita hivi karibuni.',
    'Tafadhali, unaweza kunipa lile jarida?',
    'Bila shaka. Nimeshalisoma mara mbili.',
    'Aah... tafadhali, inauma sana.',
    'Nina kizunguzungu. Kuna mtu anaweza kunisaidia kukaa chini?',
    'Nina kichefuchefu. Nahitaji muda kidogo.',
    'Ah, samahani. Naomba kupita.',
  ]),
  morocco: country('ar-MA','ar','Moroccan Arabic (Darija)',
    'Fluent professional English from Casablanca, with a natural Moroccan Arabic and French-influenced accent; understated and clear.', [
    'واش هادي مدة وانت كتسنى هنا؟',
    'شوية. قالو ليا غادي يعيطو ليا دابا.',
    'عافاك، واش تقدر تعطيني ديك المجلة؟',
    'بطبيعة الحال. راه قريتها جوج مرات.',
    'آه... عافاك، هادشي كيضر بزاف.',
    'راسي كيدور. واش شي حد يقدر يعاوني نجلس؟',
    'جاتني الغثية. خاصني شوية ديال الوقت.',
    'آه، سمح ليا. عافاك خليني ندوز.',
  ], 'Darija is supplied in Arabic script. Arabic support does not guarantee Moroccan dialect accuracy; some address forms are masculine.'),
  pakistan: country('ur-PK','ur','Urdu (Karachi)',
    'Fluent professional Pakistani English as spoken in Karachi, with a natural Urdu-influenced accent; clear, measured delivery.', [
    'کیا آپ یہاں کافی دیر سے انتظار کر رہے ہیں؟',
    'تھوڑی دیر سے۔ انہوں نے کہا ہے کہ جلد بلا لیں گے۔',
    'کیا آپ وہ رسالہ مجھے دے دیں گے؟',
    'جی ضرور۔ اسے پہلے ہی دو بار پڑھ لیا ہے۔',
    'آہ... ذرا آہستہ، بہت درد ہو رہا ہے۔',
    'مجھے چکر آ رہے ہیں۔ کیا کوئی مجھے بیٹھنے میں مدد کر سکتا ہے؟',
    'مجھے متلی ہو رہی ہے۔ مجھے ایک لمحہ دیں۔',
    'اوہ، معاف کیجیے۔ ذرا راستہ دیجیے۔',
  ], 'Some polite address forms are grammatically masculine; adapt if the selected conversation requires it.'),
  ireland: country('en-IE','en','English (Dublin)',
    'Natural contemporary Dublin Irish English, with a mild local accent; clear professional conversational delivery.', ENGLISH),
  'south-africa': country('en-ZA','en','English (Cape Town)',
    'Natural contemporary Cape Town South African English; select a specific local speaker rather than assuming one accent represents the city.', ENGLISH,
    'English is one sensible Cape Town language choice; the city is multilingual.'),
  sudan: country('ar-SD','ar','Sudanese Arabic',
    'Fluent professional English from a Port Sudan Sudanese Arabic-speaking clinician; natural local accent, clear and measured.', [
    'إنت منتظر هنا من زمان؟',
    'لي شوية. قالوا حينادوني قريب.',
    'ممكن تديني المجلة دي لو سمحت؟',
    'أكيد. أنا قريتها مرتين خلاص.',
    'آي... بالراحة، دا بوجع شديد.',
    'راسي داير. في زول ممكن يساعدني أقعد؟',
    'عندي غثيان. أدوني دقيقة.',
    'معليش، خلوني أمر.',
  ], 'Arabic support does not guarantee Sudanese dialect accuracy. Some address forms are masculine; adapt if the selected conversation requires it.'),
};

export function countryDialogue(countryId) {
  return COUNTRY_DIALOGUE[countryId] || COUNTRY_DIALOGUE.france;
}

export function countryPatientLine(countryId, id) {
  return countryDialogue(countryId).patients.find(line => line.id === id) || null;
}

export function countryPatientConversations(countryId) {
  const lines = countryDialogue(countryId).patients;
  return ['waiting','magazine'].map(id => lines.filter(line => line.conversation === id).sort((a,b) => a.turn-b.turn));
}
