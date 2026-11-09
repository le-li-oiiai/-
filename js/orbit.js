// ==========================================
// 🪐 星轨穿梭 (Orbit) 游戏逻辑
// ==========================================
const canvas = document.getElementById('orbit-canvas');
const ctx = canvas.getContext('2d');
const jumpHint = document.getElementById('jump-hint');
const orbitScoreEl = document.getElementById('orbit-score');
const orbitHistList = document.getElementById('orbit-hist-list');
const failModal = document.getElementById('fail-modal');
const winModal = document.getElementById('win-modal');
const finalScoreEl = document.getElementById('final-score');

let orbitAnimId;
let circles = [];
let ball = { x: 0, y: 0, vx: 0, vy: 0, radius: 8, attachedIdx: -1, angle: 0, isAttached: true, prevX: 0, prevY: 0 };
let orbitGravity = 400; 
let jumpSpeedMultiplier = 2.0; 
let justJumped = false; 
let orbitState = 'playing'; 
let lastTime = 0;
let camX = 0, camY = 0;
let targetCamX = 0, targetCamY = 0;
let orbitScore = 0;
let orbitFailCount = 0; 
let lastSafeCircle = 0; 
let currentDifficulty = 'normal'; 
let maxReachedIdx = 0; 
let ripples = [];
let floatingTexts = [];

function startOrbitWithDifficulty() {
    document.getElementById('orbit-welcome').classList.remove('active');
    const selectedDiff = document.querySelector('input[name="orbit-diff"]:checked').value;
    currentDifficulty = selectedDiff;
    
    setTimeout(() => {
        resizeCanvas();
        initOrbitGame();
    }, 50);
}

function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width || window.innerWidth;
    canvas.height = rect.height || window.innerHeight;
}

function generateNextCircle() {
    let i = circles.length;
    let prevC = circles[i-1];
    let r = Math.random() * 60 + 20;
    
    let prevAngle = Math.atan2(prevC.y - (i > 1 ? circles[i-2].y : 0), prevC.x - (i > 1 ? circles[i-2].x : 0));
    let curAngle = prevAngle + (Math.random() - 0.5) * (Math.PI / 3);
    
    let baseDist = prevC.r * 2.5 + Math.random() * prevC.r * 1.0;
    
    let dy = Math.sin(curAngle); 
    let distMultiplier = 1.0;
    if (dy < 0) {
        distMultiplier = 0.55 + 0.45 * (1 + dy);
    } else {
        distMultiplier = 1.0 + 0.15 * dy;
    }
    
    let dist = baseDist * distMultiplier;
    dist = Math.max(dist, 120); 

    let curX = prevC.x + Math.cos(curAngle) * dist;
    let curY = prevC.y + Math.sin(curAngle) * dist;
    
    let color = Math.random() > 0.5 ? 'red' : 'blue';
    if (currentDifficulty !== 'endless' && i === 14) color = 'end';
    
    circles.push({ x: curX, y: curY, r, color });
}

function initOrbitGame() {
    cancelAnimationFrame(orbitAnimId);
    
    orbitState = 'playing';
    circles = [];
    ripples = [];
    floatingTexts = [];
    orbitScore = 0;
    orbitFailCount = 0;
    lastSafeCircle = 0;
    maxReachedIdx = 0; 
    orbitScoreEl.textContent = orbitScore;
    
    failModal.classList.remove('active');
    winModal.classList.remove('active');
    jumpHint.classList.remove('show');

    if (currentDifficulty === 'easy') {
        orbitGravity = 350;
        jumpSpeedMultiplier = 2.2;
    } else {
        orbitGravity = 400;
        jumpSpeedMultiplier = 2.0;
    }

    circles.push({x: 0, y: 0, r: 50, color: 'start'});

    let initCount = currentDifficulty === 'endless' ? 20 : 15;
    for (let i = 1; i < initCount; i++) {
        generateNextCircle();
    }

    let c0 = circles[0];
    ball.attachedIdx = 0;
    ball.isAttached = true;
    ball.angle = -Math.PI / 2; 
    ball.x = c0.x + c0.r * Math.cos(ball.angle);
    ball.y = c0.y + c0.r * Math.sin(ball.angle);
    
    ball.prevX = ball.x;
    ball.prevY = ball.y;

    justJumped = false;
    
    camX = c0.x; camY = c0.y;
    targetCamX = c0.x; targetCamY = c0.y;

    updateOrbitUI();
    lastTime = performance.now();
    orbitAnimId = requestAnimationFrame(orbitLoop);
}

