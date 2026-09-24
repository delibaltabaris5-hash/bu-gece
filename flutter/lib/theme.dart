import 'package:flutter/material.dart';

class Night {
  static const bg = Color(0xFF0C1016);
  static const bgDeep = Color(0xFF07090D);
  static const elevated = Color(0xFF151B24);
  static const card = Color(0xFF1B2330);
  static const cardOn = Color(0xFF243044);
  static const line = Color(0xFF2C3848);
  static const text = Color(0xFFF6F1E7);
  static const muted = Color(0xFFA79F94);
  static const faint = Color(0xFF746D64);
  static const gold = Color(0xFFE4B15A);
  static const goldSoft = Color(0xFFF3D7A4);
  static const ink = Color(0xFF14110C);
  static const rose = Color(0xFFE2B4BE);
  static const roseBg = Color(0xFF3A242C);
  static const blue = Color(0xFFA9C7D8);
  static const blueBg = Color(0xFF1C2C38);
  static const ok = Color(0xFF9DCFB0);
  static const pin = Color(0xFF241F16);
  static const pinLine = Color(0xFF4A3D22);
  static const mine = Color(0xFF243246);

  static ThemeData theme() {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: bg,
      colorScheme: const ColorScheme.dark(
        surface: bg,
        primary: gold,
        onPrimary: ink,
        secondary: goldSoft,
      ),
      fontFamily: 'Roboto',
    );
    return base.copyWith(
      textTheme: base.textTheme.apply(bodyColor: text, displayColor: text),
      navigationBarTheme: const NavigationBarThemeData(
        backgroundColor: elevated,
        indicatorColor: cardOn,
        labelTextStyle: WidgetStatePropertyAll(
          TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}
