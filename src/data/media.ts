// 「半導體物理及元件」系列可沿用的影片與互動 3D 工作站。
// 短片（片頭、展示片、直式 15 秒）由 tools/copy_assets.sh 壓縮後放在 public/media；
// 3D 工作站複製到 public/labs/series；正片走 YouTube，尚未上架的 youtube 留空。

export interface SeriesUnit {
  id: string; // m11-04
  code: string; // M11-04
  title: string;
  /** 給高中生的一句話 */
  hook: string;
  intro?: boolean; // public/media/intro-<id>.mp4
  demo?: boolean; // public/media/demo-<id>.mp4
  vertical?: boolean; // public/media/v-<id>.mp4
  lab?: string; // 3D 工作站名稱；檔案 public/labs/series/<id>.html
  youtube?: string; // 正片 YouTube ID
}

export const SERIES: Record<string, SeriesUnit> = {
  'm00-01': { id: 'm00-01', code: 'M00-01', title: '晶片、元件、材料', hook: '從一支手機縮小到一顆電晶體，晶片到底有多小？', intro: true, youtube: 'kXlVthEUl2Y' },
  'm01-01': { id: 'm01-01', code: 'M01-01', title: '矽的鍵結與晶格', hook: '矽原子排成鑽石一樣的結構，這是晶片的地基。', intro: true, lab: '鑽石晶格', youtube: 'UtAVh54jAjI' },
  'm02-02': { id: 'm02-02', code: 'M02-02', title: '導體、半導體、絕緣體與能隙', hook: '為什麼晶片偏偏要用「半」導體？', intro: true, lab: '探針台能隙量測' },
  'm05-01': { id: 'm05-01', code: 'M05-01', title: '光或注入如何打破熱平衡', hook: '光一照，材料就多出可以導電的電子——光敏電阻的祕密。', intro: true, demo: true, lab: '光導量測台' },
  'm09-01': { id: 'm09-01', code: 'M09-01', title: '閘極如何控制源汲極電流', hook: '電晶體就是用電壓控制的水龍頭開關。', intro: true },
  'm09-06': { id: 'm09-06', code: 'M09-06', title: 'CMOS 反相器', hook: '兩顆電晶體就能把 0 變 1、1 變 0。', intro: true, demo: true, vertical: true, lab: 'CMOS 反相器量測台' },
  'm11-01': { id: 'm11-01', code: 'M11-01', title: '晶體成長、晶圓與磊晶', hook: '一根長得像大香腸的矽晶棒，切成一片片晶圓。', intro: true, demo: true, vertical: true, lab: '晶體成長與磊晶工作站' },
  'm11-02': { id: 'm11-02', code: 'M11-02', title: '氧化、擴散與熱預算', hook: '把矽放進高溫爐，長出一層玻璃般的氧化層。', intro: true },
  'm11-03': { id: 'm11-03', code: 'M11-03', title: 'PVD、CVD 與 ALD', hook: '薄膜沉積：一次鋪上比頭髮細千倍的材料層。', intro: true, demo: true, vertical: true, lab: '薄膜沉積工作站' },
  'm11-04': { id: 'm11-04', code: 'M11-04', title: '微影、解析度與製程視窗', hook: '黃光微影：用光把電路圖「印」到晶圓上。', intro: true, demo: true, vertical: true, lab: '微影曝光工作站' },
  'm11-05': { id: 'm11-05', code: 'M11-05', title: '濕蝕刻、乾蝕刻與選擇比', hook: '蝕刻：把不要的地方挖掉，留下電路的形狀。', intro: true, demo: true, vertical: true, lab: '蝕刻製程工作站' },
  'm11-06': { id: 'm11-06', code: 'M11-06', title: '離子佈植、退火與摻雜輪廓', hook: '把雜質原子「打」進矽裡，改變它導電的方式。', intro: true, demo: true, lab: '離子佈植與退火工作站' },
  'm12-01': { id: 'm12-01', code: 'M12-01', title: '把 MOSFET 做出來：完整製程流程', hook: '把前面所有步驟串起來，做出一顆電晶體。', intro: true, demo: true, vertical: true, lab: 'MOSFET 製程流程工作站' },
  'm12-03': { id: 'm12-03', code: 'M12-03', title: '從 I-V、C-V 到參數萃取', hook: '探針放上去、掃電壓、畫曲線，就能讀出元件的健康狀況。', intro: true, demo: true, lab: '參數分析儀量測台' },
  'm12-04': { id: 'm12-04', code: 'M12-04', title: '雜訊、變異與不確定性', hook: '同一片晶圓上的晶粒也不會一模一樣——晶圓圖告訴你哪裡出問題。', intro: true, demo: true, lab: '晶圓圖量測台' },
};

export const SERIES_CHANNEL_NOTE = '影片與 3D 工作站來自「半導體物理及元件」系列，屬大學程度的延伸內容，看不懂沒關係，先感受畫面就好。';

export const mediaUrl = (file: string) => `${import.meta.env.BASE_URL}${file}`;
export const labUrl = (id: string) => mediaUrl(`labs/series/${id}.html`);
export const campLabUrl = (name: 'probe_station' | 'dicing') => mediaUrl(`labs/${name}.html?embed`);
