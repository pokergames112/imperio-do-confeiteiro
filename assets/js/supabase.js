import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://paeioczhrifbitwejgde.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0KpcbOtwnSbeybTIPiPAbw_qypfNSPx';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Salva o pedido diretamente na tabela 'pedidos' do Supabase em tempo real.
 * Isso garante que o pedido oficial e imutável fique registrado no banco de dados,
 * evitando qualquer risco de o cliente alterar o texto ou preços no WhatsApp.
 */
export async function saveOrderToSupabase(orderData) {
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .insert([{
        codigo_pedido: orderData.code || `IC-${Math.floor(1000 + Math.random() * 9000)}`,
        nome_cliente: orderData.name,
        whatsapp: orderData.phone,
        email: orderData.email || null,
        cpf: orderData.cpf || null,
        tipo_entrega: orderData.deliveryType || 'Entrega',
        endereco: orderData.address || '',
        bairro: orderData.neighborhood || null,
        cidade: orderData.city || null,
        cep: orderData.cep || null,
        itens: orderData.itemsText,
        subtotal: orderData.subtotal,
        frete: orderData.shippingCost,
        total: orderData.total,
        forma_pagamento: orderData.paymentMethod,
        status: 'Aguardando Pagamento'
      }])
      .select();

    if (error) {
      console.error('[Supabase] Erro ao salvar pedido:', error);
      return { success: false, error: error.message };
    }

    console.log('[Supabase] Pedido gravado com sucesso no banco:', data);
    return { success: true, data };
  } catch (err) {
    console.error('[Supabase] Erro na requisição:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Consulta o status atualizado do pedido no Supabase em tempo real
 */
export async function checkOrderStatus(orderCode) {
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .select('status, id, codigo_pedido, total')
      .eq('codigo_pedido', orderCode)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, status: data?.status || 'Aguardando Pagamento' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Atualiza o status do pedido (ex: Aguardando Pix, Pago / Confirmado, Em Separação, Saiu para Entrega, Concluído, Cancelado)
 */
export async function updateOrderStatus(orderCode, newStatus) {
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .update({ status: newStatus })
      .eq('codigo_pedido', orderCode)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Puxa todos os pedidos para o painel administrativo do lojista
 */
export async function fetchAllOrders() {
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: err.message, data: [] };
  }
}
