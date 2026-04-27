class User {
  final int id;
  final String email;
  final String? phone;
  final String firstName;
  final String lastName;
  final String role;
  final int totalPoints;
  final String? createdAt;
  final String? profilePhoto;

  User({
    required this.id,
    required this.email,
    this.phone,
    required this.firstName,
    required this.lastName,
    required this.role,
    required this.totalPoints,
    this.createdAt,
    this.profilePhoto,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      email: json['email'] ?? '',
      phone: json['phone'],
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',
      role: json['role'] ?? 'user',
      totalPoints: json['totalPoints'] ?? 0,
      createdAt: json['createdAt'],
      profilePhoto: json['profilePhoto'],
    );
  }

  String get fullName => '$firstName $lastName';
  String get initials => '${firstName.isNotEmpty ? firstName[0] : ''}${lastName.isNotEmpty ? lastName[0] : ''}'.toUpperCase();
}

class Transaction {
  final int id;
  final int bottlesCount;
  final String bottleType;
  final int pointsEarned;
  final String createdAt;
  final String? machineName;

  Transaction({
    required this.id,
    required this.bottlesCount,
    required this.bottleType,
    required this.pointsEarned,
    required this.createdAt,
    this.machineName,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'],
      bottlesCount: json['bottlesCount'] ?? 0,
      bottleType: json['bottleType'] ?? 'plastic',
      pointsEarned: json['pointsEarned'] ?? 0,
      createdAt: json['createdAt'] ?? '',
      machineName: json['machine']?['name'],
    );
  }
}

class Reward {
  final int id;
  final String name;
  final String description;
  final int pointsCost;
  final String category;
  final bool isActive;

  Reward({
    required this.id,
    required this.name,
    required this.description,
    required this.pointsCost,
    required this.category,
    required this.isActive,
  });

  factory Reward.fromJson(Map<String, dynamic> json) {
    return Reward(
      id: json['id'],
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      pointsCost: json['pointsCost'] ?? 0,
      category: json['category'] ?? 'gift',
      isActive: json['isActive'] ?? true,
    );
  }
}

class LeaderboardEntry {
  final int rank;
  final String name;
  final int totalPoints;
  final int totalDeposits;
  final String? profilePhoto;

  LeaderboardEntry({
    required this.rank,
    required this.name,
    required this.totalPoints,
    required this.totalDeposits,
    this.profilePhoto,
  });

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json, int rank) {
    return LeaderboardEntry(
      rank: rank,
      name: json['name'] ?? 'Utilisateur',
      totalPoints: json['totalPoints'] ?? 0,
      totalDeposits: json['totalDeposits'] ?? 0,
      profilePhoto: json['profilePhoto'],
    );
  }

  String get initials {
    if (name.isEmpty) return 'U';
    final parts = name.split(' ');
    if (parts.length > 1 && parts[1].isNotEmpty) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name[0].toUpperCase();
  }
}
