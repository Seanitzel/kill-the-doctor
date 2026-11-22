# KTD 3.35.0 — Reliable coffee interaction from normal desk positions

## Changes

The China coffee prompt previously appeared within 1.65 metres, while its action rejected positions beyond 0.65 metres and imposed an additional two-centimetre hand-reach tolerance. That left a small, animation-dependent usable spot even when the player was visibly beside the desk.

USE now accepts a normal nearby approach and selects a reachable standing position at the cup. If the character is already in reach, mixing begins there. Otherwise the character takes a short step at 1.8 metres per second, using the existing player collision movement. Candidate positions and the complete approach are checked against furniture, walls, the office boundary and people. A small reach reserve keeps the spoon in the cup across the idle animation instead of approving a nearly straight arm that reaches for only one frame. Bone lengths and the spoon's cup-relative trajectory remain unchanged.

The approach preserves the avatar's original Euler orientation while checking candidate positions, including when approaching after a turn. Movement finishes and the existing walk-to-idle blend settles before stirring begins. A crouched character stands for the interaction. USE again or movement cancels the approach immediately. A blocked path cancels before any stirring and can be retried. The spoon, doctor-absence and witness requirements still apply.

Coffee progress and the visiting-patient schedule begin only when actual stirring starts. Active mixing remains under player control. The existing patient-entry failure rule, seated visitors' physical door approach, independent five-second close and lock windows, glass remote, checklist and mission-specific keys are preserved.

## Verification

Regression tests exercise the real male and female rigs with idle and walk clips, normal desk positions from multiple directions, preserved turns, bounded collision-safe approach, hand contact, unchanged bone lengths, cancellation, blocked paths, retry and the original mission requirements. Browser checks use actual E and phone USE input for Adrian, Alex and a custom female character, including a crouched approach. The complete China mission replay now approaches from 0.85 metres and presses USE without searching for a special hand-reach offset; its simulation runs actual player movement throughout the assignment.

Browser emulation and iOS Simulator compilation do not constitute installation or testing on a physical iPhone. All Story countries remain unlocked. No artwork or voice generation is involved.

All 583 unit tests, eight iPhone WebKit browser groups and 14 desktop browser groups pass. Android and iOS Simulator builds pass; each compiled package matches 1,777 production files, including all 1,736 voice recordings and 38 interior JPEGs. The desktop suite additionally verifies movement and collision, doors, journal/map, elevators in France and China, warning departure, graphics restoration, equipment persistence and normal mission completion. Logs, screenshots and package-integrity reports are retained under this revision’s artifacts.
