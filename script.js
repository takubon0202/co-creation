// ===================================
// カフェマニュアル - メインスクリプト
// ===================================

// グローバル変数
let menuData = {};
let cleaningData = {};
let serviceData = {};
let airpayData = {};
let settings = {};

// ===================================
// 初期化
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // データの読み込み
    loadData();

    // イベントリスナーの設定
    setupEventListeners();

    // ナビゲーションの初期化（モバイルでは非表示）
    initializeNavigation();

    // 初期ページの表示
    showPage('dashboard');

    // ダッシュボードの更新
    updateDashboard();

    // カレンダーの初期化
    renderCalendar();

    // 設定ページのカレンダー設定を読み込む
    loadCalendarSettings();
}

// ナビゲーションの初期化
function initializeNavigation() {
    const mainNav = document.getElementById('mainNav');
    const navOverlay = document.getElementById('navOverlay');

    // 初期状態では常に閉じている
    mainNav.classList.remove('open');
    navOverlay.classList.remove('active');
}

// ===================================
// データ管理
// ===================================

function loadData() {
    // メニューデータの読み込み
    const savedMenuData = localStorage.getItem(STORAGE_KEYS.MENU_DATA);
    if (savedMenuData) {
        const stored = JSON.parse(savedMenuData);
        // initialDataをベースにマージ（新しい項目を追加し、既存の編集は維持）
        menuData = {};
        Object.keys(initialData.menu).forEach(menuId => {
            menuData[menuId] = {
                ...initialData.menu[menuId],
                ...(stored[menuId] || {})
            };
        });
        localStorage.setItem(STORAGE_KEYS.MENU_DATA, JSON.stringify(menuData));
    } else {
        menuData = initialData.menu;
    }

    // 清掃データの読み込み
    const savedCleaningData = localStorage.getItem(STORAGE_KEYS.CLEANING_DATA);
    cleaningData = savedCleaningData ? JSON.parse(savedCleaningData) : initialData.cleaning;

    // 提供方法データの読み込み
    const savedServiceData = localStorage.getItem(STORAGE_KEYS.SERVICE_DATA);
    if (savedServiceData) {
        const storedService = JSON.parse(savedServiceData);
        serviceData = {};
        Object.keys(initialData.service).forEach(key => {
            serviceData[key] = {
                ...initialData.service[key],
                ...(storedService[key] || {})
            };
        });

        // 重要フィールド（画像・レイアウト）は常に最新の初期データを優先
        if (initialData.service.layout?.image) {
            serviceData.layout.image = initialData.service.layout.image;
        }
        if (initialData.service.hours?.normal?.image) {
            serviceData.hours.normal.image = initialData.service.hours.normal.image;
        }
        if (initialData.service.hours?.holiday?.image) {
            serviceData.hours.holiday.image = initialData.service.hours.holiday.image;
        }
        if (initialData.service.staffing?.image) {
            serviceData.staffing.image = initialData.service.staffing.image;
        }

        localStorage.setItem(STORAGE_KEYS.SERVICE_DATA, JSON.stringify(serviceData));
    } else {
        serviceData = initialData.service;
    }

    // AirPayデータ
    airpayData = initialData.airpay;

    // 設定の読み込み
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    settings = savedSettings ? JSON.parse(savedSettings) : defaultSettings;

    // 日付が変わっていたらチェックリストをリセット
    resetDailyChecklist();

    // メニューページをレンダリング
    renderMenuPages();

    // 清掃ページをレンダリング
    renderCleaningPages();

    // 提供方法ページをレンダリング
    renderServicePage();
    renderCustomerServicePage();
    renderCustomerCautionsPage();

    // トラブルシューティングをレンダリング
    renderTroubleshooting();

    // 衛生マニュアルをレンダリング
    renderHygiene();

    // AirPayマニュアルをレンダリング
    renderAirpay();
}

function saveData() {
    localStorage.setItem(STORAGE_KEYS.MENU_DATA, JSON.stringify(menuData));
    localStorage.setItem(STORAGE_KEYS.CLEANING_DATA, JSON.stringify(cleaningData));
    localStorage.setItem(STORAGE_KEYS.SERVICE_DATA, JSON.stringify(serviceData));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));

    // 更新履歴を記録
    addUpdateHistory('データを保存しました');
}

function resetDailyChecklist() {
    const today = new Date().toDateString();
    const lastReset = localStorage.getItem('lastChecklistReset');

    if (lastReset !== today) {
        // 日次清掃のチェックをリセット
        if (cleaningData.daily && cleaningData.daily.tasks) {
            cleaningData.daily.tasks.forEach(task => {
                task.completed = false;
                task.completedAt = null;
            });
            saveData();
        }
        localStorage.setItem('lastChecklistReset', today);
    }
}

// ===================================
// イベントリスナー
// ===================================

