document.addEventListener('DOMContentLoaded', async () => {
    const userNameContainer = document.getElementById('user-name-container');
    const quizContainer = document.getElementById('quiz-container');
    const resultContainer = document.getElementById('result-container');
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const userNameInput = document.getElementById('user-name');

    const urlParams = new URLSearchParams(window.location.search);
    const quizIndex = parseInt(urlParams.get('quiz'));
    
    let quizzes = [];
    let quiz = null;
    let currentQuestionIndex = 0;
    let score = 0;
    let userName = '';

    // Load quizzes from Firebase
    try {
        quizzes = await FirebaseHelper.getQuizzes();
        quiz = quizzes[quizIndex];
        
        if (!quiz) {
            document.body.innerHTML = '<h1>Quiz not found!</h1>';
            return;
        }
    } catch (error) {
        console.error('Error loading quiz:', error);
        document.body.innerHTML = '<h1>Error loading quiz!</h1>';
        return;
    }

    startQuizBtn.addEventListener('click', () => {
        userName = userNameInput.value.trim();
        if (userName) {
            userNameContainer.classList.add('hidden');
            quizContainer.classList.remove('hidden');
            displayQuestion();
        } else {
            alert('Please enter your name.');
        }
    });

    function displayQuestion() {
        if (currentQuestionIndex < quiz.questions.length) {
            const question = quiz.questions[currentQuestionIndex];
            quizContainer.innerHTML = `
                <div class="quiz-content">
                    <div class="question-counter">Question ${currentQuestionIndex + 1} of ${quiz.questions.length}</div>
                    <h2 class="question-title">${question.question}</h2>
                    <div class="options-container">
                        ${question.options.map((option, index) => `
                            <div class="option-card" data-correct="${index === question.answer}">
                                ${option}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            showResult();
        }
    }

    quizContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('option-card')) {
            document.querySelectorAll('.option-card').forEach(card => {
                card.style.pointerEvents = 'none';
                if (card.getAttribute('data-correct') === 'true') {
                    card.classList.add('correct');
                } else {
                    card.classList.add('incorrect');
                }
            });

            if (e.target.getAttribute('data-correct') === 'true') {
                score++;
                e.target.classList.add('selected-correct');
            } else {
                e.target.classList.add('selected-incorrect');
            }

            setTimeout(() => {
                currentQuestionIndex++;
                displayQuestion();
            }, 1500);
        }
    });

    async function showResult() {
        quizContainer.classList.add('hidden');
        resultContainer.classList.remove('hidden');
        
        const percentage = Math.round((score / quiz.questions.length) * 100);
        
        // Save result to Firebase
        await saveResult(userName, quiz.id, quiz.title, score, quiz.questions.length, percentage);
        
        let message = '';
        let emoji = '';
        
        if (percentage === 100) {
            message = `Hurray ${userName}! You are a Cyber Hero! 🦸‍♂️`;
            emoji = '🎉';
        } else if (percentage < 50) {
            message = `${userName}, try another time! 💪`;
            emoji = '📚';
        } else {
            message = `Great job ${userName}! 🎊`;
            emoji = '👏';
        }
        
        resultContainer.innerHTML = `
            <div class="result-content">
                <div class="result-emoji">${emoji}</div>
                <h2>${message}</h2>
                <div class="score-display">
                    <div class="score-circle">
                        <span class="percentage">${percentage}%</span>
                        <span class="score-text">${score}/${quiz.questions.length}</span>
                    </div>
                </div>
                <div class="share-buttons">
                    <button id="share-whatsapp" class="share-btn whatsapp">Share on WhatsApp</button>
                    <button id="share-link" class="share-btn copy">Copy Link</button>
                    <button id="retake-quiz" class="share-btn retake">Retake Quiz</button>
                </div>
            </div>
        `;

        document.getElementById('share-whatsapp').addEventListener('click', () => {
            const shareMessage = `🎯 I scored ${percentage}% (${score}/${quiz.questions.length}) on the "${quiz.title}" quiz! 🔐\n\nLet's test, are you a Cyber Hero??? 🦸‍♂️\n\nTake the challenge: `;
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage + window.location.href)}`;
            window.open(whatsappUrl, '_blank');
        });

        document.getElementById('share-link').addEventListener('click', () => {
            const shareText = `🎯 I scored ${percentage}% (${score}/${quiz.questions.length}) on the "${quiz.title}" quiz! 🔐\n\nLet's test, are you a Cyber Hero??? 🦸‍♂️\n\nTake the challenge: ${window.location.href}`;
            
            navigator.clipboard.writeText(shareText).then(() => {
                alert('Link and message copied to clipboard!');
            }).catch(() => {
                const tempTextarea = document.createElement('textarea');
                tempTextarea.value = shareText;
                document.body.appendChild(tempTextarea);
                tempTextarea.select();
                document.execCommand('copy');
                document.body.removeChild(tempTextarea);
                alert('Link and message copied to clipboard!');
            });
        });

        document.getElementById('retake-quiz').addEventListener('click', () => {
            location.reload();
        });
    }

    async function saveResult(userName, quizId, quizTitle, score, totalQuestions, percentage) {
        const result = {
            userName: userName,
            quizId: quizId,
            quizTitle: quizTitle,
            score: score,
            totalQuestions: totalQuestions,
            percentage: percentage
        };
        
        try {
            await FirebaseHelper.saveQuizResult(result);
        } catch (error) {
            console.error('Error saving result:', error);
        }
    }
});
