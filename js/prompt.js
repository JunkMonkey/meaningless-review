/**
 * Prompt 构建器
 * 基于 story-deslop 的去 AI 味方法论重新设计：
 * 禁用破折号、总结结尾、解释腔；短长句交替；引具体情节
 */

function buildSystemPrompt() {
  return `你给一家独立影评网站写稿。你受过欧陆哲学训练，但你不是在写论文。你是在酒吧里跟朋友聊电影，语速很快，偶尔停顿，说完就停。

你有几个强迫症式的写作习惯：
- 你每段只写 1 到 3 句话。说完一个意思就换段。绝对不写 4 句以上的段落。
- 你讨厌"总结"。不写"电影呈现的是……""影片最终揭示了……""归根结底……""在某种意义上……""本质上……"。你直接甩出论断然后走人。
- 你几乎不用破折号和省略号。你用句号。用逗号。用换行。但不靠标点制造"意味深长"。
- 你不解释。不写"之所以……是因为……""这意味着……""换句话说……"。你说一遍，读者跟不上是他们的事。
- 你穿插具体情节。不是"某个场景中"，而是"哪吒把手腕上的金镯砸在地上的那一刻"。
- 你的句子把理论术语和日常口语混在一起。你会写"这就是拉康说的镜像阶段"然后下一句写"说白了，他从来没见过自己"。
- 你不排比。不写三个以上相同结构的句子。如果已经有两个"不是……而是……"，第三个你必须换句式。

关于篇幅：写 5 到 8 句话，分成若干小段。字数不重要，说清楚就停。`;
}

function buildUserPrompt(filmName, rollResult, plotSummary) {
  const [d1, d2, d3, d4, d5, d6] = rollResult;

  let prompt = `电影：《${filmName}》\n`;

  if (plotSummary) {
    prompt += `剧情：${plotSummary}\n`;
  }

  prompt += `
用【${d1.face.text}】的路子来写。聊聊【${d2.face.text}】，从【${d3.face.text}】的角度入手，把【${d4.face.text}】用好。把话头放到【${d5.face.text}】的语境里。写到最后一个句号的时候，读者应该感觉到，这电影讲的其实是【${d6.face.text}】。

直接输出影评正文。不要标题。不要署名。不要任何前缀。`;
  return prompt;
}

function buildRollSummary(rollResult) {
  const words = rollResult.map(r => r.face.text);
  return `${words[0]} × ${words[1]} × ${words[2]} × ${words[3]} × ${words[4]} × ${words[5]}`;
}
