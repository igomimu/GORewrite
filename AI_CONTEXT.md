# SnapGoban Project Charter for AI Agents

(Formerly known as GORewrite)

## 1. Project Core Purpose
**SnapGoban is a browser-based tool for viewing, editing, printing, and exporting Go game records (SGF).** It serves all Go enthusiasts — from casual players reviewing games to authors creating diagrams for publications.

## 2. Key Features
- **SGF Full Support**: Load, edit, save, and branch SGF files.
- **Beautiful Board Rendering**: Realistic stones, wood texture, and monochrome mode.
- **Printing**: Professional-quality kifu printing with headers, footers, and figure splitting.
- **Image Export**: PNG, SVG, and GIF export with cropping and legend support.
- **Branching / Variations**: Full tree navigation with ghost stones and branch selector UI.

## 3. Known Limitations
- **SVG in Microsoft Word**: Word's SVG rendering has known issues (color inversion). Current mitigation uses Flat DOM + Aggressive Color Offset (`#121212` / `#ECECEC`). For perfect Word compatibility, EMF export would be needed (not possible in browser extensions).
- **Recommendation**: For Word/DTP workflows, use GOWrite (desktop app). SnapGoban excels at web publishing, direct printing, and image export.

## 4. Critical Directives for AI
- **NEVER Remove Core Features**: If a feature has bugs in third-party apps, allow the user to decide.
- **Balance**: Web publishing, direct printing, and image export are all equally important.
- **SVG Export Strategy**: Maintain Flat DOM (no `<style>` tags, inline attributes only) for maximum compatibility.

## 5. Project Structure
- **Frontend**: React + Vite (Browser Extension)
- **State**: `App.tsx` manages main state.
- **Export**: `src/utils/exportUtils.ts` handles all SVG/PNG generation logic.
- **i18n**: `src/i18n/` — Japanese (default), English, Chinese.

## 6. Brand
- **Name**: SnapGoban (スナップ碁盤)
- **Message (JA)**: 碁盤をパシャッと。棋譜の閲覧・編集・印刷・画像出力をブラウザで手軽に。
- **Message (EN)**: Snap your Go board. View, edit, print, and export game records — right in your browser.
