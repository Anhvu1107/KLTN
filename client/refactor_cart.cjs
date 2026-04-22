const fs = require('fs');

const path = 'd:/KLTN/client/stores/cart.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Add quantity to CartItem
content = content.replace(
    `    price: number\n    addedAt: string`,
    `    price: number\n    quantity: number\n    addedAt: string`
);

// 2. Update itemCount
content = content.replace(
    `        itemCount: (state): number => state.items.length,`,
    `        itemCount: (state): number => state.items.reduce((sum, item) => sum + item.quantity, 0),`
);

// 3. Update subtotal
content = content.replace(
    `            return state.items.reduce((total, item) => total + item.price, 0)`,
    `            return state.items.reduce((total, item) => total + (item.price * item.quantity), 0)`
);

// 4. Update checkoutItems
content = content.replace(
    `        checkoutItems: (state): { variantId: string }[] => {\n            return state.items.map(item => ({ variantId: item.id }))\n        },`,
    `        checkoutItems: (state): { variantId: string; quantity: number }[] => {\n            return state.items.map(item => ({ variantId: item.id, quantity: item.quantity }))\n        },`
);

// 5. Update addToCart
content = content.replace(
    `        addToCart(item: Omit<CartItem, 'addedAt'>): boolean {\n            // Check if item already exists in cart (unique item model)\n            const exists = this.items.some(cartItem => cartItem.id === item.id)\n\n            if (exists) {\n                return false\n            }\n\n            this.items.push({\n                ...item,\n                addedAt: new Date().toISOString(),\n            })\n\n            this.persistCartForUser()\n            this.debouncedTrackAbandonedCart()\n            return true\n        },`,
    `        addToCart(item: Omit<CartItem, 'addedAt'>): boolean {\n            const existingItem = this.items.find(cartItem => cartItem.id === item.id)\n\n            if (existingItem) {\n                existingItem.quantity += item.quantity || 1;\n            } else {\n                this.items.push({\n                    ...item,\n                    quantity: item.quantity || 1,\n                    addedAt: new Date().toISOString(),\n                })\n            }\n\n            this.persistCartForUser()\n            this.debouncedTrackAbandonedCart()\n            return true\n        },`
);

// 6. Add updateQuantity below removeFromCart
content = content.replace(
    `        removeFromCart(variantId: string): void {\n            const index = this.items.findIndex(item => item.id === variantId)\n            if (index !== -1) {\n                this.items.splice(index, 1)\n                if (this.items.length === 0) {\n                    this.appliedCoupon = null\n                }\n                this.persistCartForUser()\n                this.debouncedTrackAbandonedCart()\n            }\n        },`,
    `        removeFromCart(variantId: string): void {\n            const index = this.items.findIndex(item => item.id === variantId)\n            if (index !== -1) {\n                this.items.splice(index, 1)\n                if (this.items.length === 0) {\n                    this.appliedCoupon = null\n                }\n                this.persistCartForUser()\n                this.debouncedTrackAbandonedCart()\n            }\n        },\n\n        updateQuantity(variantId: string, quantity: number): void {\n            const item = this.items.find(i => i.id === variantId)\n            if (item) {\n                if (quantity <= 0) {\n                    this.removeFromCart(variantId)\n                } else {\n                    item.quantity = quantity;\n                    this.persistCartForUser()\n                    this.debouncedTrackAbandonedCart()\n                }\n            }\n        },`
);

// 7. Update abandoned cart tracking payload
content = content.replace(
    `                            variantColor: item.variantColor,\n                        })),`,
    `                            variantColor: item.variantColor,\n                            quantity: item.quantity,\n                        })),`
);


fs.writeFileSync(path, content, 'utf8');
console.log('Successfully refactored cart store');
