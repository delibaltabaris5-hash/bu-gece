import 'dart:convert';

import 'package:flutter/services.dart';

class Room {
  Room({required this.id, required this.name, required this.mark, required this.blurb});
  final String id;
  final String name;
  final String mark;
  final String blurb;
  factory Room.fromJson(Map<String, dynamic> json) => Room(
        id: json['id'] as String,
        name: json['name'] as String,
        mark: json['mark'] as String,
        blurb: json['blurb'] as String,
      );
}

class Topic {
  Topic({required this.id, required this.quote, required this.question});
  final String id;
  final String quote;
  final String question;
  factory Topic.fromJson(Map<String, dynamic> json) => Topic(
        id: json['id'] as String,
        quote: json['quote'] as String,
        question: json['question'] as String,
      );
}

class Member {
  Member({
    required this.id,
    required this.roomId,
    required this.gender,
    required this.stableNick,
    required this.bio,
    required this.city,
  });
  final String id;
  final String roomId;
  final String gender;
  final String stableNick;
  final String bio;
  final String city;
  factory Member.fromJson(Map<String, dynamic> json) => Member(
        id: json['id'] as String,
        roomId: json['roomId'] as String,
        gender: json['gender'] as String,
        stableNick: json['stableNick'] as String,
        bio: json['bio'] as String,
        city: json['city'] as String,
      );
}

class NightPlan {
  NightPlan({
    required this.id,
    required this.title,
    required this.summary,
    required this.place,
    required this.when,
    required this.mood,
    required this.budget,
    required this.distance,
    required this.roomId,
  });
  final String id;
  final String title;
  final String summary;
  final String place;
  final String when;
  final String mood;
  final String budget;
  final String distance;
  final String roomId;
  factory NightPlan.fromJson(Map<String, dynamic> json) => NightPlan(
        id: json['id'] as String,
        title: json['title'] as String,
        summary: json['summary'] as String,
        place: json['place'] as String,
        when: json['when'] as String,
        mood: json['mood'] as String,
        budget: json['budget'] as String,
        distance: json['distance'] as String,
        roomId: json['roomId'] as String,
      );
}

class SeedLine {
  SeedLine({required this.roomId, required this.memberId, required this.text});
  final String roomId;
  final String memberId;
  final String text;
  factory SeedLine.fromJson(Map<String, dynamic> json) => SeedLine(
        roomId: json['roomId'] as String,
        memberId: json['memberId'] as String,
        text: json['text'] as String,
      );
}

class Catalog {
  Catalog({
    required this.rooms,
    required this.members,
    required this.topics,
    required this.plans,
    required this.seeds,
  });

  final List<Room> rooms;
  final List<Member> members;
  final Map<String, List<Topic>> topics;
  final List<NightPlan> plans;
  final List<SeedLine> seeds;

  Room? room(String? id) {
    for (final item in rooms) {
      if (item.id == id) return item;
    }
    return null;
  }

  Member? member(String? id) {
    for (final item in members) {
      if (item.id == id) return item;
    }
    return null;
  }

  List<Member> membersIn(String roomId) =>
      members.where((item) => item.roomId == roomId).toList();

  Topic topicForDay(String roomId, String day) {
    final list = topics[roomId] ?? const <Topic>[];
    if (list.isEmpty) {
      return Topic(id: 'empty', quote: '', question: '');
    }
    return list[unsignedHash(day) % list.length];
  }

