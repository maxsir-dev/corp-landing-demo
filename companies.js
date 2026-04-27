/* ==========================================================================
   companies.js
   Логика страницы каталога дочерних компаний.
   - Загрузка из data/companies.xlsx через SheetJS
   - Поиск (debounce 150мс), мульти-фильтры, сортировка
   - Рендер сетки + счётчик
   На следующих этапах сюда добавятся: табличный режим, модалка, URL-роутинг.
   ========================================================================== */

(function () {
    'use strict';

    /* ----------------------------------------------------------------------
       Constants & dictionaries
       ---------------------------------------------------------------------- */

    const XLSX_URL = 'data/companies.xlsx';
    const SHEET_NAME = 'Компании';
    const SEARCH_DEBOUNCE = 150;

    const STATUS_LABEL = {
        planned:     'Запланировано',
        in_progress: 'В работе',
        completed:   'Завершено',
        paused:      'Приостановлено',
    };
    const STATUS_ORDER = ['planned', 'in_progress', 'completed', 'paused'];

    const SIZE_LABEL = {
        S:  'S — до 50',
        M:  'M — 51-200',
        L:  'L — 201-500',
        XL: 'XL — 501+',
    };
    const SIZE_ORDER = ['S', 'M', 'L', 'XL'];

    // Маппинг ключа колонки таблицы → префикс sort-ключа
    const HEADER_TO_SORT_PREFIX = {
        shortName:         'name',
        industry:          'industry',
        region:            'region',
        employees:         'size',
        yearFounded:       'year',
        integrationStatus: 'status',
    };

    const INDUSTRY_TO_CLASS = {
        'Телеком и связь':            'tag-telecom',
        'Финтех и платежи':           'tag-fintech',
        'Медиа и контент':            'tag-media',
        'Облачные сервисы':           'tag-cloud',
        'Кибербезопасность':          'tag-cybersec',
        'Аналитика данных':           'tag-data',
        'AI и машинное обучение':     'tag-ai',
        'Рекламные технологии':       'tag-adtech',
        'EdTech и онлайн-образование':'tag-edtech',
        'IoT и M2M-решения':          'tag-iot',
        'E-commerce и retail':        'tag-ecom',
        'Игры и киберспорт':          'tag-gaming',
    };

    /* ----------------------------------------------------------------------
       State
       ---------------------------------------------------------------------- */

    const state = {
        all: [],
        visible: [],
        search: '',
        filters: {
            industry: new Set(),
            status:   new Set(),
            size:     new Set(),
            region:   new Set(),
        },
        sort: 'name_asc',
        view: 'grid',  // 'grid' | 'table'
        openCompanyId: null,
        activeTab: 'legal',
    };

    // Куда вернуть фокус после закрытия модалки
    let lastFocusBeforeModal = null;

    /* ----------------------------------------------------------------------
       Utils
       ---------------------------------------------------------------------- */

    function $(sel, root) { return (root || document).querySelector(sel); }
    function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[ch]);
    }

    function debounce(fn, ms) {
        let t;
        return function () {
            clearTimeout(t);
            const args = arguments, ctx = this;
            t = setTimeout(() => fn.apply(ctx, args), ms);
        };
    }

    function industryClass(name) { return INDUSTRY_TO_CLASS[name] || ''; }
    function statusLabel(status) { return STATUS_LABEL[status] || status; }

    function sizeOf(employees) {
        if (employees <= 50) return 'S';
        if (employees <= 200) return 'M';
        if (employees <= 500) return 'L';
        return 'XL';
    }

    function fullName(c) {
        return c.legalForm
            ? c.legalForm + ' «' + c.shortName + '»'
            : c.shortName;
    }

    function pluralize(n, one, few, many) {
        const mod10 = n % 10, mod100 = n % 100;
        if (mod10 === 1 && mod100 !== 11) return one;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
        return many;
    }
    function formatEmployees(n) {
        return n + ' ' + pluralize(n, 'сотрудник', 'сотрудника', 'сотрудников');
    }

    /* ----------------------------------------------------------------------
       Load + parse xlsx
       ---------------------------------------------------------------------- */

    async function loadCompanies() {
        const response = await fetch(XLSX_URL);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheet = workbook.Sheets[SHEET_NAME];
        if (!sheet) throw new Error('Лист "' + SHEET_NAME + '" не найден');
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
        return rawRows.map(normalizeRow).filter(c => c.id);
    }

    function normalizeRow(r) {
        return {
            id:                String(r['id'] || '').trim(),
            shortName:         String(r['короткое_название'] || '').trim(),
            legalForm:         String(r['юр_форма'] || '').trim(),
            industry:          String(r['отрасль'] || '').trim(),
            region:            String(r['регион'] || '').trim(),
            employees:         parseInt(r['сотрудников'], 10) || 0,
            yearFounded:       parseInt(r['год_основания'], 10) || 0,
            inn:               String(r['ИНН'] || '').trim(),
            ogrn:              String(r['ОГРН'] || '').trim(),
            legalAddress:      String(r['юр_адрес'] || '').trim(),
            website:           String(r['сайт'] || '').trim(),
            ceo:               String(r['ген_директор'] || '').trim(),
            cfo:               String(r['гл_бухгалтер'] || '').trim(),
            integrationLead:   String(r['отв_за_интеграцию'] || '').trim(),
            erp:               String(r['ERP'] || '').trim(),
            hrSystem:          String(r['HR_система'] || '').trim(),
            crm:               String(r['CRM'] || '').trim(),
            mail:              String(r['почта'] || '').trim(),
            bi:                String(r['BI'] || '').trim(),
            integrationStatus: String(r['статус_интеграции'] || 'planned').trim(),
            progress: {
                HR:       String(r['прогресс_HR']             || 'not_started').trim(),
                IT:       String(r['прогресс_IT']             || 'not_started').trim(),
                finance:  String(r['прогресс_финансы']        || 'not_started').trim(),
                legal:    String(r['прогресс_юр']             || 'not_started').trim(),
                security: String(r['прогресс_безопасность']   || 'not_started').trim(),
            },
        };
    }

    /* ----------------------------------------------------------------------
       URL synchronization (?search, ?industry, ?status, ?size, ?region,
       ?sort, ?view, ?company)
       ---------------------------------------------------------------------- */

    function readURL() {
        const params = new URLSearchParams(window.location.search);

        state.search = params.get('search') || '';
        state.sort = params.get('sort') || 'name_asc';
        state.view = params.get('view') === 'table' ? 'table' : 'grid';
        state.openCompanyId = params.get('company') || null;

        const csv = (key) => {
            const raw = params.get(key);
            return raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
        };

        state.filters.industry = new Set(csv('industry'));
        state.filters.status   = new Set(csv('status'));
        state.filters.size     = new Set(csv('size'));
        state.filters.region   = new Set(csv('region'));
    }

    function writeURL() {
        const params = new URLSearchParams();

        if (state.search) params.set('search', state.search);
        if (state.sort && state.sort !== 'name_asc') params.set('sort', state.sort);
        if (state.view === 'table') params.set('view', 'table');

        if (state.filters.industry.size) params.set('industry', Array.from(state.filters.industry).join(','));
        if (state.filters.status.size)   params.set('status',   Array.from(state.filters.status).join(','));
        if (state.filters.size.size)     params.set('size',     Array.from(state.filters.size).join(','));
        if (state.filters.region.size)   params.set('region',   Array.from(state.filters.region).join(','));

        if (state.openCompanyId) params.set('company', state.openCompanyId);

        const newSearch = params.toString();
        const newURL = window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash;
        history.replaceState(null, '', newURL);
    }

    function syncUIFromState() {
        // Поиск
        const search = $('#catalog-search-input');
        if (search) search.value = state.search;

        // Чекбоксы фильтров
        $$('.filter-option input[type="checkbox"]').forEach(cb => {
            const name = cb.dataset.filterName;
            cb.checked = state.filters[name] && state.filters[name].has(cb.value);
        });

        // Сортировка (если значения нет в options — игнорируем)
        const sortSelect = $('[data-sort]');
        if (sortSelect) {
            const has = Array.from(sortSelect.options).some(o => o.value === state.sort);
            sortSelect.value = has ? state.sort : '';
        }

        // Кнопки режима
        $$('.view-toggle__btn[data-view]').forEach(btn => {
            const isActive = btn.dataset.view === state.view;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-pressed', String(isActive));
        });
    }

    /* ----------------------------------------------------------------------
       Filter / search / sort
       ---------------------------------------------------------------------- */

    function applyFilters() {
        let items = state.all;

        if (state.search) {
            const q = state.search.toLowerCase().trim();
            items = items.filter(c =>
                c.shortName.toLowerCase().includes(q) ||
                c.inn.includes(q) ||
                c.ogrn.includes(q)
            );
        }

        const f = state.filters;
        if (f.industry.size) items = items.filter(c => f.industry.has(c.industry));
        if (f.status.size)   items = items.filter(c => f.status.has(c.integrationStatus));
        if (f.size.size)     items = items.filter(c => f.size.has(sizeOf(c.employees)));
        if (f.region.size)   items = items.filter(c => f.region.has(c.region));

        state.visible = sortItems(items, state.sort);

        render();
        updateFilterBadges();
        updateResetVisibility();
        writeURL();
    }

    function sortItems(items, key) {
        const list = items.slice();
        const ru = (a, b) => String(a || '').localeCompare(String(b || ''), 'ru');
        const statusIdx = c => STATUS_ORDER.indexOf(c.integrationStatus);
        switch (key) {
            case 'name_desc':     list.sort((a, b) => ru(b.shortName, a.shortName)); break;
            case 'size_desc':     list.sort((a, b) => b.employees - a.employees); break;
            case 'size_asc':      list.sort((a, b) => a.employees - b.employees); break;
            case 'year_desc':     list.sort((a, b) => b.yearFounded - a.yearFounded); break;
            case 'year_asc':      list.sort((a, b) => a.yearFounded - b.yearFounded); break;
            case 'industry_asc':  list.sort((a, b) => ru(a.industry, b.industry)); break;
            case 'industry_desc': list.sort((a, b) => ru(b.industry, a.industry)); break;
            case 'region_asc':    list.sort((a, b) => ru(a.region, b.region)); break;
            case 'region_desc':   list.sort((a, b) => ru(b.region, a.region)); break;
            case 'status_asc':    list.sort((a, b) => statusIdx(a) - statusIdx(b)); break;
            case 'status_desc':   list.sort((a, b) => statusIdx(b) - statusIdx(a)); break;
            case 'name_asc':
            default:              list.sort((a, b) => ru(a.shortName, b.shortName)); break;
        }
        return list;
    }

    function hasActiveFilters() {
        return state.search.length > 0
            || state.filters.industry.size > 0
            || state.filters.status.size > 0
            || state.filters.size.size > 0
            || state.filters.region.size > 0;
    }

    function resetFilters() {
        state.search = '';
        state.filters.industry.clear();
        state.filters.status.clear();
        state.filters.size.clear();
        state.filters.region.clear();

        const search = $('#catalog-search-input');
        if (search) search.value = '';
        $$('.filter-option input[type="checkbox"]').forEach(cb => cb.checked = false);

        applyFilters();
    }

    /* ----------------------------------------------------------------------
       Filter UI: populate dropdowns
       ---------------------------------------------------------------------- */

    function uniqueSorted(items, key) {
        return Array.from(new Set(items.map(c => c[key]).filter(Boolean)))
            .sort((a, b) => a.localeCompare(b, 'ru'));
    }

    function countBy(items, predicate) {
        return items.reduce((n, c) => n + (predicate(c) ? 1 : 0), 0);
    }

    function populateFilters() {
        // industry
        renderFilterPanel('industry',
            uniqueSorted(state.all, 'industry').map(name => ({
                value: name,
                label: name,
                count: countBy(state.all, c => c.industry === name),
            }))
        );

        // status (фиксированный порядок)
        renderFilterPanel('status',
            STATUS_ORDER
                .filter(s => state.all.some(c => c.integrationStatus === s))
                .map(s => ({
                    value: s,
                    label: STATUS_LABEL[s],
                    count: countBy(state.all, c => c.integrationStatus === s),
                }))
        );

        // size (фиксированный порядок)
        renderFilterPanel('size',
            SIZE_ORDER
                .filter(s => state.all.some(c => sizeOf(c.employees) === s))
                .map(s => ({
                    value: s,
                    label: SIZE_LABEL[s],
                    count: countBy(state.all, c => sizeOf(c.employees) === s),
                }))
        );

        // region
        renderFilterPanel('region',
            uniqueSorted(state.all, 'region').map(name => ({
                value: name,
                label: name,
                count: countBy(state.all, c => c.region === name),
            }))
        );
    }

    function renderFilterPanel(filterName, options) {
        const dropdown = document.querySelector(`.filter-dropdown[data-filter="${filterName}"]`);
        if (!dropdown) return;
        const panel = $('[data-filter-options]', dropdown);
        if (!panel) return;

        panel.innerHTML = options.map(o => `
            <label class="filter-option">
                <input type="checkbox" value="${escapeHtml(o.value)}" data-filter-name="${filterName}">
                <span class="filter-option__text">${escapeHtml(o.label)}</span>
                <span class="filter-option__count">${o.count}</span>
            </label>
        `).join('');
    }

    function updateFilterBadges() {
        ['industry', 'status', 'size', 'region'].forEach(name => {
            const dropdown = document.querySelector(`.filter-dropdown[data-filter="${name}"]`);
            if (!dropdown) return;
            const badge = $('.filter-dropdown__count', dropdown);
            const n = state.filters[name].size;
            if (n > 0) {
                badge.textContent = String(n);
                badge.hidden = false;
            } else {
                badge.hidden = true;
            }
        });
    }

    function updateResetVisibility() {
        const btn = $('[data-filter-reset]');
        if (!btn) return;
        btn.hidden = !hasActiveFilters();
    }

    /* ----------------------------------------------------------------------
       Render: card + grid
       ---------------------------------------------------------------------- */

    function renderCard(c) {
        const tagCls = industryClass(c.industry);
        const tagHtml = c.industry
            ? `<span class="industry-tag ${tagCls}">${escapeHtml(c.industry)}</span>`
            : '';

        const html = `
            <article class="company-card" data-id="${escapeHtml(c.id)}" tabindex="0" role="button" aria-label="${escapeHtml(c.shortName)} — открыть карточку">
                <div class="company-card__top">
                    <div class="company-card__heading">
                        <h3 class="company-card__name">${escapeHtml(c.shortName)}</h3>
                        <p class="company-card__legal">${escapeHtml(fullName(c))}</p>
                    </div>
                    <span class="status-pill" data-status="${escapeHtml(c.integrationStatus)}">${escapeHtml(statusLabel(c.integrationStatus))}</span>
                </div>
                ${tagHtml}
                <div class="company-card__meta">
                    <span class="company-card__meta-item">📍 ${escapeHtml(c.region)}</span>
                    <span class="company-card__meta-item">👥 ${escapeHtml(formatEmployees(c.employees))}</span>
                    <span class="company-card__meta-item">📅 ${c.yearFounded || '—'}</span>
                </div>
                <div class="company-card__progress">
                    <div class="company-card__progress-label">Прогресс интеграции</div>
                    <div class="progress-blocks">
                        <span class="progress-block" data-state="${escapeHtml(c.progress.HR)}" title="HR: ${escapeHtml(c.progress.HR)}"></span>
                        <span class="progress-block" data-state="${escapeHtml(c.progress.IT)}" title="IT: ${escapeHtml(c.progress.IT)}"></span>
                        <span class="progress-block" data-state="${escapeHtml(c.progress.finance)}" title="Финансы: ${escapeHtml(c.progress.finance)}"></span>
                        <span class="progress-block" data-state="${escapeHtml(c.progress.legal)}" title="Юр.: ${escapeHtml(c.progress.legal)}"></span>
                        <span class="progress-block" data-state="${escapeHtml(c.progress.security)}" title="Безопасность: ${escapeHtml(c.progress.security)}"></span>
                    </div>
                </div>
                <button type="button" class="company-card__share" data-share="${escapeHtml(c.id)}" aria-label="Скопировать ссылку на компанию" title="Скопировать ссылку на компанию">🔗</button>
            </article>
        `;

        const wrap = document.createElement('div');
        wrap.innerHTML = html.trim();
        return wrap.firstElementChild;
    }

    function renderRow(c) {
        const tagCls = industryClass(c.industry);
        const tagHtml = c.industry
            ? `<span class="industry-tag ${tagCls}">${escapeHtml(c.industry)}</span>`
            : '';

        const html = `
            <tr data-id="${escapeHtml(c.id)}" tabindex="0">
                <td>
                    <div class="catalog-table__name">${escapeHtml(c.shortName)}</div>
                    <div class="catalog-table__legal">${escapeHtml(fullName(c))}</div>
                </td>
                <td>${tagHtml}</td>
                <td>${escapeHtml(c.region)}</td>
                <td>${c.employees}</td>
                <td>${c.yearFounded || '—'}</td>
                <td><span class="status-pill" data-status="${escapeHtml(c.integrationStatus)}">${escapeHtml(statusLabel(c.integrationStatus))}</span></td>
                <td>
                    <div class="progress-blocks">
                        <span class="progress-block" data-state="${escapeHtml(c.progress.HR)}" title="HR: ${escapeHtml(c.progress.HR)}"></span>
                        <span class="progress-block" data-state="${escapeHtml(c.progress.IT)}" title="IT: ${escapeHtml(c.progress.IT)}"></span>
                        <span class="progress-block" data-state="${escapeHtml(c.progress.finance)}" title="Финансы: ${escapeHtml(c.progress.finance)}"></span>
                        <span class="progress-block" data-state="${escapeHtml(c.progress.legal)}" title="Юр.: ${escapeHtml(c.progress.legal)}"></span>
                        <span class="progress-block" data-state="${escapeHtml(c.progress.security)}" title="Безопасность: ${escapeHtml(c.progress.security)}"></span>
                    </div>
                </td>
            </tr>
        `;
        const wrap = document.createElement('tbody');
        wrap.innerHTML = html.trim();
        return wrap.firstElementChild;
    }

    function renderGridContent() {
        const grid = $('[data-view-grid]');
        if (!grid) return;
        grid.innerHTML = '';
        const frag = document.createDocumentFragment();
        state.visible.forEach(c => frag.appendChild(renderCard(c)));
        grid.appendChild(frag);
    }

    function renderTableContent() {
        const tbody = $('[data-table-body]');
        if (!tbody) return;
        tbody.innerHTML = '';
        const frag = document.createDocumentFragment();
        state.visible.forEach(c => frag.appendChild(renderRow(c)));
        tbody.appendChild(frag);
    }

    function render() {
        const grid = $('[data-view-grid]');
        const tableWrap = $('[data-view-table]');
        const empty = $('[data-state-empty]');

        const hasResults = state.visible.length > 0;
        const noResults = !hasResults && state.all.length > 0;

        if (empty) empty.hidden = !noResults;
        if (grid) grid.hidden = (state.view !== 'grid' || !hasResults);
        if (tableWrap) tableWrap.hidden = (state.view !== 'table' || !hasResults);

        if (state.view === 'grid' && hasResults) renderGridContent();
        if (state.view === 'table' && hasResults) renderTableContent();

        updateHeaderIndicators();
        updateCounter();
    }

    function updateHeaderIndicators() {
        $$('th[data-sort-key]').forEach(th => th.removeAttribute('data-sort-active'));
        const [prefix, dir] = state.sort.split('_');
        const headerKey = Object.keys(HEADER_TO_SORT_PREFIX)
            .find(k => HEADER_TO_SORT_PREFIX[k] === prefix);
        if (!headerKey) return;
        const th = document.querySelector(`th[data-sort-key="${headerKey}"]`);
        if (th) th.setAttribute('data-sort-active', dir === 'asc' ? '▲' : '▼');
    }

    function setView(view) {
        if (view !== 'grid' && view !== 'table') return;
        if (state.view === view) return;
        state.view = view;

        $$('.view-toggle__btn[data-view]').forEach(btn => {
            const isActive = btn.dataset.view === view;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-pressed', String(isActive));
        });

        render();
        writeURL();
    }

    function updateCounter() {
        const shown = $('[data-counter-shown]');
        const total = $('[data-counter-total]');
        if (shown) shown.textContent = String(state.visible.length);
        if (total) total.textContent = String(state.all.length);
    }

    /* ----------------------------------------------------------------------
       Toast + share
       ---------------------------------------------------------------------- */

    function toast(message) {
        const container = $('[data-toast-container]');
        if (!container) return;
        const el = document.createElement('div');
        el.className = 'toast';
        el.textContent = message;
        container.appendChild(el);
        setTimeout(() => {
            el.classList.add('is-leaving');
            setTimeout(() => el.remove(), 220);
        }, 2000);
    }

    function shareCompanyLink(id) {
        const url = new URL(window.location.href);
        url.hash = '';
        url.search = '?company=' + encodeURIComponent(id);
        const link = url.toString();

        const done = () => toast('Ссылка скопирована');
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(link).then(done).catch(() => fallbackCopy(link, done));
        } else {
            fallbackCopy(link, done);
        }
    }

    function fallbackCopy(text, onSuccess) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            onSuccess();
        } catch (e) {
            toast('Не удалось скопировать');
        }
        ta.remove();
    }

    /* ----------------------------------------------------------------------
       Modal
       ---------------------------------------------------------------------- */

    const BLOCK_LABEL = {
        not_started: 'Не начато',
        in_progress: 'В работе',
        completed:   'Завершено',
    };
    const BLOCK_TO_PILL_STATUS = {
        not_started: 'planned',
        in_progress: 'in_progress',
        completed:   'completed',
    };
    const BLOCK_ICON = {
        completed:   '✓',
        in_progress: '⟳',
        not_started: '○',
    };
    const PROGRESS_BLOCKS = [
        { key: 'HR',       label: 'HR' },
        { key: 'IT',       label: 'IT' },
        { key: 'finance',  label: 'Финансы' },
        { key: 'legal',    label: 'Юридический' },
        { key: 'security', label: 'Безопасность' },
    ];

    function detailRow(label, value, opts) {
        opts = opts || {};
        const isEmpty = value === '' || value == null;
        const cls = isEmpty ? ' class="is-empty"' : '';
        const text = isEmpty ? (opts.empty || '—') : value;
        const ddInner = opts.html ? text : escapeHtml(text);
        return `<dt>${escapeHtml(label)}</dt><dd${cls}>${ddInner}</dd>`;
    }

    function renderLegalPanel(c) {
        const panel = document.querySelector('.modal__panel[data-panel="legal"]');
        const websiteHtml = c.website
            ? `<a href="${escapeHtml(c.website)}" target="_blank" rel="noopener">${escapeHtml(c.website)}</a>`
            : '<span class="is-empty">—</span>';
        const sizeBucket = sizeOf(c.employees);
        const sizeText = c.employees
            ? `${formatEmployees(c.employees)} (${SIZE_LABEL[sizeBucket]})`
            : '';

        panel.innerHTML = `
            <dl class="detail-list">
                ${detailRow('ИНН', c.inn)}
                ${detailRow('ОГРН', c.ogrn)}
                ${detailRow('Год основания', c.yearFounded || '')}
                ${detailRow('Юр. адрес', c.legalAddress)}
                <dt>Сайт</dt><dd>${websiteHtml}</dd>
                ${detailRow('Отрасль', c.industry)}
                ${detailRow('Регион', c.region)}
                ${detailRow('Размер штата', sizeText)}
            </dl>
        `;
    }

    function renderContactsPanel(c) {
        const panel = document.querySelector('.modal__panel[data-panel="contacts"]');
        panel.innerHTML = `
            <dl class="detail-list">
                ${detailRow('Генеральный директор', c.ceo)}
                ${detailRow('Главный бухгалтер', c.cfo)}
                ${detailRow('Ответственный за интеграцию', c.integrationLead)}
            </dl>
        `;
    }

    function renderSystemsPanel(c) {
        const panel = document.querySelector('.modal__panel[data-panel="systems"]');
        const cell = (val) => {
            const v = String(val || '').trim();
            if (!v || v === '—' || v === '-') {
                return '<span class="is-empty">Не используется</span>';
            }
            return escapeHtml(v);
        };
        panel.innerHTML = `
            <dl class="detail-list">
                <dt>ERP</dt><dd>${cell(c.erp)}</dd>
                <dt>HR-система</dt><dd>${cell(c.hrSystem)}</dd>
                <dt>CRM</dt><dd>${cell(c.crm)}</dd>
                <dt>Корпоративная почта</dt><dd>${cell(c.mail)}</dd>
                <dt>BI-платформа</dt><dd>${cell(c.bi)}</dd>
            </dl>
        `;
    }

    function renderProgressPanel(c) {
        const panel = document.querySelector('.modal__panel[data-panel="progress"]');
        panel.innerHTML = `
            <div class="progress-list">
                ${PROGRESS_BLOCKS.map(b => {
                    const s = c.progress[b.key] || 'not_started';
                    const pillStatus = BLOCK_TO_PILL_STATUS[s] || 'planned';
                    const label = BLOCK_LABEL[s] || s;
                    const icon = BLOCK_ICON[s] || '';
                    return `
                        <div class="progress-list__row">
                            <span class="progress-list__name">
                                <span class="progress-list__icon" aria-hidden="true">${icon}</span>
                                ${escapeHtml(b.label)}
                            </span>
                            <span class="status-pill" data-status="${pillStatus}">${escapeHtml(label)}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    function setActiveTab(name) {
        state.activeTab = name;
        $$('.modal__tab').forEach(tab => {
            const isActive = tab.dataset.tab === name;
            tab.classList.toggle('is-active', isActive);
            tab.setAttribute('aria-selected', String(isActive));
        });
        $$('.modal__panel').forEach(panel => {
            panel.hidden = panel.dataset.panel !== name;
        });
    }

    function openModal(id) {
        const c = state.all.find(x => x.id === id);
        if (!c) return;

        lastFocusBeforeModal = document.activeElement;
        state.openCompanyId = id;

        // Заголовок
        $('[data-modal-short-name]').textContent = c.shortName;
        $('[data-modal-full-name]').textContent = fullName(c);
        const status = $('[data-modal-status]');
        status.textContent = statusLabel(c.integrationStatus);
        status.dataset.status = c.integrationStatus;

        // Панели
        renderLegalPanel(c);
        renderContactsPanel(c);
        renderSystemsPanel(c);
        renderProgressPanel(c);

        // На первый таб
        setActiveTab('legal');

        // Открыть
        const modal = $('[data-modal]');
        modal.hidden = false;
        document.body.classList.add('is-modal-open');

        const closeBtn = modal.querySelector('.modal__close');
        if (closeBtn) closeBtn.focus();

        writeURL();
    }

    function closeModal() {
        const modal = $('[data-modal]');
        if (!modal || modal.hidden) return;
        modal.hidden = true;
        document.body.classList.remove('is-modal-open');
        state.openCompanyId = null;

        if (lastFocusBeforeModal && typeof lastFocusBeforeModal.focus === 'function') {
            try { lastFocusBeforeModal.focus(); } catch (e) { /* noop */ }
        }
        lastFocusBeforeModal = null;

        writeURL();
    }

    function bindModalEvents() {
        const modal = $('[data-modal]');
        if (!modal) return;

        // Закрытие: × и backdrop
        modal.addEventListener('click', function (e) {
            if (e.target.closest('[data-modal-close]')) {
                closeModal();
            }
        });

        // Табы
        $$('.modal__tab').forEach(tab => {
            tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
        });

        // Кнопка «Скопировать ссылку»
        const shareBtn = $('[data-modal-share]');
        if (shareBtn) {
            shareBtn.addEventListener('click', function () {
                if (state.openCompanyId) shareCompanyLink(state.openCompanyId);
            });
        }

        // Escape
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !modal.hidden) {
                closeModal();
            }
        });
    }

    /* ----------------------------------------------------------------------
       Event bindings
       ---------------------------------------------------------------------- */

    const onSearchInput = debounce(function () {
        const input = $('#catalog-search-input');
        state.search = input ? input.value : '';
        applyFilters();
    }, SEARCH_DEBOUNCE);

    function bindControlEvents() {
        // Поиск
        const search = $('#catalog-search-input');
        if (search) search.addEventListener('input', onSearchInput);

        // Фильтры (делегированно)
        document.addEventListener('change', function (e) {
            const cb = e.target.closest('.filter-option input[type="checkbox"]');
            if (!cb) return;
            const name = cb.dataset.filterName;
            const value = cb.value;
            if (cb.checked) state.filters[name].add(value);
            else state.filters[name].delete(value);
            applyFilters();
        });

        // Сортировка
        const sortSelect = $('[data-sort]');
        if (sortSelect) {
            sortSelect.addEventListener('change', function () {
                state.sort = this.value;
                applyFilters();
            });
        }

        // Сброс
        const resetBtn = $('[data-filter-reset]');
        if (resetBtn) resetBtn.addEventListener('click', resetFilters);

        // Закрытие <details> при клике вне него
        document.addEventListener('click', function (e) {
            $$('.filter-dropdown[open]').forEach(d => {
                if (!d.contains(e.target)) d.removeAttribute('open');
            });
        });

        // Esc — закрыть открытые dropdown'ы
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                $$('.filter-dropdown[open]').forEach(d => d.removeAttribute('open'));
            }
        });
    }

    function bindGridEvents() {
        const grid = $('[data-view-grid]');
        if (!grid) return;

        grid.addEventListener('click', function (e) {
            const shareBtn = e.target.closest('[data-share]');
            if (shareBtn) {
                e.stopPropagation();
                shareCompanyLink(shareBtn.dataset.share);
                return;
            }

            const card = e.target.closest('.company-card');
            if (card && card.dataset.id) {
                openModal(card.dataset.id);
            }
        });

        grid.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const card = e.target.closest('.company-card');
            if (card && card.dataset.id) {
                e.preventDefault();
                openModal(card.dataset.id);
            }
        });
    }

    function bindTableEvents() {
        // Сортировка по клику на заголовок
        $$('th[data-sort-key]').forEach(th => {
            th.addEventListener('click', function () {
                const headerKey = th.dataset.sortKey;
                const prefix = HEADER_TO_SORT_PREFIX[headerKey];
                if (!prefix) return;

                const [currentPrefix, currentDir] = state.sort.split('_');
                const newDir = (currentPrefix === prefix && currentDir === 'asc') ? 'desc' : 'asc';
                state.sort = prefix + '_' + newDir;

                // Синхронизация с dropdown'ом, если он содержит этот вариант
                const sortSelect = $('[data-sort]');
                if (sortSelect) {
                    const has = Array.from(sortSelect.options).some(o => o.value === state.sort);
                    sortSelect.value = has ? state.sort : '';
                }

                applyFilters();
            });
        });

        // Клик по строке — на этапе 7 откроет модалку
        const tbody = $('[data-table-body]');
        if (tbody) {
            tbody.addEventListener('click', function (e) {
                const tr = e.target.closest('tr[data-id]');
                if (tr) {
                    openModal(tr.dataset.id);
                }
            });
            tbody.addEventListener('keydown', function (e) {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                const tr = e.target.closest('tr[data-id]');
                if (tr) {
                    e.preventDefault();
                    openModal(tr.dataset.id);
                }
            });
        }
    }

    function bindViewToggle() {
        $$('.view-toggle__btn[data-view]').forEach(btn => {
            btn.addEventListener('click', () => setView(btn.dataset.view));
        });
    }

    /* ----------------------------------------------------------------------
       Error / loading
       ---------------------------------------------------------------------- */

    function showError(err) {
        console.error('[companies]', err);
        const grid = $('[data-view-grid]');
        const errBox = $('[data-state-error]');
        if (grid) grid.innerHTML = '';
        if (errBox) errBox.hidden = false;
    }

    /* ----------------------------------------------------------------------
       Init
       ---------------------------------------------------------------------- */

    async function init() {
        bindGridEvents();
        bindTableEvents();
        bindViewToggle();
        bindControlEvents();
        bindModalEvents();
        try {
            const items = await loadCompanies();
            state.all = items;

            populateFilters();   // строит чекбоксы из state.all
            readURL();           // парсит query-параметры в state
            syncUIFromState();   // выставляет чекбоксы/инпут/select/кнопки режима
            applyFilters();      // фильтрует, рендерит, пишет URL

            // Авто-открытие модалки, если задан ?company=ID
            if (state.openCompanyId) {
                const exists = state.all.some(c => c.id === state.openCompanyId);
                if (exists) {
                    openModal(state.openCompanyId);
                } else {
                    state.openCompanyId = null;
                    writeURL();
                }
            }
        } catch (err) {
            showError(err);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
