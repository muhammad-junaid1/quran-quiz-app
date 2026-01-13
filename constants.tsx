
import { Surah } from './types';

// Registry of available chapters without the questions themselves
export const SURAHS_REGISTRY = [
  {
    id: 1,
    englishName: "Al-Fatihah",
    arabicName: "الفاتحة",
    translation: "The Opening",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 2,
    englishName: "Al-Baqarah",
    arabicName: "البقرة",
    translation: "The Cow",
    revelationType: "Medinan",
    totalQuestions: 160
  },
  {
    id: 3,
    englishName: "Al-Imran",
    arabicName: "آل عمران",
    translation: "Family of Imran",
    revelationType: "Medinan",
    totalQuestions: 30
  },
  {
    id: 4,
    englishName: "An-Nisa",
    arabicName: "النساء",
    translation: "The Women",
    revelationType: "Medinan",
    totalQuestions: 10
  },
  {
    id: 5,
    englishName: "Al-Ma'idah",
    arabicName: "المائدة",
    translation: "The Table Spread",
    revelationType: "Medinan",
    totalQuestions: 10
  },
  {
    id: 6,
    englishName: "Al-An'am",
    arabicName: "الأنعام",
    translation: "The Cattle",
    revelationType: "Meccan",
    totalQuestions: 10
  },
  {
    id: 7,
    englishName: "Al-A'raf",
    arabicName: "الأعراف",
    translation: "The Heights",
    revelationType: "Meccan",
    totalQuestions: 10
  },
  {
    id: 8,
    englishName: "Al-Anfal",
    arabicName: "الأنفال",
    translation: "The Spoils of War",
    revelationType: "Medinan",
    totalQuestions: 10
  },
  {
    id: 9,
    englishName: "At-Tawbah",
    arabicName: "التوبة",
    translation: "The Repentance",
    revelationType: "Medinan",
    totalQuestions: 10
  },
  {
    id: 10,
    englishName: "Yunus",
    arabicName: "يونس",
    translation: "Jonah",
    revelationType: "Meccan",
    totalQuestions: 10
  },
  {
    id: 11,
    englishName: "Hud",
    arabicName: "هود",
    translation: "Hud",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 12,
    englishName: "Yusuf",
    arabicName: "يوسف",
    translation: "Joseph",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 13,
    englishName: "Ar-Ra'd",
    arabicName: "الرعد",
    translation: "The Thunder",
    revelationType: "Medinan",
    totalQuestions: 20
  },
  {
    id: 14,
    englishName: "Ibrahim",
    arabicName: "إبراهيم",
    translation: "Abraham",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 15,
    englishName: "Al-Hijr",
    arabicName: "الحجر",
    translation: "The Rocky Tract",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 16,
    englishName: "An-Nahl",
    arabicName: "النحل",
    translation: "The Bee",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 17,
    englishName: "Al-Isra",
    arabicName: "الإسراء",
    translation: "The Night Journey",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 18,
    englishName: "Al-Kahf",
    arabicName: "الكهف",
    translation: "The Cave",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 19,
    englishName: "Maryam",
    arabicName: "مريم",
    translation: "Mary",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 20,
    englishName: "Ta-Ha",
    arabicName: "طه",
    translation: "Ta-Ha",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 21,
    englishName: "Al-Anbiya",
    arabicName: "الأنبياء",
    translation: "The Prophets",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 22,
    englishName: "Al-Hajj",
    arabicName: "الحج",
    translation: "The Pilgrimage",
    revelationType: "Medinan",
    totalQuestions: 20
  },
  {
    id: 23,
    englishName: "Al-Mu'minun",
    arabicName: "المؤمنون",
    translation: "The Believers",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 24,
    englishName: "An-Nur",
    arabicName: "النور",
    translation: "The Light",
    revelationType: "Medinan",
    totalQuestions: 20
  },
  {
    id: 25,
    englishName: "Al-Furqan",
    arabicName: "الفرقآن",
    translation: "The Criterion",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 26,
    englishName: "Ash-Shu'ara",
    arabicName: "الشعراء",
    translation: "The Poets",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 27,
    englishName: "An-Naml",
    arabicName: "النمل",
    translation: "The Ant",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 28,
    englishName: "Al-Qasas",
    arabicName: "القصص",
    translation: "The Stories",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 29,
    englishName: "Al-Ankabut",
    arabicName: "العنكبوت",
    translation: "The Spider",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 30,
    englishName: "Ar-Rum",
    arabicName: "الروم",
    translation: "The Romans",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 31,
    englishName: "Luqman",
    arabicName: "لقمان",
    translation: "Luqman",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 32,
    englishName: "As-Sajdah",
    arabicName: "السجدة",
    translation: "The Prostration",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 33,
    englishName: "Al-Ahzab",
    arabicName: "الأحزاب",
    translation: "The Combined Forces",
    revelationType: "Medinan",
    totalQuestions: 20
  },
  {
    id: 34,
    englishName: "Saba",
    arabicName: "سبأ",
    translation: "Sheba",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 35,
    englishName: "Fatir",
    arabicName: "فاطر",
    translation: "The Originator",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 36,
    englishName: "Ya-Sin",
    arabicName: "يس",
    translation: "Ya-Sin",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 37,
    englishName: "As-Saffat",
    arabicName: "الصافات",
    translation: "Those who set the Ranks",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 38,
    englishName: "Sad",
    arabicName: "ص",
    translation: "The Letter \"Saad\"",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 39,
    englishName: "Az-Zumar",
    arabicName: "الزمر",
    translation: "The Troops",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 40,
    englishName: "Ghafir",
    arabicName: "غافر",
    translation: "The Forgiver",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 41,
    englishName: "Fussilat",
    arabicName: "فصلت",
    translation: "Explained in Detail",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 42,
    englishName: "Ash-Shura",
    arabicName: "الشورى",
    translation: "The Consultation",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 43,
    englishName: "Az-Zukhruf",
    arabicName: "الزخرف",
    translation: "The Ornaments of Gold",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 44,
    englishName: "Ad-Dukhan",
    arabicName: "الدخان",
    translation: "The Smoke",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 45,
    englishName: "Al-Jathiyah",
    arabicName: "الجاثية",
    translation: "The Crouching",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 46,
    englishName: "Al-Ahqaf",
    arabicName: "الأحقاف",
    translation: "The Wind-Curved Sandhills",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 47,
    englishName: "Muhammad",
    arabicName: "محمد",
    translation: "Muhammad",
    revelationType: "Medinan",
    totalQuestions: 20
  },
  {
    id: 48,
    englishName: "Al-Fath",
    arabicName: "الفتح",
    translation: "The Victory",
    revelationType: "Medinan",
    totalQuestions: 20
  },
  {
    id: 49,
    englishName: "Al-Hujurat",
    arabicName: "الحجرات",
    translation: "The Dwellings",
    revelationType: "Medinan",
    totalQuestions: 20
  },
  {
    id: 50,
    englishName: "Qaf",
    arabicName: "ق",
    translation: "The Letter \"Qaf\"",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 51,
    englishName: "Adh-Dhariyat",
    arabicName: "الذاريات",
    translation: "The Winnowing Winds",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 52,
    englishName: "At-Tur",
    arabicName: "الطور",
    translation: "The Mount",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 53,
    englishName: "An-Najm",
    arabicName: "النجم",
    translation: "The Star",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 54,
    englishName: "Al-Qamar",
    arabicName: "القمر",
    translation: "The Moon",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 55,
    englishName: "Ar-Rahman",
    arabicName: "الرحمن",
    translation: "The Beneficent",
    revelationType: "Medinan",
    totalQuestions: 20
  },
  {
    id: 56,
    englishName: "Al-Waqi'ah",
    arabicName: "الواقعة",
    translation: "The Inevitable",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 57,
    englishName: "Al-Hadid",
    arabicName: "الحديد",
    translation: "The Iron",
    revelationType: "Medinan",
    totalQuestions: 20
  },
  {
    id: 58,
    englishName: "Al-Mujadila",
    arabicName: "المجادلة",
    translation: "The Pleading Woman",
    revelationType: "Medinan",
    totalQuestions: 20
  },
  {
    id: 59,
    englishName: "Al-Hashr",
    arabicName: "الحشر",
    translation: "The Exile",
    revelationType: "Medinan",
    totalQuestions: 20
  },
  {
    id: 60,
    englishName: "Al-Mumtahanah",
    arabicName: "الممتحنة",
    translation: "She that is to be examined",
    revelationType: "Medinan",
    totalQuestions: 20
  },
  {
    id: 61,
    englishName: "As-Saff",
    arabicName: "الصف",
    translation: "The Ranks",
    revelationType: "Medinan",
    totalQuestions: 20
  },
  {
    id: 62,
    englishName: "Al-Jumu'ah",
    arabicName: "الجمعة",
    translation: "The Congregation",
    revelationType: "Medinan",
    totalQuestions: 20
  },
  {
    id: 63,
    englishName: "Al-Munafiqun",
    arabicName: "المنافقون",
    translation: "The Hypocrites",
    revelationType: "Medinan",
    totalQuestions: 20
  },
  {
    id: 64,
    englishName: "At-Taghabun",
    arabicName: "التغابن",
    translation: "The Mutual Disillusion",
    revelationType: "Medinan",
    totalQuestions: 20
  },
  {
    id: 65,
    englishName: "At-Talaq",
    arabicName: "الطلاق",
    translation: "The Divorce",
    revelationType: "Medinan",
    totalQuestions: 20
  },
  {
    id: 66,
    englishName: "At-Tahrim",
    arabicName: "التحريم",
    translation: "The Prohibition",
    revelationType: "Medinan",
    totalQuestions: 20
  },
  {
    id: 67,
    englishName: "Al-Mulk",
    arabicName: "الملك",
    translation: "The Sovereignty",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 68,
    englishName: "Al-Qalam",
    arabicName: "القلم",
    translation: "The Pen",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 69,
    englishName: "Al-Haqqah",
    arabicName: "الحاقة",
    translation: "The Reality",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 70,
    englishName: "Al-Ma'arij",
    arabicName: "المعارج",
    translation: "The Ascending Stairways",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 71,
    englishName: "Nuh",
    arabicName: "نوح",
    translation: "Noah",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 72,
    englishName: "Al-Jinn",
    arabicName: "الجن",
    translation: "The Jinn",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 73,
    englishName: "Al-Muzzammil",
    arabicName: "المزمل",
    translation: "The Enshrouded One",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 74,
    englishName: "Al-Muddaththir",
    arabicName: "المدثر",
    translation: "The Cloaked One",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 75,
    englishName: "Al-Qiyamah",
    arabicName: "القيامة",
    translation: "The Resurrection",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 76,
    englishName: "Al-Insan",
    arabicName: "الإنسان",
    translation: "The Man",
    revelationType: "Medinan",
    totalQuestions: 20
  },
  {
    id: 77,
    englishName: "Al-Mursalat",
    arabicName: "المرسلات",
    translation: "The Emissaries",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 78,
    englishName: "An-Naba",
    arabicName: "النبأ",
    translation: "The Tidings",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 79,
    englishName: "An-Nazi'at",
    arabicName: "النازعات",
    translation: "Those who drag forth",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 80,
    englishName: "'Abasa",
    arabicName: "عبس",
    translation: "He Frowned",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 81,
    englishName: "At-Takwir",
    arabicName: "التكوير",
    translation: "The Overthrowing",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 82,
    englishName: "Al-Infitar",
    arabicName: "الانفطار",
    translation: "The Cleaving",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 83,
    englishName: "Al-Mutaffifin",
    arabicName: "المطففين",
    translation: "The Defrauding",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 84,
    englishName: "Al-Inshiqaq",
    arabicName: "الانشقاق",
    translation: "The Sundering",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 85,
    englishName: "Al-Buruj",
    arabicName: "البروج",
    translation: "The Mansions of the Stars",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 86,
    englishName: "At-Tariq",
    arabicName: "الطارق",
    translation: "The Nightcomer",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 87,
    englishName: "Al-A'la",
    arabicName: "الأعلى",
    translation: "The Most High",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 88,
    englishName: "Al-Ghashiyah",
    arabicName: "الغاشية",
    translation: "The Overwhelming",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 89,
    englishName: "Al-Fajr",
    arabicName: "الفجر",
    translation: "The Dawn",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 90,
    englishName: "Al-Balad",
    arabicName: "البلد",
    translation: "The City",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 91,
    englishName: "Ash-Shams",
    arabicName: "الشمس",
    translation: "The Sun",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 92,
    englishName: "Al-Layl",
    arabicName: "الليل",
    translation: "The Night",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 93,
    englishName: "Ad-Duha",
    arabicName: "الضحى",
    translation: "The Morning Hours",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 94,
    englishName: "Ash-Sharh",
    arabicName: "الشرح",
    translation: "The Relief",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 95,
    englishName: "At-Tin",
    arabicName: "التين",
    translation: "The Fig",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 96,
    englishName: "Al-'Alaq",
    arabicName: "العلق",
    translation: "The Clot",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 97,
    englishName: "Al-Qadr",
    arabicName: "القدر",
    translation: "The Power",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 98,
    englishName: "Al-Bayyinah",
    arabicName: "البينة",
    translation: "The Clear Proof",
    revelationType: "Medinan",
    totalQuestions: 20
  },
  {
    id: 99,
    englishName: "Az-Zalzalah",
    arabicName: "الزلزلة",
    translation: "The Earthquake",
    revelationType: "Medinan",
    totalQuestions: 20
  },
  {
    id: 100,
    englishName: "Al-'Adiyat",
    arabicName: "العاديات",
    translation: "The Courser",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 101,
    englishName: "Al-Qari'ah",
    arabicName: "القارعة",
    translation: "The Calamity",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 102,
    englishName: "At-Takathur",
    arabicName: "التكاثر",
    translation: "The Piling Up",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 103,
    englishName: "Al-'Asr",
    arabicName: "العصر",
    translation: "The Declining Day",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 104,
    englishName: "Al-Humazah",
    arabicName: "الهمزة",
    translation: "The Traducer",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 105,
    englishName: "Al-Fil",
    arabicName: "الفيل",
    translation: "The Elephant",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 106,
    englishName: "Quraysh",
    arabicName: "قريش",
    translation: "Quraysh",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 107,
    englishName: "Al-Ma'un",
    arabicName: "الماعون",
    translation: "The Small Kindnesses",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 108,
    englishName: "Al-Kawthar",
    arabicName: "الكوثر",
    translation: "The Abundance",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 109,
    englishName: "Al-Kafirun",
    arabicName: "الكافرون",
    translation: "The Disbelievers",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 110,
    englishName: "An-Nasr",
    arabicName: "النصر",
    translation: "The Divine Support",
    revelationType: "Medinan",
    totalQuestions: 20
  },
  {
    id: 111,
    englishName: "Al-Masad",
    arabicName: "المسد",
    translation: "The Palm Fiber",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 112,
    englishName: "Al-Ikhlas",
    arabicName: "الإخلاص",
    translation: "The Sincerity",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 113,
    englishName: "Al-Falaq",
    arabicName: "الفلق",
    translation: "The Daybreak",
    revelationType: "Meccan",
    totalQuestions: 20
  },
  {
    id: 114,
    englishName: "An-Nas",
    arabicName: "الناس",
    translation: "Mankind",
    revelationType: "Meccan",
    totalQuestions: 20
  }
];
