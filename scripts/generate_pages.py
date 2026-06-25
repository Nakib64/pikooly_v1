"""
generate_pages.py
-----------------
Generates all Next.js App Router page.tsx wrappers for every route.
Run from the project root:
  python scripts/generate_pages.py
"""

import os

ROOT = os.path.join(os.path.dirname(__file__), "..")  # project root
APP  = os.path.join(ROOT, "app")

# ---------------------------------------------------------------------------
# Each entry: (app_route_dir, import_path_from_src, component_name)
# app_route_dir  – relative to app/   e.g. "(public)/shop"
# import_path    – path for @/src/pages/…  (no extension)
# component_name – the exported default name
# ---------------------------------------------------------------------------

PUBLIC_PAGES = [
    # route dir (under app/)          import from @/src/pages/…    default export name
    ("(public)/shop",                  "Shop",                       "Shop"),
    ("(public)/all-gifts",             "AllGifts",                   "AllGifts"),
    ("(public)/product/[id]",          "ProductDetail",              "ProductDetail"),
    ("(public)/product-category/[catSlug]",           "Shop",        "Shop"),
    ("(public)/product-category/[catSlug]/[subSlug]", "Shop",        "Shop"),
    ("(public)/blog",                  "Blog",                       "Blog"),
    ("(public)/blog/[slug]",           "BlogDetail",                 "BlogDetail"),
    ("(public)/blog/category/[category]",             "Blog",        "Blog"),
    ("(public)/blog/category/[category]/[subcategory]","Blog",       "Blog"),
    ("(public)/blog/subcategory/[subcategory]",        "Blog",       "Blog"),
    ("(public)/cart",                  "Cart",                       "Cart"),
    ("(public)/checkout",              "Checkout",                   "Checkout"),
    ("(public)/order-success/[orderNumber]",  "OrderSuccess",        "OrderSuccess"),
    ("(public)/remittance-payment/[orderId]","RemittancePayment",    "RemittancePayment"),
    ("(public)/track-order",           "TrackOrder",                 "TrackOrder"),
    ("(public)/eps-callback",          "EpsCallback",                "EpsCallback"),
    ("(public)/about-us",              "AboutUs",                    "AboutUs"),
    ("(public)/contact-us",            "ContactUs",                  "ContactUs"),
    ("(public)/refund-policy",         "RefundPolicy",               "RefundPolicy"),
    ("(public)/privacy-policy",        "PrivacyPolicy",              "PrivacyPolicy"),
    ("(public)/terms-conditions",      "TermsConditions",            "TermsConditions"),
    ("(public)/reviews",               "Reviews",                    "Reviews"),
    ("(public)/custom-bouquet",        "BouquetBuilder",             "BouquetBuilder"),
    ("(public)/install",               "Install",                    "Install"),
    ("(public)/events",                "Events",                     "Events"),
    ("(public)/events/[slug]",         "EventCategoryDetail",        "EventCategoryDetail"),
    ("(public)/photography",           "Photography",                "Photography"),
    ("(public)/search",                "Search",                     "Search"),
    ("(public)/auth",                  "Auth",                       "Auth"),
    ("(public)/auth/verify",           "AuthVerify",                 "AuthVerify"),
    ("(public)/auth/reset",            "AuthReset",                  "AuthReset"),
    ("(public)/account",               "Account",                    "Account"),
    ("(public)/account/loyalty-rewards/[id]", "LoyaltyRewardDetail","LoyaltyRewardDetail"),
    ("(public)/reset-password",        "ResetPassword",              "ResetPassword"),
    ("(public)/reset-password-phone",  "ResetPasswordPhone",         "ResetPasswordPhone"),
    ("(public)/affiliate",             "Affiliate",                  "Affiliate"),
    ("(public)/sitemap.html",          "Sitemap",                    "Sitemap"),
]

