// ===== js/firebase-config.js - Brainy Tuition Classes =====
const ENABLE_LOGS = true;

// Paste your Firebase web app config here.
// API key is not a password, but Firestore rules must still be protected.
const firebaseConfig = {
  apiKey: "AIzaSyBkglZbsLahltZNLVopO9zYr9fdmE_kGXA",
  authDomain: "brainy-4bbad.firebaseapp.com",
  projectId: "brainy-4bbad",
  storageBucket: "brainy-4bbad.firebasestorage.app",
  messagingSenderId: "247500665061",
  appId: "1:247500665061:web:656992fbc4e0fe95b0a40c",
  measurementId: "G-6NCVR24SH7"
};

function log(...args) {
  if (ENABLE_LOGS) console.log(...args);
}

try {
  firebase.initializeApp(firebaseConfig);
  log("Firebase initialized for Brainy Tuition Classes.");
} catch (error) {
  console.error("Firebase initialization error:", error);
}

let db;
let auth;

try {
  db = firebase.firestore();
  auth = firebase.auth();
} catch (error) {
  console.error("Firebase services error:", error);
}

const LOCAL_QUIZZES_KEY = "brainyQuizzes";
const LOCAL_RESULTS_KEY = "brainyQuizResults";

const FirebaseHelper = {
  async ensureAnonymousAuth() {
    try {
      if (!auth) return null;
      if (auth.currentUser) return auth.currentUser;
      const credential = await auth.signInAnonymously();
      return credential.user;
    } catch (error) {
      console.warn("Anonymous auth failed. Falling back to localStorage.", error.message);
      return null;
    }
  },

  cleanQuiz(quiz) {
    return {
      title: String(quiz.title || "").trim(),
      standard: String(quiz.standard || "").trim(),
      board: String(quiz.board || "SSC Maharashtra Board").trim(),
      thumbnail: quiz.thumbnail || "",
      timePerQuestion: Number(quiz.timePerQuestion || 35),
      maxAttempts: Number(quiz.maxAttempts || 3),
      questions: Array.isArray(quiz.questions) ? quiz.questions : [],
      createdBy: "admin",
    };
  },

  async saveQuiz(quiz) {
    const quizData = this.cleanQuiz(quiz);

    if (!quizData.title || !quizData.standard || quizData.questions.length === 0) {
      throw new Error("Quiz title, standard, and questions are required.");
    }

    try {
      await this.ensureAnonymousAuth();

      if (quiz.id) {
        quizData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection("quizzes").doc(quiz.id).set(quizData, { merge: true });
        return { success: true, method: "updated", id: quiz.id };
      }

      quizData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const docRef = await db.collection("quizzes").add(quizData);
      return { success: true, method: "created", id: docRef.id };
    } catch (error) {
      console.warn("Firebase save failed. Using localStorage.", error.message);
      return this.saveQuizLocal({ ...quizData, id: quiz.id });
    }
  },

  saveQuizLocal(quiz) {
    const quizzes = JSON.parse(localStorage.getItem(LOCAL_QUIZZES_KEY) || "[]");
    const quizToSave = {
      ...quiz,
      id: quiz.id || Date.now().toString(),
      createdAt: quiz.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const index = quizzes.findIndex((q) => q.id === quizToSave.id);
    if (index >= 0) quizzes[index] = quizToSave;
    else quizzes.push(quizToSave);

    localStorage.setItem(LOCAL_QUIZZES_KEY, JSON.stringify(quizzes));
    return { success: true, method: "localStorage", id: quizToSave.id };
  },

  async getQuizzes() {
    try {
      await this.ensureAnonymousAuth();
      const snapshot = await db.collection("quizzes").orderBy("createdAt", "desc").get();

      if (!snapshot.empty) {
        return snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.().toISOString?.() || data.createdAt || "",
            updatedAt: data.updatedAt?.toDate?.().toISOString?.() || data.updatedAt || "",
          };
        });
      }
    } catch (error) {
      console.warn("Firebase quiz load failed. Using localStorage.", error.message);
    }

    return JSON.parse(localStorage.getItem(LOCAL_QUIZZES_KEY) || "[]");
  },

  async deleteQuiz(quizId) {
    try {
      await this.ensureAnonymousAuth();
      await db.collection("quizzes").doc(quizId).delete();
    } catch (error) {
      console.warn("Firebase quiz delete failed.", error.message);
    }

    const quizzes = JSON.parse(localStorage.getItem(LOCAL_QUIZZES_KEY) || "[]");
    localStorage.setItem(LOCAL_QUIZZES_KEY, JSON.stringify(quizzes.filter((q) => q.id !== quizId)));
  },

  async getQuizById(quizId) {
    try {
      await this.ensureAnonymousAuth();
      const doc = await db.collection("quizzes").doc(quizId).get();
      if (doc.exists) return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.warn("Firebase getQuizById failed.", error.message);
    }

    const quizzes = JSON.parse(localStorage.getItem(LOCAL_QUIZZES_KEY) || "[]");
    const quiz = quizzes.find((q) => q.id === quizId);
    if (!quiz) throw new Error("Quiz not found.");
    return quiz;
  },

  async saveQuizResult(result) {
    const sanitizedResult = {
      userName: String(result.userName || "").trim(),
      schoolName: String(result.schoolName || "").trim(),
      standard: String(result.standard || "").trim(),
      quizId: String(result.quizId || ""),
      quizTitle: String(result.quizTitle || ""),
      score: Number(result.score || 0),
      totalQuestions: Number(result.totalQuestions || 0),
      percentage: Math.round(Number(result.percentage || 0)),
      attemptNumber: Number(result.attemptNumber || 1),
      completedAt: new Date().toISOString(),
      userAgent: navigator.userAgent.substring(0, 160),
    };

    try {
      await this.ensureAnonymousAuth();
      sanitizedResult.timestamp = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection("quizResults").add(sanitizedResult);
      return { success: true, method: "firebase" };
    } catch (error) {
      console.warn("Firebase result save failed. Using localStorage.", error.message);
      return this.saveResultLocal(sanitizedResult);
    }
  },

  saveResultLocal(result) {
    const results = JSON.parse(localStorage.getItem(LOCAL_RESULTS_KEY) || "[]");
    results.push({ ...result, id: Date.now().toString(), timestamp: new Date().toISOString() });
    localStorage.setItem(LOCAL_RESULTS_KEY, JSON.stringify(results));
    return { success: true, method: "localStorage" };
  },

  async getQuizResults() {
    try {
      await this.ensureAnonymousAuth();
      const snapshot = await db.collection("quizResults").orderBy("timestamp", "desc").get();

      if (!snapshot.empty) {
        return snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate?.().toISOString?.() || data.timestamp || "",
          };
        });
      }
    } catch (error) {
      console.warn("Firebase results load failed. Using localStorage.", error.message);
    }

    return JSON.parse(localStorage.getItem(LOCAL_RESULTS_KEY) || "[]");
  },

  async clearAllResults() {
    try {
      await this.ensureAnonymousAuth();

      while (true) {
        const snapshot = await db.collection("quizResults").limit(100).get();
        if (snapshot.empty) break;

        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();

        if (snapshot.size < 100) break;
      }
    } catch (error) {
      console.warn("Firebase clear failed.", error.message);
    }

    localStorage.removeItem(LOCAL_RESULTS_KEY);
    return true;
  },
};

window.FirebaseHelper = FirebaseHelper;
window.db = db;
window.auth = auth;