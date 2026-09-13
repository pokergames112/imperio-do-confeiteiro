import { cart } from './cart.js';
import { consultCep, shippingRules } from './shipping.js';
import { generatePixPayload } from './pix.js';
import { formatCurrency } from './app.js';
import { saveOrderToSupabase } from './supabase.js';

// Elements
const checkoutItemsList = document.getElementById('checkoutItemsList');
const checkoutSubtotal = document.getElementById('checkoutSubtotal');
const checkoutShipping = document.getElementById('checkoutShipping');
const checkoutTotal = document.getElementById('checkoutTotal');
const checkoutClubTotal = document.getElementById('checkoutClubTotal');

// Delivery Elements
const tabReceive = document.getElementById('tabReceive');
const tabPickup = document.getElementById('tabPickup');
const deliverySectionReceive = document.getElementById('deliverySectionReceive');
const deliverySectionPickup = document.getElementById('deliverySectionPickup');
const cepInput = document.getElementById('cepInput');
const btnSearchCep = document.getElementById('btnSearchCep');
const shippingOptionsContainer = document.getElementById('shippingOptionsContainer');
const addressFieldsBox = document.getElementById('addressFieldsBox');

// Address inputs
const inputStreet = document.getElementById('inputStreet');
const inputNeighborhood = document.getElementById('inputNeighborhood');
const inputCity = document.getElementById('inputCity');
const inputNumber = document.getElementById('inputNumber');
const inputComplement = document.getElementById('inputComplement');

// Personal Info inputs
const inputName = document.getElementById('inputName');
const inputEmail = document.getElementById('inputEmail');
const inputPhone = document.getElementById('inputPhone');
const inputCpf = document.getElementById('inputCpf');

// Payment Elements
const paymentCards = document.querySelectorAll('.payment-method-card');
const pixSimulationBox = document.getElementById('pixSimulationBox');
const pixQrImg = document.getElementById('pixQrImg');
const pixKeyInput = document.getElementById('pixKeyInput');
const btnCopyPix = document.getElementById('btnCopyPix');

// Finalize Button
const btnFinalizeOrder = document.getElementById('btnFinalizeOrder');

// State
let selectedPayment = 'pix';
let currentShippingInfo = null;

function initCheckout() {
  const state = cart.getState();
  if (state.items.length === 0) {
    alert('Seu carrinho está vazio! Redirecionando para o catálogo...');
    window.location.href = 'index.html';
    return;
  }

  renderSummary(state);
  setupDeliveryTabs();
  setupShippingEvents();
  setupPaymentEvents();
  setupFinalizeOrder();
  updatePixBox(state.totalClub);
}

function renderSummary(state) {
  if (!checkoutItemsList) return;
  checkoutItemsList.innerHTML = '';

  state.items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'summary-item-row';
    row.innerHTML = `
      <span class="summary-item-title">${item.qty}x ${item.name}</span>
      <strong>${formatCurrency(item.clubPrice * item.qty)}</strong>
    `;
    checkoutItemsList.appendChild(row);
  });

  if (checkoutSubtotal) checkoutSubtotal.textContent = formatCurrency(state.subtotalClub);
  
  if (checkoutShipping) {
    if (state.deliveryType === 'pickup') {
      checkoutShipping.textContent = 'Retirar (Grátis)';
    } else if (state.shippingCost > 0) {
      checkoutShipping.textContent = formatCurrency(state.shippingCost);
    } else if (state.subtotalClub >= 150) {
      checkoutShipping.textContent = 'Grátis (Acima R$150)';
    } else {
      checkoutShipping.textContent = 'Digite seu CEP';
    }
  }

  if (checkoutTotal) checkoutTotal.textContent = formatCurrency(state.totalStandard);
  if (checkoutClubTotal) checkoutClubTotal.textContent = formatCurrency(state.totalClub);
}

