const existing = { items: [{ qty: 30 }] };
const updates = { items: [{ qty: 25 }] };
const merged = { ...existing, ...updates };
console.log(merged);
