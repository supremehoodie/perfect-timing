const SB_URL = 'https://ohebdbwttprejpdctwfg.supabase.co'; 
const SB_KEY = 'sb_publishable_gz-Di9bGPNmO9is_p2fkDQ_tagtaSjQ';
const sb = supabase.createClient(SB_URL, SB_KEY);

const stages = [
    { id: 'CLASSIC', name: 'CLASSIC SYNC', instr: 'GET TO 1.000 SEC' },
    { id: 'COLOR', name: 'COLOR SYNC', instr: 'HIT THE ANNOUNCED COLOR' },
    { id: 'REFLEX', name: 'REFLEX TEST', instr: 'CLICK ON FLASH' }
];

let start, active = false, user = "ANON", currentStage = 0, totalDiff = 0;
let reflexWaiting = false, reflexTimeout, countdownActive = false;
let targetColor = "";

const d = document.getElementById("display");
const resO = document.getElementById("results-overlay");
const lbO = document.getElementById("lb-overlay");
const gate = document.getElementById("entry-gate");
const gamePage = document.getElementById("game-page");
const colorBox = document.getElementById("color-box");

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
    d.innerText = "WAIT"; d.style.color = "#fff";
    colorBox.style.display = "none";
    gamePage.style.background = "#000";
    document.getElementById('mode-instr').innerText = "PREPARING...";
    document.getElementById('stage-tracker').innerText = `STAGE ${currentStage + 1}/3`;

    setTimeout(() => {
        countdownActive = false;
        d.innerText = "READY";
        document.getElementById('mode-instr').innerText = stages[currentStage].instr;
    }, 1200);
}

function trigger() {
    if (gamePage.style.display !== "flex" || resO.style.display === "flex" || lbO.style.display === "flex" || countdownActive) return;
    
    const sid = stages[currentStage].id;
    if (sid === 'COLOR') {
        if (!active) startColorStage();
    } else if (sid === 'REFLEX') {
        if (!active && !reflexWaiting) startReflex();
        else if (reflexWaiting) { clearTimeout(reflexTimeout); stopGame(true); }
        else if (active) stopGame();
    } else {
        if (!active) { active = true; start = performance.now(); runLoop(); }
        else stopGame();
    }
}

function startColorStage() {
    active = true;
    const colors = ['WHITE', 'RED', 'BLUE'];
    targetColor = colors[Math.floor(Math.random() * 3)];
    d.innerText = targetColor;
    d.style.color = targetColor === 'WHITE' ? '#fff' : (targetColor === 'RED' ? '#ff003c' : '#007aff');
    colorBox.style.display = "flex";
    start = performance.now();
}

function checkColor(clicked) {
    if (!active) return;
    if (clicked === targetColor) stopGame();
    else stopGame(true); // Fault for wrong color
}

function runLoop() {
    if (!active) return;
    const cur = (performance.now() - start) / 1000;
    d.innerText = cur.toFixed(3);
    requestAnimationFrame(runLoop);
}

function startReflex() {
    reflexWaiting = true; d.innerText = "WAITING...";
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
    
    let diff = 0;
    if (fault) diff = 1.000;
    else if (sid === 'CLASSIC') diff = Math.abs(1.000 - (end - start) / 1000);
    else diff = (end - start) / 1000; // Speed based for color/reflex

    totalDiff += diff;
    
    // Show Results for this specific stage
    document.getElementById("stage-name").innerText = stages[currentStage].name;
    document.getElementById("final-score").innerText = diff.toFixed(3);
    document.getElementById("insult-box").innerText = fault ? "WRONG. 1s PENALTY." : (diff < 0.2 ? "GOD STATUS." : "SLOW AS HELL.");
    document.getElementById("action-btn").innerText = currentStage < 2 ? "CONTINUE" : "VIEW RANK";
    resO.style.display = "flex";
}

async function nextAction() {
    resO.style.display = "none";
    if (currentStage < 2) {
        currentStage++;
        prepareStage();
    } else {
        finishGauntlet();
    }
}

async function finishGauntlet() {
    const rank = await pushAndGetRank(totalDiff);
    document.getElementById("stage-name").innerText = "TOTAL GAUNTLET ERROR";
    document.getElementById("final-score").innerText = totalDiff.toFixed(3);
    document.getElementById("rank-msg").innerText = `GLOBAL RANK: #${rank}`;
    document.getElementById("action-btn").innerText = "RE-SYNC";
    document.getElementById("action-btn").onclick = () => location.reload();
}

async function pushAndGetRank(score) {
    await sb.from('scores').insert([{ name: user, score: score, diff: score }]);
    const { count } = await sb.from('scores').select('*', { count: 'exact', head: true }).lt('diff', score);
    return count + 1;
}

async function toggleLB(show) {
    lbO.style.display = show ? "flex" : "none";
    if (show) {
        const { data } = await sb.from('scores').select('*').order('diff', { ascending: true }).limit(50);
        const container = document.getElementById("leaderboard-main");
        container.innerHTML = "";
        data.forEach((e, idx) => {
            const isMe = e.name === user && Math.abs(e.diff - totalDiff) < 0.0001;
            container.innerHTML += `<div class="row ${isMe ? 'current-user' : ''}"><span>${idx + 1}. ${e.name}</span><span>${e.diff.toFixed(3)}s</span></div>`;
        });
    }
}

window.addEventListener("pointerdown", (e) => {
    if (e.target.tagName !== "BUTTON" && e.target.tagName !== "INPUT" && !e.target.classList.contains('color-circle')) trigger();
});
window.addEventListener("keydown", (e) => { 
    if (e.key === "Enter" && gate.style.display !== "none") init();
    if (e.code === "Space") trigger(); 
});