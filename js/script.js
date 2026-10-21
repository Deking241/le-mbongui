document.addEventListener("DOMContentLoaded", () => {
  const banner = document.querySelector(".cookie-banner");
  const storage = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {}
    },
  };
  if (banner && !storage.get("cookie-choice")) banner.hidden = false;
  banner?.addEventListener("click", (e) => {
    const choice = e.target.dataset.cookie;
    if (!choice) return;
    storage.set("cookie-choice", choice);
    banner.hidden = true;
  });
  const header = document.querySelector(".site-header");
  const menu = document.querySelector(".nav");
  const toggle = document.querySelector(".menu-toggle");
  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
  });
  document.querySelectorAll(".nav a").forEach((a) =>
    a.addEventListener("click", () => {
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }),
  );
  window.addEventListener("scroll", () =>
    header.classList.toggle("scrolled", scrollY > 25),
  );
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      }),
    { threshold: 0.12 },
  );
  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
  const stats = document.querySelector(".hero-stats");
  let counted = false;
  new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !counted) {
        counted = true;
        document.querySelectorAll("[data-count]").forEach((el) => {
          const target = +el.dataset.count;
          let n = 0;
          const tick = () => {
            n += Math.ceil(target / 32);
            if (n < target) {
              el.textContent = n;
              requestAnimationFrame(tick);
            } else el.textContent = target + "+";
          };
          tick();
        });
      }
    },
    { threshold: 0.5 },
  ).observe(stats);
  document.querySelectorAll(".filters").forEach((group) =>
    group.addEventListener("click", (e) => {
      if (e.target.tagName !== "BUTTON") return;
      group.querySelector(".active").classList.remove("active");
      e.target.classList.add("active");
      const target = e.target.dataset.filterValue;
      const cards =
        group.dataset.filter === "games"
          ? document.querySelectorAll(".game-card")
          : document.querySelectorAll(".event-card");
      cards.forEach((card) =>
        card.classList.toggle(
          "hidden-card",
          target !== "all" && !card.dataset.category.includes(target),
        ),
      );
    }),
  );
  const lightbox = document.querySelector(".lightbox"),
    lightboxImg = lightbox.querySelector("img");
  document.querySelectorAll(".gallery-item").forEach((item) =>
    item.addEventListener("click", () => {
      lightboxImg.src = item.querySelector("img").src;
      lightbox.classList.add("open");
      lightbox.setAttribute("aria-hidden", "false");
    }),
  );
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target.tagName === "BUTTON") {
      lightbox.classList.remove("open");
      lightbox.setAttribute("aria-hidden", "true");
    }
  });
  document.querySelectorAll(".join-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.querySelector('[name="type"]').value = "Tournoi";
      document
        .querySelector("#reservation")
        .scrollIntoView({ behavior: "smooth" });
    }),
  );
  const form = document.querySelector(".booking-form");
  const status = form.querySelector(".form-status");
  const submitButton = form.querySelector('button[type="submit"]');
  let submitting = false;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.checkValidity()) {
      status.style.color = "#ff78c7";
      status.textContent = "Veuillez renseigner les champs obligatoires.";
      return;
    }

    const donnees = new FormData(form);
    if (donnees.get("website")) return;
    donnees.delete("website");
    donnees.append("access_key", "71fd3406-d38b-49e7-b5f2-55b3ba804b5a");
    donnees.append("subject", "Nouvelle réservation - Le Mbongui");
    donnees.append("from_name", "Site Le Mbongui");

    submitting = true;
    submitButton.disabled = true;
    status.style.color = "";
    status.textContent = "Envoi en cours...";

    try {
      const reponse = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: donnees,
      });
      const data = await reponse.json();

      if (data.success) {
        status.textContent =
          "Merci ! Votre demande est enregistrée, en attente de confirmation.";
        form.reset();
      } else {
        status.style.color = "#ff78c7";
        status.textContent = "Erreur lors de l'envoi, veuillez réessayer.";
      }
    } catch (erreur) {
      status.style.color = "#ff78c7";
      status.textContent = "Connexion impossible, veuillez réessayer.";
    }

    submitting = false;
    submitButton.disabled = false;
  });
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document
      .querySelectorAll(".game-card, .event-card, .price-card")
      .forEach((card) => {
        card.addEventListener("pointermove", (event) => {
          const box = card.getBoundingClientRect();
          const rotateX = ((event.clientY - box.top) / box.height - 0.5) * -5;
          const rotateY = ((event.clientX - box.left) / box.width - 0.5) * 5;
          card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
        });
        card.addEventListener("pointerleave", () => {
          card.style.transform = "";
        });
      });
  }
});