function setupDeliveryTabs() {
  if (!tabReceive || !tabPickup) return;

  tabReceive.addEventListener('click', () => {
    tabReceive.classList.add('active');
    tabPickup.classList.remove('active');
    deliverySectionReceive.style.display = 'block';
    deliverySectionPickup.style.display = 'none';
    cart.setDeliveryType('receive');
  });

  tabPickup.addEventListener('click', () => {
    tabPickup.classList.add('active');
    tabReceive.classList.remove('active');
    deliverySectionReceive.style.display = 'none';
    deliverySectionPickup.style.display = 'block';
    cart.setDeliveryType('pickup');
  });
}

function setupShippingEvents() {
  if (!btnSearchCep || !cepInput) return;

  const handleCepSearch = async () => {
    const cep = cepInput.value.trim();
    if (!cep) return;

    btnSearchCep.textContent = 'Buscando...';
    btnSearchCep.disabled = true;

    try {
      const data = await consultCep(cep);
      currentShippingInfo = data;

      // Auto-fill address
      if (inputStreet) inputStreet.value = data.street || '';
      if (inputNeighborhood) inputNeighborhood.value = data.neighborhood || '';
      if (inputCity) inputCity.value = `${data.city} - ${data.uf}`;
      if (addressFieldsBox) addressFieldsBox.style.display = 'block';

      // Render shipping options
      renderShippingOptions(data);

      // Save in cart
      cart.setShipping(data);
    } catch (err) {
      alert(err.message);
    } finally {
      btnSearchCep.textContent = 'Calcular';
      btnSearchCep.disabled = false;
    }
  };

  btnSearchCep.addEventListener('click', handleCepSearch);
  cepInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleCepSearch();
  });
}

function renderShippingOptions(data) {
  if (!shippingOptionsContainer) return;
  const isFree = cart.getState().subtotalClub >= 150;
  const finalPrice = isFree ? 0 : data.shippingValue;

  shippingOptionsContainer.innerHTML = `
    <div class="shipping-results-list">
      <div class="shipping-option-card selected">
        <div class="shipping-option-left">
          <input type="radio" name="shippingOpt" checked />
          <div>
            <div class="shipping-courier-name">${data.courier}</div>
            <div class="shipping-deadline">Prazo: ${data.deadline}</div>
          </div>
        </div>
        <div class="shipping-price-val">${isFree ? 'GRÁTIS' : formatCurrency(finalPrice)}</div>
      </div>
    </div>
  `;
}

function setupPaymentEvents() {
  paymentCards.forEach(card => {
    card.addEventListener('click', () => {
      paymentCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedPayment = card.dataset.payment;

      if (selectedPayment === 'pix') {
        pixSimulationBox.style.display = 'block';
        updatePixBox(cart.getState().totalClub);
      } else {
        pixSimulationBox.style.display = 'none';
      }
    });
  });

  if (btnCopyPix && pixKeyInput) {
    btnCopyPix.addEventListener('click', () => {
      navigator.clipboard.writeText(pixKeyInput.value);
      btnCopyPix.textContent = 'Copiado! ✓';
      setTimeout(() => { btnCopyPix.textContent = 'Copiar'; }, 2000);
    });
  }
}

function updatePixBox(total) {
  if (!pixQrImg || !pixKeyInput) return;
  const pix = generatePixPayload({ amount: total });
  pixQrImg.src = pix.qrCodeUrl;
  pixKeyInput.value = pix.payload;
}

