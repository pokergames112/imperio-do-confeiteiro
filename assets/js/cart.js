import { products } from './products.js';

class CartStore {
  constructor() {
    this.items = JSON.parse(localStorage.getItem('imperio_cart') || '[]');
    this.shipping = JSON.parse(localStorage.getItem('imperio_shipping') || 'null');
    this.deliveryType = localStorage.getItem('imperio_delivery_type') || 'receive'; // 'receive' | 'pickup'
    this.listeners = [];
  }

  save() {
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

    const existingIndex = this.items.findIndex(item => item.id === productId);
    if (existingIndex > -1) {
      this.items[existingIndex].qty += qty;
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        category: product.category,
        image: product.image,
        oldPrice: product.oldPrice,
        clubPrice: product.clubPrice,
        unit: product.unit,
        qty: qty
      });
    }

    this.save();
  }

  updateQty(productId, qty) {
    if (qty <= 0) {
      this.removeItem(productId);
      return;
    }
    const item = this.items.find(i => i.id === productId);
    if (item) {
      item.qty = qty;
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
    this.shipping = shippingData;
    this.save();
  }

  setDeliveryType(type) {
    this.deliveryType = type;
    this.save();
  }

  getState() {
    let subtotalStandard = 0;
    let subtotalClub = 0;
    let totalItemsCount = 0;

    this.items.forEach(item => {
      subtotalStandard += item.oldPrice * item.qty;
      subtotalClub += item.clubPrice * item.qty;
      totalItemsCount += item.qty;
    });

    let shippingCost = 0;
    if (this.deliveryType === 'receive' && this.shipping) {
      shippingCost = (subtotalClub >= 150) ? 0 : (this.shipping.shippingValue || 0);
    }

    const totalStandard = subtotalStandard + shippingCost;
    const totalClub = subtotalClub + shippingCost;
    const savings = totalStandard - totalClub;

    return {
      items: this.items,
      totalItemsCount,
      subtotalStandard,
      subtotalClub,
      shippingCost,
      shipping: this.shipping,
      deliveryType: this.deliveryType,
      totalStandard,
      totalClub,
      savings
    };
  }
}

export const cart = new CartStore();