function setupEventListeners() {
    // ナビゲーションリンク
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.currentTarget.dataset.page;
            navigateToPage(page);

            // メニューを閉じる
            const mainNav = document.getElementById('mainNav');
            const navOverlay = document.getElementById('navOverlay');
            mainNav.classList.remove('open');
            navOverlay.classList.remove('active');
        });
    });

    // メニューボタン
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = e.currentTarget.dataset.page;
            navigateToPage(page);
        });
    });

    // メニュートグル（サイドバー）
    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.getElementById('mainNav');
    const navOverlay = document.getElementById('navOverlay');

    menuToggle.addEventListener('click', () => {
        mainNav.classList.toggle('open');
        navOverlay.classList.toggle('active');
    });

    // オーバーレイクリックで閉じる
    navOverlay.addEventListener('click', () => {
        mainNav.classList.remove('open');
        navOverlay.classList.remove('active');
    });

    // ヘッダータイトルクリックでホームに戻る
    const headerTitle = document.getElementById('headerTitle');
    if (headerTitle) {
        headerTitle.addEventListener('click', () => {
            navigateToPage('dashboard');
            // メニューを閉じる
            mainNav.classList.remove('open');
            navOverlay.classList.remove('active');
        });
    }

    // タブ切り替え
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;
            switchTab(tab);
        });
    });

    // 画像モーダル
    const modal = document.getElementById('imageModal');
    const closeBtn = modal.querySelector('.close');
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // 編集モード
    const editModeToggle = document.getElementById('editMode');
    editModeToggle.checked = settings.editMode;
    editModeToggle.addEventListener('change', (e) => {
        settings.editMode = e.target.checked;
        saveData();
    });
}

// ===================================
// ナビゲーション
// ===================================

// ナビゲーションカテゴリーの折りたたみ切り替え
function toggleNavCategory(header) {
    const category = header.parentElement;
    category.classList.toggle('collapsed');
}

function navigateToPage(pageId) {
    showPage(pageId);

    // ナビゲーションのアクティブ状態を更新
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageId) {
            link.classList.add('active');
        }
    });

    // モバイルメニューを閉じる
    document.getElementById('mainNav').classList.remove('open');
    document.getElementById('navOverlay').classList.remove('active');

    // ページに応じた処理
    if (pageId === 'dashboard') {
        updateDashboard();
    }
}

// メニュー一覧ページを表示
function showMenuList() {
    navigateToPage('menu-list');
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
}

// ===================================
// ダッシュボード
// ===================================

function updateDashboard() {
    const dailyTasks = cleaningData.daily.tasks || [];
    const completedTasks = dailyTasks.filter(task => task.completed).length;
    const totalTasks = dailyTasks.length;

    document.getElementById('completedCount').textContent = completedTasks;
    document.getElementById('totalCount').textContent = totalTasks;
}

// ===================================
// メニューページのレンダリング
// ===================================

function renderMenuPages() {
    Object.keys(menuData).forEach(menuId => {
        const menu = menuData[menuId];
        const contentDiv = document.getElementById(`${menuId}Content`);

        if (!contentDiv) return;

        let html = '';

        // 注意事項セクション
        if (menu.warnings && menu.warnings.length > 0) {
            html += '<div class="warnings-section">';
            html += '<h3><i class="fas fa-exclamation-triangle"></i> 注意事項</h3>';
            html += '<ul class="warnings-list">';
            menu.warnings.forEach(warning => {
                html += `<li>${warning}</li>`;
            });
            html += '</ul>';
            html += '</div>';
        }

        // 材料セクション
        html += '<div class="ingredients-section">';
        html += '<h3><i class="fas fa-shopping-basket"></i> 材料</h3>';
        html += '<ul class="ingredients-list">';
        menu.ingredients.forEach(ingredient => {
            html += `<li>${ingredient}</li>`;
        });
        html += '</ul>';
        html += '</div>';

        // 器具セクション
        html += '<div class="equipment-section">';
        html += '<h3><i class="fas fa-tools"></i> 必要な器具</h3>';
        html += '<ul class="equipment-list">';
        menu.equipment.forEach(equipment => {
            html += `<li>${equipment}</li>`;
        });
        html += '</ul>';
        html += '</div>';

        // アレルゲンセクション
        if (menu.allergens && menu.allergens.length > 0) {
            html += '<div class="allergens-section">';
            html += '<h3><i class="fas fa-exclamation-circle"></i> アレルゲン</h3>';
            html += '<ul class="allergens-list">';
            menu.allergens.forEach(allergen => {
                html += `<li>${allergen}</li>`;
            });
            html += '</ul>';
            html += '</div>';
        }

        // ステップセクション
        html += '<div class="steps-section">';
        html += '<h3><i class="fas fa-list-ol"></i> 作り方</h3>';
        menu.steps.forEach(step => {
            html += renderStep(step);
        });
        html += '</div>';

        // トラブルシューティング
        if (menu.troubleshooting && menu.troubleshooting.length > 0) {
            html += '<div class="troubleshooting-section">';
            html += '<h3><i class="fas fa-question-circle"></i> よくある問題と対処法</h3>';
            menu.troubleshooting.forEach(item => {
                html += '<div class="troubleshooting-item">';
                html += `<div class="problem"><i class="fas fa-exclamation-circle"></i> ${item.problem}</div>`;
                html += `<div class="solution"><strong>解決策:</strong> ${item.solution}</div>`;
                html += '</div>';
            });
            html += '</div>';
        }

        // 品質基準セクション
        if (menu.qualityStandards && menu.qualityStandards.length > 0) {
            html += '<div class="quality-section">';
            html += '<h3><i class="fas fa-star"></i> 品質基準</h3>';
            html += '<ul class="quality-list">';
            menu.qualityStandards.forEach(standard => {
                html += `<li>${standard}</li>`;
            });
            html += '</ul>';
            html += '</div>';
        }

        // バリエーションセクション
        if (menu.variations && menu.variations.length > 0) {
            html += '<div class="variations-section">';
            html += '<h3><i class="fas fa-magic"></i> バリエーション</h3>';
            html += '<ul class="variations-list">';
            menu.variations.forEach(variation => {
                html += `<li>${variation}</li>`;
            });
            html += '</ul>';
            html += '</div>';
        }

        // 清掃セクション
        if (menu.cleaning && menu.cleaning.length > 0) {
            html += '<div class="cleaning-section">';
            html += '<h3><i class="fas fa-broom"></i> 清掃・お手入れ</h3>';
            html += '<ul class="cleaning-list">';
            menu.cleaning.forEach(cleanItem => {
                html += `<li>${cleanItem}</li>`;
            });
            html += '</ul>';
            html += '</div>';
        }

        // 参照セクション
        if (menu.references && menu.references.length > 0) {
            html += '<div class="references-section">';
            html += '<h3><i class="fas fa-book"></i> 参照</h3>';
            html += '<ul class="references-list">';
            menu.references.forEach(reference => {
                html += `<li>${reference}</li>`;
            });
            html += '</ul>';
            html += '</div>';
        }

        contentDiv.innerHTML = html;

        // 画像クリックイベントを追加
        contentDiv.querySelectorAll('.step-image').forEach(img => {
            img.addEventListener('click', () => {
                showImageModal(img.src, img.alt);
            });
        });
    });
}

