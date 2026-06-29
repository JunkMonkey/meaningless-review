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

function getModelsEndpoint(endpoint, format) {
  if (format === 'anthropic') return 'https://api.anthropic.com/v1/models';
  const preset = API_PRESETS[endpoint];
  if (preset) return preset.base + '/models';
  return endpoint.replace(/\/chat\/completions\/?$/, '/models');
}

function detectFormat(endpoint) {
  if (endpoint.includes('anthropic')) return 'anthropic';
  const preset = API_PRESETS[endpoint];
  if (preset) return preset.format;
  return 'openai';
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
  const settings = {
    apiKey: dom.apiKey.value.trim(),
    apiEndpoint: getCurrentEndpoint(),
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
  if (!val) return;
  dom.apiEndpoint.value = val;
  const preset = API_PRESETS[val];
  if (preset) { apiFormat = preset.format; }
  else { apiFormat = detectFormat(val); }
}

function onEndpointChange() {
  apiFormat = detectFormat(dom.apiEndpoint.value.trim());
}

// ── 获取模型列表 ──────────────────────────────────────
async function fetchModels() {
  const apiKey = dom.apiKey.value.trim();
  if (!apiKey) { showToast('请先填写 API Key', 'warn'); return; }
  const endpoint = getCurrentEndpoint();
  if (!endpoint) { showToast('请先选择或填写 API 地址', 'warn'); return; }

  const modelsUrl = getModelsEndpoint(endpoint, apiFormat);
  dom.fetchModelsBtn.disabled = true;
  dom.fetchModelsBtn.textContent = '⏳ 获取中…';
  dom.apiModelSelect.classList.add('hidden');

  try {
    let resp, data;
    if (apiFormat === 'anthropic') {
      resp = await fetch(modelsUrl, {
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
      });
    } else {
      resp = await fetch(modelsUrl, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
    }

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      let msg = `获取失败 (${resp.status})`;
      try { const j = JSON.parse(errText); msg = j.error?.message || msg; } catch (_) {}
      throw new Error(msg);
    }

    data = await resp.json();
    const models = (data.data || []).map(m => m.id);
    if (models.length === 0) throw new Error('未找到可用模型');

    dom.apiModelSelect.innerHTML = models.map(m =>
      `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
    dom.apiModelSelect.classList.remove('hidden');

    dom.apiModelSelect.addEventListener('change', () => {
      dom.apiModel.value = dom.apiModelSelect.value;
    });

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

// ── 历史记录 ──────────────────────────────────────────
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch (_) { return []; }
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
async function callLLM(systemPrompt, userPrompt, maxTokens = 600) {
  const apiKey = dom.apiKey.value.trim();
  const endpoint = getCurrentEndpoint();
  const model = dom.apiModel.value.trim();

  if (!apiKey) throw new Error('请先配置 API Key');
  if (!endpoint) throw new Error('请先配置 API 地址');
  if (!model) throw new Error('请先填写模型名称');

  if (apiFormat === 'anthropic') {
    return callAnthropic(apiKey, endpoint, model, systemPrompt, userPrompt, maxTokens);
  } else {
    return callOpenAI(apiKey, endpoint, model, systemPrompt, userPrompt, maxTokens);
  }
}

async function callOpenAI(apiKey, endpoint, model, systemPrompt, userPrompt, maxTokens) {
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.9,
      max_tokens: maxTokens
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

async function callAnthropic(apiKey, endpoint, model, systemPrompt, userPrompt, maxTokens) {
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: maxTokens,
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

// ── 剧情回忆（用 LLM 自身知识当搜索引擎）──────────────
async function recallPlot(filmName) {
  try {
    const result = await callLLM(
      '你是一个电影数据库。只输出2-4句话的剧情概括，不要任何评论和分析。如果完全没听说过这部电影，只输出一个词：未知。',
      `电影《${filmName}》讲的是什么故事？`,
      150
    );
    const trimmed = result.trim();
    if (trimmed === '未知' || trimmed.includes('没听说过') || trimmed.includes('不太清楚') || trimmed.includes('不了解')) {
      return '';
    }
    return trimmed;
  } catch (_) {
    return '';
  }
}

// ── 生成影评（两步：先回忆剧情，再写影评）─────────────
async function generateReview() {
  if (isGenerating) return;

  const filmName = dom.filmInput.value.trim();
  if (!filmName) {
    showToast('请输入电影名称', 'warn');
    dom.filmInput.focus();
    return;
  }

  if (!currentRoll) { rollDice(); }

  const apiKey = dom.apiKey.value.trim();
  if (!apiKey) {
    showToast('请先配置 API Key（点击右上角设置）', 'warn');
    dom.settingsPanel.classList.remove('hidden');
    return;
  }

  isGenerating = true;
  dom.generateBtn.disabled = true;
  dom.resultArea.classList.remove('hidden');
  dom.resultText.textContent = '';

  // Step 1: 回忆剧情
  dom.resultLoading.classList.remove('hidden');
  dom.resultLoading.querySelector('span').textContent = '正在回忆电影剧情…';
  dom.generateBtn.textContent = '⏳ 回忆剧情…';

  const plotSummary = await recallPlot(filmName);

  // Step 2: 生成影评
  dom.resultLoading.querySelector('span').textContent = '正在撰写学术黑话…';
  dom.generateBtn.textContent = '⏳ 撰写中…';

  try {
    const text = await callLLM(
      buildSystemPrompt(),
      buildUserPrompt(filmName, currentRoll, plotSummary),
      800
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

  dom.fetchModelsBtn.addEventListener('click', fetchModels);

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
  dom.toast._timeout = setTimeout(() => dom.toast.classList.remove('visible'), 2500);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── 启动 ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
