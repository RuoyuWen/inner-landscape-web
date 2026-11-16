# LLM / 生成式 AI Prompt 清单

本文档整理了 `AI内心风景共创系统` 中用到的**全部** LLM prompt 与生成式 AI prompt（对话式大模型、图像生成、音效/音乐生成），按代码位置逐一列出完整原文。整理时间：2026-08-21，对应当前代码库状态。

## 目录

- [一、聊天流（index.html + app.js）](#一聊天流indexhtml--appjs)
- [二、气泡选择流（path.html + path.js）](#二气泡选择流pathhtml--pathjs)
- [三、后端转发（local_server.py）](#三后端转发local_serverpy)
- [四、确认无 prompt 逻辑的文件](#四确认无-prompt-逻辑的文件)
- [五、交叉引用表](#五交叉引用表)

## 分类说明

系统里的"prompt"分三种性质，容易混淆，先说明：

| 类型 | 说明 | 本文档标注 |
|---|---|---|
| **对话式 LLM prompt** | 发给 OpenAI `/v1/responses`（`gpt-4o` 等对话模型）的 system / user 消息，模型会做推理、追问、生成结构化 JSON | 🗣️ LLM |
| **生成式 AI prompt（非对话）** | 发给图像生成（`gpt-image-2`）、音效生成（ElevenLabs / fal.ai）的文本，模型不做推理，只是"描述要生成什么" | 🎨 生成式 |
| **确定性模板（非 AI）** | 代码里固定拼接的文本，完全不经过任何 AI 调用，只是字符串模板 | 📐 模板 |

两个前端流程（聊天流 / 气泡选择流）各自独立生成 prompt；两条流程最终都会把"图像 prompt"和"音效 prompt"传给同一个后端 `local_server.py`，由它原样转发给 OpenAI / ElevenLabs / fal.ai（后端不改写创意内容，只做长度截断）。

---

## 一、聊天流（index.html + app.js）

用户通过多轮对话描述内心场景，AI 逐步追问、提取结构化字段，最后生成三条 prompt（环境 360 图 / 音效 / 音乐）。

### 1.1 对话轮次 — Structured Output Schema 🗣️

**位置**：`app.js:334-373`，常量 `AGENT_RESPONSE_SCHEMA`
**用途**：约束每轮 AI 回复的 JSON 结构（回复文本 + 提取到的字段 + 下一个追问方向）

```js
const AGENT_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    assistant_message: { type: "string" },
    extracted_updates: {
      type: "object",
      additionalProperties: {
        type: "object",
        additionalProperties: true,
        properties: {
          value: {},
          status: {
            type: "string",
            enum: ["missing", "partial", "inferred", "confirmed", "skipped_by_user", "not_applicable"],
          },
          source: {
            type: "string",
            enum: ["user_explicit", "user_implicit", "agent_inference", "agent_suggestion", "user_confirmed_agent_suggestion"],
          },
          confidence: { type: "number" },
          needs_follow_up: { type: "boolean" },
        },
      },
    },
    checklist_status: {
      type: "object",
      additionalProperties: {
        type: "string",
        enum: ["missing", "partial", "complete"],
      },
    },
    next_focus: {
      type: "string",
      enum: ["feeling_keyword", "place", "season", "weather", "sound_sources", "openness", "path_or_exit", "connectivity", "important_objects", "summary"],
    },
    ready_for_summary: { type: "boolean" },
  },
  required: ["assistant_message", "extracted_updates", "checklist_status", "next_focus", "ready_for_summary"],
};
```

### 1.2 对话轮次 — System Prompt 🗣️

**位置**：`app.js:1319-1365`，函数 `buildAgentSystemPrompt()`
**用途**：核心对话 Agent 的行为准则——引导用户描述场景、逐轮追问、禁止心理诊断/象征解读
**调用**：`callOpenAIAgent()` → `postResponses()` → `POST https://api.openai.com/v1/responses`（模型取自设置面板 `state.settings.model || "gpt-4o"`）

```
你是"AI内心风景共创系统"的核心对话Agent。

当前界面与对话语言：${dialogueLanguage}。
assistant_message 必须使用 ${dialogueLanguage}。

你的任务：
1. 引导玩家把一个当下感受转化为结构化环境场景。
2. 每轮重新检查完整场景状态，而不是只分析当前问题。
3. 从玩家一句话里一次提取多个字段。
4. 根据你返回的 next_focus 写出自然承接的一句话。
5. 只负责提问、整理和视觉转译，不诊断、不解释心理意义。

绝对不要说：
- "这代表你孤独/无助/消极"
- "我认为你内心希望……"
- 任何心理诊断、创伤判断、人格判断或象征解释。

提问风格：
- 像一位共创伙伴，而不是调查问卷或表单。
- 每次只问一个主要问题。
- assistant_message 可以先用半句轻轻承接玩家刚说的画面，再问 target_next_focus 对应的问题。
- 问题简短、口语、自然，尽量使用玩家原本的词。
- 允许玩家说不确定、不知道、先不回答。
- 不机械逐题问，不重复问已确认内容。
- 不要给玩家提供具体答案选项或暗示性例子，例如不要问"是炎热的夏天，还是其他季节？"。
- 追问必须保持中性，只问缺失信息本身。
- 不要为了更精细而反复问同一字段；能支持场景生成就进入下一项。
- 如果玩家已经回答"没有/不能了/没有其他/不错/很远/很清晰"，应把它视作有效回答，不要换一种说法再问。
- 如果本轮上下文显示某个focus已经问过多次，应优先收束而不是继续追问。
- AI推导内容必须标记为 inferred 或 agent_inference，并用问题向玩家确认。
- assistant_message 不要超过45个汉字。
- assistant_message 必须围绕你返回的 next_focus，不要问 forbidden_next_focuses 中的内容。

字段：
feeling_keyword, place, season, time_of_day, weather, lighting, sound_sources, overall_sound_level, openness, visibility, path_or_exit, connectivity, important_objects, required_elements, excluded_elements。

字段状态：
missing, partial, inferred, confirmed, skipped_by_user, not_applicable。

来源：
user_explicit, user_implicit, agent_inference, agent_suggestion, user_confirmed_agent_suggestion。

返回要求：
只返回JSON，不要Markdown，不要额外解释。
```

`${dialogueLanguage}` 运行时替换为 `"English"` 或 `"Chinese"`（取决于当前界面语言）。

### 1.3 对话轮次 — User Payload 🗣️

**位置**：`app.js:1406-1439`，函数 `buildAgentUserPayload(userText)`
**用途**：每轮把当前场景状态、追问历史、最近对话、本轮用户输入打包成 JSON 发给模型

```js
function buildAgentUserPayload(userText) {
  return JSON.stringify({
    current_focus: state.focus,
    focus_answer_counts: state.focusCounts,
    complete_fields: FIELD_DEFS.map(([key]) => key).filter((key) => isDone(state.scene[key])),
    incomplete_fields: FIELD_DEFS.map(([key]) => key).filter((key) => !isDone(state.scene[key])),
    forbidden_next_focuses: Object.keys(questionsForLang()).filter((focus) => focusToFields(focus).every((key) => isDone(state.scene[key]))),
    interface_language: lang(),
    recent_dialogue: state.messages.slice(-8).map((message) => ({
      role: message.role,
      text: message.text,
    })),
    last_assistant_message: lastAssistantText(),
    latest_user_message: userText,
    current_scene_state: state.scene,
    internal_checklist_status: checklistStatus(),
    ready_for_summary_now: readyForSummary(),
    required_output_shape: {
      assistant_message: "给玩家看的下一句话",
      extracted_updates: {
        field_name: {
          value: "字符串、数组或对象",
          status: "confirmed",
          source: "user_explicit",
          confidence: 1,
          needs_follow_up: false,
        },
      },
      checklist_status: "内部检查状态对象",
      next_focus: "下一个关注字段或summary",
      ready_for_summary: false,
    },
  }, null, 2);
}
```

### 1.4 最终 Prompt 生成 — Structured Output Schema 🗣️

**位置**：`app.js:375-390`，常量 `FINAL_RESULT_SCHEMA`

```js
const FINAL_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    prompt1_environment_360: { type: "string" },
    prompt2_sound: { type: "string" },
    prompt3_music: { type: "string" },
    negative_prompt: { type: "string" },
    scene_tags: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["title", "prompt1_environment_360", "prompt2_sound", "prompt3_music", "negative_prompt", "scene_tags"],
};
```

### 1.5 最终 Prompt 生成 — System Prompt 🗣️

**位置**：`app.js:1367-1404`，函数 `buildFinalPromptSystemPrompt()`
**用途**：把已确认的场景字段转成三条最终生成 prompt（环境 360 图 / 音效 / 音乐）的写作规则
**调用**：`callFinalPromptAgent()` → `postResponses()` → 同一 `/v1/responses` 端点

```
You transform a confirmed inner-landscape scene into final generation prompts.

Return JSON only.

Rules for prompt1_environment_360:
- Write in English.
- Describe only the visible environment.
- Use a concise cinematic paragraph like the reference.
- Include location, season/time, weather, light, spatial layout, important objects, required elements, and exclusions.
- Do not mention psychology, feelings, diagnosis, symbolism, story, characters, or user emotions.
- Add default 360 image requirements: realistic 360-degree equirectangular panoramic image, seamless full spherical environment, immersive VR-ready panorama, consistent horizon, no frame, no text, no watermark.
- If the user excluded something, include it as "No ...".

Rules for prompt2_sound:
- Write in English.
- Describe only ambient sound.
- Include primary sound sources, distance, intensity, continuity/frequency when known.
- Describe the overall texture as soft, gentle, low-intensity background ambience unless the confirmed scene clearly implies something louder or harsher.
- Include exclusions such as no voices, no music, no vehicle sounds, no sudden loud events unless contradicted by the scene.
- Always include these exclusions verbatim so the audio renders clean: no static, no hiss, no white noise, no distortion, no crackle, no clipping.
- Do not add narrative events.
- The sound prompt must fit the visual scene exactly; do not add sound sources that are not supported by the confirmed scene.
- If the confirmed scene says there is no sound, almost no sound, complete silence, or the user explicitly wants silence, set prompt2_sound exactly to "none".

Rules for prompt3_music:
- Write in English.
- Generate a prompt for non-vocal background instrumental music only.
- The music should support the scene atmosphere without adding story, lyrics, voices, melody hooks that feel like a song, or sudden dramatic events.
- Describe tempo, mood, instrumentation, texture, density, and intensity when useful.
- It must fit the confirmed scene rather than the user's psychology.
- If the confirmed scene says there is no sound, almost no sound, complete silence, or the user explicitly wants silence, set prompt3_music exactly to "none".

Also return:
- title: a short English scene title.
- negative_prompt: comma-separated visual/audio exclusions useful for generation.
- scene_tags: short lowercase tags.
```

### 1.6 最终 Prompt 生成 — User Payload（含 Few-shot 参考范例）🗣️

**位置**：`app.js:1245-1277`，函数 `buildFinalPromptRequest()`
**用途**：把确认后的场景 JSON 连同三条参考范例 prompt 一起发给模型，让模型模仿范例的写法/长度/风格

```js
function buildFinalPromptRequest(model, scene, includeTemperature, useSchema) {
  const request = {
    model,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: buildFinalPromptSystemPrompt() }],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: JSON.stringify({
          confirmed_scene: scene,
          output_language: "English prompts, JSON keys in English",
          prompt1_reference: "A realistic old coastal railway station in late autumn at dusk, approaching night. Light rain and thin fog limit the visibility. The outdoor platform is semi-open, with railway tracks extending into the fog. A waiting room beside the platform emits soft warm light through an open doorway. A weathered bench stands near the edge of the platform. Wet ground reflects the station light. No people, no vehicles, and no bright sunlight. Add requirements for a 360-degree equirectangular panoramic environment image.",
          prompt2_reference: "A quiet coastal railway station at dusk during light rain. Soft, gentle, low-intensity ambience: continuous medium-soft rainfall on the platform roof and wet ground, distant low ocean waves, and occasional faint metallic friction. No voices, music, vehicle sounds, or sudden loud events. No static, no hiss, no white noise, no distortion, no crackle, no clipping.",
          prompt3_reference: "Sparse non-vocal ambient instrumental music for a quiet coastal railway station at dusk. Slow tempo, soft sustained pads, very light piano tones, subtle warm texture, low intensity, no vocals, no lyrics, no percussion hits, no sudden dramatic changes.",
        }, null, 2) }],
      },
    ],
  };
  if (useSchema) {
    request.text = {
      format: {
        type: "json_schema",
        name: "inner_landscape_final_prompts",
        strict: false,
        schema: FINAL_RESULT_SCHEMA,
      },
    };
  }
  if (includeTemperature) request.temperature = Number(state.settings.temperature);
  return request;
}
```

### 1.7 图像生成 Prompt（发给 gpt-image-2）🎨

**位置**：`app.js:2118-2129`，函数 `buildFlatImagePrompt(environment360Prompt)`
**用途**：把 AI 生成的 360 全景 prompt 剥掉全景相关措辞，改写成 2D 平面图要求

```js
function buildFlatImagePrompt(environment360Prompt) {
  return [
    String(environment360Prompt || "")
      .replace(/Realistic 360-degree equirectangular panoramic image,?/gi, "")
      .replace(/seamless full spherical environment,?/gi, "")
      .replace(/immersive VR-ready panorama,?/gi, "")
      .replace(/consistent horizon,?/gi, "")
      .replace(/no frame, no text, no watermark\.?/gi, "")
      .trim(),
    "Create one realistic flat 2D landscape image, single camera view, natural perspective, 3:2 composition, not panoramic, not equirectangular, no fisheye distortion, no split view, no frame, no text, no watermark.",
  ].filter(Boolean).join(" ");
}
```

VR 版直接用 `prompt1_environment_360`（保留全景措辞）传给后端 `environment_prompt`，不经过这个函数。

### 1.8 音效生成 Prompt（发给 ElevenLabs）🎨

**位置**：`app.js:2131-2145`，函数 `buildElevenLabsSoundPrompt(prompt)` / `isNonePrompt(prompt)`
**用途**：在 AI 生成的 `prompt2_sound` 基础上加一句降噪保证语，并控制在 450 字符预算内（为后端截断预留空间）

```js
function isNonePrompt(prompt) {
  return !prompt || String(prompt).trim().toLowerCase() === "none";
}

function buildElevenLabsSoundPrompt(prompt) {
  if (isNonePrompt(prompt)) return "none";
  const noiseGuard = "Soft, clean recording. No static, no hiss, no white noise, no distortion, no crackle, no clipping.";
  const base = String(prompt || "")
    .replace(/No music,?/gi, "")
    .replace(/or sudden loud events\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const maxBaseLength = 450 - noiseGuard.length - 1;
  return `${base.slice(0, maxBaseLength)} ${noiseGuard}`.trim();
}
```

### 1.9 本地兜底 Prompt 模板（OpenAI 调用失败时使用）📐

**位置**：`app.js:2314-2358`，函数 `buildFallbackFinalPrompts()`
**用途**：当 OpenAI 调用失败/无 API Key 时，用规则直接拼接三条 prompt，完全不经过任何 AI

```js
function buildFallbackFinalPrompts() {
  const place = valueText(state.scene.place);
  const season = valueText(state.scene.season);
  const time = valueText(state.scene.time_of_day);
  const weather = valueText(state.scene.weather);
  const lighting = valueText(state.scene.lighting);
  const openness = valueText(state.scene.openness);
  const visibility = valueText(state.scene.visibility);
  const path = valueText(state.scene.path_or_exit);
  const connectivity = valueText(state.scene.connectivity);
  const objects = valueText(state.scene.important_objects);
  const required = valueText(state.scene.required_elements);
  const excluded = mergeArray(["people", "vehicles", "text", "watermark"], state.scene.excluded_elements.value || []);
  const sounds = valueText(state.scene.sound_sources);
  const soundLevel = valueText(state.scene.overall_sound_level);
  const silent = sceneRequestsSilence();
  const prompt2 = silent ? "none" : [
    `Soft, gentle, low-intensity ambient soundscape for ${place} at ${time}.`,
    `${sounds}. Overall sound level: ${soundLevel}.`,
    `The sound design must match the visible environment exactly and avoid unsupported sound sources.`,
    "No voices, music, vehicle sounds, or sudden loud events.",
    "No static, no hiss, no white noise, no distortion, no crackle, no clipping.",
  ].join(" ");
  const prompt3 = silent ? "none" : [
    `Non-vocal background instrumental music for ${place} at ${time}.`,
    `Subtle, scene-matching ambience; no lyrics, no voices, no strong melody hook, no sudden dramatic changes.`,
    `Keep the mood consistent with ${weather}, ${lighting}, and the spatial feeling of ${openness}.`,
  ].join(" ");
  return {
    title: `${place} ${time}`.trim(),
    prompt1_environment_360: [
      `A realistic ${place} in ${season} at ${time}.`,
      `${weather}. ${lighting}.`,
      `The space feels ${openness}, with ${visibility}.`,
      `${path}. ${connectivity}.`,
      `Important visible elements include ${objects}. Required elements: ${required}.`,
      `Realistic 360-degree equirectangular panoramic image, seamless full spherical environment, immersive VR-ready panorama, consistent horizon, no frame, no text, no watermark.`,
      `No ${excluded.join(", no ")}.`,
    ].join(" "),
    prompt2_sound: prompt2,
    prompt3_music: prompt3,
    negative_prompt: excluded.join(", "),
    scene_tags: [place, season, time, weather, lighting].flatMap((item) => String(item).split(/[，,、\s]+/)).filter(Boolean).map(slug).slice(0, 12),
  };
}
```

---

## 二、气泡选择流（path.html + path.js）

用户通过点选气泡（季节/天气/时间/光线/道路）而非自由对话来描述场景。道路结构句和天气音效都是**确定性模板**，AI 只负责撰写"氛围描述"和音乐 prompt——这是刻意设计，避免 AI 每次重新描述道路结构导致画面前后不一致，以及避免"安静天气"类 prompt 让 ElevenLabs 生成近乎静音的音效（详见后文 3.2 的固定音效表）。

### 2.1 道路结构句（固定模板，不经过 AI）📐

**位置**：`path.js:248-262`，常量 `ROAD_COURSE_PERSPECTIVE_CLAUSES` + 函数 `buildRoadStructureSentence()`
**用途**：拼出场景的固定结构描述（路的走向、树的疏密），作为最终环境 prompt 的开头，AI 不会重写这部分

```js
const ROAD_COURSE_PERSPECTIVE_CLAUSES = {
  straight: "extending in a straight line from the foreground to a single vanishing point at the horizon, shown in centered one-point perspective",
  gentle_bend: "curving gently from side to side as it recedes from the foreground toward the horizon, its vanishing point shifting subtly with the bend, shown in a naturalistic centered perspective",
  winding: "winding sharply back and forth as it recedes from the foreground toward the horizon, with clearly visible S-curves and switchbacks, its vanishing point shifting with each turn, shown in a naturalistic centered perspective",
};

function buildRoadStructureSentence(roadDescriptionText, courseKey) {
  const perspectiveClause = ROAD_COURSE_PERSPECTIVE_CLAUSES[courseKey] || ROAD_COURSE_PERSPECTIVE_CLAUSES.straight;
  return `The scene shows ${roadDescriptionText}, ${perspectiveClause}. A modest, sparse number of trees stand along each side of the path -- not a dense or continuous row -- spaced well apart, canopies visible against the sky, thinning out further toward the horizon. The path and its flanking trees are the only structural elements in the scene -- no forks, no side paths, no clearings, no other landmarks.`;
}
```

`roadDescriptionText` 由 `roadDescription()`（`path.js:459-464`）拼出，用到以下词表（`path.js:440-442`）：

```js
const ROAD_WIDTH_ADJECTIVES = { narrow: "narrow", medium: "modestly wide", wide: "wide" };
const ROAD_COURSE_ADJECTIVES = { straight: "straight", gentle_bend: "gently winding", winding: "winding, twisting" };
const ROAD_SURFACE_NOUNS = { dirt: "unpaved dirt path", stone: "stone-paved path", gravel: "gravel path", asphalt: "paved asphalt road" };
```

### 2.2 全景图固定后缀 📐

**位置**：`path.js:264-265`，常量 `PANORAMA_360_SUFFIX`

```js
const PANORAMA_360_SUFFIX =
  "Realistic 360-degree equirectangular panoramic image, seamless full spherical environment, immersive VR-ready panorama, consistent horizon, no frame, no text, no watermark.";
```

### 2.3 天气音效表（确定性，完全不经过 AI）📐

**位置**：`path.js:271-293`，常量 `WEATHER_SOUND_HINTS` + 函数 `weatherSoundHint()`
**用途**：根据用户选择的天气气泡（或自定义文本经关键词匹配后）直接查表得到 `prompt2_sound`，跳过 AI 撰写这一步——原因见 [五、交叉引用表] 下方说明

```js
const WEATHER_SOUND_HINTS = {
  clear: "very quiet; at most a faint breeze; no rain, no wind gusts, no thunder",
  clear_cloudless: "very quiet; at most a faint breeze",
  clear_bright: "very quiet, sun-warmed stillness; at most a faint breeze",
  clear_light_clouds: "very quiet; at most a faint breeze",
  rain: "steady rainfall",
  rain_heavy: "heavy, dense rainfall with water running and dripping off leaves",
  rain_light: "light, gentle drizzle; soft, sparse raindrops",
  rain_thunder: "steady rain with distant, low rolling thunder -- no sharp cracks",
  snow: "hushed snowfall ambience",
  snow_first: "very quiet, hushed first snowfall, barely audible",
  snow_light: "soft, sparse snowfall ambience, muffled and quiet",
  snow_blizzard: "strong howling wind driving snow, muffled roar",
  overcast: "muted stillness with a faint distant wind",
  overcast_cloudy: "muted stillness",
  overcast_gloomy: "muted, heavy stillness",
  overcast_mist: "muffled, damp stillness; occasional water droplets falling",
  wind: "audible wind",
  wind_breeze: "a gentle, soft breeze rustling leaves",
  wind_strong: "strong wind gusting through branches",
  wind_gale: "powerful, forceful gale-force wind with creaking branches",
  default: "very quiet ambience, at most a faint breeze",
};
```

自定义天气文本会先经关键词匹配（`path.js:302-330`，`WEATHER_KEYWORD_CATEGORIES` + `matchWeatherCategoryFromText()`）映射到上表某个分类键，再取对应文案；匹配不到才落到 `default`：

```js
const WEATHER_KEYWORD_CATEGORIES = [
  { id: "rain_thunder", words: ["雷阵雨", "打雷", "雷电", "雷鸣", "thunderstorm", "thunder"] },
  { id: "rain_heavy", words: ["暴雨", "大雨", "骤雨", "瓢泼", "heavy rain", "downpour", "torrential"] },
  { id: "rain_light", words: ["细雨", "小雨", "毛毛雨", "drizzle", "light rain"] },
  { id: "snow_blizzard", words: ["暴风雪", "blizzard"] },
  { id: "snow_first", words: ["初雪", "first snow"] },
  { id: "snow_light", words: ["小雪", "雪花纷飞", "light snow", "snowfall"] },
  { id: "wind_gale", words: ["狂风", "gale"] },
  { id: "wind_strong", words: ["大风", "strong wind"] },
  { id: "wind_breeze", words: ["微风", "和风", "breeze"] },
  { id: "overcast_gloomy", words: ["阴沉", "阴暗", "gloomy"] },
  { id: "overcast_mist", words: ["薄雾", "雾气", "mist", "fog"] },
  { id: "overcast_cloudy", words: ["多云", "cloudy"] },
  { id: "clear_bright", words: ["阳光炽烈", "烈日", "blazing", "scorching"] },
  { id: "clear_cloudless", words: ["万里无云", "cloudless"] },
  { id: "clear_light_clouds", words: ["微云", "scattered cloud"] },
  { id: "rain", words: ["雨", "rain"] },
  { id: "snow", words: ["雪", "snow"] },
  { id: "wind", words: ["风", "wind"] },
  { id: "overcast", words: ["阴", "overcast"] },
  { id: "clear", words: ["晴", "clear", "sunny", "sun"] },
];
```

### 2.4 最终 Prompt 生成 — Structured Output Schema 🗣️

**位置**：`path.js:594-605`，常量 `FINAL_RESULT_SCHEMA`（与 app.js 同名但结构不同：这里没有 `prompt1_environment_360`/`prompt2_sound`，因为那两项分别来自固定模板和音效表，AI 只需要产出 `atmosphere_description` 和 `prompt3_music`）

```js
const FINAL_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    atmosphere_description: { type: "string" },
    prompt3_music: { type: "string" },
    negative_prompt: { type: "string" },
    scene_tags: { type: "array", items: { type: "string" } },
  },
  required: ["title", "atmosphere_description", "prompt3_music", "negative_prompt", "scene_tags"],
};
```

### 2.5 最终 Prompt 生成 — System Prompt 🗣️

**位置**：`path.js:1298-1320`，函数 `buildPathFinalPromptSystemPrompt()`
**调用**：`summarizeSelections()` → `postResponses()` → `POST https://api.openai.com/v1/responses`（模型硬编码 `"gpt-4o"`，未接入设置面板的模型选择）

```
You turn 4 simple decorations (season, weather, time of day, light) into final generation prompts for ONE FIXED scene concept: a road/path extending into the distance, flanked by trees on both sides of the path. The exact wording of that scene's composition is supplied separately and fixed -- your job is only the atmosphere layered on top of it, plus the music prompt.

Return JSON only.

Rules for atmosphere_description:
- Write in English.
- Write ONLY the atmosphere: season, weather, time of day, and light -- how they look, feel, smell, and read visually. Do NOT redescribe the road, the path, the trees, their layout, or perspective; that is already fixed and handled separately, and repeating or altering it causes inconsistent scene structure across generations, which must be avoided.
- If a dimension has no chosen value, pick something quiet and unobtrusive for it rather than leaving it undescribed.
- Do NOT introduce people, animals, buildings, vehicles, signage, text, or any man-made structure.
- 1-3 concise sentences.

Rules for prompt3_music:
- Write in English.
- Non-vocal ambient instrumental music only, matching the mood of the decorated road.
- No lyrics, no voices, no melody hooks that feel like a song, no sudden dramatic events.
- If near silence was implied, set prompt3_music exactly to "none".

Also return:
- title: a short English scene title.
- negative_prompt: comma-separated exclusions, must include people, buildings, vehicles, text, signage.
- scene_tags: short lowercase tags.
```

### 2.6 最终 Prompt 生成 — User Payload 与拼接逻辑 🗣️

**位置**：`path.js:1345-1407`，函数 `summarizeSelections()`

```js
async function summarizeSelections() {
  const apiKey = getOpenAiKey();
  if (!apiKey) throw new Error(t("needOpenAiKey"));
  // ...
  const selectionPayload = {};
  BUBBLE_CATEGORIES.forEach((category) => {
    if (category.key === "road") return;
    const selection = state.selections[category.key];
    selectionPayload[category.key] = selection ? selection.label : null;
  });

  const roadStructureSentence = buildRoadStructureSentence(roadDescription(), currentRoadStyle().course);

  const body = {
    model: "gpt-4o",
    input: [
      { role: "system", content: [{ type: "input_text", text: buildPathFinalPromptSystemPrompt() }] },
      { role: "user", content: [{ type: "input_text", text: JSON.stringify({
        fixed_scene_concept: roadStructureSentence,
        selections: selectionPayload,
        output_language: "English prompts, JSON keys in English",
      }) }] },
    ],
    text: { format: { type: "json_schema", name: "path_final_prompts", strict: false, schema: FINAL_RESULT_SCHEMA } },
  };

  const finalPrompts = await postResponses(apiKey, body);
  const now = new Date();
  const prompt1EnvironmentText = [roadStructureSentence, finalPrompts.atmosphere_description, PANORAMA_360_SUFFIX]
    .filter(Boolean)
    .join(" ");
  state.output = {
    result: {
      prompt1_environment_360: prompt1EnvironmentText,
      prompt2_sound: weatherSoundHint(),   // 确定性查表，不经过 AI（见 2.3）
      prompt3_music: finalPrompts.prompt3_music,
    },
    title: finalPrompts.title,
    timestamp: formatTimestamp(now),
  };
  // ...
}
```

### 2.7 图像生成 Prompt（发给 gpt-image-2）🎨

**位置**：`path.js:1437-1448`，函数 `buildFlatImagePrompt(environment360Prompt)`（与 app.js 同名函数逻辑完全一致，剥全景措辞、加 2D 平面图要求）

```js
function buildFlatImagePrompt(environment360Prompt) {
  return [
    String(environment360Prompt || "")
      .replace(/Realistic 360-degree equirectangular panoramic image,?/gi, "")
      .replace(/seamless full spherical environment,?/gi, "")
      .replace(/immersive VR-ready panorama,?/gi, "")
      .replace(/consistent horizon,?/gi, "")
      .replace(/no frame, no text, no watermark\.?/gi, "")
      .trim(),
    "Create one realistic flat 2D landscape image, single camera view, natural perspective, 3:2 composition, not panoramic, not equirectangular, no fisheye distortion, no split view, no frame, no text, no watermark.",
  ].filter(Boolean).join(" ");
}
```

### 2.8 音效生成 Prompt（发给 ElevenLabs / fal.ai）🎨

**位置**：`path.js:1454-1460`，函数 `buildSoundPrompt(prompt)`（逻辑与 app.js 的 `buildElevenLabsSoundPrompt` 相同，用于两个音效供应商）

```js
function buildSoundPrompt(prompt) {
  if (isNonePrompt(prompt)) return "none";
  const noiseGuard = "Soft, clean recording. No static, no hiss, no white noise, no distortion, no crackle, no clipping.";
  const base = String(prompt || "").replace(/No music,?/gi, "").replace(/or sudden loud events\.?/gi, "").replace(/\s+/g, " ").trim();
  const maxBaseLength = 450 - noiseGuard.length - 1;
  return `${base.slice(0, maxBaseLength)} ${noiseGuard}`.trim();
}
```

---

## 三、后端转发（local_server.py）

**后端不撰写任何创意性 prompt 内容**——它只接收前端已经拼好的 `flat_image_prompt` / `environment_prompt` / `sound_prompt`，做长度截断后原样转发给各生成 API。

### 3.1 OpenAI 图像生成 🎨

**位置**：`local_server.py:822-843`，函数 `generate_openai_image(api_key, prompt, output_path, model)`

```python
def generate_openai_image(api_key, prompt, output_path, model):
    body = {
        "model": model or "gpt-image-2",
        "prompt": prompt,
        "size": "1536x1024",
        "n": 1,
    }
    data = post_json(
        "https://api.openai.com/v1/images/generations",
        body,
        {"Authorization": f"Bearer {api_key}"},
        300,
    )
    item = (data.get("data") or [{}])[0]
    if item.get("b64_json"):
        output_path.write_bytes(base64.b64decode(item["b64_json"]))
        return
    if item.get("url"):
        with urlrequest.urlopen(item["url"], timeout=300) as response:
            output_path.write_bytes(response.read())
        return
    raise ValueError("OpenAI image response did not contain b64_json or url.")
```

`prompt` 原样透传，不截断（`flat_image_prompt` 用于 2D，`environment_prompt` 用于 VR 全景）。

### 3.2 ElevenLabs 音效生成 🎨

**位置**：`local_server.py:846-859`，函数 `generate_elevenlabs_sound(api_key, prompt, output_path)`

```python
def generate_elevenlabs_sound(api_key, prompt, output_path):
    audio = post_binary(
        "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_192",
        {
            "text": prompt[:450],
            "loop": True,
            "prompt_influence": 0.3,
            "model_id": "eleven_text_to_sound_v2",
            "duration_seconds": 20,
        },
        {"xi-api-key": api_key},
        300,
    )
    output_path.write_bytes(audio)
```

截断为 `prompt[:450]`，与前端 `buildElevenLabsSoundPrompt` / `buildSoundPrompt` 的 450 字符预算对应。

> 补充说明（历史踩坑记录）：ElevenLabs 对"very quiet"/"muted"/"stillness"类描述常常直接生成近乎静音的音频，这是模型本身的特性，`prompt_influence` 等参数调不掉。目前的应对方式是：`local_server.py` 里维护一个 `BACKUP_SOUND_PATHS` 表（天气分类 → 预录制的本地音频文件路径），对应分类直接跳过生成、复用本地文件；仍会调用生成 API 的分类，生成后用 ffmpeg 检测音量，过轻则替换成兜底音效。这套逻辑不属于"prompt"范畴，故只在此处附带说明，不在正文列出。

### 3.3 fal.ai（Stable Audio）音效生成 🎨

**位置**：`local_server.py:883-929`，函数 `generate_falai_sound(api_key, prompt, output_base_path, seconds_total=10, steps=150)`

```python
def generate_falai_sound(api_key, prompt, output_base_path, seconds_total=10, steps=150):
    """Queue-based fal.ai call (submit -> poll status -> fetch result -> download).

    output_base_path has no extension; the actual file is written to
    "<output_base_path>.<ext>" with the extension taken from the response
    (fal-ai/stable-audio returns WAV, not mp3). Returns the Path actually written.
    """
    auth_headers = {"Authorization": f"Key {api_key}"}
    submit = post_json(
        "https://queue.fal.run/fal-ai/stable-audio",
        {
            "prompt": prompt[:1000],
            "seconds_total": max(0, min(47, int(seconds_total))),
            "steps": max(2, min(1000, int(steps))),
        },
        auth_headers,
        60,
    )
    request_id = submit.get("request_id")
    status_url = submit.get("status_url") or (request_id and f"https://queue.fal.run/fal-ai/stable-audio/requests/{request_id}/status")
    response_url = submit.get("response_url") or (request_id and f"https://queue.fal.run/fal-ai/stable-audio/requests/{request_id}")
    if not status_url or not response_url:
        raise RuntimeError(f"fal.ai did not return a request_id/status_url: {submit}")

    deadline = time.monotonic() + 180
    while True:
        status_data = get_json(status_url, auth_headers, 30)
        status = status_data.get("status")
        if status == "COMPLETED":
            break
        if status in ("IN_QUEUE", "IN_PROGRESS"):
            if time.monotonic() > deadline:
                raise TimeoutError(f"fal.ai sound generation timed out (last status: {status})")
            time.sleep(2)
            continue
        raise RuntimeError(f"fal.ai sound generation failed: {status_data}")

    result = get_json(response_url, auth_headers, 60)
    audio_file = result.get("audio_file") or {}
    audio_url = audio_file.get("url")
    if not audio_url:
        raise ValueError(f"fal.ai response did not contain audio_file.url: {result}")

    extension = guess_audio_extension(audio_file.get("content_type"), audio_file.get("file_name"))
    final_path = Path(f"{output_base_path}.{extension}")
    with urlrequest.urlopen(audio_url, timeout=300) as response:
        final_path.write_bytes(response.read())
    return final_path
```

截断为 `prompt[:1000]`。

### 3.4 ElevenLabs 音乐生成（当前已停用）🎨

**位置**：`local_server.py:1098-1109`，函数 `generate_elevenlabs_music(api_key, prompt, output_path)`
**状态**：代码保留但未被任何请求 handler 调用（`handle_generate_2d_experience` / `handle_generate_vr_experience` 中均有相同注释：因 ElevenLabs 音乐生成消耗额度，暂时停用，保留函数便于以后重新启用）

```python
def generate_elevenlabs_music(api_key, prompt, output_path):
    audio = post_binary(
        "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128",
        {
            "prompt": prompt[:1200],
            "music_length_ms": 30000,
            "model_id": "music_v1",
            "force_instrumental": True,
        },
        {"xi-api-key": api_key},
        900,
    )
```

截断为 `prompt[:1200]`。

---

## 四、确认无 prompt 逻辑的文件

以下文件经全文搜索（`prompt|openai|elevenlabs|fal.ai|gpt-`）确认不涉及任何生成式 AI 调用：

- `study2.js` / `study2-results.js`（SAM 问卷工具与结果页）——纯本地问卷数据记录与 CSV 导出。
- `record.js` / `panorama-viewer.js`（历史记录回放、全景查看器）——纯前端渲染/播放逻辑。
- 所有 `.html` 文件——仅 UI 文案（如下拉框选项 "ElevenLabs" / "fal.ai (Stable Audio)"）。
- `Scripts/png_to_hdr.py`——纯图像格式转换脚本。
- `local_server.py` 中除 3.1–3.4 四个函数外，无其他调用外部生成式 AI API 的位置。

---

## 五、交叉引用表

| Prompt / 常量 | 文件 | 行号 | 类型 | 所属流程 |
|---|---|---|---|---|
| `AGENT_RESPONSE_SCHEMA` | app.js | 334-373 | 🗣️ Schema | 聊天流（对话轮次） |
| `FINAL_RESULT_SCHEMA` | app.js | 375-390 | 🗣️ Schema | 聊天流（最终prompt） |
| `buildAgentSystemPrompt()` | app.js | 1319-1365 | 🗣️ System prompt | 聊天流 |
| `buildAgentUserPayload()` | app.js | 1406-1439 | 🗣️ User payload | 聊天流 |
| `buildFinalPromptSystemPrompt()` | app.js | 1367-1404 | 🗣️ System prompt | 聊天流 |
| `buildFinalPromptRequest()` 参考范例 | app.js | 1245-1277 | 🗣️ User payload（few-shot） | 聊天流 |
| `buildFlatImagePrompt()` | app.js | 2118-2129 | 🎨 图像 prompt | 聊天流 |
| `buildElevenLabsSoundPrompt()` | app.js | 2131-2145 | 🎨 音效 prompt | 聊天流 |
| `buildFallbackFinalPrompts()` | app.js | 2314-2358 | 📐 本地兜底模板 | 聊天流 |
| `ROAD_COURSE_PERSPECTIVE_CLAUSES` / `buildRoadStructureSentence()` | path.js | 248-262 | 📐 固定模板 | 气泡选择流 |
| `PANORAMA_360_SUFFIX` | path.js | 264-265 | 📐 固定后缀 | 气泡选择流 |
| `WEATHER_SOUND_HINTS` / `weatherSoundHint()` | path.js | 271-293 | 📐 确定性查表 | 气泡选择流 |
| `FINAL_RESULT_SCHEMA`（path.js 版） | path.js | 594-605 | 🗣️ Schema | 气泡选择流 |
| `buildPathFinalPromptSystemPrompt()` | path.js | 1298-1320 | 🗣️ System prompt | 气泡选择流 |
| `summarizeSelections()` 请求体 | path.js | 1345-1407 | 🗣️ User payload | 气泡选择流 |
| `buildFlatImagePrompt()`（path.js 版） | path.js | 1437-1448 | 🎨 图像 prompt | 气泡选择流 |
| `buildSoundPrompt()` | path.js | 1454-1460 | 🎨 音效 prompt | 气泡选择流 |
| `generate_openai_image()` | local_server.py | 822-843 | 🎨 图像调用（透传） | 后端 |
| `generate_elevenlabs_sound()` | local_server.py | 846-859 | 🎨 音效调用（透传，截断450字符） | 后端 |
| `generate_falai_sound()` | local_server.py | 883-929 | 🎨 音效调用（透传，截断1000字符） | 后端 |
| `generate_elevenlabs_music()` | local_server.py | 1098-1109 | 🎨 音乐调用（**已停用**，截断1200字符） | 后端 |

**调用的外部服务/模型汇总**：
- OpenAI `POST /v1/responses`（对话与结构化输出）—— 模型：聊天流用设置面板选择（默认 `gpt-4o`），气泡选择流硬编码 `gpt-4o`。
- OpenAI `POST /v1/images/generations`（图像生成）—— 模型：`gpt-image-2`。
- ElevenLabs `POST /v1/sound-generation`（音效）—— 模型：`eleven_text_to_sound_v2`。
- ElevenLabs `POST /v1/music`（音乐，已停用）—— 模型：`music_v1`。
- fal.ai `fal-ai/stable-audio`（音效，队列式调用）。
