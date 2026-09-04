# RackMatch WEBSITE

Статический сайт: совместимость питания сервер ↔ PDU.

## Workflow

edit → test в браузере → реальный результат → commit + push в `main` сразу, без вопроса.

HARD: после правок сайта не спрашивать «запушить?». Всегда пушить самому.

HARD: внутренние ссылки RackMatch открываются в той же вкладке (без `target="_blank"`). Внешние ссылки на источники (Dell, HPE, NVIDIA, Schneider и т.д.) открываются в новой вкладке: `target="_blank" rel="noopener"`. На `<link rel="canonical">` это не распространяется.

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

20 SEO-страниц (10 generic IEC + 5 Dell/HPE power cord + 5 NVIDIA/DGX). Сначала чистить базу PDU, не плодить новые страницы.

Каталог PDU (по вендору, не путать SKU):
- APC AP8941: 21 × C13 + 3 × C19, 200/208 V, 30 A. Не C19-only.
- Eaton EMA333-10: 21 × C13 + 6 × C19 + 1 × 5-20R, 120/208 V, 24 A. Не C13-only 230 V/16 A.
- Raritan PX3-5496V: 24 × C13, без C19. R760 2400 W (C20) с этим PDU не совместим напрямую.
- C14 это inlet/plug, не розетка PDU. Розетка PDU в паре C13–C14 это C13.

Фидбек на главной: свои два поля (Message, Contact), без iframe. POST в ту же Google Form (таблица Responses).
Таблица: https://docs.google.com/spreadsheets/d/1At7v0iErDZshwZ5_51VXpXsiyRNkXf2FFhv12ixBtD0/edit
entry.389100888 = Message, entry.1165317586 = Contact.
