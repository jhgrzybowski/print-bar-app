# Canon MG5350 Option Mapping

This note records how the web app's friendly print settings map to the Canon
MG5350 options reported by `local_printer_api` in `debug/canon_options.json`.
It exists as a reference for future option handling improvements.

The web app uses UI values such as `normal`, `long-edge`, and `grayscale`.
The API accepts those values and translates them to Canon/Gutenprint/CUPS
options discovered from `/options`.

## Complete Mapping

| UI element | UI value | API request value | MG5350 / CUPS option used | Supported | Notes |
| --- | --- | --- | --- | --- | --- |
| Copies | `1-99` | `copies: number` | `copies=<n>` | Yes | Standard CUPS option, not discovered from `/options`. |
| Page range | `all`, `1`, `1-3` | `pages: null/string` | Backend filters pages before printing | Yes | Not a printer option. Backend preserves requested page order. |
| Paper size | `A4` | `paper_size: "A4"` | `PageSize=A4` | Yes | Reported by printer. |
| Paper size | `A5` | `paper_size: "A5"` | `PageSize=A5` | Yes | Reported by printer. |
| Paper size | `Letter` | `paper_size: "Letter"` | `PageSize=Letter` | Yes | Reported by printer. |
| Orientation | Portrait | `orientation: "portrait"` | `StpOrientation=Portrait` | Yes | Gutenprint-specific mapping. |
| Orientation | Landscape | `orientation: "landscape"` | `StpOrientation=Landscape` | Yes | Gutenprint-specific mapping. |
| Color | Color | `color_mode: "color"` | `ColorModel=RGB` | Yes | From `/options.color_modes.mapping`. |
| Color | Grayscale | `color_mode: "monochrome"` | `ColorModel=Gray` | Yes | UI says grayscale, API says monochrome, printer says Gray. |
| Duplex | None | `duplex: "none"` | `Duplex=None` | Yes | Simplex. |
| Duplex | Long edge | `duplex: "long-edge"` | `Duplex=DuplexNoTumble` | Yes | Correct for normal portrait double-sided pages. |
| Duplex | Short edge | `duplex: "short-edge"` | `Duplex=DuplexTumble` | Yes | Flip on short edge. |
| Quality | Draft | `quality: "draft"` | `Resolution=300dpi` | Yes | This is what Draft means for MG5350. |
| Quality | Normal | `quality: "normal"` | `Resolution=600dpi` | Yes | Safe/default quality. |
| Quality | High | `quality: "high"` | none | No | `/options.quality.recommended_mapping.high` is `null`. |
| Fit to page | On | `fit_to_page: true` | `StpiShrinkOutput=Shrink` | Yes | Gutenprint exposes shrink/crop/expand, not a generic IPP fit option. |
| Fit to page | Off | `fit_to_page: false` | omitted/ignored | Yes | Backend intentionally ignores false. |
| Media type | Plain | `media_type: "Plain"` | `MediaType=Plain` | Yes | Printer reports capitalized `Plain`; avoid lowercase fallback mismatch. |
| Media type | Photo | `media_type: "photo"` or mapped value | `MediaType=PhotoPlusGloss2` | Yes | API has semantic mapping. |
| Media type | Glossy | `media_type: "glossy"` or mapped value | `MediaType=GlossyPaper` | Yes | API has semantic mapping. |
| Media type | Matte | `media_type: "matte"` or mapped value | `MediaType=PhotopaperMatte` | Yes | API has semantic mapping. |
| Collate | On | `collate: true` | none | No | MG5350 does not report `Collate` support. |
| Collate | Off | omitted/false | none | Safe | For this printer, collate should not be sent. |

## Backend Mapping Notes

Messages like these are backend diagnostics for successful mappings, not print
failures:

- `Mapped duplex through detected PPD Duplex option`
- `Mapped orientation through detected PPD StpOrientation option`
- `Mapped color mode through detected PPD ColorModel option`
- `Mapped quality through detected PPD Resolution option`
- `Mapped fit_to_page through detected StpiShrinkOutput option`
- `Printed pages preserve the user-specified page order.`

The frontend should avoid presenting these as user-facing warnings. They are
useful for debugging because they show exactly how semantic app settings were
translated for the printer.

## Unsupported For Current MG5350 Capture

Only these user-facing selections should be treated as unavailable for the
captured MG5350 options:

- `Quality: High`
- `Collate: On`

Everything else in the tested duplex portrait flow is supported and mapped
correctly.
