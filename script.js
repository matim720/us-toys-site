const currency = new Intl.NumberFormat("pl-PL", {
  maximumFractionDigits: 2,
});

const integer = new Intl.NumberFormat("pl-PL", {
  maximumFractionDigits: 0,
});

const form = document.querySelector("#converter-form");
const contactForm = document.querySelector(".contact-form");
const popup = document.querySelector("#formPopup");
const closePopup = document.querySelector("#closePopup");
const picksGrid = document.querySelector("#picksGrid");
let picksData = [];

const fields = {
  usdAmount: document.querySelector("#usdAmount"),
  usdRate: document.querySelector("#usdRate"),
  cadAmount: document.querySelector("#cadAmount"),
  cadRate: document.querySelector("#cadRate"),
  milesAmount: document.querySelector("#milesAmount"),
};

const outputs = {
  primary: document.querySelector("#primaryResult"),
  usd: document.querySelector("#summaryUsd"),
  cad: document.querySelector("#summaryCad"),
  miles: document.querySelector("#summaryMiles"),
  rateStatus: document.querySelector("#rateStatus"),
};

function hidePopup() {
  if (!popup) {
    return;
  }

  popup.hidden = true;
  popup.setAttribute("hidden", "");
  popup.style.display = "none";
  document.body.classList.remove("popup-open");
}

function showPopup() {
  if (!popup) {
    return;
  }

  popup.hidden = false;
  popup.removeAttribute("hidden");
  popup.style.display = "";
  document.body.classList.add("popup-open");
}

function formatCurrency(value) {
  return `${currency.format(value)} zł`;
}

function formatKilometers(value) {
  return `${integer.format(value)} km`;
}

function updateConverter() {
  const usdAmount = Number(fields.usdAmount.value) || 0;
  const usdRate = Number(fields.usdRate.value) || 0;
  const cadAmount = Number(fields.cadAmount.value) || 0;
  const cadRate = Number(fields.cadRate.value) || 0;
  const milesAmount = Number(fields.milesAmount.value) || 0;

  const usdToPln = usdAmount * usdRate;
  const cadToPln = cadAmount * cadRate;
  const milesToKm = milesAmount * 1.60934;

  outputs.primary.textContent = formatCurrency(usdToPln);
  outputs.usd.textContent = formatCurrency(usdToPln);
  outputs.cad.textContent = formatCurrency(cadToPln);
  outputs.miles.textContent = formatKilometers(milesToKm);
}

async function fetchRate(code) {
  const response = await fetch(`https://api.nbp.pl/api/exchangerates/rates/a/${code}/?format=json`);
  if (!response.ok) {
    throw new Error(`NBP ${code} ${response.status}`);
  }

  const data = await response.json();
  return {
    rate: data.rates[0].mid,
    date: data.rates[0].effectiveDate,
  };
}

async function hydrateRatesFromNBP() {
  try {
    const [usd, cad] = await Promise.all([fetchRate("usd"), fetchRate("cad")]);

    fields.usdRate.value = usd.rate;
    fields.cadRate.value = cad.rate;
    outputs.rateStatus.textContent = `Kursy NBP z dnia ${usd.date}: USD ${currency.format(usd.rate)} / CAD ${currency.format(cad.rate)}`;
    updateConverter();
  } catch (error) {
    outputs.rateStatus.textContent = "Nie udało się pobrać kursów NBP. Możesz wpisać je ręcznie.";
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  updateConverter();
});

Object.values(fields).forEach((field) => {
  field.addEventListener("input", updateConverter);
});

updateConverter();
hydrateRatesFromNBP();

function encodeForm(data) {
  return new URLSearchParams(data).toString();
}

if (contactForm) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = contactForm.querySelector('button[type="submit"]');
    const formData = new FormData(contactForm);

    submitButton.disabled = true;
    submitButton.textContent = "Wysyłanie...";

    try {
      const response = await fetch("/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: encodeForm(formData),
      });

      if (response.status >= 400) {
        throw new Error(`Form submit failed: ${response.status}`);
      }

      window.location.href = "/success.html";
    } catch (error) {
      window.alert("Nie udało się wysłać formularza. Spróbuj ponownie albo zadzwoń do nas.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Zamów konsultację";
    }
  });
}

