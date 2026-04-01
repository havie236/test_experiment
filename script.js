// --- CONFIGURATION ---
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz2uMipYWOvUMxzm6sJfX3A2Uy8GStOlkKNHQpyVMttirowdZS9823AQQ22SFT0t78q/exec"; 

// Round 1 Specs
const R1_DURATION_SEC = 4 * 60; // 4 phút
const R1_PAY = 400;

// Round 2 Specs
const R2_DURATION_SEC = 60 * 60; // 60 phút
const R2_PAY = 1100;

// --- STATE VARIABLES ---
let participantId = ""; 
let assignedCondition = ""; 
let totalEarningsGlobal = 0; 
let currentRound = 1; 

let currentRoundCorrectCount = 0; // Đếm số bảng đúng trong vòng hiện tại

// User Info
let userGender = "";
let userCohort = "";
let userMajor = "";
let userGradYear = "";

// Game State
let timerInterval;
let matrixStartTime = 0;
let currentTargetZeros = 0; 
let wrongAttempts = 0; 
let attemptGlobalCounter = 0; 
let detailedLog = [];
let isExperimentFinished = false; 

// --- NAVIGATION ---
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });
    document.getElementById(id).classList.remove('hidden');
    document.getElementById(id).classList.add('active');
}

function updateCorrectUI() { 
    document.getElementById('tables-correct-count').innerText = currentRoundCorrectCount;
    document.getElementById('current-earnings-text').innerText = totalEarningsGlobal.toLocaleString() + " VND"; 
}

