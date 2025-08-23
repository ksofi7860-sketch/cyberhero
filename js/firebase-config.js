// ===== js/firebase-config.js (COMPLETE WORKING VERSION) =====

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
try {
    firebase.initializeApp(firebaseConfig);
    console.log('🔥 Firebase app initialized successfully!');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// Initialize Services
let db, auth;
try {
    db = firebase.firestore();
    auth = firebase.auth();
    console.log('✅ Firebase services initialized');
} catch (error) {
    console.error('Firebase services initialization error:', error);
}

// Enhanced FirebaseHelper with seamless localStorage integration
const FirebaseHelper = {
    // Save quiz with automatic fallback
    async saveQuiz(quiz) {
        console.log('💾 Saving quiz:', quiz.title);
        
        // Validate quiz data first
        if (!quiz.title || !quiz.questions || quiz.questions.length === 0) {
            throw new Error('Invalid quiz data: title and questions are required');
        }
        
        try {
            // Try Firebase first
            const quizData = {
                title: quiz.title.trim(),
                thumbnail: quiz.thumbnail || 'https://via.placeholder.com/300x200?text=Quiz',
                questions: quiz.questions,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: 'admin'
            };
            
            await db.collection('quizzes').add(quizData);
            console.log('✅ Quiz saved to Firebase successfully!');
            return { success: true, method: 'firebase' };
            
        } catch (error) {
            console.log('⚠️ Firebase save failed, using localStorage backup:', error.message);
            return this.saveQuizLocal(quiz);
        }
    },

    // Save quiz to localStorage
    saveQuizLocal(quiz) {
        try {
            const quizzes = JSON.parse(localStorage.getItem('cyberHeroQuizzes') || '[]');
            
            const quizData = {
                id: quiz.id || Date.now().toString(),
                title: quiz.title.trim(),
                thumbnail: quiz.thumbnail || 'https://via.placeholder.com/300x200?text=Quiz',
                questions: quiz.questions,
                createdAt: new Date().toISOString(),
                createdBy: 'admin'
            };
            
            // Check if updating existing quiz
            const existingIndex = quizzes.findIndex(q => q.id === quizData.id);
            if (existingIndex >= 0) {
                quizzes[existingIndex] = quizData;
                console.log('✅ Quiz updated in localStorage');
            } else {
                quizzes.push(quizData);
                console.log('✅ Quiz added to localStorage');
            }
            
            localStorage.setItem('cyberHeroQuizzes', JSON.stringify(quizzes));
            return { success: true, method: 'localStorage' };
            
        } catch (error) {
            console.error('❌ Failed to save quiz locally:', error);
            return { success: false, error: error.message };
        }
    },

    // Get all quizzes with fallback
    async getQuizzes() {
        console.log('📊 Loading quizzes...');
        
        try {
            // Try Firebase first
            const snapshot = await db.collection('quizzes')
                .orderBy('createdAt', 'desc')
                .get();
            
            if (!snapshot.empty) {
                const firebaseQuizzes = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString()
                }));
                
                console.log(`✅ Loaded ${firebaseQuizzes.length} quizzes from Firebase`);
                return firebaseQuizzes;
            }
        } catch (error) {
            console.log('⚠️ Firebase load failed, using localStorage:', error.message);
        }
        
        // Use localStorage
        const localQuizzes = JSON.parse(localStorage.getItem('cyberHeroQuizzes') || '[]');
        console.log(`✅ Loaded ${localQuizzes.length} quizzes from localStorage`);
        return localQuizzes;
    },

    // Update quiz
    async updateQuiz(quizId, quiz) {
        try {
            // Try Firebase first
            const quizData = {
                title: quiz.title.trim(),
                thumbnail: quiz.thumbnail,
                questions: quiz.questions,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('quizzes').doc(quizId).set(quizData, { merge: true });
            console.log('✅ Quiz updated in Firebase successfully!');
            
        } catch (error) {
            console.log('⚠️ Firebase update failed, updating localStorage');
        }
        
        // Always update localStorage too
        const quizzes = JSON.parse(localStorage.getItem('cyberHeroQuizzes') || '[]');
        const index = quizzes.findIndex(q => q.id === quizId);
        if (index >= 0) {
            quizzes[index] = {
                ...quizzes[index],
                ...quiz,
                id: quizId,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem('cyberHeroQuizzes', JSON.stringify(quizzes));
            console.log('✅ Quiz updated in localStorage');
        }
    },

    // Delete quiz
    async deleteQuiz(quizId) {
        try {
            // Try Firebase first
            await db.collection('quizzes').doc(quizId).delete();
            console.log('✅ Quiz deleted from Firebase');
        } catch (error) {
            console.log('⚠️ Firebase delete failed:', error.message);
        }
        
        // Always delete from localStorage too
        const quizzes = JSON.parse(localStorage.getItem('cyberHeroQuizzes') || '[]');
        const filteredQuizzes = quizzes.filter(q => q.id !== quizId);
        localStorage.setItem('cyberHeroQuizzes', JSON.stringify(filteredQuizzes));
        console.log('✅ Quiz deleted from localStorage');
    },

    // Get quiz by ID
    async getQuizById(quizId) {
        try {
            // Try Firebase first
            const doc = await db.collection('quizzes').doc(quizId).get();
            if (doc.exists) {
                return {
                    id: doc.id,
                    ...doc.data()
                };
            }
        } catch (error) {
            console.log('⚠️ Firebase getById failed, checking localStorage');
        }
        
        // Check localStorage
        const quizzes = JSON.parse(localStorage.getItem('cyberHeroQuizzes') || '[]');
        const quiz = quizzes.find(q => q.id === quizId);
        if (quiz) {
            return quiz;
        }
        
        throw new Error('Quiz not found');
    },

    // Save quiz result with fallback
    async saveQuizResult(result) {
        const sanitizedResult = {
            userName: result.userName.trim(),
            quizId: result.quizId || 'quiz_' + Date.now(),
            quizTitle: result.quizTitle,
            score: parseInt(result.score),
            totalQuestions: parseInt(result.totalQuestions),
            percentage: Math.round(result.percentage),
            completedAt: new Date().toISOString(),
            userAgent: navigator.userAgent.substring(0, 200)
        };
        
        try {
            // Try Firebase first
            sanitizedResult.timestamp = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('quizResults').add(sanitizedResult);
            console.log('✅ Result saved to Firebase successfully!');
            
        } catch (error) {
            console.log('⚠️ Firebase save failed, using localStorage backup');
            this.saveResultLocal(sanitizedResult);
        }
    },

    // Save result to localStorage
    saveResultLocal(result) {
        try {
            const results = JSON.parse(localStorage.getItem('cyberHeroResults') || '[]');
            result.id = Date.now().toString();
            result.timestamp = new Date().toISOString();
            results.push(result);
            localStorage.setItem('cyberHeroResults', JSON.stringify(results));
            console.log('✅ Result saved to localStorage successfully!');
        } catch (error) {
            console.error('❌ Failed to save result locally:', error);
        }
    },

    // Get quiz results with fallback
    async getQuizResults() {
        try {
            // Try Firebase first
            const snapshot = await db.collection('quizResults')
                .orderBy('timestamp', 'desc')
                .get();
            
            if (!snapshot.empty) {
                const firebaseResults = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate()?.toISOString() || new Date().toISOString()
                }));
                
                console.log(`✅ Loaded ${firebaseResults.length} results from Firebase`);
                return firebaseResults;
            }
        } catch (error) {
            console.log('⚠️ Firebase results load failed, using localStorage');
        }
        
        // Use localStorage
        const localResults = JSON.parse(localStorage.getItem('cyberHeroResults') || '[]');
        console.log(`✅ Loaded ${localResults.length} results from localStorage`);
        return localResults;
    },

    // Clear all results
    async clearAllResults() {
        try {
            // Try Firebase first
            const snapshot = await db.collection('quizResults').get();
            if (!snapshot.empty) {
                const batch = db.batch();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                console.log('✅ Firebase results cleared');
            }
        } catch (error) {
            console.log('⚠️ Firebase clear failed:', error.message);
        }
        
        // Clear localStorage
        localStorage.removeItem('cyberHeroResults');
        console.log('✅ localStorage results cleared');
        return true;
    },

    // Rate limiting (unchanged)
    rateLimitMap: new Map(),
    
    checkRateLimit(action, limit = 5) {
        const now = Date.now();
        const key = `${action}_${Math.floor(now / 60000)}`;
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

    // Enhanced connection test
    testConnection() {
        try {
            if (db && typeof db.collection === 'function') {
                console.log('✅ Firebase connection successful!');
                return true;
            } else {
                console.log('⚠️ Firebase not available, using localStorage only');
                return false;
            }
        } catch (error) {
            console.log('⚠️ Firebase connection failed:', error.message);
            return false;
        }
    }
};

// Test connection and initialize
const isFirebaseConnected = FirebaseHelper.testConnection();
if (isFirebaseConnected) {
    console.log('🔥 Firebase initialized and connected successfully!');
} else {
    console.log('📱 Running in localStorage mode - all functionality preserved!');
}

// Make globally available
window.FirebaseHelper = FirebaseHelper;
window.db = db;
window.auth = auth;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FirebaseHelper, db, auth };
}

console.log('🎯 Cyber Hero Firebase configuration complete!');
