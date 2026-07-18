/* Country + days picker → WhatsApp handoff (plans & prices live in chat) */

const MIDDLE_EAST = new Set([
  "Bahrain",
  "Egypt",
  "Iran",
  "Iraq",
  "Israel",
  "Jordan",
  "Kuwait",
  "Lebanon",
  "Oman",
  "Palestine",
  "Qatar",
  "Saudi Arabia",
  "Syria",
  "Turkey",
  "United Arab Emirates",
  "Yemen",
]);

const EUROPE = new Set([
  "Albania",
  "Austria",
  "Belgium",
  "Bosnia and Herz.",
  "Bulgaria",
  "Croatia",
  "Cyprus",
  "Czechia",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Iceland",
  "Ireland",
  "Italy",
  "Kosovo",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Moldova",
  "Montenegro",
  "Netherlands",
  "North Macedonia",
  "Norway",
  "Poland",
  "Portugal",
  "Romania",
  "Serbia",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
  "Switzerland",
  "Ukraine",
  "United Kingdom",
]);

function planHintFor(countryName) {
  if (MIDDLE_EAST.has(countryName)) {
    return "Likely Middle East / GCC regional plans, plus country options";
  }
  if (EUROPE.has(countryName)) {
    return "Likely Europe regional plans, plus country options";
  }
  return "Country plans, plus global options when they fit";
}

function getWhatsAppUrlForSelection(country, days) {
  const params = new URLSearchParams();
  const dayLabel = `${days} day${days === 1 ? "" : "s"}`;
  const text = `Hi Yalla Sim! I'm traveling to ${country} for ${dayLabel}. Please send the matching eSIM plans (country, regional, or global).`;
  params.set("text", text);
  return `https://wa.me/${WHATSAPP_NUMBER}?${params.toString()}`;
}

