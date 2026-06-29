/**
 * 无意义影评生成器 — 主逻辑
 * 纯前端，API Key 仅存储在用户浏览器 localStorage
 */

const STORAGE_KEY = 'meaningless_review_settings';
const HISTORY_KEY = 'meaningless_review_history';

// ── DOM 引用 ──────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);

const dom = {
  filmInput:        $('#film-input'),
  rollBtn:          $('#roll-btn'),
  generateBtn:      $('#generate-btn'),
  diceContainer:    $('#dice-container'),
  rollSummary:      $('#roll-summary'),
  resultArea:       $('#result-area'),
  resultText:       $('#result-text'),
  resultLoading:    $('#result-loading'),
  copyBtn:          $('#copy-btn'),
  regenerateBtn:    $('#regenerate-btn'),
  historyList:      $('#history-list'),
  settingsToggle:   $('#settings-toggle'),
  settingsPanel:    $('#settings-panel'),
  apiKey:           $('#api-key'),
  apiPreset:        $('#api-preset'),
  apiEndpoint:      $('#api-endpoint'),
  apiModel:         $('#api-model'),
  apiModelSelect:   $('#api-model-select'),
  fetchModelsBtn:   $('#fetch-models-btn'),
  saveSettingsBtn:  $('#save-settings-btn'),
  settingsStatus:   $('#settings-status'),
  plotSearchBtn:    $('#plot-search-btn'),
  plotStatus:       $('#plot-status'),
  plotArea:         $('#plot-area'),
  plotSummary:      $('#plot-summary'),
  toast:            $('#toast'),
  diceFaces:        []
};

// ── 状态 ──────────────────────────────────────────────
let currentRoll = null;
let isGenerating = false;
let apiFormat = 'openai';  // 'openai' or 'anthropic'

// ── 预设 API 列表 ─────────────────────────────────────
const API_PRESETS = {
  'https://api.deepseek.com/v1/chat/completions':                   { format: 'openai',    base: 'https://api.deepseek.com/v1' },
  'https://api.openai.com/v1/chat/completions':                     { format: 'openai',    base: 'https://api.openai.com/v1' },
  'https://open.bigmodel.cn/api/paas/v4/chat/completions':          { format: 'openai',    base: 'https://open.bigmodel.cn/api/paas/v4' },
  'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions': { format: 'openai', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  'https://api.moonshot.cn/v1/chat/completions':                    { format: 'openai',    base: 'https://api.moonshot.cn/v1' },
  'https://api.siliconflow.cn/v1/chat/completions':                 { format: 'openai',    base: 'https://api.siliconflow.cn/v1' },
  'https://api.anthropic.com/v1/messages':                          { format: 'anthropic', base: 'https://api.anthropic.com/v1' },
};

/**
 * Get the base URL for models endpoint from the chat endpoint
 */
function getModelsEndpoint(endpoint, format) {
  if (format === 'anthropic') {
    return 'https://api.anthropic.com/v1/models';
  }
  // OpenAI-compatible: find base from presets or derive from endpoint
  const preset = API_PRESETS[endpoint];
  if (preset) return preset.base + '/models';
  // Custom endpoint: replace /chat/completions with /models
  return endpoint.replace(/\/chat\/completions\/?$/, '/models');
}

/**
 * Detect API format from endpoint URL
 */
function detectFormat(endpoint) {
  if (endpoint.includes('anthropic')) return 'anthropic';
  // Check against known presets
  const preset = API_PRESETS[endpoint];
  if (preset) return preset.format;
  return 'openai'; // default
}

// ── 初始化 ────────────────────────────────────────────
function init() {
  loadSettings();
  renderHistory();
  renderDice();
  bindEvents();
}

// ── 配置读写 ──────────────────────────────────────────
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      dom.apiKey.value = saved.apiKey || '';
      apiFormat = saved.apiFormat || 'openai';
      dom.apiEndpoint.value = saved.apiEndpoint || 'https://api.deepseek.com/v1/chat/completions';
      dom.apiModel.value = saved.apiModel || 'deepseek-chat';
    }
  } catch (_) { /* ignore */ }
}

