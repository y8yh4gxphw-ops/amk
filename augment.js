
/* augment.js — erweitert die App um:
   - Dropdown-Navigation (jederzeit zum Hauptbildschirm)
   - Modusschalter (Test / Prüfung)
   - Sofort-Feedback im Testmodus in Rot/Grün
   - Verlauf (History) mit Export/Löschen
*/
(function(){
  const MODE_KEY = "appMode";
  const COMPLETED_KEY = "examCompleted";
  const HISTORY_KEY = "historyLog";

  // Resolve core elements from the existing app
  const startScreen = document.getElementById("startScreen");
  const menuScreen = document.getElementById("menuScreen");
  const questionScreen = document.getElementById("questionScreen");
  const resultScreen = document.getElementById("resultScreen");
  const historyScreen = document.getElementById("historyScreen");
  const answerContainer = document.getElementById("answerContainer");
  const nextBtn = document.getElementById("nextBtn");
  const feedbackEl = document.getElementById("feedback");

  // Mode: 'test' (default) or 'exam'
  let mode = localStorage.getItem(MODE_KEY) || "test";
  localStorage.setItem(MODE_KEY, mode);

  // Create toolbar bindings
  const navDropdown = document.getElementById("navDropdown");
  const modeSelect  = document.getElementById("modeSelect");
  if (modeSelect) modeSelect.value = mode;

  function isExamCompleted(){
    return localStorage.getItem(COMPLETED_KEY) === "1";
  }
  function setExamCompleted(v){
    localStorage.setItem(COMPLETED_KEY, v ? "1" : "0");
  }

  // Navigation via Dropdown
  const screenMap = {
    start: startScreen,
    menu: menuScreen,
    question: questionScreen,
    result: resultScreen,
    history: historyScreen
  };
  if(navDropdown){
    navDropdown.addEventListener("change", (e)=>{
      const value = e.target.value;
      e.target.value = ""; // reset
      if(value === "history"){
        showScreen(historyScreen);
        renderHistory();
      } else if (screenMap[value]){
        showScreen(screenMap[value]);
      }
    });
  }

  // Mode switch
  if(modeSelect){
    modeSelect.addEventListener("change", () => {
      mode = modeSelect.value;
      localStorage.setItem(MODE_KEY, mode);
      // Clear inline feedback on mode change
      if(feedbackEl) feedbackEl.textContent = "";
    });
  }

  // Patch showScreen to detect when results are shown (to unmask exam history)
  if(typeof window.showScreen === "function"){
    const _showScreen = window.showScreen;
    window.showScreen = function(el){
      _showScreen(el);
      if(el === resultScreen){
        setExamCompleted(true);
        // Re-render Verlauf if open
        if(historyScreen.classList.contains("active")){
          renderHistory();
        }
      }
    };
  }

  // History helpers
  function loadHistory(){
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
    catch{ return []; }
  }
  function saveHistory(data){
    localStorage.setItem(HISTORY_KEY, JSON.stringify(data));
  }
  function upsertHistoryEntry(index, updater){
    const list = loadHistory();
    const pos = list.findIndex(x => x.index === index);
    if(pos >= 0){ list[pos] = updater(list[pos]); }
    else { list.push(updater({ index })); }
    saveHistory(list);
  }

  // Render Verlauf
  const historyContent = document.getElementById("historyContent");
  function renderHistory(){
    const list = loadHistory().sort((a,b)=> (a.index||0)-(b.index||0));
    const hideCorrectness = list.some(x => x.mode === "exam") && !isExamCompleted();
    if(!historyContent) return;
    if(list.length === 0){
      historyContent.innerHTML = "<p>Noch keine Einträge.</p>";
      return;
    }
    const rows = list.map(item => {
      const idx = (item.index || 0) + 1;
      const q   = (item.question || "").replace(/\s+/g, " ").trim();
      const qshort = q.length > 120 ? q.slice(0,117) + "…" : q;
      const when = item.time ? new Date(item.time).toLocaleString() : "";
      const corr = item.correct === true ? "<span class='ok'>Richtig</span>"
                 : item.correct === false ? "<span class='fail'>Falsch</span>"
                 : "";
      const corrCell = (item.mode === "exam" && !isExamCompleted()) ? "—" : corr;
      return `<tr>
        <td>${idx}</td>
        <td>${qshort}</td>
        <td>${item.answer || ""}</td>
        <td>${corrCell}</td>
        <td>${item.mode === "test" ? "Testmodus" : "Prüfungsmodus"}</td>
        <td>${when}</td>
      </tr>`;
    }).join("");
    historyContent.innerHTML = `
      <table>
        <thead><tr>
          <th>#</th><th>Frage</th><th>Antwort</th><th>Richtig?</th><th>Modus</th><th>Zeit</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  // Export / Clear buttons
  const exportBtn = document.getElementById("exportHistoryBtn");
  const clearBtn  = document.getElementById("clearHistoryBtn");
  if(exportBtn){
    exportBtn.addEventListener("click", () => {
      const blob = new Blob([localStorage.getItem(HISTORY_KEY) || "[]"], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "verlauf.json"; a.click();
      URL.revokeObjectURL(url);
    });
  }
  if(clearBtn){
    clearBtn.addEventListener("click", () => {
      if(confirm("Verlauf wirklich löschen?")){
        saveHistory([]);
        renderHistory();
      }
    });
  }

  // Compute correctness helper
  function isButtonCorrect(btn){
    try {
      const q = window.randomizedQuestions ? window.randomizedQuestions[window.currentIndex] : null;
      if(!q || !q.answers) return null;
      const label = (btn.textContent || "").trim();
      const correctSet = new Set(q.answers.filter(a => a && (a.correct || a.isCorrect)).map(a => (a.text || a.label || "").trim()));
      return correctSet.has(label);
    } catch { return null; }
  }

  // Post-answer handling for Testmodus
  function postAnswerFeedback(clickedBtn){
    if(!clickedBtn || mode !== "test") return;
    const isCorr = isButtonCorrect(clickedBtn);
    // Visual feedback
    if(isCorr === true){
      clickedBtn.classList.add("is-correct");
      if(feedbackEl){ feedbackEl.textContent = "Richtig ✔︎"; feedbackEl.style.color = "#0b6b2d"; }
    } else if(isCorr === false){
      clickedBtn.classList.add("is-incorrect");
      if(feedbackEl){ feedbackEl.textContent = "Falsch ✘"; feedbackEl.style.color = "#7f1d1d"; }
    }
    // Disable further changes for this question
    const btns = answerContainer ? answerContainer.querySelectorAll(".answerBtn") : [];
    btns.forEach(b => b.disabled = true);
    // Ensure Next is visible/enabled if present
    if(nextBtn){ nextBtn.disabled = false; nextBtn.style.opacity = 1; }
    // Log to history
    logSelection(clickedBtn, isCorr);
  }

  function logSelection(clickedBtn, isCorr){
    const idx = window.currentIndex || 0;
    const q = window.randomizedQuestions ? window.randomizedQuestions[idx] : null;
    const questionText = q ? (q.question || q.text || "") : "";
    const answerLabel = clickedBtn ? (clickedBtn.textContent || "") : "";
    const correctVal = (isCorr === true) ? true : (isCorr === false) ? false : null;
    upsertHistoryEntry(idx, (prev)=> ({
      index: idx,
      question: questionText,
      answer: answerLabel,
      correct: correctVal,
      mode: mode,
      time: new Date().toISOString()
    }));
  }

  // Observe answerContainer to wrap click handlers
  if(answerContainer){
    const observer = new MutationObserver(() => {
      const btns = answerContainer.querySelectorAll("button.answerBtn");
      btns.forEach(btn => {
        // Wrap only once
        if(btn.dataset._augmented) return;
        btn.dataset._augmented = "1";
        const orig = btn.onclick;
        btn.onclick = function(ev){
          if(typeof orig === "function") orig.call(btn, ev);
          postAnswerFeedback(btn);
        };
      });
      // Clear feedback on new question
      if(feedbackEl) feedbackEl.textContent = "";
    });
    observer.observe(answerContainer, { childList: true, subtree: true });
  }

  // Also wrap Next button to log in Prüfungsmodus (no immediate feedback)
  if(nextBtn){
    const origNext = nextBtn.onclick;
    nextBtn.onclick = function(ev){
      // If in exam mode, log selection without revealing correctness
      if(mode === "exam"){
        const selected = answerContainer ? answerContainer.querySelector(".answerBtn.selected") : null;
        const corr = selected ? isButtonCorrect(selected) : null;
        logSelection(selected, corr);
      }
      if(typeof origNext === "function") origNext.call(nextBtn, ev);
    };
  }

  // Re-render history when that screen becomes visible
  // (Handled by showScreen wrapper already, but do it once initially)
  if(historyScreen && historyScreen.classList.contains("active")) renderHistory();
})();
