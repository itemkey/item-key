function uid() {
  if (globalThis.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

export class Store {
  constructor(key) {
    this.key = key;
    this.state = this.load() ?? this.defaultState();
  }

  defaultState() {
    return {
      activeProjectId: null,
      projects: [],
      tasks: [],
      events: []
    };
  }

  ensureSeed() {
    if (this.state.projects.length) return;

    const pid = uid();
    this.state.projects.push({ id: pid, name: "default", desc: "starter project" });
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
