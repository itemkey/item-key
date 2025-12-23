function uid(){
  if (globalThis.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

export class Projects {
  constructor(store, ui) {
    this.store = store;
    this.ui = ui;
    this.selectEl = null;
  }

  mount(selectEl) {
    this.selectEl = selectEl;
    this.renderSelect();

    this.selectEl.addEventListener("change", () => {
      const id = this.selectEl.value;
      this.store.patch((s) => (s.activeProjectId = id));
      document.dispatchEvent(new CustomEvent("planning:projectChanged", { detail: { id } }));
    });
  }

  renderSelect() {
    const state = this.store.getState();
    const { projects, activeProjectId } = state;

    this.selectEl.innerHTML = "";
    for (const p of projects) {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = String(p.name ?? "").toUpperCase();
      if (p.id === activeProjectId) opt.selected = true;
      this.selectEl.appendChild(opt);
    }
  }

  openCreateModal() {
    this.ui.openModal({
      title: "new project",
      bodyHtml: `
        <form class="form">
          <label style="display:grid; gap:6px; font-size:11px; letter-spacing:2px; text-transform:uppercase;">
            name
            <input class="ctl" name="name" required maxlength="32" />
          </label>

          <label style="display:grid; gap:6px; font-size:11px; letter-spacing:2px; text-transform:uppercase;">
            description
            <textarea class="ctl" name="desc" rows="3" maxlength="120"></textarea>
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

        const id = uid();
        this.store.patch((s) => {
          s.projects.push({ id, name, desc: String(data.desc ?? "").trim() });
          s.activeProjectId = id;
        });

        this.renderSelect();
        this.ui.closeModal();
        this.ui.toast("project created");
        document.dispatchEvent(new CustomEvent("planning:projectChanged", { detail: { id } }));
      },
    });
  }
}
