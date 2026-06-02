const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

const STORAGE = {
  USER: "q_user",
  THEME: "q_theme_v1",
  SCORES: "scores_v1",
  PINS: "q_pins_v2",
  DOCK: "q_dock_v2",
  FILTER: "q_filter_v2",
  NOTES: "q_notes_v1",
  TODOS: "q_todos_v1"
};

const LOCK_PASSWORD = "1234";

const appsEl = $("#apps");
const dockEl = $("#dock");
const windowLayer = $("#windowLayer");
const launcher = $("#launcher");
const contextMenu = $("#contextMenu");

let currentFilter = localStorage.getItem(STORAGE.FILTER) || "all";
let currentSearch = "";
let runningApps = new Set();
let zCounter = 200;
let contextApp = null;
let longPressTimer = null;

const APP_META = {
  browser:{ title:"Browser", icon:"fa-solid fa-globe", category:"web", desc:"Simple web browser" },
  notes:{ title:"Notes", icon:"fa-solid fa-note-sticky", category:"productivity", desc:"Save quick notes" },
  todo:{ title:"To-Do", icon:"fa-solid fa-list-check", category:"productivity", desc:"Task manager" },
  files:{ title:"Files", icon:"fa-solid fa-folder-open", category:"productivity", desc:"Pick and list local files" },
  gallery:{ title:"Gallery", icon:"fa-solid fa-image", category:"media", desc:"Image preview gallery" },
  music:{ title:"Music", icon:"fa-solid fa-music", category:"media", desc:"Audio player" },
  weather:{ title:"Weather", icon:"fa-solid fa-cloud-sun", category:"web", desc:"Weather-style widget" },
  terminal:{ title:"Terminal", icon:"fa-solid fa-terminal", category:"system", desc:"Fake command terminal" },
  calc:{ title:"Calculator", icon:"fa-solid fa-calculator", category:"productivity", desc:"Calculator" },
  settings:{ title:"Settings", icon:"fa-solid fa-gear", category:"system", desc:"Theme settings" },
  system:{ title:"System", icon:"fa-solid fa-microchip", category:"system", desc:"System info" },
  clock:{ title:"Clock", icon:"fa-regular fa-clock", category:"system", desc:"Live clock" },
  phone:{ title:"Phone", icon:"fa-solid fa-phone", category:"productivity", desc:"Phone simulation" },
  leaderboard:{ title:"Leaderboard", icon:"fa-solid fa-trophy", category:"games", desc:"Game scores" },

  ttt:{ title:"TicTacToe", icon:"fa-solid fa-table-cells-large", category:"games", desc:"Play vs AI" },
  sudoku:{ title:"Sudoku", icon:"fa-solid fa-border-all", category:"games", desc:"Sudoku puzzle" },
  guess:{ title:"Guess", icon:"fa-solid fa-wand-magic-sparkles", category:"games", desc:"Guess number" },
  rps:{ title:"RPS", icon:"fa-solid fa-hand-fist", category:"games", desc:"Rock Paper Scissors" },
  reaction:{ title:"Reaction", icon:"fa-solid fa-bolt-lightning", category:"games", desc:"Reaction test" },
  memory:{ title:"Memory", icon:"fa-solid fa-brain", category:"games", desc:"Memory cards" },
  snake:{ title:"Snake", icon:"fa-solid fa-staff-snake", category:"games", desc:"Snake game" },
  click:{ title:"Click", icon:"fa-solid fa-hand-pointer", category:"games", desc:"Click speed" },

  developer:{ title:"Developer", icon:"fa-solid fa-user-gear", category:"system", desc:"Developer info" },
  shutdown:{ title:"Shutdown", icon:"fa-solid fa-power-off", category:"system", desc:"Close system" }
};

const DEFAULT_DOCK = ["browser","notes","todo","music","settings","leaderboard"];

/* ---------- Boot / Lock / Login ---------- */
setTimeout(() => {
  $("#boot").style.display = "none";
  $("#lockScreen").style.display = "flex";
  updateClocks();
}, 1800);

function updateClocks(){
  const now = new Date();
  const hh = String(now.getHours()).padStart(2,"0");
  const mm = String(now.getMinutes()).padStart(2,"0");
  const ss = String(now.getSeconds()).padStart(2,"0");

  $("#lockTime") && ($("#lockTime").textContent = `${hh}:${mm}`);
  $("#topClock") && ($("#topClock").textContent = `${hh}:${mm}`);
  $("#widgetTime") && ($("#widgetTime").textContent = `${hh}:${mm}`);
  $("#lockDate") && ($("#lockDate").textContent = now.toLocaleDateString("fa-IR", {
    weekday:"long", year:"numeric", month:"long", day:"numeric"
  }));

  const dc = $("#digitalClock");
  if(dc) dc.textContent = `${hh}:${mm}:${ss}`;

  const sec=$("#cSecond"), min=$("#cMinute"), hr=$("#cHour");
  if(sec && min && hr){
    const s = now.getSeconds();
    const m = now.getMinutes();
    const h = now.getHours();
    sec.style.transform = `rotate(${s*6 - 90}deg)`;
    min.style.transform = `rotate(${m*6 + s*0.1 - 90}deg)`;
    hr.style.transform = `rotate(${(h%12)*30 + m*0.5 - 90}deg)`;
  }
}
setInterval(updateClocks, 1000);

let startY = 0;
$("#lockScreen").addEventListener("touchstart", e => startY = e.touches[0].clientY);
$("#lockScreen").addEventListener("touchend", e => {
  const endY = e.changedTouches[0].clientY;
  if(startY - endY > 80) showPassword();
});
$("#lockScreen").addEventListener("mousedown", e => startY = e.clientY);
$("#lockScreen").addEventListener("mouseup", e => {
  if(startY - e.clientY > 80) showPassword();
});

function showPassword(){
  $("#lockHint").textContent = "Enter 1234";
  $("#passwordBox").classList.remove("hidden");
}
function unlock(){
  if($("#lockPass").value === LOCK_PASSWORD){
    $("#lockError").textContent = "";
    $("#lockScreen").style.opacity = "0";
    setTimeout(() => {
      $("#lockScreen").style.display = "none";
      $("#login").style.display = "flex";
    }, 400);
  }else{
    $("#lockError").textContent = "❌ Wrong Password";
  }
}
$("#unlockBtn").addEventListener("click", unlock);

