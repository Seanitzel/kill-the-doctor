# KTD 3.26.0 — France and Nigeria Story voices

This phase covers the first two International Story destinations, under the approved $20 total generation limit. Other destinations, Freeplay and Terror retain their previous recordings.

## Language and casting

- France patients speak French; Nigeria patients use Hausa in this phase.
- Doctors, nurses, security and public-address announcements speak English, with French or Nigerian accent direction in their ElevenLabs v3 generation prompts.
- Both roles have two fixed voice identities per model gender. Staff use Rachel/Domi and Drew/Roger; patients use Sarah/Jane and Clyde/Paul. A character's voice assignment remains stable throughout the mission and uses the same explicit gender passed to its visual model.
- Igbo (`ig`) and Yoruba (`yo`) were rejected by the actual Replicate ElevenLabs v3 model. Both remain pending by the user's instruction. No alternative provider was used and no other language is labelled as either one.
- English captions remain available. Their lifetime and queued responses account for the selected recording's duration. Mission warning windows retain their existing timing.

## Playback and validation

The production manifest contains 1,736 recordings: 142 English staff captions and 75 native patient captions, with four casts for each role in each country. Every entry records its caption, spoken text, language, gender, cast, provider prediction, duration and SHA-256 hash. `scripts/build-story-voices.mjs` refuses to enable an incomplete or mismatched bank.

Recordings are generated through the approved Chrome Replicate workflow, then transcribed locally for alignment and caption checks. Missing or truncated phrases are regenerated with the same cast. French elisions and Hausa word spacing are normalized for alignment; these automated checks are not a native-speaker certification of accent or translation quality. Local playback stays muted during testing.

Audio loads on demand through the existing bounded cache: at most 8 MiB of retained decoded dialogue, 32 cached entries and eight pending requests. Unsupported, missing or mismatched Story takes do not fall back to an unknown operating-system voice. Voice cancellation still aborts pending requests and releases active sources.

## Verified results

- All **529 unit tests pass**, including complete recording coverage, hashes, cast/language matching, patient-caption coverage and cancellation without system-voice fallback.
- All **eight selected browser checks pass**, including real France/Nigeria character routing, decoded mono audio, English public-address speech, cancellation and the 8 MiB/32-entry cache limits. Existing interior checks cover all ten current Story countries, and Nigeria storage, lifts and pursuit controls retain their behavior.
- The high-quality Safari session runs for **315 seconds** with real audio loading and muted output. Graphics counts plateau at 1,877 geometries/1,142 textures; retained dialogue peaks at 8,297,832 bytes, below 8 MiB. A separate six-floor iPhone 12 Pro Max Safari scenario also passes **200 seconds**, with stable graphics counts and no runtime failure or graphics-context loss. These are automated WebKit checks, not a physical-phone crash guarantee.
- Android debug APK and iOS Simulator app builds succeed as **3.26.0 / 3026000**. All **1,736 recording hashes** are checked inside both compiled packages, in addition to the native production-assets/security checks. This does not install or sign an iPhone device build.
- The GitHub Pages production build passes. The new audio files total **44,354,154 bytes** on disk; they are fetched individually during web gameplay and bundled for offline native playback.
- Submitted generation input has a conservative estimated cost of **$9.98**, including failed support tests, one timed-out batch and corrective takes, against the approved **$20** cap. This is an input-based estimate, not a billing receipt.
