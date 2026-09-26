/**
 * Copy for the pricing page, in all three languages, keyed by the ids used
 * in `js/data/pricing.js`. Numbers never appear here; words never appear there.
 */
export const PRICING_COPY = {

  uk: {
    ui: {
      back: '← Painted Fox Studio',
      title: 'Зберіть проєкт і подивіться на ціну',
      lede: 'Біля кожного пункту видно, скільки він додає. Якщо бюджет не сходиться — знімайте позначки й дивіться, де компроміс дешевший за очікування.',
      hBase: 'Базові пакети', hBaseHint: 'З чого починаємо. Далі все додається зверху.',
      hScope: 'Додатки до пакетів', hMotion: 'Рух і графіка', hExtras: 'Додатково', hAfter: 'Після запуску',
      per: '/ шт', from: 'від',
      support: 'Підтримка після запуску',
      supportDesc: 'Дрібні правки, оновлення, резервні копії. Можна скасувати будь-коли.',
      instalment: 'Оплата частинами, 12 місяців',
      instalmentDesc: 'Замість однієї суми — щомісячний платіж.',
      month: '/міс', months: '× 12 місяців', supportShort: 'підтримка',
      corridor: 'Реалістичний коридор:', afterBrief: 'Точна сума — після брифа.',
      note: 'Це прикидка, а не рахунок. Реальна ціна фіксується після короткого брифа — і вже не змінюється: якщо я не вклалася в оцінку, це мій ризик, не ваш. Мінімальний проєкт — від $500.',
      showcase: 'подивитися приклад →', included: 'входить у ціну', order: 'Замовити',
      pageWord: ['сторінка', 'сторінки', 'сторінок'],
      langWord: 'мови', roundWord: 'раунди правок'
    },
    bases: {
      tpl:   { name: 'На готовому авторському дизайні', desc: 'Один із моїх дизайнів, підігнаний під вас: ваші кольори, шрифти, тексти й фото.' },
      one:   { name: 'Односторінковий сайт з нуля',     desc: 'Дизайн малюється під вас. Один довгий екран із власним ритмом.' },
      multi: { name: 'Багатосторінковий сайт',          desc: 'Окремі сторінки зі своєю структурою й навігацією.' },
      full:  { name: 'Повне видання',                   desc: 'Усе, що я вмію, в одному проєкті: сім сторінок, кожна можливість і авторська сцена.' }
    },
    counters: {
      pages:  { name: 'Додаткові сторінки', desc: 'Понад ті, що вже входять в основу.' },
      langs:  { name: 'Додаткові мови',     desc: 'Переклад робите ви, я підключаю перемикач і верстаю.' },
      rounds: { name: 'Раунди правок понад два', desc: 'Два входять у будь-який проєкт.' }
    },
    motion: {
      calm:  { name: 'Плавні анімації', desc: 'Плавні появи блоків, живі кнопки, акуратні переходи. Входить у будь-який проєкт.' },
      flow:  { name: 'Хореографія',   desc: 'Елементи з’являються в задуманому порядку, паралакс, переходи між сторінками. Сайт відчувається зробленим, а не зверстаним.' },
      scene: { name: 'Авторська сцена', desc: 'Сцена, побудована під проєкт: WebGL, шейдери, керована фізика світла. Те, чого немає більше ні в кого.' }
    },
    extras: {
      dark:  { name: 'Світла й темна теми', desc: 'Дві повноцінні палітри з перемикачем.' },
      seo:   { name: 'Розширене локальне SEO', desc: 'Google Business, розмітка, тексти під пошук по місту.' },
      forms: { name: 'Бронювання або оплата', desc: 'Підключення сервісу — Vagaro, Calendly, Stripe тощо.' },
      cms:   { name: 'Самостійне редагування', desc: 'Змінюєте тексти, фото й ціни самостійно, через адмінку.' },
      mail:  { name: 'Аналітика й пошта на домені', desc: 'Статистика відвідувань і скринька на вашому домені.' },
      brand: { name: 'Логотип та айдентика', desc: 'Знак, палітра, шрифти, файли для друку й соцмереж.' }
    }
  },

  ru: {
    ui: {
      back: '← Painted Fox Studio',
      title: 'Соберите проект и посмотрите на цену',
      lede: 'Рядом с каждым пунктом видно, сколько он добавляет. Если бюджет не сходится — снимайте отметки и смотрите, где компромисс дешевле ожиданий.',
      hBase: 'Базовые пакеты', hBaseHint: 'С чего начинаем. Дальше всё добавляется сверху.',
      hScope: 'Дополнения к пакетам', hMotion: 'Движение и графика', hExtras: 'Дополнительно', hAfter: 'После запуска',
      per: '/ шт', from: 'от',
      support: 'Поддержка после запуска',
      supportDesc: 'Мелкие правки, обновления, резервные копии. Можно отменить в любой момент.',
      instalment: 'Оплата частями, 12 месяцев',
      instalmentDesc: 'Вместо одной суммы — ежемесячный платёж.',
      month: '/мес', months: '× 12 месяцев', supportShort: 'поддержка',
      corridor: 'Реалистичный коридор:', afterBrief: 'Точная сумма — после брифа.',
      note: 'Это прикидка, а не счёт. Реальная цена фиксируется после короткого брифа — и уже не меняется: если я не уложилась в оценку, это мой риск, не ваш. Минимальный проект — от $500.',
      showcase: 'посмотреть пример →', included: 'входит в цену', order: 'Заказать',
      pageWord: ['страница', 'страницы', 'страниц'],
      langWord: 'языка', roundWord: 'раунда правок'
    },
    bases: {
      tpl:   { name: 'На готовом авторском дизайне', desc: 'Один из моих дизайнов, подогнанный под вас: ваши цвета, шрифты, тексты и фото.' },
      one:   { name: 'Одностраничный сайт с нуля',   desc: 'Дизайн рисуется под вас. Один длинный экран со своим ритмом.' },
      multi: { name: 'Многостраничный сайт',         desc: 'Отдельные страницы со своей структурой и навигацией.' },
      full:  { name: 'Полное издание',               desc: 'Всё, что я умею, в одном проекте: семь страниц, каждая возможность и авторская сцена.' }
    },
    counters: {
      pages:  { name: 'Дополнительные страницы', desc: 'Сверх тех, что уже входят в основу.' },
      langs:  { name: 'Дополнительные языки',    desc: 'Перевод делаете вы, я подключаю переключатель и вёрстку.' },
      rounds: { name: 'Раунды правок сверх двух', desc: 'Два входят в любой проект.' }
    },
    motion: {
      calm:  { name: 'Плавные анимации', desc: 'Плавные появления блоков, живые кнопки, аккуратные переходы. Входит в любой проект.' },
      flow:  { name: 'Хореография',        desc: 'Элементы появляются в задуманном порядке, параллакс, переходы между страницами. Сайт ощущается сделанным, а не свёрстанным.' },
      scene: { name: 'Авторская сцена',    desc: 'Сцена, построенная под проект: WebGL, шейдеры, управляемая физика света. То, чего нет больше ни у кого.' }
    },
    extras: {
      dark:  { name: 'Светлая и тёмная темы', desc: 'Две полноценные палитры с переключателем.' },
      seo:   { name: 'Расширенное локальное SEO', desc: 'Google Business, разметка, тексты под поиск по городу.' },
      forms: { name: 'Бронирование или оплата', desc: 'Подключение сервиса — Vagaro, Calendly, Stripe и подобных.' },
      cms:   { name: 'Самостоятельное редактирование', desc: 'Меняете тексты, фото и цены сами, через админку.' },
      mail:  { name: 'Аналитика и почта на домене', desc: 'Статистика посещений и ящик на вашем домене.' },
      brand: { name: 'Логотип и айдентика', desc: 'Знак, палитра, шрифты, файлы для печати и соцсетей.' }
    }
  },

  en: {
    ui: {
      back: '← Painted Fox Studio',
      title: 'Build the project and watch the price',
      lede: 'Every line shows what it adds. If the budget does not add up, untick things and see which compromise is cheaper than you feared.',
      hBase: 'Base packages', hBaseHint: 'Where we begin. Everything else is added on top.',
      hScope: 'Add-ons', hMotion: 'Motion and graphics', hExtras: 'Extras', hAfter: 'After launch',
      per: 'each', from: 'from',
      support: 'Support after launch',
      supportDesc: 'Small fixes, updates, backups. Cancel any time.',
      instalment: 'Paying monthly, 12 months',
      instalmentDesc: 'A monthly payment instead of one sum.',
      month: '/mo', months: '× 12 months', supportShort: 'support',
      corridor: 'Realistic range:', afterBrief: 'The exact figure comes after a brief.',
      note: 'This is an estimate, not an invoice. The real price is fixed after a short brief and does not change afterwards: if I misjudged it, that is my risk, not yours. Projects start at $500.',
      showcase: 'see an example →', included: 'included', order: 'Get in touch',
      pageWord: ['page', 'pages', 'pages'],
      langWord: 'languages', roundWord: 'revision rounds'
    },
    bases: {
      tpl:   { name: 'On a ready-made design of mine', desc: 'One of my own designs fitted to you: your colours, type, copy and photography.' },
      one:   { name: 'One-page site from scratch',     desc: 'Designed for you. A single long screen with a rhythm of its own.' },
      multi: { name: 'Multi-page site',                desc: 'Separate pages with their own structure and navigation.' },
      full:  { name: 'Full edition',                   desc: 'Everything I can do in one project: seven pages, every option and a bespoke scene.' }
    },
    counters: {
      pages:  { name: 'Extra pages',   desc: 'Beyond the ones already included.' },
      langs:  { name: 'Extra languages', desc: 'You provide the translation; I wire up the switch and lay it out.' },
      rounds: { name: 'Revision rounds beyond two', desc: 'Two are included in every project.' }
    },
    motion: {
      calm:  { name: 'Smooth animation',  desc: 'Blocks fade in, buttons respond, transitions are tidy. Included in every project.' },
      flow:  { name: 'Choreography',  desc: 'Elements arrive in a deliberate order, parallax, transitions between pages. The site feels made rather than assembled.' },
      scene: { name: 'A built scene', desc: 'A scene constructed for the project: WebGL, shaders, lighting with real physics. Something nobody else has.' }
    },
    extras: {
      dark:  { name: 'Light and dark themes', desc: 'Two full palettes with a switch.' },
      seo:   { name: 'Local SEO', desc: 'Google Business, structured data, copy written for local search.' },
      forms: { name: 'Booking or payment', desc: 'Hooking up a service — Vagaro, Calendly, Stripe and the like.' },
      cms:   { name: 'Edit it yourself', desc: 'Change copy, photos and prices yourself through an admin panel.' },
      mail:  { name: 'Analytics and domain email', desc: 'Visitor statistics and a mailbox on your own domain.' },
      brand: { name: 'Logo and identity', desc: 'Mark, palette, type, files for print and social.' }
    }
  }
};
