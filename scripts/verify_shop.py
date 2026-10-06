"""Pre-push check for the TCH Works shop. Run before every push:

    python3 scripts/verify_shop.py

Fails (exit 1) if a template page is missing, a preview image is missing, internal
notes leak into customer-visible text, the wrong contact email appears, or an
internal link points at a page that doesn't exist.
"""
import glob
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
errors = []

# 1. every catalogue product has a page, both URL forms, and preview images
cat = json.load(open("shop/catalogue.json"))
for slug, p in cat.items():
    for path in (f"shop/{slug}/index.html", f"shop/{slug}.html", f"img/p/{slug}/card.webp", f"img/p/{slug}/1.webp"):
        if not os.path.exists(path):
            errors.append(f"missing {path}")
    page = open(f"shop/{slug}/index.html", encoding="utf-8").read() if os.path.exists(f"shop/{slug}/index.html") else ""
    if p["buy"] not in page:
        errors.append(f"{slug}: product page does not use its own checkout link")

# 2. no internal words in customer-visible text
BANNED = re.compile(r"\b(soft stripe|soft mini|soft sku|magnet|bait|upsell|tripwire|funnel|locked eight|tills?\b|"
                    r"owned discovery|not a daily push|sticky cta|social caption)", re.I)
SKIP = ("mercieca-recruitment/", "tr-connect/", "tch-connect/", "f/")
for f in glob.glob("**/*.html", recursive=True):
    if f.startswith(SKIP):
        continue
    s = open(f, encoding="utf-8", errors="ignore").read()
    if "hello@tch.works" in s:
        errors.append(f"{f}: wrong contact email hello@tch.works (use hello@tchworks.co.uk)")
    vis = re.sub(r"<script.*?</script>|<style.*?</style>|<!--.*?-->", "", s, flags=re.S)
    vis = html.unescape(re.sub(r"<[^>]+>", " ", vis))
    for m in set(x.lower() for x in BANNED.findall(vis)):
        if m == "magnet" and "a magnet, a pen" in vis:
            continue
        errors.append(f"{f}: internal word on a customer page: {m!r}")
    # 3. internal links resolve
    for h in re.findall(r'(?:href|src)="(/[^"#?]*)', s):
        p = h.lstrip("/")
        cands = ["index.html"] if p == "" else [p, p + ("index.html" if p.endswith("/") else "/index.html"), p + ".html"]
        if not any(os.path.isfile(c) for c in cands):
            errors.append(f"{f}: broken link {h}")

# 4. Daily guides must end on a template card
SERVICES = ("dfy-chatbot", "ai-freelancer-ops-setup", "ai-admin-setup-audit", "custom-prompt-library",
            "proposal-writing-250")
for f in glob.glob("daily/*/index.html"):
    s = open(f, encoding="utf-8").read()
    box = re.search(r'<aside class="upsell.*?</aside>', s, re.S)
    if box and any(f"/shop/{x}" in box.group(0) for x in SERVICES):
        continue  # guides that sell a booked service keep their own box
    if 'data-tch="card"' not in s:
        errors.append(f"{f}: Daily page has no template card at the end (run shop_site/build_site.py)")

if errors:
    print(f"FAIL: {len(errors)} problem(s)")
    for x in sorted(set(errors))[:200]:
        print("  -", x)
    sys.exit(1)
print(f"OK: {len(cat)} templates, all pages, previews, links and wording checked")
