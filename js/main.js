let currentGame = 'menu';

function switchGame(gameName) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    currentGame = gameName;
    
    if (gameName === 'menu') {
        document.getElementById('screen-menu').classList.add('active');
        stopOrbitGame();
    } else if (gameName === 'minesweeper') {
        document.getElementById('screen-minesweeper').classList.add('active');
        initGame();
    } else if (gameName === 'orbit') {
        document.getElementById('screen-orbit').classList.add('active');
        document.getElementById('orbit-welcome').classList.add('active');
        stopOrbitGame();
    }
}
