import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import 'login_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = ApiService().currentUser;

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            const SizedBox(height: 20),
            // Avatar
            CircleAvatar(
              radius: 48,
              backgroundColor: PlastiPayTheme.greenDark,
              child: Text(user?.initials ?? 'U', style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: Colors.white)),
            ),
            const SizedBox(height: 16),
            Text(user?.fullName ?? 'Utilisateur', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: PlastiPayTheme.textPrimary)),
            const SizedBox(height: 4),
            Text(user?.email ?? '', style: const TextStyle(color: PlastiPayTheme.textMuted, fontSize: 14)),
            const SizedBox(height: 32),

            // Info Cards
            _infoTile(Icons.email_outlined, 'Email', user?.email ?? '—'),
            _infoTile(Icons.phone_outlined, 'Téléphone', user?.phone ?? '—'),
            _infoTile(Icons.star_rounded, 'Points', '${user?.totalPoints ?? 0} pts'),
            _infoTile(Icons.shield_rounded, 'Rôle', user?.role ?? 'user'),

            const SizedBox(height: 32),

            // Logout Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  ApiService().logout();
                  Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(builder: (_) => const LoginScreen()),
                    (route) => false,
                  );
                },
                icon: const Icon(Icons.logout_rounded),
                label: const Text('Se déconnecter'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: PlastiPayTheme.accentRed,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoTile(IconData icon, String label, String value) {
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
          Icon(icon, color: PlastiPayTheme.greenPrimary, size: 22),
          const SizedBox(width: 14),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: PlastiPayTheme.textMuted, fontSize: 12)),
              Text(value, style: const TextStyle(color: PlastiPayTheme.textPrimary, fontWeight: FontWeight.w500, fontSize: 15)),
            ],
          ),
        ],
      ),
    );
  }
}
