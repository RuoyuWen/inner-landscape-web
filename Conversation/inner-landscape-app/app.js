const FIELD_DEFS = [
  ["feeling_keyword", "感受关键词", "感受关键词"],
  ["place", "地点", "场景基础"],
  ["season", "季节", "场景基础"],
  ["time_of_day", "时间", "场景基础"],
  ["weather", "天气", "环境氛围"],
  ["lighting", "光线", "环境氛围"],
  ["sound_sources", "声音", "声音环境"],
  ["overall_sound_level", "整体音量", "声音环境"],
  ["openness", "开放性", "空间结构"],
  ["visibility", "可见范围", "空间结构"],
  ["path_or_exit", "路径与出口", "空间结构"],
  ["connectivity", "空间连接", "空间结构"],
  ["important_objects", "重要物件", "重要细节"],
  ["required_elements", "必须出现", "重要细节"],
  ["excluded_elements", "不要出现", "重要细节"],
];

const MODULES = [
  { id: "feeling_keyword", label: "感受关键词", fields: ["feeling_keyword"] },
  { id: "scene_basis", label: "场景基础", fields: ["place", "season", "time_of_day"] },
  { id: "atmosphere", label: "环境氛围", fields: ["weather", "lighting"] },
  { id: "soundscape", label: "声音环境", fields: ["sound_sources", "overall_sound_level"] },
  { id: "spatial_structure", label: "空间结构", fields: ["openness", "visibility", "path_or_exit", "connectivity"] },
  { id: "important_details", label: "重要细节", fields: ["important_objects", "required_elements", "excluded_elements"] },
];

const QUESTIONS = {
  "zh-CN": {
    feeling_keyword: "如果用一个词形容你当下的感受，会是什么？可以是情绪、颜色、天气、质感、声音，或任何首先想到的词。",
    place: "想到“{feeling_keyword}”，你会想象出什么地方？",
    season: "这里是什么季节和时间？不确定也可以直接说不确定。",
    weather: "这里的天气和光线是什么样的？",
    sound_sources: "这里能听到什么声音？也可以说几乎没有声音。",
    openness: "站在这里，你能看到多远？周围是开阔没有遮挡，还是被树木、墙壁或别的什么东西围住、挡住了视线？",
    path_or_exit: "这里有没有能让人移动的方向，比如一条路、入口或出口？",
    connectivity: "这个空间是一整片连在一起，还是分成几个区域？",
    important_objects: "这里有没有什么东西，是你希望一定会出现（哪怕只有一样），或者希望绝对不要出现的？",
  },
  "en-US": {
    feeling_keyword: "If you used one word to describe how you feel right now, what would it be? It can be an emotion, color, weather, texture, sound, or anything that comes first.",
    place: "When you think of “{feeling_keyword}”, what kind of place appears?",
    season: "What season and time is it there? It is okay to be unsure.",
    weather: "What are the weather and light like there?",
    sound_sources: "What can be heard there? It can also be almost silent.",
    openness: "Standing here, how far can you see? Is the space around you open with nothing in the way, or is your view blocked or enclosed by things like trees, walls, or something else?",
    path_or_exit: "Is there any direction of movement here, such as a path, entrance, or exit?",
    connectivity: "Is this one continuous space, or is it divided into several areas?",
    important_objects: "Is there anything here you feel must be present — even just one thing — or anything you feel must absolutely not be there?",
  },
};

const MODEL_OPTIONS = ["gpt-4o", "gpt-4.1", "gpt-4.1-mini", "gpt-5.4", "gpt-5.4-mini", "gpt-5.5"];
const MUSIC_TRACKS = [
  "../music/Inner_Landscape_Reflection_2026-07-28T233332.mp3",
  "../music/Neutral_Reflective_Ambience_2026-07-28T233331.mp3",
];
const INTRO_VOICE_TRACKS = {
  "zh-CN": "../Voice/Chinese_Intro.mp3",
  "en-US": "../Voice/English_Intro.mp3",
};
const MAX_FOCUS_ANSWERS = {
  feeling_keyword: 1,
  place: 1,
  season: 2,
  weather: 3,
  sound_sources: 2,
  openness: 3,
  path_or_exit: 2,
  connectivity: 2,
  important_objects: 3,
};

const state = {
  screen: "home",
  focus: "feeling_keyword",
  scene: {},
  messages: [],
  rawResponses: [],
  revisions: [],
  checklistHistory: [],
  focusCounts: {},
  snapshots: [],
  archiveOpen: false,
  settings: {
    apiKey: "",
    model: "gpt-4o",
    language: "en-US",
    temperature: 0.4,
    outputFolder: "Documents/InnerLandscape/",
    englishPrompt: true,
    strictNoPsych: true,
    soundProvider: "elevenlabs",
  },
  output: null,
  experience: null,
  isCallingAI: false,
};

const musicState = {
  audios: [],
  activeChannel: 0,
  trackIndex: 0,
  targetVolume: 0.42,
  duckVolume: 0.15,
  currentVolume: 0.42,
  fadeMs: 2000,
  crossfadeStarted: false,
  stopping: false,
  playing: false,
  timers: new Set(),
};

const introVoiceState = {
  audio: null,
  timer: null,
};

const I18N = {
  "zh-CN": {
    appTitle: "AI内心风景共创系统",
    tagline: "将当下的感受，慢慢变成一个可以看见和进入的地方。",
    history: "历史项目",
    help: "帮助",
    settings: "设置",
    homeTitle: "选择语言",
    homeDesc: "请选择接下来导语、语音、界面和对话使用的语言。",
    start: "继续",
    openProject: "打开已有项目",
    debugSkipToConfirm: "调试：跳到生成界面",
    p1: "这里没有正确答案",
    p2: "系统不会诊断用户",
    p3: "可以说不确定",
    p4: "场景意义由用户决定",
    chatTitle: "创作对话",
    chatDesc: "只需要回答你愿意回答的部分，AI会在后台整理成场景档案。",
    viewArchive: "查看档案",
    musicOn: "音乐开",
    musicOff: "音乐关",
    reset: "重新开始",
    inputPlaceholder: "写下你首先想到的内容，不需要很完整。",
    archivePlaceholder: "场景档案已生成，请在档案页编辑。",
    back: "返回上一步",
    send: "发送",
    thinking: "整理中",
    confirmTitle: "确认你的内心风景",
    confirmDesc: "请检查这些内容是否符合你的想象。你可以直接修改字段内容。",
    backToChat: "返回对话",
    generateFiles: "确认并生成文件",
    downloadFiles: "保存prompt和log",
    generate2dExperience: "生成2D体验",
    startExperience: "开始体验",
    exitExperience: "退出体验",
    generating2dExperience: "正在生成2D体验",
    experienceReadyTitle: "2D体验已准备好",
    experienceReadyDesc: "图片和音效已经生成完成。你可以开始体验。",
    experienceFailed: "2D体验生成失败",
    generateVrExperience: "生成VR体验",
    generatingVrExperience: "正在生成VR体验（全景图+音效），可能需要一两分钟…",
    vrExperienceReady: "VR体验已生成完成，并写入UE可直接导入的固定路径。在编辑器里点一下导入节点就能进去体验，不用再等。",
    vrExperienceFailed: "VR体验生成失败",
    elevenLabsKey: "ElevenLabs API Key",
    soundProviderLabel: "音效生成使用",
    falApiKey: "fal.ai API Key",
    settingsDesc: "API Key默认仅保存在本次页面会话中。",
    language: "语言",
    languageLabel: "界面与对话语言",
    apiSettings: "API设置",
    apiKey: "OpenAI API Key",
    testConnection: "测试连接",
    clear: "清除",
    notSet: "尚未设置",
    apiNotice: "API Key只用于调用所选模型。建议仅在本机研究环境中使用，不要在公共设备上保存。",
    modelSettings: "模型设置",
    modelLabel: "对话模型",
    tempNotice: "0.3-0.5适合稳定提取信息；如果模型不支持该参数，请在请求层禁用发送。",
    generationSettings: "生成设置",
    englishPrompt: "生成英文图像与声音Prompt",
    strictNoPsych: "禁止心理诊断式表述",
    fileSettings: "文件保存设置",
    outputLocation: "项目保存位置",
    restoreDefault: "恢复默认",
    fileNotice: "当前Web原型会下载 prompt 文件和 log 文件；Electron版本可接入本地文件夹写入。",
    dialogOk: "知道了",
    generatedTitle: "已生成文件",
    generatedDesc: "点击保存后会写入 Prompt/generated_prompt.json 和 Log/{logName}。",
    savedTitle: "保存成功",
    savedBody: "已保存到：\n{promptPath}\n{logPath}",
    helpBody: "每轮只需要回答你愿意回答的部分。系统会整理场景信息，但不会判断或解释你的心理状态。",
    historyTitle: "历史项目",
    historyWithDraft: "已找到一个本机草稿。点击首页的“开始创作”会新建项目；历史数据仍保存在本机。",
    historyEmpty: "还没有本机草稿。完成一轮对话后会自动保存。",
    resetConfirm: "确认重新开始当前创作？",
    archiveReady: "我已经整理好一份场景档案。你可以查看它，确认是否符合你的想象。",
    aiThinking: "AI正在整理你的回答。",
    generatedPromptPreview: "UE可以读取 prompt1_environment_360、prompt2_sound 和 prompt3_music。",
    validating: "正在验证",
    connectionSuccess: "连接成功",
    invalidKey: "API Key无效",
    connectionFailed: "连接失败",
    unavailableForKey: "当前Key不可用",
    generationFailed: "生成失败",
    downloadFailed: "下载失败",
    openFailed: "打开失败",
    openFailedBody: "无法解析这个JSON文件。请确认它是本系统导出的历史log或场景JSON。",
    openedHistory: "已打开历史JSON。你可以继续查看或编辑档案。",
    introGuide: "你可以先深呼吸一下，让注意力回到此刻。试着想一想，最近有没有一件让你印象很深的事——它带给你的是什么样的情绪？让这份情绪慢慢展开，看看心里浮现出怎样的一个画面。当你心里大概有了这样一个画面，我们就从这里开始，一起把它变成一个可以看见、可以进入的内心风景。回答问题时，不需要立刻组织好语言；如果愿意，也可以闭上眼睛想一想，再写下最先出现的画面。",
    liveArchiveTitle: "当前档案",
    liveArchiveDesc: "你的回答会在这里逐步形成场景轮廓。",
    archiveCurrentFocus: "正在慢慢形成：{field}",
    archiveEmpty: "这里会随着你的回答慢慢出现，不需要一次想完整。",
  },
  "en-US": {
    appTitle: "AI Inner Landscape Co-Creation System",
    tagline: "Turn a present feeling into a place you can see and enter.",
    history: "History",
    help: "Help",
    settings: "Settings",
    homeTitle: "Choose Language",
    homeDesc: "Choose the language for the introduction, voice, interface, and dialogue.",
    start: "Continue",
    openProject: "Open Project",
    debugSkipToConfirm: "Debug: Skip to Generation Screen",
    p1: "There is no correct answer",
    p2: "The system does not diagnose you",
    p3: "You can say you are unsure",
    p4: "The scene meaning is yours",
    chatTitle: "Creation Dialogue",
    chatDesc: "Answer only what you want to answer. AI will organize the scene archive in the background.",
    viewArchive: "View Archive",
    musicOn: "Music On",
    musicOff: "Music Off",
    reset: "Restart",
    inputPlaceholder: "Write whatever comes to mind first. It does not need to be complete.",
    archivePlaceholder: "The scene archive has been created. Please edit it on the archive page.",
    back: "Back",
    send: "Send",
    thinking: "Thinking",
    confirmTitle: "Confirm Your Inner Landscape",
    confirmDesc: "Check whether this matches your imagination. You can edit the fields directly.",
    backToChat: "Back to Chat",
    generateFiles: "Generate Files",
    downloadFiles: "Save Prompt and Log",
    generate2dExperience: "Generate 2D Experience",
    startExperience: "Start Experience",
    exitExperience: "Exit Experience",
    generating2dExperience: "Generating 2D Experience",
    experienceReadyTitle: "2D Experience Ready",
    experienceReadyDesc: "The image and sound effect are ready. You can start the experience.",
    experienceFailed: "2D Experience Failed",
    generateVrExperience: "Generate VR Experience",
    generatingVrExperience: "Generating VR experience (panorama + sound), this can take a minute or two…",
    vrExperienceReady: "VR experience generated and written to the fixed path UE imports from. Click the import node in the editor to jump straight in, no more waiting.",
    vrExperienceFailed: "VR Experience Generation Failed",
    elevenLabsKey: "ElevenLabs API Key",
    soundProviderLabel: "Sound Effect Provider",
    falApiKey: "fal.ai API Key",
    settingsDesc: "The API key is kept only in this browser session by default.",
    language: "Language",
    languageLabel: "Interface and Dialogue Language",
    apiSettings: "API Settings",
    apiKey: "OpenAI API Key",
    testConnection: "Test Connection",
    clear: "Clear",
    notSet: "Not set",
    apiNotice: "The API key is only used to call the selected model. Use it only in a local research environment.",
    modelSettings: "Model Settings",
    modelLabel: "Dialogue Model",
    tempNotice: "0.3-0.5 is recommended for stable extraction. Unsupported parameters are omitted automatically.",
    generationSettings: "Generation Settings",
    englishPrompt: "Generate English image and sound prompts",
    strictNoPsych: "Block psychological diagnosis wording",
    fileSettings: "File Save Settings",
    outputLocation: "Project Save Location",
    restoreDefault: "Restore Default",
    fileNotice: "This web prototype downloads a prompt file and a log file. Electron can write to a local folder.",
    dialogOk: "OK",
    generatedTitle: "Files Generated",
    generatedDesc: "Saving writes Prompt/generated_prompt.json and Log/{logName}.",
    savedTitle: "Saved",
    savedBody: "Saved to:\n{promptPath}\n{logPath}",
    helpBody: "Answer only the parts you want to answer. The system organizes scene information without judging or interpreting your psychological state.",
    historyTitle: "History",
    historyWithDraft: "A local draft was found. Starting again creates a new project; the history data remains saved locally.",
    historyEmpty: "No local draft yet. A draft is saved automatically after each turn.",
    resetConfirm: "Restart the current creation?",
    archiveReady: "I have organized a scene archive. You can view it and confirm whether it matches your imagination.",
    aiThinking: "AI is organizing your answer.",
    generatedPromptPreview: "UE can read prompt1_environment_360, prompt2_sound, and prompt3_music.",
    validating: "Validating",
    connectionSuccess: "Connected",
    invalidKey: "Invalid API key",
    connectionFailed: "Connection failed",
    unavailableForKey: "Unavailable for this key",
    generationFailed: "Generation Failed",
    downloadFailed: "Download Failed",
    openFailed: "Open Failed",
    openFailedBody: "Could not parse this JSON file. Please use a history log or scene JSON exported by this system.",
    openedHistory: "History JSON opened. You can continue reviewing or editing the archive.",
    introGuide: "Take a slow breath first, and let your attention settle here. Try to think of something that left a strong impression on you recently — what emotion did it bring up? Let that feeling unfold, and notice what image starts to form in your mind. Once you have a rough picture in mind, that's where we'll begin, and together we'll slowly turn it into an inner landscape you can see and enter. When answering, you do not need to have polished words ready; if you like, you can close your eyes for a moment and write down the first image that appears.",
    liveArchiveTitle: "Current Archive",
    liveArchiveDesc: "Your answers will gradually form a visible scene outline here.",
    archiveCurrentFocus: "Slowly forming: {field}",
    archiveEmpty: "This will appear gradually as you answer. It does not need to be complete at once.",
  },
};

