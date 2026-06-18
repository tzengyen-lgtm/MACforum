const site = {
  eventTitle: "近期國際與兩岸情勢發展對 2026 年底臺灣地方選舉之影響",
  fileTitle: "20260807_陸委會座談會議程",
};

const agendaKey = "mac-forum-agenda-state-v2";
const taskKey = "mac-forum-task-state-v1";
const chineseNumbers = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function xmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textFrom(selector) {
  const el = document.querySelector(selector);
  return el ? cleanText(el.textContent) : "";
}

function fieldText(row, field) {
  return cleanText(row.querySelector(`[data-field="${field}"]`)?.textContent || "");
}

function agendaDataFromPage() {
  const meta = [...document.querySelectorAll("[data-docx-meta]")].map((el) => ({
    label: cleanText(el.dataset.docxMeta),
    value: cleanText(el.textContent),
  }));

  const rows = [...document.querySelectorAll("[data-agenda-row]")].map((row) => [
    fieldText(row, "time"),
    fieldText(row, "item"),
    fieldText(row, "speaker"),
    fieldText(row, "note"),
  ]);

  return {
    title: textFrom("[data-docx-title]") || site.eventTitle,
    subtitle: textFrom("[data-docx-subtitle]"),
    meta,
    rows,
  };
}

function agendaStateFromPage() {
  return {
    title: textFrom("[data-docx-title]") || site.eventTitle,
    subtitle: textFrom("[data-docx-subtitle]"),
    meta: [...document.querySelectorAll("[data-docx-meta]")].map((el) => ({
      key: el.dataset.docxMeta,
      value: cleanText(el.textContent),
    })),
    rows: [...document.querySelectorAll("[data-agenda-row]")].map((row) => ({
      time: fieldText(row, "time"),
      item: fieldText(row, "item"),
      speaker: fieldText(row, "speaker"),
      note: fieldText(row, "note"),
      autoLabel: row.dataset.autoLabel || "",
      customItem: row.dataset.customItem || "",
    })),
  };
}

function setAgendaStatus(message) {
  const el = document.querySelector("[data-agenda-status]");
  if (el) el.textContent = message;
}

function createAgendaRow(row = {}) {
  const tr = document.createElement("tr");
  tr.dataset.agendaRow = "";
  tr.draggable = true;
  if (row.autoLabel) tr.dataset.autoLabel = row.autoLabel;
  if (row.customItem) tr.dataset.customItem = row.customItem;

  tr.innerHTML = `
    <td class="drag-cell no-print"><button class="icon-button" type="button" data-drag-handle title="拖拉排序">↕</button></td>
    <td data-field="time" data-label="時間" contenteditable="true" spellcheck="false"></td>
    <td data-field="item" data-label="議程" contenteditable="true" spellcheck="false"></td>
    <td data-field="speaker" data-label="主講／負責人" contenteditable="true" spellcheck="false"></td>
    <td data-field="note" data-label="備註" contenteditable="true" spellcheck="false"></td>
    <td class="row-actions no-print"><button class="mini-button" type="button" data-move-up>上移</button><button class="mini-button" type="button" data-move-down>下移</button><button class="mini-button danger" type="button" data-delete-row>刪除</button></td>
  `;

  tr.querySelector('[data-field="time"]').textContent = row.time || "";
  tr.querySelector('[data-field="item"]').textContent = row.item || "";
  tr.querySelector('[data-field="speaker"]').textContent = row.speaker || "";
  tr.querySelector('[data-field="note"]').textContent = row.note || "";
  bindAgendaRow(tr);
  return tr;
}

function bindAgendaRow(row) {
  row.draggable = false;
  const handle = row.querySelector("[data-drag-handle]");
  if (handle) handle.draggable = true;

  handle?.addEventListener("dragstart", (event) => {
    row.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", "");
  });

  handle?.addEventListener("dragend", () => {
    row.classList.remove("is-dragging");
    renumberPanelRows();
    saveAgendaState("已調整議程順序。");
  });

  row.querySelectorAll("[contenteditable]").forEach((cell) => {
    cell.addEventListener("input", () => {
      if (cell.dataset.field === "item" && row.dataset.autoLabel === "panel") {
        row.dataset.customItem = "true";
      }
      saveAgendaState("已暫存修改。");
    });
  });

  row.querySelector("[data-move-up]")?.addEventListener("click", () => {
    const previous = row.previousElementSibling;
    if (previous) row.parentElement.insertBefore(row, previous);
    renumberPanelRows();
    saveAgendaState("已上移。");
  });

  row.querySelector("[data-move-down]")?.addEventListener("click", () => {
    const next = row.nextElementSibling;
    if (next) row.parentElement.insertBefore(next, row);
    renumberPanelRows();
    saveAgendaState("已下移。");
  });

  row.querySelector("[data-delete-row]")?.addEventListener("click", () => {
    if (!confirm("確定要刪除這一列議程嗎？")) return;
    row.remove();
    renumberPanelRows();
    saveAgendaState("已刪除議程列。");
  });
}

