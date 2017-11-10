# BUILD
Проект предназначен для сборки проектов, написанных с использованием [angular-cli](https://github.com/angular/angular-cli). 

Этот проект использует [NodeJS](https://nodejs.org/dist/latest-v8.x/docs/api/) v.8.x

# Этапы сборки
[TODO] описать

# Запуск сборки

```bash
node build -name <name> [-no-upload]
```
## Возможные ключи

1. -name, -n - имя проекта на GitLab. Имя может быть произвольным.

Пример: 
```bash
node build -name bonus
```

2. (на 10.11.2017 не работает, т.к. изменился репозиторий) --upload, -up - ключ, включающий загрузку в репозиторий.

Пример: 
```bash
node build -name bonus -upload
```

# Изменение версии

```bash
node version -name <name> [ -version <newVersion> ]
```
## Возможные значения

1. -name, -n - имя проекта на GitLab. Имя может быть произвольным.
2. -version, -v - номер версии на GitLab. Формат [number].[number].[numder]. При отсутствии версии в команде - патч версии увеличивается на 1.

Пример: 
```bash
node version -name bonus -version 2.0.3
```

# Обновление версий пакетов

```bash
node update -name <name>
```
## Возможные значения

1. -name, -n - имя проекта на GitLab. Имя может быть произвольным.

Пример: 
```bash
node update -name bonus
```

# Загрузка шрифтов

```bash
node fonts
```