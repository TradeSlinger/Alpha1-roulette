// Modern Roulette Game with European Table Layout
class RouletteGame {
    constructor() {
        this.bankroll = 1000;
        this.initialBankroll = 1000;
        this.activeBets = new Map(); // Store multiple bets: betId -> {type, numbers, amount}
        this.isSpinning = false;
        this.results = [];
        this.selectedChipValue = 10;
        this.lastWinningNumber = null;
        this.stats = {
            totalSpins: 0,
            totalBet: 0,
            totalWon: 0,
            wins: 0
        };
        
        // Roulette number colors
        this.redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        this.blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupBettingAreas();
        this.updateUI();
        this.updateGameStatus();
    }

    setupEventListeners() {
        // Game controls
        document.getElementById('spin-btn').addEventListener('click', () => this.spin());
        document.getElementById('clear-bets-btn').addEventListener('click', () => this.clearBets());
        document.getElementById('reset-game-btn').addEventListener('click', () => this.resetGame());
        
        // Bankroll change
        document.getElementById('bankroll-header').addEventListener('change', (e) => {
            this.initialBankroll = parseFloat(e.target.value) || 1000;
            this.bankroll = this.initialBankroll;
            this.updateUI();
        });
        
        // Chip selection
        this.setupChipSelection();
    }

