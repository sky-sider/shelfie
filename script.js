
"use strict";

// ========================================
// 1. ゲームの基本設定
// ========================================

const SHELF_COLUMNS = 5;
const SHELF_ROWS = 6;
const BOARD_COLUMNS = 4;
const BOARD_ROWS = 4;
const MAX_SELECTION = 3;

// タイルの種類
const TILE_TYPES = [
  { id: "book", emoji: "📚", name: "本" },
  { id: "plant", emoji: "🌿", name: "植物" },
  { id: "cat", emoji: "🐈", name: "ネコ" },
  { id: "game", emoji: "🎲", name: "ゲーム" },
  { id: "picture", emoji: "🖼️", name: "額縁" },
  { id: "trophy", emoji: "🏆", name: "トロフィー" }
];

// 同じ種類のタイルのグループ得点
// 原作の隣接グループ得点を参考にした方式
const GROUP_POINTS = {
  3: 2,
  4: 3,
  5: 5,
  6: 8
};


/* ========================================
   メイン目標・サブ目標
======================================== */

const MAIN_OBJECTIVES = [
  {
    id: "M01",
    title: "本のコレクター",
    description: "本を8個以上、本棚に置こう。",
    check: (s) => countTiles(s, "book") >= 8
  },
  {
    id: "M02",
    title: "緑のある暮らし",
    description: "植物を4列以上に置き、そのうち2列以上に各2個以上置こう。",
    check: (s) => {
      const columns = s.filter(
        col => col.filter(t => t && t.id === "plant").length > 0
      );
      const richColumns = s.filter(
        col => col.filter(t => t && t.id === "plant").length >= 2
      );
      return columns.length >= 4 && richColumns.length >= 2;
    }
  },
  {
    id: "M03",
    title: "ネコのいる本棚",
    description: "ネコを4段以上に置こう。",
    check: (s) => countRowsWith(s, "cat") >= 4
  },
  {
    id: "M04",
    title: "充実のコレクション",
    description: "6種類中5種類以上を、それぞれ3個以上集めよう。",
    check: (s) =>
      TILE_TYPES.filter(type => countTiles(s, type.id) >= 3).length >= 5
  },
  {
    id: "M05",
    title: "彩り豊かな棚",
    description: "3種類以上のタイルがある段を4段以上作ろう。",
    check: (s) => countColorfulRows(s, 3) >= 4
  },
  {
    id: "M06",
    title: "グループの達人",
    description: "同じ種類のタイルが4個以上つながったグループを2つ作ろう。",
    check: (s) => countLargeGroups(s, 4) >= 2
  },
  {
    id: "M07",
    title: "読書家の特等席",
    description: "本を6個以上置き、3段以上に分散させよう。",
    check: (s) =>
      countTiles(s, "book") >= 6 && countRowsWith(s, "book") >= 3
  },
  {
    id: "M08",
    title: "ネコの王国",
    description: "ネコを6個以上置き、3列以上に配置しよう。",
    check: (s) =>
      countTiles(s, "cat") >= 6 &&
      s.filter(col => col.some(t => t && t.id === "cat")).length >= 3
  },
  {
    id: "M09",
    title: "横並びコレクション",
    description: "同じ種類のタイルが横に3個以上連続する段を2段作ろう。",
    check: (s) => countHorizontalRuns(s, 3) >= 2
  },
  {
    id: "M10",
    title: "バランスのよい本棚",
    description: "6種類すべてを置き、それぞれを2段以上に分散させよう。",
    check: (s) =>
      TILE_TYPES.every(type => countTiles(s, type.id) >= 1) &&
      TILE_TYPES.every(type => countRowsWith(s, type.id) >= 2)
  },
  {
    id: "M11",
    title: "整った暮らし",
    description: "同じ種類のタイルを2個以上含む段を3段作り、さらに4種類以上のタイルを集めよう。",
    check: (s) =>
      countRowsWithRepeatedType(s, 2) >= 3 &&
      TILE_TYPES.filter(type => countTiles(s, type.id) >= 1).length >= 4
  },
  {
    id: "M12",
    title: "小さな植物園",
    description: "植物を6個以上置き、4段以上に配置しよう。",
    check: (s) =>
      countTiles(s, "plant") >= 6 && countRowsWith(s, "plant") >= 4
  }
];

