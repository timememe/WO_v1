// Данные о доступных колодах
const DECKS_DATA = {
    decks: [
        {
            id: "default",
            name: "Классический дебат",
            description: "Стандартная колода об истине и логике",
            file: "cards.json",
            theme: "philosophy"
        },
        {
            id: "evangelion",
            name: "Евангелион: Конец",
            description: "Дебаты о трушной концовке Евангелиона",
            file: "cards_evangelion.json",
            theme: "anime"
        },
        {
            id: "drive",
            name: "Драйв: Жив или мёртв?",
            description: "Умер ли Водитель в конце фильма Драйв?",
            file: "cards_drive.json",
            theme: "cinema"
        }
    ],
    default: "default"
};

console.log('✅ Модуль decks.js загружен');
