// supabase/functions/_shared/types.ts

export interface SurveyAnswer {
  key: string
  value: string
}

export interface BusinessProfile {
  business_name: string
  business_type: 'coach' | 'consultant' | 'freelancer' | 'agency' | 'saas' | 'other'
  niche: string
  target_audience: string
  core_offer: string
  key_differentiators: string[]
  tone_and_voice: 'formal' | 'casual' | 'inspirational' | 'professional'
  notable_phrases: string[]
  pain_points_addressed: string[]
  survey_insights: {
    content_strategy: string
    willingness_to_pay: string
    preferred_features: string
  }
}

export interface PostPlan {
  angle: string
  key_message: string
  hook: string
  tone: string
  image_direction: string
}

export interface MarketingPlan {
  value_post: PostPlan
  trust_post: PostPlan
  cta_post: PostPlan
}

export type PostType = 'value' | 'trust' | 'cta'
export type Channel = 'instagram' | 'linkedin' | 'facebook'

export interface GeneratedPost {
  post_type: PostType
  content: string
  copy: string
  channel_recommended: Channel
  image_prompt: string
  image_url: string | null
}
