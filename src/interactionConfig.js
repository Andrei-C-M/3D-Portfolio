/**
 * External links for interactive meshes that should open in a new tab only.
 * Book, LinkedIn, GitHub, Profile, and giraffe use the side panel — see getPanelIdForMeshName.
 */
export function getUrlForInteractiveMeshName(_name) {
  return null
}

/**
 * Side-panel content id (in-app drawer). Whole-word `book` avoids matching inside `facebook`.
 */
export function getPanelIdForMeshName(name) {
  const n = (name || '').toLowerCase()
  if (/(^|[^a-z0-9])book([^a-z0-9]|$)/.test(n)) return 'book'
  if (/linkedin/.test(n)) return 'linkedin'
  if (/github/.test(n)) return 'github'
  if (/profile/.test(n)) return 'profile'
  if (/(^|[^a-z0-9])giraffe([^a-z0-9]|$)/.test(n)) return 'about'
  return null
}
