import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import 'login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _api = ApiService();
  bool _uploading = false;

  Future<void> _pickAndUploadPhoto() async {
    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(source: ImageSource.gallery);
      
      if (pickedFile != null) {
        final bytes = await pickedFile.readAsBytes();
        await _handleUpload(bytes, pickedFile.name);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: PlastiPayTheme.accentRed),
        );
      }
    }
  }

  Future<void> _handleUpload(List<int> bytes, String filename) async {
    setState(() => _uploading = true);
    try {
      await _api.uploadProfilePhoto(bytes, filename);
      if (mounted) {
        setState(() => _uploading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Photo de profil mise à jour ! 📸'),
            backgroundColor: PlastiPayTheme.greenDark,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _uploading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: PlastiPayTheme.accentRed),
        );
      }
    }
  }

  Widget _buildAvatar() {
    final user = _api.currentUser;
    final photoUrl = user?.profilePhoto;

    return Stack(
      children: [
        CircleAvatar(
          radius: 52,
          backgroundColor: PlastiPayTheme.greenDark,
          backgroundImage: (photoUrl != null && photoUrl.isNotEmpty)
              ? NetworkImage(_api.getPhotoUrl(photoUrl))
              : null,
          child: (photoUrl == null || photoUrl.isEmpty)
              ? Text(
                  user?.initials ?? 'U',
                  style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w800, color: Colors.white),
                )
              : null,
        ),
        Positioned(
          bottom: 0,
          right: 0,
          child: GestureDetector(
            onTap: _uploading ? null : _pickAndUploadPhoto,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: PlastiPayTheme.greenPrimary,
                shape: BoxShape.circle,
                border: Border.all(color: PlastiPayTheme.bgPrimary, width: 3),
                boxShadow: [
                  BoxShadow(
                    color: PlastiPayTheme.greenPrimary.withOpacity(0.4),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: _uploading
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Icon(Icons.camera_alt_rounded, size: 16, color: Colors.white),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = _api.currentUser;

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            const SizedBox(height: 20),
            // Avatar with upload button
            _buildAvatar(),
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