    setupChipSelection() {
        const chips = document.querySelectorAll('.chip');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                // Remove selected class from all chips
                chips.forEach(c => c.classList.remove('selected'));
                // Add selected class to clicked chip
                chip.classList.add('selected');
                // Update selected chip value
                this.selectedChipValue = parseInt(chip.getAttribute('data-value'));
            });
        });
    }

    setupBettingAreas() {
        const betAreas = document.querySelectorAll('.bet-area');
        
        betAreas.forEach(area => {
            // Left click to place bet
            area.addEventListener('click', () => {
                const betType = area.getAttribute('data-bet-type');
                const numbers = area.getAttribute('data-numbers').split(',').map(n => parseInt(n));
                this.placeBet(area, betType, numbers);
            });
            
            // Right click to remove bet
            area.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const betType = area.getAttribute('data-bet-type');
                const numbers = area.getAttribute('data-numbers').split(',').map(n => parseInt(n));
                const betId = `${betType}-${numbers.join(',')}`;
                this.removeBet(betId, area);
                this.updateUI();
                this.updateGameStatus();
            });
        });
        
    }
    
    
    createSplitBettingOverlays() {
        const mainGrid = document.querySelector('.roulette-main-grid');
        if (!mainGrid) return;
        
        // Wait for grid to be ready
        setTimeout(() => {
            // Create overlay container
            const overlay = document.createElement('div');
            overlay.className = 'split-betting-overlay';
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '10';
            
            mainGrid.style.position = 'relative';
            mainGrid.appendChild(overlay);
            
            // Calculate cell dimensions
            const gridRect = mainGrid.getBoundingClientRect();
            const cellWidth = (gridRect.width - 8) / 14; // Account for padding and borders
            const cellHeight = (gridRect.height - 8) / 3;
            
            // Create split areas based on PDF specification
            this.createPDFSplitAreas(overlay, cellWidth, cellHeight);
        }, 100);
    }
    
    createPDFSplitAreas(container, cellWidth, cellHeight) {
        // Vertical splits between adjacent numbers
        for (let row = 0; row < 3; row++) {
            for (let col = 1; col < 12; col++) {
                const splitArea = this.createSplitArea('vertical', col, row, cellWidth, cellHeight);
                if (splitArea) container.appendChild(splitArea);
            }
        }
        
        // Horizontal splits between rows
        for (let row = 0; row < 2; row++) {
            for (let col = 1; col < 13; col++) {
                const splitArea = this.createSplitArea('horizontal', col, row, cellWidth, cellHeight);
                if (splitArea) container.appendChild(splitArea);
            }
        }
        
        // Corner bets
        for (let row = 0; row < 2; row++) {
            for (let col = 1; col < 12; col++) {
                const splitArea = this.createSplitArea('corner', col, row, cellWidth, cellHeight);
                if (splitArea) container.appendChild(splitArea);
            }
        }
        
        // Zero splits
        for (let row = 0; row < 3; row++) {
            const zeroSplit = this.createZeroSplit(row, cellHeight);
            if (zeroSplit) container.appendChild(zeroSplit);
        }
    }
    
    createSplitArea(type, col, row, cellWidth, cellHeight) {
        const area = document.createElement('div');
        area.className = `split-area ${type}-split`;
        area.style.position = 'absolute';
        area.style.pointerEvents = 'auto';
        area.style.cursor = 'pointer';
        
        let numbers = [];
        let left, top, width, height;
        
        if (type === 'vertical') {
            // Between adjacent numbers horizontally
            const num1 = this.getNumberAtPosition(col - 1, row);
            const num2 = this.getNumberAtPosition(col, row);
            if (num1 && num2) {
                numbers = [num1, num2];
                left = (col + 0.5) * cellWidth - 2;
                top = row * cellHeight + 4;
                width = 4;
                height = cellHeight - 8;
                area.style.background = 'rgba(108, 117, 125, 0.8)'; // Gray from PDF
            }
        } else if (type === 'horizontal') {
            // Between rows
            const num1 = this.getNumberAtPosition(col - 1, row);
            const num2 = this.getNumberAtPosition(col - 1, row + 1);
            if (num1 && num2) {
                numbers = [num1, num2];
                left = (col - 0.5) * cellWidth + 4;
                top = (row + 1) * cellHeight - 2;
                width = cellWidth - 8;
                height = 4;
                area.style.background = 'rgba(108, 117, 125, 0.8)'; // Gray from PDF
            }
        } else if (type === 'corner') {
            // Corner of 4 numbers
            const nums = [
                this.getNumberAtPosition(col - 1, row),
                this.getNumberAtPosition(col, row),
                this.getNumberAtPosition(col - 1, row + 1),
                this.getNumberAtPosition(col, row + 1)
            ].filter(n => n);
            if (nums.length === 4) {
                numbers = nums;
                left = col * cellWidth - 6;
                top = (row + 1) * cellHeight - 6;
                width = 12;
                height = 12;
                area.style.background = 'rgba(142, 68, 173, 0.8)'; // Purple from PDF
                area.style.borderRadius = '50%';
            }
        }
        
        if (numbers.length > 0) {
            area.style.left = left + 'px';
            area.style.top = top + 'px';
            area.style.width = width + 'px';
            area.style.height = height + 'px';
            
            const betType = type === 'corner' ? 'corner' : 'split';
            area.setAttribute('data-bet-type', betType);
            area.setAttribute('data-numbers', numbers.join(','));
            
            const payouts = { split: '17:1', corner: '8:1' };
            area.title = `${type} (${payouts[betType]}): ${numbers.join('/')}`;
            
            // Add event listeners
            area.addEventListener('click', () => {
                this.placeBet(area, betType, numbers);
            });
            
            area.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const betId = `${betType}-${numbers.join(',')}`;
                this.removeBet(betId, area);
                this.updateUI();
                this.updateGameStatus();
            });
            
            return area;
        }
        
        return null;
    }
    
    createZeroSplit(row, cellHeight) {
        const area = document.createElement('div');
        area.className = 'split-area zero-split';
        area.style.position = 'absolute';
        area.style.pointerEvents = 'auto';
        area.style.cursor = 'pointer';
        
        const rowNumbers = [3, 2, 1]; // Numbers adjacent to zero
        const number = rowNumbers[row];
        const numbers = [0, number];
        
        area.style.left = '76px'; // Between zero and first column
        area.style.top = (row * cellHeight + cellHeight/2 - 6) + 'px';
        area.style.width = '12px';
        area.style.height = '12px';
        area.style.background = 'rgba(40, 167, 69, 0.8)'; // Green from PDF
        area.style.borderRadius = '50%';
        
        area.setAttribute('data-bet-type', 'split');
        area.setAttribute('data-numbers', numbers.join(','));
        area.title = `Zero Split (17:1): 0/${number}`;
        
        area.addEventListener('click', () => {
            this.placeBet(area, 'split', numbers);
        });
        
        area.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const betId = `split-${numbers.join(',')}`;
            this.removeBet(betId, area);
            this.updateUI();
            this.updateGameStatus();
        });
        
        return area;
    }
    
    createSplitArea(type, col, row, cellWidth, cellHeight) {
        const area = document.createElement('div');
        area.className = `split-bet ${type}`;
        area.style.pointerEvents = 'auto';
        area.style.position = 'absolute';
        
        let numbers = [];
        let left, top;
        
        if (type === 'vertical') {
            // Vertical split between adjacent numbers in same row
            const num1 = this.getNumberAtPosition(col, row);
            const num2 = this.getNumberAtPosition(col + 1, row);
            if (num1 && num2) {
                numbers = [num1, num2];
                left = (col + 1) * cellWidth - 2; // On the border
                top = row * cellHeight;
                area.style.width = '4px';
                area.style.height = cellHeight + 'px';
            }
        } else if (type === 'horizontal') {
            // Horizontal split between rows
            const num1 = this.getNumberAtPosition(col, row);
            const num2 = this.getNumberAtPosition(col, row + 1);
            if (num1 && num2) {
                numbers = [num1, num2];
                left = col * cellWidth;
                top = (row + 1) * cellHeight - 2; // On the border
                area.style.width = cellWidth + 'px';
                area.style.height = '4px';
            }
        } else if (type === 'corner') {
            // Corner bet (4 numbers) - intersection point
            const nums = [
                this.getNumberAtPosition(col, row),
                this.getNumberAtPosition(col + 1, row),
                this.getNumberAtPosition(col, row + 1),
                this.getNumberAtPosition(col + 1, row + 1)
            ].filter(n => n);
            if (nums.length === 4) {
                numbers = nums;
                left = (col + 1) * cellWidth - 6;
                top = (row + 1) * cellHeight - 6;
                area.style.width = '12px';
                area.style.height = '12px';
                area.className = `split-bet corner-split`;
            }
        }
        
        if (numbers.length > 0) {
            area.setAttribute('data-bet-type', type === 'corner' ? 'corner' : 'split');
            area.setAttribute('data-numbers', numbers.join(','));
            area.style.left = left + 'px';
            area.style.top = top + 'px';
            area.title = `${type === 'corner' ? 'Corner (8:1)' : 'Split (17:1)'} ${numbers.join('/')}`;
            
            // Add click handlers
            area.addEventListener('click', () => {
                this.placeBet(area, area.getAttribute('data-bet-type'), numbers);
            });
            
            area.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const betId = `${area.getAttribute('data-bet-type')}-${numbers.join(',')}`;
                this.removeBet(betId, area);
                this.updateUI();
                this.updateGameStatus();
            });
            
            return area;
        }
        
        return null;
    }
    
    createZeroSplitArea(row, cellHeight) {
        const area = document.createElement('div');
        area.className = 'split-bet zero-split';
        area.style.pointerEvents = 'auto';
        area.style.position = 'absolute';
        
        // Zero splits: 0/1, 0/2, 0/3
        const numbers = [0];
        const rowNumber = this.getNumberAtPosition(0, row); // First number in each row
        if (rowNumber) {
            numbers.push(rowNumber);
            
            // Position between zero and first column
            area.style.left = '-10px';
            area.style.top = (row * cellHeight + cellHeight / 2 - 10) + 'px';
            area.style.width = '20px';
            area.style.height = '20px';
            
            area.setAttribute('data-bet-type', 'split');
            area.setAttribute('data-numbers', numbers.join(','));
            area.title = `Zero Split (17:1): 0/${rowNumber}`;
            
            // Add click handlers
            area.addEventListener('click', () => {
                this.placeBet(area, 'split', numbers);
            });
            
            area.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const betId = `split-${numbers.join(',')}`;
                this.removeBet(betId, area);
                this.updateUI();
                this.updateGameStatus();
            });
            
            return area;
        }
        
        return null;
    }
    
    createStreetBet(firstNumber, cellWidth, cellHeight) {
        const area = document.createElement('div');
        area.className = 'split-bet street-bet';
        area.style.pointerEvents = 'auto';
        area.style.position = 'absolute';
        
        // Street bet covers 3 consecutive numbers horizontally (e.g., 1-2-3, 4-5-6, etc.)
        const numbers = [firstNumber, firstNumber + 1, firstNumber + 2];
        
        // Find the position of the first number in the grid
        const position = this.findNumberPosition(firstNumber);
        if (position && numbers.every(num => num >= 1 && num <= 36)) {
            const { col, row } = position;
            
            // Position at the left edge of the 3-number street
            area.style.left = '-20px';
            area.style.top = (row * cellHeight + cellHeight / 2 - 4) + 'px';
            area.style.width = '16px';
            area.style.height = '8px';
            
            area.setAttribute('data-bet-type', 'street');
            area.setAttribute('data-numbers', numbers.join(','));
            area.title = `Street (11:1): ${numbers.join('-')}`;
            
            // Add click handlers
            area.addEventListener('click', () => {
                this.placeBet(area, 'street', numbers);
            });
            
            area.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const betId = `street-${numbers.join(',')}`;
                this.removeBet(betId, area);
                this.updateUI();
                this.updateGameStatus();
            });
            
            return area;
        }
        
        return null;
    }
    
    findNumberPosition(number) {
        const layout = [
            [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
            [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
            [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
        ];
        
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 12; col++) {
                if (layout[row][col] === number) {
                    return { col, row };
                }
            }
        }
        return null;
    }
    
    getNumberAtPosition(col, row) {
        // European roulette layout
        const layout = [
            [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
            [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
            [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
        ];
        
        if (row >= 0 && row < 3 && col >= 0 && col < 12) {
            return layout[row][col];
        }
        return null;
    }

    placeBet(element, betType, numbers) {
        const betAmount = this.selectedChipValue;
        
        if (betAmount > this.bankroll) {
            this.showMessage('Insufficient bankroll!', 'error');
            return;
        }
        
        // Create unique bet ID
        const betId = `${betType}-${numbers.join(',')}`;
        
        if (this.activeBets.has(betId)) {
            // Add to existing bet (stack chips)
            this.stackChip(betId, element, betAmount);
        } else {
            // Add new bet
            this.addBet(betId, element, betType, numbers, betAmount);
        }
        
        this.updateUI();
        this.updateGameStatus();
    }

    stackChip(betId, element, amount) {
        const existingBet = this.activeBets.get(betId);
        if (existingBet && amount <= this.bankroll) {
            existingBet.amount += amount;
            this.bankroll -= amount;
            this.updateChipDisplay(element, existingBet.amount);
        }
    }

    addBet(betId, element, betType, numbers, amount) {
        this.activeBets.set(betId, {
            type: betType,
            numbers: numbers,
            amount: amount,
            element: element
        });
        
        element.classList.add('selected');
        this.bankroll -= amount;
        this.updateChipDisplay(element, amount);
    }

    updateChipDisplay(element, totalAmount) {
        // Remove existing chip display
        const existingChip = element.querySelector('.chip-on-table');
        if (existingChip) {
            existingChip.remove();
        }
        
        // Create round casino chip
        const chip = document.createElement('div');
        chip.className = 'chip-on-table';
        
        // Determine chip color/class based on value
        const chipValue = this.getChipValueForAmount(totalAmount);
        chip.classList.add(`chip-${chipValue}`);
        chip.textContent = `$${totalAmount}`;
        
        // Position chip in center of betting area
        chip.style.left = '50%';
        chip.style.top = '50%';
        
        element.appendChild(chip);
    }
    
    getChipValueForAmount(amount) {
        if (amount >= 100) return '100';
        if (amount >= 50) return '50';
        if (amount >= 25) return '25';
        if (amount >= 10) return '10';
        if (amount >= 5) return '5';
        return '1';
    }

    removeBet(betId, element) {
        const bet = this.activeBets.get(betId);
        if (bet) {
            this.bankroll += bet.amount;
            this.activeBets.delete(betId);
            element.classList.remove('selected');
            // Remove chip display
            const chipDisplay = element.querySelector('.chip-on-table');
            if (chipDisplay) {
                chipDisplay.remove();
            }
        }
    }


    getTotalBetAmount() {
        let total = 0;
        this.activeBets.forEach(bet => {
            total += bet.amount;
        });
        return total;
    }

    updateGameStatus() {
        const statusElement = document.getElementById('game-status');
        const totalBets = this.activeBets.size;
        const totalAmount = this.getTotalBetAmount();
        
        if (this.isSpinning) {
            statusElement.textContent = '🎰 Spinning...';
            statusElement.className = 'game-status spinning';
            return;
        }
        
        statusElement.className = 'game-status';
        
        if (totalBets === 0) {
            statusElement.textContent = 'Click on the table to place bets!';
        } else {
            statusElement.textContent = `${totalBets} bet${totalBets > 1 ? 's' : ''} placed • Total: $${totalAmount}`;
        }
    }

    canSpin() {
        return !this.isSpinning && this.activeBets.size > 0;
    }

    spin() {
        if (!this.canSpin()) return;
        
        this.isSpinning = true;
        
        // Update UI to show spinning
        this.updateGameStatus();
        document.getElementById('spin-btn').disabled = true;
        document.getElementById('winning-number').textContent = '🎰';
        document.getElementById('winning-number').className = 'winning-number';
        
        // Simulate spinning animation
        setTimeout(() => {
            this.completeSpin();
        }, 2000);
    }

    completeSpin() {
        // Generate winning number
        const winningNumber = Math.floor(Math.random() * 37); // 0-36
        const color = this.getNumberColor(winningNumber);
        
        // Update winning number display
        const winningNumberElement = document.getElementById('winning-number');
        winningNumberElement.textContent = winningNumber;
        winningNumberElement.className = `winning-number ${color}`;
        
        // Highlight winning number on table
        this.highlightWinningNumber(winningNumber);
        
        // Calculate results for all bets
        const results = this.calculateResults(winningNumber);
        
        // Update statistics
        this.updateStats(results);
        
        // Add to results
        this.addResult(winningNumber, color, results);
        
        // Reset game state
        this.clearAllBets();
        this.isSpinning = false;
        document.getElementById('spin-btn').disabled = false;
        
        // Update UI
        this.updateUI();
        this.updateGameStatus();
        
        // Show result message
        this.showResultMessage(winningNumber, color, results);
        
        // Store last winning number
        this.lastWinningNumber = winningNumber;
    }

    highlightWinningNumber(winningNumber) {
        // Remove previous highlights
        document.querySelectorAll('.bet-area.winning').forEach(area => {
            area.classList.remove('winning');
        });
        
        // Find and highlight the winning number
        const winningArea = document.querySelector(`[data-bet-type="straight"][data-numbers="${winningNumber}"]`);
        if (winningArea) {
            winningArea.classList.add('winning');
            
            // Remove highlight after 10 seconds
            setTimeout(() => {
                winningArea.classList.remove('winning');
            }, 10000);
        }
    }

    calculateResults(winningNumber) {
        const results = {
            totalBet: 0,
            totalWon: 0,
            winningBets: [],
            losingBets: []
        };
        
        this.activeBets.forEach((bet, betId) => {
            results.totalBet += bet.amount;
            
            const isWin = this.checkWin(bet, winningNumber);
            const payout = isWin ? this.calculatePayout(bet, winningNumber) : 0;
            
            const betResult = {
                ...bet,
                betId,
                isWin,
                payout,
                profit: payout - bet.amount
            };
            
            if (isWin) {
                results.totalWon += payout;
                results.winningBets.push(betResult);
                this.bankroll += payout;
            } else {
                results.losingBets.push(betResult);
            }
        });
        
        return results;
    }

    checkWin(bet, winningNumber) {
        return bet.numbers.includes(winningNumber);
    }

    calculatePayout(bet, winningNumber) {
        const payoutRates = {
            'straight': 36,    // 35:1 + original bet
            'split': 18,       // 17:1 + original bet (2 numbers)
            'street': 12,      // 11:1 + original bet (3 numbers)
            'corner': 9,       // 8:1 + original bet (4 numbers)
            'line': 6,         // 5:1 + original bet (6 numbers)
            'red': 2,         // 1:1 + original bet
            'black': 2,       // 1:1 + original bet
            'even': 2,        // 1:1 + original bet
            'odd': 2,         // 1:1 + original bet
            'low': 2,         // 1:1 + original bet
            'high': 2,        // 1:1 + original bet
            'dozen': 3,       // 2:1 + original bet
            'column': 3       // 2:1 + original bet
        };
        
        const rate = payoutRates[bet.type] || 2;
        return bet.amount * rate;
    }

    getNumberColor(number) {
        if (number === 0) return 'green';
        return this.redNumbers.includes(number) ? 'red' : 'black';
    }

    updateStats(results) {
        this.stats.totalSpins++;
        this.stats.totalBet += results.totalBet;
        this.stats.totalWon += results.totalWon;
        
        if (results.winningBets.length > 0) {
            this.stats.wins++;
        }
    }

    addResult(number, color, results) {
        const result = {
            number,
            color,
            totalBet: results.totalBet,
            totalWon: results.totalWon,
            netResult: results.totalWon - results.totalBet,
            winningBets: results.winningBets.length,
            losingBets: results.losingBets.length,
            timestamp: new Date().toLocaleTimeString()
        };
        
        this.results.unshift(result);
        
        // Keep only last 20 results
        if (this.results.length > 20) {
            this.results = this.results.slice(0, 20);
        }
        
        this.updateResultsList();
    }

    updateResultsList() {
        const resultsList = document.getElementById('results-list');
        resultsList.innerHTML = '';
        
        this.results.forEach(result => {
            const li = document.createElement('li');
            li.className = result.netResult >= 0 ? 'win' : 'loss';
            
            const netColor = result.netResult >= 0 ? '#27ae60' : '#e74c3c';
            const netSign = result.netResult >= 0 ? '+' : '';
            
            li.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span><strong>${result.number}</strong> (${result.color.toUpperCase()})</span>
                    <span style="color: ${netColor}; font-weight: 600;">${netSign}$${Math.abs(result.netResult)}</span>
                </div>
                <div style="font-size: 9px; color: #7f8c8d; margin-top: 2px;">
                    ${result.winningBets}W/${result.losingBets}L • $${result.totalBet} bet • ${result.timestamp}
                </div>
            `;
            
            resultsList.appendChild(li);
        });
    }

    showResultMessage(number, color, results) {
        const statusElement = document.getElementById('game-status');
        
        if (results.totalWon > 0) {
            const profit = results.totalWon - results.totalBet;
            statusElement.textContent = `🎉 ${number} (${color.toUpperCase()}) - ${results.winningBets.length} wins! Net: +$${profit}`;
            statusElement.style.color = '#27ae60';
        } else {
            statusElement.textContent = `😞 ${number} (${color.toUpperCase()}) - All ${results.losingBets.length} bets lost! -$${results.totalBet}`;
            statusElement.style.color = '#e74c3c';
        }
        
        // Reset message after 4 seconds
        setTimeout(() => {
            statusElement.style.color = '';
            this.updateGameStatus();
        }, 4000);
    }

    showMessage(message, type = 'info') {
        const statusElement = document.getElementById('game-status');
        const colors = {
            'info': '#3498db',
            'error': '#e74c3c',
            'success': '#27ae60'
        };
        
        statusElement.textContent = message;
        statusElement.style.color = colors[type] || colors.info;
        
        setTimeout(() => {
            statusElement.style.color = '';
            this.updateGameStatus();
        }, 2000);
    }

    clearBets() {
        // Return money and clear visual selections
        this.activeBets.forEach(bet => {
            this.bankroll += bet.amount;
            bet.element.classList.remove('selected');
            // Remove chip display
            const chipDisplay = bet.element.querySelector('.chip-on-table');
            if (chipDisplay) {
                chipDisplay.remove();
            }
        });
        
        this.activeBets.clear();
        this.updateUI();
        this.updateGameStatus();
    }

    clearAllBets() {
        // Clear bets without returning money (after spin)
        this.activeBets.forEach(bet => {
            bet.element.classList.remove('selected');
            // Remove chip display
            const chipDisplay = bet.element.querySelector('.chip-on-table');
            if (chipDisplay) {
                chipDisplay.remove();
            }
        });
        
        this.activeBets.clear();
    }

    resetGame() {
        this.bankroll = this.initialBankroll;
        this.results = [];
        this.stats = {
            totalSpins: 0,
            totalBet: 0,
            totalWon: 0,
            wins: 0
        };
        
        this.clearBets();
        document.getElementById('winning-number').textContent = '-';
        document.getElementById('winning-number').className = 'winning-number';
        // Reset selected chip to default
        this.selectedChipValue = 10;
        
        this.updateUI();
        this.updateResultsList();
        this.updateGameStatus();
    }

    updateUI() {
        // Update bankroll display
        document.getElementById('bankroll-amount-header').textContent = this.bankroll.toFixed(0);
        
        // Update statistics
        document.getElementById('total-spins').textContent = this.stats.totalSpins;
        document.getElementById('total-bet').textContent = `$${this.stats.totalBet}`;
        document.getElementById('total-won').textContent = `$${this.stats.totalWon}`;
        
        const netPL = this.stats.totalWon - this.stats.totalBet;
        const netPLElement = document.getElementById('net-pl');
        netPLElement.textContent = `${netPL >= 0 ? '+' : ''}$${netPL}`;
        netPLElement.style.color = netPL >= 0 ? '#27ae60' : '#e74c3c';
        
        const winRate = this.stats.totalSpins > 0 ? (this.stats.wins / this.stats.totalSpins * 100) : 0;
        document.getElementById('win-rate').textContent = `${winRate.toFixed(1)}%`;
        
        // Enable/disable spin button
        document.getElementById('spin-btn').disabled = !this.canSpin();
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', function() {
    window.rouletteGame = new RouletteGame();
});