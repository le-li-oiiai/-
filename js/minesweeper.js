// ==========================================
// 💣 扫雷游戏逻辑
// ==========================================
let ms_rows = 9, ms_cols = 9, ms_mineCount = 10;
let ms_board = [], ms_cellElements = [];
let ms_isGameOver = false, ms_isFirstClick = true, ms_revealedCount = 0, ms_flagsPlaced = 0;
let ms_timerInterval = null, ms_timeElapsed = 0;
let ms_currentMode = 'reveal';
let ms_gameHistory = [];

// 获取 DOM
const ms_boardEl = document.getElementById('game-board');
const ms_difficultySelect = document.getElementById('difficulty');
const ms_restartBtn = document.getElementById('restart-btn');
const ms_statusText = document.getElementById('status-text');
const ms_timeDisplay = document.getElementById('time-display');
const ms_historyList = document.getElementById('history-list');
const ms_btnReveal = document.getElementById('btn-reveal');
const ms_btnFlag = document.getElementById('btn-flag');
const ms_statFlags = document.getElementById('stat-flags');
const ms_statSafe = document.getElementById('stat-safe');

function initGame() {
    ms_isGameOver = false; ms_isFirstClick = true; ms_revealedCount = 0; ms_flagsPlaced = 0;
    ms_stopTimer(); ms_timeElapsed = 0; ms_timeDisplay.textContent = 0;
    ms_statusText.textContent = '点击格子开始游戏'; ms_statusText.style.color = '#3498db';

    const diff = ms_difficultySelect.value;
    if (diff === 'easy') { ms_rows = 9; ms_cols = 9; ms_mineCount = 10; }
    else if (diff === 'medium') { ms_rows = 16; ms_cols = 16; ms_mineCount = 40; }
    else if (diff === 'hard') { ms_rows = 16; ms_cols = 30; ms_mineCount = 99; }

    ms_boardEl.style.gridTemplateColumns = `repeat(${ms_cols}, ${window.innerWidth < 600 ? '24px' : '30px'})`;
    ms_boardEl.innerHTML = '';
    
    ms_board = Array(ms_rows).fill().map(() => Array(ms_cols).fill(0));
    ms_cellElements = Array(ms_rows).fill().map(() => Array(ms_cols).fill(null));

    for (let r = 0; r < ms_rows; r++) {
        for (let c = 0; c < ms_cols; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.addEventListener('click', () => { if (ms_currentMode === 'reveal') ms_handleReveal(r, c); else ms_handleFlag(r, c); });
            cell.addEventListener('contextmenu', (e) => { e.preventDefault(); ms_handleFlag(r, c); });
            ms_boardEl.appendChild(cell);
            ms_cellElements[r][c] = cell;
        }
    }
    ms_updateStats();
}

function ms_startTimer() {
    ms_stopTimer(); ms_timeElapsed = 0; ms_timeDisplay.textContent = ms_timeElapsed;
    ms_timerInterval = setInterval(() => { ms_timeElapsed++; ms_timeDisplay.textContent = ms_timeElapsed; }, 1000);
}
function ms_stopTimer() { if (ms_timerInterval) clearInterval(ms_timerInterval); }

function ms_updateStats() {
    ms_statFlags.textContent = ms_flagsPlaced;
    ms_statSafe.textContent = (ms_rows * ms_cols) - ms_revealedCount;
}

function ms_placeMines(firstR, firstC) {
    let minesPlaced = 0;
    while (minesPlaced < ms_mineCount) {
        let r = Math.floor(Math.random() * ms_rows), c = Math.floor(Math.random() * ms_cols);
        if (ms_board[r][c] === -1 || (r === firstR && c === firstC)) continue;
        ms_board[r][c] = -1; minesPlaced++;
    }
    ms_calculateNumbers();
}

function ms_calculateNumbers() {
    for (let r = 0; r < ms_rows; r++) {
        for (let c = 0; c < ms_cols; c++) {
            if (ms_board[r][c] === -1) continue;
            let count = 0;
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    let nr = r + i, nc = c + j;
                    if (nr >= 0 && nr < ms_rows && nc >= 0 && nc < ms_cols && ms_board[nr][nc] === -1) count++;
                }
            }
            ms_board[r][c] = count;
        }
    }
}

function ms_handleReveal(r, c) {
    if (ms_isGameOver) return;
    const cell = ms_cellElements[r][c];
    if (cell.classList.contains('revealed') || cell.classList.contains('flag')) return;

    if (ms_isFirstClick) { ms_placeMines(r, c); ms_isFirstClick = false; ms_startTimer(); ms_statusText.textContent = '游戏进行中...'; }
    
    if (ms_board[r][c] === -1) ms_gameOver(false);
    else { ms_revealCell(r, c); ms_checkWin(); }
    ms_updateStats();
}

