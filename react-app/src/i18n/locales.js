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
