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
}

function renderSummary(state) {
  if (!checkoutItemsList) return;
  checkoutItemsList.innerHTML = '';

  state.items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'summary-item-row';
    row.innerHTML = `
      <span class="summary-item-title">${item.qty}x ${item.name}</span>
      <strong>${formatCurrency(item.price * item.qty)}</strong>
    `;
    checkoutItemsList.appendChild(row);
  });

  if (checkoutSubtotal) checkoutSubtotal.textContent = formatCurrency(state.subtotal);
  
  if (checkoutShipping) {
    if (state.deliveryType === 'pickup') {
      checkoutShipping.textContent = 'Retirar (Grátis)';
    } else if (state.shippingCost > 0) {
      checkoutShipping.textContent = formatCurrency(state.shippingCost);
    } else if (state.subtotal >= 150) {
      checkoutShipping.textContent = 'Grátis (Acima R$150)';
    } else {
      checkoutShipping.textContent = 'Digite seu CEP';
    }
  }

  if (checkoutTotal) checkoutTotal.textContent = formatCurrency(state.total);
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
  const isFree = cart.getState().subtotal >= 150;
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
  const payBox = document.getElementById('paymentExplanationBox');
  const payTitle = document.getElementById('payExplTitle');
  const payText = document.getElementById('payExplText');
  const btnText = document.getElementById('btnFinalizeText');

  paymentCards.forEach(card => {
    card.addEventListener('click', () => {
      paymentCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedPayment = card.dataset.payment;

      if (!payBox || !payTitle || !payText || !btnText) return;

      if (selectedPayment === 'pix') {
        payBox.style.background = '#f0fdf4';
        payBox.style.borderColor = '#86efac';
        payTitle.style.color = '#166534';
        payTitle.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
          </svg>
          <span>Pagamento via Pix (Valor Travado e Seguro)</span>
        `;
        payText.style.color = '#15803d';
        payText.innerHTML = 'Ao clicar em <strong>"Continuar para Pagamento Pix"</strong>, você receberá na próxima página o <strong>QR Code oficial</strong> e o <strong>Código Copia e Cola</strong> com o valor exato do pedido.';
        btnText.textContent = 'Continuar para Pagamento Pix';

      } else if (selectedPayment === 'card_delivery') {
        payBox.style.background = '#eff6ff';
        payBox.style.borderColor = '#93c5fd';
        payTitle.style.color = '#1e40af';
        payTitle.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
            <line x1="1" y1="10" x2="23" y2="10"></line>
          </svg>
          <span>Cartão na Entrega (Levar Maquininha)</span>
        `;
        payText.style.color = '#1d4ed8';
        payText.innerHTML = 'O entregador / motoboy levará a maquininha de cartão até o seu endereço no momento da entrega. Aceitamos <strong>Débito, Crédito e Aproximação</strong>.';
        btnText.textContent = 'Confirmar Pedido (Pagar na Entrega)';

      } else if (selectedPayment === 'card_online') {
        payBox.style.background = '#faf5ff';
        payBox.style.borderColor = '#d8b4fe';
        payTitle.style.color = '#6b21a8';
        payTitle.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
            <line x1="12" y1="18" x2="12.01" y2="18"></line>
          </svg>
          <span>Link de Pagamento Seguro (Cartão Parcelado)</span>
        `;
        payText.style.color = '#7e22ce';
        payText.innerHTML = 'Nossa equipe enviará o <strong>link seguro de pagamento</strong> diretamente no seu WhatsApp para você parcelar no cartão de crédito.';
        btnText.textContent = 'Confirmar e Receber Link de Pagamento';
      }
    });
  });
}


// Funções de Sanitização e Proteção contra Adulteração
function sanitizeInput(str, maxLen = 150) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[<>]/g, '') // Remove tags HTML para evitar XSS
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove caracteres de controle
    .trim()
    .slice(0, maxLen);
}

function isValidEmail(email) {
  if (!email) return true; // E-mail é opcional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  // No Brasil DDD (2) + 8 ou 9 dígitos = 10 ou 11 dígitos
  return digits.length >= 10 && digits.length <= 13;
}

function setupInputMasks() {
  if (inputPhone) {
    inputPhone.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 11);
      if (v.length > 10) {
        e.target.value = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
      } else if (v.length > 6) {
        e.target.value = `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
      } else if (v.length > 2) {
        e.target.value = `(${v.slice(0, 2)}) ${v.slice(2)}`;
      } else if (v.length > 0) {
        e.target.value = `(${v}`;
      }
    });
  }

  if (cepInput) {
    cepInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 8);
      if (v.length > 5) {
        e.target.value = `${v.slice(0, 5)}-${v.slice(5)}`;
      } else {
        e.target.value = v;
      }
    });
  }
}

