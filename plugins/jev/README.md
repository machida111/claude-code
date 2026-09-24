# jev

An MCP server that exposes the [Jev](https://developers.cloudflare.com/ai/models/typesafe/jev/) API (TypeSafe AI) to Claude Code.

Jev evaluates a piece of state against typed questions and returns structured decisions instead of prose, which makes it useful for classification, routing, and rubric grading.

## Tool

### `jev_evaluate`

| Argument    | Type             | Description                                   |
|-------------|------------------|-----------------------------------------------|
| `state`     | string \| object | The content to evaluate                       |
| `questions` | object           | Map of question key → question definition     |

Each question has a `type`, `instructions`, and `criteria`:

| `type`   | `criteria`                                  | Answer                                   |
|----------|---------------------------------------------|------------------------------------------|
| `noul`   | `{"true": "...", "false": "..."}`           | `noul`: probability (0–1) of true        |
| `choice` | `{"<option key>": "<description>", ...}`    | `choice` + `confidence`                  |
| `score`  | `["level 0", "level 1", ...]`               | `score` + `probabilities`                |

Example arguments:

```json
{
  "state": "Help! My payouts have been failing for 3 days.",
  "questions": {
    "is_urgent": {
      "type": "noul",
      "instructions": "Does this convey urgency?",
      "criteria": { "true": "Explicitly time-sensitive", "false": "No urgency expressed" }
    },
    "team": {
      "type": "choice",
      "instructions": "Which team should handle this?",
      "criteria": { "billing": "Payments and payouts", "support": "General questions" }
    }
  }
}
```

## Setup

Requires Node.js 18+. The server has no npm dependencies.

By default, requests go to Jev on Cloudflare Workers AI. Set these before starting Claude Code:

```bash
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_API_TOKEN=...   # token with Workers AI access
```

To use a different endpoint that accepts the same `{ "model", "input": { "state", "questions" } }` request body:

| Variable        | Description                                     |
|-----------------|-------------------------------------------------|
| `JEV_API_URL`   | Endpoint URL (replaces the Cloudflare URL)      |
| `JEV_API_TOKEN` | Bearer token for `JEV_API_URL`                  |
| `JEV_MODEL`     | Model name to send (default: `typesafe/jev`)    |

Then install the plugin with `/plugin` and ask Claude to use `jev_evaluate`.
