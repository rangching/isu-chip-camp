# 微動探針台下針量測（高中版）互動 3D 工作站

給「「義」起解密晶片：半導體製程 × 智慧感測創客營」學習網站用的單檔 HTML 工作站。學員（國三～高三）在 3D 探針台上：選一顆晶粒 → 用微動探針座的 X／Y／Z 把兩支鎢針下到 pad 上 → 掃 I-V 曲線 → 判定良品或不良，晶圓圖即時上色、算良率。正確判定 6 顆就完成，約 10 分鐘。

成品：`public/labs/probe_station.html`（約 1.3 MB，完全不連網；外層網頁用 `labs/probe_station.html?embed` 嵌入）。

## 重建

在 `web/` 底下：

```bash
node labs/probe_station/test_node.mjs          # solver 單元測試
python3 labs/probe_station/build_lab.py        # 組成單檔 → public/labs/probe_station.html
node labs/probe_station/test_page.mjs "$PWD/public/labs/probe_station.html" <截圖輸出資料夾>
```

- `build_lab.py` 需要：`web/node_modules/three`（0.170，已在 devDependencies）與 machine skill 的 kit（`~/.claude/skills/machine/kit/lab-kit.js`、`template.html`）。
- `test_page.mjs` 用 `~/.claude/skills/machine/node_modules/playwright`；沒有 Playwright 自帶的 Chromium 時會改用系統的 Google Chrome。

## 檔案

| 檔案 | 內容 |
| --- | --- |
| `solver.js` | 純函式模型（不碰 DOM／three）：晶粒格點與固定種子的缺陷分布、接觸判定、移動事件（刮傷）、I-V 掃描、判讀、良率統計、postMessage 訊息。瀏覽器與 node 共用。 |
| `body.js` | 3D 場景（LabKit）、晶圓圖／顯微鏡／I-V 三個 Canvas、操作面板、說明卡與完成卡。`/*__SOLVER__*/` 佔位會被換成 solver.js。 |
| `build_lab.py` | kit 中文化與小改（沿用 M12-04 的取代表，再加：提示列字樣、只留 E／L 快捷鍵、拿掉 HDRI 連網）、手機版 3D 只用上半部（`LAB_H`）、three 與 addons 轉成 data URL import map、拿掉 Google Fonts。 |
| `test_node.mjs` | 220 項斷言：缺陷分布固定、邊緣較多不良、接觸窗口、刮傷事件、判讀、判定規則、良率、訊息格式。 |
| `test_page.mjs` | 桌面 1440×900、手機 375×812、`?embed` 1280×800 與 960×600 截圖；檢查主控台錯誤、外部網路請求、水平捲動、禁用字；桌面用真的點擊跑完整流程並確認 postMessage。 |

## 設計說明

**模型（全部是示意值，但不違背事實）**

- 6 吋晶圓＝直徑 150 mm，主平邊約 57.5 mm 朝前；晶粒間距 14 mm、邊緣排除 3 mm → 61 顆完整晶粒（另畫出邊緣不完整晶粒，不測）。晶粒命名：欄 A～I、列 1～9，中心是 E5。
- 每顆晶粒的測試元件是 1 kΩ 電阻，良品規格 900～1100 Ω。缺陷用固定種子（mulberry32，seed 20260121）產生，不良機率＝6%＋55%·(r／r_max)⁴，所以邊緣多、中心少：良品 42、開路 6、短路 5、偏高 5、偏低 3。
- pad 160 µm 見方、中心距 600 µm；每顆晶粒有 ±20 µm 的小歪斜（換晶粒後要再看一下）。
- 接觸：針尖高度 z > 0 懸空；z ≤ 0 但不在 pad 上＝落在保護層（開路）；下壓 0～10 µm＝剛碰到（接觸電阻 150～400 Ω、會抖）；10～35 µm＝良好接觸；> 35 µm＝針壓過大（刮傷、扣 5 分）。針還壓著就橫移也算刮傷。每次下針最多記一次刮傷。
- 量測：掃 −1～+1 V、41 點，I＝V÷(R＋接觸電阻)，限流 5 mA，加 0.3 µA 雜訊；判讀用過原點最小平方斜率。
- 判定對錯依「晶粒真實狀態」：沒下好針就量，量到開路而判不良，會被告知「其實是良品，是針沒接好」。
- 良率＝判為良品的顆數 ÷ 已測顆數（依學員判定）；分數＝10×判對 − 5×刮傷。完成卡另外列出整片真實良率供對照。

**介面**

- 桌面：左欄晶圓圖（可點選）＋顯微鏡視野；中間 3D；右側面板依步驟排：良率、步驟條、提示、② 對針與下針、③ 量測 I-V、④ 判定、工具列（零件標籤、爆炸圖、近看針尖、說明）。3D 裡直接點晶圓也能選晶粒。
- 顯微鏡視野：針尖離 pad 越高，影子離針尖越遠、針也越模糊（景深）；碰到後影子和針尖重合。左針用橘色圓圈 ◎、右針用紫色菱形 ◇。
- 接觸狀態同時用顏色與形狀：○ 懸空、△ 沒對準、◐ 剛碰到、● 良好接觸、✖ 針壓過大。晶圓圖：綠色實心方塊＝良品、紅叉＝不良、灰框＝未測、藍框＝選取中。
- 鍵盤：方向鍵移 XY、PageUp／PageDown 升降 Z、E 爆炸圖、L 標籤、Esc 關卡片。
- 手機（寬 < 760）：3D 在上（約 42% 高），控制面板在下可捲動，晶圓圖與顯微鏡放進面板。
- `?embed`：隱藏提示列與標題，其餘照常。

**與外層網頁溝通**

每次判定送 `progress`，第一次正確判定滿 6 顆再送一次 `complete`：

```js
window.parent.postMessage({ source: 'chip-camp-lab', lab: 'probe_station', event: 'progress' | 'complete',
  data: { tested, correct, yield, scratches } }, '*')
```

`yield` 是 0～1 的比例（小數點下 3 位）；`tested` 已判定顆數、`correct` 判對顆數、`scratches` 刮傷次數。

## 已知限制

- 3D 裡針的位移有放大（XY 1 µm 畫成 20 µm、Z 1 µm 畫成 120 µm），真實尺度下肉眼看不到。
- 同一顆晶粒可以重量後改判，統計以最後一次判定為準。
- 手機版 3D 標籤只顯示名稱（說明文字收起來），避免擠成一團。
