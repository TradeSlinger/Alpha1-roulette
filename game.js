// Mobile-first European (single-zero) Roulette
class RouletteGame {
    constructor() {
        this.bankroll = 1000;
        this.initialBankroll = 1000;
        this.activeBets = new Map();   // betId -> {type, numbers, amount, element}
        this.betHistory = [];          // chronological chip placements for Undo
        this.isSpinning = false;
        this.results = [];
        this.selectedChipValue = 5;
        this.lastWinningNumber = null;
        this.lastRoundBets = [];       // snapshot of previous round for Rebet
        this.stats = { totalSpins: 0, totalBet: 0, totalWon: 0, wins: 0 };

        this.redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        this.blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
        this.chipValues = [1, 5, 25, 100, 500];

        this.payoutOdds = {
            straight: 35, split: 17, street: 11, corner: 8, sixline: 5,
            column: 2, dozen: 2, red: 1, black: 1, even: 1, odd: 1, low: 1, high: 1
        };

        this.init();
    }

    init() {
        this.buildChips();
        this.buildBoard();
        this.buildOutsideBets();
        this.setupControls();
        this.updateUI();
        this.updateGameStatus();
    }

    // ---------- Chip selector ----------
    buildChips() {
        const container = document.getElementById('chips');
        container.innerHTML = '';
        this.chipValues.forEach(value => {
            const chip = document.createElement('div');
            chip.className = `chip c${value}`;
            chip.dataset.value = value;
            chip.textContent = value >= 1000 ? `${value / 1000}k` : `$${value}`;
            if (value === this.selectedChipValue) chip.classList.add('selected');
            chip.addEventListener('click', () => {
                container.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
                chip.classList.add('selected');
                this.selectedChipValue = value;
            });
            container.appendChild(chip);
        });
    }