function setupFinalizeOrder() {
  if (!btnFinalizeOrder) return;

  btnFinalizeOrder.addEventListener('click', () => {
    const name = inputName ? inputName.value.trim() : '';
    const phone = inputPhone ? inputPhone.value.trim() : '';
    const email = inputEmail ? inputEmail.value.trim() : '';
    const state = cart.getState();

    if (!name) {
      alert('Por favor, informe seu nome.');
      if (inputName) inputName.focus();
      return;
    }

    if (!phone) {
      alert('Por favor, informe seu número de WhatsApp.');
      if (inputPhone) inputPhone.focus();
      return;
    }

    if (state.deliveryType === 'receive' && (!inputStreet?.value || !inputNumber?.value)) {
      alert('Por favor, calcule o frete pelo CEP e informe o número do endereço.');
      return;
    }

    // Prepare structured WhatsApp Message
    const itemsText = state.items.map(i => `• ${i.qty}x ${i.name} (${formatCurrency(i.clubPrice * i.qty)})`).join('\n');
    const deliveryMethodText = state.deliveryType === 'pickup' 
      ? 'Retirar no Depósito da Confeitaria (Grátis)' 
      : `${currentShippingInfo?.courier || 'Entrega'} - ${formatCurrency(state.shippingCost)}`;

    const addressText = state.deliveryType === 'pickup'
      ? 'Retirada no Balcão'
      : `${inputStreet?.value}, Nº ${inputNumber?.value} ${inputComplement?.value ? '(' + inputComplement.value + ')' : ''} - ${inputNeighborhood?.value}, ${inputCity?.value}`;

    const paymentLabel = selectedPayment === 'pix' ? 'Pix (Chave gerada no site)' : (selectedPayment === 'card_delivery' ? 'Cartão na Entrega (Maquininha)' : 'Cartão de Crédito');

    const eCake = '\u{1F370}';
    const eUser = '\u{1F464}';
    const ePhone = '\u{1F4F1}';
    const eMail = '\u{1F4E7}';
    const eBox = '\u{1F4E6}';
    const eCart = '\u{1F6D2}';
    const eTruck = '\u{1F69A}';
    const eMoney = '\u{1F4B0}';
    const eCard = '\u{1F4B3}';
    const ePin = '\u{1F4CD}';

    const whatsappMessage = 
`${eCake} *NOVO PEDIDO - IMPÉRIO DO CONFEITEIRO*
----------------------------------------
${eUser} *Cliente:* ${name}
${ePhone} *WhatsApp:* ${phone}
${eMail} *E-mail:* ${email || 'Não informado'}

${eBox} *ITENS DO PEDIDO:*
${itemsText}

----------------------------------------
${eCart} *Subtotal:* ${formatCurrency(state.subtotalClub)}
${eTruck} *Entrega:* ${deliveryMethodText}
${eMoney} *TOTAL DO PEDIDO:* ${formatCurrency(state.totalClub)}
${eCard} *Forma de Pagamento:* ${paymentLabel}
${ePin} *Endereço:* ${addressText}
----------------------------------------
_Pedido gerado via Catálogo Digital Império do Confeiteiro_`;

    // Generate unique order code
    const orderCode = `IC-${Math.floor(1000 + Math.random() * 9000)}`;

    const orderData = {
      id: Date.now(),
      code: orderCode,
      name,
      phone,
      email,
      cpf: inputCpf?.value || null,
      deliveryType: state.deliveryType === 'pickup' ? 'Retirada no Depósito' : 'Entrega',
      address: addressText,
      neighborhood: inputNeighborhood?.value || '',
      city: inputCity?.value || 'Recife - PE',
      cep: cepInput?.value || '',
      items: state.items,
      itemsText: itemsText,
      subtotal: state.subtotalClub,
      shippingCost: state.deliveryType === 'pickup' ? 0 : state.shippingCost,
      total: state.totalClub,
      paymentMethod: paymentLabel,
      createdAt: new Date().toISOString()
    };

    // Feedback visual no botão
    btnFinalizeOrder.disabled = true;
    btnFinalizeOrder.innerHTML = '<span>Salvando Pedido...</span>';

    // Salva no Supabase em segundo plano
    saveOrderToSupabase(orderData).catch(err => console.error('Erro supabase:', err));

    // Salva na sessão e no histórico local
    sessionStorage.setItem('current_order', JSON.stringify(orderData));
    const ordersHistory = JSON.parse(localStorage.getItem('imperio_orders_crm') || '[]');
    ordersHistory.push(orderData);
    localStorage.setItem('imperio_orders_crm', JSON.stringify(ordersHistory));

    // Limpa o carrinho
    cart.clear();

    // Redireciona para a Tela de Sucesso do Pedido
    setTimeout(() => {
      window.location.href = 'pedido-confirmado.html';
    }, 400);
  });
}

// Subscribe to state updates
cart.subscribe(renderSummary);

// Init on load
document.addEventListener('DOMContentLoaded', initCheckout);
