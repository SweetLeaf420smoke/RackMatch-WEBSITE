# RackMatch WEBSITE

Статический сайт: rack power connectivity BOM + совместимость питания сервер ↔ PDU.

## Workflow

HARD: общение с Дмитрием. Когда он что-то делает руками (Reddit, GSC, настройки): давать ровно ОДИН короткий шаг за сообщение и ждать «ок». Без простыней. В продвижении он новичок, объяснять простыми словами.

edit → test в браузере → реальный результат → commit + push в `main` сразу, без вопроса.

HARD: после правок сайта не спрашивать «запушить?». Всегда пушить самому.

HARD: внутренние ссылки RackMatch открываются в той же вкладке (без `target="_blank"`). Внешние ссылки на источники (Dell, HPE, NVIDIA, Schneider и т.д.) открываются в новой вкладке: `target="_blank" rel="noopener"`. На `<link rel="canonical">` это не распространяется.

HARD: новую внешнюю ссылку открывать в браузере и смотреть заголовок страницы. HTTP 403 от curl не равен 404. Страница Sorry у Dell и редирект Schneider на `/all-products/` это битая ссылка.

Хостинг: Vercel, проект `rackmatch`, команда dima's projects.
Сайт: https://rackmatch.net (домен куплен 6 Nov 2026 на Porkbun; DNS: A @ 216.198.79.1, CNAME www → cf85d2c969d99ce1.vercel-dns-017.com; www → 308 на apex). Vercel-аккаунт с проектом: bank@ya.ru
GitHub: https://github.com/SweetLeaf420smoke/RackMatch-WEBSITE
Канонический URL: https://rackmatch.net/ (с 6 Nov 2026; rackmatch.vercel.app и rackmatch-website.vercel.app → 308 на rackmatch.net)

Google Search Console: свойство https://rackmatch.vercel.app/ подтверждено (HTML file + HTML tag). Sitemap `/sitemap.xml` Success.
Яндекс.Метрика: счётчик 112306015, сайт rackmatch.vercel.app, вебвизор включён.
Google Analytics 4: измерение G-PPCCYQHCFD, поток https://rackmatch.vercel.app.
Change of address: rackmatch-website.vercel.app → rackmatch.vercel.app, старт 4 Sep 2026.
Старый Vercel-домен: 308 на https://rackmatch.vercel.app/. Старый sitemap и старое свойство GSC не удалять (нужны для смены адреса).
IndexNow (Bing + Яндекс): ключ `57e463bd1b96c9f2cab824545d95824c`, файл в корне `/57e463bd1b96c9f2cab824545d95824c.txt`. После новых/изменённых страниц: POST на https://api.indexnow.org/indexnow с urlList. Первая отправка всех 34 URL: 6 Nov 2026, ответ 202.

## Проверки

- DATA: пары сервер/PDU и ссылки на источники
- FLOW: главная → Build Rack BOM; Upload Spec / RFQ (`/rfq/`) → подтверждённые строки в BOM; Find один сервер + PDU; Feedback
- UI: белый фон, чёрный/синий текст, без анимаций

## Как сейчас

Источник правды по железу: `data/equipment.json`. Find на главной читает этот файл сразу после пуша JSON.

Pair SEO-страницы: только список `pair_pages`, не все совместимые комбинации. Генератор `python3 data/generate.py` запускает **агент**, не пользователь. Тот же генератор крутится на Vercel при деплое (`vercel.json`). После generate: commit + push. Пользователя не просить «запусти python».

Новую pair-страницу в `pair_pages` добавлять только по спросу: явная просьба, запрос в GSC, или строка Feedback с server+PDU. Не строить тысячи пар «на всякий».

Гайды IEC/NVIDIA/model power-cord пока руками.

20 SEO-страниц гайдов (10 generic IEC + 5 Dell/HPE power cord + 5 NVIDIA/DGX) плюс 10 pair URL. Сначала чистить базу, не плодить новые страницы.

Каталог PDU (по вендору, не путать SKU):
- APC AP8853: 36 × C13 + 6 × C19, 230 V, 32 A. Источник: se.com/uk product page. US slug `20-c13-4-c19` уводит на all-products.
- APC AP8941: 21 × C13 + 3 × C19, 200/208 V, 30 A. Не C19-only.
- Eaton EMA333-10: 21 × C13 + 6 × C19 + 1 × 5-20R, 120/208 V, 24 A. Не C13-only 230 V/16 A.
- Raritan PX3-5496V: 24 × C13, без C19. R760 2400 W (C20) с этим PDU не совместим напрямую.
- C14 это inlet/plug, не розетка PDU. Розетка PDU в паре C13–C14 это C13.

Фидбек: строка появляется в таблице сразу после Send. Письмо Google Form идёт на vertobanner@gmail.com.
RFQ Extract и Send to BOM пишут в ту же таблицу короткое сообщение (имя файла, число символов, модели и qty). Сам PDF в таблицу не уходит.
`/rfq/` сначала режет спецификацию на отдельные позиции (несколько UPS/MCCB/SPD/meter в одном предложении), потом поля, потом каталог. Qty из текста не подменяется на 1. Нет модели в каталоге: строка остаётся, Needs verification / No catalog match. Модели и недостающие характеристики не выдумываются.

Пользователь почту и таблицу сам не смотрит. Проверка таблицы **один раз в день** через Google Sheets API (`python3 data/check_feedback.py`), без Chrome и без IMAP. В начале обычного чата по сайту эту команду не гонять.

Таблица: https://docs.google.com/spreadsheets/d/1At7v0iErDZshwZ5_51VXpXsiyRNkXf2FFhv12ixBtD0/edit

GSC это не таблица. Запросы до входа смотреть в Search Console (Performance), не в Feedback.

Инструменты роста трафика (адреса, как подключать, что уже проверено на сайте): `SEO_TOOLS.md`. Три штуки: GEO Optimizer, OpenSEO MCP, MCP GSC.

Таблица: https://docs.google.com/spreadsheets/d/1At7v0iErDZshwZ5_51VXpXsiyRNkXf2FFhv12ixBtD0/edit
entry.389100888 = Message, entry.1165317586 = Contact (Email).
entry.563611403 = Page URL, entry.770004551 = Server model, entry.341373274 = PDU model.
Find на главной пишет URL страницы и выбранные server/PDU в эти три поля автоматически. `/suggest/` пишет Page URL, server/PDU пустые.