function initPricingPage() {
  const countrySelect = document.getElementById("country-select");
  const daysInput = document.getElementById("days-input");
  const daysText = document.getElementById("days-text");
  const tripLine = document.getElementById("trip-line");
  const regionLine = document.getElementById("region-line");
  const cta = document.getElementById("pricing-cta");
  const mapEl = document.getElementById("world-map");
  const searchInput = document.getElementById("country-search");
  const mapHint = document.getElementById("map-hint");

  if (!countrySelect || !mapEl || !cta) return;

  let selectedId = null;
  let countryById = new Map();
  let pathById = new Map();
  let allCountries = [];

  const MAP_FILL = "#ffb74d";
  const MAP_HOVER = "#ff9800";
  const MAP_SELECTED = "#e65100";

  function clampDays(value) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, Math.min(365, n));
  }

  function setDays(value, { syncText = true, syncRange = true } = {}) {
    const days = clampDays(value);
    if (syncRange) daysInput.value = String(days);
    if (syncText && daysText) daysText.value = String(days);
    return days;
  }

  function currentCountry() {
    const option = countrySelect.selectedOptions[0];
    const fromSelect =
      countrySelect.value && (option?.dataset.name || option?.textContent || "");
    const fromMap = selectedId ? countryById.get(selectedId)?.name || "" : "";
    return fromSelect || fromMap;
  }

  function updateUI() {
    const country = currentCountry();
    const days = setDays(daysInput.value);

    if (!country) {
      if (tripLine) tripLine.textContent = "Pick a country and days";
      if (regionLine) regionLine.textContent = "";
      if (mapHint) mapHint.textContent = "Select a country";
      cta.href = "#";
      cta.classList.add("is-disabled");
      return;
    }

    const dayLabel = `${days} day${days === 1 ? "" : "s"}`;
    if (tripLine) tripLine.textContent = `${country} · ${dayLabel}`;
    if (regionLine) regionLine.textContent = planHintFor(country);
    cta.href = getWhatsAppUrlForSelection(country, days);
    cta.classList.remove("is-disabled");
  }

  function resetPath(pathEl) {
    pathEl.classList.remove("is-selected");
    pathEl.setAttribute("fill", MAP_FILL);
    pathEl.setAttribute("fill-opacity", "0.72");
    pathEl.setAttribute("stroke", "#fffaf6");
    pathEl.setAttribute("stroke-width", "0.55");
  }

  function highlightCountry(id) {
    pathById.forEach((pathEl) => resetPath(pathEl));
    selectedId = id;
    const pathEl = pathById.get(id);
    if (pathEl) {
      pathEl.classList.add("is-selected");
      pathEl.setAttribute("fill", MAP_SELECTED);
      pathEl.setAttribute("fill-opacity", "1");
      pathEl.setAttribute("stroke", "#ffffff");
      pathEl.setAttribute("stroke-width", "1.1");
      pathEl.parentNode.appendChild(pathEl);
    }
    const name = countryById.get(id)?.name;
    if (mapHint && name) mapHint.textContent = name;
  }

  function selectCountryById(id) {
    const info = countryById.get(id);
    if (!info) return;
    countrySelect.value = id;
    highlightCountry(id);
    updateUI();
  }

  function rebuildCountrySelect(query = "") {
    const q = query.trim().toLowerCase();
    const matches = q
      ? allCountries.filter((c) => c.name.toLowerCase().includes(q))
      : allCountries;

    const previous = countrySelect.value;
    countrySelect.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = matches.length
      ? "Select a country…"
      : "No countries match";
    countrySelect.appendChild(placeholder);

    matches.forEach(({ id, name }) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = name;
      opt.dataset.name = name;
      countrySelect.appendChild(opt);
    });

    if (previous && matches.some((c) => c.id === previous)) {
      countrySelect.value = previous;
    } else if (q && matches.length === 1) {
      selectCountryById(matches[0].id);
      return;
    } else if (previous && !matches.some((c) => c.id === previous)) {
      countrySelect.value = "";
    }

    updateUI();
  }

  countrySelect.addEventListener("change", () => {
    const id = countrySelect.value;
    if (id) highlightCountry(id);
    else {
      pathById.forEach((pathEl) => resetPath(pathEl));
      selectedId = null;
      if (mapHint) mapHint.textContent = "Select a country";
    }
    updateUI();
  });

  daysInput.addEventListener("input", () => {
    setDays(daysInput.value, { syncText: true, syncRange: false });
    updateUI();
  });

  daysText?.addEventListener("input", () => {
    const raw = daysText.value.trim();
    if (raw === "") return;
    daysInput.value = String(clampDays(raw));
    updateUI();
  });

  daysText?.addEventListener("change", () => {
    setDays(daysText.value === "" ? 1 : daysText.value);
    updateUI();
  });

  daysText?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setDays(daysText.value === "" ? 1 : daysText.value);
      updateUI();
      daysText.blur();
    }
  });

  searchInput?.addEventListener("input", (e) => rebuildCountrySelect(e.target.value));
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const first = countrySelect.options[1];
      if (first?.value) selectCountryById(first.value);
    }
  });

  cta.addEventListener("click", (e) => {
    if (cta.classList.contains("is-disabled")) e.preventDefault();
  });

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
      const g = svg.append("g").attr("class", "map-countries");

      const sorted = [...countries.features].sort((a, b) =>
        (a.properties.name || "").localeCompare(b.properties.name || "")
      );

      sorted.forEach((feature) => {
        const id = String(feature.id);
        const name = feature.properties.name || `Country ${id}`;
        countryById.set(id, { id, name });
        allCountries.push({ id, name });
      });

      rebuildCountrySelect("");

      g.selectAll("path")
        .data(countries.features)
        .join("path")
        .attr("d", path)
        .attr("class", "country-path")
        .attr("fill", MAP_FILL)
        .attr("fill-opacity", 0.72)
        .attr("stroke", "#fffaf6")
        .attr("stroke-width", 0.55)
        .attr("data-id", (d) => String(d.id))
        .attr("data-name", (d) => d.properties.name || "")
        .on("click", (_event, d) => selectCountryById(String(d.id)))
        .on("mouseenter", function () {
          if (!this.classList.contains("is-selected")) {
            d3.select(this).attr("fill", MAP_HOVER).attr("fill-opacity", 1);
          }
        })
        .on("mouseleave", function () {
          if (!this.classList.contains("is-selected")) {
            d3.select(this).attr("fill", MAP_FILL).attr("fill-opacity", 0.72);
          }
        })
        .each(function (d) {
          pathById.set(String(d.id), this);
        });

      const uae = sorted.find((f) => f.properties.name === "United Arab Emirates");
      if (uae) {
        daysInput.value = "7";
        selectCountryById(String(uae.id));
      }
      updateUI();
    })
    .catch((err) => {
      console.error("Map failed to load", err);
      mapEl.innerHTML =
        '<p class="map-fallback">Map couldn’t load. You can still pick a country from the list.</p>';
    });
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

document.addEventListener("DOMContentLoaded", () => {
  if (typeof initWhatsAppLinks === "function") initWhatsAppLinks();
  initPricingPage();
});