const FIELD_LABELS = {
  "zh-CN": Object.fromEntries(FIELD_DEFS.map(([key, label]) => [key, label])),
  "en-US": {
    feeling_keyword: "Feeling Keyword",
    place: "Place",
    season: "Season",
    time_of_day: "Time of Day",
    weather: "Weather",
    lighting: "Lighting",
    sound_sources: "Sound Sources",
    overall_sound_level: "Overall Sound Level",
    openness: "Openness",
    visibility: "Visibility",
    path_or_exit: "Path or Exit",
    connectivity: "Connectivity",
    important_objects: "Important Objects",
    required_elements: "Required Elements",
    excluded_elements: "Excluded Elements",
  },
};

const CONFIRM_GROUPS = {
  "zh-CN": ["感受关键词", "场景基础", "天气与光线", "声音", "空间结构", "重要细节"],
  "en-US": ["Feeling Keyword", "Scene Basis", "Weather and Light", "Sound", "Spatial Structure", "Important Details"],
};

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

const $ = (id) => document.getElementById(id);

function lang() {
  return state.settings.language || "en-US";
}

function t(key, replacements = {}) {
  const template = I18N[lang()]?.[key] || I18N["zh-CN"][key] || key;
  return Object.entries(replacements).reduce((text, [name, value]) => text.replace(`{${name}}`, value), template);
}

function questionsForLang() {
  return QUESTIONS[lang()] || QUESTIONS["zh-CN"];
}

function applyLanguage() {
  document.documentElement.lang = lang();
  document.title = t("appTitle");
  document.querySelector(".brand").textContent = t("appTitle");
  document.querySelector(".tagline").textContent = t("tagline");
  $("historyBtn").title = t("history");
  $("historyBtn").setAttribute("aria-label", t("history"));
  $("helpBtn").title = t("help");
  $("helpBtn").setAttribute("aria-label", t("help"));
  $("settingsBtn").title = t("settings");
  $("settingsBtn").setAttribute("aria-label", t("settings"));
  document.querySelector(".home-copy h1").textContent = t("homeTitle");
  document.querySelector(".home-copy p").textContent = t("homeDesc");
  $("homeLanguageSelect").value = lang();
  document.querySelector(".language-choice label").textContent = lang() === "en-US" ? "Language" : "语言";
  $("startBtn").textContent = t("start");
  document.querySelector('label[for="projectFile"]').textContent = t("openProject");
  $("debugSkipBtn").textContent = t("debugSkipToConfirm");
  document.querySelectorAll(".principles span").forEach((item, index) => {
    item.textContent = t(`p${index + 1}`);
  });
  document.querySelector(".chat-header h2").textContent = t("chatTitle");
  document.querySelector(".chat-header p").textContent = t("chatDesc");
  $("openConfirmBtn").textContent = t("viewArchive");
  if ($("musicToggleBtn")) $("musicToggleBtn").textContent = musicState.playing ? t("musicOn") : t("musicOff");
  $("resetBtn").textContent = t("reset");
  $("backBtn").textContent = t("back");
  document.querySelector('#messageForm button[type="submit"]').textContent = state.isCallingAI ? t("thinking") : t("send");
  $("messageInput").placeholder = state.archiveOpen ? t("archivePlaceholder") : t("inputPlaceholder");
  document.querySelector(".confirm-header h1").textContent = t("confirmTitle");
  document.querySelector(".confirm-header p").textContent = t("confirmDesc");
  $("backToCreatorBtn").textContent = t("backToChat");
  $("confirmExportBtn").textContent = t("generateFiles");
  $("downloadResultBtn").textContent = t("downloadFiles");
  $("generate2dBtn").textContent = t("generate2dExperience");
  $("generateVrBtn").textContent = t("generateVrExperience");
  $("startExperienceBtn").textContent = t("startExperience");
  $("exitExperienceBtn").textContent = t("exitExperience");
  $("introText").textContent = t("introGuide");
  $("readyBtn").textContent = lang() === "en-US" ? "I'm Ready" : "我准备好了";
  $("liveArchiveTitle").textContent = t("liveArchiveTitle");
  $("liveArchiveDesc").textContent = t("liveArchiveDesc");
  document.querySelector(".drawer-header h2").textContent = t("settings");
  document.querySelector(".drawer-header p").textContent = t("settingsDesc");
  $("closeSettingsBtn").title = t("settings");
  const sections = document.querySelectorAll(".settings-section");
  sections[0].querySelector("h3").textContent = t("language");
  sections[0].querySelector("label").textContent = t("languageLabel");
  sections[1].querySelector("h3").textContent = t("apiSettings");
  sections[1].querySelector('label[for="apiKeyInput"]').textContent = t("apiKey");
  sections[1].querySelector('label[for="elevenLabsKeyInput"]').textContent = t("elevenLabsKey");
  sections[1].querySelector('label[for="soundProviderSelect"]').textContent = t("soundProviderLabel");
  sections[1].querySelector('label[for="falKeyInput"]').textContent = t("falApiKey");
  $("testApiBtn").textContent = t("testConnection");
  $("clearApiBtn").textContent = t("clear");
  if ($("apiStatus").textContent === I18N["zh-CN"].notSet || $("apiStatus").textContent === I18N["en-US"].notSet) $("apiStatus").textContent = t("notSet");
  sections[1].querySelector(".notice").textContent = t("apiNotice");
  sections[2].querySelector("h3").textContent = t("modelSettings");
  sections[2].querySelector('label[for="modelSelect"]').textContent = t("modelLabel");
  sections[2].querySelector(".notice").textContent = t("tempNotice");
  sections[3].querySelector("h3").textContent = t("generationSettings");
  sections[3].querySelectorAll("label")[0].lastChild.textContent = ` ${t("englishPrompt")}`;
  sections[3].querySelectorAll("label")[1].lastChild.textContent = ` ${t("strictNoPsych")}`;
  sections[4].querySelector("h3").textContent = t("fileSettings");
  sections[4].querySelector('label[for="outputFolderInput"]').textContent = t("outputLocation");
  $("restoreFolderBtn").textContent = t("restoreDefault");
  sections[4].querySelector(".notice").textContent = t("fileNotice");
  document.querySelector("#infoDialog button").textContent = t("dialogOk");
  refreshModelOptionLabels();
}

function refreshModelOptionLabels() {
  [...$("modelSelect").options].forEach((option) => {
    const cleanLabel = option.textContent.replace(`（${I18N["zh-CN"].unavailableForKey}）`, "").replace(` (${I18N["en-US"].unavailableForKey})`, "");
    option.textContent = option.disabled
      ? lang() === "en-US" ? `${cleanLabel} (${t("unavailableForKey")})` : `${cleanLabel}（${t("unavailableForKey")}）`
      : cleanLabel;
  });
}

function emptyField(value = null, status = "missing", source = "user_explicit") {
  return {
    value,
    status,
    source,
    confidence: status === "confirmed" ? 1 : 0,
    locked: false,
    needs_follow_up: status === "missing" || status === "partial",
  };
}

