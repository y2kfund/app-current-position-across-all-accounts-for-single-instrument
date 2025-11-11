// src/index.ts
import currentPositions from './views/CurrentPositions.vue'

// Named export
export { currentPositions }

// Default export (optional)
export default currentPositions

// Props interface
export interface currentPositionsProps {
  symbolRoot: string    // Root symbol of the instrument
  userId?: string | null    // Current user ID for access control
}
