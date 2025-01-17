'use strict';
self._i = ['钢琴块2模拟器', [1, 1, 1], 1614358089, 1737106704];
document.oncontextmenu = e => e.preventDefault();
const canvas = document.getElementById('stage');
self.addEventListener('resize', resize);
resize();
// const item = [];
const clicks = [];
// 适配PC鼠标
let isMouseDown = false;
canvas.addEventListener('mousedown', evt => {
  evt.preventDefault();
  if (isMouseDown) mouseup();
  else {
    clicks[0] = {
      x1: evt.pageX * self.devicePixelRatio / canvas.width,
      y1: evt.pageY * self.devicePixelRatio / canvas.height
    };
    isMouseDown = true;
  }
});
canvas.addEventListener('mousemove', evt => {
  evt.preventDefault();
  if (isMouseDown) {
    clicks[0].x2 = evt.pageX * self.devicePixelRatio / canvas.width;
    clicks[0].y2 = evt.pageY * self.devicePixelRatio / canvas.height;
  }
});
canvas.addEventListener('mouseup', evt => {
  evt.preventDefault();
  if (isMouseDown) mouseup();
});
function mouseup() {
  console.log(clicks[0]);
  // tmp[0] = {};
  isMouseDown = false;
}
//
const erm = { part: 0, track: 0, index: 0 };
/** @param {string} str */
const unexpected = str => new SyntaxError(`Unexpected '${str}' at position ${erm.index} (part ${erm.part} track ${erm.track + 1})`);
const restMap = { Q: 8, R: 4, S: 2, T: 1, U: 0.5, V: 0.25, W: 0.125, X: 0.0625, Y: 0.03125 };
const beatsMap = { H: 8, I: 4, J: 2, K: 1, L: 0.5, M: 0.25, N: 0.125, O: 0.0625, P: 0.03125 };
function lenToNum(len, type) {
  return Array.from(len).reduce((sum, char) => sum + ((type ? beatsMap : restMap)[char] || 0), 0);
}
const playTypes = {
  '1<': 1, // 普通
  '2<': 2, // 单黑
  '3<': 3, // 狂戳
  '5<': 5, // 双黑
  '6<': 6, // 长块
  '7<': 7, // 滑块
  '8<': 8, // 连滑
  '9<': 9, // 伴奏
  '10<': 10 // 爆裂
};
const pitches = ['A-3', '#A-3', 'B-3', 'C-2', '#C-2', 'D-2', '#D-2', 'E-2', 'F-2', '#F-2', 'G-2', '#G-2', 'A-2', '#A-2', 'B-2', 'C-1', '#C-1', 'D-1', '#D-1', 'E-1', 'F-1', '#F-1', 'G-1', '#G-1', 'A-1', '#A-1', 'B-1', 'c', '#c', 'd', '#d', 'e', 'f', '#f', 'g', '#g', 'a', '#a', 'b', 'c1', '#c1', 'd1', '#d1', 'e1', 'f1', '#f1', 'g1', '#g1', 'a1', '#a1', 'b1', 'c2', '#c2', 'd2', '#d2', 'e2', 'f2', '#f2', 'g2', '#g2', 'a2', '#a2', 'b2', 'c3', '#c3', 'd3', '#d3', 'e3', 'f3', '#f3', 'g3', '#g3', 'a3', '#a3', 'b3', 'c4', '#c4', 'd4', '#d4', 'e4', 'f4', '#f4', 'g4', '#g4', 'a4', '#a4', 'b4', 'c5', 'mute', 'chuanshao'];
const table = {};
pitches.forEach(i => table[i] = true);
//
function speedGen(info) {
  const infoBak = JSON.parse(JSON.stringify(info));
  return function(index = 0) {
    while (index >= infoBak.length) {
      const currentIndex = infoBak.length;
      const { bpm: lastBpm, beats: lastBeats } = infoBak[currentIndex - 1];
      const currentBeats = info[currentIndex % info.length].beats;
      const loopTimes = Math.floor(currentIndex / info.length);
      const newBpm = getNewBpm(lastBpm, lastBeats, currentBeats, loopTimes);
      infoBak[currentIndex] = { bpm: newBpm, beats: currentBeats };
    }
    return infoBak[index];
  };
}
function getNewBpm(lastBpm, lastBeats, currentBeats, loopTimes) {
  const tpm = lastBpm / lastBeats;
  const constant = loopTimes < 3 ? 100 : 130;
  const factor = Math.max(1.3 - (tpm - constant) * 0.001, 1.04);
  return Math.trunc(factor * tpm * currentBeats);
}
let bpm = [];
let currentBpm = 90;
let currentBeats = 0.5;
let key = 4; // 轨道数量
let songName = '小星星';
let soundfont = '8rock11e';
const sheet = [];
const info = [];
const img = {};
const aud = {};
let startTime = 0;
let /** @type {(index?:number)=>{bpm:number;beats:number}} */ getSpeed;
const loading = document.getElementById('cover-loading');
if (!window.AudioContext) window.AudioContext = window.webkitAudioContext;
const actx = new AudioContext();
init();
// 初始化
function init() {
  // 加载本地json谱面
  const localSave = JSON.parse(self.localStorage.getItem('pt2'));
  console.log(localSave);
  if (localSave) {
    ({ songName, bpm, key, soundfont } = localSave);
    bpm = String(bpm).split(',').filter(a => a).map(n => parseInt(n));
    key = Math.max(0, key) || 4;
    loadJson(localSave.json);
  } else {
    // 加载默认json谱面
    const xhr = new XMLHttpRequest();
    xhr.open('get', 'src/example.json');
    xhr.send();
    xhr.onload = () => loadJson(xhr.responseText);
  }
  // 加载json
  function loadJson(json) {
    document.getElementById('cfg-songName').value = songName;
    document.getElementById('cfg-json').value = json;
    document.getElementById('cfg-bpm').value = bpm;
    document.getElementById('cfg-key').value = key;
    document.getElementById('cfg-soundfont').value = soundfont;
    try {
      const data = JSON.parse(json);
      console.log(data); // test
      let baseBpm = data.baseBpm || 120;
      const musics = data.musics.sort((a, b) => a.id - b.id);
      let baseBeats = musics[0].baseBeats || 0.5;
      console.log(musics); // test
      for (const i of musics) {
        erm.part = i.id;
        erm.track = 0;
        const base = strToTiles(i.scores[0]);
        for (let j = 1; j < i.scores.length; j++) {
          let baseDur = 0;
          let baseIdx = 0;
          let branchDur = 0;
          let branchIdx = 0;
          erm.track = j;
          const branch = strToTiles(i.scores[j]);
          while (baseIdx < base.length && branchIdx < branch.length) {
            if (branchDur < baseDur + base[baseIdx].len) {
              if (branch[branchIdx].notes[0]) {
                base[baseIdx].notes.push({
                  note: branch[branchIdx].notes[0].note,
                  start: branchDur - baseDur,
                  len: branch[branchIdx].notes[0].len
                });
              }
              branchDur += branch[branchIdx++].len;
            } else baseDur += base[baseIdx++].len;
          }
        }
        const realscore = [];
        for (const j of base) {
          if (j.type) {
            const hlen = j.len / i.baseBeats;
            // console.log(j.notes);
            realscore.push({
              type: Number(j.type) === 1 && j.notes.flat().length ? hlen > 1 ? 6 : 2 : j.type,
              scores: [j.notes],
              hlen
            });
          } else {
            realscore[realscore.length - 1].scores.push(j.notes);
            realscore[realscore.length - 1].hlen += j.len / i.baseBeats;
          }
        }
        sheet.push(realscore);
        if (i.bpm != null) ({ bpm: baseBpm, baseBeats } = i);
        info.push({ bpm: Math.trunc(baseBpm / baseBeats * i.baseBeats), beats: i.baseBeats });
      }
      console.log(sheet); // 完整谱面
      document.getElementById('cfg-bpm').placeholder = info.map(a => a.bpm);
      if (bpm.length) {
        info.forEach((v, i) => {
          const ii = bpm.length - 1;
          const bpm2 = Math.trunc(bpm[ii] / info[ii].beats * v.beats);
          v.bpm = bpm[i] == null ? bpm2 : bpm[i];
        });
      }
      console.log(info);
      getSpeed = speedGen(info);
      self.localStorage.setItem('pt2', JSON.stringify({ songName, json, bpm, key, soundfont }));
      loadAudio();
    } catch (err) {
      loading.innerHTML = `加载json出错：<br><br>${err}<br><br><input type="button" onclick="self.localStorage.removeItem('pt2');location.reload(true);" value="点击重置">`;
      // 以后换种错误显示
      canvas.style.display = 'none';
      console.log(err);
    }
  }
  // 加载音色
  function loadAudio() {
    const size0 = {
      'app': 2700975,
      '8rock11e': 3300100,
      'umod': 6511396
    }; // 表示文件大小，以后会优化
    const xhr = new XMLHttpRequest();
    xhr.open('get', `src/music/${soundfont}/piano.dat`);
    xhr.responseType = 'arraybuffer';
    xhr.send();
    xhr.onprogress = progress => loading.innerText = `加载音乐资源...(${Math.floor(progress.loaded / size0[soundfont] * 100)}%)`; // 显示加载文件进度
    xhr.onload = () => {
      const dataView = new DataView(xhr.response);
      const size = dataView.getUint32(8, true);
      for (let i = 0; i < size; i++) {
        const idx = dataView.getUint32(12 + i * 16, true);
        const offset = dataView.getUint32(16 + i * 16, true);
        const length = dataView.getUint32(20 + i * 16, true);
        const data = xhr.response.slice(offset, offset + length);
        actx.decodeAudioData(data, data1 => aud[pitches[idx - 21]] = data1);
      }
      loadImage();
    };
  }
  // base64转arraybuffer
  // function base64ToArrayBuffer(base64) {
  //   const binaryStr = atob(base64);
  //   const bytes = new Uint8Array(binaryStr.length);
  //   for (const i in bytes) bytes[i] = binaryStr.charCodeAt(i);
  //   return bytes.buffer;
  // }
  // 加载图片
  function loadImage() {
    const imgsrc = {
      bg1: 'src/loop1_bg_1.jpg',
      bg2: 'src/loop1_bg_2.jpg',
      bg3: 'src/loop1_bg_3.jpg',
      tile_start: 'src/gameImage/tile_start.png',
      tile_black: 'src/gameImage/tile_black.png',
      finish1: 'src/gameImage/1.png',
      finish2: 'src/gameImage/2.png',
      finish3: 'src/gameImage/3.png',
      finish4: 'src/gameImage/4.png',
      long_head: 'src/gameImage/long_head.png',
      long_tap2: 'src/gameImage/long_tap2.png',
      long_light: 'src/gameImage/long_light.png',
      long_tilelight: 'src/gameImage/long_tilelight.png',
      long_finish: 'src/gameImage/long_finish.png'
    };
    let imgNum = Object.keys(imgsrc).length;
    for (const i of Object.keys(imgsrc)) {
      img[i] = new Image();
      img[i].src = imgsrc[i];
      img[i].onload = newFunction;
    }
    function newFunction() {
      loading.innerText = `加载图片资源...(还剩${imgNum}个文件)`;
      if (--imgNum <= 0) {
        document.getElementById('btn-config').classList.remove('hide');
        draw();
      }
    }
  }
}
// 作图
const ctx = canvas.getContext('2d');
let currentScore = 0;
let currentIdx = 0;
let starthpos = key - 2; // 起始纵坐标
let hpos = 0;
let bgLevel = 1;
const bgLevelPos = [];
let speedLevel = 1;
const speedLevelPos = [];
let isStarted = false;
let isPaused = false;
let warr = new Array(key).fill(0);
const stb = Math.floor(Math.random() * key);
const starr = [];
for (let i = 0; i < key; i++) starr.push(i === stb);
const tiles = [
  {
    type: -1,
    hlen: 1,
    hpos: -1,
    scores: [],
    warr: starr
  }
];
let score = 0;
let rabbit = 1; // 加分动画(分数跳动)
function nextPos(arr, type) {
  const loopBoom = () => {
    const errmsg = '你设置的轨道数不足以容纳你的谱面，所以它爆炸了';
    loading.innerHTML = `${errmsg}<br><br><input type="button" onclick="document.getElementById('cfg-key').value=4;document.getElementById('cover-dark').click();" value="点击重置轨道数">`;
    // 以后换种错误显示
    canvas.style.display = 'none';
    return new RangeError(errmsg);
  };
  switch (type) {
    case 5: {
      let result = getDoubleTilePos(arr);
      let loop = 1;
      while (!result && loop++) {
        result = getDoubleTilePos(arr);
        if (loop > 1e3) throw loopBoom();
      }
      return result;
    }
    default: {
      let result = getSingleTilePos(arr);
      let loop = 1;
      while (!result && loop++) {
        result = getSingleTilePos(arr);
        if (loop > 1e3) throw loopBoom();
      }
      return result;
    }
  }
}
function getDoubleTilePos(arr0) {
  if (key === 4) {
    let rand = Math.floor(Math.random() * 2);
    if (arr0[0] === 1 || arr0[2] === 1) rand = 0;
    if (arr0[1] === 1 || arr0[3] === 1) rand = 1;
    return rand ? [1, 0, 1, 0] : [0, 1, 0, 1];
  }
  const arr = [1, 0, 1];
  while (arr.length < key) {
    // 随机插入0
    arr.splice(Math.floor(Math.random() * (arr.length + 1)), 0, 0);
  }
  // 比较arr和arr0，若同时存在1则重新生成
  for (let i = 0; i < key; i++) {
    if (arr[i] && arr0[i]) return null;
  }
  return arr;
}
function getSingleTilePos(arr0) {
  const arr = [1];
  while (arr.length < key) {
    // 随机插入0
    arr.splice(Math.floor(Math.random() * (arr.length + 1)), 0, 0);
  }
  // 比较arr和arr0，若同时存在1则重新生成
  for (let i = 0; i < key; i++) {
    if (arr[i] && arr0[i]) return null;
  }
  return arr;
}
function getLevelImage(level) {
  switch (level) {
    case 1: return img.bg1;
    case 2: return img.bg2;
    default: return img.bg3;
  }
}
function getFinishImage(ended) {
  switch (ended) {
    case 1: return img.finish1;
    case 2: return img.finish2;
    case 3: return img.finish3;
    default: return img.finish4;
  }
}
function getRank(idx) {
  const loopSize = info.length;
  let result = `${Math.floor(idx / loopSize) + 1}-${idx % loopSize + 1}`;
  if (idx < 1) result += ' (0星)';
  else if (idx < 2) result += ' (1星)';
  else if (idx < 3) result += ' (2星)';
  else if (idx < 4) result += ' (3星)';
  else if (idx < 6) result += ' (1冠)';
  else if (idx < 9) result += ' (2冠)';
  else result += ' (3冠)';
  return result;
}
function draw() {
  // 绘制背景
  ctx.fillStyle = '#000';
  ctx.drawImage(getLevelImage(bgLevel), 0, 0, canvas.width, canvas.height);
  ({ bpm: currentBpm, beats: currentBeats } = getSpeed(speedLevel - 1));
  if (bgLevelPos.length && bgLevelPos[0] < starthpos) {
    bgLevelPos.shift();
    bgLevel++;
  }
  if (speedLevelPos.length && speedLevelPos[0] < starthpos) {
    speedLevelPos.shift();
    speedLevel++;
  }
  // 生成tiles
  while (tiles.length < key * 3) {
    if (currentScore < sheet.length) {
      const currentTile = sheet[currentScore][currentIdx++];
      if (currentTile) {
        warr = nextPos(warr, currentTile.type);
        const bb = {
          type: currentTile.type,
          scores: currentTile.scores,
          hlen: currentTile.hlen,
          hpos,
          warr
        };
        hpos += currentTile.hlen;
        tiles.push(bb);
      } else {
        bgLevelPos.push(hpos - 4 + key);
        speedLevelPos.push(hpos - 1 + key);
        currentScore++;
        currentIdx = 0;
      }
    } else currentScore = 0;
  }
  // 绘制tiles
  for (const i of tiles) {
    ctx.scale(canvas.width / key, canvas.height / key);
    const warr0 = i.warr;
    switch (i.type) {
      case -1:
        for (let j = 0; j < warr0.length; j++) {
          if (warr0[j]) {
            if (i.played) ctx.drawImage(getFinishImage(i.ended), j, starthpos - i.hpos - i.hlen, 1, i.hlen);
            else ctx.drawImage(img.tile_start, j, starthpos - i.hpos - i.hlen, 1, i.hlen);
          }
        }
        break;
      case 1:
        break;
      case 2:
        for (let j = 0; j < warr0.length; j++) {
          if (warr0[j]) {
            if (i.played) ctx.drawImage(getFinishImage(i.ended), j, starthpos - i.hpos - i.hlen, 1, i.hlen);
            else ctx.drawImage(img.tile_black, j, starthpos - i.hpos - i.hlen, 1, i.hlen);
          }
        }
        break;
      case 5:
        for (let j = 0; j < warr0.length; j++) {
          if (warr0[j]) {
            if (i.played) ctx.drawImage(getFinishImage(i.ended), j, starthpos - i.hpos - i.hlen, 1, i.hlen);
            else ctx.drawImage(img.tile_black, j, starthpos - i.hpos - i.hlen, 1, i.hlen);
          }
        }
        break;
      case 6:
        for (let j = 0; j < warr0.length; j++) {
          if (warr0[j]) {
            ctx.translate(j, starthpos - i.hpos);
            if (i.played) {
              if (i.ended) {
                ctx.drawImage(img.long_finish, 0, -i.hlen, 1, i.hlen);
                ctx.globalAlpha = Math.max(1 - i.ended / 10, 0);
                ctx.drawImage(img.long_tilelight, 0, -i.hlen, 1, i.hlen);
                ctx.globalAlpha = 1;
              } else {
                ctx.drawImage(img.long_tap2, 0, -i.hlen, 1, i.hlen);
                ctx.drawImage(img.long_tilelight, 0, -i.playing - 0.9, 1, i.playing + 0.9);
                ctx.drawImage(img.long_light, 0, -i.playing - 1, 1, 1); // 0.9083
              }
            } else {
              ctx.drawImage(img.long_tap2, 0, -i.hlen, 1, i.hlen);
              ctx.drawImage(img.long_head, 0, -1.35, 1, 1.35);
            }
            ctx.translate(-j, -(starthpos - i.hpos));
          }
        }
        break;
      default: // 以后加上其他类型
        ctx.filter = 'hue-rotate(-90deg)';
        for (let j = 0; j < warr0.length; j++) {
          if (warr0[j]) {
            ctx.translate(j, starthpos - i.hpos);
            if (i.played) {
              if (i.ended) {
                ctx.drawImage(img.long_finish, 0, -i.hlen, 1, i.hlen);
                ctx.globalAlpha = Math.max(1 - i.ended / 10, 0);
                ctx.drawImage(img.long_tilelight, 0, -i.hlen, 1, i.hlen);
                ctx.globalAlpha = 1;
              } else {
                ctx.drawImage(img.long_tap2, 0, -i.hlen, 1, i.hlen);
                ctx.drawImage(img.long_tilelight, 0, -i.playing - 0.9, 1, i.playing + 0.9);
                ctx.drawImage(img.long_light, 0, -i.playing - 1, 1, 1); // 0.9083
              }
            } else {
              ctx.drawImage(img.long_tap2, 0, -i.hlen, 1, i.hlen);
              ctx.drawImage(img.long_head, 0, -1.35, 1, 1.35);
            }
            ctx.translate(-j, -(starthpos - i.hpos));
          }
        }
        ctx.filter = 'none';
    }
    ctx.resetTransform();
  }
  // 播放tile(自动点击)
  for (const i of tiles) {
    i.playing = starthpos - i.hpos - (key - 1); // 进度(以后1可自行设置)
    if (i.playing > 0) {
      if (!i.played) {
        let reallen = 0;
        for (const j of i.scores) {
          for (const k of j) setTimeout(() => bf(k.note, k.len), (k.start + reallen) * 6e4 / currentBpm);
          if (j[0]) reallen += j[0].len;
        }
        i.played = true;
      }
    }
  }
  // 自动点击tile(得分判定)
  for (const i of tiles) {
    switch (i.type) {
      case -1:
      case 1:
        break;
      case 2:
        if (i.played) {
          if (i.ended) i.ended++;
          else {
            score++;
            rabbit = 1.1;
            i.ended = 1;
          }
        }
        break;
      case 5:
        if (i.played) {
          if (i.ended) i.ended++;
          else {
            score += 4;
            rabbit = 1.1;
            i.ended = 1;
          }
        }
        break;
      case 6:
        if (i.playing > i.hlen - 1) {
          if (i.ended) {
            // 绘制长条得分数字
            for (let j = 0; j < i.warr.length; j++) {
              if (i.warr[j]) {
                ctx.globalAlpha = Math.max(2 - i.ended / 20, 0);
                ctx.font = `${Math.min(canvas.width, canvas.height) * 0.5 / key * (1.2 - Math.abs(i.ended / 100 * -0.1))}px FuturaPTWebCondMedium`;
                ctx.fillStyle = '#09f';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(`+${Math.floor(i.hlen) + 1}`, canvas.width * (j + 0.5) / key, canvas.height * (starthpos - i.hpos - i.hlen) / key);
                ctx.globalAlpha = 1;
              }
            }
            i.ended++;
          } else {
            score += Math.round(i.hlen) + 1;
            rabbit = 1.1;
            i.ended = 1;
          }
        }
        break;
      default: // 以后加上其他类型
        if (i.playing > i.hlen - 1) {
          let scoreDelta = i.hlen;
          if (i.type === 3) scoreDelta = i.scores.length - 1;
          if (i.type === 10) scoreDelta = 0;
          if (i.ended) {
            // 绘制长条得分数字
            ctx.filter = 'hue-rotate(-90deg)';
            for (let j = 0; j < i.warr.length; j++) {
              if (i.warr[j]) {
                ctx.globalAlpha = Math.max(2 - i.ended / 20, 0);
                ctx.font = `${Math.min(canvas.width, canvas.height) * 0.5 / key * (1.2 - Math.abs(i.ended / 100 * -0.1))}px FuturaPTWebCondMedium`;
                ctx.fillStyle = '#09f';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(`+${Math.floor(scoreDelta) + 1}`, canvas.width * (j + 0.5) / key, canvas.height * (starthpos - i.hpos - i.hlen) / key);
                ctx.globalAlpha = 1;
              }
            }
            ctx.filter = 'none';
            i.ended++;
          } else {
            score += Math.round(scoreDelta) + 1;
            rabbit = 1.1;
            i.ended = 1;
          }
        }
    }
  }
  // 释放tile
  if (starthpos - tiles[0].hpos - tiles[0].hlen > key + 1) {
    tiles[0].played = 0;
    tiles.shift();
  }
  if (isStarted && !isPaused) {
    const currentTime = Date.now();
    starthpos += (currentTime - startTime) * currentBpm / currentBeats / 6e4;
    currentBpm -= -(currentTime - startTime) / 1000 * 0; // 加速度
    startTime = currentTime;
  }
  // 绘制开始
  if (!isStarted) {
    ctx.font = `${Math.min(canvas.width, canvas.height) / (key * 2)}px Noto Sans SC`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('开始', canvas.width * (stb + 0.5) / key, canvas.height * (1 - 1.5 / key));
  }
  // 绘制垂直线
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  for (let i = 1; i < key; i++) {
    ctx.beginPath();
    ctx.moveTo(i * canvas.width / key, 0);
    ctx.lineTo(i * canvas.width / key, canvas.height);
    ctx.stroke();
  }
  // 绘制开始界面
  if (!isStarted) {
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, canvas.height * (1 - 1 / key), canvas.width, canvas.height / key);
    ctx.globalAlpha = 1;
    // 绘制文字
    ctx.font = `${Math.min(canvas.width, canvas.height) * 0.3 / key}px FuturaPTWebCondMedium,Noto Sans SC`; // 暂未适配超长宽度
    ctx.fillStyle = '#000';
    ctx.textAlign = 'start';
    ctx.fillText(`歌曲名：${songName}`, canvas.width * 0.2 / key, canvas.height * (1 - 1 / key / 2));
    // 点击开始
    if (clicks[0] && clicks[0].x1 * key > stb && clicks[0].x1 * key < stb + 1 && clicks[0].y1 > 1 - 2.5 / key && clicks[0].y1 < 1 - 1 / key) {
      console.log('start'); // test
      isStarted = true;
      startTime = Date.now();
      document.getElementById('btn-config').classList.add('hide');
      document.getElementById('btn-pause').classList.remove('hide');
    }
  }
  // 绘制分数
  ctx.font = `${Math.min(canvas.width, canvas.height) * 0.18 * rabbit}px FuturaPTWebCondMedium`;
  ctx.fillStyle = '#f44';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(score, canvas.width * 0.5, canvas.height * 0.125);
  if (rabbit > 1) rabbit -= 0.01;
  // debug文本
  const px = 16 * self.devicePixelRatio;
  ctx.font = `${px}px Noto Sans SC`;
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#000';
  ctx.textAlign = 'start';
  ctx.strokeText(`${getRank(speedLevel - 1)}`, px * 0.6, px * 1.6);
  ctx.fillText(`${getRank(speedLevel - 1)}`, px * 0.6, px * 1.6);
  ctx.strokeText(`${(currentBpm / currentBeats / 60).toFixed(3)}`, px * 0.6, px * 2.9);
  ctx.fillText(`${(currentBpm / currentBeats / 60).toFixed(3)}`, px * 0.6, px * 2.9);
  // for (const i in tiles) ctx.fillText(tiles[i].playing, px * 0.6, px * (4.2 + i * 1.3));
  requestAnimationFrame(draw);
}
function resize() {
  canvas.width = self.innerWidth * self.devicePixelRatio;
  canvas.height = self.innerHeight * self.devicePixelRatio;
}
document.getElementById('btn-config').onclick = function() {
  document.getElementById('cover-dark').classList.toggle('hide');
  document.getElementById('view-config').classList.toggle('hide');
  document.getElementById('view-config').classList.toggle('view-config');
  bf('c.e.g', 64);
};
document.getElementById('cover-dark').onclick = () => {
  self.localStorage.setItem('pt2', JSON.stringify({
    songName: document.getElementById('cfg-songName').value,
    json: document.getElementById('cfg-json').value,
    bpm: document.getElementById('cfg-bpm').value,
    key: document.getElementById('cfg-key').value,
    soundfont: document.getElementById('cfg-soundfont').value
  }));
  location.reload(true);
};
document.getElementById('btn-pause').onclick = () => gamePause(1);
document.getElementById('gameover').onclick = () => location.reload(true);
document.getElementById('continue').onclick = () => gamePause(0);
document.addEventListener('visibilitychange', () => {
  if (isStarted && !isPaused) gamePause(1);
});
let pausetime = 0;
function gamePause(mod) {
  document.getElementById('cover-light').classList.toggle('hide');
  document.getElementById('view-pause').classList.toggle('hide');
  document.getElementById('view-pause').classList.toggle('view-pause');
  if (mod) {
    isPaused = true;
    pausetime = Date.now();
    bf('c2.c2.c2');
  } else {
    isPaused = false;
    startTime += Date.now() - pausetime;
  }
}
// 谱面测试
function strToTiles(scores = '') {
  const notes = [];
  const notes2 = parseScore(scores);
  for (const i of notes2) {
    let type = i.type || 1;
    for (const j of i.items) {
      notes.push({ type, notes: j.pitch ? [{ note: j.pitch, start: 0, len: j.beats }] : [], len: j.beats });
      if (type !== 1) type = 0;
    }
  }
  return JSON.parse(JSON.stringify(notes));
}
/** @param {string} scores */
function parseScore(scores) {
  const notes = [];
  // [0:input(single,score+splitter),1:score,2:playType,3:score(withType),4:score(withoutType),5:splitter,6:index,7:input]
  scores.replace(/((\d+<)(.*?)>|(.*?))([,;]|$)/gs, (...arr) => {
    if (arr[2]) {
      const items = [];
      String(arr[3] + arr[5]).replace(/(.*?)([,;]|$)/g, (...arrr) => {
        erm.index = arr[6] + arrr[2].length + arrr[3];
        if (arrr[1] || arrr[2]) items.push({ ...parseNote(arrr[1]), splitter: arrr[2] });
      });
      notes.push({ type: playTypes[arr[2]], items });
    } else if (arr[1] || arr[5]) {
      erm.index = arr[6];
      notes.push({ type: 0, items: [{ ...parseNote(arr[1]), splitter: arr[5] }] });
    }
  });
  return notes;
}
/** @param {string} notestr */
function parseNote(notestr) {
  const note = {
    // isRest: true, // 休止符 改成pitches判断，如果是休止符则pitches为null，否则为数组
    pitch: null, // 音组
    // type: '', // 类似~!@$%^&这种
    effect: null, // {我在这里}
    hasAccent: false, // 重音记号(!)
    beats: 0
  };
  // [0:input(single),1:x,2:beats(rest),3:(!),4:pitches,5:beats(beat),6:x,7:x,8:effect,9:error,10:index,11:input]
  notestr.replace(/^(([Q-Y]+)|(!?)(.*?)\[(.*?)\])($|(.*?)\{(.*?)\})|(.)/gs, (...arr) => {
    if (!arr) return;
    const i = erm.index + arr[10];
    if (arr[9]) throw unexpected(arr[9]);
    if (arr[2] == null) {
      const beatIndex = i + (arr[3] + arr[4]).length;
      erm.index = beatIndex + arr[5].indexOf(']');
      if (arr[5].includes(']')) throw unexpected(']');
      erm.index = beatIndex + arr[5].indexOf('{');
      if (arr[8] == null && arr[5].includes('{')) throw unexpected('{');
      erm.index = beatIndex + arr[5].indexOf('}');
      if (arr[8] != null && arr[5].includes('}')) throw unexpected('}');
      // note.isRest = false;
      note.beats = lenToNum(arr[5], true);
      // pitches
      note.hasAccent = Boolean(arr[3]);
      erm.index = i;
      checkPitch(arr[4]);
      note.pitch = arr[4];
    } else {
      note.beats = lenToNum(arr[2], false);
    }
    if (arr[8] != null) note.effect = arr[8];
  });
  return note;
}
/** @param {string} pitch */
function checkPitch(pitch) {
  const i = erm.index;
  if (pitch.startsWith('(') && pitch.endsWith(')')) {
    // [0:x,1:type,2:pitch,3:index,4:input]
    pitch.slice(1, -1).replace(/(^|[.~@&^$%!])([^.~@&^$%!]+)/gs, (...arr) => {
      if (!arr) return;
      if (!pitches.includes(arr[2])) {
        if (!'QRSTUVWXYZ'.split('').includes(arr[2])) {
          erm.index = i + arr[3] + arr[1].length;
          throw unexpected(arr[2]);
        }
      }
      // 以后加上特殊情况
    });
  // } else if (!pitches.includes(pitch)) throw unexpected(pitch, index);
  } else {
    erm.index = i;
    if (!pitches.includes(pitch)) throw unexpected(pitch);
  }
}
// 音频测试
function bf(str = '', len = 0) {
  let ms = len * 6e4 / currentBpm;
  // console.log(ms);
  // 检查有无括号
  let str1 = str.match(/\((.+)\)/);
  if (str1) str1 = str1[1];
  else str1 = str;
  const ch = str1.match(/[~@&^$%!]/);
  if (ch) {
    const sh = ch[0];
    const zh = str1.split(sh);
    const num = zh.length;
    let tr = false;
    switch (sh) {
      case '@':
        ms *= num === 2 ? 0.1 : 0.1 / (num - 2);
        break;
      case '~':
      case '$':
        ms *= 1.0 / num;
        break;
      case '%':
        ms *= 0.3 / (num - 1);
        break;
      case '!':
        ms *= 0.15 / (num - 1);
        break;
      case '&':
      case '^':
        tr = true;
        break;
      default:
        throw new Error('未知错误');
    }
    if (!tr) {
      zh.forEach((i, idx) => {
        setTimeout(() => {
          for (const j of i.split(/\./)) {
            if (table[j]) bofang(j);
            else throw new Error(`${sh}与${j}冲突`);
          }
        }, ms * idx);
      });
    } else if (num === 2) {
      const ts = Math.ceil(ms * 0.0125);
      if (table[zh[0]] && table[zh[1]]) {
        let flag = 0;
        for (let i = 0; i < ts; i++) {
          // eslint-disable-next-line no-loop-func
          setTimeout(() => {
            bofang(zh[flag % 2]);
            flag++;
          // }, i / 0.015);
          }, i / 0.0125);
        }
      }
    } else throw new Error('颤音过多');
  } else {
    for (const j of str1.split(/\./)) {
      if (table[j]) bofang(j);
      else throw new Error(`${j}冲突`);
    }
  }
  function bofang(j) {
    const bufferSource = actx.createBufferSource();
    bufferSource.buffer = aud[j];
    bufferSource.connect(actx.destination);
    bufferSource.start();
  }
}