function saveSettings() {
  const endpoint = getCurrentEndpoint();
  const settings = {
    apiKey: dom.apiKey.value.trim(),
    apiEndpoint: endpoint,
    apiModel: dom.apiModel.value.trim() || 'deepseek-chat',
    apiFormat: apiFormat
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function getCurrentEndpoint() {
  return dom.apiEndpoint.value.trim();
}

// ── API 预设切换 ──────────────────────────────────────
function applyPreset() {
  const val = dom.apiPreset.value;
  if (!val) return; // placeholder option
  dom.apiEndpoint.value = val;
  const preset = API_PRESETS[val];
  if (preset) {
    apiFormat = preset.format;
  } else {
    apiFormat = detectFormat(val);
  }
}

function onEndpointChange() {
  apiFormat = detectFormat(dom.apiEndpoint.value.trim());
}

// ── 获取模型列表 ──────────────────────────────────────
async function fetchModels() {
  const apiKey = dom.apiKey.value.trim();
  if (!apiKey) {
    showToast('请先填写 API Key', 'warn');
    return;
  }

  const endpoint = getCurrentEndpoint();
  if (!endpoint) {
    showToast('请先选择或填写 API 地址', 'warn');
    return;
  }

  const modelsUrl = getModelsEndpoint(endpoint, apiFormat);
  dom.fetchModelsBtn.disabled = true;
  dom.fetchModelsBtn.textContent = '⏳ 获取中…';
  dom.apiModelSelect.classList.add('hidden');

  try {
    let resp, data;

    if (apiFormat === 'anthropic') {
      resp = await fetch(modelsUrl, {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      });
    } else {
      // OpenAI-compatible
      resp = await fetch(modelsUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
    }

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      let msg = `获取失败 (${resp.status})`;
      try {
        const j = JSON.parse(errText);
        msg = j.error?.message || msg;
      } catch (_) {}
      throw new Error(msg);
    }

    data = await resp.json();

    // Extract model IDs
    let models = [];
    if (apiFormat === 'anthropic') {
      // Anthropic: { data: [{ id: "claude-sonnet-4-20250514", ... }, ...] }
      models = (data.data || []).map(m => m.id);
    } else {
      // OpenAI-compatible: { data: [{ id: "gpt-4o", ... }, ...] } or { object: "list", data: [...] }
      models = (data.data || []).map(m => m.id);
    }

    if (models.length === 0) {
      throw new Error('未找到可用模型');
    }

    // Populate select
    dom.apiModelSelect.innerHTML = models.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
    dom.apiModelSelect.classList.remove('hidden');

    // Auto-select and sync
    dom.apiModelSelect.addEventListener('change', () => {
      dom.apiModel.value = dom.apiModelSelect.value;
    });

    // If current model is in the list, select it
    const currentModel = dom.apiModel.value.trim();
    if (currentModel && models.includes(currentModel)) {
      dom.apiModelSelect.value = currentModel;
    } else if (models.length > 0) {
      dom.apiModelSelect.value = models[0];
      dom.apiModel.value = models[0];
    }

    showToast(`找到 ${models.length} 个模型 ✓`);

  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    dom.fetchModelsBtn.disabled = false;
    dom.fetchModelsBtn.textContent = '📡 获取模型';
  }
}

// ── 搜索电影剧情（Wikipedia API）──────────────────────
async function searchPlot() {
  const filmName = dom.filmInput.value.trim();
  if (!filmName) {
    showToast('请先输入电影名称', 'warn');
    dom.filmInput.focus();
    return;
  }

  dom.plotSearchBtn.disabled = true;
  dom.plotSearchBtn.textContent = '⏳ 搜索中…';
  dom.plotStatus.textContent = '';
  dom.plotArea.classList.add('hidden');

  try {
    // Search Wikipedia for the film (with 10s timeout)
    const searchTerm = filmName + ' 电影';
    const searchUrl = `https://zh.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&origin=*`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const searchResp = await fetch(searchUrl, { signal: ctrl.signal });
    const searchData = await searchResp.json();
    const pages = searchData.query?.search || [];

    if (pages.length === 0) {
      // Try English Wikipedia
      const enSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(filmName + ' film')}&format=json&origin=*`;
      const enResp = await fetch(enSearchUrl);
      const enData = await enResp.json();
      const enPages = enData.query?.search || [];

      if (enPages.length === 0) {
        // Fallback: try searching without "film" suffix
        const bareUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(filmName)}&format=json&origin=*`;
        const bareResp = await fetch(bareUrl);
        const bareData = await bareResp.json();
        const barePages = bareData.query?.search || [];

        if (barePages.length === 0) {
          dom.plotStatus.innerHTML = '⚠️ 未找到剧情，AI 将凭自身知识写作';
          showToast('未找到剧情摘要', 'warn');
          return;
        }

        // Continue with bare search results
        await fetchExtract(barePages[0].title, 'en');
        return;
      }

      await fetchExtract(enPages[0].title, 'en');
      return;
    }

    await fetchExtract(pages[0].title, 'zh');

  } catch (err) {
    dom.plotStatus.textContent = '⚠️ 搜索失败，请手动填写或跳过';
    showToast('搜索失败: ' + err.message, 'error');
  } finally {
    dom.plotSearchBtn.disabled = false;
    dom.plotSearchBtn.textContent = '🔍 搜索剧情';
  }
}

