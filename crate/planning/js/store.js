function uid() {
  if (globalThis.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function defaultColumns() {
  // per-project workflow (user can rename/delete/add later)
  return [
    { id: uid(), name: "backlog",     role: "todo",  color: "#111111", order: 0 },
    { id: uid(), name: "in progress", role: "doing", color: "#AA5F00", order: 1 },
    { id: uid(), name: "review",      role: "doing", color: "#005AAA", order: 2 },
    { id: uid(), name: "done",        role: "done",  color: "#008C46", order: 3 },
  ];
}

export class Store {
  constructor(key) {
    this.key = key;
    this.state = this.load() ?? this.defaultState();
    this.migrate();
  }

  defaultState() {
    return {
      activeProjectId: null,
      projects: [],
      tasks: [],
      events: []
    };
  }

  migrate() {
    // Ensure arrays exist
    if (!Array.isArray(this.state.projects)) this.state.projects = [];
    if (!Array.isArray(this.state.tasks)) this.state.tasks = [];
    if (!Array.isArray(this.state.events)) this.state.events = [];

    // Ensure each project has columns
    for (const p of this.state.projects) {
      if (!Array.isArray(p.columns) || p.columns.length === 0) {
        p.columns = defaultColumns();
      } else {
        // normalize order
        p.columns.forEach((c, i) => { if (typeof c.order !== "number") c.order = i; });
        p.columns.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      }
    }

    // Migrate tasks: status -> columnId
    for (const t of this.state.tasks) {
      if (t.columnId) continue;

      const proj = this.state.projects.find(p => p.id === t.projectId);
      if (!proj || !Array.isArray(proj.columns) || proj.columns.length === 0) continue;

      const mapRole = {
        backlog: "todo",
        in_progress: "doing",
        review: "doing",
        done: "done",
      };

      const role = mapRole[t.status] ?? "todo";
      const col = proj.columns.find(c => c.role === role) || proj.columns[0];

      t.columnId = col.id;

      // keep legacy status if you want; but it's safer to remove to avoid confusion
      delete t.status;
    }

    // Active project
    if (!this.state.activeProjectId && this.state.projects[0]) {
      this.state.activeProjectId = this.state.projects[0].id;
    }

    this.save();
  }

  ensureSeed() {
    if (this.state.projects.length) return;

    const pid = uid();
    this.state.projects.push({
      id: pid,
      name: "default",
      desc: "starter project",
      columns: defaultColumns(),
      createdAt: Date.now()
    });
    this.state.activeProjectId = pid;
    this.save();
  }

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  save() {
    localStorage.setItem(this.key, JSON.stringify(this.state));
  }

  getState() {
    return structuredClone(this.state);
  }

  patch(mutator) {
    mutator(this.state);
    this.save();
  }
}
