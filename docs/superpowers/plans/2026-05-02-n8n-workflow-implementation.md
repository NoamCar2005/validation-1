# N8N Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 4 N8N workflows (1 main + 3 sub-workflows) that accept a webhook from the Supabase edge function, scrape a website, generate a business profile, plan 3 Hebrew marketing posts, generate each post + image in parallel, and return the results.

**Architecture:** Main workflow orchestrates scraping → summarization → planning → parallel sub-workflow dispatch → merge → respond. Each of the 3 sub-workflows handles one post type: copywriting + image prompt + image generation. All agents use Claude (claude-sonnet model). Image API node is a placeholder (DALL-E / Banana) — configured last.

**Tech Stack:** N8N (self-hosted at `https://n8n.srv1241655.hstgr.cloud`), Claude API (Anthropic), DataForSEO Parse Page node, N8N Execute Sub-Workflow node, N8N HTTP Request node for image API.

---

## Scope Note

This plan covers N8N workflow configuration only. No code files are created or modified — the frontend and Supabase edge function are already complete and compatible with this workflow's output contract.

---

## Task 1: Create the 3 Sub-Workflow Skeletons

Create all 3 sub-workflows first so the main workflow can reference them by ID when wiring the parallel branches.

**What to build:** Three empty sub-workflows with the correct trigger node and a known name. No internal logic yet.

- [ ] **Step 1: Open N8N**

  Navigate to `https://n8n.srv1241655.hstgr.cloud` and log in.

- [ ] **Step 2: Create `generate-value-post` sub-workflow**

  1. Click "New Workflow"
  2. Name it exactly: `generate-value-post`
  3. Add a **"When called by another workflow"** trigger node (found under "Core" → "Execute Workflow Trigger")
  4. Save the workflow
  5. Note the workflow ID from the URL (e.g., `/workflow/12`)

- [ ] **Step 3: Create `generate-trust-post` sub-workflow**

  1. Click "New Workflow"
  2. Name it exactly: `generate-trust-post`
  3. Add a **"When called by another workflow"** trigger node
  4. Save the workflow
  5. Note the workflow ID

- [ ] **Step 4: Create `generate-cta-post` sub-workflow**

  1. Click "New Workflow"
  2. Name it exactly: `generate-cta-post`
  3. Add a **"When called by another workflow"** trigger node
  4. Save the workflow
  5. Note the workflow ID

- [ ] **Step 5: Write down all 3 workflow IDs**

  You'll need these in Task 5 when wiring the main workflow's parallel branches.

---

## Task 2: Build the Main Workflow — Webhook + DataForSEO

Create the main workflow, add the webhook trigger, and wire up the DataForSEO scraping node.

- [ ] **Step 1: Create the main workflow**

  1. Click "New Workflow"
  2. Name it exactly: `content-generation-main`
  3. Save

