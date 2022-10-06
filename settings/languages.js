const languages = [
    { id: "AA", name: "Afar" },
    { id: "AB", name: "Abkhaz" },
    { id: "AE", name: "Avestan" },
    { id: "AF", name: "Afrikaans" },
    { id: "AK", name: "Akan" },
    { id: "AM", name: "Amharic" },
    { id: "AN", name: "Aragonese" },
    { id: "AR", name: "Arabic" },
    { id: "AS", name: "Assamese" },
    { id: "AV", name: "Avaric" },
    { id: "AY", name: "Aymara" },
    { id: "AZ", name: "Azerbaijani" },
    { id: "AZ", name: "South Azerbaijani" },
    { id: "BA", name: "Bashkir" },
    { id: "BE", name: "Belarusian" },
    { id: "BG", name: "Bulgarian" },
    { id: "BH", name: "Bihari" },
    { id: "BI", name: "Bislama" },
    { id: "BM", name: "Bambara" },
    { id: "BN", name: "Bengali" },
    { id: "BO", name: "Tibetan Standard" },
    { id: "BR", name: "Breton" },
    { id: "BS", name: "Bosnian" },
    { id: "CA", name: "Catalan" },
    { id: "CE", name: "Chechen" },
    { id: "CH", name: "Chamorro" },
    { id: "CO", name: "Corsican" },
    { id: "CR", name: "Cree" },
    { id: "CS", name: "Czech" },
    { id: "CU", name: "Old Slavonic" },
    { id: "CV", name: "Chuvash" },
    { id: "CY", name: "Welsh" },
    { id: "DA", name: "Danish" },
    { id: "DE", name: "German" },
    { id: "DV", name: "Divehi" },
    { id: "DZ", name: "Dzongkha" },
    { id: "EE", name: "Ewe" },
    { id: "EL", name: "Greek" },
    { id: "EN", name: "English" },
    { id: "EO", name: "Esperanto" },
    { id: "ES", name: "Spanish" },
    { id: "ET", name: "Estonian" },
    { id: "EU", name: "Basque" },
    { id: "FA", name: "Farsi" },
    { id: "FF", name: "Fula" },
    { id: "FI", name: "Finnish" },
    { id: "FJ", name: "Fijian" },
    { id: "FO", name: "Faroese" },
    { id: "FR", name: "French" },
    { id: "FY", name: "Western Frisian" },
    { id: "GA", name: "Irish" },
    { id: "GD", name: "Scottish Gaelic" },
    { id: "GL", name: "Galician" },
    { id: "GN", name: "GuaranÃ­" },
    { id: "GU", name: "Gujarati" },
    { id: "GV", name: "Manx" },
    { id: "HA", name: "Hausa" },
    { id: "HE", name: "Hebrew" },
    { id: "HI", name: "Hindi" },
    { id: "HO", name: "Hiri Motu" },
    { id: "HR", name: "Croatian" },
    { id: "HT", name: "Haitian" },
    { id: "HU", name: "Hungarian" },
    { id: "HY", name: "Armenian" },
    { id: "HZ", name: "Herero" },
    { id: "IA", name: "Interlingua" },
    { id: "ID", name: "Indonesian" },
    { id: "IE", name: "Interlingue" },
    { id: "IG", name: "Igbo" },
    { id: "II", name: "Nuosu" },
    { id: "IK", name: "Inupiaq" },
    { id: "IO", name: "Ido" },
    { id: "IS", name: "Icelandic" },
    { id: "IT", name: "Italian" },
    { id: "IU", name: "Inuktitut" },
    { id: "JA", name: "Japanese" },
    { id: "JV", name: "Javanese" },
    { id: "KA", name: "Georgian" },
    { id: "KG", name: "Kongo" },
    { id: "KI", name: "Kikuyu" },
    { id: "KJ", name: "Kwanyama" },
    { id: "KK", name: "Kazakh" },
    { id: "KL", name: "Kalaallisut" },
    { id: "KM", name: "Khmer" },
    { id: "KN", name: "Kannada" },
    { id: "KO", name: "Korean" },
    { id: "KR", name: "Kanuri" },
    { id: "KS", name: "Kashmiri" },
    { id: "KU", name: "Kurdish" },
    { id: "KV", name: "Komi" },
    { id: "KW", name: "Cornish" },
    { id: "KY", name: "Kyrgyz" },
    { id: "LA", name: "Latin" },
    { id: "LB", name: "Luxembourgish" },
    { id: "LG", name: "Ganda" },
    { id: "LI", name: "Limburgish" },
    { id: "LN", name: "Lingala" },
    { id: "LO", name: "Lao" },
    { id: "LT", name: "Lithuanian" },
    { id: "LU", name: "Luba-Katanga" },
    { id: "LV", name: "Latvian" },
    { id: "MG", name: "Malagasy" },
    { id: "MH", name: "Marshallese" },
    { id: "MI", name: "MÄori" },
    { id: "MK", name: "Macedonian" },
    { id: "ML", name: "Malayalam" },
    { id: "MN", name: "Mongolian" },
    { id: "MR", name: "Marathi" },
    { id: "MS", name: "Malay" },
    { id: "MT", name: "Maltese" },
    { id: "MY", name: "Burmese" },
    { id: "NA", name: "Nauru" },
    { id: "NB", name: "Norwegian Bokmal" },
    { id: "ND", name: "North Ndebele" },
    { id: "NE", name: "Nepali" },
    { id: "NG", name: "Ndonga" },
    { id: "NL", name: "Dutch" },
    { id: "NN", name: "Norwegian Nynorsk" },
    { id: "NO", name: "Norwegian" },
    { id: "NR", name: "South Ndebele" },
    { id: "NV", name: "Navajo" },
    { id: "NY", name: "Nyanja" },
    { id: "OC", name: "Occitan" },
    { id: "OJ", name: "Ojibwe" },
    { id: "OM", name: "Oromo" },
    { id: "OR", name: "Oriya" },
    { id: "OS", name: "Ossetian" },
    { id: "PA", name: "Panjabi" },
    { id: "PI", name: "PÄli" },
    { id: "PL", name: "Polish" },
    { id: "PS", name: "Pashto" },
    { id: "PT", name: "Portuguese" },
    { id: "QU", name: "Quechua" },
    { id: "RM", name: "Romansh" },
    { id: "RN", name: "Kirundi" },
    { id: "RO", name: "Romanian" },
    { id: "RU", name: "Russian" },
    { id: "RW", name: "Kinyarwanda" },
    { id: "SA", name: "Sanskrit" },
    { id: "SC", name: "Sardinian" },
    { id: "SD", name: "Sindhi" },
    { id: "SE", name: "Northern Sami" },
    { id: "SG", name: "Sango" },
    { id: "SI", name: "Sinhala" },
    { id: "SK", name: "Slovak" },
    { id: "SL", name: "Slovene" },
    { id: "SM", name: "Samoan" },
    { id: "SN", name: "Shona" },
    { id: "SO", name: "Somali" },
    { id: "SQ", name: "Albanian" },
    { id: "SR", name: "Serbian" },
    { id: "SS", name: "Swati" },
    { id: "ST", name: "Southern Sotho" },
    { id: "SU", name: "Sundanese" },
    { id: "SV", name: "Swedish" },
    { id: "SW", name: "Swahili" },
    { id: "TA", name: "Tamil" },
    { id: "TE", name: "Telugu" },
    { id: "TG", name: "Tajik" },
    { id: "TH", name: "Thai" },
    { id: "TI", name: "Tigrinya" },
    { id: "TK", name: "Turkmen" },
    { id: "TL", name: "Tagalog" },
    { id: "TN", name: "Tswana" },
    { id: "TO", name: "Tonga" },
    { id: "TR", name: "Turkish" },
    { id: "TS", name: "Tsonga" },
    { id: "TT", name: "Tatar" },
    { id: "TW", name: "Twi" },
    { id: "TY", name: "Tahitian" },
    { id: "UG", name: "Uyghur" },
    { id: "UK", name: "Ukrainian" },
    { id: "UR", name: "Urdu" },
    { id: "UZ", name: "Uzbek" },
    { id: "VE", name: "Venda" },
    { id: "VI", name: "Vietnamese" },
    { id: "VO", name: "Volapak" },
    { id: "WA", name: "Walloon" },
    { id: "WO", name: "Wolof" },
    { id: "XH", name: "Xhosa" },
    { id: "YI", name: "Yiddish" },
    { id: "YO", name: "Yoruba" },
    { id: "ZA", name: "Zhuang" },
    { id: "ZH", name: "Chinese" },
    { id: "ZU", name: "Zulu" }
];

module.exports = languages;