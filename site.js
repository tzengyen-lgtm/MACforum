const site = {
  eventTitle: "近期國際與兩岸情勢發展對 2026 年底臺灣地方選舉之影響",
  fileTitle: "20260807_陸委會座談會議程",
};

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textFrom(selector) {
  const el = document.querySelector(selector);
  return el ? el.textContent.trim().replace(/\s+/g, " ") : "";
}

function agendaDataFromPage() {
  const meta = [...document.querySelectorAll("[data-docx-meta]")].map((el) => ({
    label: el.dataset.docxMeta,
    value: el.textContent.trim().replace(/\s+/g, " "),
  }));

  const rows = [...document.querySelectorAll("[data-agenda-row]")].map((row) =>
    [...row.children].map((cell) => cell.textContent.trim().replace(/\s+/g, " "))
  );

  return {
    title: textFrom("[data-docx-title]") || site.eventTitle,
    subtitle: textFrom("[data-docx-subtitle]"),
    meta,
    rows,
  };
}

function paragraph(text, style = "") {
  const styleXml = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : "";
  return `<w:p>${styleXml}<w:r><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
}

function tableCell(text, width) {
  return [
    "<w:tc>",
    `<w:tcPr><w:tcW w:w="${width}" w:type="dxa"/></w:tcPr>`,
    paragraph(text),
    "</w:tc>",
  ].join("");
}

function tableRow(cells, widths) {
  return `<w:tr>${cells.map((cell, index) => tableCell(cell, widths[index] || 2400)).join("")}</w:tr>`;
}

function buildDocumentXml(data) {
  const metaRows = data.meta.map((item) => tableRow([item.label, item.value], [1800, 7200])).join("");
  const agendaRows = [
    tableRow(["時間", "議程", "主講／負責人"], [1800, 2400, 4800]),
    ...data.rows.map((row) => tableRow(row, [1800, 2400, 4800])),
  ].join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraph(data.title, "Title")}
    ${data.subtitle ? paragraph(data.subtitle, "Subtitle") : ""}
    <w:tbl>
      <w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="A8B5AD"/><w:left w:val="single" w:sz="4" w:color="A8B5AD"/><w:bottom w:val="single" w:sz="4" w:color="A8B5AD"/><w:right w:val="single" w:sz="4" w:color="A8B5AD"/><w:insideH w:val="single" w:sz="4" w:color="D9E0DA"/><w:insideV w:val="single" w:sz="4" w:color="D9E0DA"/></w:tblBorders></w:tblPr>
      ${metaRows}
    </w:tbl>
    ${paragraph("")}
    <w:tbl>
      <w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="A8B5AD"/><w:left w:val="single" w:sz="4" w:color="A8B5AD"/><w:bottom w:val="single" w:sz="4" w:color="A8B5AD"/><w:right w:val="single" w:sz="4" w:color="A8B5AD"/><w:insideH w:val="single" w:sz="4" w:color="D9E0DA"/><w:insideV w:val="single" w:sz="4" w:color="D9E0DA"/></w:tblBorders></w:tblPr>
      ${agendaRows}
    </w:tbl>
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`;
}

function docxFiles(data) {
  const now = new Date().toISOString();
  return {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    "word/_rels/document.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "word/document.xml": buildDocumentXml(data),
    "word/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:pPr><w:jc w:val="center"/><w:spacing w:after="180"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:rPr><w:color w:val="5A6761"/><w:sz w:val="22"/></w:rPr><w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr></w:style></w:styles>`,
    "docProps/core.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEscape(data.title)}</dc:title><dc:creator>GitHub Pages 議程頁</dc:creator><cp:lastModifiedBy>GitHub Pages 議程頁</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`,
    "docProps/app.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>GitHub Pages</Application></Properties>`,
  };
}

