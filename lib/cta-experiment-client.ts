'use client'

import {
  CTA_EXPERIMENT_ID,
  CTA_EXPERIMENT_VARIANTS,
  type CtaExperimentVariant,
  getCtaVariantById,
} from '@/lib/cta-experiment'

const VISITOR_ID_KEY = 'merlin_cta_visitor_id'
const SESSION_ID_KEY = 'merlin_cta_session_id'
const VARIANT_KEY = `${CTA_EXPERIMENT_ID}_variant`

function getLocalStorage() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function getSessionStorage() {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function createId(prefix: string) {
  const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

  return `${prefix}_${randomPart}`
}

function getStorageValue(storage: Storage, key: string) {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function setStorageValue(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value)
  } catch {
    // Storage can be unavailable in private browsing or strict privacy modes.
  }
}

export function getOrCreateCtaVisitorId() {
  const storage = getLocalStorage()
  const existingVisitorId = storage ? getStorageValue(storage, VISITOR_ID_KEY) : null

  if (existingVisitorId) {
    return existingVisitorId
  }

  const visitorId = createId('visitor')
  if (storage) {
    setStorageValue(storage, VISITOR_ID_KEY, visitorId)
  }
  return visitorId
}

export function getOrCreateCtaSessionId() {
  const storage = getSessionStorage()
  const existingSessionId = storage ? getStorageValue(storage, SESSION_ID_KEY) : null

  if (existingSessionId) {
    return existingSessionId
  }

  const sessionId = createId('session')
  if (storage) {
    setStorageValue(storage, SESSION_ID_KEY, sessionId)
  }
  return sessionId
}

export function getAssignedCtaVariant() {
  const storage = getLocalStorage()
  const existingVariantId = storage ? getStorageValue(storage, VARIANT_KEY) : null
  const existingVariant = CTA_EXPERIMENT_VARIANTS.find((variant) => variant.id === existingVariantId)

  if (existingVariant) {
    return existingVariant
  }

  const variant = CTA_EXPERIMENT_VARIANTS[Math.floor(Math.random() * CTA_EXPERIMENT_VARIANTS.length)]
  if (storage) {
    setStorageValue(storage, VARIANT_KEY, variant.id)
  }
  return variant
}

export function getStoredCtaVariant() {
  const storage = getLocalStorage()
  return getCtaVariantById(storage ? getStorageValue(storage, VARIANT_KEY) : null)
}

export function hasTrackedCtaViewThisSession() {
  const storage = getSessionStorage()
  return storage ? getStorageValue(storage, `${CTA_EXPERIMENT_ID}_hero_viewed`) === '1' : false
}

export function markCtaViewTrackedThisSession() {
  const storage = getSessionStorage()
  if (storage) {
    setStorageValue(storage, `${CTA_EXPERIMENT_ID}_hero_viewed`, '1')
  }
}

export async function trackCtaExperimentEvent(
  eventType: string,
  variant: CtaExperimentVariant,
  metadata: Record<string, unknown> = {}
) {
  const body = {
    experimentId: CTA_EXPERIMENT_ID,
    variantId: variant.id,
    variantLabel: variant.label,
    eventType,
    visitorId: getOrCreateCtaVisitorId(),
    sessionId: getOrCreateCtaSessionId(),
    pagePath: window.location.pathname,
    referrer: document.referrer || '',
    device: window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop',
    metadata,
  }

  try {
    await fetch('/api/cta-experiment-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    })
  } catch (error) {
    console.warn('CTA experiment event failed', error)
  }
}