function setupFinalizeOrder() {
  if (!btnFinalizeOrder) return;

  setupInputMasks();

  btnFinalizeOrder.addEventListener('click', () => {
    const rawName = inputName ? inputName.value : '';
    const rawPhone = inputPhone ? inputPhone.value : '';
    const rawEmail = inputEmail ? inputEmail.value : '';
    const rawCpf = inputCpf ? inputCpf.value : '';

    const name = sanitizeInput(rawName, 80);
    const phone = sanitizeInput(rawPhone, 20);
    const email = sanitizeInput(rawEmail, 100);
    const cpf = sanitizeInput(rawCpf, 20);

    const state = cart.getState();

    // 1. Validação de Carrinho Vazio
    if (!state.items || state.items.length === 0 || state.subtotal <= 0) {
      alert('Seu carrinho está vazio ou com valor inválido. Redirecionando...');
      window.location.href = 'index.html';
      return;
    }

    // 2. Validação de Nome
    if (!name || name.length < 3) {
      alert('Por favor, informe seu nome completo (mínimo 3 caracteres).');
      if (inputName) inputName.focus();
      return;
    }

    // 3. Validação de Telefone / WhatsApp
    if (!isValidPhone(phone)) {
      alert('Por favor, informe um número de WhatsApp válido com DDD (ex: (81) 98888-7777).');
      if (inputPhone) inputPhone.focus();
      return;
    }

    // 4. Validação de E-mail
    if (email && !isValidEmail(email)) {
      alert('Por favor, informe um endereço de e-mail válido ou deixe em branco.');
      if (inputEmail) inputEmail.focus();
      return;
    }

    // 5. Validação de Entrega / Endereço
    const street = sanitizeInput(inputStreet?.value || '', 100);
    const number = sanitizeInput(inputNumber?.value || '', 20);
    const complement = sanitizeInput(inputComplement?.value || '', 50);
    const neighborhood = sanitizeInput(inputNeighborhood?.value || '', 60);
    const city = sanitizeInput(inputCity?.value || '', 60);
    const cep = sanitizeInput(cepInput?.value || '', 12);

    if (state.deliveryType === 'receive') {
      if (!street || !number) {
        alert('Por favor, preencha o CEP, calcule o frete e informe a rua e o número de entrega.');
        if (!street && cepInput) cepInput.focus();
        else if (inputNumber) inputNumber.focus();
        return;
      }
    }

    // Recalcula totais usando apenas a fonte protegida
    const itemsText = state.items.map(i => `• ${i.qty}x ${sanitizeInput(i.name)} (${formatCurrency(i.price * i.qty)})`).join('\n');
    const deliveryMethodText = state.deliveryType === 'pickup' 
      ? 'Retirar no Depósito da Confeitaria (Grátis)' 
      : `${currentShippingInfo?.courier || 'Entrega'} - ${state.shippingCost > 0 ? formatCurrency(state.shippingCost) : 'Grátis'}`;

    const addressText = state.deliveryType === 'pickup'
      ? 'Retirada no Balcão do Depósito'
      : `${street}, Nº ${number} ${complement ? '(' + complement + ')' : ''} - ${neighborhood}, ${city}`;

    const paymentLabel = selectedPayment === 'pix' 
      ? 'Pix (Chave gerada no site)' 
      : (selectedPayment === 'card_delivery' ? 'Cartão na Entrega (Maquininha)' : 'Cartão de Crédito');

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
${eCart} *Subtotal:* ${formatCurrency(state.subtotal)}
${eTruck} *Entrega:* ${deliveryMethodText}
${eMoney} *TOTAL DO PEDIDO:* ${formatCurrency(state.total)}
${eCard} *Forma de Pagamento:* ${paymentLabel}
${ePin} *Endereço:* ${addressText}
----------------------------------------
_Pedido gerado via Catálogo Digital Império do Confeiteiro_`;

    // Gerador de código de pedido único
    const orderCode = `IC-${Math.floor(1000 + Math.random() * 9000)}`;

    const orderData = {
      id: Date.now(),
      code: orderCode,
      name,
      phone,
      email,
      cpf: cpf || null,
      deliveryType: state.deliveryType === 'pickup' ? 'Retirada no Depósito' : 'Entrega',
      address: addressText,
      neighborhood: neighborhood || '',
      city: city || 'Recife - PE',
      cep: cep || '',
      items: state.items,
      itemsText: itemsText,
      subtotal: state.subtotal,
      shippingCost: state.deliveryType === 'pickup' ? 0 : state.shippingCost,
      total: state.total,
      paymentMethod: paymentLabel,
      createdAt: new Date().toISOString()
    };

    // Feedback visual e trava de duplo-clique
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
