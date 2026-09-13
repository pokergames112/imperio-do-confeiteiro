import { products } from './products.js';

class CartStore {
  constructor() {
    this.items = this.sanitizeItems(JSON.parse(localStorage.getItem('imperio_cart') || '[]'));
    this.shipping = JSON.parse(localStorage.getItem('imperio_shipping') || 'null');
    this.deliveryType = localStorage.getItem('imperio_delivery_type') === 'pickup' ? 'pickup' : 'receive';
    this.listeners = [];
  }

  // Sanitização e validação matemática de todos os itens contra o catálogo oficial
  sanitizeItems(rawItems) {
    if (!Array.isArray(rawItems)) return [];
    
    const validItems = [];
    rawItems.forEach(item => {
      if (!item || !item.id) return;
      const masterProduct = products.find(p => p.id === Number(item.id));
      if (!masterProduct) return;

      const cleanQty = Math.max(1, Math.min(999, Math.floor(Number(item.qty) || 1)));
      const salePrice = Number(masterProduct.price || masterProduct.clubPrice || masterProduct.oldPrice || 0);
      
      validItems.push({
        id: masterProduct.id,
        name: masterProduct.name,
        category: masterProduct.category,
        image: masterProduct.image,
        price: salePrice,
        unit: masterProduct.unit || 'un',
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
    const numericId = Number(productId);
    const product = products.find(p => p.id === numericId);
    if (!product) return;

    const cleanQty = Math.max(1, Math.min(999, Math.floor(Number(qty) || 1)));
    const existingIndex = this.items.findIndex(item => item.id === numericId);
    const salePrice = Number(product.price || product.clubPrice || product.oldPrice || 0);

    if (existingIndex > -1) {
      this.items[existingIndex].qty = Math.min(999, this.items[existingIndex].qty + cleanQty);
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        category: product.category,
        image: product.image,
        price: salePrice,
        unit: product.unit || 'un',
        qty: cleanQty
      });
    }

    this.save();
  }

  updateQty(productId, qty) {
    const numericId = Number(productId);
    const numericQty = Math.floor(Number(qty) || 0);
    if (numericQty <= 0) {
      this.removeItem(numericId);
      return;
    }
    const cleanQty = Math.min(999, numericQty);
    const item = this.items.find(i => i.id === numericId);
    if (item) {
      item.qty = cleanQty;
      this.save();
    }
  }

  removeItem(productId) {
    const numericId = Number(productId);
    this.items = this.items.filter(i => i.id !== numericId);
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
      const price = Number(item.price || 0);
      const qty = Number(item.qty || 1);
      subtotal += price * qty;
      totalItemsCount += qty;
    });

    // Arredondamento decimal preciso
    subtotal = Math.round(subtotal * 100) / 100;

    const isFreeShipping = subtotal >= 150.00;
    let shippingCost = 0;

    if (this.deliveryType === 'pickup') {
      shippingCost = 0;
    } else if (isFreeShipping) {
      shippingCost = 0;
    } else if (this.shipping && typeof this.shipping.shippingValue === 'number') {
      shippingCost = Math.max(0, Number(this.shipping.shippingValue));
    }

    shippingCost = Math.round(shippingCost * 100) / 100;
    const total = Math.round((subtotal + shippingCost) * 100) / 100;

    return {
      items: this.items,
      totalItemsCount,
      subtotal,
      shippingCost,
      isFreeShipping,
      shipping: this.shipping,
      deliveryType: this.deliveryType,
      total
    };
  }
}

export const cart = new CartStore();


