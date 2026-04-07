import 'package:flutter/material.dart';
import 'config/theme.dart';
import 'screens/login_screen.dart';

void main() {
  runApp(const PlastiPayApp());
}

class PlastiPayApp extends StatelessWidget {
  const PlastiPayApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PlastiPay Tunisia',
      debugShowCheckedModeBanner: false,
      theme: PlastiPayTheme.darkTheme,
      home: const LoginScreen(),
    );
  }
}
