export const CTA_EXPERIMENT_ID = 'homepage_hero_cta_free_pilot_info_v1'

export type CtaExperimentVariant = {
  id: string
  label: string
}

export const CTA_EXPERIMENT_VARIANTS: CtaExperimentVariant[] = [
  { id: 'start-pilot-application', label: 'Start My Pilot Application' },
  { id: 'free-training-plan', label: 'Get My Free Training Plan' },
  { id: 'free-training-profile', label: 'Start My Free Training Profile' },
  { id: 'pilot-form', label: 'Fill Out My Pilot Form' },
  { id: 'free-pilot-training-details', label: 'Get Free Pilot Training Details' },
]

export function getCtaVariantById(variantId: string | null | undefined) {
  return CTA_EXPERIMENT_VARIANTS.find((variant) => variant.id === variantId) || CTA_EXPERIMENT_VARIANTS[0]
}
