const agendaKey = "mac-forum-agenda-state-v6";
const tunghaiConfirmKey = "mac-forum-tunghai-confirm-v1";
const chineseNumbers = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function setAgendaStatus(message) {
  const el = document.querySelector("[data-agenda-status]");
  if (el) el.textContent = message;
}

function setConfirmStatus(message) {
  const el = document.querySelector("[data-confirm-status]");
  if (el) el.textContent = message;
}

function textFrom(selector) {
  const el = document.querySelector(selector);
  return el ? cleanText(el.textContent) : "";
}

function fieldText(row, field) {
  return cleanText(row.querySelector(`[data-field="${field}"]`)?.textContent || "");
}

function agendaStateFromPage() {
  return {
    title: textFrom("[data-docx-title]"),
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

function createAgendaRow(row = {}) {
  const tr = document.createElement("tr");
  tr.dataset.agendaRow = "";
  if (row.autoLabel) tr.dataset.autoLabel = row.autoLabel;
  if (row.customItem) tr.dataset.customItem = row.customItem;

  tr.innerHTML = `
    <td class="drag-cell no-print"><button class="icon-button" type="button" data-drag-handle title="拖拉排序">↕</button></td>
    <td data-field="time" data-label="時間" contenteditable="true" spellcheck="false" class="editable-cell"></td>
    <td data-field="item" data-label="議程" contenteditable="true" spellcheck="false" class="editable-cell"></td>
    <td data-field="speaker" data-label="主講／負責人" contenteditable="true" spellcheck="false" class="editable-cell"></td>
    <td data-field="note" data-label="備註" contenteditable="true" spellcheck="false" class="editable-cell screen-note no-print"></td>
    <td class="row-actions no-print"><button class="mini-button" type="button" data-move-up>上移</button><button class="mini-button" type="button" data-move-down>下移</button><button class="mini-button danger" type="button" data-delete-row>刪除</button></td>
  `;

  tr.querySelector('[data-field="time"]').textContent = row.time || "";
  tr.querySelector('[data-field="item"]').textContent = row.item || "";
  tr.querySelector('[data-field="speaker"]').textContent = row.speaker || "";
  tr.querySelector('[data-field="note"]').textContent = row.note || "待確認";
  bindAgendaRow(tr);
  return tr;
}

function saveAgendaState(message = "已本機暫存議程內容。") {
  if (!document.querySelector("[data-agenda-editor]")) return;
  localStorage.setItem(agendaKey, JSON.stringify(agendaStateFromPage()));
  setAgendaStatus(message);
}

function renumberPanelRows() {
  let count = 0;
  document.querySelectorAll("[data-agenda-row]").forEach((row) => {
    if (row.dataset.autoLabel !== "panel" || row.dataset.customItem === "true") return;
    row.querySelector('[data-field="item"]').textContent = `與談${chineseNumbers[count] || count + 1}`;
    count += 1;
  });
}

function bindAgendaRow(row) {
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
      if (cell.dataset.field === "item" && row.dataset.autoLabel === "panel") row.dataset.customItem = "true";
      saveAgendaState("已本機暫存議程修改。");
    });
    cell.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        cell.blur();
      }
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

function loadAgendaState() {
  const raw = localStorage.getItem(agendaKey);
  document.querySelectorAll("[data-agenda-row]").forEach(bindAgendaRow);

  if (!raw) {
    setAgendaStatus("填寫或調整後會本機暫存於目前瀏覽器。");
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
    el.addEventListener("input", () => saveAgendaState("已本機暫存議程修改。"));
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
}

function showTab(tabName) {
  const current = tabName === "tunghai" ? "tunghai" : "agenda";
  document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.tabPanel !== current;
  });
  document.querySelectorAll("[data-tab-button]").forEach((button) => {
    const active = button.dataset.tabButton === current;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  if (location.hash !== `#${current}`) history.replaceState(null, "", `#${current}`);
}

function setupTabs() {
  if (!document.querySelector("[data-tab-panel]")) return;
  document.querySelectorAll("[data-tab-button]").forEach((button) => {
    button.addEventListener("click", () => showTab(button.dataset.tabButton));
  });
  showTab(location.hash.replace("#", "") || "agenda");
  window.addEventListener("hashchange", () => showTab(location.hash.replace("#", "")));
}

function confirmationStateFromPage() {
  const state = {};
  document.querySelectorAll("[data-confirm-field]").forEach((input) => {
    state[input.dataset.confirmField] = input.value;
  });
  document.querySelectorAll("[data-choice-group]").forEach((group) => {
    state[group.dataset.choiceGroup] = group.dataset.choiceValue || "";
  });
  return state;
}

function saveConfirmationState() {
  localStorage.setItem(tunghaiConfirmKey, JSON.stringify(confirmationStateFromPage()));
  setConfirmStatus(`已本機暫存 ${new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}`);
}

function loadConfirmationState() {
  const raw = localStorage.getItem(tunghaiConfirmKey);
  if (!raw) return;
  try {
    const state = JSON.parse(raw);
    document.querySelectorAll("[data-confirm-field]").forEach((input) => {
      input.value = state[input.dataset.confirmField] || "";
    });
    document.querySelectorAll("[data-choice-group]").forEach((group) => {
      const value = state[group.dataset.choiceGroup] || "";
      group.dataset.choiceValue = value;
      group.querySelectorAll("[data-choice-value]").forEach((button) => {
        button.classList.toggle("is-selected", button.dataset.choiceValue === value);
      });
    });
    setConfirmStatus("已載入上次儲存內容");
  } catch {
    setConfirmStatus("先前儲存內容無法讀取");
  }
}

function setupTunghaiConfirmation() {
  if (!document.querySelector("[data-confirm-field], [data-choice-group]")) return;
  loadConfirmationState();

  document.querySelectorAll("[data-confirm-field]").forEach((input) => {
    input.addEventListener("input", saveConfirmationState);
  });

  document.querySelectorAll("[data-choice-group]").forEach((group) => {
    group.querySelectorAll("[data-choice-value]").forEach((button) => {
      button.addEventListener("click", () => {
        group.dataset.choiceValue = button.dataset.choiceValue;
        group.querySelectorAll("[data-choice-value]").forEach((item) => {
          item.classList.toggle("is-selected", item === button);
        });
        saveConfirmationState();
      });
    });
  });
}

function setupPdfDownload() {
  document.querySelector("[data-download-pdf]")?.addEventListener("click", () => {
    saveAgendaState("已依目前畫面準備 PDF。");
    showTab("agenda");
    document.body.classList.add("print-agenda");
    window.print();
  });
  window.addEventListener("afterprint", () => document.body.classList.remove("print-agenda"));
}

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupAgendaEditor();
  setupTunghaiConfirmation();
  setupPdfDownload();
});
