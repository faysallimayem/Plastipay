import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import '../models/models.dart';

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  final _api = ApiService();
  List<LeaderboardEntry> _entries = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final list = await _api.getLeaderboard();
      if (mounted) setState(() { _entries = list; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          const Padding(
            padding: EdgeInsets.all(20),
            child: Align(alignment: Alignment.centerLeft,
              child: Text('🏆 Classement', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: PlastiPayTheme.textPrimary)),
            ),
          ),
          Expanded(
            child: _loading
              ? const Center(child: CircularProgressIndicator(color: PlastiPayTheme.greenPrimary))
              : _entries.isEmpty
                ? const Center(child: Text('Aucun classement', style: TextStyle(color: PlastiPayTheme.textMuted)))
                : RefreshIndicator(
                    color: PlastiPayTheme.greenPrimary,
                    onRefresh: _load,
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      itemCount: _entries.length,
                      itemBuilder: (ctx, i) => _leaderboardCard(_entries[i]),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _leaderboardCard(LeaderboardEntry e) {
    final rankColors = {1: const Color(0xFFFBBF24), 2: const Color(0xFFCBD5E1), 3: const Color(0xFFD4A76A)};
    final rankColor = rankColors[e.rank] ?? PlastiPayTheme.textMuted;
    final isTop3 = e.rank <= 3;
    final medals = {1: '🥇', 2: '🥈', 3: '🥉'};

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: PlastiPayTheme.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isTop3 ? rankColor.withOpacity(0.3) : Colors.white.withOpacity(0.06)),
      ),
      child: Row(
        children: [
          // Rank
          SizedBox(
            width: 40,
            child: isTop3
              ? Text(medals[e.rank]!, style: const TextStyle(fontSize: 24))
              : CircleAvatar(
                  radius: 16, backgroundColor: PlastiPayTheme.bgInput,
                  child: Text('${e.rank}', style: const TextStyle(color: PlastiPayTheme.textSecondary, fontWeight: FontWeight.w700, fontSize: 14)),
                ),
          ),
          const SizedBox(width: 12),
          // Avatar
          CircleAvatar(
            radius: 20,
            backgroundColor: isTop3 ? rankColor.withOpacity(0.2) : PlastiPayTheme.bluePrimary.withOpacity(0.2),
            child: (e.profilePhoto != null && e.profilePhoto!.isNotEmpty)
                ? ClipOval(
                    child: Image.network(
                      _api.getPhotoUrl(e.profilePhoto!),
                      width: 40,
                      height: 40,
                      fit: BoxFit.cover,
                      errorBuilder: (ctx, err, stack) => Text(e.initials, style: TextStyle(color: isTop3 ? rankColor : PlastiPayTheme.bluePrimary, fontWeight: FontWeight.w700, fontSize: 13)),
                    ),
                  )
                : Text(e.initials, style: TextStyle(color: isTop3 ? rankColor : PlastiPayTheme.bluePrimary, fontWeight: FontWeight.w700, fontSize: 13)),
          ),
          const SizedBox(width: 12),
          // Name
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(e.name, style: const TextStyle(fontWeight: FontWeight.w600, color: PlastiPayTheme.textPrimary, fontSize: 14)),
                Text('${e.totalDeposits} dépôts', style: const TextStyle(color: PlastiPayTheme.textMuted, fontSize: 12)),
              ],
            ),
          ),
          // Points
          Text('${e.totalPoints} pts', style: TextStyle(color: PlastiPayTheme.greenPrimary, fontWeight: FontWeight.w700, fontSize: isTop3 ? 16 : 14)),
        ],
      ),
    );
  }
}