const SUB_OBJECTIVES = [
  {
    id: "S01",
    title: "グリーンを飾ろう",
    description: "植物を5個以上置こう。",
    check: (s) => countTiles(s, "plant") >= 5
  },
  {
    id: "S02",
    title: "アートギャラリー",
    description: "額縁を3列以上に置こう。",
    check: (s) =>
      s.filter(col => col.some(t => t && t.id === "picture")).length >= 3
  },
  {
    id: "S03",
    title: "遊びと読書",
    description: "本とゲームをそれぞれ4個以上置こう。",
    check: (s) =>
      countTiles(s, "book") >= 4 && countTiles(s, "game") >= 4
  },
  {
    id: "S04",
    title: "栄光のトロフィー",
    description: "トロフィーを3段以上に置こう。",
    check: (s) => countRowsWith(s, "trophy") >= 3
  },
  {
    id: "S05",
    title: "ネコと本のある暮らし",
    description: "ネコを3個以上置き、そのうち2個以上を本に上下左右で隣接させよう。",
    check: (s) =>
      countCatNeighbors(s) >= 2 && countTiles(s, "cat") >= 3
  },
  {
    id: "S06",
    title: "カラフルな本棚",
    description: "3種類以上のタイルがある段を3段作ろう。",
    check: (s) => countColorfulRows(s, 3) >= 3
  },
  {
    id: "S07",
    title: "ゲーム好き",
    description: "ゲームを5個以上置こう。",
    check: (s) => countTiles(s, "game") >= 5
  },
  {
    id: "S08",
    title: "小さな美術館",
    description: "額縁を4個以上置こう。",
    check: (s) => countTiles(s, "picture") >= 4
  },
  {
    id: "S09",
    title: "幸運のお守り",
    description: "トロフィーを4個以上置こう。",
    check: (s) => countTiles(s, "trophy") >= 4
  },
  {
    id: "S10",
    title: "ネコのお昼寝",
    description: "ネコを2段以上に置き、各段に2個以上置こう。",
    check: (s) =>
      countRowsWithAtLeast(s, "cat", 2) >= 2
  },
  {
    id: "S11",
    title: "読書と緑",
    description: "本と植物をそれぞれ4個以上置こう。",
    check: (s) =>
      countTiles(s, "book") >= 4 && countTiles(s, "plant") >= 4
  },
  {
    id: "S12",
    title: "お気に入りの一段",
    description: "同じ種類のタイルを4個以上含む段を2段作ろう。",
    check: (s) => countRowsWithRepeatedType(s, 4) >= 2
  },
  {
    id: "S13",
    title: "小さなミックス",
    description: "1段に4種類以上のタイルを配置しよう。",
    check: (s) => countColorfulRows(s, 4) >= 1
  },
  {
    id: "S14",
    title: "上下のつながり",
    description: "同じ種類のタイルが上下に隣接する組を3組作ろう。",
    check: (s) => countVerticalPairs(s) >= 3
  },
  {
    id: "S15",
    title: "横並びコレクション",
    description: "同じ種類のタイルが左右に隣接する組を3組作ろう。",
    check: (s) => countHorizontalPairs(s) >= 3
  },
  {
    id: "S16",
    title: "バランス上手",
    description: "6種類のタイルをそれぞれ2個以上置こう。",
    check: (s) =>
      TILE_TYPES.every(type => countTiles(s, type.id) >= 2)
  }
];

// 現在のゲームで選ばれた目標
let currentMainObjective = null;
let currentSubObjective = null;

// ゲーム終了時の達成結果
let mainObjectiveAchieved = false;
let subObjectiveAchieved = false;

// ========================================
// 2. ゲームの状態
// ========================================

// 棚は列ごとに管理する。
// shelf[0] が一番左の列。
// 各列の配列の先頭が一番下のタイル。
let shelf = [];

// 共有ボードは16マス。
// null は空きマス。
let board = [];

// 選択中の共有ボードのマス番号
let selectedTiles = [];

// 選択中の棚の列番号
let selectedColumn = null;

// 現在のターン
let turn = 1;

// ゲームが終了しているか
let gameOver = false;

// ========================================
// 3. HTML要素を取得
// ========================================

const shelfElement = document.getElementById("shelf");
const boardElement = document.getElementById("board");

// 獲得するタイルの並べ替えパネルを作成
const selectedOrderElement = document.createElement("section");
selectedOrderElement.id = "selected-order";
selectedOrderElement.className = "selected-order";

// HTMLに用意した並べ替えパネル用の箱を取得
const orderAndButton = document.getElementById("order-and-button");

const scoreElement = document.getElementById("score");
const progressElement = document.getElementById("progress");
const turnElement = document.getElementById("turn");
const messageElement = document.getElementById("message");
const selectionCountElement =
  document.getElementById("selection-count");

const clearButton = document.getElementById("clear-button");
const placeButton = document.getElementById("place-button");
const restartButton = document.getElementById("restart-button");

// 並べ替えパネルと配置ボタンを同じ箱に入れる
orderAndButton.appendChild(selectedOrderElement);
orderAndButton.appendChild(placeButton);

// 「選んだタイルを置く」ボタンを並べ替えパネルの下へ移動
orderAndButton.appendChild(placeButton);

const resultModal = document.getElementById("result-modal");
const finalScoreElement = document.getElementById("final-score");
const resultRestartButton =
  document.getElementById("result-restart");

// 結果画面の完成した棚・得点配分
const resultShelfElement =
  document.getElementById("result-shelf");

const resultBaseScoreElement =
  document.getElementById("result-base-score");

const resultMainBonusElement =
  document.getElementById("result-main-bonus");

const resultSubBonusElement =
  document.getElementById("result-sub-bonus");

