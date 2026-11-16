(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  // ---------------------------------------------------------------------
  // Content: intro copy, UI chrome strings, and the 4 bubble taxonomies.
  // Bilingual labels are inline as { "zh-CN": ..., "en-US": ... } so there
  // is one tree per category instead of one full tree per language.
  // ---------------------------------------------------------------------

  const UI_TEXT = {
    "zh-CN": {
      brand: "装饰这条路",
      tagline: "用季节、天气、时间和光线，装饰一条属于此刻心情的路。",
      introText:
        "你可以先深呼吸一下，让注意力回到此刻。试着想一想，最近有没有一件让你印象很深的事——它带给你的是什么样的情绪？让这份情绪慢慢展开。\n\n你面前有一条路，它现在还很空。是什么样的季节、天气、时间和光线，会让这条路看起来像这份情绪的样子？接下来，你可以亲手为它挑选风景。",
      introContinue: "开始装饰",
      musicOn: "音乐开",
      musicOff: "音乐关",
      bubblesTitle: "画出你的情绪",
      bubblesDesc: "选一选季节、天气、时间和光线，把此刻的心情装点到这条路上。",
      resetSelections: "清空选择",
      generateSummary: "让AI来总结",
      confirmTitle: "确认这条路的样子",
      confirmDesc: "AI会把你选的这些，写成完整的生成描述。你可以先看看，再决定要不要生成。",
      backToBubbles: "返回修改",
      summarize: "生成描述",
      summarizing: "正在生成描述…",
      save: "保存prompt和log",
      generate2d: "生成2D体验",
      generating2d: "正在生成2D体验",
      generateVr: "生成VR体验",
      generatingVr: "正在生成VR体验（全景图+音效），可能需要一两分钟…",
      vrReady: "VR体验已生成完成，并写入UE可直接导入的固定路径。",
      startExperience: "开始体验",
      exitExperience: "退出体验",
      notChosen: "还没选",
      custom: "自定义",
      customPlaceholder: "写下你想要的样子",
      roadCustomToggle: "或者，自己描述这条路",
      confirmChoice: "就选这个",
      currentChoicePrefix: "当前选择：",
      settings: "设置",
      dialogOk: "知道了",
      savedTitle: "已保存",
      savedBody: "prompt和log已经写入本地文件。",
      saveFailedTitle: "保存失败",
      summarizeFailedTitle: "生成描述失败",
      experienceFailedTitle: "2D体验生成失败",
      vrFailedTitle: "VR体验生成失败",
      needOpenAiKey: "尚未设置OpenAI API Key",
      needElevenLabsKey: "尚未设置ElevenLabs API Key",
      needFalKey: "尚未设置fal.ai API Key",
    },
    "en-US": {
      brand: "Decorate This Road",
      tagline: "Use season, weather, time, and light to decorate a road that matches this moment.",
      introText:
        "Take a slow breath first, and let your attention settle here. Try to think of something that left a strong impression on you recently — what emotion did it bring up? Let that feeling unfold.\n\nThere is a road ahead of you, still empty. What season, weather, time of day, and light would make this road look like that feeling? Next, you'll get to choose its scenery yourself.",
      introContinue: "Start Decorating",
      musicOn: "Music On",
      musicOff: "Music Off",
      bubblesTitle: "Paint Your Mood",
      bubblesDesc: "Choose the season, weather, time, and light to decorate this road with how you feel right now.",
      resetSelections: "Clear Choices",
      generateSummary: "Let AI Summarize",
      confirmTitle: "Confirm This Road",
      confirmDesc: "AI will turn your choices into a full generation description. Review it before generating.",
      backToBubbles: "Back to Edit",
      summarize: "Generate Description",
      summarizing: "Generating description…",
      save: "Save Prompt & Log",
      generate2d: "Generate 2D Experience",
      generating2d: "Generating 2D Experience",
      generateVr: "Generate VR Experience",
      generatingVr: "Generating VR experience (panorama + sound), this can take a minute or two…",
      vrReady: "VR experience generated and written to the fixed path UE imports from.",
      startExperience: "Start Experience",
      exitExperience: "Exit Experience",
      notChosen: "Not chosen",
      custom: "Custom",
      customPlaceholder: "Describe what you want",
      roadCustomToggle: "Or, describe this road yourself",
      confirmChoice: "Use This",
      currentChoicePrefix: "Current choice: ",
      settings: "Settings",
      dialogOk: "Got It",
      savedTitle: "Saved",
      savedBody: "The prompt and log have been written to local files.",
      saveFailedTitle: "Save Failed",
      summarizeFailedTitle: "Description Generation Failed",
      experienceFailedTitle: "2D Experience Generation Failed",
      vrFailedTitle: "VR Experience Generation Failed",
      needOpenAiKey: "OpenAI API key is not set",
      needElevenLabsKey: "ElevenLabs API key is not set",
      needFalKey: "fal.ai API key is not set",
    },
  };

  const BUBBLE_ICONS = {
    season: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20c8-1 14-7 15-15-8 1-14 7-15 15Z"/><path d="M9 15c2-2 4-4 8-8"/></svg>',
    weather: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 16a4 4 0 0 1 .5-8 5.6 5.6 0 0 1 10.6 1.2A3.5 3.5 0 0 1 17 16H7Z"/><path d="M9 19v1.5M13 19v1.5M17 19v1.5"/></svg>',
    time: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    light: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
    road: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 20 10 4"/><path d="M16 20 14 4"/><path d="M12 7v2M12 12v2M12 17v1"/></svg>',
  };

  const L = (zh, en) => ({ "zh-CN": zh, "en-US": en });

  const BUBBLE_CATEGORIES = [
    {
      key: "season",
      label: L("季节", "Season"),
      options: [
        { id: "spring", label: L("春", "Spring"), children: [
          { id: "spring_early", label: L("早春", "Early spring") },
          { id: "spring_mid", label: L("仲春", "Mid-spring") },
          { id: "spring_late", label: L("暮春", "Late spring") },
        ] },
        { id: "summer", label: L("夏", "Summer"), children: [
          { id: "summer_early", label: L("初夏", "Early summer") },
          { id: "summer_peak", label: L("盛夏", "Peak summer") },
          { id: "summer_late", label: L("晚夏", "Late summer") },
        ] },
        { id: "autumn", label: L("秋", "Autumn"), children: [
          { id: "autumn_early", label: L("初秋", "Early autumn") },
          { id: "autumn_mid", label: L("仲秋", "Mid-autumn") },
          { id: "autumn_late", label: L("深秋", "Late autumn") },
        ] },
        { id: "winter", label: L("冬", "Winter"), children: [
          { id: "winter_early", label: L("初冬", "Early winter") },
          { id: "winter_deep", label: L("严冬", "Deep winter") },
          { id: "winter_late", label: L("晚冬", "Late winter") },
        ] },
        { id: "custom", label: L("自定义", "Custom"), custom: true },
      ],
    },
    {
      key: "weather",
      label: L("天气", "Weather"),
      options: [
        { id: "clear", label: L("晴", "Clear"), children: [
          { id: "clear_cloudless", label: L("万里无云", "Cloudless sky") },
          { id: "clear_bright", label: L("阳光炽烈", "Blazing sun") },
          { id: "clear_light_clouds", label: L("微云点缀", "A few scattered clouds") },
        ] },
        { id: "rain", label: L("雨", "Rain"), children: [
          { id: "rain_heavy", label: L("暴雨", "Heavy rain") },
          { id: "rain_light", label: L("细雨", "Light drizzle") },
          { id: "rain_thunder", label: L("雷阵雨", "Thunderstorm") },
        ] },
        { id: "snow", label: L("雪", "Snow"), children: [
          { id: "snow_first", label: L("初雪", "First snowfall") },
          { id: "snow_light", label: L("小雪纷飞", "Light snow") },
          { id: "snow_blizzard", label: L("暴风雪", "Blizzard") },
        ] },
        { id: "overcast", label: L("阴", "Overcast"), children: [
          { id: "overcast_cloudy", label: L("多云", "Cloudy") },
          { id: "overcast_gloomy", label: L("阴沉", "Gloomy") },
          { id: "overcast_mist", label: L("薄雾笼罩", "Thin mist") },
        ] },
        { id: "wind", label: L("风", "Wind"), children: [
          { id: "wind_breeze", label: L("微风", "Gentle breeze") },
          { id: "wind_strong", label: L("大风", "Strong wind") },
          { id: "wind_gale", label: L("狂风", "Gale") },
        ] },
        { id: "custom", label: L("自定义", "Custom"), custom: true },
      ],
    },
    {
      key: "time",
      label: L("时间", "Time"),
      options: [
        { id: "dawn", label: L("黎明", "Dawn"), children: [
          { id: "dawn_daybreak", label: L("破晓", "Daybreak") },
          { id: "dawn_firstlight", label: L("晨曦微露", "First light") },
        ] },
        { id: "daytime", label: L("白天", "Daytime"), children: [
          { id: "daytime_morning", label: L("上午", "Morning") },
          { id: "daytime_noon", label: L("正午", "Noon") },
          { id: "daytime_afternoon", label: L("下午", "Afternoon") },
        ] },
        { id: "dusk", label: L("黄昏", "Dusk"), children: [
          { id: "dusk_sunset", label: L("日落时分", "Sunset") },
          { id: "dusk_twilight", label: L("暮色四合", "Twilight") },
        ] },
        { id: "night", label: L("夜晚", "Night"), children: [
          { id: "night_moonlit", label: L("月夜", "Moonlit night") },
          { id: "night_starry", label: L("星空", "Starry sky") },
          { id: "night_late", label: L("深夜", "Late night") },
        ] },
        { id: "custom", label: L("自定义", "Custom"), custom: true },
      ],
    },
    {
      key: "light",
      label: L("光线", "Light"),
      options: [
        { id: "bright", label: L("明亮", "Bright"), children: [
          { id: "bright_clear", label: L("澄澈晴光", "Clear, crisp sunlight") },
          { id: "bright_blazing", label: L("阳光炽烈", "Blazing, dazzling sun") },
          { id: "bright_glare", label: L("反光刺眼", "Glaring reflected light") },
        ] },
        { id: "soft", label: L("柔和", "Soft"), children: [
          { id: "soft_amber", label: L("温暖橙光", "Warm amber light") },
          { id: "soft_hazy", label: L("朦胧微光", "Hazy, soft glow") },
          { id: "soft_cool", label: L("冷白柔光", "Cool white soft light") },
        ] },
        { id: "dim", label: L("昏暗", "Dim"), children: [
          { id: "dim_candle", label: L("温暖烛光", "Warm candlelight") },
          { id: "dim_cold", label: L("阴冷灰光", "Cold gray gloom") },
          { id: "dim_dark", label: L("深沉黑暗", "Deep, heavy darkness") },
        ] },
        { id: "dramatic", label: L("戏剧性", "Dramatic"), children: [
          { id: "dramatic_backlit", label: L("逆光剪影", "Backlit silhouette") },
          { id: "dramatic_contrast", label: L("强烈光影对比", "Stark light-shadow contrast") },
          { id: "dramatic_flicker", label: L("忽明忽暗", "Flickering, unstable light") },
        ] },
        { id: "custom", label: L("自定义", "Custom"), custom: true },
      ],
    },
    {
      // "road" has no tree-drill-down options of its own -- it gets a custom
      // 3-facet picker (openRoadPicker/renderRoadPicker below) instead, since it
      // needs to hold course + width + surface at once, not a single tree leaf.
      key: "road",
      label: L("路", "Road"),
      options: [],
    },
  ];

  // Fixed, never-regenerated wording for the scene's composition. Letting the AI
  // reword "a road with trees" itself every time let the phrasing (and so the
  // generated image's actual layout) drift between generations. Splicing this
  // in verbatim and only asking the AI for the atmosphere sentence keeps every
  // generated image's structure -- one road, one-point perspective, two rows of
  // trees -- consistent with the sketch shown on the bubble-picker screen. Only
  // the road's own description (width/straightness/surface) varies, driven
  // deterministically by the "road" bubble via ROAD_STYLE_VISUALS below --
  // never by free AI rewriting.
  // Perspective clause is course-aware on purpose: telling the image model both
  // "winding" and "one straight vanishing point" in the same sentence are
  // competing instructions, and the model reliably collapses to a near-straight
  // road when they conflict. straight keeps the single-vanishing-point framing;
  // gentle_bend/winding instead describe the vanishing point itself shifting
  // with each bend so the curve has somewhere to go compositionally.
  const ROAD_COURSE_PERSPECTIVE_CLAUSES = {
    straight: "extending in a straight line from the foreground to a single vanishing point at the horizon, shown in centered one-point perspective",
    gentle_bend: "curving gently from side to side as it recedes from the foreground toward the horizon, its vanishing point shifting subtly with the bend, shown in a naturalistic centered perspective",
    winding: "winding sharply back and forth as it recedes from the foreground toward the horizon, with clearly visible S-curves and switchbacks, its vanishing point shifting with each turn, shown in a naturalistic centered perspective",
  };

  // Tree density is deliberately modest, matching the bubble-picker sketch:
  // one clear tree near the viewer on each side, a few more further along,
  // thinning out toward the horizon -- not a dense, continuous double hedge.
  // "Evenly spaced" alone reliably reads to the image model as a packed
  // allee lining the entire path, which the sketch never actually shows.
  function buildRoadStructureSentence(roadDescriptionText, courseKey) {
    const perspectiveClause = ROAD_COURSE_PERSPECTIVE_CLAUSES[courseKey] || ROAD_COURSE_PERSPECTIVE_CLAUSES.straight;
    return `The scene shows ${roadDescriptionText}, ${perspectiveClause}. A modest, sparse number of trees stand along each side of the path -- not a dense or continuous row -- spaced well apart, canopies visible against the sky, thinning out further toward the horizon. The path and its flanking trees are the only structural elements in the scene -- no forks, no side paths, no clearings, no other landmarks.`;
  }

  const PANORAMA_360_SUFFIX =
    "Realistic 360-degree equirectangular panoramic image, seamless full spherical environment, immersive VR-ready panorama, consistent horizon, no frame, no text, no watermark.";

  // Concrete sound-source keywords per weather leaf, so prompt2_sound is
  // anchored to what was actually picked (wind / rain / thunder / snow / ...)
  // instead of the AI loosely re-interpreting a short Chinese label. Falls
  // back to the top-level id, then to a generic quiet default.
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

  // Custom/free-text weather has no path[] to key off of, so without this a
  // custom entry always fell through to the generic "very quiet ambience"
  // default regardless of what was actually typed (e.g. a custom "暴雨雷电"
  // entry would still get calm-breeze phrasing). Cheap zh/en keyword sniff so
  // custom text lands on the closest real category instead. Leaf keywords are
  // checked before top-level ones since they're more specific (e.g. "微风"
  // should win over a coincidental top-level "风" match).
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

  function matchWeatherCategoryFromText(text) {
    if (!text) return null;
    const lower = String(text).toLowerCase();
    const found = WEATHER_KEYWORD_CATEGORIES.find((entry) => entry.words.some((word) => lower.includes(word.toLowerCase())));
    return found ? found.id : null;
  }

  function weatherSoundHint() {
    const selection = state.selections.weather;
    if (!selection) return WEATHER_SOUND_HINTS.default;
    if (selection.custom) {
      const matched = matchWeatherCategoryFromText(selection.label);
      return (matched && WEATHER_SOUND_HINTS[matched]) || WEATHER_SOUND_HINTS.default;
    }
    const leafId = selection.path[selection.path.length - 1];
    return WEATHER_SOUND_HINTS[leafId] || WEATHER_SOUND_HINTS[selection.path[0]] || WEATHER_SOUND_HINTS.default;
  }

  // Pre-made ambience clips in record/backup/ (see BACKUP_SOUND_PATHS in
  // local_server.py for the actual filenames). A category that resolves to an
  // existing clip skips ElevenLabs/fal.ai generation entirely for that
  // weather -- these are direct, on-theme matches, not a generic "quiet
  // weather" guess. Leaf ids are checked before the top-level branch, since
  // most of these are leaf-specific and don't apply to their siblings (e.g.
  // rain_heavy still generates normally even though rain_thunder doesn't).
  const BACKUP_SOUND_LEAF_CATEGORIES = new Set([
    "rain_thunder", "rain_light", "wind_gale", "wind_breeze", "snow_first", "snow_light",
  ]);
  const BACKUP_SOUND_TOP_CATEGORIES = new Set(["clear", "overcast"]);

  function backupSoundCategoryForWeather() {
    const selection = state.selections.weather;
    if (!selection) return null;
    let leafId;
    let topId;
    if (selection.custom) {
      const matched = matchWeatherCategoryFromText(selection.label);
      if (!matched) return null;
      leafId = matched;
      topId = matched;
    } else {
      leafId = selection.path[selection.path.length - 1];
      topId = selection.path[0];
    }
    if (BACKUP_SOUND_LEAF_CATEGORIES.has(leafId)) return leafId;
    if (BACKUP_SOUND_TOP_CATEGORIES.has(topId)) return topId;
    return null;
  }

  // The road is 3 independent facets (not a tree drill-down): its course
  // (reframed away from a blunt "straight or not" question), width, and
  // surface. Each has its own small option set; openRoadPicker/renderRoadPicker
  // below let all three be set together in one panel, and the result is cached
  // as a combined display label on state.selections.road so every generic
  // piece of code that already reads `selection.label` for the other 4 bubbles
  // (renderBubbles, renderSelectionSummary) keeps working unchanged.
  const ROAD_FACETS = [
    {
      key: "course",
      label: L("走向", "Course"),
      options: [
        { id: "straight", label: L("笔直向前", "Straight ahead") },
        { id: "gentle_bend", label: L("微微蜿蜒", "Gently winding") },
        { id: "winding", label: L("蜿蜒曲折", "Winding and twisting") },
      ],
    },
    {
      key: "width",
      label: L("宽度", "Width"),
      options: [
        { id: "narrow", label: L("狭窄", "Narrow") },
        { id: "medium", label: L("适中", "Medium") },
        { id: "wide", label: L("宽阔", "Wide") },
      ],
    },
    {
      key: "surface",
      label: L("路面", "Surface"),
      options: [
        { id: "dirt", label: L("泥土", "Dirt") },
        { id: "stone", label: L("石板", "Stone") },
        { id: "gravel", label: L("碎石", "Gravel") },
        { id: "asphalt", label: L("柏油", "Asphalt") },
      ],
    },
  ];

  const ROAD_DEFAULTS = { course: "straight", width: "medium", surface: "dirt" };

  // Half-width (px, in the sketch's 480x320 viewBox) at the apex (t=0, y=215)
  // and base (t=1, y=320); interpolated linearly between the two.
  const ROAD_WIDTH_GEOMETRY = {
    narrow: { apexHalf: 12, baseHalf: 90 },
    medium: { apexHalf: 20, baseHalf: 130 },
    wide: { apexHalf: 30, baseHalf: 170 },
  };

  // Checkpoints from apex (t=0) to base (t=1): each { t, dx } is an absolute
  // sideways offset from the centerline at that height. More than 2 checkpoints
  // means more than 4 polygon vertices per side -- a visible angular "折线"
  // (polyline) kink at each one, not a smooth curve, and deliberately modest
  // (dx stays small relative to the sketch's 480px width).
  const ROAD_COURSE_GEOMETRY = {
    straight: { checkpoints: [{ t: 0, dx: 0 }, { t: 1, dx: 0 }] },
    gentle_bend: { checkpoints: [{ t: 0, dx: 0 }, { t: 0.55, dx: 18 }, { t: 1, dx: 18 }] },
    winding: { checkpoints: [{ t: 0, dx: 0 }, { t: 0.35, dx: -20 }, { t: 0.65, dx: 20 }, { t: 1, dx: 8 }] },
  };

  const ROAD_SURFACE_FILLS = {
    dirt: "#ded7c4",
    stone: "#b7b2a8",
    gravel: "#cfd0c8",
    asphalt: "#5c5f63",
  };

  const ROAD_WIDTH_ADJECTIVES = { narrow: "narrow", medium: "modestly wide", wide: "wide" };
  const ROAD_COURSE_ADJECTIVES = { straight: "straight", gentle_bend: "gently winding", winding: "winding, twisting" };
  const ROAD_SURFACE_NOUNS = { dirt: "unpaved dirt path", stone: "stone-paved path", gravel: "gravel path", asphalt: "paved asphalt road" };

  function roadFacetOption(facetKey, optionId) {
    const facet = ROAD_FACETS.find((f) => f.key === facetKey);
    return facet && facet.options.find((o) => o.id === optionId);
  }

  function currentRoadStyle() {
    const road = state.selections.road;
    if (!road || road.custom) return { ...ROAD_DEFAULTS };
    return {
      course: road.course || ROAD_DEFAULTS.course,
      width: road.width || ROAD_DEFAULTS.width,
      surface: road.surface || ROAD_DEFAULTS.surface,
    };
  }

  function roadDescription() {
    const road = state.selections.road;
    if (road && road.custom) return road.label;
    const style = currentRoadStyle();
    return `a ${ROAD_WIDTH_ADJECTIVES[style.width]}, ${ROAD_COURSE_ADJECTIVES[style.course]} ${ROAD_SURFACE_NOUNS[style.surface]}`;
  }

  function buildRoadPoints(widthKey, courseKey) {
    const { apexHalf, baseHalf } = ROAD_WIDTH_GEOMETRY[widthKey] || ROAD_WIDTH_GEOMETRY.medium;
    const checkpoints = (ROAD_COURSE_GEOMETRY[courseKey] || ROAD_COURSE_GEOMETRY.straight).checkpoints;
    const yApex = 215;
    const yBase = 320;
    const centerX = 240;

    const left = [];
    const right = [];
    const center = [];
    checkpoints.forEach(({ t, dx }) => {
      const y = yApex + (yBase - yApex) * t;
      const halfWidth = apexHalf + (baseHalf - apexHalf) * t;
      const cx = centerX + dx;
      left.push(`${(cx - halfWidth).toFixed(1)},${y.toFixed(1)}`);
      right.push(`${(cx + halfWidth).toFixed(1)},${y.toFixed(1)}`);
      center.push(`${cx.toFixed(1)},${y.toFixed(1)}`);
    });

    return {
      points: [...left, ...right.reverse()].join(" "),
      centerLine: center.join(" "),
    };
  }

  function applyRoadVisualFromStyle(style) {
    const svg = $("pathSketch");
    if (!svg) return;
    const road = svg.querySelector(".sketch-road");
    const roadLine = svg.querySelector(".sketch-road-line");
    if (!road || !roadLine) return;
    const { points, centerLine } = buildRoadPoints(style.width, style.course);
    road.setAttribute("points", points);
    road.style.fill = ROAD_SURFACE_FILLS[style.surface] || ROAD_SURFACE_FILLS.dirt;
    roadLine.setAttribute("points", centerLine);
  }

  function applyRoadVisual() {
    applyRoadVisualFromStyle(currentRoadStyle());
  }

  // ---------------------------------------------------------------------
  // Sketch snapshot (so the user's finished simple-sketch illustration is
  // archived to record/<timestamp>/Sketch/ alongside the 2D/VR output,
  // viewable together on record.html).
  // ---------------------------------------------------------------------

  const SKETCH_STYLE_PROPS = [
    "opacity", "fill", "fill-opacity", "stroke", "stroke-opacity",
    "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin",
    "display", "visibility", "transform",
  ];

  // Every visual reaction to a bubble choice lives in path.css as external
  // attribute-selector rules (data-season, data-weather, ...). Those rules
  // don't apply when the SVG is serialized and rendered standalone (e.g. via
  // an <img> tag or a detached document), so instead of re-embedding the
  // whole stylesheet we bake in the CURRENT computed style of every element
  // as an inline style attribute on a clone -- this captures exactly what is
  // on screen right now, including resolved CSS custom properties, without
  // needing to reproduce the cascade rules at all.
  function inlineComputedStyle(source, target) {
    const computed = window.getComputedStyle(source);
    target.setAttribute("style", SKETCH_STYLE_PROPS.map((prop) => `${prop}:${computed.getPropertyValue(prop)}`).join(";"));
  }

  async function captureSketchDataUrl() {
    const original = $("pathSketch");
    if (!original) return null;

    const clone = original.cloneNode(true);
    inlineComputedStyle(original, clone);
    const originalNodes = original.querySelectorAll("*");
    const cloneNodes = clone.querySelectorAll("*");
    originalNodes.forEach((node, index) => inlineComputedStyle(node, cloneNodes[index]));

    const width = 960;
    const height = 640;
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));

    const svgText = new XMLSerializer().serializeToString(clone);
    const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgText)))}`;

    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Failed to rasterize sketch SVG."));
      image.src = svgDataUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  }

  // Fire-and-forget: a missing sketch snapshot should never block save/generate.
  async function saveSketchSnapshot(timestamp) {
    try {
      const sketchPng = await captureSketchDataUrl();
      if (!sketchPng) return;
      const response = await fetch("/save-sketch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestamp, sketch_png: sketchPng }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Sketch save failed");
    } catch (error) {
      console.warn("saveSketchSnapshot failed:", error);
    }
  }

  const INTRO_VOICE_TRACKS = {
    "zh-CN": "../Voice/Chinese_Intro.mp3",
    "en-US": "../Voice/English_Intro.mp3",
  };

  // Same two tracks, same paths, same crossfade/duck behavior as the main
  // chatbot flow (app.js) -- this page shares the ambient background music.
  const MUSIC_TRACKS = [
    "../music/Inner_Landscape_Reflection_2026-07-28T233332.mp3",
    "../music/Neutral_Reflective_Ambience_2026-07-28T233331.mp3",
  ];

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

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------

  const state = {
    language: "en-US",
    screen: "language",
    selections: { season: null, weather: null, time: null, light: null, road: null },
    output: null, // { result: {...FINAL_RESULT_SCHEMA fields}, timestamp }
    experience: null, // { image_url, sound_url }
  };

  const picker = {
    categoryKey: null,
    path: [], // array of option nodes drilled into so far
  };

  const introVoice = { audio: null, timer: null };

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

  function lang() {
    return state.language === "en-US" ? "en-US" : "zh-CN";
  }

  function t(key) {
    return (UI_TEXT[lang()] && UI_TEXT[lang()][key]) || UI_TEXT["zh-CN"][key] || key;
  }

  function labelFor(bilingual) {
    return bilingual[lang()] || bilingual["zh-CN"];
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function showDialog(title, body) {
    $("pathDialogTitle").textContent = title;
    $("pathDialogBody").textContent = body;
    $("pathInfoDialog").showModal();
  }

  function formatTimestamp(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate()), pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join("");
  }

  // ---------------------------------------------------------------------
  // Screens
  // ---------------------------------------------------------------------

  function showScreen(name) {
    state.screen = name;
    $("pathLanguageScreen").classList.toggle("hidden", name !== "language");
    $("pathIntroScreen").classList.toggle("hidden", name !== "intro");
    $("pathBubblesScreen").classList.toggle("hidden", name !== "bubbles");
    $("pathConfirmScreen").classList.toggle("hidden", name !== "confirm");
    $("pathExperienceScreen").classList.toggle("hidden", name !== "experience");
  }

  function applyLanguage() {
    document.documentElement.lang = lang();
    $("pathBrand").textContent = t("brand");
    $("pathTagline").textContent = t("tagline");
    document.title = t("brand");
    $("pathIntroText").textContent = t("introText");
    $("pathIntroContinueBtn").textContent = t("introContinue");
    $("pathBubblesTitle").textContent = t("bubblesTitle");
    $("pathBubblesDesc").textContent = t("bubblesDesc");
    $("pathResetSelectionsBtn").textContent = t("resetSelections");
    $("pathGenerateSummaryBtn").textContent = t("generateSummary");
    $("pathConfirmTitle").textContent = t("confirmTitle");
    $("pathConfirmDesc").textContent = t("confirmDesc");
    $("pathBackToBubblesBtn").textContent = t("backToBubbles");
    $("pathSummarizeBtn").textContent = t("summarize");
    $("pathSaveBtn").textContent = t("save");
    $("pathGenerate2dBtn").textContent = t("generate2d");
    $("pathGenerateVrBtn").textContent = t("generateVr");
    $("pathStartExperienceBtn").textContent = t("startExperience");
    $("pathExitExperienceBtn").textContent = t("exitExperience");
    $("pathDialogOkBtn").textContent = t("dialogOk");
    renderMusicToggleState();
    $("pathIntroImage").src = lang() === "en-US" ? "../intro_source/English.png" : "../intro_source/Chinese.png";
    renderBubbles();
    renderSelectionSummary();
  }

  function chooseLanguage(value) {
    state.language = value === "en-US" ? "en-US" : "zh-CN";
    applyLanguage();
    showScreen("intro");
    startBackgroundMusic(musicState.duckVolume);
    playIntroVoice();
  }

  // ---------------------------------------------------------------------
  // Background music (ported from app.js: same tracks, same crossfade/duck
  // behavior, so this page's ambience matches the main chat flow).
  // ---------------------------------------------------------------------

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
    renderMusicToggleState();
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
    renderMusicToggleState();
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

  function renderMusicToggleState() {
    const btn = $("pathMusicToggleBtn");
    if (!btn) return;
    btn.textContent = musicState.playing ? t("musicOn") : t("musicOff");
  }

  // ---------------------------------------------------------------------
  // Intro voice
  // ---------------------------------------------------------------------

  const INTRO_VOICE_VOLUME = 0.85;

  function ensureIntroVoice() {
    if (introVoice.audio) return introVoice.audio;
    introVoice.audio = new Audio();
    introVoice.audio.preload = "auto";
    introVoice.audio.addEventListener("ended", () => restoreBackgroundMusicVolume());
    return introVoice.audio;
  }

  async function playIntroVoice() {
    const audio = ensureIntroVoice();
    if (introVoice.timer) window.clearTimeout(introVoice.timer);
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
    const audio = introVoice.audio;
    if (!audio) return;
    if (introVoice.timer) window.clearTimeout(introVoice.timer);
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
        introVoice.timer = window.setTimeout(step, 40);
      } else {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = INTRO_VOICE_VOLUME;
      }
    };
    step();
  }

  // ---------------------------------------------------------------------
  // Bubbles + picker
  // ---------------------------------------------------------------------

  function renderBubbles() {
    const container = $("pathBubbles");
    container.innerHTML = "";
    BUBBLE_CATEGORIES.forEach((category) => {
      const selection = state.selections[category.key];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "path-bubble" + (selection ? " filled" : "");
      button.dataset.category = category.key;
      button.innerHTML = `
        ${BUBBLE_ICONS[category.key] || ""}
        <span class="path-bubble-label">${escapeHtml(labelFor(category.label))}</span>
        <span class="path-bubble-value">${escapeHtml(selection ? selection.label : t("notChosen"))}</span>
      `;
      button.addEventListener("click", () => openPicker(category.key));
      container.appendChild(button);
    });
    updateSketchPreview();
  }

  // Reflects the current selections onto the SVG sketch via data-* attributes,
  // which path.css reads to swap sky color, show/hide weather elements, tint
  // the trees, etc. Custom (free-text) selections have no matching leaf visual,
  // so they get the literal value "custom" instead -- path.css gives that a
  // soft golden shimmer so the choice still reads as registered rather than
  // looking like nothing was picked.
  function updateSketchPreview() {
    const svg = $("pathSketch");
    if (!svg) return;
    BUBBLE_CATEGORIES.forEach((category) => {
      const selection = state.selections[category.key];
      if (selection && selection.custom) {
        svg.setAttribute(`data-${category.key}`, "custom");
        return;
      }
      // Use the deepest chosen id (e.g. "rain_heavy"), not just the top-level
      // one ("rain"), so path.css can render richer, sub-choice-specific
      // detail. Every leaf id is prefixed with its top-level id, so CSS can
      // still match the broad category via an attribute "starts with" ([data-x^="rain"])
      // and layer more specific exact-match rules on top for the leaf.
      const leafId = selection && selection.path && selection.path.length ? selection.path[selection.path.length - 1] : "";
      if (leafId) {
        svg.setAttribute(`data-${category.key}`, leafId);
      } else {
        svg.removeAttribute(`data-${category.key}`);
      }
    });
    applyRoadVisual();
    updateSketchFillProgress();
  }

  // "Coming alive": the scene starts near-grayscale and gains saturation as
  // more of the 5 bubbles get filled (see .path-sketch-frame[data-filled] in
  // path.css), so decorating the scene reads as waking it up.
  function updateSketchFillProgress() {
    const frame = $("pathSketchFrame");
    if (!frame) return;
    const filled = BUBBLE_CATEGORIES.reduce((count, category) => count + (state.selections[category.key] ? 1 : 0), 0);
    frame.dataset.filled = String(filled);
  }

  // Temporarily show what one option would look like, without touching
  // state.selections. clearSketchPreview() (mouseleave) reverts by simply
  // re-applying the actually-confirmed state.
  function previewSketchOption(categoryKey, optionId) {
    const svg = $("pathSketch");
    const frame = $("pathSketchFrame");
    if (!svg || !frame) return;
    svg.setAttribute(`data-${categoryKey}`, optionId);
    frame.classList.add("previewing");
  }

  function clearSketchPreview() {
    const frame = $("pathSketchFrame");
    if (frame) frame.classList.remove("previewing");
    updateSketchPreview();
  }

  function fireSketchConfirmPulse() {
    const ring = $("pathSketchPulse");
    if (!ring) return;
    ring.classList.remove("firing");
    // Force reflow so re-adding the class restarts the animation every time,
    // even for back-to-back confirms.
    void ring.getBBox();
    ring.classList.add("firing");
  }

  function findCategory(key) {
    return BUBBLE_CATEGORIES.find((category) => category.key === key);
  }

  function resolvePickerPath(category, idPath) {
    const nodes = [];
    let options = category.options;
    for (const id of idPath || []) {
      const node = (options || []).find((option) => option.id === id);
      if (!node) break;
      nodes.push(node);
      options = node.children;
    }
    return nodes;
  }

  function openPicker(categoryKey) {
    picker.categoryKey = categoryKey;
    if (categoryKey === "road") {
      openRoadPicker();
      $("pathPickerBackdrop").classList.remove("hidden");
      $("pathPicker").classList.remove("hidden");
      return;
    }
    const category = findCategory(categoryKey);
    const existing = state.selections[categoryKey];
    picker.path = existing ? resolvePickerPath(category, existing.path) : [];
    $("pathPickerTitle").textContent = labelFor(category.label);
    renderPicker();
    $("pathPickerBackdrop").classList.remove("hidden");
    $("pathPicker").classList.remove("hidden");
  }

  function closePicker() {
    $("pathPickerBackdrop").classList.add("hidden");
    $("pathPicker").classList.add("hidden");
    picker.categoryKey = null;
    picker.path = [];
    clearSketchPreview();
  }

  // ---------------------------------------------------------------------
  // Road picker: 3 facet rows (course/width/surface) settable together in one
  // panel, plus a "describe it yourself" escape hatch that reuses the same
  // custom-text UI the tree pickers use for their own "自定义" leaf.
  // ---------------------------------------------------------------------

  const roadDraft = { course: null, width: null, surface: null };

  function openRoadPicker() {
    const existing = state.selections.road;
    const style = existing && !existing.custom
      ? { course: existing.course, width: existing.width, surface: existing.surface }
      : { ...ROAD_DEFAULTS };
    roadDraft.course = style.course;
    roadDraft.width = style.width;
    roadDraft.surface = style.surface;
    $("pathPickerTitle").textContent = labelFor(findCategory("road").label);
    $("pathPickerBreadcrumb").textContent = "";
    renderRoadPicker();
  }

  function renderRoadPicker() {
    const optionsContainer = $("pathPickerOptions");
    optionsContainer.innerHTML = "";

    ROAD_FACETS.forEach((facet) => {
      const row = document.createElement("div");
      row.className = "path-picker-facet-row";

      const rowLabel = document.createElement("div");
      rowLabel.className = "path-picker-facet-label";
      rowLabel.textContent = labelFor(facet.label);
      row.appendChild(rowLabel);

      const chipRow = document.createElement("div");
      chipRow.className = "path-picker-facet-chips";
      facet.options.forEach((option) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "path-picker-option" + (roadDraft[facet.key] === option.id ? " active" : "");
        chip.textContent = labelFor(option.label);
        chip.addEventListener("mouseenter", () => {
          $("pathSketchFrame").classList.add("previewing");
          applyRoadVisualFromStyle({ ...roadDraft, [facet.key]: option.id });
        });
        chip.addEventListener("mouseleave", () => {
          $("pathSketchFrame").classList.remove("previewing");
          applyRoadVisualFromStyle(roadDraft);
        });
        chip.addEventListener("click", () => {
          roadDraft[facet.key] = option.id;
          // Live preview as the draft is built, not just after confirming --
          // matches the tree-category bubbles' hover-preview / confirm split.
          applyRoadVisualFromStyle(roadDraft);
          renderRoadPicker();
        });
        chipRow.appendChild(chip);
      });
      row.appendChild(chipRow);
      optionsContainer.appendChild(row);
    });

    const customToggle = document.createElement("button");
    customToggle.type = "button";
    customToggle.className = "path-picker-custom-toggle";
    customToggle.textContent = t("roadCustomToggle");
    customToggle.addEventListener("click", renderRoadCustomMode);
    optionsContainer.appendChild(customToggle);

    $("pathPickerCustom").classList.add("hidden");
    const currentLabel = [
      roadFacetOption("course", roadDraft.course),
      roadFacetOption("width", roadDraft.width),
      roadFacetOption("surface", roadDraft.surface),
    ].filter(Boolean).map((option) => labelFor(option.label)).join(" · ");
    $("pathPickerCurrent").textContent = t("currentChoicePrefix") + currentLabel;
    $("pathPickerConfirmBtn").textContent = t("confirmChoice");
    $("pathPickerConfirmBtn").classList.remove("hidden");
  }

  function renderRoadCustomMode() {
    $("pathPickerOptions").innerHTML = "";
    $("pathPickerCustom").classList.remove("hidden");
    const existing = state.selections.road;
    $("pathPickerCustomInput").value = existing && existing.custom ? existing.label : "";
    $("pathPickerCustomInput").placeholder = t("customPlaceholder");
    $("pathPickerCustomConfirmBtn").textContent = t("confirmChoice");
    $("pathPickerConfirmBtn").classList.add("hidden");
    $("pathPickerCurrent").textContent = "";
  }

  function confirmRoadSelection() {
    const course = roadFacetOption("course", roadDraft.course);
    const width = roadFacetOption("width", roadDraft.width);
    const surface = roadFacetOption("surface", roadDraft.surface);
    const label = [course, width, surface].filter(Boolean).map((option) => labelFor(option.label)).join(" · ");
    state.selections.road = { course: roadDraft.course, width: roadDraft.width, surface: roadDraft.surface, custom: false, label };
    renderBubbles();
    fireSketchConfirmPulse();
    closePicker();
  }

  function currentPickerOptions() {
    const category = findCategory(picker.categoryKey);
    if (picker.path.length === 0) return category.options;
    return picker.path[picker.path.length - 1].children || [];
  }

  function renderPickerBreadcrumb() {
    const breadcrumb = $("pathPickerBreadcrumb");
    breadcrumb.innerHTML = "";

    const rootBtn = document.createElement("button");
    rootBtn.type = "button";
    rootBtn.className = "path-picker-crumb";
    rootBtn.textContent = labelFor(findCategory(picker.categoryKey).label);
    rootBtn.addEventListener("click", () => {
      picker.path = [];
      renderPicker();
    });
    breadcrumb.appendChild(rootBtn);

    picker.path.forEach((node, index) => {
      const sep = document.createElement("span");
      sep.className = "path-picker-crumb-sep";
      sep.textContent = "/";
      breadcrumb.appendChild(sep);

      const crumbBtn = document.createElement("button");
      crumbBtn.type = "button";
      crumbBtn.className = "path-picker-crumb";
      crumbBtn.textContent = labelFor(node.label);
      crumbBtn.addEventListener("click", () => {
        picker.path = picker.path.slice(0, index + 1);
        renderPicker();
      });
      breadcrumb.appendChild(crumbBtn);
    });
  }

  function renderPicker() {
    renderPickerBreadcrumb();

    const options = currentPickerOptions();
    const optionsContainer = $("pathPickerOptions");
    const customPanel = $("pathPickerCustom");
    const deepestNode = picker.path[picker.path.length - 1] || null;

    if (deepestNode && deepestNode.custom) {
      const existing = state.selections[picker.categoryKey];
      const prefill = existing && existing.custom ? existing.label : "";
      optionsContainer.innerHTML = "";
      customPanel.classList.remove("hidden");
      $("pathPickerCustomInput").value = prefill;
      $("pathPickerCustomInput").placeholder = t("customPlaceholder");
      $("pathPickerCustomConfirmBtn").textContent = t("confirmChoice");
      updatePickerFooter(null);
      return;
    }

    customPanel.classList.add("hidden");
    optionsContainer.innerHTML = "";
    options.forEach((node) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "path-picker-option";
      chip.textContent = labelFor(node.label);
      // "Try it on" before committing: hovering shows what this option (or, for
      // a branch node like "rain" before drilling into a leaf, its top-level
      // look via the [data-weather^="rain"] prefix rules) would do to the
      // sketch, reverting to the actually-confirmed state on mouseleave.
      chip.addEventListener("mouseenter", () => previewSketchOption(picker.categoryKey, node.id));
      chip.addEventListener("mouseleave", clearSketchPreview);
      chip.addEventListener("click", () => {
        picker.path.push(node);
        renderPicker();
      });
      optionsContainer.appendChild(chip);
    });

    updatePickerFooter(deepestNode);
  }

  function updatePickerFooter(node) {
    const confirmBtn = $("pathPickerConfirmBtn");
    const currentLabel = $("pathPickerCurrent");
    if (!node) {
      currentLabel.textContent = "";
      confirmBtn.classList.add("hidden");
      return;
    }
    currentLabel.textContent = t("currentChoicePrefix") + labelFor(node.label);
    confirmBtn.textContent = t("confirmChoice");
    confirmBtn.classList.remove("hidden");
  }

  function confirmPickerSelection(node) {
    if (!node) return;
    state.selections[picker.categoryKey] = { label: labelFor(node.label), path: picker.path.map((item) => item.id) };
    renderBubbles();
    fireSketchConfirmPulse();
    closePicker();
  }

  function confirmPickerCustomText() {
    const text = $("pathPickerCustomInput").value.trim();
    if (!text) return;
    state.selections[picker.categoryKey] = { label: text, path: ["custom"], custom: true };
    renderBubbles();
    fireSketchConfirmPulse();
    closePicker();
  }

  function resetSelections() {
    state.selections = { season: null, weather: null, time: null, light: null, road: null };
    renderBubbles();
  }

  // ---------------------------------------------------------------------
  // Confirm screen / summary
  // ---------------------------------------------------------------------

  function renderSelectionSummary() {
    const container = $("pathSelectionSummary");
    if (!container) return;
    container.innerHTML = BUBBLE_CATEGORIES.map((category) => {
      const selection = state.selections[category.key];
      return `<div class="path-selection-chip">
        <div class="chip-label">${escapeHtml(labelFor(category.label))}</div>
        <div class="chip-value">${escapeHtml(selection ? selection.label : t("notChosen"))}</div>
      </div>`;
    }).join("");
  }

  function goToConfirm() {
    renderSelectionSummary();
    $("pathOutputPreview").classList.add("hidden");
    $("pathSaveBtn").classList.add("hidden");
    $("pathGenerate2dBtn").classList.add("hidden");
    $("pathGenerateVrBtn").classList.add("hidden");
    $("pathStartExperienceBtn").classList.add("hidden");
    $("pathVrStatus").classList.add("hidden");
    $("pathExperiencePreview").classList.add("hidden");
    state.output = null;
    state.experience = null;
    stopBackgroundMusic();
    showScreen("confirm");
  }

  // ---------------------------------------------------------------------
  // OpenAI: summarize selections into the final generation prompts
  // ---------------------------------------------------------------------

  function getOpenAiKey() {
    return $("pathApiKeyInput").value.trim() || sessionStorage.getItem("innerLandscapeApiKey") || "";
  }

  function getSoundProviderCredentials() {
    return {
      soundProvider: $("pathSoundProviderSelect").value === "falai" ? "falai" : "elevenlabs",
      elevenLabsKey: $("pathElevenLabsKeyInput").value.trim() || sessionStorage.getItem("innerLandscapeElevenLabsKey") || "",
      falKey: $("pathFalKeyInput").value.trim() || sessionStorage.getItem("innerLandscapeFalKey") || "",
    };
  }

  function buildPathFinalPromptSystemPrompt() {
    return `You turn 4 simple decorations (season, weather, time of day, light) into final generation prompts for ONE FIXED scene concept: a road/path extending into the distance, flanked by trees on both sides of the path. The exact wording of that scene's composition is supplied separately and fixed -- your job is only the atmosphere layered on top of it, plus the music prompt.

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
- scene_tags: short lowercase tags.`;
  }

  async function postResponses(apiKey, body) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error?.message || `OpenAI request failed: ${response.status}`);
    }
    const text = data.output_text || (data.output || []).flatMap((item) => (item.content || [])
      .filter((content) => content.type === "output_text" || content.type === "text")
      .map((content) => content.text)).join("\n").trim();
    if (!text) throw new Error("The model did not return parseable text");
    try {
      return JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("The model returned JSON that could not be parsed");
      return JSON.parse(match[0]);
    }
  }

  async function summarizeSelections() {
    const apiKey = getOpenAiKey();
    if (!apiKey) throw new Error(t("needOpenAiKey"));

    const button = $("pathSummarizeBtn");
    button.disabled = true;
    button.textContent = t("summarizing");
    try {
      // "road" is deliberately excluded here: its wording is fixed/deterministic
      // (see buildRoadStructureSentence), not something the AI should describe or
      // re-interpret as part of atmosphere_description.
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
          // Deterministic, not AI-authored: weatherSoundHint() picks the one
          // WEATHER_SOUND_HINTS preset matching the chosen weather leaf, so the
          // same weather choice always renders the same sound-source keywords
          // instead of the AI re-describing (and sometimes drifting on) it.
          prompt2_sound: weatherSoundHint(),
          prompt3_music: finalPrompts.prompt3_music,
        },
        title: finalPrompts.title,
        timestamp: formatTimestamp(now),
      };
      saveSketchSnapshot(state.output.timestamp);

      $("pathOutputPreview").classList.remove("hidden");
      $("pathOutputPreview").innerHTML = `<h2>${escapeHtml(finalPrompts.title || "")}</h2><pre>${escapeHtml(JSON.stringify(state.output.result, null, 2))}</pre>`;
      $("pathSaveBtn").classList.remove("hidden");
      $("pathGenerate2dBtn").classList.remove("hidden");
      $("pathGenerateVrBtn").classList.remove("hidden");
    } finally {
      button.disabled = false;
      button.textContent = t("summarize");
    }
  }

  // ---------------------------------------------------------------------
  // Save prompt/log
  // ---------------------------------------------------------------------

  async function saveResult() {
    if (!state.output) return;
    const log = {
      project_id: `PATH_${state.output.timestamp}`,
      created_at: new Date().toISOString(),
      mode: "path-bubble-picker",
      language: lang(),
      selections: Object.fromEntries(BUBBLE_CATEGORIES.map((category) => [category.key, state.selections[category.key]])),
      title: state.output.title,
    };
    const response = await fetch("/save-generated-files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: state.output.result, log, timestamp: state.output.timestamp }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Save failed");
    showDialog(t("savedTitle"), t("savedBody"));
  }

  // ---------------------------------------------------------------------
  // 2D / VR generation (reuses the same server endpoints as the main app)
  // ---------------------------------------------------------------------

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

  function isNonePrompt(prompt) {
    return !prompt || String(prompt).trim().toLowerCase() === "none";
  }

  function buildSoundPrompt(prompt) {
    if (isNonePrompt(prompt)) return "none";
    const noiseGuard = "Soft, clean recording. No static, no hiss, no white noise, no distortion, no crackle, no clipping.";
    const base = String(prompt || "").replace(/No music,?/gi, "").replace(/or sudden loud events\.?/gi, "").replace(/\s+/g, " ").trim();
    const maxBaseLength = 450 - noiseGuard.length - 1;
    return `${base.slice(0, maxBaseLength)} ${noiseGuard}`.trim();
  }

  function assertSoundProviderKeySet(soundPrompt, { soundProvider, elevenLabsKey, falKey }) {
    if (isNonePrompt(soundPrompt)) return;
    // A weather with its own backup clip skips generation server-side (see
    // BACKUP_SOUND_PATHS in local_server.py), so no key is needed for it --
    // the server independently re-checks the file actually exists either way.
    if (backupSoundCategoryForWeather()) return;
    if (soundProvider === "falai" && !falKey) throw new Error(t("needFalKey"));
    if (soundProvider === "elevenlabs" && !elevenLabsKey) throw new Error(t("needElevenLabsKey"));
  }

  async function generate2dExperience() {
    if (!state.output) return;
    const openaiKey = getOpenAiKey();
    const { soundProvider, elevenLabsKey, falKey } = getSoundProviderCredentials();
    if (!openaiKey) throw new Error(t("needOpenAiKey"));
    assertSoundProviderKeySet(state.output.result.prompt2_sound, { soundProvider, elevenLabsKey, falKey });

    const button = $("pathGenerate2dBtn");
    button.disabled = true;
    button.textContent = t("generating2d");
    $("pathStartExperienceBtn").classList.add("hidden");
    $("pathExperiencePreview").classList.remove("hidden");
    $("pathExperiencePreview").innerHTML = `<p>${escapeHtml(t("generating2d"))}</p>`;
    try {
      const response = await fetch("/generate-2d-experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: state.output.timestamp,
          openai_api_key: openaiKey,
          elevenlabs_api_key: elevenLabsKey,
          fal_api_key: falKey,
          sound_provider: soundProvider,
          backup_sound_category: backupSoundCategoryForWeather(),
          image_model: "gpt-image-2",
          flat_image_prompt: buildFlatImagePrompt(state.output.result.prompt1_environment_360),
          sound_prompt: buildSoundPrompt(state.output.result.prompt2_sound),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "2D experience generation failed");
      state.experience = data;
      $("pathExperiencePreview").innerHTML = `<h2>${escapeHtml(t("startExperience"))}</h2>`;
      $("pathStartExperienceBtn").classList.remove("hidden");
    } finally {
      button.disabled = false;
      button.textContent = t("generate2d");
    }
  }

  async function generateVrExperience() {
    if (!state.output) return;
    const openaiKey = getOpenAiKey();
    const { soundProvider, elevenLabsKey, falKey } = getSoundProviderCredentials();
    if (!openaiKey) throw new Error(t("needOpenAiKey"));
    assertSoundProviderKeySet(state.output.result.prompt2_sound, { soundProvider, elevenLabsKey, falKey });

    const button = $("pathGenerateVrBtn");
    const status = $("pathVrStatus");
    button.disabled = true;
    button.textContent = t("generatingVr");
    status.classList.remove("hidden");
    status.className = "status-text";
    status.textContent = t("generatingVr");
    try {
      const response = await fetch("/generate-vr-experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: state.output.timestamp,
          openai_api_key: openaiKey,
          elevenlabs_api_key: elevenLabsKey,
          fal_api_key: falKey,
          sound_provider: soundProvider,
          backup_sound_category: backupSoundCategoryForWeather(),
          image_model: "gpt-image-2",
          environment_prompt: state.output.result.prompt1_environment_360,
          sound_prompt: buildSoundPrompt(state.output.result.prompt2_sound),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "VR experience generation failed");
      status.className = "status-text ok";
      status.textContent = t("vrReady");
    } catch (error) {
      status.className = "status-text error";
      status.textContent = error.message || String(error);
      throw error;
    } finally {
      button.disabled = false;
      button.textContent = t("generateVr");
    }
  }

  async function start2dExperience() {
    if (!state.experience) return;
    stopIntroVoice();
    stopBackgroundMusic();
    $("pathExperienceImage").src = state.experience.image_url;
    const audio = $("pathExperienceSound");
    audio.pause();
    audio.removeAttribute("src");
    audio.controls = false;
    if (state.experience.sound_url) {
      audio.src = state.experience.sound_url;
      audio.volume = 0.58;
    }
    showScreen("experience");
    // Play before requestFullscreen, not after: awaiting fullscreen first can burn
    // through the click's transient user-activation window, so audio.play() then
    // silently loses autoplay permission and never surfaces to the user.
    if (audio.src) {
      try {
        await audio.play();
      } catch {
        // Autoplay was blocked for some other reason -- surface native controls
        // so the user has a manual way to start playback instead of silence.
        audio.controls = true;
      }
    }
    const screen = $("pathExperienceScreen");
    if (screen.requestFullscreen && !document.fullscreenElement) {
      try { await screen.requestFullscreen(); } catch { /* fixed fullscreen view still applies */ }
    }
  }

  function exit2dExperience() {
    const audio = $("pathExperienceSound");
    audio.pause();
    audio.currentTime = 0;
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    showScreen("confirm");
  }

  // ---------------------------------------------------------------------
  // Settings drawer (shares sessionStorage keys with the main app)
  // ---------------------------------------------------------------------

  function toggleSettings(open) {
    $("pathSettingsDrawer").classList.toggle("hidden", !open);
    $("pathDrawerBackdrop").classList.toggle("hidden", !open);
  }

  function loadSettingsFromStorage() {
    $("pathApiKeyInput").value = sessionStorage.getItem("innerLandscapeApiKey") || "";
    $("pathElevenLabsKeyInput").value = sessionStorage.getItem("innerLandscapeElevenLabsKey") || "";
    $("pathFalKeyInput").value = sessionStorage.getItem("innerLandscapeFalKey") || "";
    $("pathSoundProviderSelect").value = localStorage.getItem("innerLandscapePathSoundProvider") === "falai" ? "falai" : "elevenlabs";
  }

  function persistSettingsToStorage() {
    if ($("pathApiKeyInput").value.trim()) sessionStorage.setItem("innerLandscapeApiKey", $("pathApiKeyInput").value.trim());
    if ($("pathElevenLabsKeyInput").value.trim()) sessionStorage.setItem("innerLandscapeElevenLabsKey", $("pathElevenLabsKeyInput").value.trim());
    if ($("pathFalKeyInput").value.trim()) sessionStorage.setItem("innerLandscapeFalKey", $("pathFalKeyInput").value.trim());
    localStorage.setItem("innerLandscapePathSoundProvider", $("pathSoundProviderSelect").value === "falai" ? "falai" : "elevenlabs");
  }

  // ---------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------

  function bindEvents() {
    $("pathLangZh").addEventListener("click", () => chooseLanguage("zh-CN"));
    $("pathLangEn").addEventListener("click", () => chooseLanguage("en-US"));
    $("pathIntroContinueBtn").addEventListener("click", () => {
      stopIntroVoice(true);
      showScreen("bubbles");
    });
    $("pathResetSelectionsBtn").addEventListener("click", resetSelections);
    $("pathGenerateSummaryBtn").addEventListener("click", goToConfirm);
    $("pathBackToBubblesBtn").addEventListener("click", () => showScreen("bubbles"));
    $("pathSummarizeBtn").addEventListener("click", () => {
      summarizeSelections().catch((error) => showDialog(t("summarizeFailedTitle"), error.message || String(error)));
    });
    $("pathSaveBtn").addEventListener("click", () => {
      saveResult().catch((error) => showDialog(t("saveFailedTitle"), error.message || String(error)));
    });
    $("pathGenerate2dBtn").addEventListener("click", () => {
      generate2dExperience().catch((error) => showDialog(t("experienceFailedTitle"), error.message || String(error)));
    });
    $("pathGenerateVrBtn").addEventListener("click", () => {
      generateVrExperience().catch((error) => showDialog(t("vrFailedTitle"), error.message || String(error)));
    });
    $("pathStartExperienceBtn").addEventListener("click", () => {
      start2dExperience().catch((error) => showDialog(t("experienceFailedTitle"), error.message || String(error)));
    });
    $("pathExitExperienceBtn").addEventListener("click", exit2dExperience);

    $("pathPickerCloseBtn").addEventListener("click", closePicker);
    $("pathPickerBackdrop").addEventListener("click", closePicker);
    $("pathPickerConfirmBtn").addEventListener("click", () => {
      if (picker.categoryKey === "road") {
        confirmRoadSelection();
        return;
      }
      const node = picker.path[picker.path.length - 1];
      confirmPickerSelection(node);
    });
    $("pathPickerCustomConfirmBtn").addEventListener("click", confirmPickerCustomText);

    $("pathMusicToggleBtn").addEventListener("click", () => {
      if (musicState.playing) {
        stopBackgroundMusic();
      } else {
        startBackgroundMusic();
      }
    });
    $("pathSettingsBtn").addEventListener("click", () => toggleSettings(true));
    $("pathCloseSettingsBtn").addEventListener("click", () => {
      persistSettingsToStorage();
      toggleSettings(false);
    });
    $("pathDrawerBackdrop").addEventListener("click", () => {
      persistSettingsToStorage();
      toggleSettings(false);
    });
  }

  function init() {
    bindEvents();
    loadSettingsFromStorage();
    applyLanguage();
    showScreen("language");
  }

  init();
})();
