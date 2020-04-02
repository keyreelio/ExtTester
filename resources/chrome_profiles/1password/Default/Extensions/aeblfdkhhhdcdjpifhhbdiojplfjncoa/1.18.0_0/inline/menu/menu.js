(function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if (typeof $$scope.dirty === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    const generateUuid = () => {
        return getGlobal()
            .crypto.getRandomValues(new Uint32Array(1))[0]
            .toString(36);
    };
    function getGlobal() {
        if (typeof window !== "undefined") {
            return window;
        }
        // Work in modern node test environments
        if (typeof globalThis !== "undefined") {
            return globalThis;
        }
        throw new Error("unable to locate global object");
    }

    class WebExtTransport {
        constructor() {
            this.request = (message) => {
                return new Promise(resolve => {
                    chrome.runtime.sendMessage(message, resp => {
                        resolve(resp);
                    });
                });
            };
            this.on = (name, handler) => {
                function registeredHandler(message, _sender, sendResponse) {
                    if (message.name && message.name === name) {
                        Promise.resolve(handler(message.data)).then(sendResponse);
                        // Keep sendResponse alive
                        return true;
                    }
                    return false;
                }
                chrome.runtime.onMessage.addListener(registeredHandler);
                return registeredHandler;
            };
            this.off = (_name, handler) => {
                chrome.runtime.onMessage.removeListener(handler);
            };
        }
    }
    class CallbackAssociatedMessageTransport {
        constructor() {
            this.callbacks = {};
            this.request = (message) => {
                return new Promise(resolve => {
                    const callbackId = CallbackAssociatedMessageTransport.generateId();
                    this.callbacks[callbackId] = resolve;
                    this._sendMessage(Object.assign({ callbackId }, message));
                });
            };
            this.on = (name, handler) => {
                return this._register((message) => {
                    if (message.name && message.name === name) {
                        Promise.resolve(handler(message.data)).then(response => {
                            this._sendMessage(Object.assign(Object.assign({}, message), { data: response }));
                        });
                    }
                });
            };
            this.off = (name, handler) => {
                this._deregister(name, handler);
            };
            this.listenForResponses = () => {
                this._register((message) => {
                    if ("callbackId" in message) {
                        if (message.callbackId in this.callbacks) {
                            this.callbacks[message.callbackId](message.data);
                            delete this.callbacks[message.callbackId];
                        }
                    }
                });
            };
            this.listenForResponses();
        }
    }
    CallbackAssociatedMessageTransport.generateId = () => window.crypto.getRandomValues(new Uint32Array(1))[0];
    class PlaygroundMessageTransport extends CallbackAssociatedMessageTransport {
        constructor() {
            super();
        }
        _sendMessage(message) {
            window.top.postMessage(Object.assign({ outgoing: true }, message), "*");
        }
        _register(callback) {
            function listener(ev) {
                if (ev.data.outgoing) {
                    return;
                }
                callback(ev.data);
            }
            window.top.addEventListener("message", listener);
            return listener;
        }
        _deregister(_name, handler) {
            window.top.removeEventListener("message", handler);
        }
    }
    class SafariAppExtTransport extends CallbackAssociatedMessageTransport {
        constructor() {
            super();
            this.uuid = generateUuid();
            this._sendMessage.bind(this);
            this._register.bind(this);
            this._deregister.bind(this);
        }
        static isSafariAppExtension() {
            return typeof safari !== "undefined" && typeof safari.extension !== "undefined";
        }
        _sendMessage(message) {
            const wrappedMessage = {
                callbackId: message.callbackId,
                uuid: this.uuid,
                message: {
                    name: message.name,
                    data: message.data,
                },
            };
            safari.extension.dispatchMessage("message", wrappedMessage);
        }
        _register(callback) {
            function listener(safariMessage) {
                if (!safariMessage.message) {
                    return;
                }
                const wrappedMessage = safariMessage.message;
                callback({
                    callbackId: wrappedMessage.callbackId,
                    name: wrappedMessage.message.name,
                    data: wrappedMessage.message.data,
                });
            }
            safari.self.addEventListener("message", listener);
            return listener;
        }
        _deregister(_name, listener) {
            safari.self.removeEventListener("message", listener);
        }
    }
    function toFrames(message, options = { targetParent: false }) {
        return {
            name: "relay-message-to-frames",
            data: message,
            targetParent: options.targetParent,
        };
    }
    function getTransportForEnvironment() {
        if (typeof chrome !== "undefined" &&
            typeof chrome.runtime !== "undefined" &&
            typeof chrome.runtime.sendMessage !== "undefined" &&
            typeof chrome.runtime.onMessage !== "undefined") {
            return new WebExtTransport();
        }
        if (SafariAppExtTransport.isSafariAppExtension()) {
            return new SafariAppExtTransport();
        }
        return new PlaygroundMessageTransport();
    }

    /* shared/components/Bridge.svelte generated by Svelte v3.17.1 */

    function create_fragment(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 2) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[1], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null));
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { bridge } = $$props;
    	setContext("bridge", new bridge(getTransportForEnvironment()));
    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("bridge" in $$props) $$invalidate(0, bridge = $$props.bridge);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [bridge, $$scope, $$slots];
    }

    class Bridge extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, { bridge: 0 });
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var helpers = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    var spaceRegex = /\s/g;
    var nonWordRegex = /\W/g;
    exports.generator = {
        plain: function (message) {
            return message;
        },
        hyphens: function (message) {
            var hyphenated = message.trim().replace(spaceRegex, "-").replace(nonWordRegex, '-');
            return hyphenated;
        }
    };
    function Plural(pluralizeFor, options) {
        var zero = options.zero, one = options.one, other = options.other;
        return "{" + pluralizeFor + ", plural,\n" +
            (zero ? "\t=0{" + zero + "}\n" : "") +
            (one ? "\tone{" + one + "}\n" : "") +
            ("\tother{" + other + "}}");
    }
    exports.Plural = Plural;
    var xmlEscapes = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": '&#39;'
    };
    var escapeXml = function (str) { return (str.replace(/[&<>"']/g, function (match) { return xmlEscapes[match]; })); };
    exports.splitAndEscapeReplacements = function (replacements) {
        var icu = {};
        var xml = {};
        for (var key in replacements) {
            if (replacements.hasOwnProperty(key)) {
                var value = replacements[key];
                if (typeof value === "function") {
                    xml[key] = value;
                }
                else if (typeof value === "string") {
                    icu[key] = escapeXml(value);
                }
                else {
                    icu[key] = value;
                }
            }
        }
        return [icu, xml];
    };
    exports.assign = function (target, source) {
        var to = Object(target);
        for (var nextKey in source) {
            if (Object.prototype.hasOwnProperty.call(source, nextKey)) {
                to[nextKey] = source[nextKey];
            }
        }
        return to;
    };
    });

    unwrapExports(helpers);
    var helpers_1 = helpers.generator;
    var helpers_2 = helpers.Plural;
    var helpers_3 = helpers.splitAndEscapeReplacements;
    var helpers_4 = helpers.assign;

    var format = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.dateTimeFormats = {
        short: {
            month: "short",
            day: "numeric",
            year: "numeric"
        },
        long: {
            month: "long",
            day: "numeric",
            year: "numeric"
        },
        dateTime: {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric"
        }
    };
    exports.numberFormats = {
        currency: {
            style: "currency",
            currency: "USD"
        },
        decimal: {
            style: "decimal"
        },
        percent: {
            style: "percent"
        }
    };
    function createCachedFormatter(intlFormat) {
        var cache = {};
        return function (locale, formatOptions) {
            var args = Array.prototype.slice.call(arguments);
            var id = locale + "-" + JSON.stringify(formatOptions);
            if (id in cache)
                return cache[id];
            var formatter = new ((_a = Function.prototype.bind).call.apply(_a, [intlFormat, null].concat(args)));
            cache[id] = formatter;
            return formatter;
            var _a;
        };
    }
    exports.default = createCachedFormatter;
    });

    unwrapExports(format);
    var format_1 = format.dateTimeFormats;
    var format_2 = format.numberFormats;

    var icu = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    var TOKEN = {
        OPEN: '{',
        CLOSE: '}',
    };
    function parseIcu(icuString, replacements) {
        if (!replacements)
            return icuString;
        var currentToken = '';
        var elements = [];
        for (var i = 0; i < icuString.length; i++) {
            switch (icuString.charAt(i)) {
                case TOKEN.OPEN:
                    elements.push(currentToken);
                    currentToken = '';
                    break;
                case TOKEN.CLOSE:
                    elements.push(replacements[currentToken]);
                    currentToken = '';
                    break;
                default:
                    currentToken += icuString.charAt(i);
            }
        }
        elements.push(currentToken);
        return elements.join('');
    }
    exports.default = parseIcu;
    });

    unwrapExports(icu);

    var xml = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    var XML_WRAPPER = "wrap";
    var parser;
    function parseXml(xmlString, replacements) {
        if (typeof parser === 'undefined') {
            parser = new DOMParser();
        }
        var xmlDoc = parser.parseFromString("<" + XML_WRAPPER + ">" + xmlString + "</" + XML_WRAPPER + ">", "text/xml");
        if (!xmlDoc.firstChild || xmlDoc.firstChild.nodeName !== XML_WRAPPER) {
            throw new Error("Could not parse XML string");
        }
        return walk(xmlDoc.firstChild, replacements, true);
    }
    exports.default = parseXml;
    var NODE_TYPE_ELEMENT = 1;
    var NODE_TYPE_TEXT = 3;
    function walk(node, replacements, isRoot) {
        if (isRoot === void 0) { isRoot = false; }
        if (node.nodeType === NODE_TYPE_TEXT) {
            return node.nodeValue ? [node.nodeValue] : [];
        }
        else if (node.nodeType === NODE_TYPE_ELEMENT) {
            var children = Array.prototype.slice.call(node.childNodes);
            var replacedChildren = children.reduce(function (acc, child) { return acc.concat(walk(child, replacements)); }, []);
            return (isRoot || !replacements[node.nodeName]
                ? replacedChildren
                : [replacements[node.nodeName].apply(replacements, replacedChildren)]);
        }
        else {
            return [];
        }
    }
    });

    unwrapExports(xml);

    var tI18n = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });




    var defaultLanguage = "en";
    var getKey = function (allMessages, locale, key) {
        var messages = allMessages[locale];
        var defaultMessages = allMessages[defaultLanguage];
        if (messages && messages[key]) {
            return messages[key];
        }
        if (defaultMessages && defaultMessages[key]) {
            return defaultMessages[key];
        }
        return "";
    };
    var makeIntlFormatters = function (locale) {
        if (typeof Intl === "undefined") {
            var error = function () {
                throw new Error("Missing Intl");
            };
            return { date: error, number: error };
        }
        var getDateTimeFormat = function () {
            var delegate = Intl.DateTimeFormat;
            function DateTimeFormat() {
                var args = Array.prototype.slice.apply(arguments);
                args[0] = args[0] || "en-US";
                args[1] = args[1] || {};
                args[1].timeZone = args[1].timeZone || "America/Toronto";
                return delegate.apply(this, args);
            }
            DateTimeFormat.prototype = delegate.prototype;
            return DateTimeFormat;
        };
        try {
            Intl.DateTimeFormat();
            (new Date()).toLocaleString();
            (new Date()).toLocaleDateString();
            (new Date()).toLocaleTimeString();
        }
        catch (err) {
            Date.prototype.toLocaleString = Date.prototype.toString;
            Date.prototype.toLocaleDateString = Date.prototype.toDateString;
            Date.prototype.toLocaleTimeString = Date.prototype.toTimeString;
            Intl.DateTimeFormat = getDateTimeFormat();
        }
        var dateFormatter = format.default(Intl.DateTimeFormat);
        var numberFormatter = format.default(Intl.NumberFormat);
        var date = function (value, style, dateLocale) {
            if (style === void 0) { style = "long"; }
            if (dateLocale === void 0) { dateLocale = locale(); }
            var format$1 = format.dateTimeFormats[style] || format.dateTimeFormats.long;
            return dateFormatter(dateLocale, format$1).format(value);
        };
        var number = function (value, style, numberLocale) {
            if (style === void 0) { style = "decimal"; }
            if (numberLocale === void 0) { numberLocale = locale(); }
            var format$1 = format.numberFormats[style] || format.numberFormats.decimal;
            return numberFormatter(numberLocale, format$1).format(value);
        };
        return { date: date, number: number };
    };
    exports.makeBasicT = function () {
        var messages = {};
        var locale = defaultLanguage;
        var idGenerator = helpers.generator.hyphens;
        var set = function (options) {
            if (options === void 0) { options = {}; }
            messages = options.messages || messages;
            locale = options.locale || locale;
            idGenerator = options.idGenerator || idGenerator;
            return { messages: messages, locale: locale, idGenerator: idGenerator };
        };
        var generateId = function (message) { return idGenerator(message); };
        var lookup = function (id, replacements, defaultMessage) {
            if (replacements === void 0) { replacements = {}; }
            if (defaultMessage === void 0) { defaultMessage = ""; }
            var translation = getKey(messages, locale, id) || defaultMessage || id;
            if (typeof translation === "string") {
                return icu.default(translation, replacements);
            }
            return translation(replacements);
        };
        var T = function (message, replacements, id) {
            if (replacements === void 0) { replacements = {}; }
            if (id === void 0) { id = ""; }
            return lookup(id || generateId(message), replacements, message);
        };
        var $ = function (message, replacements, id) {
            if (replacements === void 0) { replacements = {}; }
            if (id === void 0) { id = ""; }
            var _a = helpers.splitAndEscapeReplacements(replacements), icu = _a[0], xml$1 = _a[1];
            var translatedMessage = T(message, icu, id);
            return xml.default(translatedMessage, xml$1);
        };
        var properties = {
            $: $,
            generateId: generateId,
            locale: function () { return locale; },
            lookup: lookup,
            set: set,
        };
        return helpers.assign(T, properties);
    };
    exports.makeT = function () {
        var T = exports.makeBasicT();
        var formatters = makeIntlFormatters(T.locale);
        return helpers.assign(T, formatters);
    };
    exports.default = exports.makeT();
    });

    unwrapExports(tI18n);
    var tI18n_1 = tI18n.makeBasicT;
    var tI18n_2 = tI18n.makeT;

    var dist = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });

    exports.Plural = helpers.Plural;
    exports.generator = helpers.generator;

    exports.T = tI18n.default;
    exports.makeBasicT = tI18n.makeBasicT;
    exports.makeT = tI18n.makeT;
    });

    unwrapExports(dist);
    var dist_1 = dist.Plural;
    var dist_2 = dist.generator;
    var dist_3 = dist.T;
    var dist_4 = dist.makeBasicT;
    var dist_5 = dist.makeT;

    var messages = {
      de: {
        "static-messages": {
          "auth-unfamiliar-website": function(d) { return "Unbekannte Website"; },
          "auth-type-code-to-fill": function(d) { return d.code + " tippen, um " + d.type + d.website + " auszufüllen."; },
          "auth-filling-on-website": function(d) { return " auf " + d.website; },
          "auth-incorrect-code-entered": function(d) { return "Falscher Code eingegeben"; },
          "auth-why-is-this-needed": function(d) { return "Wieso ist das nötig?"; },
          "list-no-items": function(d) { return "Keine anzuzeigenden Objekte vorhanden."; },
          "item-save-in-1password": function(d) { return "In 1Password speichern"; },
          "item-use-suggested-password": function(d) { return "Empfohlenes Passwort nutzen"; },
          "item-type-credit-card": function(d) { return "Kreditkarte"; },
          "item-type-identity": function(d) { return "Identität"; },
          "item-type-unspecified": function(d) { return "Objekt"; },
          categories: function(d) { return "Kategorien"; },
          "category-suggestions": function(d) { return "Vorschläge"; },
          "category-logins": function(d) { return "Logins"; },
          "category-identities": function(d) { return "Identitäten"; },
          "category-credit-cards": function(d) { return "Kreditkarten"; },
          "category-generated-password": function(d) { return "Generiertes Passwort"; },
          "category-hide-on-this-page": function(d) { return "Auf dieser Seite ausblenden"; },
          "locked-unlock-from-toolbar": function(d) { return "Bitte 1Password per Symbolleistenicon entsperren."; },
          "locked-press-shortcut-to-unlock": function(d) { return d.shortcut + "-Kürzel tippen, um 1Password zu entsperren"; },
          "notification-add-account": function(d) { return "Konto hinzufügen zu"; },
          "notification-1password-x": function(d) { return "1Password X"; },
          "notification-add-remove-later": function(d) { return "Sie können Konten später in 1Password hinzufügen und entfernen"; },
          "notification-settings": function(d) { return "Einstellungen"; },
          "notification-add-account-never": function(d) { return "Niemals"; },
          "notification-add-account-confirm": function(d) { return "Hinzufügen"; },
          "authorize-fill": function(d) { return "Klicken Sie OK, um Ihr 1Password-Objekt auf " + d.host + " auszufüllen"; }
        }
      },
      en: {
        "static-messages": {
          "auth-unfamiliar-website": function(d) { return "Unfamiliar Website"; },
          "auth-type-code-to-fill": function(d) { return "Type " + d.code + " to authorize " + d.type + " filling" + d.website + "."; },
          "auth-filling-on-website": function(d) { return " on " + d.website; },
          "auth-incorrect-code-entered": function(d) { return "Incorrect code entered"; },
          "auth-why-is-this-needed": function(d) { return "Why is this needed?"; },
          "list-no-items": function(d) { return "No items to show."; },
          "item-save-in-1password": function(d) { return "Save in 1Password"; },
          "item-use-suggested-password": function(d) { return "Use Suggested Password"; },
          "item-type-credit-card": function(d) { return "credit card"; },
          "item-type-identity": function(d) { return "identity"; },
          "item-type-unspecified": function(d) { return "item"; },
          categories: function(d) { return "Categories"; },
          "category-suggestions": function(d) { return "Suggestions"; },
          "category-logins": function(d) { return "Logins"; },
          "category-identities": function(d) { return "Identities"; },
          "category-credit-cards": function(d) { return "Credit Cards"; },
          "category-generated-password": function(d) { return "Generated Password"; },
          "category-hide-on-this-page": function(d) { return "Hide on this page"; },
          "locked-unlock-from-toolbar": function(d) { return "Please unlock 1Password from the toolbar icon."; },
          "locked-press-shortcut-to-unlock": function(d) { return "Press " + d.shortcut + " to unlock 1Password"; },
          "notification-add-account": function(d) { return "Add account to"; },
          "notification-1password-x": function(d) { return "1Password X"; },
          "notification-add-remove-later": function(d) { return "You can add and remove accounts later from 1Password"; },
          "notification-settings": function(d) { return "Settings"; },
          "notification-add-account-never": function(d) { return "Never"; },
          "notification-add-account-confirm": function(d) { return "Add"; },
          "authorize-fill": function(d) { return "Click OK to fill your 1Password item on " + d.host; }
        }
      },
      es: {
        "static-messages": {
          "auth-unfamiliar-website": function(d) { return "Página web no familiar"; },
          "auth-type-code-to-fill": function(d) { return "Escribe " + d.code + " para autorizar que " + d.type + " complete" + d.website + "."; },
          "auth-filling-on-website": function(d) { return " en " + d.website; },
          "auth-incorrect-code-entered": function(d) { return "Código incorrecto introducido"; },
          "auth-why-is-this-needed": function(d) { return "¿Por qué es esto necesario?"; },
          "list-no-items": function(d) { return "No hay elementos que mostrar."; },
          "item-save-in-1password": function(d) { return "Guardar en 1Password"; },
          "item-use-suggested-password": function(d) { return "Usar contraseña sugerida"; },
          "item-type-credit-card": function(d) { return "tarjeta de crédito"; },
          "item-type-identity": function(d) { return "identidad"; },
          "item-type-unspecified": function(d) { return "elemento"; },
          categories: function(d) { return "Categorías"; },
          "category-suggestions": function(d) { return "Sugerencias"; },
          "category-logins": function(d) { return "Inicios de sesión"; },
          "category-identities": function(d) { return "Identidades"; },
          "category-credit-cards": function(d) { return "Tarjetas de crédito"; },
          "category-generated-password": function(d) { return "Contraseña generada"; },
          "category-hide-on-this-page": function(d) { return "Ocultar en esta página"; },
          "locked-unlock-from-toolbar": function(d) { return "Por favor, desbloquea 1Password desde el icono en la barra de herramientas."; },
          "locked-press-shortcut-to-unlock": function(d) { return "Pulsa " + d.shortcut + " para desbloquear 1Password"; },
          "notification-add-account": function(d) { return "Añadir cuenta a"; },
          "notification-1password-x": function(d) { return "1Password X"; },
          "notification-add-remove-later": function(d) { return "Puedes añadir y quitar cuentas más tarde desde 1Password"; },
          "notification-settings": function(d) { return "Ajustes"; },
          "notification-add-account-never": function(d) { return "Nunca"; },
          "notification-add-account-confirm": function(d) { return "Añadir"; },
          "authorize-fill": function(d) { return "Haz clic en OK para completar tu elemento de 1Password en " + d.host; }
        }
      },
      fr: {
        "static-messages": {
          "auth-unfamiliar-website": function(d) { return "Site web non familier"; },
          "auth-type-code-to-fill": function(d) { return "Tapez " + d.code + " pour autoriser " + d.type + " à renseigner " + d.website + "."; },
          "auth-filling-on-website": function(d) { return " sur " + d.website; },
          "auth-incorrect-code-entered": function(d) { return "Code entré incorrect"; },
          "auth-why-is-this-needed": function(d) { return "Pourquoi est-ce nécessaire ?"; },
          "list-no-items": function(d) { return "Aucun élément à afficher."; },
          "item-save-in-1password": function(d) { return "Enregistrer dans 1Password"; },
          "item-use-suggested-password": function(d) { return "Utiliser le mot de passe suggéré"; },
          "item-type-credit-card": function(d) { return "carte de crédit"; },
          "item-type-identity": function(d) { return "identité"; },
          "item-type-unspecified": function(d) { return "élément"; },
          categories: function(d) { return "Catégories"; },
          "category-suggestions": function(d) { return "Suggestions"; },
          "category-logins": function(d) { return "Identifiants"; },
          "category-identities": function(d) { return "Identités"; },
          "category-credit-cards": function(d) { return "Cartes de crédit"; },
          "category-generated-password": function(d) { return "Mot de passe généré"; },
          "category-hide-on-this-page": function(d) { return "Masquer sur cette page"; },
          "locked-unlock-from-toolbar": function(d) { return "Veuillez déverrouiller 1Password depuis l'icône dans la barre d'outils."; },
          "locked-press-shortcut-to-unlock": function(d) { return "Appuyez sur " + d.shortcut + " pour déverrouiller 1Password"; },
          "notification-add-account": function(d) { return "Ajouter le compte à"; },
          "notification-1password-x": function(d) { return "1Password X"; },
          "notification-add-remove-later": function(d) { return "Vous pouvez ajouter et supprimer des comptes plus tard depuis 1Password"; },
          "notification-settings": function(d) { return "Paramètres"; },
          "notification-add-account-never": function(d) { return "Jamais"; },
          "notification-add-account-confirm": function(d) { return "Ajouter"; },
          "authorize-fill": function(d) { return "Cliquez sur OK pour remplir votre élément 1Password sur " + d.host; }
        }
      },
      it: {
        "static-messages": {
          "auth-unfamiliar-website": function(d) { return "Sito web sconosciuto"; },
          "auth-type-code-to-fill": function(d) { return "Digita " + d.code + " per autorizzare " + d.type + " a compilare " + d.website + "."; },
          "auth-filling-on-website": function(d) { return " su " + d.website; },
          "auth-incorrect-code-entered": function(d) { return "Codice inserito non corretto"; },
          "auth-why-is-this-needed": function(d) { return "Perché questo è necessario?"; },
          "list-no-items": function(d) { return "Nessun elemento da mostrare."; },
          "item-save-in-1password": function(d) { return "Salva in 1Password"; },
          "item-use-suggested-password": function(d) { return "Usa password suggerita"; },
          "item-type-credit-card": function(d) { return "carta di credito"; },
          "item-type-identity": function(d) { return "identità"; },
          "item-type-unspecified": function(d) { return "elemento"; },
          categories: function(d) { return "Categorie"; },
          "category-suggestions": function(d) { return "Suggerimenti"; },
          "category-logins": function(d) { return "Dati di accesso"; },
          "category-identities": function(d) { return "Identità"; },
          "category-credit-cards": function(d) { return "Carte di credito"; },
          "category-generated-password": function(d) { return "Password generata"; },
          "category-hide-on-this-page": function(d) { return "Nascondi su questa pagina"; },
          "locked-unlock-from-toolbar": function(d) { return "Sblocca 1Password dall'icona nella barra degli strumenti."; },
          "locked-press-shortcut-to-unlock": function(d) { return "Premi " + d.shortcut + " per sbloccare 1Password"; },
          "notification-add-account": function(d) { return "Aggiungi account a"; },
          "notification-1password-x": function(d) { return "1Password X"; },
          "notification-add-remove-later": function(d) { return "Puoi aggiungere e rimuovere account in un secondo momento da 1Password"; },
          "notification-settings": function(d) { return "Impostazioni"; },
          "notification-add-account-never": function(d) { return "Mai"; },
          "notification-add-account-confirm": function(d) { return "Aggiungi"; },
          "authorize-fill": function(d) { return "Clicca OK per compilare il tuo elemento di 1Password su " + d.host; }
        }
      },
      ja: {
        "static-messages": {
          "auth-unfamiliar-website": function(d) { return "不明なウェブサイト"; },
          "auth-type-code-to-fill": function(d) { return d.code + " を入力し、" + d.website + " に" + d.type + " を入力します。"; },
          "auth-filling-on-website": function(d) { return " 指定先 " + d.website; },
          "auth-incorrect-code-entered": function(d) { return "不正なコードが入力されました"; },
          "auth-why-is-this-needed": function(d) { return "なぜこれが必要ですか？"; },
          "list-no-items": function(d) { return "表示する項目がありません。"; },
          "item-save-in-1password": function(d) { return "1Passwordに保存する"; },
          "item-use-suggested-password": function(d) { return "おすすめのパスワードを使用する"; },
          "item-type-credit-card": function(d) { return "クレジットカード"; },
          "item-type-identity": function(d) { return "個人情報"; },
          "item-type-unspecified": function(d) { return "アイテム"; },
          categories: function(d) { return "カテゴリ"; },
          "category-suggestions": function(d) { return "おすすめ"; },
          "category-logins": function(d) { return "ログイン"; },
          "category-identities": function(d) { return "個人情報"; },
          "category-credit-cards": function(d) { return "クレジットカード"; },
          "category-generated-password": function(d) { return "生成されたパスワード"; },
          "category-hide-on-this-page": function(d) { return "このページに表示しない"; },
          "locked-unlock-from-toolbar": function(d) { return "ツールバーのアイコンから1Passwordをアンロックしてください。"; },
          "locked-press-shortcut-to-unlock": function(d) { return d.shortcut + " を使用して、1Passwordをアンロック"; },
          "notification-add-account": function(d) { return "アカウントの追加先"; },
          "notification-1password-x": function(d) { return "1Password X"; },
          "notification-add-remove-later": function(d) { return "アカウントは、後で1Passwordから追加したり削除することができます"; },
          "notification-settings": function(d) { return "設定"; },
          "notification-add-account-never": function(d) { return "追加しない"; },
          "notification-add-account-confirm": function(d) { return "追加する"; },
          "authorize-fill": function(d) { return "「OK」をクリックして、" + d.host + " の1Passwordアイテムを入力します"; }
        }
      },
      ko: {
        "static-messages": {
          "auth-unfamiliar-website": function(d) { return "친숙하지 않은 웹사이트"; },
          "auth-type-code-to-fill": function(d) { return d.website + " " + d.type + "의 자동 입력을 승인하려면 " + d.code + "을(를) 입력하세요."; },
          "auth-filling-on-website": function(d) { return d.website + "에서"; },
          "auth-incorrect-code-entered": function(d) { return "잘못된 코드가 입력되었습니다"; },
          "auth-why-is-this-needed": function(d) { return "이것은 왜 필요하나요?"; },
          "list-no-items": function(d) { return "표시할 항목이 없습니다."; },
          "item-save-in-1password": function(d) { return "1Password에 저장"; },
          "item-use-suggested-password": function(d) { return "제안된 비밀번호 사용"; },
          "item-type-credit-card": function(d) { return "신용카드"; },
          "item-type-identity": function(d) { return "신원 정보"; },
          "item-type-unspecified": function(d) { return "항목"; },
          categories: function(d) { return "카테고리"; },
          "category-suggestions": function(d) { return "제안"; },
          "category-logins": function(d) { return "로그인 정보"; },
          "category-identities": function(d) { return "신원 정보"; },
          "category-credit-cards": function(d) { return "신용카드"; },
          "category-generated-password": function(d) { return "생성된 비밀번호"; },
          "category-hide-on-this-page": function(d) { return "이 페이지에서 숨기기"; },
          "locked-unlock-from-toolbar": function(d) { return "도구 모음 아이콘에서 1Password를 잠금 해제하세요."; },
          "locked-press-shortcut-to-unlock": function(d) { return d.shortcut + "을(를) 눌러서 1Password를 잠금 해제합니다"; },
          "notification-add-account": function(d) { return "다음에 계정 추가"; },
          "notification-1password-x": function(d) { return "1Password X"; },
          "notification-add-remove-later": function(d) { return "나중에 1Password에서 계정을 추가 또는 제거할 수 있습니다"; },
          "notification-settings": function(d) { return "설정"; },
          "notification-add-account-never": function(d) { return "안 함"; },
          "notification-add-account-confirm": function(d) { return "추가"; },
          "authorize-fill": function(d) { return d.host + "에서 1Password 항목을 채우려면 확인을 클릭하세요"; }
        }
      },
      pt: {
        "static-messages": {
          "auth-unfamiliar-website": function(d) { return "Site desconhecido"; },
          "auth-type-code-to-fill": function(d) { return "Digite " + d.code + " para autorizar " + d.type + " a preencher" + d.website + "."; },
          "auth-filling-on-website": function(d) { return " em " + d.website; },
          "auth-incorrect-code-entered": function(d) { return "Foi informado um código incorreto"; },
          "auth-why-is-this-needed": function(d) { return "Por que isso é necessário?"; },
          "list-no-items": function(d) { return "Nenhum item para mostrar."; },
          "item-save-in-1password": function(d) { return "Salvar no 1Password"; },
          "item-use-suggested-password": function(d) { return "Usar a senha sugerida"; },
          "item-type-credit-card": function(d) { return "cartão de crédito"; },
          "item-type-identity": function(d) { return "identidade"; },
          "item-type-unspecified": function(d) { return "item"; },
          categories: function(d) { return "Categorias"; },
          "category-suggestions": function(d) { return "Sugestões"; },
          "category-logins": function(d) { return "Credenciais"; },
          "category-identities": function(d) { return "Identidades"; },
          "category-credit-cards": function(d) { return "Cartões de crédito"; },
          "category-generated-password": function(d) { return "Senha gerada"; },
          "category-hide-on-this-page": function(d) { return "Ocultar nesta página"; },
          "locked-unlock-from-toolbar": function(d) { return "Desbloqueie o 1Password no ícone da barra de ferramentas."; },
          "locked-press-shortcut-to-unlock": function(d) { return "Pressione " + d.shortcut + " para desbloquear o 1Password"; },
          "notification-add-account": function(d) { return "Adicionar conta ao"; },
          "notification-1password-x": function(d) { return "1Password X"; },
          "notification-add-remove-later": function(d) { return "Você poderá adicionar e remover contas do 1Password depois"; },
          "notification-settings": function(d) { return "Configurações"; },
          "notification-add-account-never": function(d) { return "Nunca"; },
          "notification-add-account-confirm": function(d) { return "Adicionar"; },
          "authorize-fill": function(d) { return "Clique em OK para preencher o item do 1Password no " + d.host; }
        }
      },
      ru: {
        "static-messages": {
          "auth-unfamiliar-website": function(d) { return "Неизвестный веб-сайт"; },
          "auth-type-code-to-fill": function(d) { return "Введите " + d.code + " для авторизации " + d.type + " заполнения " + d.website + "."; },
          "auth-filling-on-website": function(d) { return " на " + d.website; },
          "auth-incorrect-code-entered": function(d) { return "Введен неверный код"; },
          "auth-why-is-this-needed": function(d) { return "Почему это необходимо?"; },
          "list-no-items": function(d) { return "Нет элементов для отображения."; },
          "item-save-in-1password": function(d) { return "Сохранить в 1Password"; },
          "item-use-suggested-password": function(d) { return "Использовать предложенный пароль"; },
          "item-type-credit-card": function(d) { return "банковская карта"; },
          "item-type-identity": function(d) { return "удос-я личности"; },
          "item-type-unspecified": function(d) { return "элемент"; },
          categories: function(d) { return "Категории"; },
          "category-suggestions": function(d) { return "Предложения"; },
          "category-logins": function(d) { return "Данные для входа"; },
          "category-identities": function(d) { return "Удос-я личности"; },
          "category-credit-cards": function(d) { return "Банковские карты"; },
          "category-generated-password": function(d) { return "Сгенерированный пароль"; },
          "category-hide-on-this-page": function(d) { return "Скрыть на этой странице"; },
          "locked-unlock-from-toolbar": function(d) { return "Пожалуйста, разблокируйте 1Password, нажав на иконку в панели инструментов."; },
          "locked-press-shortcut-to-unlock": function(d) { return "Нажмите " + d.shortcut + " для разблокировки 1Password"; },
          "notification-add-account": function(d) { return "Добавить аккаунт в"; },
          "notification-1password-x": function(d) { return "1Password X"; },
          "notification-add-remove-later": function(d) { return "Вы можете добавить или удалить аккаунты из 1Password позже, перейдя в Настройки"; },
          "notification-settings": function(d) { return "Настройки"; },
          "notification-add-account-never": function(d) { return "Никогда"; },
          "notification-add-account-confirm": function(d) { return "Добавить"; },
          "authorize-fill": function(d) { return "Нажмите ОК, чтобы заполнить элемент 1Password на " + d.host; }
        }
      },
      "zh-CN": {
        "static-messages": {
          "auth-unfamiliar-website": function(d) { return "不熟悉的网站"; },
          "auth-type-code-to-fill": function(d) { return "输入 " + d.code + " 以授权 " + d.type + " 填充" + d.website + "。"; },
          "auth-filling-on-website": function(d) { return "在 " + d.website; },
          "auth-incorrect-code-entered": function(d) { return "输入了不正确的代码"; },
          "auth-why-is-this-needed": function(d) { return "为什么需要此操作？"; },
          "list-no-items": function(d) { return "没有可显示的项目。"; },
          "item-save-in-1password": function(d) { return "在 1Password 中保存"; },
          "item-use-suggested-password": function(d) { return "使用建议的密码"; },
          "item-type-credit-card": function(d) { return "信用卡"; },
          "item-type-identity": function(d) { return "身份标识"; },
          "item-type-unspecified": function(d) { return "项目"; },
          categories: function(d) { return "类别"; },
          "category-suggestions": function(d) { return "建议"; },
          "category-logins": function(d) { return "登录信息"; },
          "category-identities": function(d) { return "身份标识"; },
          "category-credit-cards": function(d) { return "信用卡"; },
          "category-generated-password": function(d) { return "已生成的密码"; },
          "category-hide-on-this-page": function(d) { return "在此页面隐藏"; },
          "locked-unlock-from-toolbar": function(d) { return "请从工具栏图标中解锁 1Password。"; },
          "locked-press-shortcut-to-unlock": function(d) { return "按下 " + d.shortcut + " 来解锁 1Password"; },
          "notification-add-account": function(d) { return "将帐户添加到"; },
          "notification-1password-x": function(d) { return "1Password X"; },
          "notification-add-remove-later": function(d) { return "之后您可以在 1Password 中添加和移除帐户"; },
          "notification-settings": function(d) { return "设置"; },
          "notification-add-account-never": function(d) { return "从不"; },
          "notification-add-account-confirm": function(d) { return "添加"; },
          "authorize-fill": function(d) { return "点击 OK 以在 " + d.host + " 填写您 1Password 的项目"; }
        }
      },
      "zh-TW": {
        "static-messages": {
          "auth-unfamiliar-website": function(d) { return "不熟悉的網站"; },
          "auth-type-code-to-fill": function(d) { return "輸入 " + d.code + " 以授權 " + d.type + " 填充" + d.website + "。"; },
          "auth-filling-on-website": function(d) { return "到 " + d.website; },
          "auth-incorrect-code-entered": function(d) { return "輸入了不正確的代碼"; },
          "auth-why-is-this-needed": function(d) { return "為什麼需要此行為？"; },
          "list-no-items": function(d) { return "無可顯示的項目。"; },
          "item-save-in-1password": function(d) { return "在 1Password 中儲存"; },
          "item-use-suggested-password": function(d) { return "使用推薦的密碼"; },
          "item-type-credit-card": function(d) { return "信用卡"; },
          "item-type-identity": function(d) { return "身分認證"; },
          "item-type-unspecified": function(d) { return "項目"; },
          categories: function(d) { return "類別"; },
          "category-suggestions": function(d) { return "建議"; },
          "category-logins": function(d) { return "登入"; },
          "category-identities": function(d) { return "身分認證"; },
          "category-credit-cards": function(d) { return "信用卡"; },
          "category-generated-password": function(d) { return "建立密碼"; },
          "category-hide-on-this-page": function(d) { return "在此頁面上隱藏"; },
          "locked-unlock-from-toolbar": function(d) { return "請從工具列圖示中解鎖 1Password。"; },
          "locked-press-shortcut-to-unlock": function(d) { return "按 " + d.shortcut + " 來解鎖 1Password"; },
          "notification-add-account": function(d) { return "將帳號添加到"; },
          "notification-1password-x": function(d) { return "1Password X"; },
          "notification-add-remove-later": function(d) { return "之後您可以在 1Password 中添加和移除帳號"; },
          "notification-settings": function(d) { return "設定"; },
          "notification-add-account-never": function(d) { return "永不"; },
          "notification-add-account-confirm": function(d) { return "添加"; },
          "authorize-fill": function(d) { return "點擊 OK 以在 " + d.host + " 填寫您 1Password 的項目"; }
        }
      }
    };

    function supportsLocale(locale) {
        // We have to do runtime checks because the messageformat-cli output can change
        if ("en" in messages && typeof messages["en"] === "object") {
            // If the messages are broken down by locale then check to see if there are messages for the requested locale
            return messages[locale] !== undefined;
        }
        // If we only support english, then check if the locale requested is english
        return locale === "en";
    }
    function loadMessages(lang) {
        let staticMessages = {};
        let dynamicMessages = {};
        let localeMessages;
        // We have to do runtime checks because the messageformat-cli output can change
        if ("en" in messages && typeof messages["en"] === "object") {
            localeMessages = messages[lang];
        }
        else {
            localeMessages = messages;
        }
        if ("messages" in localeMessages) {
            dynamicMessages = localeMessages["messages"];
        }
        if ("static-messages" in localeMessages) {
            staticMessages = localeMessages["static-messages"];
        }
        return {
            [lang]: Object.assign(Object.assign({}, staticMessages), dynamicMessages),
        };
    }
    function createLocale(locale) {
        if (!supportsLocale(locale)) {
            throw new Error(`Not able to support locale ${locale}`);
        }
        // Grab the messages for the locale
        const messages = loadMessages(locale);
        // Then create the locale object using the messages for that locale
        const T = dist_5();
        T.set({ locale, messages });
        return T;
    }

    /* shared/components/Locale.svelte generated by Svelte v3.17.1 */

    function create_fragment$1(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 4) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[2], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null));
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const params = new URLSearchParams(window.location.search);
    	let locale = params.get("locale");
    	setContext("locale", createLocale(locale));
    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	return [params, locale, $$scope, $$slots];
    }

    class Locale extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});
    	}
    }

    /* shared/components/App.svelte generated by Svelte v3.17.1 */

    function create_default_slot_1(ctx) {
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*component*/ ctx[1];

    	function switch_props(ctx) {
    		return {};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props());
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (switch_value !== (switch_value = /*component*/ ctx[1])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    // (9:0) <Bridge {bridge}>
    function create_default_slot(ctx) {
    	let current;

    	const locale = new Locale({
    			props: {
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(locale.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(locale, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const locale_changes = {};

    			if (dirty & /*$$scope, component*/ 6) {
    				locale_changes.$$scope = { dirty, ctx };
    			}

    			locale.$set(locale_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(locale.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(locale.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(locale, detaching);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let current;

    	const bridge_1 = new Bridge({
    			props: {
    				bridge: /*bridge*/ ctx[0],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(bridge_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(bridge_1, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const bridge_1_changes = {};
    			if (dirty & /*bridge*/ 1) bridge_1_changes.bridge = /*bridge*/ ctx[0];

    			if (dirty & /*$$scope, component*/ 6) {
    				bridge_1_changes.$$scope = { dirty, ctx };
    			}

    			bridge_1.$set(bridge_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(bridge_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(bridge_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(bridge_1, detaching);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { bridge } = $$props;
    	let { component } = $$props;

    	$$self.$set = $$props => {
    		if ("bridge" in $$props) $$invalidate(0, bridge = $$props.bridge);
    		if ("component" in $$props) $$invalidate(1, component = $$props.component);
    	};

    	return [bridge, component];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { bridge: 0, component: 1 });
    	}
    }

    function symbolObservablePonyfill(root) {
    	var result;
    	var Symbol = root.Symbol;

    	if (typeof Symbol === 'function') {
    		if (Symbol.observable) {
    			result = Symbol.observable;
    		} else {
    			result = Symbol('observable');
    			Symbol.observable = result;
    		}
    	} else {
    		result = '@@observable';
    	}

    	return result;
    }

    /* global window */

    var root;

    if (typeof self !== 'undefined') {
      root = self;
    } else if (typeof window !== 'undefined') {
      root = window;
    } else if (typeof global !== 'undefined') {
      root = global;
    } else if (typeof module !== 'undefined') {
      root = module;
    } else {
      root = Function('return this')();
    }

    var result = symbolObservablePonyfill(root);

    /**
     * These are private action types reserved by Redux.
     * For any unknown actions, you must return the current state.
     * If the current state is undefined, you must return the initial state.
     * Do not reference these action types directly in your code.
     */
    var randomString = function randomString() {
      return Math.random().toString(36).substring(7).split('').join('.');
    };

    var ActionTypes = {
      INIT: "@@redux/INIT" + randomString(),
      REPLACE: "@@redux/REPLACE" + randomString(),
      PROBE_UNKNOWN_ACTION: function PROBE_UNKNOWN_ACTION() {
        return "@@redux/PROBE_UNKNOWN_ACTION" + randomString();
      }
    };

    /**
     * @param {any} obj The object to inspect.
     * @returns {boolean} True if the argument appears to be a plain object.
     */
    function isPlainObject(obj) {
      if (typeof obj !== 'object' || obj === null) return false;
      var proto = obj;

      while (Object.getPrototypeOf(proto) !== null) {
        proto = Object.getPrototypeOf(proto);
      }

      return Object.getPrototypeOf(obj) === proto;
    }

    /**
     * Creates a Redux store that holds the state tree.
     * The only way to change the data in the store is to call `dispatch()` on it.
     *
     * There should only be a single store in your app. To specify how different
     * parts of the state tree respond to actions, you may combine several reducers
     * into a single reducer function by using `combineReducers`.
     *
     * @param {Function} reducer A function that returns the next state tree, given
     * the current state tree and the action to handle.
     *
     * @param {any} [preloadedState] The initial state. You may optionally specify it
     * to hydrate the state from the server in universal apps, or to restore a
     * previously serialized user session.
     * If you use `combineReducers` to produce the root reducer function, this must be
     * an object with the same shape as `combineReducers` keys.
     *
     * @param {Function} [enhancer] The store enhancer. You may optionally specify it
     * to enhance the store with third-party capabilities such as middleware,
     * time travel, persistence, etc. The only store enhancer that ships with Redux
     * is `applyMiddleware()`.
     *
     * @returns {Store} A Redux store that lets you read the state, dispatch actions
     * and subscribe to changes.
     */

    function createStore(reducer, preloadedState, enhancer) {
      var _ref2;

      if (typeof preloadedState === 'function' && typeof enhancer === 'function' || typeof enhancer === 'function' && typeof arguments[3] === 'function') {
        throw new Error('It looks like you are passing several store enhancers to ' + 'createStore(). This is not supported. Instead, compose them ' + 'together to a single function.');
      }

      if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
        enhancer = preloadedState;
        preloadedState = undefined;
      }

      if (typeof enhancer !== 'undefined') {
        if (typeof enhancer !== 'function') {
          throw new Error('Expected the enhancer to be a function.');
        }

        return enhancer(createStore)(reducer, preloadedState);
      }

      if (typeof reducer !== 'function') {
        throw new Error('Expected the reducer to be a function.');
      }

      var currentReducer = reducer;
      var currentState = preloadedState;
      var currentListeners = [];
      var nextListeners = currentListeners;
      var isDispatching = false;
      /**
       * This makes a shallow copy of currentListeners so we can use
       * nextListeners as a temporary list while dispatching.
       *
       * This prevents any bugs around consumers calling
       * subscribe/unsubscribe in the middle of a dispatch.
       */

      function ensureCanMutateNextListeners() {
        if (nextListeners === currentListeners) {
          nextListeners = currentListeners.slice();
        }
      }
      /**
       * Reads the state tree managed by the store.
       *
       * @returns {any} The current state tree of your application.
       */


      function getState() {
        if (isDispatching) {
          throw new Error('You may not call store.getState() while the reducer is executing. ' + 'The reducer has already received the state as an argument. ' + 'Pass it down from the top reducer instead of reading it from the store.');
        }

        return currentState;
      }
      /**
       * Adds a change listener. It will be called any time an action is dispatched,
       * and some part of the state tree may potentially have changed. You may then
       * call `getState()` to read the current state tree inside the callback.
       *
       * You may call `dispatch()` from a change listener, with the following
       * caveats:
       *
       * 1. The subscriptions are snapshotted just before every `dispatch()` call.
       * If you subscribe or unsubscribe while the listeners are being invoked, this
       * will not have any effect on the `dispatch()` that is currently in progress.
       * However, the next `dispatch()` call, whether nested or not, will use a more
       * recent snapshot of the subscription list.
       *
       * 2. The listener should not expect to see all state changes, as the state
       * might have been updated multiple times during a nested `dispatch()` before
       * the listener is called. It is, however, guaranteed that all subscribers
       * registered before the `dispatch()` started will be called with the latest
       * state by the time it exits.
       *
       * @param {Function} listener A callback to be invoked on every dispatch.
       * @returns {Function} A function to remove this change listener.
       */


      function subscribe(listener) {
        if (typeof listener !== 'function') {
          throw new Error('Expected the listener to be a function.');
        }

        if (isDispatching) {
          throw new Error('You may not call store.subscribe() while the reducer is executing. ' + 'If you would like to be notified after the store has been updated, subscribe from a ' + 'component and invoke store.getState() in the callback to access the latest state. ' + 'See https://redux.js.org/api-reference/store#subscribelistener for more details.');
        }

        var isSubscribed = true;
        ensureCanMutateNextListeners();
        nextListeners.push(listener);
        return function unsubscribe() {
          if (!isSubscribed) {
            return;
          }

          if (isDispatching) {
            throw new Error('You may not unsubscribe from a store listener while the reducer is executing. ' + 'See https://redux.js.org/api-reference/store#subscribelistener for more details.');
          }

          isSubscribed = false;
          ensureCanMutateNextListeners();
          var index = nextListeners.indexOf(listener);
          nextListeners.splice(index, 1);
          currentListeners = null;
        };
      }
      /**
       * Dispatches an action. It is the only way to trigger a state change.
       *
       * The `reducer` function, used to create the store, will be called with the
       * current state tree and the given `action`. Its return value will
       * be considered the **next** state of the tree, and the change listeners
       * will be notified.
       *
       * The base implementation only supports plain object actions. If you want to
       * dispatch a Promise, an Observable, a thunk, or something else, you need to
       * wrap your store creating function into the corresponding middleware. For
       * example, see the documentation for the `redux-thunk` package. Even the
       * middleware will eventually dispatch plain object actions using this method.
       *
       * @param {Object} action A plain object representing “what changed”. It is
       * a good idea to keep actions serializable so you can record and replay user
       * sessions, or use the time travelling `redux-devtools`. An action must have
       * a `type` property which may not be `undefined`. It is a good idea to use
       * string constants for action types.
       *
       * @returns {Object} For convenience, the same action object you dispatched.
       *
       * Note that, if you use a custom middleware, it may wrap `dispatch()` to
       * return something else (for example, a Promise you can await).
       */


      function dispatch(action) {
        if (!isPlainObject(action)) {
          throw new Error('Actions must be plain objects. ' + 'Use custom middleware for async actions.');
        }

        if (typeof action.type === 'undefined') {
          throw new Error('Actions may not have an undefined "type" property. ' + 'Have you misspelled a constant?');
        }

        if (isDispatching) {
          throw new Error('Reducers may not dispatch actions.');
        }

        try {
          isDispatching = true;
          currentState = currentReducer(currentState, action);
        } finally {
          isDispatching = false;
        }

        var listeners = currentListeners = nextListeners;

        for (var i = 0; i < listeners.length; i++) {
          var listener = listeners[i];
          listener();
        }

        return action;
      }
      /**
       * Replaces the reducer currently used by the store to calculate the state.
       *
       * You might need this if your app implements code splitting and you want to
       * load some of the reducers dynamically. You might also need this if you
       * implement a hot reloading mechanism for Redux.
       *
       * @param {Function} nextReducer The reducer for the store to use instead.
       * @returns {void}
       */


      function replaceReducer(nextReducer) {
        if (typeof nextReducer !== 'function') {
          throw new Error('Expected the nextReducer to be a function.');
        }

        currentReducer = nextReducer; // This action has a similiar effect to ActionTypes.INIT.
        // Any reducers that existed in both the new and old rootReducer
        // will receive the previous state. This effectively populates
        // the new state tree with any relevant data from the old one.

        dispatch({
          type: ActionTypes.REPLACE
        });
      }
      /**
       * Interoperability point for observable/reactive libraries.
       * @returns {observable} A minimal observable of state changes.
       * For more information, see the observable proposal:
       * https://github.com/tc39/proposal-observable
       */


      function observable() {
        var _ref;

        var outerSubscribe = subscribe;
        return _ref = {
          /**
           * The minimal observable subscription method.
           * @param {Object} observer Any object that can be used as an observer.
           * The observer object should have a `next` method.
           * @returns {subscription} An object with an `unsubscribe` method that can
           * be used to unsubscribe the observable from the store, and prevent further
           * emission of values from the observable.
           */
          subscribe: function subscribe(observer) {
            if (typeof observer !== 'object' || observer === null) {
              throw new TypeError('Expected the observer to be an object.');
            }

            function observeState() {
              if (observer.next) {
                observer.next(getState());
              }
            }

            observeState();
            var unsubscribe = outerSubscribe(observeState);
            return {
              unsubscribe: unsubscribe
            };
          }
        }, _ref[result] = function () {
          return this;
        }, _ref;
      } // When a store is created, an "INIT" action is dispatched so that every
      // reducer returns their initial state. This effectively populates
      // the initial state tree.


      dispatch({
        type: ActionTypes.INIT
      });
      return _ref2 = {
        dispatch: dispatch,
        subscribe: subscribe,
        getState: getState,
        replaceReducer: replaceReducer
      }, _ref2[result] = observable, _ref2;
    }

    /**
     * Prints a warning in the console if it exists.
     *
     * @param {String} message The warning message.
     * @returns {void}
     */
    function warning(message) {
      /* eslint-disable no-console */
      if (typeof console !== 'undefined' && typeof console.error === 'function') {
        console.error(message);
      }
      /* eslint-enable no-console */


      try {
        // This error was thrown as a convenience so that if you enable
        // "break on all exceptions" in your console,
        // it would pause the execution at this line.
        throw new Error(message);
      } catch (e) {} // eslint-disable-line no-empty

    }

    /*
     * This is a dummy function to check if the function name has been altered by minification.
     * If the function has been minified and NODE_ENV !== 'production', warn the user.
     */

    function isCrushed() {}

    if ( typeof isCrushed.name === 'string' && isCrushed.name !== 'isCrushed') {
      warning('You are currently using minified code outside of NODE_ENV === "production". ' + 'This means that you are running a slower development build of Redux. ' + 'You can use loose-envify (https://github.com/zertosh/loose-envify) for browserify ' + 'or setting mode to production in webpack (https://webpack.js.org/concepts/mode/) ' + 'to ensure you have the correct code for your production build.');
    }

    const initialState = {
        locked: true,
        basePath: "/",
        configured: false,
        activeField: undefined,
        activeFieldDesignation: undefined,
        activeFieldRect: undefined,
        activeFieldDir: "ltr",
        autoshowMenu: false,
        inlineMenuOpen: false,
        inlineMenuToken: undefined,
        fillInProgress: false,
        inlineDisabled: false,
        locale: "en",
        fillPendingUserInteraction: false,
    };
    function reducer(state, action) {
        if (!state) {
            return initialState;
        }
        switch (action.type) {
            case "configure":
                return Object.assign(Object.assign(Object.assign({}, state), action.payload), { configured: true });
            case "lock-state-changed":
                return Object.assign(Object.assign({}, state), { locked: action.payload });
            case "set-active-field":
                const activeFieldStyle = action.payload ? window.getComputedStyle(action.payload) : { direction: "ltr" };
                const activeFieldDir = activeFieldStyle.direction === "rtl" ? "rtl" : "ltr";
                return Object.assign(Object.assign({}, state), { activeField: action.payload, activeFieldDesignation: action.payload ? state.activeFieldDesignation : undefined, activeFieldRect: action.payload ? action.payload.getBoundingClientRect() : undefined, activeFieldDir });
            case "set-active-field-designation":
                return Object.assign(Object.assign({}, state), { activeFieldDesignation: action.payload });
            case "set-autoshow-menu":
                return Object.assign(Object.assign({}, state), { autoshowMenu: action.payload });
            case "set-inline-menu-open":
                return Object.assign(Object.assign({}, state), { inlineMenuOpen: action.payload });
            case "set-inline-menu-token":
                return Object.assign(Object.assign({}, state), { inlineMenuToken: action.payload });
            case "fill-start":
                return Object.assign(Object.assign({}, state), { fillInProgress: true, fillPendingUserInteraction: action.payload });
            case "fill-end":
                return Object.assign(Object.assign({}, state), { fillInProgress: false });
            case "set-page-excluded":
                return Object.assign(Object.assign({}, state), { inlineDisabled: action.payload });
            case "cancel-pending-fill":
                return Object.assign(Object.assign({}, state), { fillPendingUserInteraction: false });
            default: {
                return state;
            }
        }
    }
    const store = createStore(reducer);

    const v = {
        uuid: (value) => {
            return typeof value === "string" && value.length === 26;
        },
        boolean: (value) => {
            return typeof value === "boolean";
        },
        string: (value) => {
            return typeof value === "string";
        },
        nonEmptyString: (value) => {
            return v.string(value) && value.length > 0;
        },
        array: (value) => {
            return Array.isArray(value);
        },
        number: (value) => {
            return typeof value === "number";
        },
        stringOrNumber: (value) => {
            return typeof value === "string" || typeof value === "number";
        },
        date: (value) => {
            return v.stringOrNumber(value) && !isNaN(Number(new Date(value)));
        },
    };
    function validate(validator, value, defaultValue) {
        if (validator(value)) {
            return value;
        }
        // Can't ever use `undefined` as a default value. Not sure if that's good or not. - Dalton
        if (defaultValue !== undefined) {
            return defaultValue;
        }
        throw new Error(`The "${validator.name}" validator found an invalid value.`);
    }

    class ItemListEntry {
        constructor(entry) {
            this.uuid = validate(v.string, entry.uuid, "");
            this.title = validate(v.string, entry.title, "");
            this.templateUuid = validate(v.string, entry.templateUuid, "001");
            this.secondary = validate(v.string, entry.secondary, "");
            this.iconPath = validate(v.string, entry.iconPath, "");
            this.favorite = validate(v.boolean, entry.favorite, false);
            this.color = validate(v.string, entry.color, "");
            this.hasCustomIcon = validate(v.boolean, entry.hasCustomIcon, false);
        }
    }

    class InlineMenuBridge {
        constructor(transport) {
            this.transport = transport;
            this.onVerificationToken = (callback) => {
                this.transport.on("verification-token", callback);
            };
            this.onFocusInlineMenu = (callback) => {
                this.transport.on("focus-inline-menu", callback);
            };
            this.onFilterInlineMenu = (callback) => {
                this.transport.on("filter-inline-menu", callback);
            };
            this.onEditedStateChanged = (callback) => {
                this.transport.on("edited-state-changed", callback);
            };
        }
        requestVerificationToken() {
            return this.transport.request(toFrames({ name: "request-verification-token" }));
        }
        async getItems(templateUuid) {
            const response = await this.transport.request({ name: "get-items", data: { templateUuid } });
            return response.map((entry) => new ItemListEntry(entry));
        }
        getSuggestedPassword() {
            return this.transport.request({ name: "get-suggested-password", data: {} });
        }
        inlineMenuReady() {
            return this.transport.request(toFrames({ name: "inline-menu-ready" }));
        }
        resizeMenu(height, width) {
            return this.transport.request(toFrames({ name: "resize-inline-menu", data: { height, width } }));
        }
        removeMenu() {
            return this.transport.request(toFrames({ name: "remove-inline-menu", data: true }));
        }
        fillGeneratedPassword(password) {
            return this.transport.request({
                name: "fill-generated-password",
                data: { password },
            });
        }
        fillItem(itemUuid, postFill) {
            return this.transport.request({
                name: "fill-item",
                data: {
                    itemUuid: itemUuid,
                    postFill: postFill,
                },
            });
        }
        saveItem() {
            const { fieldDesignation = "" } = store.getState().activeFieldDesignation || {};
            return this.transport.request({
                name: "save-item",
                data: {
                    fieldType: fieldDesignation,
                },
            });
        }
        getCustomIcon(itemUuid) {
            return this.transport.request({
                name: "get-custom-icon-url",
                data: { itemUuid },
            });
        }
        focusPage() {
            return this.transport.request(toFrames({ name: "focus-page" }));
        }
        getKeyboardShortcuts() {
            return this.transport.request({ name: "get-keyboard-shortcuts", data: {} });
        }
        pageExclusionRequest() {
            return this.transport.request({ name: "page-exclusion-request", data: {} });
        }
    }

    const markdown = {
        "*": "strong",
        "`": "mark",
    };
    /**
     * Convert a string that contains markdown characters to a formatted array.
     * e.g. "Press *shortcut* to unlock 1Password." => ["Press ", ["strong", "shortcut"], " to unlock 1Password."]
     */
    function parseWords(words) {
        let unformatted = "";
        const parsed = [];
        const formatted = new Map();
        for (const [index, char] of [...words].entries()) {
            // Markdown symbol found. Decide whether to begin or end formatting.
            if (Object.keys(markdown).includes(char)) {
                const formatName = markdown[char];
                if (formatted.size === 0) {
                    // First, add the currently unformatted string to the `parsed` array before starting the new style
                    parsed.push(unformatted);
                    unformatted = "";
                    // Then begin formatting characters.
                    formatted.set(formatName, "");
                }
                else if (formatted.keys().next().value === formatName) {
                    // Add formatted characters to `parsed` array.
                    parsed.push(...formatted.entries());
                    formatted.clear();
                }
                continue;
            }
            // Formatting in progress. Continue formatting by adding the current character.
            if (formatted.size > 0) {
                const tag = formatted.keys().next().value;
                formatted.set(tag, formatted.get(tag) + char);
                continue;
            }
            // Add regular character to `unformatted` string.
            unformatted += char;
            // If this is the last character and there's an unformatted portion, add it to the parsed
            if (unformatted && index === words.length - 1) {
                parsed.push(unformatted);
            }
        }
        return parsed;
    }
    function parsePhrase(phrase) {
        if (typeof phrase !== "string")
            return [];
        return phrase.split(/\r?\n/g).reduce((parsed, words) => {
            parsed.push(...parseWords(words));
            return parsed;
        }, []);
    }

    /* shared/components/FormattedString.svelte generated by Svelte v3.17.1 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (17:2) {:else}
    function create_else_block(ctx) {
    	let t_value = /*component*/ ctx[2] + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (11:2) {#if component instanceof Array}
    function create_if_block(ctx) {
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (/*component*/ ctx[2][0] === "strong") return create_if_block_1;
    		if (/*component*/ ctx[2][0] === "mark") return create_if_block_2;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if_block.p(ctx, dirty);
    		},
    		d(detaching) {
    			if (if_block) {
    				if_block.d(detaching);
    			}

    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (14:38) 
    function create_if_block_2(ctx) {
    	let mark;
    	let t_value = /*component*/ ctx[2][1] + "";
    	let t;

    	return {
    		c() {
    			mark = element("mark");
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, mark, anchor);
    			append(mark, t);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(mark);
    		}
    	};
    }

    // (12:4) {#if component[0] === 'strong'}
    function create_if_block_1(ctx) {
    	let strong;
    	let t_value = /*component*/ ctx[2][1] + "";
    	let t;

    	return {
    		c() {
    			strong = element("strong");
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, strong, anchor);
    			append(strong, t);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(strong);
    		}
    	};
    }

    // (10:0) {#each components as component}
    function create_each_block(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*component*/ ctx[2] instanceof Array) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if_block.p(ctx, dirty);
    		},
    		d(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let each_1_anchor;
    	let each_value = /*components*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*components, Array*/ 1) {
    				each_value = /*components*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { string } = $$props;
    	const components = parsePhrase(string);

    	$$self.$set = $$props => {
    		if ("string" in $$props) $$invalidate(1, string = $$props.string);
    	};

    	return [components, string];
    }

    class FormattedString extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { string: 1 });
    	}
    }

    /* menu/components/Locked.svelte generated by Svelte v3.17.1 */

    function create_else_block$1(ctx) {
    	let t_value = /*T*/ ctx[1].lookup("locked-unlock-from-toolbar") + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (27:4) {#if keyboardShortcut}
    function create_if_block$1(ctx) {
    	let current;

    	const formattedstring = new FormattedString({
    			props: {
    				string: /*T*/ ctx[1].lookup("locked-press-shortcut-to-unlock", {
    					"shortcut": `*${/*keyboardShortcut*/ ctx[0]}*`
    				})
    			}
    		});

    	return {
    		c() {
    			create_component(formattedstring.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(formattedstring, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const formattedstring_changes = {};

    			if (dirty & /*keyboardShortcut*/ 1) formattedstring_changes.string = /*T*/ ctx[1].lookup("locked-press-shortcut-to-unlock", {
    				"shortcut": `*${/*keyboardShortcut*/ ctx[0]}*`
    			});

    			formattedstring.$set(formattedstring_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(formattedstring.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(formattedstring.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(formattedstring, detaching);
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	let section;
    	let img;
    	let img_src_value;
    	let t;
    	let p;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block$1, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*keyboardShortcut*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			section = element("section");
    			img = element("img");
    			t = space();
    			p = element("p");
    			if_block.c();
    			if (img.src !== (img_src_value = "../images/inline-lock.svg")) attr(img, "src", img_src_value);
    			attr(img, "alt", "");
    			attr(img, "aria-hidden", "true");
    			attr(section, "class", "lockScreen");
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);
    			append(section, img);
    			append(section, t);
    			append(section, p);
    			if_blocks[current_block_type_index].m(p, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(p, null);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(section);
    			if_blocks[current_block_type_index].d();
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	const bridge = getContext("bridge");
    	const T = getContext("locale");
    	let keyboardShortcut = "";
    	bridge.resizeMenu(115, 250);

    	bridge.getKeyboardShortcuts().then(commands => {
    		if (commands[0] && commands[0].shortcut) {
    			$$invalidate(0, keyboardShortcut = commands[0].shortcut);
    		}

    		bridge.inlineMenuReady();
    	});

    	return [keyboardShortcut, T];
    }

    class Locked extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});
    	}
    }

    /** Detect free variable `global` from Node.js. */
    var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

    var _freeGlobal = freeGlobal;

    /** Detect free variable `self`. */
    var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

    /** Used as a reference to the global object. */
    var root$1 = _freeGlobal || freeSelf || Function('return this')();

    var _root = root$1;

    /** Built-in value references. */
    var Symbol = _root.Symbol;

    var _Symbol = Symbol;

    /** Used for built-in method references. */
    var objectProto = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty = objectProto.hasOwnProperty;

    /**
     * Used to resolve the
     * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
     * of values.
     */
    var nativeObjectToString = objectProto.toString;

    /** Built-in value references. */
    var symToStringTag = _Symbol ? _Symbol.toStringTag : undefined;

    /**
     * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the raw `toStringTag`.
     */
    function getRawTag(value) {
      var isOwn = hasOwnProperty.call(value, symToStringTag),
          tag = value[symToStringTag];

      try {
        value[symToStringTag] = undefined;
        var unmasked = true;
      } catch (e) {}

      var result = nativeObjectToString.call(value);
      if (unmasked) {
        if (isOwn) {
          value[symToStringTag] = tag;
        } else {
          delete value[symToStringTag];
        }
      }
      return result;
    }

    var _getRawTag = getRawTag;

    /** Used for built-in method references. */
    var objectProto$1 = Object.prototype;

    /**
     * Used to resolve the
     * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
     * of values.
     */
    var nativeObjectToString$1 = objectProto$1.toString;

    /**
     * Converts `value` to a string using `Object.prototype.toString`.
     *
     * @private
     * @param {*} value The value to convert.
     * @returns {string} Returns the converted string.
     */
    function objectToString(value) {
      return nativeObjectToString$1.call(value);
    }

    var _objectToString = objectToString;

    /** `Object#toString` result references. */
    var nullTag = '[object Null]',
        undefinedTag = '[object Undefined]';

    /** Built-in value references. */
    var symToStringTag$1 = _Symbol ? _Symbol.toStringTag : undefined;

    /**
     * The base implementation of `getTag` without fallbacks for buggy environments.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the `toStringTag`.
     */
    function baseGetTag(value) {
      if (value == null) {
        return value === undefined ? undefinedTag : nullTag;
      }
      return (symToStringTag$1 && symToStringTag$1 in Object(value))
        ? _getRawTag(value)
        : _objectToString(value);
    }

    var _baseGetTag = baseGetTag;

    /**
     * Checks if `value` is the
     * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
     * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(_.noop);
     * // => true
     *
     * _.isObject(null);
     * // => false
     */
    function isObject(value) {
      var type = typeof value;
      return value != null && (type == 'object' || type == 'function');
    }

    var isObject_1 = isObject;

    /** `Object#toString` result references. */
    var asyncTag = '[object AsyncFunction]',
        funcTag = '[object Function]',
        genTag = '[object GeneratorFunction]',
        proxyTag = '[object Proxy]';

    /**
     * Checks if `value` is classified as a `Function` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a function, else `false`.
     * @example
     *
     * _.isFunction(_);
     * // => true
     *
     * _.isFunction(/abc/);
     * // => false
     */
    function isFunction(value) {
      if (!isObject_1(value)) {
        return false;
      }
      // The use of `Object#toString` avoids issues with the `typeof` operator
      // in Safari 9 which returns 'object' for typed arrays and other constructors.
      var tag = _baseGetTag(value);
      return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
    }

    var isFunction_1 = isFunction;

    /** Used to detect overreaching core-js shims. */
    var coreJsData = _root['__core-js_shared__'];

    var _coreJsData = coreJsData;

    /** Used to detect methods masquerading as native. */
    var maskSrcKey = (function() {
      var uid = /[^.]+$/.exec(_coreJsData && _coreJsData.keys && _coreJsData.keys.IE_PROTO || '');
      return uid ? ('Symbol(src)_1.' + uid) : '';
    }());

    /**
     * Checks if `func` has its source masked.
     *
     * @private
     * @param {Function} func The function to check.
     * @returns {boolean} Returns `true` if `func` is masked, else `false`.
     */
    function isMasked(func) {
      return !!maskSrcKey && (maskSrcKey in func);
    }

    var _isMasked = isMasked;

    /** Used for built-in method references. */
    var funcProto = Function.prototype;

    /** Used to resolve the decompiled source of functions. */
    var funcToString = funcProto.toString;

    /**
     * Converts `func` to its source code.
     *
     * @private
     * @param {Function} func The function to convert.
     * @returns {string} Returns the source code.
     */
    function toSource(func) {
      if (func != null) {
        try {
          return funcToString.call(func);
        } catch (e) {}
        try {
          return (func + '');
        } catch (e) {}
      }
      return '';
    }

    var _toSource = toSource;

    /**
     * Used to match `RegExp`
     * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
     */
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

    /** Used to detect host constructors (Safari). */
    var reIsHostCtor = /^\[object .+?Constructor\]$/;

    /** Used for built-in method references. */
    var funcProto$1 = Function.prototype,
        objectProto$2 = Object.prototype;

    /** Used to resolve the decompiled source of functions. */
    var funcToString$1 = funcProto$1.toString;

    /** Used to check objects for own properties. */
    var hasOwnProperty$1 = objectProto$2.hasOwnProperty;

    /** Used to detect if a method is native. */
    var reIsNative = RegExp('^' +
      funcToString$1.call(hasOwnProperty$1).replace(reRegExpChar, '\\$&')
      .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
    );

    /**
     * The base implementation of `_.isNative` without bad shim checks.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a native function,
     *  else `false`.
     */
    function baseIsNative(value) {
      if (!isObject_1(value) || _isMasked(value)) {
        return false;
      }
      var pattern = isFunction_1(value) ? reIsNative : reIsHostCtor;
      return pattern.test(_toSource(value));
    }

    var _baseIsNative = baseIsNative;

    /**
     * Gets the value at `key` of `object`.
     *
     * @private
     * @param {Object} [object] The object to query.
     * @param {string} key The key of the property to get.
     * @returns {*} Returns the property value.
     */
    function getValue(object, key) {
      return object == null ? undefined : object[key];
    }

    var _getValue = getValue;

    /**
     * Gets the native function at `key` of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {string} key The key of the method to get.
     * @returns {*} Returns the function if it's native, else `undefined`.
     */
    function getNative(object, key) {
      var value = _getValue(object, key);
      return _baseIsNative(value) ? value : undefined;
    }

    var _getNative = getNative;

    /* Built-in method references that are verified to be native. */
    var Map$1 = _getNative(_root, 'Map');

    var _Map = Map$1;

    /* Built-in method references that are verified to be native. */
    var nativeCreate = _getNative(Object, 'create');

    /** Built-in value references. */
    var Uint8Array = _root.Uint8Array;

    /** Used to convert symbols to primitives and strings. */
    var symbolProto = _Symbol ? _Symbol.prototype : undefined,
        symbolValueOf = symbolProto ? symbolProto.valueOf : undefined;

    /**
     * Checks if `value` is object-like. A value is object-like if it's not `null`
     * and has a `typeof` result of "object".
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
     * @example
     *
     * _.isObjectLike({});
     * // => true
     *
     * _.isObjectLike([1, 2, 3]);
     * // => true
     *
     * _.isObjectLike(_.noop);
     * // => false
     *
     * _.isObjectLike(null);
     * // => false
     */
    function isObjectLike(value) {
      return value != null && typeof value == 'object';
    }

    var isObjectLike_1 = isObjectLike;

    /** `Object#toString` result references. */
    var argsTag = '[object Arguments]';

    /**
     * The base implementation of `_.isArguments`.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an `arguments` object,
     */
    function baseIsArguments(value) {
      return isObjectLike_1(value) && _baseGetTag(value) == argsTag;
    }

    var _baseIsArguments = baseIsArguments;

    /** Used for built-in method references. */
    var objectProto$3 = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$2 = objectProto$3.hasOwnProperty;

    /** Built-in value references. */
    var propertyIsEnumerable = objectProto$3.propertyIsEnumerable;

    /**
     * Checks if `value` is likely an `arguments` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an `arguments` object,
     *  else `false`.
     * @example
     *
     * _.isArguments(function() { return arguments; }());
     * // => true
     *
     * _.isArguments([1, 2, 3]);
     * // => false
     */
    var isArguments = _baseIsArguments(function() { return arguments; }()) ? _baseIsArguments : function(value) {
      return isObjectLike_1(value) && hasOwnProperty$2.call(value, 'callee') &&
        !propertyIsEnumerable.call(value, 'callee');
    };

    /**
     * This method returns `false`.
     *
     * @static
     * @memberOf _
     * @since 4.13.0
     * @category Util
     * @returns {boolean} Returns `false`.
     * @example
     *
     * _.times(2, _.stubFalse);
     * // => [false, false]
     */
    function stubFalse() {
      return false;
    }

    var stubFalse_1 = stubFalse;

    var isBuffer_1 = createCommonjsModule(function (module, exports) {
    /** Detect free variable `exports`. */
    var freeExports =  exports && !exports.nodeType && exports;

    /** Detect free variable `module`. */
    var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

    /** Detect the popular CommonJS extension `module.exports`. */
    var moduleExports = freeModule && freeModule.exports === freeExports;

    /** Built-in value references. */
    var Buffer = moduleExports ? _root.Buffer : undefined;

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;

    /**
     * Checks if `value` is a buffer.
     *
     * @static
     * @memberOf _
     * @since 4.3.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
     * @example
     *
     * _.isBuffer(new Buffer(2));
     * // => true
     *
     * _.isBuffer(new Uint8Array(2));
     * // => false
     */
    var isBuffer = nativeIsBuffer || stubFalse_1;

    module.exports = isBuffer;
    });

    var _nodeUtil = createCommonjsModule(function (module, exports) {
    /** Detect free variable `exports`. */
    var freeExports =  exports && !exports.nodeType && exports;

    /** Detect free variable `module`. */
    var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

    /** Detect the popular CommonJS extension `module.exports`. */
    var moduleExports = freeModule && freeModule.exports === freeExports;

    /** Detect free variable `process` from Node.js. */
    var freeProcess = moduleExports && _freeGlobal.process;

    /** Used to access faster Node.js helpers. */
    var nodeUtil = (function() {
      try {
        // Use `util.types` for Node.js 10+.
        var types = freeModule && freeModule.require && freeModule.require('util').types;

        if (types) {
          return types;
        }

        // Legacy `process.binding('util')` for Node.js < 10.
        return freeProcess && freeProcess.binding && freeProcess.binding('util');
      } catch (e) {}
    }());

    module.exports = nodeUtil;
    });

    /* Node.js helper references. */
    var nodeIsTypedArray = _nodeUtil && _nodeUtil.isTypedArray;

    /* Built-in method references that are verified to be native. */
    var DataView = _getNative(_root, 'DataView');

    var _DataView = DataView;

    /* Built-in method references that are verified to be native. */
    var Promise$1 = _getNative(_root, 'Promise');

    var _Promise = Promise$1;

    /* Built-in method references that are verified to be native. */
    var Set$1 = _getNative(_root, 'Set');

    var _Set = Set$1;

    /* Built-in method references that are verified to be native. */
    var WeakMap = _getNative(_root, 'WeakMap');

    var _WeakMap = WeakMap;

    /** `Object#toString` result references. */
    var mapTag = '[object Map]',
        objectTag = '[object Object]',
        promiseTag = '[object Promise]',
        setTag = '[object Set]',
        weakMapTag = '[object WeakMap]';

    var dataViewTag = '[object DataView]';

    /** Used to detect maps, sets, and weakmaps. */
    var dataViewCtorString = _toSource(_DataView),
        mapCtorString = _toSource(_Map),
        promiseCtorString = _toSource(_Promise),
        setCtorString = _toSource(_Set),
        weakMapCtorString = _toSource(_WeakMap);

    /**
     * Gets the `toStringTag` of `value`.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the `toStringTag`.
     */
    var getTag = _baseGetTag;

    // Fallback for data views, maps, sets, and weak maps in IE 11 and promises in Node.js < 6.
    if ((_DataView && getTag(new _DataView(new ArrayBuffer(1))) != dataViewTag) ||
        (_Map && getTag(new _Map) != mapTag) ||
        (_Promise && getTag(_Promise.resolve()) != promiseTag) ||
        (_Set && getTag(new _Set) != setTag) ||
        (_WeakMap && getTag(new _WeakMap) != weakMapTag)) {
      getTag = function(value) {
        var result = _baseGetTag(value),
            Ctor = result == objectTag ? value.constructor : undefined,
            ctorString = Ctor ? _toSource(Ctor) : '';

        if (ctorString) {
          switch (ctorString) {
            case dataViewCtorString: return dataViewTag;
            case mapCtorString: return mapTag;
            case promiseCtorString: return promiseTag;
            case setCtorString: return setTag;
            case weakMapCtorString: return weakMapTag;
          }
        }
        return result;
      };
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    function keySelector(keys, initialKey) {
        const selected = writable({
            key: initialKey,
            isFirstKey: initialKey === keys[0],
        });
        function firstKey() {
            return keys.length > 0 ? keys[0] : undefined;
        }
        function nextKey(key, reverse = false) {
            if (typeof key === "undefined" || keys.length === 0)
                return firstKey();
            const idx = keys.indexOf(key);
            if (idx === -1)
                return firstKey();
            const nextIdx = reverse ? idx - 1 : idx + 1;
            if (nextIdx < 0 || nextIdx > keys.length - 1)
                return keys[idx];
            return keys[nextIdx];
        }
        function lastKey() {
            return keys.length > 0 ? keys[keys.length - 1] : undefined;
        }
        function selectKey(key, keyToSelect) {
            if (key === keyToSelect)
                return key;
            if (keyToSelect === undefined)
                return undefined;
            const idx = keys.indexOf(keyToSelect);
            return idx !== -1 ? keys[idx] : key;
        }
        const select = {
            first() {
                selected.update(() => {
                    const key = firstKey();
                    return {
                        key,
                        isFirstKey: key === keys[0],
                    };
                });
            },
            next() {
                selected.update(state => {
                    const key = nextKey(state.key);
                    return {
                        key,
                        isFirstKey: key === keys[0],
                    };
                });
            },
            previous() {
                selected.update(state => {
                    const key = nextKey(state.key, true);
                    return {
                        key,
                        isFirstKey: key === keys[0],
                    };
                });
            },
            last() {
                selected.update(() => {
                    const key = lastKey();
                    return {
                        key,
                        isFirstKey: key === keys[0],
                    };
                });
            },
            key(keyToSelect) {
                selected.update(state => {
                    const key = selectKey(state.key, keyToSelect);
                    return {
                        key,
                        isFirstKey: key === keys[0],
                    };
                });
            },
            none() {
                selected.set({ key: undefined, isFirstKey: false });
            },
        };
        return { selected, select };
    }

    function withVariants(key) {
        if (Array.isArray(key)) {
            return key.includes("Enter") ? [...key, "NumpadEnter"] : key;
        }
        else {
            return key === "Enter" ? [key, "NumpadEnter"] : key;
        }
    }
    function onKeyDown(event, keyMap, handlers) {
        for (const keyName in keyMap) {
            const { preventDefault } = keyMap[keyName];
            const key = withVariants(keyMap[keyName].key);
            const nonMatchingKeyArray = Array.isArray(key) && !key.includes(event.code);
            const nonMatchingKeyString = typeof key === "string" && key !== event.code;
            if (nonMatchingKeyArray || nonMatchingKeyString)
                continue;
            preventDefault && event.preventDefault();
            handlers[keyName](event);
            break;
        }
    }

    /**
     * Optionally set classes with a map of class names -> booleans and/or format multiple class names through an array.
     * Returns a string of CSS class names.
     */
    function classNames(classMap, ...staticClasses) {
        const nonNullStaticClasses = staticClasses.filter(Boolean);
        const formattedStaticClasses = nonNullStaticClasses.map(classes => classes.trim()).join(" ");
        const mappedClasses = Object.keys(classMap).reduce((classes, candidate) => (classMap[candidate] ? classes.concat(candidate) : classes), []);
        if (mappedClasses.length > 0) {
            return formattedStaticClasses ? `${formattedStaticClasses} ${mappedClasses.join(" ")}` : mappedClasses.join(" ");
        }
        return formattedStaticClasses;
    }

    /* menu/components/Menu.svelte generated by Svelte v3.17.1 */
    const get_default_slot_changes = dirty => ({ option: dirty & /*options*/ 1 });
    const get_default_slot_context = ctx => ({ option: /*content*/ ctx[27] });

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[24] = list[i].id;
    	child_ctx[25] = list[i].button;
    	child_ctx[26] = list[i].prefix;
    	child_ctx[27] = list[i].content;
    	child_ctx[28] = list[i].onSubmit;
    	return child_ctx;
    }

    // (114:2) {#each options as { id, button, prefix, content, onSubmit }
    function create_each_block$1(key_1, ctx) {
    	let li;
    	let t;
    	let li_id_value;
    	let li_aria_current_value;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[17].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[16], get_default_slot_context);

    	function mousemove_handler(...args) {
    		return /*mousemove_handler*/ ctx[18](/*id*/ ctx[24], ...args);
    	}

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[20](/*onSubmit*/ ctx[28], /*id*/ ctx[24], ...args);
    	}

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			li = element("li");
    			if (default_slot) default_slot.c();
    			t = space();
    			attr(li, "role", "menuitem");
    			attr(li, "id", li_id_value = /*id*/ ctx[24]);
    			attr(li, "aria-current", li_aria_current_value = /*$selected*/ ctx[6].key === /*id*/ ctx[24] || undefined);
    			toggle_class(li, "button", /*button*/ ctx[25]);
    			this.first = li;
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);

    			if (default_slot) {
    				default_slot.m(li, null);
    			}

    			append(li, t);
    			current = true;

    			dispose = [
    				listen(li, "mousemove", mousemove_handler),
    				listen(li, "mouseleave", /*mouseleave_handler*/ ctx[19]),
    				listen(li, "click", click_handler)
    			];
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (default_slot && default_slot.p && dirty & /*$$scope, options*/ 65537) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[16], get_default_slot_context), get_slot_changes(default_slot_template, /*$$scope*/ ctx[16], dirty, get_default_slot_changes));
    			}

    			if (!current || dirty & /*options*/ 1 && li_id_value !== (li_id_value = /*id*/ ctx[24])) {
    				attr(li, "id", li_id_value);
    			}

    			if (!current || dirty & /*$selected, options*/ 65 && li_aria_current_value !== (li_aria_current_value = /*$selected*/ ctx[6].key === /*id*/ ctx[24] || undefined)) {
    				attr(li, "aria-current", li_aria_current_value);
    			}

    			if (dirty & /*options*/ 1) {
    				toggle_class(li, "button", /*button*/ ctx[25]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    			if (default_slot) default_slot.d(detaching);
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	let ul;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let ul_tabindex_value;
    	let ul_aria_activedescendant_value;
    	let current;
    	let dispose;
    	let each_value = /*options*/ ctx[0];
    	const get_key = ctx => /*id*/ ctx[24];

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	return {
    		c() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(ul, "role", "menu");
    			attr(ul, "tabindex", ul_tabindex_value = 0);
    			attr(ul, "class", /*className*/ ctx[1]);
    			attr(ul, "aria-label", /*label*/ ctx[2]);
    			attr(ul, "aria-activedescendant", ul_aria_activedescendant_value = /*$selected*/ ctx[6].key);
    		},
    		m(target, anchor) {
    			insert(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			/*ul_binding*/ ctx[21](ul);
    			current = true;

    			dispose = [
    				listen(ul, "focus", /*focus_handler*/ ctx[22]),
    				listen(ul, "keydown", /*handleKeyDown*/ ctx[7]),
    				listen(ul, "keypress", /*handleKeyPress*/ ctx[8]),
    				listen(ul, "blur", /*blur_handler*/ ctx[23])
    			];
    		},
    		p(ctx, [dirty]) {
    			const each_value = /*options*/ ctx[0];
    			group_outros();
    			each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ul, outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
    			check_outros();

    			if (!current || dirty & /*className*/ 2) {
    				attr(ul, "class", /*className*/ ctx[1]);
    			}

    			if (!current || dirty & /*label*/ 4) {
    				attr(ul, "aria-label", /*label*/ ctx[2]);
    			}

    			if (!current || dirty & /*$selected*/ 64 && ul_aria_activedescendant_value !== (ul_aria_activedescendant_value = /*$selected*/ ctx[6].key)) {
    				attr(ul, "aria-activedescendant", ul_aria_activedescendant_value);
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			/*ul_binding*/ ctx[21](null);
    			run_all(dispose);
    		}
    	};
    }

    function scrollToOption(menu, selectedKeyIndex) {
    	if (!menu) return;
    	const options = menu.children;
    	const selectedOption = options[selectedKeyIndex];
    	if (!selectedOption) return;
    	const isLastOption = options.length === selectedKeyIndex + 1;

    	if (isLastOption) {
    		menu.scrollTop = menu.scrollHeight;
    	} else {
    		selectedOption.scrollIntoView({ block: "nearest" });
    	}
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $selected,
    		$$unsubscribe_selected = noop,
    		$$subscribe_selected = () => ($$unsubscribe_selected(), $$unsubscribe_selected = subscribe(selected, $$value => $$invalidate(6, $selected = $$value)), selected);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_selected());
    	let { options = [] } = $$props;
    	let { className } = $$props;
    	let { label } = $$props;
    	let { onEscapeFromTop } = $$props;
    	let menu;
    	let typeAheadChars = "";
    	let typeAheadTimeout;

    	function handleKeyDown(event) {
    		onKeyDown(
    			event,
    			{
    				FIRST: { key: "Home" },
    				PREVIOUS: { key: "ArrowUp", preventDefault: true },
    				NEXT: { key: "ArrowDown", preventDefault: true },
    				LAST: { key: "End" },
    				SUBMIT: {
    					key: ["Space", "Enter"],
    					preventDefault: true
    				}
    			},
    			{
    				FIRST: selector.select.first,
    				PREVIOUS: () => {
    					if ($selected.isFirstKey) {
    						onEscapeFromTop && onEscapeFromTop();
    						return;
    					}

    					selector.select.previous();
    				},
    				NEXT: selector.select.next,
    				LAST: selector.select.last,
    				SUBMIT: submitOption
    			}
    		);
    	}

    	function submitOption() {
    		const optionToSubmit = options.find(option => option.id === $selected.key);
    		optionToSubmit && optionToSubmit.onSubmit(optionToSubmit.id);
    	}

    	function handleKeyPress(event) {
    		if (!event.key || event.key.length !== 1) return;
    		$$invalidate(11, typeAheadChars += event.key.toLowerCase());

    		for (let i = 0; i < options.length; i++) {
    			const option = options[i];
    			const formattedTypeAhead = option.typeAhead.replace(/\s+/g, "").toLowerCase();

    			if (formattedTypeAhead.startsWith(typeAheadChars)) {
    				selector.select.key(option.id);
    				break;
    			}
    		}
    	}

    	function resetTypeAheadTimeout(chars) {
    		if (chars.length === 0) return;
    		clearTimeout(typeAheadTimeout);

    		typeAheadTimeout = setTimeout(
    			() => {
    				$$invalidate(11, typeAheadChars = "");
    			},
    			1000
    		);
    	}

    	function focus() {
    		menu && menu.focus();
    	}

    	let { $$slots = {}, $$scope } = $$props;
    	const mousemove_handler = id => selector.select.key(id);
    	const mouseleave_handler = () => selector.select.none();
    	const click_handler = (onSubmit, id) => onSubmit(id);

    	function ul_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(3, menu = $$value);
    		});
    	}

    	const focus_handler = () => !$selected.key && selector.select.first();
    	const blur_handler = () => selector.select.none();

    	$$self.$set = $$props => {
    		if ("options" in $$props) $$invalidate(0, options = $$props.options);
    		if ("className" in $$props) $$invalidate(1, className = $$props.className);
    		if ("label" in $$props) $$invalidate(2, label = $$props.label);
    		if ("onEscapeFromTop" in $$props) $$invalidate(9, onEscapeFromTop = $$props.onEscapeFromTop);
    		if ("$$scope" in $$props) $$invalidate(16, $$scope = $$props.$$scope);
    	};

    	let keys;
    	let selector;
    	let selected;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*options*/ 1) {
    			 $$invalidate(13, keys = options.map(option => option.id));
    		}

    		if ($$self.$$.dirty & /*keys*/ 8192) {
    			 $$invalidate(4, selector = keySelector(keys, undefined));
    		}

    		if ($$self.$$.dirty & /*selector*/ 16) {
    			 $$subscribe_selected($$invalidate(5, selected = selector.selected));
    		}

    		if ($$self.$$.dirty & /*menu, keys, $selected*/ 8264) {
    			 scrollToOption(menu, keys.indexOf($selected.key));
    		}

    		if ($$self.$$.dirty & /*typeAheadChars*/ 2048) {
    			 resetTypeAheadTimeout(typeAheadChars);
    		}
    	};

    	return [
    		options,
    		className,
    		label,
    		menu,
    		selector,
    		selected,
    		$selected,
    		handleKeyDown,
    		handleKeyPress,
    		onEscapeFromTop,
    		focus,
    		typeAheadChars,
    		typeAheadTimeout,
    		keys,
    		submitOption,
    		resetTypeAheadTimeout,
    		$$scope,
    		$$slots,
    		mousemove_handler,
    		mouseleave_handler,
    		click_handler,
    		ul_binding,
    		focus_handler,
    		blur_handler
    	];
    }

    class Menu extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {
    			options: 0,
    			className: 1,
    			label: 2,
    			onEscapeFromTop: 9,
    			focus: 10
    		});
    	}

    	get focus() {
    		return this.$$.ctx[10];
    	}
    }

    /* menu/components/Icon.svelte generated by Svelte v3.17.1 */

    function create_else_block$2(ctx) {
    	let img;
    	let img_src_value;
    	let dispose;

    	return {
    		c() {
    			img = element("img");
    			if (img.src !== (img_src_value = /*src*/ ctx[0])) attr(img, "src", img_src_value);
    			attr(img, "alt", "");
    			attr(img, "aria-hidden", "true");
    		},
    		m(target, anchor) {
    			insert(target, img, anchor);
    			dispose = listen(img, "error", /*onError*/ ctx[3]);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*src*/ 1 && img.src !== (img_src_value = /*src*/ ctx[0])) {
    				attr(img, "src", img_src_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(img);
    			dispose();
    		}
    	};
    }

    // (20:20) 
    function create_if_block_1$1(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			img = element("img");
    			if (img.src !== (img_src_value = /*src*/ ctx[0])) attr(img, "src", img_src_value);
    			attr(img, "alt", "");
    			attr(img, "aria-hidden", "true");
    			attr(div, "class", /*className*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, img);
    			dispose = listen(img, "error", /*onError*/ ctx[3]);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*src*/ 1 && img.src !== (img_src_value = /*src*/ ctx[0])) {
    				attr(img, "src", img_src_value);
    			}

    			if (dirty & /*className*/ 2) {
    				attr(div, "class", /*className*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			dispose();
    		}
    	};
    }

    // (18:0) {#if showFallback}
    function create_if_block$2(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 32) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[5], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null));
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$2, create_if_block_1$1, create_else_block$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*showFallback*/ ctx[2]) return 0;
    		if (/*className*/ ctx[1]) return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { src = "" } = $$props;
    	let { className } = $$props;
    	let showFallback = false;

    	function onError() {
    		$$invalidate(2, showFallback = true);
    	}

    	function hideFallback() {
    		$$invalidate(2, showFallback = false);
    	}

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("src" in $$props) $$invalidate(0, src = $$props.src);
    		if ("className" in $$props) $$invalidate(1, className = $$props.className);
    		if ("$$scope" in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*src*/ 1) {
    			 hideFallback();
    		}
    	};

    	return [src, className, showFallback, onError, hideFallback, $$scope, $$slots];
    }

    class Icon extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { src: 0, className: 1 });
    	}
    }

    /* menu/components/Monogram.svelte generated by Svelte v3.17.1 */

    function create_fragment$7(ctx) {
    	let div;

    	let t_value = (/*title*/ ctx[0].length > 1
    	? /*title*/ ctx[0].slice(0, 2)
    	: /*title*/ ctx[0].charAt(0)) + "";

    	let t;
    	let div_style_value;

    	return {
    		c() {
    			div = element("div");
    			t = text(t_value);
    			attr(div, "class", "itemIcon-medium monogram");
    			attr(div, "style", div_style_value = `background-color: ${/*color*/ ctx[1]}`);
    			attr(div, "aria-hidden", "true");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*title*/ 1 && t_value !== (t_value = (/*title*/ ctx[0].length > 1
    			? /*title*/ ctx[0].slice(0, 2)
    			: /*title*/ ctx[0].charAt(0)) + "")) set_data(t, t_value);

    			if (dirty & /*color*/ 2 && div_style_value !== (div_style_value = `background-color: ${/*color*/ ctx[1]}`)) {
    				attr(div, "style", div_style_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { title = "" } = $$props;
    	let { color = "#aaddff" } = $$props;

    	$$self.$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    	};

    	return [title, color];
    }

    class Monogram extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { title: 0, color: 1 });
    	}
    }

    /* menu/components/ItemIcon.svelte generated by Svelte v3.17.1 */

    function create_else_block$3(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "class", "itemIcon-medium placeholder");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (51:2) {#if isLoginItem}
    function create_if_block$3(ctx) {
    	let current;

    	const monogram = new Monogram({
    			props: {
    				title: /*item*/ ctx[0].title,
    				color: /*item*/ ctx[0].color
    			}
    		});

    	return {
    		c() {
    			create_component(monogram.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(monogram, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const monogram_changes = {};
    			if (dirty & /*item*/ 1) monogram_changes.title = /*item*/ ctx[0].title;
    			if (dirty & /*item*/ 1) monogram_changes.color = /*item*/ ctx[0].color;
    			monogram.$set(monogram_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(monogram.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(monogram.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(monogram, detaching);
    		}
    	};
    }

    // (43:0) <Icon   src={customIcon || item.iconPath || templateIcon()}   className={classNames({     masked: (isLoginItem && !!item.iconPath) || item.hasCustomIcon },     'itemIcon-medium',     className)   } >
    function create_default_slot$1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$3, create_else_block$3];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*isLoginItem*/ ctx[3]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if_block.p(ctx, dirty);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$8(ctx) {
    	let current;

    	const icon = new Icon({
    			props: {
    				src: /*customIcon*/ ctx[2] || /*item*/ ctx[0].iconPath || /*templateIcon*/ ctx[4](),
    				className: classNames(
    					{
    						masked: /*isLoginItem*/ ctx[3] && !!/*item*/ ctx[0].iconPath || /*item*/ ctx[0].hasCustomIcon
    					},
    					"itemIcon-medium",
    					/*className*/ ctx[1]
    				),
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const icon_changes = {};
    			if (dirty & /*customIcon, item*/ 5) icon_changes.src = /*customIcon*/ ctx[2] || /*item*/ ctx[0].iconPath || /*templateIcon*/ ctx[4]();

    			if (dirty & /*item, className*/ 3) icon_changes.className = classNames(
    				{
    					masked: /*isLoginItem*/ ctx[3] && !!/*item*/ ctx[0].iconPath || /*item*/ ctx[0].hasCustomIcon
    				},
    				"itemIcon-medium",
    				/*className*/ ctx[1]
    			);

    			if (dirty & /*$$scope, item*/ 257) {
    				icon_changes.$$scope = { dirty, ctx };
    			}

    			icon.$set(icon_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { item } = $$props;
    	let { className } = $$props;
    	let customIcon;
    	const bridge = getContext("bridge");
    	const isLoginItem = item.templateUuid === "001";

    	async function getCustomIcon(itemUuid) {
    		$$invalidate(2, customIcon = await bridge.getCustomIcon(itemUuid));
    	}

    	function templateIdentifier() {
    		const title = item.title.toLowerCase();
    		let ccType;

    		if ((/\bvisa\b/).test(title)) {
    			ccType = "visa";
    		} else if ((/\bmastercard\b|\bMC\b/).test(title)) {
    			ccType = "mastercard";
    		} else if ((/\bdiscover\b/).test(title)) {
    			ccType = "discover";
    		} else if ((/\bamex\b|\bamerican express\b/).test(title)) {
    			ccType = "amex";
    		}

    		return ccType ? `002-${ccType}` : item.templateUuid;
    	}

    	function templateIcon() {
    		return isLoginItem
    		? undefined
    		: `../images/primary_icons/${templateIdentifier()}-medium.svg`;
    	}

    	$$self.$set = $$props => {
    		if ("item" in $$props) $$invalidate(0, item = $$props.item);
    		if ("className" in $$props) $$invalidate(1, className = $$props.className);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*item*/ 1) {
    			 item.hasCustomIcon && getCustomIcon(item.uuid);
    		}
    	};

    	return [item, className, customIcon, isLoginItem, templateIcon];
    }

    class ItemIcon extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { item: 0, className: 1 });
    	}
    }

    const TEMPLATE_UUID_IDENTITY = "004";
    function getPostFill(templateUuid, _fieldDesignation, formDesignation) {
        if (templateUuid === TEMPLATE_UUID_IDENTITY || formDesignation === "change-password") {
            return "focusNextField";
        }
        return "focusLastFilledField";
    }
    function createItemFilter(value = "") {
        return (item) => {
            if (item.title.toLowerCase().includes(value.toLowerCase())) {
                return true;
            }
            if (item.secondary.toLowerCase().includes(value.toLowerCase())) {
                return true;
            }
            return false;
        };
    }
    function createItemSorter(fieldContext) {
        return (a, b) => {
            if (!fieldContext) {
                return 0;
            }
            const lowerCaseContext = fieldContext.toLowerCase();
            const lowerCaseA = a.secondary.toLowerCase();
            const lowerCaseB = b.secondary.toLowerCase();
            if (lowerCaseA === lowerCaseB) {
                return 0;
            }
            else if (lowerCaseA === lowerCaseContext) {
                return -1;
            }
            else if (lowerCaseB === lowerCaseContext) {
                return 1;
            }
            else {
                return 0;
            }
        };
    }

    /* menu/components/ItemList.svelte generated by Svelte v3.17.1 */

    function create_else_block$4(ctx) {
    	let t_value = /*option*/ ctx[12] + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*option*/ 4096 && t_value !== (t_value = /*option*/ ctx[12] + "")) set_data(t, t_value);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (65:2) {#if option.item}
    function create_if_block$4(ctx) {
    	let t0;
    	let div;
    	let h3;
    	let t1_value = /*option*/ ctx[12].item.title + "";
    	let t1;
    	let t2;
    	let current;

    	const itemicon = new ItemIcon({
    			props: {
    				item: /*option*/ ctx[12].item,
    				className: classNames({
    					favorite: /*option*/ ctx[12].item.favorite
    				})
    			}
    		});

    	let if_block = /*option*/ ctx[12].item.secondary && create_if_block_1$2(ctx);

    	return {
    		c() {
    			create_component(itemicon.$$.fragment);
    			t0 = space();
    			div = element("div");
    			h3 = element("h3");
    			t1 = text(t1_value);
    			t2 = space();
    			if (if_block) if_block.c();
    			attr(div, "class", "details");
    		},
    		m(target, anchor) {
    			mount_component(itemicon, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, div, anchor);
    			append(div, h3);
    			append(h3, t1);
    			append(div, t2);
    			if (if_block) if_block.m(div, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const itemicon_changes = {};
    			if (dirty & /*option*/ 4096) itemicon_changes.item = /*option*/ ctx[12].item;

    			if (dirty & /*option*/ 4096) itemicon_changes.className = classNames({
    				favorite: /*option*/ ctx[12].item.favorite
    			});

    			itemicon.$set(itemicon_changes);
    			if ((!current || dirty & /*option*/ 4096) && t1_value !== (t1_value = /*option*/ ctx[12].item.title + "")) set_data(t1, t1_value);

    			if (/*option*/ ctx[12].item.secondary) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$2(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(itemicon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(itemicon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(itemicon, detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(div);
    			if (if_block) if_block.d();
    		}
    	};
    }

    // (69:6) {#if option.item.secondary}
    function create_if_block_1$2(ctx) {
    	let p;
    	let t_value = /*option*/ ctx[12].item.secondary + "";
    	let t;

    	return {
    		c() {
    			p = element("p");
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, p, anchor);
    			append(p, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*option*/ 4096 && t_value !== (t_value = /*option*/ ctx[12].item.secondary + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(p);
    		}
    	};
    }

    // (57:0) <Menu   bind:this={menu}   {options}   className="itemList"   label="Items"   onEscapeFromTop={() => bridge.focusPage()}   let:option >
    function create_default_slot$2(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$4, create_else_block$4];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*option*/ ctx[12].item) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$9(ctx) {
    	let current;

    	let menu_1_props = {
    		options: /*options*/ ctx[1],
    		className: "itemList",
    		label: "Items",
    		onEscapeFromTop: /*func*/ ctx[10],
    		$$slots: {
    			default: [
    				create_default_slot$2,
    				({ option }) => ({ 12: option }),
    				({ option }) => option ? 4096 : 0
    			]
    		},
    		$$scope: { ctx }
    	};

    	const menu_1 = new Menu({ props: menu_1_props });
    	/*menu_1_binding*/ ctx[11](menu_1);

    	return {
    		c() {
    			create_component(menu_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(menu_1, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const menu_1_changes = {};
    			if (dirty & /*options*/ 2) menu_1_changes.options = /*options*/ ctx[1];

    			if (dirty & /*$$scope, option*/ 12288) {
    				menu_1_changes.$$scope = { dirty, ctx };
    			}

    			menu_1.$set(menu_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(menu_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(menu_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			/*menu_1_binding*/ ctx[11](null);
    			destroy_component(menu_1, detaching);
    		}
    	};
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { items = [] } = $$props;
    	let menu;
    	const bridge = getContext("bridge");
    	const T = getContext("locale");
    	const fieldDesignation = getContext("fieldDesignation");
    	const formDesignation = getContext("fieldDesignation");

    	function optionsFromItems(items) {
    		return items.map(createOption);
    	}

    	function createOption(item) {
    		let commonProperties = { id: item.uuid, typeAhead: item.title };

    		if (item.templateUuid === "save") {
    			return {
    				...commonProperties,
    				button: true,
    				content: T.lookup("item-save-in-1password"),
    				onSubmit: () => bridge.saveItem()
    			};
    		}

    		return {
    			...commonProperties,
    			content: { item },
    			onSubmit: () => {
    				if (item.templateUuid === "005") {
    					bridge.fillGeneratedPassword(item.data);
    				} else {
    					bridge.fillItem(item.uuid, getPostFill(item.templateUuid, fieldDesignation, formDesignation));
    				}
    			}
    		};
    	}

    	function focus() {
    		menu && menu.focus();
    	}

    	const func = () => bridge.focusPage();

    	function menu_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, menu = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("items" in $$props) $$invalidate(3, items = $$props.items);
    	};

    	let options;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*items*/ 8) {
    			 $$invalidate(1, options = optionsFromItems(items));
    		}
    	};

    	return [
    		menu,
    		options,
    		bridge,
    		items,
    		focus,
    		T,
    		fieldDesignation,
    		formDesignation,
    		optionsFromItems,
    		createOption,
    		func,
    		menu_1_binding
    	];
    }

    class ItemList extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { items: 3, focus: 4 });
    	}

    	get focus() {
    		return this.$$.ctx[4];
    	}
    }

    /* menu/components/ListBox.svelte generated by Svelte v3.17.1 */
    const get_default_slot_changes$1 = dirty => ({ option: dirty[0] & /*options*/ 1 });
    const get_default_slot_context$1 = ctx => ({ option: /*content*/ ctx[30] });

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[27] = list[i].id;
    	child_ctx[28] = list[i].button;
    	child_ctx[29] = list[i].prefix;
    	child_ctx[30] = list[i].content;
    	child_ctx[31] = list[i].onSubmit;
    	return child_ctx;
    }

    // (109:2) {#each options as { id, button, prefix, content, onSubmit }
    function create_each_block$2(key_1, ctx) {
    	let li;
    	let t;
    	let li_id_value;
    	let li_aria_selected_value;
    	let li_aria_current_value;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[20].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[19], get_default_slot_context$1);

    	function mousemove_handler(...args) {
    		return /*mousemove_handler*/ ctx[21](/*id*/ ctx[27], ...args);
    	}

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[23](/*onSubmit*/ ctx[31], /*id*/ ctx[27], ...args);
    	}

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			li = element("li");
    			if (default_slot) default_slot.c();
    			t = space();
    			attr(li, "role", "option");
    			attr(li, "id", li_id_value = /*id*/ ctx[27]);
    			attr(li, "aria-selected", li_aria_selected_value = /*selectedOption*/ ctx[1] === /*id*/ ctx[27] || undefined);
    			attr(li, "aria-current", li_aria_current_value = /*$selected*/ ctx[9].key === /*id*/ ctx[27] || undefined);
    			toggle_class(li, "button", /*button*/ ctx[28]);
    			this.first = li;
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);

    			if (default_slot) {
    				default_slot.m(li, null);
    			}

    			append(li, t);
    			current = true;

    			dispose = [
    				listen(li, "mousemove", mousemove_handler),
    				listen(li, "mouseleave", /*mouseleave_handler*/ ctx[22]),
    				listen(li, "click", click_handler)
    			];
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (default_slot && default_slot.p && dirty[0] & /*$$scope, options*/ 524289) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[19], get_default_slot_context$1), get_slot_changes(default_slot_template, /*$$scope*/ ctx[19], dirty, get_default_slot_changes$1));
    			}

    			if (!current || dirty[0] & /*options*/ 1 && li_id_value !== (li_id_value = /*id*/ ctx[27])) {
    				attr(li, "id", li_id_value);
    			}

    			if (!current || dirty[0] & /*selectedOption, options*/ 3 && li_aria_selected_value !== (li_aria_selected_value = /*selectedOption*/ ctx[1] === /*id*/ ctx[27] || undefined)) {
    				attr(li, "aria-selected", li_aria_selected_value);
    			}

    			if (!current || dirty[0] & /*$selected, options*/ 513 && li_aria_current_value !== (li_aria_current_value = /*$selected*/ ctx[9].key === /*id*/ ctx[27] || undefined)) {
    				attr(li, "aria-current", li_aria_current_value);
    			}

    			if (dirty[0] & /*options*/ 1) {
    				toggle_class(li, "button", /*button*/ ctx[28]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    			if (default_slot) default_slot.d(detaching);
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$a(ctx) {
    	let ul;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let ul_tabindex_value;
    	let ul_aria_activedescendant_value;
    	let ul_data_offsetmultiplier_value;
    	let current;
    	let dispose;
    	let each_value = /*options*/ ctx[0];
    	const get_key = ctx => /*id*/ ctx[27];

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$2(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
    	}

    	return {
    		c() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(ul, "role", "listbox");
    			attr(ul, "tabindex", ul_tabindex_value = 0);
    			attr(ul, "class", /*className*/ ctx[3]);
    			attr(ul, "aria-label", /*label*/ ctx[4]);
    			attr(ul, "aria-activedescendant", ul_aria_activedescendant_value = /*$selected*/ ctx[9].key);

    			attr(ul, "data-offsetmultiplier", ul_data_offsetmultiplier_value = /*$selected*/ ctx[9].key
    			? /*keys*/ ctx[6].indexOf(/*$selected*/ ctx[9].key)
    			: 0);
    		},
    		m(target, anchor) {
    			insert(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			/*ul_binding*/ ctx[24](ul);
    			current = true;

    			dispose = [
    				listen(ul, "focus", /*focus_handler*/ ctx[25]),
    				listen(ul, "keydown", /*handleKeyDown*/ ctx[10]),
    				listen(ul, "keypress", /*handleKeyPress*/ ctx[11]),
    				listen(ul, "blur", /*blur_handler*/ ctx[26])
    			];
    		},
    		p(ctx, dirty) {
    			const each_value = /*options*/ ctx[0];
    			group_outros();
    			each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ul, outro_and_destroy_block, create_each_block$2, null, get_each_context$2);
    			check_outros();

    			if (!current || dirty[0] & /*className*/ 8) {
    				attr(ul, "class", /*className*/ ctx[3]);
    			}

    			if (!current || dirty[0] & /*label*/ 16) {
    				attr(ul, "aria-label", /*label*/ ctx[4]);
    			}

    			if (!current || dirty[0] & /*$selected*/ 512 && ul_aria_activedescendant_value !== (ul_aria_activedescendant_value = /*$selected*/ ctx[9].key)) {
    				attr(ul, "aria-activedescendant", ul_aria_activedescendant_value);
    			}

    			if (!current || dirty[0] & /*$selected, keys*/ 576 && ul_data_offsetmultiplier_value !== (ul_data_offsetmultiplier_value = /*$selected*/ ctx[9].key
    			? /*keys*/ ctx[6].indexOf(/*$selected*/ ctx[9].key)
    			: 0)) {
    				attr(ul, "data-offsetmultiplier", ul_data_offsetmultiplier_value);
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			/*ul_binding*/ ctx[24](null);
    			run_all(dispose);
    		}
    	};
    }

    function scrollToOption$1(listBox, selectedKeyIndex) {
    	if (!listBox) return;
    	const selectedOption = Array.from(listBox.children)[selectedKeyIndex];
    	selectedOption && selectedOption.scrollIntoView({ block: "nearest" });
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let $selected,
    		$$unsubscribe_selected = noop,
    		$$subscribe_selected = () => ($$unsubscribe_selected(), $$unsubscribe_selected = subscribe(selected, $$value => $$invalidate(9, $selected = $$value)), selected);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_selected());
    	let { options = [] } = $$props;
    	let { selectedOption } = $$props;
    	let { preventSelection = false } = $$props;
    	let { collapsed } = $$props;
    	let { className } = $$props;
    	let { label } = $$props;
    	let { onEscapeFromTop } = $$props;
    	let listBox;
    	let typeAheadChars = "";
    	let typeAheadTimeout;

    	function handleKeyDown(event) {
    		onKeyDown(
    			event,
    			{
    				FIRST: { key: "Home" },
    				PREVIOUS: { key: "ArrowUp", preventDefault: true },
    				NEXT: { key: "ArrowDown", preventDefault: true },
    				LAST: { key: "End" },
    				SUBMIT: {
    					key: ["Space", "Enter"],
    					preventDefault: true
    				}
    			},
    			{
    				FIRST: () => !preventSelection && selector.select.first(),
    				PREVIOUS: () => {
    					if ($selected.isFirstKey || collapsed) {
    						onEscapeFromTop && onEscapeFromTop();
    						return;
    					}

    					!preventSelection && selector.select.previous();
    				},
    				NEXT: () => !preventSelection && selector.select.next(),
    				LAST: () => !preventSelection && selector.select.last(),
    				SUBMIT: submitOption
    			}
    		);
    	}

    	function submitOption() {
    		const optionToSubmit = options.find(option => option.id === $selected.key);
    		optionToSubmit && optionToSubmit.onSubmit(optionToSubmit.id);
    	}

    	function handleKeyPress(event) {
    		if (!event.key || event.key.length !== 1) return;
    		$$invalidate(15, typeAheadChars += event.key.toLowerCase());

    		for (let i = 0; i < options.length; i++) {
    			const option = options[i];
    			const formattedTypeAhead = option.typeAhead.replace(/\s+/g, "").toLowerCase();

    			if (formattedTypeAhead.startsWith(typeAheadChars)) {
    				selector.select.key(option.id);
    				break;
    			}
    		}
    	}

    	function resetTypeAheadTimeout(chars) {
    		if (chars.length === 0) return;
    		clearTimeout(typeAheadTimeout);

    		typeAheadTimeout = setTimeout(
    			() => {
    				$$invalidate(15, typeAheadChars = "");
    			},
    			1000
    		);
    	}

    	function focus() {
    		listBox && listBox.focus();
    	}

    	let { $$slots = {}, $$scope } = $$props;
    	const mousemove_handler = id => preventSelection ? undefined : selector.select.key(id);
    	const mouseleave_handler = () => preventSelection ? undefined : selector.select.none();
    	const click_handler = (onSubmit, id) => onSubmit(id);

    	function ul_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(5, listBox = $$value);
    		});
    	}

    	const focus_handler = () => !$selected.key && selector.select.first();
    	const blur_handler = () => preventSelection ? undefined : selector.select.none();

    	$$self.$set = $$props => {
    		if ("options" in $$props) $$invalidate(0, options = $$props.options);
    		if ("selectedOption" in $$props) $$invalidate(1, selectedOption = $$props.selectedOption);
    		if ("preventSelection" in $$props) $$invalidate(2, preventSelection = $$props.preventSelection);
    		if ("collapsed" in $$props) $$invalidate(12, collapsed = $$props.collapsed);
    		if ("className" in $$props) $$invalidate(3, className = $$props.className);
    		if ("label" in $$props) $$invalidate(4, label = $$props.label);
    		if ("onEscapeFromTop" in $$props) $$invalidate(13, onEscapeFromTop = $$props.onEscapeFromTop);
    		if ("$$scope" in $$props) $$invalidate(19, $$scope = $$props.$$scope);
    	};

    	let keys;
    	let selector;
    	let selected;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*options*/ 1) {
    			 $$invalidate(6, keys = options.map(option => option.id));
    		}

    		if ($$self.$$.dirty[0] & /*keys, selectedOption*/ 66) {
    			 $$invalidate(7, selector = keySelector(keys, selectedOption));
    		}

    		if ($$self.$$.dirty[0] & /*selector*/ 128) {
    			 $$subscribe_selected($$invalidate(8, selected = selector.selected));
    		}

    		if ($$self.$$.dirty[0] & /*listBox, keys, $selected*/ 608) {
    			 scrollToOption$1(listBox, keys.indexOf($selected.key));
    		}

    		if ($$self.$$.dirty[0] & /*typeAheadChars*/ 32768) {
    			 resetTypeAheadTimeout(typeAheadChars);
    		}
    	};

    	return [
    		options,
    		selectedOption,
    		preventSelection,
    		className,
    		label,
    		listBox,
    		keys,
    		selector,
    		selected,
    		$selected,
    		handleKeyDown,
    		handleKeyPress,
    		collapsed,
    		onEscapeFromTop,
    		focus,
    		typeAheadChars,
    		typeAheadTimeout,
    		submitOption,
    		resetTypeAheadTimeout,
    		$$scope,
    		$$slots,
    		mousemove_handler,
    		mouseleave_handler,
    		click_handler,
    		ul_binding,
    		focus_handler,
    		blur_handler
    	];
    }

    class ListBox extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$a,
    			create_fragment$a,
    			safe_not_equal,
    			{
    				options: 0,
    				selectedOption: 1,
    				preventSelection: 2,
    				collapsed: 12,
    				className: 3,
    				label: 4,
    				onEscapeFromTop: 13,
    				focus: 14
    			},
    			[-1, -1]
    		);
    	}

    	get focus() {
    		return this.$$.ctx[14];
    	}
    }

    /* menu/components/ListSelector.svelte generated by Svelte v3.17.1 */

    function create_else_block$5(ctx) {
    	let t_value = /*option*/ ctx[23] + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*option*/ 8388608 && t_value !== (t_value = /*option*/ ctx[23] + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (123:4) {#if option.imageSource && option.text}
    function create_if_block$5(ctx) {
    	let img;
    	let img_src_value;
    	let t0;
    	let p;
    	let t1_value = /*option*/ ctx[23].text + "";
    	let t1;

    	return {
    		c() {
    			img = element("img");
    			t0 = space();
    			p = element("p");
    			t1 = text(t1_value);
    			if (img.src !== (img_src_value = /*option*/ ctx[23].imageSource)) attr(img, "src", img_src_value);
    			attr(img, "alt", "");
    			attr(img, "aria-hidden", "true");
    		},
    		m(target, anchor) {
    			insert(target, img, anchor);
    			insert(target, t0, anchor);
    			insert(target, p, anchor);
    			append(p, t1);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*option*/ 8388608 && img.src !== (img_src_value = /*option*/ ctx[23].imageSource)) {
    				attr(img, "src", img_src_value);
    			}

    			if (dirty & /*option*/ 8388608 && t1_value !== (t1_value = /*option*/ ctx[23].text + "")) set_data(t1, t1_value);
    		},
    		d(detaching) {
    			if (detaching) detach(img);
    			if (detaching) detach(t0);
    			if (detaching) detach(p);
    		}
    	};
    }

    // (113:2) <ListBox     bind:this={listBox}     {options}     {selectedOption}     {preventSelection}     collapsed={!expanded}     label={T.lookup('categories')}     onEscapeFromTop={() => bridge.focusPage()}     let:option   >
    function create_default_slot$3(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*option*/ ctx[23].imageSource && /*option*/ ctx[23].text) return create_if_block$5;
    		return create_else_block$5;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$b(ctx) {
    	let section;
    	let current;
    	let dispose;

    	let listbox_props = {
    		options: /*options*/ ctx[9],
    		selectedOption: /*selectedOption*/ ctx[0],
    		preventSelection: /*preventSelection*/ ctx[6],
    		collapsed: !/*expanded*/ ctx[1],
    		label: /*T*/ ctx[8].lookup("categories"),
    		onEscapeFromTop: /*func*/ ctx[17],
    		$$slots: {
    			default: [
    				create_default_slot$3,
    				({ option }) => ({ 23: option }),
    				({ option }) => option ? 8388608 : 0
    			]
    		},
    		$$scope: { ctx }
    	};

    	const listbox = new ListBox({ props: listbox_props });
    	/*listbox_binding*/ ctx[18](listbox);

    	return {
    		c() {
    			section = element("section");
    			create_component(listbox.$$.fragment);
    			attr(section, "class", "listSelector");
    			attr(section, "data-offsetmultiplier", /*offsetMultiplier*/ ctx[2]);
    			toggle_class(section, "expanded", /*expanded*/ ctx[1]);
    			toggle_class(section, "focus-visible", /*focusVisible*/ ctx[5]);
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);
    			mount_component(listbox, section, null);
    			current = true;

    			dispose = [
    				listen(window, "keydown", /*onKeyDown*/ ctx[10]),
    				listen(window, "mousedown", /*onMouseDown*/ ctx[11]),
    				listen(section, "introstart", /*introstart_handler*/ ctx[19]),
    				listen(section, "outrostart", /*outrostart_handler*/ ctx[20]),
    				listen(section, "introend", /*introend_handler*/ ctx[21]),
    				listen(section, "outroend", /*outroend_handler*/ ctx[22])
    			];
    		},
    		p(ctx, [dirty]) {
    			const listbox_changes = {};
    			if (dirty & /*selectedOption*/ 1) listbox_changes.selectedOption = /*selectedOption*/ ctx[0];
    			if (dirty & /*preventSelection*/ 64) listbox_changes.preventSelection = /*preventSelection*/ ctx[6];
    			if (dirty & /*expanded*/ 2) listbox_changes.collapsed = !/*expanded*/ ctx[1];

    			if (dirty & /*$$scope, option*/ 25165824) {
    				listbox_changes.$$scope = { dirty, ctx };
    			}

    			listbox.$set(listbox_changes);

    			if (!current || dirty & /*offsetMultiplier*/ 4) {
    				attr(section, "data-offsetmultiplier", /*offsetMultiplier*/ ctx[2]);
    			}

    			if (dirty & /*expanded*/ 2) {
    				toggle_class(section, "expanded", /*expanded*/ ctx[1]);
    			}

    			if (dirty & /*focusVisible*/ 32) {
    				toggle_class(section, "focus-visible", /*focusVisible*/ ctx[5]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(listbox.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(listbox.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(section);
    			/*listbox_binding*/ ctx[18](null);
    			destroy_component(listbox);
    			run_all(dispose);
    		}
    	};
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { selectedOption } = $$props;
    	let { expanded } = $$props;
    	let { offsetMultiplier = 0 } = $$props;
    	let { onListTypeChange } = $$props;
    	let listBox;
    	let transitioning = false;
    	let focusVisible = false;
    	const bridge = getContext("bridge");
    	const dispatch = createEventDispatcher();
    	const T = getContext("locale");

    	const options = [
    		{
    			id: "suggestions",
    			typeAhead: T.lookup("category-suggestions"),
    			content: {
    				imageSource: "../images/primary_icons/suggestions-mini.svg",
    				text: T.lookup("category-suggestions")
    			},
    			onSubmit
    		},
    		{
    			id: "logins",
    			typeAhead: T.lookup("category-logins"),
    			content: {
    				imageSource: "../images/primary_icons/001-mini.svg",
    				text: T.lookup("category-logins")
    			},
    			onSubmit
    		},
    		{
    			id: "identities",
    			typeAhead: T.lookup("category-identities"),
    			content: {
    				imageSource: "../images/primary_icons/004-mini.svg",
    				text: T.lookup("category-identities")
    			},
    			onSubmit
    		},
    		{
    			id: "credit_cards",
    			typeAhead: T.lookup("category-credit-cards"),
    			content: {
    				imageSource: "../images/primary_icons/002-mini.svg",
    				text: T.lookup("category-credit-cards")
    			},
    			onSubmit
    		},
    		{
    			id: "generated_password",
    			typeAhead: T.lookup("category-generated-password"),
    			content: {
    				imageSource: "../images/primary_icons/005-mini.svg",
    				text: T.lookup("category-generated-password")
    			},
    			onSubmit
    		},
    		{
    			id: "never_show",
    			typeAhead: T.lookup("category-hide-on-this-page"),
    			button: true,
    			content: T.lookup("category-hide-on-this-page"),
    			onSubmit: () => bridge.pageExclusionRequest()
    		}
    	];

    	function onSubmit(id) {
    		expanded && onListTypeChange(id);
    		dispatch("togglelistselector");
    	}

    	function resizeMenuOnExpand(expanded) {
    		if (!expanded) return;
    		bridge.resizeMenu(242);
    	}

    	function onKeyDown(event) {
    		if (!["Tab", "Space", "Enter"].includes(event.code)) return;
    		$$invalidate(5, focusVisible = true);
    	}

    	function onMouseDown() {
    		$$invalidate(5, focusVisible = false);
    	}

    	function focus() {
    		$$invalidate(5, focusVisible = true);
    		listBox && listBox.focus();
    	}

    	const func = () => bridge.focusPage();

    	function listbox_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(3, listBox = $$value);
    		});
    	}

    	const introstart_handler = () => $$invalidate(4, transitioning = true);
    	const outrostart_handler = () => $$invalidate(4, transitioning = true);
    	const introend_handler = () => $$invalidate(4, transitioning = false);
    	const outroend_handler = () => $$invalidate(4, transitioning = false);

    	$$self.$set = $$props => {
    		if ("selectedOption" in $$props) $$invalidate(0, selectedOption = $$props.selectedOption);
    		if ("expanded" in $$props) $$invalidate(1, expanded = $$props.expanded);
    		if ("offsetMultiplier" in $$props) $$invalidate(2, offsetMultiplier = $$props.offsetMultiplier);
    		if ("onListTypeChange" in $$props) $$invalidate(12, onListTypeChange = $$props.onListTypeChange);
    	};

    	let preventSelection;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*expanded, transitioning*/ 18) {
    			 $$invalidate(6, preventSelection = !expanded || transitioning);
    		}

    		if ($$self.$$.dirty & /*expanded*/ 2) {
    			 resizeMenuOnExpand(expanded);
    		}
    	};

    	return [
    		selectedOption,
    		expanded,
    		offsetMultiplier,
    		listBox,
    		transitioning,
    		focusVisible,
    		preventSelection,
    		bridge,
    		T,
    		options,
    		onKeyDown,
    		onMouseDown,
    		onListTypeChange,
    		focus,
    		dispatch,
    		onSubmit,
    		resizeMenuOnExpand,
    		func,
    		listbox_binding,
    		introstart_handler,
    		outrostart_handler,
    		introend_handler,
    		outroend_handler
    	];
    }

    class ListSelector extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {
    			selectedOption: 0,
    			expanded: 1,
    			offsetMultiplier: 2,
    			onListTypeChange: 12,
    			focus: 13
    		});
    	}

    	get focus() {
    		return this.$$.ctx[13];
    	}
    }

    /* menu/components/Frame.svelte generated by Svelte v3.17.1 */

    const { window: window_1 } = globals;

    function create_else_block$6(ctx) {
    	let section;
    	let p;

    	return {
    		c() {
    			section = element("section");
    			p = element("p");
    			p.textContent = `${/*T*/ ctx[6].lookup("list-no-items")}`;
    			attr(section, "class", "emptyItemList");
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);
    			append(section, p);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(section);
    		}
    	};
    }

    // (202:27) 
    function create_if_block_1$3(ctx) {
    	let current;
    	let itemlist_props = { items: /*items*/ ctx[5] };
    	const itemlist = new ItemList({ props: itemlist_props });
    	/*itemlist_binding*/ ctx[27](itemlist);

    	return {
    		c() {
    			create_component(itemlist.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(itemlist, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const itemlist_changes = {};
    			if (dirty & /*items*/ 32) itemlist_changes.items = /*items*/ ctx[5];
    			itemlist.$set(itemlist_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(itemlist.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(itemlist.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			/*itemlist_binding*/ ctx[27](null);
    			destroy_component(itemlist, detaching);
    		}
    	};
    }

    // (179:0) {#if showItemListPlaceholder}
    function create_if_block$6(ctx) {
    	let section;

    	return {
    		c() {
    			section = element("section");
    			section.innerHTML = `<svg class="spinner" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0" width="18px" height="18px" viewBox="0 0 128 128" xmlspace="preserve"><g><circle cx="16" cy="64" r="16" fill="#000" fill-opacity="0.12"></circle><circle cx="16" cy="64" r="16" fill="#000" fill-opacity="0.12" transform="rotate(45,64,64)"></circle><circle cx="16" cy="64" r="16" fill="#000" fill-opacity="0.12" transform="rotate(90,64,64)"></circle><circle cx="16" cy="64" r="16" fill="#000" fill-opacity="0.12" transform="rotate(135,64,64)"></circle><circle cx="16" cy="64" r="16" fill="#000" fill-opacity="0.2" transform="rotate(180,64,64)"></circle><circle cx="16" cy="64" r="16" fill="#000" fill-opacity="0.42" transform="rotate(225,64,64)"></circle><circle cx="16" cy="64" r="16" fill="#000" fill-opacity="0.67" transform="rotate(270,64,64)"></circle><circle cx="16" cy="64" r="16" fill="#000" fill-opacity="1" transform="rotate(315,64,64)"></circle></g></svg>`;
    			attr(section, "class", "skeletonItemList");
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(section);
    		}
    	};
    }

    function create_fragment$c(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let t;
    	let current;
    	let dispose;
    	const if_block_creators = [create_if_block$6, create_if_block_1$3, create_else_block$6];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*showItemListPlaceholder*/ ctx[3]) return 0;
    		if (/*items*/ ctx[5].length > 0) return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	let listselector_props = {
    		selectedOption: /*selectedListType*/ ctx[2],
    		expanded: /*listSelectorExpanded*/ ctx[4],
    		offsetMultiplier: /*items*/ ctx[5].length === 0
    		? 1
    		: /*items*/ ctx[5].length,
    		onListTypeChange: /*onListTypeChange*/ ctx[8]
    	};

    	const listselector = new ListSelector({ props: listselector_props });
    	/*listselector_binding*/ ctx[28](listselector);
    	listselector.$on("togglelistselector", /*togglelistselector_handler*/ ctx[29]);

    	return {
    		c() {
    			if_block.c();
    			t = space();
    			create_component(listselector.$$.fragment);
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, t, anchor);
    			mount_component(listselector, target, anchor);
    			current = true;
    			dispose = listen(window_1, "keydown", /*handleKeyDown*/ ctx[7]);
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(t.parentNode, t);
    			}

    			const listselector_changes = {};
    			if (dirty & /*selectedListType*/ 4) listselector_changes.selectedOption = /*selectedListType*/ ctx[2];
    			if (dirty & /*listSelectorExpanded*/ 16) listselector_changes.expanded = /*listSelectorExpanded*/ ctx[4];

    			if (dirty & /*items*/ 32) listselector_changes.offsetMultiplier = /*items*/ ctx[5].length === 0
    			? 1
    			: /*items*/ ctx[5].length;

    			listselector.$set(listselector_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(listselector.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			transition_out(listselector.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(t);
    			/*listselector_binding*/ ctx[28](null);
    			destroy_component(listselector, detaching);
    			dispose();
    		}
    	};
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let itemList;
    	let listSelector;
    	let selectedListType = "suggestions";
    	let nonFilteredItems = [];
    	let showItemListPlaceholder = false;
    	let listSelectorExpanded = false;
    	let filterValue = "";
    	let showSaveOption = false;
    	const bridge = getContext("bridge");
    	const T = getContext("locale");
    	const params = new URLSearchParams(window.location.search);
    	const edited = params.get("edited");
    	const fieldContext = params.get("context") || undefined;
    	setContext("displayHost", params.get("displayHost"));
    	setContext("fieldDesignation", params.get("field"));
    	setContext("formDesignation", params.get("form"));
    	setContext("fieldContext", fieldContext);

    	if (edited) {
    		showSaveOption = edited === "true";
    	}

    	bridge.onFilterInlineMenu(value => {
    		if (listSelectorExpanded) return;
    		$$invalidate(10, filterValue = value);
    	});

    	bridge.onFocusInlineMenu(() => {
    		if (items.length > 0 && !listSelectorExpanded) {
    			itemList.focus();
    		} else {
    			listSelector.focus();
    		}
    	});

    	bridge.onEditedStateChanged(edited => {
    		showSaveOption = edited;
    	});

    	async function getItems() {
    		if (selectedListType === "suggestions") {
    			$$invalidate(9, nonFilteredItems = await getSuggestions());
    		} else if (selectedListType === "generated_password") {
    			$$invalidate(9, nonFilteredItems = [await createSuggestedPasswordOption()]);
    		} else {
    			$$invalidate(9, nonFilteredItems = await bridge.getItems(templateUuidFromListType()));
    		}

    		bridge.inlineMenuReady();
    		$$invalidate(3, showItemListPlaceholder = false);
    	}

    	function createSaveOption() {
    		if (!showSaveOption) return undefined;

    		return {
    			uuid: window.crypto.getRandomValues(new Uint32Array(1))[0].toString(36),
    			title: T.lookup("item-save-in-1password"),
    			templateUuid: "save"
    		};
    	}

    	async function createSuggestedPasswordOption() {
    		const password = await bridge.getSuggestedPassword();

    		return {
    			uuid: window.crypto.getRandomValues(new Uint32Array(1))[0].toString(36),
    			title: T.lookup("item-use-suggested-password"),
    			secondary: password.password,
    			data: password,
    			templateUuid: "005"
    		};
    	}

    	function handleKeyDown(event) {
    		onKeyDown(event, { ESCAPE: { key: "Escape" } }, {
    			ESCAPE: () => {
    				bridge.focusPage();
    				bridge.removeMenu();
    			}
    		});
    	}

    	function resizeMenu() {
    		const itemCount = items.length === 0 ? 1 : items.length;
    		const itemHeightWithBorder = 52 + 1;

    		const height = itemCount > 3
    		? 210
    		: itemHeightWithBorder * itemCount - 1 + 35;

    		bridge.resizeMenu(height, calculateMenuWidth());
    	}

    	function onListTypeChange(listType) {
    		if (selectedListType === listType) {
    			resizeMenu();
    			return;
    		}

    		$$invalidate(2, selectedListType = listType);
    		$$invalidate(3, showItemListPlaceholder = true);
    	}

    	function templateUuidFromListType() {
    		switch (selectedListType) {
    			case "logins":
    				return "001";
    			case "credit_cards":
    				return "002";
    			case "identities":
    				return "004";
    			default:
    				return undefined;
    		}
    	}

    	const isRegForm = () => ["registration"].includes(getContext("formDesignation"));
    	const isNewPasswordField = () => ["new-password"].includes(getContext("fieldDesignation"));
    	const isCreditCardField = () => ["cc-number"].includes(getContext("fieldDesignation"));

    	async function getSuggestions() {
    		if (isCreditCardField()) {
    			return bridge.getItems("002");
    		}

    		if (isNewPasswordField()) {
    			return [await createSuggestedPasswordOption()];
    		}

    		if (isRegForm()) {
    			const itemPromises = [bridge.getItems("001"), bridge.getItems("004")];
    			const allItems = await Promise.all(itemPromises);
    			return allItems.flat();
    		}

    		return bridge.getItems("001");
    	}

    	function calculateMenuWidth() {
    		const context = document.createElement("canvas").getContext("2d");
    		context.font = "600 15px Helvetica";
    		const spacingAroundTitle = 69;
    		return Math.ceil(context.measureText(longestItemTitle()).width) + spacingAroundTitle;
    	}

    	function longestItemTitle() {
    		const item = [...items].sort((a, b) => b.title.length - a.title.length)[0];
    		return item ? item.title : "";
    	}

    	function itemlist_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, itemList = $$value);
    		});
    	}

    	function listselector_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, listSelector = $$value);
    		});
    	}

    	const togglelistselector_handler = () => $$invalidate(4, listSelectorExpanded = !listSelectorExpanded);
    	let items;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*selectedListType*/ 4) {
    			 getItems();
    		}

    		if ($$self.$$.dirty & /*nonFilteredItems, filterValue*/ 1536) {
    			 $$invalidate(5, items = [...nonFilteredItems].filter(createItemFilter(filterValue)).sort(createItemSorter(fieldContext)).concat(createSaveOption()).filter(Boolean));
    		}

    		if ($$self.$$.dirty & /*items*/ 32) {
    			 resizeMenu();
    		}
    	};

    	return [
    		itemList,
    		listSelector,
    		selectedListType,
    		showItemListPlaceholder,
    		listSelectorExpanded,
    		items,
    		T,
    		handleKeyDown,
    		onListTypeChange,
    		nonFilteredItems,
    		filterValue,
    		showSaveOption,
    		bridge,
    		params,
    		edited,
    		fieldContext,
    		getItems,
    		createSaveOption,
    		createSuggestedPasswordOption,
    		resizeMenu,
    		templateUuidFromListType,
    		isRegForm,
    		isNewPasswordField,
    		isCreditCardField,
    		getSuggestions,
    		calculateMenuWidth,
    		longestItemTitle,
    		itemlist_binding,
    		listselector_binding,
    		togglelistselector_handler
    	];
    }

    class Frame extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});
    	}
    }

    /* menu/components/TokenVerification.svelte generated by Svelte v3.17.1 */

    function create_if_block$7(ctx) {
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*locked*/ ctx[1] === "true" ? Locked : Frame;

    	function switch_props(ctx) {
    		return {};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props());
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (switch_value !== (switch_value = /*locked*/ ctx[1] === "true" ? Locked : Frame)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    function create_fragment$d(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*verified*/ ctx[0] && create_if_block$7(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*verified*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$7(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let verified = false;
    	const bridge = getContext("bridge");
    	const params = new URLSearchParams(window.location.search);
    	const locked = params.get("locked");
    	bridge.requestVerificationToken();

    	bridge.onVerificationToken(token => {
    		const tokenMatches = params.get("token") === token;
    		$$invalidate(0, verified = tokenMatches);
    		!tokenMatches && bridge.removeMenu();
    	});

    	return [verified, locked];
    }

    class TokenVerification extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {});
    	}
    }

    document.addEventListener("DOMContentLoaded", () => {
      new App({
        target: document.body,
        props: {
          bridge: InlineMenuBridge,
          component: TokenVerification,
        },
      });
    });

}());
//# sourceMappingURL=menu.js.map
