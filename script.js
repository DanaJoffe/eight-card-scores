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
    updateHighlights();
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
            
            const canBet = (rIdx === 0) || (state.rounds[rIdx-1][pIdx].score !== null);
            const betDisabled = !canBet ? 'disabled' : '';
            const scoreDisabled = cell.bet === null ? 'disabled' : '';
            const isFirst = pIdx === firstBetterIndex ? 'first-better' : '';

			// --- Dynamic Scoring Logic with "More" toggle ---
			let scoreOptionsHtml = `<option value="">${cell.score}</option>`;

			if (cell.bet !== null) {
				const winVal = (cell.bet * 4) + 3;
				const maxOutSteps = Math.max(cell.bet, 8 - cell.bet);
				
				// Check if the user has already requested "more" for this specific cell
				// We can store this in a temporary session variable or check a 'data' attribute
				const showAll = cell.showFullMenu === true;

				// "In" Option
				scoreOptionsHtml += `<option class="opt-win" value="${prevScore + winVal}">+${winVal} (IN)</option>`;

				// "Out" Options
				const limit = showAll ? maxOutSteps : Math.min(2, maxOutSteps);
				
				for (let step = 1; step <= limit; step++) {
					const penalty = step * 2;
					scoreOptionsHtml += `<option class="opt-loss" value="${prevScore - penalty}">-${penalty} (OUT)</option>`;
				}

				// Add "More" option if we are currently limiting and there's more to show
				if (!showAll && maxOutSteps > 2) {
					scoreOptionsHtml += `<option value="toggle-more">More...</option>`;
				}
			}

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
                            ${scoreOptionsHtml}
                        </select>
                    </div>
                </div>
            `;
            tr.appendChild(td);
        });
        roundsBody.appendChild(tr);
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

    if (val === "toggle-more") {
        // Set a temporary flag for this specific cell
        state.rounds[rIdx][pIdx].showFullMenu = true;
        render(); // Re-render the table to show the full list
        
        // Optional: on some Androids you can try to focus the element to open it again
        // document.querySelector(`#score-select-${rIdx}-${pIdx}`).focus(); 
        return;
    }

    // Normal score update
    state.rounds[rIdx][pIdx].score = parseInt(val);
    // Reset the "more" flag so it collapses for next time if desired
    delete state.rounds[rIdx][pIdx].showFullMenu; 
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

function updateHighlights() {
    namesRow.querySelectorAll('th').forEach(th => th.classList.remove('high-score', 'low-score'));
    let activeRIdx = -1;
    for (let i = state.rounds.length - 1; i >= 0; i--) {
        if (state.rounds[i].some(c => c.score !== 0)) {
            activeRIdx = i; break;
        }
    }
    if (activeRIdx === -1) return;
    const currentScores = state.rounds[activeRIdx].map(c => c.score);
    const max = Math.max(...currentScores);
    const min = Math.min(...currentScores);
    if (max === min) return;
    currentScores.forEach((s, i) => {
        if (s === max) namesRow.cells[i].classList.add('high-score');
        if (s === min) namesRow.cells[i].classList.add('low-score');
    });
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