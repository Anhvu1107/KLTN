const fs = require('fs');

const path = 'd:/KLTN/client/pages/admin/products/[id].vue';
let content = fs.readFileSync(path, 'utf8');

// 1. Replace variant population logic to map stock_quantity to quantity
content = content.replace(
    `            isDeleted: false,\n            quantity: 1,`,
    `            isDeleted: false,\n            quantity: v.stock_quantity || 1,`
);

// 2. Replace the save logic to send stock_quantity and not loop
const oldSaveLogic = `      } else if (v.isNew && !v.isDeleted) {
        // Create new variant
        const qty = v.quantity || 1;
        for (let i = 0; i < qty; i++) {
          await $fetch(\`\${config.public.apiUrl}/admin/products/\${productId}/variants\`, {
            method: 'POST',
            headers: { Authorization: \`Bearer \${token}\` },
            body: { size: actualSize, color: actualColor, material: actualMaterial, status: v.status },
          })
        }
      } else if (v.id && !v.isDeleted) {
        // Update existing variant
        await $fetch(\`\${config.public.apiUrl}/admin/variants/\${v.id}\`, {
          method: 'PUT',
          headers: { Authorization: \`Bearer \${token}\` },
          body: { size: actualSize, color: actualColor, material: actualMaterial, status: v.status },
        })
      }`;

const newSaveLogic = `      } else if (v.isNew && !v.isDeleted) {
        // Create new variant
        await $fetch(\`\${config.public.apiUrl}/admin/products/\${productId}/variants\`, {
          method: 'POST',
          headers: { Authorization: \`Bearer \${token}\` },
          body: { size: actualSize, color: actualColor, material: actualMaterial, status: v.status, stock_quantity: v.quantity || 1 },
        })
      } else if (v.id && !v.isDeleted) {
        // Update existing variant
        await $fetch(\`\${config.public.apiUrl}/admin/variants/\${v.id}\`, {
          method: 'PUT',
          headers: { Authorization: \`Bearer \${token}\` },
          body: { size: actualSize, color: actualColor, material: actualMaterial, status: v.status, stock_quantity: v.quantity || 1 },
        })
      }`;

content = content.replace(oldSaveLogic, newSaveLogic);

// 3. Make quantity input available for all variants, not just new ones
content = content.replace(
    `              <div v-if="v.isNew">`,
    `              <div>`
);


fs.writeFileSync(path, content, 'utf8');
console.log('Successfully refactored admin product vue');