async function fetchExtract(title, lang) {
  const apiBase = lang === 'zh'
    ? 'https://zh.wikipedia.org/w/api.php'
    : 'https://en.wikipedia.org/w/api.php';

  const url = `${apiBase}?action=query&titles=${encodeURIComponent(title)}&prop=extracts&exintro=1&explaintext=1&format=json&origin=*`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  const resp = await fetch(url, { signal: ctrl.signal });
  clearTimeout(timer);
  const data = await resp.json();
  const pages = data.query?.pages || {};
  const page = Object.values(pages)[0];

  if (!page || !page.extract) {
    dom.plotStatus.textContent = '⚠️ 获取摘要失败';
    return;
  }

  // Clean up the extract - remove reference markers and truncate
  let extract = page.extract
    .replace(/\[\d+\]/g, '')     // Remove [1], [2] etc.
    .replace(/\([^)]*\b听\b[^)]*\)/g, '') // Remove "（点击阅读）" style links
    .trim();

  // Truncate to ~500 chars for a good summary
  if (extract.length > 500) {
    extract = extract.slice(0, 500).replace(/\.[^。]*$/, '。');
  }

  dom.plotSummary.value = extract;
  dom.plotArea.classList.remove('hidden');
  const flag = lang === 'zh' ? '🇨🇳' : '🇬🇧';
  dom.plotStatus.textContent = `${flag} 已获取 Wikipedia 摘要（可手动修改）`;
  showToast('剧情摘要获取成功 ✓');
}

// ── 历史记录 ──────────────────────────────────────────
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch (_) { return []; }
}

function saveHistory(entry) {
  const history = loadHistory();
  history.unshift(entry);
  if (history.length > 50) history.length = 50;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function renderHistory() {
  const history = loadHistory();
  if (history.length === 0) {
    dom.historyList.innerHTML = '<div class="history-empty">还没有生成过影评</div>';
    return;
  }
  dom.historyList.innerHTML = history.map((h, i) => `
    <div class="history-item" data-index="${i}">
      <div class="history-header">
        <span class="history-film">🎬 ${escapeHtml(h.filmName)}</span>
        <span class="history-time">${h.time}</span>
      </div>
      <div class="history-words">${escapeHtml(h.rollSummary)}</div>
      <div class="history-preview">${escapeHtml(h.text.slice(0, 80))}…</div>
    </div>
  `).join('');

  dom.historyList.querySelectorAll('.history-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.index);
      const h = loadHistory()[idx];
      if (h) {
        dom.resultText.textContent = h.text;
        dom.resultArea.classList.remove('hidden');
        dom.rollSummary.textContent = h.rollSummary;
      }
    });
  });
}

// ── 骰子渲染 ──────────────────────────────────────────
function renderDice() {
  dom.diceContainer.innerHTML = DICE_DATA.map((dice, i) => `
    <div class="dice-wrapper">
      <div class="dice-label">${dice.label}</div>
      <div class="dice-cube" id="dice-${i}">
        <div class="dice-face front" data-dice="${i}" data-face="0"></div>
      </div>
      <div class="dice-current" id="dice-current-${i}">—</div>
    </div>
  `).join('');

  dom.diceFaces = DICE_DATA.map((_, i) => ({
    current: $(`#dice-current-${i}`),
    cube: $(`#dice-${i}`),
    face: $(`#dice-${i} .dice-face`)
  }));
}

function renderDiceResult(rollResult) {
  rollResult.forEach((r, i) => {
    const df = dom.diceFaces[i];
    df.face.textContent = r.face.emoji;
    df.current.innerHTML = `<span class="dice-word">${r.face.text}</span>`;
    df.cube.classList.add('dice-rolled');
    setTimeout(() => df.cube.classList.remove('dice-rolled'), 400);
  });
}

// ── 掷骰子 ────────────────────────────────────────────
function rollDice() {
  currentRoll = rollAllDice();
  renderDiceResult(currentRoll);
  const summary = buildRollSummary(currentRoll);
  dom.rollSummary.textContent = summary;
  dom.rollSummary.classList.add('pop');
  dom.resultArea.classList.add('hidden');
  dom.resultText.textContent = '';
  setTimeout(() => dom.rollSummary.classList.remove('pop'), 400);
}

// ── API 调用 ──────────────────────────────────────────
async function callLLM(systemPrompt, userPrompt) {
  const apiKey = dom.apiKey.value.trim();
  const endpoint = getCurrentEndpoint();
  const model = dom.apiModel.value.trim();

  if (!apiKey) throw new Error('请先配置 API Key');
  if (!endpoint) throw new Error('请先配置 API 地址');
  if (!model) throw new Error('请先填写模型名称');

  if (apiFormat === 'anthropic') {
    return callAnthropic(apiKey, endpoint, model, systemPrompt, userPrompt);
  } else {
    return callOpenAI(apiKey, endpoint, model, systemPrompt, userPrompt);
  }
}