const mainObjectiveTitle =
  document.getElementById("main-objective-title");
const mainObjectiveDescription =
  document.getElementById("main-objective-description");
const mainObjectiveStatus =
  document.getElementById("main-objective-status");

const subObjectiveTitle =
  document.getElementById("sub-objective-title");
const subObjectiveDescription =
  document.getElementById("sub-objective-description");
const subObjectiveStatus =
  document.getElementById("sub-objective-status");

// ========================================
// 4. 共通の便利な関数
// ========================================

// ランダムなタイルを1つ作る
function createRandomTile() {
  const typeIndex = Math.floor(
    Math.random() * TILE_TYPES.length
  );

  const type = TILE_TYPES[typeIndex];

  return {
    id: type.id,
    emoji: type.emoji,
    name: type.name
  };
}

// 盤面の行番号を取得する
function getRow(index) {
  return Math.floor(index / BOARD_COLUMNS);
}

// 盤面の列番号を取得する
function getColumn(index) {
  return index % BOARD_COLUMNS;
}

// 2つのマスが上下左右に隣接しているか
function areAdjacent(a, b) {
  const rowA = getRow(a);
  const colA = getColumn(a);
  const rowB = getRow(b);
  const colB = getColumn(b);

  return (
    Math.abs(rowA - rowB) +
    Math.abs(colA - colB)
  ) === 1;
}

// ========================================
// 5. タイルを取得できるか判定
// ========================================

// タイルを取得できるか判定する。
// 今回は左右どちらかが空いているタイルを
// 取得可能とする。
// 選択中のグループ内のマスは空きとして扱う。
function isAccessible(index, group = []) {
  if (board[index] === null) {
    return false;
  }

  const row = getRow(index);
  const col = getColumn(index);

  const top = row > 0 ? index - BOARD_COLUMNS : -1;
  const bottom =
    row < BOARD_ROWS - 1
      ? index + BOARD_COLUMNS
      : -1;

  const left = col > 0 ? index - 1 : -1;
  const right =
    col < BOARD_COLUMNS - 1 ? index + 1 : -1;

  const isFree = (neighborIndex) => {
    if (neighborIndex === -1) {
      return true;
    }

    if (group.includes(neighborIndex)) {
      return true;
    }

    return board[neighborIndex] === null;
  };

  return (
    isFree(top) ||
    isFree(bottom) ||
    isFree(left) ||
    isFree(right)
  );
}

function isValidAccessibleSelection(indices) {
  return indices.every((tileIndex, position) => {
    const previouslySelected = indices.slice(0, position);
    return isAccessible(tileIndex, previouslySelected);
  });
}

// 選択中のタイルが一直線に連続しているか
function isValidGroup(indices) {
  if (indices.length === 0) {
    return true;
  }

  if (indices.length > MAX_SELECTION) {
    return false;
  }

  if (indices.length === 1) {
    return true;
  }

  const rows = indices.map(getRow);
  const columns = indices.map(getColumn);

  const sameRow = rows.every(
    row => row === rows[0]
  );

  const sameColumn = columns.every(
    col => col === columns[0]
  );

  // 横一列でも縦一列でもない
  if (!sameRow && !sameColumn) {
    return false;
  }

  const sorted = [...indices].sort((a, b) => a - b);

  // 横方向では番号が連続する
  if (sameRow) {
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) {
        return false;
      }
    }
  }

  // 縦方向では4ずつ増える
  if (sameColumn) {
    for (let i = 1; i < sorted.length; i++) {
      if (
        sorted[i] !==
        sorted[i - 1] + BOARD_COLUMNS
      ) {
        return false;
      }
    }
  }

  return true;
}

// ========================================
// 6. 共有ボードの描画
// ========================================

function renderBoard() {
  boardElement.innerHTML = "";

  board.forEach((tile, index) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "board-tile";

    const isSelected = selectedTiles.includes(index);

    if (isSelected) {
      button.classList.add("selected");
    }

    if (!tile) {
      button.disabled = true;
      button.classList.add("unavailable");
      button.setAttribute("aria-label", "空きマス");
      boardElement.appendChild(button);
      return;
    }

    button.textContent = tile.emoji;
    button.setAttribute(
      "aria-label",
      `${tile.name}。${isSelected ? "選択中" : "未選択"}`
    );

    button.title = tile.name;

const candidateSelection = selectedTiles.includes(index)
  ? selectedTiles
  : [...selectedTiles, index];

const available =
  candidateSelection.length <= MAX_SELECTION &&
  isValidGroup(candidateSelection) &&
  isValidAccessibleSelection(candidateSelection);

    if (!available && !isSelected) {
      button.classList.add("unavailable");
      button.disabled = true;
    }

    button.addEventListener("click", () => {
      handleTileClick(index);
    });

    boardElement.appendChild(button);
  });
}

// ========================================
// 7. 棚の描画
// ========================================

