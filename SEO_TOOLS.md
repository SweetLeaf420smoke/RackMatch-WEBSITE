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

Cursor MCP (пока не добавлять без разрешения: `npx` качает пакет):

```json
"geo-optimizer": {
  "command": "npx",
  "args": ["-y", "geo-optimizer-mcp"]
}
```

Альтернатива после `pip install geo-optimizer-skill[mcp]`: команда `geo-mcp`. pip тоже только после явного «ставь».

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

После добавления нужен логин OpenSEO (OAuth в Cursor). API-ключ `oseo_…` в репо не класть. Если ключ появится, хранить в `KEYS_MASTER.env`, в `mcp.json` только через env, не в git.

## 3. MCP GSC (Search Console)

Для чего: клики, показы, запросы, покрытие индекса, URL Inspection. Это правда «есть ли мы в Google», а не догадки.

Адреса:

- PyPI: https://pypi.org/project/mcp-search-console/
- GitHub: https://github.com/AminForou/mcp-gsc
- Cursor Marketplace: искать `mcp-search-console`
- GSC UI сайта: https://search.google.com/search-console?resource_id=https://rackmatch.vercel.app/

Нужен OAuth `client_secrets.json` или service account. Файлы секретов в git не класть.

Пока MCP GSC не подключён: смотреть GSC в Chrome (hunt A → B → C → CDP), не invent цифры.

OpenSEO GSC tools: запасной путь без Google Cloud, если проект OpenSEO привязан к этому свойству.

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

Следующий шаг с инструментами: подключить OpenSEO MCP (логин) и/или плагин `mcp-search-console`, прогнать индекс главной, потом GEO-аудит `https://rackmatch.vercel.app/`. Не ставить pip/npx, пока в чате нет «ставь».
