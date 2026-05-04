# Validation 1 - Content Generation Tool

## Project Overview

**Product Name:** Validation 1 (Marketing Content Generator for Israeli Digital Business Owners)

**Core Hypothesis:**
Israeli digital business owners (coaches, consultants, freelancers, agencies, SaaS, etc.) understand they need to publish marketing content regularly, but lack time and resources to do it efficiently. They want someone to generate marketing content from their existing business — with zero effort on their part.

**Solution:** A free mini-product that scans a landing page/website and generates 3 ready-to-post marketing posts in Hebrew within 60 seconds, matching the business owner's voice and style.

**Success Metrics:**
1. Immediate "WOW moment" upon seeing generated content
2. Willingness to provide website/landing page URL
3. Continuation to survey and community signup
4. Readiness to pay for full version

---

## Product Specification

### User Journey

**Screen 1: Landing Page**
- Hero headline: "תן לנו 30 שניות — נחזיר לך שבוע של תוכן"
- Subheading: "מדביקים קישור לאתר שלך. הבינה המלאכותית מנתחת את העסק שלך ויוצרת 3 פוסטים מוכנים לפרסום — בסגנון שלך, בעברית."
- Single text input field: "הכנס את כתובת האתר / דף הנחיתה שלך"
- Primary CTA button: "צור לי תוכן עכשיו"
- Static mock examples of 3 generated posts below
- Social proof: "כבר X בעלי עסקים קיבלו תוכן מוכן"
- **Design:** RTL-enabled, Hebrew-first, professional and clean

**Screen 2: MOM Test Survey**
- Disguised as "better understanding your business" - appears integrated into the product flow (not external form)
- Gathers validation data on:
  - Business type and niche
  - Current content strategy (if any)
  - Pain points with content creation
  - Willingness to pay for full version
  - Preferred feature set
- Should feel natural and conversational, not salesy

**Screen 3: Loading State (30-60 seconds)**
- Animated rotating messages to build anticipation:
  - "סורק את העסק שלך..."
  - "מבין את הסגנון שלך..."
  - "מזהה את נקודות החוזק שלך..."
  - "יוצר תוכן בקול שלך..."
- Purpose: Build excitement and sense of magic, not just a spinner

**Screen 4: WOW Screen (Post Showcase)**
- Headline: "הנה התוכן שלך מוכן לפרסום 🎯"
- 3 post cards with distinct purposes:

| Post | Type | Purpose |
|------|------|---------|
| Post 1 | Value/Tip | Professional insight from their field |
| Post 2 | Trust-Building | Who they are, why to trust them |
| Post 3 | CTA (Soft) | Offer/invitation to action |

- Each post card includes:
  - Full, ready-to-post text
  - "Copy" button (copy to clipboard)
  - Recommended channel tag (Instagram/LinkedIn/Facebook)

**Screen 5: Waitlist + Community**
- Headline: "אתה ברשימה! 🙌"
- Message: "ניצור איתך קשר כשהגרסה המלאה תעלה. בינתיים — הצטרף לקהילה שלנו בוואטסאפ לטיפים שבועיים ועדכונים ראשונים."
- Primary CTA: "הצטרף לקבוצת הוואטסאפ"
- Secondary: "אולי אחר כך"

---

## Tech Stack & Architecture

| Layer | Tool | Choice Rationale |
|-------|------|-----------------|
| **Frontend** | Next.js + Tailwind CSS | Fast build, RTL support, Vercel deployment, real-time data fetching |
| **UI/Design** | Tailwind CSS | RTL-friendly, responsive, accessibility-first |
| **Backend Orchestration** | N8N | Handles website scraping → Claude API → response storage, visual workflow, no backend code needed |
| **Website Scraping** | N8N HTTP node + HTML parser | Built-in capability, zero additional cost |
| **AI Model** | Claude API (Sonnet) | Hebrew proficiency, multi-modal context, efficient pricing — runs in N8N, not frontend |
| **Database** | Supabase | User data, posts (with images + copy), survey responses, real-time subscriptions |
| **Storage** | Supabase Storage (or CDN) | Image hosting for generated post images |
| **Analytics** | PostHog (free tier) | Funnel tracking, event funneling, retention analysis |
| **Deployment** | Vercel | Native Next.js integration, edge functions, automatic scaling |
| **Development** | Claude Code | This session — primary development harness |

---

## Implementation Roadmap

### Phase 1: MVP (Initial Validation)
1. **Frontend Setup**
   - Next.js project with Hebrew i18n and RTL layout
   - Landing page (Screen 1) with input validation
   - Basic form styling with Tailwind CSS
   - Pages for loading state, WOW screen, and waitlist signup

2. **N8N Workflow** (Handles Claude API Integration)
   - HTTP trigger for /api/generate endpoint (receives user website URL)
   - Website scraper (fetch + parse HTML)
   - Claude API call for content generation with system prompt
   - Three distinct post templates (value/trust/CTA)
   - Voice/style analysis from scraped content
   - Response formatting and storage in Supabase (posts + images)
   - Prompt caching for efficient cost

3. **Database Schema**
   - `users` table (email, website_url, created_at, updated_at, whatsapp_opted_in, survey_completed)
   - `posts` table (user_id, post_type, content, image_url, post_copy, channel_recommended, generated_at, copied_count)
   - `survey_responses` table (user_id, question_key, answer_text, answer_value, created_at)
   - Basic indexing for retrieval and real-time subscriptions

4. **Loading & WOW Screens**
   - Animated loading messages
   - Post card display component with image support
   - Copy-to-clipboard functionality (copies full post + copy)
   - Channel tag recommendations
   - Real-time data fetching from Supabase

