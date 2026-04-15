
(function() {
'use strict';
if (typeof window !== 'undefined' && window.Nuntaria) {
	return;
}

var __NuntariaBundle__ = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __accessCheck = (obj, member, msg) => {
    if (!member.has(obj))
      throw TypeError("Cannot " + msg);
  };
  var __privateGet = (obj, member, getter) => {
    __accessCheck(obj, member, "read from private field");
    return getter ? getter.call(obj) : member.get(obj);
  };
  var __privateAdd = (obj, member, value) => {
    if (member.has(obj))
      throw TypeError("Cannot add the same private member more than once");
    member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  };
  var __privateSet = (obj, member, value, setter) => {
    __accessCheck(obj, member, "write to private field");
    setter ? setter.call(obj, value) : member.set(obj, value);
    return value;
  };
  var __privateMethod = (obj, member, method) => {
    __accessCheck(obj, member, "access private method");
    return method;
  };

  // src/nuntaria.js
  var nuntaria_exports = {};
  __export(nuntaria_exports, {
    Nuntaria: () => Nuntaria,
    default: () => nuntaria_default2
  });

  // src/utils/pointer.js
  var Pointer = {
    x: -1,
    y: -1,
    _ready: false,
    init() {
      if (this._ready)
        return;
      this._ready = true;
      document.addEventListener("pointermove", (e) => {
        this.x = e.clientX;
        this.y = e.clientY;
      }, { passive: true });
    },
    isOver(el) {
      if (this.x < 0)
        return null;
      return el.contains(document.elementFromPoint(this.x, this.y));
    }
  };

  // src/utils/timer.js
  var _duration, _remaining, _deadline, _rafId, _onTick, _onDone, _running, _tick;
  var Timer = class {
    constructor({ duration, onTick, onDone }) {
      __privateAdd(this, _duration, void 0);
      __privateAdd(this, _remaining, void 0);
      __privateAdd(this, _deadline, void 0);
      __privateAdd(this, _rafId, null);
      __privateAdd(this, _onTick, void 0);
      __privateAdd(this, _onDone, void 0);
      __privateAdd(this, _running, false);
      __privateAdd(this, _tick, () => {
        const left = Math.max(0, __privateGet(this, _deadline) - Date.now());
        const progress = left / __privateGet(this, _duration);
        __privateGet(this, _onTick).call(this, progress);
        if (left <= 0) {
          __privateSet(this, _running, false);
          __privateGet(this, _onDone).call(this);
          return;
        }
        __privateSet(this, _rafId, requestAnimationFrame(__privateGet(this, _tick)));
      });
      __privateSet(this, _duration, duration);
      __privateSet(this, _remaining, duration);
      __privateSet(this, _onTick, onTick);
      __privateSet(this, _onDone, onDone);
    }
    start() {
      if (__privateGet(this, _running))
        return;
      __privateSet(this, _running, true);
      __privateSet(this, _deadline, Date.now() + __privateGet(this, _remaining));
      __privateGet(this, _tick).call(this);
    }
    pause() {
      if (!__privateGet(this, _running))
        return;
      __privateSet(this, _running, false);
      __privateSet(this, _remaining, Math.max(0, __privateGet(this, _deadline) - Date.now()));
      cancelAnimationFrame(__privateGet(this, _rafId));
      __privateSet(this, _rafId, null);
    }
    stop() {
      __privateSet(this, _running, false);
      cancelAnimationFrame(__privateGet(this, _rafId));
      __privateSet(this, _rafId, null);
    }
  };
  _duration = new WeakMap();
  _remaining = new WeakMap();
  _deadline = new WeakMap();
  _rafId = new WeakMap();
  _onTick = new WeakMap();
  _onDone = new WeakMap();
  _running = new WeakMap();
  _tick = new WeakMap();

  // src/utils/dom.js
  var DOM = {
    el(tag, { cls = "", attrs = {}, style = {} } = {}) {
      const el = document.createElement(tag);
      if (cls)
        el.className = cls;
      for (const [k, v] of Object.entries(attrs))
        el.setAttribute(k, v);
      for (const [k, v] of Object.entries(style))
        el.style[k] = v;
      return el;
    },
    text(el, content) {
      el.textContent = content;
      return el;
    },
    append(parent, ...children) {
      parent.append(...children.filter(Boolean));
      return parent;
    },
    on(el, event, handler, opts) {
      el.addEventListener(event, handler, opts);
      return () => el.removeEventListener(event, handler, opts);
    }
  };

  // src/constants/icons.js
  var ICONS = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    confirm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
  };
  var TOAST_POSITIONS = /* @__PURE__ */ new Set([
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right"
  ]);

  // src/constants/defaults.js
  var DEFAULTS = {
    title: "",
    text: "",
    type: "info",
    theme: "dark",
    size: "normal",
    position: "center",
    timer: 0,
    timerPause: true,
    closeOnOverlay: true,
    input: false,
    inputPlaceholder: "",
    background: null,
    backdropFilter: null,
    showClass: null,
    hideClass: null,
    zIndex: null,
    buttons: [
      { label: "OK", value: true, variant: "primary" }
    ]
  };

  // src/core/alert-instance.js
  var _opts, _resolve, _overlay, _modal, _timer, _cleanups, _originalBodyOverflow, _originalBodyPadding, _build, build_fn, _buildIcon, buildIcon_fn, _buildTitle, buildTitle_fn, _buildText, buildText_fn, _buildInput, buildInput_fn, _buildButtons, buildButtons_fn, _buildButton, buildButton_fn, _buildProgress, buildProgress_fn, _attach, attach_fn, _detach, detach_fn, _setupTimer, setupTimer_fn, _setupKeyboard, setupKeyboard_fn, _show, show_fn, _close, close_fn;
  var AlertInstance = class {
    constructor(opts) {
      __privateAdd(this, _build);
      __privateAdd(this, _buildIcon);
      __privateAdd(this, _buildTitle);
      __privateAdd(this, _buildText);
      __privateAdd(this, _buildInput);
      __privateAdd(this, _buildButtons);
      __privateAdd(this, _buildButton);
      __privateAdd(this, _buildProgress);
      __privateAdd(this, _attach);
      __privateAdd(this, _detach);
      __privateAdd(this, _setupTimer);
      __privateAdd(this, _setupKeyboard);
      __privateAdd(this, _show);
      __privateAdd(this, _close);
      __privateAdd(this, _opts, void 0);
      __privateAdd(this, _resolve, void 0);
      __privateAdd(this, _overlay, void 0);
      __privateAdd(this, _modal, void 0);
      __privateAdd(this, _timer, null);
      __privateAdd(this, _cleanups, []);
      __privateAdd(this, _originalBodyOverflow, "");
      __privateAdd(this, _originalBodyPadding, "");
      __privateSet(this, _opts, { ...DEFAULTS, ...opts });
      __privateGet(this, _opts).buttons = opts.buttons ?? DEFAULTS.buttons;
    }
    mount() {
      return new Promise((resolve) => {
        __privateSet(this, _resolve, resolve);
        Pointer.init();
        __privateMethod(this, _build, build_fn).call(this);
        __privateMethod(this, _attach, attach_fn).call(this);
        __privateMethod(this, _setupTimer, setupTimer_fn).call(this);
        __privateMethod(this, _setupKeyboard, setupKeyboard_fn).call(this);
        requestAnimationFrame(
          () => requestAnimationFrame(() => __privateMethod(this, _show, show_fn).call(this))
        );
      });
    }
  };
  _opts = new WeakMap();
  _resolve = new WeakMap();
  _overlay = new WeakMap();
  _modal = new WeakMap();
  _timer = new WeakMap();
  _cleanups = new WeakMap();
  _originalBodyOverflow = new WeakMap();
  _originalBodyPadding = new WeakMap();
  _build = new WeakSet();
  build_fn = function() {
    const o = __privateGet(this, _opts);
    const isToast = TOAST_POSITIONS.has(o.position);
    const hasCustomAnim = !!(o.showClass || o.hideClass);
    __privateSet(this, _overlay, DOM.el("div", {
      cls: "nu-overlay",
      attrs: { "data-position": o.position, role: "presentation" }
    }));
    const sizeClass = o.size !== "normal" ? `nu-modal--${o.size}` : null;
    __privateSet(this, _modal, DOM.el("div", {
      cls: ["nu-modal", isToast && "nu-modal--toast", hasCustomAnim && "nu-modal--custom-anim", sizeClass].filter(Boolean).join(" "),
      attrs: {
        "data-theme": o.theme,
        role: "dialog",
        "aria-modal": "true",
        "aria-label": o.title || o.text
      }
    }));
    const body = DOM.el("div", { cls: "nu-body" });
    DOM.append(
      body,
      __privateMethod(this, _buildIcon, buildIcon_fn).call(this),
      __privateMethod(this, _buildTitle, buildTitle_fn).call(this),
      __privateMethod(this, _buildText, buildText_fn).call(this),
      __privateMethod(this, _buildInput, buildInput_fn).call(this),
      __privateMethod(this, _buildButtons, buildButtons_fn).call(this)
    );
    DOM.append(__privateGet(this, _modal), body, __privateMethod(this, _buildProgress, buildProgress_fn).call(this));
    DOM.append(__privateGet(this, _overlay), __privateGet(this, _modal));
    if (o.background) {
      __privateGet(this, _modal).style.background = o.background;
    }
    if (o.backdropFilter) {
      __privateGet(this, _modal).style.backdropFilter = o.backdropFilter;
    }
    if (o.zIndex != null) {
      __privateGet(this, _overlay).style.zIndex = o.zIndex;
    }
  };
  _buildIcon = new WeakSet();
  buildIcon_fn = function() {
    const { type, color } = __privateGet(this, _opts);
    if (!type || !ICONS[type])
      return null;
    const icon = DOM.el("i", { cls: "nu-icon", attrs: { "data-type": type, "aria-hidden": "true" } });
    if (color) {
      icon.style.background = `color-mix(in srgb, ${color} 10%, transparent)`;
      icon.style.color = color;
    }
    icon.innerHTML = ICONS[type];
    return icon;
  };
  _buildTitle = new WeakSet();
  buildTitle_fn = function() {
    const { title } = __privateGet(this, _opts);
    if (!title)
      return null;
    return DOM.text(DOM.el("div", { cls: "nu-title" }), title);
  };
  _buildText = new WeakSet();
  buildText_fn = function() {
    const { text } = __privateGet(this, _opts);
    if (!text)
      return null;
    return DOM.text(DOM.el("p", { cls: "nu-text" }), text);
  };
  _buildInput = new WeakSet();
  buildInput_fn = function() {
    const { input, inputPlaceholder } = __privateGet(this, _opts);
    if (!input)
      return null;
    this._inputEl = DOM.el("input", {
      cls: "nu-input",
      attrs: { type: "text", placeholder: inputPlaceholder, autocomplete: "off" }
    });
    setTimeout(() => this._inputEl?.focus(), 250);
    return this._inputEl;
  };
  _buildButtons = new WeakSet();
  buildButtons_fn = function() {
    const wrap = DOM.el("div", { cls: "nu-buttons" });
    for (const btn of __privateGet(this, _opts).buttons) {
      wrap.appendChild(__privateMethod(this, _buildButton, buildButton_fn).call(this, btn));
    }
    return wrap;
  };
  _buildButton = new WeakSet();
  buildButton_fn = function({ label, value, variant = "primary", bg, color }) {
    const el = DOM.el("button", { cls: `nu-btn nu-btn--${variant}` });
    DOM.text(el, label);
    if (bg)
      el.style.background = bg;
    if (color)
      el.style.color = color;
    const off = DOM.on(el, "click", () => {
      off();
      const result = __privateGet(this, _opts).input ? value ? this._inputEl?.value ?? "" : false : value;
      __privateMethod(this, _close, close_fn).call(this, result);
    });
    return el;
  };
  _buildProgress = new WeakSet();
  buildProgress_fn = function() {
    const { timer, type, color } = __privateGet(this, _opts);
    if (!timer)
      return null;
    this._progressEl = DOM.el("div", {
      cls: "nu-progress",
      attrs: { "data-type": type || "info", "aria-hidden": "true" }
    });
    if (color) {
      this._progressEl.style.background = color;
    }
    return this._progressEl;
  };
  _attach = new WeakSet();
  attach_fn = function() {
    document.body.appendChild(__privateGet(this, _overlay));
    if (__privateGet(this, _opts).position === "center") {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      __privateSet(this, _originalBodyOverflow, document.body.style.overflow);
      __privateSet(this, _originalBodyPadding, document.body.style.paddingRight);
      if (scrollbarWidth > 0) {
        const currentPadding = parseInt(window.getComputedStyle(document.body).paddingRight) || 0;
        document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
      }
      document.body.style.overflow = "hidden";
    }
  };
  _detach = new WeakSet();
  detach_fn = function() {
    __privateGet(this, _overlay).remove();
    if (__privateGet(this, _opts).position === "center") {
      document.body.style.overflow = __privateGet(this, _originalBodyOverflow);
      document.body.style.paddingRight = __privateGet(this, _originalBodyPadding);
    }
    __privateGet(this, _cleanups).forEach((fn) => fn());
    __privateSet(this, _cleanups, []);
  };
  _setupTimer = new WeakSet();
  setupTimer_fn = function() {
    const { timer, timerPause } = __privateGet(this, _opts);
    if (!timer)
      return;
    __privateSet(this, _timer, new Timer({
      duration: timer,
      onTick: (progress) => {
        if (this._progressEl) {
          this._progressEl.style.transform = `scaleX(${progress})`;
        }
      },
      onDone: () => __privateMethod(this, _close, close_fn).call(this, null)
    }));
    if (timerPause) {
      let resolved = false;
      const tryStart = (shouldStart) => {
        if (resolved)
          return;
        resolved = true;
        offMove();
        clearTimeout(fallbackId);
        if (shouldStart)
          __privateGet(this, _timer)?.start();
      };
      const onMove = (e) => {
        const under = document.elementFromPoint(e.clientX, e.clientY);
        tryStart(!__privateGet(this, _modal).contains(under));
      };
      const offMove = DOM.on(document, "pointermove", onMove);
      const fallbackId = setTimeout(() => tryStart(true), 5e3);
      this._checkInitialCursorPosition = () => {
        setTimeout(() => {
          if (resolved)
            return;
          const rect = __privateGet(this, _modal).getBoundingClientRect();
          const isOver = Pointer.x >= rect.left && Pointer.x <= rect.right && Pointer.y >= rect.top && Pointer.y <= rect.bottom;
          if (!isOver)
            tryStart(true);
        }, 100);
      };
      __privateGet(this, _cleanups).push(
        offMove,
        () => clearTimeout(fallbackId),
        DOM.on(__privateGet(this, _modal), "mouseenter", () => __privateGet(this, _timer)?.pause()),
        DOM.on(__privateGet(this, _modal), "mouseleave", () => __privateGet(this, _timer)?.start())
      );
    } else {
      setTimeout(() => __privateGet(this, _timer)?.start(), 250);
    }
  };
  _setupKeyboard = new WeakSet();
  setupKeyboard_fn = function() {
    const handler = (e) => {
      if (e.key === "Escape") {
        __privateMethod(this, _close, close_fn).call(this, null);
      } else if (e.key === "Enter" && this._inputEl) {
        __privateMethod(this, _close, close_fn).call(this, this._inputEl.value);
      }
    };
    document.addEventListener("keydown", handler);
    __privateGet(this, _cleanups).push(() => document.removeEventListener("keydown", handler));
    if (__privateGet(this, _opts).closeOnOverlay) {
      __privateGet(this, _cleanups).push(
        DOM.on(__privateGet(this, _overlay), "click", (e) => {
          if (e.target === __privateGet(this, _overlay))
            __privateMethod(this, _close, close_fn).call(this, null);
        })
      );
    }
  };
  _show = new WeakSet();
  show_fn = function() {
    const { showClass } = __privateGet(this, _opts);
    __privateGet(this, _overlay).classList.add("nu-overlay--visible");
    if (showClass) {
      requestAnimationFrame(() => {
        if (showClass.backdrop) {
          __privateGet(this, _overlay).classList.add(...showClass.backdrop.split(" "));
        }
        if (showClass.popup) {
          __privateGet(this, _modal).classList.add(...showClass.popup.split(" "));
        }
      });
    }
    if (this._checkInitialCursorPosition) {
      this._checkInitialCursorPosition();
    }
  };
  _close = new WeakSet();
  close_fn = function(result) {
    __privateGet(this, _timer)?.stop();
    __privateSet(this, _timer, null);
    this._inputEl = null;
    const { showClass, hideClass } = __privateGet(this, _opts);
    if (showClass) {
      if (showClass.backdrop) {
        __privateGet(this, _overlay).classList.remove(...showClass.backdrop.split(" "));
      }
      if (showClass.popup) {
        __privateGet(this, _modal).classList.remove(...showClass.popup.split(" "));
      }
    }
    if (hideClass && (hideClass.popup || hideClass.backdrop)) {
      const target = hideClass.popup ? __privateGet(this, _modal) : __privateGet(this, _overlay);
      let finished = false;
      const finish = () => {
        if (finished)
          return;
        finished = true;
        clearTimeout(fallbackTimer);
        __privateMethod(this, _detach, detach_fn).call(this);
        __privateGet(this, _resolve).call(this, result);
      };
      if (hideClass.backdrop) {
        __privateGet(this, _overlay).classList.add(...hideClass.backdrop.split(" "));
      }
      if (hideClass.popup) {
        __privateGet(this, _modal).classList.add(...hideClass.popup.split(" "));
      }
      target.addEventListener("animationend", finish, { once: true });
      const fallbackTimer = setTimeout(finish, 2e3);
    } else {
      __privateGet(this, _overlay).classList.remove("nu-overlay--visible");
      __privateGet(this, _overlay).classList.add("nu-overlay--closing");
      __privateGet(this, _overlay).addEventListener("transitionend", () => {
        __privateMethod(this, _detach, detach_fn).call(this);
        __privateGet(this, _resolve).call(this, result);
      }, { once: true });
    }
  };

  // css:D:\Andrei\everything\programming\js\own\nuntaria\src\styles\nuntaria.css
  var nuntaria_default = ':root {\n	--nu-success: #2dd4bf;\n	--nu-error: #f87171;\n	--nu-warning: #fb923c;\n	--nu-info: #818cf8;\n	--nu-confirm: #e879f9;\n\n	--nu-dark-bg: #14141d;\n	--nu-dark-border: #1e1e2e;\n	--nu-dark-text: #e0e0e9;\n	--nu-dark-muted: #888897;\n\n	--nu-light-bg: #ffffff;\n	--nu-light-border: #ddddf0;\n	--nu-light-text: #18182a;\n	--nu-light-muted: #7878a0;\n\n	--nu-glass-bg: rgba(255, 255, 255, .1);\n	--nu-glass-border: rgba(255, 255, 255, .2);\n	--nu-glass-text: #ffffff;\n	--nu-glass-muted: rgba(255, 255, 255, .5);\n\n	--nu-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);\n	--nu-ease-out: cubic-bezier(0.16, 1, 0.3, 1);\n	--nu-dur-in: 220ms;\n	--nu-dur-out: 160ms;\n}\n\n.nu-overlay {\n	position: fixed;\n	inset: 0;\n	z-index: 9000;\n	display: flex;\n	pointer-events: none;\n	opacity: 0;\n	transition: opacity var(--nu-dur-in) var(--nu-ease-out);\n}\n\n.nu-overlay--visible {\n	opacity: 1;\n	pointer-events: all;\n}\n\n.nu-overlay--closing {\n	opacity: 0;\n	transition-duration: var(--nu-dur-out);\n}\n\n.nu-overlay--visible[data-position="top-left"],\n.nu-overlay--visible[data-position="top-right"],\n.nu-overlay--visible[data-position="bottom-left"],\n.nu-overlay--visible[data-position="bottom-right"] {\n	pointer-events: none;\n}\n\n.nu-overlay--visible[data-position="top-left"] .nu-modal,\n.nu-overlay--visible[data-position="top-right"] .nu-modal,\n.nu-overlay--visible[data-position="bottom-left"] .nu-modal,\n.nu-overlay--visible[data-position="bottom-right"] .nu-modal {\n	pointer-events: all;\n}\n\n.nu-overlay[data-position="center"] {\n	align-items: center;\n	justify-content: center;\n	background: rgba(0, 0, 0, 0.65);\n	backdrop-filter: blur(0.375rem);\n}\n\n.nu-overlay[data-position="top"] {\n	align-items: flex-start;\n	justify-content: center;\n	padding-top: 1.25rem;\n}\n\n.nu-overlay[data-position="bottom"] {\n	align-items: flex-end;\n	justify-content: center;\n	padding-bottom: 1.25rem;\n}\n\n.nu-overlay[data-position="top-left"] {\n	align-items: flex-start;\n	justify-content: flex-start;\n	padding: 1.25rem;\n}\n\n.nu-overlay[data-position="top-right"] {\n	align-items: flex-start;\n	justify-content: flex-end;\n	padding: 1.25rem;\n}\n\n.nu-overlay[data-position="bottom-left"] {\n	align-items: flex-end;\n	justify-content: flex-start;\n	padding: 1.25rem;\n}\n\n.nu-overlay[data-position="bottom-right"] {\n	align-items: flex-end;\n	justify-content: flex-end;\n	padding: 1.25rem;\n}\n\n.nu-modal {\n	position: relative;\n	border-radius: .5rem;\n	overflow: hidden;\n	width: 90vw;\n	max-width: 31.5rem;\n	text-align: center;\n}\n\n.nu-modal:not(.nu-modal--custom-anim) {\n	transform: scale(0.9) translateY(.875rem);\n	opacity: 0;\n	transition:\n		transform var(--nu-dur-in) var(--nu-ease-spring),\n		opacity var(--nu-dur-in) var(--nu-ease-out);\n}\n\n.nu-overlay--visible .nu-modal:not(.nu-modal--custom-anim) {\n	transform: scale(1) translateY(0);\n	opacity: 1;\n}\n\n.nu-overlay--closing .nu-modal:not(.nu-modal--custom-anim) {\n	transform: scale(0.9) translateY(.375rem);\n	opacity: 0;\n	transition-duration: var(--nu-dur-out);\n	transition-timing-function: var(--nu-ease-out);\n}\n\n.nu-modal--custom-anim {\n	opacity: 1;\n	transform: none;\n}\n\n.nu-modal--toast {\n	width: 23.25rem;\n	max-width: 90vw;\n	text-align: left;\n}\n\n.nu-modal--small {\n	max-width: 26.25rem;\n}\n\n.nu-modal--small.nu-modal--toast {\n	width: 19.375rem;\n}\n\n.nu-modal--small .nu-body {\n	padding: 1.75rem 1.5rem 1.375rem;\n}\n\n.nu-modal--small.nu-modal--toast .nu-body {\n	padding: 1rem 1.125rem 0.875rem;\n}\n\n.nu-modal--small .nu-icon {\n	width: 3.25rem;\n	height: 3.25rem;\n	font-size: 1.375rem;\n	margin: 0 auto 1rem;\n}\n\n.nu-modal--small .nu-icon svg {\n	width: 1.5rem;\n	height: 1.5rem;\n}\n\n.nu-modal--small.nu-modal--toast .nu-icon {\n	width: 1.875rem;\n	height: 1.875rem;\n	font-size: .825rem;\n	margin: 0 0 .625rem;\n}\n\n.nu-modal--small.nu-modal--toast .nu-icon svg {\n	width: .875rem;\n	height: .875rem;\n}\n\n.nu-modal--small .nu-title {\n	font-size: .95rem;\n	margin-bottom: .375rem;\n}\n\n.nu-modal--small .nu-text {\n	font-size: .8rem;\n	margin-bottom: 1.25rem;\n}\n\n.nu-modal--small.nu-modal--toast .nu-text {\n	margin-bottom: .75rem;\n}\n\n.nu-modal--small .nu-input {\n	padding: .625rem .875rem;\n	font-size: .875rem;\n	margin-top: 1rem;\n	margin-bottom: 1.125rem;\n}\n\n.nu-modal--small .nu-btn {\n	padding: .5rem 1.25rem;\n	font-size: .7rem;\n}\n\n.nu-modal--large {\n	max-width: 39.375rem;\n}\n\n.nu-modal--large.nu-modal--toast {\n	width: 29.0625rem;\n}\n\n.nu-modal--large .nu-body {\n	padding: 2.625rem 2.25rem 2.0625rem;\n}\n\n.nu-modal--large.nu-modal--toast .nu-body {\n	padding: 1.5rem 1.6875rem 1.3125rem;\n}\n\n.nu-modal--large .nu-icon {\n	width: 4.875rem;\n	height: 4.875rem;\n	font-size: 2.0625rem;\n	margin: 0 auto 1.5rem;\n}\n\n.nu-modal--large .nu-icon svg {\n	width: 2.25rem;\n	height: 2.25rem;\n}\n\n.nu-modal--large.nu-modal--toast .nu-icon {\n	width: 2.8125rem;\n	height: 2.8125rem;\n	font-size: 1.2375rem;\n	margin: 0 0 .9375rem;\n}\n\n.nu-modal--large.nu-modal--toast .nu-icon svg {\n	width: 1.3125rem;\n	height: 1.3125rem;\n}\n\n.nu-modal--large .nu-title {\n	font-size: 1.425rem;\n	margin-bottom: .5625rem;\n}\n\n.nu-modal--large .nu-text {\n	font-size: 1.2rem;\n	margin-bottom: 1.875rem;\n}\n\n.nu-modal--large.nu-modal--toast .nu-text {\n	margin-bottom: 1.125rem;\n}\n\n.nu-modal--large .nu-input {\n	padding: .9375rem 1.3125rem;\n	font-size: 1.3125rem;\n	margin-top: 1.5rem;\n	margin-bottom: 1.6875rem;\n}\n\n.nu-modal--large .nu-btn {\n	padding: .75rem 1.875rem;\n	font-size: 1.05rem;\n}\n\n.nu-modal[data-theme="dark"] {\n	background: var(--nu-dark-bg);\n	border: .1rem solid var(--nu-dark-border);\n	color: var(--nu-dark-text);\n}\n\n.nu-modal[data-theme="light"] {\n	background: var(--nu-light-bg);\n	border: .1rem solid var(--nu-light-border);\n	color: var(--nu-light-text);\n}\n\n.nu-modal[data-theme="glass"] {\n	background: var(--nu-glass-bg);\n	border: .1rem solid var(--nu-glass-border);\n	backdrop-filter: blur(.5rem);\n	color: var(--nu-glass-text);\n}\n\n.nu-body {\n	padding: 2.1rem 1.8rem 1.65rem;\n}\n\n.nu-modal--toast .nu-body {\n	padding: 1.2rem 1.35rem 1.05rem;\n}\n\n.nu-icon {\n	width: 3.9rem;\n	height: 3.9rem;\n	border-radius: 50%;\n	display: flex;\n	align-items: center;\n	justify-content: center;\n	font-size: 1.65rem;\n	font-style: normal;\n	margin: 0 auto 1.2rem;\n	flex-shrink: 0;\n}\n\n.nu-icon svg {\n	width: 1.8rem;\n	height: 1.8rem;\n}\n\n.nu-modal--toast .nu-icon {\n	width: 2.25rem;\n	height: 2.25rem;\n	font-size: .99rem;\n	margin: 0 0 .75rem;\n}\n\n.nu-modal--toast .nu-icon svg {\n	width: 1.05rem;\n	height: 1.05rem;\n}\n\n.nu-icon[data-type="success"] {\n	background: color-mix(in srgb, var(--nu-success) 10%, transparent);\n	color: var(--nu-success);\n}\n\n.nu-icon[data-type="error"] {\n	background: color-mix(in srgb, var(--nu-error) 10%, transparent);\n	color: var(--nu-error);\n}\n\n.nu-icon[data-type="warning"] {\n	background: color-mix(in srgb, var(--nu-warning) 10%, transparent);\n	color: var(--nu-warning);\n}\n\n.nu-icon[data-type="info"] {\n	background: color-mix(in srgb, var(--nu-info) 10%, transparent);\n	color: var(--nu-info);\n}\n\n.nu-icon[data-type="confirm"] {\n	background: color-mix(in srgb, var(--nu-confirm) 10%, transparent);\n	color: var(--nu-confirm);\n}\n\n.nu-title {\n	font-size: 1.14rem;\n	font-weight: 700;\n	line-height: 1.3;\n	margin-bottom: .45rem;\n}\n\n.nu-text {\n	font-size: .96rem;\n	line-height: 1.65;\n	margin-bottom: 1.5rem;\n}\n\n.nu-modal[data-theme="dark"] .nu-text {\n	color: var(--nu-dark-muted);\n}\n\n.nu-modal[data-theme="light"] .nu-text {\n	color: var(--nu-light-muted);\n}\n\n.nu-modal[data-theme="glass"] .nu-text {\n	color: var(--nu-glass-muted);\n}\n\n.nu-modal--toast .nu-text {\n	margin-bottom: .9rem;\n}\n\n.nu-input {\n	display: block;\n	width: 100%;\n	padding: .75rem 1.05rem;\n	border-radius: .5rem;\n	font-size: 1.05rem;\n	outline: none;\n	margin-top: 1.2rem;\n	margin-bottom: 1.35rem;\n	transition: border-color 150ms;\n	box-sizing: border-box;\n}\n\n.nu-modal[data-theme="dark"] .nu-input {\n	background: #0e0e16;\n	border: .1rem solid #252535;\n	color: var(--nu-dark-text);\n}\n\n.nu-modal[data-theme="dark"] .nu-input::placeholder {\n	color: var(--nu-dark-muted);\n	opacity: .6;\n}\n\n.nu-modal[data-theme="dark"] .nu-input:focus {\n	border-color: var(--nu-info);\n}\n\n.nu-modal[data-theme="light"] .nu-input {\n	background: #fff;\n	border: .1rem solid #d0d0e0;\n	color: var(--nu-light-text);\n}\n\n.nu-modal[data-theme="light"] .nu-input::placeholder {\n	color: var(--nu-light-muted);\n	opacity: .6;\n}\n\n.nu-modal[data-theme="light"] .nu-input:focus {\n	border-color: var(--nu-info);\n}\n\n.nu-modal[data-theme="glass"] .nu-input {\n	background: rgba(255, 255, 255, 0.08);\n	border: .1rem solid rgba(255, 255, 255, 0.2);\n	color: #fff;\n}\n\n.nu-modal[data-theme="glass"] .nu-input::placeholder {\n	color: var(--nu-glass-muted);\n	opacity: .7;\n}\n\n.nu-modal[data-theme="glass"] .nu-input:focus {\n	border-color: rgba(255, 255, 255, 0.5);\n}\n\n.nu-buttons {\n	display: flex;\n	gap: .5rem;\n	justify-content: center;\n	flex-wrap: wrap;\n}\n\n.nu-modal--toast .nu-buttons {\n	justify-content: flex-start;\n}\n\n.nu-btn {\n	padding: .6rem 1.5rem;\n	border-radius: .5rem;\n	border: none;\n	cursor: pointer;\n	font-size: .84rem;\n	font-weight: 600;\n	letter-spacing: .02em;\n	transition: filter 120ms, transform 80ms;\n}\n\n.nu-btn:hover {\n	filter: brightness(1.15);\n}\n\n.nu-btn:active {\n	transform: scale(.95);\n	filter: brightness(.95);\n}\n\n.nu-btn--primary {\n	background: var(--nu-info);\n	color: #fff;\n}\n\n.nu-btn--success {\n	background: var(--nu-success);\n	color: #012a24;\n}\n\n.nu-btn--danger {\n	background: var(--nu-error);\n	color: #fff;\n}\n\n.nu-btn--warning {\n	background: var(--nu-warning);\n	color: #1a0800;\n}\n\n.nu-btn--cancel {\n	background: transparent;\n	border: .1rem solid currentColor;\n}\n\n.nu-modal[data-theme="dark"] .nu-btn--cancel {\n	color: #3a3a5a;\n}\n\n.nu-modal[data-theme="light"] .nu-btn--cancel {\n	color: #7878a0;\n}\n\n.nu-modal[data-theme="glass"] .nu-btn--cancel {\n	color: rgba(255, 255, 255, .25);\n}\n\n.nu-progress {\n	position: absolute;\n	bottom: 0;\n	left: 0;\n	height: .125rem;\n	width: 100%;\n	transform-origin: left;\n	transform: scaleX(1);\n	transition: none;\n	border-radius: 0 0 .5rem .5rem;\n}\n\n.nu-progress[data-type="success"] {\n	background: var(--nu-success);\n}\n\n.nu-progress[data-type="error"] {\n	background: var(--nu-error);\n}\n\n.nu-progress[data-type="warning"] {\n	background: var(--nu-warning);\n}\n\n.nu-progress[data-type="info"] {\n	background: var(--nu-info);\n}\n\n.nu-progress[data-type="confirm"] {\n	background: var(--nu-confirm);\n}';

  // src/nuntaria.js
  var STYLE_MARKER = "data-nuntaria-styles";
  if (typeof document !== "undefined" && !document.querySelector(`[${STYLE_MARKER}]`)) {
    const style = document.createElement("style");
    style.setAttribute(STYLE_MARKER, "");
    style.textContent = nuntaria_default;
    document.head.appendChild(style);
  }
  var Nuntaria = class {
    static fire(opts = {}) {
      return new AlertInstance(opts).mount();
    }
    static success(title, text, extra = {}) {
      return this.fire({
        type: "success",
        title,
        text,
        buttons: [{ label: "OK", value: true, variant: "success" }],
        ...extra
      });
    }
    static error(title, text, extra = {}) {
      return this.fire({
        type: "error",
        title,
        text,
        buttons: [{ label: "OK", value: true, variant: "danger" }],
        ...extra
      });
    }
    static warning(title, text, extra = {}) {
      return this.fire({
        type: "warning",
        title,
        text,
        buttons: [{ label: "OK", value: true, variant: "warning" }],
        ...extra
      });
    }
    static info(title, text, extra = {}) {
      return this.fire({ type: "info", title, text, ...extra });
    }
    static confirm(title, text, extra = {}) {
      return this.fire({
        type: "confirm",
        title,
        text,
        buttons: [
          { label: "Cancel", value: false, variant: "cancel" },
          { label: "Confirm", value: true, variant: "primary" }
        ],
        ...extra
      });
    }
    static prompt(title, placeholder = "", extra = {}) {
      return this.fire({
        type: "info",
        title,
        input: true,
        inputPlaceholder: placeholder,
        buttons: [
          { label: "Cancel", value: false, variant: "cancel" },
          { label: "OK", value: true, variant: "primary" }
        ],
        ...extra
      });
    }
    static toast(title, text, type = "info", extra = {}) {
      return this.fire({
        type,
        title,
        text,
        position: "top-right",
        timer: 3500,
        timerPause: true,
        closeOnOverlay: false,
        buttons: [],
        ...extra
      });
    }
  };
  var nuntaria_default2 = Nuntaria;
  return __toCommonJS(nuntaria_exports);
})();

const Nuntaria = __NuntariaBundle__.default;
if (typeof window !== 'undefined') {
	window.Nuntaria = Nuntaria;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = Nuntaria;
	module.exports.default = Nuntaria;
}
})();
