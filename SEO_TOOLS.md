# RackMatch: инструменты трафика (GEO / OpenSEO / GSC)

Сайт: https://rackmatch.vercel.app  
GSC свойство: `https://rackmatch.vercel.app/`  
Sitemap: https://rackmatch.vercel.app/sitemap.xml  
robots: https://rackmatch.vercel.app/robots.txt  

Агенту: перед работой по посещаемости читать этот файл. MCP в этот чат сами не подключаются, пока их нет в Cursor MCP Tools.

## 1. GEO Optimizer

Для чего: видимость в ChatGPT / Perplexity / Gemini / AI Overviews (`llms.txt`, robots для AI-ботов, schema, FAQ).

Адреса:

- Skill / CLI: https://github.com/VikramRajbhar/geo-optimizer-skill
- MCP (npx): https://github.com/SHADRINMMM/geo-optimizer-mcp
- Документация MCP: https://auriti-labs.github.io/geo-optimizer-skill/mcp-server/
- Каталог: https://www.mcpgee.com/servers/geo-optimizer-skill

Уже в `~/.cursor/mcp.json` как `geo-optimizer` (`npx -y geo-optimizer-mcp`).

## 2. OpenSEO

Для чего: объём запросов, SERP, конкуренты, бэклинки, rank tracker. Через тот же MCP можно читать GSC без Google Cloud.

Адреса:

- MCP docs: https://openseo.so/docs/mcp
- Hosted MCP: https://app.openseo.so/mcp
- GSC через OpenSEO: https://openseo.so/google-search-console-mcp
- GitHub: https://github.com/every-app/open-seo
- App: https://app.openseo.so/

Cursor MCP:

```json
"openseo": {
  "url": "https://app.openseo.so/mcp"
}
```

После добавления MCP-логин OpenSEO в этом чате уже есть: аккаунт `vertobanner@gmail.com`. Credits remaining: **0**. Проект OpenSEO: `96601b40-8b71-466e-ad6d-62d160497f69` (RackMatch, rackmatch.vercel.app, рынок 2840/en). Search Console к этому проекту **не** привязан. Keyword/SERP через OpenSEO без кредитов не идут.

## 3. MCP GSC (Search Console)

Для чего: клики, показы, запросы, покрытие индекса, URL Inspection. Это правда «есть ли мы в Google», а не догадки.

Адреса:

- PyPI: https://pypi.org/project/mcp-search-console/
- GitHub: https://github.com/AminForou/mcp-gsc
- Cursor Marketplace: искать `mcp-search-console`
- GSC UI сайта: https://search.google.com/search-console?resource_id=https://rackmatch.vercel.app/

Уже в `~/.cursor/mcp.json` как `gsc` (`uvx mcp-search-console`). Файл OAuth: `~/.cursor/gsc-client-secrets.json` (не в git). Первый вход: инструмент `reauthenticate` (браузер, scope Search Console). Google Cloud проект клиента: `rnp-ozon`. Если API Search Console в этом проекте выключен, `list_properties` даст 403, а не «нет файла».

Файлы секретов в git не класть.

## Как ими пользоваться по очереди

1. **GSC / MCP GSC:** индекс и запросы по `rackmatch.vercel.app`. Пока 0 показов в индексе, объём Ahrefs/OpenSEO не равен трафику на сайт.
2. **OpenSEO:** какие формулировки люди ищут (кабель, C13/C14, модель сервера + power cord). Не плодить pair-страницы без спроса.
3. **GEO Optimizer:** почему ChatGPT нас не цитирует (Direct из чатов это не Google organic). Сначала аудит живого URL, потом `llms.txt` / schema, если аудит это требует.

## Факт по сайту на 22 Sep 2026 (без MCP)

- `robots.txt` живой, Allow `/`, указывает на sitemap. HTTP 200.
- `sitemap.xml` живой, HTTP 200, `application/xml`.
- Файла `llms.txt` в репо нет.
- JSON-LD / schema.org в HTML нет.
- Органика Google в прошлых проверках GSC: 0 кликов / 0 показов, проиндексировано 0 URL. Визиты в Метрике и GA были Direct (в том числе заходы через ChatGPT), это не поиск Google.

## Прогон 22 Sep 2026 (вечер)

- GEO Optimizer `analyze_geo_score` по `rackmatch.vercel.app`: **0/100**, grade C. Нулевые пункты: robots для AI-ботов, Schema.org, FAQ schema, глубина контента, NAP, freshness. Отчёт: https://causabi.com/score/rackmatch.vercel.app
- `get_geo_fixes` вернул шаблоны с заглушками (телефон 555, «Your Business Name»). На сайт так не копировать.
- OpenSEO MCP: залогинен, кредитов 0, GSC в проекте не подключён.
- `uvx mcp-search-console`: сервер в списке. `list_properties` падает: нет `GSC_OAUTH_CLIENT_SECRETS_FILE`.
- Подключение GSC через браузер OpenSEO: Chrome C дошёл до Google passkey для `vertobanner@gmail.com`. Дальше без касания ключа не пройти. Hunt: A `about:blank`, B не трогал (занят), CDP `127.0.0.1:9222` отказ в соединении.

Следующее, что реально двигает посещаемость: индекс Google (GSC) и живой `llms.txt`/schema своими формулировками с сайта, не шаблоном GEO. OpenSEO keyword-объёмы: сначала кредиты на аккаунте.
