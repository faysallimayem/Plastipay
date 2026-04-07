import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import '../models/models.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  final _api = ApiService();
  List<Transaction> _transactions = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final list = await _api.getTransactions();
      if (mounted) setState(() { _transactions = list; _loading = false; });
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
              child: Text('📋 Historique', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: PlastiPayTheme.textPrimary)),
            ),
          ),
          Expanded(
            child: _loading
              ? const Center(child: CircularProgressIndicator(color: PlastiPayTheme.greenPrimary))
              : _transactions.isEmpty
                ? const Center(child: Text('Aucun dépôt pour le moment', style: TextStyle(color: PlastiPayTheme.textMuted)))
                : RefreshIndicator(
                    color: PlastiPayTheme.greenPrimary,
                    onRefresh: _load,
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      itemCount: _transactions.length,
                      itemBuilder: (ctx, i) => _transactionCard(_transactions[i]),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _transactionCard(Transaction t) {
    final isPlastic = t.bottleType == 'plastic';
    final color = isPlastic ? PlastiPayTheme.bluePrimary : PlastiPayTheme.accentPurple;
    final icon = isPlastic ? '🥤' : '🍶';
    final date = DateTime.tryParse(t.createdAt);
    final dateStr = date != null ? '${date.day}/${date.month}/${date.year}' : '';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: PlastiPayTheme.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Row(
        children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(12)),
            child: Center(child: Text(icon, style: const TextStyle(fontSize: 22))),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${t.bottlesCount} ${t.bottleType}', style: const TextStyle(fontWeight: FontWeight.w600, color: PlastiPayTheme.textPrimary, fontSize: 15)),
                const SizedBox(height: 2),
                Text(t.machineName ?? 'Machine', style: const TextStyle(color: PlastiPayTheme.textMuted, fontSize: 12)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('+${t.pointsEarned}', style: const TextStyle(color: PlastiPayTheme.greenPrimary, fontWeight: FontWeight.w700, fontSize: 16)),
              Text(dateStr, style: const TextStyle(color: PlastiPayTheme.textMuted, fontSize: 11)),
            ],
          ),
        ],
      ),
    );
  }
}
