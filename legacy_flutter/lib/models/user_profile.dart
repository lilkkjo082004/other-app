import '../utils/zodiac.dart';

class UserProfile {
  String name;
  DateTime? dob;
  String ageGroup;
  List<String> vibe;
  List<String> communication;
  String occupation;
  List<String> relationship;
  List<String> loveLang;
  List<String> needs;
  List<String> socialId;
  List<String> activities;
  Map<String, List<String>> activitySubs;
  List<String> cuisineLove;
  List<String> cuisineDislike;
  List<String> dietary;
  String favMovies;
  String favMusic;
  UserAstrology? astrology;

  UserProfile({
    this.name = '',
    this.dob,
    this.ageGroup = '18+',
    this.vibe = const [],
    this.communication = const [],
    this.occupation = '',
    this.relationship = const [],
    this.loveLang = const [],
    this.needs = const [],
    this.socialId = const [],
    this.activities = const [],
    this.activitySubs = const {},
    this.cuisineLove = const [],
    this.cuisineDislike = const [],
    this.dietary = const [],
    this.favMovies = '',
    this.favMusic = '',
    this.astrology,
  });

  String formatList(List<String> list) {
    return list.isEmpty ? 'not specified' : list.join(', ');
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'dob': dob?.toIso8601String(),
        'ageGroup': ageGroup,
        'vibe': vibe,
        'communication': communication,
        'occupation': occupation,
        'relationship': relationship,
        'loveLang': loveLang,
        'needs': needs,
        'socialId': socialId,
        'activities': activities,
        'activitySubs': activitySubs,
        'cuisineLove': cuisineLove,
        'cuisineDislike': cuisineDislike,
        'dietary': dietary,
        'favMovies': favMovies,
        'favMusic': favMusic,
        'astrology': astrology?.toJson(),
      };

  factory UserProfile.fromJson(Map<String, dynamic> j) {
    List<String> sl(String k) =>
        (j[k] as List?)?.map((e) => e as String).toList() ?? const [];
    return UserProfile(
      name: j['name'] as String? ?? '',
      dob: j['dob'] != null ? DateTime.tryParse(j['dob'] as String) : null,
      ageGroup: j['ageGroup'] as String? ?? '18+',
      vibe: sl('vibe'),
      communication: sl('communication'),
      occupation: j['occupation'] as String? ?? '',
      relationship: sl('relationship'),
      loveLang: sl('loveLang'),
      needs: sl('needs'),
      socialId: sl('socialId'),
      activities: sl('activities'),
      activitySubs: (j['activitySubs'] as Map?)?.map((k, v) =>
              MapEntry(k as String, (v as List).map((e) => e as String).toList())) ??
          const {},
      cuisineLove: sl('cuisineLove'),
      cuisineDislike: sl('cuisineDislike'),
      dietary: sl('dietary'),
      favMovies: j['favMovies'] as String? ?? '',
      favMusic: j['favMusic'] as String? ?? '',
      astrology: j['astrology'] != null
          ? UserAstrology.fromJson(Map<String, dynamic>.from(j['astrology'] as Map))
          : null,
    );
  }
}
