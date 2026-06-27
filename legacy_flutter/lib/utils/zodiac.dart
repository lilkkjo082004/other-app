class ZodiacSign {
  final String key;
  final String symbol;
  final String element;
  final String trait;

  const ZodiacSign({
    required this.key,
    required this.symbol,
    required this.element,
    required this.trait,
  });

  String get displayName => key[0].toUpperCase() + key.substring(1);
}

class UserAstrology {
  final String western;
  final ZodiacSign westernData;
  final String chinese;
  final String chineseElement;
  final String lifePath;
  final List<String> compatible;

  const UserAstrology({
    required this.western,
    required this.westernData,
    required this.chinese,
    required this.chineseElement,
    required this.lifePath,
    required this.compatible,
  });

  Map<String, dynamic> toJson() => {
        'western': western,
        'chinese': chinese,
        'chineseElement': chineseElement,
        'lifePath': lifePath,
        'compatible': compatible,
      };

  factory UserAstrology.fromJson(Map<String, dynamic> j) => UserAstrology(
        western: j['western'] as String,
        westernData: ZodiacEngine.signs[j['western']] ?? ZodiacEngine.signs['aries']!,
        chinese: j['chinese'] as String? ?? '',
        chineseElement: j['chineseElement'] as String? ?? '',
        lifePath: j['lifePath'] as String? ?? '',
        compatible: (j['compatible'] as List?)?.map((e) => e as String).toList() ?? const [],
      );
}

class ZodiacEngine {
  static const Map<String, ZodiacSign> signs = {
    'aries': ZodiacSign(key: 'aries', symbol: '♈', element: 'Fire', trait: 'Bold & driven'),
    'taurus': ZodiacSign(key: 'taurus', symbol: '♉', element: 'Earth', trait: 'Grounded & loyal'),
    'gemini': ZodiacSign(key: 'gemini', symbol: '♊', element: 'Air', trait: 'Curious & expressive'),
    'cancer': ZodiacSign(key: 'cancer', symbol: '♋', element: 'Water', trait: 'Intuitive & nurturing'),
    'leo': ZodiacSign(key: 'leo', symbol: '♌', element: 'Fire', trait: 'Radiant & generous'),
    'virgo': ZodiacSign(key: 'virgo', symbol: '♍', element: 'Earth', trait: 'Analytical & kind'),
    'libra': ZodiacSign(key: 'libra', symbol: '♎', element: 'Air', trait: 'Harmonious & fair'),
    'scorpio': ZodiacSign(key: 'scorpio', symbol: '♏', element: 'Water', trait: 'Intense & perceptive'),
    'sagittarius': ZodiacSign(key: 'sagittarius', symbol: '♐', element: 'Fire', trait: 'Adventurous & free'),
    'capricorn': ZodiacSign(key: 'capricorn', symbol: '♑', element: 'Earth', trait: 'Ambitious & steady'),
    'aquarius': ZodiacSign(key: 'aquarius', symbol: '♒', element: 'Air', trait: 'Visionary & independent'),
    'pisces': ZodiacSign(key: 'pisces', symbol: '♓', element: 'Water', trait: 'Dreamy & empathetic'),
  };

  static const Map<String, List<String>> compatibility = {
    'aries': ['leo', 'sagittarius', 'gemini', 'aquarius'],
    'taurus': ['virgo', 'capricorn', 'cancer', 'pisces'],
    'gemini': ['libra', 'aquarius', 'aries', 'leo'],
    'cancer': ['scorpio', 'pisces', 'taurus', 'virgo'],
    'leo': ['aries', 'sagittarius', 'gemini', 'libra'],
    'virgo': ['taurus', 'capricorn', 'cancer', 'scorpio'],
    'libra': ['gemini', 'aquarius', 'leo', 'sagittarius'],
    'scorpio': ['cancer', 'pisces', 'virgo', 'capricorn'],
    'sagittarius': ['aries', 'leo', 'libra', 'aquarius'],
    'capricorn': ['taurus', 'virgo', 'scorpio', 'pisces'],
    'aquarius': ['gemini', 'libra', 'aries', 'sagittarius'],
    'pisces': ['cancer', 'scorpio', 'taurus', 'capricorn'],
  };

  static const List<String> chineseAnimals = [
    'Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake',
    'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'
  ];

  static const List<String> chineseElements = [
    'Wood', 'Fire', 'Earth', 'Metal', 'Water'
  ];

  static String getWesternZodiac(int month, int day) {
    if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) return 'aries';
    if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) return 'taurus';
    if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) return 'gemini';
    if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) return 'cancer';
    if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return 'leo';
    if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return 'virgo';
    if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) return 'libra';
    if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) return 'scorpio';
    if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) return 'sagittarius';
    if ((month == 12 && day >= 22) || (month == 1 && day <= 19)) return 'capricorn';
    if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) return 'aquarius';
    return 'pisces';
  }

  static String getChineseZodiac(int year) => chineseAnimals[(year - 4) % 12];
  static String getChineseElement(int year) => chineseElements[((year - 4) % 10) ~/ 2];

  static String getLifePath(int month, int day, int year) {
    String s = '$month$day$year';
    while (s.length > 1 && s != '11' && s != '22' && s != '33') {
      int sum = s.split('').fold(0, (a, c) => a + int.parse(c));
      s = sum.toString();
    }
    return s;
  }

  static UserAstrology calculate(DateTime dob) {
    final western = getWesternZodiac(dob.month, dob.day);
    return UserAstrology(
      western: western,
      westernData: signs[western]!,
      chinese: getChineseZodiac(dob.year),
      chineseElement: getChineseElement(dob.year),
      lifePath: getLifePath(dob.month, dob.day, dob.year),
      compatible: compatibility[western]!,
    );
  }

  static List<String> pickCompanionSigns(String userSign) {
    final pool = List<String>.from(compatibility[userSign]!);
    pool.shuffle();
    return pool.take(3).toList();
  }
}
