import { products, categories } from './products.js';
import { cart } from './cart.js';
import { consultCep } from './shipping.js';

// Format BRL Currency
export function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// DOM Elements
const categoriesContainer = document.getElementById('categoriesContainer');
const productsGrid = document.getElementById('productsGrid');
const searchInput = document.getElementById('searchInput');
const mobileSearchInput = document.getElementById('mobileSearchInput');

// Cart Drawer Elements
const cartDrawerOverlay = document.getElementById('cartDrawerOverlay');
const cartDrawerItems = document.getElementById('cartDrawerItems');
const drawerItemsCount = document.getElementById('drawerItemsCount');
const drawerFreteVal = document.getElementById('drawerFreteVal');
const drawerTotalVal = document.getElementById('drawerTotalVal');
const drawerCepInput = document.getElementById('drawerCepInput');
const btnDrawerCalcCep = document.getElementById('btnDrawerCalcCep');
const drawerCepMsg = document.getElementById('drawerCepMsg');
const btnCloseDrawer = document.getElementById('btnCloseDrawer');
const btnHeaderCart = document.getElementById('btnHeaderCart');
const headerCartCount = document.getElementById('headerCartCount');
const mobileBottomBar = document.getElementById('mobileBottomBar');
const mobileCartCount = document.getElementById('mobileCartCount');
const mobileCartTotal = document.getElementById('mobileCartTotal');
const btnMobileCheckout = document.getElementById('btnMobileCheckout');
const btnDrawerCheckout = document.getElementById('btnDrawerCheckout');
const btnDrawerContinue = document.getElementById('btnDrawerContinue');

// State
let selectedCategory = "Todos os Produtos";
let searchTerm = "";

// Banner Carousel Logic
function initBannerCarousel() {
  const track = document.getElementById('bannerTrack');
  const slides = document.querySelectorAll('.banner-slide');
  const dotsContainer = document.getElementById('carouselDots');
  const prevBtn = document.getElementById('carouselPrev');
  const nextBtn = document.getElementById('carouselNext');

  if (!track || slides.length === 0) return;

  let currentSlide = 0;
  const totalSlides = slides.length;
  let autoplayTimer = null;

  // Render dots
  dotsContainer.innerHTML = '';
  slides.forEach((_, idx) => {
    const dot = document.createElement('button');
    dot.className = `carousel-dot ${idx === 0 ? 'active' : ''}`;
    dot.setAttribute('aria-label', `Slide ${idx + 1}`);
    dot.addEventListener('click', () => goToSlide(idx));
    dotsContainer.appendChild(dot);
  });

  function updateSlide() {
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    const dots = dotsContainer.querySelectorAll('.carousel-dot');
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentSlide);
    });
  }

  function nextSlide() {
    currentSlide = (currentSlide + 1) % totalSlides;
    updateSlide();
  }

  function prevSlide() {
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    updateSlide();
  }

  function goToSlide(idx) {
    currentSlide = idx;
    updateSlide();
    resetAutoplay();
  }

  function startAutoplay() {
    autoplayTimer = setInterval(nextSlide, 4500);
  }

  function resetAutoplay() {
    clearInterval(autoplayTimer);
    startAutoplay();
  }

  if (nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); resetAutoplay(); });
  if (prevBtn) prevBtn.addEventListener('click', () => { prevSlide(); resetAutoplay(); });

  // Pause on hover
  track.addEventListener('mouseenter', () => clearInterval(autoplayTimer));
  track.addEventListener('mouseleave', () => startAutoplay());

  // Touch Swipe for Mobile
  let touchStartX = 0;
  let touchEndX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
  track.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    if (touchStartX - touchEndX > 50) nextSlide();
    if (touchEndX - touchStartX > 50) prevSlide();
    resetAutoplay();
  }, { passive: true });

  startAutoplay();
}

// Render Categories
function renderCategories() {
  if (!categoriesContainer) return;
  categoriesContainer.innerHTML = '';

  categories.forEach(cat => {
    const chip = document.createElement('button');
    chip.className = `category-chip ${selectedCategory === cat ? 'active' : ''}`;
    chip.textContent = cat;
    chip.addEventListener('click', () => {
      selectedCategory = cat;
      renderCategories();
      renderProducts();
    });
    categoriesContainer.appendChild(chip);
  });
}

