import { useEffect } from 'react'
import { usePanel } from './context/PanelContext.jsx'

/**
 * Regular HTML overlay — not Three.js. Styling for the drawer lives in index.css (`.side-panel-*`).
 *
 * Keys here must match what `getPanelIdForMeshName` returns in interactionConfig.js. Each entry
 * can have `hero` (photo or gradient), `paragraphs`, optional `linkedInUrl` / `footerLink`, etc.
 */
const BOOK_URL = 'https://www.amazon.co.uk/dp/B0GRB1P394'
const GITHUB_URL = 'https://github.com/Andrei-C-M'
const LINKEDIN_URL = 'https://www.linkedin.com/in/andrei-manea-570669277/'
const PORTFOLIO_URL = 'https://andreimanea.framer.website/'

const PANEL_COPY = {
  about: {
    hero: { kind: 'image', src: '/assets/profile.jpg', alt: 'Profile' },
    title: 'About',
    subtitle: 'Designer, developer, and builder of interactive experiences.',
    paragraphs: [
      'This is placeholder copy you can replace with your own story — where you work, what you care about, and how you blend 3D, the web, and search-friendly content.',
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus feugiat, urna vitae ullamcorper tincidunt, nibh tortor aliquet massa, at pulvinar nisl lacus sit amet nunc.',
      'Curabitur id ligula vel nisl imperdiet convallis. Integer pharetra, lectus non efficitur tempus, purus urna cursus lorem, sit amet vestibulum erat magna nec felis.',
    ],
  },
  book: {
    hero: { kind: 'image', src: '/assets/book.jpg', alt: 'Book cover' },
    title: 'Book',
    subtitle: 'SEO, AEO, and the future of search.',
    paragraphs: [
      'In 2026, I wrote a book on SEO and AEO that explores the future of search and how to optimize for both traditional engines and AI-powered assistants.',
    ],
    footerLink: {
      label: 'View on Amazon (UK)',
      href: BOOK_URL,
    },
  },
  linkedin: {
    hero: { kind: 'gradient', variant: 'linkedin', label: 'LinkedIn' },
    title: 'LinkedIn',
    subtitle: 'Professional updates and collaboration.',
    paragraphs: [
      "Want to connect professionally? I'm active on LinkedIn, where I share updates, collaborate with others, and keep the conversation going. I'd love to connect.",
    ],
    linkedInUrl: LINKEDIN_URL,
    footerLink: {
      label: 'linkedin.com/in/andrei-manea-570669277',
      href: LINKEDIN_URL,
    },
  },
  github: {
    hero: { kind: 'gradient', variant: 'github', label: 'GitHub' },
    title: 'GitHub',
    subtitle: 'Projects, learning, and where the code lives.',
    paragraphs: [
      "If you're curious about what I've been creating lately, my GitHub is the best place to look. It's where I share my projects, document my learning, and push myself to grow as a developer.",
    ],
    footerLink: {
      label: 'github.com/Andrei-C-M',
      href: GITHUB_URL,
    },
  },
  profile: {
    hero: { kind: 'image', src: '/assets/profile.jpg', alt: 'Profile' },
    title: 'Profile',
    subtitle: 'Visual communication, 3D, and frontend development.',
    paragraphs: [
      "My name is Andrei Manea, and my professional background spans over 10 years in visual communication - designing layouts for newspapers, magazines, books, commercials, and posters. I also spent five years working with 3D modeling, and I'm now transitioning from 3ds Max to Blender. I am a frontend developer with a focus on product design and SEO/AEO. You can find more information about me below.",
    ],
    footerLink: {
      label: 'andreimanea.framer.website',
      href: PORTFOLIO_URL,
    },
  },
}

/** Top strip of the panel: either a photo from `/public` or a simple gradient for GitHub/LinkedIn. */
function PanelHero({ hero }) {
  if (!hero) return null
  if (hero.kind === 'image') {
    return (
      <img
        className="side-panel-hero-img"
        src={hero.src}
        alt={hero.alt}
        decoding="async"
      />
    )
  }
  if (hero.kind === 'gradient') {
    const cls =
      hero.variant === 'linkedin'
        ? 'side-panel-hero-gradient side-panel-hero-gradient--linkedin'
        : 'side-panel-hero-gradient side-panel-hero-gradient--github'
    return (
      <div className={cls} aria-hidden>
        <span>{hero.label}</span>
      </div>
    )
  }
  return null
}

/**
 * The slide-out panel. `open` is driven by `openPanelId` from `PanelContext`; clicking the
 * dimmed backdrop or pressing Escape closes it. Links use `target="_blank"` + `rel` for security.
 */
export default function SidePanel() {
  const { openPanelId, closePanel } = usePanel()
  const open = Boolean(openPanelId && PANEL_COPY[openPanelId])
  const content = openPanelId ? PANEL_COPY[openPanelId] : null

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') closePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closePanel])

  return (
    <>
      <button
        type="button"
        aria-label="Close panel"
        className="side-panel-backdrop"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          border: 'none',
          padding: 0,
          margin: 0,
          cursor: open ? 'pointer' : 'default',
          pointerEvents: open ? 'auto' : 'none',
          background: open ? 'rgba(0,0,0,0.45)' : 'transparent',
          opacity: open ? 1 : 0,
          visibility: open ? 'visible' : 'hidden',
          transition: 'opacity 0.28s ease, visibility 0.28s ease',
        }}
        onClick={closePanel}
        tabIndex={open ? 0 : -1}
      />

      {/* stopPropagation on the drawer so clicks don’t bubble up to the backdrop (which would close us). */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-labelledby="side-panel-title"
        className={`side-panel-drawer${open ? ' side-panel-drawer--open' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="side-panel-close"
          aria-label="Close"
          onClick={closePanel}
        >
          ×
        </button>

        <div className="side-panel-hero">
          {content && <PanelHero hero={content.hero} />}
        </div>

        <div className="side-panel-body">
          {content && (
            <>
              <h1
                id="side-panel-title"
                style={{
                  fontSize: 'clamp(1.5rem, 4vw, 1.85rem)',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  marginBottom: 10,
                }}
              >
                {content.title}
              </h1>
              <p
                style={{
                  fontSize: 15,
                  color: '#a8a8a8',
                  marginBottom: 22,
                  lineHeight: 1.45,
                }}
              >
                {content.subtitle}
              </p>
              {content.paragraphs.map((p, i) => (
                <p
                  key={i}
                  style={{
                    fontSize: 15,
                    lineHeight: 1.65,
                    marginBottom: 16,
                    color: '#d4d4d4',
                  }}
                >
                  {p}
                </p>
              ))}
              {content.linkedInUrl && (
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.65,
                    marginBottom: 16,
                    color: '#d4d4d4',
                  }}
                >
                  Connect on{' '}
                  <a
                    href={content.linkedInUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    linkedin.com/in/andrei-manea-570669277
                  </a>
                  .
                </p>
              )}
              {content.footerLink && (
                <p className="side-panel-footer-link">
                  <a
                    href={content.footerLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {content.footerLink.label}
                  </a>
                </p>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  )
}
