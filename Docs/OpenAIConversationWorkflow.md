# OpenAI Conversation Workflow

This project exposes one async Blueprint node:

`Send OpenAI Conversation Message`

## Inputs

- `Api Key`: OpenAI API key.
- `User Message`: User message for the model.
- `System Prompt`: Optional instructions for behavior, tone, role, or output rules.
- `Model`: Model id string. Default: `gpt-5.5`. You can type model ids such as `gpt-5.5`, `gpt-5.4`, `gpt-5.1`, or any model your OpenAI account supports.
- `Enable Json Mode`: Enables JSON output.
- `Json Schema`: Optional JSON Schema object. When provided, the node uses Structured Outputs with `json_schema`.
- `Json Schema Name`: Name for the structured output format. Default: `response`.
- `Strict Json Schema`: Default: `true`.
- `Previous Response Id`: Optional id from an earlier result for continuing a Responses API conversation.
- `Max Output Tokens`: Optional. `0` leaves it unset.

## Behavior

Plain text mode:

- Sends `model`, `instructions`, and `input` to `POST /v1/responses`.
- Returns `Output Text`, `Raw Response Json`, and `Response Id`.

JSON object mode:

- If `Enable Json Mode = true` and `Json Schema` is empty, the node sets `text.format.type = json_object`.
- The node automatically appends `Return a valid JSON object only.` if your system prompt does not mention JSON.

Structured Outputs mode:

- If `Enable Json Mode = true` and `Json Schema` is provided, the node sets `text.format.type = json_schema`.
- The schema must be valid JSON and include a top-level `type`.
- `Output Text` contains the returned JSON string.

## Example Schema

```json
{
  "type": "object",
  "properties": {
    "intent": { "type": "string" },
    "confidence": { "type": "number" },
    "keywords": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["intent", "confidence", "keywords"],
  "additionalProperties": false
}
```

With `Strict Json Schema = true`, keep schemas inside the subset supported by OpenAI Structured Outputs.
