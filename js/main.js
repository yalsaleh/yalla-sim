function getWhatsAppUrl() {
  const params = new URLSearchParams();
  if (WHATSAPP_MESSAGE) {
    params.set("text", WHATSAPP_MESSAGE);
  }
  const query = params.toString();
  return `https://wa.me/${WHATSAPP_NUMBER}${query ? "?" + query : ""}`;
}

function initWhatsAppLinks() {
  const url = getWhatsAppUrl();
  document.querySelectorAll("[data-whatsapp]").forEach((el) => {
    el.href = url;
  });
}

function initSplash() {
  const splash = document.getElementById("splash");
  const page = document.getElementById("page");

  if (!splash || !page) {
    document.dispatchEvent(new CustomEvent("yalla:ready"));
    return;
  }

  // Bottom → top: whole curved pieces fade in (dot → arc → sim → yalla).
  // Stagger enough that each layer is mostly visible before the next starts.
  const sequence = [
    { sel: ".logo-part--dot",   delay: 200 },
    { sel: ".logo-part--arc",   delay: 750 },
    { sel: ".logo-part--sim",   delay: 1350 },
    { sel: ".logo-part--yalla", delay: 2000 },
  ];

  sequence.forEach(({ sel, delay }) => {
    setTimeout(() => splash.querySelector(sel)?.classList.add("show"), delay);
  });

  setTimeout(() => {
    splash.classList.add("hidden");
    page.classList.add("visible");
    document.dispatchEvent(new CustomEvent("yalla:ready"));
  }, 3400);
}

function revealItemsIn(root) {
  const items = [
    ...(root.matches?.("[data-reveal]") ? [root] : []),
    ...root.querySelectorAll("[data-reveal]"),
  ];
  items.forEach((el) => el.classList.remove("is-in"));
  void root.offsetWidth;
  requestAnimationFrame(() => {
    items.forEach((el) => el.classList.add("is-in"));
  });
  return items;
}

function initScrollReveal() {
  const nodes = document.querySelectorAll("[data-reveal]");
  if (!nodes.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    nodes.forEach((el) => el.classList.add("is-in"));
    return;
  }

  let navLockUntil = 0;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
        } else if (Date.now() > navLockUntil) {
          // Leave view → reset so scrolling back up replays the reveal
          entry.target.classList.remove("is-in");
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -6% 0px",
    }
  );

  nodes.forEach((el) => observer.observe(el));

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;
      const section = document.querySelector(hash);
      if (!section) return;

      e.preventDefault();
      navLockUntil = Date.now() + 1200;
      revealItemsIn(section);
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      history.pushState(null, "", hash);
    });
  });

  // Deep link e.g. index.html#benefits after splash
  if (location.hash) {
    const section = document.querySelector(location.hash);
    if (section) {
      setTimeout(() => {
        navLockUntil = Date.now() + 1200;
        revealItemsIn(section);
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
  }
}

function initSmoothAnimation() {
  const bg = document.querySelector(".hero__showcase-bg");
  if (!bg) return;

  let targetMouseX = 0;
  let targetMouseY = 0;
  let currentMouseX = 0;
  let currentMouseY = 0;
  let latestScrollY = window.scrollY;
  let rafId = 0;
  let needsFrame = true;

  const queueFrame = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(animate);
  };

  window.addEventListener(
    "scroll",
    () => {
      latestScrollY = window.scrollY;
      needsFrame = true;
      queueFrame();
    },
    { passive: true }
  );

  document.addEventListener(
    "mousemove",
    (e) => {
      targetMouseX = e.clientX / window.innerWidth - 0.5;
      targetMouseY = e.clientY / window.innerHeight - 0.5;
      needsFrame = true;
      queueFrame();
    },
    { passive: true }
  );

  function animate() {
    rafId = 0;

    currentMouseX += (targetMouseX - currentMouseX) * 0.1;
    currentMouseY += (targetMouseY - currentMouseY) * 0.1;

    const scrollScale = Math.min(1 + latestScrollY * 0.012, 3.2);
    const shiftX = currentMouseX * 4;
    const shiftY = currentMouseY * 4;

    bg.style.transform = `translate3d(calc(-50% + ${shiftX}%), calc(-40% + ${shiftY}%), 0) scale(${scrollScale})`;

    const stillEasing =
      Math.abs(targetMouseX - currentMouseX) > 0.001 ||
      Math.abs(targetMouseY - currentMouseY) > 0.001;

    if (stillEasing || needsFrame) {
      needsFrame = stillEasing;
      queueFrame();
    }
  }

  queueFrame();
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if ([...document.scripts].some((s) => s.src === src)) {
      resolve();
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.onload = () => resolve();
    el.onerror = reject;
    document.head.appendChild(el);
  });
}

function initCoverageMap() {
  const mapEl = document.getElementById("coverage-map");
  if (!mapEl) return;

  const hubs = [
    { name: "Americas", coords: [-98, 39] },
    { name: "South America", coords: [-58, -14] },
    { name: "Europe", coords: [10, 50] },
    { name: "Africa", coords: [20, 5] },
    { name: "Middle East", coords: [48, 25] },
    { name: "Asia", coords: [105, 35] },
    { name: "Oceania", coords: [145, -25] },
  ];

  loadScript("https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js")
    .then(() => loadScript("https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js"))
    .then(() => fetch("assets/countries-110m.json").then((r) => r.json()))
    .then((world) => {
      const countries = topojson.feature(world, world.objects.countries);
      const width = 960;
      const height = 480;
      const projection = d3.geoNaturalEarth1().fitSize([width, height], countries);
      const path = d3.geoPath(projection);

      const svg = d3
        .select(mapEl)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

      svg.selectAll("*").remove();

      // Soft ocean plate
      svg
        .append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "transparent");

      svg
        .append("g")
        .attr("class", "coverage-map__countries")
        .selectAll("path")
        .data(countries.features)
        .join("path")
        .attr("d", path)
        .attr("fill", "#FF9800")
        .attr("fill-opacity", 0.78)
        .attr("stroke", "#fffaf6")
        .attr("stroke-width", 0.55);

      const pins = svg.append("g").attr("class", "coverage-map__pins");

      hubs.forEach((hub, i) => {
        const projected = projection(hub.coords);
        if (!projected) return;
        const [x, y] = projected;

        const g = pins
          .append("g")
          .attr("class", "coverage-map__pin")
          .attr("transform", `translate(${x},${y})`);

        g.append("circle")
          .attr("class", "coverage-map__pin-pulse")
          .attr("r", 14)
          .attr("fill", "rgba(255, 152, 0, 0.3)")
          .style("animation-delay", `${i * 0.28}s`);

        g.append("circle")
          .attr("r", 5)
          .attr("fill", "#E65100")
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 2);
      });
    })
    .catch((err) => {
      console.error("Coverage map failed to load", err);
      mapEl.innerHTML =
        '<text x="50%" y="50%" text-anchor="middle" fill="#999" font-size="16">Coverage in 200+ countries</text>';
    });
}

document.addEventListener("DOMContentLoaded", () => {
  initWhatsAppLinks();
  initSplash();
  initSmoothAnimation();
  initCoverageMap();

  const page = document.getElementById("page");
  const splash = document.getElementById("splash");
  if (!splash || page?.classList.contains("visible")) {
    initScrollReveal();
  } else {
    document.addEventListener("yalla:ready", initScrollReveal, { once: true });
  }
});