function initScene() {
  FIELD_DEFS.forEach(([key]) => {
    const arrayFields = ["weather", "sound_sources", "important_objects", "required_elements", "excluded_elements"];
    state.scene[key] = emptyField(arrayFields.includes(key) ? [] : "");
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function pushSnapshot() {
  state.snapshots.push({
    scene: clone(state.scene),
    messages: clone(state.messages),
    rawResponses: clone(state.rawResponses),
    revisions: clone(state.revisions),
    checklistHistory: clone(state.checklistHistory),
    focusCounts: clone(state.focusCounts),
    archiveOpen: state.archiveOpen,
    focus: state.focus,
  });
  if (state.snapshots.length > 30) state.snapshots.shift();
}

function restoreSnapshot() {
  const snap = state.snapshots.pop();
  if (!snap) return;
  Object.assign(state, snap);
  renderAll();
  saveDraft();
}

function ensureMusicPlayers() {
  if (musicState.audios.length) return;
  musicState.audios = [new Audio(), new Audio()];
  musicState.audios.forEach((audio) => {
    audio.preload = "auto";
    audio.volume = 0;
    audio.addEventListener("timeupdate", () => maybeCrossfadeMusic(audio));
    audio.addEventListener("ended", () => {
      if (!musicState.stopping && audio === musicState.audios[musicState.activeChannel]) {
        playNextMusicTrack();
      }
    });
  });
}

async function startBackgroundMusic(volume = musicState.targetVolume) {
  ensureMusicPlayers();
  clearMusicTimers();
  musicState.audios.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0;
  });
  musicState.stopping = false;
  musicState.playing = true;
  musicState.trackIndex = 0;
  musicState.activeChannel = 0;
  musicState.crossfadeStarted = false;
  musicState.currentVolume = volume;
  const audio = musicState.audios[musicState.activeChannel];
  audio.src = MUSIC_TRACKS[musicState.trackIndex];
  audio.currentTime = 0;
  audio.volume = 0;
  try {
    await audio.play();
    musicState.playing = true;
    fadeAudio(audio, musicState.currentVolume, musicState.fadeMs);
  } catch {
    musicState.playing = false;
  }
  renderCreatorState();
}

function duckBackgroundMusic() {
  musicState.currentVolume = musicState.duckVolume;
  const audio = musicState.audios[musicState.activeChannel];
  if (audio && musicState.playing) fadeAudio(audio, musicState.duckVolume, 600);
}

function restoreBackgroundMusicVolume() {
  musicState.currentVolume = musicState.targetVolume;
  const audio = musicState.audios[musicState.activeChannel];
  if (audio && musicState.playing) fadeAudio(audio, musicState.targetVolume, musicState.fadeMs);
}

function maybeCrossfadeMusic(audio) {
  if (!musicState.playing || musicState.stopping || musicState.crossfadeStarted) return;
  if (audio !== musicState.audios[musicState.activeChannel]) return;
  if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
  const remainingMs = (audio.duration - audio.currentTime) * 1000;
  if (remainingMs <= musicState.fadeMs + 250) {
    musicState.crossfadeStarted = true;
    playNextMusicTrack();
  }
}

async function playNextMusicTrack() {
  if (!musicState.playing || musicState.stopping) return;
  ensureMusicPlayers();
  const previousChannel = musicState.activeChannel;
  const nextChannel = previousChannel === 0 ? 1 : 0;
  const previous = musicState.audios[previousChannel];
  const next = musicState.audios[nextChannel];
  musicState.trackIndex = (musicState.trackIndex + 1) % MUSIC_TRACKS.length;
  musicState.activeChannel = nextChannel;
  musicState.crossfadeStarted = false;
  next.src = MUSIC_TRACKS[musicState.trackIndex];
  next.currentTime = 0;
  next.volume = 0;
  try {
    await next.play();
    fadeAudio(previous, 0, musicState.fadeMs, true);
    fadeAudio(next, musicState.currentVolume, musicState.fadeMs);
  } catch {
    musicState.activeChannel = previousChannel;
  }
}

function stopBackgroundMusic() {
  if (!musicState.audios.length || musicState.stopping) return;
  musicState.stopping = true;
  musicState.playing = false;
  musicState.audios.forEach((audio) => fadeAudio(audio, 0, musicState.fadeMs, true));
  renderCreatorState();
}

const INTRO_VOICE_VOLUME = 0.85;

function ensureIntroVoice() {
  if (introVoiceState.audio) return introVoiceState.audio;
  introVoiceState.audio = new Audio();
  introVoiceState.audio.preload = "auto";
  introVoiceState.audio.addEventListener("ended", () => restoreBackgroundMusicVolume());
  return introVoiceState.audio;
}

async function playIntroVoice() {
  const audio = ensureIntroVoice();
  if (introVoiceState.timer) window.clearTimeout(introVoiceState.timer);
  audio.pause();
  duckBackgroundMusic();
  audio.src = INTRO_VOICE_TRACKS[lang()] || INTRO_VOICE_TRACKS["zh-CN"];
  audio.currentTime = 0;
  audio.volume = INTRO_VOICE_VOLUME;
  try {
    await audio.play();
  } catch {
    // The intro text remains visible if the browser or device blocks playback.
    restoreBackgroundMusicVolume();
  }
}

function stopIntroVoice(fade = false) {
  const audio = introVoiceState.audio;
  if (!audio) return;
  if (introVoiceState.timer) window.clearTimeout(introVoiceState.timer);
  if (fade) restoreBackgroundMusicVolume();
  if (!fade || audio.paused) {
    audio.pause();
    audio.currentTime = 0;
    return;
  }
  const startVolume = audio.volume;
  const startedAt = performance.now();
  const fadeMs = 350;
  const step = () => {
    const progress = Math.min(1, (performance.now() - startedAt) / fadeMs);
    audio.volume = startVolume * (1 - progress);
    if (progress < 1) {
      introVoiceState.timer = window.setTimeout(step, 40);
    } else {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = INTRO_VOICE_VOLUME;
    }
  };
  step();
}

function fadeAudio(audio, targetVolume, durationMs, pauseWhenDone = false) {
  const startVolume = audio.volume;
  const startedAt = performance.now();
  const step = () => {
    const progress = Math.min(1, (performance.now() - startedAt) / durationMs);
    audio.volume = startVolume + (targetVolume - startVolume) * progress;
    if (progress < 1) {
      const timer = window.setTimeout(step, 50);
      musicState.timers.add(timer);
    } else if (pauseWhenDone) {
      audio.pause();
      audio.currentTime = 0;
    }
  };
  step();
}

function clearMusicTimers() {
  musicState.timers.forEach((timer) => window.clearTimeout(timer));
  musicState.timers.clear();
}

function valueText(field) {
  const value = field?.value;
  if (Array.isArray(value)) {
    if (!value.length) return field.status === "confirmed" ? (lang() === "en-US" ? "None" : "无") : (lang() === "en-US" ? "Not set" : "尚未确定");
    return value.map((item) => typeof item === "string" ? item : item.name || JSON.stringify(item)).join("、");
  }
  return value || (field?.status === "skipped_by_user" ? (lang() === "en-US" ? "Skipped" : "已跳过") : (lang() === "en-US" ? "Not set" : "尚未确定"));
}

function isDone(field) {
  return ["confirmed", "skipped_by_user", "not_applicable"].includes(field.status);
}

function moduleStatus(module) {
  if (module.id === "soundscape") {
    const sound = state.scene.sound_sources;
    if (isDone(sound)) return "complete";
    if (sound.status === "partial" || sound.status === "inferred") return "partial";
    return "missing";
  }
  const fields = module.fields.map((key) => state.scene[key]);
  if (fields.every(isDone)) return "complete";
  if (fields.some((field) => isDone(field) || field.status === "partial" || field.status === "inferred")) return "partial";
  return "missing";
}

function checklistStatus() {
  return Object.fromEntries(MODULES.map((module) => [module.id, moduleStatus(module)]));
}

function readyForSummary() {
  return MODULES.every((module) => moduleStatus(module) === "complete");
}

function setField(key, value, status = "confirmed", source = "user_explicit") {
  const field = state.scene[key];
  if (!field || (field.locked && source !== "user_edit")) return false;
  const oldValue = clone(field.value);
  const normalizedValue = normalizeValue(key, value);
  if (JSON.stringify(oldValue) === JSON.stringify(normalizedValue) && field.status === status) return false;
  state.scene[key] = {
    ...field,
    value: normalizedValue,
    status,
    source,
    confidence: status === "confirmed" ? 1 : status === "partial" ? 0.55 : 0.35,
    needs_follow_up: status === "partial" || status === "missing" || status === "inferred",
  };
  state.revisions.push({
    field: key,
    old_value: oldValue,
    new_value: normalizedValue,
    source,
    status,
    timestamp: new Date().toISOString(),
    user_confirmed: status === "confirmed",
  });
  return true;
}

function normalizeValue(key, value) {
  const arrayFields = ["weather", "sound_sources", "important_objects", "required_elements", "excluded_elements"];
  if (!arrayFields.includes(key)) return String(value ?? "").trim();
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/[，,、；;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function addMessage(role, text, payload = null) {
  state.messages.push({
    id: crypto.randomUUID(),
    role,
    text,
    payload,
    timestamp: new Date().toISOString(),
  });
}

function beginIntro() {
  applyLanguage();
  showScreen("intro");
  startBackgroundMusic(musicState.duckVolume);
  playIntroVoice();
}

function startProject() {
  stopIntroVoice(true);
  initScene();
  state.messages = [];
  state.rawResponses = [];
  state.revisions = [];
  state.checklistHistory = [];
  state.focusCounts = {};
  state.snapshots = [];
  state.output = null;
  state.experience = null;
  state.archiveOpen = false;
  state.focus = "feeling_keyword";
  addMessage("assistant", questionsForLang().feeling_keyword);
  showScreen("creator");
  renderAll();
  saveDraft();
  if (!musicState.playing) startBackgroundMusic();
}

const DEBUG_DEFAULT_SCENE = {
  feeling_keyword: "平静",
  place: "海边的松树林",
  season: "夏天",
  time_of_day: "黄昏",
  weather: ["微风", "晴朗"],
  lighting: "温暖的橙红色夕阳光线",
  sound_sources: ["海浪声", "风吹过松针的声音"],
  overall_sound_level: "安静",
  openness: "开阔，能看到很远的海平线",
  visibility: "视野开阔，没有遮挡",
  path_or_exit: "有一条通向海边的小路",
  connectivity: "整片连在一起，没有分区",
  important_objects: ["一块被海水打磨光滑的礁石"],
  required_elements: ["海"],
  excluded_elements: ["人群", "建筑"],
};

// Dev shortcut: skips the whole chat interview and drops straight onto the
// confirm screen with a complete, ready-to-generate scene so 2D/VR generation
// can be tested without re-answering every question each time.
function debugSkipToConfirm() {
  stopIntroVoice(true);
  initScene();
  state.messages = [];
  state.rawResponses = [];
  state.revisions = [];
  state.checklistHistory = [];
  state.focusCounts = {};
  state.snapshots = [];
  state.output = null;
  state.experience = null;
  Object.entries(DEBUG_DEFAULT_SCENE).forEach(([key, value]) => {
    setField(key, value, "confirmed", "user_explicit");
  });
  state.focus = "summary";
  state.archiveOpen = true;
  stopBackgroundMusic();
  showScreen("confirm");
  renderConfirm();
  renderCreatorState();
  saveDraft();
}

function showScreen(screen) {
  state.screen = screen;
  $("homeScreen").classList.toggle("hidden", screen !== "home");
  $("introScreen").classList.toggle("hidden", screen !== "intro");
  $("creatorScreen").classList.toggle("hidden", screen !== "creator");
  $("confirmScreen").classList.toggle("hidden", screen !== "confirm");
  $("experienceScreen").classList.toggle("hidden", screen !== "experience");
}

async function handleUserMessage(text) {
  if (state.isCallingAI) return;
  const message = text.trim();
  if (!message) return;
  const previousFocus = state.focus;
  pushSnapshot();
  state.focusCounts[previousFocus] = (state.focusCounts[previousFocus] || 0) + 1;
  addMessage("user", message);
  renderAll();
  setCallingAI(true);
  let agentResult;
  let extraction = {};
  let agentSource = "openai";
  try {
    agentResult = await callOpenAIAgent(message);
    extraction = applyAgentUpdates(agentResult.extracted_updates || {});
    extraction = { ...extraction, ...applyLocalGuardUpdates(previousFocus, message) };
    extraction = { ...extraction, ...finalizeOverAskedFocus(previousFocus) };
  } catch (error) {
    agentSource = "openai_error";
    extraction = {};
    agentResult = {
      assistant_message: lang() === "en-US"
        ? `AI connection failed, so the scene state was not updated. Please check settings and send that message again. Error: ${error.message || "Unknown error"}`
        : `AI连接出错，当前场景状态没有被更新。请检查设置后重新发送刚才那句话。错误：${error.message || "未知错误"}`,
      next_focus: state.focus,
      ready_for_summary: false,
      error: error.message || String(error),
    };
  } finally {
    setCallingAI(false);
  }
  const checklist = checklistStatus();
  state.checklistHistory.push({ turn: state.rawResponses.length + 1, ...checklist });
  const machineNextFocus = chooseNextFocus(message);
  const nextFocus = sanitizeNextFocus(machineNextFocus);
  state.rawResponses.push({
    turn: state.rawResponses.length + 1,
    text: message,
    timestamp: new Date().toISOString(),
    extracted_updates: extraction,
    checklist_status: checklist,
    next_focus: nextFocus,
    agent_suggested_next_focus: agentResult.next_focus || null,
    model_configuration: currentModelConfig(),
    agent_source: agentSource,
    raw_agent_result: agentResult,
  });
  if (readyForSummary() || agentResult.ready_for_summary) {
    state.focus = "summary";
    addMessage("assistant", t("archiveReady"));
  } else {
    state.focus = nextFocus;
    addMessage("assistant", shouldUseAgentMessage(agentResult, nextFocus) ? agentResult.assistant_message.trim() : buildQuestion(nextFocus, message));
  }
  renderAll();
  saveDraft();
}

function setCallingAI(isCalling) {
  state.isCallingAI = isCalling;
  setComposerLocked(isCalling || state.archiveOpen);
  if (isCalling) addMessage("system", t("aiThinking"));
  if (!isCalling) {
    const last = state.messages[state.messages.length - 1];
    if (last?.role === "system" && (last.text === I18N["zh-CN"].aiThinking || last.text === I18N["en-US"].aiThinking)) state.messages.pop();
  }
  renderMessages();
}

function focusToFields(focus) {
  const map = {
    feeling_keyword: ["feeling_keyword"],
    place: ["place"],
    season: ["season", "time_of_day"],
    weather: ["weather", "lighting"],
    sound_sources: ["sound_sources", "overall_sound_level"],
    openness: ["openness", "visibility"],
    path_or_exit: ["path_or_exit"],
    connectivity: ["connectivity"],
    important_objects: ["important_objects", "required_elements", "excluded_elements"],
  };
  return map[focus] || [focus];
}

function focusComplete(focus) {
  if (focus === "sound_sources") return isDone(state.scene.sound_sources);
  if (focus === "season") return isDone(state.scene.season) && isDone(state.scene.time_of_day);
  if (focus === "weather") return isDone(state.scene.weather) && isDone(state.scene.lighting);
  if (focus === "openness") return isDone(state.scene.openness) && isDone(state.scene.visibility);
  if (focus === "important_objects") {
    return isDone(state.scene.important_objects) && isDone(state.scene.required_elements) && isDone(state.scene.excluded_elements);
  }
  return focusToFields(focus).every((key) => isDone(state.scene[key]));
}

function applyLocalGuardUpdates(previousFocus, text) {
  const updates = {};
  const priorAssistant = lastAssistantText();
  const apply = (key, value, status = "confirmed", source = "user_explicit") => {
    if (setField(key, value, status, source)) updates[key] = clone(state.scene[key]);
  };

  const genericWeather = collectMatches(text, ["炎热", "干旱", "晴天", "大晴天", "小雨", "大雨", "雨", "薄雾", "雾", "雪", "风", "雷暴", "阴天", "多云", "潮湿", "hot", "dry", "sunny", "clear sky", "rain", "fog", "snow", "windy", "storm", "cloudy", "humid"]);
  if (genericWeather.length && !isDone(state.scene.weather)) apply("weather", mergeArray(state.scene.weather.value, genericWeather));
  const genericLighting = collectMatches(text, ["强烈", "刺眼", "充足", "暖光", "冷光", "柔和", "昏暗", "很暗", "明亮", "灯光", "阳光", "月光", "大太阳", "strong light", "harsh light", "bright", "dim", "dark", "sunlight", "moonlight", "soft light", "warm light"]);
  if (genericLighting.length && !isDone(state.scene.lighting)) apply("lighting", genericLighting.join("、"));
  const genericSounds = collectMatches(text, ["风声", "风的声音", "沙尘", "雨声", "海浪", "火车", "水声", "泉水", "雷声", "金属摩擦", "wind", "sand", "rain", "waves", "train", "water", "spring", "thunder", "metal"]);
  if (genericSounds.length && !isDone(state.scene.sound_sources)) {
    apply("sound_sources", mergeArray(state.scene.sound_sources.value, genericSounds));
    if (!isDone(state.scene.overall_sound_level)) apply("overall_sound_level", "未指定", "not_applicable", "user_implicit");
  }

  if (previousFocus === "weather") {
    const weather = collectMatches(text, ["炎热", "干旱", "小雨", "大雨", "雨", "薄雾", "雾", "雪", "风", "雷暴", "阴天", "晴天", "多云", "潮湿"]);
    if (weather.length) apply("weather", mergeArray(state.scene.weather.value, weather));
    const lighting = collectMatches(text, ["强烈", "刺眼", "暖光", "冷光", "柔和", "昏暗", "很暗", "明亮", "灯光", "阳光", "月光"]);
    if (lighting.length) apply("lighting", lighting.join("、"));
    if (/^(是|是的|对|没错|yes|right|correct|because of the sun|the sun is strong|因为阳光|阳光很强)[。！？!?\s]*$/i.test(text.trim()) && state.scene.lighting.status === "inferred") {
      apply("lighting", state.scene.lighting.value, "confirmed", "user_confirmed_agent_suggestion");
    }
  }

  if (previousFocus === "sound_sources") {
    const sounds = collectMatches(text, ["风声", "沙尘", "雨声", "海浪", "火车", "水声", "泉水", "雷声", "金属摩擦"]);
    if (sounds.length) apply("sound_sources", mergeArray(state.scene.sound_sources.value, sounds));
    if (/(不能了|没有了|没有其他|不能|无|听不见|听不到|nothing else|no other|none|cannot hear|can't hear)/i.test(text) && state.scene.sound_sources.value.length) {
      apply("sound_sources", state.scene.sound_sources.value);
      apply("overall_sound_level", /安静|听不见|听不到|quiet|silent|cannot hear|can't hear/i.test(text) ? (lang() === "en-US" ? "quiet" : "安静") : (lang() === "en-US" ? "unspecified" : "未指定"), /安静|quiet|silent/i.test(text) ? "confirmed" : "not_applicable", "user_explicit");
    }
    if (/安静|寂静|很静|quiet|silent/i.test(text)) apply("overall_sound_level", lang() === "en-US" ? "quiet" : "安静");
  }

  if (previousFocus === "openness") {
    if (/一望无际|开阔|开放|open|wide|vast|boundless/i.test(text)) apply("openness", lang() === "en-US" ? "open" : "开阔");
    if (/封闭|室内|狭窄|enclosed|indoor|narrow/i.test(text)) apply("openness", lang() === "en-US" ? "enclosed" : "封闭");
    if (/半开放/.test(text)) apply("openness", "半开放");
    if (/很远|看得很远|能看到很远|一望无际|不错|清晰|很清晰|far|very far|clear|good visibility/i.test(text)) {
      apply("visibility", /清晰|不错|clear|good visibility/i.test(text) ? (lang() === "en-US" ? "clear visibility" : "视野清晰，能见度良好") : (lang() === "en-US" ? "can see very far" : "能看到很远"));
    }
    if (isDone(state.scene.openness) && !isDone(state.scene.visibility) && (state.focusCounts.openness || 0) >= 2) {
      apply("visibility", lang() === "en-US" ? "can see far" : "能看到较远", "confirmed", "user_implicit");
    }
  }

  if (previousFocus === "path_or_exit") {
    if (/(没有|无).*(路|出口|入口)|四周都是|都是沙漠|没有明显|no path|no exit|no entrance|nothing visible|can't see/i.test(text)) {
      apply("path_or_exit", lang() === "en-US" ? "no clear path or exit" : "没有明显路径或出口");
      if (!isDone(state.scene.connectivity)) apply("connectivity", lang() === "en-US" ? "continuous space" : "连续空间", "confirmed", "user_implicit");
    } else {
      const path = extractPath(text);
      if (path) apply("path_or_exit", path);
    }
  }

  if (previousFocus === "connectivity") {
    if (/连续|一个整体|都是|四周|continuous|one space|all connected/i.test(text)) apply("connectivity", lang() === "en-US" ? "continuous space" : "连续空间");
    if (/封闭|enclosed/i.test(text)) apply("connectivity", lang() === "en-US" ? "independent enclosed space" : "独立封闭空间");
    if (/分开|隔开|几个区域|多个区域|separate|divided|several areas|multiple areas/i.test(text)) apply("connectivity", lang() === "en-US" ? "divided into several areas" : "由几个分开的区域组成");
  }

  if (previousFocus === "important_objects") {
    const noAnswer = /(没有|也没有|无|没有了|不需要|都没有|no|none|nothing|not really)/i.test(text.trim());
    const detailTarget = importantDetailTarget(priorAssistant);

    if (detailTarget === "excluded_elements") {
      if (noAnswer) apply("excluded_elements", []);
      else apply("excluded_elements", mergeArray(state.scene.excluded_elements.value, extractElementList(text)));
    } else if (detailTarget === "required_elements") {
      if (noAnswer) apply("required_elements", []);
      else apply("required_elements", mergeArray(state.scene.required_elements.value, extractElementList(text)));
    } else if (detailTarget === "important_objects" || !noAnswer) {
      const objects = collectObjects(text);
      if (objects.length) apply("important_objects", mergeObjectArray(state.scene.important_objects.value, objects));
      if (!objects.length && !noAnswer) apply("important_objects", mergeObjectArray(state.scene.important_objects.value, extractElementList(text)));
      if (noAnswer && state.scene.important_objects.value.length) apply("important_objects", state.scene.important_objects.value);
    }

    if (state.focusCounts.important_objects >= MAX_FOCUS_ANSWERS.important_objects) {
      ["important_objects", "required_elements", "excluded_elements"].forEach((key) => {
        if (!isDone(state.scene[key])) apply(key, state.scene[key].value || []);
      });
    }
  }

  return updates;
}

function importantDetailTarget(priorAssistant) {
  if (/不想|不要|不得|不能|排除|不希望|must not|do not want|don't want|should not|exclude|avoid/i.test(priorAssistant)) {
    return "excluded_elements";
  }
  if (/必须|保留|留下|一定|需要|出现|must|kept|remain|required|need|should be there/i.test(priorAssistant)) {
    return "required_elements";
  }
  if (/重要|物件|物品|东西|地点|吸引|注意力|抓住|attention|important|object|thing|place|image/i.test(priorAssistant)) {
    return "important_objects";
  }
  if (isDone(state.scene.important_objects) && !isDone(state.scene.required_elements)) return "required_elements";
  if (isDone(state.scene.required_elements) && !isDone(state.scene.excluded_elements)) return "excluded_elements";
  return "important_objects";
}

function finalizeOverAskedFocus(focus) {
  const updates = {};
  const max = MAX_FOCUS_ANSWERS[focus] || 2;
  if ((state.focusCounts[focus] || 0) < max) return updates;
  focusToFields(focus).forEach((key) => {
    const field = state.scene[key];
    if (!field || isDone(field)) return;
    if (Array.isArray(field.value)) {
      if (setField(key, field.value || [], "confirmed", field.value.length ? field.source : "user_implicit")) updates[key] = clone(state.scene[key]);
    } else {
      if (setField(key, field.value || "未指定", field.value ? "confirmed" : "not_applicable", field.value ? field.source : "user_implicit")) updates[key] = clone(state.scene[key]);
    }
  });
  return updates;
}

function shouldUseAgentMessage(agentResult, nextFocus) {
  const message = agentResult?.assistant_message || "";
  if (!message) return false;
  if (agentResult?.next_focus !== nextFocus) return false;
  if (focusComplete(nextFocus)) return false;
  if (!messageLooksLikeFocus(message, nextFocus)) return false;
  if (isLeadingQuestion(message)) return false;
  if (isRepeatedAssistantMessage(message)) return false;
  if (asksCompletedField(message)) return false;
  return true;
}

function messageLooksLikeFocus(message, focus) {
  const rules = {
    feeling_keyword: /词|感受|感觉|word|feel|feeling/,
    place: /地方|地点|哪里|场景|空间|place|where|scene|space|environment/,
    season: /季节|时间|时候|白天|晚上|清晨|下午|黄昏|夜|season|time|morning|afternoon|dusk|night|day/,
    weather: /天气|光线|阳光|亮|暗|照|阴影|weather|light|sun|bright|dark|shadow/,
    sound_sources: /声音|听到|安静|声|sound|hear|quiet|silent/,
    openness: /开阔|封闭|开放|视野|看到|多远|范围|open|enclosed|view|see|far|visibility/,
    path_or_exit: /路|入口|出口|路径|通向|离开|path|entrance|exit|direction|leave/,
    connectivity: /连续|连接|分开|区域|空间|外界|边界|continuous|connected|separate|area|boundary|outside/,
    important_objects: /重要|物件|东西|地点|吸引|出现|排除|不要|important|object|thing|attention|appear|exclude|avoid/,
  };
  return rules[focus]?.test(message) ?? true;
}

function isLeadingQuestion(message) {
  const leadingPatterns = [
    /比如|for example|such as/,
    /例如/,
    /是.+还是|is it.+or/,
    /会不会是|could it be/,
    /是不是|is it/,
    /你可以|you can/,
    /可以是|it can be/,
    /炎热的夏天/,
    /某个房间|自然环境|城市/,
  ];
  return leadingPatterns.some((pattern) => pattern.test(message));
}

function isRepeatedAssistantMessage(message) {
  const recent = state.messages.filter((item) => item.role === "assistant").slice(-3).map((item) => normalizeQuestionText(item.text));
  const current = normalizeQuestionText(message);
  return recent.some((text) => text && (text === current || similarityScore(text, current) > 0.72));
}

function asksCompletedField(message) {
  const checks = [
    [["season"], /季节|season/],
    [["time_of_day"], /时间|白天|晚上|清晨|下午|黄昏|夜|time|morning|afternoon|dusk|night|day/],
    [["weather"], /天气|晴|雨|风|雾|雪|weather|sunny|rain|wind|fog|snow/],
    [["lighting"], /光线|阳光|亮|暗|照|light|sun|bright|dark/],
    [["sound_sources"], /声音|听到|声|sound|hear/],
    [["openness"], /开阔|封闭|开放|open|enclosed/],
    [["visibility"], /视野|看到|多远|能见度|view|see|far|visibility/],
    [["path_or_exit"], /路|入口|出口|路径|path|entrance|exit/],
    [["connectivity"], /连续|连接|分开|区域|continuous|connected|separate|area/],
  ];
  return checks.some(([keys, pattern]) => keys.every((key) => isDone(state.scene[key])) && pattern.test(message));
}

function normalizeQuestionText(text) {
  return text.replace(/[“”"'，。！？!?、\s]/g, "").slice(-48);
}

function similarityScore(a, b) {
  if (!a || !b) return 0;
  const setA = new Set([...a]);
  const setB = new Set([...b]);
  const intersection = [...setA].filter((char) => setB.has(char)).length;
  return intersection / Math.max(setA.size, setB.size);
}

function lastAssistantText() {
  const message = [...state.messages].reverse().find((item) => item.role === "assistant");
  return message?.text || "";
}

function extractElementList(text) {
  return text
    .replace(/不在|我想排除|想排除|排除|不要|不希望|不能出现|没有|也没有|无|我觉得|可能是|也许是|大概是|there is|there are|maybe|perhaps|I think|not really|nothing|none/gi, "")
    .split(/[，,、和与；;\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function callOpenAIAgent(userText) {
  const apiKey = $("apiKeyInput").value.trim() || sessionStorage.getItem("innerLandscapeApiKey") || state.settings.apiKey;
  const model = state.settings.model || "gpt-4o";
  if (!apiKey) {
    toggleSettings(true);
    throw new Error(lang() === "en-US" ? "OpenAI API key is not set" : "尚未设置OpenAI API Key");
  }
  if (!model) {
    toggleSettings(true);
    throw new Error(lang() === "en-US" ? "No dialogue model selected" : "尚未选择或输入对话模型");
  }
  const body = buildResponsesRequest(model, userText, true, true);
  try {
    return await postResponses(apiKey, body);
  } catch (error) {
    if (/schema|json_schema|format|response_format/i.test(error.message || "")) {
      return postResponses(apiKey, buildResponsesRequest(model, userText, includeTemperatureSupported(), false));
    }
    if (/temperature|unsupported|not support/i.test(error.message || "")) {
      return postResponses(apiKey, buildResponsesRequest(model, userText, false, true));
    }
    throw error;
  }
}

async function callFinalPromptAgent(scene) {
  const apiKey = $("apiKeyInput").value.trim() || sessionStorage.getItem("innerLandscapeApiKey") || state.settings.apiKey;
  const model = state.settings.model || "gpt-4o";
  if (!apiKey) throw new Error(lang() === "en-US" ? "OpenAI API key is not set" : "尚未设置OpenAI API Key");
  const body = buildFinalPromptRequest(model, scene, true, true);
  try {
    return await postResponses(apiKey, body);
  } catch (error) {
    if (/schema|json_schema|format|response_format/i.test(error.message || "")) {
      return postResponses(apiKey, buildFinalPromptRequest(model, scene, includeTemperatureSupported(), false));
    }
    if (/temperature|unsupported|not support/i.test(error.message || "")) {
      return postResponses(apiKey, buildFinalPromptRequest(model, scene, false, true));
    }
    throw error;
  }
}

function includeTemperatureSupported() {
  return Number.isFinite(Number(state.settings.temperature));
}

function buildResponsesRequest(model, userText, includeTemperature, useSchema) {
  const request = {
    model,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: buildAgentSystemPrompt() }],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: buildAgentUserPayload(userText) }],
      },
    ],
  };
  if (useSchema) {
    request.text = {
      format: {
        type: "json_schema",
        name: "inner_landscape_agent_turn",
        strict: false,
        schema: AGENT_RESPONSE_SCHEMA,
      },
    };
  }
  if (includeTemperature) request.temperature = Number(state.settings.temperature);
  return request;
}

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

async function postResponses(apiKey, body) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || (lang() === "en-US" ? `OpenAI request failed: ${response.status}` : `OpenAI请求失败：${response.status}`));
  }
  const text = extractResponseText(data);
  if (!text) throw new Error(lang() === "en-US" ? "The model did not return parseable text" : "模型没有返回可解析文本");
  return parseAgentJson(text);
}

function extractResponseText(data) {
  if (data.output_text) return data.output_text;
  const chunks = [];
  (data.output || []).forEach((item) => {
    (item.content || []).forEach((content) => {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
      if (content.type === "text" && content.text) chunks.push(content.text);
    });
  });
  return chunks.join("\n").trim();
}

function parseAgentJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(lang() === "en-US" ? "The model returned JSON that could not be parsed" : "模型返回的JSON无法解析");
    return JSON.parse(match[0]);
  }
}

