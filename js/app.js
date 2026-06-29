/**
 * 无意义影评生成器 — 主逻辑
 * 纯前端，API Key 仅存储在用户浏览器 localStorage
 */

const STORAGE_KEY = 'meaningless_review_settings';
const HISTORY_KEY = 'meaningless_review_history';

// ── DOM 引用 ──────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

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
  apiEndpoint:      $('#api-endpoint'),
  apiModel:         $('#api-model'),
  saveSettingsBtn:  $('#save-settings-btn'),
  settingsStatus:   $('#settings-status'),
  toast:            $('#toast'),

  // 单个骰子面的 DOM 会动态创建
  diceFaces: []  // 由 renderDice 填充
};

// ── 状态 ──────────────────────────────────────────────
let currentRoll = null;        // 当前掷骰结果
let isGenerating = false;

// ── 初始化 ────────────────────────────────────────────
function init() {
  loadSettings();
  loadHistory();
  renderDice();
  bindEvents();
}

// ── 配置读写 ──────────────────────────────────────────
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      dom.apiKey.value = saved.apiKey || '';
      dom.apiEndpoint.value = saved.apiEndpoint || 'https://api.deepseek.com/v1/chat/completions';
      dom.apiModel.value = saved.apiModel || 'deepseek-chat';
    }
  } catch (_) { /* ignore */ }
}

function saveSettings() {
  const settings = {
    apiKey: dom.apiKey.value.trim(),
    apiEndpoint: dom.apiEndpoint.value.trim() || 'https://api.deepseek.com/v1/chat/completions',
    apiModel: dom.apiModel.value.trim() || 'deepseek-chat'
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
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
  // 最多保留 50 条
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

  // 点击历史记录回看
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

    // 触发一个小动画：骰子闪一下
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

  // 隐藏上次的结果
  dom.resultArea.classList.add('hidden');
  dom.resultText.textContent = '';

  setTimeout(() => dom.rollSummary.classList.remove('pop'), 400);
}

// ── API 调用 ──────────────────────────────────────────
async function callLLM(messages) {
  const apiKey = dom.apiKey.value.trim();
  const endpoint = dom.apiEndpoint.value.trim();
  const model = dom.apiModel.value.trim();

  if (!apiKey) throw new Error('请先配置 API Key');
  if (!endpoint) throw new Error('请先配置 API 地址');

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.9,
      max_tokens: 600
    })
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    let msg = `API 错误 (${resp.status})`;
    try {
      const j = JSON.parse(errBody);
      msg = j.error?.message || msg;
    } catch (_) { /* use default */ }
    throw new Error(msg);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('API 返回内容为空');
  return content.trim();
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
    // 还没掷骰子，先掷
    rollDice();
  }

  const apiKey = dom.apiKey.value.trim();
  if (!apiKey) {
    showToast('请先配置 API Key（点击右上角设置）', 'warn');
    dom.settingsToggle.click();
    return;
  }

  isGenerating = true;
  dom.generateBtn.disabled = true;
  dom.generateBtn.textContent = '⏳ 生成中...';
  dom.resultArea.classList.remove('hidden');
  dom.resultLoading.classList.remove('hidden');
  dom.resultText.textContent = '';

  try {
    const messages = [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(filmName, currentRoll) }
    ];

    const text = await callLLM(messages);

    dom.resultLoading.classList.add('hidden');
    dom.resultText.textContent = text;

    // 保存到历史
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
  // 掷骰子
  dom.rollBtn.addEventListener('click', rollDice);

  // 生成影评
  dom.generateBtn.addEventListener('click', generateReview);

  // Enter 键生成
  dom.filmInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generateReview();
    }
  });

  // 重新生成（用当前掷骰结果再调一次 API）
  dom.regenerateBtn.addEventListener('click', generateReview);

  // 复制
  dom.copyBtn.addEventListener('click', () => {
    const text = dom.resultText.textContent;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast('已复制到剪贴板 📋');
    }).catch(() => {
      showToast('复制失败，请手动选中复制');
    });
  });

  // 设置面板
  dom.settingsToggle.addEventListener('click', () => {
    dom.settingsPanel.classList.toggle('hidden');
  });

  dom.saveSettingsBtn.addEventListener('click', () => {
    saveSettings();
    dom.settingsStatus.textContent = '✓ 已保存';
    dom.settingsStatus.classList.add('visible');
    setTimeout(() => {
      dom.settingsStatus.classList.remove('visible');
      dom.settingsPanel.classList.add('hidden');
    }, 1200);
  });

  // 点击其他地方关闭设置面板
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
