---
description: Generate a programmatic ad content pipeline (Cody Schneider method)
argument-hint: <niche or product>
---

You are activating the Programmatic Ad Pipeline for: $ARGUMENTS

Follow this sequence:

1. **Research the niche** — Search memory and web for:
   - Core pain points and emotional triggers
   - Language patterns the audience uses (exact words/phrases)
   - Top 3-5 competitors and their positioning
   - What makes buyers say yes vs. no

2. **Generate 20 content angles** covering:
   - Problems (what keeps them up at night)
   - Solutions (what they wish existed)
   - Objections (what stops them from buying)
   - Social proof (what peers are saying)
   - Urgency/scarcity hooks

3. **For each angle, create:**
   - Hook (first 3 seconds — pattern interrupt)
   - Body (problem → agitate → solve)
   - CTA (one clear action)

4. **Cluster into 5 campaign themes** with a descriptive name for each

5. **Output as structured JSON** ready for ad platform upload:
```json
{
  "niche": "...",
  "campaign_themes": [
    {
      "theme_name": "...",
      "angles": [
        {
          "hook": "...",
          "body": "...",
          "cta": "...",
          "platform_fit": ["meta", "tiktok", "youtube"]
        }
      ]
    }
  ]
}
```

Save the campaign brief to memory: `marketing:ad-campaign:[niche]:[date]`
