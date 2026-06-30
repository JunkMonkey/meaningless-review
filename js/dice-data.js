/**
 * 骰子词库 — 6 组关键词，每组 6 面
 */
const DICE_DATA = [
  {
    label: '理论视角',
    faces: [
      { text: '弗洛伊德', emoji: '🛋️' },
      { text: '齐泽克',   emoji: '🎪' },
      { text: '拉康',     emoji: '🪞' },
      { text: '福柯',     emoji: '👁️' },
      { text: '德勒兹',   emoji: '🌊' },
      { text: '巴特',     emoji: '✍️' }
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
    label: '分析对象',
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
    label: '高级名词',
    faces: [
      { text: '他者',     emoji: '👤' },
      { text: '凝视',     emoji: '👀' },
      { text: '缺席',     emoji: '🕳️' },
      { text: '能指/所指', emoji: '🏷️' },
      { text: '规训',     emoji: '🏛️' },
      { text: '主体',     emoji: '🧍' }
    ]
  },
  {
    label: '格局打开',
    faces: [
      { text: '现代性',   emoji: '🏗️' },
      { text: '后现代性', emoji: '🎨' },
      { text: '消费社会', emoji: '🛍️' },
      { text: '资本主义', emoji: '💰' },
      { text: '数字时代', emoji: '💻' },
      { text: '景观社会', emoji: '📸' }
    ]
  },
  {
    label: '给出结论',
    faces: [
      { text: '主体性的瓦解',     emoji: '💀' },
      { text: '身份认同危机',     emoji: '🎭' },
      { text: '归属感消失',       emoji: '🏚️' },
      { text: '现实边界模糊',     emoji: '🌫️' },
      { text: '日常经验陌异化',   emoji: '🪟' },
      { text: '意义系统崩塌',     emoji: '⛓️' }
    ]
  }
];

function rollAllDice() {
  return DICE_DATA.map((dice, index) => {
    const face = dice.faces[Math.floor(Math.random() * dice.faces.length)];
    return { diceIndex: index, label: dice.label, face };
  });
}
