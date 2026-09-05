# Bewoners en fotoalbums samenbrengen

De site heeft vandaag twee losse zaken: de fotoalbums (per thema of per dier) in het beheer, en de dieren zelf ("De bewoners") die nergens te bewerken zijn. Daardoor blijft de foto van bijvoorbeeld Pino leeg. Dit plan brengt beide samen.

## 1. Duidelijke keuzelijst in Fotoalbums

De keuzelijst "Album" krijgt twee duidelijke kopjes in plaats van één lange lijst:

- **Individuele bewoners** — de echte dieren uit de databank, met naam en soort (bv. "Pino (Konijn)", "Boudewijn (Ezel)", "Margot (Geit)").
- **Algemene thema's** — de bestaande thema-albums (Het erf, De vijver, Moestuin, Konijnen, Geiten …).

Als je foto's uploadt in het album van één dier en dat dier heeft nog geen profielfoto, verschijnt meteen de vraag "Deze foto instellen als profielfoto van Pino?". Bij elke foto in een dierenalbum komt ook een knopje "Als profielfoto instellen".

## 2. Nieuwe beheerpagina "Bewoners & dieren"

Een nieuwe pagina in het beheerportaal, naast Fotoalbums, waar je per dier naam, soort, verhaaltje en profielfoto aanpast. Bij elk dier:

- knop **"Foto wijzigen"** die de mediabibliotheek opent (dezelfde bibliotheek als bij de producten, met mappen, zoeken en uploaden);
- knop om naar het fotoalbum van dat dier te springen;
- de profielfoto wissen (dan valt de site terug op het album, zie punt 3).

## 3. Nooit meer een leeg grijs vakje op de site

Bij "De bewoners" op de startpagina (en op de dierenpagina's) geldt voortaan deze volgorde:

1. de eigen profielfoto van het dier;
2. anders de recentste foto uit het persoonlijke album van dat dier;
3. anders de recentste foto uit het thema-album van die soort (bv. Konijnen);
4. anders een vaste boerderijfoto van die soort;
5. en als er echt niets is: een verzorgde illustratie met de naam van het dier in de huisstijl, in plaats van een grijs vlak.

## 4. Controle

Volledige typecontrole van het project (`bunx tsgo --noEmit`) en een blik op de startpagina en de nieuwe beheerpagina in de preview.

---

## Technische details

- `src/lib/data.functions.ts` — `getAnimals` blijft de publieke bron; residentsfoto's worden client-side samengevoegd met `useAlbumPhotos()`.
- Nieuwe `src/lib/animals-admin.functions.ts` — `listAnimalsAdmin`, `updateAnimal` (naam, soort, beschrijving), `setAnimalImage` (image_url + optioneel file_key), beveiligd met de bestaande `requirePermission("manage_media")`-aanpak uit `shop-admin.functions.ts`; invalidatie van de `["animals"]`-query.
- Nieuwe `src/components/portal/pages/AnimalsPage.tsx` + registratie in `PortalRoot.tsx` (`PAGES`, `PAGE_PERMISSION: view_media`), `portal-routes.ts` (`PortalPage` "animals", slugs `bewoners` / `residents` / `residents`), `PortalShell.tsx`-navigatie en `portal-i18n.ts` (`nav.animals`). Hergebruikt `MediaLibraryModal` uit `src/components/admin/media/`.
- `src/components/portal/pages/AlbumsPage.tsx` — keuzelijst met `SelectGroup`/`SelectLabel` ("Individuele bewoners", "Algemene thema's"), dieren gesorteerd op naam; na `addMutation` een bevestigingsdialoog die `setAnimalImage` aanroept; per foto in een dierenalbum een sterknop.
- Nieuwe helper `src/lib/resident-photo.ts` — `residentPhoto(animal, albumMap)` met de vijftrapsvolgorde uit punt 3, gebruikt door `src/pages/home.tsx` (EditorialGrid), `src/pages/animals.tsx` en `src/pages/sponsor.tsx`; laatste trap is een nieuwe `ResidentPlaceholder`-component (huisstijlkleuren + `animalIllustration`/`PawPrint` + naam).
- De doelbestandsnamen uit de vraag (`PhotoAlbumsManager.tsx`, `AnimalManager.tsx`, `ResidentsCarousel.tsx`) bestaan niet in dit project; de gelijkwaardige bestaande bestanden hierboven worden aangepast.
