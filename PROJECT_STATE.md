# RackMatch WEBSITE

Статический сайт: совместимость питания сервер ↔ PDU.

## Workflow

edit → test в браузере → реальный результат → commit + push в `main` сразу, без вопроса.

HARD: после правок сайта не спрашивать «запушить?». Всегда пушить самому.

HARD: внутренние ссылки RackMatch открываются в той же вкладке (без `target="_blank"`). Внешние ссылки на источники (Dell, HPE, NVIDIA, Schneider и т.д.) открываются в новой вкладке: `target="_blank" rel="noopener"`. На `<link rel="canonical">` это не распространяется.

HARD: новую внешнюю ссылку открывать в браузере и смотреть заголовок страницы. HTTP 403 от curl не равен 404. Страница Sorry у Dell и редирект Schneider на `/all-products/` это битая ссылка.

Хостинг: Vercel, проект `rackmatch`, команда dima's projects.
Сайт: https://rackmatch.vercel.app
GitHub: https://github.com/SweetLeaf420smoke/RackMatch-WEBSITE
Канонический URL: https://rackmatch.vercel.app/

Google Search Console: свойство https://rackmatch.vercel.app/ подтверждено (HTML file + HTML tag). Sitemap `/sitemap.xml` Success.
Change of address: rackmatch-website.vercel.app → rackmatch.vercel.app, старт 4 Sep 2026.
Старый Vercel-домен: 308 на https://rackmatch.vercel.app/.

## Проверки

- DATA: пары сервер/PDU и ссылки на источники
- FLOW: два списка → Find → результат
- UI: белый фон, чёрный/синий текст, без анимаций

## Как сейчас

Источник правды по железу: `data/equipment.json`. Find на главной читает этот файл. Pair SEO-страницы пишет `python3 data/generate.py` (список URL в `pair_pages`, не декартово произведение). Гайды IEC/NVIDIA/model power-cord пока руками.

20 SEO-страниц гайдов (10 generic IEC + 5 Dell/HPE power cord + 5 NVIDIA/DGX) плюс 10 pair URL. Сначала чистить базу, не плодить новые страницы.

Каталог PDU (по вендору, не путать SKU):
- APC AP8853: 36 × C13 + 6 × C19, 230 V, 32 A. Источник: se.com/uk product page. US slug `20-c13-4-c19` уводит на all-products.
- APC AP8941: 21 × C13 + 3 × C19, 200/208 V, 30 A. Не C19-only.
- Eaton EMA333-10: 21 × C13 + 6 × C19 + 1 × 5-20R, 120/208 V, 24 A. Не C13-only 230 V/16 A.
- Raritan PX3-5496V: 24 × C13, без C19. R760 2400 W (C20) с этим PDU не совместим напрямую.
- C14 это inlet/plug, не розетка PDU. Розетка PDU в паре C13–C14 это C13.

Фидбек: на главной блок Feedback (Message, Contact). На каждой странице кнопка Suggest a correction / Add equipment → `/suggest/` (model, part number, datasheet URL, what works with what). Оба POST в ту же Google Form. На сайт само не публикуется. Мы проверяем source, потом approve.
Таблица: https://docs.google.com/spreadsheets/d/1At7v0iErDZshwZ5_51VXpXsiyRNkXf2FFhv12ixBtD0/edit
entry.389100888 = Message, entry.1165317586 = Contact (Email).
entry.563611403 = Page URL, entry.770004551 = Server model, entry.341373274 = PDU model.
Find на главной пишет URL страницы и выбранные server/PDU в эти три поля автоматически. `/suggest/` пишет Page URL, server/PDU пустые.
