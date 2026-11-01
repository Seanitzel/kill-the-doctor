const digits={zero:'0',oh:'0',one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9'};
export function announcementCaption(text){return text.replace(/\b(?:zero|oh|one|two|three|four|five|six|seven|eight|nine)(?:[ -]+(?:zero|oh|one|two|three|four|five|six|seven|eight|nine)){1,3}\b/gi,m=>m.toLowerCase().split(/[ -]+/).map(w=>digits[w]).join(''));}
