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

    async function loadQuizzes() {
        try {
            const quizzes = await FirebaseHelper.getQuizzes();

            if (quizzes.length === 0) {
                quizGrid.innerHTML = '<p class="no-quizzes">No quizzes available yet. Check back soon!</p>';
                return;
            }

            quizGrid.innerHTML = ''; // Clear loading

            quizzes.forEach((quiz, index) => {
                const quizCard = document.createElement('div');
                quizCard.classList.add('quiz-card');
                
                quizCard.innerHTML = `
                    <img src="${quiz.thumbnail}" alt="${quiz.title}" onerror="this.src='https://via.placeholder.com/300x200?text=Quiz+Image'">
                    <h3>${quiz.title}</h3>
                    <p class="quiz-questions">${quiz.questions.length} Questions</p>
                    <button class="play-btn" data-quiz-id="${quiz.id}" data-quiz-index="${index}">Play Quiz</button>
                `;
                
                quizGrid.appendChild(quizCard);
            });

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

    async function loadLeaderboard() {
        try {
            const results = await FirebaseHelper.getQuizResults();
            
            if (results.length === 0) {
                leaderboardContainer.innerHTML = `
                    <div class="no-leaderboard">
                        <i class="fas fa-trophy"></i>
                        <p>No scores yet! Be the first to take a quiz and become a Cyber Hero!</p>
                    </div>
                `;
                return;
            }

            // Get best score for each user
            const userBestScores = {};
            
            results.forEach(result => {
                const userId = result.userName.toLowerCase();
                if (!userBestScores[userId] || result.percentage > userBestScores[userId].percentage) {
                    userBestScores[userId] = result;
                }
            });

            // Convert to array and sort by percentage
            allLeaderboardData = Object.values(userBestScores)
                .sort((a, b) => b.percentage - a.percentage);

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

        let leaderboardHTML = '';
        
        pageData.forEach((user, index) => {
            const globalRank = startIndex + index;
            const rankClass = globalRank < 3 ? `rank-${globalRank + 1}` : '';
            const medal = globalRank === 0 ? '🥇' : globalRank === 1 ? '🥈' : globalRank === 2 ? '🥉' : `#${globalRank + 1}`;
            const heroTitle = user.percentage === 100 ? '<span class="hero-badge">🦸‍♂️ Cyber Hero</span>' : '';
            
            leaderboardHTML += `
                <div class="leaderboard-item ${rankClass}">
                    <div class="rank">${medal}</div>
                    <div class="user-info">
                        <div class="user-name">${user.userName} ${heroTitle}</div>
                        <div class="quiz-name">${user.quizTitle}</div>
                    </div>
                    <div class="score-info">
                        <div class="percentage">${user.percentage}%</div>
                        <div class="score-detail">${user.score}/${user.totalQuestions}</div>
                    </div>
                </div>
            `;
        });

        // Add pagination if needed
        const totalPages = Math.ceil(allLeaderboardData.length / itemsPerPage);
        let paginationHTML = '';
        
        if (totalPages > 1) {
            paginationHTML = `
                <div class="pagination">
                    <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
                        <i class="fas fa-chevron-left"></i> Previous
                    </button>
                    <div class="pagination-info">
                        Page ${currentPage} of ${totalPages} (${allLeaderboardData.length} total entries)
                    </div>
                    <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
                        Next <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            `;
        }

        leaderboardContainer.innerHTML = leaderboardHTML + paginationHTML;
    }

    // Make changePage function global
    window.changePage = function(page) {
        if (page >= 1 && page <= Math.ceil(allLeaderboardData.length / itemsPerPage)) {
            displayLeaderboardPage(page);
            document.querySelector('.leaderboard-section').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    };
});