function buildAgentSystemPrompt() {
  const dialogueLanguage = lang() === "en-US" ? "English" : "Chinese";
  return `你是“AI内心风景共创系统”的核心对话Agent。

当前界面与对话语言：${dialogueLanguage}。
assistant_message 必须使用 ${dialogueLanguage}。

你的任务：
1. 引导玩家把一个当下感受转化为结构化环境场景。
2. 每轮重新检查完整场景状态，而不是只分析当前问题。
3. 从玩家一句话里一次提取多个字段。
4. 根据你返回的 next_focus 写出自然承接的一句话。
5. 只负责提问、整理和视觉转译，不诊断、不解释心理意义。

绝对不要说：
- “这代表你孤独/无助/消极”
- “我认为你内心希望……”
- 任何心理诊断、创伤判断、人格判断或象征解释。

提问风格：
- 像一位共创伙伴，而不是调查问卷或表单。
- 每次只问一个主要问题。
- assistant_message 可以先用半句轻轻承接玩家刚说的画面，再问 target_next_focus 对应的问题。
- 问题简短、口语、自然，尽量使用玩家原本的词。
- 允许玩家说不确定、不知道、先不回答。
- 不机械逐题问，不重复问已确认内容。
- 不要给玩家提供具体答案选项或暗示性例子，例如不要问“是炎热的夏天，还是其他季节？”。
- 追问必须保持中性，只问缺失信息本身。
- 不要为了更精细而反复问同一字段；能支持场景生成就进入下一项。
- 如果玩家已经回答“没有/不能了/没有其他/不错/很远/很清晰”，应把它视作有效回答，不要换一种说法再问。
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
只返回JSON，不要Markdown，不要额外解释。`;
}

