"""
fix_pages.py
------------
1. Fixes wrong import paths:  @/src/pages/ --> @/pages/
2. Deletes duplicate page.tsx files that live OUTSIDE (public)/ but clash with (public)/ ones.
Run: python scripts/fix_pages.py
"""

import os, re, shutil

ROOT = os.path.join(os.path.dirname(__file__), "..")
APP  = os.path.normpath(os.path.join(ROOT, "app"))

# ── 1. Fix import paths in every page.tsx under app/ ───────────────────────
print("=== Fixing import paths (@/src/pages/ -> @/pages/) ===")
fixed = 0
for dirpath, _, files in os.walk(APP):
    for fname in files:
        if fname != "page.tsx":
            continue
        fpath = os.path.join(dirpath, fname)
        with open(fpath, encoding="utf-8") as f:
            content = f.read()
        new_content = content.replace('@/src/pages/', '@/pages/')
        if new_content != content:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"  [FIXED]  {os.path.relpath(fpath, ROOT)}")
            fixed += 1
print(f"  {fixed} files updated.\n")

# ── 2. Delete orphan pages outside (public)/ that duplicate (public)/ routes ─
# These were created by the earlier manual attempts before the script ran.
ORPHANS = [
    os.path.join(APP, "shop", "page.tsx"),
]

print("=== Removing duplicate pages outside (public)/ ===")
for path in ORPHANS:
    if os.path.exists(path):
        os.remove(path)
        # Remove the parent dir if now empty
        parent = os.path.dirname(path)
        if not os.listdir(parent):
            shutil.rmtree(parent)
        print(f"  [DELETED] {os.path.relpath(path, ROOT)}")
    else:
        print(f"  [SKIP]    {os.path.relpath(path, ROOT)}  (not found)")

print("\nDone!")
