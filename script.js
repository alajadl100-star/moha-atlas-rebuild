const CONFIG={
  catalogUrl:"./catalog.json",
  whatsappNumber:"97470740597",
  pageSize:24,
  homeSize:8
};

let allProducts=[];
let visibleProducts=[];
let shown=0;
let currentModalProduct=null;

const state={
  type:"الكل",
  gender:"",
  flag:"",
  brand:"",
  note:"",
  favoritesOnly:false,
  filterMode:""
};

const favorites=new Set(
  JSON.parse(localStorage.getItem("mohaAtlasFavorites")||"[]")
);

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

const productGrid=$("#productGrid");
const statusMessage=$("#statusMessage");
const searchInput=$("#searchInput");
const sortSelect=$("#sortSelect");
const loadMoreBtn=$("#loadMoreBtn");
const catalogTitle=$("#catalogTitle");
const filterPanel=$("#filterPanel");
const filterEyebrow=$("#filterEyebrow");
const filterTitle=$("#filterTitle");
const filterOptions=$("#filterOptions");
const homeSections=$("#homeSections");

$("#headerWhatsapp").href=`https://wa.me/${CONFIG.whatsappNumber}`;

function formatNumber(value){
  return Number(value).toLocaleString("en-US",{maximumFractionDigits:2});
}

function asBoolean(value){
  return value===true ||
    ["نعم","yes","true","1"].includes(
      String(value||"").trim().toLowerCase()
    );
}

function asList(value){
  if(Array.isArray(value)){
    return value.map(String).map(x=>x.trim()).filter(Boolean);
  }

  return String(value||"")
    .split(/[,،|]/)
    .map(x=>x.trim())
    .filter(Boolean);
}

function mapProducts(payload){
  const products=Array.isArray(payload)?payload:payload.products;
  if(!Array.isArray(products)) return [];

  return products.map(item=>({
    id:String(item.id||""),
    name:String(item.name||""),
    brand:String(item.brand||""),
    concentration:String(item.concentration||""),
    size:item.size_ml??"",
    price:Number(item.price_qar)||0,
    available:item.available!==false,
    image:String(item.image_url||""),
    type:String(item.category||"غير مصنف").trim(),
    gender:String(item.gender||"").trim(),
    notes:asList(item.notes),
    isNew:asBoolean(item.is_new),
    isOffer:asBoolean(item.is_offer)
  })).filter(item=>
    item.id &&
    item.name &&
    item.price>0 &&
    item.available
  );
}

function saveFavorites(){
  localStorage.setItem(
    "mohaAtlasFavorites",
    JSON.stringify([...favorites])
  );
  $("#favoritesCount").textContent=favorites.size;
}

function toggleFavorite(id){
  favorites.has(id)?favorites.delete(id):favorites.add(id);
  saveFavorites();

  $$(`[data-favorite="${id}"]`).forEach(button=>
    button.classList.toggle("active",favorites.has(id))
  );

  if(currentModalProduct && currentModalProduct.id===id){
    updateModalFavorite();
  }

  if(state.favoritesOnly){
    applyFilters();
  }
}

