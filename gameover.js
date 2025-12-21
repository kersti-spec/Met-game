// gameover.js
document.addEventListener("DOMContentLoaded", () => {
  const finalEl = document.getElementById("finalScore");
  const totalEl = document.getElementById("totalScore");
  const navPlayAgain = document.getElementById("navPlayAgain");
if (navPlayAgain) {
  navPlayAgain.addEventListener("click", () => {
    localStorage.setItem("metGameScore", "0");
    localStorage.removeItem("metGameFinalScore");
    localStorage.removeItem("metGameTotal");
  });
}

  const finalScore = localStorage.getItem("metGameFinalScore");
  const total = localStorage.getItem("metGameTotal") || "19";

  if (finalEl) finalEl.textContent = finalScore ?? "0";
  if (totalEl) totalEl.textContent = total;

  // Play again: reset score + clear final score snapshot
  if (playAgainBtn) {
    playAgainBtn.addEventListener("click", () => {
      localStorage.setItem("metGameScore", "0");
      localStorage.removeItem("metGameFinalScore");
      localStorage.removeItem("metGameTotal");
    });
  }
});
