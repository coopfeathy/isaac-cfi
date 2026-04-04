type PaymentSource = 'slot_booking' | 'admin_checkout'

type LineItemInput = {
  itemId: string
  totalCents: number
}

type ResolveConnectConfigInput = {
  supabaseAdmin: any
  source: PaymentSource
  currency: string
  totalAmountCents: number
  slotType?: 'training' | 'tour'
  transactionType?: string
  lineItems?: LineItemInput[]
}

type ResolveChargePlanInput = ResolveConnectConfigInput & {
  subtotalCents?: number
  processingFeeCents?: number
}

type DisabledConnectConfig = {
  enabled: false
  reason: string
}

type EnabledConnectConfig = {
  enabled: true
  destinationAccount: string
  applicationFeeAmount: number
  allowDeveloperCommission: boolean
  matchSource: 'db' | 'env'
  matchedRuleId: string | null
  matchedRuleName: string | null
}

export type ResolvedConnectConfig = DisabledConnectConfig | EnabledConnectConfig

type PayoutRuleRow = {
  id: string
  name: string | null
  is_active: boolean
  priority: number | null
  source: string | null
  slot_type: string | null
  item_id: string | null
  transaction_type: string | null
  currency: string | null
  destination_account: string
  allow_developer_commission: boolean | null
  fee_mode: 'bps' | 'fixed_cents'
  fee_bps: number | null
  fee_cents: number | null
  created_at: string
}

type RuleSignature = {
  destinationAccount: string
  feeMode: 'bps' | 'fixed_cents'
  feeBps: number | null
  feeCents: number | null
}

export type DeveloperCommissionConfig = {
  enabled: boolean
  destinationAccount: string | null
  amountCents: number
  appliedBps: number
}

export type StripeConnectSplitTransferBucket = {
  destinationAccount: string
  amountCents: number
  matchedRuleId: string | null
  matchedRuleName: string | null
}

export type StripeConnectSplitPlanPayload = {
  v: 1
  m: 'split'
  b: Array<{ d: string; a: number; r: string | null }>
  dev: { d: string; a: number; bps: number } | null
}

export type StripeConnectChargePlan =
  | {
      mode: 'none'
      connectConfig: DisabledConnectConfig
      developerCommission: DeveloperCommissionConfig
      finalApplicationFeeAmount?: undefined
      splitTransfers?: undefined
      splitDeveloperTransfer?: undefined
      serializedSplitPlan?: undefined
    }
  | {
      mode: 'destination_charge'
      connectConfig: EnabledConnectConfig
      developerCommission: DeveloperCommissionConfig
      finalApplicationFeeAmount: number
      splitTransfers?: undefined
      splitDeveloperTransfer?: undefined
      serializedSplitPlan?: undefined
    }
  | {
      mode: 'split_transfers'
      connectConfig: DisabledConnectConfig
      developerCommission: DeveloperCommissionConfig
      finalApplicationFeeAmount?: undefined
      splitTransfers: StripeConnectSplitTransferBucket[]
      splitDeveloperTransfer: DeveloperCommissionConfig
      serializedSplitPlan: string
    }

export class StripeConnectConfigError extends Error {
  readonly statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'StripeConnectConfigError'
    this.statusCode = statusCode
  }
}

function parseBps(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10000) return null
  return Math.round(parsed)
}

function parseFeeCents(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed)
}

function clampCents(cents: number, max: number): number {
  return Math.min(Math.max(Math.round(cents), 0), max)
}

function feeFromRule(totalAmountCents: number, rule: RuleSignature): number {
  if (rule.feeMode === 'fixed_cents') {
    return clampCents(rule.feeCents || 0, totalAmountCents)
  }

  const feeByBps = Math.round((totalAmountCents * (rule.feeBps || 0)) / 10000)
  return clampCents(feeByBps, totalAmountCents)
}

function ruleSpecificity(rule: PayoutRuleRow, input: ResolveConnectConfigInput, itemId?: string): number {
  let score = 0

  if (rule.source && rule.source !== 'any' && rule.source === input.source) score += 3
  if (rule.currency && rule.currency.toLowerCase() === input.currency.toLowerCase()) score += 2
  if (rule.transaction_type && input.transactionType && rule.transaction_type === input.transactionType) score += 2
  if (rule.slot_type && input.slotType && rule.slot_type === input.slotType) score += 2
  if (rule.item_id && itemId && rule.item_id === itemId) score += 4

  return score
}

