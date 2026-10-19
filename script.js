
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
  title.textContent = "獲得するタイルの並び順";
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

function renderStatus() {
  const placedCount = shelf.reduce(
    (sum, column) => sum + column.length,
    0
  );

  scoreElement.textContent = calculateScore();
  progressElement.textContent =
    `${placedCount} / ${SHELF_COLUMNS * SHELF_ROWS}`;
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

  gameOver = true;

  const finalScore = calculateScore();

  finalScoreElement.textContent = finalScore;
  resultModal.hidden = false;

  messageElement.textContent =
    "ゲーム終了！ 棚が完成しました。";

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