function renderStep(step) {
    let html = '<div class="step">';
    html += '<div class="step-header">';
    html += `<div class="step-number">${step.number}</div>`;
    html += `<div class="step-title">${step.title}</div>`;
    html += '</div>';
    html += '<div class="step-content">';
    html += `<div class="step-description">${step.description}</div>`;

    // ヒント
    if (step.tips && step.tips.length > 0) {
        html += '<div class="step-tips">';
        html += '<h4><i class="fas fa-lightbulb"></i> ポイント</h4>';
        html += '<ul>';
        step.tips.forEach(tip => {
            html += `<li>${tip}</li>`;
        });
        html += '</ul>';
        html += '</div>';
    }

    html += '</div>';
    html += '</div>';
    return html;
}

// ===================================
// 清掃ページのレンダリング
// ===================================

function renderCleaningPages() {
    ['daily', 'weekly', 'monthly'].forEach(period => {
        const container = document.getElementById(`${period}Tasks`);
        if (!container) return;

        const data = cleaningData[period];
        if (!data || !data.tasks) return;

        let html = '';
        data.tasks.forEach(task => {
            html += renderCleaningTask(task, period);
        });

        container.innerHTML = html;

        // チェックボックスイベントを追加
        container.querySelectorAll('.task-checkbox input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const taskId = e.target.dataset.taskId;
                const period = e.target.dataset.period;
                toggleTaskCompletion(taskId, period);
            });
        });

        // 画像クリックイベントを追加
        container.querySelectorAll('.task-image').forEach(img => {
            img.addEventListener('click', () => {
                showImageModal(img.src, img.alt);
            });
        });
    });
}

function renderCleaningTask(task, period) {
    let html = `<div class="cleaning-task ${task.completed ? 'completed' : ''}">`;
    html += '<div class="task-checkbox">';
    html += `<input type="checkbox" ${task.completed ? 'checked' : ''} data-task-id="${task.id}" data-period="${period}">`;
    html += '</div>';
    html += '<div class="task-content">';
    html += `<div class="task-title">${task.title}</div>`;
    html += `<div class="task-description">${task.description}</div>`;

    // 画像がある場合は表示（新しい形式）
    if (task.images && task.images.length > 0) {
        html += '<div class="task-images">';
        task.images.forEach(image => {
            html += `<img src="${image.path}" class="task-image" alt="${image.alt}" onerror="this.style.display='none'">`;
        });
        html += '</div>';
    }

    if (task.completed && task.completedAt) {
        const date = new Date(task.completedAt);
        html += `<div class="task-completion">✓ 完了: ${date.toLocaleString('ja-JP')}</div>`;
    }

    html += '</div>';
    html += '</div>';
    return html;
}

function toggleTaskCompletion(taskId, period) {
    const task = cleaningData[period].tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;

    saveData();
    renderCleaningPages();
    updateDashboard();
}

// ===================================
// タブ切り替え
// ===================================

function switchTab(tabName) {
    // タブボタンのアクティブ状態を更新
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // タブコンテンツの表示切り替え
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// ===================================
// 画像表示
// ===================================

function showImageModal(src, alt) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const caption = document.getElementById('caption');

    modal.style.display = 'block';
    modalImg.src = src;
    caption.textContent = alt;
}

// ===================================
// トラブルシューティング
// ===================================

function renderTroubleshooting() {
    const container = document.getElementById('troubleshootingContent');
    if (!container) return;

    let html = '';

    initialData.troubleshooting.forEach(item => {
        html += '<div class="troubleshooting-item">';
        html += `<h3><i class="fas fa-exclamation-triangle"></i> ${item.title}</h3>`;
        html += `<div class="problem"><strong>問題:</strong> ${item.problem}</div>`;
        html += '<div class="solution">';
        html += '<strong>解決策:</strong>';
        html += '<ul>';
        item.solutions.forEach(solution => {
            html += `<li>${solution}</li>`;
        });
        html += '</ul>';
        html += '</div>';
        html += '</div>';
    });

    container.innerHTML = html;
}

