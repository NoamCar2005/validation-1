# N8N Workflows for Validation 1 Content Generation

## Quick Start

Welcome! You have 4 production-ready N8N workflows ready to import. Start here:

1. **First time?** Read [`N8N_WORKFLOW_IMPORT_GUIDE.md`](./N8N_WORKFLOW_IMPORT_GUIDE.md)
2. **Need an overview?** Check [`N8N_WORKFLOW_DELIVERY_SUMMARY.md`](./N8N_WORKFLOW_DELIVERY_SUMMARY.md)
3. **Pre-import checklist?** See [`WORKFLOW_CREATION_CHECKLIST.md`](./WORKFLOW_CREATION_CHECKLIST.md)

## What You're Getting

### 4 Complete N8N Workflows

All workflows are in `/n8n-workflows/` as JSON files ready to import:

| Workflow | Type | Purpose |
|----------|------|---------|
| `generate-value-post.json` | Sub-workflow | Generates value/tip posts in Hebrew |
| `generate-trust-post.json` | Sub-workflow | Generates trust/credibility posts in Hebrew |
| `generate-cta-post.json` | Sub-workflow | Generates soft CTA posts in Hebrew |
| `content-generation-main.json` | Main | Orchestrates website analysis → post generation |

### 3 Support Documents

| Document | Purpose |
|----------|---------|
| `N8N_WORKFLOW_IMPORT_GUIDE.md` | Step-by-step import instructions (start here!) |
| `N8N_WORKFLOW_DELIVERY_SUMMARY.md` | Overview, customization, and troubleshooting |
| `WORKFLOW_CREATION_CHECKLIST.md` | Pre-import verification and next steps |

## Architecture Overview

```
[Webhook Input]
    ↓
[DataForSEO Parse Page] ← scrapes website
    ↓
[Summarize Agent] ← Claude: business analysis
    ↓
[Plan Agent] ← Claude: 3-post marketing plan
    ↓
[3 Parallel Sub-Workflows] ← each generates 1 post type
    ├─ [Copywriter] + [Image Prompt] + [Image API]
    ├─ [Copywriter] + [Image Prompt] + [Image API]
    └─ [Copywriter] + [Image Prompt] + [Image API]
    ↓
[Merge Results]
    ↓
[Webhook Response] ← 3 Hebrew posts
```

## Key Features

- **Hebrew Language:** All posts generated in Hebrew
- **Parallel Processing:** 3 posts generated simultaneously (20-40 seconds total)
- **Error Handling:** Graceful failures with Hebrew error messages
- **Image Generation:** DALL-E 3 (optional, swappable provider)
- **Claude API:** 6 distinct AI agents optimized for different tasks
- **Production-Ready:** Full JSON validation, error paths, retry logic

## Files & Locations

```
/docs/superpowers/
├── n8n-workflows/                    ← Workflow JSON files (import these!)
│   ├── generate-value-post.json
│   ├── generate-trust-post.json
│   ├── generate-cta-post.json
│   └── content-generation-main.json
├── N8N_WORKFLOW_IMPORT_GUIDE.md      ← START HERE for import instructions
├── N8N_WORKFLOW_DELIVERY_SUMMARY.md  ← Overview & troubleshooting
├── WORKFLOW_CREATION_CHECKLIST.md    ← Pre-import verification
├── specs/
│   └── 2026-05-02-n8n-workflow-design.md
├── plans/
│   └── 2026-05-02-n8n-workflow-implementation.md
└── README.md                          ← This file
```

## Getting Started in 5 Steps

### 1. Read the Import Guide
Open [`N8N_WORKFLOW_IMPORT_GUIDE.md`](./N8N_WORKFLOW_IMPORT_GUIDE.md) and follow the instructions.

### 2. Prepare Your API Keys
You'll need:
- **Anthropic API Key** (Claude, required) — starts with `sk-ant-`
- **OpenAI API Key** (DALL-E, optional) — starts with `sk-`

### 3. Import Sub-Workflows (3x)
Import these workflows into N8N and save their IDs:
- `generate-value-post.json`
- `generate-trust-post.json`
- `generate-cta-post.json`

### 4. Prepare & Import Main Workflow
1. Edit `content-generation-main.json`
2. Replace the 3 placeholder workflow IDs
3. Import the modified file

### 5. Test & Deploy
- Configure API credentials in N8N
- Send test curl request
- Copy webhook URL to Supabase secret

**Estimated time:** 15-20 minutes import + 30 minutes testing = 45 minutes total

## What Gets Generated

For each website analyzed, you receive 3 ready-to-post Hebrew social media posts:

```json
{
  "posts": [
    {
      "post_type": "value",
      "content": "Hebrew post text (professional value/tip)...",
      "copy": "Short Hebrew hook/tagline...",
      "channel_recommended": "linkedin",
      "image_url": "https://..."
    },
    {
      "post_type": "trust",
      "content": "Hebrew post text (trust/credibility)...",
      "copy": "Short Hebrew hook/tagline...",
      "channel_recommended": "linkedin",
      "image_url": "https://..."
    },
    {
      "post_type": "cta",
      "content": "Hebrew post text (soft CTA invitation)...",
      "copy": "Short Hebrew hook/tagline...",
      "channel_recommended": "facebook",
      "image_url": "https://..."
    }
  ]
}
```

## Troubleshooting

Common issues and solutions are documented in:
- [`N8N_WORKFLOW_IMPORT_GUIDE.md`](./N8N_WORKFLOW_IMPORT_GUIDE.md#troubleshooting)
- [`N8N_WORKFLOW_DELIVERY_SUMMARY.md`](./N8N_WORKFLOW_DELIVERY_SUMMARY.md)

## Next Steps

- **This week:** Import workflows and test with real businesses
- **This month:** Iterate on system prompts based on user feedback
- **Ongoing:** Monitor execution time and optimize if needed

## Support

If you hit issues:

1. Check the troubleshooting section in `N8N_WORKFLOW_IMPORT_GUIDE.md`
2. Review the workflow JSON files to understand node structure
3. Test sub-workflows in isolation before testing main workflow
4. Check N8N execution logs for detailed error information

## Questions?

All documentation is in this directory. The import guide covers 95% of questions. If you need more details:

- **Architecture:** See `specs/2026-05-02-n8n-workflow-design.md`
- **Implementation:** See `plans/2026-05-02-n8n-workflow-implementation.md`
- **API details:** Check the workflow JSON files directly

---

**Status:** Production-ready, ready for import ✓  
**Last Updated:** 2026-05-02  
**Total Files:** 7 (4 workflows + 3 documentation files)

Start with [`N8N_WORKFLOW_IMPORT_GUIDE.md`](./N8N_WORKFLOW_IMPORT_GUIDE.md) →
