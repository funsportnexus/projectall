const SEED = window.__FSN_TASK_SEED__;
    if (!SEED) {
      const appRoot = document.querySelector(".shell") || document.body;
      appRoot.innerHTML = '<div style="max-width:720px;margin:48px auto;padding:24px;border:1px solid #d8e0ea;border-radius:16px;background:#fff;"><h1 style="margin-top:0;">データ読み込みエラー</h1><p>tasks.js が読み込めていません。GitHub Pages では <code>data/tasks.js</code> を同じリポジトリに置いてください。</p><p>ローカル確認時も、<code>index.html</code> と <code>data/tasks.js</code> を同じ構成で開いてください。</p></div>';
      throw new Error("FSN task seed is missing");
    }

    const STORAGE_KEY = "fsn_task_webapp_v1";
    const statusOptions = ["未着手", "進行中", "完了", "保留"];
    const priorityOptions = ["High", "Medium", "Low"];
    const eventOptions = ["2026-10 名古屋大学", "2026-12 オリセン", "Common"];
    const requiredCategories = SEED.meta.requiredCategories;

    const state = {
      ui: {
        event: chooseDefaultEvent(),
        category: "all",
        status: "all",
        priority: "all",
        owner: "all",
        month: "all",
        view: "table",
        search: ""
      },
      activeTaskId: null,
      persist: loadPersist()
    };

    const els = {};

    init();

    function init() {
      cacheEls();
      hydrateHeader();
      bindStaticEvents();
      ensureSeedConsistency();
      renderAll();
    }

    function cacheEls() {
      els.sourceFileLabel = document.getElementById("sourceFileLabel");
      els.assetEventLabel = document.getElementById("assetEventLabel");
      els.searchInput = document.getElementById("searchInput");
      els.eventSelect = document.getElementById("eventSelect");
      els.categorySelect = document.getElementById("categorySelect");
      els.statusSelect = document.getElementById("statusSelect");
      els.prioritySelect = document.getElementById("prioritySelect");
      els.ownerSelect = document.getElementById("ownerSelect");
      els.monthSelect = document.getElementById("monthSelect");
      els.eventCards = document.getElementById("eventCards");
      els.statsGrid = document.getElementById("statsGrid");
      els.focusArea = document.getElementById("focusArea");
      els.coverageArea = document.getElementById("coverageArea");
      els.viewSwitch = document.getElementById("viewSwitch");
      els.viewDescription = document.getElementById("viewDescription");
      els.mainView = document.getElementById("mainView");
      els.assetsArea = document.getElementById("assetsArea");
      els.quickAddArea = document.getElementById("quickAddArea");
      els.addTaskBtn = document.getElementById("addTaskBtn");
      els.exportCsvBtn = document.getElementById("exportCsvBtn");
      els.exportBtn = document.getElementById("exportBtn");
      els.importBtn = document.getElementById("importBtn");
      els.backupFileInput = document.getElementById("backupFileInput");
      els.taskDrawer = document.getElementById("taskDrawer");
      els.drawerTitle = document.getElementById("drawerTitle");
      els.drawerMeta = document.getElementById("drawerMeta");
      els.drawerBody = document.getElementById("drawerBody");
      els.copyIssueBtn = document.getElementById("copyIssueBtn");
      els.deleteCustomBtn = document.getElementById("deleteCustomBtn");
      els.taskModal = document.getElementById("taskModal");
      els.taskForm = document.getElementById("taskForm");
      els.toast = document.getElementById("toast");
      els.newEvent = document.getElementById("newEvent");
      els.newCategory = document.getElementById("newCategory");
      els.newPriority = document.getElementById("newPriority");
    }

    function hydrateHeader() {
      els.sourceFileLabel.textContent = SEED.meta.sourceFile;
      els.assetEventLabel.textContent = SEED.meta.assetEvent;
      els.searchInput.value = state.ui.search;
    }

    function bindStaticEvents() {
      els.searchInput.addEventListener("input", (e) => {
        state.ui.search = e.target.value.trim();
        renderAll();
      });

      els.eventSelect.addEventListener("change", (e) => {
        state.ui.event = e.target.value;
        state.ui.owner = "all";
        state.ui.month = "all";
        renderAll();
      });

      els.categorySelect.addEventListener("change", (e) => {
        state.ui.category = e.target.value;
        renderAll();
      });

      els.statusSelect.addEventListener("change", (e) => {
        state.ui.status = e.target.value;
        renderAll();
      });

      els.prioritySelect.addEventListener("change", (e) => {
        state.ui.priority = e.target.value;
        renderAll();
      });

      els.ownerSelect.addEventListener("change", (e) => {
        state.ui.owner = e.target.value;
        renderAll();
      });

      els.monthSelect.addEventListener("change", (e) => {
        state.ui.month = e.target.value;
        renderAll();
      });

      els.viewSwitch.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-view]");
        if (!btn) return;
        state.ui.view = btn.dataset.view;
        renderViewSwitch();
        renderMainView();
      });

      els.addTaskBtn.addEventListener("click", openTaskModal);
      els.exportBtn.addEventListener("click", exportBackup);
      els.importBtn.addEventListener("click", () => els.backupFileInput.click());
      els.exportCsvBtn.addEventListener("click", exportVisibleCsv);
      els.backupFileInput.addEventListener("change", importBackup);
      els.copyIssueBtn.addEventListener("click", copyActiveIssueText);
      els.deleteCustomBtn.addEventListener("click", deleteActiveCustomTask);

      document.body.addEventListener("click", (e) => {
        const card = e.target.closest("[data-select-event]");
        if (card) {
          state.ui.event = card.dataset.selectEvent;
          state.ui.owner = "all";
          state.ui.month = "all";
          renderAll();
          return;
        }

        const detail = e.target.closest("[data-open-task]");
        if (detail) {
          openDrawer(detail.dataset.openTask);
          return;
        }

        const setStatus = e.target.closest("[data-set-status]");
        if (setStatus) {
          updateTaskField(setStatus.dataset.taskId, "status", setStatus.dataset.setStatus);
          renderAll();
          return;
        }

        const addTpl = e.target.closest("[data-add-template]");
        if (addTpl) {
          quickAddTemplate(addTpl.dataset.addTemplate);
          return;
        }

        const copyIssue = e.target.closest("[data-copy-issue]");
        if (copyIssue) {
          const task = getTaskById(copyIssue.dataset.copyIssue);
          if (task) {
            copyText(buildIssueText(task));
          }
          return;
        }

        if (e.target.dataset.closeDrawer) {
          closeDrawer();
          return;
        }
        if (e.target.dataset.closeModal) {
          closeTaskModal();
          return;
        }
      });

      els.taskForm.addEventListener("submit", submitNewTask);
    }

    function ensureSeedConsistency() {
      if (!state.persist || typeof state.persist !== "object") {
        state.persist = { overrides: {}, customTasks: [] };
      }
      if (!state.persist.overrides) state.persist.overrides = {};
      if (!Array.isArray(state.persist.customTasks)) state.persist.customTasks = [];
      state.persist.customTasks = state.persist.customTasks.map((task, index) => ({
        isCustom: true,
        status: "未着手",
        phaseNumber: 99,
        phase: "追加タスク",
        phaseLabel: "追加タスク",
        sourceCategory: "追加",
        defaultPriority: task.priority || task.defaultPriority || "Medium",
        ...task
      }));
    }

    function chooseDefaultEvent() {
      const today = new Date();
      const nagoyaStart = parseIsoDate(SEED.events["2026-10 名古屋大学"].startDate);
      const orisenStart = parseIsoDate(SEED.events["2026-12 オリセン"].startDate);
      if (today < nagoyaStart) return "2026-10 名古屋大学";
      if (today < orisenStart) return "2026-12 オリセン";
      return "Common";
    }

    function loadPersist() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { overrides: {}, customTasks: [] };
        const parsed = JSON.parse(raw);
        return {
          overrides: parsed.overrides && typeof parsed.overrides === "object" ? parsed.overrides : {},
          customTasks: Array.isArray(parsed.customTasks) ? parsed.customTasks : []
        };
      } catch (err) {
        return { overrides: {}, customTasks: [] };
      }
    }

    function savePersist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.persist));
    }

    function parseIsoDate(str) {
      if (!str) return null;
      return new Date(str + "T00:00:00");
    }

    function eventTone(event) {
      if (event === "2026-10 名古屋大学") return "nagoya";
      if (event === "2026-12 オリセン") return "orisen";
      return "common";
    }

    function statusTone(status) {
      if (status === "進行中") return "status-doing";
      if (status === "完了") return "status-done";
      if (status === "保留") return "status-hold";
      return "status-todo";
    }

    function priorityTone(priority) {
      if (priority === "High") return "priority-high";
      if (priority === "Medium") return "priority-medium";
      return "priority-low";
    }

    function statusOrder(status) {
      return { "進行中": 0, "未着手": 1, "保留": 2, "完了": 3 }[status] ?? 9;
    }

    function priorityOrder(priority) {
      return { "High": 0, "Medium": 1, "Low": 2 }[priority] ?? 9;
    }

    function getSeedTasksForEvent(event) {
      return SEED.tasks.filter((task) => task.event === event);
    }

    function getCustomTasksForEvent(event) {
      return state.persist.customTasks.filter((task) => task.event === event);
    }

    function getVisibleBaseTasks() {
      const event = state.ui.event;
      const seedTasks = getSeedTasksForEvent(event);
      return [...seedTasks, ...getCustomTasksForEvent(event)];
    }

    function mergeTask(task) {
      const base = structuredClone(task);
      if (task.isCustom) return base;
      const override = state.persist.overrides[task.id] || {};
      return { ...base, ...override };
    }

    function getVisibleTasks() {
      return getVisibleBaseTasks().map(mergeTask);
    }

    function getTaskById(id) {
      const seedTask = SEED.tasks.find((task) => task.id === id);
      if (seedTask) return mergeTask(seedTask);
      const customTask = state.persist.customTasks.find((task) => task.id === id);
      return customTask ? structuredClone(customTask) : null;
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function buildSearchToken(task) {
      return [
        task.taskName,
        task.owner,
        task.reference,
        task.category,
        task.sourceCategory,
        task.phaseLabel,
        task.targetLabel,
        task.sourceTaskId
      ].join(" ").toLowerCase();
    }

    function getFilteredTasks() {
      const search = state.ui.search.toLowerCase();
      return getVisibleTasks()
        .filter((task) => state.ui.category === "all" || task.category === state.ui.category)
        .filter((task) => state.ui.status === "all" || task.status === state.ui.status)
        .filter((task) => state.ui.priority === "all" || getTaskPriority(task) === state.ui.priority)
        .filter((task) => state.ui.owner === "all" || task.owner === state.ui.owner)
        .filter((task) => state.ui.month === "all" || task.targetLabel === state.ui.month)
        .filter((task) => !search || buildSearchToken(task).includes(search))
        .sort(compareTasks);
    }

    function getTaskPriority(task) {
      return task.priority || task.defaultPriority || "Medium";
    }

    function compareTasks(a, b) {
      const aDone = a.status === "完了";
      const bDone = b.status === "完了";
      if (aDone !== bDone) return aDone ? 1 : -1;

      const aSort = a.targetSortDate ? new Date(a.targetSortDate) : new Date("9999-12-31");
      const bSort = b.targetSortDate ? new Date(b.targetSortDate) : new Date("9999-12-31");
      if (aSort.getTime() !== bSort.getTime()) return aSort - bSort;

      const priDiff = priorityOrder(getTaskPriority(a)) - priorityOrder(getTaskPriority(b));
      if (priDiff !== 0) return priDiff;

      const statusDiff = statusOrder(a.status) - statusOrder(b.status);
      if (statusDiff !== 0) return statusDiff;

      return String(a.sourceTaskId).localeCompare(String(b.sourceTaskId), "ja");
    }

    function renderAll() {
      renderSelectOptions();
      renderEventCards();
      renderStats();
      renderFocusArea();
      renderCoverage();
      renderViewSwitch();
      renderMainAndSide();
      if (state.activeTaskId) {
        const active = getTaskById(state.activeTaskId);
        if (active && active.event === state.ui.event) {
          renderDrawer(active);
          openDrawer(state.activeTaskId, true);
        } else if (!active) {
          closeDrawer();
        }
      }
    }

    function renderMainAndSide() {
      renderMainView();
      renderAssets();
      renderQuickAdd();
    }

    function renderSelectOptions() {
      renderSimpleSelect(
        els.eventSelect,
        eventOptions.map((event) => ({ value: event, label: event })),
        state.ui.event
      );
      renderSimpleSelect(
        els.categorySelect,
        [{ value: "all", label: "すべて" }, ...requiredCategories.map((c) => ({ value: c, label: c }))],
        state.ui.category
      );
      renderSimpleSelect(
        els.statusSelect,
        [{ value: "all", label: "すべて" }, ...statusOptions.map((c) => ({ value: c, label: c }))],
        state.ui.status
      );
      renderSimpleSelect(
        els.prioritySelect,
        [{ value: "all", label: "すべて" }, ...priorityOptions.map((c) => ({ value: c, label: c }))],
        state.ui.priority
      );

      const owners = unique(getVisibleTasks().map((task) => task.owner).filter(Boolean)).sort((a, b) => a.localeCompare(b, "ja"));
      renderSimpleSelect(
        els.ownerSelect,
        [{ value: "all", label: "すべて" }, ...owners.map((owner) => ({ value: owner, label: owner }))],
        owners.includes(state.ui.owner) ? state.ui.owner : "all"
      );
      if (!owners.includes(state.ui.owner)) state.ui.owner = "all";

      const months = unique(getVisibleTasks().map((task) => task.targetLabel).filter(Boolean)).sort(compareMonthLabels);
      renderSimpleSelect(
        els.monthSelect,
        [{ value: "all", label: "すべて" }, ...months.map((month) => ({ value: month, label: month }))],
        months.includes(state.ui.month) ? state.ui.month : "all"
      );
      if (!months.includes(state.ui.month)) state.ui.month = "all";

      renderSimpleSelect(
        els.newEvent,
        eventOptions.map((event) => ({ value: event, label: event })),
        state.ui.event
      );
      renderSimpleSelect(
        els.newCategory,
        requiredCategories.map((c) => ({ value: c, label: c })),
        "Operation"
      );
      renderSimpleSelect(
        els.newPriority,
        priorityOptions.map((c) => ({ value: c, label: c })),
        "Medium"
      );
    }

    function compareMonthLabels(a, b) {
      const aTask = { targetLabel: a, targetSortDate: inferSortDate(a, state.ui.event) };
      const bTask = { targetLabel: b, targetSortDate: inferSortDate(b, state.ui.event) };
      const aDate = aTask.targetSortDate ? new Date(aTask.targetSortDate) : new Date("9999-12-31");
      const bDate = bTask.targetSortDate ? new Date(bTask.targetSortDate) : new Date("9999-12-31");
      if (aDate.getTime() !== bDate.getTime()) return aDate - bDate;
      return a.localeCompare(b, "ja");
    }

    function inferSortDate(label, event) {
      const seedEvent = SEED.events[event];
      if (!label) return null;
      const m = label.match(/(\d{4})年(\d{1,2})月/);
      if (m) {
        return `${m[1]}-${String(m[2]).padStart(2, "0")}-01`;
      }
      if (label.includes("イベント直前") && seedEvent?.startDate) return seedEvent.startDate;
      if (label.includes("イベント後") && seedEvent?.endDate) {
        const d = new Date(seedEvent.endDate + "T00:00:00");
        d.setDate(d.getDate() + 7);
        return d.toISOString().slice(0, 10);
      }
      return null;
    }

    function renderSimpleSelect(el, options, selected) {
      el.innerHTML = options
        .map((opt) => `<option value="${escapeHtml(opt.value)}" ${opt.value === selected ? "selected" : ""}>${escapeHtml(opt.label)}</option>`)
        .join("");
    }

    function unique(arr) {
      return [...new Set(arr)];
    }

    function renderEventCards() {
      const cards = eventOptions.map((event) => {
        const tasks = [...getSeedTasksForEvent(event), ...getCustomTasksForEvent(event)].map(mergeTask);
        const completed = tasks.filter((task) => task.status === "完了").length;
        const inProgress = tasks.filter((task) => task.status === "進行中").length;
        const dueSoon = tasks.filter((task) => isDueSoon(task) && task.status !== "完了").length;
        const high = tasks.filter((task) => getTaskPriority(task) === "High" && task.status !== "完了").length;
        const tone = eventTone(event);
        const sub = event === "Common"
          ? "テンプレート / 横断管理"
          : `${SEED.events[event].venue} ・ ${SEED.events[event].startDate.replaceAll("-", "/")}〜${SEED.events[event].endDate.replaceAll("-", "/")}`;
        return `
          <button class="event-card ${tone} ${state.ui.event === event ? "active" : ""}" data-select-event="${escapeHtml(event)}">
            <div class="event-title">${escapeHtml(event)}</div>
            <div class="event-sub">${escapeHtml(sub)}</div>
            <div class="event-stats">
              <div><span>総タスク</span><strong>${tasks.length}</strong></div>
              <div><span>進行中</span><strong>${inProgress}</strong></div>
              <div><span>完了</span><strong>${completed}</strong></div>
              <div><span>要着手</span><strong>${Math.max(dueSoon, high)}</strong></div>
            </div>
          </button>
        `;
      }).join("");
      els.eventCards.innerHTML = cards;
    }

    function renderStats() {
      const tasks = getFilteredTasks();
      const total = tasks.length;
      const todo = tasks.filter((task) => task.status === "未着手").length;
      const doing = tasks.filter((task) => task.status === "進行中").length;
      const done = tasks.filter((task) => task.status === "完了").length;
      const hold = tasks.filter((task) => task.status === "保留").length;
      const dueSoon = tasks.filter((task) => isDueSoon(task) && task.status !== "完了").length;
      const high = tasks.filter((task) => getTaskPriority(task) === "High" && task.status !== "完了").length;
      const progress = total ? Math.round((done / total) * 100) : 0;

      const cards = [
        { label: "表示中タスク", value: total, sub: `${state.ui.event} の条件一致件数` },
        { label: "未着手", value: todo, sub: "まず着手判断が必要" },
        { label: "進行中", value: doing, sub: "担当と期限を固定する" },
        { label: "完了", value: done, sub: `進捗率 ${progress}%` },
        { label: "保留", value: hold, sub: "理由をメモに残す" },
        { label: "要着手", value: Math.max(dueSoon, high), sub: "期限近 or High優先度" }
      ];

      els.statsGrid.innerHTML = cards.map((card) => `
        <div class="stat-card">
          <div class="label">${escapeHtml(card.label)}</div>
          <div class="value">${card.value}</div>
          <div class="sub">${escapeHtml(card.sub)}</div>
        </div>
      `).join("");
    }

    function isDueSoon(task) {
      if (!task.targetSortDate) return false;
      const due = new Date(task.targetSortDate + "T00:00:00");
      const today = new Date();
      const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
      return diff <= 45;
    }

    function renderFocusArea() {
      const tasks = getFilteredTasks()
        .filter((task) => task.status !== "完了")
        .sort((a, b) => {
          const dueDiff = compareTasks(a, b);
          if (dueDiff !== 0) return dueDiff;
          return 0;
        })
        .slice(0, 6);

      if (!tasks.length) {
        els.focusArea.innerHTML = `<div class="empty-state">条件に合う未完了タスクがありません。フィルタを緩めるか、追加タスクを登録してください。</div>`;
        return;
      }

      els.focusArea.innerHTML = `
        <div class="focus-list">
          ${tasks.map((task) => `
            <div class="focus-card">
              <div class="focus-meta">
                ${eventPill(task.event)}
                ${statusBadge(task.status)}
                ${priorityBadge(getTaskPriority(task))}
              </div>
              <h3>${escapeHtml(task.taskName)}</h3>
              <div class="muted">${escapeHtml(task.phaseLabel || "追加タスク")} / ${escapeHtml(task.sourceTaskId)}</div>
              <div class="tag-row">
                <span class="pill category">${escapeHtml(task.category)}</span>
                <span class="pill source">目安: ${escapeHtml(task.targetLabel || "未設定")}</span>
                <span class="pill source">担当: ${escapeHtml(task.owner || "未設定")}</span>
              </div>
              <div class="quick-actions">
                <button class="btn btn-small btn-soft" data-set-status="進行中" data-task-id="${escapeHtml(task.id)}">進行中にする</button>
                <button class="btn btn-small" data-open-task="${escapeHtml(task.id)}">詳細</button>
                <button class="btn btn-small" data-copy-issue="${escapeHtml(task.id)}">Issue文面</button>
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }

    function renderCoverage() {
      const tasks = getVisibleTasks();
      const counts = Object.fromEntries(requiredCategories.map((category) => [category, 0]));
      tasks.forEach((task) => {
        counts[task.category] = (counts[task.category] || 0) + 1;
      });
      els.coverageArea.innerHTML = `
        <div class="coverage-grid">
          ${requiredCategories.map((category) => {
            const count = counts[category] || 0;
            const toneClass = count === 0 ? "missing" : count <= 1 ? "low" : "";
            return `
              <div class="coverage-card ${toneClass}">
                <div class="tiny">${escapeHtml(category)}</div>
                <div class="count">${count}</div>
                <div class="tiny">${count === 0 ? "タスク未登録" : count <= 1 ? "薄いので補完推奨" : "登録済み"}</div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    }

    function renderViewSwitch() {
      els.viewSwitch.querySelectorAll("button").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.view === state.ui.view);
      });

      const descriptions = {
        table: "ステータスと優先度を横断で更新しやすい一覧表示です。",
        board: "進捗ステータスごとの偏りを見やすくしたボード表示です。",
        month: "目安時期ごとの固まりを確認して月次進行を組みやすくした表示です。"
      };
      els.viewDescription.textContent = descriptions[state.ui.view] || "";
    }

    function renderMainView() {
      const tasks = getFilteredTasks();
      if (!tasks.length) {
        els.mainView.innerHTML = `<div class="empty-state">条件に一致するタスクがありません。</div>`;
        return;
      }
      if (state.ui.view === "board") {
        renderBoardView(tasks);
      } else if (state.ui.view === "month") {
        renderMonthView(tasks);
      } else {
        renderTableView(tasks);
      }
    }

    function renderTableView(tasks) {
      els.mainView.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ステータス</th>
                <th>優先度</th>
                <th>Task ID</th>
                <th>タスク</th>
                <th>Category</th>
                <th>目安時期</th>
                <th>担当</th>
                <th>参照資産</th>
                <th>アクション</th>
              </tr>
            </thead>
            <tbody>
              ${tasks.map((task) => `
                <tr>
                  <td>${renderInlineStatusSelect(task)}</td>
                  <td>${renderInlinePrioritySelect(task)}</td>
                  <td>
                    <div><strong>${escapeHtml(task.sourceTaskId)}</strong></div>
                    <div class="tiny">${escapeHtml(task.phaseLabel || "追加タスク")}</div>
                  </td>
                  <td class="cell-task">
                    <div class="task-title">${escapeHtml(task.taskName)}</div>
                    <div class="tag-row">
                      ${eventPill(task.event)}
                      <span class="pill source">${escapeHtml(task.sourceCategory || "追加")}</span>
                    </div>
                  </td>
                  <td><span class="pill category">${escapeHtml(task.category)}</span></td>
                  <td>
                    <div>${escapeHtml(task.targetLabel || "未設定")}</div>
                    <div class="tiny">${task.targetSortDate ? escapeHtml(task.targetSortDate) : ""}</div>
                  </td>
                  <td>${renderInlineOwnerInput(task)}</td>
                  <td><span class="text-truncate" title="${escapeHtml(task.reference || "")}">${escapeHtml(task.reference || "—")}</span></td>
                  <td>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                      <button class="btn btn-small" data-open-task="${escapeHtml(task.id)}">詳細</button>
                      <button class="btn btn-small btn-soft" data-copy-issue="${escapeHtml(task.id)}">Issue</button>
                    </div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;

      bindInlineInputs();
    }

    function renderBoardView(tasks) {
      const columns = ["未着手", "進行中", "完了", "保留"];
      els.mainView.innerHTML = `
        <div class="board">
          ${columns.map((status) => {
            const items = tasks.filter((task) => task.status === status);
            return `
              <div class="board-col">
                <h3>
                  <span>${escapeHtml(status)}</span>
                  <span class="tiny">${items.length}件</span>
                </h3>
                ${items.length ? items.map((task) => `
                  <button class="board-card" data-open-task="${escapeHtml(task.id)}">
                    <div class="tag-row">
                      ${priorityBadge(getTaskPriority(task))}
                      <span class="pill category">${escapeHtml(task.category)}</span>
                    </div>
                    <p class="title">${escapeHtml(task.taskName)}</p>
                    <div class="tiny">${escapeHtml(task.sourceTaskId)} / ${escapeHtml(task.phaseLabel || "追加タスク")}</div>
                    <div class="board-foot">
                      ${eventPill(task.event)}
                      <span class="tiny">${escapeHtml(task.targetLabel || "未設定")} / ${escapeHtml(task.owner || "未設定")}</span>
                    </div>
                  </button>
                `).join("") : `<div class="empty-state" style="padding:18px;">該当なし</div>`}
              </div>
            `;
          }).join("")}
        </div>
      `;
    }

    function renderMonthView(tasks) {
      const groups = groupBy(tasks, (task) => task.targetLabel || "未設定");
      const sortedEntries = Object.entries(groups).sort((a, b) => compareMonthLabels(a[0], b[0]));
      els.mainView.innerHTML = `
        <div class="month-groups">
          ${sortedEntries.map(([label, items]) => `
            <div class="month-group">
              <div class="month-head">
                <h3>${escapeHtml(label)}</h3>
                <div class="tiny">${items.length}件 / 未完了 ${items.filter((task) => task.status !== "完了").length}件</div>
              </div>
              <div class="month-items">
                ${items.map((task) => `
                  <div class="month-item">
                    <div class="tag-row">
                      ${eventPill(task.event)}
                      ${statusBadge(task.status)}
                      ${priorityBadge(getTaskPriority(task))}
                      <span class="pill category">${escapeHtml(task.category)}</span>
                    </div>
                    <div class="task-title" style="margin-top:8px;">${escapeHtml(task.taskName)}</div>
                    <div class="tiny">${escapeHtml(task.sourceTaskId)} / ${escapeHtml(task.owner || "未設定")} / ${escapeHtml(task.reference || "参照なし")}</div>
                    <div style="margin-top:10px;">
                      <button class="btn btn-small" data-open-task="${escapeHtml(task.id)}">詳細</button>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }

    function renderAssets() {
      const visibleTaskIds = new Set(getVisibleTasks().map((task) => task.sourceTaskId));
      const relatedAssets = SEED.assets
        .map((asset) => ({
          ...asset,
          visibleCount: asset.sampleTasks.length
        }))
        .filter((asset) => {
          const sample = SEED.tasks.filter((task) => task.reference === asset.reference && task.event === state.ui.event);
          if (state.ui.event === "Common") {
            return SEED.tasks.some((task) => task.reference === asset.reference && task.event === "Common");
          }
          return sample.length > 0;
        })
        .slice(0, 8);

      if (!relatedAssets.length) {
        els.assetsArea.innerHTML = `<div class="empty-state" style="padding:18px;">選択中イベントにひもづく参照資産がありません。</div>`;
        return;
      }

      els.assetsArea.innerHTML = `
        <div class="asset-list">
          ${relatedAssets.map((asset) => `
            <div class="asset-item">
              <h4>${escapeHtml(asset.reference)}</h4>
              <div class="tag-row">
                ${asset.categories.map((cat) => `<span class="pill category">${escapeHtml(cat)}</span>`).join("")}
              </div>
              <div class="tiny">関連タスク数: ${asset.taskCount}</div>
              <div class="tiny">例: ${escapeHtml(asset.sampleTasks.join(" / "))}</div>
            </div>
          `).join("")}
        </div>
      `;
    }

    function renderQuickAdd() {
      const counts = categoryCountMap(getVisibleTasks());
      const templates = SEED.recommendedTemplates.filter((tpl) => {
        const count = counts[tpl.category] || 0;
        return count === 0 || count <= 1;
      });
      if (!templates.length) {
        els.quickAddArea.innerHTML = `<div class="empty-state" style="padding:18px;">追加推奨タスクはありません。必要なら「＋タスク追加」から自由登録してください。</div>`;
        return;
      }
      els.quickAddArea.innerHTML = `
        <div class="quickadd-list">
          ${templates.map((tpl, index) => `
            <div class="template-item">
              <h4>${escapeHtml(tpl.taskName)}</h4>
              <div class="tag-row">
                <span class="pill category">${escapeHtml(tpl.category)}</span>
                <span class="pill source">担当候補: ${escapeHtml(tpl.owner)}</span>
              </div>
              <div class="tiny">${escapeHtml(resolveTemplateLabel(tpl, state.ui.event) || "期限未設定")}</div>
              <div class="tiny">${escapeHtml(tpl.completionHint)}</div>
              <div style="margin-top:6px;">
                <button class="btn btn-small btn-primary" data-add-template="${index}">このイベントに追加</button>
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }

    function resolveTemplateLabel(template, event) {
      if (event === "2026-10 名古屋大学") return template.nagoyaTargetLabel;
      if (event === "2026-12 オリセン") return template.orisenTargetLabel;
      return template.commonTargetLabel;
    }

    function categoryCountMap(tasks) {
      const counts = {};
      tasks.forEach((task) => {
        counts[task.category] = (counts[task.category] || 0) + 1;
      });
      return counts;
    }

    function renderInlineStatusSelect(task) {
      return `
        <select class="inline-select" data-inline-field="status" data-task-id="${escapeHtml(task.id)}">
          ${statusOptions.map((status) => `<option value="${escapeHtml(status)}" ${status === task.status ? "selected" : ""}>${escapeHtml(status)}</option>`).join("")}
        </select>
      `;
    }

    function renderInlinePrioritySelect(task) {
      const current = getTaskPriority(task);
      return `
        <select class="inline-select" data-inline-field="priority" data-task-id="${escapeHtml(task.id)}">
          ${priorityOptions.map((priority) => `<option value="${escapeHtml(priority)}" ${priority === current ? "selected" : ""}>${escapeHtml(priority)}</option>`).join("")}
        </select>
      `;
    }

    function renderInlineOwnerInput(task) {
      return `<input class="inline-input" data-inline-field="owner" data-task-id="${escapeHtml(task.id)}" value="${escapeHtml(task.owner || "")}" placeholder="担当未設定" />`;
    }

    function bindInlineInputs() {
      els.mainView.querySelectorAll("[data-inline-field='status']").forEach((el) => {
        el.addEventListener("change", () => {
          updateTaskField(el.dataset.taskId, "status", el.value);
          renderAll();
        });
      });
      els.mainView.querySelectorAll("[data-inline-field='priority']").forEach((el) => {
        el.addEventListener("change", () => {
          updateTaskField(el.dataset.taskId, "priority", el.value);
          renderAll();
        });
      });
      els.mainView.querySelectorAll("[data-inline-field='owner']").forEach((el) => {
        el.addEventListener("change", () => {
          updateTaskField(el.dataset.taskId, "owner", el.value.trim());
          renderAll();
        });
      });
    }

    function updateTaskField(taskId, field, value) {
      const customIndex = state.persist.customTasks.findIndex((task) => task.id === taskId);
      if (customIndex >= 0) {
        state.persist.customTasks[customIndex][field] = value;
        if (field === "targetLabel") {
          syncTargetFields(state.persist.customTasks[customIndex], value);
        }
        savePersist();
        return;
      }
      const target = state.persist.overrides[taskId] || {};
      target[field] = value;
      if (field === "targetLabel") {
        const merged = getTaskById(taskId);
        const event = merged?.event || state.ui.event;
        const sortDate = inferSortDate(value, event);
        target.targetLabel = value;
        target.targetSortDate = sortDate;
      }
      if (field === "priority") {
        target.priority = value;
      }
      state.persist.overrides[taskId] = target;
      savePersist();
    }

    function syncTargetFields(task, label) {
      task.targetLabel = label;
      task.targetSortDate = inferSortDate(label, task.event);
    }

    function eventPill(event) {
      return `<span class="pill ${eventTone(event)}">${escapeHtml(event)}</span>`;
    }

    function statusBadge(status) {
      return `<span class="badge ${statusTone(status)}">${escapeHtml(status)}</span>`;
    }

    function priorityBadge(priority) {
      return `<span class="badge ${priorityTone(priority)}">${escapeHtml(priority)}</span>`;
    }

    function groupBy(arr, fn) {
      return arr.reduce((acc, item) => {
        const key = fn(item);
        (acc[key] ||= []).push(item);
        return acc;
      }, {});
    }

    function openDrawer(taskId, preserveScroll = false) {
      state.activeTaskId = taskId;
      const task = getTaskById(taskId);
      if (!task) return;
      if (!preserveScroll) {
        renderDrawer(task);
      }
      els.taskDrawer.classList.add("open");
      document.body.style.overflow = "hidden";
    }

    function closeDrawer() {
      state.activeTaskId = null;
      els.taskDrawer.classList.remove("open");
      document.body.style.overflow = "";
    }

    function renderDrawer(task) {
      els.drawerTitle.textContent = task.taskName;
      els.drawerMeta.innerHTML = [
        eventPill(task.event),
        statusBadge(task.status),
        priorityBadge(getTaskPriority(task)),
        `<span class="pill category">${escapeHtml(task.category)}</span>`,
        `<span class="pill source">${escapeHtml(task.sourceTaskId)}</span>`
      ].join("");

      els.deleteCustomBtn.style.display = task.isCustom ? "" : "none";

      els.drawerBody.innerHTML = `
        <div class="hint-box">
          <strong>完了条件の目安</strong><br />
          ${escapeHtml(task.completionHint || "完了条件が未設定です。具体的な証跡をメモに残してください。")}
        </div>

        <div class="form-grid">
          <div class="form-field">
            <label>ステータス</label>
            <select id="drawerStatus">
              ${statusOptions.map((status) => `<option value="${escapeHtml(status)}" ${status === task.status ? "selected" : ""}>${escapeHtml(status)}</option>`).join("")}
            </select>
          </div>
          <div class="form-field">
            <label>優先度</label>
            <select id="drawerPriority">
              ${priorityOptions.map((priority) => `<option value="${escapeHtml(priority)}" ${priority === getTaskPriority(task) ? "selected" : ""}>${escapeHtml(priority)}</option>`).join("")}
            </select>
          </div>
          <div class="form-field">
            <label>担当</label>
            <input id="drawerOwner" type="text" value="${escapeHtml(task.owner || "")}" placeholder="担当者名" />
          </div>
          <div class="form-field">
            <label>目安時期</label>
            <input id="drawerTargetLabel" type="text" value="${escapeHtml(task.targetLabel || "")}" placeholder="2026年7月 / イベント直前 など" />
          </div>
          <div class="form-field wide">
            <label>参照資産（2026-03 オリセン実績）</label>
            <input id="drawerReference" type="text" value="${escapeHtml(task.reference || "")}" placeholder="ファイル名 / フォルダ名" />
          </div>
          <div class="form-field wide">
            <label>メモ</label>
            <textarea id="drawerNotes" placeholder="依頼先、確認相手、証跡URL、次アクションなど">${escapeHtml(task.notes || "")}</textarea>
          </div>
          <div class="form-field wide">
            <label>GitHub Issue URL</label>
            <input id="drawerIssueUrl" type="text" value="${escapeHtml(task.issueUrl || "")}" placeholder="https://..." />
          </div>
          <div class="form-field wide">
            <label>GitHub Issue文面（そのまま貼り付け可）</label>
            <textarea id="drawerIssueText" readonly>${escapeHtml(buildIssueText(task))}</textarea>
          </div>
        </div>
      `;

      bindDrawerInputs(task.id);
    }

    function bindDrawerInputs(taskId) {
      const statusEl = document.getElementById("drawerStatus");
      const priorityEl = document.getElementById("drawerPriority");
      const ownerEl = document.getElementById("drawerOwner");
      const targetEl = document.getElementById("drawerTargetLabel");
      const refEl = document.getElementById("drawerReference");
      const notesEl = document.getElementById("drawerNotes");
      const issueUrlEl = document.getElementById("drawerIssueUrl");

      statusEl.addEventListener("change", () => {
        updateTaskField(taskId, "status", statusEl.value);
        renderAll();
      });
      priorityEl.addEventListener("change", () => {
        updateTaskField(taskId, "priority", priorityEl.value);
        renderAll();
      });
      ownerEl.addEventListener("change", () => {
        updateTaskField(taskId, "owner", ownerEl.value.trim());
        renderAll();
      });
      targetEl.addEventListener("change", () => {
        updateTaskField(taskId, "targetLabel", targetEl.value.trim());
        renderAll();
      });
      refEl.addEventListener("change", () => {
        updateTaskField(taskId, "reference", refEl.value.trim());
        renderAll();
      });
      notesEl.addEventListener("input", () => {
        updateTaskField(taskId, "notes", notesEl.value);
        refreshDrawerIssuePreview(taskId);
      });
      issueUrlEl.addEventListener("change", () => {
        updateTaskField(taskId, "issueUrl", issueUrlEl.value.trim());
        refreshDrawerIssuePreview(taskId);
      });
    }

    function refreshDrawerIssuePreview(taskId) {
      const task = getTaskById(taskId);
      const issueBox = document.getElementById("drawerIssueText");
      if (task && issueBox) {
        issueBox.value = buildIssueText(task);
      }
    }

    function debounce(fn, delay) {
      let t = null;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), delay);
      };
    }

    function buildIssueText(task) {
      const issueTitle = `[${task.event}][${task.category}] ${task.taskName}`;
      const lines = [
        `# ${issueTitle}`,
        "",
        "## 概要",
        `${task.taskName} を進める。`,
        "",
        "## Event",
        `- ${task.event}`,
        "",
        "## Category",
        `- ${task.category}`,
        "",
        "## 担当",
        `- ${task.owner || "未設定"}`,
        "",
        "## 目安時期",
        `- ${task.targetLabel || "未設定"}`,
        "",
        "## 参照資産",
        `- ${task.assetEvent}: ${task.reference || "未設定"}`,
        "",
        "## 完了条件",
        `- ${task.completionHint || "証跡がメモに残っていること"}`,
        "",
        "## メモ",
        `- ${task.notes || "なし"}`,
        "",
        "## チェックリスト",
        "- [ ] 着手前に参照資産を確認する",
        "- [ ] 関係者/依頼先を特定して連絡する",
        "- [ ] 実施結果または証跡をメモに残す",
        "- [ ] 完了条件を満たしたらステータスを完了にする"
      ];
      return lines.join("\n");
    }

    function copyActiveIssueText() {
      const task = state.activeTaskId ? getTaskById(state.activeTaskId) : null;
      if (!task) return;
      copyText(buildIssueText(task));
    }

    async function copyText(text) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        showToast("コピーしました");
      } catch (err) {
        showToast("コピーに失敗しました");
      }
    }

    function showToast(msg) {
      els.toast.textContent = msg;
      els.toast.classList.add("show");
      clearTimeout(showToast._timer);
      showToast._timer = setTimeout(() => els.toast.classList.remove("show"), 1800);
    }

    function openTaskModal() {
      els.newEvent.value = state.ui.event;
      els.taskForm.reset();
      els.newEvent.value = state.ui.event;
      els.newCategory.value = "Operation";
      els.newPriority.value = "Medium";
      els.taskModal.classList.add("open");
      document.body.style.overflow = "hidden";
    }

    function closeTaskModal() {
      els.taskModal.classList.remove("open");
      if (!els.taskDrawer.classList.contains("open")) document.body.style.overflow = "";
    }

    function submitNewTask(e) {
      e.preventDefault();
      const form = new FormData(els.taskForm);
      const event = String(form.get("event") || "Common");
      const category = String(form.get("category") || "Operation");
      const taskName = String(form.get("taskName") || "").trim();
      if (!taskName) return;
      const targetLabel = String(form.get("targetLabel") || "").trim();
      const newTask = {
        id: `custom::${Date.now()}::${Math.random().toString(36).slice(2, 8)}`,
        event,
        eventKey: SEED.events[event].eventKey,
        venue: SEED.events[event].venue,
        eventStart: SEED.events[event].startDate,
        eventEnd: SEED.events[event].endDate,
        sourceTaskId: `C-${state.persist.customTasks.length + 1}`,
        phaseNumber: 99,
        phase: "追加タスク",
        phaseLabel: "追加タスク",
        sourceCategory: "追加",
        category,
        taskName,
        owner: String(form.get("owner") || "").trim(),
        reference: String(form.get("reference") || "").trim(),
        status: "未着手",
        priority: String(form.get("priority") || "Medium"),
        targetLabel,
        targetType: "custom",
        targetMonthKey: "",
        targetSortDate: inferSortDate(targetLabel, event),
        defaultPriority: String(form.get("priority") || "Medium"),
        notes: String(form.get("notes") || "").trim(),
        completionHint: String(form.get("completionHint") || "").trim() || "完了条件を具体的に記録してください",
        assetEvent: SEED.meta.assetEvent,
        isCustom: true
      };
      state.persist.customTasks.unshift(newTask);
      savePersist();
      state.ui.event = event;
      closeTaskModal();
      renderAll();
      openDrawer(newTask.id);
      showToast("追加タスクを登録しました");
    }

    function deleteActiveCustomTask() {
      if (!state.activeTaskId) return;
      const idx = state.persist.customTasks.findIndex((task) => task.id === state.activeTaskId);
      if (idx < 0) return;
      if (!confirm("この追加タスクを削除しますか？")) return;
      state.persist.customTasks.splice(idx, 1);
      savePersist();
      closeDrawer();
      renderAll();
      showToast("追加タスクを削除しました");
    }

    function exportBackup() {
      const payload = {
        meta: {
          exportedAt: new Date().toISOString(),
          sourceFile: SEED.meta.sourceFile
        },
        overrides: state.persist.overrides,
        customTasks: state.persist.customTasks
      };
      downloadFile(
        `fsn-task-backup-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(payload, null, 2),
        "application/json"
      );
      showToast("バックアップを書き出しました");
    }

    function importBackup(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          state.persist.overrides = parsed.overrides && typeof parsed.overrides === "object" ? parsed.overrides : {};
          state.persist.customTasks = Array.isArray(parsed.customTasks)
            ? parsed.customTasks.map((task) => ({ isCustom: true, ...task }))
            : [];
          savePersist();
          renderAll();
          showToast("バックアップを読み込みました");
        } catch (err) {
          showToast("バックアップの読み込みに失敗しました");
        } finally {
          els.backupFileInput.value = "";
        }
      };
      reader.readAsText(file, "utf-8");
    }

    function exportVisibleCsv() {
      const tasks = getFilteredTasks();
      const headers = [
        "Event",
        "Category",
        "SourceCategory",
        "TaskID",
        "TaskName",
        "Status",
        "Priority",
        "Owner",
        "TargetLabel",
        "Reference",
        "IssueUrl",
        "Notes"
      ];
      const rows = tasks.map((task) => [
        task.event,
        task.category,
        task.sourceCategory,
        task.sourceTaskId,
        task.taskName,
        task.status,
        getTaskPriority(task),
        task.owner || "",
        task.targetLabel || "",
        task.reference || "",
        task.issueUrl || "",
        task.notes || ""
      ]);
      const csv = [headers, ...rows]
        .map((row) => row.map(csvEscape).join(","))
        .join("\n");
      downloadFile(
        `fsn-tasks-${state.ui.event}-${new Date().toISOString().slice(0, 10)}.csv`,
        "\ufeff" + csv,
        "text/csv;charset=utf-8"
      );
      showToast("CSVを書き出しました");
    }

    function csvEscape(value) {
      const str = String(value ?? "");
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    }

    function downloadFile(filename, content, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    function quickAddTemplate(templateIndex) {
      const tpl = SEED.recommendedTemplates[Number(templateIndex)];
      if (!tpl) return;
      const event = state.ui.event;
      const task = {
        id: `custom::${Date.now()}::${Math.random().toString(36).slice(2, 8)}`,
        event,
        eventKey: SEED.events[event].eventKey,
        venue: SEED.events[event].venue,
        eventStart: SEED.events[event].startDate,
        eventEnd: SEED.events[event].endDate,
        sourceTaskId: `C-${state.persist.customTasks.length + 1}`,
        phaseNumber: 99,
        phase: "追加タスク",
        phaseLabel: "追加タスク",
        sourceCategory: "追加",
        category: tpl.category,
        taskName: tpl.taskName,
        owner: tpl.owner,
        reference: "",
        status: "未着手",
        priority: "Medium",
        targetLabel: resolveTemplateLabel(tpl, event),
        targetType: "custom",
        targetMonthKey: "",
        targetSortDate: inferSortDate(resolveTemplateLabel(tpl, event), event),
        defaultPriority: "Medium",
        notes: "",
        completionHint: tpl.completionHint,
        assetEvent: SEED.meta.assetEvent,
        isCustom: true
      };
      state.persist.customTasks.unshift(task);
      savePersist();
      renderAll();
      showToast("追加候補タスクを登録しました");
    }
