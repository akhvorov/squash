# Тестирование фронтенда: подходы и практики

## Почему разделять логику и отображение?

### Преимущества разделения:

1. **Тестируемость** - чистую логику легко тестировать без DOM
2. **Переиспользование** - логику можно использовать в разных UI (веб, мобильное приложение)
3. **Поддерживаемость** - изменения в UI не затрагивают бизнес-логику
4. **Отладка** - проще найти баги, когда логика изолирована

## Структура проекта

```
squash/
├── src/
│   ├── calculator.js          # Чистая бизнес-логика (без DOM)
│   └── calculator.test.js      # Unit-тесты для логики
├── index.html                  # UI (HTML + CSS + UI логика)
├── package.json                # Конфигурация проекта
└── TESTING.md                  # Этот файл
```

## Подходы к тестированию фронтенда

### 1. Unit-тесты (тестируем логику)

**Что тестируем:**
- Функции расчета стоимости
- Алгоритмы оптимизации
- Валидацию данных
- Трансформации данных

**Инструменты:**
- **Node.js встроенный test runner** (Node 18+) - без зависимостей
- **Jest** - самый популярный, много возможностей
- **Vitest** - быстрый, современный, хорошая интеграция с Vite
- **Mocha + Chai** - гибкий, настраиваемый

**Пример:**
```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import { squashDistributionCost } from './calculator.js';

test('6 игроков, 3 корта - корт 2 должен быть PowerPlay', () => {
    const result = squashDistributionCost(3, 6, 3, '18:00', 'weekend');
    const court2 = result.plan.find(p => p.courtIndex === 1);
    assert.strictEqual(court2.type, 'pp');
});
```

### 2. Integration-тесты (тестируем взаимодействие)

**Что тестируем:**
- Взаимодействие между модулями
- Работу с API (если есть)
- Интеграцию UI и логики

**Инструменты:**
- **Jest** - встроенная поддержка
- **Vitest** - хорошая поддержка
- **Playwright** - для E2E тестов

### 3. E2E тесты (тестируем весь поток)

**Что тестируем:**
- Полный пользовательский сценарий
- Работу в реальном браузере
- Интеграцию всех компонентов

**Инструменты:**
- **Playwright** - современный, быстрый
- **Cypress** - популярный, хороший DX
- **Selenium** - классический вариант

**Пример:**
```javascript
test('пользователь вводит данные и видит результат', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.fill('#courts', '3');
    await page.fill('#players', '6');
    await page.fill('#subs', '3');
    await page.click('button');
    await expect(page.locator('#results')).toBeVisible();
});
```

### 4. Visual regression тесты

**Что тестируем:**
- Внешний вид компонентов
- Респонсивность
- Кроссбраузерность

**Инструменты:**
- **Percy** - визуальные тесты
- **Chromatic** - для Storybook
- **Playwright** - встроенная поддержка скриншотов

## Запуск тестов

### С Node.js (встроенный test runner)

```bash
# Запуск всех тестов
node --test src/calculator.test.js

# С watch режимом
node --test --watch src/calculator.test.js
```

### С Jest

```bash
# Установка
npm install --save-dev jest

# Запуск
npm test
```

### С Vitest

```bash
# Установка
npm install --save-dev vitest

# Запуск
npm test
```

## Best practices

### 1. Тестируйте поведение, а не реализацию

❌ Плохо:
```javascript
test('функция вызывает getPriceForTime', () => {
    // Тестируем внутреннюю реализацию
});
```

✅ Хорошо:
```javascript
test('возвращает правильную стоимость для 3 кортов', () => {
    const result = calculateCost(3, 6, 0);
    assert.strictEqual(result.cost, 54);
});
```

### 2. Используйте описательные имена тестов

❌ Плохо:
```javascript
test('test1', () => {});
```

✅ Хорошо:
```javascript
test('при равной стоимости выбирается вариант с большим количеством PowerPlay', () => {});
```

### 3. Тестируйте граничные случаи

```javascript
test('минимум 2 игрока на корт', () => {
    // Тест для граничного случая
});

test('максимум подписок = количество игроков', () => {
    // Тест для граничного случая
});
```

### 4. Изолируйте тесты

Каждый тест должен быть независимым и не зависеть от других тестов.

### 5. Используйте моки для внешних зависимостей

Если функция зависит от DOM или внешних API, используйте моки.

## Структура тестов

```javascript
// Arrange (подготовка)
const courts = 3;
const players = 6;
const subs = 3;

// Act (действие)
const result = squashDistributionCost(courts, players, subs, '18:00', 'weekend');

// Assert (проверка)
assert.strictEqual(result.cost, 48);
```

## Покрытие кода

Стремитесь к высокому покрытию кода тестами, но не делайте это самоцелью. Важнее тестировать критичную бизнес-логику.

```bash
# С Jest
npm test -- --coverage

# С Vitest
npm test -- --coverage
```

## CI/CD

Настройте автоматический запуск тестов при каждом коммите:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm test
```

## Дополнительные ресурсы

- [Jest документация](https://jestjs.io/)
- [Vitest документация](https://vitest.dev/)
- [Testing Library](https://testing-library.com/) - для тестирования UI компонентов
- [Playwright документация](https://playwright.dev/)

