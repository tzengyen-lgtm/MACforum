/* =========================================================================
   設定區：之後只要改這裡
   ========================================================================= */
const CONFIG = {
  // Google 試算表「發佈到網路」的 CSV 連結（時間 / 議程 / 主講 / 確認方）
  csvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRaUblBMIGANJGFJdTXMCIhW9kvSE8nqNkNxWrnypZMzvryc7sme9KYhwnVC7ZfyasaT9gsCLVlt_68/pub?output=csv",
};

// 會議基本資訊（這部分不常改，直接放這裡；要改就改這裡的文字）
const MEETING = {
  title: "近期國際與兩岸情勢發展對 2026 年底臺灣地方選舉之影響",
  subtitle: "2026/8/7 陸委會座談會",
  date: "2026 年 8 月 7 日（星期五）",
  time: "15:00–17:00",
  venue: "國立中山大學社會科學院",
  host: "國立中山大學政治學研究所",
  cohost: "東海大學中國大陸暨區域發展研究中心",
  dinner: "17:30 起，福園台菜海鮮餐廳（高雄市前金區成功一路266號9F）",
  contact: "國立中山大學全球民主韌性計畫 執行秘書 賴以展｜yc27350173@mail.nsysu.edu.tw｜07-525-2000 分機 5622",
};

// 內建預設議程：當試算表還沒有資料或讀取失敗時，用這份墊著
// 欄位順序：時間, 議程, 主講／負責人, 確認方
const DEFAULT_AGENDA = [
  ["15:00–15:05", "主持人開場", "陳宗巖／國立中山大學政治學研究所教授兼所長", "中山確認"],
  ["15:05–15:15", "貴賓致詞", "邱垂正／大陸委員會主任委員", "中山確認"],
  ["15:15–15:27", "與談一", "張峻豪／東海大學政治學系教授兼系主任", "東海確認"],
  ["15:27–15:39", "與談二", "蔡榮祥／國立中正大學政治學系教授", "中山確認"],
  ["15:39–15:51", "與談三", "林子立／東海大學政治學系教授", "東海確認"],
  ["15:51–16:03", "與談四", "南部學者／待定，國立中山大學負責邀請", "中山確認"],
  ["16:03–16:15", "與談五", "高雄市在地人士／待定，東海大學負責邀請", "東海確認"],
  ["16:15–16:27", "與談六", "高雄市在地人士／待定，國立中山大學負責邀請", "中山確認"],
  ["16:27–16:47", "綜合座談與現場問答", "主持人及全體與談人", "中山／東海確認"],
  ["16:47–17:00", "主持人總結與閉幕", "邱垂正、陳宗巖", "中山確認"],
  ["17:30 起", "晚宴", "福園台菜海鮮餐廳（高雄市前金區成功一路266號9F）", "中山／東海確認"],
];

/* =========================================================================
   工具
   ========================================================================= */
function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// 簡易 CSV 解析（支援引號內含逗號、換行、雙引號跳脫）
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* 忽略 */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function confirmTag(value) {
  const v = (value || "").trim();
  if (/東海/.test(v) && /中山/.test(v)) return `<span class="tag both">${esc(v)}</span>`;
  if (/東海/.test(v)) return `<span class="tag tunghai">${esc(v)}</span>`;
  if (/中山/.test(v)) return `<span class="tag nsysu">${esc(v)}</span>`;
  return v ? `<span class="tag both">${esc(v)}</span>` : "";
}

/* =========================================================================
   渲染
   ========================================================================= */
function fillMeeting() {
  document.querySelectorAll("[data-meeting]").forEach((el) => {
    const key = el.dataset.meeting;
    if (MEETING[key]) el.textContent = MEETING[key];
  });
}

let currentAgenda = DEFAULT_AGENDA;

function renderAgenda(rows) {
  currentAgenda = rows;
  const body = document.querySelector("[data-agenda-body]");
  if (!body) return;
  body.innerHTML = rows
    .map((r) => {
      const [time, item, speaker, confirm] = [r[0] || "", r[1] || "", r[2] || "", r[3] || ""];
      const isTunghai = /東海/.test(confirm) && !/中山/.test(confirm);
      const isDinner = /晚宴/.test(item);
      const cls = [isTunghai ? "is-tunghai" : "", isDinner ? "is-dinner" : ""].filter(Boolean).join(" ");
      return `<tr class="${cls}">
        <td class="time" data-label="時間">${esc(time)}</td>
        <td class="item" data-label="議程">${esc(item)}</td>
        <td data-label="主講／負責人">${esc(speaker)}</td>
        <td data-label="確認方">${confirmTag(confirm)}</td>
      </tr>`;
    })
    .join("");
}

function setSource(state, message) {
  const el = document.querySelector("[data-source-status]");
  if (!el) return;
  el.className = "source-status " + state;
  el.innerHTML = `<span class="dot"></span>${esc(message)}`;
}

