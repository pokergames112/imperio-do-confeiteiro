import { products } from './products.js';

class CartStore {
  constructor() {
    this.items = this.sanitizeItems(JSON.parse(localStorage.getItem('imperio_cart') || '[]'));
    this.shipping = JSON.parse(localStorage.getItem('imperio_shipping') || 'null');
    this.deliveryType = localStorage.getItem('imperio_delivery_type') === 'pickup' ? 'pickup' : 'receive';
    this.listeners = [];
  }

  // Blindagem: Valida e sincroniza todos os itens com a tabela oficial de produtos
  sanitizeItems(rawItems) {
    if (!Array.isArray(rawItems)) return [];
    
    const validItems = [];
    rawItems.forEach(item => {
      if (!item || !item.id) return;
      const masterProduct = products.find(p => p.id === item.id);
      if (!masterProduct) return;

      const cleanQty = Math.max(1, Math.min(999, Math.floor(Number(item.qty) || 1)));
      
      const salePrice = masterProduct.clubPrice || masterProduct.price || masterProduct.oldPrice || 0;
      
      validItems.push({
        id: masterProduct.id,
        name: masterProduct.name,
        category: masterProduct.category,
        image: masterProduct.image,
        price: salePrice,
        unit: masterProduct.unit,
        qty: cleanQty
      });
    });

    return validItems;
  }

  save() {
    this.items = this.sanitizeItems(this.items);
    localStorage.setItem('imperio_cart', JSON.stringify(this.items));
    localStorage.setItem('imperio_shipping', JSON.stringify(this.shipping));
    localStorage.setItem('imperio_delivery_type', this.deliveryType);
    this.notify();
  }

  subscribe(callback) {
    this.listeners.push(callback);
    callback(this.getState());
  }

  notify() {
    const state = this.getState();
    this.listeners.forEach(cb => cb(state));
  }

  addItem(productId, qty = 1) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const cleanQty = Math.max(1, Math.min(999, Math.floor(Number(qty) || 1)));
    const existingIndex = this.items.findIndex(item => item.id === productId);
    const salePrice = product.clubPrice || product.price || product.oldPrice || 0;

    if (existingIndex > -1) {
      this.items[existingIndex].qty = Math.min(999, this.items[existingIndex].qty + cleanQty);
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        category: product.category,
        image: product.image,
        price: salePrice,
        unit: product.unit,
        qty: cleanQty
      });
    }


    this.save();
  }

  updateQty(productId, qty) {
    const numericQty = Math.floor(Number(qty) || 0);
    if (numericQty <= 0) {
      this.removeItem(productId);
      return;
    }
    const cleanQty = Math.min(999, numericQty);
    const item = this.items.find(i => i.id === productId);
    if (item) {
      item.qty = cleanQty;
      this.save();
    }
  }

  removeItem(productId) {
    this.items = this.items.filter(i => i.id !== productId);
    this.save();
  }

  clear() {
    this.items = [];
    this.save();
  }

  setShipping(shippingData) {
    if (shippingData && typeof shippingData.shippingValue === 'number' && !isNaN(shippingData.shippingValue)) {
      this.shipping = {
        ...shippingData,
        shippingValue: Math.max(0, Number(shippingData.shippingValue))
      };
    } else {
      this.shipping = null;
    }
    this.save();
  }

  setDeliveryType(type) {
    this.deliveryType = type === 'pickup' ? 'pickup' : 'receive';
    this.save();
  }

  getState() {
    this.items = this.sanitizeItems(this.items);

    let subtotal = 0;
    let totalItemsCount = 0;

    this.items.forEach(item => {
      const masterProduct = products.find(p => p.id === item.id);
      const price = masterProduct ? masterProduct.price : item.price;

      subtotal += price * item.qty;
      totalItemsCount += item.qty;
    });

    subtotal = Math.round(subtotal * 100) / 100;

    let shippingCost = 0;
    if (this.deliveryType === 'receive' && this.shipping) {
      shippingCost = (subtotal >= 150) ? 0 : Math.max(0, Number(this.shipping.shippingValue || 0));
    }

    const total = Math.round((subtotal + shippingCost) * 100) / 100;

    return {
      items: this.items,
      totalItemsCount,
      subtotal,
      shippingCost,
      shipping: this.shipping,
      deliveryType: this.deliveryType,
      total
    };
  }
}

export const cart = new CartStore();