function stopOrbitGame() {
    cancelAnimationFrame(orbitAnimId);
}

function updateOrbitUI() {
    orbitScoreEl.textContent = orbitScore;
    if (ball.isAttached && orbitState === 'playing') {
        jumpHint.classList.add('show');
    } else {
        jumpHint.classList.remove('show');
    }
}

function jump() {
    if (!ball.isAttached || orbitState !== 'playing') return;

    let c = circles[ball.attachedIdx];
    let baseSpeed = Math.sqrt(orbitGravity * c.r);
    let speed = baseSpeed * jumpSpeedMultiplier; 
    
    let tangentAngle = ball.angle + (c.color === 'blue' ? -Math.PI / 2 : Math.PI / 2); 
    
    ball.vx = speed * Math.cos(tangentAngle);
    ball.vy = speed * Math.sin(tangentAngle);
    ball.isAttached = false;
    justJumped = true; 
    
    updateOrbitUI();
}

function checkCollision() {
    const x0 = ball.prevX, y0 = ball.prevY;
    const x1 = ball.x, y1 = ball.y;

    for (let i = 0; i < circles.length; i++) {
        let c = circles[i];
        
        if (i === ball.attachedIdx && !ball.isAttached && justJumped) {
            let dist = Math.hypot(x1 - c.x, y1 - c.y);
            if (dist < c.r + 20) {
                continue; 
            } else {
                justJumped = false; 
            }
        }

        let dx = x1 - x0;
        let dy = y1 - y0;
        let lenSq = dx * dx + dy * dy;
        
        if (lenSq === 0) {
            let dist = Math.hypot(x1 - c.x, y1 - c.y);
            if (Math.abs(dist - c.r) < ball.radius + 8) return i;
            continue;
        }

        let t = ((c.x - x0) * dx + (c.y - y0) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));

        let closestX = x0 + t * dx;
        let closestY = y0 + t * dy;
        let distToCenter = Math.hypot(closestX - c.x, closestY - c.y);
        
        if (Math.abs(distToCenter - c.r) < ball.radius + 8) {
            return i;
        }
    }
    return -1;
}

function createRipple(x, y, r) {
    ripples.push({ x: x, y: y, r: r, alpha: 0.6, startTime: performance.now() });
}

