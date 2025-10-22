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
        'animation',
        'branding',
        'com_actus',
        'edito',
        'formations',
        'outils_astuces',
        'solutions_insights',
        'zoom_materiel'
    ];

    function buildArticleCandidates() {
        const paths = [];
        for (const cat of ARTICLE_CATEGORIES) {
            if (cat === 'edito') {
                // In this repo, TypeNews/edito/articleedito.html does not exist; avoid 404s
                for (let i = 2; i <= 5; i++) {
                    paths.push(`TypeNews/${cat}/article${i}_${cat}.html`);
                }
                // Include the default video page present in edito
                paths.push('TypeNews/edito/video1.html');
            } else {
                for (let i = 1; i <= 5; i++) {
                    paths.push(`TypeNews/${cat}/article${i}_${cat}.html`);
                }
            }
        }
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
        if (!selectEl) return;
        // Always rebuild: keep only the first placeholder option, remove everything else
        try {
            if (selectEl.options && selectEl.options.length > 1) {
                for (let i = selectEl.options.length - 1; i >= 1; i--) {
                    selectEl.remove(i);
                }
            }
        } catch (_) { /* no-op */ }

        let added = 0;
        const candidates = buildArticleCandidates();
        for (const relPath of candidates) {
            try {
                const encoded = `${encodeURI(relPath)}?t=${Date.now()}`;
                // Diagnostics: show which path we are checking
                if (window && window.console && console.debug) console.debug('[articlesync] check', relPath);
                let res = await fetch(encoded);
                if (!res.ok) {
                    // Retry without encoding to support certain dev servers / FS paths with accents
                    const rawUrl = `${relPath}?t=${Date.now()}`;
                    try {
                        const alt = await fetch(rawUrl);
                        if (alt.ok) {
                            res = alt;
                        } else {
                            if (console && console.warn) console.warn('[articlesync] skip (HTTP)', relPath, res.status, 'alt', alt.status);
                            continue;
                        }
                    } catch (err) {
                        if (console && console.warn) console.warn('[articlesync] skip (fetch error)', relPath, err);
                        continue;
                    }
                }
                const raw = await res.text();
                let title = extractTitle52OnlyFromRaw(raw);
                // Fallback for video pages: accept first heading/title if no 52px style
                if (!title && /\/video\d*\.html$/i.test(relPath)) {
                    try {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(raw, 'text/html');
                        title = extractTitleFromDoc(doc) || '';
                    } catch (_) { /* no-op */ }
                }
                if (!title) {
                    if (console && console.info) console.info('[articlesync] skip (no 52px title)', relPath);
                    continue; // filter: must have 52px title (except video fallback)
                }

                const opt = document.createElement('option');
                opt.value = relPath; // keep relative path in value
                opt.textContent = title;
                opt.setAttribute('data-article-option', '1');
                selectEl.appendChild(opt);
                added++;
                if (console && console.info) console.info('[articlesync] added', relPath, '=>', title);
            } catch (err) {
                if (console && console.error) console.error('[articlesync] error', relPath, err);
            }
        }
        // Surface a minimal hint if nothing was added
        try {
            if (statusEl) {
                statusEl.textContent = added > 0 ? '' : 'Aucun article détecté (vérifiez les fichiers TypeNews et le serveur local)';
            }
        } catch (_) { /* no-op */ }
    }

    // 1) Load content immediately based on URL parameters
    // Supports:
    // - `?article=TypeNews/edito/articleedito.html` (full relative path)
    // - `?article=article1_animation` (short code => TypeNews/animation/articleanimation.html)
    // - legacy `?page=1`
    if (selectEl) {
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
            // Load the provided or resolved article path directly; keep dropdown unchanged if not in options
            loadSelected(resolved);
        } else {
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
                    selectEl.value = contentFile;
                    loadSelected(contentFile);
                }
            }
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
        if (!path) { targetEl.innerHTML = ''; statusEl.textContent = ''; return; }
        statusEl.textContent = 'Chargement...';
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

            statusEl.textContent = '';
        } catch (e) {
            console.error('Load failed:', e);
            statusEl.textContent = 'Erreur de chargement';
        }
    }

    if (selectEl) {
        selectEl.addEventListener('change', (e) => loadSelected(e.target.value));
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