// Render Products Grid
function renderProducts() {
  if (!productsGrid) return;

  const filtered = products.filter(p => {
    const matchCategory = (selectedCategory === "Todos os Produtos") ||
      (selectedCategory === "Ofertas da Semana" && p.discountPercent >= 14) ||
      (p.category === selectedCategory);
    
    const matchSearch = searchTerm === "" || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());

    return matchCategory && matchSearch;
  });

  if (filtered.length === 0) {
    productsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <p style="font-size: 32px; margin-bottom: 8px;">🔍</p>
        <h3 style="font-weight: 700; color: var(--text-main);">Nenhum produto encontrado</h3>
        <p style="font-size: 13px;">Tente buscar por outro termo ou categoria.</p>
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = '';
  filtered.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';

    const salePrice = product.clubPrice || product.price || product.oldPrice || 0;
    const hasDiscount = product.oldPrice && product.oldPrice > salePrice;
    const discountPercent = hasDiscount
      ? Math.round(((product.oldPrice - salePrice) / product.oldPrice) * 100)
      : 0;

    const badgeHtml = product.badge ? `
      <span class="product-top-badge ${product.badgeType || ''}">${product.badge}</span>
    ` : '';

    card.innerHTML = `
      ${badgeHtml}
      <div class="product-image-wrap">
        <img src="${product.image}" alt="${product.name}" loading="lazy" />
      </div>
      <div class="product-info">
        <div class="product-rating">
          <span class="star-icon">★★★★★</span>
          <span class="rating-count">(${product.reviewsCount})</span>
        </div>
        <h3 class="product-title">${product.name}</h3>
        
        <div class="product-price-row" style="margin: 4px 0 2px; min-height: 18px; display: flex; align-items: center; gap: 6px;">
          ${hasDiscount ? `<span class="old-price">${formatCurrency(product.oldPrice)}</span>` : ''}
          ${discountPercent > 0 ? `<span class="discount-tag">↓ ${discountPercent}%</span>` : ''}
        </div>

        <div style="margin-bottom: 12px; display: flex; align-items: baseline; gap: 6px;">
          <span style="font-size: 20px; font-weight: 900; color: var(--primary-imperial);">${formatCurrency(salePrice)}</span>
          <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">/ ${product.unit || 'un'}</span>
        </div>

        <div class="product-actions">
          <div class="quantity-selector">
            <button class="qty-btn btn-minus" data-id="${product.id}">-</button>
            <input type="text" class="qty-input" value="1" readonly id="qty-${product.id}">
            <button class="qty-btn btn-plus" data-id="${product.id}">+</button>
          </div>
          <button class="btn-add-cart" data-id="${product.id}">
            <span>Adicionar</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
          </button>
        </div>
      </div>
    `;


    // Quantity events
    const qtyInput = card.querySelector(`#qty-${product.id}`);
    const btnMinus = card.querySelector('.btn-minus');
    const btnPlus = card.querySelector('.btn-plus');
    const btnAdd = card.querySelector('.btn-add-cart');

    btnMinus.addEventListener('click', () => {
      let val = parseInt(qtyInput.value) || 1;
      if (val > 1) qtyInput.value = val - 1;
    });

    btnPlus.addEventListener('click', () => {
      let val = parseInt(qtyInput.value) || 1;
      qtyInput.value = val + 1;
    });

    btnAdd.addEventListener('click', () => {
      const qty = parseInt(qtyInput.value) || 1;
      cart.addItem(product.id, qty);
      
      // Temporary animation
      btnAdd.classList.add('added');
      btnAdd.innerHTML = '<span>Adicionado ✓</span>';
      setTimeout(() => {
        btnAdd.classList.remove('added');
        btnAdd.innerHTML = `
          <span>Adicionar</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
        `;
      }, 1000);

      openCartDrawer();
    });

    productsGrid.appendChild(card);
  });
}

