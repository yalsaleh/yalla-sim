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

  if (!splash || !page) return;

  // Bottom → top Wi‑Fi build: dot → arc → sim → yalla
  // Overlapping delays so each layer starts while the previous is still easing in
  const sequence = [
    { sel: ".logo-part--dot",   delay: 280 },
    { sel: ".logo-part--arc",   delay: 720 },
    { sel: ".logo-part--sim",   delay: 1180 },
    { sel: ".logo-part--yalla", delay: 1680 },
  ];

  sequence.forEach(({ sel, delay }) => {
    setTimeout(() => splash.querySelector(sel)?.classList.add("show"), delay);
  });

  // Hold the completed logo briefly, then fade into the page
  setTimeout(() => {
    splash.classList.add("hidden");
    page.classList.add("visible");
  }, 3100);
}

function initSmoothAnimation() {
  const bg = document.querySelector('.hero__showcase-bg');
  if (!bg) return;
  
  let targetMouseX = 0;
  let targetMouseY = 0;
  let currentMouseX = 0;
  let currentMouseY = 0;

  // Track mouse
  document.addEventListener('mousemove', (e) => {
    targetMouseX = (e.clientX / window.innerWidth) - 0.5;
    targetMouseY = (e.clientY / window.innerHeight) - 0.5;
  });

  // Animation Loop
  function animate() {
    // Parallax mouse smoothing
    currentMouseX += (targetMouseX - currentMouseX) * 0.08;
    currentMouseY += (targetMouseY - currentMouseY) * 0.08;
    
    // READ SCROLL DIRECTLY (No LERP = Zero lag against native scrolling)
    const scrollY = window.scrollY;
    
    // Scale up as you scroll
    const scrollScale = 1 + (scrollY * 0.015);
    
    // Parallax shift
    const shiftX = currentMouseX * 5; 
    const shiftY = currentMouseY * 5; 
    
    // Use translate3d to force hardware (GPU) acceleration.
    // Notice we REMOVED border-radius updates. Updating border-radius in JS 
    // triggers CPU layout recalculations every frame (which causes lag).
    // Scaling a static rounded box naturally pushes the corners off screen seamlessly!
    bg.style.transform = `translate3d(calc(-50% + ${shiftX}%), calc(-40% + ${shiftY}%), 0) scale(${scrollScale})`;

    requestAnimationFrame(animate);
  }
  
  // Start loop
  animate();
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
});
