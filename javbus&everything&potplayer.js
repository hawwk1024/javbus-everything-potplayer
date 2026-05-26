// ==UserScript==
// @name         javbus&everything&potplayer启动本地播放
// @match        https://www.javbus.com/*
// @match        http://127.0.0.1:80/*
// @grant        GM_xmlhttpRequest
// @connect      127.0.0.1
// @version      2026.5.26
// ==/UserScript==

(function() {
    'use strict';

    // ==================== JAVBus 页面逻辑 ====================
    if (window.location.hostname === 'www.javbus.com') {
        const CONFIG = {
            width: 120,
            height: 44,
            right: 20,
            bottom: 80,
            backgroundColor: '#27ae60',
            missingColor: '#e67e22',
            color: 'white',
            fontSize: 14,
            borderRadius: 6,
            opacity: 0.95
        };

        let floatingBtn = null;
        let currentCode = null;
        let fileExistsCache = false;      // 缓存当前番号是否有文件
        let isChecking = false;

        // 获取页面番号
        function getVideoCode() {
            const el = document.querySelector('span[style*="color:#CC0000"]');
            return el ? el.innerText.trim() : null;
        }

        // 更新按钮UI
        function updateButtonUI() {
            if (!floatingBtn) return;
            if (fileExistsCache) {
                floatingBtn.innerText = "本地播放";
                floatingBtn.style.backgroundColor = CONFIG.backgroundColor;
                floatingBtn.title = "点击播放";
            } else {
                floatingBtn.innerText = "无本地文件";
                floatingBtn.style.backgroundColor = CONFIG.missingColor;
                floatingBtn.title = "Everything中未找到匹配文件";
            }
        }

        // 后台检测文件是否存在（异步，不阻塞UI）
        function checkFileInBackground(code) {
            if (!code || isChecking) return;

            isChecking = true;
            const searchQuery = `${code} .mp4`;
            const apiUrl = `http://127.0.0.1:80/?json=1&path=1&search=${encodeURIComponent(searchQuery)}`;

            GM_xmlhttpRequest({
                method: 'GET',
                url: apiUrl,
                timeout: 1500,  // 超时1.5秒
                onload: function(resp) {
                    try {
                        const data = JSON.parse(resp.responseText);
                        fileExistsCache = data.results && data.results.length > 0;
                    } catch(e) {
                        fileExistsCache = false;
                    }
                    updateButtonUI();
                    isChecking = false;
                },
                onerror: function() {
                    fileExistsCache = false;
                    updateButtonUI();
                    isChecking = false;
                },
                ontimeout: function() {
                    fileExistsCache = false;
                    updateButtonUI();
                    isChecking = false;
                }
            });
        }

        // 刷新番号状态（当番号变化时调用）
        function refreshStatus() {
            const code = getVideoCode();
            if (!code) {
                if (floatingBtn) floatingBtn.style.display = 'none';
                return;
            }
            if (floatingBtn) floatingBtn.style.display = 'flex';

            if (currentCode !== code) {
                currentCode = code;
                // 先显示"检测中..."（可选，为了更好的反馈）
                if (floatingBtn) {
                    floatingBtn.innerText = "检测中...";
                    floatingBtn.style.backgroundColor = CONFIG.missingColor;
                }
                // 立即开始后台检测
                checkFileInBackground(code);
            }
        }

        // 创建浮动按钮
        function createFloatingButton() {
            if (document.getElementById('my-play-btn')) return;

            const btn = document.createElement("button");
            btn.id = 'my-play-btn';
            btn.innerText = "检测中...";

            let savedRight = localStorage.getItem('javbus_btn_right');
            let savedBottom = localStorage.getItem('javbus_btn_bottom');
            let currentRight = savedRight !== null ? parseInt(savedRight) : CONFIG.right;
            let currentBottom = savedBottom !== null ? parseInt(savedBottom) : CONFIG.bottom;

            btn.style.cssText = `
                position: fixed;
                z-index: 999999;
                width: ${CONFIG.width}px;
                height: ${CONFIG.height}px;
                right: ${currentRight}px;
                bottom: ${currentBottom}px;
                background: ${CONFIG.backgroundColor};
                color: ${CONFIG.color};
                border: none;
                border-radius: ${CONFIG.borderRadius}px;
                cursor: grab;
                font-weight: bold;
                font-size: ${CONFIG.fontSize}px;
                text-align: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                opacity: ${CONFIG.opacity};
                transition: opacity 0.2s, background-color 0.2s;
                font-family: Arial, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                user-select: none;
            `;

            // 拖动逻辑
            let isDragging = false;
            let dragStartX = 0, dragStartY = 0;
            let startRight = 0, startBottom = 0;
            let hasMoved = false;

            const onDragStart = (e) => {
                e.preventDefault();
                isDragging = true;
                hasMoved = false;
                btn.style.cursor = 'grabbing';
                btn.style.transition = 'none';
                const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
                const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);
                dragStartX = clientX;
                dragStartY = clientY;
                const rect = btn.getBoundingClientRect();
                startRight = window.innerWidth - rect.right;
                startBottom = window.innerHeight - rect.bottom;
            };

            const onDragMove = (e) => {
                if (!isDragging) return;
                e.preventDefault();
                const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
                const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);
                const deltaX = clientX - dragStartX;
                const deltaY = clientY - dragStartY;
                if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) hasMoved = true;
                let newRight = startRight - deltaX;
                let newBottom = startBottom - deltaY;
                newRight = Math.max(10, Math.min(window.innerWidth - CONFIG.width - 10, newRight));
                newBottom = Math.max(10, Math.min(window.innerHeight - CONFIG.height - 10, newBottom));
                btn.style.right = newRight + 'px';
                btn.style.bottom = newBottom + 'px';
            };

            const onDragEnd = (e) => {
                if (!isDragging) return;
                isDragging = false;
                btn.style.cursor = 'grab';
                btn.style.transition = '';
                if (hasMoved) {
                    const currentRight = parseInt(btn.style.right);
                    const currentBottom = parseInt(btn.style.bottom);
                    localStorage.setItem('javbus_btn_right', currentRight);
                    localStorage.setItem('javbus_btn_bottom', currentBottom);
                    e.stopPropagation();
                }
            };

            btn.addEventListener('mousedown', onDragStart);
            window.addEventListener('mousemove', onDragMove);
            window.addEventListener('mouseup', onDragEnd);
            btn.addEventListener('touchstart', onDragStart, { passive: false });
            window.addEventListener('touchmove', onDragMove, { passive: false });
            window.addEventListener('touchend', onDragEnd);

            // 点击事件 - 直接使用缓存，无延迟
            btn.addEventListener('click', (e) => {
                if (hasMoved) {
                    hasMoved = false;
                    return;
                }
                const code = getVideoCode();
                if (!code) {
                    alert("未找到番号！");
                    return;
                }

                if (!fileExistsCache) {
                    alert(`本地未找到 ${code} 的 .mp4 文件\n请确认 Everything 已运行且索引包含视频文件夹。`);
                    return;
                }

                // 有文件，立即打开 Everything 页面
                window.open(`http://127.0.0.1:80/?search=${encodeURIComponent(code + ' .mp4')}`, "_blank");
            });

            document.body.appendChild(btn);
            floatingBtn = btn;

            // 立即开始检测
            refreshStatus();
        }

        // 监听页面变化，番号改变时自动重新检测
        function initJavBus() {
            createFloatingButton();

            // 监听DOM变化，检测番号区域是否改变
            const observer = new MutationObserver(() => {
                // 确保按钮存在
                if (!document.getElementById('my-play-btn')) {
                    createFloatingButton();
                } else {
                    refreshStatus();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });

            // SPA路由变化检测
            let lastUrl = location.href;
            setInterval(() => {
                if (lastUrl !== location.href) {
                    lastUrl = location.href;
                    setTimeout(refreshStatus, 200);
                }
            }, 500);
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initJavBus);
        } else {
            initJavBus();
        }
    }

    // ==================== Everything 页面逻辑 ====================
    if (window.location.hostname === '127.0.0.1') {
        if (!window.location.search.includes('search=')) return;

        let triggered = false;

        const autoClickAndClose = () => {
            if (triggered) return false;

            const linkElement = document.evaluate('//a[contains(text(),".mp4")]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (!linkElement) {
                const codeMatch = window.location.search.match(/search=([^&]+)/);
                const searchCode = codeMatch ? decodeURIComponent(codeMatch[1]) : '';
                if (searchCode) {
                    const toast = document.createElement('div');
                    toast.textContent = `未找到 ${searchCode} 的本地文件`;
                    toast.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); background:#e67e22; color:white; padding:8px 16px; border-radius:8px; z-index:10000; font-size:14px; box-shadow:0 2px 8px rgba(0,0,0,0.2);';
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 2000);
                }
                return false;
            }

            triggered = true;
            const videoUrl = linkElement.getAttribute('href');
            const potplayerUrl = `potplayer://http://127.0.0.1${videoUrl}`;
            window.location.href = potplayerUrl;

            setTimeout(() => {
                window.addEventListener('blur', () => {
                    setTimeout(() => window.close(), 300);
                });
            }, 500);
            return true;
        };

        window.addEventListener('load', () => {
            if (!autoClickAndClose()) {
                const observer = new MutationObserver(() => {
                    if (autoClickAndClose()) observer.disconnect();
                });
                observer.observe(document.body, { childList: true, subtree: true });
                setTimeout(() => observer.disconnect(), 5000);
            }
        });
    }
})();