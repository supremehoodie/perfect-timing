const SB_URL = 'https://ohebdbwttprejpdctwfg.supabase.co'; 
const SB_KEY = 'sb_publishable_gz-Di9bGPNmO9is_p2fkDQ_tagtaSjQ';
const sb = supabase.createClient(SB_URL, SB_KEY);

const stages = [
    { id: 'CLASSIC', name: 'SYNC_CLASSIC', instr: 'CALIBRATE: 1.000s' },
    { id: 'GRID', name: 'GRID_SYNC', instr: 'ELIMINATE_TARGETS' },
    { id: 'REFLEX', name: 'SYNC_REFLEX', instr: 'TRIGGER ON SIGNAL' }
];

let start, active = false, user = "ANON", currentStage = 0, totalDiff = 0;
let reflexWaiting = false, reflexTimeout, countdownActive = false;
let gridHits = 0, targetCell = -1;

const d = document.getElementById("display");
const resO = document.getElementById("results-overlay");
const lbO = document.getElementById("lb-overlay");
const gate = document.getElementById("entry-gate");
const gamePage = document.getElementById("game-page");
const matrixBox = document.getElementById("matrix-box");

function init() {
    const input = document.getElementById("name-input");
    if (input.value.trim() !== "") {
        user = input.value.toUpperCase();
        gate.style.display = "none";
        currentStage = 0; totalDiff = 0;
        gamePage.style.display = "flex";
        prepareStage();
    }
}

function prepareStage() {
    active = false; reflexWaiting = false; countdownActive = true;
    d.innerText = "WAIT"; d.style.color = "#fff"; d.style.display = "block";
    matrixBox.style.display = "none";
    gamePage.style.background = "#050505";
    document.getElementById('mode-instr').innerText = "CALIBRATING...";
    document.getElementById('stage-tracker').innerText = `PRO_SESSION // 00${currentStage + 1}`;

    setTimeout(() => {
        countdownActive = false;
        d.innerText = "READY";
        document.getElementById('mode-instr').innerText = stages[currentStage].instr;
    }, 1200);
}

function trigger() {
    if (gamePage.style.display !== "flex" || resO.style.display === "flex" || lbO.style.display === "flex" || countdownActive) return;
    
    const sid = stages[currentStage].id;
    if (sid === 'GRID') { if (!active) startGridStage(); }
    else if (sid === 'REFLEX') {
        if (!active && !reflexWaiting) startReflex();
        else if (reflexWaiting) { clearTimeout(reflexTimeout); stopGame(true); }
        else if (active) stopGame();
    } else {
        if (!active) { active = true; start = performance.now(); runLoop(); }
        else stopGame();
    }
}

function startGridStage() {
    active = true; gridHits = 0;
    d.style.display = "none";
    matrixBox.style.display = "grid";
    start = performance.now();
    nextTarget();
}

function nextTarget() {
    document.querySelectorAll('.matrix-cell').forEach(c => c.classList.remove('active'));
    targetCell = Math.floor(Math.random() * 4);
    document.getElementById(`cell-${targetCell}`).classList.add('active');
}

function hitMatrix(id) {
    if (!active) return;
    if (id === targetCell) {
        gridHits++;
        if (gridHits >= 3) stopGame();
        else nextTarget();
    } else { stopGame(true); }
}

function runLoop() {
    if (!active) return;
    const cur = (performance.now() - start) / 1000;
    d.innerText = cur.toFixed(3);
    requestAnimationFrame(runLoop);
}

function startReflex() {
    reflexWaiting = true; d.innerText = "STANDBY";
    reflexTimeout = setTimeout(() => {
        reflexWaiting = false; active = true;
        gamePage.style.background = "#fff"; d.style.color = "#000";
        start = performance.now();
    }, 1500 + Math.random() * 2000);
}

function stopGame(fault = false) {
    active = false; reflexWaiting = false;
    const end = performance.now();
    const sid = stages[currentStage].id;
    let rawValue = (end - start) / 1000;
    let diff = 0;

    if (sid === 'CLASSIC') {
        diff = Math.abs(1.000 - rawValue);
        document.getElementById("final-score").innerText = rawValue.toFixed(3);
    } else {
        diff = fault ? 1.000 : rawValue;
        document.getElementById("final-score").innerText = diff.toFixed(3);
    }

    totalDiff += diff;
    document.getElementById("stage-name").innerText = stages[currentStage].name;
    document.getElementById("insult-box").innerText = fault ? "FAULT_DETECTED" : (diff < 0.15 ? "OPTIMAL_LEVEL" : "SYNC_DELAYED");
    document.getElementById("action-btn").innerText = currentStage < 2 ? "PROCEED" : "SAVE RESULTS";
    resO.style.display = "flex";
}

async function nextAction() {
    resO.style.display = "none";
    if (currentStage < 2) { currentStage++; prepareStage(); }
    else finishGauntlet();
}

async function finishGauntlet() {
    document.getElementById("stage-name").innerText = "SYSTEM_TOTAL_ERROR";
    document.getElementById("final-score").innerText = totalDiff.toFixed(3);
    document.getElementById("action-btn").innerText = "RE-BOOT";
    document.getElementById("action-btn").onclick = () => location.reload();
    
    await sb.from('scores').insert([{ name: user, score: totalDiff, diff: totalDiff }]);
    
    const { count: betterCount } = await sb.from('scores').select('*', { count: 'exact', head: true }).lt('diff', totalDiff);
    const { count: totalCount } = await sb.from('scores').select('*', { count: 'exact', head: true });
    
    document.getElementById("rank-data").innerText = `RANK #${betterCount + 1} OF ${totalCount}`;
    resO.style.display = "flex";
}

async function toggleLB(show) {
    lbO.style.display = show ? "flex" : "none";
    if (show) {
        const { data, count } = await sb.from('scores').select('*', { count: 'exact' }).order('diff', { ascending: true });
        document.getElementById("total-players").innerText = `TOTAL ENTRIES: ${count}`;
        const container = document.getElementById("leaderboard-main");
        container.innerHTML = "";
        data.forEach((e, idx) => {
            const isMe = e.name === user && Math.abs(e.diff - totalDiff) < 0.0001;
            container.innerHTML += `<div class="row ${isMe ? 'current-user' : ''}"><span>#${idx + 1} ${e.name}</span><span>${e.diff.toFixed(3)}s</span></div>`;
        });
    }
}

function rizz(e) {
    const k = document.createElement("div");
    k.style.position = "absolute"; k.style.color = "#4dfd4d"; k.innerText = "rizzking";
    k.style.left = e.clientX + "px"; k.style.top = e.clientY + "px";
    k.style.animation = "rise 0.8s forwards"; document.body.appendChild(k);
    setTimeout(() => k.remove(), 800);
}

window.addEventListener("pointerdown", (e) => {
    if (e.target.tagName !== "BUTTON" && e.target.tagName !== "INPUT" && !e.target.classList.contains('matrix-cell')) trigger();
});
window.addEventListener("keydown", (e) => { 
    if (e.key === "Enter" && gate.style.display !== "none") init();
    if (e.code === "Space") trigger(); 
});