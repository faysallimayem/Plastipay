import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import '../screens/history_screen.dart';
import '../screens/rewards_screen.dart';
import '../screens/leaderboard_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/scan_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final _pages = const [
    _HomePage(),
    HistoryScreen(),
    RewardsScreen(),
    LeaderboardScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _pages[_currentIndex],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: Colors.white.withOpacity(0.06))),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (i) => setState(() => _currentIndex = i),
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.home_rounded), label: 'Accueil'),
            BottomNavigationBarItem(icon: Icon(Icons.receipt_long_rounded), label: 'Historique'),
            BottomNavigationBarItem(icon: Icon(Icons.card_giftcard_rounded), label: 'Récompenses'),
            BottomNavigationBarItem(icon: Icon(Icons.leaderboard_rounded), label: 'Classement'),
            BottomNavigationBarItem(icon: Icon(Icons.person_rounded), label: 'Profil'),
          ],
        ),
      ),
    );
  }
}

class _HomePage extends StatefulWidget {
  const _HomePage();

  @override
  State<_HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<_HomePage> {
  final _api = ApiService();
  bool _loading = true;
  int _points = 0;
  int _totalBottles = 0;
  int _totalTransactions = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final data = await _api.getBalance();
      if (mounted) {
        setState(() {
          _points = data['balance'] ?? 0;
          _totalBottles = data['stats']?['totalBottlesRecycled'] ?? 0;
          _totalTransactions = data['stats']?['totalDeposits'] ?? 0;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = _api.currentUser;
    return SafeArea(
      child: RefreshIndicator(
        color: PlastiPayTheme.greenPrimary,
        onRefresh: _loadData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: PlastiPayTheme.greenDark,
                    child: Text(user?.initials ?? 'U', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Bonjour, ${user?.firstName ?? 'Utilisateur'} 👋', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: PlastiPayTheme.textPrimary)),
                        const Text('Bienvenue sur PlastiPay', style: TextStyle(color: PlastiPayTheme.textMuted, fontSize: 13)),
                      ],
                    ),
                  ),
                  const Text('♻️', style: TextStyle(fontSize: 28)),
                ],
              ),
              const SizedBox(height: 28),

              // Points Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [PlastiPayTheme.greenDark, PlastiPayTheme.greenPrimary],
                    begin: Alignment.topLeft, end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [BoxShadow(color: PlastiPayTheme.greenPrimary.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 8))],
                ),
                child: Column(
                  children: [
                    const Text('💰 Mon Solde', style: TextStyle(color: Colors.white70, fontSize: 14)),
                    const SizedBox(height: 8),
                    _loading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : Text('$_points', style: const TextStyle(fontSize: 48, fontWeight: FontWeight.w800, color: Colors.white)),
                    const Text('points', style: TextStyle(color: Colors.white70, fontSize: 16, letterSpacing: 1)),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Stats Row
              Row(
                children: [
                  Expanded(child: _statCard('🍾', 'Bouteilles', '$_totalBottles', PlastiPayTheme.accentCyan)),
                  const SizedBox(width: 14),
                  Expanded(child: _statCard('📋', 'Dépôts', '$_totalTransactions', PlastiPayTheme.bluePrimary)),
                  const SizedBox(width: 14),
                  Expanded(child: _statCard('🌍', 'CO₂ évité', '${(_totalBottles * 0.025).toStringAsFixed(1)}kg', PlastiPayTheme.greenPrimary)),
                ],
              ),
              const SizedBox(height: 28),

              // Scan Machine Button (prominent)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    await Navigator.push(context, MaterialPageRoute(builder: (_) => const ScanScreen()));
                    if (mounted) _loadData();
                  },
                  icon: const Icon(Icons.qr_code_scanner_rounded, size: 24),
                  label: const Text('Scanner une Machine', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Quick Actions
              const Text('Actions rapides', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: PlastiPayTheme.textPrimary)),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(child: _actionCard(Icons.history_rounded, 'Historique', PlastiPayTheme.bluePrimary, () {
                    // Navigate to history tab
                    (context.findAncestorStateOfType<_HomeScreenState>())?.setState(() => (context.findAncestorStateOfType<_HomeScreenState>())?._currentIndex = 1);
                  })),
                  const SizedBox(width: 14),
                  Expanded(child: _actionCard(Icons.card_giftcard_rounded, 'Récompenses', PlastiPayTheme.accentOrange, () {
                    (context.findAncestorStateOfType<_HomeScreenState>())?.setState(() => (context.findAncestorStateOfType<_HomeScreenState>())?._currentIndex = 2);
                  })),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statCard(String icon, String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: PlastiPayTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Column(
        children: [
          Text(icon, style: const TextStyle(fontSize: 24)),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 11, color: PlastiPayTheme.textMuted)),
        ],
      ),
    );
  }

  Widget _actionCard(IconData icon, String label, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: PlastiPayTheme.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 8),
            Text(label, style: TextStyle(fontWeight: FontWeight.w600, color: color, fontSize: 13)),
          ],
        ),
      ),
    );
  }
}
