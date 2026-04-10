# remove_background

Batch test harness for trying remove.bg on the fighters that are currently
mapped in `Fighter_Images/_manifest.json`.

What it does:

- copies only mapped source images into `remove_background/input/mapped-originals/`
- preserves the original filenames in the copied input set
- sends each copied file to remove.bg
- writes transparent PNG results into `remove_background/output/removebg/`
- keeps the original base filename for outputs
- writes a JSON summary log into `remove_background/logs/`

Notes:

- output files are always `.png` because transparent background output should
  stay in a format with alpha support
- this uses the official remove.bg API directly instead of downloading a
  separate CLI binary, but it hits the same hosted remove.bg service
- the batch script and the Gemini generation workflow both read
  `REMOVE_BG_API_KEY` from `.env.local` first, then `.env`, so rotating keys is
  a one-line replacement in one place
- images are sent to a third-party service, so only use this for assets you are
  comfortable uploading externally

## Commands

Prepare the mapped input set:

```bash
node remove_background/batch-removebg.mjs prepare
```

Run a small sample batch first:

```bash
node remove_background/batch-removebg.mjs process --limit 5
```

Prepare a sample directly from the pixel-art fighter folder:

```bash
node remove_background/batch-removebg.mjs prepare-dir \
  --source-dir public/fighters/pixel \
  --input-subdir pixel-sample-originals \
  --limit 5
```

Process that pixel-art sample into a separate output folder:

```bash
node remove_background/batch-removebg.mjs process \
  --input-subdir pixel-sample-originals \
  --output-subdir removebg-pixel-sample
```

Run the full mapped set:

```bash
node remove_background/batch-removebg.mjs process
```

Re-run and overwrite existing outputs:

```bash
node remove_background/batch-removebg.mjs process --overwrite
```

## Folder layout

- `input/mapped-originals/`
- `input/pixel-sample-originals/`
- `output/removebg/`
- `output/removebg-pixel-sample/`
- `logs/`
