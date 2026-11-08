// 所有游戏内容都是数据：改内容只改这里。
// 尺寸单位：米（物件在地面上的"半径"）。体积单位：size^3，显示时 × KG_PER_UNIT 换算成 kg。

export const KG_PER_UNIT = 80;

export const SLIME = {
  startRadius: 0.5,
  eatFactor: 0.85,        // 档位门槛 = 该档最大物件尺寸 / eatFactor
  speedBase: 2.2,         // 速度 = speedBase + speedScale * r^0.85
  speedScale: 3.4,
  attract: 0.35,          // 吸附范围：r * (1 + attract) 以内可吞的物件会被吸进来
  dissolveTime: 2.6,      // 物件在身体里溶解的秒数
  bossDamage: 1.0,
};

export const SKILLS = {
  swell: {
    name: '膨胀',
    icon: '🫧',
    duration: 3,
    cooldown: 8,
    scale: 1.5,           // 体型 ×1.5（可吞档位按膨胀后计算；吞 Boss 按真实体重）
    bossDamageMul: 2,
  },
};

export const CHARACTERS = {
  normal: { name: '普通史莱姆', skill: 'swell', color: 0x38f0ff, rim: 0xff4fd8 },
};

// tier：所属档位（0 = 开局就能吞）。model：Hi3D 模型路径，null = 只用代码占位模型。
// gain：吞下后获得体积 = size^3 * gain。
export const ITEM_TYPES = {
  can:       { name: '易拉罐', size: 0.13, tier: 0, gain: 2.5, model: null },
  cone:      { name: '路锥',   size: 0.18, tier: 0, gain: 2.5, model: null },
  box:       { name: '纸箱',   size: 0.24, tier: 0, gain: 2.0, model: null },
  trashcan:  { name: '垃圾桶', size: 0.36, tier: 0, gain: 1.6, model: 'models/trashcan.glb' },
  hydrant:   { name: '消防栓', size: 0.32, tier: 0, gain: 1.6, model: 'models/hydrant.glb' },
  lamp:      { name: '路灯',   size: 0.55, tier: 1, gain: 1.4, model: 'models/lamp.glb' },
  bench:     { name: '长椅',   size: 0.9,  tier: 1, gain: 1.2, model: 'models/bench.glb' },
  bike:      { name: '自行车', size: 0.85, tier: 1, gain: 1.2, model: 'models/bike.glb' },
  tree:      { name: '行道树', size: 1.5,  tier: 2, gain: 1.0, model: null },
  kiosk:     { name: '报刊亭', size: 1.5,  tier: 2, gain: 1.0, model: 'models/kiosk.glb' },
  car:       { name: '汽车',   size: 2.0,  tier: 2, gain: 1.0, model: 'models/car.glb' },
  bus:       { name: '公交车', size: 5.0,  tier: 3, gain: 1.0, model: 'models/bus.glb' },
  building:  { name: '楼房',   size: 6.2,  tier: 3, gain: 1.0, model: 'models/building.glb' },
};

// 档位：越过门槛时大字提示 + 三选一卡片
export const TIERS = [
  { items: ['易拉罐', '纸箱', '垃圾桶', '消防栓'] },
  { items: ['长椅', '自行车', '路灯'] },
  { items: ['报刊亭', '汽车', '行道树'] },
  { items: ['公交车', '楼房'] },
];

export const MAP = {
  half: 105,              // 道路网覆盖 ±105m
  block: 30,              // 街区间距
  road: 8,                // 道路宽
  bound: 116,             // 玩家活动边界
  respawnBelow: 0.3,      // 剩余物件少于初始 30% 时补刷
};

export const BOSS = {
  name: '垃圾车怪兽',
  model: 'models/garbage_truck.glb',
  size: 9,
};

// 强化卡：stat 字段对应 SLIME / 技能的数值
export const CARDS = [
  { id: 'attract', icon: '🧲', name: '黏性增强', desc: '吸附范围 +40%', apply: s => { s.attract += 0.4 * SLIME.attract + 0.15; } },
  { id: 'speed',   icon: '💨', name: '滑溜溜',   desc: '移动速度 +15%', apply: s => { s.speedMul *= 1.15; } },
  { id: 'dissolve',icon: '🧪', name: '强酸胃液', desc: '溶解速度 +40%', apply: s => { s.dissolveTime /= 1.4; } },
  { id: 'eat',     icon: '👄', name: '大胃口',   desc: '下一档提前解锁（可吞尺寸 +10%）', apply: s => { s.eatFactor *= 1.1; } },
  { id: 'cd',      icon: '⏱️', name: '急性子',   desc: '膨胀冷却 -25%', apply: s => { s.skillCdMul *= 0.75; } },
  { id: 'dur',     icon: '🎈', name: '吹大点',   desc: '膨胀持续 +1.5 秒', apply: s => { s.skillDurAdd += 1.5; } },
  { id: 'boss',    icon: '💥', name: '铁头功',   desc: '撞击 Boss 伤害 +40%', apply: s => { s.bossDamage *= 1.4; } },
];

export const ONOMATOPOEIA = ['噗！', '咕嘟！', '吧唧！', '啵！', '咕噜！', '嗦！'];
export const BIG_ONOMATOPOEIA = ['嗷呜！', '咕咚！！', '吞了！'];
