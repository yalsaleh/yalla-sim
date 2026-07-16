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
  const build = splash?.querySelector(".logo-build");

  if (!splash || !page) {
    document.dispatchEvent(new CustomEvent("yalla:ready"));
    return;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Fast continuous charge, then hold the full logo before fading out
  requestAnimationFrame(() => {
    build?.classList.add("is-charging");
  });

  // CSS charge ≈ 0.65s; keep the completed mark on screen longer
  const hold = reduceMotion ? 450 : 1650;

  setTimeout(() => {
    build?.classList.add("is-done");
    splash.classList.add("hidden");
    page.classList.add("visible");
    document.dispatchEvent(new CustomEvent("yalla:ready"));
  }, hold);
}

function revealItemsIn(root) {
  const items = [
    ...(root.matches?.("[data-reveal]") ? [root] : []),
    ...root.querySelectorAll("[data-reveal]"),
  ];
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

  // One-shot reveals: never toggle off while scrolling (that stalls glide / causes jank)
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        obs.unobserve(entry.target);
      });
    },
    {
      threshold: 0.08,
      rootMargin: "0px 0px -4% 0px",
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
      revealItemsIn(section);
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      history.pushState(null, "", hash);
    });
  });

  if (location.hash) {
    const section = document.querySelector(location.hash);
    if (section) {
      setTimeout(() => {
        revealItemsIn(section);
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
  }
}

function initSmoothAnimation() {
  const wash = document.querySelector(".page-wash");
  const main = document.querySelector(".page-main") || document.getElementById("page");
  const showcase = document.querySelector(".hero__showcase");
  if (!wash || !main) return;

  // Wash is inside .page-main (bottom: 0) so it stops at the footer border.
  wash.style.transform = "";
  wash.style.bottom = "0";

  const syncWashTop = () => {
    if (!showcase) return;
    wash.style.top = `${Math.max(0, showcase.offsetTop - 24)}px`;
  };

  syncWashTop();
  document.addEventListener("yalla:ready", syncWashTop, { once: true });
  window.addEventListener("load", syncWashTop, { once: true, passive: true });
  window.addEventListener("resize", syncWashTop, { passive: true });
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
