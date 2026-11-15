// 關卡二之二：拍手聲控智慧開關（麥克風模組）
// 每 20 毫秒量一次聲音的峰對峰值，超過門檻就切換燈；觸發後冷卻一段時間避免連切
// ※ 腳位為預留值，請依 KTduino 接線表修改。

const int MIC = A1;          // 麥克風模組類比輸出
const int LAMP = 13;         // 被控制的 LED
int THRESHOLD = 180;         // 拍手門檻（峰對峰值）
int COOLDOWN_MS = 400;       // 觸發後的冷卻時間
bool lampOn = false;
unsigned long lastClap = 0;

void setup() {
  pinMode(LAMP, OUTPUT);
  Serial.begin(9600);
}

int loudness() {
  unsigned long t0 = millis();
  int lo = 1023, hi = 0;
  while (millis() - t0 < 20) {
    int v = analogRead(MIC);
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return hi - lo;            // 峰對峰值：聲音越大越大
}

void loop() {
  int level = loudness();
  if (level > THRESHOLD && millis() - lastClap > COOLDOWN_MS) {
    lampOn = !lampOn;
    lastClap = millis();
    digitalWrite(LAMP, lampOn ? HIGH : LOW);
    Serial.println(lampOn ? "拍手！燈：開" : "拍手！燈：關");
  }
}
