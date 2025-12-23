const STATUSES = [
  { key: "backlog", label: "backlog" },
  { key: "in_progress", label: "in progress" },
  { key: "review", label: "review" },
  { key: "done", label: "done" },
];

const PRIORITIES = [
  { key: "low", label: "low" },
  { key: "mid", label: "mid" },
  { key: "high", label: "high" },
];

function uid(){
  if (globalThis.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

export class Tasks {
  constructor(store, ui) {
    this.store = store;
    this.ui = ui;
    this.search = "";
    this.boardEl = null;

    document.addEventListener("planning:projectChanged", () => {
      if (this.boardEl) this.renderBoard(this.boardEl);
    });
  }

  setSearch(q) {
    this.search = String(q ?? "").trim().toLowerCase();
  }

  openCreateModal() {
    const state = this.store.getState();
    const pid = state.activeProjectId;
    if (!pid) {
      this.ui.toast("select project");
      return;
    }

    this.ui.openModal({
      title: "new task",
      bodyHtml: `
        <form class="form">
          <label style="display:grid; gap:6px; font-size:11px; letter-spacing:2px; text-transform:uppercase;">
            name
            <input class="ctl" name="name" required maxlength="48" />
          </label>

          <label style="display:grid; gap:6px; font-size:11px; letter-spacing:2px; text-transform:uppercase;">
            description
            <textarea class="ctl" name="desc" rows="4" maxlength="280"></textarea>
          </label>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <label style="display:grid; gap:6px; font-size:11px; letter-spacing:2px; text-transform:uppercase;">
              deadline
              <input class="ctl" name="deadline" type="date" />
            </label>

            <label style="display:grid; gap:6px; font-size:11px; letter-spacing:2px; text-transform:uppercase;">
              priority
              <select class="ctl" name="priority">
                ${PRIORITIES.map(p => `<option value="${p.key}">${p.label.toUpperCase()}</option>`).join("")}
              </select>
            </label>
          </div>

          <label style="display:grid; gap:6px; font-size:11px; letter-spacing:2px; text-transform:uppercase;">
            tags (comma)
            <input class="ctl" name="tags" placeholder="study, work, exam" maxlength="80" />
          </label>

          <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:6px;">
            <button class="btn" type="button" data-close>cancel</button>
            <button class="btn" type="submit">create</button>
          </div>
        </form>
      `,
      onSubmit: (data) => {
        const name = String(data.name ?? "").trim();
        if (!name) return;

        const task = {
          id: uid(),
          projectId: pid,
          name,
          desc: String(data.desc ?? "").trim(),
          status: "backlog",
          priority: String(data.priority ?? "mid"),
          deadline: String(data.deadline ?? ""),
          tags: String(data.tags ?? "")
            .split(",")
            .map(s => s.trim())
            .filter(Boolean)
            .slice(0, 8),
          createdAt: Date.now(),
        };

        this.store.patch((s) => s.tasks.push(task));
        this.ui.closeModal();
        this.ui.toast("task created");
        if (this.boardEl) this.renderBoard(this.boardEl);
      }
    });
  }

  renderBoard(boardEl) {
    this.boardEl = boardEl;

    const state = this.store.getState();
    const pid = state.activeProjectId;
    const all = state.tasks.filter(t => t.projectId === pid);

    const filtered = this.search
      ? all.filter(t => {
          const hay = `${t.name} ${t.desc} ${(t.tags || []).join(" ")}`.toLowerCase();
          return hay.includes(this.search);
        })
      : all;

    boardEl.innerHTML = "";
    boardEl.hidden = false;

    for (const col of STATUSES) {
      const colEl = document.createElement("section");
      colEl.className = "column";
      colEl.dataset.status = col.key;

      const items = filtered
        .filter(t => t.status === col.key)
        .sort((a, b) => (a.deadline || "").localeCompare(b.deadline || "") || (b.createdAt - a.createdAt));

      colEl.innerHTML = `
        <div class="column__head">
          <div class="column__title">${col.label}</div>
          <div class="column__count">${items.length}</div>
        </div>
        <div class="column__dropzone" data-dropzone></div>
      `;

      const zone = colEl.querySelector("[data-dropzone]");
      zone.addEventListener("dragover", (e) => e.preventDefault());
      zone.addEventListener("drop", (e) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData("text/taskId");
        if (!taskId) return;
        this.moveTask(taskId, col.key);
      });

      for (const task of items) zone.appendChild(this.renderCard(task));
      boardEl.appendChild(colEl);
    }
  }

  renderCard(task) {
    const el = document.createElement("article");
    el.className = "card";
    el.draggable = true;
    el.dataset.id = task.id;

    const metaParts = [];
    if (task.priority) metaParts.push(`priority: ${task.priority}`);
    if (task.deadline) metaParts.push(`deadline: ${task.deadline}`);
    if (task.tags?.length) metaParts.push(`tags: ${task.tags.join(" · ")}`);

    el.innerHTML = `
      <h3 class="card__name">${escapeHtml(task.name)}</h3>
      <p class="card__meta">${escapeHtml(metaParts.join(" • ") || "—")}</p>
      <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:2px;">
        <button class="btn" type="button" data-act="open">open</button>
        <button class="btn" type="button" data-act="del">delete</button>
      </div>
    `;

    el.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/taskId", task.id);
      e.dataTransfer.effectAllowed = "move";
    });

    el.querySelector('[data-act="open"]').addEventListener("click", () => this.openTask(task.id));
    el.querySelector('[data-act="del"]').addEventListener("click", () => this.deleteTask(task.id));
    return el;
  }

  openTask(taskId) {
    const state = this.store.getState();
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    this.ui.openModal({
      title: "task",
      bodyHtml: `
        <form class="form">
          <label style="display:grid; gap:6px; font-size:11px; letter-spacing:2px; text-transform:uppercase;">
            name
            <input class="ctl" name="name" required maxlength="48" value="${escapeAttr(task.name)}" />
          </label>

          <label style="display:grid; gap:6px; font-size:11px; letter-spacing:2px; text-transform:uppercase;">
            description
            <textarea class="ctl" name="desc" rows="5" maxlength="280">${escapeHtml(task.desc || "")}</textarea>
          </label>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <label style="display:grid; gap:6px; font-size:11px; letter-spacing:2px; text-transform:uppercase;">
              status
              <select class="ctl" name="status">
                ${STATUSES.map(s => `<option value="${s.key}" ${s.key===task.status?"selected":""}>${s.label.toUpperCase()}</option>`).join("")}
              </select>
            </label>

            <label style="display:grid; gap:6px; font-size:11px; letter-spacing:2px; text-transform:uppercase;">
              priority
              <select class="ctl" name="priority">
                ${PRIORITIES.map(p => `<option value="${p.key}" ${p.key===task.priority?"selected":""}>${p.label.toUpperCase()}</option>`).join("")}
              </select>
            </label>
          </div>

          <label style="display:grid; gap:6px; font-size:11px; letter-spacing:2px; text-transform:uppercase;">
            deadline
            <input class="ctl" name="deadline" type="date" value="${escapeAttr(task.deadline || "")}" />
          </label>

          <label style="display:grid; gap:6px; font-size:11px; letter-spacing:2px; text-transform:uppercase;">
            tags (comma)
            <input class="ctl" name="tags" maxlength="80" value="${escapeAttr((task.tags||[]).join(", "))}" />
          </label>

          <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:6px;">
            <button class="btn" type="button" data-close>close</button>
            <button class="btn" type="submit">save</button>
          </div>
        </form>
      `,
      onSubmit: (data) => {
        const name = String(data.name ?? "").trim();
        if (!name) return;

        const tags = String(data.tags ?? "")
          .split(",")
          .map(s => s.trim())
          .filter(Boolean)
          .slice(0, 8);

        this.store.patch((s) => {
          const t = s.tasks.find(x => x.id === taskId);
          if (!t) return;
          t.name = name;
          t.desc = String(data.desc ?? "").trim();
          t.status = String(data.status ?? "backlog");
          t.priority = String(data.priority ?? "mid");
          t.deadline = String(data.deadline ?? "");
          t.tags = tags;
        });

        this.ui.closeModal();
        this.ui.toast("task saved");
        if (this.boardEl) this.renderBoard(this.boardEl);
      }
    });
  }

  deleteTask(taskId) {
    this.ui.openModal({
      title: "delete task",
      bodyHtml: `
        <form class="form">
          <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:rgba(0,0,0,.75); line-height:1.5;">
            confirm deletion. this action cannot be undone.
          </div>
          <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:10px;">
            <button class="btn" type="button" data-close>cancel</button>
            <button class="btn" type="submit">delete</button>
          </div>
        </form>
      `,
      onSubmit: () => {
        this.store.patch((s) => { s.tasks = s.tasks.filter(t => t.id !== taskId); });
        this.ui.closeModal();
        this.ui.toast("task deleted");
        if (this.boardEl) this.renderBoard(this.boardEl);
      }
    });
  }

  moveTask(taskId, newStatus) {
    this.store.patch((s) => {
      const t = s.tasks.find(x => x.id === taskId);
      if (!t) return;
      t.status = newStatus;
    });
    this.ui.toast("moved");
    if (this.boardEl) this.renderBoard(this.boardEl);
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(str) {
  return escapeHtml(str).replaceAll("\n", " ");
}
