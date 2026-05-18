// ===== js/admin.js - Brainy Tuition Classes dynamic quiz admin =====
document.addEventListener("DOMContentLoaded", async () => {
  await ensureFirebaseAuth();

  const createQuizForm = document.getElementById("create-quiz-form");
  const questionsContainer = document.getElementById("questions-container");
  const addQuestionBtn = document.getElementById("add-question-btn");
  const createQuizTab = document.getElementById("create-quiz-tab");
  const manageQuizzesTab = document.getElementById("manage-quizzes-tab");
  const viewResultsTab = document.getElementById("view-results-tab");
  const createQuizSection = document.getElementById("create-quiz-section");
  const manageQuizzesSection = document.getElementById("manage-quizzes-section");
  const viewResultsSection = document.getElementById("view-results-section");
  const quizSelect = document.getElementById("quiz-select");
  const resultsDisplay = document.getElementById("results-display");
  const quizzesList = document.getElementById("quizzes-list");
  const resetLeaderboardBtn = document.getElementById("reset-leaderboard-btn");

  let questionCount = 0;
  let editingQuizId = null;
  let allQuizzes = [];

  async function ensureFirebaseAuth() {
    try {
      if (window.FirebaseHelper?.ensureAnonymousAuth) {
        await window.FirebaseHelper.ensureAnonymousAuth();
      }
    } catch (error) {
      console.warn("Admin auth fallback active.", error.message);
    }
  }

  const escapeHTML = (value = "") =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const DataHelper = {
    async saveQuiz(quiz) {
      if (window.FirebaseHelper?.saveQuiz) return window.FirebaseHelper.saveQuiz(quiz);
      throw new Error("FirebaseHelper is missing.");
    },
    async getQuizzes() {
      if (window.FirebaseHelper?.getQuizzes) return window.FirebaseHelper.getQuizzes();
      return [];
    },
    async deleteQuiz(quizId) {
      if (window.FirebaseHelper?.deleteQuiz) return window.FirebaseHelper.deleteQuiz(quizId);
    },
    async getQuizResults() {
      if (window.FirebaseHelper?.getQuizResults) return window.FirebaseHelper.getQuizResults();
      return [];
    },
    async clearAllResults() {
      if (window.FirebaseHelper?.clearAllResults) return window.FirebaseHelper.clearAllResults();
      return false;
    },
  };

  function showSection(sectionName) {
    createQuizSection.classList.toggle("hidden", sectionName !== "create");
    manageQuizzesSection.classList.toggle("hidden", sectionName !== "manage");
    viewResultsSection.classList.toggle("hidden", sectionName !== "results");

    createQuizTab.classList.toggle("active", sectionName === "create");
    manageQuizzesTab.classList.toggle("active", sectionName === "manage");
    viewResultsTab.classList.toggle("active", sectionName === "results");
  }

  createQuizTab?.addEventListener("click", () => showSection("create"));
  manageQuizzesTab?.addEventListener("click", async () => {
    showSection("manage");
    await loadQuizzesList();
  });
  viewResultsTab?.addEventListener("click", async () => {
    showSection("results");
    await loadQuizSelector();
  });

  function questionTemplate(number, question = {}) {
    const options = question.options || ["", "", "", ""];
    const answer = Number.isInteger(question.answer) ? question.answer : -1;

    return `
      <div class="question-block" data-question-number="${number}">
        <div class="question-header">
          <h4>Question ${number}</h4>
          <button type="button" class="remove-question-btn">Remove</button>
        </div>

        <div class="form-group">
          <label>Question Text</label>
          <input type="text" class="question-text" placeholder="Enter question" value="${escapeHTML(question.question || "")}" required>
        </div>

        <div class="form-group">
          <label>Question Image/GIF URL Optional</label>
          <input type="url" class="question-image-url" placeholder="Optional image URL" value="${escapeHTML(question.imageUrl || "")}">
        </div>

        <div class="option-group">
          ${[0, 1, 2, 3]
            .map(
              (i) => `
            <div class="option-row">
              <input type="radio" name="correct-${number}" value="${i}" class="correct-radio" ${answer === i ? "checked" : ""} required>
              <input type="text" placeholder="Option ${i + 1}" class="option-text" value="${escapeHTML(options[i] || "")}" required>
              <span>Correct</span>
            </div>`
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function addQuestion(question = {}) {
    questionCount += 1;
    questionsContainer.insertAdjacentHTML("beforeend", questionTemplate(questionCount, question));
  }

  function renumberQuestions() {
    const blocks = questionsContainer.querySelectorAll(".question-block");
    questionCount = 0;

    blocks.forEach((block, index) => {
      const number = index + 1;
      questionCount = number;
      block.dataset.questionNumber = number;
      block.querySelector("h4").textContent = `Question ${number}`;
      block.querySelectorAll(".correct-radio").forEach((radio) => {
        radio.name = `correct-${number}`;
      });
    });
  }

  addQuestionBtn?.addEventListener("click", () => addQuestion());

  questionsContainer?.addEventListener("click", (event) => {
    if (!event.target.classList.contains("remove-question-btn")) return;
    event.target.closest(".question-block")?.remove();
    renumberQuestions();
  });

  function collectQuizFromForm() {
    const questions = Array.from(document.querySelectorAll(".question-block")).map((block, index) => {
      const question = block.querySelector(".question-text").value.trim();
      const imageUrl = block.querySelector(".question-image-url").value.trim();
      const options = Array.from(block.querySelectorAll(".option-text")).map((input) => input.value.trim());
      const checked = block.querySelector(".correct-radio:checked");

      if (!question) throw new Error(`Question ${index + 1} is empty.`);
      if (options.some((option) => !option)) throw new Error(`All options are required for Question ${index + 1}.`);
      if (!checked) throw new Error(`Select correct answer for Question ${index + 1}.`);

      return {
        question,
        imageUrl: imageUrl || null,
        options,
        answer: Number(checked.value),
      };
    });

    if (questions.length !== 15) {
      throw new Error("Admission quiz should have exactly 15 questions.");
    }

    return {
      id: editingQuizId || undefined,
      title: document.getElementById("quiz-title").value.trim(),
      standard: document.getElementById("quiz-standard").value,
      board: document.getElementById("quiz-board").value.trim() || "SSC Maharashtra Board",
      thumbnail: document.getElementById("quiz-thumbnail").value.trim(),
      timePerQuestion: Number(document.getElementById("quiz-time").value || 35),
      maxAttempts: Number(document.getElementById("quiz-attempts").value || 3),
      questions,
    };
  }

  createQuizForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitBtn = createQuizForm.querySelector('button[type="submit"]');
    const oldText = submitBtn.innerHTML;

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

      const quiz = collectQuizFromForm();
      const result = await DataHelper.saveQuiz(quiz);

      alert(`Quiz ${editingQuizId ? "updated" : "created"} successfully using ${result.method || "Firebase"}.`);

      createQuizForm.reset();
      document.getElementById("quiz-board").value = "SSC Maharashtra Board";
      document.getElementById("quiz-time").value = 35;
      document.getElementById("quiz-attempts").value = 3;
      questionsContainer.innerHTML = "";
      questionCount = 0;
      editingQuizId = null;
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Quiz';

      await loadQuizzesList();
      await loadQuizSelector();
    } catch (error) {
      alert(error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = oldText;
    }
  });

  async function loadQuizzesList() {
    if (!quizzesList) return;
    quizzesList.innerHTML = '<div class="loading">Loading quizzes...</div>';

    try {
      allQuizzes = await DataHelper.getQuizzes();

      if (!allQuizzes.length) {
        quizzesList.innerHTML = "<p>No quiz created yet.</p>";
        return;
      }

      quizzesList.innerHTML = allQuizzes
        .map(
          (quiz) => `
          <div class="quiz-management-card">
            <div class="quiz-thumb">${quiz.thumbnail ? `<img src="${escapeHTML(quiz.thumbnail)}" alt="">` : "Quiz"}</div>
            <div class="quiz-info">
              <h3>${escapeHTML(quiz.title)}</h3>
              <p>Std ${escapeHTML(quiz.standard)} • ${escapeHTML(quiz.board || "SSC Maharashtra Board")}</p>
              <p>${quiz.questions?.length || 0} questions • ${quiz.timePerQuestion || 35}s/question • ${quiz.maxAttempts || 3} attempts</p>
              <div class="quiz-actions">
                <button class="edit-btn" data-quiz-id="${quiz.id}">Edit</button>
                <button class="delete-btn" data-quiz-id="${quiz.id}">Delete</button>
              </div>
            </div>
          </div>`
        )
        .join("");
    } catch (error) {
      quizzesList.innerHTML = `<p class="error">Error loading quizzes: ${escapeHTML(error.message)}</p>`;
    }
  }

  quizzesList?.addEventListener("click", async (event) => {
    const quizId = event.target.dataset.quizId;
    if (!quizId) return;

    if (event.target.classList.contains("edit-btn")) {
      const quiz = allQuizzes.find((item) => item.id === quizId);
      if (!quiz) return alert("Quiz not found.");

      editingQuizId = quiz.id;
      document.getElementById("quiz-title").value = quiz.title || "";
      document.getElementById("quiz-standard").value = quiz.standard || "";
      document.getElementById("quiz-board").value = quiz.board || "SSC Maharashtra Board";
      document.getElementById("quiz-thumbnail").value = quiz.thumbnail || "";
      document.getElementById("quiz-time").value = quiz.timePerQuestion || 35;
      document.getElementById("quiz-attempts").value = quiz.maxAttempts || 3;

      questionsContainer.innerHTML = "";
      questionCount = 0;
      (quiz.questions || []).forEach(addQuestion);

      createQuizForm.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Update Quiz';
      showSection("create");
    }

    if (event.target.classList.contains("delete-btn")) {
      if (!confirm("Delete this quiz?")) return;
      await DataHelper.deleteQuiz(quizId);
      await loadQuizzesList();
      await loadQuizSelector();
    }
  });

  async function loadQuizSelector() {
    if (!quizSelect) return;
    const quizzes = await DataHelper.getQuizzes();

    quizSelect.innerHTML = '<option value="">Select a quiz to view results</option>';
    quizzes.forEach((quiz) => {
      const option = document.createElement("option");
      option.value = quiz.id;
      option.textContent = `${quiz.title} - Std ${quiz.standard}`;
      quizSelect.appendChild(option);
    });
  }

  quizSelect?.addEventListener("change", async (event) => {
    if (!event.target.value) {
      resultsDisplay.innerHTML = "";
      return;
    }
    await displayResults(event.target.value);
  });

  async function displayResults(quizId) {
    resultsDisplay.innerHTML = '<div class="loading">Loading results...</div>';

    try {
      const allResults = await DataHelper.getQuizResults();
      const quizResults = allResults
        .filter((result) => result.quizId === quizId)
        .sort((a, b) => (b.percentage || 0) - (a.percentage || 0) || (b.score || 0) - (a.score || 0));

      if (!quizResults.length) {
        resultsDisplay.innerHTML = "<p>No result found for this quiz yet.</p>";
        return;
      }

      const average = Math.round(
        quizResults.reduce((sum, item) => sum + Number(item.percentage || 0), 0) / quizResults.length
      );

      resultsDisplay.innerHTML = `
        <div class="results-stats">
          <p><strong>Total attempts:</strong> ${quizResults.length}</p>
          <p><strong>Average score:</strong> ${average}%</p>
        </div>
        <div class="table-wrap">
          <table class="results-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Std</th>
                <th>School</th>
                <th>Score</th>
                <th>%</th>
                <th>Attempt</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${quizResults
                .map((result, index) => {
                  const rank = index + 1;
                  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
                  const dateRaw = result.completedAt || result.timestamp;
                  const date = dateRaw ? new Date(dateRaw).toLocaleDateString() : "-";
                  return `
                    <tr>
                      <td>${medal}</td>
                      <td>${escapeHTML(result.userName || "-")}</td>
                      <td>${escapeHTML(result.standard || "-")}</td>
                      <td>${escapeHTML(result.schoolName || "-")}</td>
                      <td>${Number(result.score || 0)}/${Number(result.totalQuestions || 15)}</td>
                      <td>${Number(result.percentage || 0)}%</td>
                      <td>${Number(result.attemptNumber || 1)}</td>
                      <td>${date}</td>
                    </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      `;
    } catch (error) {
      resultsDisplay.innerHTML = `<p class="error">Error loading results: ${escapeHTML(error.message)}</p>`;
    }
  }

  resetLeaderboardBtn?.addEventListener("click", async () => {
    if (!confirm("Delete ALL leaderboard results? This cannot be undone.")) return;
    if (!confirm("Final confirmation: remove all student scores?")) return;

    resetLeaderboardBtn.disabled = true;
    resetLeaderboardBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Clearing...';

    try {
      await DataHelper.clearAllResults();
      alert("Leaderboard cleared successfully.");
      resultsDisplay.innerHTML = "<p>No results found. Leaderboard has been cleared.</p>";
    } catch (error) {
      alert("Error clearing leaderboard: " + error.message);
    } finally {
      resetLeaderboardBtn.disabled = false;
      resetLeaderboardBtn.innerHTML = '<i class="fas fa-trash"></i> Reset Leaderboard Data';
    }
  });

  await loadQuizzesList();
  await loadQuizSelector();
});