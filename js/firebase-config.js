// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyB_U2oT1LJJJgnsle-hV6_dnliMBPtJuaE",
  authDomain: "i-m-cyber-hero.firebaseapp.com",
  projectId: "i-m-cyber-hero",
  storageBucket: "i-m-cyber-hero.firebasestorage.app",
  messagingSenderId: "96269136485",
  appId: "1:96269136485:web:fd378d60a6f56752ed4c8c"
};


// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Complete FirebaseHelper object with all required functions
const FirebaseHelper = {
    // Save quiz result
    async saveQuizResult(result) {
        try {
            const sanitizedResult = {
                userName: result.userName.trim(),
                quizId: result.quizId || 'quiz_' + Date.now(),
                quizTitle: result.quizTitle,
                score: parseInt(result.score),
                totalQuestions: parseInt(result.totalQuestions),
                percentage: Math.round(result.percentage),
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                userAgent: navigator.userAgent.substring(0, 200)
            };
            
            await db.collection('quizResults').add(sanitizedResult);
            console.log('✅ Result saved successfully!');
        } catch (error) {
            console.error('❌ Error saving result:', error);
            throw error;
        }
    },

    // Get all quiz results
    async getQuizResults() {
        try {
            const snapshot = await db.collection('quizResults')
                .orderBy('timestamp', 'desc')
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate()?.toISOString() || new Date().toISOString()
            }));
        } catch (error) {
            console.error('❌ Error getting results:', error);
            return [];
        }
    },

    // Save quiz
    async saveQuiz(quiz) {
        try {
            // Validate quiz data
            if (!quiz.title || !quiz.questions || quiz.questions.length === 0) {
                throw new Error('Invalid quiz data: title and questions are required');
            }
            
            const quizData = {
                title: quiz.title.trim(),
                thumbnail: quiz.thumbnail || 'https://via.placeholder.com/300x200?text=Quiz',
                questions: quiz.questions,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: 'admin'
            };
            
            await db.collection('quizzes').add(quizData);
            console.log('✅ Quiz saved successfully!');
        } catch (error) {
            console.error('❌ Error saving quiz:', error);
            throw error;
        }
    },

    // Get all quizzes
    async getQuizzes() {
        try {
            const snapshot = await db.collection('quizzes')
                .orderBy('createdAt', 'desc')
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('❌ Error getting quizzes:', error);
            return [];
        }
    },

    // Delete quiz
    async deleteQuiz(quizId) {
        try {
            if (!quizId) {
                throw new Error('Quiz ID is required');
            }
            
            await db.collection('quizzes').doc(quizId).delete();
            console.log('✅ Quiz deleted successfully!');
        } catch (error) {
            console.error('❌ Error deleting quiz:', error);
            throw error;
        }
    },

    // Update quiz
    async updateQuiz(quizId, quiz) {
        try {
            if (!quizId) {
                throw new Error('Quiz ID is required');
            }
            
            const quizData = {
                title: quiz.title.trim(),
                thumbnail: quiz.thumbnail,
                questions: quiz.questions,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('quizzes').doc(quizId).set(quizData, { merge: true });
            console.log('✅ Quiz updated successfully!');
        } catch (error) {
            console.error('❌ Error updating quiz:', error);
            throw error;
        }
    },

    // Clear all results (admin function)
    async clearAllResults() {
        try {
            const snapshot = await db.collection('quizResults').get();
            
            if (snapshot.empty) {
                console.log('No results to clear');
                return true;
            }
            
            const batch = db.batch();
            
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            console.log('✅ All results cleared successfully!');
            return true;
        } catch (error) {
            console.error('❌ Error clearing results:', error);
            throw error;
        }
    },

    // Get quiz by ID
    async getQuizById(quizId) {
        try {
            const doc = await db.collection('quizzes').doc(quizId).get();
            
            if (doc.exists) {
                return {
                    id: doc.id,
                    ...doc.data()
                };
            } else {
                throw new Error('Quiz not found');
            }
        } catch (error) {
            console.error('❌ Error getting quiz:', error);
            throw error;
        }
    },

    // Rate limiting helper
    rateLimitMap: new Map(),
    
    checkRateLimit(action, limit = 5) {
        const now = Date.now();
        const key = `${action}_${Math.floor(now / 60000)}`; // Per minute
        const count = this.rateLimitMap.get(key) || 0;
        
        if (count >= limit) {
            throw new Error('Rate limit exceeded. Please wait a moment.');
        }
        
        this.rateLimitMap.set(key, count + 1);
        
        // Clean old entries
        for (const [mapKey] of this.rateLimitMap) {
            if (parseInt(mapKey.split('_')[1]) < Math.floor(now / 60000) - 5) {
                this.rateLimitMap.delete(mapKey);
            }
        }
    },

    // Test Firebase connection
    async testConnection() {
        try {
            await db.collection('test').limit(1).get();
            console.log('✅ Firebase connection successful!');
            return true;
        } catch (error) {
            console.error('❌ Firebase connection failed:', error);
            return false;
        }
    }
};

// Make FirebaseHelper available globally
window.FirebaseHelper = FirebaseHelper;

// Export for modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FirebaseHelper, db };
}

// Test connection on load
FirebaseHelper.testConnection().then(connected => {
    if (connected) {
        console.log('🔥 Firebase initialized and connected successfully!');
    } else {
        console.error('🚨 Firebase connection failed - check your configuration');
    }
});
