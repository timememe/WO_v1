// Event definitions
const EVENTS = [
    {
        name: "Змейка экзистенциально устала",
        options: [
            {
                text: "Погрустить",
                color: "blue",
                effect: () => {
                    sanity = Math.max(0, sanity - 30);
                    return "Вы погрустили. Sanity -30%";
                },
                logText: "Змейка погрустила и потеряла часть рассудка"
            },
            {
                text: "Уйти в запой",
                color: "purple",
                effect: () => {
                    health = Math.max(0, health - 30);
                    return "Вы ушли в запой. Health -30%";
                },
                logText: "Змейка ушла в запой, здоровье пошатнулось"
            }
        ]
    },
    {
        name: "Змейка нашла странный гриб",
        options: [
            {
                text: "Съесть",
                color: "red",
                effect: () => {
                    sanity = Math.max(0, sanity - 20);
                    hunger = Math.min(MAX_HUNGER, hunger + 20);
                    return "Вы съели гриб. Sanity -20%, Hunger +20%";
                },
                logText: "Змейка съела странный гриб. Это было... интересно"
            },
            {
                text: "Оставить",
                color: "green",
                effect: () => {
                    sanity = Math.min(MAX_SANITY, sanity + 10);
                    return "Вы проявили благоразумие. Sanity +10%";
                },
                logText: "Змейка проявила благоразумие и не стала есть подозрительный гриб"
            }
        ]
    },
    {
        name: "Змейка встретила мудреца",
        options: [
            {
                text: "Поговорить",
                color: "yellow",
                effect: () => {
                    sanity = Math.min(MAX_SANITY, sanity + 20);
                    hunger = Math.max(0, hunger - 10);
                    return "Вы поговорили с мудрецом. Sanity +20%, Hunger -10%";
                },
                logText: "Змейка поговорила с мудрецом и узнала много нового"
            },
            {
                text: "Пройти мимо",
                color: "orange",
                effect: () => {
                    return "Вы прошли мимо. Ничего не изменилось.";
                },
                logText: "Змейка прошла мимо мудреца. Возможность упущена"
            }
        ]
    }
];

// Function to get a random event
function getRandomEvent() {
    return EVENTS[Math.floor(Math.random() * EVENTS.length)];
}