function renderShelf() {
  shelfElement.innerHTML = "";

  for (
    let col = 0;
    col < SHELF_COLUMNS;
    col++
  ) {
    const columnButton = document.createElement("button");

    columnButton.type = "button";
    columnButton.className = "shelf-column";

    if (selectedColumn === col) {
      columnButton.classList.add("selected");
    }

    if (shelf[col].length >= SHELF_ROWS) {
      columnButton.classList.add("full");
      columnButton.disabled = true;
    }

    columnButton.setAttribute(
      "aria-label",
      `${col + 1}列目、${shelf[col].length}個配置済み`
    );

    // 上から下へ表示する。
    // 配列は下から積み上げて管理している。
    for (
      let row = SHELF_ROWS - 1;
      row >= 0;
      row--
    ) {
      const cell = document.createElement("div");
      cell.className = "shelf-cell";

      const tile = shelf[col][row];

      if (tile) {
        cell.classList.add("filled");
        cell.textContent = tile.emoji;
        cell.title = tile.name;
      } else {
        cell.classList.add("empty");
      }

      columnButton.appendChild(cell);
    }

    columnButton.addEventListener("click", () => {
      handleColumnClick(col);
    });

    shelfElement.appendChild(columnButton);
  }
}

// ========================================
// 結果画面に完成した棚を描画
// ========================================

function renderResultShelf() {
  resultShelfElement.innerHTML = "";

  // 棚を左から右へ描画
  for (let col = 0; col < SHELF_COLUMNS; col++) {
    const column = document.createElement("div");
    column.className = "result-shelf-column";

    // 上段から下段の順に表示
    for (let row = SHELF_ROWS - 1; row >= 0; row--) {
      const cell = document.createElement("div");
      cell.className = "result-shelf-cell";

      const tile = shelf[col][row];

      if (tile) {
        cell.classList.add("filled");
        cell.textContent = tile.emoji;
        cell.title = tile.name;
      } else {
        cell.classList.add("empty");
      }

      column.appendChild(cell);
    }

    resultShelfElement.appendChild(column);
  }
}

// ========================================
// 8. 得点計算
// ========================================

// 棚の上下左右につながった同じ種類のタイルを
// グループとして調べる。
function calculateScore() {
  const visited = new Set();
  let totalScore = 0;

  // 棚の座標を1つの番号に変換する
  function cellIndex(col, row) {
    return row * SHELF_COLUMNS + col;
  }

  // 番号から棚の座標を取り出す
  function coordinates(index) {
    return {
      col: index % SHELF_COLUMNS,
      row: Math.floor(index / SHELF_COLUMNS)
    };
  }

  // 棚の中にあるタイルを平らな配列に変換
  const cells = [];

  for (let row = 0; row < SHELF_ROWS; row++) {
    for (let col = 0; col < SHELF_COLUMNS; col++) {
      // row=0 は棚の一番下
      cells.push(shelf[col][row] || null);
    }
  }

  for (let start = 0; start < cells.length; start++) {
    const startTile = cells[start];

    if (!startTile || visited.has(start)) {
      continue;
    }

    const group = [];
    const stack = [start];

    visited.add(start);

    while (stack.length > 0) {
      const current = stack.pop();
      group.push(current);

      const { col, row } = coordinates(current);

      const neighbors = [
        { col: col - 1, row },
        { col: col + 1, row },
        { col, row: row - 1 },
        { col, row: row + 1 }
      ];

      for (const neighbor of neighbors) {
        if (
          neighbor.col < 0 ||
          neighbor.col >= SHELF_COLUMNS ||
          neighbor.row < 0 ||
          neighbor.row >= SHELF_ROWS
        ) {
          continue;
        }

        const next = cellIndex(
          neighbor.col,
          neighbor.row
        );

        if (
          !visited.has(next) &&
          cells[next] &&
          cells[next].id === startTile.id
        ) {
          visited.add(next);
          stack.push(next);
        }
      }
    }

    // 3個以上の同種グループだけ得点
    if (group.length >= 3) {
      const points = GROUP_POINTS[
        Math.min(group.length, 6)
      ];

      totalScore += points;
    }
  }

  return totalScore;
}


/* ========================================
   目標達成の判定用関数
======================================== */

// 指定した種類のタイルの合計数
function countTiles(s, typeId) {
  return s.reduce(
    (total, column) =>
      total + column.filter(
        tile => tile && tile.id === typeId
      ).length,
    0
  );
}

// 指定した種類が1個以上ある段の数
function countRowsWith(s, typeId) {
  let count = 0;

  for (let row = 0; row < SHELF_ROWS; row++) {
    const hasTile = s.some(
      column => column[row] && column[row].id === typeId
    );

    if (hasTile) count++;
  }

  return count;
}

// 指定した種類数以上のタイルがある段の数
function countColorfulRows(s, minimumTypes) {
  let count = 0;

  for (let row = 0; row < SHELF_ROWS; row++) {
    const types = new Set();

    for (let col = 0; col < SHELF_COLUMNS; col++) {
      const tile = s[col][row];

      if (tile) types.add(tile.id);
    }

    if (types.size >= minimumTypes) count++;
  }

  return count;
}