  static Future<Catalog> load() async {
    final raw = await rootBundle.loadString('assets/catalog.json');
    final json = jsonDecode(raw) as Map<String, dynamic>;
    final topicMap = <String, List<Topic>>{};
    (json['topics'] as Map<String, dynamic>).forEach((key, value) {
      topicMap[key] = (value as List)
          .map((item) => Topic.fromJson(item as Map<String, dynamic>))
          .toList();
    });
    return Catalog(
      rooms: (json['rooms'] as List)
          .map((item) => Room.fromJson(item as Map<String, dynamic>))
          .toList(),
      members: (json['members'] as List)
          .map((item) => Member.fromJson(item as Map<String, dynamic>))
          .toList(),
      topics: topicMap,
      plans: (json['plans'] as List)
          .map((item) => NightPlan.fromJson(item as Map<String, dynamic>))
          .toList(),
      seeds: (json['seeds'] as List)
          .map((item) => SeedLine.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}

int unsignedHash(String value) {
  var hash = 0;
  for (final code in value.codeUnits) {
    hash = (hash * 33 + code) & 0xFFFFFFFF;
  }
  return hash;
}

const moods = [
  ('sakin', 'Sakin'),
  ('merakli', 'Meraklı'),
  ('sosyal', 'Sosyal'),
  ('derin', 'Derin'),
  ('neseli', 'Neşeli'),
];

const budgets = [
  ('dusuk', 'Düşük'),
  ('orta', 'Orta'),
  ('yuksek', 'Yüksek'),
];

const distances = [
  ('yakin', 'Yürüme'),
  ('sehir', 'Şehir'),
  ('cevrimici', 'Çevrimiçi'),
];

String labelOf(List<(String, String)> options, String value) {
  for (final option in options) {
    if (option.$1 == value) return option.$2;
  }
  return value;
}

String genderLabel(String gender) => gender == 'kadin' ? 'Kadın' : 'Erkek';

const stableNicks = [
  'GeceNotu',
  'SessizMasa',
  'LambalıSayfa',
  'KısaTur',
  'AçıkPencere',
  'SonDurak',
  'İnceAyraç',
  'YavaşTempo',
  'AraSokak',
  'KalemUcu',
  'EşikCümle',
  'SakinKenar',
];

String pickStableNick() => stableNicks[DateTime.now().microsecond % stableNicks.length];

String pickTempNumber() => (1000 + DateTime.now().millisecond * 9 % 9000).toString();

String nickNumber(String tempNick) {
  final last = tempNick.split('_').last;
  return RegExp(r'^\d{4}$').hasMatch(last) ? last : '1000';
}

String tempNickInRoom(String roomName, String tempNick) =>
    '${roomName}_${nickNumber(tempNick)}';

String memberTempNick(String roomName, String memberId) =>
    '${roomName}_${1000 + (unsignedHash(memberId) % 9000)}';

String todayKey([DateTime? date]) {
  final value = date ?? DateTime.now();
  final month = value.month.toString().padLeft(2, '0');
  final day = value.day.toString().padLeft(2, '0');
  return '${value.year}-$month-$day';
}

String topicBody(String quote, String question) => '“$quote”\n\n$question';

String formatClock(int timestamp) {
  final date = DateTime.fromMillisecondsSinceEpoch(timestamp);
  final hour = date.hour.toString().padLeft(2, '0');
  final minute = date.minute.toString().padLeft(2, '0');
  return '$hour:$minute';
}

class PlanMatch {
  PlanMatch({required this.plans, required this.exact});
  final List<NightPlan> plans;
  final bool exact;
}

PlanMatch matchPlans(List<NightPlan> all, String mood, String budget, String distance) {
  final exact = all
      .where((plan) => plan.mood == mood && plan.budget == budget && plan.distance == distance)
      .toList();
  if (exact.isNotEmpty) return PlanMatch(plans: exact, exact: true);
  final near = all.where((plan) => plan.budget == budget && plan.distance == distance).toList();
  if (near.isNotEmpty) return PlanMatch(plans: near, exact: false);
  final byBudget = all.where((plan) => plan.budget == budget).toList();
  if (byBudget.isNotEmpty) return PlanMatch(plans: byBudget, exact: false);
  return PlanMatch(plans: all, exact: false);
}

String botReply(String roomName, int seed) {
  final replies = <String Function(String)>[
    (room) => '$room masasında bunu bir örnekle açar mısın?',
    (room) => 'Katıldığın yer ile duraksadığın yeri ayırırsan $room sohbeti netleşir.',
    (_) => 'Başka bir odadan gelen biri bu cümleyi nasıl duyardı?',
    (_) => 'Tek bir ayrıntı seçelim: seni en çok hangi parça yakaladı?',
    (_) => 'Bu gece için kısa bir cümleyle toparlayalım.',
    (_) => 'Buna karşı bir itiraz da var mı, yoksa masa hemfikir mi?',
  ];
  return replies[seed.abs() % replies.length](roomName);
}

String dmReply(int seed) {
  const replies = [
    'Bunu odada da açsak iyi olur. Hangi cümleden başlayalım?',
    'Not aldım. Benim tarafta benzer bir örnek var.',
    'Kısa tutayım: buna katılıyorum, ayrıntıyı sen seç.',
    'Bu geceki konuda bunun yeri var. Biraz daha somutlaştıralım.',
    'Bunu başkasının cümlesiyle yan yana koyunca ne değişiyor?',
  ];
  return replies[seed.abs() % replies.length];
}