    // ---------- Bet element factory ----------
    createBetElement(betType, numbers, label, className) {
        const el = document.createElement('div');
        el.className = className;
        if (label != null) el.textContent = label;
        el.dataset.betType = betType;
        el.dataset.numbers = numbers.join(',');

        const odds = this.payoutOdds[betType];
        el.title = `${betType} (${odds}:1) — ${numbers.join('/')}`;

        el.addEventListener('click', () => this.placeBet(el, betType, numbers));
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const betId = `${betType}-${numbers.join(',')}`;
            this.removeBet(betId, el);
            this.updateUI();
            this.updateGameStatus();
        });
        return el;
    }

    makeCell(betType, numbers, label, extraClass) {
        return this.createBetElement(betType, numbers, label, `cell ${extraClass}`);
    }

    makeSpot(betType, numbers) {
        return this.createBetElement(betType, numbers, null, `spot spot-${betType}`);
    }

    // ---------- Vertical (portrait) board ----------
    // Layout: 12 rows x 3 columns. number(row, col) = (row-1)*3 + col
    //   col 1 -> 1,4,7,...,34   col 2 -> 2,5,8,...,35   col 3 -> 3,6,9,...,36
    buildBoard() {
        const grid = document.getElementById('table-grid');
        grid.innerHTML = '';

        // Row template: [zero] + 12 numbers interleaved with 11 gaps + [2:1]
        const rows = ['var(--cell-h)'];
        for (let r = 1; r <= 12; r++) {
            rows.push('var(--cell-h)');
            if (r < 12) rows.push('var(--gap-h)');
        }
        rows.push('40px');
        grid.style.gridTemplateRows = rows.join(' ');

        const num = (r, c) => (r - 1) * 3 + c;
        const numRow = (r) => 2 * r;          // grid row for a number row
        const gapRow = (r) => 2 * r + 1;      // grid row for the gap below row r
        const numCol = (c) => 2 + (c - 1) * 2; // grid column for a number column
        const splitCol = (c) => 2 * c + 1;    // grid column of the gap right of column c

        const place = (el, row, col) => {
            el.style.gridRow = String(row);
            el.style.gridColumn = String(col);
            grid.appendChild(el);
        };

        // Zero (spans full width across the top)
        const zero = this.makeCell('straight', [0], '0', 'cell-number cell-zero');
        zero.style.gridColumn = '1 / -1';
        zero.style.gridRow = '1';
        grid.appendChild(zero);

        for (let r = 1; r <= 12; r++) {
            for (let c = 1; c <= 3; c++) {
                const n = num(r, c);
                const color = this.redNumbers.includes(n) ? 'red' : 'black';
                place(this.makeCell('straight', [n], String(n), `cell-number ${color}`), numRow(r), numCol(c));

                // vertical split with the number to the right
                if (c < 3) {
                    place(this.makeSpot('split', [n, num(r, c + 1)]), numRow(r), splitCol(c));
                }
                // horizontal split with the number below
                if (r < 12) {
                    place(this.makeSpot('split', [n, num(r + 1, c)]), gapRow(r), numCol(c));
                }
                // corner touching 4 numbers
                if (r < 12 && c < 3) {
                    const corner = [n, num(r, c + 1), num(r + 1, c), num(r + 1, c + 1)].sort((a, b) => a - b);
                    place(this.makeSpot('corner', corner), gapRow(r), splitCol(c));
                }
            }
            // street (whole row of 3) on the left edge
            place(this.makeSpot('street', [num(r, 1), num(r, 2), num(r, 3)]), numRow(r), 1);
            // six-line (this row + next) on the left edge, between rows
            if (r < 12) {
                const six = [num(r, 1), num(r, 2), num(r, 3), num(r + 1, 1), num(r + 1, 2), num(r + 1, 3)];
                place(this.makeSpot('sixline', six), gapRow(r), 1);
            }
        }

        // Column bets (2:1) under each of the three columns
        for (let c = 1; c <= 3; c++) {
            const nums = [];
            for (let r = 1; r <= 12; r++) nums.push(num(r, c));
            place(this.makeCell('column', nums, '2:1', 'cell-column'), 25, numCol(c));
        }
    }

    buildOutsideBets() {
        const dozens = document.getElementById('dozens');
        dozens.innerHTML = '';
        [['1st 12', 1, 12], ['2nd 12', 13, 24], ['3rd 12', 25, 36]].forEach(([label, lo, hi]) => {
            const nums = [];
            for (let i = lo; i <= hi; i++) nums.push(i);
            dozens.appendChild(this.makeCell('dozen', nums, label, 'bet-outside'));
        });

        const outside = document.getElementById('outside');
        outside.innerHTML = '';
        const odd = [], even = [], low = [], high = [];
        for (let i = 1; i <= 36; i++) {
            (i % 2 ? odd : even).push(i);
            (i <= 18 ? low : high).push(i);
        }
        const defs = [
            ['1-18', 'low', low],
            ['EVEN', 'even', even],
            ['RED', 'red', this.redNumbers.slice().sort((a, b) => a - b)],
            ['BLACK', 'black', this.blackNumbers.slice().sort((a, b) => a - b)],
            ['ODD', 'odd', odd],
            ['19-36', 'high', high]
        ];
        defs.forEach(([label, type, nums]) => {
            outside.appendChild(this.makeCell(type, nums, label, `bet-outside bet-${type}`));
        });
    }

    setupControls() {
        document.getElementById('spin-btn').addEventListener('click', () => this.spin());
        document.getElementById('rebet-btn').addEventListener('click', () => this.rebet());
        document.getElementById('clear-bets-btn').addEventListener('click', () => this.clearBets());
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('reset-game-btn').addEventListener('click', () => this.resetGame());

        document.getElementById('start-bankroll').addEventListener('change', (e) => {
            const value = parseFloat(e.target.value);
            if (!value || value < 1) return;
            this.clearBets();
            this.initialBankroll = value;
            this.bankroll = value;
            this.updateUI();
        });
    }

    // ---------- Placing bets ----------
    placeBet(element, betType, numbers) {
        if (this.isSpinning) return;
        this.placeBetAmount(element, betType, numbers, this.selectedChipValue);
    }

    placeBetAmount(element, betType, numbers, betAmount) {
        if (betAmount > this.bankroll) {
            this.showMessage('Insufficient balance!', 'error');
            return false;
        }

        const betId = `${betType}-${numbers.join(',')}`;

        if (this.activeBets.has(betId)) {
            const bet = this.activeBets.get(betId);
            bet.amount += betAmount;
            bet.element = element;
        } else {
            this.activeBets.set(betId, { type: betType, numbers, amount: betAmount, element });
            element.classList.add('selected');
        }

        this.bankroll -= betAmount;
        this.betHistory.push({ betId, element, amount: betAmount });
        this.updateChipDisplay(element, this.activeBets.get(betId).amount);
        this.updateUI();
        this.updateGameStatus();
        return true;
    }

    updateChipDisplay(element, totalAmount) {
        const existing = element.querySelector('.table-chip');
        if (existing) existing.remove();
        const chip = document.createElement('div');
        chip.className = `table-chip c${this.chipClassForAmount(totalAmount)}`;
        chip.textContent = totalAmount >= 1000 ? `${(totalAmount / 1000).toFixed(1)}k` : `$${totalAmount}`;
        element.appendChild(chip);
    }

    chipClassForAmount(amount) {
        if (amount >= 500) return '500';
        if (amount >= 100) return '100';
        if (amount >= 25) return '25';
        if (amount >= 5) return '5';
        return '1';
    }

    removeBet(betId, element) {
        const bet = this.activeBets.get(betId);
        if (!bet) return;
        this.bankroll += bet.amount;
        this.activeBets.delete(betId);
        this.betHistory = this.betHistory.filter(h => h.betId !== betId);
        element.classList.remove('selected');
        const chip = element.querySelector('.table-chip');
        if (chip) chip.remove();
    }

    undo() {
        if (this.isSpinning) return;
        const last = this.betHistory.pop();
        if (!last) { this.showMessage('Nothing to undo', 'info'); return; }

        const bet = this.activeBets.get(last.betId);
        if (bet) {
            bet.amount -= last.amount;
            this.bankroll += last.amount;
            if (bet.amount <= 0) {
                this.activeBets.delete(last.betId);
                last.element.classList.remove('selected');
                const chip = last.element.querySelector('.table-chip');
                if (chip) chip.remove();
            } else {
                this.updateChipDisplay(last.element, bet.amount);
            }
        }
        this.updateUI();
        this.updateGameStatus();
    }

    rebet() {
        if (this.isSpinning) return;
        if (!this.lastRoundBets || this.lastRoundBets.length === 0) {
            this.showMessage('No previous bets to repeat', 'info');
            return;
        }
        const total = this.lastRoundBets.reduce((sum, b) => sum + b.amount, 0);
        if (total > this.bankroll) {
            this.showMessage('Insufficient balance to repeat bets!', 'error');
            return;
        }
        this.lastRoundBets.forEach(b => {
            const el = document.querySelector(`[data-bet-type="${b.type}"][data-numbers="${b.numbers.join(',')}"]`);
            if (el) this.placeBetAmount(el, b.type, b.numbers, b.amount);
        });
    }

    getTotalBetAmount() {
        let total = 0;
        this.activeBets.forEach(bet => { total += bet.amount; });
        return total;
    }

    // ---------- Spin ----------
    canSpin() { return !this.isSpinning && this.activeBets.size > 0; }

    spin() {
        if (!this.canSpin()) return;
        this.isSpinning = true;
        this.updateUI();
        this.updateGameStatus();

        const winningNumber = Math.floor(Math.random() * 37); // 0-36
        const display = document.getElementById('winning-number');

        // Visual flicker, then settle on the real result
        let ticks = 0;
        const maxTicks = 16;
        const flicker = setInterval(() => {
            const fake = Math.floor(Math.random() * 37);
            display.textContent = fake;
            display.className = `winning-number ${this.getNumberColor(fake)}`;
            ticks++;
            if (ticks >= maxTicks) {
                clearInterval(flicker);
                this.completeSpin(winningNumber);
            }
        }, 90);
    }

    completeSpin(winningNumber) {
        const color = this.getNumberColor(winningNumber);
        const display = document.getElementById('winning-number');
        display.textContent = winningNumber;
        display.className = `winning-number ${color} pop`;
        setTimeout(() => display.classList.remove('pop'), 200);

        this.highlightWinningNumber(winningNumber);
        const results = this.calculateResults(winningNumber);
        this.updateStats(results);
        this.addResult(winningNumber, color, results);

        // Snapshot bets so the player can repeat them ("Rebet")
        this.lastRoundBets = Array.from(this.activeBets.values()).map(bet => ({
            type: bet.type, numbers: bet.numbers.slice(), amount: bet.amount
        }));

        this.clearAllBets();
        this.isSpinning = false;
        this.lastWinningNumber = winningNumber;

        this.updateUI();
        this.showResultMessage(winningNumber, color, results);
    }

    highlightWinningNumber(winningNumber) {
        document.querySelectorAll('.cell.win').forEach(c => c.classList.remove('win'));
        const cell = document.querySelector(`[data-bet-type="straight"][data-numbers="${winningNumber}"]`);
        if (cell) {
            cell.classList.add('win');
            setTimeout(() => cell.classList.remove('win'), 3000);
        }
    }

    calculateResults(winningNumber) {
        const results = { totalBet: 0, totalWon: 0, winningBets: [], losingBets: [] };
        this.activeBets.forEach((bet, betId) => {
            results.totalBet += bet.amount;
            const isWin = bet.numbers.includes(winningNumber);
            const payout = isWin ? bet.amount * (this.payoutOdds[bet.type] + 1) : 0;
            const record = { ...bet, betId, isWin, payout, profit: payout - bet.amount };
            if (isWin) {
                results.totalWon += payout;
                results.winningBets.push(record);
                this.bankroll += payout;
            } else {
                results.losingBets.push(record);
            }
        });
        return results;
    }

    getNumberColor(number) {
        if (number === 0) return 'green';
        return this.redNumbers.includes(number) ? 'red' : 'black';
    }

    updateStats(results) {
        this.stats.totalSpins++;
        this.stats.totalBet += results.totalBet;
        this.stats.totalWon += results.totalWon;
        if (results.winningBets.length > 0) this.stats.wins++;
    }

    addResult(number, color, results) {
        this.results.unshift({
            number, color,
            totalBet: results.totalBet,
            netResult: results.totalWon - results.totalBet,
            winningBets: results.winningBets.length,
            losingBets: results.losingBets.length
        });
        if (this.results.length > 20) this.results = this.results.slice(0, 20);
        this.updateResultsList();
        this.updateHistoryStrip();
    }

    updateHistoryStrip() {
        const strip = document.getElementById('history-strip');
        strip.innerHTML = '';
        this.results.slice(0, 12).forEach(r => {
            const dot = document.createElement('div');
            dot.className = `history-dot ${r.color}`;
            dot.textContent = r.number;
            strip.appendChild(dot);
        });
    }

    updateResultsList() {
        const list = document.getElementById('results-list');
        list.innerHTML = '';
        this.results.forEach(r => {
            const li = document.createElement('li');
            li.className = r.netResult >= 0 ? 'win' : 'loss';
            const sign = r.netResult >= 0 ? '+' : '−';
            const color = r.netResult >= 0 ? '#4fd18b' : '#ff6b7a';
            li.innerHTML = `
                <span class="res-num ${r.color}">${r.number} <span style="color:var(--muted);font-weight:600">${r.color.toUpperCase()}</span></span>
                <span style="text-align:right">
                    <span style="color:${color};font-weight:800">${sign}$${Math.abs(r.netResult)}</span>
                    <div class="res-meta">${r.winningBets}W / ${r.losingBets}L · $${r.totalBet} bet</div>
                </span>`;
            list.appendChild(li);
        });
    }

    showResultMessage(number, color, results) {
        const status = document.getElementById('game-status');
        if (results.totalWon > 0) {
            const profit = results.totalWon - results.totalBet;
            const word = profit >= 0 ? 'Net' : 'Net';
            status.textContent = `🎉 ${number} ${color.toUpperCase()} — won $${results.totalWon}! ${word}: ${profit >= 0 ? '+' : '−'}$${Math.abs(profit)}`;
            status.style.color = '#4fd18b';
        } else {
            status.textContent = `😞 ${number} ${color.toUpperCase()} — no win. −$${results.totalBet}`;
            status.style.color = '#ff6b7a';
        }
        setTimeout(() => { status.style.color = ''; this.updateGameStatus(); }, 4000);
    }

    showMessage(message, type = 'info') {
        const status = document.getElementById('game-status');
        const colors = { info: '#8fd0ff', error: '#ff6b7a', success: '#4fd18b' };
        status.textContent = message;
        status.style.color = colors[type] || colors.info;
        setTimeout(() => { status.style.color = ''; this.updateGameStatus(); }, 2000);
    }

    updateGameStatus() {
        const status = document.getElementById('game-status');
        if (this.isSpinning) { status.textContent = '🎰 Spinning…'; return; }
        const count = this.activeBets.size;
        const total = this.getTotalBetAmount();
        status.textContent = count === 0
            ? 'Place your bets and spin!'
            : `${count} bet${count > 1 ? 's' : ''} · $${total} at stake`;
    }

    clearBets() {
        this.activeBets.forEach(bet => {
            this.bankroll += bet.amount;
            bet.element.classList.remove('selected');
            const chip = bet.element.querySelector('.table-chip');
            if (chip) chip.remove();
        });
        this.activeBets.clear();
        this.betHistory = [];
        this.updateUI();
        this.updateGameStatus();
    }

    clearAllBets() {
        this.activeBets.forEach(bet => {
            bet.element.classList.remove('selected');
            const chip = bet.element.querySelector('.table-chip');
            if (chip) chip.remove();
        });
        this.activeBets.clear();
        this.betHistory = [];
    }

    resetGame() {
        this.bankroll = this.initialBankroll;
        this.results = [];
        this.lastRoundBets = [];
        this.stats = { totalSpins: 0, totalBet: 0, totalWon: 0, wins: 0 };
        this.clearBets();
        document.getElementById('winning-number').textContent = '–';
        document.getElementById('winning-number').className = 'winning-number';
        this.updateResultsList();
        this.updateHistoryStrip();
        this.updateUI();
        this.updateGameStatus();
    }

    updateUI() {
        document.getElementById('bankroll').textContent = Math.round(this.bankroll);
        document.getElementById('total-bet-amt').textContent = this.getTotalBetAmount();
        document.getElementById('total-spins').textContent = this.stats.totalSpins;
        document.getElementById('total-bet').textContent = `$${this.stats.totalBet}`;
        document.getElementById('total-won').textContent = `$${this.stats.totalWon}`;

        const netPL = this.stats.totalWon - this.stats.totalBet;
        const netEl = document.getElementById('net-pl');
        netEl.textContent = `${netPL >= 0 ? '+' : '−'}$${Math.abs(netPL)}`;
        netEl.style.color = netPL >= 0 ? '#4fd18b' : '#ff6b7a';

        const winRate = this.stats.totalSpins > 0 ? (this.stats.wins / this.stats.totalSpins * 100) : 0;
        document.getElementById('win-rate').textContent = `${winRate.toFixed(1)}%`;

        document.getElementById('spin-btn').disabled = !this.canSpin();
        document.getElementById('undo-btn').disabled = this.isSpinning || this.betHistory.length === 0;
        document.getElementById('clear-bets-btn').disabled = this.isSpinning || this.activeBets.size === 0;
        const hasLast = this.lastRoundBets && this.lastRoundBets.length > 0;
        document.getElementById('rebet-btn').disabled = this.isSpinning || !hasLast;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.rouletteGame = new RouletteGame();
});
