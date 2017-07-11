# BUILD
Проект предназначен для сборки проектов, написанных с использованием [angular-cli](https://github.com/angular/angular-cli). 

Этот проект использует [NodeJS](https://nodejs.org/dist/latest-v6.x/docs/api/) v.6.10.3

# Этапы сборки
[TODO] описать

# Запуск сборки

```bash
node build -name <name> [-no-upload]
```
## Возможные значения

1. -name, -n - имя проекта на GitLab. Имя может быть произвольным.

Пример: 
```bash
node build -name bonus
```

2. -no-upload, -no - ключ, отменяющий загрузку в репозиторий.

Пример: 
```bash
node build -name bonus -no-upload
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