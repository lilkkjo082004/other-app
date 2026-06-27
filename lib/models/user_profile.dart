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
}
