# 晶圓切割（Dicing）體驗（高中版）

「義」起解密晶片營隊學習網站的互動 3D 工作站：學員在 10 分鐘內完成「對位 → 設參數 → 切割 → 檢查」，體驗切割速度與良率的取捨。成品是**單一 HTML 檔、完全不需網路**（three.js、machine kit 都內嵌）。

- 成品：`web/public/labs/dicing.html`（約 1.3 MB）
- 嵌入：`<iframe src="/labs/dicing.html?embed">`（隱藏標題列與提示列，適合約 16:10 的框；寬度小於 760 px 時 3D 在上、控制面板在下）

## 檔案

| 檔案 | 用途 |
|---|---|
| `solver.js` | 純函式模型（崩邊、偏移、深度判定、良率、時間、建議）。瀏覽器與 Node 共用 |
| `body.js` | 3D 場景、介面、四個步驟、小視窗繪圖、postMessage（CSS 也在這裡） |
| `build_lab.py` | 組成單檔：machine kit `template.html`（去掉外部字型）＋ kit（中文化）＋ three 0.170（data URL import map）＋ solver ＋ body |
| `test_node.mjs` | solver 單元測試 |
| `test_page.mjs` | Playwright 自測：桌面 1440×900、手機 375×812、`?embed` 1000×625 截圖，跑完整流程並檢查 postMessage、主控台錯誤、外部網路請求 |

## 重建與測試（在 `web/` 底下）

```sh
node labs/dicing/test_node.mjs                 # solver 單元測試
python3 labs/dicing/build_lab.py               # 產出 public/labs/dicing.html（超過 1.6 MB 會報錯）
node labs/dicing/test_page.mjs "$PWD/public/labs/dicing.html" <截圖輸出資料夾>
```

- three 來自 `web/node_modules/three`（0.170.0）；kit 來自 `~/.claude/skills/machine/kit/`。
- `test_page.mjs` 用 `~/.claude/skills/machine/node_modules/playwright`；沒有 Playwright 自帶的 Chromium 時，自動改用系統的 Google Chrome（不另外下載）。
- `build_lab.py` 的取代表（`REPL`）每一條都必須命中，kit 改版時會直接報錯提醒。

## 與外層網頁溝通

每次切完（進入步驟 4）送 `progress`；達成完成條件時再送 `complete`：

```js
window.parent.postMessage({
  source: 'chip-camp-lab', lab: 'dicing',
  event: 'progress' | 'complete',
  data: { yield, seconds, chippingUm, attempts },
}, '*')
```

- `yield`：良率，百分比（0～100，一位小數）
- `seconds`：這次的總切割時間（機台時間，秒，整數）
- `chippingUm`：整片最大崩邊（µm，一位小數）
- `attempts`：第幾次切割（從 1 開始）

完成條件：切入深度正確（切進膠帶 10～60 µm）且良率 ≥ 90%。

## 模型（示意，寫在 `solver.js`）

- 晶圓 100 mm、厚 525 µm；晶粒 5 mm × 5 mm，完整晶粒 240 顆（邊緣排除 3 mm）；切割道 100 µm、刀痕 30 µm、電路保護帶 15 µm；膠帶 90 µm。
- 每轉進給量 f = 進給速度 ÷ 每秒轉數；典型崩邊 c = 3 + 0.09 f + 0.0004 f²（µm，經驗式示意）。每顆晶粒四條邊各抽一個崩邊 c × (1 + 0.5·(−ln r))（決定性亂數，同一片晶圓可重現）。
- 刀痕偏移：方向 1 為 e = Y 偏移 + u·tanθ，方向 2 為 e = X 偏移 − v·tanθ（θ 讓偏移隨距離累積，遠端切割道偏最多）。
- 餘裕 m = (100 − 30)/2 − 往晶粒偏的量；崩邊 > m + 15 µm → 傷到電路，晶粒報廢（m < 5 µm 歸為「切偏」）。
- 深度：切進膠帶 < 0 未切斷（良率 0）、0～10 剛到底（背崩 ×1.5）、10～60 正確、60～90 偏深（不算完成）、≥ 90 切斷膠帶（良率 0）。
- 時間 = Σ(切割道長 ÷ 進給 + 0.8 s 換道) × 2 方向 + 轉向 3 s。30 mm/s 約 2 分半。

## 設計說明

- 四個步驟：對位（相機小視窗看左右兩個標記，先調 θ 再調 Y、X）→ 設參數（剖面示意圖看深度）→ 切割（可 ×4／×16／×64 快轉或直接切完；刀片轉動畫面放慢、機台時間照真實速度）→ 檢查（顯微鏡看晶粒邊緣崩邊、速度 vs 良率曲線、依結果給建議）。
- 語意色沿用系列：底 #141414、文字 #ECEEDF、電子藍（冷卻水、膠帶）、黃（十字線、門檻）、綠（合格）、紅（報廢）、橘（警告）、紫（說明卡）；同時用形狀 ✓ ▲ ✕、○（合格晶粒）區分，不只靠顏色。
- 每個主要零件有標籤（名稱＋一句用途），另有「零件小百科」列出全部說明；窄螢幕的 3D 標籤只顯示名稱。寬螢幕開標籤時暫時收起左側小視窗，避免重疊。
- 3D 晶圓貼圖在垂直切割道方向放大 8 倍（切割道、刀痕、偏移一起放大），刀片厚度也放大顯示；顯微鏡與相機小視窗是真實比例。
- 不載入任何外部資源：kit 的 HDRI 網址已移除（只用程式產生的攝影棚環境光），Google 字型連結已去掉（用系統字型）。
- 關閉了 kit 的泛光（bloom）：亮金屬在某些角度的銳利反光會被放大成整片白霧。膠帶改用標準材質，原因相同。

## 已知限制

- 崩邊、時間公式是教學示意，量級合理但不對應特定機台或刀片；未模擬刀片磨耗、背面崩邊細節、晶圓翹曲。
- 3D 刀片與切割道寬度為放大顯示；水花為示意粒子。
- `?film` 錄影模式未設定（本站不需要展示片）。
