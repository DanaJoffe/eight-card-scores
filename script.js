let state = {
    players: ["Player 1", "Player 2", "Player 3", "Player 4"],
    rounds: []
};

let unlockedRoundIdx = null;
let longPressTimer;
let lastRenderedCurIdx = -1;
let openPopover = null; // {rIdx, pIdx, type: 'bet'|'score'} or null

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

    // When the current row changes (e.g. a new round was appended), pull it
    // into the middle of the viewport so the user isn't editing at the bottom edge.
    if (curIdx !== lastRenderedCurIdx) {
        const rows = document.getElementById('roundsBody').rows;
        if (rows[curIdx]) rows[curIdx].scrollIntoView({ block: 'center', behavior: 'smooth' });
        lastRenderedCurIdx = curIdx;
    }
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

            const betLabel = cell.bet === null ? '-' : cell.bet;
            const scoreLabel = cell.score === null ? '' : cell.score;

            td.innerHTML = `
                <div class="cell-box ${isFirst} ${statusClass}">
                    <div class="bet-part">
                        <button class="cell-button" ${betDisabled}
                            onclick="event.stopPropagation(); openPicker(${rIdx}, ${pIdx}, 'bet', this)">${betLabel}</button>
                    </div>
                    <div class="score-part">
                        <button class="cell-button" ${scoreDisabled}
                            onclick="event.stopPropagation(); openPicker(${rIdx}, ${pIdx}, 'score', this)">${scoreLabel}</button>
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
        unlockedRoundIdx = (unlockedRoundIdx === idx) ? null : idx;
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

    // If the bet actually changed (and wasn't reverted) and this cell already
    // has a score, the score no longer matches the new bet's IN/OUT options.
    // Clear it and unwind its delta from all later rounds for this player.
    if (round[pIdx].bet !== old && round[pIdx].score !== null) {
        const prevScore = rIdx > 0 ? (state.rounds[rIdx-1][pIdx].score || 0) : 0;
        const delta = round[pIdx].score - prevScore;
        round[pIdx].score = null;
        round[pIdx].status = null;
        for (let i = rIdx + 1; i < state.rounds.length; i++) {
            if (state.rounds[i][pIdx].score !== null) {
                state.rounds[i][pIdx].score -= delta;
            }
        }
    }

    render();
}

function updateScore(rIdx, pIdx, val) {
    if (val === "") return;
    const [score, status] = val.split('|');
    const newScore = parseInt(score);
    const oldScore = state.rounds[rIdx][pIdx].score;

    state.rounds[rIdx][pIdx].score = newScore;
    state.rounds[rIdx][pIdx].status = status;

    // Stored scores are cumulative totals, so editing a past round must shift
    // every later (already-scored) round for this player by the same delta.
    if (oldScore !== null && newScore !== oldScore) {
        const delta = newScore - oldScore;
        for (let i = rIdx + 1; i < state.rounds.length; i++) {
            if (state.rounds[i][pIdx].score !== null) {
                state.rounds[i][pIdx].score += delta;
            }
        }
    }

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

function openPicker(rIdx, pIdx, type, anchorEl) {
    // Toggle off if the same picker is already open.
    if (openPopover && openPopover.rIdx === rIdx && openPopover.pIdx === pIdx && openPopover.type === type) {
        closePicker();
        return;
    }

    const cell = state.rounds[rIdx][pIdx];
    const popover = document.getElementById('popover');
    let html = '';

    if (type === 'bet') {
        // Sum-of-8 rule: if every OTHER player in this round already has a bet,
        // this player cannot pick the value that would make the round total
        // exactly 8. Mark it disabled (and visually flagged) in the picker.
        const round = state.rounds[rIdx];
        const otherBets = round.filter((_, i) => i !== pIdx).map(p => p.bet);
        const allOthersBet = otherBets.every(b => b !== null);
        const sumOthers = otherBets.reduce((a, b) => a + (b || 0), 0);
        const forbidden = allOthersBet ? (8 - sumOthers) : null;

        const renderBetBtn = (v) => {
            const isForbidden = v === forbidden;
            const attrs = isForbidden
                ? `class="forbidden" disabled title="Sum of bets would be 8"`
                : `onclick="pickBet(${rIdx},${pIdx},${v})"`;
            return `<button ${attrs}>${v}</button>`;
        };

        const commonBets = [0, 1, 2, 3];
        const rareBets = [4, 5, 6, 7, 8];
        html += `<div class="popover-row common">${commonBets.map(renderBetBtn).join('')}</div>`;
        html += `<div class="popover-row rare">${rareBets.map(renderBetBtn).join('')}
            <button onclick="pickBet(${rIdx},${pIdx},null)">Clear</button></div>`;
    } else {
        if (cell.bet === null) return;
        const prevScore = rIdx > 0 ? (state.rounds[rIdx-1][pIdx].score || 0) : 0;
        const win = (cell.bet * 4) + 3;
        const maxOut = Math.max(cell.bet, 8 - cell.bet);

        const commonBtns = [`<button class="in" onclick="pickScore(${rIdx},${pIdx},${prevScore + win},'in')">+${win} IN</button>`];
        for (let i = 1; i <= Math.min(2, maxOut); i++) {
            const loss = i * 2;
            commonBtns.push(`<button class="out" onclick="pickScore(${rIdx},${pIdx},${prevScore - loss},'out')">-${loss}</button>`);
        }
        html += `<div class="popover-row common">${commonBtns.join('')}</div>`;

        if (maxOut > 2) {
            const rareBtns = [];
            for (let i = 3; i <= maxOut; i++) {
                const loss = i * 2;
                rareBtns.push(`<button onclick="pickScore(${rIdx},${pIdx},${prevScore - loss},'out')">-${loss}</button>`);
            }
            html += `<div class="popover-row rare">${rareBtns.join('')}</div>`;
        }
    }

    popover.innerHTML = html;
    popover.hidden = false;
    openPopover = {rIdx, pIdx, type};

    // Position below the anchor; flip above if it would overflow the viewport.
    const r = anchorEl.getBoundingClientRect();
    popover.style.top = `${r.bottom + 4}px`;
    popover.style.left = `${r.left}px`;
    requestAnimationFrame(() => {
        const p = popover.getBoundingClientRect();
        if (p.right > window.innerWidth - 4) {
            popover.style.left = `${Math.max(4, window.innerWidth - p.width - 4)}px`;
        }
        if (p.bottom > window.innerHeight - 4) {
            popover.style.top = `${Math.max(4, r.top - p.height - 4)}px`;
        }
    });
}

function closePicker() {
    openPopover = null;
    const popover = document.getElementById('popover');
    popover.hidden = true;
    popover.innerHTML = '';
}

function pickBet(rIdx, pIdx, value) {
    closePicker();
    updateBet(rIdx, pIdx, value === null ? "" : String(value));
}

function pickScore(rIdx, pIdx, score, status) {
    closePicker();
    updateScore(rIdx, pIdx, `${score}|${status}`);
}

document.addEventListener('click', (e) => {
    if (!openPopover) return;
    const popover = document.getElementById('popover');
    if (popover.contains(e.target)) return;
    closePicker();
});

document.querySelector('.table-area').addEventListener('scroll', closePicker, { passive: true });

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