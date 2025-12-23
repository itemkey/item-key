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

  // init
  els.viewSelect.value = "board";
  setView("board");
}

bootstrap();
