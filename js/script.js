document.addEventListener('DOMContentLoaded', async () => {
    const quizGrid = document.getElementById('quiz-grid');
    const leaderboardContainer = document.getElementById('leaderboard-container');
    
    let currentPage = 1;
    const itemsPerPage = 10;
    let allLeaderboardData = [];
    
    // Show loading state
    showLoading();
    
    // Load data from Firebase
    await loadQuizzes();
    await loadLeaderboard();
    
    function showLoading() {
        quizGrid.innerHTML = '<div class="loading">Loading quizzes...</div>';
        leaderboardContainer.innerHTML = '<div class="loading">Loading leaderboard...</div>';
    }

    // ====== QUIZ CARDS (HOME GRID) ======
    async function loadQuizzes() {
    try {
        const quizzes = await FirebaseHelper.getQuizzes();

        if (!quizzes || quizzes.length === 0) {
            quizGrid.innerHTML = '<p class="no-quizzes">No quizzes available yet. Check back soon!</p>';
            return;
        }

        window.allBrainyQuizzes = quizzes;

        const boardChoiceGrid = document.getElementById('board-choice-grid');
        const selectedBoardHead = document.getElementById('selected-board-head');
        const selectedBoardTitle = document.getElementById('selected-board-title');
        const backToBoardsBtn = document.getElementById('back-to-boards');

        quizGrid.innerHTML = '';
        quizGrid.classList.add('hidden');

        if (boardChoiceGrid) {
            boardChoiceGrid.addEventListener('click', (e) => {
                const boardCard = e.target.closest('.board-choice-card');
                if (!boardCard) return;

                const selectedBoard = boardCard.getAttribute('data-board');
                showBoardQuizzes(selectedBoard);
            });
        }

        if (backToBoardsBtn) {
            backToBoardsBtn.addEventListener('click', () => {
                quizGrid.classList.add('hidden');
                quizGrid.innerHTML = '';

                if (boardChoiceGrid) boardChoiceGrid.classList.remove('hidden');
                if (selectedBoardHead) selectedBoardHead.classList.add('hidden');
            });
        }

        function showBoardQuizzes(board) {
            const filteredQuizzes = quizzes.filter((quiz) => {
                const quizBoard = String(quiz.board || '').toLowerCase();

                if (board === 'SSC') {
                    return quizBoard.includes('ssc') || quizBoard.includes('maharashtra');
                }

                if (board === 'ICSE') {
                    return quizBoard.includes('icse');
                }

                return false;
            });

            if (boardChoiceGrid) boardChoiceGrid.classList.add('hidden');
            if (selectedBoardHead) selectedBoardHead.classList.remove('hidden');
            if (selectedBoardTitle) selectedBoardTitle.textContent = `${board} Scholarship Quiz`;

            quizGrid.classList.remove('hidden');
            quizGrid.innerHTML = '';

            if (filteredQuizzes.length === 0) {
                quizGrid.innerHTML = `
                    <p class="no-quizzes">
                        No ${board} quizzes available yet. Please check back soon!
                    </p>
                `;
                return;
            }

            filteredQuizzes.forEach((quiz) => {
                const originalIndex = quizzes.findIndex((item) => item.id === quiz.id);

                const quizCard = document.createElement('div');
                quizCard.classList.add('quiz-card');

                quizCard.innerHTML = `
                    <img src="${quiz.thumbnail || 'https://via.placeholder.com/300x200?text=Brainy+Quiz'}" alt="${quiz.title}"
                         onerror="this.src='https://via.placeholder.com/300x200?text=Brainy+Quiz'">
                    <h3>${quiz.title}</h3>
                    <p class="quiz-questions">
                        ${quiz.board || board} · Std ${quiz.standard || quiz.std || '-'} · ${quiz.questions?.length || 0} Questions
                    </p>
                    <button class="play-btn" data-quiz-index="${originalIndex}">Take Quiz</button>
                `;

                quizGrid.appendChild(quizCard);
            });
        }

        quizGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('play-btn')) {
                const quizIndex = e.target.getAttribute('data-quiz-index');
                window.location.href = `quiz.html?quiz=${quizIndex}`;
            }
        });

    } catch (error) {
        console.error('Error loading quizzes:', error);
        quizGrid.innerHTML = '<p class="error">Error loading quizzes. Please refresh the page.</p>';
    }
}

    // ====== LEADERBOARD (TOP BRAINY SCHOLARS) ======
    async function loadLeaderboard() {
        try {
            const results = await FirebaseHelper.getQuizResults();
            
            if (!results || results.length === 0) {
                leaderboardContainer.innerHTML = `
                    <div class="no-leaderboard">
                        <i class="fas fa-trophy"></i>
                        <p>No scores yet! Be the first Brainy Scholar to take a quiz!</p>
                    </div>
                `;
                return;
            }

            // Best score for each user (overall)
            const userBestScores = {};
            
            results.forEach(result => {
                const userId = result.userName.toLowerCase();
                if (!userBestScores[userId] || result.percentage > userBestScores[userId].percentage) {
                    userBestScores[userId] = result;
                }
            });

            // Sort descending by percentage
            allLeaderboardData = Object.values(userBestScores)
                .sort((a, b) => b.percentage - a.percentage);

            // Check if we just completed a quiz
            const justCompleted = JSON.parse(localStorage.getItem('justCompletedQuiz') || '{}');
            
            if (justCompleted.userName) {
                showCompletionMessage(justCompleted);
                
                setTimeout(() => {
                    const leaderboardSection = document.querySelector('.leaderboard-section') || 
                                              document.getElementById('leaderboard');
                    if (leaderboardSection) {
                        leaderboardSection.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 1000);
            }

            displayLeaderboardPage(1);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            leaderboardContainer.innerHTML = '<p class="error">Error loading leaderboard. Please refresh the page.</p>';
        }
    }

    function displayLeaderboardPage(page) {
        currentPage = page;
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = allLeaderboardData.slice(startIndex, endIndex);

        const justCompleted = JSON.parse(localStorage.getItem('justCompletedQuiz') || '{}');

        let leaderboardHTML = '';

        pageData.forEach((user, index) => {
            const globalRank = startIndex + index;
            const rankClass = globalRank < 3 ? `rank-${globalRank + 1}` : '';
            const medal = globalRank === 0 ? '🥇' : globalRank === 1 ? '🥈' : globalRank === 2 ? '🥉' : `#${globalRank + 1}`;
            const heroTitle = user.percentage === 100 ? '<span class="hero-badge">Brainy Star ⭐</span>' : '';
            
            const isRecentUser = justCompleted.userName && 
                                 justCompleted.userName.toLowerCase() === user.userName.toLowerCase() && 
                                 Math.abs(justCompleted.percentage - user.percentage) < 1;

            leaderboardHTML += `
                <div class="leaderboard-item ${rankClass} ${isRecentUser ? 'highlight-user' : ''}">
                    <div class="rank">${medal}</div>
                    <div class="user-info">
                        <div class="user-name">
${user.userName} 
<span class="std-chip">
    Std ${user.std || user.standard || '-'} 
    ${user.schoolName || user.school ? `- ${user.schoolName || user.school}` : ''}
</span> 
${heroTitle}                            ${isRecentUser ? '<span class="recent-badge">YOU!</span>' : ''}
                        </div>
                        <div class="quiz-name">${user.quizTitle}</div>
                    </div>
                    <div class="score-info">
                        <div class="percentage">${user.percentage}%</div>
                        <div class="score-detail">${user.score}/${user.totalQuestions}</div>
                    </div>
                </div>
            `;
        });

        const totalPages = Math.ceil(allLeaderboardData.length / itemsPerPage);
        let paginationHTML = '';
        
        if (totalPages > 1) {
            paginationHTML = `
                <div class="pagination">
                    <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
                        <i class="fas fa-chevron-left"></i> Previous
                    </button>
                    <div class="pagination-info">
                        Page ${currentPage} of ${totalPages} (${allLeaderboardData.length} entries)
                    </div>
                    <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
                        Next <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            `;
        }

        leaderboardContainer.innerHTML = leaderboardHTML + paginationHTML;
        
        if (justCompleted.userName) {
            setTimeout(() => {
                localStorage.removeItem('justCompletedQuiz');
                document.querySelectorAll('.highlight-user').forEach(item => {
                    item.classList.remove('highlight-user');
                });
                document.querySelectorAll('.recent-badge').forEach(badge => {
                    badge.remove();
                });
            }, 5000);
        }
    }

    // Small toast after quiz complete
    function showCompletionMessage(completedQuiz) {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 25px;
            z-index: 1000;
            font-weight: 600;
            font-size: 1.1em;
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
            text-align: center;
            max-width: 90%;
        `;
        
        message.innerHTML = `
            🏆 <strong>Great job ${completedQuiz.userName}!</strong><br>
            Your score: ${completedQuiz.percentage}% - Check your ranking below!
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 5000);
    }

    // Make changePage function global (for pagination buttons)
    window.changePage = function(page) {
        if (page >= 1 && page <= Math.ceil(allLeaderboardData.length / itemsPerPage)) {
            displayLeaderboardPage(page);
            const section = document.querySelector('.leaderboard-section');
            if (section) {
                section.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        }
    };
});