function buildFinalPromptSystemPrompt() {
  return `You transform a confirmed inner-landscape scene into final generation prompts.

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
- scene_tags: short lowercase tags.`;
}

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

function applyAgentUpdates(updates) {
  const applied = {};
  Object.entries(updates || {}).forEach(([key, update]) => {
    if (!state.scene[key] || !update || typeof update !== "object") return;
    if (!("value" in update)) return;
    const status = normalizeStatus(update.status);
    const source = normalizeSource(update.source);
    if (setField(key, update.value, status, source)) {
      if (typeof update.confidence === "number") state.scene[key].confidence = update.confidence;
      if (typeof update.needs_follow_up === "boolean") state.scene[key].needs_follow_up = update.needs_follow_up;
      applied[key] = clone(state.scene[key]);
    }
  });
  return applied;
}

function normalizeStatus(status) {
  const allowed = ["missing", "partial", "inferred", "confirmed", "skipped_by_user", "not_applicable"];
  return allowed.includes(status) ? status : "confirmed";
}

function normalizeSource(source) {
  const allowed = ["user_explicit", "user_implicit", "agent_inference", "agent_suggestion", "user_confirmed_agent_suggestion"];
  return allowed.includes(source) ? source : "user_explicit";
}

function sanitizeNextFocus(focus) {
  const allowed = ["feeling_keyword", "place", "season", "weather", "sound_sources", "openness", "path_or_exit", "connectivity", "important_objects", "summary"];
  return allowed.includes(focus) ? focus : chooseNextFocus();
}

function extractFromMessage(text) {
  const updates = {};
  const lower = text.toLowerCase();
  const skipped = /(不知道|不确定|跳过|先不说|没有想法|随便)/.test(text);
  const confirmsInference = /^(是|对|可以|符合|没错|差不多|嗯|确认|是的)[。！？!?\s]*$/.test(text.trim());

  if (confirmsInference) {
    FIELD_DEFS.forEach(([key]) => {
      if (state.scene[key].status === "inferred") {
        setField(key, state.scene[key].value, "confirmed", "user_confirmed_agent_suggestion");
        updates[key] = state.scene[key];
      }
    });
  }

  if (!isDone(state.scene.feeling_keyword) && state.focus === "feeling_keyword") {
    const keyword = skipped ? "unnamed" : text.replace(/[。！？!?\s]/g, "").slice(0, 18);
    setField("feeling_keyword", keyword || "unnamed", skipped ? "skipped_by_user" : "confirmed", skipped ? "user_explicit" : "user_explicit");
    updates.feeling_keyword = state.scene.feeling_keyword;
  }

  const place = extractPlace(text);
  if (place) {
    setField("place", place, place.length >= 4 ? "confirmed" : "partial");
    updates.place = state.scene.place;
  }

  const season = matchOne(text, ["春", "夏", "秋", "冬", "深秋", "初秋", "暮春", "雨季", "旱季", "雪季"]);
  if (season) {
    setField("season", season);
    updates.season = state.scene.season;
  } else if (state.focus === "season" && skipped) {
    setField("season", "不确定", "skipped_by_user");
    updates.season = state.scene.season;
  }

  const time = matchOne(text, ["清晨", "早晨", "上午", "中午", "午后", "下午", "黄昏", "傍晚", "夜晚", "深夜", "凌晨", "日落", "黎明"]);
  if (time) {
    setField("time_of_day", time);
    updates.time_of_day = state.scene.time_of_day;
  } else if (state.focus === "season" && skipped) {
    setField("time_of_day", "不确定", "skipped_by_user");
    updates.time_of_day = state.scene.time_of_day;
  }

  const weather = collectMatches(text, ["小雨", "大雨", "雨", "薄雾", "雾", "雪", "风", "雷暴", "阴天", "晴天", "多云", "潮湿", "干燥"]);
  if (weather.length) {
    setField("weather", mergeArray(state.scene.weather.value, weather));
    updates.weather = state.scene.weather;
  }

  const lighting = collectMatches(text, ["昏暗", "很暗", "黑", "明亮", "暖光", "冷光", "柔和", "刺眼", "灯光", "阳光", "月光", "反光"]);
  if (lighting.length) {
    setField("lighting", lighting.join("、"));
    updates.lighting = state.scene.lighting;
  } else if (!isDone(state.scene.lighting) && time && /(夜|黄昏|傍晚|深夜|凌晨)/.test(time)) {
    setField("lighting", "整体光线偏暗", "inferred", "agent_inference");
    updates.lighting = state.scene.lighting;
  }

  const noSound = /(没有声音|无声|安静|寂静|几乎没有声音)/.test(text);
  if (noSound) {
    setField("sound_sources", []);
    setField("overall_sound_level", "很安静");
    updates.sound_sources = state.scene.sound_sources;
    updates.overall_sound_level = state.scene.overall_sound_level;
  } else {
    const sounds = collectMatches(text, ["雨声", "海浪", "风声", "火车", "脚步", "水声", "鸟叫", "机器", "音乐", "人声", "雷声", "金属摩擦"]);
    if (sounds.length) {
      setField("sound_sources", mergeArray(state.scene.sound_sources.value, sounds));
      updates.sound_sources = state.scene.sound_sources;
      if (!isDone(state.scene.overall_sound_level)) {
        setField("overall_sound_level", "未指定", "not_applicable", "user_implicit");
        updates.overall_sound_level = state.scene.overall_sound_level;
      }
    }
  }
  if (/(很响|吵|巨大|轰鸣)/.test(text)) {
    setField("overall_sound_level", "较响");
    updates.overall_sound_level = state.scene.overall_sound_level;
  } else if (/(轻|远处|偶尔|微弱|低低)/.test(text) && (updates.sound_sources || state.focus === "sound_sources")) {
    setField("overall_sound_level", "较轻");
    updates.overall_sound_level = state.scene.overall_sound_level;
  }

  const openness = matchOne(text, ["半开放", "开阔", "开放", "封闭", "室内", "狭窄"]);
  if (openness) {
    setField("openness", openness.includes("封闭") || openness === "室内" ? "封闭" : openness.includes("半") ? "半开放" : "开阔");
    updates.openness = state.scene.openness;
  }

  if (/(看不远|看不清|雾里|被雾|有限|遮挡|只能看到)/.test(text)) {
    setField("visibility", "可见范围受限制");
    updates.visibility = state.scene.visibility;
  } else if (/(很远|无限|远方|开阔视野)/.test(text)) {
    setField("visibility", "可以看到较远");
    updates.visibility = state.scene.visibility;
  }

  const path = extractPath(text);
  if (path) {
    setField("path_or_exit", path);
    updates.path_or_exit = state.scene.path_or_exit;
  } else if (/(没有路|没有出口|没有入口|出不去)/.test(text)) {
    setField("path_or_exit", "没有明显路径或出口");
    updates.path_or_exit = state.scene.path_or_exit;
  }

  if (/(相连|连着|通向|连续|一个整体)/.test(text)) {
    setField("connectivity", "连续空间或区域相连");
    updates.connectivity = state.scene.connectivity;
  } else if (/(分开|隔开|几个区域|多个区域|房间)/.test(text)) {
    setField("connectivity", "由几个分开的区域组成");
    updates.connectivity = state.scene.connectivity;
  }

  const objects = collectObjects(text);
  if (objects.length) {
    setField("important_objects", mergeObjectArray(state.scene.important_objects.value, objects));
    updates.important_objects = state.scene.important_objects;
  } else if (state.focus === "important_objects" && /(没有|无|不需要)/.test(text)) {
    setField("important_objects", []);
    updates.important_objects = state.scene.important_objects;
  }

  const required = extractAfter(text, /(必须出现|一定要有|要有|保留|需要出现)([^。！？!?]+)/);
  if (required.length) {
    setField("required_elements", mergeArray(state.scene.required_elements.value, required));
    updates.required_elements = state.scene.required_elements;
  } else if (state.focus === "important_objects" && /(没有必须|没有一定|不需要必须)/.test(text)) {
    setField("required_elements", []);
    updates.required_elements = state.scene.required_elements;
  }

  const excluded = extractAfter(text, /(不要出现|不能出现|排除|不要|没有)([^。！？!?]+)/);
  if (excluded.length) {
    setField("excluded_elements", mergeArray(state.scene.excluded_elements.value, excluded));
    updates.excluded_elements = state.scene.excluded_elements;
  } else if (state.focus === "important_objects" && /(没有不要|没有排除|都可以)/.test(text)) {
    setField("excluded_elements", []);
    updates.excluded_elements = state.scene.excluded_elements;
  }

  if (state.focus === "important_objects" && !skipped) {
    ["important_objects", "required_elements", "excluded_elements"].forEach((key) => {
      if (!isDone(state.scene[key]) && state.scene[key].status === "missing") {
        setField(key, [], "confirmed", "user_implicit");
        updates[key] = state.scene[key];
      }
    });
  }

  if (state.focus === "weather" && skipped) {
    ["weather", "lighting"].forEach((key) => {
      if (!isDone(state.scene[key])) {
        setField(key, key === "weather" ? [] : "未指定", "skipped_by_user");
        updates[key] = state.scene[key];
      }
    });
  }

  return updates;
}

function mergeArray(current, next) {
  return [...new Set([...(current || []), ...next].map((item) => String(item).trim()).filter(Boolean))];
}

function mergeObjectArray(current, names) {
  const existing = current || [];
  const known = new Set(existing.map((item) => item.name));
  const additions = names.filter((name) => !known.has(name)).map((name) => ({
    name,
    position: "",
    meaning_type: "uncertain",
    user_explanation: null,
  }));
  return [...existing, ...additions];
}

function collectMatches(text, words) {
  const matches = words
    .filter((word) => text.includes(word))
    .sort((a, b) => b.length - a.length);
  return matches.filter((word, index) => !matches.slice(0, index).some((longer) => longer.includes(word)));
}

