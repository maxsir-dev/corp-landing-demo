/* =========================================================
   ДОСЬЕ: МТС — базовая интерактивность
   Шаг 4: typewriter, scroll-reveal, раскрытие архива
   ========================================================= */

(function () {
    "use strict";

    const $  = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    /* --- Typewriter --------------------------------------- */
    function typewriter(el, text, speed = 55) {
        return new Promise((resolve) => {
            el.textContent = "";
            el.classList.add("is-typing");
            let i = 0;
            (function tick() {
                el.textContent = text.slice(0, ++i);
                if (i < text.length) {
                    setTimeout(tick, speed);
                } else {
                    el.classList.remove("is-typing");
                    resolve();
                }
            })();
        });
    }

    /* --- 1. LOADING SCREEN -------------------------------- */
    async function runLoading() {
        const loading = $("#loading");
        if (!loading) return;
        // CSS-анимация прогресс-бара = 2.4s
        await wait(2600);
        loading.style.transition = "opacity 0.6s ease";
        loading.style.opacity = "0";
        await wait(600);
        loading.hidden = true;
    }

    /* --- 2. HERO TITLE TYPEWRITER ------------------------- */
    async function runHero() {
        const title = $(".hero__title");
        if (!title) return;
        const original = title.textContent.trim();
        title.classList.remove("glitch");
        await typewriter(title, original, 90);
        // возвращаем глитч после окончания набора
        await wait(300);
        title.classList.add("glitch");
    }

    /* --- 3. SCROLL REVEAL --------------------------------- */
    function initScrollReveal() {
        // Карточки досье — плавное появление
        const fadeItems = $$(".dossier");
        const fadeIO = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    fadeIO.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });
        fadeItems.forEach((el) => fadeIO.observe(el));

        // Заголовки секций — typewriter при появлении
        const typeItems = $$(".section__title, .final__title");
        const typeIO = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const text = el.dataset.text || el.textContent.trim();
                    el.dataset.text = text;
                    typewriter(el, text, 45);
                    typeIO.unobserve(el);
                }
            });
        }, { threshold: 0.5 });
        typeItems.forEach((el) => {
            // сохраняем оригинальный текст и обнуляем, чтобы не было мелькания
            el.dataset.text = el.textContent.trim();
            el.textContent = "";
            typeIO.observe(el);
        });
    }

    /* --- 4. ACCESS BUTTON --------------------------------- */
    function initAccess() {
        const btn = $("#access-btn");
        if (!btn) return;
        btn.addEventListener("click", () => {
            ["#timeline", "#terminal", "#final"].forEach((sel) => {
                const s = $(sel);
                if (s) s.hidden = false;
            });
            btn.disabled = true;
            btn.textContent = "ДОСТУП ПРЕДОСТАВЛЕН";
            // дать DOM обновиться, затем плавно проскроллить к архиву
            requestAnimationFrame(() => {
                const target = $("#timeline");
                if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });
    }

    /* --- 5. TERMINAL -------------------------------------- */
    const ERAS = {
        "1993": {
            title: "1993 — 2000 · ЗАРОЖДЕНИЕ",
            anchor: "#era-1993",
            lines: [
                "28.10.1993 — регистрация АО «Мобильные ТелеСистемы».",
                "Учредители: МГТС (50%), Siemens, DeTeMobil.",
                "1994 — первая абонентская сеть GSM-900 в Москве.",
                "2000 — выход на Нью-Йоркскую биржу (NYSE: MBT).",
                "",
                "ПРИМЕЧАНИЕ: связь контролируема.",
                "Абонентская база — стратегический ресурс.",
            ],
        },
        "2000": {
            title: "2000 — 2010 · ЭКСПАНСИЯ",
            anchor: "#era-2000",
            lines: [
                "2002 — выход в Украину, Узбекистан, Туркменистан.",
                "2004 — единый бренд МТС, красно-белое «яйцо».",
                "2008 — 100 млн абонентов в СНГ.",
                "",
                "ПРИМЕЧАНИЕ: красный квадрат виден из космоса.",
            ],
        },
        "2010": {
            title: "2010 — 2020 · ЦИФРОВИЗАЦИЯ",
            anchor: "#era-2010",
            lines: [
                "2012 — запуск LTE. Старт «МТС Банк».",
                "2015 — развитие розницы, «МТС ТВ».",
                "2019 — стратегия CLTV: от оператора к экосистеме.",
                "",
                "ПРИМЕЧАНИЕ: объект более не является только оператором связи.",
            ],
        },
        "2020": {
            title: "2020 — н.в. · ЭКОСИСТЕМА",
            anchor: "#era-2020",
            lines: [
                "2020 — пилот 5G в Москве.",
                "2022 — ребрендинг: красный квадрат как единый знак.",
                "2024+ — MTS AI, облака, финтех, медиа.",
                "",
                "ПРИМЕЧАНИЕ: объект вышел за пределы наблюдения.",
            ],
        },
    };

    function initTerminal() {
        const out    = $("#terminal-output");
        const input  = $("#terminal-input");
        const window_ = $("#terminal-window");
        const section = $("#terminal");
        if (!out || !input || !section) return;

        const history = [];
        let historyIdx = -1;

        const print = (text = "", cls = "") => {
            const p = document.createElement("p");
            p.className = "terminal__line" + (cls ? " terminal__line--" + cls : "");
            p.textContent = text;
            out.appendChild(p);
            out.scrollTop = out.scrollHeight;
            return p;
        };

        const echo = (cmd) => {
            const p = document.createElement("p");
            p.className = "terminal__line";
            p.innerHTML = '<span class="terminal__prompt">archive@mts:~$</span> ' +
                          '<span class="terminal__line--user"></span>';
            p.querySelector(".terminal__line--user").textContent = cmd;
            out.appendChild(p);
            out.scrollTop = out.scrollHeight;
        };

        const setInputEnabled = (on) => {
            input.disabled = !on;
            if (on) input.focus();
        };

        /* --- команды ---------------------------------------- */
        const cmdHelp = () => {
            print("ДОСТУПНЫЕ КОМАНДЫ:", "sys");
            print("  help              — список команд", "ok");
            print("  history           — перечень рассекреченных файлов", "ok");
            print("  open <год>        — открыть файл эпохи", "ok");
            print("                      (1993 | 2000 | 2010 | 2020)", "ok");
            print("  decrypt           — запустить расшифровку пакета", "ok");
            print("  clear             — очистить буфер вывода", "ok");
            print("  whoami            — данные оператора", "ok");
        };

        const cmdHistory = () => {
            print("ИНДЕКС АРХИВА  /var/archive/mts/", "sys");
            print("---------------------------------------------", "sys");
            print("FILE 01  1993-2000  [ЗАРОЖДЕНИЕ]      8.4 МБ  RED");
            print("FILE 02  2000-2010  [ЭКСПАНСИЯ]     14.7 МБ  RED");
            print("FILE 03  2010-2020  [ЦИФРОВИЗАЦИЯ]  22.1 МБ  RED");
            print("FILE 04  2020-      [ЭКОСИСТЕМА]    31.9 МБ  RED");
            print("---------------------------------------------", "sys");
            print("4 файла.  Всего: 77.1 МБ", "sys");
        };

        const cmdWhoami = () => {
            print("оператор:       UNKNOWN", "user");
            print("сеанс:          " + new Date().toISOString(), "user");
            print("уровень:        3 / 5", "user");
            print("IP-адрес:       [СКРЫТО]", "user");
            print("статус слежки:  АКТИВНО", "err");
        };

        const cmdClear = () => { out.innerHTML = ""; };

        const cmdOpen = (arg) => {
            if (!arg) {
                print("ОШИБКА: укажите год. Пример: open 1993", "err");
                return;
            }
            const era = ERAS[arg];
            if (!era) {
                print('ОШИБКА: файл "' + arg + '" не найден в архиве.', "err");
                print("Доступные: 1993, 2000, 2010, 2020", "sys");
                return;
            }
            print("> ОТКРЫТИЕ ФАЙЛА: " + era.title, "ok");
            print("---", "sys");
            era.lines.forEach((l) => print(l));
            print("---", "sys");
            // одновременно скроллим к соответствующей секции на странице
            const sec = $(era.anchor);
            if (sec) {
                setTimeout(() => sec.scrollIntoView({ behavior: "smooth", block: "center" }), 350);
            }
        };

        const cmdDecrypt = async () => {
            setInputEnabled(false);
            const stages = [
                ["sys", "[*] Инициализация защищённого канала..."],
                ["sys", "[*] Поиск узлов обмена ключами..."],
                ["ok",  "[OK] Узел 1 (moscow-01) подтверждён"],
                ["ok",  "[OK] Узел 2 (spb-03) подтверждён"],
                ["ok",  "[OK] Узел 3 (kzn-07) подтверждён"],
                ["sys", "[*] Расшифровка пакета..."],
            ];
            for (const [t, m] of stages) {
                print(m, t);
                await wait(320);
            }

            // ASCII-прогрессбар
            const line = print("", "ok");
            const total = 24;
            for (let i = 1; i <= total; i++) {
                const bar = "█".repeat(i) + "░".repeat(total - i);
                line.textContent = "[" + bar + "] " + Math.round((i / total) * 100) + "%";
                out.scrollTop = out.scrollHeight;
                await wait(70);
            }

            await wait(250);
            print("");
            print(">>> СООБЩЕНИЕ РАСШИФРОВАНО <<<", "err");
            print('"В КРАСНОМ КВАДРАТЕ — ВСЯ СТРАНА."', "err");
            print("— источник: архив стратегии CLTV, 2019", "sys");
            setInputEnabled(true);
        };

        /* --- диспетчер -------------------------------------- */
        function handle(raw) {
            const line = raw.trim();
            if (!line) return;
            echo(line);
            const [cmd, ...rest] = line.split(/\s+/);
            switch (cmd.toLowerCase()) {
                case "help":    return cmdHelp();
                case "history": return cmdHistory();
                case "whoami":  return cmdWhoami();
                case "clear":   return cmdClear();
                case "open":    return cmdOpen(rest[0]);
                case "decrypt": return cmdDecrypt();
                default:
                    print('Неизвестная команда: "' + cmd + '". Введите help.', "err");
            }
        }

        /* --- ввод ------------------------------------------- */
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                const v = input.value;
                input.value = "";
                if (v.trim()) {
                    history.push(v);
                    if (history.length > 50) history.shift();
                }
                historyIdx = -1;
                handle(v);
            } else if (e.key === "ArrowUp") {
                if (history.length && historyIdx < history.length - 1) {
                    historyIdx++;
                    input.value = history[history.length - 1 - historyIdx];
                }
                e.preventDefault();
            } else if (e.key === "ArrowDown") {
                if (historyIdx > 0) {
                    historyIdx--;
                    input.value = history[history.length - 1 - historyIdx];
                } else {
                    historyIdx = -1;
                    input.value = "";
                }
                e.preventDefault();
            }
        });

        // клик в любом месте окна терминала — фокус на ввод
        window_.addEventListener("click", () => input.focus());

        // автофокус, когда терминал появляется на экране
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) input.focus();
            });
        }, { threshold: 0.4 });
        io.observe(section);
    }

    /* --- 6. WIPE (УДАЛИТЬ СЛЕДЫ) -------------------------- */
    function initWipe() {
        const btn = $("#wipe-btn");
        if (!btn) return;

        btn.addEventListener("click", async () => {
            btn.disabled = true;

            // Оверлей
            const overlay = document.createElement("div");
            overlay.className = "wipe-overlay";
            overlay.innerHTML = [
                '<div class="wipe-overlay__title">УДАЛЕНИЕ СЕАНСА...</div>',
                '<div class="wipe-overlay__log" role="log"></div>',
                '<div class="wipe-overlay__final">СЛЕДОВ НЕ ОБНАРУЖЕНО.</div>',
                '<div class="wipe-overlay__signoff">// сессия завершена · архив опечатан</div>',
            ].join("");
            document.body.appendChild(overlay);

            const log   = overlay.querySelector(".wipe-overlay__log");
            const final_ = overlay.querySelector(".wipe-overlay__final");
            const app   = $("#app");

            // Корраптим фон и показываем оверлей
            if (app) app.classList.add("is-corrupted");
            await wait(30);
            overlay.classList.add("is-active");

            // Лог удалений
            const targets = [
                "/var/archive/mts/1993.log",
                "/var/archive/mts/2000.log",
                "/var/archive/mts/2010.log",
                "/var/archive/mts/2020.log",
                "/tmp/session.cookie",
                "/tmp/ip.trace",
                "/tmp/agent.fingerprint",
                "/var/log/audit/session.log",
            ];
            for (const path of targets) {
                const p = document.createElement("p");
                p.className = "rm";
                p.textContent = "[rm -f] " + path;
                log.appendChild(p);
                await wait(180);
            }

            // Подтверждение
            await wait(300);
            const ok = document.createElement("p");
            ok.className = "ok";
            ok.textContent = "[OK] 8 файлов удалено · 0 следов";
            log.appendChild(ok);

            // Успокаиваем экран, запечатываем оверлей, показываем финал
            await wait(500);
            if (app) app.classList.remove("is-corrupted");
            overlay.classList.add("is-sealed");
            final_.classList.add("is-shown");
        });
    }

    /* --- BOOT --------------------------------------------- */
    document.addEventListener("DOMContentLoaded", async () => {
        initScrollReveal();   // навешиваем наблюдателей заранее
        initAccess();
        initTerminal();
        initWipe();
        await runLoading();
        await runHero();
    });
})();