async function loadAgenda() {
  // 先放預設，畫面不會空白
  renderAgenda(DEFAULT_AGENDA);
  if (!CONFIG.csvUrl) {
    setSource("fallback", "目前顯示內建預設議程（尚未設定試算表連結）。");
    return;
  }
  try {
    const res = await fetch(CONFIG.csvUrl, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    const parsed = parseCSV(text).filter((r) => r.some((c) => c && c.trim() !== ""));
    // 第一列若是標題（含「時間」「議程」）就拿掉
    const dataRows =
      parsed.length && /時間|議程/.test((parsed[0][0] || "") + (parsed[0][1] || ""))
        ? parsed.slice(1)
        : parsed;
    if (dataRows.length) {
      renderAgenda(dataRows.map((r) => [r[0], r[1], r[2], r[3]]));
      setSource("live", "議程為即時版本（讀取自 Google 試算表）。");
    } else {
      setSource("fallback", "試算表尚無議程資料，目前顯示內建預設議程。");
    }
  } catch (err) {
    setSource("fallback", "無法連線試算表，目前顯示內建預設議程。");
  }
}

/* =========================================================================
   東海確認表單：填完按送出 → 透過 FormSubmit 寄回中山（表單 action 的信箱 + _cc）
   ========================================================================= */
function setupConfirmForm() {
  const form = document.querySelector("[data-confirm-form]");
  if (!form) return;
  const note = form.querySelector("[data-form-note]");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    if (note) note.textContent = "送出中…";

    const action = form.getAttribute("action") || "";
    const ajaxUrl = action.replace("formsubmit.co/", "formsubmit.co/ajax/");

    try {
      const res = await fetch(ajaxUrl, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      form.innerHTML =
        '<p class="form-done">✅ 已送出，感謝東海協助確認！回覆已寄回中山，我們會盡快跟進。</p>';
    } catch (err) {
      if (submitBtn) submitBtn.disabled = false;
      if (note)
        note.textContent = "送出失敗，請稍後再試，或直接回覆上方聯絡人 Email。";
    }
  });
}

/* =========================================================================
   下載 Word 議程（乾淨版，不含「確認方」欄；強制一頁）
   ========================================================================= */
function buildWordDoc() {
  const infoRows = [
    ["日　期", MEETING.date],
    ["時　間", MEETING.time],
    ["地　點", MEETING.venue],
    ["主　辦", MEETING.host],
    ["協　辦", MEETING.cohost],
    ["晚　宴", MEETING.dinner],
  ]
    .map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td></tr>`)
    .join("");

  const bodyRows = currentAgenda
    .map((r) => {
      const dinner = /晚宴/.test(r[1] || "");
      return `<tr${dinner ? ' class="dinner"' : ""}><td class="t">${esc(r[0])}</td><td class="i">${esc(
        r[1]
      )}</td><td class="s">${esc(r[2])}</td></tr>`;
    })
    .join("");

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8"><title>${esc(MEETING.subtitle)} 議程</title>
  <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
  <style>
    @page Section1 { size:595.3pt 841.9pt; margin:1.3cm 1.8cm 1.3cm 1.8cm; mso-page-orientation:portrait; }
    div.Section1 { page:Section1; }
    body { font-family:"Microsoft JhengHei","Noto Sans TC",sans-serif; color:#222; font-size:11pt; }
    p, p.MsoNormal, li.MsoNormal, div.MsoNormal { margin:0; mso-line-height-rule:exactly; line-height:1.05; mso-margin-top-alt:0; mso-margin-bottom-alt:0; }
    .title { text-align:center; font-size:18pt; font-weight:bold; line-height:1.2; margin:0 0 5pt; }
    .sub { text-align:center; font-size:11pt; color:#8a8a8a; letter-spacing:3pt; margin:0 0 12pt; }
    hr.rule { border:none; border-top:1pt solid #cccccc; margin:0 0 12pt; }
    table.info { border-collapse:collapse; width:100%; margin:0 0 14pt; }
    table.info td { border:none; padding:2pt 4pt; font-size:11pt; line-height:1.05; vertical-align:top; }
    table.info td.k { color:#8a6d1f; font-weight:bold; white-space:nowrap; width:58pt; }
    table.info td.v { color:#333; }
    table.ag { border-collapse:collapse; width:100%; }
    table.ag th { text-align:left; font-size:10.5pt; color:#555; font-weight:bold; padding:0 9pt 7pt; border-bottom:1.5pt solid #2a6450; }
    table.ag td { border:none; border-bottom:0.5pt solid #dcdcdc; padding:8pt 9pt; font-size:11pt; line-height:1.1; vertical-align:top; }
    table.ag td.t { color:#777; white-space:nowrap; }
    table.ag td.i { font-weight:bold; color:#1c4838; }
    table.ag tr.dinner td { color:#999; font-style:italic; }
  </style></head>
  <body><div class="Section1">
    <div class="title">${esc(MEETING.title)}</div>
    <div class="sub">${esc(MEETING.subtitle)}</div>
    <hr class="rule">
    <table class="info">${infoRows}</table>
    <table class="ag">
      <colgroup><col style="width:13%"><col style="width:21%"><col style="width:66%"></colgroup>
      <thead><tr><th>時間</th><th>議程</th><th>主講／負責人</th></tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </div></body></html>`;
}

function downloadWord() {
  const blob = new Blob(["﻿", buildWordDoc()], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "2026-08-07_陸委會座談會議程.doc";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* =========================================================================
   啟動
   ========================================================================= */
document.addEventListener("DOMContentLoaded", () => {
  fillMeeting();
  setupConfirmForm();
  loadAgenda();
  document.querySelector("[data-download-word]")?.addEventListener("click", downloadWord);
});