function ms_handleFlag(r, c) {
    if (ms_isGameOver || ms_isFirstClick) return;
    const cell = ms_cellElements[r][c];
    if (cell.classList.contains('revealed')) return;
    if (cell.classList.contains('flag')) { cell.classList.remove('flag'); cell.textContent = ''; ms_flagsPlaced--; }
    else { cell.classList.add('flag'); cell.textContent = '🚩'; ms_flagsPlaced++; }
    ms_updateStats();
}

function ms_revealCell(r, c) {
    if (r < 0 || r >= ms_rows || c < 0 || c >= ms_cols) return;
    const cell = ms_cellElements[r][c];
    if (cell.classList.contains('revealed') || cell.classList.contains('flag')) return;
    
    cell.classList.add('revealed'); ms_revealedCount++;
    if (ms_board[r][c] > 0) { cell.textContent = ms_board[r][c]; cell.dataset.num = ms_board[r][c]; }
    else { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) ms_revealCell(r + i, c + j); }
}

function ms_checkWin() { if (ms_revealedCount === ms_rows * ms_cols - ms_mineCount) ms_gameOver(true); }

function ms_gameOver(isWin) {
    ms_isGameOver = true; ms_stopTimer();
    let diffName = ms_difficultySelect.options[ms_difficultySelect.selectedIndex].text.split(' ')[0];
    if (isWin) {
        ms_statusText.textContent = '🎉 恭喜你，排雷成功！'; ms_statusText.style.color = '#27ae60';
        ms_addHistory(`✅ ${diffName}胜利`, ms_timeElapsed);
        if (ms_difficultySelect.value === 'hard') ms_triggerHiEgg();
    } else {
        for (let r = 0; r < ms_rows; r++) for (let c = 0; c < ms_cols; c++) {
            if (ms_board[r][c] === -1) {
                const cell = ms_cellElements[r][c];
                if (!cell.classList.contains('flag')) { cell.textContent = '💣'; cell.classList.add('mine'); }
            }
        }
        ms_statusText.textContent = '💥 轰！你踩到雷了...'; ms_statusText.style.color = '#e74c3c';
        ms_addHistory(`💀 ${diffName}失败`, ms_timeElapsed);
    }
}

function ms_triggerHiEgg() {
    setTimeout(() => {
        ms_statusText.textContent = '✨ 发现隐藏彩蛋！'; ms_statusText.style.color = '#d35400';
        for (let r = 0; r < ms_rows; r++) for (let c = 0; c < ms_cols; c++) {
            ms_cellElements[r][c].className = 'cell'; ms_cellElements[r][c].textContent = '';
        }
        const pattern = ["..............................","..............................","..............................","....##........#...............","....##........#...............","....##........#...............","....##........#...............","....##############............","....##############............","....##........#...............","....##........#...............","....##........#...............","....##........#...............","....##........#...............","..............................",".............................."];
        let delay = 0;
        for (let r = 0; r < ms_rows; r++) for (let c = 0; c < ms_cols; c++) {
            if (pattern[r] && pattern[r][c] === '#') {
                setTimeout(() => { let cell = ms_cellElements[r][c]; cell.textContent = '💣'; cell.classList.add('egg-animate'); }, delay);
                delay += 15;
            }
        }
    }, 600);
}

function ms_addHistory(resultStr, time) {
    ms_gameHistory.unshift({ resultStr, time });
    if (ms_gameHistory.length > 5) ms_gameHistory.pop();
    ms_historyList.innerHTML = '';
    if (ms_gameHistory.length === 0) { ms_historyList.innerHTML = '<li style="color:#999; justify-content:center;">暂无记录</li>'; return; }
    ms_gameHistory.forEach(record => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${record.resultStr}</span> <span>⏱️ ${record.time} 秒</span>`;
        ms_historyList.appendChild(li);
    });
}

// 事件绑定包裹在 DOMContentLoaded 中确保元素就绪
document.addEventListener('DOMContentLoaded', () => {
    ms_btnReveal.addEventListener('click', () => { ms_currentMode = 'reveal'; ms_btnReveal.classList.add('active'); ms_btnFlag.classList.remove('active'); });
    ms_btnFlag.addEventListener('click', () => { ms_currentMode = 'flag'; ms_btnFlag.classList.add('active'); ms_btnReveal.classList.remove('active'); });
    ms_restartBtn.addEventListener('click', initGame);
    ms_difficultySelect.addEventListener('change', initGame);
});