// ===================================
// AirPay マニュアル
// ===================================

function renderAirpay() {
    const container = document.getElementById('airpayContent');
    if (!container || !airpayData) return;

    let html = '';

    if (airpayData.title) {
        html += `<h3>${airpayData.title}</h3>`;
    }

    if (airpayData.device) {
        html += `<p><strong>使用機器:</strong> ${airpayData.device}</p>`;
    }

    if (airpayData.methods && airpayData.methods.length > 0) {
        html += '<div class="service-section">';
        html += '<h4><i class="fas fa-cash-register"></i> 決済手順</h4>';
        airpayData.methods.forEach(method => {
            html += '<div class="flow-notes">';
            html += `<strong>${method.name}</strong>`;
            if (method.steps) {
                html += '<ol>';
                method.steps.forEach(step => {
                    html += `<li>${step}</li>`;
                });
                html += '</ol>';
            }
            if (method.notes && method.notes.length) {
                html += '<ul>';
                method.notes.forEach(note => {
                    html += `<li>${note}</li>`;
                });
                html += '</ul>';
            }
            html += '</div>';
        });
        html += '</div>';
    }

    if (airpayData.videos && airpayData.videos.length > 0) {
        html += '<div class="service-section">';
        html += '<h4><i class="fas fa-video"></i> 公式動画</h4>';
        html += '<div class="video-grid">';
        airpayData.videos.forEach(video => {
            const videoId = video.videoId || null;
            html += '<div class="service-figure">';
            if (videoId) {
                const thumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                html += `<a class="video-thumb" href="https://www.youtube.com/watch?v=${videoId}" target="_blank" rel="noopener">`;
                html += `<div class="thumb-image" style="background-image:url('${thumb}')"></div>`;
                html += `<div class="thumb-overlay"><i class="fas fa-play-circle"></i><span>別タブで再生</span></div>`;
                html += `</a>`;
            } else {
                html += `<p><a href="${video.url}" target="_blank" rel="noopener">動画リンクを開く</a></p>`;
            }
            html += '</div>';
        });
        html += '</div>';
        html += '</div>';
    }

    if (airpayData.checklist && airpayData.checklist.length > 0) {
        html += '<div class="service-section">';
        html += '<h4><i class="fas fa-clipboard-check"></i> 動画視聴後チェックリスト</h4>';
        html += '<ul>';
        airpayData.checklist.forEach(item => {
            html += `<li>${item}</li>`;
        });
        html += '</ul>';
        html += '</div>';
    }

    if (airpayData.cautions && airpayData.cautions.length > 0) {
        html += '<div class="service-section">';
        html += '<h4><i class="fas fa-exclamation-triangle"></i> 注意事項</h4>';
        html += '<ul>';
        airpayData.cautions.forEach(item => {
            html += `<li>${item}</li>`;
        });
        html += '</ul>';
        html += '</div>';
    }

    if (airpayData.troubles && airpayData.troubles.length > 0) {
        html += '<div class="service-section">';
        html += '<h4><i class="fas fa-tools"></i> トラブル対応</h4>';
        html += '<ul>';
        airpayData.troubles.forEach(item => {
            html += `<li>${item}</li>`;
        });
        html += '</ul>';
        html += '</div>';
    }

    container.innerHTML = html;
}

// ===================================
// 設定
// ===================================

