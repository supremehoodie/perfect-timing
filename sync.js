const SB_URL = 'https://ohebdbwttprejpdctwfg.supabase.co'; 
const SB_KEY = 'sb_publishable_gz-Di9bGPNmO9is_p2fkDQ_tagtaSjQ';
const sb = supabase.createClient(SB_URL, SB_KEY);

let start, active = false, user = "ANON";
const d = document.getElementById("display");
const resO = document.getElementById("results-overlay");
const lbO = document.getElementById("lb-overlay");
const i = document.getElementById("insult-box");
const gate = document.getElementById("entry-gate");
const gamePage = document.getElementById("game-page");

function init() {
    const input = document.getElementById("name-input");
    if (input.value.trim() !== "") {
        user = input.value.toUpperCase();
        gate.style.display = "none";
        gamePage.style.display = "flex";
    }
}

function toggleLB(show) {
    lbO.style.display = show ? "flex" : "none";
    if (show) loadGlobalScores(document.getElementById("leaderboard-main"));
}

async function loadGlobalScores(container) {
    try {
        const { data } = await sb.from('scores').select('*').order('diff', { ascending: true });
        if (data && data.length > 0) {
            container.innerHTML = '<div style="opacity:0.2; font-size:9px; margin-bottom:12px; letter-spacing:2px; position: sticky; top: 0; background: black; padding: 5px 0;">GLOBAL RECORDS</div>';
            data.forEach((entry, idx) => {
                container.innerHTML += `<div class="row"><span>${idx + 1} ${entry.name}</span><span>${entry.score.toFixed(3)}s</span></div>`;
            });
        }
    } catch (e) { container.innerText = "OFFLINE"; }
}

async function pushScore(score) {
    const diff = Math.abs(1.000 - score);
    await sb.from('scores').insert([{ name: user, score: score, diff: diff }]);
    loadGlobalScores(document.getElementById("leaderboard-end"));
}

function trigger() {
    if (gamePage.style.display === "flex" && resO.style.display !== "flex") {
        if (!active) {
            active = true;
            start = performance.now();
            function loop() {
                if (!active) return;
                d.innerText = ((performance.now() - start) / 1000).toFixed(3);
                requestAnimationFrame(loop);
            }
            requestAnimationFrame(loop);
        } else {
            active = false;
            const v = parseFloat(d.innerText);
            document.getElementById("final-score").innerText = v.toFixed(3);
            i.innerText = roast(v);
            pushScore(v);
            resO.style.display = "flex";
        }
    }
}

function roast(v) {
    const diff = Math.abs(1.000 - v);
    if (diff === 0) return "GOD STATUS ACHIEVED. UNINSTALL THE REST OF YOUR LIFE.";
    if (diff < 0.005) return "CLEAN AS HELL. YOU MIGHT ACTUALLY HAVE A BRAIN.";
    if (diff < 0.02) return "ACCEPTABLE. BARELY.";
    if (diff < 0.1) return "DOGWATER TIMING. MY DECEASED GRANDMA IS FASTER.";
    if (diff < 0.3) return "EMBARRASSING. ARE YOU DRUNK OR JUST NATURALLY SLOW?";
    return "ACTUAL RETARD LEVEL PERFORMANCE. LOG OFF.";
}

function rizz(e) {
    const k = document.createElement("div");
    k.className = "rizz"; k.innerText = "rizzking";
    k.style.left = e.clientX + "px"; k.style.top = e.clientY + "px";
    document.body.appendChild(k);
    setTimeout(() => k.remove(), 800);
}

function reset() {
    resO.style.display = "none";
    d.innerText = "0.000";
}

window.addEventListener("pointerdown", (e) => {
    // Prevent triggering game if clicking buttons or input
    if (e.target.tagName !== "BUTTON" && e.target.tagName !== "INPUT" && !document.getElementById("can-box-entry")?.contains(e.target)) trigger();
});

window.addEventListener("keydown", (e) => { 
    if (e.key === "Enter") {
        if (gate.style.display !== "none" && lbO.style.display !== "flex") init();
        else if (resO.style.display === "flex") reset();
        else if (lbO.style.display === "flex") toggleLB(false);
    }
    if (e.code === "Space") trigger(); 
});