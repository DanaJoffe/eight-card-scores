let players = JSON.parse(localStorage.getItem('8cards_players')) || ['Player 1', 'Player 2'];
let rows = parseInt(localStorage.getItem('8cards_rows')) || 5;

function init() {
    renderBoard();
}

function renderBoard() {
    const nameRow = document.getElementById('player-names');
    const subHeader = document.getElementById('sub-header');
    const body = document.getElementById('game-body');

    nameRow.innerHTML = '';
    subHeader.innerHTML = '';
    body.innerHTML = '';

    players.forEach((name, pIdx) => {
        // Headers
        const th = document.createElement('th');
        th.id = `p-header-${pIdx}`;
        th.className = 'player-title';
        th.innerHTML = `
            <input class="name-input" value="${name}" onchange="updateName(${pIdx}, this.value)">
            <button class="btn-remove" onclick="removePlayer(${pIdx})">Remove</button>
        `;
        nameRow.appendChild(th);

        const subTh = document.createElement('th');
        subTh.innerHTML = `<div class="cell-pair"><span>Bet</span><span>Score</span></div>`;
        subHeader.appendChild(subTh);
    });

    // Rows
    for (let r = 0; r < rows; r++) {
        const tr = document.createElement('tr');
        players.forEach((_, pIdx) => {
            const td = document.createElement('td');
            const bVal = localStorage.getItem(`b-${r}-${pIdx}`) || '';
            const sVal = localStorage.getItem(`s-${r}-${pIdx}`) || '';
            
            td.innerHTML = `
                <div class="cell-pair">
                    <input type="number" inputmode="numeric" placeholder="B" value="${bVal}" onchange="updateData('b', ${r}, ${pIdx}, this.value)">
                    <input type="number" inputmode="numeric" placeholder="S" value="${sVal}" onchange="updateData('s', ${r}, ${pIdx}, this.value)">
                </div>
            `;
            tr.appendChild(td);
        });
        body.appendChild(tr);
    }
    highlightScores();
}

function updateData(type, r, p, val) {
    localStorage.setItem(`${type}-${r}-${p}`, val);
    
    if (type === 'b') validateBetSum(r);
    if (type === 's') validateScoreRule(r, p, val);
    
    highlightScores();
}

function validateBetSum(r) {
    let sum = 0;
    players.forEach((_, pIdx) => {
        sum += parseInt(localStorage.getItem(`b-${r}-${pIdx}`) || 0);
    });
    if (sum === 8) alert(`Row ${r + 1}: Sum of bets cannot be exactly 8!`);
}

function validateScoreRule(r, p, val) {
    if (r === 0 || val === '') return;
    const prevScore = parseInt(localStorage.getItem(`s-${r-1}-${p}`) || 0);
    const currentScore = parseInt(val);
    const magicNumber = (prevScore * 4) + 3;

    if (currentScore !== magicNumber && currentScore >= prevScore) {
        alert(`Rule Broken! Score must be exactly ${magicNumber} or lower than previous score (${prevScore}).`);
    }
}

function highlightScores() {
    // Reset highlights
    players.forEach((_, i) => document.getElementById(`p-header-${i}`).className = 'player-title');

    // Find latest row with data
    let latestRow = -1;
    for (let r = rows - 1; r >= 0; r--) {
        let hasData = false;
        players.forEach((_, pIdx) => { if(localStorage.getItem(`s-${r}-${pIdx}`)) hasData = true; });
        if (hasData) { latestRow = r; break; }
    }

    if (latestRow === -1) return;

    let scores = players.map((_, pIdx) => parseInt(localStorage.getItem(`s-${latestRow}-${pIdx}`) || 0));
    let min = Math.min(...scores);
    let max = Math.max(...scores);

    players.forEach((_, i) => {
        const header = document.getElementById(`p-header-${i}`);
        if (scores[i] === min && min !== max) header.classList.add('low-score');
        if (scores[i] === max && min !== max) header.classList.add('high-score');
    });
}

function addPlayer() { players.push(`Player ${players.length + 1}`); save(); }
function removePlayer(idx) { players.splice(idx, 1); save(); }
function addRow() { rows++; save(); }
function updateName(idx, val) { players[idx] = val; save(); }
function save() {
    localStorage.setItem('8cards_players', JSON.stringify(players));
    localStorage.setItem('8cards_rows', rows);
    renderBoard();
}
function resetGame() { if(confirm("Reset all?")) { localStorage.clear(); location.reload(); } }

init();