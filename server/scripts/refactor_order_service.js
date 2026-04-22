const fs = require('fs');

const path = 'd:/KLTN/server/src/services/order.service.js';
let content = fs.readFileSync(path, 'utf8');

// Replace variantIds mapping with variantMap
content = content.replace(
    '        const variantIds = items.map(item => item.variantId);',
    `        const variantMap = new Map();
        items.forEach(item => {
            const qty = item.quantity || 1;
            variantMap.set(item.variantId, (variantMap.get(item.variantId) || 0) + qty);
        });
        const variantIds = Array.from(variantMap.keys());`
);

// Replace availability check
content = content.replace(
    `        const unavailableItems = variants.filter(v => v.status !== 'AVAILABLE');
        if (unavailableItems.length > 0) {
            const itemNames = unavailableItems.map(v => v.product?.name || v.sku).join(', ');
            throw new AppError(\`These items are no longer available: \${itemNames}\`, 400);
        }`,
    `        const unavailableItems = variants.filter(v => {
            const requestedQty = variantMap.get(v.id);
            return v.status !== 'AVAILABLE' || v.stock_quantity < requestedQty;
        });
        if (unavailableItems.length > 0) {
            const itemNames = unavailableItems.map(v => v.product?.name || v.sku).join(', ');
            throw new AppError(\`These items are no longer available or do not have enough stock: \${itemNames}\`, 400);
        }`
);

// Replace subtotal loop
content = content.replace(
    `        for (const variant of variants) {
            const product = variant.product;
            const price = parseFloat(product.sale_price || product.base_price) + parseFloat(variant.price_adjustment || 0);

            subtotal += price;

            orderItems.push({
                variant_id: variant.id,
                product_name: product.name,
                product_brand: product.brand,
                variant_size: variant.size,
                variant_color: variant.color,
                price: price,
                quantity: 1,
                total: price,
            });
        }`,
    `        for (const variant of variants) {
            const product = variant.product;
            const price = parseFloat(product.sale_price || product.base_price) + parseFloat(variant.price_adjustment || 0);
            const requestedQty = variantMap.get(variant.id);
            
            const lineTotal = price * requestedQty;
            subtotal += lineTotal;

            orderItems.push({
                variant_id: variant.id,
                product_name: product.name,
                product_brand: product.brand,
                variant_size: variant.size,
                variant_color: variant.color,
                price: price,
                quantity: requestedQty,
                total: lineTotal,
            });
        }`
);

// Replace variant status update to decrement stock
content = content.replace(
    `        // Step 5: Update variant statuses to SOLD
        await Variant.update(
            {
                status: 'SOLD',
                sold_at: new Date(),
            },
            {
                where: { id: { [Op.in]: variantIds } },
                transaction,
            }
        );`,
    `        // Step 5: Update variant stock and status
        for (const variant of variants) {
            const requestedQty = variantMap.get(variant.id);
            const newStock = Math.max(0, variant.stock_quantity - requestedQty);
            const updates = { stock_quantity: newStock };
            if (newStock === 0) {
                updates.status = 'SOLD';
                updates.sold_at = new Date();
            }
            await variant.update(updates, { transaction });
        }`
);

// Replace cancelOrder variant restore
content = content.replace(
    `        // Restore variant statuses to AVAILABLE
        const variantIds = order.items.map(item => item.variant_id);
        await Variant.update(
            {
                status: 'AVAILABLE',
                sold_at: null,
            },
            {
                where: { id: { [Op.in]: variantIds } },
                transaction,
            }
        );`,
    `        // Restore variant stock and statuses to AVAILABLE
        for (const item of order.items) {
            const variant = await Variant.findByPk(item.variant_id, { transaction });
            if (variant) {
                const newStock = variant.stock_quantity + item.quantity;
                await variant.update({
                    stock_quantity: newStock,
                    status: 'AVAILABLE',
                    sold_at: null,
                }, { transaction });
            }
        }`
);

// Replace checkAvailability
content = content.replace(
    `    const results = variants.map(variant => ({
        variantId: variant.id,
        productName: variant.product?.name,
        status: variant.status,
        isAvailable: variant.status === 'AVAILABLE',
    }));`,
    `    const results = variants.map(variant => ({
        variantId: variant.id,
        productName: variant.product?.name,
        status: variant.status,
        stock_quantity: variant.stock_quantity,
        isAvailable: variant.status === 'AVAILABLE' && variant.stock_quantity > 0,
    }));`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully refactored order.service.js');