// --- 1. INTRO & PRE-SURVEY ---
function goToPreSurvey() {
    let code = document.getElementById('user-code-input').value.trim();
    
    if(code === "1") assignedCondition = "Low";
    else if(code === "2") assignedCondition = "High";
    else return alert("Please enter a valid code (1 or 2).");

    participantId = `P_Cond${code}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    showScreen('screen-pre-survey');
}

function submitPreSurvey() {
    userGender = document.getElementById('survey-gender').value;
    userCohort = document.getElementById('survey-cohort').value;
    userMajor = document.getElementById('survey-major').value;
    userGradYear = document.getElementById('survey-grad-year').value.trim();

    if(!userGender || !userCohort || !userMajor || !userGradYear) {
        return alert("Please fill out all fields.");
    }
    showScreen('screen-comprehension');
}

// --- 2. COMPREHENSION CHECK 1 (For Part 1) ---
function checkComprehension1() {
    let ans = parseInt(document.getElementById('comp-check-answer').value);
    // Tính toán Part 1: 5 * 400 - 400 = 1600 VND
    if(ans === 1600) {
        alert("Correct! You fully understand the rules for Part 1.");
        startRound1();
    } else {
        alert("Incorrect. Let's calculate together: \n5 correct tables = 5 x 400 = 2000 VND.\n1 table with 3 wrong attempts = -400 VND.\nTotal = 2000 - 400 = 1600 VND.\nPlease enter 1600 to continue.");
    }
}

// --- 3. COMPREHENSION CHECK 2 (For Part 2) ---
function checkComprehension2() {
    let ans = parseInt(document.getElementById('comp-check-answer-2').value);
    // Tính toán Part 2: 5 * 1100 - 1100 = 4400 VND
    if(ans === 4400) {
        alert("Correct! You fully understand the new rules.");
        showTreatmentScreen();
    } else {
        alert("Incorrect. Let's calculate together: \n5 correct tables = 5 x 1100 = 5500 VND.\n1 table with 3 wrong attempts = -1100 VND.\nTotal = 5500 - 1100 = 4480 VND.\nPlease enter 4400 to continue.");
    }
}

// --- 4. PART 1 (4 MINUTES) ---
function startRound1() {
    currentRound = 1;
    currentRoundCorrectCount = 0;
    
    showScreen('screen-task');
    document.getElementById('task-top-text').innerHTML = "You have 4 minutes, to count as many tables as possible.<br>The remaining time is shown in the upper right hand corner.";
    document.getElementById('stop-btn-container').style.display = "none"; 
    
    updateCorrectUI();
    generateMatrix();
    startTimer(R1_DURATION_SEC);
}

// --- 5. TREATMENT SCREEN (BETWEEN ROUND 1 & 2) ---
function showTreatmentScreen() {
    let msgElement = document.getElementById('treatment-message');
    
    // Câu trên màn hình giữa giờ (giữ nguyên bold như ý m muốn)
    if (assignedCondition === "Low") {
        msgElement.innerHTML = `On average, Fulbright students in major ${userMajor} in cohort ${userCohort} earn <strong>24,600 VND</strong> in this round.`;
    } else if (assignedCondition === "High") {
        msgElement.innerHTML = `On average, Fulbright students in major ${userMajor} in cohort ${userCohort} earn <strong>41,000 VND</strong> from this round.`;
    }
    
    showScreen('screen-treatment');
}

// --- 6. PART 2 (60 MINUTES) ---
function startRound2() {
    currentRound = 2;
    currentRoundCorrectCount = 0; // Đếm lại số bảng của Part 2
    
    showScreen('screen-task');
    
    // Tạo câu Treatment KHÔNG in đậm để gắn thẳng vào màn hình làm bài Part 2
    let treatmentPhrase = "";
    if (assignedCondition === "Low") {
        treatmentPhrase = `On average, Fulbright students in major ${userMajor} in cohort ${userCohort} earn 33,000 VND in this round.<br>`;
    } else if (assignedCondition === "High") {
        treatmentPhrase = `On average, Fulbright students in major ${userMajor} in cohort ${userCohort} earn 55,000 VND from this round.<br>`;
    }

    // Ghim trực tiếp câu treatment lên trên dòng hướng dẫn
    document.getElementById('task-top-text').innerHTML = "You can count zeros as long as you want, up to 60 minutes.<br>" + 
        "The remaining time is shown in the upper right hand corner.<br>" + 
        treatmentPhrase;;
    
    document.getElementById('stop-btn-container').style.display = "block"; 
    
    updateCorrectUI();
    generateMatrix();
    startTimer(R2_DURATION_SEC);
}

// --- SHARED TASK LOGIC ---
function generateMatrix() {
    const container = document.getElementById('matrix-container');
    container.innerHTML = ''; 
    currentTargetZeros = 0;
    wrongAttempts = 0; 
    document.getElementById('attempts-warning').innerText = ""; 

    for (let row = 0; row < 10; row++) {
        let rowString = "";
        for (let col = 0; col < 15; col++) {
            let isZero = Math.random() > 0.5;
            if (isZero) currentTargetZeros++;
            rowString += isZero ? '0' : '1';
        }
        let rowDiv = document.createElement('div');
        rowDiv.className = 'matrix-row';
        rowDiv.innerText = rowString;
        container.appendChild(rowDiv);
    }

    matrixStartTime = Date.now();
    const input = document.getElementById('user-answer');
    input.value = '';
    input.focus();
}

function checkAnswer() {
    const val = parseInt(document.getElementById('user-answer').value);
    if (isNaN(val)) return;
    
    const isCorrect = (val === currentTargetZeros);
    const duration = (Date.now() - matrixStartTime) / 1000;
    attemptGlobalCounter++;

    let currentPayRate = (currentRound === 1) ? R1_PAY : R2_PAY;

    detailedLog.push({
        participant_id: participantId,
        condition: assignedCondition,
        gender: userGender,
        cohort: userCohort,
        major: userMajor,
        grad_year: userGradYear,
        round: currentRound,
        attempt_id: attemptGlobalCounter,
        user_guess: val,
        actual_answer: currentTargetZeros,
        is_correct: isCorrect,
        wrong_attempts_on_this_table: wrongAttempts + (isCorrect ? 0 : 1),
        time_spent_seconds: duration.toFixed(3),
        timestamp: new Date().toISOString()
    });

    if (isCorrect) { 
        currentRoundCorrectCount++;
        totalEarningsGlobal += currentPayRate; 
        updateCorrectUI(); 
        generateMatrix(); 
    } else {
        wrongAttempts++;
        if (wrongAttempts >= 3) {
            totalEarningsGlobal -= currentPayRate;
            updateCorrectUI();
            alert(`You entered the wrong number 3 times. ${currentPayRate} VND has been deducted. Moving to next table.`);
            generateMatrix();
        } else {
            let triesLeft = 3 - wrongAttempts;
            document.getElementById('attempts-warning').innerText = `Incorrect. You have ${triesLeft} trie(s) left for this table.`;
            document.getElementById('user-answer').value = '';
            document.getElementById('user-answer').focus();
        }
    }
}

document.getElementById("user-answer").addEventListener("keypress", function(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    checkAnswer();
  }
});

function startTimer(sec) {
    let endTime = Date.now() + (sec * 1000); 
    
    clearInterval(timerInterval);
    timerInterval = setInterval(() => { 
        let left = Math.round((endTime - Date.now()) / 1000); 
        
        if (left <= 0) { 
            clearInterval(timerInterval);
            if (currentRound === 1) {
                alert("Time is up! Part 1 has ended. Please click OK to continue.");
                showScreen('screen-intro-2');
            } else {
                alert("Time is up! Part 2 has ended.");
                showScreen('screen-post-survey');
            }
        } else {
            // HIỂN THỊ ĐẾM NGƯỢC DẠNG TỔNG SỐ GIÂY (GIỐNG HÌNH)
            document.getElementById('timer-display').innerText = left;
        }
    }, 1000);
}

function stopEarly() { 
    if (confirm("Are you sure you want to stop working? You cannot return to the task once stopped.")) {
        clearInterval(timerInterval);
        showScreen('screen-post-survey');
    }
}

// --- 6. POST-SURVEY & END ---
function submitPostSurvey() {
    let comp = document.getElementById('post-competitiveness').value;
    let betterAvg = document.getElementById('post-better-average').value;
    let sat = document.getElementById('post-satisfaction').value;
    let stopReason = document.getElementById('post-stop-reason').value.trim();

    if (!comp || !betterAvg || !sat) {
        return alert("Please answer all multiple-choice questions.");
    }
    if (!stopReason) {
        return alert("Please tell us why you decided to stop working.");
    }

    detailedLog.forEach(row => {
        row.competitiveness = comp;
        row.better_than_average = betterAvg;
        row.earnings_satisfaction = sat;
        row.stop_reason = stopReason; 
        row.final_total_earnings = totalEarningsGlobal;
    });

    document.getElementById('final-total-earnings').innerText = totalEarningsGlobal.toLocaleString();
    showScreen('screen-end');
}

function saveDataToCloud() {
    isExperimentFinished = true; 
    
    const saveBtn = document.getElementById('save-data-btn');
    saveBtn.innerText = "Saving, please wait...";
    saveBtn.disabled = true;

    fetch(GOOGLE_SCRIPT_URL, { 
        method: "POST", 
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" }, 
        body: JSON.stringify(detailedLog) 
    })
    .then(() => { 
        saveBtn.style.display = "none";
        document.getElementById('save-status-msg').style.display = "block";
    })
    .catch(err => {
        console.error(err);
        alert("Error saving to cloud. Please contact the researcher.");
        saveBtn.innerText = "Error - Try Again";
        saveBtn.disabled = false;
        isExperimentFinished = false; 
    });
}

window.addEventListener("beforeunload", function (e) {
    if (!isExperimentFinished && participantId !== "") {
        e.preventDefault();
        e.returnValue = "Wait! Your experiment data is not saved yet.";
    }
});