function renumberPanelRows() {
  let count = 0;
  document.querySelectorAll("[data-agenda-row]").forEach((row) => {
    if (row.dataset.autoLabel !== "panel" || row.dataset.customItem === "true") return;
    const label = chineseNumbers[count] || String(count + 1);
    row.querySelector('[data-field="item"]').textContent = `與談${label}`;
    count += 1;
  });
}

function saveAgendaState(message = "已儲存目前議程。") {
  if (!document.querySelector("[data-agenda-editor]")) return;
  localStorage.setItem(agendaKey, JSON.stringify(agendaStateFromPage()));
  setAgendaStatus(`${message} DOCX 下載會使用目前畫面內容。`);
}

function loadAgendaState() {
  const raw = localStorage.getItem(agendaKey);
  document.querySelectorAll("[data-agenda-row]").forEach(bindAgendaRow);

  if (!raw) {
    document.querySelectorAll("[data-agenda-row]").forEach((row) => {
      if (row.dataset.autoLabel === "panel") row.dataset.customItem = "";
    });
    setAgendaStatus("目前內容會暫存在這台裝置的瀏覽器。");
    return;
  }

  try {
    const state = JSON.parse(raw);
    const title = document.querySelector("[data-docx-title]");
    const subtitle = document.querySelector("[data-docx-subtitle]");
    if (title && state.title) title.textContent = state.title;
    if (subtitle && state.subtitle) subtitle.textContent = state.subtitle;

    (state.meta || []).forEach((item) => {
      const target = document.querySelector(`[data-docx-meta="${CSS.escape(item.key)}"]`);
      if (target) target.textContent = item.value || "";
    });

    const body = document.querySelector("[data-agenda-body]");
    if (body && Array.isArray(state.rows) && state.rows.length) {
      body.innerHTML = "";
      state.rows.forEach((row) => body.appendChild(createAgendaRow(row)));
    }
    renumberPanelRows();
    setAgendaStatus("已載入這台裝置上次儲存的議程內容。");
  } catch {
    setAgendaStatus("先前儲存內容無法讀取，已使用預設議程。");
  }
}

function dragAfterElement(container, y) {
  const rows = [...container.querySelectorAll("[data-agenda-row]:not(.is-dragging)")];
  return rows.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

function setupAgendaEditor() {
  const editor = document.querySelector("[data-agenda-editor]");
  const body = document.querySelector("[data-agenda-body]");
  if (!editor || !body) return;

  loadAgendaState();

  editor.querySelectorAll("[contenteditable]").forEach((el) => {
    el.addEventListener("input", () => saveAgendaState("已暫存修改。"));
    el.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        el.blur();
      }
    });
  });

  body.addEventListener("dragover", (event) => {
    event.preventDefault();
    const dragging = body.querySelector(".is-dragging");
    if (!dragging) return;
    const after = dragAfterElement(body, event.clientY);
    if (!after) body.appendChild(dragging);
    else body.insertBefore(dragging, after);
  });

  document.querySelector("[data-add-agenda-row]")?.addEventListener("click", () => {
    body.appendChild(
      createAgendaRow({
        time: "",
        item: "新增議程",
        speaker: "姓名／單位",
        note: "待確認",
      })
    );
    saveAgendaState("已新增議程列。");
  });

  document.querySelector("[data-save-agenda]")?.addEventListener("click", () => saveAgendaState("已儲存目前內容。"));

  document.querySelector("[data-reset-agenda]")?.addEventListener("click", () => {
    if (!confirm("確定要恢復預設議程嗎？這會清除這台裝置儲存的議程調整。")) return;
    localStorage.removeItem(agendaKey);
    window.location.reload();
  });
}