async function callOpenAI(apiKey, endpoint, model, systemPrompt, userPrompt) {
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.9,
      max_tokens: 600
    })
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    let msg = `API 错误 (${resp.status})`;
    try { const j = JSON.parse(errBody); msg = j.error?.message || msg; } catch (_) {}
    throw new Error(msg);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('API 返回内容为空');
  return content.trim();
}

async function callAnthropic(apiKey, endpoint, model, systemPrompt, userPrompt) {
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 600,
      temperature: 0.9
    })
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    let msg = `Claude API 错误 (${resp.status})`;
    try { const j = JSON.parse(errBody); msg = j.error?.message || msg; } catch (_) {}
    throw new Error(msg);
  }

  const data = await resp.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('Claude 返回内容为空');
  return text.trim();
}

// ── 生成影评 ──────────────────────────────────────────
async function generateReview() {
  if (isGenerating) return;

  const filmName = dom.filmInput.value.trim();
  if (!filmName) {
    showToast('请输入电影名称', 'warn');
    dom.filmInput.focus();
    return;
  }

  if (!currentRoll) {
    rollDice();
  }

  const apiKey = dom.apiKey.value.trim();
  if (!apiKey) {
    showToast('请先配置 API Key（点击右上角设置）', 'warn');
    dom.settingsPanel.classList.remove('hidden');
    return;
  }

  isGenerating = true;
  dom.generateBtn.disabled = true;
  dom.generateBtn.textContent = '⏳ 生成中...';
  dom.resultArea.classList.remove('hidden');
  dom.resultLoading.classList.remove('hidden');
  dom.resultText.textContent = '';

  try {
    const plotSummary = dom.plotSummary.value.trim();
    const text = await callLLM(
      buildSystemPrompt(),
      buildUserPrompt(filmName, currentRoll, plotSummary)
    );

    dom.resultLoading.classList.add('hidden');
    dom.resultText.textContent = text;

    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    saveHistory({
      filmName,
      rollSummary: buildRollSummary(currentRoll),
      rollResult: currentRoll.map(r => ({ label: r.label, text: r.face.text, emoji: r.face.emoji })),
      text,
      time: timeStr
    });
    renderHistory();
    showToast('影评生成完成 ✨');
  } catch (err) {
    dom.resultLoading.classList.add('hidden');
    dom.resultText.textContent = `❌ 生成失败：${err.message}`;
    showToast(`生成失败：${err.message}`, 'error');
  } finally {
    isGenerating = false;
    dom.generateBtn.disabled = false;
    dom.generateBtn.textContent = '🎬 生成影评';
  }
}

// ── 事件绑定 ──────────────────────────────────────────
function bindEvents() {
  dom.rollBtn.addEventListener('click', rollDice);
  dom.generateBtn.addEventListener('click', generateReview);

  dom.filmInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generateReview();
    }
  });

  dom.regenerateBtn.addEventListener('click', generateReview);

  dom.copyBtn.addEventListener('click', () => {
    const text = dom.resultText.textContent;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast('已复制到剪贴板 📋');
    }).catch(() => showToast('复制失败，请手动选中复制'));
  });

  // 设置面板
  dom.settingsToggle.addEventListener('click', () => {
    dom.settingsPanel.classList.toggle('hidden');
  });

  dom.apiPreset.addEventListener('change', applyPreset);

  dom.apiEndpoint.addEventListener('input', onEndpointChange);

  dom.saveSettingsBtn.addEventListener('click', () => {
    saveSettings();
    dom.settingsStatus.textContent = '✓ 已保存';
    dom.settingsStatus.classList.add('visible');
    setTimeout(() => {
      dom.settingsStatus.classList.remove('visible');
      dom.settingsPanel.classList.add('hidden');
    }, 1200);
  });

  // 获取模型
  dom.fetchModelsBtn.addEventListener('click', fetchModels);

  // 搜索剧情
  dom.plotSearchBtn.addEventListener('click', searchPlot);

  // 关闭设置面板
  document.addEventListener('click', (e) => {
    if (!dom.settingsPanel.classList.contains('hidden') &&
        !dom.settingsPanel.contains(e.target) &&
        e.target !== dom.settingsToggle) {
      dom.settingsPanel.classList.add('hidden');
    }
  });
}

// ── 辅助函数 ──────────────────────────────────────────
function showToast(msg, type = '') {
  dom.toast.textContent = msg;
  dom.toast.className = 'toast ' + type;
  dom.toast.classList.add('visible');
  clearTimeout(dom.toast._timeout);
  dom.toast._timeout = setTimeout(() => {
    dom.toast.classList.remove('visible');
  }, 2500);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── 启动 ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
