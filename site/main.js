/* Acode · Acode Editor — interações do site (JS puro) */
(function () {
  "use strict";

  /* ---------- nav: fundo ao rolar + menu mobile ---------- */
  var navbar = document.getElementById("navbar");
  var hamburger = document.getElementById("hamburger");
  var navLinks = document.getElementById("navLinks");

  window.addEventListener("scroll", function () {
    navbar.classList.toggle("scrolled", window.scrollY > 24);
    toTop.classList.toggle("visible", window.scrollY > 480);
  }, { passive: true });

  hamburger.addEventListener("click", function () {
    var open = navLinks.classList.toggle("open");
    hamburger.classList.toggle("open", open);
    hamburger.setAttribute("aria-expanded", String(open));
  });

  navLinks.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      navLinks.classList.remove("open");
      hamburger.classList.remove("open");
      hamburger.setAttribute("aria-expanded", "false");
    }
  });

  /* ---------- voltar ao topo ---------- */
  var toTop = document.getElementById("toTop");
  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---------- reveal on scroll ---------- */
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  var reveals = document.querySelectorAll(".reveal");
  var i;
  for (i = 0; i < reveals.length; i++) revealObserver.observe(reveals[i]);

  /* ---------- contadores animados ---------- */
  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    var duration = 1400;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var countObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        countObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });

  var counters = document.querySelectorAll("[data-count]");
  for (i = 0; i < counters.length; i++) countObserver.observe(counters[i]);

  /* ---------- efeito de digitação no mock do editor ---------- */
  var codeEl = document.getElementById("typedCode");
  if (codeEl) {
    var lines = [
      '<!DOCTYPE html>',
      '<html>',
      '  <body>',
      '    <h1>Ola, mundo!</h1>',
      '    <script>',
      '      console.log("feito no celular");',
      '    <\/script>',
      "  </body>",
      "</html>"
    ];
    var li = 0, ci = 0, out = "";
    function type() {
      if (li >= lines.length) return;
      var line = lines[li];
      out += line.charAt(ci);
      codeEl.textContent = out;
      ci++;
      if (ci > line.length) {
        out += "\n";
        li++;
        ci = 0;
        setTimeout(type, 260);
      } else {
        setTimeout(type, 26);
      }
    }
    var typeObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          typeObserver.disconnect();
          setTimeout(type, 700);
        }
      });
    }, { threshold: 0.3 });
    typeObserver.observe(codeEl.closest(".hero"));
  }

  /* ---------- brilho seguindo o mouse nos cards ---------- */
  var cards = document.querySelectorAll(".feature-card");
  cards.forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      var rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", e.clientX - rect.left + "px");
      card.style.setProperty("--my", e.clientY - rect.top + "px");
    });
  });
})();