function matchOne(text, words) {
  return words.sort((a, b) => b.length - a.length).find((word) => text.includes(word)) || "";
}

function extractPlace(text) {
  const locationWords = ["车站", "火车站", "森林", "房间", "海边", "海岸", "小岛", "岛", "街道", "桥", "屋顶", "山", "湖", "废墟", "花园", "走廊", "站台", "教室", "广场", "港口", "洞穴", "草地"];
  if (!locationWords.some((word) => text.includes(word))) return "";
  const parts = text.split(/[，。！？!?；;]/).map((part) => part.trim()).filter(Boolean);
  const candidate = parts.find((part) => locationWords.some((word) => part.includes(word))) || text;
  return candidate.slice(0, 42);
}

function extractPath(text) {
  const pathWords = ["路", "入口", "出口", "门", "铁轨", "小径", "楼梯", "桥", "通道"];
  if (!pathWords.some((word) => text.includes(word))) return "";
  const parts = text.split(/[，。！？!?；;]/).map((part) => part.trim()).filter(Boolean);
  return (parts.find((part) => pathWords.some((word) => part.includes(word))) || text).slice(0, 52);
}

function collectObjects(text) {
  const objectWords = ["长椅", "灯", "树", "窗", "门", "镜子", "石头", "桌子", "椅子", "箱子", "钟", "花", "船", "轨道", "站牌", "照片", "水池", "绿洲", "泉水", "太阳", "月亮", "飞鸟", "鸟", "夕阳", "湖面", "bench", "light", "tree", "window", "door", "mirror", "stone", "table", "chair", "box", "clock", "flower", "boat", "track", "sign", "photo", "pool", "oasis", "spring", "sun", "moon", "bird", "birds", "sunset", "lake surface"];
  return objectWords.filter((word) => text.includes(word));
}

