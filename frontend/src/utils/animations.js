export const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeIn' } },
}

export const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, y: 16, transition: { duration: 0.2, ease: 'easeIn' } },
}

export const stagger = {
  animate: {
    transition: { staggerChildren: 0.05 },
  },
}

export const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
}

export const listItem = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, x: 8, transition: { duration: 0.15, ease: 'easeIn' } },
}
