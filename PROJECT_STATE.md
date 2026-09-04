# RackMatch WEBSITE

Статический сайт: совместимость питания сервер ↔ PDU.

## Workflow

edit → test в браузере → реальный результат → commit + push в `main` сразу, без вопроса.

Хостинг: Vercel, проект `rackmatch-website`, команда dima's projects.
Сайт: https://rackmatch-website.vercel.app
GitHub: https://github.com/SweetLeaf420smoke/RackMatch-WEBSITE
Канонический URL: https://rackmatch-website.vercel.app/

Google Search Console: URL prefix подтверждён (HTML tag, аккаунт vertobanner@gmail.com).

## Проверки

- DATA: пары сервер/PDU и ссылки на источники
- FLOW: два списка → Find → результат
- UI: белый фон, чёрный/синий текст, без анимаций

## Как сейчас

Одна страница `index.html`. Данные встроены. Сервер: `python3 -m http.server`.

Фидбек на главной: свои два поля (Message, Contact), без iframe. POST в ту же Google Form (таблица Responses).
Таблица: https://docs.google.com/spreadsheets/d/1At7v0iErDZshwZ5_51VXpXsiyRNkXf2FFhv12ixBtD0/edit
entry.389100888 = Message, entry.1165317586 = Contact.
