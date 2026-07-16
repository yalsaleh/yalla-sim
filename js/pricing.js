/* Pricing calculator + interactive world map */

const DEFAULT_DAILY_RATE = 4.5;

// Higher / lower daily rates for common destinations (USD)
const RATE_OVERRIDES = {
  "United States of America": 5.5,
  "United States": 5.5,
  Canada: 5.0,
  Mexico: 3.5,
  Japan: 5.5,
  "South Korea": 5.0,
  China: 4.5,
  Thailand: 3.0,
  Vietnam: 2.8,
  Indonesia: 3.0,
  Singapore: 5.0,
  Malaysia: 3.2,
  Philippines: 3.0,
  India: 2.5,
  "United Arab Emirates": 5.5,
  "Saudi Arabia": 5.0,
  Turkey: 3.5,
  Egypt: 3.0,
  Morocco: 3.2,
  "South Africa": 3.5,
  "United Kingdom": 5.5,
  France: 5.0,
  Germany: 5.0,
  Italy: 5.0,
  Spain: 4.8,
  Portugal: 4.5,
  Netherlands: 5.0,
  Greece: 4.5,
  Switzerland: 6.0,
  Australia: 5.5,
  "New Zealand": 5.5,
  Brazil: 3.5,
  Argentina: 3.2,
  Chile: 3.5,
  Colombia: 3.0,
  Peru: 3.0,
};

function dailyRateFor(countryName) {
  return RATE_OVERRIDES[countryName] ?? DEFAULT_DAILY_RATE;
}

function volumeDiscount(days) {
  if (days >= 30) return 0.78;
  if (days >= 15) return 0.85;
  if (days >= 7) return 0.92;
  return 1;
}

function calcPrice(countryName, days) {
  const rate = dailyRateFor(countryName);
  const total = rate * days * volumeDiscount(days);
  return Math.round(total * 100) / 100;
}

function formatMoney(n) {
  return `$${n.toFixed(2)}`;
}

function getWhatsAppUrlForSelection(country, days, price) {
  const params = new URLSearchParams();
  const text = `Hi Yalla Sim! I need internet in ${country} for ${days} day${days === 1 ? "" : "s"}. Estimated price: ${formatMoney(price)}. Can you confirm?`;
  params.set("text", text);
  return `https://wa.me/${WHATSAPP_NUMBER}?${params.toString()}`;
}

function initPricingPage() {
  const countrySelect = document.getElementById("country-select");
  const daysInput = document.getElementById("days-input");
  const daysValue = document.getElementById("days-value");
  const priceEl = document.getElementById("price-value");
  const rateEl = document.getElementById("rate-value");
  const summaryEl = document.getElementById("price-summary");
  const cta = document.getElementById("pricing-cta");
  const mapEl = document.getElementById("world-map");
  const searchInput = document.getElementById("country-search");

  if (!countrySelect || !mapEl) return;

  let selectedId = null;
  let countryById = new Map();
  let pathById = new Map();
  let allCountries = [];

  function updateUI() {
    const option = countrySelect.selectedOptions[0];
    const fromSelect =
      countrySelect.value && (option?.dataset.name || option?.textContent || "");
    const fromMap = selectedId ? countryById.get(selectedId)?.name || "" : "";
    const country = fromSelect || fromMap;
    const days = Math.max(1, Math.min(90, Number(daysInput.value) || 1));
    daysInput.value = String(days);
    daysValue.textContent = String(days);

    if (!country) {
      priceEl.textContent = "—";
      rateEl.textContent = "—";
      summaryEl.textContent = "Pick a country and trip length to see your estimate.";
      cta.href = "#";
      cta.classList.add("is-disabled");
      return;
    }

    const rate = dailyRateFor(country);
    const price = calcPrice(country, days);
    priceEl.textContent = formatMoney(price);
    rateEl.textContent = `${formatMoney(rate)} / day`;
    summaryEl.textContent = `${country} · ${days} day${days === 1 ? "" : "s"}`;
    cta.href = getWhatsAppUrlForSelection(country, days, price);
    cta.classList.remove("is-disabled");
  }

  function highlightCountry(id) {
    pathById.forEach((pathEl) => {
      pathEl.classList.remove("is-selected");
      pathEl.setAttribute("fill", "#e8dfd4");
      pathEl.setAttribute("stroke", "#fffaf6");
      pathEl.setAttribute("stroke-width", "0.6");
    });
    selectedId = id;
    const pathEl = pathById.get(id);
    if (pathEl) {
      pathEl.classList.add("is-selected");
      pathEl.setAttribute("fill", "#FF9800");
      pathEl.setAttribute("stroke", "#ffffff");
      pathEl.setAttribute("stroke-width", "1.2");
      pathEl.parentNode.appendChild(pathEl);
    }
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
      // Keep map/price for the current pick even if it's filtered out of the list
      countrySelect.value = "";
    }

    updateUI();
  }

  countrySelect.addEventListener("change", () => {
    const id = countrySelect.value;
    if (id) highlightCountry(id);
    else {
      pathById.forEach((pathEl) => {
        pathEl.classList.remove("is-selected");
        pathEl.setAttribute("fill", "#e8dfd4");
        pathEl.setAttribute("stroke", "#fffaf6");
        pathEl.setAttribute("stroke-width", "0.6");
      });
      selectedId = null;
    }
    updateUI();
  });

  daysInput.addEventListener("input", updateUI);
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

  // Load map with d3 + topojson (from CDN globals)
  loadScript("https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js")
    .then(() => loadScript("https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js"))
    .then(() => fetch("assets/countries-110m.json").then((r) => r.json()))
    .then((world) => {
      const countries = topojson.feature(world, world.objects.countries);
      const width = 960;
      const height = 480;

      const projection = d3
        .geoNaturalEarth1()
        .fitSize([width, height], countries);

      const path = d3.geoPath(projection);

      const svg = d3
        .select(mapEl)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

      svg.selectAll("*").remove();

      const g = svg.append("g").attr("class", "map-countries");

      // Sort alphabetically for select
      const sorted = [...countries.features].sort((a, b) =>
        (a.properties.name || "").localeCompare(b.properties.name || "")
      );

      sorted.forEach((feature) => {
        const id = String(feature.id);
        const name = feature.properties.name || `Country ${id}`;
        const info = { id, name };
        countryById.set(id, info);
        allCountries.push(info);
      });

      rebuildCountrySelect("");

      g.selectAll("path")
        .data(countries.features)
        .join("path")
        .attr("d", path)
        .attr("class", "country-path")
        .attr("fill", "#e8dfd4")
        .attr("stroke", "#fffaf6")
        .attr("stroke-width", 0.6)
        .attr("data-id", (d) => String(d.id))
        .attr("data-name", (d) => d.properties.name || "")
        .on("click", function (event, d) {
          selectCountryById(String(d.id));
        })
        .on("mouseenter", function () {
          if (!this.classList.contains("is-selected")) {
            d3.select(this).attr("fill", "#ffcc80");
          }
        })
        .on("mouseleave", function () {
          if (!this.classList.contains("is-selected")) {
            d3.select(this).attr("fill", "#e8dfd4");
          }
        })
        .each(function (d) {
          pathById.set(String(d.id), this);
        });

      // Default: Japan as a friendly starting pick if present
      const japan = sorted.find((f) => f.properties.name === "Japan");
      if (japan) {
        selectCountryById(String(japan.id));
        daysInput.value = "7";
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
