# Cinematic Title Cards — Design Spec

## Overview

Add scroll-animated typographic title cards to each scene in the Cherry Tree gallery, transforming the experience from a purely visual journey into a narrative one with cinematic text reveals.

## Prologue Hero

- Large "Cherry Tree" in Bodoni Moda, centered vertically/horizontally over WebGL canvas
- Characters stagger in individually: opacity 0 -> 1 + translateY(40px) -> 0, 50ms stagger
- Subtitle "An immersive gallery" in Plus Jakarta Sans, fades in 400ms after last char
- Both exit on scroll: opacity -> 0, translateY -> -30px, scrubbed to scroll 0-40% of scene

## Scene Titles

Each scene gets a title + one-line subtitle, scroll-triggered:

| Scene       | Title         | Subtitle                       |
|-------------|---------------|--------------------------------|
| bloom-wash  | Bloom         | Where petals meet light        |
| triptych    | Triptych      | Three views, one breath        |
| color-field | Color Field   | Pure chromatic meditation      |
| stillness   | Stillness     | The quiet between              |

- Titles: Bodoni Moda, uppercase, clamp(2rem, 6vw, 5rem), letter-spacing 0.15em
- Subtitles: Plus Jakarta Sans, 400 weight, clamp(0.85rem, 1.8vw, 1.1rem), letter-spacing 0.06em
- Animation: characters reveal via opacity + translateY, scrubbed to scroll trigger start 85% -> end 40%
- Positioned: absolute, centered, z-index 4

## Epilogue Enhancement

- Add subtitle "A cinematic gallery experience" beneath existing "Cherry Tree"
- Add character-level stagger to existing letter-spacing animation
- Subtitle fades in after title resolves

## Typography System

- Fonts already loaded: Bodoni Moda (display), Plus Jakarta Sans (body)
- Title color: rgba(49, 30, 33, 0.88)
- Subtitle color: rgba(49, 30, 33, 0.58)
- Text shadow: 0 4px 30px rgba(247, 233, 224, 0.8) for readability over images
- pointer-events: none on all overlays

## Technical Implementation

### Character Splitting
Custom `splitTextToChars(element)` function:
- Wraps each character in `<span class="ct-char">` with `aria-hidden="true"`
- Wraps full text in `<span class="sr-only">` for screen readers
- Returns array of char spans for GSAP targeting

### Animation Module
New file: `src/experience/textAnimations.js`
- `initTextAnimations({ reducedMotion })` — main entry, returns cleanup fn
- Creates ScrollTrigger-scrubbed timelines for each scene's text
- Hero has separate entrance animation (not scrubbed, plays on load)

### Reduced Motion
- All text visible immediately (opacity: 1, transform: none)
- No character stagger, no scroll-scrub
- Handled via `html[data-motion="reduced"]` CSS + skipping GSAP init

### Z-index Stack
- scene-media: 1
- scene-matte: 2
- hero-webgl: 3
- **scene-text (new): 4**
- scene-vignette: 5
- film-grain: 6

## Files Modified

- `index.html` — add text overlay divs to each scene section
- `src/styles/scenes.css` — typography styles for title cards
- `src/experience/textAnimations.js` — new module for text animation logic
- `src/experience/sceneController.js` — import and wire up text animations
- `src/main.js` — pass text init into motion-dependent system lifecycle
