const CONFIG={
  catalogUrl:"./catalog.json",
  whatsappNumber:"97470740597",
  pageSize:24,
  homeSize:8
};

let products=[];
let filtered=[];
let displayed=0;
let modalProduct=null;

const state={
  category:"",
  gender:"",
  flag:"",
  brand:"",
  note:"",
  concentration:"",
  size:"",
  minPrice:"",
  maxPrice:"",
  favoritesOnly:false,
  browserMode:"",
  browserBase:""
};

const favorites=new Set(
  JSON.parse(localStorage.getItem("mohaAtlasFavorites")||"[]")
);

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

$("#headerWhatsapp").href=`https://wa.me/${CONFIG.whatsappNumber}`;
$("#footerWhatsapp").href=`https://wa.me/${CONFIG.whatsappNumber}`;

const numberFormat=value=>Number(value).toLocaleString("en-US",{maximumFractionDigits:2});
const bool=value=>value===true||["نعم","yes","true","1"].includes(String(value||"").trim().toLowerCase());
const list=value=>Array.isArray(value)?value.map(String).map(v=>v.trim()).filter(Boolean):String(value||"").split(/[,،|]/).map(v=>v.trim()).filter(Boolean);

function normalize(data){
  const rows=Array.isArray(data)?data:data.products;
  if(!Array.isArray(rows))return[];
  return rows.map(row=>({
    id:String(row.id||""),
    name:String(row.name||""),
    brand:String(row.brand||""),
    size:row.size_ml??"",
    concentration:String(row.concentration||""),
    price:Number(row.price_qar)||0,
    oldPrice:Number(row.old_price_qar)||0,
    discountPercent:Number(row.discount_percent)||0,
    profit:Number(row.profit_qar)||0,
    available:row.available!==false,
    image:String(row.image_url||""),
    category:String(row.category||"غير مصنف").trim(),
    gender:String(row.gender||"").trim(),
    notes:list(row.notes),
    isNew:bool(row.is_new),
    isOffer:bool(row.is_offer)
  })).filter(p=>p.id&&p.name&&p.price>0&&p.available);
}

function saveFavorites(){
  localStorage.setItem("mohaAtlasFavorites",JSON.stringify([...favorites]));
  $("#favoritesCount").textContent=favorites.size;
}

function toggleFavorite(id){
  favorites.has(id)?favorites.delete(id):favorites.add(id);
  saveFavorites();
  $$(`[data-favorite="${id}"]`).forEach(btn=>btn.classList.toggle("active",favorites.has(id)));
  if(modalProduct&&modalProduct.id===id)updateModalFavorite();
  if(state.favoritesOnly)applyFilters();
}

