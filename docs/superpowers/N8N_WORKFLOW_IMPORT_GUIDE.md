# N8N Workflow Import Guide

## Overview

This guide explains how to import the 4 N8N workflows into your N8N instance. The workflows are provided as JSON files in `/docs/superpowers/n8n-workflows/` and are ready to import via the N8N UI.

**Workflows to import:**
1. `generate-value-post.json` — Sub-workflow for value posts
2. `generate-trust-post.json` — Sub-workflow for trust posts
3. `generate-cta-post.json` — Sub-workflow for CTA posts
4. `content-generation-main.json` — Main orchestration workflow

---

## Prerequisites

- Access to N8N instance at `https://n8n.srv1241655.hstgr.cloud`
- Admin or workflow creation permissions
- API keys configured in N8N:
  - **Anthropic API Key** (Claude API) — for AI agents
  - **OpenAI API Key** (DALL-E) — for image generation (optional for MVP, can be null)

---

## Import Instructions

### Step 1: Import Sub-Workflows (Do These First)

The main workflow references the sub-workflows by ID, so you must import and activate the sub-workflows before importing the main workflow.

#### 1a. Import `generate-value-post`

1. Open N8N: https://n8n.srv1241655.hstgr.cloud
2. Click **"New Workflow"** in the top-left
3. Click **"Import"** (or use the menu: Workflows → Import)
4. Open the file: `/docs/superpowers/n8n-workflows/generate-value-post.json`
5. The workflow will populate with all nodes and connections
6. Click **"Import"**
7. In the top-right, click **"Save"** (use keyboard shortcut Cmd+S or Ctrl+S)
8. **Note the workflow ID** from the URL: `https://n8n.srv1241655.hstgr.cloud/workflows/[ID]` — you'll need this for the main workflow
9. Toggle the workflow to **Active** (switch in top-right corner)
10. Click **Save** again

#### 1b. Import `generate-trust-post`

Repeat steps 1-10 above, but import `generate-trust-post.json` instead. Note its workflow ID.

#### 1c. Import `generate-cta-post`

Repeat steps 1-10 above, but import `generate-cta-post.json` instead. Note its workflow ID.

**Save all 3 workflow IDs:**
```
generate-value-post ID:  [ID]
generate-trust-post ID:  [ID]
generate-cta-post ID:    [ID]
```

---

### Step 2: Import Main Workflow

#### 2a. Prepare the Main Workflow JSON

Before importing, you need to replace the placeholder workflow IDs in `content-generation-main.json`:

1. Open `content-generation-main.json` in a text editor
2. Find these 3 lines (around line 350-380):
   ```json
   "workflowId": "REPLACE_WITH_VALUE_POST_WORKFLOW_ID"
   "workflowId": "REPLACE_WITH_TRUST_POST_WORKFLOW_ID"
   "workflowId": "REPLACE_WITH_CTA_POST_WORKFLOW_ID"
   ```
3. Replace with the actual IDs you saved in Step 1:
   - `REPLACE_WITH_VALUE_POST_WORKFLOW_ID` → (e.g., `123`)
   - `REPLACE_WITH_TRUST_POST_WORKFLOW_ID` → (e.g., `124`)
   - `REPLACE_WITH_CTA_POST_WORKFLOW_ID` → (e.g., `125`)
4. **Save the file**

#### 2b. Import into N8N

1. In N8N, click **"New Workflow"**
2. Click **"Import"**
3. Open the modified `content-generation-main.json` file
4. Click **"Import"**
5. Verify the workflow has all nodes:
   - Webhook
   - DataForSEO Parse Page
   - Check Scrape Success
   - Error Response (Scrape Failed)
   - Summarize Agent
   - Parse Business Profile
   - Plan Agent
   - Parse Marketing Plan
   - Run Value Post
   - Run Trust Post
   - Run CTA Post
   - Merge Results
   - Format Response
6. Click **"Save"** (Cmd+S / Ctrl+S)
7. **Copy the Webhook URL** (click the Webhook node → "Production Webhook URL") — you'll need this for Supabase

---

### Step 3: Configure Credentials in N8N

The workflows use Claude API and optionally DALL-E. These must be configured as credentials in N8N:

#### 3a. Add Anthropic API Key (Claude)

1. In N8N, go to **Settings** (gear icon) → **Credentials**
2. Click **"New credential"**
3. Search for **"Anthropic API"** (or similar)
4. Name: `anthropic_api_key`
5. Enter your Anthropic API key: `sk-ant-...`
6. Click **"Save"**

#### 3b. Add OpenAI API Key (DALL-E)

1. Click **"New credential"** again
2. Search for **"OpenAI API"**
3. Name: `openai_api_key`
4. Enter your OpenAI API key: `sk-...`
5. Click **"Save"**

---

### Step 4: Wire Credentials to Nodes

For each AI Agent node (Summarize, Plan, Copywriter, Image Prompt) in all 4 workflows:

1. Click on the AI Agent node
2. In the right panel, find the **"Credential"** dropdown
3. Select the corresponding credential:
   - For Claude nodes (Summarize, Plan, Copywriter, Image Prompt): select `anthropic_api_key`
   - For Image API nodes: select `openai_api_key` (if using DALL-E)
4. Click **"Save"**

---

### Step 5: Activate Main Workflow

1. Open the `content-generation-main` workflow
2. Toggle the **Active** switch in the top-right to **ON**
3. Click **"Save"**

---

### Step 6: Copy Webhook URL for Supabase

