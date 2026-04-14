let players = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
const roundsBody = document.getElementById('roundsBody');
const namesRow = document.getElementById('playerNamesRow');

function init() {
    renderHeaders();
    roundsBody.innerHTML = '';
    for (let i = 0; i < 5; i++) addRow();
}

function renderHeaders() {
    namesRow.innerHTML = '';
    players.forEach((name, index) => {
        const th = document.createElement('th');
        th.innerHTML = `
            <div class="player-header">
                <input type="text" value="${name}" class="player-name-input" onchange="players[${index}]=this.value">
                <button class="remove-btn" onclick="removePlayer(${index})">×</button>
            </div>
        `;
        namesRow.appendChild(th);
    });
}

function addRow() {
    const tr = document.createElement('tr');
    players.forEach((_, pIndex) => {
        const td = document.createElement('td');
        td.innerHTML = `
            <div class="cell-container">
                <select class="bet-select" onchange="checkSumRule(this)">
                    ${[0,1,2,3,4,5,6,7,8].map(v => `<option value="${v}">${v}</option>`).join('')}
                </select>
                <input type="number" class="score-input" onchange="validateScore(this, ${pIndex})">
            </div>
        `;
        tr.appendChild(td);
    });
    roundsBody.appendChild(tr);
}

function removePlayer(index) {
    if (confirm(`Are you sure you want to remove ${players[index]}?`)) {
        players.splice(index, 1);
        renderHeaders();
        // Remove the corresponding cells from every row
        Array.from(roundsBody.rows).forEach(row => row.deleteCell(index));
        updateHighlights();
    }
}

function checkSumRule(select) {
    const row = select.closest('tr');
    const bets = Array.from(row.querySelectorAll('.bet-select')).map(s => parseInt(s.value));
    const sum = bets.reduce((a, b) => a + b, 0);
    if (sum === 8) {
        alert("🚨 Guardrail: The sum of bets in a round cannot be exactly 8!");
        select.value = 0;
    }
}

function validateScore(input, pIndex) {
    const row = input.closest('tr');
    const rowIndex = Array.from(roundsBody.rows).indexOf(row);
    const bet = parseInt(row.querySelectorAll('.bet-select')[pIndex].value);
    const score = parseInt(input.value);

    // Get previous score
    let prevScore = 0;
    if (rowIndex > 0) {
        const prevInput = roundsBody.rows[rowIndex - 1].querySelectorAll('.score-input')[pIndex];
        prevScore = parseInt(prevInput.value) || 0;
    }

    const winScore = (bet * 4) + 3;
    const diff = prevScore - score;
    
    const isValidWin = (score === winScore);
    const isValidLoss = (score < prevScore && diff % 2 === 0);

    if (!isValidWin && !isValidLoss && input.value !== "") {
        alert(`❌ Invalid Score!\nMust be exactly ${winScore} (Bet*4+3) OR lower than previous (${prevScore}) by steps of 2.`);
        input.value = "";
    }
    updateHighlights();
}

function updateHighlights() {
    // Reset highlights
    Array.from(namesRow.cells).forEach(cell => cell.className = '');

    const rows = Array.from(roundsBody.rows);
    let lastRowWithData = null;

    // Find latest row where at least one score is entered
    for (let i = rows.length - 1; i >= 0; i--) {
        const rowScores = Array.from(rows[i].querySelectorAll('.score-input')).map(inp => inp.value);
        if (rowScores.some(s => s !== "")) {
            lastRowWithData = rows[i];
            break;
        }
    }

    if (!lastRowWithData) return;

    const scores = Array.from(lastRowWithData.querySelectorAll('.score-input')).map(inp => parseInt(inp.value) || 0);
    const max = Math.max(...scores);
    const min = Math.min(...scores);

    scores.forEach((s, i) => {
        if (s === max) namesRow.cells[i].classList.add('high-score-glow');
        if (s === min) namesRow.cells[i].classList.add('low-score-glow');
    });
}

document.getElementById('addPlayerBtn').onclick = () => {
    if (players.length < 6) {
        players.push(`Player ${players.length + 1}`);
        init();
    }
};

document.getElementById('addRowBtn').onclick = addRow;
document.getElementById('resetBtn').onclick = () => { if(confirm("Start a new game?")) init(); };

init();