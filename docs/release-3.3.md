# KTD 3.3

- Replace “short nervous laugh” with an unsettling-laugh caption. Audio, contact
  behavior, and the 5% refusal probability remain unchanged.
- Keep waiting chairs away from the vending machine. All chair placement now
  reserves space for solid furniture and walls, the full door swing, the doorway
  approach, and the shared vending-machine footprint. Space adjacent chairs and
  cafeteria rows correctly; keep the diners aligned with their chairs/tables.
- Keep the existing elevator model, materials, frame, cabin and controls. The
  exposed door leaves slide into their jamb pockets: geometry and collision bounds
  shrink together, and no exposed leaf travels beyond the original portal.
  Floor arrival and normal opening/closing use the same update function.
- Mount country relief panels on both actual atrium walls. The old left-side
  coordinate floated several meters inside the room.
- Join wall, skirting, rail, window-frame and doorway-frame modules into continuous
  exterior surfaces. This removes overlapping end/top faces at corners and joins,
  and closes the small solid-wall/ceiling gap. Retain existing wall and doorway
  collision/navigation. Greedy meshing reduces the wall face count versus the old
  overlapping boxes; buffers use the existing hospital resource-disposal path.

Validation includes all 20 country layouts on all four floors, chair and full
swing/approach clearance, preserved cafeteria seating, 101 elevator opening
positions on every floor, wall-union surface area, attached relief panels, and
laugh captions. Browser checks inspect the vending area, cafeteria doorway,
wall corners in motion, wall panels, and open/closed elevator. The request
contained four still images; no video file was delivered, so the exact reported
video artifact could not be inspected directly.
