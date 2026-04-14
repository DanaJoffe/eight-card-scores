const tableBody = document.getElementById('roundsBody');
const namesRow = document.getElementById('playerNamesRow');
let playerCount = 4; // Default starting players

function initGame() {
    tableBody.innerHTML = '';
    namesRow.innerHTML = '';
    
    // Create Headers
    for (let i = 0; i < playerCount; i++) {
        const th = document.createElement('th');
        th.innerHTML = `<input type="text" value="Player ${i+1}" class="player-name-input">
                        <button onclick="removePlayer(${i})">×</button>`;
        namesRow.appendChild(th);
    }

    // Create Initial 5 Rows
    for (let i = 0; i < 5; i++) {
        addRow();
    }
}

function addRow() {
    const tr = document.createElement('tr');
    for (let i = 0; i < playerCount; i++) {
        const td = document.createElement('td');
        td.innerHTML = `
            <div class="cell-wrapper">
                <select class="bet-input" onchange="validateRow(this)">
                    ${[0,1,2,3,4,5,6,7,8].map(n => `<option value="${n}">${n}</option>`).join('')}
                </select>
                <input type="number" class="score-input" onchange="validateScore(this, ${i})">
            </div>
        `;
        tr.appendChild(td);
    }
    tableBody.appendChild(tr);
}

function validateRow(selectElement) {
    const row = selectElement.closest('tr');
    const bets = Array.from(row.querySelectorAll('.bet-input')).map(s => parseInt(s.value));
    const sum = bets.reduce((a, b) => a + b, 0);
    
    if (sum === 8) {
        alert("Rule Broken: Sum of bets cannot be exactly 8!");
        selectElement.value = 0;
    }
}

function validateScore(input, playerIndex) {
    const currentRow = input.closest('tr');
    const bet = parseInt(currentRow.querySelectorAll('.bet-input')[playerIndex].value);
    const score = parseInt(input.value);
    
    // Get previous score
    const prevRow = currentRow.previousElementSibling;
    const prevScore = prevRow ? parseInt(prevRow.querySelectorAll('.score-input')[playerIndex].value || 0) : 0;

    const winScore = (bet * 4) + 3;
    const difference = prevScore - score;

    // Check rules: either winning score OR (lower than prev score by multiples of 2)
    const isWin = (score === winScore);
    const isLoss = (score < prevScore && difference % 2 === 0);

    if (!isWin && !isLoss) {
        alert("Invalid Score! Must be (Bet*4+3) or (Previous Score - 2x).");
    }
    updateHighlights();
}

function updateHighlights() {
    const rows = tableBody.querySelectorAll('tr');
    let lastFilledRow = null;

    // Find the last row that has scores entered
    for (let i = rows.length - 1; i >= 0; i--) {
        const inputs = Array.from(rows[i].querySelectorAll('.score-input'));
        if (inputs.some(input => input.value !== "")) {
            lastFilledRow = rows[i];
            break;
        }
    }

    if (!lastFilledRow) return;

    const scores = Array.from(lastFilledRow.querySelectorAll('.score-input')).map(inp => parseInt(inp.value || 0));
    const min = Math.min(...scores);
    const max = Math.max(...scores);

    const headers = namesRow.querySelectorAll('th');
    headers.forEach((th, idx) => {
        th.classList.remove('low-score', 'high-score');
        if (scores[idx] === min) th.classList.add('low-score');
        if (scores[idx] === max) th.classList.add('high-score');
    });
}

function removePlayer(index) {
    if (playerCount > 1) {
        playerCount--;
        initGame();
    }
}

document.getElementById('addPlayerBtn').addEventListener('click', () => {
    if (playerCount < 6) {
        playerCount++;
        initGame();
    }
});

document.getElementById('addRowBtn').addEventListener('click', addRow);
document.getElementById('resetBtn').addEventListener('click', initGame);

initGame();