// 指定個数以上でつながる同種グループの数
function countLargeGroups(s, minimumSize) {
  const visited = new Set();
  let largeGroups = 0;

  function indexOf(col, row) {
    return row * SHELF_COLUMNS + col;
  }

  function tileAt(index) {
    const col = index % SHELF_COLUMNS;
    const row = Math.floor(index / SHELF_COLUMNS);
    return s[col][row] || null;
  }

  for (let start = 0; start < SHELF_COLUMNS * SHELF_ROWS; start++) {
    const startTile = tileAt(start);

    if (!startTile || visited.has(start)) continue;

    const stack = [start];
    const group = [];

    visited.add(start);

    while (stack.length > 0) {
      const current = stack.pop();
      group.push(current);

      const col = current % SHELF_COLUMNS;
      const row = Math.floor(current / SHELF_COLUMNS);

      const neighbors = [
        [col - 1, row],
        [col + 1, row],
        [col, row - 1],
        [col, row + 1]
      ];

      for (const [nextCol, nextRow] of neighbors) {
        if (
          nextCol < 0 || nextCol >= SHELF_COLUMNS ||
          nextRow < 0 || nextRow >= SHELF_ROWS
        ) continue;

        const next = indexOf(nextCol, nextRow);
        const nextTile = tileAt(next);

        if (
          !visited.has(next) &&
          nextTile &&
          nextTile.id === startTile.id
        ) {
          visited.add(next);
          stack.push(next);
        }
      }
    }

    if (group.length >= minimumSize) {
      largeGroups++;
    }
  }

  return largeGroups;
}

// 本に上下左右で隣接しているネコの数
function countCatNeighbors(s) {
  let count = 0;

  for (let col = 0; col < SHELF_COLUMNS; col++) {
    for (let row = 0; row < SHELF_ROWS; row++) {
      const tile = s[col][row];

      if (!tile || tile.id !== "cat") continue;

      const neighbors = [
        [col - 1, row],
        [col + 1, row],
        [col, row - 1],
        [col, row + 1]
      ];

      const touchesBook = neighbors.some(
        ([c, r]) =>
          c >= 0 && c < SHELF_COLUMNS &&
          r >= 0 && r < SHELF_ROWS &&
          s[c][r] && s[c][r].id === "book"
      );

      if (touchesBook) count++;
    }
  }

  return count;
}

function countHorizontalRuns(s, minimumLength) {
  let count = 0;

  for (let row = 0; row < SHELF_ROWS; row++) {
    let currentType = null;
    let runLength = 0;

    for (let col = 0; col < SHELF_COLUMNS; col++) {
      const tile = s[col][row];

      if (tile && tile.id === currentType) {
        runLength++;
      } else {
        if (runLength >= minimumLength) {
          count++;
        }

        currentType = tile ? tile.id : null;
        runLength = tile ? 1 : 0;
      }
    }

    if (runLength >= minimumLength) {
      count++;
    }
  }

  return count;
}

function countHorizontalPairs(s) {
  let count = 0;

  for (let row = 0; row < SHELF_ROWS; row++) {
    for (let col = 0; col < SHELF_COLUMNS - 1; col++) {
      const tile = s[col][row];
      const right = s[col + 1][row];

      if (tile && right && tile.id === right.id) {
        count++;
      }
    }
  }

  return count;
}

function countVerticalPairs(s) {
  let count = 0;

  for (let col = 0; col < SHELF_COLUMNS; col++) {
    for (let row = 0; row < SHELF_ROWS - 1; row++) {
      const tile = s[col][row];
      const below = s[col][row + 1];

      if (tile && below && tile.id === below.id) {
        count++;
      }
    }
  }

  return count;
}

function countRowsWithRepeatedType(s, minimumCount) {
  let count = 0;

  for (let row = 0; row < SHELF_ROWS; row++) {
    const typeCounts = {};

    for (let col = 0; col < SHELF_COLUMNS; col++) {
      const tile = s[col][row];

      if (tile) {
        typeCounts[tile.id] = (typeCounts[tile.id] || 0) + 1;
      }
    }

    if (Object.values(typeCounts).some(total => total >= minimumCount)) {
      count++;
    }
  }

  return count;
}

function countRowsWithAtLeast(s, typeId, minimumCount) {
  let count = 0;

  for (let row = 0; row < SHELF_ROWS; row++) {
    let rowCount = 0;

    for (let col = 0; col < SHELF_COLUMNS; col++) {
      const tile = s[col][row];

      if (tile && tile.id === typeId) {
        rowCount++;
      }
    }

    if (rowCount >= minimumCount) {
      count++;
    }
  }

  return count;
}

// ========================================
// 9. 状況表示の更新
// ========================================


 // ========================================
// 選択中のタイルを並べ替える
// ========================================

