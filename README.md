# Team Ranking App

Веб-приложение для ранжирования команд по критериям оценки.

## Установка

```bash
npm install
```

## Запуск локально

```bash
npm run dev
```

Откройте http://localhost:3000

## Деплой на Vercel

1. Загрузите проект на GitHub
2. Подключите репозиторий в Vercel
3. Vercel автоматически развернёт приложение

Или через CLI:
```bash
npm i -g vercel
vercel --prod
```

## Структура

```
team-ranking/
├── pages/
│   ├── api/
│   │   └── calculate.js    # API для обработки Excel
│   ├── _app.js             # Подключение стилей
│   └── index.js            # Главная страница
├── styles/
│   └── globals.css         # Стили
├── package.json
├── .gitignore
└── vercel.json
```
