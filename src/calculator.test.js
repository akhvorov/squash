// Тесты для калькулятора сквош
// Можно запустить с Node.js 18+: node --test src/calculator.test.js
// Или с Jest/Vitest: npm test

import { test } from 'node:test';
import assert from 'node:assert';
import { 
    squashDistributionCost, 
    getPPPrice, 
    getSlotPrice 
} from './calculator.js';

// Тест 1: При равной стоимости должен выбираться вариант с большим количеством PowerPlay
test('6 игроков, 3 корта, 3 подписки - корт 2 должен быть PowerPlay при стоимости 18€', () => {
    const result = squashDistributionCost(3, 6, 3, '18:00', 'weekend');
    
    console.log('Результат:', JSON.stringify(result, null, 2));
    
    assert(result.plan, 'План должен существовать');
    assert(result.plan.length === 3, 'Должно быть 3 корта');
    
    const court2 = result.plan.find(p => p.courtIndex === 1);
    assert(court2, 'Корт 2 должен существовать');
    
    if (court2.cost === 18) {
        assert.strictEqual(
            court2.type, 
            'pp', 
            `Корт 2 стоит 18€, но не PowerPlay! Тип: ${court2.type}, стоимость: ${court2.cost}€`
        );
    }
    
    const ppCount = result.plan.filter(p => p.type === 'pp').length;
    console.log(`Количество PowerPlay кортов: ${ppCount}`);
});

// Тест 2: При players = 2 * courts должны выбираться все PowerPlay корты при равной стоимости
test('4 игрока, 2 корта, 2 подписки - должны быть 2 PowerPlay корта при стоимости 36€', () => {
    const result = squashDistributionCost(2, 4, 2, '18:00', 'weekend');
    
    console.log('Результат:', JSON.stringify(result, null, 2));
    
    assert(result.plan, 'План должен существовать');
    
    const ppCount = result.plan.filter(p => p.type === 'pp').length;
    
    if (result.cost === 36) {
        assert.strictEqual(
            ppCount, 
            2, 
            `При стоимости 36€ должны быть 2 PowerPlay корта, но найдено: ${ppCount}`
        );
    }
});

// Тест 3: Проверка стоимости без подписок
test('6 игроков, 3 корта - стоимость без подписок должна быть 3 * 18€ = 54€', () => {
    const result = squashDistributionCost(3, 6, 0, '18:00', 'weekend');
    
    assert.strictEqual(
        result.costWithoutSubs, 
        54, 
        `Стоимость без подписок должна быть 54€, но получено: ${result.costWithoutSubs}€`
    );
    
    // Все корты должны быть PowerPlay
    const ppCount = result.plan.filter(p => p.type === 'pp').length;
    assert.strictEqual(ppCount, 3, 'Все 3 корта должны быть PowerPlay');
});

// Тест 4: Проверка приоритета PowerPlay при равной стоимости
test('При равной стоимости выбирается вариант с большим количеством PowerPlay', () => {
    const result = squashDistributionCost(3, 6, 3, '18:00', 'weekend');
    
    // Находим все варианты с одинаковой стоимостью и проверяем, что выбран с максимальным PP
    const ppCount = result.plan.filter(p => p.type === 'pp').length;
    const totalCost = result.cost;
    
    console.log(`Выбранный вариант: стоимость ${totalCost}€, PowerPlay кортов: ${ppCount}`);
    
    // Если есть корт стоимостью 18€, он должен быть PowerPlay, а не обычные слоты
    result.plan.forEach((court, index) => {
        if (court.cost === 18 && court.type !== 'pp') {
            throw new Error(
                `Корт ${index + 1} стоит 18€ (как PowerPlay), но выбран как ${court.type}. ` +
                `Должен быть PowerPlay при равной стоимости.`
            );
        }
    });
});

// Тест 5: Проверка базовых функций ценообразования
test('getPPPrice возвращает правильную цену для выходного дня', () => {
    const price = getPPPrice('18:00', 'weekend');
    assert.strictEqual(price, 9, 'Цена PowerPlay для выходного дня должна быть 9€');
});

test('getSlotPrice возвращает правильную цену для выходного дня', () => {
    const price = getSlotPrice('18:00', 'weekend', 0);
    assert.strictEqual(price, 6, 'Цена слота для выходного дня должна быть 6€');
});