function login(){
  const u = $("#username").value.trim();
  if(!u) return alert("Enter a username");
  localStorage.setItem(STORAGE.USER, u);
  $("#widgetUser").textContent = u;
  $("#login").style.display = "none";
  $("#desktop").classList.remove("hidden");
  renderApps();
  renderDock();
}
$("#loginBtn").addEventListener("click", login);

/* ---------- Helpers ---------- */
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}
function getStoredArray(key, fallback=[]){
  try{
    const v = JSON.parse(localStorage.getItem(key) || "null");
    return Array.isArray(v) ? v : fallback;
  }catch{return fallback;}
}
function setStoredArray(key, arr){
  localStorage.setItem(key, JSON.stringify(arr));
}
function getPins(){ return getStoredArray(STORAGE.PINS, []); }
function setPins(v){ setStoredArray(STORAGE.PINS, v); }
function getDock(){ const d = getStoredArray(STORAGE.DOCK, []); return d.length ? d : DEFAULT_DOCK; }
function setDock(v){ setStoredArray(STORAGE.DOCK, v); }
function isPinned(key){ return getPins().includes(key); }
function isInDock(key){ return getDock().includes(key); }

/* ---------- Render Apps ---------- */
function visibleApps(){
  let list = Object.entries(APP_META).map(([key, meta]) => ({ key, ...meta }));
  const pins = getPins();

  list.sort((a,b)=>{
    const ap = pins.includes(a.key) ? 1 : 0;
    const bp = pins.includes(b.key) ? 1 : 0;
    if(bp !== ap) return bp - ap;
    return a.title.localeCompare(b.title);
  });

  if(currentFilter === "pinned") list = list.filter(a => pins.includes(a.key));
  else if(currentFilter !== "all") list = list.filter(a => a.category === currentFilter);

  if(currentSearch){
    list = list.filter(a =>
      `${a.title} ${a.category} ${a.desc}`.toLowerCase().includes(currentSearch)
    );
  }
  return list;
}

function renderApps(){
  const list = visibleApps();
  appsEl.innerHTML = list.map(app => `
    <button class="app" data-app="${app.key}" data-app-key="${app.key}">
      ${isPinned(app.key) ? `<span class="pin-badge"><i class="fa-solid fa-thumbtack"></i></span>` : ""}
      <span class="app-ic"><i class="${app.icon}"></i></span>
      <span class="app-tx">${escapeHtml(app.title)}</span>
      <span class="app-meta">${escapeHtml(app.category)}</span>
      ${runningApps.has(app.key) ? `<span class="run-indicator"></span>` : ""}
    </button>
  `).join("");
}

function renderDock(){
  dockEl.innerHTML = getDock().filter(k => APP_META[k]).map(key => `
    <button class="dock-item ${runningApps.has(key) ? "running" : ""}" data-dock-app="${key}">
      <i class="${APP_META[key].icon}"></i>
      <span>${APP_META[key].title}</span>
    </button>
  `).join("");
}

$("#appSearch").addEventListener("input", e => {
  currentSearch = e.target.value.trim().toLowerCase();
  renderApps();
});
$("#filters").addEventListener("click", e => {
  const btn = e.target.closest(".filter");
  if(!btn) return;
  currentFilter = btn.dataset.filter;
  localStorage.setItem(STORAGE.FILTER, currentFilter);
  $$(".filter").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderApps();
});

/* ---------- Window Manager ---------- */
function createWindow(appKey, title, icon, html, options={}){
  const existing = $(`.window[data-window="${appKey}"]`);
  if(existing){
    focusWindow(existing);
    if(existing.classList.contains("minimized")) existing.classList.remove("minimized");
    return existing;
  }

  const win = document.createElement("div");
  win.className = "window";
  win.dataset.window = appKey;
  win.style.top = options.top || `${90 + Math.random()*70}px`;
  win.style.left = options.left || `${Math.max(20, 70 + Math.random()*120)}px`;
  win.style.zIndex = ++zCounter;

  win.innerHTML = `
    <div class="window-head">
      <div class="window-title">
        <i class="${icon}"></i>
        <span>${escapeHtml(title)}</span>
      </div>
      <div class="window-actions">
        <button class="win-btn" data-win-act="min"><i class="fa-solid fa-window-minimize"></i></button>
        <button class="win-btn" data-win-act="max"><i class="fa-regular fa-square"></i></button>
        <button class="win-btn" data-win-act="close"><i class="fa-solid fa-xmark"></i></button>
      </div>
    </div>
    <div class="window-body">${html}</div>
  `;

  windowLayer.appendChild(win);
  makeDraggable(win);
  bindWindowActions(win, appKey);
  focusWindow(win);

  runningApps.add(appKey);
  renderApps();
  renderDock();
  updateOpenWindows();

  return win;
}

function focusWindow(win){
  $$(".window").forEach(w => w.style.zIndex = 200 + [...$$(".window")].indexOf(w));
  win.style.zIndex = ++zCounter;
}
windowLayer.addEventListener("mousedown", e => {
  const win = e.target.closest(".window");
  if(win) focusWindow(win);
});

function bindWindowActions(win, appKey){
  win.addEventListener("click", e => {
    const btn = e.target.closest("[data-win-act]");
    if(!btn) return;
    const act = btn.dataset.winAct;

    if(act === "min") win.classList.add("minimized");
    if(act === "max") win.classList.toggle("maximized");
    if(act === "close"){
      win.remove();
      runningApps.delete(appKey);
      renderApps();
      renderDock();
      updateOpenWindows();
    }
  });
}

