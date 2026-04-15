let state = {
    players: ["Player 1", "Player 2"],
    rounds: []
};

const roundsBody = document.getElementById('roundsBody');
const namesRow = document.getElementById('playerNamesRow');

// --- Initialization ---

function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get('data');

    if (sharedData) {
        try {
            state = JSON.parse(atob(sharedData));
        } catch (e) {
            console.error("Failed to parse shared data");
        }
    } else {
        const saved = localStorage.getItem('eightCardsState');
        if (saved) state = JSON.parse(saved);
    }

    if (state.rounds.length === 0) {
        for(let i=0; i<5; i++) createNewRoundData();
    }
    renderAll();
}

function createNewRoundData() {
    const round = state.players.map(() => ({ bet: 0, score: 0 }));
    state.rounds.push(round);
}

// --- Rendering ---

function renderAll() {
    renderHeaders();
    renderRows();
    updateHighlights();
    save();
}

function renderHeaders() {
    namesRow.innerHTML = '';
    state.players.forEach((name, i) => {
        const th = document.createElement('th');
        th.innerHTML = `
            <div class="player-header-ui">
                <input type="text" class="player-name-input" value="${name}" onchange="updatePlayerName(${i}, this.value)">
                <button class="remove-p-btn" onclick="removePlayer(${i})">×</button>
            </div>
        `;
        namesRow.appendChild(th);
    });
}

function renderRows() {
    roundsBody.innerHTML = '';
    state.rounds.forEach((round, rIdx) => {
        const tr = document.createElement('tr');
        round.forEach((cell, pIdx) => {
            const td = document.createElement('td');
            const winVal = (cell.bet * 4) + 3;
            const prevScore = rIdx > 0 ? state.rounds[rIdx-1][pIdx].score : 0;

            td.innerHTML = `
                <div class="cell-split">
                    <div class="bet-col">
                        <select onchange="updateBet(${rIdx}, ${pIdx}, this.value)">
                            ${[0,1,2,3,4,5,6,7,8].map(v => `<option value="${v}" ${v==cell.bet?'selected':''}>${v}</option>`).join('')}
                        </select>
                    </div>
                    <div class="score-col">
                        <select onchange="updateScore(${rIdx}, ${pIdx}, this.value)">
                            <option value="">${cell.score}</option>
                            <option class="win" value="${prevScore + winVal}">+${winVal}</option>
                            <option class="loss" value="${prevScore - 2}">-2</option>
                            <option class="loss" value="${prevScore - 4}">-4</option>
                            <option value="more">more...</option>
                        </select>
                    </div>
                </div>
            `;
            tr.appendChild(td);
        });
        roundsBody.appendChild(tr);
    });
}

// --- Logic ---

function updateBet(rIdx, pIdx, val) {
    const newVal = parseInt(val);
    state.rounds[rIdx][pIdx].bet = newVal;
    
    // Guardrail: Sum not equal to 8
    const sum = state.rounds[rIdx].reduce((acc, curr) => acc + curr.bet, 0);
    if (sum === 8) {
        alert("Rule Broken: Sum of bets cannot be 8!");
        state.rounds[rIdx][pIdx].bet = 0;
    }
    renderAll();
}

function updateScore(rIdx, pIdx, val) {
    if (val === "more") {
        const prevScore = rIdx > 0 ? state.rounds[rIdx-1][pIdx].score : 0;
        let extra = prompt("Choose loss: -6, -8, -10, -12", "-6");
        if (["-6", "-8", "-10", "-12"].includes(extra)) {
            state.rounds[rIdx][pIdx].score = prevScore + parseInt(extra);
        }
    } else if (val !== "") {
        state.rounds[rIdx][pIdx].score = parseInt(val);
    }
    renderAll();
}

function removePlayer(i) {
    if (confirm("Are you sure?")) {
        state.players.splice(i, 1);
        state.rounds.forEach(r => r.splice(i, 1));
        renderAll();
    }
}

function updatePlayerName(i, val) {
    state.players[i] = val;
    save();
}

function updateHighlights() {
    document.querySelectorAll('th').forEach(th => th.className = '');
    
    // Find last round with any scores
    let lastActiveIdx = -1;
    for(let i = state.rounds.length -1; i >= 0; i--) {
        if(state.rounds[i].some(c => c.score !== 0)) {
            lastActiveIdx = i;
            break;
        }
    }

    if (lastActiveIdx === -1) return;

    const scores = state.rounds[lastActiveIdx].map(c => c.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);

    state.players.forEach((_, i) => {
        if (scores[i] === max && max !== min) namesRow.cells[i].classList.add('high-score');
        if (scores[i] === min && max !== min) namesRow.cells[i].classList.add('low-score');
    });
}

// --- Persistence ---

function save() {
    localStorage.setItem('eightCardsState', JSON.stringify(state));
}

document.getElementById('shareBtn').onclick = () => {
    const data = btoa(JSON.stringify(state));
    const url = window.location.origin + window.location.pathname + "?data=" + data;
    navigator.clipboard.writeText(url);
    alert("Shareable URL copied to clipboard!");
};

document.getElementById('addPlayerBtn').onclick = () => {
    if (state.players.length < 6) {
        state.players.push("New Player");
        state.rounds.forEach(r => r.push({ bet: 0, score: 0 }));
        renderAll();
    }
};

document.getElementById('addRowBtn').onclick = () => {
    createNewRoundData();
    renderAll();
};

document.getElementById('resetBtn').onclick = () => {
    if (confirm("Reset new game?")) {
        localStorage.removeItem('eightCardsState');
        location.href = window.location.pathname; // Clear URL params too
    }
};

init();