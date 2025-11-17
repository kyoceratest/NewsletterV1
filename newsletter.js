// newsletter.js
// Extracted from newsletter.html to keep JS separate and match hosted/local behavior.
// On-screen text remains French; code and comments are in English.

// Minimal JS to keep menu/search behavior consistent with index.html
document.addEventListener('DOMContentLoaded', function () {
    if (window && window.console && console.info) console.info('[articlesync] newsletter.js loaded (menu init)');
    const hamburger = document.getElementById('hamburger');
    const headerNav = document.querySelector('.header-nav');
    if (hamburger && headerNav) {
        hamburger.addEventListener('click', function () {
            headerNav.classList.toggle('active');
            const spans = hamburger.querySelectorAll('span');
            if (headerNav.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
    }
});

// Loader for content1-4 into main content area
document.addEventListener('DOMContentLoaded', function () {
    if (window && window.console && console.info) console.info('[articlesync] init content loader');
    const selectEl = document.getElementById('contentSelect');
    const statusEl = document.getElementById('contentStatus');
    const targetEl = document.getElementById('loadedContent');
    const categoryBar = document.getElementById('categoryBar');
    let currentCategory = 'edito';
    
    // Helper to read URL query parameters
    function getUrlParameter(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        const results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    // Extract a title, prioritizing an element styled with font-size: 52px
    function extractTitleFromDoc(doc) {
        const getText = (node) => (node && (node.innerText || node.textContent) || '').replace(/\s+/g, ' ').replace(/\u00a0/g, ' ').trim();

        // Helper: determine if a node is media-only or contains media fallback text we should ignore
        const isMediaLike = (el, txt) => {
            if (!el) return false;
            // If it directly contains media, we ignore it as a title candidate
            if (el.querySelector && el.querySelector('video, audio, iframe, img')) return true;
            const low = (txt || '').toLowerCase();
            // Common browser fallback for <video>
            if (low.includes('votre navigateur ne supporte pas la vidéo')) return true;
            return false;
        };

        // 1) Prefer any element with inline 52px style (case/spacing tolerant).
        //    Choose the FIRST valid candidate in document order, not the longest text.
        const styleCandidates = Array.from(
            doc.querySelectorAll('[style*="font-size:52px" i], [style*="font-size: 52px" i]')
        );
        for (const n of styleCandidates) {
            const t = getText(n);
            if (t && t.length >= 3 && !isMediaLike(n, t)) {
                return t;
            }
        }

        // 2) Elements marked by class names used in our CSS/editor
        const classEl = doc.querySelector('.sujette-title, .font-size-52');
        const classTxt = getText(classEl);
        if (classTxt && !isMediaLike(classEl, classTxt)) return classTxt;

        // 3) Legacy <font size="7">
        const fontEl = doc.querySelector('font[size="7"]');
        const fontTxt = getText(fontEl);
        if (fontTxt && !isMediaLike(fontEl, fontTxt)) return fontTxt;

        // 4) Fallback to the first headline
        const hEl = doc.querySelector('h1, h2, h3');
        const hTxt = getText(hEl);
        if (hTxt && !isMediaLike(hEl, hTxt)) return hTxt;

        return '';
    }

    // Sync dropdown option labels with extracted titles from content files
    async function syncDropdownLabels() {
        if (!selectEl) return;
        const opts = Array.from(selectEl.options).filter(o => o.value && o.value.endsWith('.html'));
        for (const opt of opts) {
            try {
                const syncFile = opt.value;
                if (syncFile === 'teteSuperieure.html') {
                    const res = await fetch(`${syncFile}?t=${Date.now()}`);
                    if (!res.ok) continue;
                    const html = await res.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const title = extractTitleFromDoc(doc);
                    if (title) opt.textContent = title;
                }
            } catch (_) { /* ignore */ }
        }
    }

    // Proactively prune legacy options (no fetch required)
    function pruneLegacyOptions() {
        if (!selectEl) return;
        const legacySet = new Set(['teteSuperieure.html','contenuDeGauche.html','contenuCentral.html','contenuDeDroite.html']);
        Array.from(selectEl.options).forEach(opt => {
            const v = (opt.value || '').trim();
            if (legacySet.has(v)) {
                if (console && console.info) console.info('[articlesync] prune legacy option:', v);
                try { opt.remove(); } catch(_) {}
            }
        });
    }

    // Build and sync additional dropdown options from TypeNews/**/article*.html
    const ARTICLE_CATEGORIES = [
        'edito',
        'com_actus',
        'animation',
        'zoom_materiel',
        'solutions_insights',
        'outils_astuces',
        'branding',
        'formations'
    ];

    function buildArticleCandidates() {
        const paths = [];
        for (const cat of ARTICLE_CATEGORIES) {
            // Include article1..5 for all categories
            for (let i = 1; i <= 5; i++) {
                paths.push(`TypeNews/${cat}/article${i}_${cat}.html`);
            }
            // Also include the default video page present in edito
            if (cat === 'edito') paths.push('TypeNews/edito/video1.html');
        }
        return paths;
    }

    function buildArticleCandidatesByCategory(cat) {
        if (!cat) return [];
        const paths = [];
        for (let i = 1; i <= 5; i++) {
            paths.push(`TypeNews/${cat}/article${i}_${cat}.html`);
        }
        if (cat === 'edito') paths.push('TypeNews/edito/video1.html');
        return paths;
    }

    function extractTitle52OnlyFromRaw(raw) {
        const stripHtml = (s) => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/\u00a0/g, ' ').trim();
        try {
            // Parse the HTML to reliably iterate over all 52px inline elements
            const parser = new DOMParser();
            const doc = parser.parseFromString(raw, 'text/html');
            const candidates = Array.from(doc.querySelectorAll('[style*="font-size:52px" i], [style*="font-size: 52px" i]'));
            for (const el of candidates) {
                // Skip if contains only media or is effectively empty (e.g., only <br>)
                if (el.querySelector && el.querySelector('video, audio, iframe, img')) continue;
                const txt = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').replace(/\u00a0/g, ' ').trim();
                if (txt && txt.length >= 3 && !txt.toLowerCase().includes('votre navigateur ne supporte pas la vidéo')) {
                    return txt;
                }
            }
        } catch (_) { /* fall through to empty */ }
        return '';
    }

    async function syncArticlesToDropdown() {
        // legacy dropdown removed; keep function as no-op to preserve calls
        return;
    }

    // Hover menu: build a floating menu for a given category next to the button
    function ensureMenuForButton(btn) {
        let menu = btn._catMenu;
        if (menu) return menu;
        menu = document.createElement('div');
        menu.className = 'cat-menu';
        menu.style.position = 'absolute';
        menu.style.background = '#7e7e7e';
        menu.style.border = '1px solid #6b6b6b';
        menu.style.borderRadius = '6px';
        menu.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
        menu.style.padding = '6px 0';
        menu.style.minWidth = '260px';
        menu.style.zIndex = '3000';
        menu.style.display = 'none';
        menu.style.maxHeight = '320px';
        menu.style.overflowY = 'auto';
        // Container to position absolutely relative to document
        document.body.appendChild(menu);
        btn._catMenu = menu;
        return menu;
    }

    function hideAllMenus(exceptBtn) {
        try {
            if (!categoryBar) return;
            categoryBar.querySelectorAll('button[data-cat]').forEach(b => {
                const m = b._catMenu;
                if (!m) return;
                if (exceptBtn && b === exceptBtn) return;
                m.style.display = 'none';
            });
        } catch(_) {}
    }

    function positionMenuUnderButton(menu, btn) {
        const rect = btn.getBoundingClientRect();
        const top = window.scrollY + rect.bottom + 6; // below button
        // Default align left with button
        let left = window.scrollX + rect.left;
        // Measure menu width (use minWidth fallback)
        const menuWidth = Math.max(menu.offsetWidth || 0, 260);
        const viewportRight = window.scrollX + window.innerWidth;
        const viewportLeft = window.scrollX;
        // If it overflows right, shift left to align right edges
        if (left + menuWidth > viewportRight - 8) {
            left = window.scrollX + rect.right - menuWidth;
        }
        // If still overflows left, clamp to viewport left
        if (left < viewportLeft + 8) {
            left = viewportLeft + 8;
        }
        menu.style.top = `${top}px`;
        menu.style.left = `${left}px`;
    }

    function buildMenuItem(title, path) {
        const a = document.createElement('a');
        a.href = '#';
        a.style.display = 'flex';
        a.style.alignItems = 'center';
        a.style.gap = '8px';
        a.style.padding = '8px 12px';
        a.style.textDecoration = 'none';
        a.style.color = '#fff';
        a.style.whiteSpace = 'nowrap';

        const plus = document.createElement('span');
        plus.textContent = '+';
        plus.style.color = '#f06400';
        plus.style.fontWeight = '800';
        plus.style.lineHeight = '1';

        const label = document.createElement('span');
        label.textContent = title;

        a.appendChild(plus);
        a.appendChild(label);
        a.addEventListener('mouseenter', () => { a.style.background = 'rgba(255,255,255,0.12)'; });
        a.addEventListener('mouseleave', () => { a.style.background = 'transparent'; });
        a.addEventListener('click', (e) => {
            e.preventDefault();
            loadSelected(path);
            try { a.parentElement.style.display = 'none'; } catch(_) {}
        });
        return a;
    }

    async function showCategoryMenu(cat, btn) {
        if (!cat || !btn) return;
        hideAllMenus(btn);
        const menu = ensureMenuForButton(btn);
        // Clear previous
        menu.innerHTML = '';
        // Loading state
        const loading = document.createElement('div');
        loading.textContent = 'Chargement...';
        loading.style.padding = '8px 12px';
        loading.style.color = '#fff';
        menu.appendChild(loading);
        positionMenuUnderButton(menu, btn);
        menu.style.display = 'block';

        let added = 0;
        const candidates = buildArticleCandidatesByCategory(cat);
        const items = [];
        for (const relPath of candidates) {
            try {
                const encoded = `${encodeURI(relPath)}?t=${Date.now()}`;
                let res = await fetch(encoded);
                if (!res.ok) {
                    const rawUrl = `${relPath}?t=${Date.now()}`;
                    try {
                        const alt = await fetch(rawUrl);
                        if (alt.ok) res = alt; else continue;
                    } catch (_) { continue; }
                }
                const raw = await res.text();
                let title = extractTitle52OnlyFromRaw(raw);
                if (!title && /\/video\d*\.html$/i.test(relPath)) {
                    try {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(raw, 'text/html');
                        title = extractTitleFromDoc(doc) || '';
                    } catch (_) {}
                }
                if (!title) continue;
                items.push({title, path: relPath});
                added++;
            } catch (_) {}
        }
        // Rebuild list
        menu.innerHTML = '';
        if (added === 0) {
            const empty = document.createElement('div');
            empty.textContent = 'Aucun article disponible';
            empty.style.padding = '8px 12px';
            empty.style.color = '#fff';
            menu.appendChild(empty);
        } else {
            items.forEach(it => menu.appendChild(buildMenuItem(it.title, it.path)));
        }

        // Keep menu open while hovering menu or button
        let hideTimer = null;
        const scheduleHide = () => { hideTimer = setTimeout(() => { menu.style.display = 'none'; }, 200); };
        const cancelHide = () => { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } };
        btn.addEventListener('mouseleave', scheduleHide, { once: true });
        btn.addEventListener('mouseenter', cancelHide);
        menu.onmouseenter = cancelHide;
        menu.onmouseleave = scheduleHide;
    }

    // 1) Load content immediately based on URL parameters
    // Supports:
    // - `?article=TypeNews/edito/articleedito.html` (full relative path)
    // - `?article=article1_animation` (short code => TypeNews/animation/articleanimation.html)
    // - legacy `?page=1` (only when dropdown exists)
    const articleParam = getUrlParameter('article');
    if (articleParam) {
        // Resolve shorthand like "article1_animation" to a full TypeNews path
        let resolved = articleParam;
        try {
            if (!/\//.test(articleParam)) {
                // Split at the FIRST underscore so folders like "com_actus" work
                const idx = articleParam.indexOf('_');
                if (idx > 0 && idx < articleParam.length - 1) {
                    const baseName = articleParam.slice(0, idx).trim();
                    const folder = articleParam.slice(idx + 1).trim();
                    // For edito videos like video1, keep original (TypeNews/edito/video1.html)
                    const isEditoVideo = /^video\d*$/i.test(baseName) && /^edito$/i.test(folder);
                    let fileBase = baseName;
                    if (!isEditoVideo && !fileBase.toLowerCase().endsWith(`_${folder.toLowerCase()}`)) {
                        fileBase = `${fileBase}_${folder}`; // ensure suffix matches new naming
                    }
                    const file = /\.html?$/i.test(fileBase) ? fileBase : `${fileBase}.html`;
                    resolved = `TypeNews/${folder}/${file}`;
                }
            }
        } catch (_) { /* keep original value */ }
        // Load the provided or resolved article path directly; works with or without dropdown
        loadSelected(resolved);
    } else if (selectEl) {
        const page = getUrlParameter('page');
        let contentFile = '';
        if (page) {
            switch(page) {
                case '1':
                    contentFile = 'teteSuperieure.html'; // Tête supérieure
                    break;
                default:
                    contentFile = '';
            }
            if (contentFile) {
                // Set the dropdown to the selected file and load immediately
        }
    }

    // 2) Run label sync in parallel (no need to block initial load)
    Promise.all([
        (async () => { pruneLegacyOptions(); })(),
        syncDropdownLabels(),
        syncArticlesToDropdown()
    ]).then(() => {
        // After labels sync, keep the dropdown selection consistent if a page was preselected
        if (selectEl) {
            const current = selectEl.value;
            if (current) selectEl.value = current;
        }
    });

    // 2b) Periodically re-sync dropdown labels so they stay up-to-date with content titles
    // This ensures that when an editor updates a section title (e.g., applying 52px style),
    // the dropdown reflects the latest title without a manual refresh.
    let dropdownLabelSyncInterval = null;
    try {
        dropdownLabelSyncInterval = setInterval(() => {
            const current = selectEl ? selectEl.value : '';
            Promise.all([
                (async () => { pruneLegacyOptions(); })(),
                syncDropdownLabels(),
                syncArticlesToDropdown()
            ]).then(() => {
                // Preserve the current selection after labels update
                if (selectEl && current) selectEl.value = current;
            });
        }, 5000);
        // Clean up on page unload
        window.addEventListener('beforeunload', () => {
            if (dropdownLabelSyncInterval) clearInterval(dropdownLabelSyncInterval);
        });
    } catch (_) { /* no-op */ }

    async function loadSelected(path) {
        if (!path) { targetEl.innerHTML = ''; if (statusEl) statusEl.textContent = ''; return; }
        if (statusEl) statusEl.textContent = 'Chargement...';
        try {
            // Fallback mapping to existing in-repo files (keeps UI/links unchanged)
            const fallbackMap = {
                'teteSuperieure.html': 'TypeNews/edito/article2_edito.html'
            };
            const candidates = [path, fallbackMap[path]].filter(Boolean);

            // Try primary, then mapped fallback if needed
            let usedRes = await fetch(`${candidates[0]}?t=${Date.now()}`); // cache-buster
            if (!usedRes.ok && candidates[1]) {
                const altRes = await fetch(`${candidates[1]}?t=${Date.now()}`);
                if (altRes.ok) {
                    usedRes = altRes;
                }
            }
            if (!usedRes.ok) throw new Error(`HTTP ${usedRes.status}`);
            const html = await usedRes.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Prefer .newsletter-content if present; otherwise fall back to <body>
            const content = doc.querySelector('.newsletter-content') || doc.body;

            // Build a fragment to sanitize to read-only before injecting
            const wrapper = document.createElement('div');
            wrapper.innerHTML = content ? content.innerHTML : html;

            // Remove any contenteditable capability
            wrapper.querySelectorAll('[contenteditable]').forEach(el => {
                el.removeAttribute('contenteditable');
                el.contentEditable = 'false';
            });

            // Disable form controls so they cannot be changed
            ['input','textarea','select','button'].forEach(sel => {
                wrapper.querySelectorAll(sel).forEach(ctrl => {
                    ctrl.setAttribute('disabled', '');
                    ctrl.setAttribute('tabindex', '-1');
                });
            });

            // Normalize media: rewrite blob or hinted sources to media/<filename> so videos play after refresh
            try {
                // For <video src>
                Array.from(wrapper.querySelectorAll('video[src]')).forEach(v => {
                    const raw = v.getAttribute('src') || '';
                    if (/^blob:/i.test(raw) || !raw) {
                        // Prefer own hint; else check first <source>
                        let hint = v.getAttribute('data-local-filename') || '';
                        if (!hint) {
                            const s = v.querySelector('source[data-local-filename]');
                            if (s) hint = s.getAttribute('data-local-filename') || '';
                        }
                        if (hint) {
                            const safe = hint.replace(/^[\\\/]+/, '');
                            v.setAttribute('src', 'media/' + encodeURIComponent(safe));
                        }
                    }
                    // Ensure controls for usability
                    try { v.controls = true; } catch(_) {}
                });
                // For <video><source src>
                Array.from(wrapper.querySelectorAll('video source[src], audio source[src]')).forEach(s => {
                    const raw = s.getAttribute('src') || '';
                    if (/^blob:/i.test(raw) || !raw) {
                        let hint = s.getAttribute('data-local-filename') || '';
                        if (!hint) {
                            try {
                                const parent = s.closest('video,audio');
                                hint = parent ? (parent.getAttribute('data-local-filename') || '') : '';
                            } catch(_) {}
                        }
                        if (hint) {
                            const safe = hint.replace(/^[\\\/]+/, '');
                            s.setAttribute('src', 'media/' + encodeURIComponent(safe));
                        }
                    }
                });
                // If a <video> has no <source> but has a data-local-filename, add one
                Array.from(wrapper.querySelectorAll('video:not(:has(source))')).forEach(v => {
                    const hint = v.getAttribute('data-local-filename') || '';
                    if (hint) {
                        const safe = hint.replace(/^[\\\/]+/, '');
                        const srcEl = document.createElement('source');
                        srcEl.setAttribute('src', 'media/' + encodeURIComponent(safe));
                        try {
                            const lower = safe.toLowerCase();
                            if (lower.endsWith('.mp4')) srcEl.type = 'video/mp4';
                            else if (lower.endsWith('.webm')) srcEl.type = 'video/webm';
                            else if (lower.endsWith('.ogg') || lower.endsWith('.ogv')) srcEl.type = 'video/ogg';
                        } catch(_) {}
                        v.appendChild(srcEl);
                        try { v.removeAttribute('src'); } catch(_) {}
                    }
                });
            } catch (_) { /* no-op */ }

            // Inject sanitized + normalized content
            targetEl.innerHTML = '';
            while (wrapper.firstChild) {
                targetEl.appendChild(wrapper.firstChild);
            }

            // Update the page accent title and document title from the loaded document
            try {
                const extracted = extractTitleFromDoc(doc) || '';
                const titleHost = document.querySelector('.title-accent');
                if (titleHost && extracted) {
                    titleHost.textContent = extracted;
                }
                // Keep the browser/tab title in sync for systems that read <title>
                if (extracted) {
                    document.title = extracted;
                }
            } catch (_) {}

            if (statusEl) statusEl.textContent = '';
        } catch (e) {
            console.error('Load failed:', e);
            if (statusEl) statusEl.textContent = 'Erreur de chargement';
        }
    }

    if (selectEl) {
        selectEl.addEventListener('change', (e) => loadSelected(e.target.value));
    }

    // Category buttons handling
    if (categoryBar) {
        categoryBar.addEventListener('click', (e) => {
            const btn = e.target && e.target.closest('button[data-cat]');
            if (!btn) return;
            const cat = btn.getAttribute('data-cat') || 'all';
            currentCategory = cat;
            // active style
            try {
                categoryBar.querySelectorAll('button[data-cat]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            } catch(_) {}
            // Try default article1_<cat>.html when clicking
            const def = `TypeNews/${currentCategory}/article1_${currentCategory}.html`;
            (async () => {
                try {
                    let res = await fetch(`${def}?t=${Date.now()}`);
                    if (!res.ok) throw new Error('missing');
                    loadSelected(def);
                } catch (_) {
                    loadSelected('TypeNews/noArticle.html');
                }
            })();
        });
        // Hover -> open menu (use mouseover so it bubbles)
        categoryBar.addEventListener('mouseover', (e) => {
            const btn = e.target && e.target.closest('button[data-cat]');
            if (!btn || !categoryBar.contains(btn)) return;
            const cat = btn.getAttribute('data-cat');
            showCategoryMenu(cat, btn);
        });

        // Click outside to close any open menus
        document.addEventListener('click', (evt) => {
            try {
                categoryBar.querySelectorAll('button[data-cat]').forEach(b => {
                    const m = b._catMenu;
                    if (!m) return;
                    if (m.style.display !== 'none') {
                        const insideMenu = m.contains(evt.target);
                        const onButton = b.contains(evt.target);
                        if (!insideMenu && !onButton) m.style.display = 'none';
                    }
                });
            } catch(_) {}
        });
    }
});

// Dynamic sync (tiles + hero) for newsletter page
document.addEventListener('DOMContentLoaded', function () {
    if (window && window.console && console.info) console.info('[articlesync] init dynamic sync');
    // Configuration for content files and their target elements
    // Legacy dynamic sources removed: prevent 404s by not requesting deleted files
    const contentConfig = [];

    // Function to fetch and update content
    async function updateContent(config) {
        try {
            const response = await fetch(`${config.source}?t=${Date.now()}`); // Cache buster
            if (!response.ok) {
                const err = new Error(`HTTP error! status: ${response.status}`);
                // Mark missing for 404/410 so we can disable future retries
                if (response.status === 404 || response.status === 410) err.missing = true;
                throw err;
            }
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Update title if selector exists
            const titleElement = doc.querySelector(config.titleSelector);
            const targetTitle = document.querySelector(config.targetTitle);
            
            if (titleElement && targetTitle) {
                const titleText = titleElement.innerText || titleElement.textContent || '';
                const trimmedText = titleText.trim();
                if (trimmedText) {
                    targetTitle.textContent = trimmedText;
                }
            }
            
            // Update image if selector exists
            const imageElement = doc.querySelector(config.imageSelector);
            const targetImage = document.querySelector(config.targetImage);
            
            if (imageElement && targetImage) {
                const imageSrc = imageElement.src || imageElement.getAttribute('src');
                if (imageSrc) {
                    targetImage.src = imageSrc;
                    targetImage.alt = imageElement.alt || '';
                }
            }
            
            return true;
        } catch (error) {
            console.error(`Error syncing ${config.errorMsg}:`, error);
            if (error && error.missing) {
                // Permanently disable this config to avoid repeated fetches
                config._disabled = true;
                if (console && console.info) console.info('[articlesync] disabled source due to missing file:', config.source);
            }
            return false;
        }
    }

    // Main sync function with retry logic
    async function syncContentWithRetry(config, retries = 3, delay = 1000) {
        if (config._disabled) return false;
        for (let i = 0; i < retries; i++) {
            const success = await updateContent(config);
            if (success) return true;
            if (config._disabled) return false; // stop retrying if disabled mid-way
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        return false;
    }

    // Initialize real-time syncing
    function initRealTimeSync() {
        // Initial sync
        contentConfig.forEach(config => {
            if (!config._disabled) syncContentWithRetry(config);
        });

        // Periodic sync (every 5 seconds)
        const syncInterval = setInterval(() => {
            contentConfig.forEach(config => {
                if (!config._disabled) syncContentWithRetry(config);
            });
        }, 5000);

        // Clean up on page unload
        window.addEventListener('beforeunload', () => {
            clearInterval(syncInterval);
        });
    }

    // Start the synchronization
    initRealTimeSync();
});

