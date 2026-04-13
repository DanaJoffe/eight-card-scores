let players = JSON.parse(localStorage.getItem('players')) || ['Player 1', 'Player 2'];
let rowCount = parseInt(localStorage.getItem('rowCount')) || 5;

function init() {
    renderHeader();
    renderRows();
}

function renderHeader() {
    const headerRow = document.getElementById('header-row');
    headerRow.innerHTML = '';
    players.forEach((name, index) => {
        const th = document.createElement('th');
        th.innerHTML = `
            <div class="player-name-cell">
                <input type="text" value="${name}" onchange="updatePlayerName(${index}, this.value)">
                <button class="remove-btn" onclick="removePlayer(${index})">✕</button>
            </div>
        `;
        headerRow.appendChild(th);
    });
}

function renderRows() {
    const body = document.getElementById('score-body');
    body.innerHTML = '';
    for (let r = 0; r < rowCount; r++) {
        const tr = document.createElement('tr');
        players.forEach((_, pIndex) => {
            const td = document.createElement('td');
            const val = localStorage.getItem(`s-${r}-${pIndex}`) || '';
            td.innerHTML = `<input type="number" inputmode="numeric" value="${val}" 
                            onchange="saveScore(${r}, ${pIndex}, this.value)">`;
            tr.appendChild(td);
        });
        body.appendChild(tr);
    }
}

function addPlayer() {
    players.push(`Player ${players.length + 1}`);
    saveAndRefresh();
}

function removePlayer(index) {
    if (confirm("Remove player and their scores?")) {
        players.splice(index, 1);
        saveAndRefresh();
    }
}

function addRow() {
    rowCount++;
    saveAndRefresh();
}

function updatePlayerName(index, name) {
    players[index] = name;
    localStorage.setItem('players', JSON.stringify(players));
}

function saveScore(r, p, val) {
    localStorage.setItem(`s-${r}-${p}`, val);
}

function saveAndRefresh() {
    localStorage.setItem('players', JSON.stringify(players));
    localStorage.setItem('rowCount', rowCount);
    renderHeader();
    renderRows();
}

function resetGame() {
    if (confirm("Clear all scores?")) {
        localStorage.clear();
        location.reload();
    }
}

init();