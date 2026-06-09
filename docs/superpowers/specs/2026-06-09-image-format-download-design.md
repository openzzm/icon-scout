# Image Format Download Design

## Goal

Extend Icon Scout so every available icon can be downloaded in its original format or converted to PNG, JPEG, or WebP.

## Behavior

- Add a format selector beside each download action.
- Default to the original format.
- `Original` streams the source bytes unchanged.
- `PNG` and `WebP` preserve transparency.
- `JPEG` flattens transparency onto a white background.
- Converted files use the selected extension and matching content type.
- Invalid formats return a clear `400` response.
- Unreadable or unsupported source images return a clear conversion error.

## Architecture

- Add `sharp` as the server-side image conversion dependency.
- Keep conversion inside `/api/icon-file` using a `format` query parameter.
- Keep existing URL validation, response size limits, and proxy behavior unchanged.
- Add a small reusable format selector to the recommended result and candidate cards.

## Acceptance Criteria

- Original downloads remain byte-for-byte unchanged.
- A supported source icon can be downloaded as PNG, JPEG, and WebP.
- JPEG output has no alpha channel and uses a white background.
- Converted filenames and content types match the selected format.
- Automated tests cover original passthrough, conversion, and invalid formats.
