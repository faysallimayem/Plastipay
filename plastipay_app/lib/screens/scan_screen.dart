import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../config/theme.dart';
import '../services/api_service.dart';

class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  final _api = ApiService();
  bool _connecting = false;
  bool _sessionActive = false;
  String _error = '';
  
  // Session data
  String _machineName = '';
  String _machineLocation = '';
  int _totalPoints = 0;
  int _bottlesThisSession = 0;
  int _pointsThisSession = 0;
  
  Timer? _pollTimer;

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  /// Connect to machine by serial number
  Future<void> _connectToMachine(String serialNumber) async {
    setState(() { _connecting = true; _error = ''; });
    
    try {
      final session = await _api.startMachineSession(serialNumber);
      if (mounted) {
        setState(() {
          _connecting = false;
          _sessionActive = true;
          _machineName = session['machineName'] ?? 'Machine';
          _machineLocation = session['machineLocation'] ?? '';
          _totalPoints = session['userPoints'] ?? 0;
          _bottlesThisSession = 0;
          _pointsThisSession = 0;
        });
        _startPolling();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _connecting = false;
          _error = e.toString().replaceAll('Exception: ', '');
        });
      }
    }
  }

  /// Manual entry dialog
  Future<void> _connectManually() async {
    final controller = TextEditingController(text: 'ECO-TN-001');
    final serial = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: PlastiPayTheme.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Entrer le code machine', style: TextStyle(color: PlastiPayTheme.textPrimary)),
        content: TextField(
          controller: controller,
          autofocus: true,
          style: const TextStyle(color: PlastiPayTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.w600),
          decoration: InputDecoration(
            hintText: 'ECO-TN-001',
            hintStyle: TextStyle(color: PlastiPayTheme.textMuted),
            filled: true,
            fillColor: PlastiPayTheme.bgPrimary,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            prefixIcon: const Icon(Icons.precision_manufacturing_rounded, color: PlastiPayTheme.greenPrimary),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          ElevatedButton.icon(
            onPressed: () => Navigator.pop(ctx, controller.text),
            icon: const Icon(Icons.link_rounded, size: 18),
            label: const Text('Connecter'),
          ),
        ],
      ),
    );
    if (serial != null && serial.isNotEmpty) {
      _connectToMachine(serial);
    }
  }

  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 2), (_) async {
      try {
        final session = await _api.getMySession();
        if (session == null) {
          if (mounted) {
            _pollTimer?.cancel();
            _showSessionEndedDialog(_bottlesThisSession, _pointsThisSession, _totalPoints);
          }
          return;
        }
        if (mounted) {
          setState(() {
            _totalPoints = session['totalPoints'] ?? _totalPoints;
            _bottlesThisSession = session['bottlesThisSession'] ?? _bottlesThisSession;
            _pointsThisSession = session['pointsThisSession'] ?? _pointsThisSession;
          });
        }
      } catch (_) {}
    });
  }

  Future<void> _endSession() async {
    _pollTimer?.cancel();
    try {
      final summary = await _api.endMachineSession();
      if (mounted) {
        _showSessionEndedDialog(
          summary?['bottlesDeposited'] ?? _bottlesThisSession,
          summary?['pointsEarned'] ?? _pointsThisSession,
          summary?['totalPoints'] ?? _totalPoints,
        );
      }
    } catch (e) {
      if (mounted) Navigator.of(context).pop();
    }
  }

  void _showSessionEndedDialog(int bottles, int pointsEarned, int totalPoints) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: PlastiPayTheme.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Session Terminée! 🎉', style: TextStyle(color: PlastiPayTheme.textPrimary, fontWeight: FontWeight.w800)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _summaryTile('🍾 Bouteilles déposées', '$bottles'),
            const SizedBox(height: 12),
            _summaryTile('⭐ Points gagnés', '+$pointsEarned'),
            const SizedBox(height: 12),
            _summaryTile('💰 Total points', '$totalPoints'),
            const SizedBox(height: 8),
            const Text('Merci pour votre contribution! ♻️', style: TextStyle(color: PlastiPayTheme.textMuted, fontSize: 13)),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () { Navigator.of(ctx).pop(); Navigator.of(context).pop(); },
              child: const Text('Retour à l\'accueil'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _summaryTile(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: PlastiPayTheme.bgPrimary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: PlastiPayTheme.textSecondary, fontSize: 14)),
          Text(value, style: const TextStyle(color: PlastiPayTheme.greenPrimary, fontWeight: FontWeight.w800, fontSize: 16)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_sessionActive) return _buildSessionScreen();
    return _buildScannerScreen();
  }

  // ═══════════════════════════════════════════
  // 📷 Scanner / Manual Entry Screen
  // ═══════════════════════════════════════════
  Widget _buildScannerScreen() {
    return Scaffold(
      backgroundColor: PlastiPayTheme.bgPrimary,
      appBar: AppBar(
        title: const Text('Scanner Machine', style: TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('🏭', style: TextStyle(fontSize: 64)),
              const SizedBox(height: 20),
              const Text('Connecter à une Machine', style: TextStyle(color: PlastiPayTheme.textPrimary, fontSize: 22, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              const Text('Scannez le QR code ou entrez le code manuellement', style: TextStyle(color: PlastiPayTheme.textMuted, fontSize: 14), textAlign: TextAlign.center),
              const SizedBox(height: 32),

              // Manual entry button (works on web & mobile)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _connecting ? null : _connectManually,
                  icon: const Icon(Icons.keyboard_rounded, size: 22),
                  label: const Text('Entrer le code machine', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Quick connect buttons for known machines
              const Text('Machines disponibles:', style: TextStyle(color: PlastiPayTheme.textMuted, fontSize: 13)),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: _quickConnectCard('ECO-TN-001', 'Cafétéria')),
                  const SizedBox(width: 12),
                  Expanded(child: _quickConnectCard('ECO-TN-002', 'Bibliothèque')),
                ],
              ),

              if (_connecting) ...[
                const SizedBox(height: 24),
                const CircularProgressIndicator(color: PlastiPayTheme.greenPrimary),
                const SizedBox(height: 12),
                const Text('Connexion à la machine...', style: TextStyle(color: PlastiPayTheme.textSecondary)),
              ],

              if (_error.isNotEmpty) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: PlastiPayTheme.accentRed.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Text('❌', style: TextStyle(fontSize: 18)),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_error, style: const TextStyle(color: PlastiPayTheme.accentRed, fontSize: 13))),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _quickConnectCard(String serial, String name) {
    return InkWell(
      onTap: _connecting ? null : () => _connectToMachine(serial),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: PlastiPayTheme.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: PlastiPayTheme.greenPrimary.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            const Icon(Icons.precision_manufacturing_rounded, color: PlastiPayTheme.greenPrimary, size: 28),
            const SizedBox(height: 8),
            Text(name, style: const TextStyle(color: PlastiPayTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 4),
            Text(serial, style: const TextStyle(color: PlastiPayTheme.textMuted, fontSize: 11, fontFamily: 'monospace')),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════
  // 🔗 Live Session Screen
  // ═══════════════════════════════════════════
  Widget _buildSessionScreen() {
    return Scaffold(
      backgroundColor: PlastiPayTheme.bgPrimary,
      appBar: AppBar(
        title: Text(_machineName, style: const TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
        actions: [
          TextButton.icon(
            onPressed: _endSession,
            icon: const Icon(Icons.stop_circle_outlined, color: PlastiPayTheme.accentRed),
            label: const Text('Terminer', style: TextStyle(color: PlastiPayTheme.accentRed)),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Machine info
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: PlastiPayTheme.greenDark.withOpacity(0.2),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: PlastiPayTheme.greenPrimary.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  const Text('🏭', style: TextStyle(fontSize: 32)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_machineName, style: const TextStyle(color: PlastiPayTheme.textPrimary, fontWeight: FontWeight.w700, fontSize: 16)),
                        Text(_machineLocation, style: const TextStyle(color: PlastiPayTheme.textMuted, fontSize: 13)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: PlastiPayTheme.greenPrimary, borderRadius: BorderRadius.circular(20)),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.circle, color: Colors.white, size: 8),
                        SizedBox(width: 4),
                        Text('Connecté', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Points card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [PlastiPayTheme.greenDark, PlastiPayTheme.greenPrimary],
                  begin: Alignment.topLeft, end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [BoxShadow(color: PlastiPayTheme.greenPrimary.withOpacity(0.3), blurRadius: 24, offset: const Offset(0, 8))],
              ),
              child: Column(
                children: [
                  const Text('💰 Mes Points', style: TextStyle(color: Colors.white70, fontSize: 14)),
                  const SizedBox(height: 8),
                  Text('$_totalPoints', style: const TextStyle(fontSize: 56, fontWeight: FontWeight.w900, color: Colors.white)),
                  const Text('points', style: TextStyle(color: Colors.white70, fontSize: 16, letterSpacing: 2)),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Session stats
            Row(
              children: [
                Expanded(child: _sessionStatCard('🍾', 'Bouteilles', '$_bottlesThisSession', PlastiPayTheme.accentCyan)),
                const SizedBox(width: 14),
                Expanded(child: _sessionStatCard('⭐', 'Points gagnés', '+$_pointsThisSession', PlastiPayTheme.accentOrange)),
              ],
            ),
            const SizedBox(height: 28),

            // Instruction
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: PlastiPayTheme.bgCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.06)),
              ),
              child: Column(
                children: [
                  const Text('♻️', style: TextStyle(fontSize: 40)),
                  const SizedBox(height: 12),
                  const Text('Insérez vos bouteilles', style: TextStyle(color: PlastiPayTheme.textPrimary, fontWeight: FontWeight.w700, fontSize: 18)),
                  const SizedBox(height: 6),
                  Text('Placez vos bouteilles dans la machine une par une. Les points seront ajoutés automatiquement.',
                    style: TextStyle(color: PlastiPayTheme.textMuted, fontSize: 13), textAlign: TextAlign.center),
                  const SizedBox(height: 12),
                  Text('+ 10 pts par bouteille plastique', style: TextStyle(color: PlastiPayTheme.greenPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // End session
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _endSession,
                icon: const Icon(Icons.stop_circle_outlined),
                label: const Text('Terminer la session'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: PlastiPayTheme.accentRed,
                  side: const BorderSide(color: PlastiPayTheme.accentRed),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sessionStatCard(String icon, String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: PlastiPayTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Text(icon, style: const TextStyle(fontSize: 28)),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: color)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 12, color: PlastiPayTheme.textMuted)),
        ],
      ),
    );
  }
}
