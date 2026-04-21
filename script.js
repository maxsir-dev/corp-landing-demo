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

    /* --- BOOT --------------------------------------------- */
    document.addEventListener("DOMContentLoaded", async () => {
        initScrollReveal();   // навешиваем наблюдателей заранее
        initAccess();
        await runLoading();
        await runHero();
    });
})();
