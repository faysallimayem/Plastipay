import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import '../models/models.dart';

class ApiService {
  // When deployed, web uses relative URL (same server). For local dev, use localhost.
  static String get baseUrl {
    if (kIsWeb) {
      // Check if we're on localhost (dev) or deployed
      final uri = Uri.base;
      if (uri.host == 'localhost' || uri.host == '127.0.0.1') {
        return 'http://localhost:3000/api';
      }
      // Deployed: use same origin
      return '${uri.scheme}://${uri.host}${uri.hasPort ? ':${uri.port}' : ''}/api';
    }
    return 'http://10.0.2.2:3000/api'; // Android emulator
  }
  
  String? _token;
  User? _currentUser;

  // Singleton
  static final ApiService _instance = ApiService._();
  factory ApiService() => _instance;
  ApiService._();

  User? get currentUser => _currentUser;
  bool get isLoggedIn => _token != null && _currentUser != null;

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_token != null) 'Authorization': 'Bearer $_token',
  };

  // ═══════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════
  Future<User> login(String email, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    final data = jsonDecode(res.body);
    if (data['success'] != true) throw Exception(data['message'] ?? 'Erreur de connexion');
    
    _token = data['data']['token'];
    _currentUser = User.fromJson(data['data']['user']);
    return _currentUser!;
  }

  Future<User> register(String firstName, String lastName, String email, String phone, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'firstName': firstName, 'lastName': lastName,
        'email': email, 'phone': phone, 'password': password,
      }),
    );
    final data = jsonDecode(res.body);
    if (data['success'] != true) throw Exception(data['message'] ?? 'Erreur d\'inscription');
    
    _token = data['data']['token'];
    _currentUser = User.fromJson(data['data']['user']);
    return _currentUser!;
  }

  Future<User> getProfile() async {
    final res = await http.get(Uri.parse('$baseUrl/auth/profile'), headers: _headers);
    final data = jsonDecode(res.body);
    if (data['success'] != true) throw Exception('Session expirée');
    _currentUser = User.fromJson(data['data']['user']);
    return _currentUser!;
  }

  void logout() {
    _token = null;
    _currentUser = null;
  }

  // ═══════════════════════════════════════════
  // POINTS
  // ═══════════════════════════════════════════
  Future<Map<String, dynamic>> getBalance() async {
    final res = await http.get(Uri.parse('$baseUrl/points/balance'), headers: _headers);
    final data = jsonDecode(res.body);
    if (data['success'] != true) throw Exception('Erreur');
    return data['data'];
  }

  Future<List<LeaderboardEntry>> getLeaderboard() async {
    final res = await http.get(Uri.parse('$baseUrl/points/leaderboard'), headers: _headers);
    final data = jsonDecode(res.body);
    if (data['success'] != true) throw Exception('Erreur');
    final list = data['data']['leaderboard'] as List;
    return list.asMap().entries.map((e) => LeaderboardEntry.fromJson(e.value, e.key + 1)).toList();
  }

  // ═══════════════════════════════════════════
  // TRANSACTIONS
  // ═══════════════════════════════════════════
  Future<List<Transaction>> getTransactions() async {
    final res = await http.get(Uri.parse('$baseUrl/transactions'), headers: _headers);
    final data = jsonDecode(res.body);
    if (data['success'] != true) throw Exception('Erreur');
    final list = data['data']['transactions'] as List;
    return list.map((t) => Transaction.fromJson(t)).toList();
  }

  // ═══════════════════════════════════════════
  // REWARDS
  // ═══════════════════════════════════════════
  Future<List<Reward>> getRewards() async {
    final res = await http.get(Uri.parse('$baseUrl/rewards'), headers: _headers);
    final data = jsonDecode(res.body);
    if (data['success'] != true) throw Exception('Erreur');
    final list = data['data']['rewards'] as List;
    return list.map((r) => Reward.fromJson(r)).toList();
  }

  Future<Map<String, dynamic>> redeemReward(int rewardId) async {
    final res = await http.post(
      Uri.parse('$baseUrl/rewards/redeem'),
      headers: _headers,
      body: jsonEncode({'rewardId': rewardId}),
    );
    final data = jsonDecode(res.body);
    if (data['success'] != true) throw Exception(data['message'] ?? 'Erreur');
    return data;
  }

  Future<List<dynamic>> getRedemptionHistory() async {
    final res = await http.get(Uri.parse('$baseUrl/rewards/history'), headers: _headers);
    final data = jsonDecode(res.body);
    if (data['success'] != true) throw Exception('Erreur');
    return data['data']['redemptions'] as List;
  }

  // ═══════════════════════════════════════════
  // MACHINE SESSION (QR Code → Machine)
  // ═══════════════════════════════════════════
  Future<Map<String, dynamic>> startMachineSession(String serialNumber) async {
    final res = await http.post(
      Uri.parse('$baseUrl/machines/session'),
      headers: _headers,
      body: jsonEncode({'serialNumber': serialNumber}),
    );
    final data = jsonDecode(res.body);
    if (data['success'] != true) throw Exception(data['message'] ?? 'Erreur de connexion machine');
    return data['data']['session'];
  }

  Future<Map<String, dynamic>?> getMySession() async {
    final res = await http.get(Uri.parse('$baseUrl/machines/session/me'), headers: _headers);
    final data = jsonDecode(res.body);
    if (data['success'] != true) throw Exception('Erreur');
    return data['data']['session'];
  }

  Future<Map<String, dynamic>?> endMachineSession() async {
    final res = await http.delete(Uri.parse('$baseUrl/machines/session'), headers: _headers);
    final data = jsonDecode(res.body);
    if (data['success'] != true) throw Exception(data['message'] ?? 'Erreur');
    return data['data']['summary'];
  }
}
