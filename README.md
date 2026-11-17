# ALL

Jouw persoonlijke thuisbasis: één app met een dashboard voor je dag, later ook een huis voor agents, workflows en een websitebouwer. De stijl is een neon Japanse stad in pixel-art: elke module, agent en taak is een eigen blok op de kaart.

## Wat er nu in zit (fase 0 en 1)

- **Stad**: de kaart met al je blokken. Elke open taak krijgt een eigen blokje met een lantaarn. Er is ook een lijstweergave.
- **Taken**: toevoegen, project en deadline, bewerken, afvinken, verwijderen.
- **Agenda**: afspraken per dag, met tijd en plaats.
- **Notities**: schrijven, bewerken, zoeken.
- **Geheugen**: alles wat ALL over jou onthoudt. Jij ziet het, past het aan en wist het.
- **Logboek**: elke wijziging, met een knop om terug te draaien waar dat kan.
- **Vraag ALL** begrijpt korte zinnen, zonder AI: "afspraak tandarts donderdag om 14:30", "taak naam kiezen morgen #ALL", "onthoud dat ik maandag vrij ben", "noteer ideeën: lantaarn als logo". Er komt eerst een **concept** in *Wacht op jouw akkoord*; pas als jij goedkeurt wordt het echt. Andere tekst wordt een zoekopdracht.
- **Briefing** van vandaag, berekend uit je eigen agenda en taken.
- **Zoeken** in alles, **Nederlands en Engels**, en **back-up** downloaden en terugzetten.
- Installeerbaar op telefoon en computer (PWA).
- **Login en cloud** (Supabase), met tweestapsverificatie. Zie [SETUP.md](SETUP.md).

Mail, workflows, de onderzoeker en de websitebouwer zijn al zichtbaar als "komt later"-blokken, met de fase waarin ze komen. In fase 2 neemt Claude het begrijpen van zinnen over; de goedkeuringsstap blijft dezelfde.

## Waar je gegevens staan

- **Zonder Supabase** (zoals nu): alleen in je browser, op dat ene toestel. Download af en toe een back-up via **Instellingen**.
- **Met Supabase**: je logt in (met tweestapsverificatie als je wilt) en je gegevens staan in de cloud, hetzelfde op al je toestellen. Elke wijziging gaat binnen twee seconden naar de cloud; als je terugkomt in de app haalt hij de nieuwste versie op. Staan er op een toestel andere gegevens dan in de cloud, dan vraagt ALL welke je wilt houden. Er gaat nooit zomaar iets verloren.

Hoe je Supabase instelt staat stap voor stap in **[SETUP.md](SETUP.md)**.

## Zelf starten

Je hebt [Node.js](https://nodejs.org) 20 of nieuwer nodig.

```bash
npm install
npm run dev        # open http://localhost:3000
```

## Online zetten (gratis)

1. Maak een account op [vercel.com](https://vercel.com) (met je GitHub).
2. Kies **Add New → Project** en selecteer de repo `all`.
3. Klik **Deploy**. Je hoeft niets in te stellen.

Elke keer dat er nieuwe code in de repo komt, zet Vercel de nieuwe versie automatisch online.

## Testen

```bash
npm run typecheck   # TypeScript
npm test            # logica: opslaan, terugdraaien, back-up
npm run build && node tests/e2e/run.mjs   # klikt in Chrome door de hele app

# login, tweestapsverificatie en synchroniseren, tegen een nagebootste Supabase:
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test npx next build
mv out out-cloud && node tests/e2e/cloud.mjs out-cloud
```

## Hoe de code in elkaar zit

```
src/app/            de schermen (stad, taken, agenda, notities, geheugen, logboek, ...)
src/components/     menubalk, stadskaart, knoppen en meldingen
src/lib/core.ts     alle logica, zonder browser: wijzigen, loggen, terugdraaien, back-up
src/lib/store.ts    opslag in de browser
src/lib/cloud.ts    Supabase: login en synchroniseren tussen toestellen
supabase/schema.sql de tabel en de beveiligingsregels in Supabase
src/lib/parse.ts     zinnen omzetten naar concepten (zonder AI)
src/lib/briefing.ts de dagelijkse briefing
src/lib/i18n.ts     alle teksten in het Nederlands en Engels
src/lib/city.ts     posities van de blokken op de kaart
public/img/         de pixel-art
```

## Ontwerpprincipes

1. Goedkeuring eerst: niets gaat naar buiten zonder jouw klik.
2. Alles staat in het logboek en is terug te draaien waar het kan.
3. Klein en af: liever drie dingen goed dan tien half.
4. Jij beheert je geheugen.

## Volgende fasen

| Fase | Wat |
| --- | --- |
| 2 | De assistent: een chat die je taken, notities en agenda kent. Alles met goedkeuring. |
| 3 | Mail (Gmail, eerst alleen lezen) en workflows. |
| 4 | Agents-huis: eigen agents, schema's, ochtendbriefing. |
| 5 | Websitebouwer. |
| 6 | Levensdomeinen: geld, gezondheid, leren, werk. |
| 7 | Chat-koppelingen (Telegram of Slack) en verfijnen. |
