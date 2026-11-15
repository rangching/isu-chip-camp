# 「義」起解密晶片：半導體製程 × 智慧感測創客營　互動學習網站

義守大學電子工程學系（含半導體學士學位學程）116 年寒假「大學探索之旅」體驗營（116/1/28）專屬網站。
同一個網站給**營隊當天闖關、營前預習、營後學習歷程、招生宣傳**使用。

## 開發

```bash
npm install
npm run dev        # http://localhost:5200
npm test           # 邏輯、尋寶設定、計算器、檔案完整性的單元測試
npm run build      # 輸出 dist/（相對路徑，可直接放 GitHub Pages）
npm run labs       # 重新組裝兩個營隊專屬 3D 工作站（見 labs/*/README.md）
bash tools/copy_assets.sh   # 從「半導體物理及元件」雲端資料夾重新複製 3D 工作站並壓縮短片
```

部署：推到 GitHub 的 `main` 後，`.github/workflows/deploy.yml` 會跑測試、建置並發佈到 GitHub Pages。

## 老師使用說明

| 功能 | 怎麼開 |
|---|---|
| 老師設定（尋寶答案、當日密碼、QR code） | 網址加 `#teacher`，輸入老師口令（不寫在公開 repo，請向營隊規劃老師索取） |
| 投影模式（大字時鐘＋現在時段） | 網址加 `#projector`，按 Esc 關閉 |

- 老師口令只是前端遮擋，不是安全機制；原始碼只存口令的雜湊。要換口令，改 `src/features/teacher/Teacher.tsx` 的 `PASS_HASH`（用同檔的 `checkPass` 規則計算）。
- 產生的學員連結 `#hunt&cfg=…` 只含答案雜湊與被遮住的密碼位元；學員答對某一站才解得出那一位。**請在營隊前產生一次並固定使用**（每次產生的鹽值不同，進度分開記）。
- 當日 4 位元密碼要和 KTduino 上 `lock4bit.ino` 的 `CODE` 一致（網站上顯示的程式會自動代入學員自己解出的密碼）。
- 沒有老師連結時是「練習模式」，四站答案藏在網頁的顯微鏡裡，密碼 1011。

## 網站結構

| 區塊 | 檔案 | 內容 |
|---|---|---|
| 00 首頁 | `src/features/hero/Hero.tsx` | 倒數、三主題、選 A／B 組、直式短片輪播 |
| 01 行程 | `src/features/schedule/Schedule.tsx` | 依組別的行程、現在時段、地點 |
| 02 產業鏈 | `src/features/industry/Industry.tsx` | 上中下游、S 廊帶、M00-01 影片 |
| 03 製程尋寶 | `src/features/hunt/Hunt.tsx` | 四站解密單、顯微鏡、4 位元密碼 |
| 04 擬真製程 | `src/features/process/Process.tsx` | 剖面動畫、排序挑戰、M11／M12 3D 工作站 |
| 05 探針台 | `src/features/probe/Probe.tsx` | 營隊專屬 3D 探針台、晶粒數與良率計算器 |
| 06 潔淨室 | `src/features/cleanroom/Cleanroom.tsx` | 著裝順序、空氣浴、潔淨度、營隊專屬 3D 切割機 |
| 07 邏輯閘 | `src/features/logic/Logic.tsx` | 邏輯閘、電晶體開關、二進位、CdS 分壓 |
| 08 密碼鎖 | `src/features/lock/Lock.tsx` | 虛擬 KTduino 指撥開關、XNOR＋AND 電路 |
| 09 感測器 | `src/features/sensors/Sensors.tsx` | 光控小夜燈（滑桿／相機）、拍手開關（麥克風） |
| 10 學習歷程 | `src/features/portfolio/Portfolio.tsx` | 闖關護照、心得列印／PDF、匯出匯入紀錄 |

資料與邏輯：`src/data/camp.ts`（日期、行程、地點、產業鏈，全部來自企劃書）、`src/data/learn.ts`（測驗、術語、迷思）、`src/data/media.ts`（系列影片與 3D 工作站清單、YouTube ID）、`src/lib/logic.ts`、`src/lib/campConfig.ts`、`src/lib/formula.ts`。

## 沿用的既有資產

- **15.機器人實驗室**：專案設定、部署 workflow、進度／徽章 store、Web Audio 配樂播放器與音效、程式碼上色。
- **半導體物理及元件**：
  - `style_v0.2.json` 語意色（電子 #58C4DD、電洞 #F2A65A、電場 #F9D976…）→ `src/styles/global.css`
  - `assets_draft/layer_stack.svg` 的分層配色 → 製程剖面
  - 12 個互動 3D 工作站 → `public/labs/series/`
  - 片頭、直式 15 秒、26 秒展示片（壓縮後）→ `public/media/`
  - 3D IC 互動教材的 JSON 公式引擎 → `src/lib/formula.ts`；測驗、翻卡、迷思卡的互動模式 → `src/components/common.tsx`
  - LabKit 工作站組檔流程 → `labs/probe_station/`、`labs/dicing/`
- 教科書原圖限校內 Moodle，**沒有**放進本網站。

## 待確認

- KTduino 指撥開關、LED Bar、CdS、麥克風的實際腳位（`arduino/*.ino` 目前是預留值）。
- 四站現場線索（用 `#teacher` 填）。
- 正片影片上架 YouTube 後，把 ID 填進 `src/data/media.ts` 的 `youtube` 欄位。
- 校徽、系徽若要放，請提供檔案。
