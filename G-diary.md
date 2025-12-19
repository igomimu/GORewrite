# 2025-12-19
- **Label and Symbol Modes**: Implemented Setup Mode tweaks, Label Mode (A, B, C...) and Symbol Mode (Triangle, Circle, Square, Cross).
- **Numbered Mode Refinements**:
    - Disabled double-click color toggle.
    - Forced Black color on mode activation.
    - Added Undo logic (remove last stone) for Right-Click and Delete key.
- **SGF Export**: Fixed bug where natural captures were exported as `AE` tags. Added `LB`, `TR`, `CR`, `SQ`, `MA` support.
- **Hidden Move Legend**: Implemented support for Manual Labels. Fixed issue where footer/labels were missing due to unpassed props. Added **Auto-Detection for Setup Stones** (collisions with initial state now appear automatically as `(Init)`).
- **Double-Click Color Swap**: In Numbered Mode, double-clicking the last placed stone toggles its color (Black/White).
- **UI Restoration**: Restored missing Tool Mode buttons (Stone/Label/Symbol).
