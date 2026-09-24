import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'catalog.dart';

class ChatMessage {
  ChatMessage({
    required this.id,
    required this.roomId,
    required this.authorKind,
    required this.text,
    required this.createdAt,
    this.memberId,
  });

  final String id;
  final String roomId;
  final String authorKind;
  final String text;
  final int createdAt;
  final String? memberId;

  Map<String, dynamic> toJson() => {
        'id': id,
        'roomId': roomId,
        'authorKind': authorKind,
        'text': text,
        'createdAt': createdAt,
        'memberId': memberId,
      };

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
        id: json['id'] as String,
        roomId: json['roomId'] as String,
        authorKind: json['authorKind'] as String,
        text: json['text'] as String,
        createdAt: json['createdAt'] as int,
        memberId: json['memberId'] as String?,
      );
}

class DirectMessage {
  DirectMessage({
    required this.id,
    required this.memberId,
    required this.from,
    required this.text,
    required this.createdAt,
  });

  final String id;
  final String memberId;
  final String from;
  final String text;
  final int createdAt;

  Map<String, dynamic> toJson() => {
        'id': id,
        'memberId': memberId,
        'from': from,
        'text': text,
        'createdAt': createdAt,
      };

  factory DirectMessage.fromJson(Map<String, dynamic> json) => DirectMessage(
        id: json['id'] as String,
        memberId: json['memberId'] as String,
        from: json['from'] as String,
        text: json['text'] as String,
        createdAt: json['createdAt'] as int,
      );
}

class AppStore extends ChangeNotifier {
  AppStore(this.catalog);

  static const _key = 'bu-gece-v1';
  final Catalog catalog;

  bool hydrated = false;
  bool onboarded = false;
  String? gender;
  String? roomId;
  String? mood;
  bool isPro = false;
  bool proBusy = false;
  String stableNick = '';
  String tempNick = '';
  Map<String, List<ChatMessage>> roomMessages = {};
  Map<String, List<DirectMessage>> directMessages = {};
  Map<String, String> topicDayByRoom = {};