function backupData() {
    const backup = {
        menu: menuData,
        cleaning: cleaningData,
        settings: settings,
        timestamp: new Date().toISOString()
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `cafe-manual-backup-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);

    alert('バックアップが完了しました');
}

function restoreData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const backup = JSON.parse(event.target.result);

                if (backup.menu) menuData = backup.menu;
                if (backup.cleaning) cleaningData = backup.cleaning;
                if (backup.settings) settings = backup.settings;

                saveData();
                location.reload();
            } catch (error) {
                alert('バックアップファイルの読み込みに失敗しました');
            }
        };

        reader.readAsText(file);
    };

    input.click();
}

function addUpdateHistory(message) {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.UPDATE_HISTORY) || '[]');
    history.unshift({
        message,
        timestamp: new Date().toISOString()
    });

    // 最新50件まで保存
    if (history.length > 50) {
        history.splice(50);
    }

    localStorage.setItem(STORAGE_KEYS.UPDATE_HISTORY, JSON.stringify(history));
    renderUpdateHistory();
}

function renderUpdateHistory() {
    const container = document.getElementById('updateHistory');
    if (!container) return;

    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.UPDATE_HISTORY) || '[]');

    if (history.length === 0) {
        container.innerHTML = '<p>履歴がありません</p>';
        return;
    }

    let html = '<ul style="list-style: none; padding: 0;">';
    history.slice(0, 10).forEach(item => {
        const date = new Date(item.timestamp);
        html += `<li style="padding: 0.5rem 0; border-bottom: 1px solid #ddd;">`;
        html += `<small>${date.toLocaleString('ja-JP')}</small><br>`;
        html += item.message;
        html += '</li>';
    });
    html += '</ul>';

    container.innerHTML = html;
}

// ============================================
// カレンダー関連の機能（埋め込みコード版）
// ============================================

/**
 * カレンダー設定を保存
 */
function saveCalendarSettings() {
    const embedCode = document.getElementById('calendarEmbedCode').value.trim();
    const statusDiv = document.getElementById('calendarSaveStatus');

    if (!embedCode) {
        statusDiv.innerHTML = '<p style="color: #f44336;">⚠️ 埋め込みコードを入力してください</p>';
        return;
    }

    // iframeタグの基本的な検証
    if (!embedCode.includes('<iframe') || !embedCode.includes('</iframe>')) {
        statusDiv.innerHTML = '<p style="color: #f44336;">⚠️ 有効なiframe埋め込みコードを入力してください</p>';
        return;
    }

    try {
        // LocalStorageに保存
        localStorage.setItem(STORAGE_KEYS.CALENDAR_EMBED, embedCode);

        // 成功メッセージを表示
        statusDiv.innerHTML = '<p style="color: #4caf50;">✓ カレンダー設定を保存しました</p>';

        // 更新履歴に記録
        addUpdateHistory('カレンダーの設定を更新しました');

        // カレンダーを再描画
        renderCalendar();

        // 3秒後にメッセージを消す
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 3000);
    } catch (error) {
        console.error('カレンダー設定の保存に失敗:', error);
        statusDiv.innerHTML = '<p style="color: #f44336;">⚠️ 保存に失敗しました</p>';
    }
}

/**
 * カレンダー設定をクリア
 */
function clearCalendarSettings() {
    if (!confirm('カレンダー設定を削除してもよろしいですか？')) {
        return;
    }

    const statusDiv = document.getElementById('calendarSaveStatus');

    try {
        // LocalStorageから削除
        localStorage.removeItem(STORAGE_KEYS.CALENDAR_EMBED);

        // テキストエリアをクリア
        document.getElementById('calendarEmbedCode').value = '';

        // 成功メッセージを表示
        statusDiv.innerHTML = '<p style="color: #4caf50;">✓ カレンダー設定を削除しました</p>';

        // 更新履歴に記録
        addUpdateHistory('カレンダーの設定を削除しました');

        // カレンダーを再描画（空にする）
        renderCalendar();

        // 3秒後にメッセージを消す
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 3000);
    } catch (error) {
        console.error('カレンダー設定の削除に失敗:', error);
        statusDiv.innerHTML = '<p style="color: #f44336;">⚠️ 削除に失敗しました</p>';
    }
}

/**
 * カレンダー設定を読み込んでテキストエリアに表示
 */
function loadCalendarSettings() {
    const embedCode = localStorage.getItem(STORAGE_KEYS.CALENDAR_EMBED);
    const textarea = document.getElementById('calendarEmbedCode');

    if (textarea && embedCode) {
        textarea.value = embedCode;
    }
}

/**
 * カレンダーを埋め込んで表示
 */
function renderCalendar() {
    const calendarContainer = document.getElementById('cleaningCalendar');
    if (!calendarContainer) return;

    const embedCode = localStorage.getItem(STORAGE_KEYS.CALENDAR_EMBED);

    // デフォルトカレンダー（日本の祝日カレンダー + サンプルカレンダー）
    const defaultCalendarSrc = 'https://calendar.google.com/calendar/embed?height=600&wkst=1&ctz=Asia%2FTokyo&showNav=1&showTitle=0&showPrint=0&showCalendars=0&mode=MONTH&hl=ja&src=amEuamFwYW5lc2UjaG9saWRheUBncm91cC52LmNhbGVuZGFyLmdvb2dsZS5jb20&color=%230B8043';

    if (embedCode) {
        // ユーザーが設定したカレンダーがある場合
        const parser = new DOMParser();
        const doc = parser.parseFromString(embedCode, 'text/html');
        const iframe = doc.querySelector('iframe');

        if (iframe) {
            // レスポンシブ対応のためにスタイルを調整
            iframe.style.width = '100%';
            iframe.style.height = '600px';
            iframe.style.border = '0';

            calendarContainer.innerHTML = '';
            calendarContainer.appendChild(iframe);
        } else {
            calendarContainer.innerHTML = `
                <p style="text-align: center; color: #f44336; padding: 2rem;">
                    <i class="fas fa-exclamation-triangle"></i>
                    カレンダーの埋め込みコードが正しくありません。設定を確認してください。
                </p>
            `;
        }
    } else {
        // デフォルトカレンダーを表示（日本の祝日カレンダー）
        const iframe = document.createElement('iframe');
        iframe.src = defaultCalendarSrc;
        iframe.style.border = '0';
        iframe.style.width = '100%';
        iframe.style.height = '600px';
        iframe.style.frameborder = '0';
        iframe.style.scrolling = 'no';

        calendarContainer.innerHTML = '';
        calendarContainer.appendChild(iframe);
    }
}

// ===================================
// 提供方法マニュアル
// ===================================

function renderServicePage() {
    const container = document.getElementById('serviceContent');
    if (!container || !serviceData) return;

    let html = '';

    // 接客方法
    if (serviceData.customerService) {
        html += '<div class="service-section">';
        html += `<h3><i class="fas fa-handshake"></i> ${serviceData.customerService.title}</h3>`;

        if (serviceData.customerService.flow && serviceData.customerService.flow.length) {
            html += '<h4>接客フロー（基本）</h4><ol>';
            serviceData.customerService.flow.forEach(item => {
                html += `<li>${item}</li>`;
            });
            html += '</ol>';
        }

        if (serviceData.customerService.basics && serviceData.customerService.basics.length) {
            html += '<h4>接客の基本姿勢</h4><ul>';
            serviceData.customerService.basics.forEach(item => {
                html += `<li>${item}</li>`;
            });
            html += '</ul>';
        }

        const cautions = serviceData.customerService.cautions || {};
        const cautionBlocks = [
            ['接客時のNG行動', cautions.ng],
            ['衛生・身だしなみの注意', cautions.hygiene],
            ['オーダー・提供時の注意', cautions.order],
            ['クレーム・トラブル対応の注意', cautions.claim]
        ];
        cautionBlocks.forEach(([title, list]) => {
            if (list && list.length) {
                html += `<h4>${title}</h4><ul>`;
                list.forEach(item => {
                    html += `<li>${item}</li>`;
                });
                html += '</ul>';
            }
        });

        html += '</div>';
    }

    // 概要
    if (serviceData.overview) {
        html += '<div class="service-section">';
        html += `<h3><i class="fas fa-info-circle"></i> ${serviceData.overview.title}</h3>`;
        html += '<ul>';
        serviceData.overview.content.forEach(item => {
            html += `<li>${item}</li>`;
        });
        html += '</ul>';
        html += '</div>';
    }

    // 店内動線・レイアウト
    if (serviceData.layout) {
        html += '<div class="service-section">';
        html += `<h3><i class="fas fa-route"></i> ${serviceData.layout.title}</h3>`;
        if (serviceData.layout.image) {
            html += `<div class="service-figure"><img src="${serviceData.layout.image}" alt="店内動線・レイアウト" class="responsive-img"></div>`;
        }
        if (serviceData.layout.seats) {
            html += '<h4>座席構成</h4><ul>';
            serviceData.layout.seats.forEach(item => {
                html += `<li>${item}</li>`;
            });
            html += '</ul>';
        }
        if (serviceData.layout.flow) {
            html += '<h4>動線</h4><ul>';
            serviceData.layout.flow.forEach(item => {
                html += `<li>${item}</li>`;
            });
            html += '</ul>';
        }
        if (serviceData.layout.notes) {
            html += '<h4>補足</h4><ul>';
            serviceData.layout.notes.forEach(item => {
                html += `<li>${item}</li>`;
            });
            html += '</ul>';
        }
        html += '</div>';
    }

    // 営業時間
    if (serviceData.hours) {
        html += '<div class="service-section">';
        html += `<h3><i class="fas fa-clock"></i> ${serviceData.hours.title}</h3>`;
        const renderHoursTable = (block) => {
            html += `<h4>${block.label}</h4>`;
            html += '<table class="congestion-table"><thead><tr><th>曜日</th><th>時間</th><th>時間数</th></tr></thead><tbody>';
            block.rows.forEach(row => {
                html += `<tr><td>${row.day}</td><td>${row.time}</td><td>${row.hours}</td></tr>`;
            });
            html += '</tbody></table>';
            if (block.image) {
                html += `<div class="service-figure"><img src="${block.image}" alt="${block.label}" class="responsive-img"></div>`;
            }
        };
        if (serviceData.hours.normal) renderHoursTable(serviceData.hours.normal);
        if (serviceData.hours.holiday) renderHoursTable(serviceData.hours.holiday);
        if (serviceData.hours.normalImage && !serviceData.hours.normal.image) {
            html += `<div class="service-figure"><img src="${serviceData.hours.normalImage}" alt="通常営業時間" class="responsive-img"></div>`;
        }
        html += '</div>';
    }

    // 店舗運営・シフト
    if (serviceData.staffing) {
        html += '<div class="service-section">';
        html += `<h3><i class="fas fa-users-cog"></i> ${serviceData.staffing.title}</h3>`;
        if (serviceData.staffing.image) {
            html += `<div class="service-figure"><img src="${serviceData.staffing.image}" alt="店舗運営シフト" class="responsive-img"></div>`;
        }
        if (serviceData.staffing.summary) {
            html += '<ul>';
            serviceData.staffing.summary.forEach(item => {
                html += `<li>${item}</li>`;
            });
            html += '</ul>';
        }
        if (serviceData.staffing.notes) {
            html += '<h4>運用メモ</h4><ul>';
            serviceData.staffing.notes.forEach(item => {
                html += `<li>${item}</li>`;
            });
            html += '</ul>';
        }
        html += '</div>';
    }

    // 設備配置
    if (serviceData.facilities) {
        html += '<div class="service-section">';
        html += `<h3><i class="fas fa-map-marked-alt"></i> ${serviceData.facilities.title}</h3>`;
        html += '<table class="facilities-table">';
        html += '<thead><tr><th>設備</th><th>数量</th><th>設置場所</th><th>備考</th></tr></thead>';
        html += '<tbody>';
        serviceData.facilities.items.forEach(item => {
            html += '<tr>';
            html += `<td>${item.equipment}</td>`;
            html += `<td>${item.quantity}</td>`;
            html += `<td>${item.location}</td>`;
            html += `<td>${item.notes}</td>`;
            html += '</tr>';
        });
        html += '</tbody>';
        html += '</table>';
        if (serviceData.facilities.flowNotes) {
            html += '<ul class="flow-notes">';
            serviceData.facilities.flowNotes.forEach(note => {
                html += `<li>${note}</li>`;
            });
            html += '</ul>';
        }
        html += '</div>';
    }

    // 役割分担
    if (serviceData.roles) {
        html += '<div class="service-section">';
        html += `<h3><i class="fas fa-users"></i> ${serviceData.roles.title}</h3>`;
        serviceData.roles.staff.forEach(staff => {
            html += '<div class="role-card">';
            html += `<h4>${staff.position}</h4>`;
            html += '<ul>';
            staff.responsibilities.forEach(resp => {
                html += `<li>${resp}</li>`;
            });
            html += '</ul>';
            html += '</div>';
        });
        html += '</div>';
    }

    // 番号札運用
    if (serviceData.numberTag) {
        html += '<div class="service-section">';
        html += `<h3><i class="fas fa-ticket-alt"></i> ${serviceData.numberTag.title}</h3>`;
        serviceData.numberTag.flow.forEach(item => {
            html += '<div class="flow-step">';
            html += `<strong>${item.step}</strong>`;
            html += `<p>${item.description}</p>`;
            html += '</div>';
        });
        if (serviceData.numberTag.notes) {
            html += '<div class="notes">';
            html += '<strong>注意点:</strong><ul>';
            serviceData.numberTag.notes.forEach(note => {
                html += `<li>${note}</li>`;
            });
            html += '</ul></div>';
        }
        html += '</div>';
    }

    // トレー運用
    if (serviceData.tray) {
        html += '<div class="service-section">';
        html += `<h3><i class="fas fa-clipboard-list"></i> ${serviceData.tray.title}</h3>`;
        serviceData.tray.operations.forEach(op => {
            html += '<div class="operation-card">';
            html += `<h4>${op.action}</h4>`;
            html += `<p>${op.procedure}</p>`;
            html += `<p class="tips"><i class="fas fa-lightbulb"></i> ${op.tips}</p>`;
            html += '</div>';
        });
        if (serviceData.tray.expression) {
            html += `<p class="expression">${serviceData.tray.expression}</p>`;
        }
        html += '</div>';
    }

    // 返却口運用
    if (serviceData.returnCounter) {
        html += '<div class="service-section">';
        html += `<h3><i class="fas fa-undo"></i> ${serviceData.returnCounter.title}</h3>`;
        html += '<div class="subsection">';
        html += '<h4>設置</h4><ul>';
        serviceData.returnCounter.setup.forEach(item => {
            html += `<li>${item}</li>`;
        });
        html += '</ul></div>';
        html += '<div class="subsection">';
        html += '<h4>運用</h4><ul>';
        serviceData.returnCounter.operations.forEach(item => {
            html += `<li>${item}</li>`;
        });
        html += '</ul></div>';
        html += '<div class="subsection">';
        html += '<h4>混雑時</h4><ul>';
        serviceData.returnCounter.congestion.forEach(item => {
            html += `<li>${item}</li>`;
        });
        html += '</ul></div>';
        html += '</div>';
    }

    // フロー（来店〜退店）
    if (serviceData.flow) {
        html += '<div class="service-section">';
        html += `<h3><i class="fas fa-route"></i> ${serviceData.flow.title}</h3>`;
        html += '<ol class="flow-list">';
        serviceData.flow.steps.forEach(step => {
            html += `<li><strong>${step.action}</strong>: ${step.detail}</li>`;
        });
        html += '</ol>';

        // Mermaidダイアグラム
        if (serviceData.flow.mermaid) {
            html += '<div class="mermaid-container">';
            html += '<h4>フローチャート</h4>';
            html += '<pre class="mermaid">' + serviceData.flow.mermaid + '</pre>';
            html += '</div>';
        }

        if (serviceData.flow.notes) {
            html += '<div class="notes">';
            html += '<strong>注記:</strong><ul>';
            serviceData.flow.notes.forEach(note => {
                html += `<li>${note}</li>`;
            });
            html += '</ul></div>';
        }
        html += '</div>';
    }

    // 安全・衛生
    if (serviceData.safety) {
        html += '<div class="service-section">';
        html += `<h3><i class="fas fa-shield-alt"></i> ${serviceData.safety.title}</h3>`;
        serviceData.safety.items.forEach(item => {
            html += '<div class="safety-card">';
            html += `<h4>${item.category}</h4>`;
            html += '<ul>';
            item.measures.forEach(measure => {
                html += `<li>${measure}</li>`;
            });
            html += '</ul>';
            html += '</div>';
        });
        html += '</div>';
    }

    // 混雑時の運用
    if (serviceData.congestion) {
        html += '<div class="service-section">';
        html += `<h3><i class="fas fa-exclamation-triangle"></i> ${serviceData.congestion.title}</h3>`;
        html += '<table class="congestion-table">';
        html += '<thead><tr><th>状況</th><th>対応</th></tr></thead>';
        html += '<tbody>';
        serviceData.congestion.scenarios.forEach(scenario => {
            html += '<tr>';
            html += `<td>${scenario.situation}</td>`;
            html += `<td>${scenario.action}</td>`;
            html += '</tr>';
        });
        html += '</tbody>';
        html += '</table>';
        html += '</div>';
    }

    // 掲示物・サイン
    if (serviceData.signage) {
        html += '<div class="service-section">';
        html += `<h3><i class="fas fa-sign"></i> ${serviceData.signage.title}</h3>`;
        serviceData.signage.signs.forEach(sign => {
            html += '<div class="sign-card">';
            html += `<h4>${sign.location}</h4>`;
            html += `<pre class="sign-text">${sign.text}</pre>`;
            html += '</div>';
        });
        html += '</div>';
    }

    // チェックリスト
    if (serviceData.checklist) {
        html += '<div class="service-section">';
        html += `<h3><i class="fas fa-tasks"></i> ${serviceData.checklist.title}</h3>`;
        serviceData.checklist.periods.forEach(period => {
            html += '<div class="checklist-period">';
            html += `<h4>${period.period}</h4>`;
            html += '<ul class="checklist">';
            period.items.forEach(item => {
                html += `<li><input type="checkbox"> ${item}</li>`;
            });
            html += '</ul>';
            html += '</div>';
        });
        html += '</div>';
    }

    container.innerHTML = html;

    // Mermaid図を初期化（CDNが読み込まれている場合）
    if (typeof mermaid !== 'undefined') {
        mermaid.init(undefined, document.querySelectorAll('.mermaid'));
    }
}

// 接客方法ページ（独立ページ）
function renderCustomerServicePage() {
    const container = document.getElementById('customerServiceContent');
    if (!container || !serviceData || !serviceData.customerService) return;

    const cs = serviceData.customerService;
    let html = '';

    if (cs.flow && cs.flow.length) {
        html += '<div class="service-section">';
        html += '<h3><i class="fas fa-route"></i> 接客フロー（基本）</h3><ol>';
        cs.flow.forEach(item => {
            html += `<li>${item}</li>`;
        });
        html += '</ol></div>';
    }

    if (cs.basics && cs.basics.length) {
        html += '<div class="service-section">';
        html += '<h3><i class="fas fa-smile"></i> 接客の基本姿勢</h3><ul>';
        cs.basics.forEach(item => {
            html += `<li>${item}</li>`;
        });
        html += '</ul></div>';
    }

    container.innerHTML = html;
}

// 接客の注意ページ（独立ページ）
function renderCustomerCautionsPage() {
    const container = document.getElementById('customerCautionsContent');
    if (!container || !serviceData || !serviceData.customerService) return;

    const cautions = serviceData.customerService.cautions || {};
    let html = '';

    const blocks = [
        ['接客時のNG行動', cautions.ng, 'fa-ban'],
        ['衛生・身だしなみの注意', cautions.hygiene, 'fa-hand-sparkles'],
        ['オーダー・提供時の注意', cautions.order, 'fa-clipboard-check'],
        ['クレーム・トラブル対応の注意', cautions.claim, 'fa-exclamation-triangle'],
    ];

    blocks.forEach(([title, list, icon]) => {
        if (!list || !list.length) return;
        html += '<div class="service-section">';
        html += `<h3><i class="fas ${icon}"></i> ${title}</h3><ul>`;
        list.forEach(item => {
            html += `<li>${item}</li>`;
        });
        html += '</ul></div>';
    });

    container.innerHTML = html;
}

// ===================================
// 衛生マニュアル
// ===================================

function renderHygiene() {
    renderStaffHygiene();
    renderManagerHygiene();
}

function renderStaffHygiene() {
    const container = document.getElementById('staffHygieneContent');
    if (!container) return;

    const data = initialData.hygiene.staff;
    let html = '';

    // タイトルとサブタイトル
    html += `<div class="hygiene-header">`;
    html += `<h3>${data.title}</h3>`;
    html += `<p class="hygiene-subtitle">${data.subtitle}</p>`;
    html += `</div>`;

    // セクション
    data.sections.forEach(section => {
        html += `<div class="hygiene-item">`;
        html += `<h4><i class="fas fa-clipboard-check"></i> ${section.title}</h4>`;

        if (section.items) {
            html += '<ul>';
            section.items.forEach(item => {
                html += `<li>${item}</li>`;
            });
            html += '</ul>';
        }

        if (section.subsections) {
            section.subsections.forEach(subsection => {
                html += `<div class="hygiene-subsection">`;
                html += `<h5>${subsection.subtitle}</h5>`;
                html += '<ul>';
                subsection.items.forEach(item => {
                    html += `<li>${item}</li>`;
                });
                html += '</ul>';
                html += '</div>';
            });
        }

        html += '</div>';
    });

    container.innerHTML = html;
}

function renderManagerHygiene() {
    const container = document.getElementById('managerHygieneContent');
    if (!container) return;

    const data = initialData.hygiene.manager;
    let html = '';

    // タイトルとサブタイトル
    html += `<div class="hygiene-header">`;
    html += `<h3>${data.title}</h3>`;
    html += `<p class="hygiene-subtitle">${data.subtitle}</p>`;
    if (data.description) {
        html += `<p class="hygiene-description">${data.description.replace(/\n/g, '<br>')}</p>`;
    }
    html += `</div>`;

    // セクション
    data.sections.forEach(section => {
        html += `<div class="hygiene-item">`;
        html += `<h4><i class="fas fa-clipboard-check"></i> ${section.title}</h4>`;

        if (section.items) {
            html += '<ul>';
            section.items.forEach(item => {
                html += `<li>${item}</li>`;
            });
            html += '</ul>';
        }

        if (section.subsections) {
            section.subsections.forEach(subsection => {
                html += `<div class="hygiene-subsection">`;
                html += `<h5>${subsection.subtitle}</h5>`;
                html += '<ul>';
                subsection.items.forEach(item => {
                    html += `<li>${item}</li>`;
                });
                html += '</ul>';
                html += '</div>';
            });
        }

        html += '</div>';
    });

    container.innerHTML = html;
}