1. Open the `content-generation-main` workflow
2. Click on the **Webhook** node
3. Copy the **"Production Webhook URL"** (usually at the bottom of the node panel)
4. Update the Supabase edge function secret:

```bash
supabase secrets set N8N_WEBHOOK_URL="https://n8n.srv1241655.hstgr.cloud/webhook/[YOUR_PATH]" \
  --project-ref aslqxpoqajxbvkogklan
```

Or manually:
- Go to Supabase Dashboard → Edge Functions → `generate-content` → Secrets
- Update `N8N_WEBHOOK_URL` with the new webhook URL
- Click **"Save"**

---

## Testing the Workflows

### Test 1: Sub-Workflow Test (Optional)

Test each sub-workflow in isolation:

1. Open `generate-value-post` workflow
2. Click **"Test Workflow"** in the top-right
3. Mock input (click the trigger node → "Execute this node"):
```json
{
  "business_profile": "{\"business_name\":\"Tal Cohen Coaching\",\"business_type\":\"coach\",\"niche\":\"leadership\",\"target_audience\":\"managers\",\"core_offer\":\"1-on-1 coaching\",\"key_differentiators\":[\"10 years experience\"],\"tone_and_voice\":\"professional\",\"notable_phrases\":[\"lead with clarity\"],\"pain_points_addressed\":[\"team conflict\"],\"survey_insights\":{\"content_strategy\":\"none\",\"willingness_to_pay\":\"yes\",\"preferred_features\":\"auto-posting\"}}",
  "post_plan": "{\"angle\":\"leadership under pressure\",\"key_message\":\"good leaders stay calm\",\"hook\":\"מה מבדיל מנהל טוב ממנהל מצוין?\",\"tone\":\"professional\",\"image_direction\":\"calm executive at desk, modern office\"}",
  "post_type": "value"
}
```
4. Click **"Execute"** and verify output

### Test 2: Main Workflow Test

1. Open `content-generation-main` workflow
2. Copy the Webhook URL
3. Send a test POST request:

```bash
curl -X POST "https://n8n.srv1241655.hstgr.cloud/webhook/[YOUR_PATH]" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-123",
    "website_url": "https://www.example.com",
    "survey_answers": [
      {"key": "business_type", "value": "saas"},
      {"key": "niche", "value": "project management"},
      {"key": "target_audience", "value": "enterprise teams"}
    ]
  }'
```

**Expected response (within 40s):**
```json
{
  "posts": [
    {
      "post_type": "value",
      "content": "Hebrew post text...",
      "copy": "Hebrew tagline...",
      "channel_recommended": "linkedin",
      "image_url": "https://... or null"
    },
    {
      "post_type": "trust",
      "content": "...",
      "copy": "...",
      "channel_recommended": "linkedin",
      "image_url": "..."
    },
    {
      "post_type": "cta",
      "content": "...",
      "copy": "...",
      "channel_recommended": "linkedin",
      "image_url": "..."
    }
  ]
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Webhook node not found** | N8N version might differ. Use "HTTP Request" node as trigger with POST method instead. |
| **Credential not showing in dropdown** | Ensure credential is saved. Go to Settings → Credentials, verify it exists, then try again. |
| **Sub-workflow call fails** | Check the workflow ID is correct. Verify sub-workflow is Active. Try running sub-workflow in isolation first. |
| **Image API returns 401** | OpenAI API key is invalid or expired. Check key in Settings → Credentials. |
| **Claude API returns error** | Anthropic API key is invalid. Verify the key starts with `sk-ant-`. |
| **Timeout (>55s)** | One or more agents is slow. Check N8N execution logs. Try with a smaller/simpler website URL first. |
| **DataForSEO node not found** | If unavailable, replace with HTTP Request node that fetches the page HTML directly. |

---

## Node Configuration Details

### Copywriter Agent Nodes

Each Copywriter Agent (in the 3 sub-workflows) has a different system prompt:
- **Value Post:** Teaches expertise, value-driven
- **Trust Post:** Personal story, credibility-focused
- **CTA Post:** Soft call-to-action, helpful invitation

All use the same model: `claude-sonnet-4-5`

### Image Prompt Agent

Translates the `image_direction` from the Plan Agent into a detailed English prompt for image generation.

### Image API Node

Currently configured for DALL-E 3. Can be swapped for:
- **Banana.dev** — update URL and response parsing
- **Replicate** — update URL and response parsing
- **Midjourney API** — update endpoint and auth

See the spec for swap instructions in `/docs/superpowers/specs/2026-05-02-n8n-workflow-design.md`.

---

## Next Steps

1. **Import all 4 workflows** using the steps above
2. **Test with a real website** (Israeli business site recommended)
3. **Verify Hebrew content quality** — check that posts are natural and sound like the business owner
4. **Monitor timing** — ensure total execution is under 55 seconds
5. **Check image generation** — verify DALL-E is producing relevant images or disable if not needed
6. **Set up PostHog tracking** (optional) — add analytics events to monitor funnel performance

---

## Files Reference

| File | Purpose |
|------|---------|
| `generate-value-post.json` | Sub-workflow for value posts |
| `generate-trust-post.json` | Sub-workflow for trust posts |
| `generate-cta-post.json` | Sub-workflow for CTA posts |
| `content-generation-main.json` | Main orchestration workflow |
| `2026-05-02-n8n-workflow-design.md` | Workflow architecture spec |
| `2026-05-02-n8n-workflow-implementation.md` | Step-by-step implementation plan |

---

**Last Updated:** 2026-05-02  
**Status:** Ready for manual import into N8N instance
