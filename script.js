// --- CONFIGURATION ---
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwTb-382RCdi3gz1SdwYAqewjRAkSrab8uhYEfFxKRKYne_GSthlmoi2OmPRLszphji/exec"; // <--- PASTE YOUR GOOGLE SCRIPT URL HERE
const BLOCK_DURATION_SEC = 15 * 60; // 15 minutes
const PAY_PER_MATRIX = 620;        // 620 VND

// --- STATE VARIABLES ---
let participantId = ""; // Unique ID for the participant
let blockEarnings = 0;
let totalEarningsGlobal = 0; // Starts at 0 VND
let timerInterval;
let matrixStartTime = 0;
let currentTargetCount = 0; 
let attemptGlobalCounter = 0; 
let blockStartTime = 0;       
let finalBlockDuration = 0;   
let matrixTabSwitches = 0;    
let matrixSwitchHistory = []; 
let detailedLog = []; 
let activeTask = null; 
let currentGridSize = 4; // Biến mới để theo dõi kích thước lưới hiện tại

// --- TASKS DEFINITIONS ---
const TASK_TYPES = [
    { 
        id: 'numbers', 
        instruction: "Count the number of Zeros (0).", 
        target: 0, 
        generator: (isTarget) => isTarget ? 0 : 1
    },
    { 
        id: 'letters', 
        instruction: "Count the letter 'E'.", 
        target: 'E', 
        generator: (isTarget) => isTarget ? 'E' : 'F' 
    },
    { 
        id: 'shapes', 
        instruction: "Count the TRIANGLES (▲).", 
        target: '▲', 
        generator: (isTarget) => isTarget ? '▲' : '●'
    }
];

// --- VISIBILITY LISTENER ---
document.addEventListener("visibilitychange", () => {
    const taskScreen = document.getElementById('screen-task');
    if (!taskScreen || taskScreen.classList.contains('hidden')) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString('en-GB'); 

    if (document.visibilityState === "hidden") {
        matrixTabSwitches++;
        matrixSwitchHistory.push(`OUT: ${timeString}`);
    } else {
        matrixSwitchHistory.push(`IN: ${timeString}`);
    }
});

// --- NAVIGATION & UI ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
    document.getElementById(screenId).classList.add('active');
}

function toggleSubmitButton() {
    const inputVal = document.getElementById('user-answer').value;
    const btn = document.getElementById('submit-matrix-btn');
    if (inputVal !== "") {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    } else {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
    }
}

function startExperiment() {
    totalEarningsGlobal = 0; 
    detailedLog = []; 
    attemptGlobalCounter = 0; // Đảm bảo đếm câu hỏi từ 0 khi bắt đầu
    
    // GENERATE UNIQUE PARTICIPANT ID (e.g., P_4F8A9B)
    participantId = "P_" + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    activeTask = TASK_TYPES[Math.floor(Math.random() * TASK_TYPES.length)];
    setupBlockIntro();
}

function setupBlockIntro() {
    let introDiv = document.getElementById('screen-block-intro');
    let taskMsg = document.getElementById('block-task-instruction');
    if (!taskMsg) {
        taskMsg = document.createElement('h3');
        taskMsg.id = 'block-task-instruction';
        taskMsg.style.color = "#333";
        taskMsg.style.marginTop = "20px";
        let startBtn = document.querySelector('.start-session-btn');
        introDiv.insertBefore(taskMsg, startBtn);
    }
    taskMsg.innerHTML = `YOUR TASK: <span style="color:#d9534f">${activeTask.instruction}</span>`;

    showScreen('screen-block-intro');
}

function startBlock() {
    showScreen('screen-task');
    blockEarnings = 0; 
    
    document.querySelector('.input-area').style.display = 'flex';
    document.getElementById('task-instruction-label').innerText = activeTask.instruction;

    updateEarningsUI();
    generateMatrix(); 
    
    blockStartTime = Date.now(); 
    startTimer(BLOCK_DURATION_SEC);
}

function generateMatrix() {
    const container = document.getElementById('matrix-container');
    container.innerHTML = '';
    currentTargetCount = 0; 
    matrixTabSwitches = 0; 
    matrixSwitchHistory = []; 

    // --- TÍNH TOÁN KÍCH THƯỚC LƯỚI ĐỘNG ---
    const baseSize = 4; // Bắt đầu bằng lưới 4x4
    const sizeIncrease = Math.floor(attemptGlobalCounter / 2); // Cứ sau 2 câu thì tăng lên 1
    currentGridSize = baseSize + sizeIncrease; // Cập nhật biến State

    const totalCells = currentGridSize * currentGridSize;
    let cellWidth = '40px';
    let cellHeight = '40px';
    
    container.style.gridTemplateColumns = `repeat(${currentGridSize}, ${cellWidth})`;

    for (let i = 0; i < totalCells; i++) {
        let isTarget = Math.random() > 0.5;
        let val = activeTask.generator(isTarget);

        if (isTarget) currentTargetCount++;
        
        let cell = document.createElement('div');
        cell.className = 'matrix-cell';
        cell.innerText = val;
        cell.style.width = cellWidth;
        cell.style.height = cellHeight;
        
        if (activeTask.id === 'shapes') {
            cell.style.fontSize = '24px'; 
        } else if (activeTask.id === 'letters') {
            cell.style.fontSize = '22px'; 
            cell.style.fontFamily = 'Arial, Helvetica, sans-serif'; 
        } else {
            cell.style.fontSize = '20px';
        }

        container.appendChild(cell);
    }
    
    matrixStartTime = Date.now();
    const input = document.getElementById('user-answer');
    input.value = '';
    input.focus();
    toggleSubmitButton();
}

