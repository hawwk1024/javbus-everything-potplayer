// ==UserScript==
// @name        JavBus Local Helper
// @namespace   https://github.com/hawwk1024/javbus-everything-potplayer
// @description 在JAVBus页面检测本地视频文件，一键通过PotPlayer播放（via Everything）
// @author      Hawwk
// @match       https://www.javbus.com/*
// @match       http://127.0.0.1:80/*
// @match       http://localhost:80/*
// @grant       GM_xmlhttpRequest
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_listValues
// @grant       GM_deleteValue
// @grant       GM_registerMenuCommand
// @connect     127.0.0.1
// @connect     localhost
// @version     2026.06.08
// @license     MIT
// @icon        https://hawwk.top:8020/fucon.ico
// ==/UserScript==

(function() {
    'use strict';

    // ==================== JAVBus 页面逻辑 ====================
    if (window.location.hostname === 'www.javbus.com') {
        let currentCode = null;
        let fileExistsCache = false;
        let isChecking = false;
        let navBtn = null;

        // 缓存键前缀
        const CACHE_PREFIX = 'last_open_';
        const FILE_CACHE_PREFIX = 'file_cache_';

        // 格式化时间戳为 年-月-日 时:分:秒
        function formatTime(ts) {
            const d = new Date(ts);
            const pad = n => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        }

        // 获取缓存的上次打开时间
        function getLastOpenTime(code) {
            const ts = GM_getValue(CACHE_PREFIX + code, 0);
            return ts ? formatTime(ts) : null;
        }

        // 记录本次打开时间到缓存
        function recordOpenTime(code) {
            GM_setValue(CACHE_PREFIX + code, Date.now());
        }

        // 读取文件缓存
        function loadFileCache(code) {
            try {
                return JSON.parse(GM_getValue(FILE_CACHE_PREFIX + code, 'null'));
            } catch(e) {
                return null;
            }
        }

        // 保存文件缓存
        function saveFileCache(code, found, path = '') {
            GM_setValue(FILE_CACHE_PREFIX + code, JSON.stringify({
                found: found,
                path: path,
                timestamp: Date.now()
            }));
        }

        // 删除文件缓存
        function deleteFileCache(code) {
            GM_deleteValue(FILE_CACHE_PREFIX + code);
        }

        // 清空所有播放时间缓存
        function clearPlayCache() {
            const keys = GM_listValues();
            keys.forEach(k => {
                if (k.startsWith(CACHE_PREFIX)) {
                    GM_deleteValue(k);
                }
            });
        }

        // 清空所有文件检测缓存
        function clearFileCache() {
            const keys = GM_listValues();
            keys.forEach(k => {
                if (k.startsWith(FILE_CACHE_PREFIX)) {
                    GM_deleteValue(k);
                }
            });
        }

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
                const lastTime = currentCode ? getLastOpenTime(currentCode) : null;
                navBtn.title = lastTime
                    ? `上次打开：${lastTime}\n点击播放`
                    : "点击播放";
            } else {
                link.innerHTML = '📁 无本地文件';
                link.style.color = '#e67e22';
                navBtn.title = "Everything中未找到匹配文件";
            }
        }

        // 后台检测文件是否存在（完整检测+写入缓存）
        function checkFileInBackground(code) {
            if (!code || isChecking) return;

            isChecking = true;
            const searchQuery = `${code} ext:mp4;mkv;avi;mov;wmv;flv;webm;m4v`;
            const apiUrl = `http://localhost:80/?json=1&path=1&search=${encodeURIComponent(searchQuery)}`;

            console.log(`[JAVBus] 检测文件: ${apiUrl}`);
            GM_xmlhttpRequest({
                method: 'GET',
                url: apiUrl,
                timeout: 1500,
                onload: function(resp) {
                    try {
                        const data = JSON.parse(resp.responseText);
                        fileExistsCache = data.results && data.results.length > 0;
                        const dir = data.results[0].path || '';
                        const file = data.results[0].name || '';
                        const fullPath = fileExistsCache ? (dir && !dir.endsWith(file) ? dir.replace(/\\+$/, '') + '\\' + file : dir || file) : '';
                        saveFileCache(code, fileExistsCache, fullPath);
                        console.log(`[JAVBus] API响应:`, data);
                    } catch(e) {
                        console.warn(`[JAVBus] 解析API响应失败:`, e);
                        fileExistsCache = false;
                        saveFileCache(code, false);
                    }
                    updateButtonUI();
                    isChecking = false;
                },
                onerror: function(err) {
                    console.warn(`[JAVBus] API请求失败:`, err);
                    fileExistsCache = false;
                    saveFileCache(code, false);
                    updateButtonUI();
                    isChecking = false;
                },
                ontimeout: function() {
                    console.warn(`[JAVBus] API请求超时`);
                    fileExistsCache = false;
                    updateButtonUI();
                    isChecking = false;
                }
            });
        }

        // 快速验证缓存是否仍然有效
        function validateFileCache(code) {
            if (!code || isChecking) return;

            isChecking = true;
            const searchQuery = `${code} ext:mp4;mkv;avi;mov;wmv;flv;webm;m4v`;
            const apiUrl = `http://localhost:80/?json=1&path=1&search=${encodeURIComponent(searchQuery)}`;

            console.log(`[JAVBus] 验证缓存: ${apiUrl}`);
            GM_xmlhttpRequest({
                method: 'GET',
                url: apiUrl,
                timeout: 1500,
                onload: function(resp) {
                    try {
                        const data = JSON.parse(resp.responseText);
                        const found = data.results && data.results.length > 0;
                        console.log(`[JAVBus] 缓存验证结果:`, found);
                        if (found) {
                            // 缓存仍然有效，更新路径和时间戳
                            fileExistsCache = true;
                            const dir = data.results[0].path || '';
                            const file = data.results[0].name || '';
                            const fullPath = dir && !dir.endsWith(file) ? (dir.replace(/\\+$/, '') + '\\' + file) : (dir || file);
                            saveFileCache(code, true, fullPath);
                        } else {
                            // 文件已不存在，清除缓存
                            fileExistsCache = false;
                            deleteFileCache(code);
                        }
                    } catch(e) {
                        console.warn(`[JAVBus] 缓存验证API失败，信任缓存:`, e);
                        // API出错时信任缓存，保持绿色
                        fileExistsCache = true;
                    }
                    updateButtonUI();
                    isChecking = false;
                },
                onerror: function() {
                    console.warn(`[JAVBus] 缓存验证请求失败，信任缓存`);
                    fileExistsCache = true;
                    updateButtonUI();
                    isChecking = false;
                },
                ontimeout: function() {
                    console.warn(`[JAVBus] 缓存验证超时，信任缓存`);
                    fileExistsCache = true;
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

                // 先检查文件缓存
                const cached = loadFileCache(code);
                if (cached) {
                    if (cached.found) {
                        // 缓存记录有文件，做快速验证确认文件是否还在
                        validateFileCache(code);
                    } else {
                        // 缓存记录无文件，跳过 API 直接显示
                        fileExistsCache = false;
                        updateButtonUI();
                    }
                } else {
                    // 无缓存，完整检测
                    checkFileInBackground(code);
                }
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
                    alert(`本地未找到 ${code} 的视频文件\n请确认 Everything 已运行且索引包含视频文件夹。`);
                    return;
                }

                recordOpenTime(code);

                // 优先用缓存路径
                const cached = loadFileCache(code);
                if (cached && cached.path && /[\\/]/.test(cached.path)) {
                    const protocol = GM_getValue('player_protocol', 'potplayer://');
                    const href = cached.path.startsWith('/') ? cached.path : '/' + cached.path.replace(/\\/g, '/');
                    window.location.href = protocol + 'http://localhost' + href;
                    return;
                }

                // 无缓存路径，从 HTML 获取
                const sq = `${code} ext:mp4;mkv;avi;mov;wmv;flv;webm;m4v`;
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: `http://localhost:80/?search=${encodeURIComponent(sq)}`,
                    timeout: 3000,
                    onload: function(resp) {
                        const m = resp.responseText.match(/<a\s[^>]*href="(\/[^"]+\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v))"/i);
                        if (m) {
                            saveFileCache(code, true, m[1]);
                            const protocol = GM_getValue('player_protocol', 'potplayer://');
                            window.location.href = protocol + 'http://localhost' + m[1];
                        }
                    }
                });
            });

            navBtn = li;
            refreshStatus();
        }

        // 监听页面变化
        function initJavBus() {
            // 注册油猴菜单：清空播放记录缓存
            GM_registerMenuCommand('🗑️ 清空播放记录缓存', () => {
                clearPlayCache();
                alert('已清空所有番号的播放时间记录');
            });

            // 注册油猴菜单：清空文件检测缓存（下次将重新检测）
            GM_registerMenuCommand('🔄 清空文件检测缓存', () => {
                clearFileCache();
                alert('已清空文件检测缓存，下次刷新页面将重新检测');
            });

            // 调试：开关模式
            const toggleDebug = () => {
                const on = !GM_getValue('debug_mode', false);
                GM_setValue('debug_mode', on);
                if (on) {
                    const keys = GM_listValues().filter(k => k.startsWith(FILE_CACHE_PREFIX));
                    console.log(`=== 文件索引缓存 (${keys.length} 条) ===`);
                    keys.sort().forEach(k => {
                        const code = k.replace(FILE_CACHE_PREFIX, '');
                        const data = JSON.parse(GM_getValue(k, '{}'));
                        console.log(`${code} | ${data.found ? '✓' : '✗'} | ${data.path || '-'}`);
                    });
                }
                alert(`调试模式: ${on ? '开 (已打印索引到控制台)' : '关'}`);
            };
            GM_registerMenuCommand('🐛 调试模式', toggleDebug);

            // 注册油猴菜单：选择播放器
            GM_registerMenuCommand('🎬 选择播放器', () => {
                const current = GM_getValue('player_protocol', 'potplayer://');
                const idx = [
                    { name: 'PotPlayer', proto: 'potplayer://' },
                    { name: 'VLC', proto: 'vlc://' },
                    { name: 'MPC-HC', proto: 'mpc-hc://' },
                    { name: '系统默认播放器', proto: '' }
                ].findIndex(p => p.proto === current);
                const choice = prompt(
                    '选择播放器（输入数字）:\n' +
                    '1. PotPlayer\n' +
                    '2. VLC\n' +
                    '3. MPC-HC\n' +
                    '4. 系统默认播放器',
                    (idx >= 0 ? idx + 1 : 1).toString()
                );
                const map = { '1': 'potplayer://', '2': 'vlc://', '3': 'mpc-hc://', '4': '' };
                if (map[choice] !== undefined) {
                    GM_setValue('player_protocol', map[choice]);
                    const name = ({ 'potplayer://': 'PotPlayer', 'vlc://': 'VLC', 'mpc-hc://': 'MPC-HC', '': '系统默认播放器' })[map[choice]];
                    alert(`已选择: ${name}`);
                }
            });

            // 注册油猴菜单：从 Everything 导入文件索引
            GM_registerMenuCommand('📥 从Everything导入文件索引', () => {
                const lastDir = GM_getValue('import_last_dir', '');
                const dir = prompt('输入要索引的目录路径（留空则搜索全部）:\n例如: D:\\JAV 或 D:\\JAV;E:\\Videos', lastDir);
                if (dir === null) return;
                const pathFilter = dir.trim();
                GM_setValue('import_last_dir', pathFilter);
                const desc = pathFilter ? `"${pathFilter}"` : '全部视频文件';
                if (!confirm(`将从 Everything 搜索 ${desc} 并导入番号索引，\n可能需要几秒到几分钟，继续？`)) return;
                importEverythingIndex(0, 100, new Set(), pathFilter);
            });

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
                    setTimeout(() => {
                        refreshStatus();
                        initListPage();
                    }, 200);
                }
            }, 500);
        }

        // ==================== 列表页逻辑 ====================
        let listPageActive = false;
        let listCheckingSet = new Set(); // 防止重复检测
        let listTotalItems = 0;
        let listResolvedItems = 0;
        let listFoundItems = 0;

        function initListPage() {
            // 仅在星页运行（/star/*），不在首页/搜索页运行
            if (!window.location.pathname.startsWith('/star/')) return;
            const waterfall = document.getElementById('waterfall');
            if (!waterfall && !document.querySelector('.item.masonry-brick')) return;
            if (document.querySelector('span[style*="color:#CC0000"]')) return;

            listPageActive = true;
            processListItems();

            // 监听新项目加载（翻页/筛选等）
            if (waterfall) {
                const listObserver = new MutationObserver(() => {
                    processListItems();
                });
                listObserver.observe(waterfall, { childList: true, subtree: true });
            }
        }

        function showListProgress() {
            const p = document.querySelector('div.alert.alert-success.alert-common > p');
            if (!p) return;

            let span = document.getElementById('javbus-list-progress');
            if (!span) {
                span = document.createElement('span');
                span.id = 'javbus-list-progress';
                span.style.cssText = 'margin-left:16px;font-size:13px;';
                span.innerHTML = '🔍 检测中 <span id="javbus-list-progress-count"></span>';
                p.appendChild(span);
            }

            const remain = listTotalItems - listResolvedItems;
            if (remain <= 0) {
                span.style.opacity = '0';
                span.style.transition = 'opacity .3s';
                setTimeout(() => span.remove(), 400);
                return;
            }
            span.style.opacity = '1';
            const countEl = document.getElementById('javbus-list-progress-count');
            if (countEl) {
                countEl.textContent = `${listResolvedItems}/${listTotalItems}  🟢${listFoundItems} 🟠${listResolvedItems - listFoundItems}`;
            }
        }

        function processListItems() {
            const items = document.querySelectorAll('.item.masonry-brick:not([data-javbus-list-processed])');
            if (items.length > 0) {
                listTotalItems += items.length;
                showListProgress();
            }
            items.forEach(item => {
                item.setAttribute('data-javbus-list-processed', 'true');

                // 提取番号：.photo-info span 下的第一个 <date>
                const codeDate = item.querySelector('.photo-info span > date');
                if (!codeDate) return;
                const code = codeDate.innerText.trim();
                if (!code) return;

                // 验证番号格式（如 MISM-401）
                if (!/^[A-Za-z0-9]+-[A-Za-z0-9]+$/.test(code)) return;

                // 检查是否已添加指示器
                if (codeDate.dataset.javbusChecked) return;

                // 异步检测文件
                checkListItemFile(code, codeDate);
            });
        }

        function checkListItemFile(code, codeDate) {
            if (listCheckingSet.has(code)) return;
            listCheckingSet.add(code);
            codeDate.dataset.javbusChecked = 'true';

            function resolveItem(found) {
                listResolvedItems++;
                if (found) listFoundItems++;
                showListProgress();
            }

            // 先检查缓存
            const cached = loadFileCache(code);
            if (cached) {
                if (cached.found) {
                    codeDate.style.color = '#27ae60';
                    codeDate.style.cursor = 'pointer';
                    codeDate.title = '点击播放';
                } else {
                    codeDate.style.color = '#e67e22';
                    codeDate.title = '无本地文件';
                }
                resolveItem(!!cached.found);
                return;
            }

            // 无缓存，完整检测
            const searchQuery = `${code} ext:mp4;mkv;avi;mov;wmv;flv;webm;m4v`;
            const apiUrl = `http://localhost:80/?json=1&path=1&search=${encodeURIComponent(searchQuery)}`;

            GM_xmlhttpRequest({
                method: 'GET',
                url: apiUrl,
                timeout: 1500,
                onload: function(resp) {
                    let bestPath = '';
                    try {
                        const data = JSON.parse(resp.responseText);
                        if (data.results && data.results.length > 0) {
                            found = true;
                            const dir = data.results[0].path || '';
                            const file = data.results[0].name || '';
                            bestPath = dir && !dir.endsWith(file) ? (dir.replace(/\\+$/, '') + '\\' + file) : (dir || file);
                        }
                        saveFileCache(code, found, bestPath);
                    } catch(e) {
                        // 解析失败视为未找到
                    }
                    codeDate.style.color = found ? '#27ae60' : '#e67e22';
                    if (found) { codeDate.style.cursor = 'pointer'; codeDate.title = '点击播放'; }
                    else codeDate.title = '无本地文件';
                    resolveItem(found);
                },
                onerror: function() {
                    codeDate.style.color = '#e67e22';
                    codeDate.title = '无本地文件';
                    resolveItem(false);
                },
                ontimeout: function() {
                    codeDate.style.color = '#e67e22';
                    codeDate.title = '无本地文件';
                    resolveItem(false);
                }
            });
        }

        // 从 Everything 批量导入文件索引到缓存
        function importEverythingIndex(offset = 0, count = 100, importedCodes = new Set(), pathFilter = '') {
            let searchQuery = 'ext:mp4;mkv;avi;mov;wmv;flv;webm;m4v';
            if (pathFilter) {
                // 支持分号分隔多路径，转为 Everything OR 语法
                const paths = pathFilter.split(';').map(p => p.trim()).filter(Boolean);
                if (paths.length === 1) {
                    searchQuery = `path:"${paths[0]}" ` + searchQuery;
                } else {
                    searchQuery = paths.map(p => `path:"${p}"`).join('|') + ' ' + searchQuery;
                }
            }
            const apiUrl = `http://localhost:80/?json=1&path=1&search=${encodeURIComponent(searchQuery)}&offset=${offset}&count=${count}`;

            // 首次调用时创建进度条
            if (offset === 0) {
                const p = document.querySelector('div.alert.alert-success.alert-common > p');
                if (p && !document.getElementById('javbus-import-progress')) {
                    const span = document.createElement('span');
                    span.id = 'javbus-import-progress';
                    span.style.cssText = 'margin-left:16px;font-size:13px;';
                    span.innerHTML = '📥 <span id="javbus-progress-text">准备导入...</span>';
                    p.appendChild(span);
                }
            }

            console.log(`[JAVBus] 导入索引进度: offset=${offset}, 已导入 ${importedCodes.size} 个`);

            GM_xmlhttpRequest({
                method: 'GET',
                url: apiUrl,
                timeout: 15000,
                onload: function(resp) {
                    try {
                        const data = JSON.parse(resp.responseText);
                        if (data.results) {
                            data.results.forEach(r => {
                                const name = r.name || '';
                                const match = name.match(/[A-Z]{2,6}-\d{1,5}/i);
                                if (match) {
                                    const code = match[0].toUpperCase();
                                    const dir = r.path || '';
                                    const file = r.name || '';
                                    const fullPath = dir && !dir.endsWith(file) ? (dir.replace(/\\+$/, '') + '\\' + file) : (dir || file);
                                    importedCodes.add(code);
                                    saveFileCache(code, true, fullPath);
                                }
                            });
                        }

                        const total = data.totalResults || 0;
                        const fetched = offset + (data.results ? data.results.length : 0);
                        console.log(`[JAVBus] 导入: ${fetched}/${total}, 已识别 ${importedCodes.size} 个番号`);

                        // 更新进度文字
                        const text = document.getElementById('javbus-progress-text');
                        if (text && total > 0) {
                            const pct = Math.round((fetched / total) * 100);
                            text.textContent = `导入中 ${pct}% · ${fetched}/${total} · 已识别 ${importedCodes.size} 个`;
                        }

                        if (fetched < total) {
                            importEverythingIndex(fetched, count, importedCodes, pathFilter);
                        } else {
                            finishImport(importedCodes.size);
                        }
                    } catch(e) {
                        finishImport(importedCodes.size, '导入解析失败：' + e.message);
                    }
                },
                onerror: function() {
                    finishImport(importedCodes.size, '无法连接 Everything，请确认 HTTP 服务已启动');
                },
                ontimeout: function() {
                    const msg = importedCodes.size > 0
                        ? `导入超时，已部分索引 ${importedCodes.size} 个番号`
                        : '导入超时，Everything 响应过慢';
                    finishImport(importedCodes.size, msg);
                }
            });
        }

        function finishImport(totalCodes, errorMsg) {
            const span = document.getElementById('javbus-import-progress');
            const text = document.getElementById('javbus-progress-text');
            if (text) {
                text.textContent = errorMsg || `✅ 完成！共索引 ${totalCodes} 个番号`;
            }
            if (span) setTimeout(() => span.remove(), 3000);
        }

        // 点击绿色番号 → 隐藏 iframe 调起播放器，页面不跳转
        document.addEventListener('click', function(e) {
            const date = e.target.closest('.photo-info span > date');
            if (!date) return;
            if (date.style.color !== 'rgb(39, 174, 96)') return;

            e.preventDefault();
            e.stopPropagation();

            const code = date.innerText.trim();
            const playViaPath = (filePath) => {
                const protocol = GM_getValue('player_protocol', 'potplayer://');
                const href = filePath.startsWith('/') ? filePath : '/' + filePath.replace(/\\/g, '/');
                window.location.href = protocol + 'http://localhost' + href;
                recordOpenTime(code);
            };

            // 优先用缓存路径（需含目录分隔符才视为有效）
            const cached = loadFileCache(code);
            if (cached && cached.path && /[\\/]/.test(cached.path)) {
                playViaPath(cached.path);
                return;
            }

            // 无缓存路径，从 Everything 搜索结果页解析真实路径
            const searchQuery = `${code} ext:mp4;mkv;avi;mov;wmv;flv;webm;m4v`;
            GM_xmlhttpRequest({
                method: 'GET',
                url: `http://localhost:80/?search=${encodeURIComponent(searchQuery)}`,
                timeout: 3000,
                onload: function(resp) {
                    // 从 HTML 中提取第一个视频链接的 href（与 Everything 页面逻辑一致）
                    const match = resp.responseText.match(/<a\s[^>]*href="(\/[^"]+\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v))"/i);
                    if (match) {
                        const href = match[1];
                        saveFileCache(code, true, href);
                        playViaPath(href);
                    }
                }
            });
        }, true);

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                initJavBus();
                initListPage();
            });
        } else {
            initJavBus();
            initListPage();
        }
    }

    // ==================== Everything 页面逻辑 ====================
    if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
        if (!window.location.search.includes('search=')) return;

        let triggered = false;

        // 视频文件扩展名列表
        const videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];

        // 从 HTML 页面解析所有视频文件条目（获取正确的 HTTP href 和文件大小）
        const getVideoEntries = () => {
            const entries = [];
            const links = document.querySelectorAll('a');
            links.forEach(link => {
                const href = link.getAttribute('href');
                const name = link.textContent.trim();
                if (!href || !name) return;
                if (!videoExts.some(ext => name.toLowerCase().endsWith(ext))) return;

                // 从所在行中查找文件大小
                let size = 0;
                const row = link.closest('tr');
                if (row) {
                    const cells = row.querySelectorAll('td');
                    // 尝试第3列（col3 或第3个 td）
                    const sizeCell = row.querySelector('.col3') || cells[2];
                    if (sizeCell) {
                        const sizeText = sizeCell.textContent.trim();
                        const match = sizeText.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i);
                        if (match) {
                            const num = parseFloat(match[1]);
                            const unit = (match[2] || 'B').toUpperCase();
                            const units = { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 };
                            size = Math.round(num * (units[unit] || 1));
                        }
                    }
                }

                entries.push({ name, href, size });
            });
            console.log(`[Everything] 解析到 ${entries.length} 个视频文件:`, entries);
            return entries;
        };

        const autoClickAndClose = () => {
            if (triggered) return false;
            triggered = true;

            const entries = getVideoEntries();
            if (entries.length === 0) {
                const codeMatch = window.location.search.match(/search=([^&]+)/);
                const searchCode = codeMatch ? decodeURIComponent(codeMatch[1]) : '';
                if (searchCode) {
                    const toast = document.createElement('div');
                    toast.textContent = `未找到 ${searchCode} 的本地文件`;
                    toast.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); background:#e67e22; color:white; padding:8px 16px; border-radius:8px; z-index:10000; font-size:14px; box-shadow:0 2px 8px rgba(0,0,0,0.2);';
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 2000);
                }
                return true;
            }

            // 优先级一：选择文件名包含 "ch" 的（不区分大小写）
            const chFiles = entries.filter(f => /ch/i.test(f.name));
            const candidates = chFiles.length > 0 ? chFiles : entries;

            // 优先级二：选择体积最大的
            candidates.sort((a, b) => (b.size || 0) - (a.size || 0));
            const best = candidates[0];

            const protocol = GM_getValue('player_protocol', 'potplayer://');
            window.location.href = protocol + 'http://localhost' + best.href;

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