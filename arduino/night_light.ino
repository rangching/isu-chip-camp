// 關卡二之一：智慧光控節能小夜燈（CdS 光敏電阻）
// 光敏電阻與 10 kΩ 分壓：越亮 → A0 讀值越大
// ※ 腳位為預留值，請依 KTduino 接線表修改。

const int CDS = A0;      // CdS 光敏電阻分壓輸出
const int LAMP = 9;      // 小夜燈 LED（可 PWM 的腳位）
int ON_BELOW  = 300;     // 暗於這個值 → 開燈
int OFF_ABOVE = 400;     // 亮於這個值 → 關燈（中間留緩衝：遲滯）
bool lampOn = false;

void setup() {
  pinMode(LAMP, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int light = analogRead(CDS);          // 0～1023
  if (light < ON_BELOW)  lampOn = true;
  if (light > OFF_ABOVE) lampOn = false;
  digitalWrite(LAMP, lampOn ? HIGH : LOW);

  Serial.print("light = ");
  Serial.print(light);
  Serial.println(lampOn ? "  燈：開" : "  燈：關");
  delay(100);
}