### Phase 2: Survey & Data Collection
1. Implement Screen 2 survey flow (disguised as UX)
2. Supabase storage for survey responses
3. PostHog event tracking for funnel
4. WhatsApp integration trigger for waitlist signup

### Phase 3: Polish & Iteration
1. A/B test loading messages and post formats
2. Improve scraped content quality filters
3. Error handling and recovery flows
4. Mobile responsiveness verification

---

## Key Technical Decisions

### Why N8N for Orchestration?
- Eliminates need for custom backend code in Next.js
- Visual workflow = easy to debug and modify Claude API calls and scraping logic
- Built-in HTTP scraping + API integrations (Claude API, Supabase)
- No additional infrastructure cost
- Rapid iteration on prompt → response pipeline
- **Architecture Note:** Claude API integration happens entirely in N8N; frontend only fetches completed posts from Supabase

### Why Claude Sonnet for Content Generation?
- Strong Hebrew language proficiency
- Efficient pricing per token
- Fast response time for UX flow
- Multi-modal capability (could add images later)
- Prompt caching support for cost optimization

### Why Supabase Over Firebase?
- PostgreSQL = flexible schema for complex queries
- Real-time subscriptions for live updates
- Row-level security (user isolation)
- Easy migration path if needed
- Free tier sufficient for launch

### RTL + Hebrew Considerations
- Next.js `dir="rtl"` attribute at root level
- Tailwind CSS flex/grid directions reversed by RTL browser behavior
- All text content externalized for i18n
- Form inputs and CTAs positioned for RTL layouts
- Testing on iOS Safari + Chrome for RTL bugs

---

## Data Model

### Users Table
```
id (PK)
email
website_url
created_at
updated_at
whatsapp_opted_in
survey_completed
```

### Posts Table
```
id (PK)
user_id (FK)
post_type (value | trust | cta)
content (TEXT) — full post text in Hebrew
image_url (TEXT) — URL to associated image (if any)
post_copy (TEXT) — copy/byline text for the post
channel_recommended (instagram | linkedin | facebook)
generated_at
copied_count (for analytics)
```

### Survey Responses Table
```
id (PK)
user_id (FK)
question_key
answer_text
answer_value (for quantitative)
created_at
```

---

## Success Criteria & Validation Gates

### Gate 1: Product-Market Fit Signal
- ✅ 50+ websites processed
- ✅ 70%+ completion rate (landing page → waitlist)
- ✅ <5% error rate on content generation
- ✅ Positive sentiment in survey responses

### Gate 2: Willingness to Pay
- ✅ Survey shows 40%+ "definitely interested" in paid version
- ✅ Clear feature requests consistent across respondents
- ✅ Specific use case patterns emerge (industry, business model)

### Gate 3: Community Traction
- ✅ 30%+ WhatsApp signup rate
- ✅ Engagement signals (opens, replies)
- ✅ Referral signups from organic word-of-mouth

---

## Development Notes

### Constraints & Assumptions
- **Language:** Hebrew-first, all user-facing text in Hebrew
- **Target User:** Israeli business owners (30-60 years old, low technical literacy)
- **Scope:** Mini-product for validation only — no editing UI, no advanced features
- **Timeline:** Speed to market matters more than polish
- **Cost:** Free for users, sustainable cost structure (efficient prompting, smart caching)

### Known Unknowns (To Test)
- Website scraping reliability (dynamic vs. static sites)
- Claude's Hebrew voice consistency across businesses
- User willingness to share website URLs (privacy concerns?)
- Optimal loading animation (UX perception of speed)
- WhatsApp integration mechanics
- Image generation approach (static images, AI-generated, or none?)

### Future Considerations (Out of Scope)
- Post scheduling and social media publishing
- Multi-language support
- Team/agency features
- Custom brand guidelines upload
- Video content generation
- SEO optimization for generated posts

---

## Resources & References

- **Claude API Docs:** https://docs.anthropic.com
- **N8N Docs:** https://docs.n8n.io
- **Supabase Docs:** https://supabase.com/docs
- **Next.js RTL Guide:** https://nextjs.org/docs (search "rtl")
- **PostHog Analytics:** https://posthog.com/docs
- **Tailwind RTL Plugin:** https://tailwindcss.com/docs/configuration

---

## Session Checklist

- [ ] Understand product vision and validation hypothesis
- [ ] Create Next.js project with RTL + Hebrew support
- [ ] Build landing page (Screen 1) with input validation
- [ ] Design N8N workflow for orchestration
- [ ] Integrate Claude API with Hebrew prompt engineering
- [ ] Create Supabase schema and auth
- [ ] Build loading and WOW screens
- [ ] Implement survey flow (Screen 2)
- [ ] Add copy-to-clipboard and channel recommendations
- [ ] Test end-to-end funnel
- [ ] Deploy to Vercel
- [ ] Set up PostHog tracking
- [ ] Gather initial user feedback

---

## Questions to Resolve

1. **Website Scraping:** Should we handle dynamic content (JavaScript-rendered) or static HTML only?
2. **Error Recovery:** When scraping fails, do we show an error or suggest URL format alternatives?
3. **Voice Consistency:** Should we ask users about tone/style preference upfront, or infer from content?
4. **WhatsApp Integration:** Manual link or API-driven automation?
5. **Pricing Model:** Freemium (limited posts/month) or upgrade to full product?
6. **Images for Posts:** Should N8N generate/fetch images for posts, or are text-only posts sufficient for MVP?
7. **Post Copy Field:** Is "post_copy" a short subtitle/tagline, or a full alternate version of the post?

---

**Last Updated:** 2026-05-02
**Status:** Ready for implementation
