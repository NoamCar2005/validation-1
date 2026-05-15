import { assertStringIncludes, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { buildPlanUserMessage } from './plan.ts'
import type { BusinessProfile } from './types.ts'

const profile: BusinessProfile = {
  business_name: 'Test',
  owner_name: 'Noam',
  industry: 'coaching',
  target_audience: 'business owners',
  unique_value: 'value',
  voice_traits: ['warm'],
  key_services: ['coaching'],
  inferred_tone: 'warm',
} as unknown as BusinessProfile

Deno.test('plan user message contains no prior-posts block when none given', () => {
  const msg = buildPlanUserMessage(profile, [])
  assertEquals(msg.includes('previously received'), false)
})

Deno.test('plan user message contains prior posts and divergence instruction', () => {
  const msg = buildPlanUserMessage(profile, [
    { post_type: 'value', content: 'old value content', copy: 'old value copy' },
    { post_type: 'trust', content: 'old trust content', copy: 'old trust copy' },
    { post_type: 'cta', content: 'old cta content', copy: 'old cta copy' },
  ])
  assertStringIncludes(msg, 'previously received')
  assertStringIncludes(msg, 'old value content')
  assertStringIncludes(msg, 'old trust content')
  assertStringIncludes(msg, 'old cta content')
  assertStringIncludes(msg, 'fundamentally different')
})