function extractAfter(text, regex) {
  const match = text.match(regex);
  if (!match) return [];
  return match[2]
    .split(/[，,、和与；;]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function chooseNextFocus(lastText = "") {
  const order = ["feeling_keyword", "place", "season", "weather", "sound_sources", "openness", "path_or_exit", "connectivity", "important_objects"];
  const contradiction = findContradiction();
  if (contradiction) return contradiction;
  const next = order.find((focus) => !focusComplete(focus));
  return next || "summary";
}

function findContradiction() {
  const openness = valueText(state.scene.openness);
  const visibility = valueText(state.scene.visibility);
  const time = valueText(state.scene.time_of_day);
  const lighting = valueText(state.scene.lighting);
  if (openness.includes("封闭") && visibility.includes("较远")) return "openness";
  if ((time.includes("深夜") || time.includes("夜晚")) && lighting.includes("阳光")) return "weather";
  return "";
}

function buildQuestion(focus) {
  if (lang() === "en-US") return buildQuestionEn(focus);
  if (focus === "summary") return "我已经整理出一个可生成的场景草稿。你可以进入摘要页面检查、修改和确认。";
  const feeling = valueText(state.scene.feeling_keyword);
  const place = valueText(state.scene.place);
  if (focus === "season") {
    if (!isDone(state.scene.season) && !isDone(state.scene.time_of_day)) return `这个${place === "尚未确定" ? "地方" : place}大概处在什么季节、什么时间？`;
    if (!isDone(state.scene.season)) return "这个地方大概是什么季节？";
    if (!isDone(state.scene.time_of_day)) return "那大概是一天里的什么时候？";
  }
  if (focus === "weather") {
    if (!isDone(state.scene.weather) && !isDone(state.scene.lighting)) return "待在这里时，天气和光线给人的第一感觉是什么？";
    if (!isDone(state.scene.weather)) return "这里的天气给你的感觉是什么？";
    if (!isDone(state.scene.lighting)) return "这里的光线落下来时是什么样的？";
  }
  if (focus === "sound_sources") {
    return "如果安静下来听，这里最先出现的声音是什么？";
  }
  if (focus === "openness") {
    if (!isDone(state.scene.openness) && !isDone(state.scene.visibility)) return "站在这里，空间是向外展开的，还是有边界包着？视线能到多远？";
    if (!isDone(state.scene.openness)) return "站在这里，空间是向外展开的，还是有边界包着？";
    if (!isDone(state.scene.visibility)) return "你的视线大概能到多远？";
  }
  if (focus === "important_objects") {
    if (!isDone(state.scene.important_objects)) return "这个画面里，最抓住你注意力的是什么？";
    if (!isDone(state.scene.required_elements)) return "有什么是这个场景里必须保留下来的？";
    if (!isDone(state.scene.excluded_elements)) return "有什么是你不想让它出现在这里的？";
  }
  const template = questionsForLang()[focus] || "这里还有什么需要补充？";
  if (focus === "openness" && isDone(state.scene.path_or_exit)) {
    return `你提到${valueText(state.scene.path_or_exit)}。这个地方整体是开阔的、半开放的，还是比较封闭？能看到多远？`;
  }
  return template.replace("{feeling_keyword}", feeling);
}

function buildQuestionEn(focus) {
  if (focus === "summary") return "I have organized a scene archive. You can review and edit it now.";
  const feeling = valueText(state.scene.feeling_keyword);
  const place = valueText(state.scene.place);
  if (focus === "season") {
    if (!isDone(state.scene.season) && !isDone(state.scene.time_of_day)) return `What season and time does this ${place === "Not set" || place === "尚未确定" ? "place" : place} seem to be in?`;
    if (!isDone(state.scene.season)) return "What season does this place seem to be in?";
    if (!isDone(state.scene.time_of_day)) return "What time of day does it feel like?";
  }
  if (focus === "weather") {
    if (!isDone(state.scene.weather) && !isDone(state.scene.lighting)) return "When you are there, what are the weather and light like at first glance?";
    if (!isDone(state.scene.weather)) return "What does the weather feel like there?";
    if (!isDone(state.scene.lighting)) return "What is the light like as it falls across the place?";
  }
  if (focus === "sound_sources") return "If you listen quietly, what sound appears first?";
  if (focus === "openness") {
    if (!isDone(state.scene.openness) && !isDone(state.scene.visibility)) return "Standing there, does the space open outward or feel bounded? How far can you see?";
    if (!isDone(state.scene.openness)) return "Standing there, does the space open outward or feel bounded?";
    if (!isDone(state.scene.visibility)) return "How far does your line of sight reach?";
  }
  if (focus === "important_objects") {
    if (!isDone(state.scene.important_objects)) return "What catches your attention most in this image?";
    if (!isDone(state.scene.required_elements)) return "What must be kept in this scene?";
    if (!isDone(state.scene.excluded_elements)) return "What do you not want to appear here?";
  }
  const template = questionsForLang()[focus] || "What else should be added here?";
  return template.replace("{feeling_keyword}", feeling);
}

function renderAll() {
  renderMessages();
  renderLiveArchive();
  renderCreatorState();
  renderConfirm();
}

function renderMessages() {
  $("messages").innerHTML = state.messages.map((message) => (
    `<div class="message ${message.role}">${escapeHtml(message.text)}</div>`
  )).join("");
  $("messages").scrollTop = $("messages").scrollHeight;
}

function renderCreatorState() {
  $("openConfirmBtn").classList.toggle("hidden", !(readyForSummary() || state.focus === "summary"));
  setComposerLocked(state.archiveOpen || state.isCallingAI);
}

function renderLiveArchive() {
  $("archiveFocusText").textContent = t("archiveCurrentFocus", { field: labelFor(state.focus) });
  const visibleGroups = archiveGroups()
    .map(([title, keys]) => [title, keys.filter(hasLiveArchiveValue)])
    .filter(([, keys]) => keys.length);
  $("liveArchiveFields").innerHTML = visibleGroups.length ? visibleGroups.map(([title, keys]) => `
    <section class="archive-group">
      <h3 class="archive-group-title">${escapeHtml(title)}</h3>
      ${keys.map(renderLiveArchiveField).join("")}
    </section>
  `).join("") : `<p class="archive-empty">${escapeHtml(t("archiveEmpty"))}</p>`;
}

function archiveGroups() {
  const groupLabels = CONFIRM_GROUPS[lang()] || CONFIRM_GROUPS["zh-CN"];
  return [
    [groupLabels[0], ["feeling_keyword"]],
    [groupLabels[1], ["place", "season", "time_of_day"]],
    [groupLabels[2], ["weather", "lighting"]],
    [groupLabels[3], ["sound_sources", "overall_sound_level"]],
    [groupLabels[4], ["openness", "visibility", "path_or_exit", "connectivity"]],
    [groupLabels[5], ["important_objects", "required_elements", "excluded_elements"]],
  ];
}

function renderLiveArchiveField(key) {
  const field = state.scene[key] || emptyField("");
  return `<div class="field-row">
    <div class="field-top">
      <span class="field-label">${escapeHtml(labelFor(key))}</span>
    </div>
    <p class="field-value">${escapeHtml(liveArchiveValueText(field))}</p>
  </div>`;
}

function hasLiveArchiveValue(key) {
  const field = state.scene[key];
  if (!field || field.status === "missing") return false;
  if (Array.isArray(field.value)) return field.value.length > 0 || field.status === "confirmed";
  return String(field.value || "").trim().length > 0;
}

function liveArchiveValueText(field) {
  if (Array.isArray(field.value) && !field.value.length) return lang() === "en-US" ? "None" : "无";
  return valueText(field);
}

function setComposerLocked(locked) {
  const input = $("messageInput");
  const sendButton = document.querySelector('#messageForm button[type="submit"]');
  const backButton = $("backBtn");
  if (!input || !sendButton || !backButton) return;
  input.disabled = locked;
  sendButton.disabled = locked;
  backButton.disabled = locked;
  sendButton.textContent = state.isCallingAI ? t("thinking") : t("send");
  input.placeholder = state.archiveOpen ? t("archivePlaceholder") : t("inputPlaceholder");
}

function renderConfirm() {
  const groupLabels = CONFIRM_GROUPS[lang()] || CONFIRM_GROUPS["zh-CN"];
  const groups = [
    [groupLabels[0], ["feeling_keyword"]],
    [groupLabels[1], ["place", "season", "time_of_day"]],
    [groupLabels[2], ["weather", "lighting"]],
    [groupLabels[3], ["sound_sources", "overall_sound_level"]],
    [groupLabels[4], ["openness", "visibility", "path_or_exit", "connectivity"]],
    [groupLabels[5], ["important_objects", "required_elements", "excluded_elements"]],
  ];
  $("confirmGrid").innerHTML = groups.map(([title, keys]) => {
    const content = keys.map((key) => renderFieldEditor(key)).join("");
    const meaning = keys.includes("important_objects") ? renderMeaningControls() : "";
    return `<section class="confirm-card">
      <h3>${title}</h3>
      <div class="archive-content">${content}</div>
      ${meaning}
    </section>`;
  }).join("");
}

function renderFieldEditor(key) {
  const field = state.scene[key];
  const value = editorValue(key, field.value);
  const rows = Array.isArray(field.value) || key === "important_objects" ? 3 : 1;
  return `<label class="archive-field">
    <span>${labelFor(key)}</span>
    <textarea rows="${rows}" data-archive-field="${key}">${escapeHtml(value)}</textarea>
  </label>`;
}

function editorValue(key, value) {
  if (key === "important_objects") {
    return (value || []).map((item) => item.name || item).join("、");
  }
  if (Array.isArray(value)) return value.join("、");
  return value || "";
}

function renderMeaningControls() {
  const objects = state.scene.important_objects.value || [];
  if (!objects.length) return "";
  return objects.map((obj, index) => `<label class="meaning-row">${escapeHtml(obj.name)}
    <select data-meaning-index="${index}">
      ${meaningOptions(obj.meaning_type)}
    </select>
  </label>`).join("");
}

function meaningOptions(value) {
  const options = lang() === "en-US"
    ? [
      ["personal_meaning", "Personal meaning"],
      ["visual_choice", "Mainly visual choice"],
      ["both", "Both"],
      ["uncertain", "Unsure"],
    ]
    : [
      ["personal_meaning", "有个人意义"],
      ["visual_choice", "主要是视觉选择"],
      ["both", "两者都有"],
      ["uncertain", "暂时不确定"],
    ];
  return options.map(([id, label]) => `<option value="${id}" ${id === value ? "selected" : ""}>${label}</option>`).join("");
}

function editField(key) {
  const current = valueText(state.scene[key]);
  const next = window.prompt(`编辑${labelFor(key)}`, current === "尚未确定" ? "" : current);
  if (next === null) return;
  pushSnapshot();
  setField(key, next, next.trim() ? "confirmed" : "missing", "user_edit");
  renderAll();
  saveDraft();
}

function deleteField(key) {
  pushSnapshot();
  state.scene[key] = emptyField(Array.isArray(state.scene[key].value) ? [] : "");
  state.revisions.push({ field: key, old_value: null, new_value: null, source: "user_delete", timestamp: new Date().toISOString(), user_confirmed: false });
  renderAll();
  saveDraft();
}

function toggleLock(key) {
  state.scene[key].locked = !state.scene[key].locked;
  renderAll();
  saveDraft();
}

function applyConfirmEdits() {
  document.querySelectorAll("[data-archive-field]").forEach((input) => {
    const key = input.dataset.archiveField;
    const raw = input.value.trim();
    if (key === "important_objects") {
      setField(key, raw ? mergeObjectArray([], normalizeValue(key, raw)) : [], "confirmed", "user_edit");
    } else {
      setField(key, raw, raw ? "confirmed" : emptyEditStatus(key), "user_edit");
    }
  });
  document.querySelectorAll("[data-meaning-index]").forEach((select) => {
    const index = Number(select.dataset.meaningIndex);
    if (state.scene.important_objects.value[index]) state.scene.important_objects.value[index].meaning_type = select.value;
  });
  saveDraft();
}

function emptyEditStatus(key) {
  return ["required_elements", "excluded_elements", "important_objects", "sound_sources", "weather"].includes(key) ? "confirmed" : "not_applicable";
}

async function generateOutputs() {
  applyConfirmEdits();
  const button = $("confirmExportBtn");
  button.disabled = true;
  button.textContent = t("thinking");
  const now = new Date();
  const projectId = `IL_${formatDate(now, true)}`;
  const scene = sceneForProject();
  let finalPrompts;
  let finalPromptSource = "openai";
  try {
    finalPrompts = await callFinalPromptAgent(scene);
  } catch (error) {
    finalPromptSource = "local_fallback";
    finalPrompts = buildFallbackFinalPrompts();
    finalPrompts.error = error.message || String(error);
  } finally {
    button.disabled = false;
    button.textContent = t("generateFiles");
  }
  finalPrompts = normalizeFinalPrompts(finalPrompts);
  const result = {
    prompt1_environment_360: finalPrompts.prompt1_environment_360,
    prompt2_sound: finalPrompts.prompt2_sound,
    prompt3_music: finalPrompts.prompt3_music,
  };
  const log = buildConversationLog(now, projectId, finalPromptSource, finalPrompts);
  state.output = { result, log, timestamp: formatDate(now, true) };
  state.experience = null;
  $("downloadResultBtn").classList.remove("hidden");
  $("generate2dBtn").classList.remove("hidden");
  $("generateVrBtn").classList.remove("hidden");
  $("vrExperienceStatus").classList.add("hidden");
  $("startExperienceBtn").classList.add("hidden");
  $("experiencePreview").classList.add("hidden");
  $("outputPreview").classList.remove("hidden");
  $("outputPreview").innerHTML = `<h2>${t("generatedTitle")}</h2><p>${t("generatedDesc", { logName: `log_${formatDate(now, true)}.json` })}</p><pre>${escapeHtml(pretty(result))}</pre>`;
}

function normalizeFinalPrompts(finalPrompts) {
  const fallback = buildFallbackFinalPrompts();
  const normalized = {
    ...fallback,
    ...finalPrompts,
  };
  if (sceneRequestsSilence()) {
    normalized.prompt2_sound = "none";
    normalized.prompt3_music = "none";
  }
  return normalized;
}

function getSoundProviderCredentials() {
  return {
    soundProvider: state.settings.soundProvider === "falai" ? "falai" : "elevenlabs",
    elevenLabsKey: $("elevenLabsKeyInput").value.trim() || sessionStorage.getItem("innerLandscapeElevenLabsKey") || "",
    falKey: $("falKeyInput").value.trim() || sessionStorage.getItem("innerLandscapeFalKey") || "",
  };
}

function assertSoundProviderKeySet(soundPrompt, { soundProvider, elevenLabsKey, falKey }) {
  if (isNonePrompt(soundPrompt)) return;
  if (soundProvider === "falai" && !falKey) {
    throw new Error(lang() === "en-US" ? "fal.ai API key is not set" : "尚未设置fal.ai API Key");
  }
  if (soundProvider === "elevenlabs" && !elevenLabsKey) {
    throw new Error(lang() === "en-US" ? "ElevenLabs API key is not set" : "尚未设置ElevenLabs API Key");
  }
}

async function generate2dExperience() {
  if (!state.output) await generateOutputs();
  const openaiKey = $("apiKeyInput").value.trim() || sessionStorage.getItem("innerLandscapeApiKey") || state.settings.apiKey;
  const { soundProvider, elevenLabsKey, falKey } = getSoundProviderCredentials();
  if (!openaiKey) throw new Error(lang() === "en-US" ? "OpenAI API key is not set" : "尚未设置OpenAI API Key");
  assertSoundProviderKeySet(state.output.result.prompt2_sound, { soundProvider, elevenLabsKey, falKey });

  const button = $("generate2dBtn");
  button.disabled = true;
  button.textContent = t("generating2dExperience");
  $("startExperienceBtn").classList.add("hidden");
  $("experiencePreview").classList.remove("hidden");
  $("experiencePreview").innerHTML = `<p>${escapeHtml(t("generating2dExperience"))}</p>`;
  try {
    const timestamp = state.output.timestamp || formatDate(new Date(), true);
    const response = await fetch("/generate-2d-experience", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp,
        openai_api_key: openaiKey,
        elevenlabs_api_key: elevenLabsKey,
        fal_api_key: falKey,
        sound_provider: soundProvider,
        image_model: "gpt-image-2",
        flat_image_prompt: buildFlatImagePrompt(state.output.result.prompt1_environment_360),
        sound_prompt: buildElevenLabsSoundPrompt(state.output.result.prompt2_sound),
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "2D experience generation failed");
    state.experience = data;
    renderExperiencePreview();
    $("startExperienceBtn").classList.remove("hidden");
  } finally {
    button.disabled = false;
    button.textContent = t("generate2dExperience");
  }
}

async function generateVrExperience() {
  if (!state.output) await generateOutputs();
  const openaiKey = $("apiKeyInput").value.trim() || sessionStorage.getItem("innerLandscapeApiKey") || state.settings.apiKey;
  const { soundProvider, elevenLabsKey, falKey } = getSoundProviderCredentials();
  if (!openaiKey) throw new Error(lang() === "en-US" ? "OpenAI API key is not set" : "尚未设置OpenAI API Key");
  assertSoundProviderKeySet(state.output.result.prompt2_sound, { soundProvider, elevenLabsKey, falKey });

  const button = $("generateVrBtn");
  const status = $("vrExperienceStatus");
  button.disabled = true;
  button.textContent = t("generatingVrExperience");
  status.classList.remove("hidden");
  status.className = "status-text";
  status.textContent = t("generatingVrExperience");
  try {
    const timestamp = state.output.timestamp || formatDate(new Date(), true);
    const response = await fetch("/generate-vr-experience", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp,
        openai_api_key: openaiKey,
        elevenlabs_api_key: elevenLabsKey,
        fal_api_key: falKey,
        sound_provider: soundProvider,
        image_model: "gpt-image-2",
        environment_prompt: state.output.result.prompt1_environment_360,
        sound_prompt: buildElevenLabsSoundPrompt(state.output.result.prompt2_sound),
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "VR experience generation failed");
    status.className = "status-text ok";
    status.textContent = t("vrExperienceReady");
  } catch (error) {
    status.className = "status-text error";
    status.textContent = error.message || String(error);
    throw error;
  } finally {
    button.disabled = false;
    button.textContent = t("generateVrExperience");
  }
}

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

function isNonePrompt(prompt) {
  return !prompt || String(prompt).trim().toLowerCase() === "none";
}

function renderExperiencePreview() {
  $("experiencePreview").innerHTML = `
    <h2>${escapeHtml(t("experienceReadyTitle"))}</h2>
    <p>${escapeHtml(t("experienceReadyDesc"))}</p>
  `;
}

async function start2dExperience() {
  if (!state.experience) return;
  stopBackgroundMusic();
  $("experienceImage").src = state.experience.image_url;
  setExperienceAudio("experienceSound", state.experience.sound_url, 0.58);
  setExperienceAudio("experienceMusic", state.experience.music_url, 0.34);
  showScreen("experience");
  await requestExperienceFullscreen();
  await Promise.all([
    playExperienceAudio("experienceSound"),
    playExperienceAudio("experienceMusic"),
  ]);
}

async function requestExperienceFullscreen() {
  const screen = $("experienceScreen");
  if (!screen.requestFullscreen || document.fullscreenElement) return;
  try {
    await screen.requestFullscreen();
  } catch {
    // The fixed full-screen view remains active if the browser refuses fullscreen.
  }
}

function setExperienceAudio(id, url, volume) {
  const audio = $(id);
  audio.pause();
  audio.removeAttribute("src");
  audio.volume = volume;
  audio.currentTime = 0;
  if (url) {
    audio.src = url;
    audio.load();
  }
}

async function playExperienceAudio(id) {
  const audio = $(id);
  if (!audio.src) return;
  try {
    await audio.play();
  } catch {
    // The user can still use the inline audio controls in the preview if playback is blocked.
  }
}

function exit2dExperience() {
  ["experienceSound", "experienceMusic"].forEach((id) => {
    const audio = $(id);
    audio.pause();
    audio.currentTime = 0;
  });
  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
  showScreen("confirm");
}

function buildConversationLog(now, projectId, finalPromptSource, finalPrompts) {
  return {
    project_id: projectId,
    created_at: state.messages[0]?.timestamp || now.toISOString(),
    updated_at: now.toISOString(),
    language: lang(),
    model_configuration: currentModelConfig(),
    prompt_generation_source: finalPromptSource,
    prompt_generation_detail: finalPrompts,
    scene: sceneForProject(),
    conversation: state.messages.map((message) => ({
      timestamp: message.timestamp,
      role: message.role,
      text: message.text,
    })),
    research_trace: {
      raw_user_responses: state.rawResponses,
      field_revision_history: state.revisions,
      checklist_history: state.checklistHistory,
      focus_counts: state.focusCounts,
    },
  };
}

function buildSummaryMarkdown() {
  const title = `${valueText(state.scene.feeling_keyword)}中的${valueText(state.scene.place)}`.replace(/尚未确定|未指定/g, "场景");
  return `# ${title}

## 感受关键词

${valueText(state.scene.feeling_keyword)}

## 场景基础

- 地点：${valueText(state.scene.place)}
- 季节：${valueText(state.scene.season)}
- 时间：${valueText(state.scene.time_of_day)}

## 天气与光线

- 天气：${valueText(state.scene.weather)}
- 光线：${valueText(state.scene.lighting)}

## 声音

- 声音来源：${valueText(state.scene.sound_sources)}
- 整体音量：${valueText(state.scene.overall_sound_level)}

## 空间结构

- 开放性：${valueText(state.scene.openness)}
- 可见范围：${valueText(state.scene.visibility)}
- 路径与出口：${valueText(state.scene.path_or_exit)}
- 空间连接：${valueText(state.scene.connectivity)}

## 重要细节

- 重要物件：${valueText(state.scene.important_objects)}
- 必须出现：${valueText(state.scene.required_elements)}
- 不要出现：${valueText(state.scene.excluded_elements)}
`;
}

function sceneForProject() {
  return {
    feeling_keyword: pickField("feeling_keyword"),
    scene_basis: {
      place: pickField("place"),
      season: pickField("season"),
      time_of_day: pickField("time_of_day"),
    },
    atmosphere: {
      weather: pickField("weather"),
      lighting: pickField("lighting"),
    },
    soundscape: {
      sound_sources: pickField("sound_sources"),
      overall_sound_level: pickField("overall_sound_level"),
    },
    spatial_structure: {
      openness: pickField("openness"),
      visibility: pickField("visibility"),
      path_or_exit: pickField("path_or_exit"),
      connectivity: pickField("connectivity"),
    },
    important_details: {
      important_objects: pickField("important_objects"),
      required_elements: pickField("required_elements"),
      excluded_elements: pickField("excluded_elements"),
    },
    ue_generation_hints: {
      location_id: slug(valueText(state.scene.place)),
      season_id: slug(valueText(state.scene.season)),
      time_id: slug(valueText(state.scene.time_of_day)),
      weather_ids: state.scene.weather.value.map(slug),
      sound_ids: state.scene.sound_sources.value.map(slug),
      object_ids: state.scene.important_objects.value.map((item) => slug(item.name || item)),
      excluded_ids: state.scene.excluded_elements.value.map(slug),
    },
  };
}

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

function sceneRequestsSilence() {
  const soundSources = state.scene.sound_sources;
  const soundLevel = state.scene.overall_sound_level;
  const combined = `${valueText(soundSources)} ${valueText(soundLevel)}`.toLowerCase();
  const noSources = Array.isArray(soundSources.value) && soundSources.value.length === 0 && isDone(soundSources);
  return noSources || /(完全安静|绝对安静|没有声音|无声|寂静|听不见|none|no sound|silent|complete silence|completely quiet)/i.test(combined);
}

function pickField(key) {
  const { value, status, source, confidence, locked, needs_follow_up } = state.scene[key];
  return { value, status, source, confidence, locked, needs_follow_up };
}

async function downloadResult() {
  if (!state.output) await generateOutputs();
  try {
    const response = await fetch("/save-generated-files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: state.output.result,
        log: state.output.log,
        timestamp: state.output.timestamp,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Save failed");
    showDialog(t("savedTitle"), t("savedBody", {
      promptPath: data.prompt_path,
      logPath: data.log_path,
    }));
  } catch {
    downloadBlob(new Blob([pretty(state.output.result)], { type: "application/json;charset=utf-8" }), "generated_prompt.json");
    downloadBlob(new Blob([pretty(state.output.log)], { type: "application/json;charset=utf-8" }), `log_${state.output.timestamp}.json`);
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function currentModelConfig() {
  return {
    provider: "openai",
    model: state.settings.model || "gpt-4o",
    temperature: Number(state.settings.temperature),
  };
}

async function testApiConnection() {
  const key = $("apiKeyInput").value.trim();
  const status = $("apiStatus");
  if (!key) {
    status.textContent = t("notSet");
    status.className = "status-text";
    return;
  }
  status.textContent = t("validating");
  status.className = "status-text";
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error(res.status === 401 ? t("invalidKey") : `${t("connectionFailed")}：${res.status}`);
    const data = await res.json();
    const available = new Set((data.data || []).map((model) => model.id));
    [...$("modelSelect").options].forEach((option) => {
      const cleanLabel = option.textContent.replace(`（${I18N["zh-CN"].unavailableForKey}）`, "").replace(` (${I18N["en-US"].unavailableForKey})`, "");
      option.disabled = available.size > 0 && !available.has(option.value);
      option.textContent = option.disabled
        ? lang() === "en-US" ? `${cleanLabel} (${t("unavailableForKey")})` : `${cleanLabel}（${t("unavailableForKey")}）`
        : cleanLabel;
    });
    status.textContent = t("connectionSuccess");
    status.className = "status-text ok";
    state.settings.apiKey = key;
    sessionStorage.setItem("innerLandscapeApiKey", key);
  } catch (error) {
    status.textContent = error.message || t("connectionFailed");
    status.className = "status-text error";
  }
}

function saveDraft() {
  localStorage.setItem("innerLandscapeDraft", JSON.stringify({
    scene: state.scene,
    messages: state.messages,
    rawResponses: state.rawResponses,
    revisions: state.revisions,
    checklistHistory: state.checklistHistory,
    focusCounts: state.focusCounts,
    archiveOpen: state.archiveOpen,
    focus: state.focus,
    settings: { ...state.settings, apiKey: "" },
    updated_at: new Date().toISOString(),
  }));
}

function loadDraft() {
  const raw = localStorage.getItem("innerLandscapeDraft");
  if (!raw) return false;
  try {
    const draft = JSON.parse(raw);
    initScene();
    Object.assign(state.scene, draft.scene || {});
    state.messages = draft.messages || [];
    state.rawResponses = draft.rawResponses || [];
    state.revisions = draft.revisions || [];
    state.checklistHistory = draft.checklistHistory || [];
    state.focusCounts = draft.focusCounts || {};
    state.archiveOpen = !!draft.archiveOpen;
    state.focus = draft.focus || chooseNextFocus();
    state.settings = { ...state.settings, ...(draft.settings || {}) };
    if (!MODEL_OPTIONS.includes(state.settings.model)) state.settings.model = "gpt-4o";
    renderSettings();
    return true;
  } catch {
    return false;
  }
}

function openProjectFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      stopIntroVoice();
      stopBackgroundMusic();
      const result = JSON.parse(reader.result);
      initScene();
      hydrateSceneFromResult(result.scene || {});
      state.messages = result.conversation || [];
      state.rawResponses = result.research_trace?.raw_user_responses || [];
      state.revisions = result.research_trace?.field_revision_history || [];
      state.checklistHistory = result.research_trace?.checklist_history || [];
      state.focusCounts = {};
      state.archiveOpen = true;
      addMessage("system", t("openedHistory"));
      showScreen("creator");
      renderAll();
      saveDraft();
    } catch {
      showDialog(t("openFailed"), t("openFailedBody"));
    }
  };
  reader.readAsText(file);
}

function hydrateSceneFromResult(scene) {
  if ("feeling_keyword" in scene && scene.feeling_keyword?.value !== undefined) {
    state.scene.feeling_keyword = { ...state.scene.feeling_keyword, ...scene.feeling_keyword };
  }
  const groups = ["scene_basis", "atmosphere", "soundscape", "spatial_structure", "important_details"];
  groups.forEach((group) => {
    Object.entries(scene[group] || {}).forEach(([key, value]) => {
      if (state.scene[key] && value && typeof value === "object" && "value" in value) {
        state.scene[key] = { ...state.scene[key], ...value };
      }
    });
  });
  Object.entries(scene).forEach(([key, value]) => {
    if (state.scene[key] && value && typeof value === "object" && "value" in value) {
      state.scene[key] = { ...state.scene[key], ...value };
    }
  });
}

function renderSettings() {
  $("homeLanguageSelect").value = lang();
  $("languageSelect").value = lang();
  $("apiKeyInput").value = sessionStorage.getItem("innerLandscapeApiKey") || "";
  $("elevenLabsKeyInput").value = sessionStorage.getItem("innerLandscapeElevenLabsKey") || "";
  $("falKeyInput").value = sessionStorage.getItem("innerLandscapeFalKey") || "";
  $("soundProviderSelect").value = state.settings.soundProvider === "falai" ? "falai" : "elevenlabs";
  $("modelSelect").value = MODEL_OPTIONS.includes(state.settings.model) ? state.settings.model : "gpt-4o";
  $("temperatureRange").value = state.settings.temperature;
  $("temperatureInput").value = formatTemperature(state.settings.temperature);
  $("outputFolderInput").value = state.settings.outputFolder;
  $("englishPromptCheck").checked = state.settings.englishPrompt;
  $("strictNoPsychCheck").checked = state.settings.strictNoPsych;
  applyLanguage();
}

function bindEvents() {
  $("startBtn").addEventListener("click", beginIntro);
  $("debugSkipBtn").addEventListener("click", debugSkipToConfirm);
  $("readyBtn").addEventListener("click", startProject);
  $("settingsBtn").addEventListener("click", () => toggleSettings(true));
  $("closeSettingsBtn").addEventListener("click", () => toggleSettings(false));
  $("drawerBackdrop").addEventListener("click", () => toggleSettings(false));
  $("helpBtn").addEventListener("click", () => showDialog(t("help"), t("helpBody")));
  $("historyBtn").addEventListener("click", () => {
    const hasDraft = !!localStorage.getItem("innerLandscapeDraft");
    showDialog(t("historyTitle"), hasDraft ? t("historyWithDraft") : t("historyEmpty"));
  });
  $("messageForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = $("messageInput");
    handleUserMessage(input.value);
    input.value = "";
  });
  $("backBtn").addEventListener("click", restoreSnapshot);
  $("resetBtn").addEventListener("click", () => {
    if (confirm(t("resetConfirm"))) beginIntro();
  });
  $("openConfirmBtn").addEventListener("click", () => {
    state.archiveOpen = true;
    stopBackgroundMusic();
    showScreen("confirm");
    renderConfirm();
    renderCreatorState();
    saveDraft();
  });
  $("musicToggleBtn").addEventListener("click", () => {
    if (musicState.playing) {
      stopBackgroundMusic();
    } else {
      startBackgroundMusic();
    }
    renderCreatorState();
  });
  $("backToCreatorBtn").addEventListener("click", () => {
    showScreen("creator");
    renderCreatorState();
  });
  $("confirmExportBtn").addEventListener("click", () => {
    generateOutputs().catch((error) => showDialog(t("generationFailed"), error.message || String(error)));
  });
  $("downloadResultBtn").addEventListener("click", () => {
    downloadResult().catch((error) => showDialog(t("downloadFailed"), error.message || String(error)));
  });
  $("generate2dBtn").addEventListener("click", () => {
    generate2dExperience().catch((error) => showDialog(t("experienceFailed"), error.message || String(error)));
  });
  $("generateVrBtn").addEventListener("click", () => {
    generateVrExperience().catch((error) => showDialog(t("vrExperienceFailed"), error.message || String(error)));
  });
  $("startExperienceBtn").addEventListener("click", () => {
    start2dExperience().catch((error) => showDialog(t("experienceFailed"), error.message || String(error)));
  });
  $("exitExperienceBtn").addEventListener("click", exit2dExperience);
  $("projectFile").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) openProjectFile(file);
  });
  $("toggleKeyBtn").addEventListener("click", () => {
    $("apiKeyInput").type = $("apiKeyInput").type === "password" ? "text" : "password";
  });
  $("testApiBtn").addEventListener("click", testApiConnection);
  $("clearApiBtn").addEventListener("click", () => {
    $("apiKeyInput").value = "";
    $("elevenLabsKeyInput").value = "";
    $("falKeyInput").value = "";
    sessionStorage.removeItem("innerLandscapeApiKey");
    sessionStorage.removeItem("innerLandscapeElevenLabsKey");
    sessionStorage.removeItem("innerLandscapeFalKey");
    $("apiStatus").textContent = t("notSet");
    $("apiStatus").className = "status-text";
  });
  $("restoreFolderBtn").addEventListener("click", () => {
    state.settings.outputFolder = "Documents/InnerLandscape/";
    $("outputFolderInput").value = state.settings.outputFolder;
    saveDraft();
  });
  ["homeLanguageSelect", "languageSelect", "modelSelect", "temperatureRange", "temperatureInput", "outputFolderInput", "englishPromptCheck", "strictNoPsychCheck", "elevenLabsKeyInput", "falKeyInput", "soundProviderSelect"].forEach((id) => {
    $(id).addEventListener("input", syncSettings);
    $(id).addEventListener("change", syncSettings);
  });
  $("temperatureInput").addEventListener("blur", () => {
    $("temperatureInput").value = formatTemperature(state.settings.temperature);
  });
}

