const EVENTS = [
    {
        name: "Змейка застряла в бесконечном цикле совещаний",
        options: [
            {
                text: "Притвориться, что связь прервалась",
                color: "green",
                effect: () => {
                    sanity = Math.min(MAX_SANITY, sanity + 15);
                    hunger = Math.max(0, hunger - 10);
                    return "Вы избежали совещания. Sanity +15%, Hunger -10%";
                },
                logText: "Змейка хитро избежала совещания, сохранив рассудок, но проголодавшись"
            },
            {
                text: "Высидеть все совещания",
                color: "red",
                effect: () => {
                    sanity = Math.max(0, sanity - 20);
                    hunger = Math.max(0, hunger - 25);
                    return "Вы высидели все совещания. Sanity -20%, Hunger -25%";
                },
                logText: "Змейка высидела все совещания, потеряв часть рассудка и сильно проголодавшись"
            }
        ]
    },
    {
        name: "Змейка получила письмо 'Срочно!' в 17:59",
        options: [
            {
                text: "Сделать вид, что не видели",
                color: "blue",
                effect: () => {
                    sanity = Math.min(MAX_SANITY, sanity + 10);
                    return "Вы проигнорировали письмо. Sanity +10%";
                },
                logText: "Змейка проигнорировала срочное письмо, сохранив рассудок"
            },
            {
                text: "Остаться и разобраться",
                color: "orange",
                effect: () => {
                    sanity = Math.max(0, sanity - 15);
                    hunger = Math.max(0, hunger - 20);
                    return "Вы остались разбираться. Sanity -15%, Hunger -20%";
                },
                logText: "Змейка осталась разбираться с срочным письмом, потеряв часть рассудка и сильно проголодавшись"
            }
        ]
    },
    {
        name: "Змейка обнаружила, что офисный холодильник пуст",
        options: [
            {
                text: "Заказать доставку",
                color: "purple",
                effect: () => {
                    hunger = Math.min(MAX_HUNGER, hunger + 30);
                    health = Math.min(MAX_HEALTH, health + 10);
                    return "Вы заказали еду. Hunger +30%, Health +10%";
                },
                logText: "Змейка заказала доставку еды, утолив голод и немного улучшив здоровье"
            },
            {
                text: "Питаться кофе до вечера",
                color: "yellow",
                effect: () => {
                    health = Math.max(0, health - 15);
                    sanity = Math.max(0, sanity - 10);
                    return "Вы пьете только кофе. Health -15%, Sanity -10%";
                },
                logText: "Змейка решила питаться только кофе, пожертвовав здоровьем и частью рассудка"
            }
        ]
    },
    {
        name: "Змейка столкнулась с багом в важном проекте",
        options: [
            {
                text: "Просидеть всю ночь, исправляя его",
                color: "red",
                effect: () => {
                    health = Math.max(0, health - 25);
                    hunger = Math.max(0, hunger - 20);
                    return "Вы исправили баг. Health -25%, Hunger -20%";
                },
                logText: "Змейка провела бессонную ночь, исправляя баг, но сильно устала и проголодалась"
            },
            {
                text: "Оставить баг на завтра",
                color: "green",
                effect: () => {
                    sanity = Math.max(0, sanity - 15);
                    return "Вы отложили проблему. Sanity -15%";
                },
                logText: "Змейка отложила решение проблемы, но теперь переживает"
            }
        ]
    },
    {
        name: "Змейка попала на корпоратив",
        options: [
            {
                text: "Активно участвовать",
                color: "yellow",
                effect: () => {
                    sanity = Math.min(MAX_SANITY, sanity + 15);
                    health = Math.max(0, health - 10);
                    return "Вы были душой компании. Sanity +15%, Health -10%";
                },
                logText: "Змейка зажгла на корпоративе, улучшив настроение, но немного устав"
            },
            {
                text: "Тихо сидеть в углу",
                color: "blue",
                effect: () => {
                    sanity = Math.max(0, sanity - 10);
                    hunger = Math.min(MAX_HUNGER, hunger + 15);
                    return "Вы тихо посидели в сторонке. Sanity -10%, Hunger +15%";
                },
                logText: "Змейка тихо отсиделась на корпоративе, немного загрустив, но хорошо поев"
            }
        ]
    },
    {
        name: "Змейка получила задание с нереальным дедлайном",
        options: [
            {
                text: "Согласиться и не спать неделю",
                color: "red",
                effect: () => {
                    health = Math.max(0, health - 30);
                    sanity = Math.max(0, sanity - 25);
                    return "Вы работали круглосуточно. Health -30%, Sanity -25%";
                },
                logText: "Змейка работала без отдыха, выполнив невозможное ценой здоровья и рассудка"
            },
            {
                text: "Объяснить, что дедлайн нереален",
                color: "green",
                effect: () => {
                    sanity = Math.min(MAX_SANITY, sanity + 20);
                    hunger = Math.max(0, hunger - 10);
                    return "Вы отстояли свою позицию. Sanity +20%, Hunger -10%";
                },
                logText: "Змейка решилась объяснить нереальность дедлайна, сохранив рассудок, но немного проголодавшись от волнения"
            }
        ]
    },
    {
        name: "Змейка застряла в офисном лифте",
        options: [
            {
                text: "Паниковать и звать на помощь",
                color: "red",
                effect: () => {
                    sanity = Math.max(0, sanity - 30);
                    hunger = Math.max(0, hunger - 15);
                    return "Вы паниковали в лифте. Sanity -30%, Hunger -15%";
                },
                logText: "Змейка запаниковала в лифте, потратив много нервов и сил"
            },
            {
                text: "Использовать время для медитации",
                color: "green",
                effect: () => {
                    sanity = Math.min(MAX_SANITY, sanity + 25);
                    health = Math.min(MAX_HEALTH, health + 10);
                    return "Вы помедитировали в лифте. Sanity +25%, Health +10%";
                },
                logText: "Змейка нашла в себе силы помедитировать в лифте, улучшив своё душевное и физическое состояние"
            }
        ]
    },
    {
        name: "Змейка узнала о внезапном аудите",
        options: [
            {
                text: "Паниковать и пытаться всё исправить",
                color: "red",
                effect: () => {
                    sanity = Math.max(0, sanity - 35);
                    health = Math.max(0, health - 20);
                    return "Вы в панике готовитесь к аудиту. Sanity -35%, Health -20%";
                },
                logText: "Змейка запаниковала из-за аудита, сильно перенервничав и истощив себя"
            },
            {
                text: "Спокойно подготовиться",
                color: "green",
                effect: () => {
                    sanity = Math.min(MAX_SANITY, sanity + 10);
                    hunger = Math.max(0, hunger - 25);
                    return "Вы методично готовитесь. Sanity +10%, Hunger -25%";
                },
                logText: "Змейка спокойно подготовилась к аудиту, сохранив рассудок, но сильно проголодавшись"
            }
        ]
    },
    {
        name: "Змейка столкнулась с неработающим кондиционером в офисе",
        options: [
            {
                text: "Работать в духоте",
                color: "red",
                effect: () => {
                    health = Math.max(0, health - 20);
                    sanity = Math.max(0, sanity - 15);
                    return "Вы мужественно терпите жару. Health -20%, Sanity -15%";
                },
                logText: "Змейка пыталась работать в душном офисе, навредив здоровью и настроению"
            },
            {
                text: "Уйти работать из дома",
                color: "green",
                effect: () => {
                    health = Math.min(MAX_HEALTH, health + 10);
                    hunger = Math.min(MAX_HUNGER, hunger + 15);
                    return "Вы работаете из дома. Health +10%, Hunger +15%";
                },
                logText: "Змейка ушла работать из дома, улучшив самочувствие и питание"
            }
        ]
    },
    {
        name: "Змейка обнаружила, что офисный кофе закончился",
        options: [
            {
                text: "Организовать поход за кофе",
                color: "green",
                effect: () => {
                    sanity = Math.min(MAX_SANITY, sanity + 20);
                    hunger = Math.max(0, hunger - 10);
                    return "Вы совершили кофейный поход. Sanity +20%, Hunger -10%";
                },
                logText: "Змейка организовала поход за кофе, подняв настроение, но потратив время на обед"
            },
            {
                text: "Работать без кофеина",
                color: "red",
                effect: () => {
                    sanity = Math.max(0, sanity - 25);
                    health = Math.max(0, health - 15);
                    return "Вы страдаете без кофе. Sanity -25%, Health -15%";
                },
                logText: "Змейка попыталась работать без кофе, измучив себя морально и физически"
            }
        ]
    }
];

function getRandomEvent() {
    return EVENTS[Math.floor(Math.random() * EVENTS.length)];
}