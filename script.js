/* Prüfungs-Engine */
let questions = window.allQuestions || [];
let currentIndex = 0;
let randomizedQuestions = [];
let userAnswers = [];
let devMode = false;
const startScreen = document.getElementById("startScreen");
const menuScreen = document.getElementById("menuScreen");
const questionScreen = document.getElementById("questionScreen");
const resultScreen = document.getElementById("resultScreen");
const startBtn = document.getElementById("startBtn");
const openMenu = document.getElementById("openMenu");
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");
const restartBtn = document.getElementById("restartBtn");
const questionNumber = document.getElementById("questionNumber");
const questionText = document.getElementById("questionText");
const questionImage = document.getElementById("questionImage");
const answerContainer = document.getElementById("answerContainer");
const scoreText = document.getElementById("scoreText");
const reviewContainer = document.getElementById("reviewContainer");
const darkModeSwitch = document.getElementById("darkModeSwitch");
const solutionSwitch = document.getElementById("solutionSwitch");
const devModeSwitch = document.getElementById("devModeSwitch");

// === Globaler Dropdown-Filter (überall sichtbar) ===
const globalFilter = document.getElementById("globalFilter");
function getFilteredQuestions() {
  const raw = window.allQuestions || [];
  if (!globalFilter) return raw;
  const v = globalFilter.value || "all";
  if (v === "mc") return raw.filter(q => !q.table);
  if (v === "table") return raw.filter(q => !!q.table);
  return raw;
}
function resetExamWithFilter() {
  questions = getFilteredQuestions();
  userAnswers = [];
  currentIndex = 0;
  randomizedQuestions = [...questions].sort(()=>Math.random()-0.5);
}
if (globalFilter) {
  globalFilter.addEventListener("change", () => {
    // Filterwechsel setzt die Prüfung sauber zurück und lädt die erste Frage
    resetExamWithFilter();
    showScreen(questionScreen);
    loadQuestion();
  });
}

function showScreen(el){[startScreen,menuScreen,questionScreen,resultScreen].forEach(s=>s.classList.remove("active"));el.classList.add("active");}

function startExam(){
  resetExamWithFilter();
  showScreen(questionScreen); loadQuestion();
}

function loadQuestion(){
  const q = randomizedQuestions[currentIndex];
  questionNumber.textContent = `Frage ${currentIndex+1} von ${randomizedQuestions.length}`;
  questionText.innerHTML = q.question || q.text || "";
  // image
  if(q.image){
    questionImage.src = "assets/" + q.image;
    questionImage.style.display = "block";
  } else questionImage.style.display = "none";
  answerContainer.innerHTML = "";
  // MC
  if(!q.table){
    let answers = [...q.answers].sort(()=>Math.random()-0.5);
    answers.forEach(a=>{
      const btn=document.createElement("button");
      btn.className="answerBtn"; btn.textContent=a.text;
      btn.onclick=()=>{
        userAnswers[currentIndex]=a;
        document.querySelectorAll(".answerBtn").forEach(b=>b.classList.remove("selected"));
        btn.classList.add("selected");
        if(devMode && a.correct) btn.classList.add("correct");
      };
      if(devMode && a.correct){ btn.style.border="2px solid #00c853"; }
      answerContainer.appendChild(btn);
    });
  } else {
    const wrap=document.createElement("div"); wrap.className="tableWrapper";
    const table=document.createElement("table");
    let html="<thead><tr>";
    q.table.header.forEach(h=> html+=`<th>${h}</th>`);
    html+="</tr></thead><tbody>";
    q.table.rows.forEach((row,r)=>{
      html+="<tr>";
      row.forEach((cell,c)=>{
        if(q.table.selectColumns.includes(c)){
          html+=`<td><select data-r="${r}" data-c="${c}">`;
          q.table.options.forEach(o=> html+=`<option value="${o}">${o}</option>`);
          html+="</select></td>";
        } else {
          html+=`<td>${cell}</td>`;
        }
      });
      html+="</tr>";
    });
    html+="</tbody>";
    table.innerHTML=html; wrap.appendChild(table); answerContainer.appendChild(wrap);
    if(devMode){ setTimeout(()=>highlightDevSolutions(q),150); }
  }
}

function highlightDevSolutions(q){
  if(!q.table) return;
  const selects = answerContainer.querySelectorAll("select");
  let idx=0;
  selects.forEach(sel=>{
    const r = parseInt(sel.dataset.r,10);
    // default to first item in row if column index doesn't exist in correct matrix
    let cv = null;
    if(Array.isArray(q.table.correct[r])){
      // prefer same index as number of selected cols (usually 0)
      cv = q.table.correct[r][0] ?? q.table.correct[r];
    } else {
      cv = q.table.correct[r];
    }
    sel.value = cv;
    sel.classList.add("devCorrect");
  });
}

nextBtn.onclick = ()=>{
  const q = randomizedQuestions[currentIndex];
  if(q.table){
    const selects = answerContainer.querySelectorAll("select");
    const vals = []; selects.forEach(s=>vals.push(s.value));
    userAnswers[currentIndex]=vals;
  }
  currentIndex++;
  if(currentIndex>=randomizedQuestions.length) finishExam(); else loadQuestion();
};

function finishExam(){
  let correct=0;
  randomizedQuestions.forEach((q,i)=>{
    if(!q.table){
      if(userAnswers[i] && userAnswers[i].correct) correct++;
    } else {
      const user=userAnswers[i]||[];
      let flatCorr = [];
      if(Array.isArray(q.table.correct)){
        q.table.correct.forEach(row=>{
          if(Array.isArray(row)) flatCorr.push(row[0]);
          else flatCorr.push(row);
        });
      }
      if(JSON.stringify(user)===JSON.stringify(flatCorr)) correct++;
    }
  });
  const percent = Math.round((correct/randomizedQuestions.length)*100);
  scoreText.textContent = `Du hast ${correct} von ${randomizedQuestions.length} richtig (${percent}%).`;
  reviewContainer.innerHTML="";
  randomizedQuestions.forEach((q,i)=>{
    const div=document.createElement("div");
    if(!q.table){
      const ans = userAnswers[i]?.text || "(keine Antwort)";
      div.innerHTML=`<b>Typ:</b> ${q.table ? "Tabelle" : "Multiple Choice"}<br><b>Frage:</b> ${q.question||q.text}<br><b>Geantwortet:</b> ${ans}`;
    } else {
      const ans = (userAnswers[i]||[]).join(", ");
      div.innerHTML=`<b>Typ:</b> ${q.table ? "Tabelle" : "Multiple Choice"}<br><b>Frage:</b> ${q.question||q.text}<br><b>Geantwortet:</b> ${ans}`;
    }
    reviewContainer.appendChild(div);
  });
  showScreen(resultScreen);
}

openMenu.onclick=()=>showScreen(menuScreen);
backBtn.onclick = ()=>showScreen(startScreen);

darkModeSwitch.onchange=()=>{
  if(darkModeSwitch.checked){ document.body.classList.add("dark"); localStorage.setItem("darkMode","1"); }
  else { document.body.classList.remove("dark"); localStorage.removeItem("darkMode"); }
};
if(localStorage.getItem("darkMode")==="1"){ document.body.classList.add("dark"); darkModeSwitch.checked=true; }

devModeSwitch.onchange=()=>{ devMode = devModeSwitch.checked; };

startBtn.onclick=startExam;
restartBtn.onclick=()=>location.reload();