function orbitLoop(timestamp) {
    let dt = 0;
    
    if (orbitState === 'playing' || orbitState === 'won' || orbitState === 'modal') {
        dt = (timestamp - lastTime) / 1000;
        if (dt > 0.1) dt = 0.1; 
        lastTime = timestamp;
    }

    if (orbitState === 'playing') {
        if (ball.isAttached) {
            let c = circles[ball.attachedIdx];
            let speed = Math.sqrt(orbitGravity * c.r);
            let angularSpeed = speed / c.r;

            if (c.color === 'blue') ball.angle -= angularSpeed * dt;
            else ball.angle += angularSpeed * dt;

            ball.prevX = ball.x;
            ball.prevY = ball.y;
            
            ball.x = c.x + c.r * Math.cos(ball.angle);
            ball.y = c.y + c.r * Math.sin(ball.angle);
            
            targetCamX = c.x;
            targetCamY = c.y;
        } else {
            ball.prevX = ball.x;
            ball.prevY = ball.y;

            ball.vy += orbitGravity * dt;
            ball.x += ball.vx * dt;
            ball.y += ball.vy * dt;

            let hitIdx = checkCollision();
            if (hitIdx !== -1) {
                let oldIdx = ball.attachedIdx;
                ball.attachedIdx = hitIdx;
                ball.isAttached = true;
                justJumped = false;
                let newC = circles[hitIdx];
                
                ball.angle = Math.atan2(ball.y - newC.y, ball.x - newC.x);
                lastSafeCircle = hitIdx; 

                createRipple(newC.x, newC.y, newC.r);

                if (hitIdx === oldIdx) {
                    if (newC.color === 'red') newC.color = 'blue';
                    else if (newC.color === 'blue') newC.color = 'red';
                }

                if (hitIdx > maxReachedIdx) {
                    let jumpDistance = hitIdx - maxReachedIdx;
                    let points = jumpDistance * (jumpDistance + 1) / 2;
                    orbitScore += points;
                    maxReachedIdx = hitIdx;
                    
                    floatingTexts.push({
                        x: ball.x,
                        y: ball.y,
                        text: `+${points}`,
                        vy: -80, 
                        age: 0,
                        life: 0.7 
                    });
                }

                if (currentDifficulty === 'endless' && hitIdx >= circles.length - 5) {
                    while (circles.length < hitIdx + 10) {
                        generateNextCircle();
                    }
                }

                if (newC.color === 'end') {
                    triggerWin();
                    return;
                } else {
                    updateOrbitUI();
                }
            }
        }

        camX += (targetCamX - camX) * 0.06;
        camY += (targetCamY - camY) * 0.06;

        let distFromCamera = Math.hypot(ball.x - camX, ball.y - camY);
        if (distFromCamera > Math.max(canvas.width, canvas.height) * 0.8) {
            triggerFail();
        }
    }

    updateRipples(dt);
    updateFloatingTexts(dt);

    drawOrbit();

    if (orbitState === 'playing' || orbitState === 'won' || orbitState === 'modal') {
        orbitAnimId = requestAnimationFrame(orbitLoop);
    }
}

function updateFloatingTexts(dt) {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i];
        ft.age += dt;
        
        if (ft.age >= ft.life) {
            floatingTexts.splice(i, 1);
            continue;
        }
        
        ft.vy += orbitGravity * dt;
        ft.y += ft.vy * dt;
    }
}

function updateRipples(dt) {
    for (let i = ripples.length - 1; i >= 0; i--) {
        let rp = ripples[i];
        rp.r += 1.5;    
        rp.alpha -= 0.03; 
        if (rp.alpha <= 0) {
            ripples.splice(i, 1); 
        }
    }
}

function triggerFail() {
    orbitState = 'modal';
    if (orbitFailCount === 0) {
        orbitFailCount++;
        failModal.classList.add('active');
    } else {
        addOrbitHistory(orbitScore, false);
        initOrbitGame();
    }
}

function respawnOrbit() {
    failModal.classList.remove('active');
    orbitState = 'playing';
    
    if (currentDifficulty !== 'endless' && ball.attachedIdx >= circles.length - 2) {
        ball.attachedIdx = circles.length - 1;
        ball.isAttached = true;
        triggerWin();
        return;
    }

    let nextIdx = ball.attachedIdx + 1;
    ball.attachedIdx = nextIdx;
    let c = circles[nextIdx];
    ball.isAttached = true;
    ball.angle = -Math.PI / 2; 
    ball.x = c.x + c.r * Math.cos(ball.angle);
    ball.y = c.y + c.r * Math.sin(ball.angle);
    ball.prevX = ball.x;
    ball.prevY = ball.y;
    justJumped = false;

    maxReachedIdx = Math.max(maxReachedIdx, nextIdx); 

    camX = c.x; camY = c.y;
    targetCamX = c.x; targetCamY = c.y;

    lastTime = performance.now();
    updateOrbitUI();
    orbitAnimId = requestAnimationFrame(orbitLoop);
}

function restartOrbitFromFail() {
    addOrbitHistory(orbitScore, false);
    initOrbitGame();
}

function triggerWin() {
    orbitState = 'won'; 
    addOrbitHistory(orbitScore, true);
    jumpHint.classList.remove('show');

    let c = circles[ball.attachedIdx];
    for (let i = 0; i < 5; i++) {
        ripples.push({ x: c.x, y: c.y, r: c.r, maxR: c.r + 150, alpha: 1, delay: i * 150, startTime: performance.now() });
    }

    setTimeout(() => {
        if (orbitState === 'won') {
            finalScoreEl.textContent = orbitScore;
            winModal.classList.add('active');
        }
    }, 1000);
}