function chooseBestRule(
  rules: PayoutRuleRow[],
  input: ResolveConnectConfigInput,
  itemId?: string
): PayoutRuleRow | null {
  const eligible = rules.filter((rule) => {
    if (!rule.is_active) return false

    if (rule.source && rule.source !== 'any' && rule.source !== input.source) return false
    if (rule.currency && rule.currency.toLowerCase() !== input.currency.toLowerCase()) return false
    if (rule.transaction_type && rule.transaction_type !== (input.transactionType || '')) return false
    if (rule.slot_type && rule.slot_type !== (input.slotType || '')) return false

    if (typeof itemId === 'string') {
      if (rule.item_id && rule.item_id !== itemId) return false
    } else if (rule.item_id) {
      return false
    }

    if (rule.fee_mode === 'bps' && (rule.fee_bps == null || rule.fee_bps < 0 || rule.fee_bps > 10000)) return false
    if (rule.fee_mode === 'fixed_cents' && (rule.fee_cents == null || rule.fee_cents < 0)) return false

    return Boolean(rule.destination_account)
  })

  if (eligible.length === 0) return null

  return [...eligible].sort((a, b) => {
    const scoreDiff = ruleSpecificity(b, input, itemId) - ruleSpecificity(a, input, itemId)
    if (scoreDiff !== 0) return scoreDiff

    const priorityA = typeof a.priority === 'number' ? a.priority : 100
    const priorityB = typeof b.priority === 'number' ? b.priority : 100
    if (priorityA !== priorityB) return priorityA - priorityB

    return a.created_at.localeCompare(b.created_at)
  })[0]
}

function signatureForRule(rule: PayoutRuleRow): RuleSignature {
  return {
    destinationAccount: rule.destination_account,
    feeMode: rule.fee_mode,
    feeBps: rule.fee_mode === 'bps' ? rule.fee_bps : null,
    feeCents: rule.fee_mode === 'fixed_cents' ? rule.fee_cents : null,
  }
}

function canApplyDeveloperCommission(rule: PayoutRuleRow): boolean {
  return rule.allow_developer_commission !== false
}

function sameSignature(a: RuleSignature, b: RuleSignature): boolean {
  return (
    a.destinationAccount === b.destinationAccount &&
    a.feeMode === b.feeMode &&
    (a.feeMode === 'bps' ? a.feeBps === b.feeBps : a.feeCents === b.feeCents)
  )
}

function allocateProportionally(
  lineTotals: number[],
  targetCents: number
): number[] {
  if (lineTotals.length === 0) return []
  if (targetCents <= 0) return lineTotals.map(() => 0)

  const subtotal = lineTotals.reduce((sum, value) => sum + Math.max(0, value), 0)
  if (subtotal <= 0) return lineTotals.map(() => 0)

  const baseShares = lineTotals.map((value) =>
    Math.floor((Math.max(0, value) * targetCents) / subtotal)
  )

  let remainder = targetCents - baseShares.reduce((sum, value) => sum + value, 0)
  if (remainder <= 0) return baseShares

  const ranked = lineTotals
    .map((value, index) => ({
      index,
      fractional:
        ((Math.max(0, value) * targetCents) / subtotal) - baseShares[index],
    }))
    .sort((a, b) => b.fractional - a.fractional)

  for (const entry of ranked) {
    if (remainder <= 0) break
    baseShares[entry.index] += 1
    remainder -= 1
  }

  return baseShares
}

function serializeSplitPlanPayload(payload: StripeConnectSplitPlanPayload): string {
  const raw = JSON.stringify(payload)
  if (raw.length <= 500) return raw

  const compactPayload: StripeConnectSplitPlanPayload = {
    ...payload,
    b: payload.b.map((bucket) => ({
      d: bucket.d,
      a: bucket.a,
      r: null,
    })),
  }

  const compact = JSON.stringify(compactPayload)
  if (compact.length <= 500) return compact

  throw new StripeConnectConfigError(
    'Unable to serialize split payout plan into Stripe metadata. Reduce checkout complexity or split into separate checkouts.'
  )
}

