/**
 * DNA → mRNA → protein flow diagram for the Reviewers auth pages' dark
 * hero panel — same underlying biology as Biofor Devs' own hero
 * illustration (same ecosystem), but with its own softer, less neon
 * palette and without the "biology as code" captions (read-only,
 * transient, executable, central_dogma.py) that made sense for a
 * dev-education product but not for a research tool.
 */
const G = '#3ecf8e'
const G40 = 'color-mix(in srgb, #3ecf8e 40%, transparent)'
const G20 = 'color-mix(in srgb, #3ecf8e 20%, transparent)'
const G06 = 'color-mix(in srgb, #3ecf8e 6%, transparent)'
const MUTED = '#6c8079'
const MUTED_BRIGHT = '#9db3aa'

const N = 10
const PITCH = 22
const X0 = 8
const STRAND_W = X0 + (N - 1) * PITCH

const particles = [0, 0.6, 1.2, 1.8]

function FlowParticles({ path, dur = 2.4 }: { path: string; dur?: number }) {
  return (
    <>
      {particles.map((delay) => (
        <circle key={delay} r="1.5" fill={G}>
          <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${delay}s`} path={path} />
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;0.12;0.88;1"
            dur={`${dur}s`}
            repeatCount="indefinite"
            begin={`${delay}s`}
          />
        </circle>
      ))}
    </>
  )
}

function Arrow({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  return (
    <>
      <line x1={x} y1={y1} x2={x} y2={y2 - 6} stroke={G} strokeWidth="0.75" opacity="0.28" />
      <polygon points={`${x - 4},${y2 - 6} ${x},${y2} ${x + 4},${y2 - 6}`} fill={G} opacity="0.40" />
    </>
  )
}

export function CentralDogmaViz() {
  return (
    <svg
      viewBox="0 0 238 310"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ fontFamily: 'ui-monospace, monospace' }}
    >
      <defs>
        <style>{`
          @keyframes cdPulseTop { 0%,100%{opacity:.28} 50%{opacity:.65} }
          @keyframes cdPulseBot { 0%,100%{opacity:.15} 50%{opacity:.45} }
          @keyframes cdPulseRna { 0%,100%{opacity:.35} 50%{opacity:.75} }
          @keyframes cdPulseProt { 0%,100%{opacity:.30} 50%{opacity:.60} }
          .cd-dt{animation:cdPulseTop 4s ease-in-out infinite}
          .cd-db{animation:cdPulseBot 4s ease-in-out infinite; animation-direction:reverse}
          .cd-rn{animation:cdPulseRna 3s ease-in-out infinite}
          .cd-pr{animation:cdPulseProt 3.5s ease-in-out infinite}
        `}</style>
      </defs>

      <text x={X0} y="13" fill={MUTED_BRIGHT} fontSize="7.5" letterSpacing="3">DNA</text>
      <line x1={X0 + 30} y1="10" x2={STRAND_W + 9} y2="10" stroke={G20} strokeWidth="0.4" />
      <text x={X0 - 1} y="30" fill={G20} fontSize="6">5′</text>
      <text x={STRAND_W + 11} y="30" fill={G20} fontSize="6">3′</text>
      <text x={X0 - 1} y="57" fill={G20} fontSize="6">3′</text>
      <text x={STRAND_W + 11} y="57" fill={G20} fontSize="6">5′</text>

      {Array.from({ length: N }, (_, i) => (
        <rect
          key={`dt${i}`}
          x={X0 + i * PITCH}
          y={20}
          width={11}
          height={11}
          fill={G06}
          stroke={G}
          strokeWidth="0.75"
          className="cd-dt"
          style={{ animationDelay: `${i * 0.28}s` }}
        />
      ))}
      {Array.from({ length: N }, (_, i) => (
        <line
          key={`bp${i}`}
          x1={X0 + i * PITCH + 5.5}
          y1={31}
          x2={X0 + i * PITCH + 5.5}
          y2={47}
          stroke={G}
          strokeWidth="0.5"
          opacity={i % 3 === 1 ? 0.3 : 0.14}
          strokeDasharray={i % 4 === 0 ? '2 2' : undefined}
        />
      ))}
      {Array.from({ length: N }, (_, i) => (
        <rect
          key={`db${i}`}
          x={X0 + i * PITCH}
          y={47}
          width={11}
          height={11}
          fill={G06}
          stroke={G}
          strokeWidth="0.75"
          className="cd-db"
          style={{ animationDelay: `${i * 0.28 + 0.14}s` }}
        />
      ))}
      <text x={X0} y="74" fill={MUTED} fontSize="6.5" letterSpacing="1.5">
        3×10⁹ pares de bases · fita dupla
      </text>

      <Arrow x={119} y1={82} y2={134} />
      <FlowParticles path="M 119,82 L 119,128" />
      <text x={131} y="104" fill={G40} fontSize="7.5" letterSpacing="2">TRANSCRIÇÃO</text>
      <text x={131} y="116" fill={MUTED} fontSize="6.5">RNA polimerase · T→U</text>

      <text x={X0} y="150" fill={MUTED_BRIGHT} fontSize="7.5" letterSpacing="3">mRNA</text>
      <line x1={X0 + 38} y1="147" x2={STRAND_W + 9} y2="147" stroke={G20} strokeWidth="0.4" />
      <line x1={X0 + 5.5} y1="166" x2={STRAND_W + 5.5} y2="166" stroke={G} strokeWidth="0.4" opacity="0.12" />
      <text x={X0 - 1} y="169" fill={G20} fontSize="6">5′</text>
      <text x={STRAND_W + 11} y="169" fill={G20} fontSize="6">3′</text>
      {Array.from({ length: N }, (_, i) => (
        <circle
          key={`rn${i}`}
          cx={X0 + i * PITCH + 5.5}
          cy={166}
          r={5.5}
          fill={G06}
          stroke={G}
          strokeWidth="0.75"
          className="cd-rn"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
      <text x={X0} y="185" fill={MUTED} fontSize="6.5" letterSpacing="1.5">
        fita simples · códons
      </text>

      <Arrow x={119} y1={193} y2={244} />
      <FlowParticles path="M 119,193 L 119,238" dur={2.2} />
      <text x={131} y="215" fill={G40} fontSize="7.5" letterSpacing="2">TRADUÇÃO</text>
      <text x={131} y="227" fill={MUTED} fontSize="6.5">ribossomo · 3 bases/códon</text>

      <text x={X0} y="260" fill={MUTED_BRIGHT} fontSize="7.5" letterSpacing="3">PROTEÍNA</text>
      <line x1={X0 + 62} y1="257" x2={STRAND_W + 9} y2="257" stroke={G20} strokeWidth="0.4" />
      <line x1={X0 + 5.5} y1="276" x2={STRAND_W + 5.5} y2="276" stroke={G} strokeWidth="0.4" opacity="0.12" />
      <text x={X0 - 1} y="279" fill={G20} fontSize="6">N</text>
      <text x={STRAND_W + 11} y="279" fill={G20} fontSize="6">C</text>
      {Array.from({ length: N }, (_, i) => {
        const r = [5.5, 6.5, 4.5, 7, 5, 6, 4, 6.5, 5.5, 5][i]
        return (
          <circle
            key={`pr${i}`}
            cx={X0 + i * PITCH + 5.5}
            cy={276}
            r={r}
            fill={G06}
            stroke={G}
            strokeWidth="0.75"
            className="cd-pr"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        )
      })}
      <text x={X0} y="296" fill={MUTED} fontSize="6.5" letterSpacing="1.5">
        N→C · dobramento 3D
      </text>
    </svg>
  )
}
