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

function selectProduct(product) {
  productInput.value = product.name;
  productList.style.display = "none";
  ingredientsSpan.textContent = product.ingredients.normalize("NFC");;
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

// Initialize the app
function initApp() {
  brandInput.value = "";
  productInput.value = "";
  productInput.disabled = true;
  productInput.classList.add("disabled");
  ingredientsSpan.textContent = "";

  loadBrands();
}