function paragraph(text, options = {}) {
  const styleXml = options.style ? `<w:pStyle w:val="${options.style}"/>` : "";
  const alignXml = options.align ? `<w:jc w:val="${options.align}"/>` : "";
  const spacingXml = options.after ? `<w:spacing w:after="${options.after}"/>` : "";
  const pPr = styleXml || alignXml || spacingXml ? `<w:pPr>${styleXml}${alignXml}${spacingXml}</w:pPr>` : "";
  const boldXml = options.bold ? "<w:b/>" : "";
  const sizeXml = options.size ? `<w:sz w:val="${options.size}"/><w:szCs w:val="${options.size}"/>` : "";
  const colorXml = options.color ? `<w:color w:val="${options.color}"/>` : "";
  const rPr = boldXml || sizeXml || colorXml ? `<w:rPr>${boldXml}${sizeXml}${colorXml}<w:rFonts w:eastAsia="Microsoft JhengHei" w:ascii="Aptos" w:hAnsi="Aptos"/></w:rPr>` : "";
  return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
}

function tableCell(text, width, options = {}) {
  const shade = options.shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${options.shade}"/>` : "";
  const valign = "<w:vAlign w:val=\"center\"/>";
  const margins = "<w:tcMar><w:top w:w=\"120\" w:type=\"dxa\"/><w:left w:w=\"120\" w:type=\"dxa\"/><w:bottom w:w=\"120\" w:type=\"dxa\"/><w:right w:w=\"120\" w:type=\"dxa\"/></w:tcMar>";
  return [
    "<w:tc>",
    `<w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${shade}${valign}${margins}</w:tcPr>`,
    paragraph(text, { bold: options.bold, color: options.color, size: options.size || 21, after: 0 }),
    "</w:tc>",
  ].join("");
}

function tableRow(cells, widths, options = {}) {
  return `<w:tr>${cells.map((cell, index) => tableCell(cell, widths[index] || 2200, options)).join("")}</w:tr>`;
}

function tableBorders(color = "B8C5BC") {
  return `<w:tblBorders><w:top w:val="single" w:sz="6" w:color="${color}"/><w:left w:val="single" w:sz="6" w:color="${color}"/><w:bottom w:val="single" w:sz="6" w:color="${color}"/><w:right w:val="single" w:sz="6" w:color="${color}"/><w:insideH w:val="single" w:sz="4" w:color="D9E0DA"/><w:insideV w:val="single" w:sz="4" w:color="D9E0DA"/></w:tblBorders>`;
}

function buildDocumentXml(data) {
  const metaRows = data.meta.map((item) => tableRow([item.label, item.value], [1600, 7600], { size: 22 })).join("");
  const agendaRows = [
    tableRow(["時間", "議程", "主講／負責人", "備註"], [1500, 1600, 4600, 1500], {
      shade: "E8EFEA",
      bold: true,
      color: "285F4C",
      size: 21,
    }),
    ...data.rows.map((row) => tableRow(row, [1500, 1600, 4600, 1500], { size: 21 })),
  ].join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraph(data.title, { style: "Title", align: "center", after: 120 })}
    ${data.subtitle ? paragraph(data.subtitle, { style: "Subtitle", align: "center", after: 280 }) : ""}
    <w:tbl>
      <w:tblPr><w:tblW w:w="9200" w:type="dxa"/>${tableBorders()}</w:tblPr>
      ${metaRows}
    </w:tbl>
    ${paragraph("", { after: 160 })}
    <w:tbl>
      <w:tblPr><w:tblW w:w="9200" w:type="dxa"/>${tableBorders()}</w:tblPr>
      ${agendaRows}
    </w:tbl>
    ${paragraph(`下載時間：${new Date().toLocaleString("zh-TW")}`, { align: "right", color: "5A6761", size: 18, after: 0 })}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>
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
    "word/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:eastAsia="Microsoft JhengHei" w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:rFonts w:eastAsia="Microsoft JhengHei" w:ascii="Aptos" w:hAnsi="Aptos"/><w:b/><w:sz w:val="34"/><w:color w:val="17211D"/></w:rPr><w:pPr><w:jc w:val="center"/><w:spacing w:after="120"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:rPr><w:rFonts w:eastAsia="Microsoft JhengHei" w:ascii="Aptos" w:hAnsi="Aptos"/><w:color w:val="5A6761"/><w:sz w:val="22"/></w:rPr><w:pPr><w:jc w:val="center"/><w:spacing w:after="260"/></w:pPr></w:style></w:styles>`,
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
  saveAgendaState("已依目前畫面準備下載。");
  const zip = buildZip(docxFiles(agendaDataFromPage()));
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

function getTasks() {
  return [...document.querySelectorAll("[data-task-id]")].map((el) => ({
    id: el.dataset.taskId,
    owner: el.dataset.owner,
    label: cleanText(el.querySelector(".task-label").textContent),
    checked: el.querySelector("input[type='checkbox']").checked,
    note: cleanText(el.querySelector("textarea").value),
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
  setupAgendaEditor();
  setupAgendaDownload();
  setupTasks();
});
