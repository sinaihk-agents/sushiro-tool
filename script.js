document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let state = {
        currentScreen: 'setup-screen',
        dinerCount: 4,
        diners: [], // { id: 'A', name: 'Member 1' }
        meals: [],  // { id, name, price, payers: ['A', 'B'] }
        serviceChargeRate: 0.1,
        editingMealId: null,
        // Calorie Tracker State
        sushiData: [],
        consumedSushi: [], // { sushi_name, calories, id }
        totalCalories: 0,
        calorieGoal: 2000,
        currentCategory: 'all',
        searchQuery: ''
    };

    // --- DOM Elements ---
    const screens = {
        setup: document.getElementById('setup-screen'),
        calc: document.getElementById('calc-screen'),
        result: document.getElementById('result-screen'),
        calorie: document.getElementById('calorie-screen')
    };

    const dinerCountEl = document.getElementById('diner-count');
    const dinerInputsList = document.getElementById('diner-inputs-list');
    const historyList = document.getElementById('history-list');
    const grandTotalEl = document.getElementById('grand-total');
    const serviceChargeEl = document.getElementById('service-charge-amount');
    const dinerTotalsRow = document.getElementById('diner-totals-row');
    const itemCountBadge = document.getElementById('item-count-badge');
    const modalOverlay = document.getElementById('modal-overlay');
    const responseCodeEl = document.getElementById('response-code');
    const statusTextEl = document.getElementById('status-text');
    const statusIndicator = statusTextEl.parentElement;

    // --- Navigation ---
    function showScreen(screenId) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens[screenId.replace('-screen', '')].classList.add('active');
        state.currentScreen = screenId;
    }

    function hideAllModals() {
        document.getElementById('custom-plate-modal').style.display = 'none';
        document.getElementById('clear-confirm-modal').style.display = 'none';
        document.getElementById('edit-name-modal').style.display = 'none';
        document.getElementById('consumed-list-modal').style.display = 'none';
        document.getElementById('clear-calories-confirm-modal').style.display = 'none';
        document.getElementById('edit-goal-modal').style.display = 'none';
        modalOverlay.style.display = 'none';
    }

    // --- Setup Screen Logic ---
    document.getElementById('plus-diner').onclick = () => {
        if (state.dinerCount < 8) {
            state.dinerCount++;
            dinerCountEl.textContent = state.dinerCount;
        }
    };

    document.getElementById('minus-diner').onclick = () => {
        if (state.dinerCount > 1) {
            state.dinerCount--;
            dinerCountEl.textContent = state.dinerCount;
        }
    };

    document.getElementById('start-dining').onclick = () => {
        state.diners = [];
        for (let i = 0; i < state.dinerCount; i++) {
            state.diners.push({
                id: String.fromCharCode(65 + i),
                name: `成員 ${String.fromCharCode(65 + i)}`
            });
        }
        showScreen('calc-screen');
        renderTotals();
    };

    document.getElementById('back-to-setup').onclick = () => {
        showScreen('setup-screen');
    };

    document.getElementById('open-calorie-tracker').onclick = () => {
        showScreen('calorie-screen');
        if (state.sushiData.length === 0) {
            loadSushiData();
        }
    };

    document.getElementById('back-to-setup-from-cal').onclick = () => {
        showScreen('setup-screen');
    };

    // --- Calculator Logic ---
    document.querySelectorAll('.plate-btn').forEach(btn => {
        btn.onclick = () => {
            const price = parseFloat(btn.dataset.price);
            const name = btn.dataset.name + "壽司";
            const type = btn.classList.contains('red') ? 'red' :
                btn.classList.contains('silver') ? 'silver' :
                    btn.classList.contains('gold') ? 'gold' :
                        btn.classList.contains('black') ? 'black' : 'custom';
            addMeal(name, price, type);
        };
    });

    document.getElementById('custom-plate-btn').onclick = () => {
        hideAllModals();
        document.getElementById('custom-plate-modal').style.display = 'block';
        modalOverlay.style.display = 'flex';
    };

    document.getElementById('clear-history').onclick = () => {
        if (state.meals.length > 0) {
            hideAllModals();
            document.getElementById('clear-confirm-modal').style.display = 'block';
            modalOverlay.style.display = 'flex';
        }
    };

    document.getElementById('cancel-clear').onclick = () => {
        modalOverlay.style.display = 'none';
    };

    document.getElementById('confirm-clear').onclick = () => {
        state.meals = [];
        renderHistory();
        renderTotals();
        modalOverlay.style.display = 'none';
    };

    document.getElementById('cancel-edit-name').onclick = () => {
        modalOverlay.style.display = 'none';
    };

    document.getElementById('confirm-edit-name').onclick = () => {
        const input = document.getElementById('edit-name-input');
        const newName = input.value.trim();
        if (newName && state.editingMealId) {
            const meal = state.meals.find(m => m.id === state.editingMealId);
            if (meal) {
                meal.name = newName;
                renderHistory();
            }
        }
        modalOverlay.style.display = 'none';
    };

    document.getElementById('cancel-modal').onclick = () => {
        modalOverlay.style.display = 'none';
    };

    document.getElementById('confirm-custom').onclick = () => {
        const priceInput = document.getElementById('custom-price');
        const nameInput = document.getElementById('custom-name');
        const price = parseFloat(priceInput.value);
        const name = nameInput.value || "自定義項目";

        if (!isNaN(price) && price > 0) {
            addMeal(name, price, 'custom');
            modalOverlay.style.display = 'none';
            priceInput.value = '';
            nameInput.value = '';
        }
    };

    function addMeal(name, price, type = 'custom') {
        const meal = {
            id: Date.now(),
            name: name,
            price: price,
            type: type,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            payers: state.diners.map(d => d.id) // Default all payers
        };
        state.meals.unshift(meal);
        renderHistory();
        renderTotals();
    }

    function renderHistory() {
        historyList.innerHTML = '';
        itemCountBadge.textContent = `共 ${state.meals.length} 項`;

        state.meals.forEach(meal => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-item-top">
                    <div class="history-item-icon ${meal.type}"></div>
                    <div class="history-item-info">
                        <div class="history-item-name edit-trigger" data-meal-id="${meal.id}">${meal.name}</div>
                        <div class="history-item-time">${meal.time}</div>
                    </div>
                    <div class="history-item-price">$${meal.price.toFixed(2)}</div>
                </div>
                <div class="history-item-payers">
                    <span class="payer-label">付款人：</span>
                    <div class="payer-circles">
                        ${state.diners.map(d => `
                            <div class="payer-circle ${meal.payers.includes(d.id) ? 'active' : ''}" 
                                 data-meal-id="${meal.id}" data-payer-id="${d.id}">
                                ${d.id}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <button class="delete-btn" onclick="deleteMeal(${meal.id})"><i class="fas fa-trash-alt"></i></button>
            `;

            // Edit name trigger
            div.querySelector('.edit-trigger').onclick = () => {
                const mealId = parseInt(div.querySelector('.edit-trigger').dataset.mealId);
                const meal = state.meals.find(m => m.id === mealId);
                if (meal) {
                    state.editingMealId = mealId;
                    document.getElementById('edit-name-input').value = meal.name;
                    hideAllModals();
                    document.getElementById('edit-name-modal').style.display = 'block';
                    modalOverlay.style.display = 'flex';
                    setTimeout(() => document.getElementById('edit-name-input').select(), 100);
                }
            };

            // Toggle payers
            div.querySelectorAll('.payer-circle').forEach(circle => {
                circle.onclick = () => {
                    const mealId = parseInt(circle.dataset.mealId);
                    const payerId = circle.dataset.payerId;
                    const m = state.meals.find(x => x.id === mealId);

                    if (m.payers.includes(payerId)) {
                        if (m.payers.length > 1) {
                            m.payers = m.payers.filter(p => p !== payerId);
                        }
                    } else {
                        m.payers.push(payerId);
                    }
                    renderHistory();
                    renderTotals();
                };
            });

            historyList.appendChild(div);
        });
    }

    window.deleteMeal = (id) => {
        state.meals = state.meals.filter(m => m.id !== id);
        renderHistory();
        renderTotals();
    };

    function renderTotals() {
        let total = 0;
        const individualTotals = {};
        state.diners.forEach(d => individualTotals[d.id] = 0);

        state.meals.forEach(meal => {
            total += meal.price;
            const splitPrice = meal.price / meal.payers.length;
            meal.payers.forEach(p => {
                individualTotals[p] += splitPrice;
            });
        });

        const serviceCharge = total * state.serviceChargeRate;
        const grandTotal = total + serviceCharge;

        grandTotalEl.textContent = grandTotal.toFixed(2);
        serviceChargeEl.textContent = `+$${serviceCharge.toFixed(2)}`;

        // Render individual bubbles
        dinerTotalsRow.innerHTML = '';
        state.diners.forEach(d => {
            const shareOfService = (individualTotals[d.id] / (total || 1)) * serviceCharge;
            const finalTotal = individualTotals[d.id] + shareOfService;

            const div = document.createElement('div');
            div.className = `diner-total-card ${finalTotal > 0 ? 'highlight' : ''}`;
            div.innerHTML = `
                <div class="card-circle">${d.id}</div>
                <div class="card-amount">$${finalTotal.toFixed(1)}</div>
            `;
            dinerTotalsRow.appendChild(div);
        });
    }

    // --- Result Screen Logic ---
    document.querySelector('.menu-btn').onclick = () => {
        const amountField = document.getElementById('receipt-amount');
        amountField.value = "";
        showScreen('result-screen');

        // Reset message
        document.getElementById('response-title').textContent = 'SYSTEM RESPONSE CODE';
    };

    // Auto-select receipt amount field on click/focus
    document.getElementById('receipt-amount').onfocus = function () {
        this.select();
    };
    document.getElementById('receipt-amount').onclick = function () {
        this.select();
    };

    document.querySelector('.back-to-calc').onclick = () => showScreen('calc-screen');
    document.getElementById('return-calc').onclick = () => showScreen('calc-screen');

    document.getElementById('submit-webhook').onclick = async () => {
        const amount = document.getElementById('receipt-amount').value;
        const code = document.getElementById('invite-code').value;

        statusTextEl.textContent = 'SUBMITTING...';
        statusIndicator.classList.remove('success');

        try {
            const response = await fetch('https://n8n-1306.zeabur.app/webhook/sushiro-tools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: amount,
                    inviteCode: code,
                    timestamp: new Date().toISOString(),
                    details: state.meals
                })
            });

            const data = await response.json();
            responseCodeEl.textContent = data.code || '849201773402';
            document.getElementById('response-title').textContent = '恭喜你, 已獲得港幣 3 元優惠卷!';
            statusTextEl.textContent = 'SUCCESSFULLY RETRIEVED';
            statusIndicator.classList.add('success');

        } catch (error) {
            console.error(error);
            statusTextEl.textContent = 'ERROR SUBMITTING';
            responseCodeEl.textContent = 'ERROR';
        }
    };

    // --- Calorie Tracker Logic ---
    async function loadSushiData() {
        console.log('Fetching sushi data...');
        try {
            const response = await fetch('sushiro-calories.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Sushi data loaded:', data.length, 'items');
            state.sushiData = data;
            renderSushiGrid();
        } catch (error) {
            console.error('Error loading sushi data:', error);
        }
    }

    function renderSushiGrid() {
        const grid = document.getElementById('sushi-grid');
        grid.innerHTML = '';

        const filtered = state.sushiData.filter(sushi => {
            const matchesSearch = sushi.sushi_name.toLowerCase().includes(state.searchQuery.toLowerCase());
            if (state.searchQuery.trim() !== "") {
                return matchesSearch; // Global search overrides category
            }
            const matchesCategory = state.currentCategory === 'all' || sushi.category === state.currentCategory;
            return matchesCategory;
        });

        filtered.forEach(sushi => {
            const card = document.createElement('div');
            const consumedItem = state.consumedSushi.find(item => item.sushi_name === sushi.sushi_name);
            const count = consumedItem ? consumedItem.count : 0;

            card.className = `sushi-card ${count > 0 ? 'selected' : ''}`;
            card.innerHTML = `
                <div class="add-btn-circle">
                    <i class="fas fa-plus"></i>
                    ${count > 0 ? `<span class="portion-badge">${count}</span>` : ''}
                </div>
                <img src="${sushi.image_url}" alt="${sushi.sushi_name}" onerror="this.src='https://placehold.co/200x160?text=${encodeURIComponent(sushi.sushi_name)}'">
                <div class="sushi-info">
                    <div class="sushi-name">${sushi.sushi_name}</div>
                    <div class="sushi-calories"><i class="fas fa-fire"></i> ${sushi.calories} KCAL</div>
                </div>
            `;

            card.onclick = () => addSushi(sushi);
            grid.appendChild(card);
        });
    }

    function addSushi(sushi) {
        const item = state.consumedSushi.find(item => item.sushi_name === sushi.sushi_name);
        if (item) {
            item.count++;
        } else {
            state.consumedSushi.push({ ...sushi, count: 1 });
        }
        updateCalorieUI();
        renderSushiGrid();
    }

    function removeSushi(sushiName) {
        const index = state.consumedSushi.findIndex(item => item.sushi_name === sushiName);
        if (index > -1) {
            if (state.consumedSushi[index].count > 1) {
                state.consumedSushi[index].count--;
            } else {
                state.consumedSushi.splice(index, 1);
            }
        }
        updateCalorieUI();
        renderSushiGrid();
        renderConsumedModal();
    }

    function updateCalorieUI() {
        const total = state.consumedSushi.reduce((sum, item) => sum + (item.calories * item.count), 0);
        state.totalCalories = total;
        const remaining = state.calorieGoal - total; // Remove Math.max(..., 0)

        // Update Overview
        document.getElementById('total-calories').textContent = total;
        const remainingEl = document.getElementById('remaining-calories');
        remainingEl.textContent = remaining.toLocaleString();

        // Highlight negative
        const summaryCard = remainingEl.closest('.summary-item');
        if (remaining < 0) {
            summaryCard.classList.add('negative');
        } else {
            summaryCard.classList.remove('negative');
        }

        // Update Footer
        document.getElementById('footer-remaining').textContent = remaining.toLocaleString();
        const totalPortions = state.consumedSushi.reduce((sum, item) => sum + item.count, 0);
        document.getElementById('footer-count').textContent = totalPortions;

        // Progress ring
        const circle = document.getElementById('calorie-progress');
        const radius = circle.r.baseVal.value;
        const circumference = 2 * Math.PI * radius;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;

        const offset = circumference - (Math.min(total / state.calorieGoal, 1) * circumference);
        circle.style.strokeDashoffset = isNaN(offset) ? circumference : offset;

        // Update Goal Displays
        const goalDisplays = ['goal-display', 'summary-goal-display'];
        goalDisplays.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = state.calorieGoal.toLocaleString();
        });
    }

    // Modal logic for consumed list
    document.getElementById('show-consumed-list').onclick = () => {
        if (state.consumedSushi.length === 0) {
            alert('尚未選擇項目');
            return;
        }
        hideAllModals();
        renderConsumedModal();
        modalOverlay.style.display = 'flex';
        document.getElementById('consumed-list-modal').style.display = 'block';
    };

    function renderConsumedModal() {
        const listContainer = document.getElementById('consumed-items-list');
        listContainer.innerHTML = '';

        state.consumedSushi.forEach(item => {
            const row = document.createElement('div');
            row.className = 'consumed-row';
            row.innerHTML = `
                <div class="consumed-row-info">
                    <div class="consumed-row-name">${item.sushi_name}</div>
                    <div class="consumed-row-cal">${item.calories} kcal/份</div>
                </div>
                <div class="consumed-qty-control">
                    <button class="qty-btn minus" data-name="${item.sushi_name}"><i class="fas fa-minus"></i></button>
                    <span class="qty-val">${item.count}</span>
                    <button class="qty-btn plus" data-name="${item.sushi_name}"><i class="fas fa-plus"></i></button>
                </div>
            `;

            row.querySelector('.qty-btn.minus').onclick = () => removeSushi(item.sushi_name);
            row.querySelector('.qty-btn.plus').onclick = () => {
                addSushi(item);
                renderConsumedModal();
            };

            listContainer.appendChild(row);
        });

        document.getElementById('modal-total-cal').textContent = `${state.totalCalories} kcal`;

        if (state.consumedSushi.length === 0) {
            modalOverlay.style.display = 'none';
        }
    }

    document.getElementById('close-consumed-modal').onclick = () => {
        modalOverlay.style.display = 'none';
        document.getElementById('consumed-list-modal').style.display = 'none';
    };

    document.getElementById('clear-all-consumed').onclick = () => {
        hideAllModals();
        document.getElementById('clear-calories-confirm-modal').style.display = 'block';
        modalOverlay.style.display = 'flex';
    };

    document.getElementById('confirm-clear-calories').onclick = () => {
        state.consumedSushi = [];
        updateCalorieUI();
        renderSushiGrid();
        modalOverlay.style.display = 'none';
        document.getElementById('clear-calories-confirm-modal').style.display = 'none';
    };

    document.getElementById('cancel-clear-calories').onclick = () => {
        hideAllModals();
        renderConsumedModal();
        document.getElementById('consumed-list-modal').style.display = 'block';
        modalOverlay.style.display = 'flex';
    };

    // Goal configuration logic
    function openEditGoalModal() {
        hideAllModals();
        document.getElementById('new-goal-input').value = state.calorieGoal;
        document.getElementById('edit-goal-modal').style.display = 'block';
        modalOverlay.style.display = 'flex';
        setTimeout(() => document.getElementById('new-goal-input').select(), 100);
    }

    const editGoalTrigger = document.getElementById('edit-goal-trigger');
    if (editGoalTrigger) editGoalTrigger.onclick = openEditGoalModal;

    const goalSummaryItem = document.getElementById('goal-summary-item');
    if (goalSummaryItem) goalSummaryItem.onclick = openEditGoalModal;

    document.getElementById('cancel-goal-edit').onclick = hideAllModals;

    document.getElementById('confirm-goal-edit').onclick = () => {
        const input = document.getElementById('new-goal-input');
        const newVal = parseInt(input.value);
        if (!isNaN(newVal) && newVal >= 500) {
            state.calorieGoal = newVal;
            updateCalorieUI();
            hideAllModals();
        } else {
            alert('請輸入合理的卡路里目標（至少 500 kcal）');
        }
    };

    // Search and Filters
    document.getElementById('sushi-search').oninput = (e) => {
        state.searchQuery = e.target.value;
        renderSushiGrid();
    };

    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.currentCategory = tab.dataset.category;
            renderSushiGrid();
        };
    });

    // Handle initial state if any
    const clearBtn = document.getElementById('clear-calories');
    if (clearBtn) {
        clearBtn.onclick = () => {
            state.consumedSushi = [];
            updateCalorieUI();
            renderSushiGrid();
        };
    }
});