function checkAnswer() {
    const inputField = document.getElementById('user-answer');
    const userInput = parseInt(inputField.value);
    if (isNaN(userInput)) return;

    const isCorrect = (userInput === currentTargetCount);
    const timeNow = Date.now();
    const durationSeconds = (timeNow - matrixStartTime) / 1000;
    
    attemptGlobalCounter++;
    const historyString = matrixSwitchHistory.join(" | ");

    detailedLog.push({
        participant_id: participantId, 
        attempt_id: attemptGlobalCounter,
        block_number: 1, 
        condition: 'Baseline', 
        task_type: activeTask.id, 
        grid_size: `${currentGridSize}x${currentGridSize}`, // Lưu lại lưới hiện tại
        user_guess: userInput,
        actual_answer: currentTargetCount,
        is_correct: isCorrect,
        time_spent_seconds: durationSeconds.toFixed(3),
        tab_switches_count: matrixTabSwitches,
        switch_history: historyString, 
        earnings_at_attempt: blockEarnings, 
        timestamp: new Date().toISOString()
    });

    if (isCorrect) {
        blockEarnings += PAY_PER_MATRIX; 
        updateEarningsUI(); 
        alert(`Correct! The answer was ${currentTargetCount}.`);
    } else {
        alert(`Incorrect. The actual correct answer was ${currentTargetCount}.`);
    }

    generateMatrix(); 
}

function updateEarningsUI() {
    document.getElementById('current-earnings').innerText = blockEarnings.toLocaleString();
}

function startTimer(seconds) {
    let timeLeft = seconds;
    clearInterval(timerInterval); 
    timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            endBlock('time_out'); 
        }
    }, 1000);
}

function stopEarly() {
    if (confirm("If you stop now, you will finish the experiment. There is no penalty for stopping.")) {
        endBlock('manual');
    }
}

function logAbandonedAttempt(reason) {
    const timeNow = Date.now();
    const durationSeconds = (timeNow - matrixStartTime) / 1000;
    const historyString = matrixSwitchHistory.join(" | ");
    
    attemptGlobalCounter++;

    detailedLog.push({
        participant_id: participantId, 
        attempt_id: attemptGlobalCounter,
        block_number: 1,
        condition: 'Baseline',
        task_type: activeTask.id,
        grid_size: `${currentGridSize}x${currentGridSize}`, // Lưu lại lưới hiện tại
        user_guess: "ABANDONED", 
        actual_answer: currentTargetCount,
        is_correct: "FALSE", 
        time_spent_seconds: durationSeconds.toFixed(3),
        tab_switches_count: matrixTabSwitches,
        switch_history: historyString, 
        earnings_at_attempt: blockEarnings,
        timestamp: new Date().toISOString(),
        note: reason === 'time_out' ? "Time Out" : "Stopped Early"
    });
}

function endBlock(reason) {
    clearInterval(timerInterval);
    logAbandonedAttempt(reason);

    finalBlockDuration = (Date.now() - blockStartTime) / 1000;
    totalEarningsGlobal += blockEarnings;

    if (reason === 'time_out') {
        alert("Time is up! Please submit your data on the next screen.");
    }

    detailedLog.forEach(row => {
        row.block_total_duration = finalBlockDuration.toFixed(2);
        row.satisfaction = "N/A";
        row.boredom = "N/A";
        row.final_distraction = "N/A";
        row.age = "N/A";
        row.gender = "N/A";
        row.major = "N/A";
        row.year_of_study = "N/A";
        row.grand_total_earnings = totalEarningsGlobal;
    });

    showFinalResults(); 
}

function showFinalResults() {
    showScreen('screen-end');
    document.getElementById('final-total-earnings').innerText = totalEarningsGlobal.toLocaleString();
}

function saveDataToCloud() {
    if (detailedLog.length === 0) { 
        alert("No data to save."); 
        return; 
    }

    const saveBtn = document.getElementById('save-data-btn');
    saveBtn.innerText = "Saving data, please wait...";
    saveBtn.disabled = true;
    saveBtn.style.opacity = "0.5";

    fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain;charset=utf-8" 
        },
        body: JSON.stringify(detailedLog)
    })
    .then((response) => {
        saveBtn.style.display = "none";
        document.getElementById('save-status-msg').style.display = "block";
        document.getElementById('earnings-display-area').style.display = "block";
    })
    .catch((error) => {
        console.error("Error saving data:", error);
        alert("There was an error saving your data to the cloud. Please download the backup CSV file instead.");
        saveBtn.innerText = "Error Saving";
        document.getElementById('backup-download-btn').style.display = "inline-block";
        document.getElementById('earnings-display-area').style.display = "block";
    });
}

function downloadCSV() {
    if (detailedLog.length === 0) return;
    
    // Thêm cột Grid_Size vào file xuất
    const headers = [
        "Participant_ID", "Attempt_ID", "Block", "Condition", "Task_Type", "Grid_Size",
        "Is_Correct", "User_Guess", "Actual_Answer", "Time_Spent_Sec", 
        "Switch_Count", "Switch_History", 
        "Block_Duration_Total", "Note",
        "Satisfaction", "Boredom", "Timestamp",
        "Distraction_Level", "Age", "Gender", "Major", "Year_Study",
        "GRAND_TOTAL_EARNINGS"
    ];

    const rows = detailedLog.map(row => [
        row.participant_id, row.attempt_id, row.block_number, row.condition, row.task_type, row.grid_size, 
        row.is_correct, row.user_guess, row.actual_answer, row.time_spent_seconds, 
        row.tab_switches_count, row.switch_history, row.block_total_duration, 
        row.note || "", row.satisfaction, row.boredom, row.timestamp,
        row.final_distraction, row.age, row.gender, row.major, row.year_of_study,
        row.grand_total_earnings
    ]);

    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "baseline_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
