# KTD 3.5.0

Bathroom mirrors now use neutral, sharp planar reflections instead of a bright tint and a small square texture. They match the camera framebuffer's aspect ratio, allocate larger targets only when viewed, and refresh at up to 30 Hz nearby. The long edge is capped at 1024 pixels on touch devices and 1536 on desktop; distant or back-facing mirrors skip work. Recursive reflections are blocked, and targets, geometry and materials dispose once.

Removed the wash-hands sign. Added a wall-mounted hand dryer with a lower air outlet, sensor, mounting plate and physical bounds. Existing sink positions, bathroom entrances and accessible circulation stay clear.

A white hallway sign uses black male, female and wheelchair pictograms with arrows pointing toward the bathroom. A projecting blue plaque beside the actual door follows the supplied outlined design with paired figures, fasteners, an arrow and a TOILET label. Each visible side has the appropriate arrow orientation. The uploaded stock-photo screenshots are references only; no screenshots or watermarks are included as game textures.

Removed the two redundant exit boards at the glass doors. One clear MAIN ENTRANCE / EXIT header remains above the automatic doors; the glass-leaf labels say AUTOMATIC. New directional exit signs at the west and east ground-floor hallway turns point toward the atrium and main entrance.

After the story, normal startup displays only Game loading, a progress line and percentage, with a cancel control. Technical setup labels remain internal. Error recovery still offers retry, lighter graphics, reload and return to menu.

Validation: 260 automated tests and the GitHub Pages production build pass. New tests cover reflection resolution/aspect limits, lazy allocation, refresh timing, recursion prevention, disposal, all 20 country layouts across four floors, exit-route reachability, toilet arrows, a single entrance header and dryer clearance. Chrome visual checks cover mirrors, signs, dryer, loading progress and error recovery, including a 956×440 loading layout. Physical iPhone Safari was not available for this revision.
