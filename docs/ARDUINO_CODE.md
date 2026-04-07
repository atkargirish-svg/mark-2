# 🤖 REAT Mark II - 4-Axis Servo Control (Realtime Database)

Bhai, ye aapka final **Mark II** production code hai jo **Firebase Realtime Database (RTDB)** se fast sync hoga.

### 🔌 Wiring Diagram (No Breadboard)
1.  **Base Servo (D1):** GPIO 5
2.  **Shoulder Servo (D2):** GPIO 4
3.  **Elbow Servo (D3):** GPIO 0
4.  **Pickup Claw Servo (D4):** GPIO 2
5.  **Power:** 5V 2A Adapter use karein. NodeMCU aur Adapter ka GND aapas mein jodein (**Common Ground**).

### 🚀 Arduino C++ Code
```cpp
#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>
#include <Servo.h>

// 1. Credentials (FILL THESE)
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

#define FIREBASE_HOST "studio-8868018980-88912-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "AIzaSyARJt2uQWASM7RBEPTRaooBGz_DiBv8kMk"

// 2. Objects
Servo baseServo, shoulderServo, elbowServo, pickupServo;
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

void setup() {
  Serial.begin(115200);
  
  // Attach Servos
  baseServo.attach(5);      // D1
  shoulderServo.attach(4);  // D2
  elbowServo.attach(0);     // D3
  pickupServo.attach(2);    // D4
  
  // WiFi Connection
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nREAT Mark II RTDB Online");

  // Firebase Setup
  config.host = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  if (Firebase.ready()) {
    if (Firebase.RTDB.getJSON(fbdo, "/REAT_Arm_State")) {
      FirebaseJson &json = fbdo.jsonObject();
      FirebaseJsonData data;

      if (json.get(data, "base")) baseServo.write(data.intValue);
      if (json.get(data, "shoulder")) shoulderServo.write(data.intValue);
      if (json.get(data, "elbow")) elbowServo.write(data.intValue);
      if (json.get(data, "pickup")) pickupServo.write(data.intValue);
      
      Serial.println("RTDB Sync Successful");
    }
  }
  delay(50); // Fast response
}
```

### 📦 Library Installation:
1. Arduino IDE mein **Firebase ESP Client** library (by Mobizt) install karein.
2. Code copy karein, WiFi details bharein.
3. NodeMCU connect karein aur **Upload** dabayein.
```