document.addEventListener('DOMContentLoaded', async () => {
    const userNameContainer = document.getElementById('user-name-container');
    const quizContainer = document.getElementById('quiz-container');
    const resultContainer = document.getElementById('result-container');
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const userNameInput = document.getElementById('user-name');
    const userSchoolInput = document.getElementById('user-school');

    const urlParams = new URLSearchParams(window.location.search);
    const quizIndex = parseInt(urlParams.get('quiz'));

    let quizzes = [];
    let quiz = null;
    let currentQuestionIndex = 0;
    let score = 0;
    let userName = '';
    let userStd = '';
    let userSchool = '';

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
        userStd = quiz.standard || quiz.std || '';

const selectedStdDisplay = document.getElementById('selected-std-display');
if (selectedStdDisplay) {
    selectedStdDisplay.textContent = userStd
        ? `Selected Quiz: Standard ${userStd}`
        : `Selected Quiz: ${quiz.title}`;
}
    } catch (error) {
        console.error('Error loading quiz:', error);
        document.body.innerHTML = '<h1>Error loading quiz!</h1>';
        return;
    }

    startQuizBtn.addEventListener('click', () => {
        userName = userNameInput.value.trim();
userSchool = userSchoolInput.value.trim();
userStd = quiz.standard || quiz.std || userStd;

if (!userName) {
    alert('Please enter your name');
    return;
}

if (!userSchool) {
    alert('Please enter your school name');
    return;
}

if (!userStd) {
    alert('Quiz standard is missing. Please check this quiz in admin panel.');
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
        <div class="quiz-progress-wrap">
            <div class="quiz-progress-info">
                <span>Std ${userStd} | Question ${currentQuestionIndex + 1} of ${quiz.questions.length}</span>
                <span id="timer-text">${QUESTION_TIME}s left</span>
            </div>

            <div class="timer-progress">
                <div id="timer-progress-bar"></div>
            </div>
        </div>

        <div class="quiz-meta">
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

const timerTextEl = document.getElementById('timer-text');
const timerProgressBar = document.getElementById('timer-progress-bar');

if (timerTextEl) {
    timerTextEl.textContent = `${timeLeft}s left`;
}

if (timerProgressBar) {
    timerProgressBar.style.width = '100%';
    timerProgressBar.classList.remove('warning', 'danger');
}

timerId = setInterval(() => {
    timeLeft--;

    const percentageLeft = (timeLeft / QUESTION_TIME) * 100;

    if (timerTextEl) {
        timerTextEl.textContent = `${timeLeft}s left`;
    }

    if (timerProgressBar) {
        timerProgressBar.style.width = `${percentageLeft}%`;
        timerProgressBar.classList.remove('warning', 'danger');

        if (percentageLeft <= 30 && percentageLeft > 15) {
            timerProgressBar.classList.add('warning');
        }

        if (percentageLeft <= 15) {
            timerProgressBar.classList.add('danger');
        }
    }

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
    const attemptsLeft = Math.max(0, MAX_ATTEMPTS - attemptsUsed);

await saveResult(userName, userStd, userSchool, quiz.id, quiz.title, score, quiz.questions.length, percentage);
    try {
        localStorage.setItem('justCompletedQuiz', JSON.stringify({
    userName,
    schoolName: userSchool,
    school: userSchool,
    std: userStd,
    standard: userStd,
    percentage,
    score,
    totalQuestions: quiz.questions.length,
    quizTitle: quiz.title
}));
    } catch (e) {
        console.warn('Could not store recent result in localStorage', e);
    }

    const isQualified = percentage >= 90;

    resultContainer.innerHTML = `
        <div class="result-content redesigned-result">
            <div class="result-icon">
                <i class="fas fa-award"></i>
            </div>

            <span class="page-badge">Challenge Complete</span>

            <h2 class="result-title">
                ${isQualified ? `Excellent work, ${userName}!` : `Good try, ${userName}!`}
            </h2>

            <p class="result-subtitle">
                Std ${userStd} • ${quiz.title}
            </p>

            <div class="score-display">
                <div class="score-ring">
                    <h1>${percentage}%</h1>
                    <p>Score: ${score}/${quiz.questions.length}</p>
                </div>
            </div>

            <div class="attempt-status">
                Attempts used: ${attemptsUsed}/${MAX_ATTEMPTS} | Attempts left: ${attemptsLeft}
            </div>

            ${
                isQualified
                    ? `
                    <div class="scholarship-box">
    <div class="scholarship-card">
        <img src="images/scholarship.gif" alt="Scholarship celebration" class="result-gif">

        <p class="result-mini-title">CONGRATULATIONS!</p>
        <h3>🏆 Ohooo! Topper Energy Detected!</h3>
        <p>
            You scored <strong>${percentage}%</strong> and unlocked 
            <strong>15% scholarship</strong>.
        </p>
        <p>
            Brainy Tuition Classes is ready for you — share this score on WhatsApp and confirm your admission.
        </p>
    </div>

    <button id="claim-whatsapp" class="share-btn whatsapp full-width-btn">
        <i class="fab fa-whatsapp"></i> Confirm Admission on WhatsApp
    </button>
</div>
                    `
                    : `
                    <div class="try-again-box">
    <h3>😄 Oops! Scholarship ne thoda attitude dikha diya.</h3>
    <p>
        You scored <strong>${percentage}%</strong>. You’re close — try again, score 
        <strong>90%+</strong>, and unlock your <strong>15% scholarship</strong>!
    </p>
    <p class="try-again-small">
        Brainy students don’t quit… they retry smarter. 🚀
    </p>
</div>
                    `
            }

            <div class="result-actions">
                <button id="view-leaderboard-btn" class="share-btn leaderboard-result-btn">
                    <i class="fas fa-trophy"></i> View Leaderboard
                </button>

                ${
                    attemptsLeft > 0
                        ? `
                        <button id="retake-quiz" class="share-btn retake-btn">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                        `
                        : `
                        <button disabled class="share-btn retake-btn disabled-btn">
                            <i class="fas fa-ban"></i> No Attempts Left
                        </button>
                        `
                }
            </div>
        </div>
    `;

    if (isQualified) {
        const claimBtn = document.getElementById('claim-whatsapp');
        if (claimBtn) {
            claimBtn.addEventListener('click', () => {
                const waMessage = `Hi Brainy Tuition Classes! I am ${userName} - Std ${userStd}. I scored ${percentage}% on the "${quiz.title}"and qualified for 15% scholarship by scoring 90% or above. Please guide me with the next steps.`;
                window.open(`https://wa.me/8850831979?text=${encodeURIComponent(waMessage)}`, '_blank');
            });
        }
    }

    const leaderboardBtn = document.getElementById('view-leaderboard-btn');
    if (leaderboardBtn) {
        leaderboardBtn.addEventListener('click', () => {
            window.location.href = 'index.html#leaderboard';
        });
    }

    const retakeBtn = document.getElementById('retake-quiz');
    if (retakeBtn) {
        retakeBtn.addEventListener('click', () => {
            location.reload();
        });
    }
}

async function saveResult(userName, std, schoolName, quizId, quizTitle, score, totalQuestions, percentage) {   const result = {
    userName: userName,
    schoolName: schoolName,
    school: schoolName,
    std: std,
    standard: std,
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