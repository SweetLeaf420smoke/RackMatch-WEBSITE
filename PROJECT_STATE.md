# RackMatch WEBSITE

Статический сайт: совместимость питания сервер ↔ PDU.

## Workflow

edit → test в браузере → реальный результат → commit + push в `main` сразу, без вопроса.

HARD: после правок сайта не спрашивать «запушить?». Всегда пушить самому.

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

Ещё 5 pair-страниц: R760+AP8941, R760+PX3-5496V, DL380 Gen11+AP8853, DL380 Gen11+AP8941, SR650 V3+AP8853.

Фидбек на главной: свои два поля (Message, Contact), без iframe. POST в ту же Google Form (таблица Responses).
Таблица: https://docs.google.com/spreadsheets/d/1At7v0iErDZshwZ5_51VXpXsiyRNkXf2FFhv12ixBtD0/edit
entry.389100888 = Message, entry.1165317586 = Contact.
