

/* === augment.js additions: prev/next, image fix for table, exam-mode safety === */
(function(){
  const navDropdown = document.getElementById("navDropdown");
  const modeSelect  = document.getElementById("modeSelect");
  const questionImage = document.getElementById("questionImage");
  const answerContainer = document.getElementById("answerContainer");
  const feedbackEl = document.getElementById("feedback");
  const resultScreen = document.getElementById("resultScreen");
  const historyScreen = document.getElementById("historyScreen");
  const startScreen = document.getElementById("startScreen");
  const menuScreen = document.getElementById("menuScreen");
  const questionScreen = document.getElementById("questionScreen");

  const MODE_KEY = "appMode";
  let mode = localStorage.getItem(MODE_KEY) || "test";
  localStorage.setItem(MODE_KEY, mode);
  if(modeSelect) modeSelect.value = mode;

  function enforceDevSafety(){
    if(typeof window.devMode !== "undefined"){
      if(mode === "exam"){ window.devMode = false; document.body.classList.remove("dev-on"); }
      else { if(window.devMode) document.body.classList.add("dev-on"); }
    }
  }
  enforceDevSafety();

  if(modeSelect){
    modeSelect.addEventListener("change", ()=>{
      mode = modeSelect.value;
      localStorage.setItem(MODE_KEY, mode);
      enforceDevSafety();
      if(feedbackEl) feedbackEl.textContent = "";
    });
  }

  const screenMap = { start: startScreen, menu: menuScreen, question: questionScreen, result: resultScreen, history: historyScreen };
  if(navDropdown){
    navDropdown.addEventListener("change", (e)=>{
      const v = e.target.value; e.target.value = "";
      if(screenMap[v]){
        showScreen(screenMap[v]);
        if(v === "history" && typeof renderHistory === "function") renderHistory();
      }
    });
  }

  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  if(prevBtn){
    prevBtn.addEventListener("click", ()=>{
      if(typeof window.currentIndex === "number" && window.currentIndex > 0){
        window.currentIndex--;
        if(typeof window.loadQuestion === "function"){ window.loadQuestion(); }
        if(feedbackEl) feedbackEl.textContent = "";
      }
    });
  }
  if(nextBtn){
    const origNext = nextBtn.onclick;
    nextBtn.onclick = function(ev){
      // No extra feedback in exam
      if(typeof origNext === "function") origNext.call(nextBtn, ev);
    };
  }

  if(typeof window.loadQuestion === "function"){
    const _origLoad = window.loadQuestion;
    window.loadQuestion = function(){
      _origLoad();
      try {
        const q = window.randomizedQuestions ? window.randomizedQuestions[window.currentIndex] : null;
        if(q && q.table && questionImage){
          questionImage.removeAttribute("src");
          questionImage.style.display = "none";
        }
        if(mode === "exam" && feedbackEl){ feedbackEl.textContent = ""; }
        if(answerContainer){
          answerContainer.querySelectorAll(".answerBtn").forEach(b=> b.disabled = false);
        }
      } catch(e) {}
    };
  }
})();
