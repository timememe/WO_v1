// ═══════════════════════════════════════════════════════════════
// getabuff — данные предметов и баффов (RU / EN)
// Каждый бафф — реальная полезная привычка, переупакованная в RPG-язык.
// ═══════════════════════════════════════════════════════════════

export const UI = {
  ru: {
    titleBefore: 'Хочешь почувствовать себя ',
    titleEm: 'лучше',
    titleAfter: '?',
    roll: 'Получи бафф',
    claimed: 'Бафф на сегодня получен',
    share: 'Поделиться баффом',
    copied: 'Ссылка скопирована',
    showMine: 'Показать мой бафф',
    sharedNote: 'этим баффом поделились с тобой',
    shareText: 'Мой бафф на сегодня — «{item}»: {buff}',
    footer: 'один бафф в день, эффект до полуночи',
    tiers: { common: 'Обычный', rare: 'Редкий', epic: 'Эпический', legendary: 'Легендарный' },
  },
  en: {
    titleBefore: 'Want to feel ',
    titleEm: 'better',
    titleAfter: '?',
    roll: 'Get a buff',
    claimed: 'Today’s buff is claimed',
    share: 'Share the buff',
    copied: 'Link copied',
    showMine: 'Show my buff',
    sharedNote: 'a buff someone shared with you',
    shareText: 'My buff for today — «{item}»: {buff}',
    footer: 'one buff a day, effect lasts until midnight',
    tiers: { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' },
  },
};

export const BUFFS = [
  // ── common ──────────────────────────────────────────────────
  {
    rarity: 'common',
    ru: { item: 'Стакан воды', buff: '+15 к бодрости, снят дебафф «Сушняк»', flavor: 'Выпей прямо сейчас. Серьёзно.' },
    en: { item: 'Glass of water', buff: '+15 Alertness, «Cottonmouth» debuff removed', flavor: 'Drink one right now. Seriously.' },
  },
  {
    rarity: 'common',
    ru: { item: 'Пешая прогулка на 10 минут', buff: '+20 к ясности мышления', flavor: 'Работает лучше, чем пятая чашка кофе.' },
    en: { item: 'A 10-minute walk', buff: '+20 Mental Clarity', flavor: 'Beats a fifth cup of coffee.' },
  },
  {
    rarity: 'common',
    ru: { item: 'Открытое окно', buff: '+12 к концентрации, −30% к сонливости', flavor: 'Мозгу нужен кислород, а не героизм.' },
    en: { item: 'An open window', buff: '+12 Focus, −30% Drowsiness', flavor: 'Your brain wants oxygen, not heroics.' },
  },
  {
    rarity: 'common',
    ru: { item: 'Заправленная кровать', buff: '+10 к самоуважению на весь день', flavor: 'Одна победа до завтрака уже случилась.' },
    en: { item: 'A made bed', buff: '+10 Self-respect for the whole day', flavor: 'One win before breakfast, already done.' },
  },
  {
    rarity: 'common',
    ru: { item: 'Список из трёх дел', buff: '+25 к продуктивности, снят паралич выбора', flavor: 'Не десять. Три.' },
    en: { item: 'A list of three tasks', buff: '+25 Productivity, choice paralysis removed', flavor: 'Not ten. Three.' },
  },
  {
    rarity: 'common',
    ru: { item: 'Телефон в другой комнате', buff: '+40 к вниманию на один час', flavor: 'Он тебя подождёт. Честно.' },
    en: { item: 'Phone in another room', buff: '+40 Attention for one hour', flavor: 'It will wait for you. Honest.' },
  },
  {
    rarity: 'common',
    ru: { item: 'Пять глубоких вдохов', buff: '−35 к тревоге, +10 к голосу разума', flavor: 'Вдох на 4, выдох на 6. Повтори.' },
    en: { item: 'Five deep breaths', buff: '−35 Anxiety, +10 Voice of Reason', flavor: 'In for 4, out for 6. Repeat.' },
  },
  {
    rarity: 'common',
    ru: { item: 'Свежие носки', buff: '+8 к настроению, +5 к ощущению, что жизнь налаживается', flavor: 'Мелочь, а работает.' },
    en: { item: 'Fresh socks', buff: '+8 Mood, +5 sense that life is coming together', flavor: 'Small thing, works anyway.' },
  },
  {
    rarity: 'common',
    ru: { item: 'Помытая посуда', buff: '+18 к спокойствию, раковина больше не смотрит с укором', flavor: 'Будущий ты скажет спасибо.' },
    en: { item: 'Washed dishes', buff: '+18 Calm, the sink stops glaring at you', flavor: 'Future you says thanks.' },
  },
  {
    rarity: 'common',
    ru: { item: 'Приём пищи без экрана', buff: '+15 к насыщению, +10 к вкусу еды', flavor: 'Ты помнишь, что ел вчера на обед?' },
    en: { item: 'A meal with no screen', buff: '+15 Satiety, +10 Flavor', flavor: 'Do you remember yesterday’s lunch?' },
  },
  {
    rarity: 'common',
    ru: { item: 'Будильник на 15 минут раньше', buff: '+20 к утреннему спокойствию, снят режим «опаздываю»', flavor: 'Утро без спешки — забытая роскошь.' },
    en: { item: 'Alarm 15 minutes earlier', buff: '+20 Morning Calm, «running late» mode removed', flavor: 'An unhurried morning is a forgotten luxury.' },
  },
  {
    rarity: 'common',
    ru: { item: 'Разобранный рабочий стол', buff: '+22 к фокусу, −50% к фразе «где эта бумажка»', flavor: 'Внешний порядок ведёт к внутреннему.' },
    en: { item: 'A cleared desk', buff: '+22 Focus, −50% «where is that paper»', flavor: 'Outer order leads to inner order.' },
  },
  {
    rarity: 'common',
    ru: { item: 'Один разговор вслух', buff: '+15 к социальной энергии', flavor: 'Позвони тому, о ком подумал.' },
    en: { item: 'One conversation out loud', buff: '+15 Social Energy', flavor: 'Call the person you just thought of.' },
  },
  {
    rarity: 'common',
    ru: { item: 'Пятиминутная растяжка', buff: '+14 к подвижности, −20 к «тело как деревяшка»', flavor: 'Спина у тебя одна.' },
    en: { item: 'A five-minute stretch', buff: '+14 Mobility, −20 «body like a plank»', flavor: 'You only get one spine.' },
  },

  // ── rare ────────────────────────────────────────────────────
  {
    rarity: 'rare',
    ru: { item: 'Камень социализации', buff: '+10 к социальным навыкам, первый разговор без дебаффа «неловкость»', flavor: 'Держи в кармане. Просто знай, что он там.' },
    en: { item: 'Stone of Socializing', buff: '+10 Social Skills, first conversation with no «awkwardness» debuff', flavor: 'Keep it in your pocket. Just know it is there.' },
  },
  {
    rarity: 'rare',
    ru: { item: 'Амулет отказа', buff: '+30 к личным границам, −100% к обязательствам, которые тебе не нужны', flavor: '«Нет» — это законченное предложение.' },
    en: { item: 'Amulet of Refusal', buff: '+30 Boundaries, −100% obligations you do not want', flavor: '«No» is a complete sentence.' },
  },
  {
    rarity: 'rare',
    ru: { item: 'Восьмичасовой сон', buff: '+50 ко всем характеристикам до вечера', flavor: 'Самый душный бафф в игре. И самый сильный.' },
    en: { item: 'Eight hours of sleep', buff: '+50 to every stat until evening', flavor: 'The most boring buff in the game. And the strongest.' },
  },
  {
    rarity: 'rare',
    ru: { item: 'Тренировка на 20 минут', buff: '+35 к энергии, +20 к настроению, +5 к осанке', flavor: 'Начни. Разомнёшься по ходу.' },
    en: { item: 'A 20-minute workout', buff: '+35 Energy, +20 Mood, +5 Posture', flavor: 'Just start. You will warm up on the way.' },
  },
  {
    rarity: 'rare',
    ru: { item: 'Свиток завершения', buff: '+40 к удовлетворению, снят дебафф «десять вкладок в голове»', flavor: 'Доведи хоть что-то до финала сегодня.' },
    en: { item: 'Scroll of Completion', buff: '+40 Satisfaction, «ten tabs open in your head» debuff removed', flavor: 'Finish just one thing today.' },
  },
  {
    rarity: 'rare',
    ru: { item: 'Эликсир раннего часа', buff: '+30 к завтрашнему тебе', flavor: 'Ложись до полуночи. Завтрашний ты — тоже ты.' },
    en: { item: 'Elixir of the Early Hour', buff: '+30 to tomorrow’s you', flavor: 'Be in bed before midnight. Tomorrow’s you is still you.' },
  },
  {
    rarity: 'rare',
    ru: { item: 'Перчатки честного разговора', buff: '+25 к отношениям, снята накопленная обида уровня 3', flavor: 'Скажи то, что откладывал две недели.' },
    en: { item: 'Gloves of the Honest Talk', buff: '+25 Relationship, level-3 stored resentment cleared', flavor: 'Say the thing you have put off for two weeks.' },
  },
  {
    rarity: 'rare',
    ru: { item: 'Плащ тишины', buff: '+20 к присутствию в моменте, +15 к случайным хорошим мыслям', flavor: 'Погуляй без наушников. Тишина тоже что-то говорит.' },
    en: { item: 'Cloak of Silence', buff: '+20 Presence, +15 random good ideas', flavor: 'Take a walk with no headphones. Silence says things too.' },
  },
  {
    rarity: 'rare',
    ru: { item: 'Кольцо уединения', buff: '+45 к глубокой работе на 90 минут', flavor: 'Режим «в самолёте» на полтора часа. Мир не рухнет.' },
    en: { item: 'Ring of Seclusion', buff: '+45 Deep Work for 90 minutes', flavor: 'Airplane mode for an hour and a half. The world holds.' },
  },
  {
    rarity: 'rare',
    ru: { item: 'Записная книжка благодарности', buff: '+20 к базовому уровню счастья', flavor: 'Три вещи за сегодня. Даже маленькие.' },
    en: { item: 'Gratitude Notebook', buff: '+20 baseline Happiness', flavor: 'Three things from today. Small ones count.' },
  },
  {
    rarity: 'rare',
    ru: { item: 'Оберег покоя', buff: '−60% к фантомной тревоге, +30 к вниманию', flavor: 'Выключи уведомления. Красные кружочки тебе не начальники.' },
    en: { item: 'Charm of Quiet', buff: '−60% phantom anxiety, +30 Attention', flavor: 'Turn off notifications. Red badges are not your boss.' },
  },
  {
    rarity: 'rare',
    ru: { item: 'Фляга полуденного привала', buff: '+25 к выносливости во второй половине дня', flavor: 'Сделай перерыв на обед. Работать сквозь него — не флекс.' },
    en: { item: 'Flask of the Midday Rest', buff: '+25 Stamina for the afternoon', flavor: 'Take a real lunch break. Working through it is not a flex.' },
  },

  // ── epic ────────────────────────────────────────────────────
  {
    rarity: 'epic',
    ru: { item: 'Печать финансовой ясности', buff: '+40 к спокойствию: ты наконец знаешь, сколько тратишь', flavor: 'Открой банковское приложение. Посмотри честно.' },
    en: { item: 'Seal of Financial Clarity', buff: '+40 Calm: you finally know what you spend', flavor: 'Open your banking app. Look honestly.' },
  },
  {
    rarity: 'epic',
    ru: { item: 'Меч возвращённых часов', buff: '+2 часа к жизни ежедневно, снят дебафф «бесконечная лента»', flavor: 'Удали одно приложение. Ты знаешь, какое именно.' },
    en: { item: 'Sword of Reclaimed Hours', buff: '+2 hours of life per day, «infinite feed» debuff removed', flavor: 'Delete one app. You know exactly which one.' },
  },
  {
    rarity: 'epic',
    ru: { item: 'Мантия ранних планов на выходные', buff: '+50 к предвкушению, суббота больше не растворяется в никуда', flavor: 'Запланируй одно хорошее дело заранее.' },
    en: { item: 'Mantle of Early Weekend Plans', buff: '+50 Anticipation, Saturday stops dissolving into nothing', flavor: 'Plan one good thing in advance.' },
  },
  {
    rarity: 'epic',
    ru: { item: 'Талисман здравия', buff: '−80% к фоновому «надо бы провериться»', flavor: 'Запишись на тот приём, что тянешь с весны.' },
    en: { item: 'Talisman of Wellbeing', buff: '−80% background «I should get that checked»', flavor: 'Book the appointment you have dodged since spring.' },
  },
  {
    rarity: 'epic',
    ru: { item: 'Гримуар одной книги', buff: '+30 к вниманию, +25 к разговорам за ужином', flavor: '20 страниц в день — это книга в неделю.' },
    en: { item: 'Grimoire of One Book', buff: '+30 Attention, +25 dinner conversation', flavor: '20 pages a day is a book a week.' },
  },
  {
    rarity: 'epic',
    ru: { item: 'Ключ от пустых полок', buff: '+35 к лёгкости, −1 мешок вещей, которые тянули вниз', flavor: 'Разбери шкаф. Не носил год — не наденешь.' },
    en: { item: 'Key to Empty Shelves', buff: '+35 Lightness, −1 bag of stuff that weighed you down', flavor: 'Clear out the closet. Not worn in a year, never will be.' },
  },
  {
    rarity: 'epic',
    ru: { item: 'Компас нового маршрута', buff: '+40 к любопытству, мозг строит свежие тропы', flavor: 'Пройди домой другой дорогой.' },
    en: { item: 'Compass of the New Route', buff: '+40 Curiosity, your brain lays fresh paths', flavor: 'Walk home a different way.' },
  },
  {
    rarity: 'epic',
    ru: { item: 'Свиток примирения', buff: '+60 к отношениям, снят дебафф «холодная война» с близким', flavor: 'Извинись первым. Гордость — плохая валюта.' },
    en: { item: 'Scroll of Reconciliation', buff: '+60 Relationship, «cold war» debuff with someone close removed', flavor: 'Apologize first. Pride is a poor currency.' },
  },

  // ── legendary ───────────────────────────────────────────────
  {
    rarity: 'legendary',
    ru: { item: 'Венец семи рассветов', buff: '+100 к энергии, циркадный ритм перекалиброван', flavor: 'Ложись и вставай в один час семь дней подряд. Почти никто не доносит.' },
    en: { item: 'Crown of Seven Dawns', buff: '+100 Energy, circadian rhythm recalibrated', flavor: 'Same sleep and wake time, seven days straight. Almost nobody makes it.' },
  },
  {
    rarity: 'legendary',
    ru: { item: 'Реликвия ясного пути', buff: '+80 к направлению, туман целей рассеян', flavor: 'Скажи вслух, чего хочешь от жизни. Хоть себе.' },
    en: { item: 'Relic of the Clear Path', buff: '+80 Direction, the goal-fog lifts', flavor: 'Say out loud what you want from life. Even just to yourself.' },
  },
  {
    rarity: 'legendary',
    ru: { item: 'Философский камень маленьких шагов', buff: 'Превращает «когда-нибудь» в «по чуть-чуть каждый день»', flavor: '5 минут в день бьют 5 часов раз в месяц.' },
    en: { item: 'Philosopher’s Stone of Small Steps', buff: 'Turns «someday» into «a little every day»', flavor: '5 minutes daily beats 5 hours once a month.' },
  },
  {
    rarity: 'legendary',
    ru: { item: 'Сердце прощения', buff: '−90 к грузу, который таскал годами, +50 ко всему остальному', flavor: 'Прости себя за старое. Тот ты делал что мог с тем, что знал тогда.' },
    en: { item: 'Heart of Forgiveness', buff: '−90 weight you have hauled for years, +50 to everything else', flavor: 'Forgive your past self. He did what he could with what he knew.' },
  },
  {
    rarity: 'legendary',
    ru: { item: 'Печать родного голоса', buff: '+70 к теплу, +∞ к тому, о чём потом не пожалеешь', flavor: 'Позвони родителям. Не по поводу — просто узнать, как они.' },
    en: { item: 'Seal of a Familiar Voice', buff: '+70 Warmth, +∞ to things you will not regret', flavor: 'Call your parents. No reason, just to hear how they are.' },
  },
];
