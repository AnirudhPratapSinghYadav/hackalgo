/** Static field photographs — bundled in /public/images/landing/ */
export const LANDING_IMAGES = {
  opening: '/images/landing/opening.jpg',
  scale: '/images/landing/scale.jpg',
  cause: '/images/landing/cause.jpg',
  verify: '/images/landing/verify.jpg',
  deliver: '/images/landing/deliver.jpg',
  prove: '/images/landing/prove.jpg',
  close: '/images/landing/close.jpg',
} as const

export type LandingImageKey = keyof typeof LANDING_IMAGES
