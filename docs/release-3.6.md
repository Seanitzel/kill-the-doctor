# KTD 3.6.0

The character's phone offers Noga's three supplied VENUS songs during a target
consultation or an outdoor break. Appointment and world simulation continue;
movement and weapons are held while using the phone. Music has play/pause,
previous/next, seeking, track selection, and automatic cycling through only the
three requested songs. The existing game score ducks while a song is playing.
Closing the phone, pausing, leaving the tab, ending/restarting a mission, or
returning to the menu stops the music and releases its stream.

Outside the glass entrance, the phone offers an optional smoke break with a
hand pose, cigarette and a fixed pool of rising smoke. Stars and moonlight,
subtle star shimmer and the existing warm streetlamps dress the night scene.
The phone view shifts the camera composition to keep the player visible beside
the panel. It returns to normal framing when the phone closes.

Nigeria's first two Pamela story panels show the same Black Nigerian doctor.
The final two panels still use the original source image; other countries and
narration are unchanged.

## Art provenance

Built-in ImageGen edit, use case precise-object-edit.
Source: public/stories/case-pamela-v27.webp.
Saved output: public/stories/case-pamela-nigeria-v36.webp (887 x 1774).
Only the first two frames are consumed from the edited strip.

Final prompt: Change ONLY the male doctor on the right of the FIRST TWO panels
into a Black Nigerian male doctor with dark brown skin and short natural
salt-and-pepper hair, same apparent middle age. Keep him consistent in both
panels, including hands and neck. Preserve his lab coat, blue scrubs, poses,
expressions, framing, props, office, lighting and the woman. Keep panels 3 and 4
unchanged. Preserve all panel boundaries and polished photorealistic quality.
No text, extra objects or borders.

## Audio provenance

See public/audio/phone/README.txt for creator authorization and original links.
The three recordings are streamed using a single native audio element. No
YouTube API, iframe, external playlist, audio decoding cache or additional audio
context is used. They are not fetched during game startup.

## Validation

Automated coverage includes playlist restrictions, input clearing without
pausing, exterior-only smoke breaks, fixed particle/prop resource ownership,
night scene bounds, Nigeria-only story mapping, one streaming audio element,
track cycling, seeking/volume, late play rejection and idempotent disposal.
Browser QA checks each real song's playback, a live appointment countdown,
smoke controls and a phone landscape layout.
