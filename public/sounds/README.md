# Sound alert assets

Default short alert tones for PWA sound alerts (`SOUND-ALERTS-01`).

| File | Event |
|------|--------|
| `new-order.wav` / `new-order.mp3` | New customer QR order pending cashier |
| `kitchen-ticket.wav` / `kitchen-ticket.mp3` | New kitchen ticket (queued) |
| `critical-alert.wav` / `critical-alert.mp3` | Critical in-app notification |

The app loads `.wav` first, then `.mp3`, then falls back to synthesized tones if files are missing.

Replace these files in production with branded, non-annoying clips under 2 seconds.
