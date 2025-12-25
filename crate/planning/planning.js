import { Store } from "./js/store.js";
import { UI } from "./js/ui.js";
import { Projects } from "./js/projects.js";
import { Tasks } from "./js/tasks.js";

const store = new Store("itemkey_planning_v1");
const ui = new UI();

const projects = new Projects(store, ui);
const tasks = new Tasks(store, ui);

const els = {
  projectSelect: document.getElementById("projectSelect"),
  projectBar: document.getElementById("projectBar"),
  searchInput: document.getElementById("searchInput"),
  viewSelect: document.getElementById("viewSelect"),
  boardView: document.getElementById("boardView"),
  scheduleView: document.getElementById("scheduleView"),
  btnNewProject: document.getElementById("btnNewProject"),
  btnNewTask: document.getElementById("btnNewTask"),
  btnNewEvent: document.getElementById("btnNewEvent"),
};

function setView(view) {
  els.boardView.hidden = view !== "board";
  els.scheduleView.hidden = view !== "schedule";

  if (view === "board") tasks.renderBoard(els.boardView);

  if (view === "schedule") {
    els.scheduleView.innerHTML = `
      <div style="font-size:11px; letter-spacing:3px; text-transform:uppercase; color:rgba(0,0,0,.65);">
        schedule is next step
      </div>`;
  }
}

function renderProjectBar(){
  const bar = els.projectBar;
  if(!bar) return;

  const state = store.getState();
  const { projects: ps, tasks: ts, activeProjectId } = state;

  bar.innerHTML = "";

  for(const p of ps){
    const count = ts.filter(t => t.projectId === p.id).length;

    const chip = document.createElement("div");
    chip.className = "proj-chip" + (p.id === activeProjectId ? " is-active" : "");
    chip.dataset.pid = p.id;

    chip.innerHTML = `
      <span class="proj-chip__name">${String(p.name ?? "").toUpperCase()}</span>
      <span class="proj-chip__count">${count}</span>
      <button class="proj-chip__ctl" type="button" aria-label="manage columns">⚙</button>
      <button class="proj-chip__del" type="button" aria-label="delete project">×</button>
    `;

    // switch project (click chip but not buttons)
    chip.addEventListener("click", (e) => {
      if(e.target.closest(".proj-chip__del") || e.target.closest(".proj-chip__ctl")) return;

      store.patch((s) => { s.activeProjectId = p.id; });
      projects.renderSelect();
      document.dispatchEvent(new CustomEvent("planning:projectChanged", { detail: { id: p.id } }));
      renderProjectBar();
      tasks.renderBoard(els.boardView);
    });

    // manage columns
    chip.querySelector(".proj-chip__ctl")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      projects.openColumnsModal(p.id);
    });

    // delete project
    chip.querySelector(".proj-chip__del")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      projects.openDeleteModal(p.id);
    });

    // drop task onto project
    chip.addEventListener("dragover", (e) => {
      e.preventDefault();
      chip.classList.add("is-drop");
    });
    chip.addEventListener("dragleave", () => chip.classList.remove("is-drop"));
    chip.addEventListener("drop", (e) => {
      e.preventDefault();
      chip.classList.remove("is-drop");
      const taskId = e.dataTransfer.getData("text/taskId");
      if(!taskId) return;
      tasks.moveTaskToProject(taskId, p.id);
      renderProjectBar();
    });

    bar.appendChild(chip);
  }
}

function bootstrap() {
  // seed project
  store.ensureSeed();

  // projects dropdown
  projects.mount(els.projectSelect);

  // view switch
  els.viewSelect.addEventListener("change", () => setView(els.viewSelect.value));

  // search
  els.searchInput.addEventListener("input", () => {
    tasks.setSearch(els.searchInput.value);
    tasks.renderBoard(els.boardView);
  });

  // actions
  els.btnNewProject.addEventListener("click", () => projects.openCreateModal());
  els.btnNewTask.addEventListener("click", () => tasks.openCreateModal());
  els.btnNewEvent.addEventListener("click", () => ui.toast("schedule next"));

  // project bar
  renderProjectBar();
  document.addEventListener("planning:projectChanged", renderProjectBar);
  document.addEventListener("planning:tasksChanged", renderProjectBar);

  // init
  els.viewSelect.value = "board";
  setView("board");
}

bootstrap();