// Cart Drawer Functions
export function openCartDrawer() {
  if (cartDrawerOverlay) cartDrawerOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function closeCartDrawer() {
  if (cartDrawerOverlay) cartDrawerOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

// Update Cart UI from State
function updateCartUI(state) {
  // Update badges
  if (headerCartCount) headerCartCount.textContent = state.totalItemsCount;
  if (drawerItemsCount) drawerItemsCount.textContent = `(${state.totalItemsCount} ${state.totalItemsCount === 1 ? 'item' : 'itens'})`;

  // Update mobile bottom bar
  if (mobileCartCount) mobileCartCount.textContent = `${state.totalItemsCount} ${state.totalItemsCount === 1 ? 'item' : 'itens'}`;
  if (mobileCartTotal) mobileCartTotal.textContent = formatCurrency(state.total);

  // Update Drawer CEP Info if already calculated
  if (drawerCepInput && state.shipping && state.shipping.cep && !drawerCepInput.value) {
    drawerCepInput.value = state.shipping.cep;
  }

  if (drawerCepMsg && state.shipping) {
    if (state.isFreeShipping) {
      drawerCepMsg.className = 'drawer-cep-msg success';
      drawerCepMsg.textContent = `✓ Frete Grátis aplicado (${state.shipping.city || 'Recife'} - ${state.shipping.uf || 'PE'})!`;
    } else {
      drawerCepMsg.className = 'drawer-cep-msg success';
      drawerCepMsg.textContent = `✓ ${state.shipping.courier || 'Entrega'} • ${state.shipping.deadline || 'Em breve'}`;
    }
  }

  // Update Drawer Totals
  if (drawerFreteVal) {
    if (state.deliveryType === 'pickup') {
      drawerFreteVal.textContent = 'Retirar no Depósito (Grátis)';
    } else if (state.isFreeShipping) {
      drawerFreteVal.textContent = 'Grátis (Acima R$150)';
    } else if (state.shipping && state.shippingCost > 0) {
      drawerFreteVal.textContent = formatCurrency(state.shippingCost);
    } else {
      drawerFreteVal.textContent = 'Digite seu CEP';
    }
  }

  if (drawerTotalVal) drawerTotalVal.textContent = formatCurrency(state.total);

  // Render Drawer Items (Print 2 style)
  if (!cartDrawerItems) return;

  if (state.items.length === 0) {
    cartDrawerItems.innerHTML = `
      <div style="text-align: center; padding: 40px 10px; color: var(--text-muted);">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 12px; color: var(--primary-caramel); opacity: 0.7;">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
        <h4 style="color: var(--text-title); font-weight: 800;">Seu carrinho está vazio</h4>
        <p style="font-size: 13px; margin-top: 4px;">Escolha os melhores insumos e embalagens para sua produção!</p>
      </div>
    `;
    if (btnDrawerCheckout) btnDrawerCheckout.disabled = true;
    return;
  }

  if (btnDrawerCheckout) btnDrawerCheckout.disabled = false;
  cartDrawerItems.innerHTML = '';

  state.items.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item-card';

    itemEl.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="cart-item-img" />
      <div class="cart-item-details">
        <span class="cart-item-category">${item.category}</span>
        <h4 class="cart-item-title">${item.name}</h4>
        
        <div class="cart-item-price-pill" style="background: none; padding: 0; color: var(--primary-imperial); font-size: 14px; font-weight: 800;">
          <span>${formatCurrency(item.price)}</span>
        </div>

        <div class="cart-item-bottom">
          <div class="quantity-selector" style="height: 28px;">
            <button class="qty-btn drawer-qty-minus" data-id="${item.id}" style="width: 28px; font-size: 13px;">-</button>
            <input type="text" class="qty-input" value="${item.qty}" readonly style="width: 30px; font-size: 12px;">
            <button class="qty-btn drawer-qty-plus" data-id="${item.id}" style="width: 28px; font-size: 13px;">+</button>
          </div>
          <button class="btn-cart-remove" data-id="${item.id}">Excluir</button>
        </div>
      </div>
    `;

    itemEl.querySelector('.drawer-qty-minus').addEventListener('click', () => {
      cart.updateQty(item.id, item.qty - 1);
    });

    itemEl.querySelector('.drawer-qty-plus').addEventListener('click', () => {
      cart.updateQty(item.id, item.qty + 1);
    });

    itemEl.querySelector('.btn-cart-remove').addEventListener('click', () => {
      cart.removeItem(item.id);
    });

    cartDrawerItems.appendChild(itemEl);
  });
}

// Setup Event Listeners
function setupEvents() {
  if (btnHeaderCart) btnHeaderCart.addEventListener('click', openCartDrawer);
  if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeCartDrawer);
  if (btnDrawerContinue) btnDrawerContinue.addEventListener('click', closeCartDrawer);
  if (cartDrawerOverlay) {
    cartDrawerOverlay.addEventListener('click', (e) => {
      if (e.target === cartDrawerOverlay) closeCartDrawer();
    });
  }

  // Drawer CEP Calculator logic
  if (drawerCepInput) {
    drawerCepInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '');
      if (v.length > 5) {
        v = v.replace(/^(\d{5})(\d)/, '$1-$2');
      }
      e.target.value = v.substring(0, 9);
    });

    const handleDrawerCalcCep = async () => {
      const rawCep = drawerCepInput.value.replace(/\D/g, '');
      if (rawCep.length !== 8) {
        if (drawerCepMsg) {
          drawerCepMsg.className = 'drawer-cep-msg error';
          drawerCepMsg.textContent = 'Digite um CEP válido com 8 números.';
        }
        return;
      }

      if (btnDrawerCalcCep) {
        btnDrawerCalcCep.disabled = true;
        btnDrawerCalcCep.textContent = '...';
      }
      if (drawerCepMsg) {
        drawerCepMsg.className = 'drawer-cep-msg';
        drawerCepMsg.textContent = 'Calculando frete...';
      }

      try {
        const data = await consultCep(rawCep);
        cart.setShipping(data);
        if (drawerCepMsg) {
          drawerCepMsg.className = 'drawer-cep-msg success';
          drawerCepMsg.textContent = `✓ ${data.city} - ${data.uf} • ${data.courier}`;
        }
      } catch (err) {
        if (drawerCepMsg) {
          drawerCepMsg.className = 'drawer-cep-msg error';
          drawerCepMsg.textContent = err.message || 'Erro ao calcular CEP.';
        }
        cart.setShipping(null);
      } finally {
        if (btnDrawerCalcCep) {
          btnDrawerCalcCep.disabled = false;
          btnDrawerCalcCep.textContent = 'Calcular';
        }
      }
    };

    if (btnDrawerCalcCep) {
      btnDrawerCalcCep.addEventListener('click', handleDrawerCalcCep);
    }

    drawerCepInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleDrawerCalcCep();
      }
    });
  }

  // Navigate to Checkout
  const goToCheckout = () => {
    window.location.href = 'checkout.html';
  };

  if (btnDrawerCheckout) btnDrawerCheckout.addEventListener('click', goToCheckout);
  if (btnMobileCheckout) btnMobileCheckout.addEventListener('click', goToCheckout);

  // Category scroll buttons for desktop
  const btnCatScrollLeft = document.getElementById('btnCatScrollLeft');
  const btnCatScrollRight = document.getElementById('btnCatScrollRight');
  if (btnCatScrollLeft && categoriesContainer) {
    btnCatScrollLeft.addEventListener('click', () => {
      categoriesContainer.scrollBy({ left: -220, behavior: 'smooth' });
    });
  }
  if (btnCatScrollRight && categoriesContainer) {
    btnCatScrollRight.addEventListener('click', () => {
      categoriesContainer.scrollBy({ left: 220, behavior: 'smooth' });
    });
  }

  // Search input events
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value.trim();
      renderProducts();
    });
  }
  if (mobileSearchInput) {
    mobileSearchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value.trim();
      renderProducts();
    });
  }
}

// Init App
document.addEventListener('DOMContentLoaded', () => {
  initBannerCarousel();
  renderCategories();
  renderProducts();
  setupEvents();
  cart.subscribe(updateCartUI);
});
