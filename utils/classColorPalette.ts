/**
 * Static default color palette for class-based annotation colors
 * Each class receives a distinct color based on its index
 */
const PALETTE = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
  '#E76F51', '#8E7CC3', '#F4A261', '#2A9D8F', '#E63946',
  '#A8DADC', '#457B9D', '#F1FAEE', '#E9C46A', '#264653',
] as const

const DEFAULT_COLOR = '#00c851'

/**
 * Get color for a class based on its index
 * Returns default green for unlabeled or unknown classes
 */
export function getClassColor(className: string | undefined, classes: string[]): string {
  if (!className || !classes.length) return DEFAULT_COLOR
  
  const index = classes.indexOf(className)
  if (index === -1) return DEFAULT_COLOR
  
  return PALETTE[index % PALETTE.length]!
}

/**
 * Convert hex color to rgba with specified opacity
 */
export function withOpacity(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}
