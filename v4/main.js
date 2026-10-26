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
    var old = container.querySelector("iframe");
    if (old) old.remove();
    container.appendChild(iframe);
    container.classList.add("is-playing");
  }

  // SHOWREEL PLAYER + PLAYLIST — one screen; picking a video replaces whatever is playing
  (function () {
    var screen = document.querySelector(".player__screen");
    if (!screen) return;
    var thumb = screen.querySelector(".player__thumb");
    var playBtn = screen.querySelector(".play");
    var titleEl = document.querySelector(".player__title");
    var items = Array.prototype.slice.call(document.querySelectorAll(".playlist__item"));
    var current = items[0];

    function embedSrc(item) {
      if (item.dataset.vimeo) return "https://player.vimeo.com/video/" + item.dataset.vimeo + "?autoplay=1";
      return "https://www.youtube-nocookie.com/embed/" + item.dataset.id + "?autoplay=1&rel=0&modestbranding=1&playsinline=1";
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
      if (autoplay) mountIframe(screen, embedSrc(item), "Ania Nova — " + title);
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

  // BALANCED COLUMNS — shared by the gallery and press collages. Splits items
  // into columns of near-equal height regardless of their order: tallest-first
  // into the shortest column, then keep moving or swapping items between pairs
  // of columns while that narrows the gap. Each column keeps the curated order,
  // and the column holding the first item goes on the left.
  function balanceColumns(sizes, count) {
    var columns = [];
    for (var c = 0; c < count; c++) columns.push({ members: [], height: 0 });

    sizes
      .map(function (_, i) {
        return i;
      })
      .sort(function (a, b) {
        return sizes[b] - sizes[a];
      })
      .forEach(function (i) {
        var shortest = columns[0];
        columns.forEach(function (col) {
          if (col.height < shortest.height) shortest = col;
        });
        shortest.members.push(i);
        shortest.height += sizes[i];
      });

    function improvePair(tall, short) {
      var diff = tall.height - short.height;
      var best = diff - 1e-9;
      var pick = null;
      tall.members.forEach(function (i) {
        var moved = Math.abs(diff - 2 * sizes[i]);
        if (moved < best) {
          best = moved;
          pick = [i, -1];
        }
        short.members.forEach(function (j) {
          var swapped = Math.abs(diff - 2 * (sizes[i] - sizes[j]));
          if (swapped < best) {
            best = swapped;
            pick = [i, j];
          }
        });
      });
      if (!pick) return false;
      var i = pick[0];
      var j = pick[1];
      tall.members.splice(tall.members.indexOf(i), 1);
      short.members.push(i);
      tall.height -= sizes[i];
      short.height += sizes[i];
      if (j !== -1) {
        short.members.splice(short.members.indexOf(j), 1);
        tall.members.push(j);
        short.height -= sizes[j];
        tall.height += sizes[j];
      }
      return true;
    }

    var improved = true;
    while (improved) {
      improved = false;
      for (var a = 0; a < count; a++) {
        for (var b = a + 1; b < count; b++) {
          var tall = columns[a].height >= columns[b].height ? columns[a] : columns[b];
          var short = tall === columns[a] ? columns[b] : columns[a];
          if (improvePair(tall, short)) improved = true;
        }
      }
    }

    columns.forEach(function (col) {
      col.members.sort(function (x, y) {
        return x - y;
      });
    });
    columns.sort(function (x, y) {
      return x.members[0] - y.members[0];
    });
    return columns;
  }

  // Moving <img loading="lazy"> nodes between columns can leave them without an
  // intersection update, so they never fetch; load them as they come near.
  function rearmLazyImages(items) {
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (item) {
        var img = item.querySelector("img");
        if (img) img.loading = "eager";
      });
      return;
    }
    var loader = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var img = entry.target.querySelector("img");
          if (img) img.loading = "eager";
          loader.unobserve(entry.target);
        });
      },
      { rootMargin: "800px 0px" }
    );
    items.forEach(function (item) {
      loader.observe(item);
    });
  }

  // Collage layout as explicit flex columns: real gaps, unlike CSS multicol,
  // which truncates margins at column breaks. With 0 columns the items go back
  // into the container in order (a swipe rail on phones). Items past `limit`
  // stay in the DOM but hidden, so the lightbox can still reach them.
  function masonry(grid, options) {
    var items = Array.prototype.slice.call(grid.querySelectorAll(options.item));
    if (!items.length) return null;
    var built = "";

    function build(force) {
      var count = options.columns();
      var limit = options.limit ? options.limit() : items.length;
      var key = count + "/" + limit;
      if (!force && key === built) return;
      built = key;

      var shown = items.slice(0, limit);
      items.forEach(function (item, i) {
        item.hidden = i >= limit;
      });
      while (grid.firstChild) grid.removeChild(grid.firstChild);
      grid.classList.toggle("is-masonry", count > 0);

      if (!count) {
        items.forEach(function (item) {
          grid.appendChild(item);
        });
      } else {
        var cols = [];
        for (var c = 0; c < count; c++) {
          var col = document.createElement("div");
          col.className = options.colClass;
          grid.appendChild(col);
          cols.push(col);
        }
        var gap = parseFloat(getComputedStyle(cols[0]).rowGap) || 0;
        var sizes = options.measure(shown, cols[0]).map(function (h) {
          return h + gap;
        });
        balanceColumns(sizes, count).forEach(function (col, c) {
          col.members.forEach(function (i) {
            cols[c].appendChild(shown[i]);
          });
        });
        items.slice(limit).forEach(function (item) {
          cols[count - 1].appendChild(item);
        });
      }
      if (options.onBuild) options.onBuild(shown.length, items.length);
    }

    build(true);
    rearmLazyImages(items);

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 150);
    });
    return { build: build };
  }

  // GALLERY — balanced photo columns; phones preview the first photos until "Show all"
  (function () {
    var gallery = document.querySelector(".gallery");
    if (!gallery) return;
    var more = document.querySelector(".gallery__more");
    var expanded = false;
    var PREVIEW = 8;

    gallery.querySelectorAll(".gallery__item").forEach(function (el, i) {
      el.setAttribute("data-order", String(i));
    });

    function phone() {
      return window.innerWidth <= 768;
    }

    var layout = masonry(gallery, {
      item: ".gallery__item",
      colClass: "gallery__col",
      columns: function () {
        return phone() ? 2 : 3;
      },
      limit: function () {
        return phone() && !expanded ? PREVIEW : Infinity;
      },
      // Photos are sized from their width/height attributes, before they load
      measure: function (shown, col) {
        var width = col.getBoundingClientRect().width;
        return shown.map(function (item) {
          var img = item.querySelector("img");
          var w = parseFloat(img.getAttribute("width")) || 1;
          var h = parseFloat(img.getAttribute("height")) || 1;
          return (h / w) * width;
        });
      },
      onBuild: function (shown, total) {
        if (more) more.hidden = shown >= total;
      }
    });

    if (layout && more) {
      more.addEventListener("click", function () {
        expanded = true;
        layout.build();
      });
    }
  })();

  // PRESS — balanced card columns; a swipe rail on phones
  (function () {
    var grid = document.querySelector(".press-grid");
    if (!grid) return;

    var layout = masonry(grid, {
      item: ".press-card",
      colClass: "press-col",
      columns: function () {
        if (window.innerWidth <= 768) return 0;
        return window.innerWidth <= 960 ? 2 : 3;
      },
      // Cards carry text too, so measure them at the real column width
      measure: function (shown, col) {
        shown.forEach(function (card) {
          col.appendChild(card);
        });
        return shown.map(function (card) {
          return card.offsetHeight;
        });
      }
    });

    // Label heights shift once the web fonts arrive; balance again then.
    if (layout && document.fonts) {
      document.fonts.ready.then(function () {
        layout.build(true);
      });
    }
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
