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
        attempt_id: attemptGlobalCounter,
        block_number: 1, 
        condition: 'Baseline', 
        task_type: activeTask.id, 
        user_guess: userInput,
        actual_answer: currentTargetCount,
        is_correct: isCorrect,
        time_spent_seconds: durationSeconds.toFixed(3),
        tab_switches_count: matrixTabSwitches,
        switch_history: historyString, 
        earnings_at_attempt: blockEarnings, 
        timestamp: new Date().toISOString()
    });

    // --- NEW FEEDBACK LOGIC HERE ---
    if (isCorrect) {
        blockEarnings += PAY_PER_MATRIX; 
        updateEarningsUI(); 
        alert(`Correct! The answer was ${currentTargetCount}.`);
    } else {
        alert(`Incorrect. The actual correct answer was ${currentTargetCount}.`);
    }

    generateMatrix(); 
}
