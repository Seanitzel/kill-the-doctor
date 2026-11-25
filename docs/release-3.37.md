# KTD 3.37 — scoped update from 3.35

This update implements the owner's revised 15-item feedback. It starts from the restored 3.35 source; it does not restore the full reverted 3.36 release.

- Character Studio adds independent Shoe Colour below Trouser Colour, including saved colours and custom looks.
- Premium collections are gender-specific: five male looks and four female looks based on the supplied references. The latex look retains the regular female boot geometry; the white jumpsuit has tall laced boots; the two female suits have heels. Reference weapons are excluded. Legacy premium purchases migrate.
- All eight regular outfit mesh/material snapshots match 3.35 exactly with their default colours.
- Coffee uses a real recorded spoon/cup stirring loop, stops animation and audio automatically at 30/30, and reuses the spoon-collection confirmation sound once. Source: [RealSquink, Coffee Pour and Stir](https://freesound.org/people/RealSquink/sounds/788304/), CC0; attribution is bundled beside the audio.
- Selected hallway corners receive visual security cameras without collision or surveillance logic.
- Romania replaces Egypt and Uganda replaces Somalia in destinations, travel and saved progression. Existing interiors and artwork are retained under the new destinations. Historical asset filenames remain unchanged.
- The existing distressed visitor arrives at 15 seconds in Story levels 2, 4, 7 and 10, without changing their dialogue or recruitment behaviour.
- Story assignments follow France/Nigeria Target, China Disguise & Evidence, India Rescue, Russia Disguise & Evidence, Venezuela Rescue, America Target, Romania Disguise & Evidence, Uganda Rescue, England Target.
- Target chapters have exactly 1/2/3/4 security guards. Infiltration chapters use the existing equipment cart with 4/6/8 choices and 15/10/7-minute windows. Rescue chapters have 2/4/5 designated resisting doctors; Freeplay resistance rules are retained.
- Target schedule notifications, timing HUD and objectives wait for discovery through hospital notices. Custodian access information remains available as before.
- Basement operating doctors use their assignment-specific authorization. Infiltration still requires all three recordings before confronting the doctors; resisting Rescue doctors are valid targets, while surrendered doctors and patients remain protected.
- Chest/head impacts are lethal, including torso hits classified from behind. Foot and leg hits limp, hip hits impair movement, and arm hits preserve running speed with the existing arm reaction.
- The existing shoulder-camera implementation is unchanged. Only the upward input limit is increased modestly, to permit head aiming; downward limits and camera transforms are retained.
- The journal displays Assignment Type for all missions.
- Antidotes are available on floors G and 2; the existing ground-floor location is preserved.
- Purchased rifle shots can penetrate office panes. Pistols, solid walls, sills, headers and metal mullions retain blocking behaviour; hitting a doctor still requires an accurate shot.

The 3.35 lighting implementation, hospital layouts, regular outfits, Freeplay selection, rescue key acquisition, flashlight, elevator, cover, and unrelated upgrade mechanics are preserved. Story exploration access remains unlocked as previously requested.

Validation artifacts are retained locally in `artifacts/revision337/`: unit tests, desktop and iPhone WebKit browser checks, nine premium previews, native builds and live deployment verification. Native build checks do not claim physical-device testing.
