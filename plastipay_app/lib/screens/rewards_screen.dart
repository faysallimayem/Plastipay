import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import '../models/models.dart';

class RewardsScreen extends StatefulWidget {
  const RewardsScreen({super.key});

  @override
  State<RewardsScreen> createState() => _RewardsScreenState();
}

class _RewardsScreenState extends State<RewardsScreen> {
  final _api = ApiService();
  List<Reward> _rewards = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final list = await _api.getRewards();
      if (mounted) setState(() { _rewards = list; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _redeem(Reward r) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: PlastiPayTheme.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Échanger "${r.name}" ?', style: const TextStyle(color: PlastiPayTheme.textPrimary)),
        content: Text('Cela coûtera ${r.pointsCost} points.', style: const TextStyle(color: PlastiPayTheme.textSecondary)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Confirmer')),
        ],
      ),
    );
    if (confirm != true) return;

    try {
      final res = await _api.redeemReward(r.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(res['message'] ?? 'Récompense échangée ! 🎉'), backgroundColor: PlastiPayTheme.greenDark),
        );
        _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceAll('Exception: ', '')), backgroundColor: PlastiPayTheme.accentRed),
        );
      }
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
              child: Text('🎁 Récompenses', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: PlastiPayTheme.textPrimary)),
            ),
          ),
          Expanded(
            child: _loading
              ? const Center(child: CircularProgressIndicator(color: PlastiPayTheme.greenPrimary))
              : RefreshIndicator(
                  color: PlastiPayTheme.greenPrimary,
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    itemCount: _rewards.length,
                    itemBuilder: (ctx, i) => _rewardCard(_rewards[i]),
                  ),
                ),
          ),
        ],
      ),
    );
  }

  Widget _rewardCard(Reward r) {
    final catIcons = {'coffee': '☕', 'discount': '💸', 'gift': '🎉'};
    final catColors = {'coffee': PlastiPayTheme.accentOrange, 'discount': PlastiPayTheme.accentCyan, 'gift': PlastiPayTheme.accentPurple};
    final icon = catIcons[r.category] ?? '🎁';
    final color = catColors[r.category] ?? PlastiPayTheme.greenPrimary;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: PlastiPayTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.15)),
      ),
      child: Row(
        children: [
          Container(
            width: 50, height: 50,
            decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(14)),
            child: Center(child: Text(icon, style: const TextStyle(fontSize: 26))),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(r.name, style: const TextStyle(fontWeight: FontWeight.w600, color: PlastiPayTheme.textPrimary, fontSize: 15)),
                const SizedBox(height: 2),
                Text(r.description, style: const TextStyle(color: PlastiPayTheme.textMuted, fontSize: 12), maxLines: 2),
                const SizedBox(height: 6),
                Text('${r.pointsCost} pts', style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 14)),
              ],
            ),
          ),
          const SizedBox(width: 10),
          GestureDetector(
            onTap: () => _redeem(r),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: [color.withOpacity(0.8), color]),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Text('Échanger', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 12)),
            ),
          ),
        ],
      ),
    );
  }
}