# Redirect-only pages (no src component — just redirect to canonical URL)
REDIRECT_PAGES = [
    # route dir          redirect target
    ("(public)/return-policy",   "/refund-policy"),
    ("(public)/privacy",         "/privacy-policy"),
    ("(public)/terms",           "/terms-conditions"),
]

ADMIN_PAGES = [
    # route dir (under app/)         import from @/src/pages/admin/…  default export name
    ("admin/login",                   "AdminLogin",                     "AdminLogin"),
    ("admin",                         "AdminDashboard",                  "AdminDashboard"),
    ("admin/products",                "admin/AdminProducts",            "AdminProducts"),
    ("admin/categories",              "admin/AdminCategories",          "AdminCategories"),
    ("admin/orders",                  "admin/AdminOrders",              "AdminOrders"),
    ("admin/customers",               "admin/AdminCustomers",           "AdminCustomers"),
    ("admin/blog",                    "admin/AdminBlog",                "AdminBlog"),
    ("admin/reviews",                 "admin/AdminReviews",             "AdminReviews"),
    ("admin/coupons",                 "admin/AdminCoupons",             "AdminCoupons"),
    ("admin/settings",                "admin/AdminSettings",            "AdminSettings"),
    ("admin/shipping",                "admin/AdminShipping",            "AdminShipping"),
    ("admin/currencies",              "admin/AdminCurrencies",          "AdminCurrencies"),
    ("admin/subscribers",             "admin/AdminSubscribers",         "AdminSubscribers"),
    ("admin/migrate",                 "admin/AdminMigrate",             "AdminMigrate"),
    ("admin/homepage-content",        "admin/AdminHomepageContent",     "AdminHomepageContent"),
    ("admin/bouquet",                 "admin/AdminBouquet",             "AdminBouquet"),
    ("admin/events",                  "admin/AdminEvents",              "AdminEvents"),
    ("admin/photography",             "admin/AdminPhotography",         "AdminPhotography"),
    ("admin/popular-gifting",         "admin/AdminPopularGifting",      "AdminPopularGifting"),
    ("admin/home-living",             "admin/AdminHomeLiving",          "AdminHomeLiving"),
    ("admin/account",                 "admin/AdminAccount",             "AdminAccount"),
    ("admin/security",                "admin/AdminSecurity",            "AdminSecurity"),
    ("admin/activity",                "admin/AdminActivityLog",         "AdminActivityLog"),
    ("admin/notification-logs",       "admin/AdminNotificationLogs",    "AdminNotificationLogs"),
    ("admin/cart-addons",             "admin/AdminCartAddons",          "AdminCartAddons"),
    ("admin/bulk-orders",             "admin/AdminBulkOrders",          "AdminBulkOrders"),
    ("admin/affiliates",              "admin/AdminAffiliates",          "AdminAffiliates"),
    ("admin/sitemap",                 "admin/AdminSitemap",             "AdminSitemap"),
    ("admin/loyalty-gifts",           "admin/AdminLoyaltyGifts",       "AdminLoyaltyGifts"),
    ("admin/sellers",                 "admin/AdminSellers",             "AdminSellers"),
    ("admin/seller-payouts",          "admin/AdminSellerPayouts",       "AdminSellerPayouts"),
    ("admin/email-settings",          "admin/AdminEmailSettings",       "AdminEmailSettings"),
    ("admin/delivery/verify/[orderId]","admin/DeliveryOTPVerify",      "DeliveryOTPVerify"),
]

SELLER_PAGES = [
    # route dir (under app/)          import from @/src/pages/seller/… default export name
    ("seller",                         "seller/SellerLogin",             "SellerLogin"),
    ("seller/login",                   "seller/SellerLogin",             "SellerLogin"),
    ("seller/signup",                  "seller/SellerSignup",            "SellerSignup"),
    ("seller/dashboard",               "seller/SellerDashboard",         "SellerDashboard"),
    ("seller/payouts",                 "seller/SellerPayouts",           "SellerPayouts"),
    ("seller/products",                "seller/SellerProducts",          "SellerProducts"),
    ("seller/products/new",            "seller/SellerProductDetail",     "SellerProductDetail"),
    ("seller/products/[id]",           "seller/SellerProductDetail",     "SellerProductDetail"),
    ("seller/products/[id]/edit",      "seller/SellerProductEdit",       "SellerProductEdit"),
]

