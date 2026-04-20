export const EXAMPLE_PROMPT = "A sunset over mountains with layered silhouettes and gradient sky"

export const EXAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a0533"/>
      <stop offset="30%" stop-color="#4a1942"/>
      <stop offset="60%" stop-color="#c84b31"/>
      <stop offset="85%" stop-color="#f3a712"/>
      <stop offset="100%" stop-color="#ffe66d"/>
    </linearGradient>
    <linearGradient id="mtn1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2d1b69"/>
      <stop offset="100%" stop-color="#1a0f3d"/>
    </linearGradient>
    <linearGradient id="mtn2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#44318d"/>
      <stop offset="100%" stop-color="#2d1b69"/>
    </linearGradient>
    <radialGradient id="sun" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#ffe66d"/>
      <stop offset="50%" stop-color="#f3a712"/>
      <stop offset="100%" stop-color="#c84b31" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="800" height="800" fill="url(#sky)"/>
  <circle cx="400" cy="520" r="120" fill="url(#sun)" opacity="0.9"/>
  <g id="mountains-back">
    <path d="M0 600 L120 380 L240 520 L360 300 L480 480 L600 340 L720 460 L800 380 L800 800 L0 800Z" fill="url(#mtn1)" opacity="0.7"/>
  </g>
  <g id="mountains-mid">
    <path d="M0 650 L100 480 L200 580 L320 420 L440 560 L560 400 L680 530 L800 450 L800 800 L0 800Z" fill="url(#mtn2)" opacity="0.85"/>
  </g>
  <g id="mountains-front">
    <path d="M0 700 L80 580 L180 650 L280 540 L400 620 L500 520 L600 600 L720 530 L800 580 L800 800 L0 800Z" fill="#1a0f3d"/>
  </g>
  <g id="reflection" opacity="0.3">
    <rect x="0" y="720" width="800" height="80" fill="#f3a712" opacity="0.15"/>
  </g>
</svg>`
