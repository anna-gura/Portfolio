/**
 * All user-facing copy lives here.
 *
 * Elements carry `data-i="<key>"`; I18n swaps their text content.
 * The Ukrainian dictionary is not written out: it is harvested from the
 * markup on first run, so the HTML stays readable and never falls out of
 * sync with the default language.
 */

/** Labels of the left-hand navigation, in page order. */
export const MENU_TITLES = {
  uk: ['Обкладинка', 'Роботи', 'Інструменти', 'Ціни', 'Про мене'],
  ru: ['Обложка', 'Работы', 'Инструменты', 'Цены', 'Обо мне'],
  en: ['Cover', 'Work', 'Tools', 'Pricing', 'About']
};

export const TRANSLATIONS = {
  uk: {},   // filled from the markup at start-up

  ru: {
    intro: 'Сайты для небольшого бизнеса — от готового авторского дизайна до полностью индивидуального.',
    scroll: 'ЛИСТАТЬ',
    heroCta: 'Хочу сайт',

    p1h: 'Работы',
    p1x: '',
    p1p: 'Четыре проекта разного масштаба — от готового авторского дизайна до полностью индивидуальной сцены.',
    cap1: 'Tetiana Zavialova',
    cap2: 'Точка перехода',

    p2h: 'Инструменты',
    p2x: ' бесплатные',
    p2p: 'Индивидуальная работа платная. Но всё, что я делаю не для одного клиента, а для всех — отдаю бесплатно и с открытым кодом.',
    note1: 'Индивидуально — платно.',
    note2: 'Инструменты — подарок.',
    freebie: 'Халява →',

    p3h: 'Цены',
    p3x: ' фиксированные',
    p3p: 'Сумму называю до старта, после короткого брифа. Если я не уложилась в оценку — это мой риск, не ваш. Минимальный проект — от $500.',
    cta1: 'Посчитать бюджет',

    p4h: 'Обо мне',
    p4x: '',
    p4p: 'Меня зовут Анна. Учусь на кибербезопасность и люблю вещи, в которых чувствуется рука автора.',
    p4p2: 'Лис — из Франка, из места, где я выросла. Крашеный потому, что меняет стиль, оставаясь собой.',
    cta2: 'Написать мне'
  },

  en: {
    intro: 'Websites for small businesses — from a ready-made design of mine to a fully bespoke one.',
    scroll: 'SCROLL',
    heroCta: 'I want a site',

    p1h: 'Work',
    p1x: '',
    p1p: 'Four projects of different scale — from a ready-made design of mine to a fully bespoke scene.',
    cap1: 'Tetiana Zavialova',
    cap2: 'Transition Point',

    p2h: 'Tools',
    p2x: ' are free',
    p2p: 'Client work is paid. But anything I build for everyone rather than for one client is released free and open source.',
    note1: 'Client work is paid.',
    note2: 'Tools are a gift.',
    freebie: 'Free stuff →',

    p3h: 'Pricing',
    p3x: ' is fixed',
    p3p: 'I quote after a short brief, before any work begins. If I misjudged, that is my risk, not yours. Projects start at $500.',
    cta1: 'Estimate the budget',

    p4h: 'About',
    p4x: '',
    p4p: 'My name is Anna. I study cybersecurity and I like things where you can feel the hand that made them.',
    p4p2: 'The fox comes from a Ukrainian tale and from the place I grew up in. Painted, because it changes its style while staying itself.',
    cta2: 'Write to me'
  }
};
