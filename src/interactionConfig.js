/**


/** Not used right now, leftover from previous code, might use it later */
export function getUrlForInteractiveMeshName(_name) {
  return null
}

/**
 * Returns the panel id, or `null` if this name shouldn’t open anything.
 Each exported mesh has its own name in Blender, this checks if the user clicked certain objects (like "book", "linkedin",etc)
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
