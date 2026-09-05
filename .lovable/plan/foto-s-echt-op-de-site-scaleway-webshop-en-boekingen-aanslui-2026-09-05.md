# Foto's echt op de site + Scaleway, webshop en boekingen aansluiten

## Wat ik nagekeken heb (feiten)

- De nieuwe fotobibliotheek staat in de Europese opslag in Parijs en is publiek leesbaar: alle **171 foto's** die in de code beschreven staan, zijn getest en geven alle 171 een geldig antwoord (map `bibliotheek/`, o.a. 31 alpaca, 15 geiten, 13 schapen, 13 erf/gebouwen, 12 paden, 10 moestuin, 10 pauwen, 9 vijver, 9 pony's, 8 Trojaans paard, 8 kinderen, 7 educatie, 6 kippen, 6 eenden/ganzen, 4 ezels, 3 boomgaard, 3 konijnen, 2 knaagdieren, 2 speeltuin).
- Die bibliotheek wordt **nergens op de site gebruikt**: het bestand met de 171 foto's wordt door geen enkele pagina ingelezen.
- De albums bij "De bewoners" en de sfeerbanden bovenaan de pagina's werken nog met de **oude, kleine set** (1 tot 4 foto's per dier: kippen, eenden, konijnen hebben er zelfs maar één).
- De swipebare carrousel, de sfeerband, de beheerpagina's voor albums en media, en het opslaan van teamfoto's in de databank bestaan al en werken samen. Er is dus geen nieuw systeem nodig, alleen vullen en aansluiten.
- Er zijn **nog geen sleutels ingesteld** in dit project: geen opslagsleutels (Scaleway), geen databank, geen betaalsleutels. Daardoor kan het team nu nog niets uploaden of verwijderen, en zijn bestellingen/boekingen niet zichtbaar. Lezen van bestaande foto's werkt wel, want de opslag is publiek.
- Er zit een tekstfout in de vertalingen: op verschillende plekken is het woord "bewoners" weggevallen ("De il", "Stadsil", "buurtil"). Dat raakt ongeveer tien tekstbestanden.
- De startfoto bovenaan de hoofdpagina blijft ongewijzigd, zoals gevraagd.

## Stap 1 — Sleutels opvragen (jij)

Ik open beveiligde formulieren voor:

1. **Opslag in Parijs (Scaleway)**: sleutel + geheime sleutel van de bucket, zodat het team foto's kan toevoegen en verwijderen.
2. **Databank**: de verbinding, zodat albums, bestellingen en boekingen bewaard en zichtbaar worden.
3. **Betalingen (Stripe)**: de geheime sleutel, de publieke sleutel en het webhookgeheim, voor de winkelmand en betaling.

Je hoeft niets in de chat te plakken: je vult ze in het beveiligde venster in.

## Stap 2 — Foto's echt tonen

- **De bewoners**: elk dier krijgt zijn volledige album uit de bibliotheek — alpaca's, geiten, schapen, ezels, pony's, pauwen, kippen, eenden & ganzen, konijnen, cavia's — als swipebare reeks (vegen op gsm, pijltjes en stipjes op desktop).
- **Moestuin, boomgaard, vijver, erf, paden**: swipebare reeksen met de foto's uit die mappen.
- **Bezoekpagina**: reeksen met kinderen, speeltuin, moestuin en erf.
- **Sfeerbeelden bovenaan de pagina's**: vervangen door de mooiste nieuwe foto's, met de juiste uitsnede voor gsm (hoger, dichter bij het onderwerp) en desktop (breed panorama). Elke pagina houdt vast dezelfde foto, geen willekeur meer.
- **Templates en overige pagina's** (evenementen, educatie, kampen, verhuur, seminaries, compost, steun, vacatures, contact, over ons, transparantie, partners, vrijwilligers, nieuws, veelgestelde vragen): pagina per pagina nagekeken en waar beeld ontbreekt of zwak is, aangevuld uit de bibliotheek.
- Elke foto krijgt een bijschrift in NL/FR/EN, laadt pas als hij in beeld komt en heeft een nette terugvalweergave als er iets misgaat.

## Stap 3 — Het team kan zelf foto's beheren

- In het beheerportaal: per album (elk dier en elk thema) foto's toevoegen, herordenen, bijschrift aanpassen en verwijderen — ook de nieuwe reeksen.
- Uploaden gaat rechtstreeks naar de Europese opslag; verwijderen haalt de foto ook echt weg.
- De site toont eerst de vaste foto's en daarna wat het team zelf toevoegt, zonder dubbels.
- Ik schrijf een korte uitleg in het portaal: waar de bibliotheek staat, hoe je een album vult, en wat de beste beeldverhouding is.

## Stap 4 — Webshop en boekingen aansluiten

- Winkelmand en afrekenen met betaling of "betalen bij afhaling", met bevestigingsmail, QR-afhaalpas en factuur.
- Boeking van bezoeken en activiteiten met bevestiging.
- Eén administratiepagina waar het team bestellingen en boekingen ziet: status, bedrag, betaald of nog te betalen, en de detailgegevens.
- De nog niet uitgevoerde databankstap uit de takenlijst (0031, plus de albumtabel) wordt uitgevoerd zodra de databankverbinding er is.

## Stap 5 — Tekstfout herstellen

Het weggevallen woord "bewoners" wordt in alle betrokken teksten hersteld (NL/FR/EN nagekeken).

## Stap 6 — Volledige controle

Alle pagina's in de drie talen op gsm- en desktopformaat doorlopen, elke foto op laden en uitsnede controleren, de beheerpagina's testen (toevoegen, herordenen, verwijderen), een testbestelling en testboeking doorlopen, en de typecontrole en tests laten slagen.

## Technische aantekeningen

- `src/lib/photo-library.ts` (171 foto's, publieke Scaleway-URL's) wordt de bron: albumsleutels uit `photo-albums.ts` worden op de bibliotheekmappen gemapt, en `mergedCarousel` blijft de vaste + beheerde foto's samenvoegen.
- `PagePhotoBand` krijgt expliciete keuzes per pagina in plaats van de hash-selectie, met `<picture>`/`srcSet` en aparte uitsnede voor mobiel en desktop (`object-position`).
- Cavia's/knaagdieren en eenden & ganzen worden aan `SPECIES_ALBUM` toegevoegd.
- Migraties: `neon/migrations/0031_*` en `0032_album_photos.sql` uitvoeren zodra `DATABASE_URL` bestaat; zonder verbinding blijft de site in fallback-mode (lege lijsten, geen crash).
- Secrets: `S3_ACCESS_KEY`, `S3_SECRET_KEY` (+ eventueel `S3_BUCKET_NAME`, `S3_ENDPOINT`, `S3_REGION`, `S3_PUBLIC_URL_PREFIX`, `S3_CORS_ORIGINS`), `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`. Webhook-URL wordt eerst opgeleverd, daarna het webhookgeheim opgevraagd.
- Zonder Stripe-sleutels blijft de winkel werken in "betalen bij afhaling"; de betaalknop toont dan een duidelijke melding in plaats van een fout.
