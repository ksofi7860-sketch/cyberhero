document.addEventListener('DOMContentLoaded', async () => {
    const userNameContainer = document.getElementById('user-name-container');
    const quizContainer = document.getElementById('quiz-container');
    const resultContainer = document.getElementById('result-container');
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const userNameInput = document.getElementById('user-name');
    const userStdInput = document.getElementById('user-std');

    const urlParams = new URLSearchParams(window.location.search);
    const quizIndex = parseInt(urlParams.get('quiz'));

    let quizzes = [];
    let quiz = null;
    let currentQuestionIndex = 0;
    let score = 0;
    let userName = '';
    let userStd = '';

    let timerId = null;
    const QUESTION_TIME = 35;
    let timeLeft = QUESTION_TIME;

    const MAX_ATTEMPTS = 3;

    try {
        quizzes = await FirebaseHelper.getQuizzes();
        quiz = quizzes[quizIndex];

        if (!quiz) {
            document.body.innerHTML = '<div class="error-msg"><h1>Quiz not found!</h1><a href="index.html">Back to Home</a></div>';
            return;
        }
    } catch (error) {
        console.error('Error loading quiz:', error);
        document.body.innerHTML = '<h1>Error loading quiz!</h1>';
        return;
    }

    startQuizBtn.addEventListener('click', () => {
        userName = userNameInput.value.trim();
        userStd = userStdInput.value;

        if (!userName || !userStd) {
            alert('Please enter your name and select your Standard (5-9).');
            return;
        }

        const attemptKey = getAttemptKey(userName, userStd, quiz.id);
        const attemptsUsed = parseInt(localStorage.getItem(attemptKey) || '0', 10);

        if (attemptsUsed >= MAX_ATTEMPTS) {
            alert('You have already used all 3 attempts for this quiz.');
            return;
        }

        userNameContainer.classList.add('hidden');
        quizContainer.classList.remove('hidden');
        currentQuestionIndex = 0;
        score = 0;
        displayQuestion();
    });

    function getAttemptKey(name, std, quizId) {
        return `brainy_attempt_${name.toLowerCase().replace(/\s+/g, '_')}_${std}_${quizId}`;
    }

    function clearQuestionTimer() {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
    }

    function getAttemptsUsed() {
        const attemptKey = getAttemptKey(userName, userStd, quiz.id);
        return parseInt(localStorage.getItem(attemptKey) || '0', 10);
    }

    function incrementAttempts() {
        const attemptKey = getAttemptKey(userName, userStd, quiz.id);
        const attemptsUsed = getAttemptsUsed();
        localStorage.setItem(attemptKey, attemptsUsed + 1);
    }

    function displayQuestion() {
        clearQuestionTimer();

        if (currentQuestionIndex >= quiz.questions.length) {
            showResult();
            return;
        }

        const question = quiz.questions[currentQuestionIndex];
        const attemptsLeft = MAX_ATTEMPTS - getAttemptsUsed();

        let questionHTML = `
            <div class="quiz-content">
                <div class="question-header">
                    <div class="question-counter">
                        Std ${userStd} | Question ${currentQuestionIndex + 1} of ${quiz.questions.length}
                    </div>
                    <div class="timer">
                        Time left: <span id="timer-value">${QUESTION_TIME}</span>s
                    </div>
                </div>

                <div class="quiz-meta" style="margin: 10px 0 15px; color: #6a1b9a; font-weight: 600;">
                    Attempts left: ${attemptsLeft} / ${MAX_ATTEMPTS} | Scholarship up to 15%
                </div>

                <h2 class="question-title">${question.question}</h2>
        `;

        if (question.imageUrl) {
            questionHTML += `
                <div class="question-image-container">
                    <img id="question-image" src="${question.imageUrl}" alt="illustration" style="max-width: 100%; border-radius: 12px; margin: 15px 0;">
                </div>
            `;
        }

        questionHTML += `
                <div class="options-container">
                    ${question.options.map((option, index) => `
                        <div class="option-card" data-index="${index}" data-correct="${index === question.answer}">
                            ${option}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        quizContainer.innerHTML = questionHTML;

        timeLeft = QUESTION_TIME;
        const timerValueEl = document.getElementById('timer-value');

        timerId = setInterval(() => {
            timeLeft--;
            if (timerValueEl) timerValueEl.textContent = timeLeft;

            if (timeLeft <= 0) {
                clearQuestionTimer();
                handleTimeUp();
            }
        }, 1000);
    }

    function handleTimeUp() {
        const optionCards = quizContainer.querySelectorAll('.option-card');
        const question = quiz.questions[currentQuestionIndex];

        optionCards.forEach((card, idx) => {
            card.style.pointerEvents = 'none';
            if (idx === question.answer) {
                card.classList.add('correct');
            }
        });

        setTimeout(() => {
            currentQuestionIndex++;
            displayQuestion();
        }, 1000);
    }

    quizContainer.addEventListener('click', (e) => {
        if (!e.target.classList.contains('option-card')) return;

        const selectedCard = e.target;
        const selectedIndex = parseInt(selectedCard.getAttribute('data-index'), 10);
        const question = quiz.questions[currentQuestionIndex];

        const alreadyLocked = selectedCard.parentElement.classList.contains('locked');
        if (alreadyLocked) return;

        clearQuestionTimer();

        const optionCards = quizContainer.querySelectorAll('.option-card');
        optionCards.forEach((card, idx) => {
            card.style.pointerEvents = 'none';
            if (idx === question.answer) {
                card.classList.add('correct');
            }
        });

        if (selectedIndex === question.answer) {
            score++;
            selectedCard.classList.add('selected-correct');
        } else {
            selectedCard.classList.add('selected-incorrect');
        }

        selectedCard.parentElement.classList.add('locked');

        setTimeout(() => {
            currentQuestionIndex++;
            displayQuestion();
        }, 1000);
    });

    async function showResult() {
        clearQuestionTimer();
        incrementAttempts();

        quizContainer.classList.add('hidden');
        resultContainer.classList.remove('hidden');

        const percentage = Math.round((score / quiz.questions.length) * 100);
        const attemptsUsed = getAttemptsUsed();
        const attemptsLeft = MAX_ATTEMPTS - attemptsUsed;

        await saveResult(userName, userStd, quiz.id, quiz.title, score, quiz.questions.length, percentage);

        try {
            localStorage.setItem('justCompletedQuiz', JSON.stringify({
                userName,
                std: userStd,
                percentage,
                score,
                totalQuestions: quiz.questions.length,
                quizTitle: quiz.title
            }));
        } catch (e) {
            console.warn('Could not store recent result in localStorage', e);
        }

        const isQualified = percentage >= 80;

        let message = '';
        let resultBoxHTML = '';

        if (isQualified) {
            message = `Excellent work, ${userName}!`;
            resultBoxHTML = `
                <div class="discount-box" style="background: #f3e8ff; border: 2px dashed #7b1fa2; padding: 20px; border-radius: 15px; margin: 20px 0;">
                    <h3 style="color: #6a1b9a; margin-top: 0;">🎓 Scholarship Opportunity Unlocked!</h3>
                    <p>You scored ${percentage}% and are eligible for up to <strong>15% scholarship</strong> on admission at Brainy Tuition Classes.</p>
                    <p>You can share this result on WhatsApp to continue your admission process.</p>
                    <button id="claim-whatsapp" class="share-btn whatsapp" style="background: #25D366; color: white; width: 100%; padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                        <i class="fab fa-whatsapp"></i> Continue on WhatsApp
                    </button>
                </div>
            `;
        } else {
            message = `Good try, ${userName}!`;
            resultBoxHTML = `
                <p style="margin: 20px 0;">
                    You scored ${percentage}%. Score 80% or above to become eligible for up to <b>15% scholarship</b> on admission.
                </p>
            `;
        }

        resultContainer.innerHTML = `
            <div class="result-content">
                <h2>${message}</h2>
                <div class="score-display">
                    <div class="score-circle">
                        <span class="percentage" style="display: block; font-size: 2.5rem; font-weight: bold;">${percentage}%</span>
                        <span class="score-text">Score: ${score}/${quiz.questions.length}</span>
                    </div>
                </div>

                <div style="margin: 14px 0; color: #6a1b9a; font-weight: 600;">
                    Attempts used: ${attemptsUsed}/${MAX_ATTEMPTS} | Attempts left: ${attemptsLeft < 0 ? 0 : attemptsLeft}
                </div>

                ${resultBoxHTML}

                <div class="action-buttons" style="display: flex; flex-direction: column; gap: 10px;">
                    <button id="view-leaderboard-btn" class="leaderboard-btn" style="padding: 12px; background: #6a1b9a; color: white; border: none; border-radius: 8px;">
                        <i class="fas fa-trophy"></i> View Leaderboard
                    </button>
                    ${attemptsLeft > 0 ? `
                        <button id="retake-quiz" class="share-btn retake" style="padding: 12px; border: 1px solid #ddd; border-radius: 8px;">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                    ` : `
                        <button disabled class="share-btn retake" style="padding: 12px; border: 1px solid #ddd; border-radius: 8px; opacity: 0.6; cursor: not-allowed;">
                            <i class="fas fa-ban"></i> No Attempts Left
                        </button>
                    `}
                </div>
            </div>
        `;

        if (isQualified) {
            const claimBtn = document.getElementById('claim-whatsapp');
            if (claimBtn) {
                claimBtn.addEventListener('click', () => {
                    const waMessage = `Hi Brainy Tuition Classes! I am ${userName} from Std ${userStd}. I scored ${percentage}% on the "${quiz.title}" quiz and I am eligible for up to 15% scholarship on admission. Please guide me with the next steps.`;
                    window.open(`https://wa.me/YOUR_PHONE_NUMBER?text=${encodeURIComponent(waMessage)}`, '_blank');
                });
            }
        }

        document.getElementById('view-leaderboard-btn').addEventListener('click', () => {
            window.location.href = 'index.html#leaderboard';
        });

        const retakeBtn = document.getElementById('retake-quiz');
        if (retakeBtn) {
            retakeBtn.addEventListener('click', () => {
                location.reload();
            });
        }
    }

    async function saveResult(userName, std, quizId, quizTitle, score, totalQuestions, percentage) {
        const result = {
            userName: userName,
            std: std,
            quizId: quizId,
            quizTitle: quizTitle,
            score: score,
            totalQuestions: totalQuestions,
            percentage: percentage,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await FirebaseHelper.saveQuizResult(result);
        } catch (error) {
            console.error('Error saving result:', error);
        }
    }
});