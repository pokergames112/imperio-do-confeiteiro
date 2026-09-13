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
    priceStrong.textContent = formatCurrency((item.price || 0) * item.qty);

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

    // Atualiza a Linha do Tempo (Tracker)
    const dot2 = document.getElementById('stepDot2');
    const label2 = document.getElementById('stepLabel2');
    const dot3 = document.getElementById('stepDot3');
    const label3 = document.getElementById('stepLabel3');
    const btnWhatsAppText = document.getElementById('btnWhatsAppText');

    if (dot2) {
      dot2.style.background = '#10b981';
      dot2.textContent = '✓';
    }
    if (label2) {
      label2.style.color = '#15803d';
      label2.textContent = 'Pago ✓';
    }
    if (dot3) {
      dot3.style.background = '#f59e0b';
      dot3.style.color = '#fff';
    }
    if (label3) {
      label3.style.color = '#b45309';
      label3.style.fontWeight = '700';
      label3.textContent = 'Em Separação';
    }
    if (btnWhatsAppText) {
      btnWhatsAppText.textContent = '📦 Acompanhar Separação no WhatsApp';
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

    // Sincronização em Segundo Plano com o Painel do Lojista (a cada 5 segundos)
    const autoPoll = setInterval(async () => {
      if (isPaymentApproved) {
        clearInterval(autoPoll);
        return;
      }
      const res = await checkOrderStatus(orderCode);
      if (res.success && (res.status.toLowerCase().includes('pago') || res.status.toLowerCase().includes('aprovado') || res.status.toLowerCase().includes('separa') || res.status.toLowerCase().includes('entrega'))) {
        markAsApproved();
        clearInterval(autoPoll);
      }
    }, 5000);

  } else if (order.paymentMethod.toLowerCase().includes('entrega') || order.paymentMethod.toLowerCase().includes('maquininha')) {
    if (pixBox) pixBox.style.display = 'none';
    const cardBox = document.getElementById('successCardDeliveryBox');
    if (cardBox) cardBox.style.display = 'block';

    if (statusBadgeBox) {
      statusBadgeBox.style.background = '#eff6ff';
      statusBadgeBox.style.borderColor = '#93c5fd';
    }
    if (statusBadgeTag) {
      statusBadgeTag.style.color = '#1e40af';
      statusBadgeTag.textContent = 'PEDIDO CONFIRMADO (PAGAR NA ENTREGA)';
    }
    if (statusText) {
      statusText.innerHTML = '🛵 Levar Maquininha na Entrega';
      statusText.style.color = '#1e3a8a';
    }
    if (statusIcon) statusIcon.textContent = '🛵';

    // Ajusta Linha do Tempo
    const dot2 = document.getElementById('stepDot2');
    const label2 = document.getElementById('stepLabel2');
    const dot3 = document.getElementById('stepDot3');
    const label3 = document.getElementById('stepLabel3');
    const btnWhatsAppText = document.getElementById('btnWhatsAppText');

    if (dot2) {
      dot2.style.background = '#3b82f6';
      dot2.textContent = '💳';
    }
    if (label2) {
      label2.style.color = '#1d4ed8';
      label2.textContent = 'Na Entrega';
    }
    if (dot3) {
      dot3.style.background = '#f59e0b';
      dot3.style.color = '#fff';
    }
    if (label3) {
      label3.style.color = '#b45309';
      label3.style.fontWeight = '700';
      label3.textContent = 'Em Separação';
    }
    if (btnWhatsAppText) {
      btnWhatsAppText.textContent = 'Enviar Detalhes do Pedido no WhatsApp';
    }

  } else {
    // Link de Pagamento Online
    if (pixBox) pixBox.style.display = 'none';
    const linkBox = document.getElementById('successCardOnlineBox');
    if (linkBox) linkBox.style.display = 'block';

    if (statusBadgeBox) {
      statusBadgeBox.style.background = '#faf5ff';
      statusBadgeBox.style.borderColor = '#d8b4fe';
    }
    if (statusBadgeTag) {
      statusBadgeTag.style.color = '#6b21a8';
      statusBadgeTag.textContent = 'AGUARDANDO LINK DE PAGAMENTO';
    }
    if (statusText) {
      statusText.innerHTML = '🔗 Link será enviado no seu WhatsApp';
      statusText.style.color = '#581c87';
    }
    if (statusIcon) statusIcon.textContent = '🔗';
    
    const btnWhatsAppText = document.getElementById('btnWhatsAppText');
    if (btnWhatsAppText) {
      btnWhatsAppText.textContent = 'Solicitar Link no WhatsApp';
    }
  }


  // Setup WhatsApp Action Button
  const btnWhatsApp = document.getElementById('btnOpenWhatsAppDirect');
  const itemsText = (order.items || []).map(i => `• ${i.qty}x ${i.name} (${formatCurrency((i.price || 0) * i.qty)})`).join('\n');

  const whatsappMessage = 
`*PEDIDO #${orderCode} - IMPÉRIO DO CONFEITEIRO*
----------------------------------------
*Cliente:* ${order.name}
*WhatsApp:* ${order.phone}
*E-mail:* ${order.email || 'Não informado'}

*ITENS DO PEDIDO:*
${itemsText}

----------------------------------------
*Subtotal:* ${formatCurrency(order.subtotal)}
*Entrega:* ${order.shippingCost > 0 ? formatCurrency(order.shippingCost) : 'Grátis'}
*TOTAL DO PEDIDO:* ${formatCurrency(order.total)}
*Forma de Pagamento:* ${order.paymentMethod}
*Endereço de Entrega:* ${order.address}
----------------------------------------
Pedido registrado pelo Catálogo Digital Império do Confeiteiro`;

  // Número de WhatsApp para teste (Igor - PRIME RANK)
  // Quando for para produção final com a cliente, trocar de volta para '5581989859211'
  const storeWhatsAppNumber = '5581989780241';
  if (btnWhatsApp) {
    btnWhatsApp.href = `https://wa.me/${storeWhatsAppNumber}?text=${encodeURIComponent(whatsappMessage)}`;
  }
});

