/**
 * 骰子词库 — 6 组关键词，每组 6 面
 * 词条全部重新设计，与公众号原文无重叠
 */
const DICE_DATA = [
  // 骰子 1：理论大师 — 哲学家名字无版权问题，保留但微调
  {
    label: '理论视角',
    faces: [
      { text: '弗洛伊德', emoji: '🛋️' },
      { text: '齐泽克',   emoji: '🎪' },
      { text: '拉康',     emoji: '🪞' },
      { text: '福柯',     emoji: '👁️' },
      { text: '德勒兹',   emoji: '🌊' },
      { text: '鲍德里亚', emoji: '📺' }
    ]
  },
  // 骰子 2：核心议题 — 全部替换
  {
    label: '核心议题',
    faces: [
      { text: '焦虑', emoji: '😰' },
      { text: '享乐', emoji: '🍷' },
      { text: '幻象', emoji: '🫧' },
      { text: '对抗', emoji: '⚔️' },
      { text: '轮回', emoji: '🔁' },
      { text: '承认', emoji: '🤝' }
    ]
  },
  // 骰子 3：分析入口 — 全部替换
  {
    label: '分析入口',
    faces: [
      { text: '媒介', emoji: '📡' },
      { text: '仪式', emoji: '🎪' },
      { text: '边界', emoji: '🚧' },
      { text: '声音', emoji: '🎤' },
      { text: '交换', emoji: '💱' },
      { text: '禁忌', emoji: '🚫' }
    ]
  },
  // 骰子 4：理论概念 — 全部替换
  {
    label: '理论概念',
    faces: [
      { text: '延异', emoji: '🔀' },
      { text: '褶子', emoji: '📐' },
      { text: '征兆', emoji: '🩺' },
      { text: '升华', emoji: '🕊️' },
      { text: '镜像', emoji: '🪞' },
      { text: '淫秽', emoji: '🫣' }
    ]
  },
  // 骰子 5：时代语境 — 全部替换
  {
    label: '时代语境',
    faces: [
      { text: '加速主义',     emoji: '⏩' },
      { text: '平台资本主义', emoji: '🖥️' },
      { text: '监控社会',     emoji: '📹' },
      { text: '液态现代性',   emoji: '💧' },
      { text: '人类世',       emoji: '🌍' },
      { text: '算法治理',     emoji: '🤖' }
    ]
  },
  // 骰子 6：终极结论 — 全部替换
  {
    label: '终极结论',
    faces: [
      { text: '欲望的无限延宕',   emoji: '🔁' },
      { text: '主体是一个空位',   emoji: '🕳️' },
      { text: '真实界总在刺入',   emoji: '💥' },
      { text: '大他者并不存在',   emoji: '🃏' },
      { text: '剩余快感的循环',   emoji: '🌀' },
      { text: '能指链条的滑脱',   emoji: '⛓️' }
    ]
  }
];

function rollAllDice() {
  return DICE_DATA.map((dice, index) => {
    const face = dice.faces[Math.floor(Math.random() * dice.faces.length)];
    return { diceIndex: index, label: dice.label, face };
  });
}
