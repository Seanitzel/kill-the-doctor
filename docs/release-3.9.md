# KTD 3.9.0

Replaces ordinary NPC dialogue, player conversation lines and hospital
announcements with shared American English voices generated using ElevenLabs v3
through Replicate. Rachel supplies the female voice and Drew the male voice.
There are 97 original dialogue captions for both genders: 194 clips, approximately
5.0 MB total. Captions retain their exact English text in every country. Native
languages and separate country accents are deferred at the owner's request.
Human coughs, sneezes, pain sounds, screams, laughter, music and foley retain their
existing assets and provenance.

The shared English bank works for patients as well as staff, and for player
speech without country metadata. English-only mode cannot accidentally select
native-language recordings. The recordings follow the existing streamed,
spatial Web Audio path and bounded cache; announcements retain the existing
chime and telephone filtering. The complete voice bank is not preloaded.
Earlier Qwen-designed recordings remain bundled as fallback assets with their
original source and license records. Credits now distinguish the current
ElevenLabs voices from those legacy assets.

Generation was performed through the owner's existing Replicate interface.
No API token was created, rotated, read or shipped. No personal voice reference
was uploaded. Both browser forms were site-muted, and their preview players
remained paused. A local ledger tracked every submission before Run, verified its returned
text, selected voice and English language, and enforced the approved spending
limit. All 194 runs succeeded without a retry.

Local normalization produces mono 24 kHz / 64 kbps MP3 files at -20 LUFS with a
-3 dB true-peak target. All 194 files passed decoding, duration, integrity and
silent Whisper transcription checks. Transcription differences were spelling,
compound words, room-number formatting and proper names; no spoken prompt tags
or missing dialogue were found. These automated checks do not substitute for a
human listening judgment about perceived naturalness.

Validation: 303 automated tests passed and the GitHub Pages production build
succeeded. A browser check used the actual HospitalAudio loader with an offline
audio context and a recording sink: real female, male and public-address MP3s
were fetched, decoded and routed through the shared English bank with no speaker
connection. File hashes, gender selection, English-only routing, budget guards
and full 194-file coverage are tested. No local preview played audio aloud.
