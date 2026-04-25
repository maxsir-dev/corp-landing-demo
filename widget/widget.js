(()=>{(function(){"use strict";if(window.__INTEGRATION_BOT_LOADED__)return;window.__INTEGRATION_BOT_LOADED__=!0;let u=document.currentScript,w=function(){let o=u&&u.dataset&&u.dataset.backendUrl;if(o)return o.replace(/\/+$/,"");if(u&&u.src)try{return new URL(u.src).origin}catch{}return""}(),x="integration_bot_session_id";function v(){let o=null;try{o=localStorage.getItem(x)}catch{}if(!o){o=window.crypto&&crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now().toString(36);try{localStorage.setItem(x,o)}catch{}}return o}async function k(o){let l={session_id:v(),text:o.text==null?null:String(o.text),action:o.action==null?null:String(o.action)},a=await fetch(w+"/api/chat/message",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l)});if(!a.ok)throw new Error("HTTP "+a.status);return a.json()}let E=`
:host {
  all: initial;
  display: block;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.45;
  color: #111827;
}
*, *::before, *::after { box-sizing: border-box; }

.bot-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #1E3A8A;
  color: white;
  border: none;
  box-shadow: 0 6px 20px rgba(30, 58, 138, 0.35);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  z-index: 2147483000;
}
.bot-fab:hover { transform: scale(1.06); box-shadow: 0 8px 24px rgba(30, 58, 138, 0.45); }
.bot-fab:focus-visible { outline: 3px solid #93C5FD; outline-offset: 2px; }
.bot-fab.hidden { display: none; }

.bot-window {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 380px;
  height: 560px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 48px);
  background: white;
  border-radius: 14px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  opacity: 0;
  transform: translateY(16px) scale(0.98);
  pointer-events: none;
  transition: opacity 0.18s ease, transform 0.18s ease;
  z-index: 2147483000;
}
.bot-window.open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}
@media (max-width: 480px) {
  .bot-window {
    top: 0; left: 0; right: 0; bottom: 0;
    width: 100vw; height: 100vh;
    max-width: 100vw; max-height: 100vh;
    border-radius: 0;
  }
}

.bot-header {
  background: #1E3A8A;
  color: white;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}
.bot-title { display: flex; flex-direction: column; line-height: 1.15; }
.bot-title-name { font-weight: 600; font-size: 15px; }
.bot-title-sub { font-size: 12px; opacity: 0.8; margin-top: 2px; }
.bot-close {
  background: transparent;
  border: none;
  color: white;
  width: 32px; height: 32px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
  display: flex; align-items: center; justify-content: center;
}
.bot-close:hover { background: rgba(255, 255, 255, 0.15); }

.bot-messages {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  background: #F9FAFB;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.bot-msg {
  max-width: 88%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.45;
  word-wrap: break-word;
  white-space: pre-wrap;
}
.bot-msg.bot {
  background: #F3F4F6;
  color: #111827;
  align-self: flex-start;
  border-bottom-left-radius: 4px;
}
.bot-msg.user {
  background: #1E3A8A;
  color: white;
  align-self: flex-end;
  border-bottom-right-radius: 4px;
}
.bot-msg.typing {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 10px 14px;
}
.bot-msg.typing span {
  width: 6px; height: 6px; border-radius: 50%;
  background: #9CA3AF;
  animation: bot-blink 1.2s infinite ease-in-out;
}
.bot-msg.typing span:nth-child(2) { animation-delay: 0.15s; }
.bot-msg.typing span:nth-child(3) { animation-delay: 0.3s; }
@keyframes bot-blink {
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
}

.bot-quick-buttons {
  padding: 8px 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  border-top: 1px solid #E5E7EB;
  background: white;
  max-height: 40%;
  overflow-y: auto;
  flex-shrink: 0;
}
.bot-quick-buttons:empty { display: none; }
.btn {
  background: white;
  border: 1px solid #C7D2FE;
  color: #1E3A8A;
  border-radius: 18px;
  padding: 6px 12px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease;
}
.btn:hover { background: #EEF2FF; border-color: #1E3A8A; }
.btn:focus-visible { outline: 2px solid #1E3A8A; outline-offset: 2px; }
.btn.primary { background: #1E3A8A; color: white; border-color: #1E3A8A; }
.btn.primary:hover { background: #1E40AF; }
.btn.chip.selected { background: #1E3A8A; color: white; border-color: #1E3A8A; }

.bot-form {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border-top: 1px solid #E5E7EB;
  background: white;
  flex-shrink: 0;
}
.bot-form.hidden { display: none; }
.bot-input {
  flex: 1;
  border: 1px solid #D1D5DB;
  border-radius: 18px;
  padding: 8px 14px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  color: #111827;
  background: #F9FAFB;
}
.bot-input:focus { border-color: #1E3A8A; background: white; }
.bot-send {
  background: #1E3A8A;
  border: none;
  color: white;
  width: 36px; height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: background 0.12s ease;
}
.bot-send:hover { background: #1E40AF; }
.bot-send:disabled { opacity: 0.5; cursor: not-allowed; }
`,A=`
<button class="bot-fab" aria-label="Открыть чат команды интеграции" aria-expanded="false">
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
  </svg>
</button>
<div class="bot-window" role="dialog" aria-label="Чат команды интеграции">
  <header class="bot-header">
    <div class="bot-title">
      <span class="bot-title-name">Бот интеграции</span>
      <span class="bot-title-sub">Помощь по проектам и заявкам</span>
    </div>
    <button class="bot-close" aria-label="Закрыть чат">×</button>
  </header>
  <div class="bot-messages" aria-live="polite"></div>
  <div class="bot-quick-buttons"></div>
  <form class="bot-form" autocomplete="off">
    <input class="bot-input" type="text" placeholder="Введите сообщение…" aria-label="Сообщение" />
    <button class="bot-send" type="submit" aria-label="Отправить">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
      </svg>
    </button>
  </form>
</div>
`;function m(){let o=document.createElement("div");o.id="integration-bot-widget-host",o.style.cssText="all: initial; position: fixed; inset: auto 0 0 auto; width: 0; height: 0; z-index: 2147483000;";let l=o.attachShadow({mode:"open"});l.innerHTML=`<style>${E}</style>${A}`,document.body.appendChild(o);let a=t=>l.querySelector(t),e={fab:a(".bot-fab"),win:a(".bot-window"),closeBtn:a(".bot-close"),msgs:a(".bot-messages"),quickBtns:a(".bot-quick-buttons"),form:a(".bot-form"),input:a(".bot-input"),sendBtn:a(".bot-send")},r={opened:!1,loading:!1,multiSelection:new Set};function b(t,n){let i=document.createElement("div");i.className="bot-msg "+t,i.textContent=n,e.msgs.appendChild(i),e.msgs.scrollTop=e.msgs.scrollHeight}function S(){h();let t=document.createElement("div");t.className="bot-msg bot typing",t.dataset.typing="1",t.innerHTML="<span></span><span></span><span></span>",e.msgs.appendChild(t),e.msgs.scrollTop=e.msgs.scrollHeight}function h(){let t=l.querySelector(".bot-msg.typing");t&&t.remove()}async function f(t){if(!r.loading){r.loading=!0,e.sendBtn.disabled=!0,S();try{let n=await k(t);h(),T(n)}catch{h(),b("bot","⚠️ Ошибка соединения с сервером. Попробуйте позже.")}finally{r.loading=!1,e.sendBtn.disabled=!1}}}function g(t,n,i){let s=document.createElement("button");return s.type="button",s.className="btn"+(i?" "+i:""),s.textContent=t,n&&s.addEventListener("click",n),s}function _(t){e.quickBtns.innerHTML="",r.multiSelection.clear();let n=t.scenario_state||{},i=n.input_type,s=Array.isArray(n.options)?n.options:null;if(i==="select"&&s)for(let d of s)e.quickBtns.appendChild(g(d,()=>{b("user",d),f({text:d})}));else if(i==="multi_select"&&s){for(let c of s){let p=g(c,null,"chip");p.addEventListener("click",()=>{r.multiSelection.has(c)?(r.multiSelection.delete(c),p.classList.remove("selected")):(r.multiSelection.add(c),p.classList.add("selected"))}),e.quickBtns.appendChild(p)}let d=g("Отправить выбранное",()=>{let c=[...r.multiSelection];if(c.length===0){b("bot","Выберите хотя бы один вариант.");return}let p=c.join(", ");b("user",p),f({text:p})},"primary");e.quickBtns.appendChild(d)}if(Array.isArray(t.buttons))for(let d of t.buttons)e.quickBtns.appendChild(g(d.label,()=>f({action:d.action})))}function B(t){let i=(t.scenario_state||{}).input_type,s=!t.expects_input||i==="select"||i==="multi_select";e.form.classList.toggle("hidden",s),s||(e.input.type=i==="number"?"number":"text",e.input.placeholder=i==="textarea"?"Напишите сообщение и нажмите Enter":"Введите сообщение…",setTimeout(()=>e.input.focus(),60))}function T(t){t.reply&&b("bot",t.reply),_(t),B(t)}function y(t){t===void 0&&(t=!r.opened),t!==r.opened&&(r.opened=t,e.win.classList.toggle("open",t),e.fab.setAttribute("aria-expanded",String(t)),t&&e.msgs.children.length===0&&f({action:"start"}))}e.fab.addEventListener("click",()=>y()),e.closeBtn.addEventListener("click",()=>y(!1)),e.form.addEventListener("submit",t=>{t.preventDefault();let n=e.input.value.trim();n&&(b("user",n),e.input.value="",f({text:n}))})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",m):m()})();})();
