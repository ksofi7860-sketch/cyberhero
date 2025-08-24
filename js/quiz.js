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
            
            // BUILD HTML WITH IMAGE SUPPORT
            let questionHTML = `
                <div class="quiz-content">
                    <div class="question-counter">Question ${currentQuestionIndex + 1} of ${quiz.questions.length}</div>
                    <h2 class="question-title">${question.question}</h2>
            `;
            
            // ADD IMAGE/GIF IF PROVIDED
            if (question.imageUrl && question.imageUrl.trim() !== '') {
                questionHTML += `
                    <div class="question-image-container">
                        <img id="question-image" src="${question.imageUrl}" alt="Question illustration" 
                             style="max-width: 100%; max-height: 300px; border-radius: 12px; margin: 20px 0; display: block;"
                             onerror="this.style.display='none';">
                    </div>
                `;
            }
            
            // ADD OPTIONS
            questionHTML += `
                    <div class="options-container">
                        ${question.options.map((option, index) => `
                            <div class="option-card" data-correct="${index === question.answer}">
                                ${option}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
            quizContainer.innerHTML = questionHTML;
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
    let resultGif = '';
    
    // ENHANCED RESULT WITH GIFS BASED ON SCORE
    if (percentage === 100) {
        message = `Hurray ${userName}! You are a Cyber Hero! 🦸‍♂️`;
        emoji = '🎉';
        const perfectGifs = [
            'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
            'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif',
            'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif'
        ];
        resultGif = perfectGifs[Math.floor(Math.random() * perfectGifs.length)];
    } else if (percentage >= 80) {
        message = `Excellent work ${userName}! You're a true Cyber Hero! 🎯`;
        emoji = '🏆';
        const excellentGifs = [
            'https://media.giphy.com/media/3o7absbD7PbTFQa0c8/giphy.gif',
            'https://media.giphy.com/media/26AHPxxnSw1L9T1rW/giphy.gif'
        ];
        resultGif = excellentGifs[Math.floor(Math.random() * excellentGifs.length)];
    } else if (percentage >= 60) {
        message = `Great job ${userName}! Keep learning! 🎊`;
        emoji = '👏';
        if (Math.random() < 0.6) {
            resultGif = 'https://media.giphy.com/media/3o7abA4a0QCXtSxGN2/giphy.gif';
        }
    } else {
        message = `${userName}, keep practicing! You'll get there! 💪`;
        emoji = '📚';
    }
    
    // BUILD RESULT HTML WITH OPTIONAL GIF
    let resultHTML = `
        <div class="result-content">
            <div class="result-emoji">${emoji}</div>
    `;
    
    // ADD GIF IF AVAILABLE
    if (resultGif && Math.random() < 0.8) {
        resultHTML += `
            <div id="result-gif-container">
                <img src="${resultGif}" alt="Celebration" 
                     style="max-width: 250px; height: auto; border-radius: 15px; margin: 20px 0;">
            </div>
        `;
    }
    
    resultHTML += `
            <h2>${message}</h2>
            <div class="score-display">
                <div class="score-circle">
                    <span class="percentage">${percentage}%</span>
                    <span class="score-text">${score}/${quiz.questions.length}</span>
                </div>
            </div>
            
            <!-- 🎯 ADD LEADERBOARD CTA HERE -->
            <div class="leaderboard-cta">
                <p class="leaderboard-message">🏆 <strong>See how you ranked!</strong></p>
                <p class="leaderboard-subtitle">Check your position on the leaderboard</p>
                <button id="view-leaderboard-btn" class="leaderboard-btn">
                    <i class="fas fa-trophy"></i> View Leaderboard
                </button>
            </div>
            
            <div class="share-buttons">
                <button id="share-whatsapp" class="share-btn whatsapp">Share on WhatsApp</button>
                <button id="share-link" class="share-btn copy">Copy Link</button>
                <button id="retake-quiz" class="share-btn retake">Retake Quiz</button>
            </div>
        </div>
    `;
    
    resultContainer.innerHTML = resultHTML;

    // 🎯 ADD LEADERBOARD BUTTON FUNCTIONALITY HERE
    document.getElementById('view-leaderboard-btn').addEventListener('click', () => {
        // Store user's recent result for highlighting on leaderboard
        localStorage.setItem('justCompletedQuiz', JSON.stringify({
            userName: userName,
            score: score,
            percentage: percentage,
            quizId: quiz.id,
            timestamp: new Date().toISOString()
        }));
        
        // Redirect to homepage with leaderboard section
        window.location.href = 'index.html#leaderboard';
    });

    // EXISTING SHARE FUNCTIONALITY (unchanged)
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
