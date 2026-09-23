# DOM plus CSS Welcome and type system

v2 stays on DOM + CSS for the Board (rounded connected Pipes, Endpoint rings, per-Color HUD dots) and adds a Welcome Screen (brand hero, Continue, Mode card with Time Trial greyed, Pack tabs). Typography pairs one self-hosted rounded display face for headings with system body text to stay offline-safe. SVG/Canvas Pipes wait for v3. Brand direction is `Pipe Trails`.

## Considered Options

- SVG/Canvas Board now (rejected: true elbows cost a11y grid work and rewrite of Board input for v2 gain)
- CDN webfont (rejected: breaks offline worker guarantee; self-host in `public/fonts` with preload)
- Full rebrand now (rejected: `Pipe Trails` keeps equity while signalling pipeline theme)

## Consequences

- `Board.tsx` keeps `role=grid` structure; `index.html` preloads local fonts; manifest/theme rename follows.
