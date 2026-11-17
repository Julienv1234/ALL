# Pixel-art

Alle afbeeldingen in `public/img` en de app-iconen zijn hier met Python getekend, pixel voor pixel. Geen AI-beelden, geen gekopieerd werk.

```bash
pip install pillow
python3 art/city.py   /tmp/art   # de eilanden, de skyline en meta.json (wordt public/img/islands-meta.json)
python3 art/rail.py   /tmp/art   # het pixelmenu: dak, muur, bordjes en de iconen
python3 art/appicon.py /tmp/art  # app-icoon (512, 192, Apple 180) en favicon
```

De scripts gebruiken vaste startgetallen voor het toeval, dus dezelfde code maakt altijd exact dezelfde pixels. Kopieer daarna wat je nodig hebt naar `public/img` (of `public/` voor de iconen).
