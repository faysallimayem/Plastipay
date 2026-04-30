import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import 'home_screen.dart';
import 'scan_screen.dart';

class LoginScreen extends StatefulWidget {
  /// If set, after login the user is redirected directly to the machine session
  final String? machineSerial;

  const LoginScreen({super.key, this.machineSerial});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _regEmailController = TextEditingController();
  final _regPasswordController = TextEditingController();
  
  bool _isLogin = true;
  bool _isLoading = false;
  String _error = '';
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    _regEmailController.dispose();
    _regPasswordController.dispose();
    super.dispose();
  }

  /// Navigate after successful auth: either to machine session or home
  void _navigateAfterAuth() {
    if (!mounted) return;
    if (widget.machineSerial != null && widget.machineSerial!.isNotEmpty) {
      // QR code flow: go directly to the machine session
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => ScanScreen(autoConnectSerial: widget.machineSerial),
        ),
      );
    } else {
      // Normal flow: go to home
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const HomeScreen()));
    }
  }

  Future<void> _handleLogin() async {
    setState(() { _isLoading = true; _error = ''; });
    try {
      await ApiService().login(_emailController.text.trim(), _passwordController.text);
      _navigateAfterAuth();
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleRegister() async {
    setState(() { _isLoading = true; _error = ''; });
    try {
      await ApiService().register(
        _firstNameController.text.trim(),
        _lastNameController.text.trim(),
        _regEmailController.text.trim(),
        _phoneController.text.trim(),
        _regPasswordController.text,
      );
      _navigateAfterAuth();
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          color: PlastiPayTheme.bgPrimary,
          gradient: RadialGradient(
            center: Alignment.topLeft,
            radius: 1.5,
            colors: [
              PlastiPayTheme.greenPrimary.withOpacity(0.08),
              PlastiPayTheme.bgPrimary,
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo
                  const Text('♻️', style: TextStyle(fontSize: 56)),
                  const SizedBox(height: 12),
                  RichText(
                    text: TextSpan(
                      style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800),
                      children: [
                        const TextSpan(text: 'Plasti', style: TextStyle(color: PlastiPayTheme.textPrimary)),
                        TextSpan(text: 'Pay', style: TextStyle(
                          foreground: Paint()..shader = const LinearGradient(
                            colors: [PlastiPayTheme.greenPrimary, PlastiPayTheme.greenLight],
                          ).createShader(const Rect.fromLTWH(0, 0, 100, 40)),
                        )),
                      ],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text('Plastic Pays, Planet Wins', style: TextStyle(color: PlastiPayTheme.textSecondary, fontSize: 14)),

                  // Show machine badge when coming from QR scan
                  if (widget.machineSerial != null) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: PlastiPayTheme.greenPrimary.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: PlastiPayTheme.greenPrimary.withOpacity(0.3)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.qr_code_rounded, color: PlastiPayTheme.greenPrimary, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'Machine ${widget.machineSerial}',
                            style: const TextStyle(color: PlastiPayTheme.greenPrimary, fontWeight: FontWeight.w600, fontSize: 14),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Connectez-vous pour démarrer la session',
                      style: TextStyle(color: PlastiPayTheme.textMuted, fontSize: 12),
                    ),
                  ],

                  const SizedBox(height: 40),

                  // Toggle Login/Register
                  Container(
                    decoration: BoxDecoration(
                      color: PlastiPayTheme.bgCard,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withOpacity(0.06)),
                    ),
                    child: Row(
                      children: [
                        Expanded(child: _tabButton('Connexion', _isLogin, () { setState(() { _isLogin = true; _error = ''; }); })),
                        Expanded(child: _tabButton('Inscription', !_isLogin, () { setState(() { _isLogin = false; _error = ''; }); })),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Form
                  if (_isLogin) ..._loginForm() else ..._registerForm(),
                  
                  if (_error.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(_error, style: const TextStyle(color: PlastiPayTheme.accentRed, fontSize: 13), textAlign: TextAlign.center),
                  ],
                  const SizedBox(height: 20),

                  // Submit Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : (_isLogin ? _handleLogin : _handleRegister),
                      child: _isLoading
                        ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text(_isLogin ? 'Se connecter' : "S'inscrire"),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _loginForm() {
    return [
      TextField(
        controller: _emailController,
        decoration: const InputDecoration(hintText: 'Email', prefixIcon: Icon(Icons.email_outlined, color: PlastiPayTheme.textMuted)),
        keyboardType: TextInputType.emailAddress,
        style: const TextStyle(color: PlastiPayTheme.textPrimary),
      ),
      const SizedBox(height: 14),
      TextField(
        controller: _passwordController,
        obscureText: _obscurePassword,
        decoration: InputDecoration(
          hintText: 'Mot de passe',
          prefixIcon: const Icon(Icons.lock_outline, color: PlastiPayTheme.textMuted),
          suffixIcon: IconButton(
            icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility, color: PlastiPayTheme.textMuted),
            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
          ),
        ),
        style: const TextStyle(color: PlastiPayTheme.textPrimary),
      ),
    ];
  }

  List<Widget> _registerForm() {
    return [
      Row(children: [
        Expanded(child: TextField(controller: _firstNameController, decoration: const InputDecoration(hintText: 'Prénom'), style: const TextStyle(color: PlastiPayTheme.textPrimary))),
        const SizedBox(width: 12),
        Expanded(child: TextField(controller: _lastNameController, decoration: const InputDecoration(hintText: 'Nom'), style: const TextStyle(color: PlastiPayTheme.textPrimary))),
      ]),
      const SizedBox(height: 14),
      TextField(controller: _regEmailController, decoration: const InputDecoration(hintText: 'Email', prefixIcon: Icon(Icons.email_outlined, color: PlastiPayTheme.textMuted)), keyboardType: TextInputType.emailAddress, style: const TextStyle(color: PlastiPayTheme.textPrimary)),
      const SizedBox(height: 14),
      TextField(controller: _phoneController, decoration: const InputDecoration(hintText: 'Téléphone (+216...)', prefixIcon: Icon(Icons.phone_outlined, color: PlastiPayTheme.textMuted)), keyboardType: TextInputType.phone, style: const TextStyle(color: PlastiPayTheme.textPrimary)),
      const SizedBox(height: 14),
      TextField(
        controller: _regPasswordController, obscureText: _obscurePassword,
        decoration: InputDecoration(hintText: 'Mot de passe (min 6 caractères)', prefixIcon: const Icon(Icons.lock_outline, color: PlastiPayTheme.textMuted),
          suffixIcon: IconButton(icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility, color: PlastiPayTheme.textMuted), onPressed: () => setState(() => _obscurePassword = !_obscurePassword)),
        ),
        style: const TextStyle(color: PlastiPayTheme.textPrimary),
      ),
    ];
  }

  Widget _tabButton(String text, bool active, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: active ? PlastiPayTheme.greenPrimary : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(text, textAlign: TextAlign.center, style: TextStyle(
          color: active ? Colors.white : PlastiPayTheme.textMuted,
          fontWeight: FontWeight.w600, fontSize: 14,
        )),
      ),
    );
  }
}
