# Star Ops catalog sync

Add `scripts/sync-star-citizen-catalog.mjs` and `.github/workflows/update-catalog.yml` to your repo.

## package.json
Add:

```json
{
  "scripts": {
    "sync:catalog": "node scripts/sync-star-citizen-catalog.mjs"
  }
}
```

## GitHub secret
Set `UEX_API_KEY` in your repo secrets.

## Output files
- `src/data/generated/weapons.json`
- `src/data/generated/armor.json`
- `src/data/generated/attachments.json`
- `src/data/generated/resources.json`
- `src/data/generated/locations.json`
- `src/data/generated/vendors.json`
- `public/star-citizen-catalog.json`
- `reports/catalog-sync-report.json`
