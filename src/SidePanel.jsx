import { useEffect } from 'react'
import { usePanel } from './context/PanelContext.jsx'

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
    subtitle: 'Placeholder — add your title and pitch for SEO and AEO in 2026.',
    paragraphs: [
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
    ],
  },
  linkedin: {
    hero: { kind: 'gradient', variant: 'linkedin', label: 'LinkedIn' },
    title: 'LinkedIn',
    subtitle: 'Placeholder — connect professionally and see selected experience.',
    paragraphs: [
      'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.',
      'Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio.',
    ],
  },
  github: {
    hero: { kind: 'gradient', variant: 'github', label: 'GitHub' },
    title: 'GitHub',
    subtitle: 'Placeholder — open-source work, experiments, and code samples.',
    paragraphs: [
      'Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est.',
      'Omnis dolor repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.',
    ],
  },
  profile: {
    hero: { kind: 'image', src: '/assets/profile.jpg', alt: 'Profile' },
    title: 'Profile',
    subtitle: 'Placeholder — short bio and how to reach you.',
    paragraphs: [
      'Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.',
      'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.',
    ],
  },
}

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
 * Slides in from the right over a dimmed backdrop; full-screen on narrow viewports.
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
            </>
          )}
        </div>
      </aside>
    </>
  )
}
