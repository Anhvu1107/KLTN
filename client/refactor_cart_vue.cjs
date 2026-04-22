const fs = require('fs');

const path = 'd:/KLTN/client/pages/cart.vue';
let content = fs.readFileSync(path, 'utf8');

// Replace groupedItems with standard items
content = content.replace(
    `// Group identical items
const groupedItems = computed(() => {
  const groups = new Map()
  for (const item of cartStore.items) {
    // Generate a unique key for identical variants of the same product
    const key = \`\${item.productId}-\${item.variantSize}-\${item.variantColor}\`
    if (!groups.has(key)) {
      groups.set(key, { 
        ...item, 
        quantity: 1, 
        variantIds: [item.id] 
      })
    } else {
      const g = groups.get(key)
      g.quantity++
      g.variantIds.push(item.id)
    }
  }
  return Array.from(groups.values())
})`,
    `// Use cart items directly since they now support quantity natively
const cartItems = computed(() => cartStore.items)`
);

// Replace removeGroup
content = content.replace(
    `// Remove group of items
const removeGroup = (variantIds: string[]) => {
  for (const id of variantIds) {
    cartStore.removeFromCart(id)
  }
}`,
    `// Remove item completely
const removeItem = (variantId: string) => {
  cartStore.removeFromCart(variantId)
}`
);

// Replace decreaseQuantity
content = content.replace(
    `// Decrease quantity by removing ONE variant
const decreaseQuantity = (variantIds: string[]) => {
  if (variantIds.length > 1) {
    cartStore.removeFromCart(variantIds[variantIds.length - 1])
  }
}`,
    `// Decrease quantity
const decreaseQuantity = (item: any) => {
  if (item.quantity > 1) {
    cartStore.updateQuantity(item.id, item.quantity - 1)
  }
}`
);

// Replace increaseQuantity
const oldIncrease = `// Increase quantity by finding available variant from backend
const isAddingKey = ref('')

const increaseQuantity = async (item: any) => {
  const itemKey = \`\${item.productId}-\${item.variantSize}-\${item.variantColor}\`
  isAddingKey.value = itemKey
  
  try {
    const res = await $fetch<{ success: boolean; data: { product: any } }>(
      \`\${config.public.apiUrl}/products/\${item.productId}\`
    )
    
    if (res.success && res.data.product) {
      const product = res.data.product
      
      const matchingVariants = product.variants.filter((v: any) => 
        v.status === 'AVAILABLE' && 
        v.size === item.variantSize && 
        v.color === item.variantColor
      )
      
      const availableToAdd = matchingVariants.find((v: any) => 
        !cartStore.isInCart(v.id)
      )
      
      if (availableToAdd) {
        cartStore.addToCart({
          id: availableToAdd.id,
          productId: product.id,
          productName: product.name,
          productBrand: product.brand,
          productImage: item.productImage,
          variantSize: availableToAdd.size,
          variantColor: availableToAdd.color,
          price: parseFloat(product.sale_price || product.base_price),
        })
      } else {
        showDialog({
          title: t('shop.soldOutTitle', 'Hết hàng'),
          message: t('shop.soldOut', 'Đã đạt số lượng tối đa trong kho'),
          type: 'warning'
        })
      }
    }
  } catch (error) {
    console.error('Failed to increase quantity:', error)
  } finally {
    isAddingKey.value = ''
  }
}`;

const newIncrease = `// Increase quantity by checking stock from backend
const isAddingKey = ref('')

const increaseQuantity = async (item: any) => {
  isAddingKey.value = item.id
  
  try {
    const res = await $fetch<{ success: boolean; data: { product: any } }>(
      \`\${config.public.apiUrl}/products/\${item.productId}\`
    )
    
    if (res.success && res.data.product) {
      const matchingVariant = res.data.product.variants.find((v: any) => v.id === item.id)
      
      if (matchingVariant && matchingVariant.stock_quantity > item.quantity) {
        cartStore.updateQuantity(item.id, item.quantity + 1)
      } else {
        showDialog({
          title: t('shop.soldOutTitle', 'Hết hàng'),
          message: t('shop.soldOut', 'Đã đạt số lượng tối đa trong kho'),
          type: 'warning'
        })
      }
    }
  } catch (error) {
    console.error('Failed to increase quantity:', error)
  } finally {
    isAddingKey.value = ''
  }
}`;

content = content.replace(oldIncrease, newIncrease);

// Replace template items loop
content = content.replace(
    `<div
              v-for="item in groupedItems"
              :key="item.variantIds[0]"`,
    `<div
              v-for="item in cartItems"
              :key="item.id"`
);

// Replace decrease logic in template
content = content.replace(
    `@click="decreaseQuantity(item.variantIds)"
                      class="px-3 py-1 text-neutral-500 hover:bg-neutral-100 transition-colors"
                      :disabled="item.quantity <= 1 || isAddingKey === \`\${item.productId}-\${item.variantSize}-\${item.variantColor}\`"
                      :class="{ 'opacity-30 cursor-not-allowed': item.quantity <= 1 || isAddingKey === \`\${item.productId}-\${item.variantSize}-\${item.variantColor}\` }"`,
    `@click="decreaseQuantity(item)"
                      class="px-3 py-1 text-neutral-500 hover:bg-neutral-100 transition-colors"
                      :disabled="item.quantity <= 1 || isAddingKey === item.id"
                      :class="{ 'opacity-30 cursor-not-allowed': item.quantity <= 1 || isAddingKey === item.id }"`
);

// Replace isAdding spinner condition
content = content.replace(
    `v-if="isAddingKey === \`\${item.productId}-\${item.variantSize}-\${item.variantColor}\`"`,
    `v-if="isAddingKey === item.id"`
);

// Replace increase disable logic
content = content.replace(
    `:disabled="isAddingKey === \`\${item.productId}-\${item.variantSize}-\${item.variantColor}\`"
                      :class="{ 'opacity-30 cursor-not-allowed': isAddingKey === \`\${item.productId}-\${item.variantSize}-\${item.variantColor}\` }"`,
    `:disabled="isAddingKey === item.id"
                      :class="{ 'opacity-30 cursor-not-allowed': isAddingKey === item.id }"`
);

// Replace remove handler
content = content.replace(
    `@click="removeGroup(item.variantIds)"`,
    `@click="removeItem(item.id)"`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully refactored cart.vue');
