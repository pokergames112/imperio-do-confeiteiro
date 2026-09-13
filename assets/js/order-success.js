import { generatePixPayload } from './pix.js';
import { formatCurrency } from './app.js';
import { checkOrderStatus } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  const orderJson = sessionStorage.getItem('current_order') || localStorage.getItem('last_placed_order');
  
  if (!orderJson) {
    window.location.href = 'index.html';
    return;
  }

  const order = JSON.parse(orderJson);
  const orderCode = order.code || 'IC-1042';

  // Render Elements
  document.getElementById('displayOrderCode').textContent = `#${orderCode}`;
  document.getElementById('successClientName').textContent = order.name;
  document.getElementById('successClientPhone').textContent = order.phone;
  document.getElementById('successClientAddress').textContent = order.address;
  document.getElementById('successSubtotal').textContent = formatCurrency(order.subtotal);
  document.getElementById('successShipping').textContent = order.shippingCost > 0 ? formatCurrency(order.shippingCost) : 'Grátis';
  document.getElementById('successTotal').textContent = formatCurrency(order.total);
  document.getElementById('successPaymentMethod').textContent = order.paymentMethod;

  // Render Items List (Protegido contra DOM XSS)
  const itemsContainer = document.getElementById('successItemsList');
  itemsContainer.innerHTML = '';
  (order.items || []).forEach(item => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.padding = '4px 0';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = `${item.qty}x ${item.name}`;

    const priceStrong = document.createElement('strong');
    priceStrong.textContent = formatCurrency(item.clubPrice * item.qty);

    row.appendChild(titleSpan);
    row.appendChild(priceStrong);
    itemsContainer.appendChild(row);
  });

  const pixBox = document.getElementById('successPixBox');
  const statusBadgeBox = document.getElementById('statusBadgeBox');
  const statusBadgeTag = document.getElementById('statusBadgeTag');
  const statusText = document.getElementById('displayOrderStatus');
  const statusIcon = document.getElementById('statusBadgeIcon');
  let isPaymentApproved = false;

  function markAsApproved() {
    if (isPaymentApproved) return;
    isPaymentApproved = true;

    if (statusBadgeBox) {
      statusBadgeBox.style.background = '#ecfdf5';
      statusBadgeBox.style.borderColor = '#10b981';
    }
    if (statusBadgeTag) {
      statusBadgeTag.style.color = '#047857';
      statusBadgeTag.textContent = 'PAGAMENTO CONFIRMADO';
    }
    if (statusText) {
      statusText.innerHTML = '✅ Pagamento Aprovado com Sucesso!';
      statusText.style.color = '#065f46';
    }
    if (statusIcon) {
      statusIcon.textContent = '🎉';
    }

    if (pixBox) {
      pixBox.style.background = '#f0fdf4';
      pixBox.style.borderColor = '#86efac';
      pixBox.innerHTML = `
        <div style="padding: 24px; text-align: center;">
          <div style="font-size: 50px; margin-bottom: 12px; animation: bounce 1s infinite alternate;">🎉</div>
          <h3 style="font-weight: 900; color: #15803d; font-size: 20px;">Pagamento Identificado e Confirmado!</h3>
          <p style="font-size: 14px; color: #166534; margin-top: 6px; max-width: 480px; margin-left: auto; margin-right: auto;">
            Seu pedido <strong>#${orderCode}</strong> já foi liberado e entrou imediatamente na esteira de separação do nosso depósito.
          </p>
        </div>
      `;
    }
  }

  // Pix Logic Oficial Banco Central
  if (order.paymentMethod.toLowerCase().includes('pix')) {
    if (pixBox) pixBox.style.display = 'block';
    const cleanTxid = orderCode.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25);
    const pix = generatePixPayload({ amount: order.total, txid: cleanTxid });
    
    const qrImg = document.getElementById('successPixQr');
    const pixKeyEl = document.getElementById('successPixKey');
    if (qrImg) qrImg.src = pix.qrCodeUrl;
    if (pixKeyEl) pixKeyEl.value = pix.payload;

    // Copy Pix Button
    const btnCopy = document.getElementById('btnSuccessCopyPix');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(pix.payload);
        btnCopy.textContent = 'Copiado! ✓';
        setTimeout(() => { btnCopy.textContent = 'Copiar Código'; }, 2000);
      });
    }

    // Cronômetro Regressivo de 10 minutos
    const timerEl = document.getElementById('pixTimer');
    let timeLeft = 600; // 10 minutos em segundos
    const timerInterval = setInterval(() => {
      if (isPaymentApproved) {
        clearInterval(timerInterval);
        return;
      }
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        if (timerEl) timerEl.textContent = 'Chave Expirada (Gere nova)';
        return;
      }
      const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
      const s = String(timeLeft % 60).padStart(2, '0');
      if (timerEl) timerEl.textContent = `Expira em: ${m}:${s}`;
    }, 1000);

    // Botão Ativo de Verificação de Pagamento
    const btnCheck = document.getElementById('btnCheckPaymentNow');
    const checkSpinner = document.getElementById('checkSpinner');
    const checkBtnText = document.getElementById('checkBtnText');
    const feedback = document.getElementById('checkStatusFeedback');

    if (btnCheck) {
      btnCheck.addEventListener('click', async () => {
        if (isPaymentApproved) return;

        if (checkSpinner) checkSpinner.style.display = 'inline-block';
        if (checkBtnText) checkBtnText.textContent = 'Consultando Banco de Dados...';
        if (feedback) feedback.textContent = 'Verificando confirmação do Pix...';

        const result = await checkOrderStatus(orderCode);
        
        setTimeout(() => {
          if (checkSpinner) checkSpinner.style.display = 'none';

          if (result.success && (result.status.toLowerCase().includes('pago') || result.status.toLowerCase().includes('aprovado'))) {
            markAsApproved();
          } else {
            if (checkBtnText) checkBtnText.textContent = '🔍 Verificar Novamente';
            if (feedback) {
              feedback.innerHTML = '<span style="color: #b45309; font-weight: 700;">Ainda não identificado. Se já pagou, clique no botão verde abaixo para enviar o comprovante no WhatsApp!</span>';
            }
          }
        }, 800);
      });
    }

    // Polling Automático em Segundo Plano (a cada 4 segundos)
    const autoPoll = setInterval(async () => {
      if (isPaymentApproved) {
        clearInterval(autoPoll);
        return;
      }
      const res = await checkOrderStatus(orderCode);
      if (res.success && (res.status.toLowerCase().includes('pago') || res.status.toLowerCase().includes('aprovado'))) {
        markAsApproved();
        clearInterval(autoPoll);
      }
    }, 4000);

  } else {
    if (pixBox) pixBox.style.display = 'none';
    if (statusText) statusText.textContent = 'Pedido Recebido (Aguardando Entrega)';
  }

  // Setup WhatsApp Action Button
  const btnWhatsApp = document.getElementById('btnOpenWhatsAppDirect');
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

  const itemsText = (order.items || []).map(i => `• ${i.qty}x ${i.name} (${formatCurrency(i.clubPrice * i.qty)})`).join('\n');

  const whatsappMessage = 
