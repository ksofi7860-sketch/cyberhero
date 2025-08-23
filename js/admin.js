// Add password reset toggle functionality
document.addEventListener('DOMContentLoaded', () => {
    // ... your existing admin.js code ...

    // Password reset toggle
    const changePasswordToggle = document.getElementById('change-password-toggle');
    const passwordResetSection = document.getElementById('password-reset-section');
    const cancelPasswordReset = document.getElementById('cancel-password-reset');

    if (changePasswordToggle) {
        changePasswordToggle.addEventListener('click', () => {
            passwordResetSection.classList.toggle('hidden');
        });
    }

    if (cancelPasswordReset) {
        cancelPasswordReset.addEventListener('click', () => {
            passwordResetSection.classList.add('hidden');
            // Clear form
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
            document.getElementById('password-message').textContent = '';
        });
    }

    // ... rest of your existing admin.js code ...
});


document.addEventListener('DOMContentLoaded', async () => {
    const createQuizForm = document.getElementById('create-quiz-form');
    const questionsContainer = document.getElementById('questions-container');
    const addQuestionBtn = document.getElementById('add-question-btn');
    const createQuizTab = document.getElementById('create-quiz-tab');
    const manageQuizzesTab = document.getElementById('manage-quizzes-tab');
    const viewResultsTab = document.getElementById('view-results-tab');
    const createQuizSection = document.getElementById('create-quiz-section');
    const manageQuizzesSection = document.getElementById('manage-quizzes-section');
    const viewResultsSection = document.getElementById('view-results-section');
    const quizSelect = document.getElementById('quiz-select');
    const resultsDisplay = document.getElementById('results-display');
    const quizzesList = document.getElementById('quizzes-list');
    const resetLeaderboardBtn = document.getElementById('reset-leaderboard-btn');
    
    let questionCount = 0;
    let editingQuizId = null;
    let allQuizzes = [];

    // Load initial data
    await loadQuizzesList();
    await loadQuizSelector();

    // Reset leaderboard functionality
    resetLeaderboardBtn.addEventListener('click', async () => {
        if (confirm('⚠️ Are you sure you want to delete ALL leaderboard data? This cannot be undone!')) {
            if (confirm('This will remove all user scores permanently from the database. Continue?')) {
                try {
                    resetLeaderboardBtn.disabled = true;
                    resetLeaderboardBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Clearing...';
                    
                    const success = await FirebaseHelper.clearAllResults();
                    
                    if (success) {
                        alert('✅ Leaderboard data has been cleared successfully!');
                        // Clear results display if visible
                        if (!viewResultsSection.classList.contains('hidden')) {
                            resultsDisplay.innerHTML = '<p>No results found.</p>';
                        }
                    } else {
                        alert('❌ Error clearing leaderboard data. Please try again.');
                    }
                } catch (error) {
                    console.error('Error clearing leaderboard:', error);
                    alert('❌ Error clearing leaderboard data. Please try again.');
                } finally {
                    resetLeaderboardBtn.disabled = false;
                    resetLeaderboardBtn.innerHTML = '<i class="fas fa-trash"></i> Reset Leaderboard Data';
                }
            }
        }
    });

    // Tab switching
    createQuizTab.addEventListener('click', () => {
        showCreateQuizSection();
    });

    manageQuizzesTab.addEventListener('click', () => {
        showManageQuizzesSection();
    });

    viewResultsTab.addEventListener('click', () => {
        showViewResultsSection();
    });

    function showCreateQuizSection() {
        createQuizSection.classList.remove('hidden');
        manageQuizzesSection.classList.add('hidden');
        viewResultsSection.classList.add('hidden');
        createQuizTab.classList.add('active');
        manageQuizzesTab.classList.remove('active');
        viewResultsTab.classList.remove('active');
    }

    async function showManageQuizzesSection() {
        createQuizSection.classList.add('hidden');
        manageQuizzesSection.classList.remove('hidden');
        viewResultsSection.classList.add('hidden');
        createQuizTab.classList.remove('active');
        manageQuizzesTab.classList.add('active');
        viewResultsTab.classList.remove('active');
        await loadQuizzesList();
    }

    async function showViewResultsSection() {
        createQuizSection.classList.add('hidden');
        manageQuizzesSection.classList.add('hidden');
        viewResultsSection.classList.remove('hidden');
        createQuizTab.classList.remove('active');
        manageQuizzesTab.classList.remove('active');
        viewResultsTab.classList.add('active');
        await loadQuizSelector();
    }

    // Create Quiz functionality
    addQuestionBtn.addEventListener('click', () => {
        questionCount++;
        const questionDiv = document.createElement('div');
        questionDiv.classList.add('question-block');
        questionDiv.innerHTML = `
            <hr>
            <h4>Question ${questionCount}</h4>
            <input type="text" placeholder="Question" class="question-text" required>
            
            <div class="option-group">
                <div class="option-row">
                    <input type="radio" name="correct-${questionCount}" value="0" class="correct-radio">
                    <input type="text" placeholder="Option 1" class="option-text" required>
                    <label>✓ Correct Answer</label>
                </div>
                <div class="option-row">
                    <input type="radio" name="correct-${questionCount}" value="1" class="correct-radio">
                    <input type="text" placeholder="Option 2" class="option-text" required>
                    <label>✓ Correct Answer</label>
                </div>
                <div class="option-row">
                    <input type="radio" name="correct-${questionCount}" value="2" class="correct-radio">
                    <input type="text" placeholder="Option 3" class="option-text" required>
                    <label>✓ Correct Answer</label>
                </div>
                <div class="option-row">
                    <input type="radio" name="correct-${questionCount}" value="3" class="correct-radio">
                    <input type="text" placeholder="Option 4" class="option-text" required>
                    <label>✓ Correct Answer</label>
                </div>
            </div>
            <button type="button" class="remove-question-btn">Remove Question</button>
        `;
        questionsContainer.appendChild(questionDiv);
    });

    // Remove question functionality
    questionsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-question-btn')) {
            e.target.parentNode.remove();
        }
    });

    createQuizForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            const title = document.getElementById('quiz-title').value;
            const thumbnail = document.getElementById('quiz-thumbnail').value;
            const questions = [];

            document.querySelectorAll('.question-block').forEach(block => {
                const questionText = block.querySelector('.question-text').value;
                const options = Array.from(block.querySelectorAll('.option-text')).map(input => input.value);
                
                const correctRadio = block.querySelector('input[type="radio"]:checked');
                if (!correctRadio) {
                    throw new Error('Please select the correct answer for all questions.');
                }
                const correctAnswer = parseInt(correctRadio.value, 10);

                questions.push({
                    question: questionText,
                    options: options,
                    answer: correctAnswer
                });
            });

            if (questions.length === 0) {
                throw new Error('Please add at least one question.');
            }

            const quizData = { title, thumbnail, questions };

            if (editingQuizId) {
                await FirebaseHelper.updateQuiz(editingQuizId, quizData);
                alert('Quiz updated successfully!');
                editingQuizId = null;
            } else {
                await FirebaseHelper.saveQuiz(quizData);
                alert('Quiz saved successfully!');
            }
            
            createQuizForm.reset();
            questionsContainer.innerHTML = '';
            questionCount = 0;
            
            // Refresh quiz lists
            await loadQuizzesList();
            await loadQuizSelector();
            
        } catch (error) {
            console.error('Error saving quiz:', error);
            alert(error.message || 'Error saving quiz. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    // Manage Quizzes functionality
    async function loadQuizzesList() {
        try {
            quizzesList.innerHTML = '<div class="loading">Loading quizzes...</div>';
            
            allQuizzes = await FirebaseHelper.getQuizzes();
            
            if (allQuizzes.length === 0) {
                quizzesList.innerHTML = '<p>No quizzes created yet.</p>';
                return;
            }

            let html = '';
            allQuizzes.forEach((quiz) => {
                html += `
                    <div class="quiz-management-card">
                        <img src="${quiz.thumbnail}" alt="${quiz.title}" onerror="this.src='https://via.placeholder.com/150x100?text=Quiz'">
                        <div class="quiz-info">
                            <div>
                                <h3>${quiz.title}</h3>
                                <p>Questions: ${quiz.questions.length}</p>
                            </div>
                            <div class="quiz-actions">
                                <button class="edit-btn" data-quiz-id="${quiz.id}">Edit</button>
                                <button class="delete-btn" data-quiz-id="${quiz.id}">Delete</button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            quizzesList.innerHTML = html;
        } catch (error) {
            console.error('Error loading quizzes:', error);
            quizzesList.innerHTML = '<p class="error">Error loading quizzes. Please refresh the page.</p>';
        }
    }

    quizzesList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const quizId = e.target.getAttribute('data-quiz-id');
            await editQuiz(quizId);
        } else if (e.target.classList.contains('delete-btn')) {
            const quizId = e.target.getAttribute('data-quiz-id');
            await deleteQuiz(quizId);
        }
    });

    async function editQuiz(quizId) {
        const quiz = allQuizzes.find(q => q.id === quizId);
        if (!quiz) return;
        
        editingQuizId = quizId;
        
        // Fill form with quiz data
        document.getElementById('quiz-title').value = quiz.title;
        document.getElementById('quiz-thumbnail').value = quiz.thumbnail;
        
        // Clear existing questions
        questionsContainer.innerHTML = '';
        questionCount = 0;
        
        // Add questions to form
        quiz.questions.forEach((question) => {
            questionCount++;
            const questionDiv = document.createElement('div');
            questionDiv.classList.add('question-block');
            questionDiv.innerHTML = `
                <hr>
                <h4>Question ${questionCount}</h4>
                <input type="text" placeholder="Question" class="question-text" required value="${question.question}">
                
                <div class="option-group">
                    <div class="option-row">
                        <input type="radio" name="correct-${questionCount}" value="0" class="correct-radio" ${question.answer === 0 ? 'checked' : ''}>
                        <input type="text" placeholder="Option 1" class="option-text" required value="${question.options[0]}">
                        <label>✓ Correct Answer</label>
                    </div>
                    <div class="option-row">
                        <input type="radio" name="correct-${questionCount}" value="1" class="correct-radio" ${question.answer === 1 ? 'checked' : ''}>
                        <input type="text" placeholder="Option 2" class="option-text" required value="${question.options[1]}">
                        <label>✓ Correct Answer</label>
                    </div>
                    <div class="option-row">
                        <input type="radio" name="correct-${questionCount}" value="2" class="correct-radio" ${question.answer === 2 ? 'checked' : ''}>
                        <input type="text" placeholder="Option 3" class="option-text" required value="${question.options[2]}">
                        <label>✓ Correct Answer</label>
                    </div>
                    <div class="option-row">
                        <input type="radio" name="correct-${questionCount}" value="3" class="correct-radio" ${question.answer === 3 ? 'checked' : ''}>
                        <input type="text" placeholder="Option 4" class="option-text" required value="${question.options[3]}">
                        <label>✓ Correct Answer</label>
                    </div>
                </div>
                <button type="button" class="remove-question-btn">Remove Question</button>
            `;
            questionsContainer.appendChild(questionDiv);
        });
        
        // Switch to create quiz tab
        showCreateQuizSection();
    }

    async function deleteQuiz(quizId) {
        if (confirm('Are you sure you want to delete this quiz?')) {
            try {
                await FirebaseHelper.deleteQuiz(quizId);
                alert('Quiz deleted successfully!');
                await loadQuizzesList();
                await loadQuizSelector();
            } catch (error) {
                console.error('Error deleting quiz:', error);
                alert('Error deleting quiz. Please try again.');
            }
        }
    }

    // View Results functionality
    async function loadQuizSelector() {
        try {
            const quizzes = await FirebaseHelper.getQuizzes();
            quizSelect.innerHTML = '<option value="">Select a quiz to view results</option>';
            
            quizzes.forEach((quiz) => {
                const option = document.createElement('option');
                option.value = quiz.id;
                option.textContent = quiz.title;
                quizSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading quiz selector:', error);
        }
    }

    quizSelect.addEventListener('change', async (e) => {
        const selectedQuizId = e.target.value;
        if (selectedQuizId !== '') {
            await displayResults(selectedQuizId);
        } else {
            resultsDisplay.innerHTML = '';
        }
    });

    async function displayResults(quizId) {
        try {
            resultsDisplay.innerHTML = '<div class="loading">Loading results...</div>';
            
            const allResults = await FirebaseHelper.getQuizResults();
            const quizResults = allResults.filter(result => result.quizId === quizId);
            
            if (quizResults.length === 0) {
                resultsDisplay.innerHTML = '<p>No results found for this quiz.</p>';
                return;
            }

            // Sort by score (highest first)
            quizResults.sort((a, b) => b.percentage - a.percentage);

            let html = `
                <h3>Results for: ${quizResults[0].quizTitle}</h3>
                <p><strong>Total attempts:</strong> ${quizResults.length}</p>
                <p><strong>Average score:</strong> ${Math.round(quizResults.reduce((sum, result) => sum + result.percentage, 0) / quizResults.length)}%</p>
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Score</th>
                            <th>Percentage</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            quizResults.forEach(result => {
                const date = result.timestamp ? new Date(result.timestamp).toLocaleDateString() : 'Unknown';
                html += `
                    <tr>
                        <td>${result.userName}</td>
                        <td>${result.score}/${result.totalQuestions}</td>
                        <td>${result.percentage}%</td>
                        <td>${date}</td>
                    </tr>
                `;
            });

            html += '</tbody></table>';
            resultsDisplay.innerHTML = html;
        } catch (error) {
            console.error('Error displaying results:', error);
            resultsDisplay.innerHTML = '<p class="error">Error loading results. Please refresh and try again.</p>';
        }
    }
});
// Backup quiz saving function
function saveQuizLocal(quiz) {
    try {
        const quizzes = JSON.parse(localStorage.getItem('cyberHeroQuizzes') || '[]');
        quiz.id = Date.now().toString();
        quiz.createdAt = new Date().toISOString();
        quiz.createdBy = 'admin';
        quizzes.push(quiz);
        localStorage.setItem('cyberHeroQuizzes', JSON.stringify(quizzes));
        
        // Update the quiz count display
        document.getElementById('quiz-count').textContent = quizzes.length;
        
        alert('✅ Quiz saved successfully!');
        console.log('Quiz saved locally:', quiz);
        
        // Clear the form
        document.getElementById('quiz-form').reset();
        document.getElementById('questions-container').innerHTML = '';
        
    } catch (error) {
        console.error('Failed to save quiz:', error);
        alert('❌ Failed to save quiz');
    }
}

// Replace your existing saveQuiz call with this
// In your form submission handler, change:
// FirebaseHelper.saveQuiz(quizData)
// to:
// saveQuizLocal(quizData)
