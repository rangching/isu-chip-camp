# 下午關卡的 Arduino 範例

給 KTduino 積極體驗板（Arduino Uno 核心）用，寫法沿用 114 年暑假營簡報（`pinMode`、`digitalRead`、`digitalWrite`、`delay`、按鍵低態動作）。

| 檔案 | 關卡 |
|---|---|
| `lock4bit.ino` | 關卡一：4 位元二進位密碼鎖（指撥開關 → XNOR 比對 → AND → LED Bar） |
| `night_light.ino` | 關卡二：光控節能小夜燈（CdS 分壓 → analogRead → 遲滯門檻） |
| `clap_switch.ino` | 關卡二：拍手聲控開關（麥克風峰對峰值 → 門檻 → 冷卻時間） |

**腳位都是預留值。** 請依實際 KTduino 接線（指撥開關 P5、LED Bar P9、CdS P20、麥克風 P21 接到 Uno 的哪些腳）修改每個檔案最上面的常數；網站上顯示的程式碼也來自這三個檔案。
