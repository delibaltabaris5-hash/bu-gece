import 'package:flutter/material.dart';

import 'catalog.dart';
import 'store.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final catalog = await Catalog.load();
  final store = AppStore(catalog);
  await store.load();
  runApp(BuGeceApp(store: store));
}

class BuGeceApp extends StatelessWidget {
  const BuGeceApp({super.key, required this.store});
  final AppStore store;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Bu Gece',
      debugShowCheckedModeBanner: false,
      theme: Night.theme(),
      home: ListenableBuilder(
        listenable: store,
        builder: (context, _) {
          if (!store.hydrated) {
            return const Scaffold(body: Center(child: CircularProgressIndicator(color: Night.gold)));
          }
          if (!store.onboarded) return OnboardingScreen(store: store);
          return Shell(store: store);
        },
      ),
    );
  }
}

class Shell extends StatefulWidget {
  const Shell({super.key, required this.store});
  final AppStore store;

  @override
  State<Shell> createState() => _ShellState();
}

class _ShellState extends State<Shell> {
  int index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      TonightScreen(store: widget.store),
      RoomsScreen(store: widget.store),
      SettingsScreen(store: widget.store),
    ];
    return Scaffold(
      body: pages[index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        backgroundColor: Night.elevated,
        indicatorColor: Night.cardOn,
        onDestinationSelected: (value) => setState(() => index = value),
        destinations: const [
          NavigationDestination(icon: Text('✶'), label: 'Bu Gece'),
          NavigationDestination(icon: Text('▣'), label: 'Odalar'),
          NavigationDestination(icon: Text('⚙'), label: 'Ayarlar'),
        ],
      ),
    );
  }
}

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, required this.store});
  final AppStore store;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  String step = 'welcome';
  String? gender;
  String? roomId;
  String? mood;

  void finish(String? nextMood) {
    if (gender == null || roomId == null) return;
    widget.store.completeOnboarding(gender: gender!, roomId: roomId!, mood: nextMood);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            if (step == 'welcome') ...[
              const Text('İlgi kulüpleri', style: TextStyle(color: Night.gold, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              const Text('Bu Gece', style: TextStyle(fontSize: 34, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              const Text(
                'Felsefeden mitolojiye on oda. Bu gecenin konusunu birlikte aç, tek bir plan önerisi al. Odalar konu içindir.',
                style: TextStyle(color: Night.muted, fontSize: 16, height: 1.4),
              ),
              const SizedBox(height: 20),
              PrimaryButton(label: 'Başla', onPressed: () => setState(() => step = 'gender')),
            ],
            if (step == 'gender') ...[
              const Text('1 / 3', style: TextStyle(color: Night.gold, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              const Text('Odada nasıl görüneceksin?', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              const Text(
                'Ücretsiz planda yalnızca bir simge ve geçici numara görünür. Fotoğraf yok.',
                style: TextStyle(color: Night.muted, height: 1.4),
              ),
              const SizedBox(height: 16),
              ChoiceCard(
                title: 'Kadın',
                hint: 'Gül kurusu simge',
                selected: gender == 'kadin',
                onTap: () => setState(() => gender = 'kadin'),
              ),
              const SizedBox(height: 10),
              ChoiceCard(
                title: 'Erkek',
                hint: 'Gece mavisi simge',
                selected: gender == 'erkek',
                onTap: () => setState(() => gender = 'erkek'),
              ),
              const SizedBox(height: 16),
              PrimaryButton(
                label: 'Odayı seç',
                enabled: gender != null,
                onPressed: () => setState(() => step = 'room'),
              ),
            ],
            if (step == 'room') ...[
              const Text('2 / 3', style: TextStyle(color: Night.gold, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              const Text('Bu gece hangi oda?', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              const Text(
                'Diğer odalara da girebilirsin. Bu seçim ev odanı belirler.',
                style: TextStyle(color: Night.muted, height: 1.4),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  for (final room in widget.store.catalog.rooms)
                    SizedBox(
                      width: (MediaQuery.sizeOf(context).width - 58) / 2,
                      child: ChoiceCard(
                        title: room.name,
                        hint: room.mark,
                        selected: roomId == room.id,
                        onTap: () => setState(() => roomId = room.id),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              PrimaryButton(
                label: 'Tempoya geç',
                enabled: roomId != null,
                onPressed: () => setState(() => step = 'mood'),
              ),
              SecondaryButton(label: 'Geri', onPressed: () => setState(() => step = 'gender')),
            ],
            if (step == 'mood') ...[
              const Text('3 / 3', style: TextStyle(color: Night.gold, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              const Text('Bu gecenin temposu', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              const Text(
                'İstersen boş bırak. Planı ana ekranda bütçe ve mesafeyle birlikte değiştirebilirsin.',
                style: TextStyle(color: Night.muted, height: 1.4),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final option in moods)
                    ChoiceChip(
                      label: Text(option.$2),
                      selected: mood == option.$1,
                      selectedColor: Night.cardOn,
                      onSelected: (_) => setState(() => mood = mood == option.$1 ? null : option.$1),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              PrimaryButton(label: 'Bu geceye geç', onPressed: () => finish(mood)),
              SecondaryButton(label: 'Temposuz devam et', onPressed: () => finish(null)),
            ],
          ],
        ),
      ),
    );
  }
}

class TonightScreen extends StatefulWidget {
  const TonightScreen({super.key, required this.store});
  final AppStore store;

  @override
  State<TonightScreen> createState() => _TonightScreenState();
}

class _TonightScreenState extends State<TonightScreen> {
  late String mood;
  String budget = 'dusuk';
  String distance = 'yakin';
  int index = 0;

  @override
  void initState() {
    super.initState();
    mood = widget.store.mood ?? 'sakin';
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    final home = store.catalog.room(store.roomId);
    final match = matchPlans(store.catalog.plans, mood, budget, distance);
    final plan = match.plans[index % match.plans.length];
    final planRoom = store.catalog.room(plan.roomId);
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) => SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('İyi geceler', style: TextStyle(color: Night.gold, fontWeight: FontWeight.w700)),
                      const Text('Bu Gece', style: TextStyle(fontSize: 36, fontWeight: FontWeight.w700)),
                      Text(
                        '${store.tempNick.isEmpty ? 'Misafir' : store.tempNick}${home == null ? '' : ' · ${home.name}'}',
                        style: const TextStyle(color: Night.muted),
                      ),
                    ],
                  ),
                ),
                Pill(label: store.isPro ? 'Pro' : 'Ücretsiz', gold: store.isPro),
              ],
            ),
            const SizedBox(height: 16),
            const Text('Tek bir öneri. Takvimin değil, bu akşamın planı.'),
            const SizedBox(height: 16),
            Segmented(
              label: 'Ruh hali',
              options: moods,
              value: mood,
              onChanged: (value) => setState(() {
                index = 0;
                mood = value;
              }),
            ),
            Segmented(
              label: 'Bütçe',
              options: budgets,
              value: budget,
              onChanged: (value) => setState(() {
                index = 0;
                budget = value;
              }),
            ),
            Segmented(
              label: 'Mesafe',
              options: distances,
              value: distance,
              onChanged: (value) => setState(() {
                index = 0;
                distance = value;
              }),
            ),
            NightCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Örnek plan', style: TextStyle(color: Night.gold, fontWeight: FontWeight.w700, fontSize: 12)),
                  const SizedBox(height: 6),
                  Text(plan.title, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Text(plan.summary, style: const TextStyle(height: 1.4)),
                  const SizedBox(height: 8),
                  Text(plan.place, style: const TextStyle(color: Night.muted)),
                  Text(plan.when, style: const TextStyle(color: Night.muted)),
                  Text(
                    '${labelOf(moods, plan.mood)} · ${labelOf(budgets, plan.budget)} · ${labelOf(distances, plan.distance)}',
                    style: const TextStyle(color: Night.muted),
                  ),
                  if (!match.exact)
                    const Padding(
                      padding: EdgeInsets.only(top: 8),
                      child: Text(
                        'Bu süzgeçte birebir plan yok. En yakın gece planını gösteriyorum.',
                        style: TextStyle(color: Night.goldSoft, fontSize: 13),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            PrimaryButton(
              label: planRoom == null ? 'Odaya git' : '${planRoom.name} odasına git',
              onPressed: () => openRoom(context, store, plan.roomId),
            ),
            SecondaryButton(label: 'Başka öneri', onPressed: () => setState(() => index += 1)),
            const Text(
              'Planlar örnek veridir. Konum servisi ve ödeme bu sürümde yoktur.',
              style: TextStyle(color: Night.faint, fontSize: 12, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }
}

class RoomsScreen extends StatelessWidget {
  const RoomsScreen({super.key, required this.store});
  final AppStore store;

  @override
  Widget build(BuildContext context) {
    final today = todayKey();
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const Text('On oda', style: TextStyle(color: Night.gold, fontWeight: FontWeight.w700)),
          const Text('Odalar', style: TextStyle(fontSize: 34, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          const Text(
            'Her odanın bir moderatörü ve bugünün konusu var. Ücretsiz planda herkes simge ve geçici numarayla durur.',
            style: TextStyle(color: Night.muted, height: 1.4),
          ),
          const SizedBox(height: 12),
          for (final room in store.catalog.rooms)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: () => openRoom(context, store, room.id),
                child: NightCard(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(room.mark, style: const TextStyle(color: Night.gold, fontSize: 22)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(child: Text(room.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
                                if (room.id == store.roomId)
                                  const Text('Senin odan', style: TextStyle(color: Night.goldSoft, fontSize: 12, fontWeight: FontWeight.w700)),
                              ],
                            ),
                            Text(room.blurb, style: const TextStyle(color: Night.muted, height: 1.3)),
                            const SizedBox(height: 4),
                            Text('Bugün: ${store.catalog.topicForDay(room.id, today).question}'),
                            Text(
                              '${store.catalog.membersIn(room.id).length} örnek kişi · ${room.name} Bot',
                              style: const TextStyle(color: Night.faint, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key, required this.store});
  final AppStore store;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        final room = store.catalog.room(store.roomId);
        return SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const Text('Bu cihaz', style: TextStyle(color: Night.gold, fontWeight: FontWeight.w700)),
              const Text('Ayarlar', style: TextStyle(fontSize: 34, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              NightCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (store.gender != null) Avatar(gender: store.gender!, size: 56),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(store.isPro ? store.stableNick : store.tempNick, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                              Text(
                                '${store.gender == null ? 'Simge seçilmedi' : genderLabel(store.gender!)}${room == null ? '' : ' · ${room.name}'}',
                                style: const TextStyle(color: Night.muted),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text('Odada görünen geçici ad: ${store.tempNick.isEmpty ? '—' : store.tempNick}'),
                    Text('Pro ile sabit ad: ${store.stableNick.isEmpty ? '—' : store.stableNick}'),
                    Text('Tempo: ${store.mood == null ? 'Seçilmedi' : labelOf(moods, store.mood!)}'),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              NightCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(child: Text('Üyelik', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
                        Pill(label: store.isPro ? 'Pro' : 'Ücretsiz', gold: store.isPro),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Ücretsiz planda odadaki kişiler simge ve geçici numarayla görünür. Odaya yazabilirsin, doğrudan mesaj yazamazsın.',
                      style: TextStyle(color: Night.muted, height: 1.4),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Pro, sabit takma adı, kısa tanıtımı ve doğrudan mesajı açar. Bu sürümde kilit yerel bir denemedir.',
                      style: TextStyle(color: Night.muted, height: 1.4),
                    ),
                    const SizedBox(height: 8),
                    if (store.isPro)
                      SecondaryButton(label: 'Pro’yu kapat', onPressed: store.revokePro)
                    else
                      PrimaryButton(label: 'Pro’yu aç', onPressed: () => openPro(context, store)),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              NightCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Bu uygulama', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    const Text(
                      'Bu Gece bir ilgi kulübüdür. Felsefe, tarih, edebiyat, astronomi, sanat, müzik, sinema, bilim, psikoloji ve mitoloji odaları konu içindir.',
                      style: TextStyle(color: Night.muted, height: 1.4),
                    ),
                    const SizedBox(height: 8),
                    SecondaryButton(
                      label: 'Kimliği sıfırla',
                      onPressed: () {
                        showDialog<void>(
                          context: context,
                          builder: (dialogContext) => AlertDialog(
                            backgroundColor: Night.card,
                            title: const Text('Kimliği sıfırla'),
                            content: const Text('Oda ve simge seçimin silinir. Sohbet geçmişi bu cihazda kalır.'),
                            actions: [
                              TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Vazgeç')),
                              TextButton(
                                onPressed: () {
                                  Navigator.pop(dialogContext);
                                  store.resetIdentity();
                                },
                                child: const Text('Sıfırla'),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

void openRoom(BuildContext context, AppStore store, String roomId) {
  Navigator.of(context).push(MaterialPageRoute(builder: (_) => RoomScreen(store: store, roomId: roomId)));
}

void openMember(BuildContext context, AppStore store, String memberId) {
  Navigator.of(context).push(MaterialPageRoute(builder: (_) => MemberScreen(store: store, memberId: memberId)));
}

void openDm(BuildContext context, AppStore store, String memberId) {
  Navigator.of(context).push(MaterialPageRoute(builder: (_) => DmScreen(store: store, memberId: memberId)));
}

void openPro(BuildContext context, AppStore store) {
  Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProScreen(store: store)));
}

class RoomScreen extends StatefulWidget {
  const RoomScreen({super.key, required this.store, required this.roomId});
  final AppStore store;
  final String roomId;

  @override
  State<RoomScreen> createState() => _RoomScreenState();
}

class _RoomScreenState extends State<RoomScreen> {
  final draft = TextEditingController();

  @override
  void initState() {
    super.initState();
    widget.store.ensureDailyTopic(widget.roomId);
  }

  @override
  void dispose() {
    draft.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final room = widget.store.catalog.room(widget.roomId);
    if (room == null) {
      return const Scaffold(body: Center(child: Text('Oda bulunamadı.')));
    }
    final topic = widget.store.catalog.topicForDay(room.id, todayKey());
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: Row(
                children: [
                  TextButton(onPressed: () => Navigator.pop(context), child: const Text('Geri', style: TextStyle(color: Night.gold, fontWeight: FontWeight.w700))),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(room.name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
                        ListenableBuilder(
                          listenable: widget.store,
                          builder: (context, _) => Text(
                            '${room.name} Bot · ${widget.store.isPro ? 'Pro' : 'Ücretsiz'}',
                            style: const TextStyle(color: Night.muted, fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Night.pin,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Night.pinLine),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Bugünün konusu', style: TextStyle(color: Night.gold, fontWeight: FontWeight.w700, fontSize: 12)),
                  Text(topic.question),
                ],
              ),
            ),
            Expanded(
              child: ListenableBuilder(
                listenable: widget.store,
                builder: (context, _) {
                  final messages = widget.store.roomMessages[room.id] ?? [];
                  return ListView.builder(
                    reverse: true,
                    padding: const EdgeInsets.all(16),
                    itemCount: messages.length,
                    itemBuilder: (context, index) {
                      final item = messages[messages.length - 1 - index];
                      if (item.authorKind == 'bot') {
                        return MessageBubble(
                          name: '${room.name} Bot',
                          text: item.text,
                          createdAt: item.createdAt,
                          mine: false,
                          bot: true,
                          glyph: room.mark,
                        );
                      }
                      if (item.authorKind == 'self') {
                        final name = widget.store.isPro
                            ? widget.store.stableNick
                            : tempNickInRoom(room.name, widget.store.tempNick);
                        return MessageBubble(
                          name: name.isEmpty ? 'Sen' : name,
                          text: item.text,
                          createdAt: item.createdAt,
                          mine: true,
                          gender: widget.store.gender ?? 'kadin',
                        );
                      }
                      final member = widget.store.catalog.member(item.memberId);
                      if (member == null) return const SizedBox.shrink();
                      final name = widget.store.isPro ? member.stableNick : memberTempNick(room.name, member.id);
                      return MessageBubble(
                        name: name,
                        text: item.text,
                        createdAt: item.createdAt,
                        mine: false,
                        gender: member.gender,
                        onTap: () => openMember(context, widget.store, member.id),
                      );
                    },
                  );
                },
              ),
            ),
            Composer(
              controller: draft,
              hint: 'Odaya bir cümle bırak',
              note: widget.store.isPro
                  ? 'Pro: sabit adlar açık. Odaya herkes yazabilir.'
                  : 'Ücretsiz: simge ve geçici numara. Odaya yazılır, doğrudan mesaj kapalıdır.',
              onSend: () {
                widget.store.postRoomMessage(room.id, draft.text);
                draft.clear();
              },
            ),
          ],
        ),
      ),
    );
  }
}

class MemberScreen extends StatelessWidget {
  const MemberScreen({super.key, required this.store, required this.memberId});
  final AppStore store;
  final String memberId;

  @override
  Widget build(BuildContext context) {
    final member = store.catalog.member(memberId);
    final room = store.catalog.room(member?.roomId);
    if (member == null || room == null) {
      return const Scaffold(body: Center(child: Text('Kişi bulunamadı')));
    }
    final temp = memberTempNick(room.name, member.id);
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) => Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextButton(onPressed: () => Navigator.pop(context), child: const Text('Geri', style: TextStyle(color: Night.gold, fontWeight: FontWeight.w700))),
                NightCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Avatar(gender: member.gender, size: 84),
                      const SizedBox(height: 8),
                      Text(room.name, style: const TextStyle(color: Night.gold, fontWeight: FontWeight.w700)),
                      Text(store.isPro ? member.stableNick : temp, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700)),
                      if (store.isPro) ...[
                        Text(member.bio, style: const TextStyle(height: 1.4)),
                        Text('Şehir notu: ${member.city}', style: const TextStyle(color: Night.muted)),
                        Text('Geçici numara: $temp', style: const TextStyle(color: Night.muted)),
                      ] else ...[
                        const Text('Ücretsiz planda bu kişiyi yalnızca simge ve geçici numarayla görürsün.'),
                        const SizedBox(height: 8),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(color: Night.elevated, borderRadius: BorderRadius.circular(16)),
                          child: const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Pro ile açılır', style: TextStyle(color: Night.goldSoft, fontWeight: FontWeight.w700)),
                              Text('Sabit takma ad', style: TextStyle(color: Night.muted)),
                              Text('Kısa tanıtım', style: TextStyle(color: Night.muted)),
                              Text('Doğrudan mesaj', style: TextStyle(color: Night.muted)),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                if (store.isPro)
                  PrimaryButton(label: 'Doğrudan mesaj', onPressed: () => openDm(context, store, member.id))
                else
                  PrimaryButton(label: 'Pro ile mesajı aç', onPressed: () => openPro(context, store)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class DmScreen extends StatefulWidget {
  const DmScreen({super.key, required this.store, required this.memberId});
  final AppStore store;
  final String memberId;

  @override
  State<DmScreen> createState() => _DmScreenState();
}

class _DmScreenState extends State<DmScreen> {
  final draft = TextEditingController();

  @override
  void dispose() {
    draft.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.store.isPro) {
      return ProScreen(store: widget.store);
    }
    final member = widget.store.catalog.member(widget.memberId);
    if (member == null) return const Scaffold(body: Center(child: Text('Kişi bulunamadı.')));
    final room = widget.store.catalog.room(member.roomId);
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 16, 8),
              child: Row(
                children: [
                  TextButton(onPressed: () => Navigator.pop(context), child: const Text('Geri', style: TextStyle(color: Night.gold, fontWeight: FontWeight.w700))),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(member.stableNick, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
                        Text('Doğrudan mesaj · ${room?.name ?? ''}', style: const TextStyle(color: Night.muted, fontSize: 13)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListenableBuilder(
                listenable: widget.store,
                builder: (context, _) {
                  final thread = widget.store.directMessages[member.id] ?? [];
                  if (thread.isEmpty) {
                    return const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(
                        child: Text(
                          'İlk cümleyi konu üzerinden bırak. Bu kanal, odadaki bir kişiyle yazışma.',
                          style: TextStyle(color: Night.muted, fontSize: 16, height: 1.4),
                        ),
                      ),
                    );
                  }
                  return ListView.builder(
                    reverse: true,
                    padding: const EdgeInsets.all(16),
                    itemCount: thread.length,
                    itemBuilder: (context, index) {
                      final item = thread[thread.length - 1 - index];
                      final mine = item.from == 'self';
                      return MessageBubble(
                        name: mine ? (widget.store.stableNick.isEmpty ? 'Sen' : widget.store.stableNick) : member.stableNick,
                        text: item.text,
                        createdAt: item.createdAt,
                        mine: mine,
                        gender: mine ? (widget.store.gender ?? 'kadin') : member.gender,
                      );
                    },
                  );
                },
              ),
            ),
            Composer(
              controller: draft,
              hint: 'Doğrudan bir cümle',
              onSend: () {
                widget.store.postDirectMessage(member.id, draft.text);
                draft.clear();
              },
            ),
          ],
        ),
      ),
    );
  }
}

class ProScreen extends StatefulWidget {
  const ProScreen({super.key, required this.store});
  final AppStore store;

  @override
  State<ProScreen> createState() => _ProScreenState();
}

class _ProScreenState extends State<ProScreen> {
  String note = '';

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.store,
      builder: (context, _) => Scaffold(
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton(onPressed: () => Navigator.pop(context), child: const Text('Kapat', style: TextStyle(color: Night.gold, fontWeight: FontWeight.w700))),
              ),
              const Text('Pro', style: TextStyle(color: Night.gold, fontWeight: FontWeight.w700)),
              const Text('Sabit ad ve doğrudan mesaj', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              const Text(
                'Konum takibi yok. Pro, odadaki kişilerin sabit adını görmeni ve onlara konu üzerinden yazmanı açar.',
                style: TextStyle(color: Night.muted, height: 1.4),
              ),
              const SizedBox(height: 12),
              const NightCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Ücretsiz', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                    Text('Cinsiyet simgesi, geçici numara ve oda sohbeti. Doğrudan mesaj kapalı.', style: TextStyle(color: Night.muted, height: 1.4)),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              const NightCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Pro', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                    Text('Sabit takma ad, kısa tanıtım ve odadaki bir kişiye doğrudan mesaj.', style: TextStyle(color: Night.muted, height: 1.4)),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              if (widget.store.isPro) ...[
                const Text('Pro açık. Profiller ve doğrudan mesaj kullanılabilir.', style: TextStyle(color: Night.ok)),
                SecondaryButton(
                  label: 'Ücretsiz görünüme dön',
                  onPressed: () {
                    widget.store.revokePro();
                    setState(() => note = 'Ücretsiz görünüme döndün.');
                  },
                ),
              ] else
                PrimaryButton(
                  label: widget.store.proBusy ? 'Açılıyor…' : 'Pro’yu aç',
                  enabled: !widget.store.proBusy,
                  onPressed: () async {
                    final ok = await widget.store.unlockPro();
                    if (mounted) setState(() => note = ok ? 'Pro bu cihazda açıldı.' : 'Kilit açılmadı.');
                  },
                ),
              if (note.isNotEmpty) Text(note, style: const TextStyle(color: Night.goldSoft)),
              const SizedBox(height: 8),
              const Text(
                'Google Play Billing bu sürümde bağlı değil. “Pro’yu aç” yerel bir deneme kilididir ve yalnızca bu cihazda durur.',
                style: TextStyle(color: Night.faint, fontSize: 12, height: 1.4),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({super.key, required this.label, required this.onPressed, this.enabled = true});
  final String label;
  final VoidCallback onPressed;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: SizedBox(
        width: double.infinity,
        child: FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: Night.gold,
            foregroundColor: Night.ink,
            disabledBackgroundColor: Night.gold.withValues(alpha: 0.4),
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
          onPressed: enabled ? onPressed : null,
          child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
        ),
      ),
    );
  }
}

class SecondaryButton extends StatelessWidget {
  const SecondaryButton({super.key, required this.label, required this.onPressed});
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: SizedBox(
        width: double.infinity,
        child: OutlinedButton(
          style: OutlinedButton.styleFrom(
            foregroundColor: Night.text,
            side: const BorderSide(color: Night.line),
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
          onPressed: onPressed,
          child: Text(label),
        ),
      ),
    );
  }
}

class ChoiceCard extends StatelessWidget {
  const ChoiceCard({super.key, required this.title, required this.hint, required this.selected, required this.onTap});
  final String title;
  final String hint;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? Night.cardOn : Night.card,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: selected ? Night.gold : Night.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(hint, style: const TextStyle(color: Night.gold)),
              Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            ],
          ),
        ),
      ),
    );
  }
}

class NightCard extends StatelessWidget {
  const NightCard({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 4),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Night.card,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Night.line),
      ),
      child: child,
    );
  }
}

class Pill extends StatelessWidget {
  const Pill({super.key, required this.label, required this.gold});
  final String label;
  final bool gold;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: gold ? Night.gold : Night.elevated,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(label, style: TextStyle(color: gold ? Night.ink : Night.muted, fontWeight: FontWeight.w700, fontSize: 12)),
    );
  }
}

class Segmented extends StatelessWidget {
  const Segmented({super.key, required this.label, required this.options, required this.value, required this.onChanged});
  final String label;
  final List<(String, String)> options;
  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Night.muted, fontSize: 13)),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final option in options)
                ChoiceChip(
                  label: Text(option.$2),
                  selected: value == option.$1,
                  selectedColor: Night.cardOn,
                  labelStyle: TextStyle(color: value == option.$1 ? Night.goldSoft : Night.muted, fontWeight: FontWeight.w700),
                  onSelected: (_) => onChanged(option.$1),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class Avatar extends StatelessWidget {
  const Avatar({super.key, required this.gender, this.size = 36});
  final String gender;
  final double size;

  @override
  Widget build(BuildContext context) {
    final rose = gender == 'kadin';
    return Semantics(
      label: '${genderLabel(gender)} simgesi',
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(color: rose ? Night.roseBg : Night.blueBg, shape: BoxShape.circle),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: size * 0.34,
              height: size * 0.34,
              decoration: BoxDecoration(color: rose ? Night.rose : Night.blue, shape: BoxShape.circle),
            ),
            Container(
              width: size * 0.62,
              height: size * 0.22,
              decoration: BoxDecoration(
                color: rose ? Night.rose : Night.blue,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(40)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class MessageBubble extends StatelessWidget {
  const MessageBubble({
    super.key,
    required this.name,
    required this.text,
    required this.createdAt,
    required this.mine,
    this.bot = false,
    this.glyph = '✶',
    this.gender = 'kadin',
    this.onTap,
  });

  final String name;
  final String text;
  final int createdAt;
  final bool mine;
  final bool bot;
  final String glyph;
  final String gender;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final author = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (bot)
          Container(
            width: 28,
            height: 28,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: const Color(0xFF2A2418),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Night.gold),
            ),
            child: Text(glyph, style: const TextStyle(color: Night.gold, fontSize: 12)),
          )
        else
          Avatar(gender: gender, size: 28),
        const SizedBox(width: 8),
        Flexible(child: Text(name, style: const TextStyle(color: Night.muted, fontSize: 13))),
      ],
    );
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: Column(
          crossAxisAlignment: mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (onTap != null) InkWell(onTap: onTap, child: author) else author,
            const SizedBox(height: 6),
            Container(
              constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.86),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: mine ? Night.mine : Night.card,
                borderRadius: BorderRadius.circular(16),
                border: bot ? const Border(left: BorderSide(color: Night.gold, width: 3)) : null,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(text, style: const TextStyle(height: 1.4)),
                  Text(formatClock(createdAt), style: const TextStyle(color: Night.faint, fontSize: 11)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class Composer extends StatelessWidget {
  const Composer({super.key, required this.controller, required this.hint, required this.onSend, this.note});
  final TextEditingController controller;
  final String hint;
  final VoidCallback onSend;
  final String? note;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
      decoration: const BoxDecoration(color: Night.elevated, border: Border(top: BorderSide(color: Night.line))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (note != null) Text(note!, style: const TextStyle(color: Night.faint, fontSize: 12)),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  maxLength: 400,
                  minLines: 1,
                  maxLines: 4,
                  style: const TextStyle(color: Night.text),
                  decoration: InputDecoration(
                    counterText: '',
                    hintText: hint,
                    hintStyle: const TextStyle(color: Night.faint),
                    filled: true,
                    fillColor: Night.card,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: Night.gold, foregroundColor: Night.ink),
                onPressed: onSend,
                child: const Text('Gönder', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