function makeDraggable(win){
  const head = $(".window-head", win);
  let dragging = false, offsetX = 0, offsetY = 0;

  head.addEventListener("mousedown", e => {
    if(win.classList.contains("maximized")) return;
    dragging = true;
    focusWindow(win);
    offsetX = e.clientX - win.offsetLeft;
    offsetY = e.clientY - win.offsetTop;
  });

  document.addEventListener("mousemove", e => {
    if(!dragging) return;
    win.style.left = `${Math.max(0, e.clientX - offsetX)}px`;
    win.style.top = `${Math.max(62, e.clientY - offsetY)}px`;
  });

  document.addEventListener("mouseup", () => dragging = false);

  head.addEventListener("touchstart", e => {
    if(win.classList.contains("maximized")) return;
    const t = e.touches[0];
    dragging = true;
    focusWindow(win);
    offsetX = t.clientX - win.offsetLeft;
    offsetY = t.clientY - win.offsetTop;
  }, {passive:true});

  document.addEventListener("touchmove", e => {
    if(!dragging) return;
    const t = e.touches[0];
    win.style.left = `${Math.max(0, t.clientX - offsetX)}px`;
    win.style.top = `${Math.max(62, t.clientY - offsetY)}px`;
  }, {passive:true});

  document.addEventListener("touchend", () => dragging = false);
}

function updateOpenWindows(){
  $("#widgetWindows").textContent = $$(".window").length;
}

/* ---------- App Openers ---------- */
function openApp(key){
  const map = {
    browser: openBrowser,
    notes: openNotes,
    todo: openTodo,
    files: openFiles,
    gallery: openGallery,
    music: openMusic,
    weather: openWeather,
    terminal: openTerminal,
    calc: openCalc,
    settings: openSettings,
    system: openSystem,
    clock: openClock,
    phone: openPhone,
    leaderboard: openLeaderboard,
    ttt: openTicTacToe,
    sudoku: openSudoku,
    guess: openNumberGuess,
    rps: openRPS,
    reaction: openReaction,
    memory: openMemory,
    snake: openSnake,
    click: openClickGame,
    developer: openDeveloper,
    shutdown: shutdownSystem
  };
  map[key]?.();
}

appsEl.addEventListener("click", e => {
  const app = e.target.closest("[data-app]");
  if(!app) return;
  openApp(app.dataset.app);
});
dockEl.addEventListener("click", e => {
  const app = e.target.closest("[data-dock-app]");
  if(!app) return;
  openApp(app.dataset.dockApp);
});

/* ---------- Context Menu ---------- */
function openContextMenu(x, y, appKey){
  contextApp = appKey;
  contextMenu.classList.remove("hidden");
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
}
function closeContextMenu(){
  contextMenu.classList.add("hidden");
  contextApp = null;
}

appsEl.addEventListener("contextmenu", e => {
  const app = e.target.closest("[data-app-key]");
  if(!app) return;
  e.preventDefault();
  openContextMenu(e.clientX, e.clientY, app.dataset.appKey);
});

appsEl.addEventListener("touchstart", e => {
  const app = e.target.closest("[data-app-key]");
  if(!app) return;
  const t = e.touches[0];
  longPressTimer = setTimeout(() => {
    openContextMenu(t.clientX, t.clientY, app.dataset.appKey);
  }, 550);
}, {passive:true});
appsEl.addEventListener("touchend", () => clearTimeout(longPressTimer));
appsEl.addEventListener("touchmove", () => clearTimeout(longPressTimer));

document.addEventListener("click", e => {
  if(!e.target.closest("#contextMenu")) closeContextMenu();
});

contextMenu.addEventListener("click", e => {
  const btn = e.target.closest("[data-cm]");
  if(!btn || !contextApp) return;
  const action = btn.dataset.cm;

  if(action === "open") openApp(contextApp);
  if(action === "pin"){
    const pins = getPins();
    setPins(pins.includes(contextApp) ? pins.filter(x => x !== contextApp) : [contextApp, ...pins]);
    renderApps();
  }
  if(action === "dock"){
    const dock = getDock();
    setDock(dock.includes(contextApp) ? dock.filter(x => x !== contextApp) : [...dock, contextApp]);
    renderDock();
  }
  if(action === "info"){
    const a = APP_META[contextApp];
    createWindow("info_"+contextApp, `${a.title} Info`, a.icon, `
      <h3 class="neon-title">${escapeHtml(a.title)}</h3>
      <p class="muted" style="margin-top:10px">Category: ${escapeHtml(a.category)}</p>
      <p style="margin-top:12px;line-height:1.9">${escapeHtml(a.desc)}</p>
    `);
  }

  closeContextMenu();
});

/* ---------- Launcher ---------- */
$("#quickLauncherBtn").addEventListener("click", () => {
  launcher.classList.remove("hidden");
  $("#launcherSearch").value = "";
  renderLauncherResults("");
  $("#launcherSearch").focus();
});
launcher.addEventListener("click", e => {
  if(e.target === launcher) launcher.classList.add("hidden");
});
$("#launcherSearch").addEventListener("input", e => {
  renderLauncherResults(e.target.value.trim().toLowerCase());
});
function renderLauncherResults(q){
  const results = Object.entries(APP_META)
    .map(([key,meta]) => ({key,...meta}))
    .filter(a => !q || `${a.title} ${a.category} ${a.desc}`.toLowerCase().includes(q));

  $("#launcherResults").innerHTML = results.map(a => `
    <div class="launcher-item" data-launcher-app="${a.key}">
      <i class="${a.icon}"></i> ${escapeHtml(a.title)}
      <div class="muted" style="font-size:.84rem;margin-top:6px">${escapeHtml(a.desc)}</div>
    </div>
  `).join("");
}
$("#launcherResults").addEventListener("click", e => {
  const item = e.target.closest("[data-launcher-app]");
  if(!item) return;
  launcher.classList.add("hidden");
  openApp(item.dataset.launcherApp);
});

/* ---------- Top buttons ---------- */
$("#settingsBtn").addEventListener("click", () => openApp("settings"));
$("#shutdownBtn").addEventListener("click", () => openApp("shutdown"));

/* ---------- Sound ---------- */
window.addEventListener("load", () => {
  const music = $("#welcomeMusic");
  if(!music) return;
  music.volume = 0.5;
  music.play().catch(() => {
    document.addEventListener("click", () => music.play(), { once:true });
  });
});

/* ================= APPS ================= */

