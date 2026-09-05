# Roadmap

## Open
- [ ] Farm map dataset (`src/data/farmMapDataset.ts`) + InteractiveMap component + zone popups
- [ ] Digital animal passport redesign (`/{lang}/dieren/:slug`): hero, passport grid, feeding warning, chat banner, facts, gallery, adoption CTA, sound button
- [ ] Chat persona via `?persona=slug` + QR trail mode (`?source=qr`): badge, auto-speech, photo button
- [ ] Weather emergency banner (wind > 60 km/h or rain > 10 mm/h) on homepage
- [ ] API key management: `api_keys` table, portal tab "API & Integraties", bearer middleware, `/api/v1/*` endpoints
- [ ] Admin Co-Pilot: `/api/admin/co-pilot`, tools (site settings, services, hours, hero/product/email media), chat UI with image upload to Scaleway, preview cards, undo
- [ ] Email shell: logo/banner from site_settings instead of static paths
- [ ] Sponsorship portal `/steun-ons/adopteer`: animal + tier picker, Stripe checkout, certificate PDF
- [ ] Final `bunx tsgo --noEmit`

## Done
- [x] Infra audit (Neon, Scaleway, migrations, secrets)

## Checkout & afhaalpas (nieuw)
- [x] CartDrawer: los vinkje weg, payOnPickup via useSiteConfig().payments, OrderPaymentModal i.p.v. CheckoutModal, QR + PDF op bevestiging
- [x] account.tsx + listMyOrders: badges Betaald / Te betalen bij afhaling + link naar afhaalpas
- [x] bunx tsgo --noEmit (schoon)
- [ ] Migratie 0031 uitvoeren — wacht op DATABASE_URL
