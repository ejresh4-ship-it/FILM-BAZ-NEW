import type { Movie, ContinueWatchingItem } from '@/types/movie';

// Mock catalog of recognizable films and series with Persian metadata.
// Stable IDs so selection logic never relies on array position.
// Image URLs are verified Pexels stock photos (license-free, guaranteed to load).
export const movies: Movie[] = [
  {
    id: 'tt0816692',
    title: 'میان‌ستاره‌ای',
    englishTitle: 'Interstellar',
    year: 2014,
    runtime: 169,
    rating: 8.7,
    genres: ['علمی-تخیلی', 'ماجراجویی', 'درام'],
    category: 'movie',
    director: 'کریستوفر نولان',
    cast: [
      { name: 'متیو مک‌کانهی', englishName: 'Matthew McConaughey' },
      { name: 'آن هاتاوی', englishName: 'Anne Hathaway' },
      { name: 'جسیکا چستین', englishName: 'Jessica Chastain' },
      { name: 'مایکل کین', englishName: 'Michael Caine' },
    ],
    synopsis:
      'گروهی از کاوشگران از طریق یک کرم‌چاله سفر می‌کنند تا سیارات قابل سکونت را کشف کنند و بقای بشریت را در سیاره‌ای در حال نابودی تضمین کنند.',
    posterUrl:
      'https://images.pexels.com/photos/7661481/pexels-photo-7661481.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    backdropUrl:
      'https://images.pexels.com/photos/7660828/pexels-photo-7660828.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'tt0114369',
    title: 'هفت',
    englishTitle: 'Se7en',
    year: 1995,
    runtime: 127,
    rating: 8.6,
    genres: ['جنایی', 'هیجان‌انگیز', 'رازآلود'],
    category: 'movie',
    director: 'دیوید فینچر',
    cast: [
      { name: 'براد پیت', englishName: 'Brad Pitt' },
      { name: 'مورگان فریمن', englishName: 'Morgan Freeman' },
      { name: 'گوینث پالترو', englishName: 'Gwyneth Paltrow' },
    ],
    synopsis:
      'دو کارآگاه در پی کشف قاتل زنجیره‌ای هستند که قربانیانش را بر اساس گناهان کلاسیک هفت‌گانه انتخاب می‌کند.',
    posterUrl:
      'https://images.pexels.com/photos/3156203/pexels-photo-3156203.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    backdropUrl:
      'https://images.pexels.com/photos/2748715/pexels-photo-2748715.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'tt1375666',
    title: 'آغاز',
    englishTitle: 'Inception',
    year: 2010,
    runtime: 148,
    rating: 8.8,
    genres: ['اکشن', 'علمی-تخیلی', 'هیجان‌انگیز'],
    category: 'movie',
    director: 'کریستوفر نولان',
    cast: [
      { name: 'لئوناردو دی‌کاپریو', englishName: 'Leonardo DiCaprio' },
      { name: 'جوزف گوردون لویت', englishName: 'Joseph Gordon-Levitt' },
      { name: 'الن پیج', englishName: 'Elliot Page' },
      { name: 'تام هاردی', englishName: 'Tom Hardy' },
    ],
    synopsis:
      'دزدی که توانایی نفوذ به رویاهای دیگران را دارد، وظیفه‌ای معکوس دریافت می‌کند: یک ایده را در ذهن مدیرعامل یک شرکت کاشته کند.',
    posterUrl:
      'https://images.pexels.com/photos/16000537/pexels-photo-16000537.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    backdropUrl:
      'https://images.pexels.com/photos/11839853/pexels-photo-11839853.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'tt0110912',
    title: 'رئیس‌خوب',
    englishTitle: 'Pulp Fiction',
    year: 1994,
    runtime: 154,
    rating: 8.9,
    genres: ['جنایی', 'درام'],
    category: 'movie',
    director: 'کوئنتین تارانتینو',
    cast: [
      { name: 'جان تراولتا', englishName: 'John Travolta' },
      { name: 'ساموئل ال جکسون', englishName: 'Samuel L. Jackson' },
      { name: 'بروس ویلیس', englishName: 'Bruce Willis' },
      { name: 'اوما تورمن', englishName: 'Uma Thurman' },
    ],
    synopsis:
      'زندگی دو قاتل قراردادی، یک بوکسور، یک گانگستر و همسرش، و یک زوج غارتگر در چهار داستان به‌هم‌پیوسته در لس‌آنجلس به‌هم می‌آمیزد.',
    posterUrl:
      'https://images.pexels.com/photos/18326061/pexels-photo-18326061.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    backdropUrl:
      'https://images.pexels.com/photos/11839853/pexels-photo-11839853.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'tt0133093',
    title: 'ماتریکس',
    englishTitle: 'The Matrix',
    year: 1999,
    runtime: 136,
    rating: 8.7,
    genres: ['اکشن', 'علمی-تخیلی'],
    category: 'movie',
    director: 'خواهران واچوفسکی',
    cast: [
      { name: 'کیانو ریوز', englishName: 'Keanu Reeves' },
      { name: 'لارنس فیشبرن', englishName: 'Laurence Fishburne' },
      { name: 'کری-آن ماس', englishName: 'Carrie-Anne Moss' },
    ],
    synopsis:
      'یک هکر رایانه‌ای متوجه می‌شود که جهان، همان‌طور که او می‌داند، یک شبیه‌سازی است و باید برای آزادی بشر بجنگد.',
    posterUrl:
      'https://images.pexels.com/photos/8107902/pexels-photo-8107902.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    backdropUrl:
      'https://images.pexels.com/photos/8107821/pexels-photo-8107821.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'tt6751668',
    title: 'انگل',
    englishTitle: 'Parasite',
    year: 2019,
    runtime: 132,
    rating: 8.5,
    genres: ['کمدی', 'درام', 'هیجان‌انگیز'],
    category: 'movie',
    director: 'بونگ جون-هو',
    cast: [
      { name: 'سونگ کانگ-هو', englishName: 'Song Kang-ho' },
      { name: 'لی سون-کیون', englishName: 'Lee Sun-kyun' },
      { name: 'چو یئو-جئونگ', englishName: 'Cho Yeo-jeong' },
    ],
    synopsis:
      'خانواده فقیر کیم رفته‌رفته در زندگی خانواده ثروتمند پارک نفوذ می‌کنند و روابطی سمی و سرنوشت‌ساز شکل می‌گیرد.',
    posterUrl:
      'https://images.pexels.com/photos/12695346/pexels-photo-12695346.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    backdropUrl:
      'https://images.pexels.com/photos/1787044/pexels-photo-1787044.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'tt0137523',
    title: 'باشگاه مبارزه',
    englishTitle: 'Fight Club',
    year: 1999,
    runtime: 139,
    rating: 8.8,
    genres: ['درام', 'هیجان‌انگیز'],
    category: 'movie',
    director: 'دیوید فینچر',
    cast: [
      { name: 'براد پیت', englishName: 'Brad Pitt' },
      { name: 'ادوارد نورتون', englishName: 'Edward Norton' },
      { name: 'هلنا بون کارتر', englishName: 'Helena Bonham Carter' },
    ],
    synopsis:
      'یک کارمند دچار بی‌خوابی با فروشنده صابونی که ماجراجوست آشنا می‌شود و یک باشگاه مبارزه زیرزمینی راه می‌اندازند که به حرکتی ضدسرمایه‌داری بدل می‌شود.',
    posterUrl:
      'https://images.pexels.com/photos/22738044/pexels-photo-22738044.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    backdropUrl:
      'https://images.pexels.com/photos/18866448/pexels-photo-18866448.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'tt0167260',
    title: 'ارباب حلقه‌ها: بازگشت پادشاه',
    englishTitle: 'The Return of the King',
    year: 2003,
    runtime: 201,
    rating: 9.0,
    genres: ['ماجراجویی', 'اکشن', 'فانتزی'],
    category: 'movie',
    director: 'پیتر جکسون',
    cast: [
      { name: 'ایلیجا وود', englishName: 'Elijah Wood' },
      { name: 'ایان مک‌کلن', englishName: 'Ian McKellen' },
      { name: 'ویگو مورتنسن', englishName: 'Viggo Mortensen' },
    ],
    synopsis:
      'فین حلقه را به سوی کوه هلاک هدایت می‌کند در حالی که یاران حلقه برای نجات سرزمین میانه نبردی حماسی انجام می‌دهند.',
    posterUrl:
      'https://images.pexels.com/photos/18993399/pexels-photo-18993399.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    backdropUrl:
      'https://images.pexels.com/photos/14332269/pexels-photo-14332269.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'tt0109830',
    title: 'فارست گامپ',
    englishTitle: 'Forrest Gump',
    year: 1994,
    runtime: 142,
    rating: 8.8,
    genres: ['درام', 'کمدی', 'عاشقانه'],
    category: 'movie',
    director: 'رابرت زمکیس',
    cast: [
      { name: 'تام هنکس', englishName: 'Tom Hanks' },
      { name: 'رابین رایت', englishName: 'Robin Wright' },
      { name: 'گری سینایس', englishName: 'Gary Sinise' },
    ],
    synopsis:
      'داستان مردی با ضریب هوشی پایین که بی‌آنکه بداند، در رویدادهای بزرگ تاریخ آمریکا سهیم می‌شود و بر عشق دوران کودکی‌اش وفادار می‌ماند.',
    posterUrl:
      'https://images.pexels.com/photos/7971525/pexels-photo-7971525.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    backdropUrl:
      'https://images.pexels.com/photos/7971278/pexels-photo-7971278.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'tt0468569',
    title: 'شوالیه تاریکی',
    englishTitle: 'The Dark Knight',
    year: 2008,
    runtime: 152,
    rating: 9.0,
    genres: ['اکشن', 'جنایی', 'درام'],
    category: 'movie',
    director: 'کریستوفر نولان',
    cast: [
      { name: 'کریستین بیل', englishName: 'Christian Bale' },
      { name: 'هیث لجر', englishName: 'Heath Ledger' },
      { name: 'آرون اکهارت', englishName: 'Aaron Eckhart' },
    ],
    synopsis:
      'بتمن با کمک جیمز گوردون و هاروی دنت با یک جنایتکار بی‌رحم به نام جوکر روبه‌رو می‌شود که شهر گاتهام را در هرج‌ومرج فرو می‌برد.',
    posterUrl:
      'https://images.pexels.com/photos/8107954/pexels-photo-8107954.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    backdropUrl:
      'https://images.pexels.com/photos/2748715/pexels-photo-2748715.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'tt15398776',
    title: 'آپنهایمر',
    englishTitle: 'Oppenheimer',
    year: 2023,
    runtime: 181,
    rating: 8.4,
    genres: ['درام', 'تاریخی', 'هیجان‌انگیز'],
    category: 'movie',
    director: 'کریستوفر نولان',
    cast: [
      { name: 'کیلیان مورفی', englishName: 'Cillian Murphy' },
      { name: 'امیلی بلانت', englishName: 'Emily Blunt' },
      { name: 'رابرت داونی جونیور', englishName: 'Robert Downey Jr.' },
    ],
    synopsis:
      'داستان نقش رابرت آپنهایمر، فیزیکدان آمریکایی، در ساخت بمب اتم و عواقب اخلاقی آن در طول جنگ جهانی دوم و پس از آن.',
    posterUrl:
      'https://images.pexels.com/photos/34084909/pexels-photo-34084909.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    backdropUrl:
      'https://images.pexels.com/photos/35982145/pexels-photo-35982145.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'tt0903747',
    title: 'بریکینگ بد',
    englishTitle: 'Breaking Bad',
    year: 2008,
    runtime: 49,
    rating: 9.5,
    genres: ['جنایی', 'درام', 'هیجان‌انگیز'],
    category: 'series',
    director: 'وینس گیلیگان',
    cast: [
      { name: 'برایان کرنستون', englishName: 'Bryan Cranston' },
      { name: 'آرون پل', englishName: 'Aaron Paul' },
      { name: 'آنا گان', englishName: 'Anna Gunn' },
    ],
    synopsis:
      'یک معلم شیمی دبیرستانی مبتلا به سرطان، برای تأمین آینده خانواده‌اش به تولید و فروش مت‌آمفتامین روی می‌آورد و به امپراتور جنایت بدل می‌شود.',
    posterUrl:
      'https://images.pexels.com/photos/8474423/pexels-photo-8474423.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    backdropUrl:
      'https://images.pexels.com/photos/7234386/pexels-photo-7234386.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'tt0944947',
    title: 'بازی تاج‌وتخت',
    englishTitle: 'Game of Thrones',
    year: 2011,
    runtime: 57,
    rating: 9.2,
    genres: ['ماجراجویی', 'درام', 'فانتزی'],
    category: 'series',
    director: 'دیوید بنیوف',
    cast: [
      { name: 'امیلیا کلارک', englishName: 'Emilia Clarke' },
      { name: 'کیت هرینگتون', englishName: 'Kit Harington' },
      { name: 'پیتر دینکلیج', englishName: 'Peter Dinklage' },
    ],
    synopsis:
      'خاندان‌های اشرافی سرزمین وستروس برای کنترل تاج‌آهنین رقابت می‌کنند در حالی که تهدیدی باستانی از شمال برخاسته است.',
    posterUrl:
      'https://images.pexels.com/photos/32363131/pexels-photo-32363131.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    backdropUrl:
      'https://images.pexels.com/photos/10754932/pexels-photo-10754932.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'tt2861424',
    title: 'رالف خرابکار',
    englishTitle: 'Ralph Breaks the Internet',
    year: 2018,
    runtime: 112,
    rating: 7.0,
    genres: ['انیمیشن', 'کمدی', 'ماجراجویی'],
    category: 'kids',
    director: 'فیل جانستون',
    cast: [
      { name: 'جان سی ریلی', englishName: 'John C. Reilly' },
      { name: 'سارا سیلورمن', englishName: 'Sarah Silverman' },
    ],
    synopsis:
      'رالف و وَنلُوپی به اینترنت سفر می‌کنند تا قطعه‌ای برای تعمیر بازی ویدیویی‌شان پیدا کنند و در دنیای عظیم اینترنت ماجراجویی می‌کنند.',
    posterUrl:
      'https://images.pexels.com/photos/3661350/pexels-photo-3661350.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    backdropUrl:
      'https://images.pexels.com/photos/39377992/pexels-photo-39377992.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'tt0317705',
    title: 'شگفت‌انگیزان',
    englishTitle: 'The Incredibles',
    year: 2004,
    runtime: 115,
    rating: 8.0,
    genres: ['انیمیشن', 'اکشن', 'ماجراجویی'],
    category: 'kids',
    director: 'برد بیرد',
    cast: [
      { name: 'گریگ تی نلسون', englishName: 'Craig T. Nelson' },
      { name: 'هالی هانتر', englishName: 'Holly Hunter' },
      { name: 'ساموئل ال جکسون', englishName: 'Samuel L. Jackson' },
    ],
    synopsis:
      'یک خانواده ابرقهرمان تلاش می‌کند زندگی عادی داشته باشد، اما وقتی نابودگر نقشه شیطانی‌اش را اجرا می‌کند، دوباره باید دنیا را نجات دهند.',
    posterUrl:
      'https://images.pexels.com/photos/6250901/pexels-photo-6250901.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    backdropUrl:
      'https://images.pexels.com/photos/38576033/pexels-photo-38576033.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'tt0118799',
    title: 'زندگی شگفت‌انگیز',
    englishTitle: 'Life Is Beautiful',
    year: 1997,
    runtime: 116,
    rating: 8.6,
    genres: ['کمدی', 'درام', 'عاشقانه'],
    category: 'movie',
    director: 'روبرتو بنینی',
    cast: [
      { name: 'روبرتو بنینی', englishName: 'Roberto Benigni' },
      { name: 'نیکولتا براسچی', englishName: 'Nicoletta Braschi' },
    ],
    synopsis:
      'پدری یهودی با استفاده از تخیل و طنز، پسر کوچکش را از وحشت اردوگاه کار اجباری در دوران جنگ جهانی دوم حفظ می‌کند.',
    posterUrl:
      'https://images.pexels.com/photos/30240828/pexels-photo-30240828.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    backdropUrl:
      'https://images.pexels.com/photos/7971278/pexels-photo-7971278.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'tt0114709',
    title: 'داستان اسباب‌بازی',
    englishTitle: 'Toy Story',
    year: 1995,
    runtime: 81,
    rating: 8.3,
    genres: ['انیمیشن', 'کمدی', 'ماجراجویی'],
    category: 'kids',
    director: 'جان لاستر',
    cast: [
      { name: 'تام هنکس', englishName: 'Tom Hanks' },
      { name: 'تیم آلن', englishName: 'Tim Allen' },
    ],
    synopsis:
      'اسباب‌بازی‌ها وقتی انسان‌ها حضور ندارند زنده می‌شوند؛ وودی، عروسک محبوب پسربچه‌ای، با ورود اسباب‌بازی جدیدی به نام باز لایت‌یر حسادت می‌کند.',
    posterUrl:
      'https://images.pexels.com/photos/33594752/pexels-photo-33594752.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    backdropUrl:
      'https://images.pexels.com/photos/298825/pexels-photo-298825.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'tt4154796',
    title: 'آوینجرز: پایان بازی',
    englishTitle: 'Avengers: Endgame',
    year: 2019,
    runtime: 181,
    rating: 8.4,
    genres: ['اکشن', 'ماجراجویی', 'علمی-تخیلی'],
    category: 'movie',
    director: 'آنتونی روسو',
    cast: [
      { name: 'رابرت داونی جونیور', englishName: 'Robert Downey Jr.' },
      { name: 'کریس اوانز', englishName: 'Chris Evans' },
      { name: 'اسکارلت جوهانسون', englishName: 'Scarlett Johansson' },
    ],
    synopsis:
      'پس از ویرانی‌های جنگ ابدیت، انتقام‌جویان بازمانده برای بازگرداندن نیمی از حیات جهان دست به عملی جسورانه و سفر در زمان می‌زنند.',
    posterUrl:
      'https://images.pexels.com/photos/38691365/pexels-photo-38691365.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    backdropUrl:
      'https://images.pexels.com/photos/7809123/pexels-photo-7809123.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
];

export const continueWatching: ContinueWatchingItem[] = [
  { movieId: 'tt0137523', progress: 62, remainingLabel: '۵۳ دقیقه باقی‌مانده' },
  { movieId: 'tt0903747', progress: 34, remainingLabel: '۳۲ دقیقه باقی‌مانده' },
  { movieId: 'tt0816692', progress: 81, remainingLabel: '۳۲ دقیقه باقی‌مانده' },
  { movieId: 'tt0114369', progress: 18, remainingLabel: '۱۰۴ دقیقه باقی‌مانده' },
];

export const homeSections: { title: string; filter: (m: Movie) => boolean }[] = [
  { title: 'جدیدترین‌ها', filter: (m) => m.year >= 2014 },
  { title: 'اکشن', filter: (m) => m.genres.includes('اکشن') },
  { title: 'جنایی', filter: (m) => m.genres.includes('جنایی') },
  { title: 'کمدی', filter: (m) => m.genres.includes('کمدی') },
  { title: 'سایر ژانرها', filter: (m) => m.genres.some((g) => !['اکشن', 'جنایی', 'کمدی'].includes(g)) },
];
