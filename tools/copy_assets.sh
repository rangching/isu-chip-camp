#!/usr/bin/env bash
# 從「半導體物理及元件」雲端資料夾複製互動 3D 工作站與短片，並把短片壓到每支約 5 MB 以下。
# 用法：bash tools/copy_assets.sh        （已存在的輸出會略過；加 --force 重做）
set -euo pipefail
cd "$(dirname "$0")/.."
P="$HOME/Library/CloudStorage/GoogleDrive-rangching0331@gmail.com/我的雲端硬碟/半導體物理及元件/課程規劃/Claude_Code_交接/production"
FORCE=${1:-}
FF=/opt/homebrew/bin/ffmpeg; command -v ffmpeg >/dev/null && FF=$(command -v ffmpeg)
mkdir -p public/labs/series public/media

# id | 單元資料夾 | 3D 檔名關鍵字 | 展示片關鍵字 | 片頭關鍵字
UNITS=(
  "m00-01|M00/unit_M00_01_v2|||M00-01 晶片、元件、材料_片頭_720p"
  "m01-01|M01/unit_M01_01_v2|鑽石晶格互動3D||M01-01 矽的鍵結與晶格_片頭_720p"
  "m02-02|M02/unit_M02_02_v2|探針台能隙互動3D||M02-02 導體、半導體、絕緣體與能隙_片頭_720p"
  "m05-01|M05/unit_M05_01_v2|準穩態光導量測台互動3D|準穩態光導量測台_展示片_26s|M05-01 光或注入如何打破熱平衡_片頭_720p"
  "m09-01|M09/unit_M09_01|||M09-01 閘極如何控制源汲極電流_片頭_720p"
  "m09-06|M09/unit_M09_06|CMOS 反相器量測台互動3D|CMOS 反相器量測台_展示片_26s|M09-06 CMOS 反相器與核心專題_片頭_720p"
  "m11-01|M11/unit_M11_01|晶體成長與磊晶工作站互動3D|晶體成長與磊晶工作站_展示片_26s|M11-01 晶體成長、晶圓與磊晶_片頭_720p"
  "m11-02|M11/unit_M11_02|||M11-02 氧化、擴散與熱預算_片頭_720p"
  "m11-03|M11/unit_M11_03|薄膜沉積工作站互動3D|薄膜沉積工作站_展示片_26s|M11-03 PVD、CVD 與 ALD_片頭_720p"
  "m11-04|M11/unit_M11_04|微影曝光工作站互動3D|微影曝光工作站_展示片_26s|M11-04 微影、解析度與製程視窗_片頭_720p"
  "m11-05|M11/unit_M11_05|蝕刻製程工作站互動3D|蝕刻製程工作站_展示片_26s|M11-05 濕蝕刻、乾蝕刻與選擇比_片頭_720p"
  "m11-06|M11/unit_M11_06|離子佈植與退火工作站互動3D|離子佈植與退火工作站_展示片_26s|M11-06 離子佈植、退火與摻雜輪廓_片頭_720p"
  "m12-01|M12/unit_M12_01|MOSFET 製程流程工作站互動3D|MOSFET 製程流程工作站_展示片_26s|M12-01 把 MOSFET 做出來：完整製程流程_片頭_720p"
  "m12-03|M12/unit_M12_03|參數分析儀量測台互動3D|參數分析儀量測台_展示片_26s|M12-03 從 I-V、C-V 到參數萃取_片頭_720p"
  "m12-04|M12/unit_M12_04|晶圓圖量測台互動3D|晶圓圖量測台_展示片_26s|M12-04 雜訊、變異與不確定性_片頭_720p"
)
# 首頁直式輪播
VERTICAL=(m11-01 m11-03 m11-04 m11-05 m12-01 m09-06)

enc() { # 來源 輸出 縮放濾鏡 crf
  local src="$1" out="$2" vf="$3" crf="$4"
  [[ -f "$out" && "$FORCE" != "--force" ]] && return
  "$FF" -nostdin -loglevel error -y -i "$src" -vf "$vf" -c:v libx264 -preset slow -crf "$crf" -pix_fmt yuv420p \
    -c:a aac -b:a 64k -ac 2 -movflags +faststart "$out"
  local mb; mb=$(du -k "$out" | awk '{printf "%.1f", $1/1024}')
  echo "  $out  ${mb} MB"
}

for row in "${UNITS[@]}"; do
  IFS='|' read -r id dir lab demo intro <<<"$row"
  base="$P/$dir/成品"
  echo "== $id"
  if [[ -n "$lab" ]]; then
    f=$(ls "$base" | grep -F "$lab" | grep '\.html$' | head -1)
    cp "$base/$f" "public/labs/series/$id.html" && echo "  public/labs/series/$id.html"
  fi
  [[ -n "$demo" ]] && enc "$base/$(ls "$base" | grep -F "$demo" | head -1)" "public/media/demo-$id.mp4" "scale=-2:540" 30
  [[ -n "$intro" ]] && enc "$base/$(ls "$base" | grep -F "$intro.mp4" | head -1)" "public/media/intro-$id.mp4" "scale=-2:540" 30
done
for id in "${VERTICAL[@]}"; do
  dir=$(printf '%s\n' "${UNITS[@]}" | grep "^$id|" | cut -d'|' -f2)
  base="$P/$dir/成品"
  f=$(ls "$base" | grep -F "直式15秒_1080x1920.mp4" | grep -v EN | head -1)
  enc "$base/$f" "public/media/v-$id.mp4" "scale=540:-2" 31
done
du -sh public/labs public/media
