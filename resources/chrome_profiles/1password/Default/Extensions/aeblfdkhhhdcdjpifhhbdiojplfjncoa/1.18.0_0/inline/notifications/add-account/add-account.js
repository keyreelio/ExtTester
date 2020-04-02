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

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
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

    class AddAccountNotificationBridge {
        constructor(transport) {
            this.transport = transport;
        }
        sendAddAccountResponse(uuid, response) {
            return this.transport.request({
                name: "add-account-response",
                data: { uuid, response },
            });
        }
    }

    /* notifications/add-account/components/Notification.svelte generated by Svelte v3.17.1 */

    function create_fragment$3(ctx) {
    	let div4;
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div1;
    	let t1;
    	let div3;
    	let p0;
    	let t2_value = /*T*/ ctx[0].lookup("notification-add-account") + "";
    	let t2;
    	let t3;
    	let span0;
    	let t5;
    	let p1;
    	let t6_value = /*T*/ ctx[0].lookup("notification-add-remove-later") + "";
    	let t6;
    	let t7;
    	let span1;
    	let t9;
    	let img2;
    	let img2_src_value;
    	let t10;
    	let span2;
    	let t12;
    	let t13_value = /*T*/ ctx[0].lookup("notification-settings") + "";
    	let t13;
    	let t14;
    	let div2;
    	let button0;
    	let t16;
    	let button1;
    	let dispose;

    	return {
    		c() {
    			div4 = element("div");
    			div0 = element("div");
    			img0 = element("img");
    			t0 = space();
    			div1 = element("div");
    			div1.innerHTML = `<img src="../../images/icons/onepassword-48@2x.png" alt="">`;
    			t1 = space();
    			div3 = element("div");
    			p0 = element("p");
    			t2 = text(t2_value);
    			t3 = space();
    			span0 = element("span");
    			span0.textContent = `${/*T*/ ctx[0].lookup("notification-1password-x")}`;
    			t5 = space();
    			p1 = element("p");
    			t6 = text(t6_value);
    			t7 = space();
    			span1 = element("span");
    			span1.textContent = ">";
    			t9 = space();
    			img2 = element("img");
    			t10 = space();
    			span2 = element("span");
    			span2.textContent = ">";
    			t12 = space();
    			t13 = text(t13_value);
    			t14 = space();
    			div2 = element("div");
    			button0 = element("button");
    			button0.textContent = `${/*T*/ ctx[0].lookup("notification-add-account-never")}`;
    			t16 = space();
    			button1 = element("button");
    			button1.textContent = `${/*T*/ ctx[0].lookup("notification-add-account-confirm")}`;
    			if (img0.src !== (img0_src_value = "../../images/close-button.svg")) attr(img0, "src", img0_src_value);
    			attr(img0, "alt", "Close");
    			attr(div0, "id", "close-button");
    			attr(div0, "class", "notification-close");
    			attr(div1, "class", "notification-sidebar");
    			attr(p0, "class", "notification-title");
    			attr(span1, "class", "notification-chevron");
    			attr(img2, "id", "gear");
    			if (img2.src !== (img2_src_value = "../../images/settings.svg")) attr(img2, "src", img2_src_value);
    			attr(img2, "alt", "");
    			attr(span2, "class", "notification-chevron");
    			attr(p1, "class", "notification-secondary");
    			attr(button0, "id", "cancel-button");
    			attr(button0, "class", "notification-button");
    			attr(button1, "id", "ok-button");
    			attr(button1, "class", "notification-button");
    			attr(div2, "class", "notification-buttons");
    			attr(div3, "class", "notification-content");
    			attr(div4, "class", "notification-container");
    		},
    		m(target, anchor) {
    			insert(target, div4, anchor);
    			append(div4, div0);
    			append(div0, img0);
    			append(div4, t0);
    			append(div4, div1);
    			append(div4, t1);
    			append(div4, div3);
    			append(div3, p0);
    			append(p0, t2);
    			append(p0, t3);
    			append(p0, span0);
    			append(div3, t5);
    			append(div3, p1);
    			append(p1, t6);
    			append(p1, t7);
    			append(p1, span1);
    			append(p1, t9);
    			append(p1, img2);
    			append(p1, t10);
    			append(p1, span2);
    			append(p1, t12);
    			append(p1, t13);
    			append(div3, t14);
    			append(div3, div2);
    			append(div2, button0);
    			append(div2, t16);
    			append(div2, button1);

    			dispose = [
    				listen(img0, "click", /*onClick*/ ctx[1]),
    				listen(button0, "click", /*onClick*/ ctx[1]),
    				listen(button1, "click", /*onClick*/ ctx[1])
    			];
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div4);
    			run_all(dispose);
    		}
    	};
    }

    function instance$3($$self) {
    	const bridge = getContext("bridge");
    	const params = new URLSearchParams(window.location.search);
    	const uuid = params.get("uuid");
    	const T = getContext("locale");

    	function onClick(event) {
    		const { target } = event;
    		if (!(target instanceof HTMLElement)) return;
    		let response = "NO";

    		if (target.id === "ok-button") {
    			response = "YES";
    		} else if (target.id === "cancel-button") {
    			response = "IGNORE";
    		}

    		bridge.sendAddAccountResponse(uuid, response);
    	}

    	return [T, onClick];
    }

    class Notification extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});
    	}
    }

    document.addEventListener("DOMContentLoaded", () => {
      new App({
        target: document.body,
        props: {
          bridge: AddAccountNotificationBridge,
          component: Notification,
        },
      });
    });

}());
//# sourceMappingURL=add-account.js.map
