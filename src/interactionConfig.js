/**
 * Map mesh names from your GLB to outbound links (set in .env with VITE_*).
 * Names are matched case-insensitively (e.g. "Book", "book_cover").
 */
export function getUrlForInteractiveMeshName(name) {
  const n = (name || '').toLowerCase()
  const e = import.meta.env

  if (/book/.test(n)) return e.VITE_LINK_BOOK?.trim() || ''
  if (/linkedin/.test(n)) return e.VITE_LINK_LINKEDIN?.trim() || ''
  if (/github/.test(n)) {
    return (
      e.VITE_GITHUB_URL?.trim() ||
      e.VITE_LINK_GITHUB?.trim() ||
      'https://github.com/Andrei-C-M'
    )
  }
  if (/profile/.test(n)) return e.VITE_LINK_PROFILE?.trim() || ''

  return null
}
