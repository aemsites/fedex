#!/bin/bash
# Uploads the block library to DA (aemsites/fedex): placeholder images, one document per block
# (sections wrapped in the DA body/main shell, images pointing at the uploaded placeholders),
# blocks.json; then previews the documents so they can be checked on aem.page.
# Usage: upload-block-library.sh [block ...]  (only these blocks' documents; default: all)
R=${REPO:-$(cd "$(dirname "$0")/../.." && pwd)}
L=$R/content/docs/library
W=$R/migration-work/library  # converted DA documents (not committed)
DA=https://admin.da.live/source/aemsites/fedex
IMG=https://content.da.live/aemsites/fedex/docs/library/blocks/images
[ -f "$L/blocks.json" ] || { echo "no library in $L: run gen-block-library.py first (or set REPO)"; exit 1; }
mkdir -p "$W/da"
if [ $# -eq 0 ]; then
  for p in placeholder-4x3.png placeholder-16x9.png; do
    echo "img $p $(curl -s -o /dev/null -w '%{http_code}' -X POST -F "data=@$L/blocks/images/$p;type=image/png" "$DA/docs/library/blocks/images/$p")"
  done
  set -- $(cd "$L/blocks" && ls -- *.plain.html | sed 's/\.plain\.html$//')
fi
for b in "$@"; do
  f=$L/blocks/$b.plain.html
  [ -f "$f" ] || { echo "doc $b missing (run gen-block-library.py $b first)"; continue; }
  { printf '<body><header></header><main>'; sed "s#\./images/#$IMG/#g" "$f"; printf '</main><footer></footer></body>'; } > "$W/da/$b.html"
  echo "doc $b $(curl -s -o /dev/null -w '%{http_code}' -X POST -F "data=@$W/da/$b.html;type=text/html" "$DA/docs/library/blocks/$b.html") $(curl -s -o /dev/null -w '%{http_code}' -X POST "https://admin.hlx.page/preview/aemsites/fedex/main/docs/library/blocks/$b")"
done
curl -s -o "$W/blocks-upload.json" -w 'blocks.json %{http_code}\n' -X POST -F "data=@$L/blocks.json;type=application/json" "$DA/docs/library/blocks.json"