  Future<void> load() async {
    roomMessages = _seedMessages();
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw != null) {
      final json = jsonDecode(raw) as Map<String, dynamic>;
      onboarded = json['onboarded'] == true;
      gender = json['gender'] as String?;
      roomId = json['roomId'] as String?;
      mood = json['mood'] as String?;
      isPro = json['isPro'] == true;
      stableNick = json['stableNick'] as String? ?? '';
      tempNick = json['tempNick'] as String? ?? '';
      final storedRooms = json['roomMessages'] as Map<String, dynamic>?;
      if (storedRooms != null) {
        roomMessages = storedRooms.map((key, value) => MapEntry(
              key,
              (value as List)
                  .map((item) => ChatMessage.fromJson(item as Map<String, dynamic>))
                  .toList(),
            ));
      }
      final storedDm = json['directMessages'] as Map<String, dynamic>?;
      if (storedDm != null) {
        directMessages = storedDm.map((key, value) => MapEntry(
              key,
              (value as List)
                  .map((item) => DirectMessage.fromJson(item as Map<String, dynamic>))
                  .toList(),
            ));
      }
      final days = json['topicDayByRoom'] as Map<String, dynamic>?;
      if (days != null) {
        topicDayByRoom = days.map((key, value) => MapEntry(key, value as String));
      }
    }
    hydrated = true;
    notifyListeners();
  }

  Map<String, List<ChatMessage>> _seedMessages() {
    const base = 1758550200000; // 2026-09-22T18:10:00+03:00
    final buckets = {for (final room in catalog.rooms) room.id: <ChatMessage>[]};
    for (var index = 0; index < catalog.seeds.length; index++) {
      final line = catalog.seeds[index];
      buckets[line.roomId]?.add(ChatMessage(
        id: 'seed_${line.roomId}_$index',
        roomId: line.roomId,
        authorKind: 'member',
        memberId: line.memberId,
        text: line.text,
        createdAt: base + index * 7 * 60 * 1000,
      ));
    }
    return buckets;
  }

  Future<void> _save() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _key,
      jsonEncode({
        'onboarded': onboarded,
        'gender': gender,
        'roomId': roomId,
        'mood': mood,
        'isPro': isPro,
        'stableNick': stableNick,
        'tempNick': tempNick,
        'roomMessages': roomMessages.map((key, value) => MapEntry(key, value.map((m) => m.toJson()).toList())),
        'directMessages': directMessages.map((key, value) => MapEntry(key, value.map((m) => m.toJson()).toList())),
        'topicDayByRoom': topicDayByRoom,
      }),
    );
  }

  List<T> _trim<T>(List<T> items) => items.length > 100 ? items.sublist(items.length - 100) : items;

  void completeOnboarding({required String gender, required String roomId, String? mood}) {
    final room = catalog.room(roomId);
    this.gender = gender;
    this.roomId = roomId;
    this.mood = mood;
    onboarded = true;
    stableNick = pickStableNick();
    tempNick = '${room?.name ?? 'Oda'}_${pickTempNumber()}';
    notifyListeners();
    _save();
  }

  void resetIdentity() {
    onboarded = false;
    gender = null;
    roomId = null;
    mood = null;
    stableNick = '';
    tempNick = '';
    notifyListeners();
    _save();
  }

  Future<bool> unlockPro() async {
    if (proBusy) return isPro;
    proBusy = true;
    notifyListeners();
    await Future<void>.delayed(const Duration(milliseconds: 350));
    isPro = true;
    proBusy = false;
    notifyListeners();
    await _save();
    return true;
  }

  void revokePro() {
    isPro = false;
    notifyListeners();
    _save();
  }

  void ensureDailyTopic(String roomId) {
    final today = todayKey();
    final id = 'topic_${roomId}_$today';
    final existing = roomMessages[roomId] ?? [];
    if (topicDayByRoom[roomId] == today || existing.any((item) => item.id == id)) return;
    final topic = catalog.topicForDay(roomId, today);
    roomMessages = {
      ...roomMessages,
      roomId: _trim([
        ...existing,
        ChatMessage(
          id: id,
          roomId: roomId,
          authorKind: 'bot',
          text: topicBody(topic.quote, topic.question),
          createdAt: DateTime.now().millisecondsSinceEpoch,
        ),
      ]),
    };
    topicDayByRoom = {...topicDayByRoom, roomId: today};
    notifyListeners();
    _save();
  }

  void postRoomMessage(String roomId, String text) {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;
    final body = trimmed.length > 400 ? trimmed.substring(0, 400) : trimmed;
    final room = catalog.room(roomId);
    final now = DateTime.now().millisecondsSinceEpoch;
    final current = roomMessages[roomId] ?? [];
    roomMessages = {
      ...roomMessages,
      roomId: _trim([
        ...current,
        ChatMessage(
          id: 'self_${roomId}_$now',
          roomId: roomId,
          authorKind: 'self',
          text: body,
          createdAt: now,
        ),
      ]),
    };
    notifyListeners();
    _save();
    final selfCount = current.where((item) => item.authorKind == 'self').length;
    if (!body.contains('?') && selfCount % 2 == 1) return;
    final replyText = botReply(room?.name ?? 'Oda', selfCount + body.length);
    Future<void>.delayed(const Duration(milliseconds: 800), () {
      final latest = roomMessages[roomId] ?? [];
      roomMessages = {
        ...roomMessages,
        roomId: _trim([
          ...latest,
          ChatMessage(
            id: 'bot_reply_${roomId}_${DateTime.now().millisecondsSinceEpoch}',
            roomId: roomId,
            authorKind: 'bot',
            text: replyText,
            createdAt: DateTime.now().millisecondsSinceEpoch,
          ),
        ]),
      };
      notifyListeners();
      _save();
    });
  }

  void postDirectMessage(String memberId, String text) {
    if (!isPro) return;
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;
    final body = trimmed.length > 400 ? trimmed.substring(0, 400) : trimmed;
    final now = DateTime.now().millisecondsSinceEpoch;
    final current = directMessages[memberId] ?? [];
    directMessages = {
      ...directMessages,
      memberId: _trim([
        ...current,
        DirectMessage(
          id: 'dm_self_${memberId}_$now',
          memberId: memberId,
          from: 'self',
          text: body,
          createdAt: now,
        ),
      ]),
    };
    notifyListeners();
    _save();
    final replyText = dmReply(current.length + body.length);
    Future<void>.delayed(const Duration(milliseconds: 700), () {
      final latest = directMessages[memberId] ?? [];
      directMessages = {
        ...directMessages,
        memberId: _trim([
          ...latest,
          DirectMessage(
            id: 'dm_member_${memberId}_${DateTime.now().millisecondsSinceEpoch}',
            memberId: memberId,
            from: 'member',
            text: replyText,
            createdAt: DateTime.now().millisecondsSinceEpoch,
          ),
        ]),
      };
      notifyListeners();
      _save();
    });
  }
}