function renderSelectedOrder() {
  selectedOrderElement.innerHTML = "";

  if (selectedTiles.length === 0) {
    selectedOrderElement.hidden = true;
    return;
  }

  selectedOrderElement.hidden = false;

  const title = document.createElement("h3");
  title.textContent = "獲得したタイルを棚に入れる";
  selectedOrderElement.appendChild(title);

  const description = document.createElement("p");
  description.className = "selected-order-description";
  description.textContent =
    "下にあるタイルほど、本棚の下段に置かれます。↑↓で順番を変更できます。\n順番を決めたら、タイルを置く列を選んで「選んだタイルを置く」ボタンを押してください。";
  selectedOrderElement.appendChild(description);

  const list = document.createElement("div");
  list.className = "selected-order-list";

  selectedTiles.forEach((boardIndex, position) => {
    const tile = board[boardIndex];

    if (!tile) {
      return;
    }

    const item = document.createElement("div");
    item.className = "selected-order-item";

    const tileInfo = document.createElement("div");
    tileInfo.className = "selected-order-tile";

    const emoji = document.createElement("span");
    emoji.className = "selected-order-emoji";
    emoji.textContent = tile.emoji;

    const name = document.createElement("span");
    name.textContent = tile.name;

    tileInfo.appendChild(emoji);
    tileInfo.appendChild(name);

    const controls = document.createElement("div");
    controls.className = "selected-order-controls";

    const upButton = document.createElement("button");
    upButton.type = "button";
    upButton.textContent = "↑";
    upButton.setAttribute("aria-label", `${tile.name}を1つ上へ`);
    upButton.disabled = position === 0;

    upButton.addEventListener("click", () => {
      if (position === 0) return;

      [
        selectedTiles[position - 1],
        selectedTiles[position]
      ] = [
        selectedTiles[position],
        selectedTiles[position - 1]
      ];

      renderAll();
    });

    const downButton = document.createElement("button");
    downButton.type = "button";
    downButton.textContent = "↓";
    downButton.setAttribute("aria-label", `${tile.name}を1つ下へ`);
    downButton.disabled =
      position === selectedTiles.length - 1;

    downButton.addEventListener("click", () => {
      if (position >= selectedTiles.length - 1) return;

      [
        selectedTiles[position],
        selectedTiles[position + 1]
      ] = [
        selectedTiles[position + 1],
        selectedTiles[position]
      ];

      renderAll();
    });

    controls.appendChild(upButton);
    controls.appendChild(downButton);

    item.appendChild(tileInfo);
    item.appendChild(controls);
    list.appendChild(item);
  });

  selectedOrderElement.appendChild(list);
}

function renderObjectives() {
  if (!currentMainObjective || !currentSubObjective) {
    return;
  }

  mainObjectiveTitle.textContent =
    currentMainObjective.title;
  mainObjectiveDescription.textContent =
    currentMainObjective.description;

  subObjectiveTitle.textContent =
    currentSubObjective.title;
  subObjectiveDescription.textContent =
    currentSubObjective.description;

  if (gameOver) {
    mainObjectiveStatus.textContent =
      mainObjectiveAchieved
        ? "達成！ +15点"
        : "未達成";

    subObjectiveStatus.textContent =
      subObjectiveAchieved
        ? "達成！ +6点"
        : "未達成";

    mainObjectiveStatus.classList.toggle(
      "achieved",
      mainObjectiveAchieved
    );

    subObjectiveStatus.classList.toggle(
      "achieved",
      subObjectiveAchieved
    );
  } else {
    mainObjectiveStatus.textContent = "挑戦中";
    subObjectiveStatus.textContent = "挑戦中";

    mainObjectiveStatus.classList.remove("achieved");
    subObjectiveStatus.classList.remove("achieved");
  }
}

function renderStatus() {
  const placedCount = shelf.reduce(
    (sum, column) => sum + column.length,
    0
  );

  progressElement.textContent =
    `${placedCount} / ${SHELF_COLUMNS * SHELF_ROWS}`;
  const progressBarElement =
    document.getElementById("progress-bar");

  if (progressBarElement) {
    const completionRate =
      (placedCount / (SHELF_COLUMNS * SHELF_ROWS)) * 100;

    progressBarElement.style.width =
      `${completionRate}%`;
  }
  turnElement.textContent = turn;

  selectionCountElement.textContent =
    `${selectedTiles.length} / ${MAX_SELECTION} 個`;

  // タイルを選択し、置く列も選択していて、
  // その列に十分な空きがある場合だけ実行可能。
  const canPlace =
    selectedTiles.length > 0 &&
    selectedColumn !== null &&
    selectedTiles.length <=
      SHELF_ROWS - shelf[selectedColumn].length &&
    !gameOver;

  placeButton.disabled = !canPlace;
  clearButton.disabled =
    selectedTiles.length === 0 &&
    selectedColumn === null;
}

 // 画面全体の更新
function renderAll() {
  renderBoard();
  renderShelf();
  renderSelectedOrder();
  renderStatus();
  renderObjectives();
}

// ========================================
// 10. タイルを選択する
// ========================================

