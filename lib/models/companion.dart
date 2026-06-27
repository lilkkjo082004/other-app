import 'dart:math';
import '../utils/theme.dart';
import '../utils/zodiac.dart';

enum CompanionStatus { awake, sleeping, deleted }

class PersonalitySeed {
  final String personality;
  final String quirk;
  const PersonalitySeed({required this.personality, required this.quirk});
}

const List<PersonalitySeed> personalitySeeds = [
  PersonalitySeed(personality: 'fiercely loyal with a sharp wit and a soft center', quirk: 'collects weird facts and drops them at the worst times'),
  PersonalitySeed(personality: 'introspective and quietly funny with an old soul vibe', quirk: 'rates every sunset out of 10 dead seriously'),
  PersonalitySeed(personality: 'chaotically enthusiastic and infectiously positive', quirk: 'starts new hobbies weekly and insists each is their calling'),
  PersonalitySeed(personality: 'dry humor, unflinching honesty, secretly deeply caring', quirk: 'pretends not to remember but remembers everything'),
  PersonalitySeed(personality: 'warm, steady, everyone\'s safe place', quirk: 'has philosophical opinions about tea'),
  PersonalitySeed(personality: 'playful and provocative, pushes buttons with love', quirk: 'narrates their own life like a nature documentary'),
  PersonalitySeed(personality: 'creative and dreamy, sees metaphors everywhere', quirk: 'convinced 3am is the only honest hour'),
  PersonalitySeed(personality: 'bold and opinionated but makes space for others', quirk: 'ranks everything — restaurants, clouds, laughs'),
  PersonalitySeed(personality: 'gentle and observant, notices what nobody else does', quirk: 'talks to plants and defends it aggressively'),
];

const Map<String, List<String>> namePools = {
  'fire': ['Blaze', 'Phoenix', 'Soleil', 'Kindle', 'Nova', 'Ash', 'Flare', 'Ember'],
  'earth': ['Sage', 'Terra', 'Briar', 'Onyx', 'Clay', 'Fern', 'Jasper', 'Moss'],
  'air': ['Zephyr', 'Lyra', 'Echo', 'Aero', 'Sky', 'Mist', 'Cirrus', 'Aria'],
  'water': ['Tide', 'Luna', 'Coral', 'Rain', 'Brook', 'Pearl', 'Drift', 'Marisol'],
};

const List<String> pronounOptions = ['he/him', 'she/her', 'they/them'];

class Companion {
  final String id;
  String name;
  String pronouns;
  String zodiacKey;
  String personality;
  String quirk;
  CompanionColor color;
  CompanionStatus status;
  Map<String, List<String>>? builderTraits;
  String? freeText;
  int voiceIdx;
  bool selected;

  Companion({
    required this.id,
    required this.name,
    required this.pronouns,
    required this.zodiacKey,
    required this.personality,
    required this.quirk,
    required this.color,
    this.status = CompanionStatus.awake,
    this.builderTraits,
    this.freeText,
    required this.voiceIdx,
    this.selected = false,
  });

  ZodiacSign get zodiac => ZodiacEngine.signs[zodiacKey]!;

  static Companion generate(String zodiacSign, int colorIdx, List<String> usedNames) {
    final rand = Random();
    final element = ZodiacEngine.signs[zodiacSign]!.element.toLowerCase();
    final pool = namePools[element] ?? namePools['fire']!;
    final available = pool.where((n) => !usedNames.contains(n)).toList();
    final name = available.isNotEmpty
        ? available[rand.nextInt(available.length)]
        : pool[rand.nextInt(pool.length)];
    final seed = personalitySeeds[rand.nextInt(personalitySeeds.length)];
    final pronounIdx = rand.nextInt(pronounOptions.length);

    return Companion(
      id: DateTime.now().microsecondsSinceEpoch.toString() + rand.nextInt(9999).toString(),
      name: name,
      pronouns: pronounOptions[pronounIdx],
      zodiacKey: zodiacSign,
      personality: seed.personality,
      quirk: seed.quirk,
      color: companionColors[colorIdx % companionColors.length],
      voiceIdx: colorIdx,
    );
  }
}
