(function () {
  function onReady() {
    const stepCards = Array.from(document.querySelectorAll("[data-rider-step]"));
    const markButtons = Array.from(document.querySelectorAll("[data-mark-step]"));
    const stepTriggers = Array.from(document.querySelectorAll("[data-step-trigger]"));
    const checkboxes = Array.from(document.querySelectorAll("[data-track-checkbox]"));
    const progressFill = document.getElementById("rider-progress-fill");
    const progressText = document.getElementById("rider-progress-text");
    const reviewedSteps = new Set();
    const seenSteps = new Set();

    function updateProgress() {
      if (!progressFill || !progressText) {
        return;
      }

      const percent = (reviewedSteps.size / 4) * 100;
      progressFill.style.width = percent + "%";
      progressText.textContent = reviewedSteps.size + " of 4 steps reviewed";
    }

    function track(eventName, payload) {
      if (window.RidesLoAnalytics) {
        window.RidesLoAnalytics.track(eventName, payload);
      }
    }

    stepTriggers.forEach(function (button) {
      button.addEventListener("click", function () {
        const stepId = button.dataset.stepTrigger;
        const target = document.getElementById(stepId);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          track("rider_step_nav", { stepId });
        }
      });
    });

    markButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        const stepNumber = button.dataset.markStep;
        const card = button.closest("[data-rider-step]");
        reviewedSteps.add(stepNumber);

        if (card) {
          card.classList.add("is-reviewed");
        }

        updateProgress();
        track("rider_step_reviewed", { stepNumber });
      });
    });

    checkboxes.forEach(function (checkbox) {
      checkbox.addEventListener("change", function () {
        track("document_checklist_toggle", {
          documentType: checkbox.dataset.trackCheckbox,
          checked: checkbox.checked
        });
      });
    });

    const stepObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }

        const stepNumber = entry.target.dataset.riderStep;
        const stepTitle = entry.target.dataset.stepTitle;

        stepTriggers.forEach(function (pill) {
          pill.classList.toggle("is-active", pill.dataset.stepTrigger === entry.target.id);
        });

        if (!seenSteps.has(stepNumber)) {
          seenSteps.add(stepNumber);
          track("rider_step_view", { stepNumber, stepTitle });
        }
      });
    }, { threshold: 0.45 });

    stepCards.forEach(function (card) {
      stepObserver.observe(card);
    });

    track("rider_process_loaded", { steps: stepCards.length });
    updateProgress();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();
