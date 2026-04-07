// Minimal test sketch - just blinks LED and prints to serial
void setup() {
  Serial.begin(115200);
  delay(3000);
  Serial.println("ESP32-S3 is alive!");
  Serial.println("Boot successful!");
  pinMode(2, OUTPUT);  // Built-in LED (may vary)
}

void loop() {
  Serial.println("Running...");
  digitalWrite(2, HIGH);
  delay(1000);
  digitalWrite(2, LOW);
  delay(1000);
}
