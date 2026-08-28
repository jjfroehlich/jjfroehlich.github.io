const summaryModal = document.querySelector("#summary-modal");
const summaryModalImage = summaryModal?.querySelector(".summary-modal-image");
const summaryModalClose = summaryModal?.querySelector(".summary-modal-close");
const summaryModalPrevious = summaryModal?.querySelector(".summary-modal-previous");
const summaryModalNext = summaryModal?.querySelector(".summary-modal-next");
const summaryLinks = Array.from(document.querySelectorAll(".summary-link"));
const footerInfoControl = document.querySelector(".footer-info-control");
const footerInfoToggle = footerInfoControl?.querySelector(".footer-info-toggle");
const footerInfo = footerInfoControl?.querySelector(".footer-info");
let currentSummaryIndex = -1;

if (summaryModal && summaryModalImage && summaryLinks.length && typeof summaryModal.showModal === "function") {
  const showSummary = (index) => {
    currentSummaryIndex = (index + summaryLinks.length) % summaryLinks.length;
    const link = summaryLinks[currentSummaryIndex];
    const label = link.getAttribute("aria-label") || "Graphical summary";

    summaryModalImage.src = link.href;
    summaryModalImage.alt = label;
    summaryModal.setAttribute("aria-label", label);
  };

  summaryLinks.forEach((link, index) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showSummary(index);
      summaryModal.showModal();
      summaryModalClose?.focus({ preventScroll: true });
    });
  });

  summaryModalPrevious?.addEventListener("click", () => showSummary(currentSummaryIndex - 1));
  summaryModalNext?.addEventListener("click", () => showSummary(currentSummaryIndex + 1));
  summaryModalClose?.addEventListener("click", () => summaryModal.close());

  summaryModal.addEventListener("click", (event) => {
    if (event.target === summaryModal) {
      summaryModal.close();
    }
  });

  summaryModal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      summaryModal.close();
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showSummary(currentSummaryIndex - 1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      showSummary(currentSummaryIndex + 1);
    }
  });

  summaryModal.addEventListener("close", () => {
    summaryModalImage.removeAttribute("src");
    summaryModalImage.alt = "";
    summaryModal.setAttribute("aria-label", "Graphical summary");
    currentSummaryIndex = -1;
  });
}

if (footerInfoControl && footerInfoToggle && footerInfo) {
  const setFooterInfoOpen = (isOpen) => {
    footerInfoControl.classList.toggle("is-open", isOpen);
    footerInfoToggle.setAttribute("aria-expanded", String(isOpen));
    footerInfo.setAttribute("aria-hidden", String(!isOpen));
  };

  footerInfoToggle.addEventListener("click", () => {
    setFooterInfoOpen(footerInfoToggle.getAttribute("aria-expanded") !== "true");
  });

  document.addEventListener("click", (event) => {
    if (!footerInfoControl.contains(event.target)) {
      setFooterInfoOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setFooterInfoOpen(false);
    }
  });
}