# ---------------------------------------------------------------------------
# Template helpers
# ---------------------------------------------------------------------------

def wrapper_template(component_name: str, import_path: str) -> str:
    return (
        '"use client";\n'
        f'import {component_name} from "@/src/pages/{import_path}";\n'
        f"export default function Page() {{\n"
        f"  return <{component_name} />;\n"
        "}\n"
    )

def redirect_template(target: str) -> str:
    return (
        'import { redirect } from "next/navigation";\n'
        f'export default function Page() {{\n'
        f'  redirect("{target}");\n'
        "}\n"
    )

# ---------------------------------------------------------------------------
# Generator
# ---------------------------------------------------------------------------

def write_page(route_dir: str, content: str) -> None:
    page_dir = os.path.normpath(os.path.join(APP, route_dir))
    page_file = os.path.join(page_dir, "page.tsx")

    if os.path.exists(page_file):
        print(f"  [SKIP]  {page_file}  (already exists)")
        return

    os.makedirs(page_dir, exist_ok=True)
    with open(page_file, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  [OK]    {page_file}")


def main():
    created = 0
    skipped = 0

    print("\n=== Public pages ===")
    for route_dir, import_path, component_name in PUBLIC_PAGES:
        content = wrapper_template(component_name, import_path)
        before = sum(
            1 for _ in [os.path.join(os.path.normpath(os.path.join(APP, route_dir)), "page.tsx")]
            if os.path.exists(_)
        )
        write_page(route_dir, content)
        after = sum(
            1 for _ in [os.path.join(os.path.normpath(os.path.join(APP, route_dir)), "page.tsx")]
            if os.path.exists(_)
        )
        if before == after:
            skipped += 1
        else:
            created += 1

    print("\n=== Redirect-only pages ===")
    for route_dir, target in REDIRECT_PAGES:
        content = redirect_template(target)
        before = sum(
            1 for _ in [os.path.join(os.path.normpath(os.path.join(APP, route_dir)), "page.tsx")]
            if os.path.exists(_)
        )
        write_page(route_dir, content)
        after = sum(
            1 for _ in [os.path.join(os.path.normpath(os.path.join(APP, route_dir)), "page.tsx")]
            if os.path.exists(_)
        )
        if before == after:
            skipped += 1
        else:
            created += 1

    print("\n=== Admin pages ===")
    for route_dir, import_path, component_name in ADMIN_PAGES:
        content = wrapper_template(component_name, import_path)
        before = sum(
            1 for _ in [os.path.join(os.path.normpath(os.path.join(APP, route_dir)), "page.tsx")]
            if os.path.exists(_)
        )
        write_page(route_dir, content)
        after = sum(
            1 for _ in [os.path.join(os.path.normpath(os.path.join(APP, route_dir)), "page.tsx")]
            if os.path.exists(_)
        )
        if before == after:
            skipped += 1
        else:
            created += 1

    print("\n=== Seller pages ===")
    for route_dir, import_path, component_name in SELLER_PAGES:
        content = wrapper_template(component_name, import_path)
        before = sum(
            1 for _ in [os.path.join(os.path.normpath(os.path.join(APP, route_dir)), "page.tsx")]
            if os.path.exists(_)
        )
        write_page(route_dir, content)
        after = sum(
            1 for _ in [os.path.join(os.path.normpath(os.path.join(APP, route_dir)), "page.tsx")]
            if os.path.exists(_)
        )
        if before == after:
            skipped += 1
        else:
            created += 1

    print(f"\nDone! {created} files created, {skipped} skipped (already existed).")


if __name__ == "__main__":
    main()
