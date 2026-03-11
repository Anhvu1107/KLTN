"""
Product Search Service
AURA ARCHIVE - Fetch real products from Express API for AI recommendations
"""

import httpx
from typing import Dict, Any, List, Optional
from app.core.config import settings


BACKEND_API = f"{settings.BACKEND_URL}/api/v1"


async def search_products(
    search: str = None,
    category: str = None,
    brand: str = None,
    min_price: int = None,
    max_price: int = None,
    limit: int = 5,
    sort: str = "newest",
) -> List[Dict[str, Any]]:
    """
    Search products via Express API.
    Returns list of product dicts with variants.
    """
    params = {"limit": limit, "sort": sort, "status": "AVAILABLE"}
    
    if search:
        params["search"] = search
    if category:
        params["category"] = category
    if brand:
        params["brand"] = brand
    if min_price:
        params["minPrice"] = min_price
    if max_price:
        params["maxPrice"] = max_price
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{BACKEND_API}/products", params=params)
            
            if response.status_code == 200:
                data = response.json()
                products = data.get("data", {}).get("products", [])
                return products
            else:
                print(f"[ProductSearch] API returned {response.status_code}")
                return []
    except Exception as e:
        print(f"[ProductSearch] Error fetching products: {e}")
        return []


async def get_product_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    """Get a single product by slug"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{BACKEND_API}/products/{slug}")
            if response.status_code == 200:
                data = response.json()
                return data.get("data", {}).get("product")
            return None
    except Exception as e:
        print(f"[ProductSearch] Error fetching product: {e}")
        return None


async def get_featured_products(limit: int = 4) -> List[Dict[str, Any]]:
    """Get featured products"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{BACKEND_API}/products/featured",
                params={"limit": limit}
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("data", {}).get("products", [])
            return []
    except Exception as e:
        print(f"[ProductSearch] Error fetching featured: {e}")
        return []


async def get_new_arrivals(limit: int = 4) -> List[Dict[str, Any]]:
    """Get new arrival products"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{BACKEND_API}/products/new-arrivals",
                params={"limit": limit}
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("data", {}).get("products", [])
            return []
    except Exception as e:
        print(f"[ProductSearch] Error fetching new arrivals: {e}")
        return []


async def get_sale_products(limit: int = 4) -> List[Dict[str, Any]]:
    """Get sale products"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{BACKEND_API}/products/sale",
                params={"limit": limit}
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("data", {}).get("products", [])
            return []
    except Exception as e:
        print(f"[ProductSearch] Error fetching sale products: {e}")
        return []


async def get_categories() -> List[Dict[str, Any]]:
    """Get available categories with counts"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{BACKEND_API}/products/categories")
            if response.status_code == 200:
                data = response.json()
                return data.get("data", {}).get("categories", [])
            return []
    except Exception as e:
        print(f"[ProductSearch] Error fetching categories: {e}")
        return []


async def get_brands() -> List[Dict[str, Any]]:
    """Get available brands with counts"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{BACKEND_API}/products/brands")
            if response.status_code == 200:
                data = response.json()
                return data.get("data", {}).get("brands", [])
            return []
    except Exception as e:
        print(f"[ProductSearch] Error fetching brands: {e}")
        return []


def build_product_context_for_ai(products: List[Dict[str, Any]]) -> str:
    """
    Format product list into a text context string for AI prompt enrichment.
    Used when API key is available to give AI real product data.
    """
    if not products:
        return "No products found matching the criteria."
    
    context_lines = [f"Found {len(products)} matching products:\n"]
    
    for i, p in enumerate(products, 1):
        name = p.get("name", "Unknown")
        brand = p.get("brand", "")
        slug = p.get("slug", "")
        base_price = p.get("base_price", 0)
        sale_price = p.get("sale_price")
        category = p.get("category", "")
        condition = p.get("condition_text", "")
        description = p.get("description", "")[:150]
        
        variants = p.get("variants", [])
        variant_parts = []
        has_available = False
        if variants:
            for v in (variants if isinstance(variants, list) else [variants]):
                if isinstance(v, dict):
                    parts = []
                    if v.get("size"): parts.append(f"Size {v['size']}")
                    if v.get("color"): parts.append(v["color"])
                    if v.get("material"): parts.append(v["material"])
                    status = v.get("status", "")
                    if status == "AVAILABLE":
                        parts.append("Con hang")
                        has_available = True
                    elif status == "SOLD":
                        parts.append("Da ban")
                    elif status == "RESERVED":
                        parts.append("Dang giu")
                    variant_parts.append(", ".join(parts))
        variant_str = " | ".join(variant_parts) if variant_parts else ""
        
        # Mark availability clearly
        availability = "CON HANG" if has_available else "HET HANG"
        
        price_str = f"{int(float(base_price)):,}₫"
        if sale_price:
            price_str += f" (sale: {int(float(sale_price)):,}₫)"
        
        context_lines.append(
            f"{i}. {name} — {brand}\n"
            f"   Category: {category}, Condition: {condition}\n"
            f"   Tinh trang: {availability}\n"
            f"   Price: {price_str}\n"
            f"   Variant: {variant_str}\n"
            f"   Link: /shop/{slug}\n"
            f"   Description: {description}...\n"
        )
    
    return "\n".join(context_lines)


async def get_inventory_summary() -> Dict[str, Any]:
    """
    Get inventory summary from Express API.
    Returns total counts, category & brand breakdown, price range.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{BACKEND_API}/products/inventory-summary")
            if response.status_code == 200:
                data = response.json()
                return data.get("data", {}).get("summary", {})
            else:
                print(f"[ProductSearch] Inventory API returned {response.status_code}")
                return {}
    except Exception as e:
        print(f"[ProductSearch] Error fetching inventory summary: {e}")
        return {}


def build_inventory_context_for_ai(summary: Dict[str, Any]) -> str:
    """
    Format inventory summary into a text block for AI prompt enrichment.
    """
    if not summary:
        return "Không thể lấy thông tin kho hàng lúc này."
    
    total = summary.get("total_products", 0)
    available = summary.get("total_available", 0)
    sold = summary.get("total_sold", 0)
    reserved = summary.get("total_reserved", 0)
    categories = summary.get("categories", [])
    brands = summary.get("top_brands", [])
    price_range = summary.get("price_range", {})
    
    lines = [
        f"TỔNG QUAN KHO HÀNG AURA ARCHIVE:",
        f"  Tổng sản phẩm: {total}",
        f"  Còn hàng (AVAILABLE): {available} variant",
        f"  Đã bán (SOLD): {sold} variant",
        f"  Đang giữ (RESERVED): {reserved} variant",
    ]
    
    if price_range:
        min_p = price_range.get("min", 0)
        max_p = price_range.get("max", 0)
        if min_p and max_p:
            lines.append(f"  Tầm giá: {int(float(min_p)):,}₫ – {int(float(max_p)):,}₫")
    
    if categories:
        lines.append("\n  PHÂN LOẠI THEO CATEGORY:")
        for cat in categories:
            lines.append(f"    • {cat.get('category', 'N/A')}: {cat.get('product_count', 0)} sản phẩm")
    
    if brands:
        lines.append("\n  TOP BRANDS:")
        for b in brands:
            lines.append(f"    • {b.get('brand', 'N/A')}: {b.get('product_count', 0)} sản phẩm")
    
    return "\n".join(lines)

