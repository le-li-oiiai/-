// 当前正在运行的游戏
let currentGame = 'menu';

// 页面切换逻辑（需暴露到 window 供 HTML 点击调用）
window.switchGame = function(gameName) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    currentGame = gameName;
    
    if (gameName === 'menu') {
        document.getElementById('screen-menu').classList.add('active');
        window.stopOrbitGame();
    } else if (gameName === 'minesweeper') {
        document.getElementById('screen-minesweeper').classList.add('active');
        window.initGame();
    } else if (gameName === 'orbit') {
        document.getElementById('screen-orbit').classList.add('active');
        document.getElementById('orbit-welcome').classList.add('active');
        window.stopOrbitGame();
    }
};
