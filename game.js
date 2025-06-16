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
        this.buildDetailedGrid();
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


    buildDetailedGrid() {
        const gridContainer = document.querySelector('.image-based-grid');
        if (!gridContainer) return;

        // Clear existing content
        gridContainer.innerHTML = '';

        // European roulette number layout
        const layout = [
            [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],  // Top row
            [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],  // Middle row  
            [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]   // Bottom row
        ];

        // Build grid where each number is a 3x3 mini-grid
        this.createGridOfGrids(gridContainer, layout);
    }

    createGridOfGrids(container, layout) {
        // Total grid: 42 columns x 9 rows
        // Columns 1-3: Zero area
        // Columns 4-39: Numbers (12 numbers * 3 columns each)
        // Columns 40-42: Column bets
        
        // First, create the zero cell (spans multiple rows/cols)
        this.createZeroCell(container);
        
        // Then create column bet cells
        this.createColumnBets(container, layout);
        
        // Finally create all number cells
        for (let row = 1; row <= 9; row++) {
            for (let col = 4; col <= 39; col++) {
                this.createDetailedGridCell(container, row, col, layout);
            }
        }
    }

    createZeroCell(container) {
        // Create main zero cell
        const zeroCell = document.createElement('div');
        zeroCell.className = 'grid-cell number-cell zero-bet';
        zeroCell.textContent = '0';
        zeroCell.style.gridRow = '1 / 10';
        zeroCell.style.gridColumn = '1 / 4';
        zeroCell.style.background = '#27ae60';
        zeroCell.style.color = 'white';
        zeroCell.style.fontSize = '24px';
        this.addBetAttributes(zeroCell, 'straight', [0]);
        container.appendChild(zeroCell);
        
        // Create zero split cells
        const splits = [
            { row: 2, col: 3, numbers: [0, 3] },
            { row: 5, col: 3, numbers: [0, 2] },
            { row: 8, col: 3, numbers: [0, 1] }
        ];
        
        splits.forEach(split => {
            const splitCell = document.createElement('div');
            splitCell.className = 'grid-cell split-cell zero-split';
            splitCell.style.gridRow = split.row;
            splitCell.style.gridColumn = split.col;
            this.addBetAttributes(splitCell, 'split', split.numbers);
            container.appendChild(splitCell);
        });
    }
    
    createColumnBets(container, layout) {
        // Create three column bet cells
        const columns = [
            { row: '1 / 4', numbers: layout[0] },
            { row: '4 / 7', numbers: layout[1] },
            { row: '7 / 10', numbers: layout[2] }
        ];
        
        columns.forEach((column, index) => {
            const colCell = document.createElement('div');
            colCell.className = 'grid-cell column-bet';
            colCell.textContent = '2:1';
            colCell.style.gridRow = column.row;
            colCell.style.gridColumn = '40 / 43';
            colCell.style.background = '#9b59b6';
            colCell.style.color = 'white';
            this.addBetAttributes(colCell, 'column', column.numbers);
            container.appendChild(colCell);
        });
    }

    createDetailedGridCell(container, row, col, layout) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.style.gridRow = row;
        cell.style.gridColumn = col;

        // Numbers area (columns 4-39)
        if (col < 4 || col > 39) return;

        // Main number grid (columns 4-39)
        if (col >= 4 && col <= 39) {
            const adjustedCol = col - 4; // 0-35
            const numberIndex = Math.floor(adjustedCol / 3); // Which number (0-11)
            const subCol = adjustedCol % 3; // Position within 3x3 (0-2)
            
            // Determine which row of numbers we're in
            let numberRow = -1;
            let subRow = -1;
            
            if (row >= 1 && row <= 3) {
                numberRow = 0; // Top row of numbers
                subRow = row - 1;
            } else if (row >= 4 && row <= 6) {
                numberRow = 1; // Middle row of numbers
                subRow = row - 4;
            } else if (row >= 7 && row <= 9) {
                numberRow = 2; // Bottom row of numbers
                subRow = row - 7;
            }

            if (numberRow >= 0 && numberIndex < 12) {
                const number = layout[numberRow][numberIndex];
                
                // Center cell (1,1) is the number
                if (subRow === 1 && subCol === 1) {
                    cell.textContent = number;
                    cell.className += ' number-cell';
                    const isRed = this.redNumbers.includes(number);
                    cell.style.background = isRed ? '#e74c3c' : '#34495e';
                    cell.style.color = 'white';
                    cell.style.fontSize = '16px';
                    this.addBetAttributes(cell, 'straight', [number]);
                }
                // Top cell (0,1) - split with number above
                else if (subRow === 0 && subCol === 1) {
                    if (numberRow > 0) {
                        const numAbove = layout[numberRow - 1][numberIndex];
                        cell.className += ' split-cell horizontal-split';
                        this.addBetAttributes(cell, 'split', [number, numAbove]);
                    } else {
                        // Top edge - this would be a street bet
                        cell.className += ' street-cell';
                        this.addBetAttributes(cell, 'street', [layout[0][numberIndex], layout[1][numberIndex], layout[2][numberIndex]]);
                    }
                }
                // Bottom cell (2,1) - split with number below
                else if (subRow === 2 && subCol === 1) {
                    if (numberRow < 2) {
                        const numBelow = layout[numberRow + 1][numberIndex];
                        cell.className += ' split-cell horizontal-split';
                        this.addBetAttributes(cell, 'split', [number, numBelow]);
                    }
                }
                // Left cell (1,0) - split with number to left
                else if (subRow === 1 && subCol === 0) {
                    if (numberIndex > 0) {
                        const numLeft = layout[numberRow][numberIndex - 1];
                        cell.className += ' split-cell vertical-split';
                        this.addBetAttributes(cell, 'split', [numLeft, number]);
                    } else {
                        // Left edge - street bet
                        cell.className += ' street-cell';
                        this.addBetAttributes(cell, 'street', [layout[0][0], layout[1][0], layout[2][0]]);
                    }
                }
                // Right cell (1,2) - split with number to right
                else if (subRow === 1 && subCol === 2) {
                    if (numberIndex < 11) {
                        const numRight = layout[numberRow][numberIndex + 1];
                        cell.className += ' split-cell vertical-split';
                        this.addBetAttributes(cell, 'split', [number, numRight]);
                    }
                }
                // Corner cells
                else if ((subRow === 0 || subRow === 2) && (subCol === 0 || subCol === 2)) {
                    // Determine which 4 numbers this corner touches
                    const cornerNumbers = [];
                    
                    // Current number
                    cornerNumbers.push(number);
                    
                    // Adjacent numbers based on corner position
                    if (subRow === 0 && subCol === 0 && numberRow > 0 && numberIndex > 0) {
                        // Top-left corner
                        cornerNumbers.push(layout[numberRow - 1][numberIndex]);
                        cornerNumbers.push(layout[numberRow][numberIndex - 1]);
                        cornerNumbers.push(layout[numberRow - 1][numberIndex - 1]);
                    } else if (subRow === 0 && subCol === 2 && numberRow > 0 && numberIndex < 11) {
                        // Top-right corner
                        cornerNumbers.push(layout[numberRow - 1][numberIndex]);
                        cornerNumbers.push(layout[numberRow][numberIndex + 1]);
                        cornerNumbers.push(layout[numberRow - 1][numberIndex + 1]);
                    } else if (subRow === 2 && subCol === 0 && numberRow < 2 && numberIndex > 0) {
                        // Bottom-left corner
                        cornerNumbers.push(layout[numberRow + 1][numberIndex]);
                        cornerNumbers.push(layout[numberRow][numberIndex - 1]);
                        cornerNumbers.push(layout[numberRow + 1][numberIndex - 1]);
                    } else if (subRow === 2 && subCol === 2 && numberRow < 2 && numberIndex < 11) {
                        // Bottom-right corner
                        cornerNumbers.push(layout[numberRow + 1][numberIndex]);
                        cornerNumbers.push(layout[numberRow][numberIndex + 1]);
                        cornerNumbers.push(layout[numberRow + 1][numberIndex + 1]);
                    }
                    
                    if (cornerNumbers.length === 4) {
                        cell.className += ' corner-cell';
                        this.addBetAttributes(cell, 'corner', cornerNumbers.sort((a, b) => a - b));
                    }
                }
            }
        }

        container.appendChild(cell);
    }



    addBetAttributes(cell, betType, numbers) {
        cell.setAttribute('data-bet-type', betType);
        cell.setAttribute('data-numbers', numbers.join(','));
        
        const payouts = {
            'straight': '35:1',
            'split': '17:1', 
            'corner': '8:1',
            'street': '11:1',
            'column': '2:1'
        };
        
        cell.title = `${betType} (${payouts[betType]}): ${numbers.join('/')}`;

        // Add click handlers
        cell.addEventListener('click', () => {
            this.placeBet(cell, betType, numbers);
        });

        cell.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const betId = `${betType}-${numbers.join(',')}`;
            this.removeBet(betId, cell);
            this.updateUI();
            this.updateGameStatus();
        });
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
            'red': 2,          // 1:1 + original bet
            'black': 2,        // 1:1 + original bet
            'even': 2,         // 1:1 + original bet
            'odd': 2,          // 1:1 + original bet
            'low': 2,          // 1:1 + original bet
            'high': 2,         // 1:1 + original bet
            'dozen': 3,        // 2:1 + original bet
            'column': 3        // 2:1 + original bet
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