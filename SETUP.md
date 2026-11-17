# ALL: login en cloud instellen

Dit doe je één keer, samen met een ouder. Reken op een half uur. Zolang dit niet gebeurd is, werkt ALL gewoon op één toestel.

> **Nooit doen:** sleutels of wachtwoorden in de chat plakken, in de code zetten of doorsturen. Ze gaan alleen in Vercel.

## 1. Supabase-project maken (gratis)

1. Ga naar [supabase.com](https://supabase.com) en maak een account (bijvoorbeeld met GitHub).
2. Klik **New project**.
   - **Name:** `all`
   - **Database password:** laat Supabase er een maken en bewaar het in een wachtwoordmanager.
   - **Region:** kies een regio in Europa, bijvoorbeeld *Frankfurt* of *Ireland*.
   - **Plan:** Free.
3. Wacht tot het project klaar is (een paar minuten).

## 2. De tabel maken

1. Open in je project **SQL Editor** → **New query**.
2. Open het bestand [`supabase/schema.sql`](supabase/schema.sql) uit deze repo, kopieer alles en plak het erin.
3. Klik **Run**. Je moet "Success" zien.

Wat dit doet: één tabel waarin je gegevens staan, met regels die ervoor zorgen dat alleen jij jouw gegevens ziet. Zet je later tweestapsverificatie aan, dan gaan je gegevens pas open nadat je de code hebt ingetypt.

## 3. Login instellen

1. Ga naar **Authentication** → **URL Configuration**.
   - **Site URL:** `https://all-seven-opal.vercel.app`
   - Bij **Redirect URLs**: voeg `https://all-seven-opal.vercel.app/**` toe.
2. Ga naar **Authentication** → **Sign In / Providers** → **Email**. Laat **Confirm email** aan.

## 4. De sleutels in Vercel zetten

1. In Supabase: **Project Settings** → **API Keys**. Kopieer de **Publishable key** (begint met `sb_publishable_`).
   Gebruik **nooit** de *Secret key* (`sb_secret_`).
2. In Supabase: **Project Settings** → **Data API**. Kopieer de **Project URL** (`https://....supabase.co`).
3. In Vercel: open het project `all` → **Settings** → **Environment Variables** en voeg toe:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | de Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | de Publishable key |

4. Ga in Vercel naar **Deployments**, klik bij de bovenste op **⋯** → **Redeploy**.

De publishable key mag gezien worden: hij zit in elke webpagina. De regels uit stap 2 beschermen je gegevens.

## 5. Je account maken

1. Open je site. Je ziet nu een inlogscherm.
2. Klik **Account maken**, vul je e-mailadres en een sterk wachtwoord (minstens 10 tekens) in.
3. Bevestig via de mail en log in.
   - Stonden er al taken of notities op dit toestel? Die gaan automatisch mee naar de cloud.
4. Ga naar **Instellingen** → **Tweestapsverificatie aanzetten** en scan de QR-code met een authenticator-app.

## 6. Niemand anders laten inschrijven

Je site is openbaar. Zodra jouw account bestaat:

1. Supabase → **Authentication** → **Sign In / Providers**.
2. Zet **Allow new users to sign up** **uit** en sla op.

Ook als iemand toch een account zou hebben, ziet die nooit jouw gegevens. Maar zo blijft ALL echt van jou alleen.

## Klaar

- Log in op je telefoon en je computer: je ziet overal dezelfde stad.
- Uitloggen wist de kopie op dat toestel. In de cloud blijft alles staan.
- Een back-up downloaden in **Instellingen** blijft een goed idee.

Volgende stap: de assistent (fase 2). Daarvoor maakt een ouder een Claude API-account met een maandlimiet. Dat stappenplan volgt.
