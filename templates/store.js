// Shared storefront behaviour for Billy Digitals e-commerce demos.
// Add-to-cart with animated badge + toast, favourite hearts, pill/swatch selects.
document.addEventListener("DOMContentLoaded", () => {
  const badge = document.querySelector(".dcart .badge");
  let count = badge ? parseInt(badge.textContent, 10) || 0 : 0;

  // Toast element (one per page)
  let toast = document.querySelector(".dtoast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "dtoast";
    document.body.appendChild(toast);
  }
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  // Add to cart
  document.querySelectorAll(".padd").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      count += 1;
      if (badge) {
        badge.textContent = count;
        badge.classList.remove("pop");
        void badge.offsetWidth; // reflow to restart animation
        badge.classList.add("pop");
      }
      const name = btn.getAttribute("data-name") || "Item";
      showToast(`✓ ${name} added to bag`);
    });
  });

  // Favourite hearts
  document.querySelectorAll(".pcard-fav").forEach((fav) => {
    fav.addEventListener("click", (e) => {
      e.preventDefault();
      fav.classList.toggle("on");
      fav.textContent = fav.classList.contains("on") ? "♥" : "♡";
    });
  });

  // Pills / swatches — single-select within a group
  document.querySelectorAll("[data-select]").forEach((group) => {
    group.addEventListener("click", (e) => {
      const opt = e.target.closest(".pill, .swatch");
      if (!opt || !group.contains(opt)) return;
      group.querySelectorAll(".pill, .swatch").forEach((o) => o.classList.remove("on"));
      opt.classList.add("on");
    });
  });

  // Newsletter demo submit
  document.querySelectorAll(".dnews").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      form.innerHTML = '<p style="margin:0;font-weight:600">🎉 You\'re in — check your inbox for 10% off.</p>';
    });
  });
});
