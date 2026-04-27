/*
 * ═══════════════════════════════════════════════════════════
 * ♻️ PlastiPay — ESP32-S3 Bottle Collection Machine
 * ═══════════════════════════════════════════════════════════
 * 
 * Hardware:
 *   - ESP32-S3 WROOM-1 N16R8 (dual USB-C)
 *   - LCD I2C 2x16 (blue/white)
 *   - IR Obstacle Sensor KY-032
 * 
 * Flow:
 *   1. Connect to WiFi
 *   2. Poll server for active user session (QR code scan)
 *   3. When user connected: show name + points on LCD
 *   4. Detect bottles via IR sensor
 *   5. Send transaction to server → update points on LCD
 * 
 * Libraries needed (install via Arduino Library Manager):
 *   - LiquidCrystal_I2C (by Frank de Brabander)
 *   - ArduinoJson (by Benoit Blanchon, v7+)
 *   - WiFi (built-in ESP32)
 *   - HTTPClient (built-in ESP32)
 * 
 * Board: ESP32S3 Dev Module
 * ═══════════════════════════════════════════════════════════
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>

// ═══════════════════════════════════════════
// 🔧 CONFIGURATION — MODIFIER ICI
// ═══════════════════════════════════════════

// WiFi
const char* WIFI_SSID     = "Ooredoo-ALHN-8436-5";       // ← Votre nom WiFi
const char* WIFI_PASSWORD = "9sU54xkcQq";    // ← Votre mot de passe WiFi

// Serveur Backend (Render cloud)
const char* SERVER_URL    = "https://plastipay.onrender.com";
const char* MACHINE_API_KEY = "machine_key_001_secret";   // ← Clé API de la machine

// Hardware Pins (ESP32-S3)
#define IR_SENSOR_PIN   4     // KY-032 OUT → GPIO 4
#define SDA_PIN         8     // LCD I2C SDA → GPIO 8
#define SCL_PIN         9     // LCD I2C SCL → GPIO 9

// LCD I2C Address (essayez 0x3F si 0x27 ne fonctionne pas)
#define LCD_ADDRESS     0x27
#define LCD_COLS        16
#define LCD_ROWS        2

// Timing (en millisecondes)
#define POLL_INTERVAL       5000   // Vérifier session toutes les 5 secondes
#define DEBOUNCE_TIME       3000   // Anti-rebond capteur IR (3 sec entre 2 bouteilles)
#define WIFI_RETRY_DELAY    500    // Délai entre tentatives WiFi
#define LCD_MESSAGE_DISPLAY 2000   // Durée affichage message temporaire

// Points par bouteille (doit correspondre au serveur)
#define POINTS_PER_BOTTLE   10

// ═══════════════════════════════════════════
// 📺 LCD Characters personnalisés
// ═══════════════════════════════════════════
byte bottleChar[8] = {
  0b00100,
  0b01110,
  0b01010,
  0b01110,
  0b01110,
  0b01110,
  0b01110,
  0b11111
};

byte checkChar[8] = {
  0b00000,
  0b00001,
  0b00011,
  0b10110,
  0b11100,
  0b01000,
  0b00000,
  0b00000
};

byte heartChar[8] = {
  0b00000,
  0b01010,
  0b11111,
  0b11111,
  0b01110,
  0b00100,
  0b00000,
  0b00000
};

// ═══════════════════════════════════════════
// 🔌 Global Variables
// ═══════════════════════════════════════════
LiquidCrystal_I2C lcd(LCD_ADDRESS, LCD_COLS, LCD_ROWS);

// Session state
bool sessionActive = false;
int  sessionUserId = 0;
String sessionUserName = "";
int  sessionTotalPoints = 0;
int  sessionBottles = 0;
int  sessionPointsEarned = 0;

// IR sensor state
bool lastIRState = HIGH;
bool bottleWaiting = true;  // Must see HIGH first before detecting
unsigned long lastBottleTime = 0;

// Polling timer
unsigned long lastPollTime = 0;

// Animation
int animFrame = 0;
unsigned long lastAnimTime = 0;

// LCD connected flag
bool lcdFound = false;

// ═══════════════════════════════════════════
// 📶 WiFi Connection
// ═══════════════════════════════════════════
void connectWiFi() {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Connexion WiFi..");
    lcd.setCursor(0, 1);
    lcd.print(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(WIFI_RETRY_DELAY);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi OK!");
    Serial.print("   IP: ");
    Serial.println(WiFi.localIP());
    
    if (lcdFound) {
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("WiFi OK!");
      lcd.setCursor(0, 1);
      lcd.print(WiFi.localIP());
      delay(2000);
    }
  } else {
    Serial.println("\nWiFi FAILED! Continuing anyway...");
    Serial.println("Check SSID and password in the code.");
    
    if (lcdFound) {
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("WiFi ERREUR!");
      lcd.setCursor(0, 1);
      lcd.print("Verifiez config");
    }
    delay(3000);
    // Don't restart - continue so we can debug LCD
  }
}

// ═══════════════════════════════════════════
// 🌐 API: Poll for active session
// ═══════════════════════════════════════════
void pollSession() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi déconnecté, reconnexion...");
    connectWiFi();
    return;
  }
  
  WiFiClientSecure client;
  client.setInsecure();  // Skip SSL certificate verification
  HTTPClient http;
  String url = String(SERVER_URL) + "/api/machines/session/active";
  
  http.begin(client, url);
  http.addHeader("x-machine-api-key", MACHINE_API_KEY);
  http.setTimeout(30000);
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error && doc["success"] == true) {
      if (doc["data"]["session"].isNull()) {
        // No active session
        if (sessionActive) {
          Serial.println("🔓 Session terminée (côté serveur)");
          sessionActive = false;
          showIdleScreen();
        }
      } else {
        // Active session found
        int userId = doc["data"]["session"]["userId"];
        const char* firstName = doc["data"]["session"]["firstName"];
        const char* lastName = doc["data"]["session"]["lastName"];
        int totalPoints = doc["data"]["session"]["totalPoints"];
        int bottles = doc["data"]["session"]["bottlesThisSession"];
        
        if (!sessionActive || sessionUserId != userId) {
          // New session started
          sessionActive = true;
          sessionUserId = userId;
          sessionUserName = String(firstName);
          sessionTotalPoints = totalPoints;
          sessionBottles = bottles;
          
          Serial.printf("🔗 Session: %s %s (ID:%d, %d pts)\n", firstName, lastName, userId, totalPoints);
          
          showWelcomeScreen(firstName, totalPoints);
          delay(LCD_MESSAGE_DISPLAY);
        }
        
        // Update points display
        sessionTotalPoints = totalPoints;
        sessionBottles = bottles;
        showSessionScreen();
      }
    }
  } else {
    Serial.printf("❌ HTTP Error: %d\n", httpCode);
  }
  
  http.end();
}

// ═══════════════════════════════════════════
// 🍾 Bottle Detection & Transaction
// ═══════════════════════════════════════════
void handleBottleDetection() {
  if (!sessionActive) return;
  
  bool currentIRState = digitalRead(IR_SENSOR_PIN);
  unsigned long now = millis();
  
  // Sensor returned to HIGH (no obstacle) = ready for next bottle
  if (currentIRState == HIGH) {
    if (!bottleWaiting) {
      bottleWaiting = true;  // Ready for next detection
    }
    lastIRState = currentIRState;
    return;
  }
  
  // Sensor is LOW (obstacle detected)
  // Only count if: 1) we were waiting, 2) enough time passed
  if (currentIRState == LOW && bottleWaiting && (now - lastBottleTime > DEBOUNCE_TIME)) {
    bottleWaiting = false;  // Don't detect again until sensor goes HIGH
    lastBottleTime = now;
    
    Serial.println("Bouteille detectee!");
    
    // Show feedback on LCD
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.write(0); // bottle character
    lcd.print(" Bouteille OK!");
    lcd.setCursor(0, 1);
    lcd.print("Envoi serveur...");
    
    // Send transaction to server
    sendTransaction();
  }
  
  lastIRState = currentIRState;
}

void sendTransaction() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  WiFiClientSecure client;
  client.setInsecure();  // Skip SSL certificate verification
  HTTPClient http;
  String url = String(SERVER_URL) + "/api/transactions";
  
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-machine-api-key", MACHINE_API_KEY);
  http.setTimeout(30000);
  
  // Build JSON body
  JsonDocument doc;
  doc["userId"] = sessionUserId;
  doc["bottlesCount"] = 1;
  doc["bottleType"] = "plastic";
  
  String body;
  serializeJson(doc, body);
  
  Serial.printf("📤 POST %s\n", url.c_str());
  Serial.printf("   Body: %s\n", body.c_str());
  
  int httpCode = http.POST(body);
  
  if (httpCode == 201) {
    String payload = http.getString();
    
    JsonDocument response;
    DeserializationError error = deserializeJson(response, payload);
    
    if (!error && response["success"] == true) {
      int newTotalPoints = response["data"]["user"]["totalPoints"];
      int pointsEarned = response["data"]["transaction"]["pointsEarned"];
      
      sessionTotalPoints = newTotalPoints;
      sessionBottles++;
      sessionPointsEarned += pointsEarned;
      
      Serial.printf("✅ +%d pts → Total: %d pts\n", pointsEarned, newTotalPoints);
      
      // Show success on LCD
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.write(1); // check mark
      lcd.print(" +");
      lcd.print(pointsEarned);
      lcd.print(" points!");
      lcd.setCursor(0, 1);
      lcd.print("Total: ");
      lcd.print(newTotalPoints);
      lcd.print(" pts");
      
      delay(LCD_MESSAGE_DISPLAY);
      showSessionScreen();
    } else {
      Serial.println("❌ Réponse invalide du serveur");
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Erreur serveur!");
      delay(1500);
      showSessionScreen();
    }
  } else {
    Serial.printf("❌ Erreur HTTP: %d\n", httpCode);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Erreur reseau!");
    lcd.setCursor(0, 1);
    lcd.print("Code: ");
    lcd.print(httpCode);
    delay(1500);
    showSessionScreen();
  }
  
  http.end();
}

// ═══════════════════════════════════════════
// 📺 LCD Display Functions
// ═══════════════════════════════════════════
void showIdleScreen() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.write(2); // heart
  lcd.print(" PlastiPay");
  lcd.setCursor(0, 1);
  lcd.print("Scannez QR Code");
}

void showWelcomeScreen(const char* name, int points) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Bonjour ");
  
  // Truncate name if too long
  String nameStr = String(name);
  if (nameStr.length() > 7) {
    nameStr = nameStr.substring(0, 7);
  }
  lcd.print(nameStr);
  lcd.print("!");
  
  lcd.setCursor(0, 1);
  lcd.write(1); // check
  lcd.print(" Connecte!");
}

void showSessionScreen() {
  lcd.clear();
  
  // Line 1: User name + bottles count
  lcd.setCursor(0, 0);
  String nameStr = sessionUserName;
  if (nameStr.length() > 10) {
    nameStr = nameStr.substring(0, 10);
  }
  lcd.print(nameStr);
  
  // Show bottle count on right side of line 1
  String bottleStr = " " + String(sessionBottles);
  bottleStr += "x";
  lcd.setCursor(LCD_COLS - bottleStr.length(), 0);
  lcd.print(bottleStr);
  lcd.write(0);  // bottle icon (but won't fit, so skip if needed)
  
  // Line 2: Points
  lcd.setCursor(0, 1);
  lcd.print("Pts: ");
  lcd.print(sessionTotalPoints);
  
  // Animated recycling indicator on right
  lcd.setCursor(15, 1);
  animFrame = (animFrame + 1) % 4;
  const char animChars[] = {'|', '/', '-', '\\'};
  lcd.print(animChars[animFrame]);
}

void showStartupScreen() {
  lcd.clear();
  lcd.setCursor(1, 0);
  lcd.write(2); // heart
  lcd.print(" PlastiPay ");
  lcd.write(2);
  lcd.setCursor(0, 1);
  lcd.print("  Demarrage...  ");
  delay(1500);
}

// ═══════════════════════════════════════════
// 🔍 Scan I2C bus to find LCD
// ═══════════════════════════════════════════
bool scanI2C() {
  Serial.println("🔍 Scanning I2C bus...");
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    byte error = Wire.endTransmission();
    if (error == 0) {
      Serial.printf("   Found device at 0x%02X\n", addr);
      if (addr == 0x27 || addr == 0x3F) {
        Serial.printf("   ✅ LCD found at 0x%02X!\n", addr);
        return true;
      }
    }
  }
  Serial.println("   ⚠️ No LCD found on I2C bus");
  return false;
}

// ═══════════════════════════════════════════
// 🚀 SETUP
// ═══════════════════════════════════════════
void setup() {
  // Serial monitor - wait longer for ESP32-S3 USB CDC
  Serial.begin(115200);
  delay(3000);  // Wait for USB CDC to be ready
  
  Serial.println();
  Serial.println("=======================================");
  Serial.println("  PlastiPay ESP32-S3 Machine");
  Serial.println("  Plastic Pays, Planet Wins!");
  Serial.println("=======================================");
  
  // Initialize I2C with custom pins for ESP32-S3
  Wire.begin(SDA_PIN, SCL_PIN);
  delay(100);
  
  // Check if LCD is connected
  lcdFound = scanI2C();
  
  if (lcdFound) {
    lcd.init();
    lcd.backlight();
    
    // Create custom characters
    lcd.createChar(0, bottleChar);
    lcd.createChar(1, checkChar);
    lcd.createChar(2, heartChar);
    
    showStartupScreen();
    Serial.println("LCD: OK");
  } else {
    Serial.println("LCD: Not connected (continuing without LCD)");
  }
  
  // IR Sensor pin
  pinMode(IR_SENSOR_PIN, INPUT);
  lastIRState = digitalRead(IR_SENSOR_PIN);
  
  Serial.printf("IR Sensor: GPIO %d\n", IR_SENSOR_PIN);
  Serial.printf("LCD I2C: SDA=%d, SCL=%d (addr: 0x%02X)\n", SDA_PIN, SCL_PIN, LCD_ADDRESS);
  
  // Connect to WiFi
  connectWiFi();
  
  // Show idle screen
  if (lcdFound) showIdleScreen();
  
  Serial.println("Machine ready! Waiting for session...");
  Serial.println();
}

// ═══════════════════════════════════════════
// 🔄 MAIN LOOP
// ═══════════════════════════════════════════
void loop() {
  unsigned long now = millis();
  
  // Poll server for session status
  if (now - lastPollTime > POLL_INTERVAL) {
    lastPollTime = now;
    pollSession();
  }
  
  // Check IR sensor for bottle detection
  handleBottleDetection();
  
  // Small delay to prevent CPU overload
  delay(50);
}
