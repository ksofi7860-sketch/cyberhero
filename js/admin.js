// ===== COMPLETE ADMIN.JS WITH ALL FIXES =====
document.addEventListener('DOMContentLoaded', async () => {
    // Authentication check
    await ensureAuthentication();
    
    // Element references
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
    
    // Password reset elements
    const changePasswordToggle = document.getElementById('change-password-toggle');
    const passwordResetSection = document.getElementById('password-reset-section');
    const cancelPasswordReset = document.getElementById('cancel-password-reset');
    
    let questionCount = 0;
    let editingQuizId = null;
    let allQuizzes = [];

    // AUTHENTICATION FUNCTION
    async function ensureAuthentication() {
        return new Promise((resolve, reject) => {
            firebase.auth().onAuthStateChanged(async (user) => {
                if (!user) {
                    console.log('⚠️ User not authenticated, signing in anonymously...');
                    try {
                        await firebase.auth().signInAnonymously();
                        console.log('✅ Anonymous authentication successful');
                        resolve();
                    } catch (error) {
                        console.error('❌ Authentication failed:', error);
                        console.log('⚠️ Continuing without authentication - localStorage only');
                        resolve();
                    }
                } else {
                    console.log('✅ User authenticated:', user.uid);
                    resolve();
                }
            });
        });
    }

    // ENHANCED DATA HELPER WITH PROPER UPDATE/CREATE LOGIC
    const DataHelper = {
        async saveQuiz(quiz) {
            console.log('💾 Attempting to save quiz:', quiz.title);
            console.log('📝 Quiz ID:', quiz.id);
            console.log('🔍 Is update?', editingQuizId && quiz.id === editingQuizId);
            
            try {
                if (window.FirebaseHelper && typeof window.FirebaseHelper.saveQuiz === 'function') {
                    const result = await window.FirebaseHelper.saveQuiz(quiz);
                    console.log('✅ Quiz saved to Firebase successfully:', result);
                    return { success: true, method: 'firebase', operation: result.method };
                }
            } catch (error) {
                console.log('⚠️ Firebase save failed, using localStorage backup:', error);
            }
            
            return this.saveQuizLocal(quiz);
        },

        saveQuizLocal(quiz) {
            try {
                const quizzes = JSON.parse(localStorage.getItem('cyberHeroQuizzes') || '[]');
                
                if (quiz.id && editingQuizId && quiz.id === editingQuizId) {
                    // UPDATE EXISTING QUIZ
                    console.log('🔄 Updating existing quiz in localStorage:', quiz.id);
                    
                    const existingIndex = quizzes.findIndex(q => q.id === quiz.id);
                    if (existingIndex >= 0) {
                        // Keep original creation info, add update info
                        quiz.createdAt = quizzes[existingIndex].createdAt || new Date().toISOString();
                        quiz.updatedAt = new Date().toISOString();
                        quiz.createdBy = 'admin';
                        
                        // Replace existing quiz
                        quizzes[existingIndex] = quiz;
                        console.log('✅ Quiz updated in localStorage');
                    } else {
                        console.log('⚠️ Quiz not found in localStorage, adding as new');
                        quiz.createdAt = new Date().toISOString();
                        quiz.createdBy = 'admin';
                        quizzes.push(quiz);
                    }
                    
                } else {
                    // CREATE NEW QUIZ
                    console.log('➕ Creating new quiz in localStorage');
                    quiz.id = Date.now().toString();
                    quiz.createdAt = new Date().toISOString();
                    quiz.createdBy = 'admin';
                    quizzes.push(quiz);
                }
                
                localStorage.setItem('cyberHeroQuizzes', JSON.stringify(quizzes));
                console.log('✅ Quiz saved to localStorage successfully');
                return { success: true, method: 'localStorage' };
                
            } catch (error) {
                console.error('❌ Failed to save quiz locally:', error);
                return { success: false, error: error.message };
            }
        },

        async getQuizzes() {
            console.log('📊 Loading quizzes...');
            
            try {
                if (window.FirebaseHelper && typeof window.FirebaseHelper.getQuizzes === 'function') {
                    const firebaseQuizzes = await window.FirebaseHelper.getQuizzes();
                    if (firebaseQuizzes && firebaseQuizzes.length > 0) {
                        console.log('✅ Loaded', firebaseQuizzes.length, 'quizzes from Firebase');
                        return firebaseQuizzes;
                    }
                }
            } catch (error) {
                console.log('⚠️ Firebase load failed, using localStorage');
            }
            
            const localQuizzes = JSON.parse(localStorage.getItem('cyberHeroQuizzes') || '[]');
            console.log('✅ Loaded', localQuizzes.length, 'quizzes from localStorage');
            return localQuizzes;
        },

        async deleteQuiz(quizId) {
            try {
                if (window.FirebaseHelper && typeof window.FirebaseHelper.deleteQuiz === 'function') {
                    await window.FirebaseHelper.deleteQuiz(quizId);
                    console.log('✅ Quiz deleted from Firebase');
                }
            } catch (error) {
                console.log('⚠️ Firebase delete failed');
            }
            
            const quizzes = JSON.parse(localStorage.getItem('cyberHeroQuizzes') || '[]');
            const updatedQuizzes = quizzes.filter(q => q.id !== quizId);
            localStorage.setItem('cyberHeroQuizzes', JSON.stringify(updatedQuizzes));
            console.log('✅ Quiz deleted from localStorage');
        },

        async getQuizResults() {
            try {
                if (window.FirebaseHelper && typeof window.FirebaseHelper.getQuizResults === 'function') {
                    const firebaseResults = await window.FirebaseHelper.getQuizResults();
                    if (firebaseResults && firebaseResults.length > 0) {
                        console.log('✅ Loaded results from Firebase');
                        return firebaseResults;
                    }
                }
            } catch (error) {
                console.log('⚠️ Firebase results load failed');
            }
            
            const localResults = JSON.parse(localStorage.getItem('cyberHeroResults') || '[]');
            console.log('✅ Loaded results from localStorage');
            return localResults;
        },

        async clearAllResults() {
            console.log('🗑️ Starting to clear all results...');
            let totalDeleted = 0;
            let firebaseSuccess = false;
            
            try {
                if (window.firebase && window.firebase.firestore) {
                    const db = window.firebase.firestore();
                    const user = firebase.auth().currentUser;
                    
                    if (user) {
                        console.log('✅ User authenticated for Firebase operations:', user.uid);
                        
                        while (true) {
                            const snapshot = await db.collection('quizResults').limit(100).get();
                            
                            if (snapshot.empty) {
                                console.log('✅ No more documents to delete from Firebase');
                                break;
                            }
                            
                            console.log(`📊 Deleting ${snapshot.size} documents...`);
                            
                            const deletePromises = snapshot.docs.map(doc => doc.ref.delete());
                            await Promise.all(deletePromises);
                            
                            totalDeleted += snapshot.size;
                            console.log(`✅ Deleted ${snapshot.size} documents (Total: ${totalDeleted})`);
                            
                            if (snapshot.size === 100) {
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            } else {
                                break;
                            }
                        }
                        
                        firebaseSuccess = true;
                        console.log(`🎉 Firebase deletion completed: ${totalDeleted} documents`);
                        
                    } else {
                        console.log('⚠️ No authenticated user for Firebase operations');
                    }
                } else {
                    console.log('⚠️ Firebase not available');
                }
            } catch (error) {
                console.error('❌ Firebase deletion failed:', error);
                console.log('🔄 Continuing with localStorage cleanup...');
            }
            
            try {
                localStorage.removeItem('cyberHeroResults');
                console.log('✅ localStorage cleared');
            } catch (error) {
                console.error('❌ localStorage clear failed:', error);
            }
            
            const successMessage = firebaseSuccess ? 
                `✅ Deleted ${totalDeleted} records from Firebase and cleared localStorage` :
                '✅ Cleared localStorage (Firebase not available or failed)';
            
            console.log(successMessage);
            return true;
        }
    };

    // PASSWORD RESET FUNCTIONALITY
    if (changePasswordToggle) {
        changePasswordToggle.addEventListener('click', () => {
            passwordResetSection.classList.toggle('hidden');
        });
    }

    if (cancelPasswordReset) {
        cancelPasswordReset.addEventListener('click', () => {
            passwordResetSection.classList.add('hidden');
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
            document.getElementById('password-message').textContent = '';
        });
    }

    // LOAD INITIAL DATA
    await loadQuizzesList();
    await loadQuizSelector();

    // RESET LEADERBOARD FUNCTIONALITY
    if (resetLeaderboardBtn) {
        resetLeaderboardBtn.addEventListener('click', async () => {
            if (confirm('⚠️ Are you sure you want to delete ALL leaderboard data? This cannot be undone!')) {
                if (confirm('This will remove all user scores permanently. Continue?')) {
                    try {
                        resetLeaderboardBtn.disabled = true;
                        resetLeaderboardBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Clearing...';
                        
                        const result = await DataHelper.clearAllResults();
                        
                        if (result) {
                            alert('✅ Leaderboard data has been cleared successfully!');
                            
                            if (viewResultsSection && !viewResultsSection.classList.contains('hidden')) {
                                resultsDisplay.innerHTML = '<p>No results found. Leaderboard has been cleared.</p>';
                            }
                        } else {
                            throw new Error('Clear operation failed');
                        }
                        
                    } catch (error) {
                        console.error('Error clearing leaderboard:', error);
                        alert('❌ Error clearing leaderboard data. Check console for details.');
                    } finally {
                        resetLeaderboardBtn.disabled = false;
                        resetLeaderboardBtn.innerHTML = '<i class="fas fa-trash"></i> Reset Leaderboard Data';
                    }
                }
            }
        });
    }

    // TAB SWITCHING
    if (createQuizTab) createQuizTab.addEventListener('click', () => showCreateQuizSection());
    if (manageQuizzesTab) manageQuizzesTab.addEventListener('click', () => showManageQuizzesSection());
    if (viewResultsTab) viewResultsTab.addEventListener('click', () => showViewResultsSection());

    function showCreateQuizSection() {
        if (createQuizSection) createQuizSection.classList.remove('hidden');
        if (manageQuizzesSection) manageQuizzesSection.classList.add('hidden');
        if (viewResultsSection) viewResultsSection.classList.add('hidden');
        if (createQuizTab) createQuizTab.classList.add('active');
        if (manageQuizzesTab) manageQuizzesTab.classList.remove('active');
        if (viewResultsTab) viewResultsTab.classList.remove('active');
    }

    async function showManageQuizzesSection() {
        if (createQuizSection) createQuizSection.classList.add('hidden');
        if (manageQuizzesSection) manageQuizzesSection.classList.remove('hidden');
        if (viewResultsSection) viewResultsSection.classList.add('hidden');
        if (createQuizTab) createQuizTab.classList.remove('active');
        if (manageQuizzesTab) manageQuizzesTab.classList.add('active');
        if (viewResultsTab) viewResultsTab.classList.remove('active');
        await loadQuizzesList();
    }

    async function showViewResultsSection() {
        if (createQuizSection) createQuizSection.classList.add('hidden');
        if (manageQuizzesSection) manageQuizzesSection.classList.add('hidden');
        if (viewResultsSection) viewResultsSection.classList.remove('hidden');
        if (createQuizTab) createQuizTab.classList.remove('active');
        if (manageQuizzesTab) manageQuizzesTab.classList.remove('active');
        if (viewResultsTab) viewResultsTab.classList.add('active');
        await loadQuizSelector();
    }

    // 🔧 FIXED: ADD QUESTION FUNCTIONALITY - PREVENT MULTIPLE LISTENERS
    if (addQuestionBtn && !addQuestionBtn.hasAttribute('data-listener-added')) {
        addQuestionBtn.setAttribute('data-listener-added', 'true');
        addQuestionBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            questionCount++;
            const questionDiv = document.createElement('div');
            questionDiv.classList.add('question-block');
            questionDiv.innerHTML = `
                <hr>
                <h4>Question ${questionCount}</h4>
                <input type="text" placeholder="Question" class="question-text" required>
                
                <div class="form-group">
                    <label>Question Media URL (Optional):</label>
                    <input type="url" class="question-image-url" placeholder="https://example.com/image.jpg or animated.gif">
                    <small>💡 Add JPG, PNG, or GIF to illustrate cybersecurity concepts</small>
                </div>
                
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
            if (questionsContainer) {
                questionsContainer.appendChild(questionDiv);
            }
        });
    }

    // 🔧 FIXED: REMOVE QUESTION FUNCTIONALITY
    if (questionsContainer) {
        questionsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-question-btn')) {
                e.preventDefault();
                e.stopPropagation();
                
                const questionBlock = e.target.closest('.question-block');
                if (questionBlock) {
                    questionBlock.remove();
                    
                    // Renumber remaining questions
                    const questionBlocks = questionsContainer.querySelectorAll('.question-block');
                    questionCount = 0;
                    
                    questionBlocks.forEach((block, index) => {
                        questionCount = index + 1;
                        const questionNumber = questionCount;
                        
                        // Update question header
                        const header = block.querySelector('h4');
                        if (header) {
                            header.textContent = `Question ${questionNumber}`;
                        }
                        
                        // Update radio button names
                        const radios = block.querySelectorAll('.correct-radio');
                        radios.forEach(radio => {
                            radio.name = `correct-${questionNumber}`;
                        });
                    });
                }
            }
        });
    }

    // FORM SUBMISSION WITH PROPER UPDATE/CREATE LOGIC
    if (createQuizForm) {
        createQuizForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            try {
                submitBtn.disabled = true;
                
                const isUpdating = editingQuizId;
                submitBtn.innerHTML = isUpdating ? 
                    '<i class="fas fa-spinner fa-spin"></i> Updating...' :
                    '<i class="fas fa-spinner fa-spin"></i> Creating...';
                
                const title = document.getElementById('quiz-title').value;
                const thumbnail = document.getElementById('quiz-thumbnail').value || 'https://via.placeholder.com/300x200?text=Quiz';
                const questions = [];

                document.querySelectorAll('.question-block').forEach(block => {
                    const questionText = block.querySelector('.question-text').value;
                    const options = Array.from(block.querySelectorAll('.option-text')).map(input => input.value);
                    const imageUrl = block.querySelector('.question-image-url')?.value?.trim() || null;
                    const correctRadio = block.querySelector('input[type="radio"]:checked');
                    
                    if (!correctRadio) {
                        throw new Error('Please select the correct answer for all questions.');
                    }
                    
                    const correctAnswer = parseInt(correctRadio.value, 10);

                    questions.push({
                        question: questionText,
                        imageUrl: imageUrl,
                        options: options,
                        answer: correctAnswer
                    });
                });

                if (questions.length === 0) {
                    throw new Error('Please add at least one question.');
                }

                // CRITICAL: Build quiz data with proper ID handling
                const quizData = { 
                    title: title.trim(), 
                    thumbnail, 
                    questions,
                    id: editingQuizId || undefined  // Use existing ID for updates, undefined for creates
                };

                console.log('💾 Saving quiz data:', quizData);

                const result = await DataHelper.saveQuiz(quizData);
                
                if (result.success) {
                    const operation = isUpdating ? 'updated' : 'created';
                    const method = result.method === 'firebase' ? 'Firebase' : 'locally';
                    alert(`✅ Quiz ${operation} successfully (${method})!`);
                    
                    // Reset form
                    createQuizForm.reset();
                    questionsContainer.innerHTML = '';
                    questionCount = 0;
                    editingQuizId = null;
                    
                    // Reset submit button text
                    submitBtn.textContent = '➕ Create Quiz';
                    
                    await loadQuizzesList();
                    await loadQuizSelector();
                } else {
                    throw new Error(result.error || 'Failed to save quiz');
                }
                
            } catch (error) {
                console.error('Error saving quiz:', error);
                alert(`❌ ${error.message}`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // LOAD QUIZZES LIST
    async function loadQuizzesList() {
        if (!quizzesList) return;
        
        try {
            quizzesList.innerHTML = '<div class="loading">Loading quizzes...</div>';
            
            allQuizzes = await DataHelper.getQuizzes();
            
            if (allQuizzes.length === 0) {
                quizzesList.innerHTML = '<p>No quizzes created yet. Create your first cybersecurity quiz!</p>';
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
                                <p>Questions: ${quiz.questions?.length || 0}</p>
                                <p><small>Created: ${quiz.createdAt ? new Date(quiz.createdAt).toLocaleDateString() : 'Unknown'}</small></p>
                                ${quiz.updatedAt ? `<p><small>Updated: ${new Date(quiz.updatedAt).toLocaleDateString()}</small></p>` : ''}
                            </div>
                            <div class="quiz-actions">
                                <button class="edit-btn" data-quiz-id="${quiz.id}">✏️ Edit</button>
                                <button class="delete-btn" data-quiz-id="${quiz.id}">🗑️ Delete</button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            quizzesList.innerHTML = html;
        } catch (error) {
            console.error('Error loading quizzes:', error);
            if (quizzesList) {
                quizzesList.innerHTML = '<p class="error">Error loading quizzes. Please refresh the page.</p>';
            }
        }
    }

    // QUIZ MANAGEMENT EVENT HANDLERS
    if (quizzesList) {
        quizzesList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('edit-btn')) {
                const quizId = e.target.getAttribute('data-quiz-id');
                await editQuiz(quizId);
            } else if (e.target.classList.contains('delete-btn')) {
                const quizId = e.target.getAttribute('data-quiz-id');
                await deleteQuiz(quizId);
            }
        });
    }

    // EDIT QUIZ FUNCTION WITH PROPER ID HANDLING
    async function editQuiz(quizId) {
        const quiz = allQuizzes.find(q => q.id === quizId);
        if (!quiz) {
            console.error('❌ Quiz not found for editing:', quizId);
            return;
        }
        
        // CRITICAL: Set the exact quiz ID for editing
        editingQuizId = quiz.id;
        console.log('📝 Editing quiz with ID:', editingQuizId);
        
        document.getElementById('quiz-title').value = quiz.title;
        document.getElementById('quiz-thumbnail').value = quiz.thumbnail || '';
        
        if (questionsContainer) {
            questionsContainer.innerHTML = '';
        }
        questionCount = 0;
        
        quiz.questions.forEach((question) => {
            questionCount++;
            const questionDiv = document.createElement('div');
            questionDiv.classList.add('question-block');
            questionDiv.innerHTML = `
                <hr>
                <h4>Question ${questionCount}</h4>
                <input type="text" placeholder="Question" class="question-text" required value="${question.question}">
                
                <div class="form-group">
                    <label>Question Media URL (Optional):</label>
                    <input type="url" class="question-image-url" placeholder="https://example.com/image.jpg or animated.gif" value="${question.imageUrl || ''}">
                    <small>💡 Add JPG, PNG, or GIF to illustrate cybersecurity concepts</small>
                </div>
                
                <div class="option-group">
                    <div class="option-row">
                        <input type="radio" name="correct-${questionCount}" value="0" class="correct-radio" ${question.answer === 0 ? 'checked' : ''}>
                        <input type="text" placeholder="Option 1" class="option-text" required value="${question.options[0] || ''}">
                        <label>✓ Correct Answer</label>
                    </div>
                    <div class="option-row">
                        <input type="radio" name="correct-${questionCount}" value="1" class="correct-radio" ${question.answer === 1 ? 'checked' : ''}>
                        <input type="text" placeholder="Option 2" class="option-text" required value="${question.options[1] || ''}">
                        <label>✓ Correct Answer</label>
                    </div>
                    <div class="option-row">
                        <input type="radio" name="correct-${questionCount}" value="2" class="correct-radio" ${question.answer === 2 ? 'checked' : ''}>
                        <input type="text" placeholder="Option 3" class="option-text" required value="${question.options[2] || ''}">
                        <label>✓ Correct Answer</label>
                    </div>
                    <div class="option-row">
                        <input type="radio" name="correct-${questionCount}" value="3" class="correct-radio" ${question.answer === 3 ? 'checked' : ''}>
                        <input type="text" placeholder="Option 4" class="option-text" required value="${question.options[3] || ''}">
                        <label>✓ Correct Answer</label>
                    </div>
                </div>
                <button type="button" class="remove-question-btn">Remove Question</button>
            `;
            if (questionsContainer) {
                questionsContainer.appendChild(questionDiv);
            }
        });
        
        // Update submit button text
        const submitBtn = createQuizForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = '✏️ Update Quiz';
        }
        
        showCreateQuizSection();
    }

    async function deleteQuiz(quizId) {
        if (confirm('Are you sure you want to delete this quiz?')) {
            try {
                await DataHelper.deleteQuiz(quizId);
                alert('✅ Quiz deleted successfully!');
                await loadQuizzesList();
                await loadQuizSelector();
            } catch (error) {
                console.error('Error deleting quiz:', error);
                alert('❌ Error deleting quiz. Please try again.');
            }
        }
    }

    // LOAD QUIZ SELECTOR FOR RESULTS
    async function loadQuizSelector() {
        if (!quizSelect) return;
        
        try {
            const quizzes = await DataHelper.getQuizzes();
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

    // DISPLAY RESULTS
    if (quizSelect) {
        quizSelect.addEventListener('change', async (e) => {
            const selectedQuizId = e.target.value;
            if (selectedQuizId !== '') {
                await displayResults(selectedQuizId);
            } else {
                if (resultsDisplay) {
                    resultsDisplay.innerHTML = '';
                }
            }
        });
    }

    async function displayResults(quizId) {
        if (!resultsDisplay) return;
        
        try {
            resultsDisplay.innerHTML = '<div class="loading">Loading results...</div>';
            
            const allResults = await DataHelper.getQuizResults();
            const quizResults = allResults.filter(result => result.quizId === quizId);
            
            if (quizResults.length === 0) {
                resultsDisplay.innerHTML = '<p>No results found for this quiz yet.</p>';
                return;
            }

            quizResults.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

            const selectedQuiz = allQuizzes.find(q => q.id === quizId);
            const quizTitle = selectedQuiz ? selectedQuiz.title : 'Unknown Quiz';
            const averageScore = Math.round(quizResults.reduce((sum, result) => sum + (result.percentage || 0), 0) / quizResults.length);

            let html = `
                <h3>📊 Results for: ${quizTitle}</h3>
                <div class="results-stats">
                    <p><strong>Total attempts:</strong> ${quizResults.length}</p>
                    <p><strong>Average score:</strong> ${averageScore}%</p>
                </div>
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Name</th>
                            <th>Score</th>
                            <th>Percentage</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            quizResults.forEach((result, index) => {
                const date = result.completedAt || result.timestamp ? 
                    new Date(result.completedAt || result.timestamp).toLocaleDateString() : 
                    'Unknown';
                const rank = index + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
                
                html += `
                    <tr>
                        <td>${medal}</td>
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
            if (resultsDisplay) {
                resultsDisplay.innerHTML = '<p class="error">Error loading results. Please refresh and try again.</p>';
            }
        }
    }

    console.log('🎯 Admin panel initialized successfully with dynamic question bug FIXED!');
});
