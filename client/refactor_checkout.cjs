const fs = require('fs');

const path = 'd:/KLTN/client/pages/checkout.vue';
let content = fs.readFileSync(path, 'utf8');

// Replace groupedItems with cartItems
content = content.replace(
    `// Group identical items
const groupedItems = computed(() => {
  const groups = new Map()
  for (const item of cartStore.items) {
    const key = \`\${item.productId}-\${item.variantSize}-\${item.variantColor}\`
    if (!groups.has(key)) {
      groups.set(key, { ...item, quantity: 1, variantIds: [item.id] })
    } else {
      const g = groups.get(key)
      g.quantity++
      g.variantIds.push(item.id)
    }
  }
  return Array.from(groups.values())
})`,
    `// Cart items
const cartItems = computed(() => cartStore.items)`
);

// Replace groupedItems usage in template
content = content.replace(
    `v-for="item in groupedItems"
                :key="item.variantIds[0]"`,
    `v-for="item in cartItems"
                :key="item.id"`
);


fs.writeFileSync(path, content, 'utf8');
console.log('Successfully refactored checkout.vue');
