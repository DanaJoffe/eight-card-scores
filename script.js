let state = {
    players: ["Player 1", "Player 2", "Player 3", "Player 4"],
    rounds: []
};

let activeCell = null;

// FAILSAFE: Ensure buttons work immediately
window.onload = function() {
    init();
    
    // Manual event listener attachment in case HTML attributes fail
    document.getElementById('addRowBtn').onclick = () => addNewRoundData(true);
    document.getElementById('addPlayerBtn').onclick = addPlayer;
    document.getElementById('resetBtn').onclick = resetGame;
    document.getElementById('shareBtn').onclick = shareGame;
};

function init() {
    console.log("Initializing app...");
    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get('data');

    if (sharedData) {
        try { state = JSON.parse(atob(sharedData)); } catch (e) { console.error("URL Load failed"); }
    } else {
        const saved = localStorage.getItem('eightCardsState');
        if (saved) {
            try { state = JSON.parse(saved); } catch(e) { console.error("Local load failed"); }
        }
    }

    if (!state.rounds || state.rounds.length === 0) {
        state.rounds = [];
        for(let i=0; i<5; i++) addNewRoundData(false);
    }
    render();
}

function addNewRoundData(shouldRender = true) {
    const newRound = state.players.map(() => ({ bet: null, score: 0 }));
    state.rounds.push(newRound);
    if (shouldRender) render();
}

function render() {
    const namesRow = document.getElementById('playerNamesRow');
    const roundsBody = document.getElementById('roundsBody');
    
    if (!namesRow || !roundsBody) return;

    // Render Headers
    namesRow.innerHTML = '';
    state.players.forEach((name, i) => {
        const th = document.createElement('th');
        th.innerHTML = `
            <div class="player-header">
                <input class="player-name-input" value="${name}" onchange="updatePlayerName(${i}, this.value)">
                <button class="remove-p" onclick="removePlayer(${i})">×</button>
            </div>
        `;
        namesRow.appendChild(th);
    });

    // Render Body
    roundsBody.innerHTML = '';
    state.rounds.forEach((round, rIdx) => {
        const tr = document.createElement('tr');
        const firstBetterIndex = rIdx % state.players.length;

        round.forEach((cell, pIdx) => {
            const td = document.createElement('td');
            const isFirst = pIdx === firstBetterIndex ? 'first-better' : '';
            const scoreLocked = cell.bet === null;
            const canBet = (rIdx === 0) || (state.rounds[rIdx-1][pIdx].bet !== null);

            td.innerHTML = `
                <div class="cell-box ${isFirst}">
                    <div class="bet-part">
                        <select ${!canBet ? 'disabled' : ''} onchange="updateBet(${rIdx}, ${pIdx}, this.value)">
                            <option value="" ${cell.bet === null ? 'selected' : ''}>-</option>
                            ${[0,1,2,3,4,5,6,7,8].map(v => 
                                `<option value="${v}" ${v === cell.bet ? 'selected' : ''}>${v}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="score-part ${scoreLocked ? 'locked' : ''}" onclick="openScoreOverlay(${rIdx}, ${pIdx})">
                        ${cell.score}
                    </div>
                </div>
            `;
            tr.appendChild(td);
        });
        roundsBody.appendChild(tr);
    });
    updateHighlights();
    save();
}

// All other helper functions (updateBet, openScoreOverlay, etc.) 
// follow the same logic as the previous block...
// [MAKE SURE THE REST OF THE FUNCTIONS FROM THE PREVIOUS POST ARE INCLUDED BELOW]

function updateBet(rIdx, pIdx, val) {
    if (val === "") { state.rounds[rIdx][pIdx].bet = null; render(); return; }
    const num = parseInt(val);
    const roundData = state.rounds[rIdx];
    const oldBet = roundData[pIdx].bet;
    roundData[pIdx].bet = num;
    const betCount = roundData.filter(p => p.bet !== null).length;
    if (betCount === state.players.length) {
        const sum = roundData.reduce((acc, c) => acc + c.bet, 0);
        if (sum === 8) {
            alert("Guardrail: Sum cannot be 8 for the last better!");
            roundData[pIdx].bet = oldBet;
            render();
            return;
        }
    }
    render();
}

function openScoreOverlay(rIdx, pIdx, showAll = false) {
    const cell = state.rounds[rIdx][pIdx];
    if (cell.bet === null) return;
    activeCell = { rIdx, pIdx };
    const prevScore = rIdx > 0 ? state.rounds[rIdx-1][pIdx].score : 0;
    const winVal = (cell.bet * 4) + 3;
    const maxOutSteps = Math.max(cell.bet, 8 - cell.bet);
    const overlay = document.getElementById('scoreOverlay');
    const container = document.getElementById('overlayOptions');
    container.innerHTML = '';
    container.appendChild(createOptionBtn(`+${winVal} (IN)`, () => finalizeScore(prevScore + winVal), 'btn-in'));
    const limit = showAll ? maxOutSteps : Math.min(2, maxOutSteps);
    for (let i = 1; i <= limit; i++) {
        const penalty = i * 2;
        container.appendChild(createOptionBtn(`-${penalty} (OUT)`, () => finalizeScore(prevScore - penalty), 'btn-out'));
    }
    if (!showAll && maxOutSteps > 2) {
        container.appendChild(createOptionBtn('More...', (e) => {
            e.stopPropagation();
            openScoreOverlay(rIdx, pIdx, true);
        }, 'btn-more'));
    }
    overlay.classList.remove('overlay-hidden');
}

function createOptionBtn(text, action, className) {
    const btn = document.createElement('button');
    btn.className = `score-option-btn ${className}`;
    btn.innerText = text;
    btn.onclick = action;
    return btn;
}

function finalizeScore(val) {
    state.rounds[activeCell.rIdx][activeCell.pIdx].score = val;
    closeOverlay();
    render();
}

function closeOverlay() {
    document.getElementById('scoreOverlay').classList.add('overlay-hidden');
    activeCell = null;
}

function updateHighlights() {
    const namesRow = document.getElementById('playerNamesRow');
    if(!namesRow) return;
    const headers = namesRow.querySelectorAll('th');
    headers.forEach(th => th.classList.remove('high-score', 'low-score'));
    let activeRIdx = -1;
    for (let i = state.rounds.length - 1; i >= 0; i--) {
        if (state.rounds[i].some(c => c.score !== 0)) { activeRIdx = i; break; }
    }
    if (activeRIdx === -1) return;
    const scores = state.rounds[activeRIdx].map(c => c.score);
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    if (max === min) return;
    scores.forEach((s, i) => {
        if (s === max) namesRow.cells[i].classList.add('high-score');
        else if (s === min) namesRow.cells[i].classList.add('low-score');
    });
}

function save() { localStorage.setItem('eightCardsState', JSON.stringify(state)); }
function resetGame() { if(confirm("Reset game?")) { localStorage.removeItem('eightCardsState'); window.location.href = window.location.pathname; } }
function shareGame() { const d = btoa(JSON.stringify(state)); navigator.clipboard.writeText(window.location.origin + window.location.pathname + '?data=' + d).then(() => alert("Link Copied!")); }
function addPlayer() { if(state.players.length < 6) { state.players.push(`P${state.players.length+1}`); state.rounds.forEach(r => r.push({bet:null, score:0})); render(); } }
function updatePlayerName(i, v) { state.players[i] = v; save(); }
function removePlayer(i) { if(confirm("Remove player?")) { state.players.splice(i,1); state.rounds.forEach(r => r.splice(i,1)); render(); } }