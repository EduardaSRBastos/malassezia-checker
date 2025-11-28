// Dynamic year
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  initApp();
});

const BASE_URL =
  "https://malassezia-checker-qm2jwb.5sc6y6-1.usa-e2.cloudhub.io/api/malassezia-checker";

const brandInput = document.getElementById("brand-input");
const brandList = document.getElementById("brand-list");
const productInput = document.getElementById("product-input");
const productList = document.getElementById("product-list");
const ingredientsSpan = document.querySelector(".ingredients-list");
const ingredientsListContainer = document.querySelector(
  ".ingredients-list-container"
);
const resultsContainer = document.querySelector(".results-container");

productInput.disabled = true;
productInput.classList.add("disabled");

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
}

async function loadBrands() {
  const brands = await fetchJSON(`${BASE_URL}/brands`);
  brandList.innerHTML = "";

  brands.forEach((brand) => {
    const div = document.createElement("div");
    div.classList.add("option-item");
    div.textContent = brand.name;

    div.addEventListener("click", () => selectBrand(brand.name));

    brandList.appendChild(div);
  });
}

async function loadProductsForBrand(brandName) {
  productInput.disabled = false;
  productInput.classList.remove("disabled");
  productInput.value = "";
  productList.innerHTML = "";
  ingredientsSpan.textContent = "";

  try {
    const products = await fetchJSON(
      `${BASE_URL}/brands/${encodeURIComponent(brandName)}/products`
    );
    products.forEach((product) => {
      const div = document.createElement("div");
      div.classList.add("option-item");
      div.textContent = product.name;

      div.addEventListener("click", () => selectProduct(product));

      productList.appendChild(div);
    });
    productInput.removeAttribute("title");
  } catch (err) {
    console.error(err);
  }
}

function selectBrand(brandName) {
  brandInput.value = brandName;
  brandList.style.display = "none";
  loadProductsForBrand(brandName);
}

let selectedProductId = null;

function selectProduct(product) {
  productInput.value = product.name;
  productList.style.display = "none";
  ingredientsSpan.textContent = product.ingredients.normalize("NFC");
  ingredientsListContainer.style.opacity = "1";
  ingredientsListContainer.style.margin = "30px 0";
  selectedProductId = product.id;
  updateCheckButton();
}

// Brand input interactions
brandInput.addEventListener("input", () =>
  filterOptions(brandInput, brandList)
);
brandInput.addEventListener("focus", () => (brandList.style.display = "block"));
brandInput.addEventListener("blur", () =>
  setTimeout(() => (brandList.style.display = "none"), 100)
);

// Product input interactions
productInput.addEventListener("focus", () => {
  if (!brandInput.value) productInput.blur();
  else productList.style.display = "block";
});
productInput.addEventListener("mouseover", () => {
  productInput.style.cursor = brandInput.value ? "pointer" : "not-allowed";
  if (!brandInput.value) productInput.title = "Select a brand first";
  else productInput.removeAttribute("title");
});
productInput.addEventListener("input", () =>
  filterOptions(productInput, productList)
);
productInput.addEventListener("blur", () =>
  setTimeout(() => (productList.style.display = "none"), 100)
);

function filterOptions(input, list) {
  const filter = input.value.toLowerCase();
  list.querySelectorAll(".option-item").forEach((opt) => {
    opt.style.display = opt.textContent.toLowerCase().includes(filter)
      ? "block"
      : "none";
  });
  list.style.display = "block";
}

const checkBtn = document.querySelector(".check-btn");
const ingredientsTextarea = document.getElementById("ingredients-txtarea");

function updateCheckButton() {
  const hasProductIngredients = ingredientsSpan.textContent.trim().length > 0;
  const hasTypedIngredients = ingredientsTextarea.value.trim().length > 0;

  checkBtn.disabled = !(hasProductIngredients || hasTypedIngredients);
}

ingredientsTextarea.addEventListener("input", updateCheckButton);

checkBtn.addEventListener("click", async () => {
  if (checkBtn.disabled) return;
  resultsContainer.style.opacity = "1";
  resultsContainer.style.margin = "30px 0";

  try {
    // Case 1: Product selected → GET /products/:id
    if (selectedProductId) {
      const data = await fetchJSON(`${BASE_URL}/products/${selectedProductId}`);
      displayResults(data[0].ingredients);
      return;
    }

    // Case 2: Manual input → POST /ingredients
    const ingredientsText = ingredientsTextarea.value.trim();

    const ingredientsArray = ingredientsText
      .split(",")
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    const res = await fetch(`${BASE_URL}/ingredients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients: ingredientsArray }),
    });

    const result = await res.json();
    displayResults(result.validatedIngredients);
  } catch (err) {
    console.error(err);
  }
});

const resultsSpan = document.querySelector(".results");
const categoryColors = {
  "fatty acids": "red",
  lipids: "red",
  esters: "orange",
  galactomyces: "orange",
  "high sensitivity": "yellow",
};

function displayResults(ingredients) {
  const badOnes = ingredients.filter((item) => item.category);

  if (badOnes.length === 0) {
    resultsSpan.innerHTML = "No problematic ingredients found!";
    return;
  }

  let html = `<p style="margin:0; font-size:17px;">Detected <strong style="font-size:24px;">${badOnes.length}</strong> potentially problematic ingredients.</p>`;
  html += "<table><tr><th>Name</th><th>Category</th></tr>";

  badOnes.forEach((item) => {
    const color = categoryColors[item.category] || "gray";
    html += `<tr>
               <td>
                 <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${color};margin-right:5px;"></span>
                 ${item.name}
               </td>
               <td style="background:${color};font-weight:bold;">${item.category}</td>
             </tr>`;
  });

  html += `
    <tr>
      <td colspan="2">
        <div style="display:flex; gap:10px;">
          <span><span class="legend-dot red"></span> Highly reactive for most individuals.</span>
          <span><span class="legend-dot orange"></span> Highly reactive under certain conditions.</span>
          <span><span class="legend-dot yellow"></span> Reactivity depends on skin tolerance.</span>
        </div>
      </td>
    </tr>
  `;

  html += "</table>";

  resultsSpan.innerHTML = html;
}

// Initialize the app
function initApp() {
  brandInput.value = "";
  productInput.value = "";
  ingredientsSpan.textContent = "";
  ingredientsTextarea.value = "";
  selectedProductId = null;
  checkBtn.disabled = true;
  productInput.disabled = true;

  loadBrands();
}
