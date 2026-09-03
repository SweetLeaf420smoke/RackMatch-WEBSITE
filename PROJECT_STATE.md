# RackMatch WEBSITE

Статический сайт: совместимость питания сервер ↔ PDU.

## Workflow

edit → test в браузере → реальный результат → отчёт.

Хостинг: Vercel, проект `rackmatch-website`, команда dima's projects.
Сайт: https://rackmatch-website.vercel.app
GitHub: https://github.com/SweetLeaf420smoke/RackMatch-WEBSITE
После смены домена заменить `SITE_ORIGIN` в `sitemap.xml` и `robots.txt`.

## Проверки

- DATA: пары сервер/PDU и ссылки на источники
- FLOW: два списка → Find → результат
- UI: белый фон, чёрный/синий текст, без анимаций

## Как сейчас

Одна страница `index.html`. Данные встроены. Сервер: `python3 -m http.server`.