async function resolveSplitTransferPlan(
  input: ResolveChargePlanInput
): Promise<{
  connectConfig: DisabledConnectConfig
  splitTransfers: StripeConnectSplitTransferBucket[]
  splitDeveloperTransfer: DeveloperCommissionConfig
  serializedSplitPlan: string
}> {
  const { data: allRules, error } = await input.supabaseAdmin
    .from('stripe_connect_payout_rules')
    .select(
      'id, name, is_active, priority, source, slot_type, item_id, transaction_type, currency, destination_account, allow_developer_commission, fee_mode, fee_bps, fee_cents, created_at'
    )
    .eq('is_active', true)

  if (error) {
    throw new Error(`Unable to load Stripe Connect payout rules: ${error.message}`)
  }

  const rules = (allRules || []) as PayoutRuleRow[]
  const lines = input.lineItems || []

  const subtotalFromLines = lines.reduce((sum, line) => sum + Math.max(0, line.totalCents), 0)
  const subtotalCents = input.subtotalCents ?? subtotalFromLines
  const processingFeeCents = Math.max(0, input.processingFeeCents ?? 0)
  const distributableCents = Math.max(input.totalAmountCents - processingFeeCents, 0)

  const allocatedLineBases = allocateProportionally(
    lines.map((line) => line.totalCents),
    distributableCents
  )

  const generalRule = chooseBestRule(rules, input)
  const fallback = resolveEnvFallback(input)

  const buckets = new Map<string, StripeConnectSplitTransferBucket>()
  let developerEligibleBaseCents = 0

  lines.forEach((line, index) => {
    const itemRule = chooseBestRule(rules, input, line.itemId)
    const matchedRule = itemRule || generalRule
    const signature = matchedRule ? signatureForRule(matchedRule) : fallback

    if (!signature) {
      throw new StripeConnectConfigError(
        'No payout rule matched selected items and no fallback payout destination is configured.'
      )
    }

    const allocatedBase = allocatedLineBases[index] || 0
    const lineFee = feeFromRule(allocatedBase, signature)
    const linePayout = clampCents(allocatedBase - lineFee, allocatedBase)

    if (linePayout > 0) {
      const bucketKey = `${signature.destinationAccount}::${matchedRule?.id || 'env'}`
      const existing = buckets.get(bucketKey)
      if (existing) {
        existing.amountCents += linePayout
      } else {
        buckets.set(bucketKey, {
          destinationAccount: signature.destinationAccount,
          amountCents: linePayout,
          matchedRuleId: matchedRule?.id || null,
          matchedRuleName: matchedRule?.name || null,
        })
      }
    }

    const allowDeveloper = matchedRule ? canApplyDeveloperCommission(matchedRule) : true
    if (allowDeveloper) {
      developerEligibleBaseCents += allocatedBase
    }
  })

  const splitTransfers = Array.from(buckets.values()).filter((bucket) => bucket.amountCents > 0)

  if (splitTransfers.length === 0) {
    throw new StripeConnectConfigError(
      'Unable to derive Stripe Connect transfer allocations for this checkout. Split checkout into separate payments.'
    )
  }

  const rawDeveloper = resolveDeveloperCommissionConfig({
    totalAmountCents: developerEligibleBaseCents,
    transactionType: input.transactionType,
  })

  const payoutTotalCents = splitTransfers.reduce((sum, bucket) => sum + bucket.amountCents, 0)
  const maxDeveloperCents = Math.max(input.totalAmountCents - payoutTotalCents, 0)

  const splitDeveloperTransfer: DeveloperCommissionConfig = rawDeveloper.enabled
    ? {
        ...rawDeveloper,
        amountCents: clampCents(rawDeveloper.amountCents, maxDeveloperCents),
        enabled: clampCents(rawDeveloper.amountCents, maxDeveloperCents) > 0,
      }
    : rawDeveloper

  const splitPlanPayload: StripeConnectSplitPlanPayload = {
    v: 1,
    m: 'split',
    b: splitTransfers.map((bucket) => ({
      d: bucket.destinationAccount,
      a: bucket.amountCents,
      r: bucket.matchedRuleId,
    })),
    dev:
      splitDeveloperTransfer.enabled && splitDeveloperTransfer.destinationAccount
        ? {
            d: splitDeveloperTransfer.destinationAccount,
            a: splitDeveloperTransfer.amountCents,
            bps: splitDeveloperTransfer.appliedBps,
          }
        : null,
  }

  return {
    connectConfig: {
      enabled: false,
      reason:
        'Using split transfer payout mode for mixed Stripe Connect payout rules across selected items.',
    },
    splitTransfers,
    splitDeveloperTransfer,
    serializedSplitPlan: serializeSplitPlanPayload(splitPlanPayload),
  }
}

