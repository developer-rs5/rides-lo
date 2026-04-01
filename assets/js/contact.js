(function () {
  function onReady() {
    const form = document.getElementById("contact-form");
    const status = document.getElementById("contact-form-status");

    if (!form || !status) {
      return;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const formData = new FormData(form);
      const name = String(formData.get("name") || "").trim();
      const phone = String(formData.get("phone") || "").trim();
      const message = String(formData.get("message") || "").trim();

      if (!name || !phone || !message) {
        status.textContent = "Please fill your name, phone number and message.";
        status.classList.remove("is-success");
        return;
      }

      if (window.RidesLoAnalytics) {
        window.RidesLoAnalytics.track("contact_form_submit", {
          nameLength: name.length,
          phoneDigits: phone.replace(/\D/g, "").length,
          hasEmail: Boolean(formData.get("email"))
        });
      }

      status.textContent = "Your enquiry has been captured on the page. Connect this form to your preferred backend or CRM next.";
      status.classList.add("is-success");
      form.reset();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();