- [ ] **Step 2: Add the Webhook trigger node**

  1. Add node: **Webhook**
  2. Configuration:
     - HTTP Method: `POST`
     - Path: leave as auto-generated (N8N assigns a UUID path) — this is the URL the Supabase edge function calls
     - Response Mode: `Last Node` (the workflow will respond after all processing is complete)
     - Authentication: None (the edge function doesn't send auth headers to N8N)
  3. Save and copy the **Production Webhook URL** — you'll need this later to update the Supabase edge function secret `N8N_WEBHOOK_URL` if the URL changed.

  > Note: The existing webhook URL in Supabase is `https://n8n.srv1241655.hstgr.cloud/webhook/8b04b7d0-7c95-49be-bed9-43802219eb2f`. If N8N generates a new path for this workflow, update the edge function secret via: Supabase Dashboard → Edge Functions → generate-content → Secrets → N8N_WEBHOOK_URL.

- [ ] **Step 3: Add the DataForSEO Parse Page node**

  1. Add node: **DataForSEO** → **Parse Page** (or search "DataForSEO")
  2. Connect it after the Webhook node
  3. Configuration:
     - URL: `{{ $json.body.website_url }}` (reads from webhook POST body)
     - Enable JavaScript rendering: Yes (handles dynamic sites)
  4. Save

- [ ] **Step 4: Test the webhook + scrape**

  Send a test POST to the webhook URL:
  ```bash
  curl -X POST https://n8n.srv1241655.hstgr.cloud/webhook/YOUR_PATH \
    -H "Content-Type: application/json" \
    -d '{"user_id":"test-123","website_url":"https://example.com","survey_answers":[{"key":"business_type","value":"coach"}]}'
  ```
  Expected: DataForSEO node outputs scraped page content. Check the node's output panel in N8N. You should see `title`, `text`, `html` fields in the output.

---

## Task 3: Add the Summarize Agent to the Main Workflow

Wire a Claude AI Agent node that reads the scraped content + survey answers and outputs a structured business profile JSON.

- [ ] **Step 1: Add the AI Agent node (Summarize)**

  1. Add node: **AI Agent** (or **LangChain → AI Agent** depending on N8N version)
  2. Name the node: `Summarize Agent`
  3. Connect it after the DataForSEO node

- [ ] **Step 2: Configure the model**

  - Model: Claude (Anthropic) — `claude-sonnet-4-5` or latest available
  - Add your Anthropic API key credential if not already configured

- [ ] **Step 3: Set the System Prompt**

  Paste this exactly into the System Prompt field:

  ```
  You are a business analyst. Your job is to extract structured facts from a website and survey answers. 

  Rules:
  - Extract only facts and signals you can find in the provided content
  - Do not invent or assume anything not explicitly stated
  - If a field is unclear or missing, leave it as an empty string or empty array
  - Output ONLY valid JSON — no explanation, no markdown, no code blocks

  Output this exact JSON structure:
  {
    "business_name": "",
    "business_type": "coach | consultant | freelancer | agency | saas | other",
    "niche": "",
    "target_audience": "",
    "core_offer": "",
    "key_differentiators": [],
    "tone_and_voice": "formal | casual | inspirational | professional",
    "notable_phrases": [],
    "pain_points_addressed": [],
    "survey_insights": {
      "content_strategy": "",
      "willingness_to_pay": "",
      "preferred_features": ""
    }
  }
  ```

- [ ] **Step 4: Set the User Message (prompt)**

  In the "Prompt" or "User Message" field:

  ```
  Website content:
  {{ $('DataForSEO').item.json.text }}

  Survey answers from the business owner:
  {{ JSON.stringify($('Webhook').item.json.body.survey_answers) }}

  Extract the business profile as JSON.
  ```

- [ ] **Step 5: Add a JSON Parse node after the Summarize Agent**

  The AI agent outputs text. Parse it to a JSON object so downstream nodes can reference fields.

  1. Add node: **Code** (JavaScript)
  2. Name it: `Parse Business Profile`
  3. Connect after Summarize Agent
  4. Code:
  ```javascript
  const raw = $input.item.json.output || $input.item.json.text || $input.item.json.message;
  // Strip markdown code blocks if model wraps output
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return { json: JSON.parse(cleaned) };
  ```

- [ ] **Step 6: Test up to this node**

  Use the N8N "Test Workflow" button with the same curl payload from Task 2 Step 4. Check that `Parse Business Profile` outputs a valid JSON object with the expected fields.

---

## Task 4: Add the Plan Agent to the Main Workflow

Wire a Claude AI Agent node that reads the business profile and outputs a 3-post marketing plan.

- [ ] **Step 1: Add the AI Agent node (Plan)**

  1. Add node: **AI Agent**
  2. Name the node: `Plan Agent`
  3. Connect it after `Parse Business Profile`

- [ ] **Step 2: Configure the model**

  - Model: Claude — `claude-sonnet-4-5` (same credential as Summarize Agent)

- [ ] **Step 3: Set the System Prompt**

  ```
  You are a senior Hebrew marketing strategist. You plan social media content for Israeli business owners.

  You will receive a structured business profile. Plan exactly 3 social media posts:
  - Post 1 (value_post): A professional tip or insight from the owner's field. Teaches something useful.
  - Post 2 (trust_post): Builds trust and authority. Explains who the owner is and why they're credible.
  - Post 3 (cta_post): A soft call to action. An invitation — not pushy. Offers value with a gentle next step.

  For EACH post, define:
  - angle: The specific perspective or story angle to take
  - key_message: The single most important thing the reader should take away
  - hook: The opening line that stops the scroll (in Hebrew)
  - tone: One word — e.g. professional, warm, direct, inspiring
  - image_direction: A description of the visual that would accompany this post

  Rules:
  - Be specific to this business — no generic advice
  - Write hooks in Hebrew
  - Output ONLY valid JSON — no explanation, no markdown, no code blocks

  Output this exact JSON structure:
  {
    "value_post": { "angle": "", "key_message": "", "hook": "", "tone": "", "image_direction": "" },
    "trust_post": { "angle": "", "key_message": "", "hook": "", "tone": "", "image_direction": "" },
    "cta_post": { "angle": "", "key_message": "", "hook": "", "tone": "", "image_direction": "" }
  }
  ```

- [ ] **Step 4: Set the User Message**

  ```
  Business profile:
  {{ JSON.stringify($('Parse Business Profile').item.json) }}

  Create the 3-post marketing plan.
  ```

- [ ] **Step 5: Add a JSON Parse node after the Plan Agent**

  1. Add node: **Code** (JavaScript)
  2. Name it: `Parse Marketing Plan`
  3. Connect after Plan Agent
  4. Code:
  ```javascript
  const raw = $input.item.json.output || $input.item.json.text || $input.item.json.message;
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return { json: JSON.parse(cleaned) };
  ```

- [ ] **Step 6: Test up to this node**

  Run the test workflow again. Verify `Parse Marketing Plan` outputs a JSON object with `value_post`, `trust_post`, `cta_post` keys — each with `angle`, `key_message`, `hook`, `tone`, `image_direction`.

---

## Task 5: Wire Parallel Sub-Workflow Calls in Main Workflow

Split execution into 3 parallel branches, each calling one sub-workflow with the relevant post plan.

- [ ] **Step 1: Add 3 "Execute Sub-Workflow" nodes in parallel**

  From `Parse Marketing Plan`, add 3 separate **Execute Sub-Workflow** nodes (do NOT connect them in series — connect all 3 directly from `Parse Marketing Plan` to create parallel branches).

  Node 1:
  - Name: `Run Value Post`
  - Workflow: select `generate-value-post` (by the ID you noted in Task 1)
  - Input data to pass:
    ```json
    {
      "business_profile": "={{ JSON.stringify($('Parse Business Profile').item.json) }}",
      "post_plan": "={{ JSON.stringify($('Parse Marketing Plan').item.json.value_post) }}",
      "post_type": "value"
    }
    ```

  Node 2:
  - Name: `Run Trust Post`
  - Workflow: select `generate-trust-post`
  - Input data to pass:
    ```json
    {
      "business_profile": "={{ JSON.stringify($('Parse Business Profile').item.json) }}",
      "post_plan": "={{ JSON.stringify($('Parse Marketing Plan').item.json.trust_post) }}",
      "post_type": "trust"
    }
    ```

  Node 3:
  - Name: `Run CTA Post`
  - Workflow: select `generate-cta-post`
  - Input data to pass:
    ```json
    {
      "business_profile": "={{ JSON.stringify($('Parse Business Profile').item.json) }}",
      "post_plan": "={{ JSON.stringify($('Parse Marketing Plan').item.json.cta_post) }}",
      "post_type": "cta"
    }
    ```

- [ ] **Step 2: Add a Merge node**

  1. Add node: **Merge**
  2. Mode: `Append` (collects all 3 outputs into one array)
  3. Connect all 3 Execute Sub-Workflow nodes into this Merge node

- [ ] **Step 3: Add the final response Code node**

  1. Add node: **Code** (JavaScript)
  2. Name it: `Format Response`
  3. Connect after Merge
  4. Code:
  ```javascript
  // Merge node outputs an array of items, one per sub-workflow result
  const posts = $input.all().map(item => item.json);
  return { json: { posts } };
  ```

- [ ] **Step 4: Verify the Webhook node is set to respond with last node output**

  In the Webhook trigger node settings, confirm "Response Mode" is set to **"Last Node"**. This sends the `Format Response` node's output back to the Supabase edge function as the HTTP response.

---

## Task 6: Build the `generate-value-post` Sub-Workflow

Fill in the skeleton created in Task 1 with the Copywriter Agent, Image Prompt Agent, and Image API node.

- [ ] **Step 1: Open `generate-value-post` workflow**

  The trigger node ("When called by another workflow") is already there from Task 1. The input data arrives as `$input.item.json` with keys: `business_profile` (JSON string), `post_plan` (JSON string), `post_type` (string).

- [ ] **Step 2: Add a Parse Inputs node**

  1. Add node: **Code** (JavaScript)
  2. Name it: `Parse Inputs`
  3. Connect after trigger
  4. Code:
  ```javascript
  return {
    json: {
      business_profile: JSON.parse($input.item.json.business_profile),
      post_plan: JSON.parse($input.item.json.post_plan),
      post_type: $input.item.json.post_type
    }
  };
  ```

- [ ] **Step 3: Add the Copywriter Agent node**

  1. Add node: **AI Agent**
  2. Name it: `Copywriter Agent`
  3. Connect after Parse Inputs
  4. Model: Claude — `claude-sonnet-4-5`
  5. System Prompt:
  ```
  You are an expert Hebrew social media copywriter specializing in content for Israeli business owners.

  You will receive a business profile and a post plan. Write a ready-to-publish social media post.

  This is a VALUE post — it teaches something useful from the owner's expertise. It should feel like genuine advice from the owner, not an ad.

  Rules:
  - Write entirely in Hebrew
  - Match the tone and voice from the business profile
  - Use the hook from the post plan as the opening line
  - The post should be 100-200 words
  - End with a natural, non-pushy close
  - Decide the best channel: instagram (casual, visual, shorter), linkedin (professional, story-driven), facebook (warm, community-feel)
  - Output ONLY valid JSON — no explanation, no markdown, no code blocks

  Output this exact JSON structure:
  {
    "content": "",
    "copy": "",
    "channel_recommended": "instagram | linkedin | facebook"
  }

  Where:
  - content = the full post text in Hebrew, ready to publish
  - copy = a 1-line hook/tagline in Hebrew (can be the same as the hook or a refined version)
  - channel_recommended = the best platform for this post
  ```
  6. User Message:
  ```
  Business profile:
  {{ JSON.stringify($('Parse Inputs').item.json.business_profile) }}

  Post plan:
  {{ JSON.stringify($('Parse Inputs').item.json.post_plan) }}

  Write the value post.
  ```

- [ ] **Step 4: Parse Copywriter output**

  1. Add node: **Code**
  2. Name it: `Parse Post Copy`
  3. Connect after Copywriter Agent
  4. Code:
  ```javascript
  const raw = $input.item.json.output || $input.item.json.text || $input.item.json.message;
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const post = JSON.parse(cleaned);
  return {
    json: {
      ...post,
      post_type: $('Parse Inputs').item.json.post_type,
      image_direction: $('Parse Inputs').item.json.post_plan.image_direction,
      channel_recommended: post.channel_recommended
    }
  };
  ```

- [ ] **Step 5: Add the Image Prompt Agent node**

  1. Add node: **AI Agent**
  2. Name it: `Image Prompt Agent`
  3. Connect after Parse Post Copy
  4. Model: Claude — `claude-sonnet-4-5`
  5. System Prompt:
  ```
  You are an expert at writing prompts for AI image generation models.

  You will receive a social media post and an image direction. Write a detailed, optimized English prompt for an image generation model (DALL-E, Midjourney, or similar).

  Rules:
  - Write the prompt in English
  - Be specific: include subject, style, lighting, mood, composition
  - Match the channel: instagram = square 1:1, linkedin = landscape 16:9, facebook = square or landscape
  - The image should feel authentic and professional, not stock-photo generic
  - Avoid text in the image
  - Output ONLY valid JSON — no explanation, no markdown, no code blocks

  Output this exact JSON structure:
  { "image_prompt": "" }
  ```
  6. User Message:
  ```
  Post content (Hebrew):
  {{ $('Parse Post Copy').item.json.content }}

  Image direction from marketing plan:
  {{ $('Parse Post Copy').item.json.image_direction }}

  Channel: {{ $('Parse Post Copy').item.json.channel_recommended }}

  Write the image generation prompt.
  ```

- [ ] **Step 6: Parse Image Prompt output**

  1. Add node: **Code**
  2. Name it: `Parse Image Prompt`
  3. Connect after Image Prompt Agent
  4. Code:
  ```javascript
  const raw = $input.item.json.output || $input.item.json.text || $input.item.json.message;
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const result = JSON.parse(cleaned);
  return { json: { image_prompt: result.image_prompt } };
  ```

- [ ] **Step 7: Add the Image API node (DALL-E placeholder)**

  This node will be swapped when the final image provider is chosen. For now, wire DALL-E.

  1. Add node: **HTTP Request**
  2. Name it: `Image API`
  3. Connect after Parse Image Prompt
  4. Configuration:
     - Method: `POST`
     - URL: `https://api.openai.com/v1/images/generations`
     - Authentication: Header Auth → `Authorization: Bearer YOUR_OPENAI_KEY`
     - Body (JSON):
     ```json
     {
       "model": "dall-e-3",
       "prompt": "={{ $('Parse Image Prompt').item.json.image_prompt }}",
       "n": 1,
       "size": "1024x1024"
     }
     ```
  5. Add **Error Handling**: On error, continue (do not fail the workflow). Set output to `{ "image_url": null }`.

- [ ] **Step 8: Add the final output Code node**

  1. Add node: **Code**
  2. Name it: `Format Post Output`
  3. Connect after Image API
  4. Code:
  ```javascript
  // Image API may have succeeded or failed
  let image_url = null;
  try {
    image_url = $input.item.json.data?.[0]?.url || null;
  } catch (e) {
    image_url = null;
  }

  return {
    json: {
      post_type: $('Parse Inputs').item.json.post_type,
      content: $('Parse Post Copy').item.json.content,
      copy: $('Parse Post Copy').item.json.copy,
      channel_recommended: $('Parse Post Copy').item.json.channel_recommended,
      image_url
    }
  };
  ```

- [ ] **Step 9: Activate the sub-workflow**

  Toggle the workflow to **Active** (top right switch in N8N). Sub-workflows must be active to be callable.

- [ ] **Step 10: Test the sub-workflow in isolation**

  Use N8N's "Test Workflow" on this sub-workflow with this mock input on the trigger node:
  ```json
  {
    "business_profile": "{\"business_name\":\"Tal Cohen Coaching\",\"business_type\":\"coach\",\"niche\":\"leadership\",\"target_audience\":\"managers\",\"core_offer\":\"1-on-1 coaching\",\"key_differentiators\":[\"10 years experience\"],\"tone_and_voice\":\"professional\",\"notable_phrases\":[\"lead with clarity\"],\"pain_points_addressed\":[\"team conflict\"],\"survey_insights\":{\"content_strategy\":\"none\",\"willingness_to_pay\":\"yes\",\"preferred_features\":\"auto-posting\"}}",
    "post_plan": "{\"angle\":\"leadership under pressure\",\"key_message\":\"good leaders stay calm\",\"hook\":\"מה מבדיל מנהל טוב ממנהל מצוין?\",\"tone\":\"professional\",\"image_direction\":\"calm executive at desk, modern office\"}",
    "post_type": "value"
  }
  ```
  Expected: `Format Post Output` produces `{ post_type, content, copy, channel_recommended, image_url }`.

---

## Task 7: Build `generate-trust-post` Sub-Workflow

Identical to Task 6 except the Copywriter Agent system prompt is different.

- [ ] **Step 1: Open `generate-trust-post` workflow and repeat Task 6 Steps 1-6 and 8-10**

  All nodes are identical to `generate-value-post` EXCEPT the Copywriter Agent system prompt (Step 3).

- [ ] **Step 2: Replace the Copywriter Agent System Prompt with this**

  ```
  You are an expert Hebrew social media copywriter specializing in content for Israeli business owners.

  You will receive a business profile and a post plan. Write a ready-to-publish social media post.

  This is a TRUST post — it builds credibility and connection. It explains who the owner is, their story, their experience, and why people trust them. It should feel personal and genuine, not boastful.

  Rules:
  - Write entirely in Hebrew
  - Match the tone and voice from the business profile
  - Use the hook from the post plan as the opening line
  - The post should be 100-200 words
  - Include a personal story element or specific achievement
  - End with a warm, human close
  - Decide the best channel: instagram (personal, story-driven), linkedin (professional credibility), facebook (community, warmth)
  - Output ONLY valid JSON — no explanation, no markdown, no code blocks

  Output this exact JSON structure:
  {
    "content": "",
    "copy": "",
    "channel_recommended": "instagram | linkedin | facebook"
  }
  ```

- [ ] **Step 3: Update the Copywriter Agent user message for trust post**

  ```
  Business profile:
  {{ JSON.stringify($('Parse Inputs').item.json.business_profile) }}

  Post plan:
  {{ JSON.stringify($('Parse Inputs').item.json.post_plan) }}

  Write the trust-building post.
  ```

- [ ] **Step 4: Activate and test with mock input**

  Use the same mock input from Task 6 Step 10, but change `post_type` to `"trust"` and update `post_plan.hook` to a trust-oriented hook like `"הדרך שלי לעולם הקואצ'ינג לא הייתה ישרה"`.

---

## Task 8: Build `generate-cta-post` Sub-Workflow

Identical to Task 6 except the Copywriter Agent system prompt is for a soft CTA post.

- [ ] **Step 1: Open `generate-cta-post` workflow and repeat Task 6 Steps 1-6 and 8-10**

- [ ] **Step 2: Replace the Copywriter Agent System Prompt with this**

  ```
  You are an expert Hebrew social media copywriter specializing in content for Israeli business owners.

  You will receive a business profile and a post plan. Write a ready-to-publish social media post.

  This is a CTA post — a soft call to action. It invites the reader to take a next step without being pushy or salesy. It should feel helpful and natural, like a friend recommending something good.

  Rules:
  - Write entirely in Hebrew
  - Match the tone and voice from the business profile
  - Use the hook from the post plan as the opening line
  - The post should be 80-150 words (shorter and punchier than other posts)
  - The CTA should offer clear value: "join", "schedule a call", "download", "DM me" etc.
  - Never use aggressive sales language
  - Decide the best channel: instagram (short, visual CTA), linkedin (professional invitation), facebook (warm community CTA)
  - Output ONLY valid JSON — no explanation, no markdown, no code blocks

  Output this exact JSON structure:
  {
    "content": "",
    "copy": "",
    "channel_recommended": "instagram | linkedin | facebook"
  }
  ```

- [ ] **Step 3: Update the Copywriter Agent user message for CTA post**

  ```
  Business profile:
  {{ JSON.stringify($('Parse Inputs').item.json.business_profile) }}

  Post plan:
  {{ JSON.stringify($('Parse Inputs').item.json.post_plan) }}

  Write the soft CTA post.
  ```

- [ ] **Step 4: Activate and test with mock input**

  Use the same mock input from Task 6 Step 10, but change `post_type` to `"cta"`.

---

## Task 9: Add Error Handling to Main Workflow

Wire error paths in the main workflow so failures return a Hebrew error message instead of timing out.

- [ ] **Step 1: Add error output on DataForSEO node**

  1. In the DataForSEO node settings, enable "Continue on Fail"
  2. Add a downstream **IF** node: `Parse Scrape Result`
     - Condition: `{{ $json.text }}` is not empty
     - True branch: continues to Summarize Agent
     - False branch: goes to error response

- [ ] **Step 2: Add error response node**

  1. Add node: **Respond to Webhook** (or **Set** + connect to Webhook response)
  2. Name it: `Error Response`
  3. Connect from false branch of `Parse Scrape Result`
  4. Response body:
  ```json
  { "error": "לא הצלחנו לסרוק את האתר שלך. אנא בדוק שהכתובת נכונה ונסה שוב." }
  ```
  5. HTTP Status Code: `422`

- [ ] **Step 3: Set retry on Summarize Agent and Plan Agent**

  In each AI Agent node settings (Summarize Agent, Plan Agent):
  - Enable "Retry on Fail": 1 retry, 2 second wait

- [ ] **Step 4: Set retry on all 3 Execute Sub-Workflow nodes**

  In each Execute Sub-Workflow node (Run Value Post, Run Trust Post, Run CTA Post):
  - Enable "Continue on Fail" (so one failing post doesn't kill the whole workflow)

- [ ] **Step 5: Update Format Response node to handle partial failures**

  Replace the `Format Response` node code with:
  ```javascript
  const posts = $input.all()
    .map(item => item.json)
    .filter(p => p && p.post_type); // drop any failed sub-workflow outputs

  if (posts.length === 0) {
    return { json: { error: "שגיאה ביצירת התוכן. אנא נסה שוב." } };
  }

  return { json: { posts } };
  ```

---

## Task 10: End-to-End Test

Test the complete pipeline from webhook to final response, simulating exactly what the Supabase edge function sends.

- [ ] **Step 1: Activate the main workflow**

  Toggle `content-generation-main` to **Active**.

- [ ] **Step 2: Send a full test request**

  ```bash
  curl -X POST https://n8n.srv1241655.hstgr.cloud/webhook/YOUR_WEBHOOK_PATH \
    -H "Content-Type: application/json" \
    -d '{
      "user_id": "00000000-0000-0000-0000-000000000001",
      "website_url": "https://www.apple.com",
      "survey_answers": [
        {"key": "business_type", "value": "saas"},
        {"key": "content_pain_point", "value": "no time to write"},
        {"key": "current_posting_frequency", "value": "never"},
        {"key": "preferred_channel", "value": "linkedin"},
        {"key": "target_audience", "value": "enterprise buyers"},
        {"key": "willing_to_pay", "value": "yes"},
        {"key": "preferred_features", "value": "auto-posting"}
      ]
    }'
  ```

- [ ] **Step 3: Verify the response**

  Expected response (within 40s):
  ```json
  {
    "posts": [
      { "post_type": "value", "content": "...", "copy": "...", "image_url": "...", "channel_recommended": "linkedin" },
      { "post_type": "trust", "content": "...", "copy": "...", "image_url": "...", "channel_recommended": "linkedin" },
      { "post_type": "cta",   "content": "...", "copy": "...", "image_url": "...", "channel_recommended": "linkedin" }
    ]
  }
  ```
  Check:
  - Exactly 3 posts
  - All `content` fields are in Hebrew
  - `post_type` values are `value`, `trust`, `cta`
  - `channel_recommended` is one of `instagram`, `linkedin`, `facebook`
  - `image_url` is a URL string or null
  - Response time is under 55 seconds

- [ ] **Step 4: Verify Supabase edge function compatibility**

  The edge function at `https://aslqxpoqajxbvkogklan.supabase.co/functions/v1/generate-content` expects this exact shape. If the N8N webhook URL changed in Step 2 of Task 2, update the edge function secret now:

  ```bash
  # From the Validation 1 project directory
  supabase secrets set N8N_WEBHOOK_URL=https://n8n.srv1241655.hstgr.cloud/webhook/YOUR_NEW_PATH \
    --project-ref aslqxpoqajxbvkogklan
  ```

- [ ] **Step 5: Run a full end-to-end test through the frontend**

  1. Start the Next.js dev server: `npm run dev` in `/Users/noamcarter/Desktop/Validation 1`
  2. Open `http://localhost:3000`
  3. Enter a real Israeli business website URL (e.g., a coach or consultant site)
  4. Complete all 7 survey questions
  5. Watch the loading screen (~20-40s)
  6. Verify 3 post cards appear on the WOW screen with Hebrew content
  7. Click "העתק פוסט" on each — verify clipboard copy works
  8. Navigate to `/waitlist`

---

## Timing Budget Reference

| Stage | Target |
|---|---|
| DataForSEO scrape | ≤5s |
| Summarize Agent | ≤6s |
| Plan Agent | ≤8s |
| 3 sub-workflows (parallel) | ≤20s |
| Overhead | ≤2s |
| **Total** | **≤40s** (hard limit: 55s) |

---

## Image API Swap Guide

When switching from DALL-E to another provider, only change the **Image API** node in each of the 3 sub-workflows:

**Banana / Replicate:**
- URL: `https://api.banana.dev/run/YOUR_MODEL_KEY` (or equivalent)
- Body: `{ "modelInputs": { "prompt": "={{ $('Parse Image Prompt').item.json.image_prompt }}" } }`
- Parse response: `$json.modelOutputs[0].image` (adjust per provider)

**OpenAI DALL-E (current placeholder):**
- Response path: `$json.data[0].url`

The `Format Post Output` node already reads `image_url` defensively — just update the path it reads from the API response.
