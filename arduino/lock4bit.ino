// 關卡一：IC 邏輯解密遊戲——4 位元二進位密碼鎖
// 板子：KTduino 積極體驗板（Arduino Uno 核心）
// ※ 腳位為預留值，請依老師提供的 KTduino 接線表修改下面的常數。

const int DIP[4] = {2, 3, 4, 5};        // 指撥開關 SW1～SW4（低態動作：ON = LOW）
const int LED[10] = {6, 7, 8, 9, 10, 11, 12, 13, A2, A3}; // LED Bar 10 顆
int CODE[4] = {1, 0, 1, 1};             // 上午尋寶拿到的密碼（由左到右：沉積、微影、蝕刻、封測）

void setup() {
  for (int i = 0; i < 4; i++) pinMode(DIP[i], INPUT_PULLUP);
  for (int i = 0; i < 10; i++) pinMode(LED[i], OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int match[4];
  bool unlock = true;
  for (int i = 0; i < 4; i++) {
    int sw = (digitalRead(DIP[i]) == LOW) ? 1 : 0;  // 低態動作：撥到 ON 讀到 LOW，換成 1
    match[i] = (sw == CODE[i]) ? 1 : 0;           // XNOR：相同才是 1
    unlock = unlock && match[i];                  // 四位全部 AND 起來
  }

  if (unlock) {
    // 解鎖成功：LED Bar 跑馬燈
    for (int i = 0; i < 10; i++) { digitalWrite(LED[i], HIGH); delay(60); }
    for (int i = 0; i < 10; i++) { digitalWrite(LED[i], LOW);  delay(60); }
    Serial.println("UNLOCK!");
  } else {
    // 還沒解開：前 4 顆顯示哪幾位比對正確，其餘熄滅
    for (int i = 0; i < 10; i++) digitalWrite(LED[i], (i < 4 && match[i]) ? HIGH : LOW);
    delay(100);
  }
}
