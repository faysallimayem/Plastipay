import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'config/theme.dart';
import 'screens/login_screen.dart';

void main() {
  runApp(const PlastiPayApp());
}

class PlastiPayApp extends StatelessWidget {
  const PlastiPayApp({super.key});

  /// Extract machine serial from URL query params (e.g. /app?machine=ECO-TN-001)
  String? _getMachineFromUrl() {
    if (!kIsWeb) return null;
    try {
      final uri = Uri.base;
      final machine = uri.queryParameters['machine'];
      if (machine != null && machine.isNotEmpty) {
        return machine;
      }
    } catch (_) {}
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final machineSerial = _getMachineFromUrl();

    return MaterialApp(
      title: 'PlastiPay Tunisia',
      debugShowCheckedModeBanner: false,
      theme: PlastiPayTheme.darkTheme,
      home: LoginScreen(machineSerial: machineSerial),
    );
  }
}
