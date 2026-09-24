#!/usr/bin/env node
// Minimal, dependency-free MCP server (stdio, newline-delimited JSON-RPC)
// that exposes the Jev API as a single `jev_evaluate` tool.
//
// Configuration (environment variables):
//   CLOUDFLARE_ACCOUNT_ID  Cloudflare account that runs the model
//   CLOUDFLARE_API_TOKEN   API token with Workers AI access
//   JEV_API_URL            Optional. Overrides the endpoint URL entirely
//   JEV_API_TOKEN          Optional. Bearer token used with JEV_API_URL
//   JEV_MODEL              Optional. Defaults to "typesafe/jev"

import { createInterface } from "node:readline";

const SERVER_INFO = { name: "jev", version: "1.0.0" };
const DEFAULT_PROTOCOL_VERSION = "2025-06-18";
const REQUEST_TIMEOUT_MS = 30_000;

const QUESTION_SCHEMA = {
  type: "object",
  required: ["type", "instructions", "criteria"],
  properties: {
    type: {
      type: "string",
      enum: ["noul", "choice", "score"],
      description:
        'noul = boolean probability, choice = pick one option key, score = pick a level on an ordered scale',
    },
    instructions: {
      type: "string",
      description: "The question to evaluate against the state.",
    },
    criteria: {
      description:
        'noul: {"true": "...", "false": "..."}; choice: {"<option key>": "<description>", ...}; score: ["level 0", "level 1", ...]',
      oneOf: [
        { type: "object", additionalProperties: { type: "string" } },
        { type: "array", items: { type: "string" }, minItems: 2 },
      ],
    },
  },
};

const TOOLS = [
  {
    name: "jev_evaluate",
    description:
      "Evaluate a piece of state (text or JSON) against one or more typed questions with the Jev model. " +
      "Returns a structured answer per question: `noul` (probability 0-1 that the answer is true), " +
      "`choice` (selected option key + confidence), or `score` (level on the given scale + probabilities). " +
      "Questions are evaluated in parallel in a single request. Use for classification, routing, and rubric grading.",
    inputSchema: {
      type: "object",
      required: ["state", "questions"],
      properties: {
        state: {
          description: "The content to evaluate: a string or a JSON object.",
          oneOf: [{ type: "string" }, { type: "object" }],
        },
        questions: {
          type: "object",
          description: "Map of question key -> question definition.",
          minProperties: 1,
          additionalProperties: QUESTION_SCHEMA,
        },
      },
    },
  },
];

function endpoint() {
  if (process.env.JEV_API_URL) {
    return {
      url: process.env.JEV_API_URL,
      token: process.env.JEV_API_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN,
    };
  }
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token) {
    throw new Error(
      "Jev API is not configured: set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (or JEV_API_URL and JEV_API_TOKEN).",
    );
  }
  return {
    url: `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/ai/run`,
    token,
  };
}

function validateQuestions(questions) {
  if (!questions || typeof questions !== "object" || Array.isArray(questions)) {
    throw new Error("`questions` must be an object mapping keys to question definitions.");
  }
  const keys = Object.keys(questions);
  if (keys.length === 0) throw new Error("`questions` must contain at least one question.");
  for (const key of keys) {
    const q = questions[key];
    if (!q || typeof q !== "object") throw new Error(`Question "${key}" must be an object.`);
    if (!["noul", "choice", "score"].includes(q.type)) {
      throw new Error(`Question "${key}": type must be one of noul, choice, score.`);
    }
    if (typeof q.instructions !== "string" || !q.instructions) {
      throw new Error(`Question "${key}": instructions must be a non-empty string.`);
    }
    if (q.type === "score") {
      if (!Array.isArray(q.criteria) || q.criteria.length < 2) {
        throw new Error(`Question "${key}": score criteria must be an array of at least 2 levels.`);
      }
    } else if (!q.criteria || typeof q.criteria !== "object" || Array.isArray(q.criteria)) {
      throw new Error(`Question "${key}": ${q.type} criteria must be an object.`);
    }
    if (q.type === "noul" && !("true" in q.criteria && "false" in q.criteria)) {
      throw new Error(`Question "${key}": noul criteria must have "true" and "false" keys.`);
    }
  }
}

async function evaluate({ state, questions }) {
  if (state === undefined || state === null || state === "") {
    throw new Error("`state` is required.");
  }
  validateQuestions(questions);
  const { url, token } = endpoint();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      model: process.env.JEV_MODEL || "typesafe/jev",
      input: { state, questions },
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) {
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`Jev API returned HTTP ${res.status}: ${detail.slice(0, 2000)}`);
  }
  // Cloudflare wraps model output as { result, success, errors }.
  if (body && typeof body === "object" && "result" in body && "success" in body) {
    if (!body.success) throw new Error(`Jev API error: ${JSON.stringify(body.errors)}`);
    return body.result;
  }
  return body;
}

async function handle(msg) {
  switch (msg.method) {
    case "initialize":
      return {
        protocolVersion: msg.params?.protocolVersion ?? DEFAULT_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      };
    case "ping":
      return {};
    case "tools/list":
      return { tools: TOOLS };
    case "tools/call": {
      const { name, arguments: args } = msg.params ?? {};
      if (name !== "jev_evaluate") {
        throw Object.assign(new Error(`Unknown tool: ${name}`), { code: -32602 });
      }
      try {
        const result = await evaluate(args ?? {});
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: String(err?.message ?? err) }], isError: true };
      }
    }
    default:
      throw Object.assign(new Error(`Method not found: ${msg.method}`), { code: -32601 });
  }
}

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

const rl = createInterface({ input: process.stdin });
rl.on("line", async (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    return;
  }
  // Notifications (no id) need no response.
  if (msg.id === undefined) return;
  try {
    send({ jsonrpc: "2.0", id: msg.id, result: await handle(msg) });
  } catch (err) {
    send({ jsonrpc: "2.0", id: msg.id, error: { code: err.code ?? -32603, message: err.message } });
  }
});
