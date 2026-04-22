const fs = require('fs');

const path = 'd:/KLTN/client/pages/shop/[id].vue';
let content = fs.readFileSync(path, 'utf8');

// Update availableVariants
content = content.replace(
    `const availableVariants = computed(() => sizeVariants.value.filter((v: any) => v.status === 'AVAILABLE'))`,
    `const availableVariants = computed(() => sizeVariants.value.filter((v: any) => v.status === 'AVAILABLE' && v.stock_quantity > 0))`
);

// Update availableQuantity
content = content.replace(
    `const availableQuantity = computed(() => availableVariants.value.length)`,
    `const availableQuantity = computed(() => availableVariants.value.reduce((sum, v) => sum + (v.stock_quantity || 1), 0))`
);

// Update inCartCount
content = content.replace(
    `// How many of the SELECTED SIZE are already in the cart?
const inCartCount = computed(() => {
  return availableVariants.value.filter((v: any) => cartStore.isInCart(v.id)).length
})`,
    `// How many of the SELECTED SIZE are already in the cart?
const inCartCount = computed(() => {
  return availableVariants.value.reduce((sum, v) => {
    const itemInCart = cartStore.items.find(i => i.id === v.id);
    return sum + (itemInCart ? itemInCart.quantity : 0);
  }, 0)
})`
);

// Update handleAddToCart
const oldAddToCart = `  // Find variants to add — only from the SELECTED SIZE
  const variantsToAdd = availableVariants.value
    .filter((v: any) => !cartStore.isInCart(v.id))
    .slice(0, selectedQuantity.value)

  let count = 0
  for (const v of variantsToAdd) {
    const success = cartStore.addToCart({
      id: v.id,
      productId: product.value.id,
      productName: product.value.name,
      productBrand: product.value.brand,
      productImage: getImageUrl(product.value.images?.[0]) || '',
      variantSize: v.size,
      variantColor: v.color,
      price: parseFloat(product.value.sale_price || product.value.base_price),
    })
    if (success) count++
  }

  if (count > 0) {
    addedToCart.value = true
    setTimeout(() => {
      addedToCart.value = false
    }, 2000)
  }`;

const newAddToCart = `  const v = availableVariants.value[0];
  if (v) {
    cartStore.addToCart({
      id: v.id,
      productId: product.value.id,
      productName: product.value.name,
      productBrand: product.value.brand,
      productImage: getImageUrl(product.value.images?.[0]) || '',
      variantSize: v.size,
      variantColor: v.color,
      price: parseFloat(product.value.sale_price || product.value.base_price),
      quantity: selectedQuantity.value
    })
    
    addedToCart.value = true
    setTimeout(() => {
      addedToCart.value = false
    }, 2000)
  }`;

content = content.replace(oldAddToCart, newAddToCart);

// Update handleBuyNow
const oldBuyNow = `  // Add selected quantity to cart — only from the SELECTED SIZE
  const variantsToAdd = availableVariants.value
    .filter((v: any) => !cartStore.isInCart(v.id))
    .slice(0, selectedQuantity.value)

  for (const v of variantsToAdd) {
    cartStore.addToCart({
      id: v.id,
      productId: product.value.id,
      productName: product.value.name,
      productBrand: product.value.brand,
      productImage: getImageUrl(product.value.images?.[0]) || '',
      variantSize: v.size,
      variantColor: v.color,
      price: parseFloat(product.value.sale_price || product.value.base_price),
    })
  }`;

const newBuyNow = `  const v = availableVariants.value[0];
  if (v) {
    cartStore.addToCart({
      id: v.id,
      productId: product.value.id,
      productName: product.value.name,
      productBrand: product.value.brand,
      productImage: getImageUrl(product.value.images?.[0]) || '',
      variantSize: v.size,
      variantColor: v.color,
      price: parseFloat(product.value.sale_price || product.value.base_price),
      quantity: selectedQuantity.value
    })
  }`;

content = content.replace(oldBuyNow, newBuyNow);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully refactored shop ui');
