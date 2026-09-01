/**
 * A class is an ink.
 *
 * One list, read by the canvas that draws the shapes and by the colour bar that
 * legends them, so a swatch under the stage is the same ink as the shape on the
 * plate. Ordered as a proof lays ink down: process colours first, then spots.
 */
export const CLASS_INKS = [
  '#0093D3', // process cyan
  '#D6006E', // process magenta
  '#F5C400', // process yellow
  '#E8590C', // spot orange
  '#009B72', // spot green
  '#6B3FA0', // spot violet
  '#00A6A6', // spot teal
  '#C4302B', // spot red
  '#141414'  // key
] as const

/** Reflex blue: the printer's own mark, for a shape with no class yet. */
export const UNASSIGNED_INK = '#1F3A93'

/** The ink a class prints in, by its position in the project's class list. */
export const inkForClass = (className: string | undefined | null, classes: readonly string[]) => {
  if (!className || className.startsWith('magic-generated-')) return UNASSIGNED_INK
  const index = classes.indexOf(className)
  return index >= 0 ? CLASS_INKS[index % CLASS_INKS.length] : UNASSIGNED_INK
}

/** The same ink, thinned for a fill wash. */
export const inkWash = (hex: string, alpha: number) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