function restartOrbitFromWin() {
    initOrbitGame();
}

function addOrbitHistory(score, isWin) {
    let html = '';
    
    if (currentDifficulty === 'endless') {
        html = `<li><span class="hist-endless">🏁 无尽挑战</span> <span>得分: ${score}</span></li>`;
    } else {
        let diffName = currentDifficulty === 'easy' ? '简单' : '正常';
        if (isWin) {
            html = `<li><span class="hist-win">✅ ${diffName}通关</span> <span>得分: ${score}</span></li>`;
        } else {
            html = `<li><span class="hist-fail">💀 ${diffName}失败</span> <span>得分: ${score}</span></li>`;
        }
    }
    
    if (orbitHistList.children[0] && orbitHistList.children[0].style.color === 'rgb(153, 153, 153)') {
        orbitHistList.innerHTML = html;
    } else {
        orbitHistList.insertAdjacentHTML('afterbegin', html);
    }
}

function drawOrbit() {
    ctx.fillStyle = "#ffffff"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const toScreen = (x, y) => ({
        x: x - camX + canvas.width / 2,
        y: y - camY + canvas.height / 2
    });

    for (let rp of ripples) {
        let pt = toScreen(rp.x, rp.y);
        ctx.strokeStyle = `rgba(150, 150, 150, ${Math.max(0, rp.alpha)})`; 
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, rp.r, 0, Math.PI * 2);
        ctx.stroke();
    }

    for (let i = 0; i < circles.length; i++) {
        let c = circles[i];
        let pt = toScreen(c.x, c.y);
        
        if (pt.x < -200 || pt.x > canvas.width + 200 || pt.y < -200 || pt.y > canvas.height + 200) continue;

        if (c.color === 'red') ctx.strokeStyle = '#e74c3c'; 
        else if (c.color === 'blue') ctx.strokeStyle = '#3498db'; 
        else if (c.color === 'start') ctx.strokeStyle = '#f1c40f'; 
        else ctx.strokeStyle = '#2ecc71'; 

        if (ball.attachedIdx === i && (ball.isAttached || orbitState === 'won')) {
            ctx.lineWidth = 4;
            ctx.shadowBlur = 15;
            ctx.shadowColor = ctx.strokeStyle;
        } else {
            ctx.lineWidth = 2;
            ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, c.r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = ctx.strokeStyle;
        let arrowAngle = (c.color === 'blue') ? Math.PI : 0;
        let ax = pt.x + c.r * Math.cos(arrowAngle);
        let ay = pt.y + c.r * Math.sin(arrowAngle);
        ctx.beginPath();
        ctx.arc(ax, ay, 4, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;

    let bpt = toScreen(ball.x, ball.y);
    ctx.fillStyle = '#333333'; 
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(bpt.x, bpt.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = "bold 24px 'Segoe UI', Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let ft of floatingTexts) {
        let pt = toScreen(ft.x, ft.y);
        let alpha = 1 - (ft.age / ft.life);
        ctx.fillStyle = `rgba(231, 76, 60, ${alpha})`;
        ctx.fillText(ft.text, pt.x, pt.y);
    }
}

// 所有事件绑定在 DOMContentLoaded 之后进行
document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            if (document.getElementById('screen-orbit').classList.contains('active') && orbitState === 'playing') {
                e.preventDefault(); 
                jump();
            }
        }
    });
    canvas.addEventListener('mousedown', () => { 
        if (document.getElementById('screen-orbit').classList.contains('active') && orbitState === 'playing') jump(); 
    });
    canvas.addEventListener('touchstart', (e) => { 
        if (document.getElementById('screen-orbit').classList.contains('active') && orbitState === 'playing') { 
            e.preventDefault(); jump(); 
        } 
    });

    // 难度选择器样式绑定
    const diffLabels = document.querySelectorAll('.diff-option');
    diffLabels.forEach(label => {
        label.addEventListener('click', () => {
            diffLabels.forEach(l => l.classList.remove('selected'));
            label.classList.add('selected');
        });
    });
    
    resizeCanvas();
});
