#!/bin/bash
# Uploads the block library to DA (aemsites/fedex): placeholder images, one document per block
# (sections wrapped in the DA body/main shell, images pointing at the uploaded placeholders),
# blocks.json; then previews the documents so they can be checked on aem.page.
R=/backups/aemsites/fedex/repo
L=$R/content/docs/library
W=$R/migration-work/library  # converted DA documents (not committed)
DA=https://admin.da.live/source/aemsites/fedex
IMG=https://content.da.live/aemsites/fedex/docs/library/blocks/images
mkdir -p "$W/da"
for p in placeholder-4x3.png placeholder-16x9.png; do
  echo "img $p $(curl -s -o /dev/null -w '%{http_code}' -X POST -F "data=@$L/blocks/images/$p;type=image/png" "$DA/docs/library/blocks/images/$p")"
done
for f in "$L"/blocks/*.plain.html; do
  b=$(basename "$f" .plain.html)
  { printf '<body><header></header><main>'; sed "s#\./images/#$IMG/#g" "$f"; printf '</main><footer></footer></body>'; } > "$W/da/$b.html"
  echo "doc $b $(curl -s -o /dev/null -w '%{http_code}' -X POST -F "data=@$W/da/$b.html;type=text/html" "$DA/docs/library/blocks/$b.html") $(curl -s -o /dev/null -w '%{http_code}' -X POST "https://admin.hlx.page/preview/aemsites/fedex/main/docs/library/blocks/$b")"
done
curl -s -o /tmp/da-upload-source.json -w 'blocks.json %{http_code}\n' -X POST -F "data=@$L/blocks.json;type=application/json" "$DA/docs/library/blocks.json"
cat /tmp/da-upload-source.json; echo