`${eCake} *PEDIDO #${orderCode} - IMPÉRIO DO CONFEITEIRO*
----------------------------------------
${eUser} *Cliente:* ${order.name}
${ePhone} *WhatsApp:* ${order.phone}
${eMail} *E-mail:* ${order.email || 'Não informado'}

${eBox} *ITENS DO PEDIDO:*
${itemsText}

----------------------------------------
${eCart} *Subtotal:* ${formatCurrency(order.subtotal)}
${eTruck} *Entrega:* ${order.shippingCost > 0 ? formatCurrency(order.shippingCost) : 'Grátis'}
${eMoney} *TOTAL DO PEDIDO:* ${formatCurrency(order.total)}
${eCard} *Forma de Pagamento:* ${order.paymentMethod}
${ePin} *Endereço:* ${order.address}
----------------------------------------
_Pedido registrado e salvo no sistema da Império do Confeiteiro_`;

  // Número de WhatsApp para teste (Igor - PRIME RANK)
  // Quando for para produção final com a cliente, trocar de volta para '5581989859211'
  const storeWhatsAppNumber = '5581989780241';
  if (btnWhatsApp) {
    btnWhatsApp.href = `https://wa.me/${storeWhatsAppNumber}?text=${encodeURIComponent(whatsappMessage)}`;
  }
});