function syncSettings() {
  const previousLanguage = state.settings.language;
  const languageSource = document.activeElement === $("homeLanguageSelect") ? $("homeLanguageSelect") : $("languageSelect");
  state.settings.language = languageSource.value || "en-US";
  state.settings.model = $("modelSelect").value || "gpt-4o";
  const sourceValue = document.activeElement === $("temperatureRange") ? $("temperatureRange").value : $("temperatureInput").value;
  state.settings.temperature = parseTemperature(sourceValue, state.settings.temperature);
  $("temperatureRange").value = state.settings.temperature;
  if (document.activeElement !== $("temperatureInput")) {
    $("temperatureInput").value = formatTemperature(state.settings.temperature);
  }
  state.settings.outputFolder = $("outputFolderInput").value;
  state.settings.englishPrompt = $("englishPromptCheck").checked;
  state.settings.strictNoPsych = $("strictNoPsychCheck").checked;
  if ($("elevenLabsKeyInput").value.trim()) {
    sessionStorage.setItem("innerLandscapeElevenLabsKey", $("elevenLabsKeyInput").value.trim());
  }
  if ($("falKeyInput").value.trim()) {
    sessionStorage.setItem("innerLandscapeFalKey", $("falKeyInput").value.trim());
  }
  state.settings.soundProvider = $("soundProviderSelect").value === "falai" ? "falai" : "elevenlabs";
  applyLanguage();
  if (state.screen === "intro" && state.settings.language !== previousLanguage) playIntroVoice();
  renderConfirm();
  saveDraft();
}

function parseTemperature(value, fallback = 0.4) {
  const parsed = Number(String(value).trim().replace(",", "."));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1, Math.max(0, parsed));
}

function formatTemperature(value) {
  return String(Math.round(Number(value) * 100) / 100);
}

function toggleSettings(open) {
  $("settingsDrawer").classList.toggle("hidden", !open);
  $("drawerBackdrop").classList.toggle("hidden", !open);
}

function showDialog(title, body) {
  $("dialogTitle").textContent = title;
  $("dialogBody").textContent = body;
  $("infoDialog").showModal();
}

function labelFor(key) {
  return FIELD_LABELS[lang()]?.[key] || FIELD_LABELS["zh-CN"][key] || key;
}

function statusLabel(status) {
  const labels = lang() === "en-US"
    ? {
      missing: "Missing",
      partial: "Partial",
      inferred: "Inferred",
      confirmed: "Confirmed",
      skipped_by_user: "Skipped by user",
      not_applicable: "Not applicable",
    }
    : {
      missing: "缺失",
      partial: "信息不足",
      inferred: "推导待确认",
      confirmed: "已确认",
      skipped_by_user: "用户跳过",
      not_applicable: "不适用",
    };
  return labels[status] || status;
}

function sourceLabel(source) {
  const labels = lang() === "en-US"
    ? {
      user_explicit: "User explicit",
      user_implicit: "User implicit",
      agent_inference: "Agent inference",
      agent_suggestion: "Agent suggestion",
      user_confirmed_agent_suggestion: "User confirmed suggestion",
      user_edit: "User edit",
    }
    : {
      user_explicit: "用户明确",
      user_implicit: "用户隐含",
      agent_inference: "系统推导",
      agent_suggestion: "系统建议",
      user_confirmed_agent_suggestion: "用户确认建议",
      user_edit: "用户修改",
    };
  return labels[source] || source;
}

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

function stripMarkdown(text) {
  return text.replace(/^#+\s/gm, "").replace(/^- /gm, "");
}

function formatDate(date, compact = false) {
  const pad = (n) => String(n).padStart(2, "0");
  const parts = [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate()), pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())];
  return compact ? parts.join("") : `${parts[0]}-${parts[1]}-${parts[2]}_${parts[3]}${parts[4]}${parts[5]}`;
}

function slug(text) {
  return String(text || "scene")
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64) || "scene";
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

initScene();
bindEvents();
loadDraft();
renderSettings();
showScreen("home");
renderAll();