function makeCrcTable() {
  const table = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

const crcTable = makeCrcTable();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function writeU16(arr, value) {
  arr.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeU32(arr, value) {
  arr.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function dosTimeDate(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = Math.max(1980, date.getFullYear()) - 1980;
  return { time, date: (year << 9) | (month << 5) | day };
}

function buildZip(files) {
  const encoder = new TextEncoder();
  const local = [];
  const central = [];
  const now = dosTimeDate(new Date());
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const checksum = crc32(data);

    const localHeader = [];
    writeU32(localHeader, 0x04034b50);
    writeU16(localHeader, 20);
    writeU16(localHeader, 0);
    writeU16(localHeader, 0);
    writeU16(localHeader, now.time);
    writeU16(localHeader, now.date);
    writeU32(localHeader, checksum);
    writeU32(localHeader, data.length);
    writeU32(localHeader, data.length);
    writeU16(localHeader, nameBytes.length);
    writeU16(localHeader, 0);

    local.push(...localHeader, ...nameBytes, ...data);

    const centralHeader = [];
    writeU32(centralHeader, 0x02014b50);
    writeU16(centralHeader, 20);
    writeU16(centralHeader, 20);
    writeU16(centralHeader, 0);
    writeU16(centralHeader, 0);
    writeU16(centralHeader, now.time);
    writeU16(centralHeader, now.date);
    writeU32(centralHeader, checksum);
    writeU32(centralHeader, data.length);
    writeU32(centralHeader, data.length);
    writeU16(centralHeader, nameBytes.length);
    writeU16(centralHeader, 0);
    writeU16(centralHeader, 0);
    writeU16(centralHeader, 0);
    writeU16(centralHeader, 0);
    writeU32(centralHeader, 0);
    writeU32(centralHeader, offset);
    central.push(...centralHeader, ...nameBytes);

    offset += localHeader.length + nameBytes.length + data.length;
  }

  const end = [];
  writeU32(end, 0x06054b50);
  writeU16(end, 0);
  writeU16(end, 0);
  writeU16(end, Object.keys(files).length);
  writeU16(end, Object.keys(files).length);
  writeU32(end, central.length);
  writeU32(end, local.length);
  writeU16(end, 0);

  return new Uint8Array([...local, ...central, ...end]);
}

function downloadAgendaDocx() {
  const data = agendaDataFromPage();
  const zip = buildZip(docxFiles(data));
  const blob = new Blob([zip], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${site.fileTitle}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function setupAgendaDownload() {
  const button = document.querySelector("[data-download-docx]");
  if (button) button.addEventListener("click", downloadAgendaDocx);
}

const taskKey = "mac-forum-task-state-v1";

function getTasks() {
  return [...document.querySelectorAll("[data-task-id]")].map((el) => ({
    id: el.dataset.taskId,
    owner: el.dataset.owner,
    label: el.querySelector(".task-label").textContent.trim(),
    checked: el.querySelector("input[type='checkbox']").checked,
    note: el.querySelector("textarea").value.trim(),
  }));
}

function saveTasks() {
  const state = {};
  getTasks().forEach((task) => {
    state[task.id] = { checked: task.checked, note: task.note };
  });
  localStorage.setItem(taskKey, JSON.stringify(state));
  updateProgress();
}

function loadTasks() {
  const saved = JSON.parse(localStorage.getItem(taskKey) || "{}");
  document.querySelectorAll("[data-task-id]").forEach((el) => {
    const item = saved[el.dataset.taskId];
    if (!item) return;
    el.querySelector("input[type='checkbox']").checked = Boolean(item.checked);
    el.querySelector("textarea").value = item.note || "";
  });
  updateProgress();
}

function updateProgress() {
  const tasks = getTasks();
  if (!tasks.length) return;
  const done = tasks.filter((task) => task.checked).length;
  const percent = Math.round((done / tasks.length) * 100);
  const label = document.querySelector("[data-progress-label]");
  const fill = document.querySelector("[data-progress-fill]");
  if (label) label.textContent = `${done}/${tasks.length} 已確認`;
  if (fill) fill.style.width = `${percent}%`;
}

function buildTaskReport() {
  const tasks = getTasks();
  const lines = [
    "# 2026/8/7 陸委會座談會分工確認回報",
    "",
    `回報時間：${new Date().toLocaleString("zh-TW")}`,
    "",
    "## 已確認",
    ...tasks.filter((task) => task.checked).map((task) => `- [x] ${task.owner}｜${task.label}${task.note ? `：${task.note}` : ""}`),
    "",
    "## 尚待確認",
    ...tasks.filter((task) => !task.checked).map((task) => `- [ ] ${task.owner}｜${task.label}${task.note ? `：${task.note}` : ""}`),
  ];
  return lines.join("\n");
}

function repoFromLocation() {
  const host = window.location.hostname;
  const match = host.match(/^([^.]+)\.github\.io$/);
  if (!match) return null;
  const owner = match[1];
  const repo = window.location.pathname.split("/").filter(Boolean)[0];
  if (!repo) return null;
  return { owner, repo };
}

async function copyText(text) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

function setupTasks() {
  if (!document.querySelector("[data-task-id]")) return;

  loadTasks();

  document.querySelectorAll("[data-task-id] input, [data-task-id] textarea").forEach((input) => {
    input.addEventListener("change", saveTasks);
    input.addEventListener("input", saveTasks);
  });

  const reportBox = document.querySelector("[data-report-box]");
  const reportButton = document.querySelector("[data-generate-report]");
  const copyButton = document.querySelector("[data-copy-report]");
  const issueButton = document.querySelector("[data-open-issue]");
  const resetButton = document.querySelector("[data-reset-tasks]");

  reportButton?.addEventListener("click", () => {
    reportBox.value = buildTaskReport();
  });

  copyButton?.addEventListener("click", async () => {
    const text = reportBox.value || buildTaskReport();
    reportBox.value = text;
    await copyText(text);
    copyButton.textContent = "已複製";
    window.setTimeout(() => (copyButton.textContent = "複製回報"), 1600);
  });

  issueButton?.addEventListener("click", () => {
    const text = reportBox.value || buildTaskReport();
    reportBox.value = text;
    const repo = repoFromLocation();
    if (!repo) {
      alert("目前不是 GitHub Pages 網址，請先複製回報文字，或發布到 GitHub Pages 後再使用。");
      return;
    }
    const url = new URL(`https://github.com/${repo.owner}/${repo.repo}/issues/new`);
    url.searchParams.set("title", "2026/8/7 陸委會座談會分工確認回報");
    url.searchParams.set("body", text);
    window.open(url.toString(), "_blank", "noopener");
  });

  resetButton?.addEventListener("click", () => {
    if (!confirm("確定要清除這台電腦上的勾選與備註嗎？")) return;
    localStorage.removeItem(taskKey);
    document.querySelectorAll("[data-task-id]").forEach((el) => {
      el.querySelector("input[type='checkbox']").checked = false;
      el.querySelector("textarea").value = "";
    });
    updateProgress();
    if (reportBox) reportBox.value = "";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupAgendaDownload();
  setupTasks();
});
