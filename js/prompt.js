/**
 * Prompt 构建器
 * 输出要求：一整段，不换行，紧扣剧情
 */

function buildSystemPrompt() {
  return `你写影评。你用欧陆哲学的概念来读电影，但你写出来的东西是一个人在说话，不是机器在造句。

你的规矩：
- 一整段话，不换行不分段。就是一段。
- 不总结不升华。不写"这部电影呈现的是""归根结底""本质上""说到底"。
- 不用破折号不用省略号。用句号和逗号。
- 不解释术语。假定读者知道拉康的镜像阶段、福柯的规训、鲍德里亚的拟像是什么。
- 理论术语和日常口语混在一起。上一句"这是拉康意义上的镜像认同"，下一句可以"说白了，他从来没被当成一个人看过"。
- 句式要有变化。短句和长句交替。不用排比。
- 说到哪算哪，最后一句话不能是总结。
- 不要写"从某种意义上""换言之""这意味着""之所以""恰恰是"。`;
}

function buildUserPrompt(filmName, rollResult, plotSummary) {
  const [d1, d2, d3, d4, d5, d6] = rollResult;

  let prompt = `写《${filmName}》的影评。`;

  if (plotSummary) {
    prompt += `\n\n你先记住这部电影讲了什么：${plotSummary}`;
    prompt += `\n\n你的影评里至少要提到一个上面的具体情节。不要空谈概念。`;
  }

  prompt += `
\n\n用【${d1.face.text}】的视角。聊【${d2.face.text}】，从【${d3.face.text}】切入，把【${d4.face.text}】作为核心概念，放在【${d5.face.text}】的语境里。最终指向【${d6.face.text}】。

一整段话。不要分段不要换行。不要标题不要署名。`;

  return prompt;
}

function buildRollSummary(rollResult) {
  const words = rollResult.map(r => r.face.text);
  return `${words[0]} × ${words[1]} × ${words[2]} × ${words[3]} × ${words[4]} × ${words[5]}`;
}
