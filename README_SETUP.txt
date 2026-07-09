# Custom Suits Configurator MVP (Blue Suit)

## Quick setup
1. Copy `.env.example` to `.env.local` and fill Supabase keys if you want live CMS/orders.
2. Run:
   npm install
   npm run dev

## Admin access
- If `ADMIN_ACCESS_TOKEN` is set, open `/admin?token=YOUR_TOKEN` once to set the cookie.

## Assets
- Static sprites live in `public/assets/suits/transparent/`.
- Check for missing sprites:
  npm run check:sprites

## Notes
- If Supabase keys are missing, fabrics/linings load from `data/*.json` and orders are stored in `data/orders.json`.
- Images are torso-only (no sleeves or bottom). Add new layers later as separate overlays.

## Email setup
- In cPanel, create mailboxes `info@santos.rs` and `sales@santos.rs`.
- In Resend, verify the `santos.rs` domain before enabling production emails, then confirm SPF, DKIM and DMARC DNS records are valid.
- Set `RESEND_API_KEY` in the deployment environment.
- Set `MAIL_FROM` to a verified sender, for example `Santos & Santorini <info@santos.rs>`.
- Set `MAIL_REPLY_TO` to a real inbox, for example `info@santos.rs`.
- Set `ORDER_NOTIFICATION_EMAIL` and `CONTACT_NOTIFICATION_EMAIL` to the desired inboxes, for example `sales@santos.rs,info@santos.rs`.
