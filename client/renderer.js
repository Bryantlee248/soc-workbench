const API = 'http://125.77.25.229:3001'; // 服务器地址（浏览器演示同源时也可用相对 ''）
const rows = document.getElementById('rows');
const msg = document.getElementById('msg');

async function act(id, kind, value) {
  const path = kind === 'triage' ? 'triage' : 'disposition';
  const body = kind === 'triage' ? { verdict: value } : { disposition: value };
  const res = await fetch(`${API}/alerts/${id}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  msg.textContent = res.status === 200 ? '已更新' : '失败：' + (await res.text());
  await refresh();
}

async function refresh() {
  const res = await fetch(`${API}/alerts`);
  const alerts = await res.json();
  rows.innerHTML = alerts.map((a) => `<tr>
    <td>${a.title}</td><td>${a.severity}</td><td>${a.status}</td><td>${a.verdict}</td><td>${a.disposition}</td>
    <td>
      <button class="btn" onclick="act('${a.id}','triage','confirmed')">确认</button>
      <button class="btn" onclick="act('${a.id}','triage','false_positive')">误报</button>
      <button class="btn" onclick="act('${a.id}','disposition','resolved')">已处置</button>
      <button class="btn" onclick="act('${a.id}','disposition','ignored')">忽略</button>
    </td></tr>`).join('');
}
document.getElementById('refresh').onclick = refresh;
refresh();
