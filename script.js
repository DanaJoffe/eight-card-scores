let state = {
    players: ["Player 1", "Player 2", "Player 3", "Player 4"],
    rounds: []
};

let unlockedRoundIdx = null;
let longPressTimer;

function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get('data');

    if (sharedData) {
        try { state = JSON.parse(atob(sharedData)); } catch (e) {}
    } else {
        const saved = localStorage.getItem('eightCardsState');
        if (saved) state = JSON.parse(saved);
    }

    if (state.rounds.length === 0) {
        addNewRoundData(false); 
    }
    render();
}

function addNewRoundData(shouldRender = true) {
    const newRound = state.players.map(() => ({ bet: null, score: null, status: null }));
    state.rounds.push(newRound);
    if (shouldRender) render();
}

function getCurrentRoundIdx() {
    // Finds first round that has at least one null score
    const idx = state.rounds.findIndex(round => round.some(p => p.score === null));
    return idx === -1 ? state.rounds.length - 1 : idx;
}

function render() {
    const curIdx = getCurrentRoundIdx();
    renderHeaders();
    renderTable(curIdx);
    updateBetSum(curIdx);
    updateHighlights();
    save();
}

function renderHeaders() {
    const namesRow = document.getElementById('playerNamesRow');
    namesRow.innerHTML = '';
    state.players.forEach((name, i) => {
        const th = document.createElement('th');
        th.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center;">
                <input style="width:85%; font-weight:bold; border:none; text-align:center; background:transparent;" value="${name}" onchange="updatePlayerName(${i}, this.value)">
                <button onclick="removePlayer(${i})" style="color:var(--loss); border:none; background:none; font-size:14px;">×</button>
            </div>
        `;
        namesRow.appendChild(th);
    });
}

function renderTable(curIdx) {
    const roundsBody = document.getElementById('roundsBody');
    roundsBody.innerHTML = '';

    state.rounds.forEach((round, rIdx) => {
        const tr = document.createElement('tr');
        const isCurrent = (rIdx === curIdx);
        const isUnlocked = (rIdx === unlockedRoundIdx);
        
        tr.className = `round-row ${rIdx < curIdx ? 'past' : (isCurrent ? 'current' : 'future')} ${isUnlocked ? 'unlocked' : ''}`;
        
        // Long Press Handlers
        if (rIdx < curIdx) {
            tr.onmousedown = () => startLongPress(rIdx);
            tr.ontouchstart = () => startLongPress(rIdx);
            tr.onmouseup = stopLongPress;
            tr.ontouchend = stopLongPress;
        }

        const firstBetterIndex = rIdx % state.players.length;

        round.forEach((cell, pIdx) => {
            const td = document.createElement('td');
            const prevScore = rIdx > 0 ? (state.rounds[rIdx-1][pIdx].score || 0) : 0;
            const isFirst = pIdx === firstBetterIndex ? 'first-better' : '';
            const statusClass = cell.status === 'in' ? 'res-in' : (cell.status === 'out' ? 'res-out' : '');

            const editable = isCurrent || isUnlocked;
            const betDisabled = !editable ? 'disabled' : '';
            const scoreDisabled = (cell.bet === null || !editable) ? 'disabled' : '';

            // Default display is empty if score is null
            let scoreOpts = `<option value="">${cell.score === null ? '' : cell.score}</option>`;
            
            if (editable && cell.bet !== null) {
                const win = (cell.bet * 4) + 3;
                scoreOpts += `<option value="${prevScore + win}|in">+${win} (IN)</option>`;
                const maxOut = Math.max(cell.bet, 8 - cell.bet);
                for (let i = 1; i <= maxOut; i++) {
                    const loss = i * 2;
                    scoreOpts += `<option value="${prevScore - loss}|out">-${loss} (OUT)</option>`;
                }
            }

            td.innerHTML = `
                <div class="cell-box ${isFirst} ${statusClass}">
                    <div class="bet-part">
                        <select ${betDisabled} onchange="updateBet(${rIdx}, ${pIdx}, this.value)">
                            <option value="">-</option>
                            ${[0,1,2,3,4,5,6,7,8].map(v => `<option value="${v}" ${v==cell.bet?'selected':''}>${v}</option>`).join('')}
                        </select>
                    </div>
                    <div class="score-part">
                        <select ${scoreDisabled} onchange="updateScore(${rIdx}, ${pIdx}, this.value)">
                            ${scoreOpts}
                        </select>
                    </div>
                </div>
            `;
            tr.appendChild(td);
        });
        roundsBody.appendChild(tr);
    });
}

function startLongPress(idx) {
    longPressTimer = setTimeout(() => {
        unlockedRoundIdx = idx;
        render();
    }, 800);
}

function stopLongPress() {
    clearTimeout(longPressTimer);
}

function updateBet(rIdx, pIdx, val) {
    const round = state.rounds[rIdx];
    const num = val === "" ? null : parseInt(val);
    const old = round[pIdx].bet;
    round[pIdx].bet = num;

    const betCount = round.filter(p => p.bet !== null).length;
    if (betCount === state.players.length) {
        const sum = round.reduce((acc, p) => acc + p.bet, 0);
        if (sum === 8) {
            alert("Sum of bets cannot be 8!");
            round[pIdx].bet = old;
        }
    }
    render();
}

function updateScore(rIdx, pIdx, val) {
    if (val === "") return;
    const [score, status] = val.split('|');
    state.rounds[rIdx][pIdx].score = parseInt(score);
    state.rounds[rIdx][pIdx].status = status;
    unlockedRoundIdx = null; // Re-lock if it was an edit

    // Automatically add round if current is finished
    const lastRound = state.rounds[state.rounds.length - 1];
    if (lastRound.every(p => p.score !== null)) {
        addNewRoundData(false);
    }
    render();
}

function updateBetSum(curIdx) {
    const sum = state.rounds[curIdx].reduce((acc, p) => acc + (p.bet || 0), 0);
    document.getElementById('betSum').innerText = sum;
}

function updateHighlights() {
    const curIdx = getCurrentRoundIdx();
    const targetIdx = state.rounds[curIdx].some(p => p.score !== null) ? curIdx : (curIdx - 1);
    if (targetIdx < 0) return;

    const scores = state.rounds[targetIdx].map(p => p.score || 0);
    const max = Math.max(...scores), min = Math.min(...scores);
    const headers = document.getElementById('playerNamesRow').cells;
    
    for(let i=0; i<headers.length; i++) {
        headers[i].classList.remove('high-score', 'low-score');
        if (max !== min) {
            if (scores[i] === max) headers[i].classList.add('high-score');
            if (scores[i] === min) headers[i].classList.add('low-score');
        }
    }
}

function save() { localStorage.setItem('eightCardsState', JSON.stringify(state)); }
function updatePlayerName(i, v) { state.players[i] = v; save(); }
function removePlayer(i) { if(confirm("Remove player?")) { state.players.splice(i,1); state.rounds.forEach(r => r.splice(i,1)); render(); } }

document.getElementById('addPlayerBtn').onclick = () => {
    if(state.players.length < 6) {
        state.players.push(`P${state.players.length+1}`);
        state.rounds.forEach(r => r.push({bet:null, score:null, status:null}));
        render();
    }
};

document.getElementById('resetBtn').onclick = () => {
    if(confirm("Reset Game?")) { localStorage.clear(); location.reload(); }
};

document.getElementById('shareBtn').onclick = () => {
    const d = btoa(JSON.stringify(state));
    navigator.clipboard.writeText(location.origin+location.pathname+'?data='+d);
    alert("Share link copied to clipboard!");
};

init();