function whatsappLink(product){
  const message=
`السلام عليكم، أريد طلب العطر التالي من Moha Atlas:
المنتج: ${product.brand} ${product.name}
التركيز: ${product.concentration||"-"}
الحجم: ${product.size?`${product.size} ml`:"-"}
السعر: ${formatNumber(product.price)} ر.ق
رقم المنتج: ${product.id}`;

  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function productCard(product){
  const placeholder=
    "https://placehold.co/600x600/F7FBF9/1A312C?text=Moha+Atlas";

  return `
    <article class="card">
      <button class="favorite-button ${favorites.has(product.id)?"active":""}"
              data-favorite="${product.id}">♥</button>

      <div class="image-box" data-open="${product.id}">
        <img src="${product.image||placeholder}"
             loading="lazy"
             onerror="this.src='${placeholder}'">
      </div>

      <div class="card-body">
        <p class="product-brand">${product.brand||"Moha Atlas"}</p>
        <h3 class="product-title" data-open="${product.id}">${product.name}</h3>

        <div class="meta">
          ${product.type&&product.type!=="غير مصنف"?`<span>${product.type}</span>`:""}
          ${product.gender?`<span>${product.gender}</span>`:""}
          ${product.concentration?`<span>${product.concentration}</span>`:""}
          ${product.size?`<span>${product.size} ml</span>`:""}
        </div>

        <div class="price">${formatNumber(product.price)} ر.ق</div>

        <a class="buy-button"
           href="${whatsappLink(product)}"
           target="_blank">
          اطلب عبر واتساب
        </a>
      </div>
    </article>
  `;
}

function resetState(){
  Object.assign(state,{
    type:"الكل",
    gender:"",
    flag:"",
    brand:"",
    note:"",
    favoritesOnly:false,
    filterMode:""
  });

  filterPanel.hidden=true;
}

function viewTitle(){
  if(state.favoritesOnly) return "المفضلة";
  if(state.brand) return `${state.type} — ${state.brand}`;
  if(state.note) return `${state.type} — ${state.note}`;
  if(state.gender) return state.gender;
  if(state.flag==="new") return "جديد";
  if(state.flag==="offer") return "العروض";
  if(state.type!=="الكل") return state.type;
  return "كل العطور";
}

function applyFilters(){
  const query=searchInput.value.trim().toLowerCase();

  visibleProducts=allProducts.filter(product=>{
    const typeMatch=
      state.type==="الكل" || product.type===state.type;

    const genderMatch=
      !state.gender || product.gender===state.gender;

    const flagMatch=
      !state.flag ||
      (state.flag==="new" && product.isNew) ||
      (state.flag==="offer" && product.isOffer);

    const brandMatch=
      !state.brand || product.brand===state.brand;

    const noteMatch=
      !state.note || product.notes.includes(state.note);

    const favoriteMatch=
      !state.favoritesOnly || favorites.has(product.id);

    const searchMatch=
      `${product.brand} ${product.name} ${product.concentration} ${product.size} ${product.notes.join(" ")}`
        .toLowerCase()
        .includes(query);

    return typeMatch &&
      genderMatch &&
      flagMatch &&
      brandMatch &&
      noteMatch &&
      favoriteMatch &&
      searchMatch;
  });

  if(sortSelect.value==="price-asc"){
    visibleProducts.sort((a,b)=>a.price-b.price);
  }else if(sortSelect.value==="price-desc"){
    visibleProducts.sort((a,b)=>b.price-a.price);
  }else if(sortSelect.value==="name"){
    visibleProducts.sort((a,b)=>
      `${a.brand} ${a.name}`.localeCompare(
        `${b.brand} ${b.name}`,
        "ar"
      )
    );
  }

  catalogTitle.textContent=viewTitle();
  renderProducts();
}

function renderProducts(reset=true){
  if(reset){
    shown=0;
    productGrid.innerHTML="";
  }

  const chunk=visibleProducts.slice(
    shown,
    shown+CONFIG.pageSize
  );

  productGrid.insertAdjacentHTML(
    "beforeend",
    chunk.map(productCard).join("")
  );

  shown+=chunk.length;

  productGrid.hidden=!visibleProducts.length;
  statusMessage.hidden=!!visibleProducts.length;
  loadMoreBtn.hidden=shown>=visibleProducts.length;

  $("#productCount").textContent=
    formatNumber(visibleProducts.length);

  if(!visibleProducts.length){
    statusMessage.textContent=
      "لا توجد منتجات في هذا القسم حاليًا.";
  }
}

function renderHomeSection(id,products){
  document.getElementById(id).innerHTML=
    products.length
      ? products.slice(0,CONFIG.homeSize).map(productCard).join("")
      : `<div class="status">لا توجد منتجات في هذا القسم بعد.</div>`;
}

function renderHome(){
  renderHomeSection(
    "homeNew",
    allProducts.filter(product=>product.isNew)
  );

  renderHomeSection(
    "homeOffers",
    allProducts.filter(product=>product.isOffer)
  );

  renderHomeSection(
    "homeNiche",
    allProducts.filter(product=>product.type==="نيش")
  );

  renderHomeSection(
    "homeDesigner",
    allProducts.filter(product=>product.type==="ديزاينر")
  );

  renderHomeSection(
    "homeAlternative",
    allProducts.filter(product=>product.type==="بديل")
  );
}

function showDynamicFilter(mode,type){
  state.type=type;
  state.gender="";
  state.flag="";
  state.brand="";
  state.note="";
  state.favoritesOnly=false;
  state.filterMode=mode;

  const base=allProducts.filter(
    product=>product.type===type
  );

  const options=
    mode==="البراندات"
      ? [...new Set(base.map(product=>product.brand).filter(Boolean))]
          .sort((a,b)=>a.localeCompare(b,"ar"))
      : [...new Set(base.flatMap(product=>product.notes).filter(Boolean))]
          .sort((a,b)=>a.localeCompare(b,"ar"));

  filterEyebrow.textContent=type;
  filterTitle.textContent=mode;

  filterOptions.innerHTML=
    options.length
      ? options.map(
          option=>`<button data-filter-value="${option}">${option}</button>`
        ).join("")
      : `<span>لا توجد بيانات ${mode} بعد.</span>`;

  filterPanel.hidden=false;
  homeSections.hidden=true;
  filterPanel.scrollIntoView({
    behavior:"smooth",
    block:"start"
  });

  applyFilters();
}

function updateModalFavorite(){
  const button=$("#modalFavorite");
  const active=favorites.has(currentModalProduct.id);

  button.classList.toggle("active",active);
  button.textContent=
    active?"إزالة من المفضلة":"أضف إلى المفضلة";
}

function openModal(product){
  currentModalProduct=product;

  const placeholder=
    "https://placehold.co/600x600/F7FBF9/1A312C?text=Moha+Atlas";

  $("#modalImage").src=product.image||placeholder;
  $("#modalBrand").textContent=product.brand;
  $("#modalName").textContent=product.name;

  $("#modalMeta").innerHTML=`
    ${product.type?`<span>${product.type}</span>`:""}
    ${product.gender?`<span>${product.gender}</span>`:""}
    ${product.concentration?`<span>${product.concentration}</span>`:""}
    ${product.size?`<span>${product.size} ml</span>`:""}
    ${product.notes.map(note=>`<span>${note}</span>`).join("")}
  `;

  $("#modalPrice").textContent=
    formatNumber(product.price);

  $("#modalWhatsapp").href=
    whatsappLink(product);

  updateModalFavorite();

  $("#productModal").classList.add("open");
  document.body.style.overflow="hidden";
}

function closeModal(){
  $("#productModal").classList.remove("open");
  document.body.style.overflow="";
  currentModalProduct=null;
}

function showView({
  type="الكل",
  gender="",
  flag="",
  favoritesOnly=false
}={}){
  resetState();

  Object.assign(state,{
    type,
    gender,
    flag,
    favoritesOnly
  });

  homeSections.hidden=
    !(type==="الكل" && !gender && !flag && !favoritesOnly);

  applyFilters();

  $("#catalog").scrollIntoView({
    behavior:"smooth"
  });
}

function closeDrawer(){
  $("#mobileDrawer").classList.remove("open");
  $("#drawerOverlay").classList.remove("open");
}

document.addEventListener("click",event=>{
  const main=event.target.closest("[data-main]");
  const gender=event.target.closest("[data-gender]");
  const flag=event.target.closest("[data-flag]");
  const submenu=event.target.closest("[data-type][data-sub]");

  if(main){
    showView();
    closeDrawer();
  }

  if(gender){
    showView({gender:gender.dataset.gender});
    closeDrawer();
  }

  if(flag){
    showView({flag:flag.dataset.flag});
    closeDrawer();
  }

  if(submenu){
    const type=submenu.dataset.type;
    const sub=submenu.dataset.sub;

    if(sub==="الكل"){
      showView({type});
    }else{
      showDynamicFilter(sub,type);
    }

    closeDrawer();
  }

  const favoriteButton=
    event.target.closest("[data-favorite]");

  if(favoriteButton){
    event.stopPropagation();
    toggleFavorite(favoriteButton.dataset.favorite);
    return;
  }

  const openTarget=
    event.target.closest("[data-open]");

  if(openTarget){
    const product=allProducts.find(
      item=>item.id===openTarget.dataset.open
    );

    if(product){
      openModal(product);
    }
  }

  if(event.target.closest("[data-close-modal]")){
    closeModal();
  }
});

filterOptions.addEventListener("click",event=>{
  const button=
    event.target.closest("[data-filter-value]");

  if(!button) return;

  $$("#filterOptions button").forEach(item=>
    item.classList.toggle(
      "active",
      item===button
    )
  );

  if(state.filterMode==="البراندات"){
    state.brand=button.dataset.filterValue;
    state.note="";
  }else{
    state.note=button.dataset.filterValue;
    state.brand="";
  }

  applyFilters();
});

$("#closeFilter").onclick=()=>{
  filterPanel.hidden=true;
  state.brand="";
  state.note="";
  state.filterMode="";
  applyFilters();
};

$("#favoritesBtn").onclick=()=>{
  showView({favoritesOnly:true});
};

$("#modalFavorite").onclick=()=>{
  if(currentModalProduct){
    toggleFavorite(currentModalProduct.id);
  }
};

$$("[data-show-all]").forEach(button=>{
  button.onclick=()=>{
    const value=button.dataset.showAll;

    if(value==="new" || value==="offer"){
      showView({flag:value});
    }else{
      showView({type:value});
    }
  };
});

$("#menuBtn").onclick=()=>{
  $("#mobileDrawer").classList.add("open");
  $("#drawerOverlay").classList.add("open");
};

$("#closeDrawer").onclick=closeDrawer;
$("#drawerOverlay").onclick=closeDrawer;

searchInput.addEventListener("input",applyFilters);
sortSelect.addEventListener("change",applyFilters);

loadMoreBtn.addEventListener(
  "click",
  ()=>renderProducts(false)
);

$("#clearSearch").onclick=()=>{
  searchInput.value="";
  applyFilters();
};

$("[data-home]").onclick=event=>{
  event.preventDefault();
  showView();
  window.scrollTo({
    top:0,
    behavior:"smooth"
  });
};

async function loadCatalog(){
  try{
    const response=await fetch(
      `${CONFIG.catalogUrl}?t=${Date.now()}`,
      {cache:"no-store"}
    );

    if(!response.ok){
      throw new Error(`HTTP ${response.status}`);
    }

    const payload=await response.json();
    allProducts=mapProducts(payload);

    if(!allProducts.length){
      throw new Error("لا توجد منتجات");
    }

    $("#favoritesCount").textContent=favorites.size;
    renderHome();
    showView();

  }catch(error){
    console.error(error);
    statusMessage.hidden=false;
    statusMessage.textContent=
      "تعذر تحميل المنتجات.";
  }
}

loadCatalog();