if (closePopup) {
  closePopup.addEventListener("click", hidePopup);
}

hidePopup();
window.addEventListener("pageshow", hidePopup);
window.addEventListener("load", hidePopup);

function formatDeadline(date) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCountdown(date) {
  const diff = date.getTime() - Date.now();

  if (diff <= 0) {
    return "zakończone";
  }

  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} min`;
  }

  return `${hours}h ${minutes}m`;
}

function renderPicks(picks) {
  if (!picksGrid) {
    return;
  }

  picksGrid.innerHTML = "";

  picks.forEach((pick) => {
    const deadlineDate = pick.deadlineAt ? new Date(pick.deadlineAt) : null;
    const deadlineLabel = deadlineDate ? formatDeadline(deadlineDate) : "Brak deadline";
    const countdownLabel = deadlineDate ? formatCountdown(deadlineDate) : "Brak licznika";
    const source = pick.source || "Aukcja";
    const lotNumber = pick.lotNumber || "";
    const vin = pick.vin || "";
    const currentBid = pick.currentBid || pick.price || "";
    const buyNow = pick.buyNow || "";
    const auctionMeta = [source, lotNumber ? `Lot ${lotNumber}` : "", vin ? `VIN ${vin}` : ""]
      .filter(Boolean)
      .join(" • ");

    const article = document.createElement("article");
    article.className = "info-card pick-card";
    article.innerHTML = `
      <div class="pick-image-wrap">
        <img
          class="pick-image"
          src="${pick.image}"
          alt="${pick.title}"
          onerror="this.style.display='none'; this.parentElement.classList.add('image-missing')"
        />
        <span class="pick-status pick-status-${pick.status.replace(/\s+/g, "-")}">
          <span class="pick-status-icon" aria-hidden="true"></span>${pick.status}
        </span>
      </div>
      <div class="pick-body">
        <p class="tag">${pick.tag}</p>
        <h3>${pick.title}</h3>
        <p>${pick.description}</p>
        ${auctionMeta ? `<p class="pick-auction-meta">${auctionMeta}</p>` : ""}
        <div class="pick-data">
          <p><span>Deadline</span><strong>${deadlineLabel}</strong></p>
          <p><span>Kończy się za</span><strong>${countdownLabel}</strong></p>
          <p><span>Cena teraz</span><strong>${pick.price}</strong></p>
          ${currentBid ? `<p><span>Current bid</span><strong>${currentBid}</strong></p>` : ""}
          ${buyNow ? `<p><span>Buy now</span><strong>${buyNow}</strong></p>` : ""}
          <p><span>Lokalizacja</span><strong>${pick.location}</strong></p>
        </div>
        <a class="pick-link" href="${pick.link}" target="_blank" rel="noreferrer">Zobacz aukcję</a>
      </div>
    `;
    picksGrid.appendChild(article);
  });
}

function sortPicks(picks) {
  return picks
    .slice()
    .sort((a, b) => new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime());
}

async function hydratePicks() {
  if (!picksGrid) {
    return;
  }

  try {
    const response = await fetch("picks.json");
    if (!response.ok) {
      throw new Error(`Picks ${response.status}`);
    }

    const payload = await response.json();
    const picks = Array.isArray(payload) ? payload : payload.picks || [];
    picksData = sortPicks(picks);
    renderPicks(picksData);
  } catch (error) {
    picksGrid.innerHTML = `
      <article class="info-card pick-card">
        <p class="tag">Our Picks</p>
        <h3>Dodaj dzisiejsze auta w pliku picks.json</h3>
        <p>Jeśli sekcja nie załadowała danych, sprawdź czy plik picks.json jest na deployu i ma poprawny format.</p>
        <p class="pick-meta">Aktualizacja ręczna • JSON • bez zmiany HTML</p>
      </article>
    `;
  }
}

hydratePicks();

setInterval(() => {
  if (picksData.length > 0) {
    renderPicks(picksData);
  }
}, 60000);
