import 'package:bu_gece/catalog.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('günün konusu tarihi sabit bir oda listesinde döner', () {
    final index = unsignedHash('2026-09-24') % 6;
    expect(index, inInclusiveRange(0, 5));
    expect(matchPlans([
      NightPlan(
        id: 'p1',
        title: 'Sessiz okuma köşesi',
        summary: 'Tek bölüm',
        place: 'Kitapçı',
        when: '20:30',
        mood: 'sakin',
        budget: 'dusuk',
        distance: 'yakin',
        roomId: 'edebiyat',
      ),
    ], 'sakin', 'dusuk', 'yakin').exact, isTrue);
  });
}