function resolveEnvFallback(input: ResolveConnectConfigInput): RuleSignature | null {
  const transactionDestination =
    input.transactionType === 'discovery_flight'
      ? process.env.STRIPE_CONNECT_DISCOVERY_FLIGHT_DESTINATION_ACCOUNT
      : input.transactionType === 'website_transaction'
        ? process.env.STRIPE_CONNECT_WEBSITE_TRANSACTION_DESTINATION_ACCOUNT
        : undefined

  const sourceDestination =
    input.source === 'slot_booking'
      ? process.env.STRIPE_CONNECT_SLOT_BOOKING_DESTINATION_ACCOUNT
      : process.env.STRIPE_CONNECT_ADMIN_CHECKOUT_DESTINATION_ACCOUNT

  const slotDestination =
    input.slotType === 'tour'
      ? process.env.STRIPE_CONNECT_TOUR_DESTINATION_ACCOUNT
      : input.slotType === 'training'
        ? process.env.STRIPE_CONNECT_TRAINING_DESTINATION_ACCOUNT
        : undefined

  const destinationAccount =
    transactionDestination || sourceDestination || slotDestination || process.env.STRIPE_CONNECT_DEFAULT_DESTINATION_ACCOUNT

  if (!destinationAccount) return null

  const transactionFeeBps =
    input.transactionType === 'discovery_flight'
      ? parseBps(process.env.STRIPE_CONNECT_DISCOVERY_FLIGHT_PLATFORM_FEE_BPS)
      : input.transactionType === 'website_transaction'
        ? parseBps(process.env.STRIPE_CONNECT_WEBSITE_TRANSACTION_PLATFORM_FEE_BPS)
        : null

  const transactionFeeCents =
    input.transactionType === 'discovery_flight'
      ? parseFeeCents(process.env.STRIPE_CONNECT_DISCOVERY_FLIGHT_PLATFORM_FEE_CENTS)
      : input.transactionType === 'website_transaction'
        ? parseFeeCents(process.env.STRIPE_CONNECT_WEBSITE_TRANSACTION_PLATFORM_FEE_CENTS)
        : null

  const sourceFeeBps =
    input.source === 'slot_booking'
      ? parseBps(process.env.STRIPE_CONNECT_SLOT_BOOKING_PLATFORM_FEE_BPS)
      : parseBps(process.env.STRIPE_CONNECT_ADMIN_CHECKOUT_PLATFORM_FEE_BPS)

  const sourceFeeCents =
    input.source === 'slot_booking'
      ? parseFeeCents(process.env.STRIPE_CONNECT_SLOT_BOOKING_PLATFORM_FEE_CENTS)
      : parseFeeCents(process.env.STRIPE_CONNECT_ADMIN_CHECKOUT_PLATFORM_FEE_CENTS)

  const slotFeeBps =
    input.slotType === 'tour'
      ? parseBps(process.env.STRIPE_CONNECT_TOUR_PLATFORM_FEE_BPS)
      : input.slotType === 'training'
        ? parseBps(process.env.STRIPE_CONNECT_TRAINING_PLATFORM_FEE_BPS)
        : null

  const slotFeeCents =
    input.slotType === 'tour'
      ? parseFeeCents(process.env.STRIPE_CONNECT_TOUR_PLATFORM_FEE_CENTS)
      : input.slotType === 'training'
        ? parseFeeCents(process.env.STRIPE_CONNECT_TRAINING_PLATFORM_FEE_CENTS)
        : null

  const defaultFeeBps = parseBps(process.env.STRIPE_CONNECT_DEFAULT_PLATFORM_FEE_BPS)
  const defaultFeeCents = parseFeeCents(process.env.STRIPE_CONNECT_DEFAULT_PLATFORM_FEE_CENTS)

  if (transactionFeeCents != null) {
    return { destinationAccount, feeMode: 'fixed_cents', feeCents: transactionFeeCents, feeBps: null }
  }
  if (sourceFeeCents != null) {
    return { destinationAccount, feeMode: 'fixed_cents', feeCents: sourceFeeCents, feeBps: null }
  }
  if (slotFeeCents != null) {
    return { destinationAccount, feeMode: 'fixed_cents', feeCents: slotFeeCents, feeBps: null }
  }
  if (defaultFeeCents != null) {
    return { destinationAccount, feeMode: 'fixed_cents', feeCents: defaultFeeCents, feeBps: null }
  }

  if (transactionFeeBps != null) {
    return { destinationAccount, feeMode: 'bps', feeBps: transactionFeeBps, feeCents: null }
  }
  if (sourceFeeBps != null) {
    return { destinationAccount, feeMode: 'bps', feeBps: sourceFeeBps, feeCents: null }
  }
  if (slotFeeBps != null) {
    return { destinationAccount, feeMode: 'bps', feeBps: slotFeeBps, feeCents: null }
  }

  return {
    destinationAccount,
    feeMode: 'bps',
    feeBps: defaultFeeBps ?? 0,
    feeCents: null,
  }
}

