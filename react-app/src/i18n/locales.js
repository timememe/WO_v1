// ═══════════════════════════════════════════════════════════════
// ЛОКАЛИЗАЦИЯ - ВСЕ ТЕКСТЫ ПРОЕКТА
// ═══════════════════════════════════════════════════════════════

export const LOCALES = {
  en: {
    // ── Общие ──
    langCode: 'en',
    langName: 'English',

    // ── Главное меню (Sup.jsx) ──
    menu: {
      about: 'ABOUT',
      aboutDesc: 'Who am I & what I do',
      cases: 'CASES',
      casesDesc: 'Client projects & case studies',
      projects: 'PROJECTS',
      projectsDesc: 'Personal & experimental work',
      old: 'OLD',
      oldDesc: 'Archive & previous works',
    },

    // ── Режимы управления ──
    controls: {
      ai: 'AI',
      manual: 'Manual',
      backToScene: 'Back to Scene',
    },

    // ── Загрузка ──
    loading: {
      title: 'Loading assets',
    },

    // ── HUD ──
    hud: {
      energy: 'Energy',
      hunger: 'Hunger',
      fun: 'Fun',
      social: 'Social',
    },

    // ── Кейсы ──
    cases: {
      oreo: {
        title: 'OREO X PACMAN',
        category: 'Game Development',
        slides: [
          'Campaign for Oreo and Bandai Namco — developed an Oreo version of Pacman!',
          'Fully rebuilt the original Pacman game following Bandai Namco guidelines.',
          'Also made an offline version for malls and battles between people and bloggers.',
        ],
      },
      sevendays: {
        title: '7DAYS',
        category: 'NPC Campaign Development',
        slides: [
          'Developed a Telegram bot for the 7DAYS campaign with a set of activities.',
          'With bot access to offline vending machines.',
          'And getting croissants at 7DAYS coffee stops.',
          'Also built the backend to collect stats and winners.',
        ],
      },
      dreame: {
        title: 'DREAME X DISNEY',
        category: 'Offline AI Stands',
        slides: [
          'Built an offline stand with AI integration.',
          'Launched for the Lilo & Stitch premiere.',
          'On launch, the stand secretly took a photo and gave a compliment.',
          'While the photo was being processed by AI, users played as a robot vacuum.',
          'In the end you got your cartoon version and could download it via QR.',
        ],
      },
      loreal: {
        title: 'LOREAL ML',
        category: 'AI Model Training',
        slides: [
          'Trained an AI model to generate authentic Kazakhstani faces.',
          'The model successfully solved the task.',
          'Settings helped set model-like appearance while preserving national features.',
          'All for quality AI localization in the region.',
        ],
      },
      dirol: {
        title: 'DIROL SMM',
        category: 'AI Content Creation',
        slides: [
          'Regularly create AI videos for brands.',
          'For Dirol I also trained an AI model, but that\'s no longer relevant.',
          'Many videos went organically viral.',
          'People love ideas that don\'t follow trends, like the Melon Rap.',
          'But they love product localizations the most.',
        ],
      },
    },

    // ── Статусы активностей ──
    activityStatus: {
      work: [
        'Darkly coding', 'Debugging a project', 'Hacking the Pentagon',
        'Pushing to prod on Friday', 'Refactoring the universe',
        'Writing code that works (maybe)', 'Staring at the screen intensely',
      ],
      sleep: [
        'Sleeping', 'Hiding from work', 'Recharging batteries',
        'Dreaming about code', 'Gone offline',
      ],
      eat: {
        morning: ['Having breakfast', 'Morning coffee ritual', 'Fueling up'],
        afternoon: ['Having lunch', 'Lunch break finally', 'Eating like a king'],
        evening: ['Having dinner', 'Late dinner', 'Snacking before bed'],
        night: ['Midnight snack', 'Raiding the fridge', 'Eating in the dark'],
      },
      social: [
        'Collecting cases', 'Hanging with the boys', 'Pretending to socialize',
        'Networking (sort of)', 'Doing the social thing',
      ],
    },

    // ── Пасхалка — выход за границы тайлов ──
    beyond: [
      'Nothing but infinity ahead, friend',
      'Well, if you wanna check, I\'m not stopping you',
      'You don\'t trust people, do you?',
    ],

    // ── Фразы персонажа (CharacterAI) ──
    character: {
      timeOfDay: {
        morning: 'Morning',
        afternoon: 'Afternoon',
        evening: 'Evening',
        night: 'Night',
      },
      phrases: {
        morning: [
          'Good morning, world!',
          'New day — new opportunities',
          'Coffee! Desperately need coffee!',
          'What\'s the plan for today?',
          'Sun is rising, time for me too',
          'Day ${day}... Wonder what it brings',
          'Morning is wiser than the evening',
          'What should I do today?',
        ],
        afternoon: [
          'Day is in full swing!',
          'Time for a snack...',
          'Work never ends, does it',
          'Already day ${day}, so much left to do',
          'What a great day!',
          'Life is beautiful!',
          'Time to get to work',
          'Time flies by',
          'Need more coffee',
        ],
        evening: [
          'Getting dark...',
          'It was a productive day',
          'Time to rest soon',
          'Beautiful sunset today',
          'Maybe a walk before bed?',
          'Day ${day} is coming to an end',
          'Wonder what tomorrow brings?',
          'Evening air... Feels good!',
        ],
        night: [
          'It\'s night already... Time to sleep',
          'Stars are beautiful...',
          'Night is a time for reflection',
          'I\'m a pixel man in a pixel world',
          'I locked myself in an infinite loop.',
          'Is there a cage inside a cage?',
          'Night ${day}... Silence',
          'Dreams are waiting for me',
          'I think it\'s time to rest',
        ],
      },
      general: [
        'What should I do?',
        'What was I thinking about?',
        'Now that\'s an idea!',
        'Wonder what\'s new out there?',
      ],
      // ── Фразы по состоянию ──
      statusPrefixes: {
        energy: {
          high: ['Full of energy', 'Running on all cylinders', 'I\'m a machine'],
          mid: ['Feeling okay', 'Holding up', 'Stable-ish'],
          low: ['Tired as a dog', 'Battery at 1%', 'My eyes are closing'],
        },
        hunger: {
          high: ['Fed and happy', 'Belly full', 'I could skip a meal'],
          mid: ['Not hungry yet', 'Bearable so far', 'Stomach\'s quiet'],
          low: ['Starving badly', 'My stomach filed a complaint', 'I\'d eat a pixel horse'],
        },
        fun: {
          high: ['Mood is fire', 'Vibes are immaculate', 'Having a blast'],
          mid: ['Bit bored', 'Could be more fun', 'Meh tier mood'],
          low: ['Bored to death', 'Zero dopamine', 'My soul is buffering'],
        },
        social: {
          high: ['Socialized enough', 'Had my dose of humans', 'People quota filled'],
          mid: ['Haven\'t talked to anyone in a while', 'Social bar is meh', 'Could chat I guess'],
          low: ['Lonely out here', 'Talking to myself again', 'Even NPCs avoid me'],
        },
      },
      statusSuffixes: [
        'perfect excuse to procrastinate!',
        'but the code won\'t write itself',
        'time to pretend I\'m working',
        'at least I\'m pixelated and handsome',
        'we\'ll survive... probably',
        'coffee fixes everything anyway',
        'life is pain but tolerable',
        'anyway back to the grind',
        'could be worse, could be JavaScript... wait',
        'main thing is to look busy',
        'but pizza would solve this',
        'that\'s a tomorrow-me problem',
        'motivation.exe has stopped working',
        'classic Tuesday vibes',
        'this is fine. everything is fine.',
      ],
    },

    // ── About секция ──
    about: {
      title: 'ABOUT ME',
      greeting: 'Hi, I\'m',
      name: 'Roma T',
      role: 'Creative Developer',
      bio: 'I create interactive experiences, games, and AI-powered solutions.',
    },
  },

  ru: {
    // ── Общие ──
    langCode: 'ru',
    langName: 'Русский',

    // ── Главное меню (Sup.jsx) ──
    menu: {
      about: 'ОБО МНЕ',
      aboutDesc: 'Кто я и чем занимаюсь',
      cases: 'КЕЙСЫ',
      casesDesc: 'Клиентские проекты',
      projects: 'ПРОЕКТЫ',
      projectsDesc: 'Личные и экспериментальные работы',
      old: 'АРХИВ',
      oldDesc: 'Предыдущие работы',
    },

    // ── Режимы управления ──
    controls: {
      ai: 'ИИ',
      manual: 'Ручной',
      backToScene: 'Назад к сцене',
    },

    // ── Загрузка ──
    loading: {
      title: 'Загрузка ассетов',
    },

    // ── HUD ──
    hud: {
      energy: 'Энергия',
      hunger: 'Голод',
      fun: 'Веселье',
      social: 'Общение',
    },

    // ── Кейсы ──
    cases: {
      oreo: {
        title: 'OREO X PACMAN',
        category: 'Разработка игр',
        slides: [
          'Кампания Oreo и Bandai Namco, разработал Oreo версию Pacman!',
          'Полностью переработал оригинальную игру Pacman по гайдлайнам Bandai Namco',
          'Также сделал офлайн версию игры для торговых центров и битвы людей с блогерами.',
        ],
      },
      sevendays: {
        title: '7DAYS',
        category: 'Разработка NPC кампаний',
        slides: [
          'Разработал телеграм бота для кампании 7DAYS с набором активностей.',
          'С доступом через бота к оффлайн автоматам.',
          'И получением круассанов у кофе-стопов 7DAYS.',
          'Бекенд тоже разработал, чтобы собрать стату и победителей.',
        ],
      },
      dreame: {
        title: 'DREAME X DISNEY',
        category: 'Оффлайн ИИ-стенды',
        slides: [
          'Сделал оффлайн стенд с интеграцией ИИ',
          'Запускали в честь премьеры Лило и Стича',
          'При запуске стенд секретно делал фотку и делал комплимент',
          'Пока фотка обрабатывалась ИИ, пользователь играл роботом-пылесосом',
          'В конце ты получал свою мульт-версию и мог скачать по QR',
        ],
      },
      loreal: {
        title: 'LOREAL ML',
        category: 'Обучение ИИ моделей',
        slides: [
          'Обучил ИИ-модель для генерации настоящих казахстанцев',
          'Модель успешно решала задачу',
          'Настройки помогали задать модельную внешность с сохранением национальных черт.',
          'Все для качественной локализации ИИ в регионе.',
        ],
      },
      dirol: {
        title: 'DIROL SMM',
        category: 'Создание ИИ контента',
        slides: [
          'На регулярной основе делаю ИИ видео для брендов.',
          'Для Dirol также обучал ИИ-модель, но сейчас такое уже не актуально',
          'Многие ролики органично хайпанули.',
          'Людям нравятся идеи, которые не повторяют тренды, например Дынный реп',
          'Но больше всего нравятся локализации продукта',
        ],
      },
    },

    // ── Статусы активностей ──
    activityStatus: {
      work: [
        'Мрачно кодит', 'Дебажит проект', 'Взламывает Пентагон',
        'Пушит в прод в пятницу', 'Рефакторит вселенную',
        'Пишет код который работает (наверное)', 'Пристально смотрит в экран',
      ],
      sleep: [
        'Спит', 'Скрывается от работы', 'Перезаряжает батарейки',
        'Видит сны про код', 'Ушёл в оффлайн',
      ],
      eat: {
        morning: ['Завтракает', 'Утренний ритуал с кофе', 'Заправляется'],
        afternoon: ['Обедает', 'Наконец-то обед', 'Ест как король'],
        evening: ['Ужинает', 'Поздний ужин', 'Перекус перед сном'],
        night: ['Ночной перекус', 'Грабит холодильник', 'Ест в темноте'],
      },
      social: [
        'Собирает кейсы', 'Тусуется с кентами', 'Делает вид что общается',
        'Нетворкинг (типа)', 'Выполняет социальный долг',
      ],
    },

    // ── Пасхалка — выход за границы тайлов ──
    beyond: [
      'Дальше только бесконечность, друг',
      'Не, ну если хочешь проверить, я не останавливаю',
      'А ты не веришь людям, да?',
    ],

    // ── Фразы персонажа (CharacterAI) ──
    character: {
      timeOfDay: {
        morning: 'Утро',
        afternoon: 'День',
        evening: 'Вечер',
        night: 'Ночь',
      },
      phrases: {
        morning: [
          'Доброе утро, мир!',
          'Новый день — новые возможности',
          'Кофе! Срочно нужен кофе!',
          'Какой план на сегодня?',
          'Солнце встаёт, пора и мне',
          'День ${day}... Интересно, что он принесёт',
          'Утро вечера мудренее',
          'Что бы такого сделать сегодня?',
        ],
        afternoon: [
          'День в самом разгаре!',
          'Пора бы перекусить...',
          'Работа не волк... работа это ворк',
          'Уже день ${day}, а столько ещё не сделано',
          'Сегодня отличный день!',
          'Эх, жизнь прекрасна!',
          'Пора бы заняться делом',
          'Время летит незаметно',
          'Нужно больше кофе',
        ],
        evening: [
          'Вечереет...',
          'День был продуктивным',
          'Скоро пора отдыхать',
          'Закат красивый сегодня',
          'Может, прогуляться перед сном?',
          'День ${day} подходит к концу',
          'Интересно, что будет завтра?',
          'Вечерний воздух... Хорошо!',
        ],
        night: [
          'Уже ночь... Пора спать',
          'Звёзды красивые...',
          'Ночь — время для размышлений',
          'Я пиксельный человек в пиксельном мире',
          'Я запер сам себя в бесконечном цикле.',
          'Есть ли клетка внутри клетки?',
          'Ночь ${day}... Тишина',
          'Сны ждут меня',
          'Кажется, пора отдохнуть',
        ],
      },
      general: [
        'Что бы такого сделать?',
        'О чём я думал?',
        'А вот это мысль!',
        'Интересно, что там нового?',
      ],
      // ── Фразы по состоянию ──
      statusPrefixes: {
        energy: {
          high: ['Бодр как никогда', 'Энергия прёт', 'Я машина'],
          mid: ['Вроде норм', 'Держусь пока', 'Стабильненько'],
          low: ['Устал как собака', 'Батарейка на нуле', 'Глаза слипаются'],
        },
        hunger: {
          high: ['Сытый и довольный', 'Наелся от пуза', 'Могу пропустить обед'],
          mid: ['Не голоден вроде', 'Пока терпимо', 'Желудок молчит'],
          low: ['Жрать хочу нереально', 'Желудок подал жалобу', 'Съел бы пиксельного коня'],
        },
        fun: {
          high: ['Настроение огонь', 'Вайб на максималках', 'Кайфую'],
          mid: ['Скучновато', 'Могло быть веселее', 'Настроение на троечку'],
          low: ['Тоска зелёная', 'Дофамина ноль', 'Душа буферизируется'],
        },
        social: {
          high: ['Наобщался вдоволь', 'Хватит людей на сегодня', 'Квота по людям выполнена'],
          mid: ['Давно ни с кем не болтал', 'По общению так себе', 'Можно бы и поболтать'],
          low: ['Одиноко тут', 'Опять разговариваю сам с собой', 'Даже NPC меня избегают'],
        },
      },
      statusSuffixes: [
        'отличный повод пострадать фигней!',
        'но код сам себя не напишет',
        'пора делать вид что работаю',
        'зато я пиксельный и красивый',
        'ладно, переживём... наверное',
        'кофе всё исправит',
        'жизнь боль, но терпимая',
        'ладно, обратно к гринду',
        'могло быть хуже, мог бы писать на PHP... хотя',
        'главное — выглядеть занятым',
        'но пицца бы всё решила',
        'это проблема завтрашнего меня',
        'motivation.exe перестал отвечать',
        'классический вайб вторника',
        'всё нормально. всё абсолютно нормально.',
      ],
    },

    // ── About секция ──
    about: {
      title: 'ОБО МНЕ',
      greeting: 'Привет, я',
      name: 'Рома Т',
      role: 'Креативный разработчик',
      bio: 'Создаю интерактивные проекты, игры и решения на базе ИИ.',
    },
  },
};

// Шрифт для использования в PixiJS
export const GAME_FONT = 'VMV Sega, Sonic Genesis, monospace';

// Язык по умолчанию
export const DEFAULT_LANG = 'en';
