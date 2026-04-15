let state = {
    players: ["Player 1", "Player 2", "Player 3", "Player 4"],
    rounds: []
};

const roundsBody = document.getElementById('roundsBody');
const namesRow = document.getElementById('playerNamesRow');

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
    renderHeaders();
    renderTable();
    updateHighlights(); // Restored logic
    save();
}

function renderHeaders() {
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
}

function renderTable() {
    roundsBody.innerHTML = '';
    state.rounds.forEach((round, rIdx) => {
        const tr = document.createElement('tr');
        const firstBetterIndex = rIdx % state.players.length;

        round.forEach((cell, pIdx) => {
            const td = document.createElement('td');
            const prevScore = rIdx > 0 ? state.rounds[rIdx-1][pIdx].score : 0;
            const winVal = (cell.bet * 4) + 3;

            const canBet = (rIdx === 0) || (state.rounds[rIdx-1][pIdx].score !== null);
            const betDisabled = !canBet ? 'disabled' : '';
            const scoreDisabled = cell.bet === null ? 'disabled' : '';
            const isFirst = pIdx === firstBetterIndex ? 'first-better' : '';

            td.innerHTML = `
                <div class="cell-box ${isFirst}">
                    <div class="bet-part">
                        <select ${betDisabled} onchange="updateBet(${rIdx}, ${pIdx}, this.value)">
                            <option value="" ${cell.bet === null ? 'selected' : ''}>-</option>
                            ${[0,1,2,3,4,5,6,7,8].map(v => 
                                `<option value="${v}" ${v === cell.bet ? 'selected' : ''}>${v}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="score-part">
                        <select ${scoreDisabled} onchange="updateScore(${rIdx}, ${pIdx}, this.value)">
                            <option value="">${cell.score}</option>
                            <option class="opt-win" value="${prevScore + winVal}">+${winVal}</option>
                            <option class="opt-loss" value="${prevScore - 2}">-2</option>
                            <option class="opt-loss" value="${prevScore - 4}">-4</option>
                            <option class="opt-loss" value="${prevScore - 6}">-6</option>
                            <option class="opt-loss" value="${prevScore - 8}">-8</option>
                            <option class="opt-loss" value="${prevScore - 10}">-10</option>
                            <option class="opt-loss" value="${prevScore - 12}">-12</option>
                        </select>
                    </div>
                </div>
            `;
            tr.appendChild(td);
        });
        roundsBody.appendChild(tr);
    });
}

function updateHighlights() {
    // 1. Reset all header colors first
    const headers = namesRow.querySelectorAll('th');
    headers.forEach(th => {
        th.style.backgroundColor = ""; // Clear inline styles
        th.classList.remove('high-score', 'low-score');
    });
    
    // 2. Find the latest round that has any score data
    let activeRIdx = -1;
    for (let i = state.rounds.length - 1; i >= 0; i--) {
        // We check if any score in this round is non-zero (or has been set)
        const hasData = state.rounds[i].some(c => c.score !== 0);
        if (hasData) {
            activeRIdx = i; 
            break;
        }
    }
    
    // If no scores have been entered yet, stop here
    if (activeRIdx === -1) return;

    // 3. Extract the scores from that specific round
    const currentScores = state.rounds[activeRIdx].map(c => c.score);
    const max = Math.max(...currentScores);
    const min = Math.min(...currentScores);

    // 4. If everyone has the same score (e.g., beginning of game), don't highlight
    if (max === min) return;

    // 5. Apply the classes to the header cells
    currentScores.forEach((s, i) => {
        if (s === max) {
            namesRow.cells[i].classList.add('high-score');
        } else if (s === min) {
            namesRow.cells[i].classList.add('low-score');
        }
    });
}

function updateBet(rIdx, pIdx, val) {
    if (val === "") {
        state.rounds[rIdx][pIdx].bet = null;
        render();
        return;
    }
    const num = parseInt(val);
    const roundData = state.rounds[rIdx];
    const oldBet = roundData[pIdx].bet;
    roundData[pIdx].bet = num;

    const playersWhoHaveBet = roundData.filter(p => p.bet !== null).length;
    if (playersWhoHaveBet === state.players.length) {
        const sum = roundData.reduce((acc, c) => acc + c.bet, 0);
        if (sum === 8) {
            alert("Guardrail: The last player's bet cannot result in a total sum of 8!");
            roundData[pIdx].bet = oldBet;
            render();
            return;
        }
    }
    render();
}

function updateScore(rIdx, pIdx, val) {
    if (val === "") return;
    state.rounds[rIdx][pIdx].score = parseInt(val);
    render();
}

function removePlayer(i) {
    if (confirm("Are you sure?")) {
        state.players.splice(i, 1);
        state.rounds.forEach(r => r.splice(i, 1));
        render();
    }
}

function updatePlayerName(i, val) {
    state.players[i] = val;
    save();
}

function save() {
    localStorage.setItem('eightCardsState', JSON.stringify(state));
}

document.getElementById('shareBtn').onclick = () => {
    const data = btoa(JSON.stringify(state));
    const url = `${window.location.origin}${window.location.pathname}?data=${data}`;
    navigator.clipboard.writeText(url).then(() => alert("URL Copied!"));
};

document.getElementById('addPlayerBtn').onclick = () => {
    if (state.players.length < 6) {
        state.players.push(`P${state.players.length + 1}`);
        state.rounds.forEach(r => r.push({ bet: null, score: 0 }));
        render();
    }
};

document.getElementById('addRowBtn').onclick = () => addNewRoundData(true);

document.getElementById('resetBtn').onclick = () => {
    if (confirm("New game?")) {
        localStorage.removeItem('eightCardsState');
        window.location.href = window.location.pathname;
    }
};

init();