export default defineAppConfig({
  ui: {
    /**
     * The component library takes the world's ink.
     *
     * Primary is the press black, so a filled button is an inked rectangle;
     * secondary is reflex blue, the printer's own mark colour, which is the one
     * hue the interface may spend on itself without colliding with a class
     * swatch. Error is the correction pencil.
     */
    colors: {
      primary: 'primary',
      secondary: 'secondary',
      neutral: 'neutral',
      success: 'success',
      info: 'info',
      warning: 'warning',
      error: 'error'
    },
    button: {
      slots: {
        // Printer's furniture is square, and its labels are set in the mono
        // face at caps, the way a colour bar or a docket is labelled.
        base: 'rounded-none font-medium tracking-[0.02em] transition-colors duration-150'
      },
      defaultVariants: { size: 'md' }
    },
    // The library's default field ground is a dark fill inherited from its own
    // neutral ramp. On proof stock a field is paper inside a hairline.
    input: {
      slots: {
        base: 'rounded-none bg-transparent ring-0 border border-stock-400 focus:border-stock-950 focus-visible:ring-0 text-stock-950 placeholder:text-stock-600'
      }
    },
    select: {
      slots: {
        base: 'rounded-none bg-transparent ring-0 border border-stock-400 focus:border-stock-950 focus-visible:ring-0 text-stock-950'
      }
    },
    textarea: {
      slots: {
        base: 'rounded-none bg-transparent ring-0 border border-stock-400 focus:border-stock-950 focus-visible:ring-0 text-stock-950 placeholder:text-stock-600'
      }
    },
    card: { slots: { root: 'rounded-none shadow-none ring-0 border border-stock-400' } },
    modal: { slots: { content: 'rounded-none' } },
    badge: { slots: { base: 'rounded-none font-medium' } }
  }
})
