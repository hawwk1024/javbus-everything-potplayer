// ==UserScript==
// @name        javbus&everything&potplayer启动本地播放
// @namespace   https://github.com/hawwk1024/javbus-everything-potplayer
// @description 在JAVBus页面显示本地播放按钮，点击后通过PotPlayer打开本地文件（需要Everything配合）。同时支持在Everything搜索结果页自动打开PotPlayer。使用HTTP接口，兼容性更好。
// @author      Hawwk
// @match       https://www.javbus.com/*
// @match       http://127.0.0.1:80/*
// @grant       GM_xmlhttpRequest
// @connect     127.0.0.1
// @version     2026.5.26
// @icon        https://www.javbus.com/favicon.ico
// ==/UserScript==

(function() {
    'use strict';

    // ==================== JAVBus 页面逻辑 ====================
    if (window.location.hostname === 'www.javbus.com') {
        let currentCode = null;
        let fileExistsCache = false;
        let isChecking = false;
        let navBtn = null;

        // 获取页面番号
        function getVideoCode() {
            const el = document.querySelector('span[style*="color:#CC0000"]');
            return el ? el.innerText.trim() : null;
        }

        // 更新按钮UI
        function updateButtonUI() {
            if (!navBtn) return;
            const link = navBtn.querySelector('a');
            if (!link) return;

            if (fileExistsCache) {
                link.innerHTML = '🎬 本地播放';
                link.style.color = '#27ae60';
                navBtn.title = "点击播放";
            } else {
                link.innerHTML = '📁 无本地文件';
                link.style.color = '#e67e22';
                navBtn.title = "Everything中未找到匹配文件";
            }
        }

        // 后台检测文件是否存在
        function checkFileInBackground(code) {
            if (!code || isChecking) return;

            isChecking = true;
            const searchQuery = `${code} .mp4`;
            const apiUrl = `http://127.0.0.1:80/?json=1&path=1&search=${encodeURIComponent(searchQuery)}`;

            GM_xmlhttpRequest({
                method: 'GET',
                url: apiUrl,
                timeout: 500,
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

        // 刷新番号状态
        function refreshStatus() {
            const code = getVideoCode();
            if (!code) {
                if (navBtn) navBtn.style.display = 'none';
                return;
            }
            if (navBtn) navBtn.style.display = '';

            if (currentCode !== code) {
                currentCode = code;
                if (navBtn) {
                    const link = navBtn.querySelector('a');
                    if (link) {
                        link.innerHTML = '⏳ 检测中...';
                        link.style.color = '#888';
                    }
                }
                checkFileInBackground(code);
            }
        }

        // 在导航栏插入按钮（放在三横菜单的右边）
        function insertNavButton() {
            // 检查是否已存在
            if (document.getElementById('javbus-everything-btn')) return;

            // 找到三横菜单所在的 li
            const hamburgerLi = document.querySelector('li.dropdown > a > span.glyphicon-menu-hamburger');
            if (!hamburgerLi) {
                setTimeout(insertNavButton, 500);
                return;
            }

            const hamburgerParentLi = hamburgerLi.closest('li.dropdown');
            if (!hamburgerParentLi) {
                setTimeout(insertNavButton, 500);
                return;
            }

            // 找到三横菜单所在的 ul
            const parentUl = hamburgerParentLi.parentElement;
            if (!parentUl) {
                setTimeout(insertNavButton, 500);
                return;
            }

            // 创建按钮容器
            const li = document.createElement('li');
            li.id = 'javbus-everything-btn';
            li.className = 'dropdown';
            li.style.cursor = 'pointer';
            li.style.marginLeft = '10px';

            const a = document.createElement('a');
            a.href = '#';
            a.innerHTML = '🎬 检测中...';
            a.style.color = '#27ae60';
            a.style.textDecoration = 'none';
            a.style.fontSize = '14px';
            li.appendChild(a);

            // 插入到三横菜单li的后面
            if (hamburgerParentLi.nextSibling) {
                parentUl.insertBefore(li, hamburgerParentLi.nextSibling);
            } else {
                parentUl.appendChild(li);
            }

            // 点击事件
            li.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const code = getVideoCode();
                if (!code) {
                    alert("未找到番号！");
                    return;
                }

                if (!fileExistsCache) {
                    alert(`本地未找到 ${code} 的 .mp4 文件\n请确认 Everything 已运行且索引包含视频文件夹。`);
                    return;
                }

                window.open(`http://127.0.0.1:80/?search=${encodeURIComponent(code + ' .mp4')}`, "_blank");
            });

            navBtn = li;
            refreshStatus();
        }

        // 监听页面变化
        function initJavBus() {
            // 等待导航栏加载完成
            const waitForNav = setInterval(() => {
                if (document.querySelector('li.dropdown > a > span.glyphicon-menu-hamburger')) {
                    clearInterval(waitForNav);
                    insertNavButton();
                }
            }, 100);

            // 监听DOM变化，番号改变时重新检测
            const observer = new MutationObserver(() => {
                refreshStatus();
                // 确保按钮存在
                if (!document.getElementById('javbus-everything-btn')) {
                    insertNavButton();
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