/* ==========================================================================
   Интеграция дочерних компаний — корпоративный портал
   script.js
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    initBurger();
    initProjectFilter();
    initOtherProjectsToggle();
});

/* --------------------------------------------------------------------------
   Мобильное меню (бургер)
   -------------------------------------------------------------------------- */
function initBurger() {
    const burger = document.querySelector(".site-header__burger");
    const nav = document.querySelector(".site-nav");
    if (!burger || !nav) return;

    const close = () => {
        nav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
    };

    burger.addEventListener("click", () => {
        const isOpen = nav.classList.toggle("is-open");
        burger.setAttribute("aria-expanded", String(isOpen));
    });

    nav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", close);
    });
}

/* --------------------------------------------------------------------------
   Фильтр активных проектов
   -------------------------------------------------------------------------- */
function initProjectFilter() {
    const buttons = document.querySelectorAll(".filters__btn");
    const cards = document.querySelectorAll(".project-card");
    if (!buttons.length || !cards.length) return;

    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const filter = btn.dataset.filter;

            buttons.forEach((b) => {
                const active = b === btn;
                b.classList.toggle("is-active", active);
                b.setAttribute("aria-selected", String(active));
            });

            cards.forEach((card) => {
                const match = filter === "all" || card.dataset.status === filter;
                card.classList.toggle("is-hidden", !match);
            });
        });
    });
}

/* --------------------------------------------------------------------------
   Раскрытие списка "Другие проекты"
   -------------------------------------------------------------------------- */
function initOtherProjectsToggle() {
    const grid = document.querySelector(".other-grid");
    const button = document.querySelector(".other-projects__more .btn");
    if (!grid || !button) return;

    const VISIBLE = 4;
    const cards = Array.from(grid.children);
    if (cards.length <= VISIBLE) {
        button.parentElement.style.display = "none";
        return;
    }

    const collapse = () => {
        cards.forEach((card, i) => {
            card.classList.toggle("is-hidden", i >= VISIBLE);
        });
        button.textContent = "Показать все";
    };

    const expand = () => {
        cards.forEach((card) => card.classList.remove("is-hidden"));
        button.textContent = "Свернуть";
    };

    collapse();

    button.addEventListener("click", () => {
        const collapsed = cards.some((c) => c.classList.contains("is-hidden"));
        if (collapsed) expand(); else collapse();
    });
}
