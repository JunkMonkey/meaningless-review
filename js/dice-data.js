/**
 * 骰子词库 — 6 组关键词，每组 6 面
 * 玩法框架参考公开的"骰子影评"创意，词条做了约 30% 替换以避免雷同
 */
const DICE_DATA = [
  {
    label: '理论视角',
    faces: [
      { text: '弗洛伊德', emoji: '🛋️' },
      { text: '齐泽克',   emoji: '🤡' },
      { text: '拉康',     emoji: '🪞' },
      { text: '福柯',     emoji: '👁️' },
      { text: '德勒兹',   emoji: '🌊' },
      { text: '鲍德里亚', emoji: '📺' }
    ]
  },
  {
    label: '核心议题',
    faces: [
      { text: '欲望', emoji: '🔥' },
      { text: '创伤', emoji: '💔' },
      { text: '记忆', emoji: '🎞️' },
      { text: '身份', emoji: '🎭' },
      { text: '权力', emoji: '⚡' },
      { text: '异化', emoji: '🏭' }
    ]
  },
  {
    label: '分析入口',
    faces: [
      { text: '身体', emoji: '🧬' },
      { text: '家庭', emoji: '🏠' },
      { text: '空间', emoji: '🗺️' },
      { text: '时间', emoji: '⏳' },
      { text: '消费', emoji: '🛒' },
      { text: '语言', emoji: '💬' }
    ]
  },
  {
    label: '理论概念',
    faces: [
      { text: '他者',   emoji: '👤' },
      { text: '凝视',   emoji: '👀' },
      { text: '缺席',   emoji: '🕳️' },
      { text: '拟像',   emoji: '🪞' },
      { text: '规训',   emoji: '🏛️' },
      { text: '症状',   emoji: '🤒' }
    ]
  },
  {
    label: '时代语境',
    faces: [
      { text: '现代性',       emoji: '🏗️' },
      { text: '后现代状况',   emoji: '🎨' },
      { text: '消费社会',     emoji: '🛍️' },
      { text: '晚期资本主义', emoji: '💰' },
      { text: '数字时代',     emoji: '💻' },
      { text: '超真实',       emoji: '🖼️' }
    ]
  },
  {
    label: '终极结论',
    faces: [
      { text: '主体性的瓦解',       emoji: '💀' },
      { text: '身份认同的危机',     emoji: '🎭' },
      { text: '归属感的丧失',       emoji: '🏚️' },
      { text: '真实与虚构的混淆',   emoji: '🌫️' },
      { text: '日常经验的瓦解',     emoji: '🪟' },
      { text: '意义链条的断裂',     emoji: '⛓️' }
    ]
  }
];

function rollAllDice() {
  return DICE_DATA.map((dice, index) => {
    const face = dice.faces[Math.floor(Math.random() * dice.faces.length)];
    return { diceIndex: index, label: dice.label, face };
  });
}
