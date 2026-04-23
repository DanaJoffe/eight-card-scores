# Eight Cards Scoreboard Project Blueprint

## 1. Project Overview
This is a mobile-first Single Page Application (SPA) designed to track scores for the card game "Eight Cards." The app features a dynamic table that "squeezes" to fit mobile screens, circular turn tracking, and a risk-based scoring system.

---

## 2. Core Game Logic & Rules

### A. Scoring Logic (Risk-Based)
For each round, a player places a **Bet (0-8)**. After the round, the player is either **"IN"** or **"OUT"**.
* **"IN" (Success):** Addition to score = `(Bet * 4) + 3`.
* **"OUT" (Failure):** Penalty is calculated in steps of 2. The maximum penalty depends on the bet:
    * `Max Penalty Steps = max(Bet, 8 - Bet)`
    * *Example:* If Bet is 2, options are -2, -4, -6, -8, -10, -12.
    * *Example:* If Bet is 5, options are -2, -4, -6, -8, -10.

### B. Round Progression & Lifecycle
* **Current Round:** The app automatically identifies the "Current Round" as the first row in the table that has at least one empty score.
* **Automatic Growth:** A new round row is automatically appended to the table once the current round is fully completed (all players have bets and scores).
* **Round Locking:** Past rounds are locked by default to prevent accidental edits.
* **Long-Tap Editing:** Users can "Unlock" a past round for editing by performing a **long-press (800ms)** on that specific row.

### C. Betting Constraints
* **Sum-of-8 Rule:** The total sum of bets in a single round **cannot equal exactly 8**. This is enforced when the last player in the round attempts to place their bet.
* **Sequential Betting:** Players can only place a bet if they have a recorded score in the round immediately preceding the current one (except for Round 1).

### D. Turn Rotation
* The "First Better" rotates every round.
* **Logic:** `FirstBetterIndex = RoundIndex % NumberOfPlayers`.
* **Visual:** The cell of the first better must have a distinct blue left border (`#3498db`).

---

## 3. UI & UX Requirements

### A. Mobile "Squeeze" Layout
* **No Horizontal Scrolling:** Use `table-layout: fixed` to ensure up to 6 players fit on one screen.
* **Column Separation:** Use clear vertical borders (e.g., `2px`) between player columns to distinguish boundaries.
* **Cell Split:** Each player column is split vertically: 35% for the **Bet** (left) and 65% for the **Score** (right).
* **Score Visualization:** * Display "IN" scores with a light green background (`#d4edda`).
    * Display "OUT" scores with a light red background (`#f8d7da`).
* **Sticky UI:** Headers (Player Names) must stay fixed at the top while scrolling.
* **Orientation:** If the screen is rotated horizontally (landscape), hide headers to provide a full-screen table view.

### B. Interactivity
* **New Game:** A button to clear all data and reset to 1 round and the current player count.
* **Add Player:** Adds a new column (Max 6 players).
* **Share:** Encodes the entire state into a Base64 string and appends it to the URL (`?data=...`) for sharing.
* **Bet Sum:** Display the total sum of bets for the current round prominently in the header.

---

## 4. Technical Implementation Details

### State Management
The `state` object must follow this structure:
```javascript
let state = {
    players: ["Name 1", "Name 2", ...],
    rounds: [
        [ {bet: 2, score: 11, status: 'in'}, ... ], // Round data
    ]
};
```


## 5. Future Improvments

* חוק לאפליקציה - אי אפשר שכולם יהיו בפנים
* להוריד את ה חיצים אחרי ששמו הימור
* מסך מלא
* פנלטי מינוס 5 על שטויות
* כפתור שמציג אותנו בפירמידה של המקומות וההפרשים