export function resolveDeveloperCommissionConfig(params: {
  totalAmountCents: number
  transactionType?: string
}): DeveloperCommissionConfig {
  const destinationAccount = process.env.STRIPE_CONNECT_DEVELOPER_DESTINATION_ACCOUNT || null
  if (!destinationAccount) {
    return {
      enabled: false,
      destinationAccount: null,
      amountCents: 0,
      appliedBps: 0,
    }
  }

  const websiteBps = parseBps(process.env.STRIPE_CONNECT_DEVELOPER_WEBSITE_TRANSACTION_BPS) || 0
  const discoveryBps = parseBps(process.env.STRIPE_CONNECT_DEVELOPER_DISCOVERY_FLIGHT_BPS) || 0

  const appliedBps =
    params.transactionType === 'discovery_flight'
      ? websiteBps + discoveryBps
      : params.transactionType === 'website_transaction'
        ? websiteBps
        : 0

  const amountCents = clampCents(Math.round((params.totalAmountCents * appliedBps) / 10000), params.totalAmountCents)

  return {
    enabled: amountCents > 0,
    destinationAccount,
    amountCents,
    appliedBps,
  }
}

export async function resolveStripeConnectConfig(
  input: ResolveConnectConfigInput
): Promise<ResolvedConnectConfig> {
  if (process.env.STRIPE_CONNECT_ENABLED !== '1') {
    return { enabled: false, reason: 'STRIPE_CONNECT_ENABLED is not set to 1' }
  }

  const { data: allRules, error } = await input.supabaseAdmin
    .from('stripe_connect_payout_rules')
    .select(
      'id, name, is_active, priority, source, slot_type, item_id, transaction_type, currency, destination_account, allow_developer_commission, fee_mode, fee_bps, fee_cents, created_at'
    )
    .eq('is_active', true)

  if (error) {
    throw new Error(`Unable to load Stripe Connect payout rules: ${error.message}`)
  }

  const rules = (allRules || []) as PayoutRuleRow[]

  if (input.lineItems && input.lineItems.length > 0) {
    const itemSpecificRules = input.lineItems
      .map((line) => ({
        itemId: line.itemId,
        rule: chooseBestRule(rules, input, line.itemId),
      }))
      .filter((entry) => Boolean(entry.rule)) as Array<{ itemId: string; rule: PayoutRuleRow }>

    const generalRule = chooseBestRule(rules, input)

    if (itemSpecificRules.length > 0) {
      const baseSignature = signatureForRule(itemSpecificRules[0].rule)
      for (const entry of itemSpecificRules) {
        const signature = signatureForRule(entry.rule)
        if (!sameSignature(baseSignature, signature)) {
          throw new StripeConnectConfigError(
            'Mixed Stripe Connect payout rules across selected items. Split checkout by payout destination/fee before charging.'
          )
        }
      }

      if (generalRule) {
        const generalSignature = signatureForRule(generalRule)
        if (!sameSignature(baseSignature, generalSignature)) {
          const unresolvedItems = input.lineItems.filter(
            (line) => !itemSpecificRules.some((entry) => entry.itemId === line.itemId)
          )

          if (unresolvedItems.length > 0) {
            throw new StripeConnectConfigError(
              'Selected items require multiple payout configs. Split checkout into separate payments.'
            )
          }
        }
      }

      const fee = feeFromRule(input.totalAmountCents, baseSignature)
      return {
        enabled: true,
        destinationAccount: baseSignature.destinationAccount,
        applicationFeeAmount: fee,
        allowDeveloperCommission: canApplyDeveloperCommission(itemSpecificRules[0].rule),
        matchSource: 'db',
        matchedRuleId: itemSpecificRules[0].rule.id,
        matchedRuleName: itemSpecificRules[0].rule.name || null,
      }
    }
  }

  const topRule = chooseBestRule(rules, input)
  if (topRule) {
    const signature = signatureForRule(topRule)
    const fee = feeFromRule(input.totalAmountCents, signature)
    return {
      enabled: true,
      destinationAccount: signature.destinationAccount,
      applicationFeeAmount: fee,
      allowDeveloperCommission: canApplyDeveloperCommission(topRule),
      matchSource: 'db',
      matchedRuleId: topRule.id,
      matchedRuleName: topRule.name || null,
    }
  }

  const fallback = resolveEnvFallback(input)
  if (!fallback) {
    return { enabled: false, reason: 'No payout rule matched and no env fallback configured' }
  }

  const fee = feeFromRule(input.totalAmountCents, fallback)
  return {
    enabled: true,
    destinationAccount: fallback.destinationAccount,
    applicationFeeAmount: fee,
    allowDeveloperCommission: true,
    matchSource: 'env',
    matchedRuleId: null,
    matchedRuleName: null,
  }
}

