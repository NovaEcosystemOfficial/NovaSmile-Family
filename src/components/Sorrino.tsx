type SorrinoMood = 'happy' | 'cheer' | 'listen' | 'sleep'

interface SorrinoProps {
  mood?: SorrinoMood
  size?: number
  className?: string
  label?: string
}

const moodHint: Record<SorrinoMood, string> = {
  happy: 'Sorrino è contento',
  cheer: 'Sorrino ti fa il tifo',
  listen: 'Sorrino ascolta',
  sleep: 'Sorrino riposa',
}

export function Sorrino({
  mood = 'happy',
  size = 88,
  className = '',
  label,
}: SorrinoProps) {
  const cheekY = mood === 'sleep' ? 58 : 56
  const eyeOpen = mood !== 'sleep'

  return (
    <figure
      className={`sorrino ${mood} ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-label={label ?? moodHint[mood]}
    >
      <svg viewBox="0 0 120 120" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="toothBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fffef8" />
            <stop offset="100%" stopColor="#ffe9a8" />
          </linearGradient>
          <linearGradient id="toothShine" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <ellipse cx="60" cy="108" rx="28" ry="6" fill="rgba(30,64,175,0.12)" />
        <path
          d="M28 42c0-18 14-30 32-30s32 12 32 30v28c0 10-4 18-10 22-4 3-8 4-12 4s-8-2-10-5c-2 3-6 5-10 5s-8-1-12-4c-6-4-10-12-10-22V42z"
          fill="url(#toothBody)"
          stroke="#7c3aed"
          strokeWidth="3"
        />
        <path
          d="M38 28c6-10 18-16 28-14 2 8-4 16-12 20-8 3-16 1-16-6z"
          fill="url(#toothShine)"
        />
        {eyeOpen ? (
          <>
            <circle cx="46" cy="48" r="5.5" fill="#1e1b4b" />
            <circle cx="74" cy="48" r="5.5" fill="#1e1b4b" />
            <circle cx="47.5" cy="46.5" r="1.6" fill="#fff" />
            <circle cx="75.5" cy="46.5" r="1.6" fill="#fff" />
          </>
        ) : (
          <>
            <path
              d="M40 48c4 3 8 3 12 0"
              stroke="#1e1b4b"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M68 48c4 3 8 3 12 0"
              stroke="#1e1b4b"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          </>
        )}
        <circle cx="36" cy={cheekY} r="6" fill="#fb7185" opacity="0.55" />
        <circle cx="84" cy={cheekY} r="6" fill="#fb7185" opacity="0.55" />
        {mood === 'cheer' ? (
          <path
            d="M48 68c4 8 20 8 24 0"
            stroke="#ea580c"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        ) : mood === 'listen' ? (
          <ellipse cx="60" cy="70" rx="7" ry="5" fill="#ea580c" />
        ) : mood === 'sleep' ? (
          <path
            d="M52 70c3 4 13 4 16 0"
            stroke="#ea580c"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <path
            d="M48 66c5 7 19 7 24 0"
            stroke="#ea580c"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        )}
        {mood === 'cheer' && (
          <>
            <circle cx="18" cy="34" r="4" fill="#22d3ee" />
            <circle cx="102" cy="28" r="3.5" fill="#facc15" />
            <circle cx="98" cy="52" r="3" fill="#a78bfa" />
          </>
        )}
        {mood === 'sleep' && (
          <text x="92" y="30" fontSize="14" fill="#7c3aed" fontWeight="700">
            z
          </text>
        )}
      </svg>
    </figure>
  )
}
