// ============================================
// DUELOGUE v2 - CARDS DATA (SCALES SYSTEM)
// ============================================
// Карты теперь работают с единой шкалой убеждённости (-10 до +10)
// - shift: сдвиг весов (положительный = в пользу игрока)
// - type: тип карты (logic/emotion/neutral)
// - vulnerability: к какому типу карта уязвима (даёт counter-shift)

const CardType = {
    LOGIC: 'logic',
    EMOTION: 'emotion',
    NEUTRAL: 'neutral'
};

// Карты игрока
const playerCards = [
    // ========== ЛОГИКА ==========
    {
        id: 'p_logic_1',
        title: 'Факты',
        description: 'Приводишь неоспоримые факты',
        type: CardType.LOGIC,
        shift: 2,
        vulnerability: CardType.EMOTION, // Уязвима к эмоциональным ответам
        category: 'Логика'
    },
    {
        id: 'p_logic_2',
        title: 'Статистика',
        description: 'Цифры не врут',
        type: CardType.LOGIC,
        shift: 3,
        vulnerability: CardType.EMOTION,
        category: 'Логика'
    },
    {
        id: 'p_logic_3',
        title: 'Силлогизм',
        description: 'Если А=Б, а Б=В, то А=В',
        type: CardType.LOGIC,
        shift: 2,
        vulnerability: CardType.EMOTION,
        category: 'Логика'
    },
    {
        id: 'p_logic_4',
        title: 'Контрпример',
        description: 'Опровергаешь через конкретный случай',
        type: CardType.LOGIC,
        shift: 2,
        vulnerability: CardType.EMOTION,
        category: 'Логика'
    },

    // ========== ЭМОЦИИ ==========
    {
        id: 'p_emotion_1',
        title: 'Личная история',
        description: 'Рассказываешь о своём опыте',
        type: CardType.EMOTION,
        shift: 2,
        vulnerability: CardType.LOGIC, // Уязвима к логическим ответам
        category: 'Эмоции'
    },
    {
        id: 'p_emotion_2',
        title: 'Апелляция к морали',
        description: 'Это просто правильно!',
        type: CardType.EMOTION,
        shift: 3,
        vulnerability: CardType.LOGIC,
        category: 'Эмоции'
    },
    {
        id: 'p_emotion_3',
        title: 'Риторика',
        description: 'Красивые слова зажигают сердца',
        type: CardType.EMOTION,
        shift: 2,
        vulnerability: CardType.LOGIC,
        category: 'Эмоции'
    },
    {
        id: 'p_emotion_4',
        title: 'Юмор',
        description: 'Смех разоружает противника',
        type: CardType.EMOTION,
        shift: 2,
        vulnerability: CardType.LOGIC,
        category: 'Эмоции'
    },

    // ========== НЕЙТРАЛЬНЫЕ ==========
    {
        id: 'p_neutral_1',
        title: 'Уклонение',
        description: 'Уходишь от прямого ответа',
        type: CardType.NEUTRAL,
        shift: 1,
        vulnerability: null, // Нет уязвимости
        category: 'Тактика'
    },
    {
        id: 'p_neutral_2',
        title: 'Переход в атаку',
        description: 'Лучшая защита - нападение',
        type: CardType.NEUTRAL,
        shift: 1,
        vulnerability: null,
        category: 'Тактика'
    }
];

// Карты противника (Скептик)
const enemyCards = [
    // ========== ЛОГИКА ==========
    {
        id: 'e_logic_1',
        title: 'Требует доказательств',
        description: 'Где пруфы?',
        type: CardType.LOGIC,
        shift: -2,
        vulnerability: CardType.EMOTION,
        category: 'Логика'
    },
    {
        id: 'e_logic_2',
        title: 'Указывает на противоречие',
        description: 'Ты сам себе противоречишь!',
        type: CardType.LOGIC,
        shift: -3,
        vulnerability: CardType.EMOTION,
        category: 'Логика'
    },
    {
        id: 'e_logic_3',
        title: 'Научные данные',
        description: 'Исследования показывают обратное',
        type: CardType.LOGIC,
        shift: -2,
        vulnerability: CardType.EMOTION,
        category: 'Логика'
    },
    {
        id: 'e_logic_4',
        title: 'Логическая ошибка',
        description: 'Это софизм!',
        type: CardType.LOGIC,
        shift: -2,
        vulnerability: CardType.EMOTION,
        category: 'Логика'
    },

    // ========== ЭМОЦИИ ==========
    {
        id: 'e_emotion_1',
        title: 'Сарказм',
        description: 'Высмеивает твои аргументы',
        type: CardType.EMOTION,
        shift: -2,
        vulnerability: CardType.LOGIC,
        category: 'Эмоции'
    },
    {
        id: 'e_emotion_2',
        title: 'Скептическая ухмылка',
        description: 'Серьёзно? Ты веришь в это?',
        type: CardType.EMOTION,
        shift: -3,
        vulnerability: CardType.LOGIC,
        category: 'Эмоции'
    },
    {
        id: 'e_emotion_3',
        title: 'Возмущение',
        description: 'Какая чушь!',
        type: CardType.EMOTION,
        shift: -2,
        vulnerability: CardType.LOGIC,
        category: 'Эмоции'
    },
    {
        id: 'e_emotion_4',
        title: 'Апатия',
        description: 'Мне всё равно на твои чувства',
        type: CardType.EMOTION,
        shift: -2,
        vulnerability: CardType.LOGIC,
        category: 'Эмоции'
    },

    // ========== НЕЙТРАЛЬНЫЕ ==========
    {
        id: 'e_neutral_1',
        title: 'Игнорирование',
        description: 'Просто не отвечает',
        type: CardType.NEUTRAL,
        shift: -1,
        vulnerability: null,
        category: 'Тактика'
    },
    {
        id: 'e_neutral_2',
        title: 'Смена темы',
        description: 'А что насчёт...?',
        type: CardType.NEUTRAL,
        shift: -1,
        vulnerability: null,
        category: 'Тактика'
    }
];

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { playerCards, enemyCards, CardType };
}

console.log('✅ Модуль cards_v2.js загружен');
console.log(`   📦 Карт игрока: ${playerCards.length}`);
console.log(`   📦 Карт противника: ${enemyCards.length}`);