function handleTileClick(index) {
  if (gameOver || !board[index]) {
    return;
  }

  // 選択済みなら解除
  if (selectedTiles.includes(index)) {
    const remainingSelection = selectedTiles.filter(
      tileIndex => tileIndex !== index
    );

    if (!isValidAccessibleSelection(remainingSelection)) {
      messageElement.textContent =
        "このタイルを解除すると、残りのタイルが取得条件を満たさなくなります。";

      return;
    }

    selectedTiles = remainingSelection;

    messageElement.textContent =
      "選択を解除しました。";

    renderAll();
    return;
  }

  if (selectedTiles.length >= MAX_SELECTION) {
    messageElement.textContent =
      "一度に選べるタイルは3個までです。";

    return;
  }

  const nextSelection = [...selectedTiles, index];

  // 同じ直線上で連続しているかを確認
  if (!isValidGroup(nextSelection)) {
    messageElement.textContent =
      "タイルは同じ横列または縦列から、連続して選んでください。";

    return;
  }

  // 選択グループ全体を取り除く想定で、
  // 各タイルが取得可能か確認
const allAccessible =
  isValidAccessibleSelection(nextSelection);

  if (!allAccessible) {
    messageElement.textContent =
      "そのタイルは取得できません。左右どちらかが空いているタイルを選んでください。";

    return;
  }

  selectedTiles = nextSelection;

  messageElement.textContent =
    `${selectedTiles.length}個のタイルを選択中です。置く列を選んでください。`;

  renderAll();
}

// ========================================
// 11. 棚の列を選択する
// ========================================

function handleColumnClick(col) {
  if (gameOver) {
    return;
  }

  if (shelf[col].length >= SHELF_ROWS) {
    messageElement.textContent =
      "この列は満杯です。別の列を選んでください。";

    return;
  }

  if (
    selectedTiles.length > 0 &&
    selectedTiles.length >
      SHELF_ROWS - shelf[col].length
  ) {
    messageElement.textContent =
      "この列には選んだタイルがすべて入りません。別の列を選んでください。";

    return;
  }

  selectedColumn = col;

  if (selectedTiles.length === 0) {
    messageElement.textContent =
      `${col + 1}列目を選択しました。先に共有ボードからタイルを選んでください。`;
  } else {
    messageElement.textContent =
      `${col + 1}列目を選択中です。「選んだタイルを置く」を押してください。`;
  }

  renderAll();
}

// ========================================
// 12. 選択したタイルを棚に置く
// ========================================

function placeSelectedTiles() {
  if (
    gameOver ||
    selectedTiles.length === 0 ||
    selectedColumn === null
  ) {
    return;
  }

  const col = selectedColumn;

  // 空きマスが足りない場合は置かない
  if (
    selectedTiles.length >
    SHELF_ROWS - shelf[col].length
  ) {
    messageElement.textContent =
      "選択した列の空きマスが足りません。";

    return;
  }

  // 今回は共有ボードの左上から右下への順に配置。
  // 後の段階で、配置順を選べる機能に拡張できる。

 // 選択した順番のまま、本棚の一番下から積み上げる
// リストの下から上へ、本棚の下から順に積み上げる
for (const index of [...selectedTiles].reverse()) {
  shelf[col].push(board[index]);
  board[index] = null;
}

  selectedTiles = [];
  selectedColumn = null;

  // ターン終了時に空きマスをまとめて補充
  refillBoard();

  turn++;

  renderAll();

  messageElement.textContent =
    "配置しました。共有ボードを補充しました。次のタイルを選んでください。";

  // 棚がすべて埋まったら終了
  checkGameOver();
}

// ========================================
// 13. 共有ボードの補充
// ========================================

function refillBoard() {
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      board[i] = createRandomTile();
    }
  }
}

// ========================================
// 14. 選択を解除
// ========================================

function clearSelection() {
  selectedTiles = [];
  selectedColumn = null;

  messageElement.textContent =
    "選択を解除しました。";

  renderAll();
}

// ========================================
// 15. ゲーム終了の判定
// ========================================

function checkGameOver() {
  const placedCount = shelf.reduce(
    (sum, column) => sum + column.length,
    0
  );

  if (placedCount < SHELF_COLUMNS * SHELF_ROWS) {
    return;
  }

  if (gameOver) return;

  gameOver = true;

  // メイン目標とサブ目標の達成判定
  mainObjectiveAchieved =
    currentMainObjective.check(shelf);

  subObjectiveAchieved =
    currentSubObjective.check(shelf);

  // 通常得点
  const baseScore = calculateScore();

  // 目標ボーナス
  const bonusScore =
    (mainObjectiveAchieved ? 15 : 0) +
    (subObjectiveAchieved ? 6 : 0);

  // 最終得点
  const finalScore = baseScore + bonusScore;

  // 結果画面に完成した棚を表示
  renderResultShelf();

  // 得点の内訳を表示
  resultBaseScoreElement.textContent =
    `${baseScore}点`;

  resultMainBonusElement.textContent =
    `${mainObjectiveAchieved ? 15 : 0}点`;

  resultSubBonusElement.textContent =
    `${subObjectiveAchieved ? 6 : 0}点`;

  finalScoreElement.textContent = finalScore;
  resultModal.hidden = false;

  const bonusMessage =
    bonusScore > 0
      ? ` 目標ボーナス +${bonusScore}点！`
      : " 目標ボーナスはありませんでした。";

  messageElement.textContent =
    `ゲーム終了！ 棚が完成しました。${bonusMessage}`;

  renderAll();
}

