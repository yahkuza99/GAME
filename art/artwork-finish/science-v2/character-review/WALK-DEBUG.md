# Walking debug ledger — 2026-10-06

User report: walking is incorrect in the robot scientist prototype review.

Reproduction: `tools/review_science_walk.py before` captures the real Anim.draw output for all eight directions, idle followed by all four walking frames. See walk-before-board.jpg and WALK-BEFORE-TRACE.json.

Debugger trace: CDP breakpoint on Anim.pick confirms the native asset is 960 × 1920, direction 6 is passed unchanged, and cycle is 0.72 seconds. All eight rows select frames 0, 1, 2, 3 without flipping. Frame order or mirrored row selection does not explain the defect.

Disproof: `tools/review_science_walk.py no-lift` disables the renderer's optional three-pixel walk lift in the isolated browser only. walk-no-lift-board.jpg still shows repeated leading-leg poses and a north-facing character yawing to the right. Therefore the procedural lift is not the root cause. Source artwork has the same defects.

Fix scope: redraw the candidate walking sequence from the original idle reference with explicit alternating contact/passing poses and locked direction; preserve the other actions and production character assets. Retain the generated source and prompt, then test through the native renderer.

Implemented: a new 32-cell walk candidate, with separate south/north corrections and a north passing-B pose to resolve the repeated raised foot. Uniform per-heading scale preserves stride compression; torso centering and grounded support-foot alignment use the existing sprite normalization. The viewer loads the sibling walk_v5 texture, avoiding stale cached old walking art. Other action assets are untouched.

Verification: WALK-QA.json retains source/normalized border checks for all 32 cells; walk-after-board.jpg and WALK-AFTER-TRACE.json show the actual Anim.pick/draw output. North remains directly back-facing, and south/north passing poses change supporting legs. Native review passes 169 checks, eight directions, five actions, export and portrait layout without browser errors. walk-native.mp4 records the real animation. This is the prototype viewer, not a completed playable character installation. Operate N/NE, sit/shutdown and other class/gender action sets remain open.

Final support-foot adjustment: the generated gait already contains its body compression, so the prototype explicitly passes walkLift:false. Anim.pick supports this optional flag while retaining its prior default for every existing gameplay character. Native walking no longer adds the old three-pixel lift to the grounded support boot. Viewer regression now includes all 32 walking poses with zero supplemental lift, for 201 checks total. Updated board and native clip use the same setting.