/* Browser */
function openBrowser(){
  const win = createWindow("browser", "Browser", APP_META.browser.icon, `
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <input id="browserUrl" placeholder="Search / URL" style="direction:ltr;flex:1" />
      <button class="btn" id="browserGo">Go</button>
    </div>
    <iframe id="browserFrame" src="https://duckduckgo.com" style="margin-top:12px;width:100%;height:420px;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:#000"></iframe>
    <p class="muted" style="margin-top:8px;font-size:.8rem">بعضی سایت‌ها داخل iframe باز نمی‌شوند.</p>
  `);
  const body = $(".window-body", win);
  $("#browserGo", body).addEventListener("click", () => {
    const q = $("#browserUrl", body).value.trim();
    const frame = $("#browserFrame", body);
    if(!q) frame.src = "https://duckduckgo.com";
    else{
      const isUrl = /^https?:\/\//i.test(q) || q.includes(".");
      frame.src = isUrl ? (q.startsWith("http") ? q : `https://${q}`) : `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
    }
  });
}

/* Notes */
function openNotes(){
  const saved = localStorage.getItem(STORAGE.NOTES) || "";
  const win = createWindow("notes", "Notes", APP_META.notes.icon, `
    <textarea class="note-area" id="notesArea" placeholder="Write your notes...">${escapeHtml(saved)}</textarea>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:12px">
      <button class="btn" id="saveNotesBtn">Save</button>
      <button class="btn btn-ghost" id="clearNotesBtn">Clear</button>
    </div>
  `);
  const body = $(".window-body", win);
  $("#saveNotesBtn", body).addEventListener("click", () => {
    localStorage.setItem(STORAGE.NOTES, $("#notesArea", body).value);
    alert("✅ Notes saved");
  });
  $("#clearNotesBtn", body).addEventListener("click", () => {
    $("#notesArea", body).value = "";
    localStorage.removeItem(STORAGE.NOTES);
  });
}

/* Todo */
function openTodo(){
  const todos = getStoredArray(STORAGE.TODOS, []);
  const win = createWindow("todo", "To-Do", APP_META.todo.icon, `
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <input id="todoInput" placeholder="New task..." />
      <button class="btn" id="todoAddBtn">Add</button>
    </div>
    <div id="todoList" class="todo-list"></div>
  `);
  const body = $(".window-body", win);

  function saveTodos(list){
    localStorage.setItem(STORAGE.TODOS, JSON.stringify(list));
  }
  function renderTodos(){
    const list = getStoredArray(STORAGE.TODOS, []);
    $("#todoList", body).innerHTML = list.map((item, i) => `
      <div class="todo-item">
        <span>${escapeHtml(item)}</span>
        <button class="btn btn-ghost" data-del="${i}">Delete</button>
      </div>
    `).join("");
  }

  if(!localStorage.getItem(STORAGE.TODOS)) saveTodos(todos);
  renderTodos();

  $("#todoAddBtn", body).addEventListener("click", () => {
    const input = $("#todoInput", body);
    const v = input.value.trim();
    if(!v) return;
    const list = getStoredArray(STORAGE.TODOS, []);
    list.push(v);
    saveTodos(list);
    input.value = "";
    renderTodos();
  });

  body.addEventListener("click", e => {
    const del = e.target.closest("[data-del]");
    if(!del) return;
    const i = +del.dataset.del;
    const list = getStoredArray(STORAGE.TODOS, []);
    list.splice(i,1);
    saveTodos(list);
    renderTodos();
  });
}

/* Files */
function openFiles(){
  const win = createWindow("files", "Files", APP_META.files.icon, `
    <div class="file-input">
      <input type="file" multiple id="filePick">
      <label class="file-btn" for="filePick">Choose Files</label>
      <span class="file-name" id="fileName">No file</span>
    </div>
    <ul id="fileList" style="margin-top:14px;line-height:1.9;max-height:320px;overflow:auto"></ul>
  `);
  const body = $(".window-body", win);
  $("#filePick", body).addEventListener("change", e => {
    const files = [...e.target.files || []];
    $("#fileName", body).textContent = files.length ? `${files.length} file(s)` : "No file";
    $("#fileList", body).innerHTML = files.map(f => `<li>${escapeHtml(f.name)}</li>`).join("");
  });
}

/* Gallery */
function openGallery(){
  const win = createWindow("gallery", "Gallery", APP_META.gallery.icon, `
    <div class="file-input">
      <input type="file" accept="image/*" multiple id="imgPick">
      <label class="file-btn" for="imgPick">Choose Images</label>
      <span class="file-name" id="imgName">No image</span>
    </div>
    <div id="galleryGrid" class="gallery-grid"></div>
  `);
  const body = $(".window-body", win);
  $("#imgPick", body).addEventListener("change", e => {
    const files = [...e.target.files || []];
    $("#imgName", body).textContent = files.length ? `${files.length} image(s)` : "No image";
    $("#galleryGrid", body).innerHTML = files.map(file => `
      <img src="${URL.createObjectURL(file)}" alt="${escapeHtml(file.name)}" />
    `).join("");
  });
}

/* Music */
function openMusic(){
  const win = createWindow("music", "Music", APP_META.music.icon, `
    <div class="file-input">
      <input type="file" accept="audio/*" id="musicFile">
      <label class="file-btn" for="musicFile">Choose Audio</label>
      <span class="file-name" id="musicName">No file</span>
    </div>
    <audio id="audioPlayer" controls style="width:100%;margin-top:14px"></audio>
  `);
  const body = $(".window-body", win);
  $("#musicFile", body).addEventListener("change", e => {
    const f = e.target.files?.[0];
    $("#musicName", body).textContent = f ? f.name : "No file";
    if(f) $("#audioPlayer", body).src = URL.createObjectURL(f);
  });
}

/* Weather */
function openWeather(){
  createWindow("weather", "Weather", APP_META.weather.icon, `
    <div class="weather-box">
      <div class="weather-temp">${20 + Math.floor(Math.random()*15)}°C</div>
      <div style="font-size:1.2rem">Tehran</div>
      <div class="muted">Sunny / Futuristic Forecast</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px">
        <div class="glass" style="padding:12px">Humidity<br><b>${40 + Math.floor(Math.random()*30)}%</b></div>
        <div class="glass" style="padding:12px">Wind<br><b>${5 + Math.floor(Math.random()*20)} km/h</b></div>
        <div class="glass" style="padding:12px">UV<br><b>${1 + Math.floor(Math.random()*10)}</b></div>
      </div>
    </div>
  `);
}

/* Terminal */
function openTerminal(){
  const win = createWindow("terminal", "Terminal", APP_META.terminal.icon, `
    <div class="terminal" id="terminalBox">
      <div class="terminal-line">QMOS Terminal v2</div>
      <div class="terminal-line">Type: help</div>
    </div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <input id="termInput" placeholder="Enter command..." style="direction:ltr" />
      <button class="btn" id="termRun">Run</button>
    </div>
  `);
  const body = $(".window-body", win);

  function print(line){
    const box = $("#terminalBox", body);
    box.innerHTML += `<div class="terminal-line">${escapeHtml(line)}</div>`;
    box.scrollTop = box.scrollHeight;
  }

  $("#termRun", body).addEventListener("click", () => {
    const input = $("#termInput", body);
    const cmd = input.value.trim().toLowerCase();
    if(!cmd) return;
    print("> " + cmd);

    if(cmd === "help") print("Commands: help, user, clear, date, apps");
    else if(cmd === "user") print(localStorage.getItem(STORAGE.USER) || "Guest");
    else if(cmd === "date") print(new Date().toString());
    else if(cmd === "apps") print(Object.keys(APP_META).join(", "));
    else if(cmd === "clear") $("#terminalBox", body).innerHTML = "";
    else print("Command not found");
    input.value = "";
  });
}

/* Calc */
let expr = "";
function openCalc(){
  const win = createWindow("calc", "Calculator", APP_META.calc.icon, `
    <div id="calcScr" style="background:#000;padding:14px;border-radius:14px;border:1px solid rgba(255,255,255,.08);font-size:1.2rem">0</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px">
      ${["7","8","9","/","4","5","6","*","1","2","3","-","0",".","C","+"].map(x => `<button class="btn" data-calc="${x}">${x}</button>`).join("")}
      <button class="btn" id="calcEq" style="grid-column:1/5">=</button>
    </div>
  `);
  const body = $(".window-body", win);
  expr = "";

  body.addEventListener("click", e => {
    const b = e.target.closest("[data-calc]");
    if(!b) return;
    const v = b.dataset.calc;
    if(v === "C"){ expr = ""; $("#calcScr", body).textContent = "0"; return; }
    expr += v;
    $("#calcScr", body).textContent = expr;
  });
  $("#calcEq", body).addEventListener("click", () => {
    try{
      expr = String(eval(expr));
      $("#calcScr", body).textContent = expr;
    }catch{
      expr = "";
      $("#calcScr", body).textContent = "Err";
    }
  });
}

/* Settings */
function openSettings(){
  const styles = getComputedStyle(document.documentElement);
  const cyan = styles.getPropertyValue("--neon-cyan").trim() || "#00fff0";
  const pink = styles.getPropertyValue("--neon-pink").trim() || "#ff2bdc";
  const radius = parseInt(styles.getPropertyValue("--radius")) || 22;
  const font = parseInt(styles.getPropertyValue("--font")) || 16;

  const win = createWindow("settings", "Settings", APP_META.settings.icon, `
    <div style="display:grid;gap:14px;max-width:520px">
      <div><label>Neon Cyan</label><input type="color" id="cyanPick" value="${cyan}"></div>
      <div><label>Neon Pink</label><input type="color" id="pinkPick" value="${pink}"></div>
      <div><label>Radius</label><input type="range" min="10" max="34" id="radiusRange" value="${radius}"></div>
      <div><label>Font Size</label><input type="range" min="12" max="22" id="fontRange" value="${font}"></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn" id="saveThemeBtn">Save Theme</button>
        <button class="btn btn-ghost" id="resetThemeBtn">Reset</button>
      </div>
    </div>
  `);
  const body = $(".window-body", win);

  const apply = () => {
    document.documentElement.style.setProperty("--neon-cyan", $("#cyanPick", body).value);
    document.documentElement.style.setProperty("--neon-pink", $("#pinkPick", body).value);
    document.documentElement.style.setProperty("--radius", $("#radiusRange", body).value + "px");
    document.documentElement.style.setProperty("--font", $("#fontRange", body).value + "px");
  };

  ["cyanPick","pinkPick","radiusRange","fontRange"].forEach(id => {
    $("#"+id, body).addEventListener("input", apply);
  });

  $("#saveThemeBtn", body).addEventListener("click", () => {
    localStorage.setItem(STORAGE.THEME, JSON.stringify({
      cyan: $("#cyanPick", body).value,
      pink: $("#pinkPick", body).value,
      radius: $("#radiusRange", body).value,
      font: $("#fontRange", body).value
    }));
    alert("✅ Theme saved");
  });

  $("#resetThemeBtn", body).addEventListener("click", () => {
    localStorage.removeItem(STORAGE.THEME);
    location.reload();
  });
}
(function loadTheme(){
  try{
    const t = JSON.parse(localStorage.getItem(STORAGE.THEME) || "null");
    if(!t) return;
    if(t.cyan) document.documentElement.style.setProperty("--neon-cyan", t.cyan);
    if(t.pink) document.documentElement.style.setProperty("--neon-pink", t.pink);
    if(t.radius) document.documentElement.style.setProperty("--radius", t.radius + "px");
    if(t.font) document.documentElement.style.setProperty("--font", t.font + "px");
  }catch{}
})();

/* System */
function openSystem(){
  createWindow("system", "System", APP_META.system.icon, `
    <ul style="line-height:2">
      <li>User: ${escapeHtml(localStorage.getItem(STORAGE.USER) || "Guest")}</li>
      <li>Apps: ${Object.keys(APP_META).length}</li>
      <li>Pinned: ${getPins().length}</li>
      <li>Dock: ${getDock().length}</li>
      <li>Open windows: ${$$(".window").length}</li>
      <li>Mode: ${location.protocol === "file:" ? "Offline (file://)" : "Server (http/https)"}</li>
    </ul>
  `);
}

/* Clock */
function openClock(){
  createWindow("clock", "Clock", APP_META.clock.icon, `
    <div style="display:flex;justify-content:center;padding:20px">
      <div style="position:relative;width:200px;height:200px;border-radius:50%;background:#000;border:4px solid rgba(0,255,240,.55);box-shadow:0 0 28px rgba(0,255,240,.25)">
        <div id="cHour" style="position:absolute;top:50%;left:50%;width:45px;height:5px;background:var(--neon-cyan);transform-origin:0 50%"></div>
        <div id="cMinute" style="position:absolute;top:50%;left:50%;width:65px;height:3px;background:var(--neon-cyan);transform-origin:0 50%"></div>
        <div id="cSecond" style="position:absolute;top:50%;left:50%;width:80px;height:2px;background:var(--neon-red);transform-origin:0 50%"></div>
        <div style="position:absolute;top:50%;left:50%;width:12px;height:12px;background:var(--neon-cyan);border-radius:50%;transform:translate(-50%,-50%)"></div>
      </div>
    </div>
    <div id="digitalClock" style="text-align:center;font-size:1.6rem;color:var(--neon-cyan);font-family:monospace">00:00:00</div>
  `);
  updateClocks();
}

/* Phone */
function openPhone(){
  createWindow("phone", "Phone", APP_META.phone.icon, `
    <div style="display:grid;gap:10px;justify-items:center">
      <input id="phoneNumber" placeholder="شماره..." inputmode="tel" style="max-width:340px" />
      <button class="btn" id="callBtn">Call</button>
    </div>
  `).querySelector("#callBtn").addEventListener("click", () => {
    alert("📞 Calling...");
  });
}

/* Leaderboard */
const GAMES = [
  {key:"Snake", label:"Snake"},
  {key:"Click", label:"Click Speed"},
  {key:"Reaction", label:"Reaction"},
  {key:"Memory", label:"Memory"},
  {key:"TicTacToe", label:"Tic Tac Toe"},
  {key:"Sudoku", label:"Sudoku"},
  {key:"Guess", label:"Guess Game"},
  {key:"RPS", label:"Rock Paper"},
];
function loadScores(){
  try{return JSON.parse(localStorage.getItem(STORAGE.SCORES) || "[]");}
  catch{return [];}
}
function saveScore(gameKey, score){
  const user = localStorage.getItem(STORAGE.USER) || "Guest";
  const all = loadScores();
  all.push({user, game:gameKey, score:Number(score)||0, time:Date.now()});
  localStorage.setItem(STORAGE.SCORES, JSON.stringify(all));
}
function openLeaderboard(){
  const all = loadScores();
  const html = `
    <h3 class="neon-title">Leaderboard</h3>
    <div style="margin-top:14px;line-height:1.9">
      ${GAMES.map(g => {
        const top = all.filter(s => s.game===g.key).sort((a,b)=>b.score-a.score).slice(0,3);
        return `
          <h4 style="color:var(--neon-pink);margin-top:14px">${g.label}</h4>
          ${top.length ? `<ol>${top.map(s => `<li>${escapeHtml(s.user)} — <b>${s.score}</b></li>`).join("")}</ol>` : `<div class="muted">No score yet</div>`}
        `;
      }).join("")}
    </div>
    <button class="btn" id="resetScoresBtn" style="margin-top:16px">Reset Scores</button>
  `;
  const win = createWindow("leaderboard", "Leaderboard", APP_META.leaderboard.icon, html);
  const body = $(".window-body", win);
  $("#resetScoresBtn", body).addEventListener("click", () => {
    if(!confirm("Reset all scores?")) return;
    localStorage.removeItem(STORAGE.SCORES);
    win.remove();
    runningApps.delete("leaderboard");
    renderApps(); renderDock(); updateOpenWindows();
    openLeaderboard();
  });
}

/* Developer */
function openDeveloper(){
  createWindow("developer", "Developer", APP_META.developer.icon, `
    <h2 class="neon-title">Developed By SA || Saleh Amoo</h2>
    <p style="margin-top:12px;line-height:1.9">QMOS Ultimate v2 — futuristic web desktop OS.</p>
  `);
}

/* Shutdown */
function shutdownSystem(){
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:black;display:flex;align-items:center;justify-content:center;z-index:99999";
  overlay.innerHTML = `<img src="SA.png" style="width:120px;height:120px;animation:zoom .8s ease forwards">`;
  document.body.appendChild(overlay);
  setTimeout(() => history.back(), 800);
}

/* ================= GAMES ================= */
function playBeep(){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 700;
    g.gain.value = 0.08;
    o.start();
    o.stop(ctx.currentTime + 0.1);
  }catch{}
}

/* Snake */
let snakeM, foodM, dirM, scoreM, snakeTimer;
function openSnake(){
  const win = createWindow("snake", "Snake", APP_META.snake.icon, `
    <canvas id="snakeM" width="300" height="300" style="background:black;border-radius:18px;border:1px solid rgba(255,255,255,.08);max-width:100%"></canvas>
    <p id="scoreM" class="muted" style="margin-top:10px">Score: 0</p>
    <div style="display:grid;grid-template-columns:repeat(3,64px);gap:10px;justify-content:center;margin-top:12px">
      <div></div><button class="btn" data-dir="up">↑</button><div></div>
      <button class="btn" data-dir="left">←</button><div></div><button class="btn" data-dir="right">→</button>
      <div></div><button class="btn" data-dir="down">↓</button><div></div>
    </div>
  `);
  const body = $(".window-body", win);
  const canvas = $("#snakeM", body);
  const ctx = canvas.getContext("2d");

  snakeM = [{x:150,y:150}];
  foodM = randomFood(canvas);
  dirM = {x:20,y:0};
  scoreM = 0;

  body.addEventListener("click", e => {
    const b = e.target.closest("[data-dir]");
    if(!b) return;
    const d = b.dataset.dir;
    if(d==="up") setSnakeDir(0,-20);
    if(d==="down") setSnakeDir(0,20);
    if(d==="left") setSnakeDir(-20,0);
    if(d==="right") setSnakeDir(20,0);
  });

  clearInterval(snakeTimer);
  snakeTimer = setInterval(() => snakeLoop(ctx, canvas, body), 170);
}
function setSnakeDir(x,y){
  if(dirM && dirM.x===-x && dirM.y===-y) return;
  dirM = {x,y};
}
function snakeLoop(ctx, c, body){
  const head = {x:snakeM[0].x+dirM.x, y:snakeM[0].y+dirM.y};
  if(head.x<0||head.y<0||head.x>=c.width||head.y>=c.height) return endSnake(body);
  if(snakeM.some((p,idx)=>idx>0 && p.x===head.x && p.y===head.y)) return endSnake(body);
  snakeM.unshift(head);

  if(head.x===foodM.x && head.y===foodM.y){
    scoreM++; playBeep(); foodM=randomFood(c);
  }else snakeM.pop();

  ctx.clearRect(0,0,c.width,c.height);
  ctx.fillStyle = "#00fff0"; snakeM.forEach(s=>ctx.fillRect(s.x,s.y,18,18));
  ctx.fillStyle = "#ff2bdc"; ctx.fillRect(foodM.x,foodM.y,18,18);
  $("#scoreM", body).textContent = `Score: ${scoreM}`;
}
function randomFood(c){
  const step=20;
  return {
    x:Math.floor(Math.random()*(c.width/step))*step,
    y:Math.floor(Math.random()*(c.height/step))*step
  };
}
function endSnake(body){
  clearInterval(snakeTimer);
  saveScore("Snake", scoreM);
  alert("Game Over | Score: " + scoreM);
}

/* Click */
let clickScore=0, clickTime=5, clickTimer=null;
function openClickGame(){
  const win = createWindow("click", "Click Speed", APP_META.click.icon, `
    <p class="muted">۵ ثانیه وقت داری</p>
    <h1 id="clickCount" style="margin-top:8px">0</h1>
    <button class="btn" id="clickBtn" style="font-size:1.4rem;margin:18px auto">Click</button>
    <p id="clickTime" class="muted">Time: 5</p>
  `);
  const body = $(".window-body", win);
  clickScore=0; clickTime=5;

  $("#clickBtn", body).addEventListener("click", ()=>{
    if(clickTime<=0) return;
    clickScore++;
    $("#clickCount", body).textContent = clickScore;
  });

  clearInterval(clickTimer);
  clickTimer = setInterval(()=>{
    clickTime--;
    $("#clickTime", body).textContent = "Time: " + clickTime;
    if(clickTime<=0){
      clearInterval(clickTimer);
      saveScore("Click", clickScore);
      alert("End | Score: " + clickScore);
    }
  },1000);
}

/* RPS */
function openRPS(){
  const win = createWindow("rps", "Rock Paper Scissors", APP_META.rps.icon, `
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      ${["Rock","Paper","Scissors"].map(x=>`<button class="btn" data-rps="${x}">${x}</button>`).join("")}
    </div>
    <div id="rpsResult" style="margin-top:14px"></div>
  `);
  const body = $(".window-body", win);
  body.addEventListener("click", e => {
    const b = e.target.closest("[data-rps]");
    if(!b) return;
    const user = b.dataset.rps;
    const ai = ["Rock","Paper","Scissors"][Math.floor(Math.random()*3)];
    let res = "Draw";
    if(user!==ai){
      if(
        (user==="Rock"&&ai==="Scissors") ||
        (user==="Paper"&&ai==="Rock") ||
        (user==="Scissors"&&ai==="Paper")
      ) res = "You won!";
      else res = "You lost!";
    }
    $("#rpsResult", body).innerHTML = `You: <b>${user}</b> | AI: <b>${ai}</b><br>${res}`;
    if(res==="You won!") saveScore("RPS",1);
  });
}

/* Reaction */
let reactionStart=0, reactionArmed=false;
function openReaction(){
  const win = createWindow("reaction", "Reaction Test", APP_META.reaction.icon, `
    <div id="reactionBox" style="margin:16px auto;width:240px;height:240px;background:#222;border-radius:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;border:1px solid rgba(255,255,255,.10)">wait...</div>
    <p id="reactionResult" class="muted"></p>
  `);
  const body = $(".window-body", win);
  const box = $("#reactionBox", body);
  const result = $("#reactionResult", body);
  reactionArmed = false;
  result.textContent = "";

  box.onclick = () => {
    if(!reactionArmed){ result.textContent = "❌ Too soon!"; return; }
    const ms = Date.now()-reactionStart;
    result.textContent = `⏱ Reaction: ${ms} ms`;
    saveScore("Reaction", Math.max(0,5000-ms));
    reactionArmed = false;
  };

  setTimeout(()=>{
    box.style.background = "var(--neon-green)";
    box.style.color = "#000";
    box.textContent = "CLICK!";
    reactionStart = Date.now();
    reactionArmed = true;
  }, Math.random()*2200 + 1500);
}

/* Memory */
let memFirst=null, memLock=false, memMatches=0, memMoves=0;
function openMemory(){
  memFirst=null; memLock=false; memMatches=0; memMoves=0;
  const icons=["⚛","🚀","💎","👾","⚛","🚀","💎","👾"].sort(()=>Math.random()-.5);
  const win = createWindow("memory", "Memory", APP_META.memory.icon, `
    <p id="memStat" class="muted">Moves: 0</p>
    <div id="mem" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px">
      ${icons.map(i=>`<button class="app" style="padding:18px;height:70px;color:transparent" data-val="${i}">${i}</button>`).join("")}
    </div>
  `);
  const body = $(".window-body", win);
  $("#mem", body).addEventListener("click", e => {
    const el = e.target.closest("[data-val]");
    if(!el || memLock || el.classList.contains("open")) return;
    const val = el.dataset.val;
    el.style.color = "#fff";
    el.classList.add("open");

    if(!memFirst){ memFirst = {el,val}; return; }

    memMoves++;
    $("#memStat", body).textContent = `Moves: ${memMoves}`;
    memLock = true;

    if(memFirst.val===val){
      memMatches++;
      memFirst = null;
      memLock = false;
      if(memMatches===4){
        saveScore("Memory", Math.max(0,100-memMoves));
        setTimeout(()=>alert("Completed!"),150);
      }
    }else{
      setTimeout(()=>{
        el.style.color = "transparent";
        memFirst.el.style.color = "transparent";
        el.classList.remove("open");
        memFirst.el.classList.remove("open");
        memFirst = null;
        memLock = false;
      },700);
    }
  });
}

/* TicTacToe */
let tttBoard=[], tttGameOver=false;
function openTicTacToe(){
  tttBoard = Array(9).fill(null);
  tttGameOver = false;
  const win = createWindow("ttt", "TicTacToe", APP_META.ttt.icon, `
    <p id="tttStatus" class="muted">Your turn (X)</p>
    <div id="tttBoard" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:360px;margin:16px auto"></div>
    <button class="btn" id="tttRestart">Restart</button>
  `);
  const body = $(".window-body", win);

  function render(){
    $("#tttBoard", body).innerHTML = tttBoard.map((v,i)=>`
      <button class="app" style="height:90px;font-size:2rem" data-ttt="${i}">${v||""}</button>
    `).join("");
  }
  function check(){
    const l=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for(const [a,b,c] of l){
      if(tttBoard[a] && tttBoard[a]===tttBoard[b] && tttBoard[a]===tttBoard[c]) return tttBoard[a];
    }
    return tttBoard.every(Boolean) ? "draw" : null;
  }
  function ai(){
    let free = tttBoard.map((v,i)=>v?null:i).filter(v=>v!==null);
    const move = free[Math.floor(Math.random()*free.length)];
    if(move!=null) tttBoard[move] = "O";
  }
  function update(){
    render();
    const w = check();
    if(w){
      tttGameOver = true;
      $("#tttStatus", body).textContent = w==="draw" ? "Draw" : (w==="X" ? "You won" : "AI won");
      if(w==="X") saveScore("TicTacToe",1);
    }
  }

  render();

  body.addEventListener("click", e => {
    const cell = e.target.closest("[data-ttt]");
    if(cell && !tttGameOver){
      const i = +cell.dataset.ttt;
      if(tttBoard[i]) return;
      tttBoard[i]="X";
      update();
      if(!tttGameOver){ setTimeout(()=>{ ai(); update(); },220); }
    }
    if(e.target.id === "tttRestart") openTicTacToe();
  });
}

/* Sudoku */
const sudokuPuzzle = [
  [5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],
  [8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],
  [0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]
];
let sudokuBoard = [];
function openSudoku(){
  sudokuBoard = JSON.parse(JSON.stringify(sudokuPuzzle));
  const win = createWindow("sudoku", "Sudoku", APP_META.sudoku.icon, `
    <div id="sudokuBoard" style="display:grid;grid-template-columns:repeat(9,1fr);gap:4px;max-width:380px;margin:0 auto"></div>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px">
      <button class="btn" id="sudokuCheck">Check</button>
      <button class="btn btn-ghost" id="sudokuNew">New</button>
    </div>
  `);
  const body = $(".window-body", win);

  function render(){
    $("#sudokuBoard", body).innerHTML = sudokuBoard.flatMap((row,y)=>
      row.map((val,x)=>{
        if(sudokuPuzzle[y][x]){
          return `<div class="glass" style="height:40px;display:flex;align-items:center;justify-content:center;color:var(--neon-pink)">${val}</div>`;
        }
        return `<input data-sx="${x}" data-sy="${y}" maxlength="1" style="height:40px;text-align:center" value="${val||""}">`;
      })
    ).join("");
  }
  render();

  body.addEventListener("input", e => {
    const inp = e.target.closest("[data-sx]");
    if(!inp) return;
    const x = +inp.dataset.sx, y = +inp.dataset.sy;
    const n = parseInt(inp.value);
    sudokuBoard[y][x] = isNaN(n) ? 0 : n;
  });

  $("#sudokuCheck", body).addEventListener("click", () => {
    for(let y=0;y<9;y++){
      for(let x=0;x<9;x++){
        if(!sudokuBoard[y][x]) return alert("جدول کامل نیست");
      }
    }
    saveScore("Sudoku",1);
    alert("✅ Completed");
  });
  $("#sudokuNew", body).addEventListener("click", openSudoku);
}

/* Guess */
let secretNumber=0, attempts=0;
function openNumberGuess(){
  secretNumber=Math.floor(Math.random()*100)+1;
  attempts=0;
  const win = createWindow("guess", "Guess Game", APP_META.guess.icon, `
    <p class="muted">عدد بین 1 تا 100</p>
    <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px">
      <input id="guessInput" type="number" min="1" max="100" placeholder="حدس..." />
      <button class="btn" id="guessBtn">Guess</button>
    </div>
    <div id="guessResult" style="margin-top:14px;height:180px;overflow:auto;line-height:1.9"></div>
  `);
  const body = $(".window-body", win);

  $("#guessBtn", body).addEventListener("click", () => {
    const input = $("#guessInput", body);
    const result = $("#guessResult", body);
    const guess = parseInt(input.value);
    if(isNaN(guess)||guess<1||guess>100){
      result.innerHTML += `<div style="color:var(--neon-red)">⚠️ عدد 1 تا 100</div>`;
      return;
    }
    attempts++;
    if(guess < secretNumber) result.innerHTML += `<div style="color:var(--neon-cyan)">بالاتر! (${attempts})</div>`;
    else if(guess > secretNumber) result.innerHTML += `<div style="color:var(--neon-pink)">پایین‌تر! (${attempts})</div>`;
    else{
      result.innerHTML += `<div style="color:var(--neon-green)">درست بود: ${secretNumber}</div>`;
      saveScore("Guess", Math.max(0,120-attempts*10));
    }
    result.scrollTop = result.scrollHeight;
    input.value = "";
  });
}

/* ---------- Shortcuts ---------- */
document.addEventListener("keydown", e => {
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==="k"){
    e.preventDefault();
    launcher.classList.remove("hidden");
    $("#launcherSearch").focus();
    renderLauncherResults("");
  }
  if(e.key === "Escape"){
    launcher.classList.add("hidden");
    closeContextMenu();
  }
});

/* ---------- Init ---------- */
window.addEventListener("load", () => {
  $("#widgetUser").textContent = localStorage.getItem(STORAGE.USER) || "Guest";
  const btn = $(`.filter[data-filter="${currentFilter}"]`);
  if(btn){
    $$(".filter").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
  }
});