export async function resolveStripeConnectChargePlan(
  input: ResolveChargePlanInput
): Promise<StripeConnectChargePlan> {
  try {
    const connectConfig = await resolveStripeConnectConfig(input)

    if (!connectConfig.enabled) {
      return {
        mode: 'none',
        connectConfig,
        developerCommission: {
          enabled: false,
          destinationAccount: null,
          amountCents: 0,
          appliedBps: 0,
        },
      }
    }

    const developerCommission = !connectConfig.allowDeveloperCommission
      ? {
          enabled: false,
          destinationAccount: null,
          amountCents: 0,
          appliedBps: 0,
        }
      : resolveDeveloperCommissionConfig({
          totalAmountCents: input.totalAmountCents,
          transactionType: input.transactionType,
        })

    const processingFeeCents = Math.max(0, input.processingFeeCents ?? 0)
    const finalApplicationFeeAmount = Math.min(
      input.totalAmountCents,
      Math.max(
        connectConfig.applicationFeeAmount +
          (developerCommission.enabled ? developerCommission.amountCents : 0),
        processingFeeCents
      )
    )

    return {
      mode: 'destination_charge',
      connectConfig,
      developerCommission,
      finalApplicationFeeAmount,
    }
  } catch (error) {
    if (!(error instanceof StripeConnectConfigError) || !input.lineItems?.length) {
      throw error
    }

    const splitPlan = await resolveSplitTransferPlan(input)

    return {
      mode: 'split_transfers',
      connectConfig: splitPlan.connectConfig,
      developerCommission: splitPlan.splitDeveloperTransfer,
      splitDeveloperTransfer: splitPlan.splitDeveloperTransfer,
      splitTransfers: splitPlan.splitTransfers,
      serializedSplitPlan: splitPlan.serializedSplitPlan,
    }
  }
}
