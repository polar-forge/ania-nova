(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // HEADER HEIGHT -> CSS var (scroll offsets)
  var header = document.querySelector(".site-header");
  function updateHeaderHeight() {
    root.style.setProperty("--nav-h", header.offsetHeight + "px");
  }
  updateHeaderHeight();
  window.addEventListener("resize", updateHeaderHeight);

  // FOOTER YEAR
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // FADE-UP ON SCROLL
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("in-view");
    });
  }

  // BRAND IN HEADER: appears once the big hero name scrolls away
  var heroTitle = document.getElementById("hero-title");
  if (heroTitle && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      header.classList.toggle("show-brand", !entries[0].isIntersecting);
    }).observe(heroTitle);
  } else {
    header.classList.add("show-brand");
  }

  // ACTIVE SECTION IN NAV
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav a, .menu__links a"));
  if ("IntersectionObserver" in window) {
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var hash = "#" + entry.target.id;
          navLinks.forEach(function (a) {
            if (a.getAttribute("href") === hash) a.setAttribute("aria-current", "location");
            else a.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    document.querySelectorAll("main > section[id]").forEach(function (s) {
      sectionObserver.observe(s);
    });
  }

  // MOBILE MENU
  var burger = document.querySelector(".burger");
  var menu = document.getElementById("menu");
  function setMenu(open) {
    root.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.setAttribute("aria-hidden", String(!open));
  }
  burger.addEventListener("click", function () {
    setMenu(!root.classList.contains("menu-open"));
  });
  menu.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () {
      setMenu(false);
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && root.classList.contains("menu-open")) {
      setMenu(false);
      burger.focus();
    }
  });
  window.matchMedia("(min-width: 961px)").addEventListener("change", function (e) {
    if (e.matches) setMenu(false);
  });

  // BACK TO TOP
  var toTop = document.querySelector(".to-top");
  var ticking = false;
  window.addEventListener(
    "scroll",
    function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        toTop.classList.toggle("visible", window.scrollY > window.innerHeight * 1.2);
        ticking = false;
      });
    },
    { passive: true }
  );

  // LAZY EMBEDS: swap thumbnail + play button for the real iframe on click
  function mountIframe(container, src, title) {
    var iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.title = title || "Video player";
    iframe.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
    iframe.allowFullscreen = true;
    var old = container.querySelector("iframe");
    if (old) old.remove();
    container.appendChild(iframe);
    container.classList.add("is-playing");
  }

  document.querySelectorAll("[data-embed]").forEach(function (el) {
    el.querySelector(".play").addEventListener("click", function () {
      mountIframe(el, el.dataset.embed, el.dataset.title);
    });
  });

  // VIDEO PLAYER + PLAYLIST
  (function () {
    var screen = document.querySelector(".player__screen");
    if (!screen) return;
    var thumb = screen.querySelector(".player__thumb");
    var playBtn = screen.querySelector(".play");
    var titleEl = document.querySelector(".player__title");
    var items = Array.prototype.slice.call(document.querySelectorAll(".playlist__item"));
    var current = items[0];

    function ytSrc(id) {
      return "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0&modestbranding=1&playsinline=1";
    }

    function select(item, autoplay) {
      current = item;
      items.forEach(function (i) {
        if (i === item) i.setAttribute("aria-current", "true");
        else i.removeAttribute("aria-current");
      });
      var title = item.querySelector(".playlist__title").textContent;
      titleEl.textContent = title;
      thumb.src = item.querySelector("img").src;
      var old = screen.querySelector("iframe");
      if (old) old.remove();
      screen.classList.remove("is-playing");
      if (autoplay) mountIframe(screen, ytSrc(item.dataset.id), "Ania Nova — " + title);
    }

    playBtn.addEventListener("click", function () {
      select(current, true);
    });

    items.forEach(function (item) {
      item.addEventListener("click", function () {
        select(item, true);
        var rect = screen.getBoundingClientRect();
        if (rect.top < 0 || rect.top > window.innerHeight * 0.5) {
          screen.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        }
      });
    });
  })();

  // FILMOGRAPHY — masonry columns so longer credit/award lines flow evenly
  (function () {
    var grid = document.querySelector(".film-grid");
    if (!grid) return;
    var films = Array.prototype.slice.call(grid.querySelectorAll(".film"));
    if (!films.length) return;
    var builtCols = 0;

    function colsForWidth() {
      if (window.innerWidth <= 560) return 2;
      if (window.innerWidth <= 880) return 3;
      if (window.innerWidth <= 1180) return 4;
      return 5;
    }

    function build(force) {
      var count = colsForWidth();
      if (!force && count === builtCols) return;
      builtCols = count;

      while (grid.firstChild) grid.removeChild(grid.firstChild);

      var cols = [];
      for (var i = 0; i < count; i++) {
        var col = document.createElement("div");
        col.className = "film-col";
        grid.appendChild(col);
        cols.push({ el: col, h: 0 });
      }

      films.forEach(function (film) {
        var target = cols[0];
        cols.forEach(function (c) {
          if (c.h < target.h) target = c;
        });
        target.el.appendChild(film);
        target.h += film.offsetHeight;
      });

      grid.classList.add("is-masonry");
    }

    build(false);

    // Re-arm native lazy loading after the nodes move between columns.
    if ("IntersectionObserver" in window) {
      var filmLoader = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var img = entry.target.querySelector("img");
            if (img) img.loading = "eager";
            filmLoader.unobserve(entry.target);
          });
        },
        { rootMargin: "600px 0px" }
      );
      films.forEach(function (film) {
        filmLoader.observe(film);
      });
    } else {
      films.forEach(function (film) {
        var img = film.querySelector("img");
        if (img) img.loading = "eager";
      });
    }

    window.addEventListener("load", function () {
      build(true);
    });

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        build(true);
      }, 150);
    });
  })();

  // GALLERY LAYOUT — explicit columns with real gaps. CSS multicol truncates
  // the bottom margin at column breaks, which left uneven spacing.
  (function () {
    var gallery = document.querySelector(".gallery");
    if (!gallery) return;
    var items = Array.prototype.slice.call(gallery.querySelectorAll(".gallery__item"));
    if (!items.length) return;

    items.forEach(function (el, i) {
      el.setAttribute("data-order", String(i));
    });

    var builtCols = 0;

    function columnsForWidth() {
      return window.innerWidth <= 768 ? 2 : 3;
    }

    function build() {
      var count = columnsForWidth();
      if (count === builtCols) return;
      builtCols = count;

      while (gallery.firstChild) gallery.removeChild(gallery.firstChild);

      var columns = [];
      for (var c = 0; c < count; c++) {
        var col = document.createElement("div");
        col.className = "gallery__col";
        gallery.appendChild(col);
        columns.push({ el: col, height: 0 });
      }

      items.forEach(function (item) {
        var shortest = columns[0];
        columns.forEach(function (col) {
          if (col.height < shortest.height) shortest = col;
        });
        shortest.el.appendChild(item);
        var img = item.querySelector("img");
        var w = parseFloat(img.getAttribute("width")) || 1;
        var h = parseFloat(img.getAttribute("height")) || 1;
        shortest.height += h / w;
      });

      gallery.classList.add("is-masonry");
    }

    build();

    // Re-arm native lazy loading: moving the nodes into new columns can leave
    // <img loading="lazy"> without an intersection update, so they never fetch.
    if ("IntersectionObserver" in window) {
      var imgLoader = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var img = entry.target.querySelector("img");
            if (img) img.loading = "eager";
            imgLoader.unobserve(entry.target);
          });
        },
        { rootMargin: "800px 0px" }
      );
      items.forEach(function (item) {
        imgLoader.observe(item);
      });
    } else {
      items.forEach(function (item) {
        var img = item.querySelector("img");
        if (img) img.loading = "eager";
      });
    }

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 150);
    });
  })();

  // GALLERY LIGHTBOX — swipe, keyboard, counter, preload
  (function () {
    var buttons = Array.prototype.slice
      .call(document.querySelectorAll(".gallery__item"))
      .sort(function (a, b) {
        return (+a.getAttribute("data-order") || 0) - (+b.getAttribute("data-order") || 0);
      });
    var lightbox = document.querySelector(".lightbox");
    if (!buttons.length || !lightbox) return;

    var img = lightbox.querySelector(".lightbox__img");
    var backdrop = lightbox.querySelector(".lightbox__backdrop");
    var stage = lightbox.querySelector(".lightbox__stage");
    var prevBtn = lightbox.querySelector(".lightbox__prev");
    var nextBtn = lightbox.querySelector(".lightbox__next");
    var closeBtn = lightbox.querySelector(".lightbox__close");
    var indexEl = lightbox.querySelector(".lightbox__index");
    lightbox.querySelector(".lightbox__total").textContent = buttons.length;

    var index = 0;
    var lastTrigger = null;

    buttons.forEach(function (btn, i) {
      btn.setAttribute("aria-label", "Open photo " + (i + 1) + " of " + buttons.length + ": " + btn.querySelector("img").alt);
      btn.addEventListener("click", function () {
        open(i, btn);
      });
    });

    function srcAt(i) {
      var t = buttons[i].querySelector("img");
      return t.currentSrc || t.src;
    }

    function preload(i) {
      var p = new Image();
      p.src = srcAt((i + buttons.length) % buttons.length);
    }

    function show(i, direction) {
      index = (i + buttons.length) % buttons.length;
      img.src = srcAt(index);
      img.alt = buttons[index].querySelector("img").alt;
      indexEl.textContent = index + 1;
      preload(index + 1);
      preload(index - 1);
      if (direction && !reduceMotion && img.animate) {
        img.animate(
          [
            { opacity: 0, transform: "translateX(" + direction * 40 + "px)" },
            { opacity: 1, transform: "none" }
          ],
          { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)" }
        );
      }
    }

    function open(i, trigger) {
      lastTrigger = trigger;
      show(i);
      lightbox.classList.add("open");
      lightbox.setAttribute("aria-hidden", "false");
      root.classList.add("lightbox-open");
      closeBtn.focus({ preventScroll: true });
    }

    function close() {
      lightbox.classList.remove("open");
      lightbox.setAttribute("aria-hidden", "true");
      root.classList.remove("lightbox-open");
      if (lastTrigger) lastTrigger.focus({ preventScroll: true });
    }

    nextBtn.addEventListener("click", function () { show(index + 1, 1); });
    prevBtn.addEventListener("click", function () { show(index - 1, -1); });
    closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", close);
    stage.addEventListener("click", function (e) {
      if (e.target === stage) close();
    });

    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") show(index + 1, 1);
      else if (e.key === "ArrowLeft") show(index - 1, -1);
      else if (e.key === "Tab") {
        // keep focus inside the dialog
        var focusables = [prevBtn, nextBtn, closeBtn];
        var pos = focusables.indexOf(document.activeElement);
        e.preventDefault();
        var nextPos = (pos + (e.shiftKey ? -1 : 1) + focusables.length) % focusables.length;
        focusables[nextPos].focus();
      }
    });

    // Touch: swipe left/right to navigate, swipe down to close
    var startX = 0, startY = 0, tracking = false;
    lightbox.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) return;
      tracking = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    lightbox.addEventListener("touchmove", function (e) {
      if (!tracking) return;
      var dx = e.touches[0].clientX - startX;
      var dy = e.touches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy)) img.style.transform = "translateX(" + dx * 0.6 + "px)";
      else if (dy > 0) img.style.transform = "translateY(" + dy * 0.6 + "px)";
    }, { passive: true });

    lightbox.addEventListener("touchend", function (e) {
      if (!tracking) return;
      tracking = false;
      img.style.transform = "";
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      } else if (dy > 90 && dy > Math.abs(dx)) {
        close();
      }
    });
  })();
})();