function whatsappLink(p){
  const message=`السلام عليكم، أريد طلب العطر التالي من Moha Atlas:
المنتج: ${p.brand} ${p.name}
التركيز: ${p.concentration||"-"}
الحجم: ${p.size?`${p.size} ml`:"-"}
السعر: ${numberFormat(p.price)} ر.ق${p.oldPrice&&p.oldPrice>p.price?`\nالسعر السابق: ${numberFormat(p.oldPrice)} ر.ق`:""}
رقم المنتج: ${p.id}`;
  return`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function card(p){
  const placeholder="https://placehold.co/600x600/F4F7F5/18342E?text=Moha+Atlas";
  return`<article class="product-card">
    <button class="favorite-card ${favorites.has(p.id)?"active":""}" data-favorite="${p.id}">♥</button>
    <div class="product-image" data-product="${p.id}">
      <img src="${p.image||placeholder}" alt="${p.brand} ${p.name}" loading="lazy" onerror="this.src='${placeholder}'">
    </div>
    <div class="product-body">
      <p class="product-brand">${p.brand||"Moha Atlas"}</p>
      <h3 class="product-name" data-product="${p.id}">${p.name}</h3>
      <div class="product-meta">
        ${p.concentration&&p.concentration!=="UNKNOWN"?`<span>${p.concentration}</span>`:""}
        ${p.size?`<span>${p.size} ml</span>`:""}
      </div>
      <div class="price-block">
      ${p.oldPrice && p.oldPrice > p.price ? `<span class="old-price">${numberFormat(p.oldPrice)} ر.ق</span>` : ""}
      <span class="product-price">${numberFormat(p.price)} ر.ق</span>
      ${p.discountPercent > 0 ? `<span class="discount-badge">-${p.discountPercent}%</span>` : ""}
    </div>
      <a class="card-buy" href="${whatsappLink(p)}" target="_blank">اطلب عبر واتساب</a>
    </div>
  </article>`;
}

function showHome(){
  $("#homeView").hidden=false;
  $("#catalogView").hidden=true;
  window.scrollTo({top:0,behavior:"smooth"});
}

function showCatalog(title="كل العطور"){
  $("#homeView").hidden=true;
  $("#catalogView").hidden=false;
  $("#catalogTitle").textContent=title;
  $("#breadcrumb").textContent=`الرئيسية / ${title}`;
  applyFilters();
  window.scrollTo({top:0,behavior:"smooth"});
}

function clearState(){
  Object.assign(state,{
    category:"",gender:"",flag:"",brand:"",note:"",
    concentration:"",size:"",minPrice:"",maxPrice:"",
    favoritesOnly:false,browserMode:"",browserBase:""
  });
  $("#minPrice").value="";
  $("#maxPrice").value="";
  $("#browserPanel").hidden=true;
  $$('input[type="checkbox"]').forEach(x=>x.checked=false);
}

function currentTitle(){
  if(state.favoritesOnly)return"المفضلة";
  if(state.brand)return state.brand;
  if(state.note)return state.note;
  if(state.gender)return state.gender;
  if(state.category)return state.category;
  if(state.flag==="new")return"جديد";
  if(state.flag==="offer")return"العروض";
  return"كل العطور";
}

function applyFilters(){
  const query=$("#searchInput").value.trim().toLowerCase();
  const min=Number(state.minPrice)||0;
  const max=Number(state.maxPrice)||Infinity;

  filtered=products.filter(p=>{
    const searchMatch=`${p.brand} ${p.name} ${p.concentration} ${p.size} ${p.notes.join(" ")}`.toLowerCase().includes(query);
    return searchMatch &&
      (!state.category||p.category===state.category) &&
      (!state.gender||p.gender===state.gender) &&
      (!state.flag||(state.flag==="new"&&p.isNew)||(state.flag==="offer"&&p.isOffer)) &&
      (!state.brand||p.brand===state.brand) &&
      (!state.note||p.notes.includes(state.note)) &&
      (!state.concentration||p.concentration===state.concentration) &&
      (!state.size||String(p.size)===String(state.size)) &&
      (!state.favoritesOnly||favorites.has(p.id)) &&
      p.price>=min&&p.price<=max;
  });

  const sort=$("#sortSelect").value;
  if(sort==="price-asc")filtered.sort((a,b)=>a.price-b.price);
  if(sort==="price-desc")filtered.sort((a,b)=>b.price-a.price);
  if(sort==="name")filtered.sort((a,b)=>`${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`,"ar"));

  $("#catalogTitle").textContent=currentTitle();
  $("#productCount").textContent=numberFormat(filtered.length);
  $("#activeFilterText").textContent=currentTitle();
  renderProducts();
}

function renderProducts(reset=true){
  const grid=$("#productGrid");
  if(reset){displayed=0;grid.innerHTML=""}
  const chunk=filtered.slice(displayed,displayed+CONFIG.pageSize);
  grid.insertAdjacentHTML("beforeend",chunk.map(card).join(""));
  displayed+=chunk.length;
  grid.hidden=!filtered.length;
  $("#statusMessage").hidden=!!filtered.length;
  $("#loadMoreBtn").hidden=displayed>=filtered.length;
  if(!filtered.length)$("#statusMessage").textContent="لا توجد منتجات مطابقة.";
}

function homeProducts(id,items){
  document.getElementById(id).innerHTML=items.length?items.slice(0,CONFIG.homeSize).map(card).join(""):`<div class="status-message">لا توجد منتجات في هذا القسم حاليًا.</div>`;
}

function renderHome(){
  homeProducts("homeNew",products.filter(p=>p.isNew).length?products.filter(p=>p.isNew):products.slice(0,8));
  homeProducts("homeOffers",products.filter(p=>p.isOffer).length?products.filter(p=>p.isOffer):[...products].sort((a,b)=>a.price-b.price).slice(0,8));
  homeProducts("homeFeatured",products.slice(8,16));
}

function unique(field,baseCategory=""){
  let source=baseCategory?products.filter(p=>p.category===baseCategory):products;
  if(field==="notes")return[...new Set(source.flatMap(p=>p.notes).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ar"));
  return[...new Set(source.map(p=>p[field]).filter(v=>v&&v!=="غير مصنف"&&v!=="UNKNOWN"))].sort((a,b)=>String(a).localeCompare(String(b),"ar"));
}

function filterList(id,values,key){
  document.getElementById(id).innerHTML=values.slice(0,80).map(value=>`<label><input type="checkbox" data-filter-key="${key}" value="${value}"><span>${value}</span></label>`).join("");
}

function setupFilters(){
  filterList("brandFilters",unique("brand"),"brand");
  filterList("categoryFilters",unique("category"),"category");
  filterList("genderFilters",unique("gender"),"gender");
  filterList("concentrationFilters",unique("concentration"),"concentration");
  filterList("sizeFilters",unique("size").sort((a,b)=>Number(a)-Number(b)),"size");
}

function showBrowser(mode,base){
  state.browserMode=mode;state.browserBase=base;
  const values=unique(mode==="brands"?"brand":"notes",base);
  $("#browserEyebrow").textContent=base;
  $("#browserTitle").textContent=mode==="brands"?"البراندات":"النوتات";
  $("#browserOptions").innerHTML=values.length?values.map(v=>`<button data-browser-value="${v}">${v}</button>`).join(""):"لا توجد بيانات حتى الآن.";
  $("#browserPanel").hidden=false;
  showCatalog(base);
}

function openProduct(p){
  modalProduct=p;
  const placeholder="https://placehold.co/600x600/F4F7F5/18342E?text=Moha+Atlas";
  $("#modalImage").src=p.image||placeholder;
  $("#modalBrand").textContent=p.brand;
  $("#modalName").textContent=p.name;
  $("#modalPrice").textContent=numberFormat(p.price);
  let oldPriceNode=document.getElementById("modalOldPrice");
  if(!oldPriceNode){
    oldPriceNode=document.createElement("div");
    oldPriceNode.id="modalOldPrice";
    oldPriceNode.className="detail-old-price";
    document.querySelector(".detail-price").before(oldPriceNode);
  }
  oldPriceNode.textContent=(p.oldPrice&&p.oldPrice>p.price)?`${numberFormat(p.oldPrice)} ر.ق`:"";
  oldPriceNode.hidden=!(p.oldPrice&&p.oldPrice>p.price);
  $("#modalMeta").innerHTML=`
    ${p.category&&p.category!=="غير مصنف"?`<span>${p.category}</span>`:""}
    ${p.gender?`<span>${p.gender}</span>`:""}
    ${p.concentration&&p.concentration!=="UNKNOWN"?`<span>${p.concentration}</span>`:""}
    ${p.size?`<span>${p.size} ml</span>`:""}
    ${p.notes.map(n=>`<span>${n}</span>`).join("")}`;
  $("#modalWhatsapp").href=whatsappLink(p);
  updateModalFavorite();
  $("#productModal").classList.add("open");
  document.body.style.overflow="hidden";
}

function updateModalFavorite(){
  const active=favorites.has(modalProduct.id);
  $("#modalFavorite").classList.toggle("active",active);
  $("#modalFavorite").textContent=active?"♥ إزالة من المفضلة":"♡ أضف إلى المفضلة";
}

function closeModal(){
  $("#productModal").classList.remove("open");
  document.body.style.overflow="";
  modalProduct=null;
}

function closeDrawer(){
  $("#mobileDrawer").classList.remove("open");
  $("#drawerOverlay").classList.remove("open");
}

document.addEventListener("click",event=>{
  const view=event.target.closest("[data-view]");
  if(view){
    if(view.dataset.view==="home"){clearState();showHome()}
    else{clearState();showCatalog()}
    closeDrawer();
  }

  const category=event.target.closest("[data-category]");
  if(category){
    clearState();state.category=category.dataset.category;showCatalog(state.category);closeDrawer();
  }

  const gender=event.target.closest("[data-gender]");
  if(gender){
    clearState();state.gender=gender.dataset.gender;showCatalog(state.gender);closeDrawer();
  }

  const flag=event.target.closest("[data-flag]");
  if(flag){
    clearState();state.flag=flag.dataset.flag;showCatalog(state.flag==="new"?"جديد":"العروض");closeDrawer();
  }

  const browser=event.target.closest("[data-browser]");
  if(browser){clearState();showBrowser(browser.dataset.browser,browser.dataset.categoryBase);closeDrawer()}

  const browserValue=event.target.closest("[data-browser-value]");
  if(browserValue){
    if(state.browserMode==="brands")state.brand=browserValue.dataset.browserValue;
    else state.note=browserValue.dataset.browserValue;
    $$("#browserOptions button").forEach(b=>b.classList.toggle("active",b===browserValue));
    applyFilters();
  }

  const favorite=event.target.closest("[data-favorite]");
  if(favorite){event.stopPropagation();toggleFavorite(favorite.dataset.favorite);return}

  const productTarget=event.target.closest("[data-product]");
  if(productTarget){
    const p=products.find(x=>x.id===productTarget.dataset.product);
    if(p)openProduct(p);
  }

  if(event.target.closest("[data-close-modal]"))closeModal();
});

document.addEventListener("change",event=>{
  const filter=event.target.closest("[data-filter-key]");
  if(filter){
    const key=filter.dataset.filterKey;
    if(filter.checked){
      $$(`[data-filter-key="${key}"]`).forEach(x=>{if(x!==filter)x.checked=false});
      state[key]=filter.value;
    }else state[key]="";
    applyFilters();
  }
});

$("#searchInput").addEventListener("input",()=>{
  if($("#homeView").hidden===false)showCatalog("نتائج البحث");
  applyFilters();
});
$("#clearSearch").onclick=()=>{$("#searchInput").value="";applyFilters()};
$("#sortSelect").addEventListener("change",applyFilters);
$("#loadMoreBtn").onclick=()=>renderProducts(false);
$("#minPrice").addEventListener("input",e=>{state.minPrice=e.target.value;applyFilters()});
$("#maxPrice").addEventListener("input",e=>{state.maxPrice=e.target.value;applyFilters()});
$("#resetFilters").onclick=()=>{const keep={category:state.category,gender:state.gender,flag:state.flag};clearState();Object.assign(state,keep);applyFilters()};
$("#closeBrowser").onclick=()=>{$("#browserPanel").hidden=true;state.brand="";state.note="";applyFilters()};
$("#favoritesBtn").onclick=()=>{clearState();state.favoritesOnly=true;showCatalog("المفضلة")};
$("#modalFavorite").onclick=()=>modalProduct&&toggleFavorite(modalProduct.id);
$("#menuBtn").onclick=()=>{$("#mobileDrawer").classList.add("open");$("#drawerOverlay").classList.add("open")};
$("#closeDrawer").onclick=closeDrawer;
$("#drawerOverlay").onclick=closeDrawer;
$("#mobileFilterBtn").onclick=()=>$("#filtersSidebar").classList.toggle("open");

async function init(){
  try{
    const response=await fetch(`${CONFIG.catalogUrl}?t=${Date.now()}`,{cache:"no-store"});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    products=normalize(await response.json());
    if(!products.length)throw new Error("No products");
    saveFavorites();
    renderHome();
    setupFilters();
    clearState();
    showHome();
  }catch(error){
    console.error(error);
    $("#homeFeatured").innerHTML='<div class="status-message">تعذر تحميل المنتجات.</div>';
  }
}
init();