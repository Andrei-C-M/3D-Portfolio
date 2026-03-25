/**
 * How clicks on the island map to UI (see Island.jsx + useClickToMove.js).
 *
 * In Three.js, every mesh/group can carry custom data on `userData`. We store either an
 * `interactionPanel` id (opens the React side drawer) or, if you ever need it again, an
 * `externalUrl` for a new browser tab. The matching is done by **object names from Blender**,
 * so renaming a mesh there means updating the patterns below.
 */

/**
 * Reserved for “open this URL in a new tab” props. Right now everything goes through the
 * side panel instead, so this always returns null — but we keep the function so the wiring
 * stays obvious if you add a pure link later.
 */
export function getUrlForInteractiveMeshName(_name) {
  return null
}

/**
 * Which slide-out panel to show when the player clicks a named prop.
 *
 * We use awkward-looking regexes on purpose: e.g. the word `book` must not match inside
 * `facebook`, or clicking a Facebook icon would wrongly open the book panel.
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
