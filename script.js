// Game State Management
class BingoGame {
    constructor() {
        this.currentView = 'home';
        this.selectedNumber = null;
        this.bingoCard = [];
        this.calledNumbers = [];
        this.markedNumbers = new Set();
        this.gameTimer = null;
        this.countdownTimer = null;
        this.gameStartTime = null;
        this.autoMark = false;
        this.gameActive = false;
        this.countdownActive = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.generateNumberGrid();
        this.generateLeaderboard();
        this.generateTransactions();
        this.updateStats();
        this.switchView('home');
    }
    
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });
        
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', this.toggleTheme);
        
        // Number search
        document.getElementById('numberSearch').addEventListener('input', this.handleNumberSearch.bind(this));
        
        // Game controls
        document.getElementById('leaveGameBtn').addEventListener('click', () => this.switchView('rooms'));
        document.getElementById('autoMarkBtn').addEventListener('click', this.toggleAutoMark.bind(this));
        document.getElementById('bingoBtn').addEventListener('click', this.callBingo.bind(this));
        
        // Modal controls
        document.getElementById('playAgainBtn').addEventListener('click', this.playAgain.bind(this));
        document.getElementById('backToRoomsBtn').addEventListener('click', () => {
            this.closeModal('gameResultModal');
            this.switchView('rooms');
        });
        
        // Wallet actions
        document.getElementById('depositBtn').addEventListener('click', () => this.showToast('Deposit feature coming soon!', 'warning'));
        document.getElementById('withdrawBtn').addEventListener('click', () => this.showToast('Withdraw feature coming soon!', 'warning'));
    }
    
    switchView(viewName) {
        // Update navigation
        document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });
        
        // Hide all views
        document.querySelectorAll('.view-container').forEach(view => {
            view.classList.add('hidden');
        });
        
        // Show selected view
        const targetView = document.getElementById(`${viewName}View`);
        if (targetView) {
            targetView.classList.remove('hidden');
            this.currentView = viewName;
        }
        
        // Reset game state when leaving game view
        if (this.currentView !== 'game' && this.gameActive) {
            this.resetGame();
        }
    }
    
    generateNumberGrid() {
        const grid = document.getElementById('numberGrid');
        grid.innerHTML = '';
        
        for (let i = 1; i <= 200; i++) {
            const button = document.createElement('button');
            button.className = 'number-btn';
            button.textContent = i;
            button.addEventListener('click', () => this.selectNumber(i));
            grid.appendChild(button);
        }
    }
    
    selectNumber(number) {
        // Update selection
        document.querySelectorAll('.number-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        event.target.classList.add('selected');
        this.selectedNumber = number;
        
        // Show loading and generate card
        this.showLoading();
        
        setTimeout(() => {
            this.generateBingoCard(number);
            this.hideLoading();
            this.switchView('game');
            this.startCountdown();
        }, 1500);
    }
    
    generateBingoCard(seedNumber) {
        // Use seed number for consistent card generation
        const random = this.seededRandom(seedNumber);
        const card = [];
        
        // Generate numbers for each column
        const ranges = [
            [1, 15],   // B
            [16, 30],  // I
            [31, 45],  // N
            [46, 60],  // G
            [61, 75]   // O
        ];
        
        for (let col = 0; col < 5; col++) {
            const column = [];
            const [min, max] = ranges[col];
            const available = [];
            
            for (let i = min; i <= max; i++) {
                available.push(i);
            }
            
            // Shuffle and pick 5 numbers
            for (let i = available.length - 1; i > 0; i--) {
                const j = Math.floor(random() * (i + 1));
                [available[i], available[j]] = [available[j], available[i]];
            }
            
            column.push(...available.slice(0, 5));
            card.push(column);
        }
        
        // Set center as FREE
        card[2][2] = 'FREE';
        
        this.bingoCard = card;
        this.renderBingoCard();
        
        // Update UI
        document.getElementById('selectedNumber').textContent = seedNumber;
        document.getElementById('cardRoomNumber').textContent = seedNumber;
    }
    
    renderBingoCard() {
        const cardGrid = document.getElementById('bingoCard');
        cardGrid.innerHTML = '';
        
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const cell = document.createElement('div');
                cell.className = 'card-cell';
                
                const value = this.bingoCard[col][row];
                cell.textContent = value;
                cell.dataset.col = col;
                cell.dataset.row = row;
                cell.dataset.value = value;
                
                if (value === 'FREE') {
                    cell.classList.add('free', 'marked');
                    this.markedNumbers.add(`${col}-${row}`);
                } else {
                    cell.addEventListener('click', () => this.markCell(col, row));
                }
                
                cardGrid.appendChild(cell);
            }
        }
        
        this.updateGameStats();
    }
    
    markCell(col, row) {
        const cellKey = `${col}-${row}`;
        const cell = document.querySelector(`[data-col="${col}"][data-row="${row}"]`);
        const value = this.bingoCard[col][row];
        
        if (value === 'FREE') return;
        
        // Only allow marking if number has been called
        if (!this.calledNumbers.includes(value)) {
            this.showToast('You can only mark numbers that have been called!', 'warning');
            return;
        }
        
        if (this.markedNumbers.has(cellKey)) {
            // Unmark
            this.markedNumbers.delete(cellKey);
            cell.classList.remove('marked');
        } else {
            // Mark
            this.markedNumbers.add(cellKey);
            cell.classList.add('marked');
            this.showToast(`Marked ${value}!`, 'success');
        }
        
        this.updateGameStats();
        this.checkForBingo();
    }
    
    startCountdown() {
        this.countdownActive = true;
        let timeLeft = 30;
        
        const countdownElement = document.getElementById('countdownTimer');
        const progressBar = document.getElementById('countdownBar');
        const statusElement = document.getElementById('gameStatus').querySelector('span');
        
        statusElement.textContent = 'Game Starting Soon...';
        progressBar.style.width = '100%';
        
        this.countdownTimer = setInterval(() => {
            timeLeft--;
            countdownElement.textContent = timeLeft;
            progressBar.style.width = `${(timeLeft / 30) * 100}%`;
            
            if (timeLeft <= 0) {
                clearInterval(this.countdownTimer);
                this.startGame();
            }
        }, 1000);
    }
    
    startGame() {
        this.countdownActive = false;
        this.gameActive = true;
        this.gameStartTime = Date.now();
        
        // Hide countdown, show game board
        document.getElementById('countdownSection').classList.add('hidden');
        document.getElementById('gameBoard').classList.remove('hidden');
        document.getElementById('bingoBtn').classList.remove('hidden');
        
        // Update status
        document.getElementById('gameStatus').querySelector('span').textContent = 'Game Active';
        
        this.showToast('Game Started! Good luck!', 'success');
        this.startCallingNumbers();
        this.startGameTimer();
    }
    
    startCallingNumbers() {
        const allNumbers = [];
        for (let i = 1; i <= 75; i++) {
            allNumbers.push(i);
        }
        
        // Shuffle numbers
        for (let i = allNumbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allNumbers[i], allNumbers[j]] = [allNumbers[j], allNumbers[i]];
        }
        
        let callIndex = 0;
        
        const callNext = () => {
            if (!this.gameActive || callIndex >= allNumbers.length) return;
            
            const number = allNumbers[callIndex];
            this.callNumber(number);
            callIndex++;
            
            // Schedule next call (3-5 seconds)
            const delay = 3000 + Math.random() * 2000;
            setTimeout(callNext, delay);
        };
        
        // Start calling after 2 seconds
        setTimeout(callNext, 2000);
    }
    
    callNumber(number) {
        this.calledNumbers.push(number);
        
        // Update ball display
        const ballNumber = document.getElementById('ballNumber');
        const ballLetter = document.getElementById('ballLetter');
        
        ballNumber.textContent = number;
        
        // Determine letter
        let letter;
        if (number <= 15) letter = 'B';
        else if (number <= 30) letter = 'I';
        else if (number <= 45) letter = 'N';
        else if (number <= 60) letter = 'G';
        else letter = 'O';
        
        ballLetter.textContent = letter;
        
        // Add to called numbers display
        const columnId = `called${letter}`;
        const column = document.getElementById(columnId);
        const numberElement = document.createElement('div');
        numberElement.className = 'called-number';
        numberElement.textContent = number;
        column.appendChild(numberElement);
        
        // Auto-mark if enabled
        if (this.autoMark) {
            this.autoMarkNumber(number);
        }
        
        this.updateGameStats();
        this.showToast(`${letter}-${number} called!`, 'success');
    }
    
    autoMarkNumber(number) {
        for (let col = 0; col < 5; col++) {
            for (let row = 0; row < 5; row++) {
                if (this.bingoCard[col][row] === number) {
                    const cellKey = `${col}-${row}`;
                    if (!this.markedNumbers.has(cellKey)) {
                        this.markedNumbers.add(cellKey);
                        const cell = document.querySelector(`[data-col="${col}"][data-row="${row}"]`);
                        cell.classList.add('marked');
                    }
                }
            }
        }
        this.checkForBingo();
    }
    
    toggleAutoMark() {
        this.autoMark = !this.autoMark;
        const btn = document.getElementById('autoMarkBtn');
        btn.classList.toggle('active', this.autoMark);
        
        const message = this.autoMark ? 'Auto-mark enabled!' : 'Auto-mark disabled!';
        this.showToast(message, 'success');
    }
    
    checkForBingo() {
        const patterns = this.getBingoPatterns();
        
        for (const pattern of patterns) {
            if (pattern.every(([col, row]) => this.markedNumbers.has(`${col}-${row}`))) {
                this.achieveBingo();
                return true;
            }
        }
        
        return false;
    }
    
    getBingoPatterns() {
        const patterns = [];
        
        // Rows
        for (let row = 0; row < 5; row++) {
            patterns.push([[0, row], [1, row], [2, row], [3, row], [4, row]]);
        }
        
        // Columns
        for (let col = 0; col < 5; col++) {
            patterns.push([[col, 0], [col, 1], [col, 2], [col, 3], [col, 4]]);
        }
        
        // Diagonals
        patterns.push([[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]);
        patterns.push([[0, 4], [1, 3], [2, 2], [3, 1], [4, 0]]);
        
        return patterns;
    }
    
    callBingo() {
        if (this.checkForBingo()) {
            this.achieveBingo();
        } else {
            this.showToast('No valid Bingo pattern found!', 'error');
        }
    }
    
    achieveBingo() {
        this.gameActive = false;
        clearInterval(this.gameTimer);
        
        // Calculate winnings (mock)
        const winnings = Math.floor(Math.random() * 500) + 100;
        
        // Update wallet
        const currentBalance = parseFloat(document.getElementById('walletAmount').textContent);
        const newBalance = currentBalance + winnings;
        document.getElementById('walletAmount').textContent = newBalance.toFixed(2);
        document.getElementById('walletBalanceDisplay').textContent = `${newBalance.toFixed(2)} BBR`;
        
        // Show result modal
        document.getElementById('resultTitle').textContent = 'BINGO! 🎉';
        document.getElementById('resultMessage').textContent = `Congratulations! You won ${winnings} BBR!`;
        this.showModal('gameResultModal');
        
        // Update stats
        this.updateWinStats();
    }
    
    startGameTimer() {
        let seconds = 0;
        this.gameTimer = setInterval(() => {
            seconds++;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            document.getElementById('timerDisplay').textContent = 
                `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    updateGameStats() {
        document.getElementById('numbersCalledCount').textContent = this.calledNumbers.length;
        document.getElementById('markedCount').textContent = this.markedNumbers.size;
        
        const totalCells = 24; // 25 - 1 (FREE space)
        const completion = Math.round((this.markedNumbers.size / totalCells) * 100);
        document.getElementById('completionRate').textContent = `${completion}%`;
    }
    
    updateStats() {
        // Mock data for demonstration
        const stats = {
            totalWinnings: (Math.random() * 5000).toFixed(2),
            gamesWon: Math.floor(Math.random() * 50),
            winRate: Math.floor(Math.random() * 100),
            streak: Math.floor(Math.random() * 10),
            totalGames: Math.floor(Math.random() * 200),
            timeSpent: Math.floor(Math.random() * 100),
            favoriteNumber: Math.floor(Math.random() * 75) + 1,
            longestStreak: Math.floor(Math.random() * 15)
        };
        
        document.getElementById('userTotalWinnings').textContent = stats.totalWinnings;
        document.getElementById('userGamesWon').textContent = stats.gamesWon;
        document.getElementById('userWinRate').textContent = `${stats.winRate}%`;
        document.getElementById('userStreak').textContent = stats.streak;
        document.getElementById('totalGamesPlayed').textContent = stats.totalGames;
        document.getElementById('totalTimeSpent').textContent = `${stats.timeSpent}h`;
        document.getElementById('favoriteNumber').textContent = stats.favoriteNumber;
        document.getElementById('longestStreak').textContent = stats.longestStreak;
    }
    
    updateWinStats() {
        // Update win statistics
        const currentWinnings = parseFloat(document.getElementById('userTotalWinnings').textContent);
        const currentGamesWon = parseInt(document.getElementById('userGamesWon').textContent);
        const currentStreak = parseInt(document.getElementById('userStreak').textContent);
        
        document.getElementById('userTotalWinnings').textContent = (currentWinnings + 100).toFixed(2);
        document.getElementById('userGamesWon').textContent = currentGamesWon + 1;
        document.getElementById('userStreak').textContent = currentStreak + 1;
        
        // Recalculate win rate
        const totalGames = parseInt(document.getElementById('totalGamesPlayed').textContent) + 1;
        const winRate = Math.round(((currentGamesWon + 1) / totalGames) * 100);
        document.getElementById('userWinRate').textContent = `${winRate}%`;
        document.getElementById('totalGamesPlayed').textContent = totalGames;
    }
    
    handleNumberSearch(e) {
        const searchValue = parseInt(e.target.value);
        if (searchValue >= 1 && searchValue <= 200) {
            const targetBtn = document.querySelector(`.number-btn:nth-child(${searchValue})`);
            if (targetBtn) {
                targetBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetBtn.style.animation = 'pulse 1s ease-out';
                setTimeout(() => {
                    targetBtn.style.animation = '';
                }, 1000);
            }
        }
    }
    
    resetGame() {
        this.gameActive = false;
        this.countdownActive = false;
        this.calledNumbers = [];
        this.markedNumbers = new Set();
        
        if (this.gameTimer) clearInterval(this.gameTimer);
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        
        // Reset UI
        document.getElementById('countdownSection').classList.remove('hidden');
        document.getElementById('gameBoard').classList.add('hidden');
        document.getElementById('bingoBtn').classList.add('hidden');
        
        // Clear called numbers
        ['B', 'I', 'N', 'G', 'O'].forEach(letter => {
            document.getElementById(`called${letter}`).innerHTML = '';
        });
        
        // Reset ball display
        document.getElementById('ballNumber').textContent = '—';
        document.getElementById('ballLetter').textContent = '—';
        document.getElementById('timerDisplay').textContent = '00:00';
    }
    
    playAgain() {
        this.closeModal('gameResultModal');
        this.resetGame();
        if (this.selectedNumber) {
            this.generateBingoCard(this.selectedNumber);
            this.startCountdown();
        }
    }
    
    generateLeaderboard() {
        const leaderboard = document.getElementById('leaderboardList');
        const players = [
            { name: 'Alex Champion', winnings: 15420.50, games: 234, avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop' },
            { name: 'Sarah Winner', winnings: 12890.25, games: 198, avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop' },
            { name: 'Mike Lucky', winnings: 11250.75, games: 176, avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop' },
            { name: 'Emma Star', winnings: 9875.00, games: 145, avatar: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop' },
            { name: 'David Pro', winnings: 8420.30, games: 132, avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop' }
        ];
        
        leaderboard.innerHTML = players.map((player, index) => {
            const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
            return `
                <div class="leaderboard-item">
                    <div class="rank ${rankClass}">${index + 1}</div>
                    <img src="${player.avatar}" alt="${player.name}" class="user-avatar">
                    <div class="player-info">
                        <div class="player-name">${player.name}</div>
                        <div class="player-stats">${player.games} games played</div>
                    </div>
                    <div class="player-winnings">${player.winnings.toFixed(2)} BBR</div>
                </div>
            `;
        }).join('');
    }
    
    generateTransactions() {
        const transactions = document.getElementById('transactionsList');
        const mockTransactions = [
            { type: 'win', amount: 250.00, date: '2025-01-15', description: 'Bingo Win - Room #42' },
            { type: 'deposit', amount: 500.00, date: '2025-01-14', description: 'Wallet Deposit' },
            { type: 'win', amount: 180.50, date: '2025-01-13', description: 'Bingo Win - Room #17' },
            { type: 'loss', amount: -50.00, date: '2025-01-12', description: 'Game Entry - Room #89' }
        ];
        
        transactions.innerHTML = mockTransactions.map(transaction => `
            <div class="transaction-item ${transaction.type}">
                <div class="transaction-icon">
                    <i class="fas fa-${transaction.type === 'win' ? 'trophy' : transaction.type === 'deposit' ? 'plus' : 'minus'}"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-description">${transaction.description}</div>
                    <div class="transaction-date">${transaction.date}</div>
                </div>
                <div class="transaction-amount ${transaction.amount > 0 ? 'positive' : 'negative'}">
                    ${transaction.amount > 0 ? '+' : ''}${transaction.amount.toFixed(2)} BBR
                </div>
            </div>
        `).join('');
    }
    
    // Utility Functions
    seededRandom(seed) {
        let state = seed;
        return function() {
            state = (state * 1664525 + 1013904223) % 4294967296;
            return state / 4294967296;
        };
    }
    
    toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        
        const icon = document.querySelector('#themeToggle i');
        icon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
    
    showModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    
    closeModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    showLoading() {
        document.getElementById('loadingScreen').classList.remove('hidden');
    }
    
    hideLoading() {
        document.getElementById('loadingScreen').classList.add('hidden');
    }
    
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' : 
                    'exclamation-triangle';
        
        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;
        
        document.getElementById('toastContainer').appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'toastSlideIn 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Additional CSS for new elements
const additionalStyles = `
.player-info {
    flex: 1;
}

.player-name {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--space-xs);
}

.player-stats {
    font-size: var(--font-size-sm);
    color: var(--text-muted);
}

.player-winnings {
    font-size: var(--font-size-lg);
    font-weight: 700;
    color: var(--accent-success);
}

.transaction-item {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md);
    background: var(--bg-glass);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-sm);
    backdrop-filter: blur(20px);
}

.transaction-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
}

.transaction-item.win .transaction-icon {
    background: var(--gradient-secondary);
}

.transaction-item.deposit .transaction-icon {
    background: var(--gradient-primary);
}

.transaction-item.loss .transaction-icon {
    background: var(--gradient-accent);
}

.transaction-details {
    flex: 1;
}

.transaction-description {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--space-xs);
}

.transaction-date {
    font-size: var(--font-size-sm);
    color: var(--text-muted);
}

.transaction-amount {
    font-size: var(--font-size-lg);
    font-weight: 700;
}

.transaction-amount.positive {
    color: var(--accent-success);
}

.transaction-amount.negative {
    color: var(--accent-error);
}

.profile-section {
    background: var(--bg-glass);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-xl);
    padding: var(--space-xl);
    backdrop-filter: blur(20px);
    margin-bottom: var(--space-lg);
}

.profile-section h3 {
    font-size: var(--font-size-xl);
    font-weight: 700;
    margin-bottom: var(--space-lg);
    color: var(--text-primary);
}
`;

// Add additional styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    window.bingoGame = new BingoGame();
});

// Global functions for inline event handlers
function switchView(view) {
    window.bingoGame.switchView(view);
}

function closeModal(modalId) {
    window.bingoGame.closeModal(modalId);
}