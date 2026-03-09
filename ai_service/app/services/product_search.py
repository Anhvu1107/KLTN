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
    params = {"limit": limit, "sort": sort}
    
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
        variant_str = ""
        if variants:
            v = variants[0] if isinstance(variants, list) and len(variants) > 0 else {}
            if isinstance(v, dict):
                parts = []
                if v.get("size"): parts.append(f"Size {v['size']}")
                if v.get("color"): parts.append(v["color"])
                if v.get("material"): parts.append(v["material"])
                if v.get("status"): parts.append(f"Status: {v['status']}")
                variant_str = ", ".join(parts)
        
        price_str = f"{int(float(base_price)):,}₫"
        if sale_price:
            price_str += f" (sale: {int(float(sale_price)):,}₫)"
        
        context_lines.append(
            f"{i}. {name} — {brand}\n"
            f"   Category: {category}, Condition: {condition}\n"
            f"   Price: {price_str}\n"
            f"   Variant: {variant_str}\n"
            f"   Link: /shop/{slug}\n"
            f"   Description: {description}...\n"
        )
    
    return "\n".join(context_lines)