// ========================================
// 16. 新しいゲームを開始
// ========================================

function startNewGame() {
  shelf = Array.from(
    { length: SHELF_COLUMNS },
    () => []
  );

  board = Array.from(
    { length: BOARD_COLUMNS * BOARD_ROWS },
    () => createRandomTile()
  );

  selectedTiles = [];
  selectedColumn = null;
  turn = 1;
  gameOver = false;

  // メイン目標をランダムに選ぶ
  currentMainObjective =
    MAIN_OBJECTIVES[
      Math.floor(Math.random() * MAIN_OBJECTIVES.length)
    ];

// サブ目標をランダムに選ぶ
currentSubObjective =
  SUB_OBJECTIVES[
    Math.floor(Math.random() * SUB_OBJECTIVES.length)
  ];

  // 目標の達成状態をリセット
  mainObjectiveAchieved = false;
  subObjectiveAchieved = false;

  resultModal.hidden = true;

  messageElement.textContent =
    "タイルを1〜3個選び、置きたい列を選択してください。";

  renderAll();
}

// ========================================
// 17. ボタンの動作を登録
// ========================================

clearButton.addEventListener(
  "click",
  clearSelection
);

placeButton.addEventListener(
  "click",
  placeSelectedTiles
);

restartButton.addEventListener(
  "click",
  startNewGame
);

resultRestartButton.addEventListener(
  "click",
  startNewGame
);

// ========================================
// 18. ゲーム開始
// ========================================

startNewGame();

/* ========================================
   結果画面全体を画像として保存
======================================== */

const saveResultImageButton =
  document.getElementById("save-result-image");

saveResultImageButton.addEventListener("click", async () => {
  if (typeof html2canvas === "undefined") {
    alert("画像保存機能を読み込めませんでした。インターネット接続を確認してください。");
    return;
  }

  const resultCard =
    document.querySelector("#result-modal .modal-card");

  if (!resultCard) {
    alert("結果画面が見つかりませんでした。");
    return;
  }

  saveResultImageButton.disabled = true;
  saveResultImageButton.textContent = "画像を作成中…";

  // 元の表示設定を記録
  const originalMaxHeight = resultCard.style.maxHeight;
  const originalOverflowY = resultCard.style.overflowY;
  const originalModalAlign =
    document.querySelector("#result-modal").style.alignItems;
  const originalScrollTop = resultCard.scrollTop;

  // ボタンの元の表示状態を記録
  const originalSaveButtonDisplay =
    saveResultImageButton.style.display;

  const originalRestartButtonDisplay =
    resultRestartButton.style.display;

  try {
    // 一時的にスクロール制限を解除して全体を表示
    resultCard.style.maxHeight = "none";
    resultCard.style.overflowY = "visible";
    // 画像にボタンを含めないように一時的に非表示
    saveResultImageButton.style.display = "none";
    resultRestartButton.style.display = "none";

    const modal = document.querySelector("#result-modal");
    modal.style.alignItems = "flex-start";

    // レイアウト更新を反映
    await new Promise(resolve => requestAnimationFrame(resolve));

    const fullHeight = resultCard.scrollHeight;

    const canvas = await html2canvas(resultCard, {
      backgroundColor: "#fffdf8",
      scale: 2,
      useCORS: true,
      width: resultCard.scrollWidth,
      height: fullHeight,
      windowWidth: Math.max(
        document.documentElement.clientWidth,
        resultCard.scrollWidth
      ),
      windowHeight: Math.max(
        window.innerHeight,
        fullHeight
      ),
      scrollX: 0,
      scrollY: 0
    });

    const link = document.createElement("a");
    link.download = "MY-SHELFIE-result.png";
    link.href = canvas.toDataURL("image/png");
    link.click();

  } catch (error) {
    console.error("画像保存エラー:", error);
    alert("画像を保存できませんでした。もう一度お試しください。");

  } finally {
    // 表示設定を元に戻す
    // ボタンを元の表示状態に戻す
    saveResultImageButton.style.display =
      originalSaveButtonDisplay;

    resultRestartButton.style.display =
      originalRestartButtonDisplay;
    resultCard.style.maxHeight = originalMaxHeight;
    resultCard.style.overflowY = originalOverflowY;
    resultCard.scrollTop = originalScrollTop;

    document.querySelector("#result-modal").style.alignItems =
      originalModalAlign;

    saveResultImageButton.disabled = false;
    saveResultImageButton.textContent = "結果を画像で保存";
  }
});

