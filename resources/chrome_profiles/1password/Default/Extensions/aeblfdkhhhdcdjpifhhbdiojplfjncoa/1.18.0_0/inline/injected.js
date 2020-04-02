(function () {
	'use strict';

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

	class FrameManagerBridge {
	    constructor(transport) {
	        this.transport = transport;
	    }
	    sayHello() {
	        return this.transport.request({
	            name: "hello",
	            data: {},
	        });
	    }
	    getDesignation(collectedFrame) {
	        return this.transport.request({
	            name: "get-designation",
	            data: collectedFrame,
	        });
	    }
	    getFrameManagerConfiguration() {
	        return this.transport.request({ name: "get-frame-manager-configuration", data: {} });
	    }
	    filterInlineMenu(filter) {
	        return this.transport.request(toFrames({ name: "filter-inline-menu", data: filter }));
	    }
	    focusInlineMenu() {
	        return this.transport.request(toFrames({ name: "focus-inline-menu" }));
	    }
	    requestManagedUnlock() {
	        return this.transport.request({ name: "request-managed-unlock", data: {} });
	    }
	    handleSaveItemRequest(type, data) {
	        this.transport.request({ name: "add-save-object", data: { type, data } });
	    }
	    addScrollAndResizeEventListeners() {
	        return this.transport.request(toFrames({ name: "add-scroll-and-resize-event-listeners", data: {} }, { targetParent: true }));
	    }
	    removeScrollAndResizeEventListeners() {
	        return this.transport.request(toFrames({ name: "remove-scroll-and-resize-event-listeners", data: {} }));
	    }
	    resolvePendingFill() {
	        return this.transport.request({ name: "resolve-pending-fill", data: {} });
	    }
	    onCollectFrameDetails(callback) {
	        this.transport.on("collect-frame-details", callback);
	    }
	    onPerformFill(callback) {
	        this.transport.on("perform-fill", fillResponse => {
	            if ("payload" in fillResponse && "status" in fillResponse) {
	                callback(fillResponse);
	            }
	            else {
	                callback({
	                    payload: fillResponse,
	                    status: "none" /* None */,
	                });
	            }
	        });
	    }
	    editedStateChanged(edited) {
	        return this.transport.request(toFrames({ name: "edited-state-changed", data: edited }));
	    }
	    onLockStateChanged(callback) {
	        this.transport.on("lock-state-changed", callback);
	    }
	    onFocusPage(callback) {
	        this.transport.on("focus-page", callback);
	    }
	    onPing(callback) {
	        this.transport.on("ping", callback);
	    }
	    onAddScrollAndResizeEventListeners(callback) {
	        this.transport.on("add-scroll-and-resize-event-listeners", callback);
	    }
	    onRemoveScrollAndResizeEventListeners(callback) {
	        this.transport.on("remove-scroll-and-resize-event-listeners", callback);
	    }
	    onForwardInlineMenuPosition(callback) {
	        this.transport.on("forward-inline-menu-position", callback);
	    }
	    //
	    // Top frame only
	    //
	    sendInlineMenuOpened() {
	        return this.transport.request(toFrames({ name: "inline-menu-opened" }));
	    }
	    sendInlineMenuClosed() {
	        return this.transport.request(toFrames({ name: "inline-menu-closed" }));
	    }
	    sendVerificationToken(token) {
	        return this.transport.request(toFrames({ name: "verification-token", data: token }));
	    }
	    onRequestVerificationToken(callback) {
	        this.transport.on("request-verification-token", callback);
	    }
	    onResizeInlineMenu(callback) {
	        this.transport.on("resize-inline-menu", callback);
	    }
	    onRemoveInlineMenu(callback) {
	        this.transport.on("remove-inline-menu", callback);
	    }
	    onFocusInlineMenuFrame(callback) {
	        this.transport.on("focus-inline-menu-frame", callback);
	    }
	    onInlineMenuReady(callback) {
	        this.transport.on("inline-menu-ready", callback);
	    }
	    onKeyDown(callback) {
	        this.transport.on("key-down", callback);
	    }
	    onPageExcluded(callback) {
	        this.transport.on("page-excluded", callback);
	    }
	    onRequestFillAuthorization(callback) {
	        this.transport.on("request-fill-authorization", callback);
	    }
	    /// Save Login
	    onShowSaveDialog(callback) {
	        // Use "show-save-dialog" when we implement saving with the Rust brain
	        this.transport.on("show-save-login-prompt", callback);
	    }
	    onHideSaveDialog(callback) {
	        // Use "hide-save-dialog" when we implement saving with the Rust brain
	        this.transport.on("close-save-login-prompt", callback);
	    }
	    //
	    // Nested frames only
	    //
	    forwardInlineMenuPosition(configuration, matchableFrameWindowProps) {
	        return this.transport.request(toFrames({ name: "forward-inline-menu-position", data: { configuration, matchableFrameWindowProps } }, { targetParent: true }));
	    }
	    removeInlineMenu() {
	        return this.transport.request(toFrames({ name: "remove-inline-menu", data: undefined }));
	    }
	    focusInlineMenuFrame() {
	        return this.transport.request(toFrames({ name: "focus-inline-menu-frame" }));
	    }
	    sendKeyDown(key, formEdited) {
	        return this.transport.request(toFrames({ name: "key-down", data: { key, formEdited } }));
	    }
	    onInlineMenuOpened(callback) {
	        this.transport.on("inline-menu-opened", callback);
	    }
	    onInlineMenuClosed(callback) {
	        this.transport.on("inline-menu-closed", callback);
	    }
	}
	const bridge = new FrameManagerBridge(getTransportForEnvironment());

	function getGlobal$1() {
	    if (typeof window !== "undefined") {
	        return window;
	    }
	    if (typeof globalThis != "undefined") {
	        return globalThis;
	    }
	    throw new Error("unable to locate global object");
	}

	const trimLabel = (text) => {
	    return (text
	        .trim()
	        .split(/\r?\n/)
	        .shift() || "").trim();
	};
	const cleanWhitespace = (text) => {
	    return text.replace(/[\r\n\s]+/gm, " ").trim();
	};

	const collectFrame = (options = {}) => {
	    listenForUserInput();
	    return collect(document, options);
	};
	const getFieldElements = (htmlDoc) => {
	    return querySelectorAllArray(htmlDoc, FIELD_ELEMENTS).filter(field => field.type !== "hidden");
	};
	const getFieldElementOpid = (fieldElement) => {
	    return getFieldElements(document).findIndex(element => element === fieldElement);
	};
	const listenForUserInput = () => {
	    document.addEventListener("input", handleUserInput, true);
	};
	const EXCLUDED_ELEMENTS = new Set([HTMLScriptElement, HTMLStyleElement]);
	const FIELD_ELEMENTS = ["button", "input", "select"];
	const NON_LABEL_ELEMENTS = new Set([
	    HTMLBodyElement,
	    HTMLButtonElement,
	    HTMLFormElement,
	    HTMLHeadElement,
	    HTMLIFrameElement,
	    HTMLInputElement,
	    HTMLOptionElement,
	    HTMLScriptElement,
	    HTMLSelectElement,
	    HTMLTableElement,
	    HTMLTableRowElement,
	    HTMLTextAreaElement,
	]);
	const SKIPPED_TEXT_NODE_TYPES = new Set([
	    HTMLScriptElement,
	    HTMLStyleElement,
	    HTMLButtonElement,
	    HTMLOptionElement,
	    HTMLTextAreaElement,
	]);
	const DEFAULT_MAX_FIELDS = 200;
	const DEFAULT_MAX_TIME = 50;
	const MAX_FIELD_LABEL_FINDER_TEXT_LENGTH = 150;
	const WORDLIKE_REGEX = /[^!"\#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~0-9\s]/;
	const handleUserInput = (event) => {
	    if (event.isTrusted && (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement)) {
	        event.target.opUserEdited = true;
	    }
	};
	const collect = (htmlDoc, options) => {
	    const ownerWindow = htmlDoc.defaultView ? htmlDoc.defaultView : getGlobal$1();
	    ownerWindow.uuid = generateUuid$1();
	    const formElements = [...htmlDoc.forms];
	    const fieldElements = getFieldElements(htmlDoc);
	    const time = {
	        max: options.maxTime || DEFAULT_MAX_TIME,
	        start: Date.now(),
	    };
	    const activeFieldOpid = options.activeFieldOpid !== undefined ? options.activeFieldOpid : -1;
	    const focusedElement = fieldElements[activeFieldOpid]
	        ? fieldElements[activeFieldOpid]
	        : htmlDoc.activeElement instanceof HTMLInputElement
	            ? htmlDoc.activeElement
	            : undefined;
	    if (focusedElement) {
	        const focusedOpid = fieldElements.findIndex(element => element === focusedElement);
	        focusedElement.opid = focusedOpid !== -1 ? focusedOpid : undefined;
	    }
	    const focusedForm = options.activeFormOnly && focusedElement && focusedElement instanceof HTMLInputElement
	        ? focusedElement.form || undefined
	        : undefined;
	    const forms = collectAllForms(options, formElements, focusedForm);
	    const fields = collectAllFields(options, fieldElements, forms, time, focusedElement);
	    const origin = ownerWindow.origin && ownerWindow.origin !== "null" ? ownerWindow.origin : undefined;
	    const frame = {
	        direction: htmlDoc.dir || undefined,
	        fields,
	        forms,
	        origin,
	        title: htmlDoc.title || undefined,
	        pathName: ownerWindow.location.pathname,
	        uuid: ownerWindow.uuid,
	    };
	    return frame;
	};
	const collectAllForms = (options, forms, focusedForm) => {
	    return forms.map((form, i) => {
	        const opidOnly = !!options.activeFormOnly && form !== focusedForm;
	        return getDetailsFromFormElement(form, i, opidOnly);
	    });
	};
	const getDetailsFromFormElement = (form, index, opidOnly) => {
	    const opid = index;
	    form.opid = opid;
	    if (opidOnly)
	        return { opid };
	    let headerText;
	    let textContent;
	    if (!isFullPageForm(form)) {
	        headerText = getLabelBeforeElement(form) || undefined;
	        textContent = cleanWhitespace(getTextContentFromElement(form)) || undefined;
	    }
	    return {
	        headerText,
	        htmlAction: getFormAction(form) || undefined,
	        htmlId: form.getAttribute("id") || undefined,
	        htmlMethod: form.getAttribute("method") || undefined,
	        htmlName: form.getAttribute("name") || undefined,
	        opid,
	        textContent,
	    };
	};
	const collectAllFields = (options, fieldElements, forms, time, focusedElement) => {
	    const focusedOpid = focusedElement && focusedElement.opid ? focusedElement.opid : 0;
	    let fields = new Array(fieldElements.length);
	    let i = 0;
	    let radialIndex = 0;
	    let element;
	    let numFields = Math.min(fieldElements.length, options.maxFields || DEFAULT_MAX_FIELDS);
	    for (i = 0; i < numFields; i++) {
	        if (!isTimeLeft(time))
	            break;
	        radialIndex = getRadialIndex(i, focusedOpid, fieldElements.length);
	        element = fieldElements[radialIndex];
	        if (options.activeFormOnly && focusedElement && element.form !== focusedElement.form) {
	            if (numFields < fieldElements.length)
	                numFields++;
	            continue;
	        }
	        const isFocused = element === focusedElement;
	        const form = element.form && element.form.opid ? forms[element.form.opid] : undefined;
	        fields[radialIndex] = getFieldFromFieldElement(element, radialIndex, isFocused, form);
	    }
	    ({ fields, fieldElements } = syncFieldsAndElements(fields, fieldElements));
	    radialIndex = 0;
	    for (i = 0; i < fields.length; i++) {
	        if (!isTimeLeft(time))
	            break;
	        radialIndex = getRadialIndex(i, Math.ceil(fields.length / 2), fields.length);
	        setLabelsOnFieldForFieldElement(fieldElements[radialIndex], fields[radialIndex]);
	    }
	    return fields;
	};
	const getFieldFromFieldElement = (element, index, isFocused, form) => {
	    const isInputElement = element instanceof HTMLInputElement;
	    const isSelectElement = element instanceof HTMLSelectElement;
	    const opid = index;
	    element.opid = opid;
	    const autocompleteType = isInputElement || isSelectElement ? element.autocomplete : undefined;
	    const isChecked = isInputElement && element.checked;
	    const isReadOnly = isInputElement && element.readOnly;
	    const isUserEdited = (isInputElement || isSelectElement) && element.opUserEdited;
	    const maxLength = isInputElement && element.maxLength && element.maxLength > 0
	        ? element.maxLength
	        : undefined;
	    const minLength = isInputElement && element.minLength && element.minLength > 0
	        ? element.minLength
	        : undefined;
	    const placeholder = isInputElement ? element.placeholder : undefined;
	    const selectOptions = isSelectElement ? getOptionsForSelectElement(element, form) : undefined;
	    const visible = isFocused || isElementVisible(element);
	    return {
	        autocompleteType: autocompleteType || undefined,
	        formOpid: element.form ? element.form.opid : undefined,
	        htmlId: element.id || undefined,
	        htmlName: element.name || undefined,
	        htmlClass: element.className || undefined,
	        isActive: isFocused || undefined,
	        isAriaDisabled: element.getAttribute("aria-disabled") === "true" || undefined,
	        isAriaHasPopup: element.getAttribute("aria-haspopup") === "true" || undefined,
	        isAriaHidden: element.getAttribute("aria-hidden") === "true" || undefined,
	        isChecked: isChecked || undefined,
	        isDisabled: element.disabled || undefined,
	        isHidden: !visible || undefined,
	        isReadOnly: isReadOnly || undefined,
	        isUserEdited: isUserEdited || undefined,
	        maxLength,
	        minLength,
	        opid,
	        placeholder: placeholder || undefined,
	        selectOptions,
	        tabIndex: element.tabIndex || undefined,
	        title: element.title || undefined,
	        type: element.type,
	        value: getValueFromFieldElement(element) || undefined,
	    };
	};
	const setLabelsOnFieldForFieldElement = (element, field) => {
	    field.label = getLabelForFieldElement(element) || undefined;
	    field.labelAria = getAriaLabelForFieldElement(element) || undefined;
	    field.labelData = element.getAttribute("data-label") || undefined;
	    field.labelBefore = getLabelBeforeElement(element) || undefined;
	    field.labelAfter = getLabelAfterElement(element) || undefined;
	};
	const syncFieldsAndElements = (fields, fieldElements) => {
	    fields = fields.filter(Boolean);
	    fieldElements = fieldElements.filter(element => element.opid !== undefined);
	    return { fields, fieldElements };
	};
	class FieldLabelFinder {
	    constructor(element, direction) {
	        console.assert(isElementVisible(element), "element must be visible for correct tree traversal");
	        this.direction = direction;
	        this.pauseNode = this.nextPauseNode(element);
	        this.walker = FieldLabelFinder.createTreeWalker(element, direction);
	    }
	    static createTreeWalker(element, direction) {
	        const root = document.body;
	        const includedNodes = NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT;
	        const nodeFilter = {
	            acceptNode: (node) => {
	                if (node.nodeType === Node.TEXT_NODE && SKIPPED_TEXT_NODE_TYPES.has(node.parentElement.constructor)) {
	                    return NodeFilter.FILTER_SKIP;
	                }
	                return NodeFilter.FILTER_ACCEPT;
	            },
	        };
	        const walker = document.createTreeWalker(root, includedNodes, nodeFilter);
	        walker.currentNode = element;
	        if (direction === 1) {
	            if (element.nextSibling) {
	                walker.currentNode = element.nextSibling;
	                walker.previousNode();
	            }
	        }
	        return walker;
	    }
	    normalizeStrings(strings) {
	        if (!strings.length) {
	            return "";
	        }
	        if (this.direction === 0) {
	            strings = strings.reverse();
	        }
	        return strings
	            .join(" ")
	            .trim()
	            .replace(/\s+/g, " ");
	    }
	    advanceWalker() {
	        if (this.direction === 0) {
	            return !!this.walker.previousNode();
	        }
	        return !!this.walker.nextNode();
	    }
	    nextPauseNode(node) {
	        if (this.direction === 0) {
	            return node.parentElement;
	        }
	        while (node.parentElement) {
	            if (node.parentElement.nextSibling) {
	                return node.parentElement.nextSibling;
	            }
	            node = node.parentElement;
	        }
	        return null;
	    }
	    shouldPauseAtNode(node) {
	        if (node !== this.pauseNode) {
	            return false;
	        }
	        this.pauseNode = this.nextPauseNode(this.pauseNode);
	        return true;
	    }
	    shouldStopAtNode(node) {
	        if (this.direction === 1 && node === this.pauseNode) {
	            return true;
	        }
	        if (node.nodeType !== Node.ELEMENT_NODE) {
	            return false;
	        }
	        const element = node;
	        if (element instanceof HTMLInputElement && (element.type === "text" || element.type === "password")) {
	            return isElementVisible(element);
	        }
	        return isElementTag(element, NON_LABEL_ELEMENTS);
	    }
	    findLabelText() {
	        const strings = [];
	        while (this.advanceWalker()) {
	            const currentNode = this.walker.currentNode;
	            if (this.shouldStopAtNode(currentNode)) {
	                break;
	            }
	            if (this.shouldPauseAtNode(currentNode)) {
	                if (strings.length) {
	                    const normalizedString = this.normalizeStrings(strings);
	                    return normalizedString.length > MAX_FIELD_LABEL_FINDER_TEXT_LENGTH ? "" : normalizedString;
	                }
	                continue;
	            }
	            const elementOrParentElement = currentNode instanceof HTMLElement ? currentNode : currentNode.parentElement;
	            if (!isElementVisible(elementOrParentElement)) {
	                this.skipInvisibleElement();
	                continue;
	            }
	            if (currentNode.nodeType !== Node.TEXT_NODE) {
	                continue;
	            }
	            const nodeValue = currentNode.nodeValue;
	            if (nodeValue && WORDLIKE_REGEX.test(nodeValue)) {
	                strings.push(nodeValue);
	            }
	        }
	        const normalizedString = this.normalizeStrings(strings);
	        return normalizedString.length > MAX_FIELD_LABEL_FINDER_TEXT_LENGTH ? "" : normalizedString;
	    }
	    skipInvisibleElement() {
	        let node = this.walker.currentNode;
	        if (this.direction === 0) {
	            while (node.parentElement && !isElementVisible(node.parentElement)) {
	                node = node.parentElement;
	            }
	        }
	        else if (node.firstChild) {
	            node = node.firstChild;
	            while (node.nextSibling || node.firstChild) {
	                node = node.nextSibling || node.firstChild;
	            }
	        }
	        this.walker.currentNode = node;
	    }
	}
	const generateUuid$1 = () => {
	    return getGlobal$1()
	        .crypto.getRandomValues(new Uint32Array(1))[0]
	        .toString(36);
	};
	const getFormAction = (form) => {
	    const ownerWindow = form.ownerDocument ? form.ownerDocument.defaultView : undefined;
	    if (ownerWindow) {
	        const action = form.getAttribute("action");
	        return action ? new URL(action, ownerWindow.location.href).href : ownerWindow.location.href;
	    }
	    return "";
	};
	const getLabelForFieldElement = (field) => {
	    return field.labels && field.labels.length > 0
	        ? [...field.labels].map(label => trimLabel(getTextContentFromElement(label))).join(" ")
	        : "";
	};
	const getLabelBeforeElement = (field) => {
	    if (!isElementVisible(field))
	        return "";
	    const finder = new FieldLabelFinder(field, 0);
	    return finder.findLabelText();
	};
	const getLabelAfterElement = (field) => {
	    if (!isElementVisible(field))
	        return "";
	    const finder = new FieldLabelFinder(field, 1);
	    return finder.findLabelText();
	};
	const getOptionsForSelectElement = (select, form) => {
	    const { options } = select;
	    const selectOptions = [];
	    if (options && options.length > 0) {
	        [...options].forEach((opt) => {
	            selectOptions.push(cleanWhitespace(opt.text));
	            selectOptions.push(opt.value);
	        });
	    }
	    if (form && form.textContent) {
	        form.textContent = cleanWhitespace(form.textContent.replace(cleanWhitespace(getTextContentFromElement(select)), ""));
	    }
	    return selectOptions.length ? selectOptions : undefined;
	};
	const getRadialIndex = (currIndex, startIndex, length) => {
	    const offset = Math.ceil(currIndex / 2);
	    const left = startIndex - offset;
	    const right = startIndex + offset;
	    const useLeft = currIndex % 2;
	    return left >= 0 && right < length
	        ? useLeft
	            ? left
	            : right
	        : left < 0
	            ? currIndex
	            : length - currIndex - 1;
	};
	const getTextContentFromElement = (element) => {
	    if (isElementTag(element, EXCLUDED_ELEMENTS))
	        return "";
	    return element.innerText || element.textContent || "";
	};
	const getValueFromFieldElement = (field) => {
	    const { type, value } = field;
	    switch (type) {
	        case "submit":
	        case "button":
	        case "reset":
	            return value === "" ? trimLabel(getTextContentFromElement(field)) : value;
	        default:
	            return value;
	    }
	};
	const getAriaLabelForFieldElement = (field) => {
	    const label = field.getAttribute("aria-label");
	    if (label) {
	        return label;
	    }
	    const elementIDs = field.getAttribute("aria-labelledby");
	    if (!elementIDs) {
	        return "";
	    }
	    let result = "";
	    for (const id of elementIDs.split(" ")) {
	        const element = document.getElementById(id);
	        if (element) {
	            result += getTextContentFromElement(element) + " ";
	        }
	    }
	    return cleanWhitespace(result);
	};
	const isElementTag = (element, tagName) => {
	    if (!element)
	        return false;
	    return tagName.has(element.constructor);
	};
	const isElementVisible = (element) => {
	    if (!element)
	        return false;
	    if (element.style.visibility === "hidden" || element.style.display === "none")
	        return false;
	    return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
	};
	const isFullPageForm = (form) => {
	    return form.parentElement === document.body;
	};
	const isTimeLeft = (time) => {
	    return Date.now() - time.start < time.max;
	};
	const querySelectorAllArray = (htmlDoc, selector) => {
	    return [...htmlDoc.querySelectorAll(selector.join())];
	};

	const FILLED_ATTRIBUTE = "data-com-onepassword-filled";
	const fillFrame = (frameFills) => {
	    const fills = [];
	    if (typeof uuid !== "undefined" && uuid !== "") {
	        for (const frameFill of frameFills) {
	            fills.push(fill(uuid, frameFill));
	        }
	    }
	    else {
	        console.error("Failed to fillFrame: Frame is missing uuid.");
	    }
	    return Promise.all(fills).then(() => undefined);
	};
	const FIELD_ELEMENTS$1 = ["button", "input", "select"];
	const fill = async (frameUuid, frameFill) => {
	    if (!confirmUuid(frameUuid, frameFill.uuid) ||
	        !confirmDomain(frameFill.allowedDomains, frameFill.allowAllDomains) ||
	        !confirmProtocol(frameFill.allowUnsafeHttp)) {
	        return;
	    }
	    const fields = getFieldElements$1();
	    let remainingFields = fields.slice();
	    for (const operation of frameFill.operations) {
	        const lastIndex = performOperation(operation, remainingFields);
	        remainingFields = remainingFields.slice(lastIndex + 1);
	        await tick();
	    }
	    if (frameFill.postFill) {
	        performOperation(frameFill.postFill, fields);
	        await tick();
	    }
	};
	const performOperation = (operation, fields) => {
	    const { action, opid, querySelector, value } = operation;
	    let fieldIndex = 0;
	    switch (action) {
	        case "clickOpid":
	            if (opid === undefined)
	                break;
	            fieldIndex = clickOpid(fields, opid);
	            break;
	        case "fillOpid":
	            if (opid === undefined)
	                break;
	            fieldIndex = fillOpid(fields, opid, value);
	            break;
	        case "fillQuerySelector":
	            if (!querySelector)
	                break;
	            fillQuerySelector(querySelector, value);
	            break;
	        case "focusOpid":
	            if (opid === undefined)
	                break;
	            fieldIndex = focusOpid(fields, opid);
	            break;
	    }
	    return fieldIndex;
	};
	const clickOpid = (fieldElements, opid) => {
	    const index = fieldElements.findIndex(el => el.opid === opid);
	    const element = fieldElements[index];
	    if (element)
	        element.click();
	    return index;
	};
	const fillOpid = (fieldElements, opid, value) => {
	    const index = fieldElements.findIndex(el => el.opid === opid);
	    const element = fieldElements[index];
	    if (element)
	        setFieldElementValue(element, value);
	    return index;
	};
	const fillQuerySelector = (query, value) => {
	    const element = document.querySelector(query);
	    if (element)
	        setFieldElementValue(element, value);
	};
	const focusOpid = (fieldElements, opid) => {
	    const index = fieldElements.findIndex(el => el.opid === opid);
	    const element = fieldElements[index];
	    if (element)
	        clickAndFocusOnFieldElement(element, true);
	    return index;
	};
	const clickAndFocusOnFieldElement = (element, preserveValue) => {
	    const previousValue = element.value;
	    element.click();
	    element.focus();
	    if (preserveValue && element.value !== previousValue) {
	        element.value = previousValue;
	    }
	};
	const confirmDomain = (allowedDomains, allowAllDomains) => {
	    if (allowAllDomains)
	        return true;
	    if (!window.origin || window.origin === "null") {
	        return false;
	    }
	    const { hostname } = window.location;
	    return allowedDomains.some(domain => domain === hostname || hostname.endsWith(`.${domain}`));
	};
	const confirmProtocol = (allowUnsafeHttp = false) => {
	    if (window.location.protocol === "https:") {
	        return true;
	    }
	    if (allowUnsafeHttp) {
	        return true;
	    }
	    return confirm("1Password warning: This is an unsecured (HTTP) page, and any information you submit can potentially be seen and changed by others. This Login was originally saved on a secure (HTTPS) page.\r\n\r\nDo you still wish to fill this login?");
	};
	const confirmUuid = (frameUuid, fillUuid) => {
	    return !!frameUuid && frameUuid === fillUuid;
	};
	const endFocusOnFieldElement = (element) => {
	    const previousValue = element.value;
	    keypressOnFieldElement(element);
	    element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
	    element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
	    element.setAttribute(FILLED_ATTRIBUTE, "");
	    const editListener = () => {
	        if (element.hasAttribute(FILLED_ATTRIBUTE)) {
	            element.removeAttribute(FILLED_ATTRIBUTE);
	        }
	        element.removeEventListener("input", editListener);
	    };
	    element.addEventListener("input", editListener);
	    setBackgroundColorOnFieldElement(element);
	    if (element.value === "")
	        element.value = previousValue;
	    element.blur();
	};
	const getFieldElements$1 = () => {
	    return querySelectorAllArray$1(document, FIELD_ELEMENTS$1).filter(field => field.type !== "hidden");
	};
	const keypressOnFieldElement = (element) => {
	    element.dispatchEvent(new KeyboardEvent("keydown"));
	    element.dispatchEvent(new KeyboardEvent("keypress"));
	    element.dispatchEvent(new KeyboardEvent("keyup"));
	};
	const querySelectorAllArray$1 = (htmlDoc, selector) => {
	    return [...htmlDoc.querySelectorAll(selector.join())];
	};
	const setBackgroundColorOnFieldElement = (element) => {
	    const color = window.getComputedStyle(element).color;
	    let rgb = { red: 0, green: 0, blue: 0 };
	    if (color && color.startsWith("rgb")) {
	        const components = color.match(/\d+/g);
	        if (components && components.length === 3) {
	            rgb = {
	                red: Number(components[0]),
	                green: Number(components[1]),
	                blue: Number(components[2]),
	            };
	        }
	    }
	    const luminance = (0.2126 * rgb.red + 0.7152 * rgb.green + 0.0722 * rgb.blue) / 255;
	    const bgStyle = luminance < 0.5 ? "light" : "dark";
	    element.setAttribute(FILLED_ATTRIBUTE, bgStyle);
	};
	const setFieldElementValue = (element, value) => {
	    if (element.type === "checkbox") {
	        if (element.checked !== !!value)
	            element.click();
	    }
	    else {
	        startFocusOnFieldElement(element);
	        element.value = value;
	        endFocusOnFieldElement(element);
	    }
	    element.opUserEdited = true;
	};
	const startFocusOnFieldElement = (element) => {
	    const previousValue = element.value;
	    clickAndFocusOnFieldElement(element);
	    keypressOnFieldElement(element);
	    if (element.value === "")
	        element.value = previousValue;
	};
	const tick = () => {
	    return new Promise(resolve => {
	        setTimeout(() => resolve(), 1);
	    });
	};

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

	// Adapted from https://github.com/reduxjs/redux/issues/303#issuecomment-125184409
	//
	function observeStore(store, select, onChange) {
	    let currentState;
	    function handleChange() {
	        const nextState = select(store.getState());
	        if (nextState !== currentState) {
	            currentState = nextState;
	            onChange(currentState);
	        }
	    }
	    const unsubscribe = store.subscribe(handleChange);
	    handleChange();
	    return unsubscribe;
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
	const observe = (select, onChange) => observeStore(store, select, onChange);
	const onChange = (prop, onChange) => observe(state => state[prop], onChange);

	class ButtonManager {
	    constructor() {
	        this.draw = () => {
	            this.createShadowRoot();
	            this.createStatus();
	            this.createButton();
	            this.setButtonStyles();
	            this.addShadowHostToDOM();
	        };
	        this.erase = () => {
	            var _a;
	            if (!((_a = this.shadowRoot) === null || _a === void 0 ? void 0 : _a.host.parentElement))
	                return;
	            document.body.removeChild(this.shadowRoot.host);
	        };
	        this.createShadowRoot = () => {
	            if (this.shadowRoot || !document.body)
	                return;
	            this.shadowRoot = document.createElement("com-1password-button").attachShadow({ mode: "closed" });
	            this.shadowRoot.addEventListener("mousedown", event => {
	                /**
	                 * Prevent focus from shifting when clicking the shadow root.
	                 */
	                event.stopImmediatePropagation();
	                event.preventDefault();
	            });
	            this.shadowRoot.addEventListener("click", event => {
	                var _a, _b;
	                if (event.target)
	                    (_b = (_a = this).onClick) === null || _b === void 0 ? void 0 : _b.call(_a);
	            });
	        };
	        this.createButton = () => {
	            if (!this.shadowRoot || this.button)
	                return;
	            this.button = document.createElement("button");
	            this.button.id = "op-button";
	            this.shadowRoot.appendChild(this.button);
	        };
	        this.createStatus = () => {
	            if (!this.shadowRoot || this.status)
	                return;
	            this.status = document.createElement("div");
	            this.status.id = "op-status";
	            this.status.setAttribute("role", "status");
	            this.status.innerText = "1Password menu available. Press the down arrow key to select.";
	            this.status.setAttribute("style", `
        all: initial;
        position: absolute;
        top: -1000px;
        left: -1000px;
        opacity: 0;
        width: 0;
        height: 0;
      `);
	            this.shadowRoot.appendChild(this.status);
	        };
	        this.setButtonStyles = () => {
	            const { activeFieldRect: fieldRect } = store.getState();
	            if (!this.button || !fieldRect)
	                return;
	            const fieldTop = fieldRect.top;
	            const fieldLeft = fieldRect.left;
	            const [buttonSize] = this.calculateSize(fieldRect.height);
	            const buttonOffsetFromTopOfField = (fieldRect.height - buttonSize) / 2;
	            const { basePath, activeFieldDir: fieldDir } = store.getState();
	            const top = fieldTop + buttonOffsetFromTopOfField;
	            const ltrOffset = fieldRect.width - buttonSize - buttonOffsetFromTopOfField;
	            const left = fieldLeft + (fieldDir === "rtl" ? buttonOffsetFromTopOfField : ltrOffset);
	            const locked = store.getState().locked ? "locked" : "unlocked";
	            this.button.setAttribute("style", `
        all: initial;
        position: fixed;
        z-index: 2147483647;
        top: ${top}px;
				left: ${left}px;
        min-width: 12px;
        width: ${buttonSize}px;
        max-width: 24px;
        min-height: 12px;
        height: ${buttonSize}px;
        max-height: 24px;
        background-image: url(${basePath}/images/icons/app_icon-light_bg-color-${locked}-${buttonSize}.svg);
        background-size: cover;
        background-repeat: no-repeat;
        border: none;
        outline: 0;
        cursor: pointer;
      `);
	        };
	        this.calculateSize = (fieldHeight) => {
	            if (fieldHeight >= 38)
	                return [ButtonManager.large, "large"];
	            return fieldHeight < ButtonManager.medium + 4 ? [ButtonManager.small, "small"] : [ButtonManager.medium, "medium"];
	        };
	        onChange("activeField", activeField => {
	            activeField ? this.draw() : this.erase();
	        });
	        onChange("locked", () => {
	            this.setButtonStyles();
	        });
	        onChange("inlineDisabled", inlineDisabled => {
	            if (inlineDisabled)
	                this.erase();
	        });
	    }
	    addShadowHostToDOM() {
	        if (!this.shadowRoot || this.shadowRoot.host.parentElement)
	            return;
	        document.body.appendChild(this.shadowRoot.host);
	    }
	}
	ButtonManager.small = 12;
	ButtonManager.medium = 16;
	ButtonManager.large = 24;

	const DECORABLE_DESIGNATIONS = [
	    "username",
	    "current-password",
	    "new-password",
	    "one-time-code",
	    "cc-number",
	    "cc-given-name",
	    "cc-family-name",
	    "cc-name",
	    "given-name",
	    "family-name",
	    "name",
	    "email",
	    "street-address",
	    "address-line1",
	];
	function shouldDecorate(designation) {
	    return (designation.fieldDesignation &&
	        designation.fieldDesignation !== "none" &&
	        DECORABLE_DESIGNATIONS.includes(designation.fieldDesignation));
	}

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

	/** Detect free variable `global` from Node.js. */
	var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

	var _freeGlobal = freeGlobal;

	/** Detect free variable `self`. */
	var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

	/** Used as a reference to the global object. */
	var root$1 = _freeGlobal || freeSelf || Function('return this')();

	var _root = root$1;

	/**
	 * Gets the timestamp of the number of milliseconds that have elapsed since
	 * the Unix epoch (1 January 1970 00:00:00 UTC).
	 *
	 * @static
	 * @memberOf _
	 * @since 2.4.0
	 * @category Date
	 * @returns {number} Returns the timestamp.
	 * @example
	 *
	 * _.defer(function(stamp) {
	 *   console.log(_.now() - stamp);
	 * }, _.now());
	 * // => Logs the number of milliseconds it took for the deferred invocation.
	 */
	var now = function() {
	  return _root.Date.now();
	};

	var now_1 = now;

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
	var symbolTag = '[object Symbol]';

	/**
	 * Checks if `value` is classified as a `Symbol` primitive or object.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
	 * @example
	 *
	 * _.isSymbol(Symbol.iterator);
	 * // => true
	 *
	 * _.isSymbol('abc');
	 * // => false
	 */
	function isSymbol(value) {
	  return typeof value == 'symbol' ||
	    (isObjectLike_1(value) && _baseGetTag(value) == symbolTag);
	}

	var isSymbol_1 = isSymbol;

	/** Used as references for various `Number` constants. */
	var NAN = 0 / 0;

	/** Used to match leading and trailing whitespace. */
	var reTrim = /^\s+|\s+$/g;

	/** Used to detect bad signed hexadecimal string values. */
	var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

	/** Used to detect binary string values. */
	var reIsBinary = /^0b[01]+$/i;

	/** Used to detect octal string values. */
	var reIsOctal = /^0o[0-7]+$/i;

	/** Built-in method references without a dependency on `root`. */
	var freeParseInt = parseInt;

	/**
	 * Converts `value` to a number.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to process.
	 * @returns {number} Returns the number.
	 * @example
	 *
	 * _.toNumber(3.2);
	 * // => 3.2
	 *
	 * _.toNumber(Number.MIN_VALUE);
	 * // => 5e-324
	 *
	 * _.toNumber(Infinity);
	 * // => Infinity
	 *
	 * _.toNumber('3.2');
	 * // => 3.2
	 */
	function toNumber(value) {
	  if (typeof value == 'number') {
	    return value;
	  }
	  if (isSymbol_1(value)) {
	    return NAN;
	  }
	  if (isObject_1(value)) {
	    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
	    value = isObject_1(other) ? (other + '') : other;
	  }
	  if (typeof value != 'string') {
	    return value === 0 ? value : +value;
	  }
	  value = value.replace(reTrim, '');
	  var isBinary = reIsBinary.test(value);
	  return (isBinary || reIsOctal.test(value))
	    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
	    : (reIsBadHex.test(value) ? NAN : +value);
	}

	var toNumber_1 = toNumber;

	/** Error message constants. */
	var FUNC_ERROR_TEXT = 'Expected a function';

	/* Built-in method references for those with the same name as other `lodash` methods. */
	var nativeMax = Math.max,
	    nativeMin = Math.min;

	/**
	 * Creates a debounced function that delays invoking `func` until after `wait`
	 * milliseconds have elapsed since the last time the debounced function was
	 * invoked. The debounced function comes with a `cancel` method to cancel
	 * delayed `func` invocations and a `flush` method to immediately invoke them.
	 * Provide `options` to indicate whether `func` should be invoked on the
	 * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
	 * with the last arguments provided to the debounced function. Subsequent
	 * calls to the debounced function return the result of the last `func`
	 * invocation.
	 *
	 * **Note:** If `leading` and `trailing` options are `true`, `func` is
	 * invoked on the trailing edge of the timeout only if the debounced function
	 * is invoked more than once during the `wait` timeout.
	 *
	 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
	 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
	 *
	 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
	 * for details over the differences between `_.debounce` and `_.throttle`.
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Function
	 * @param {Function} func The function to debounce.
	 * @param {number} [wait=0] The number of milliseconds to delay.
	 * @param {Object} [options={}] The options object.
	 * @param {boolean} [options.leading=false]
	 *  Specify invoking on the leading edge of the timeout.
	 * @param {number} [options.maxWait]
	 *  The maximum time `func` is allowed to be delayed before it's invoked.
	 * @param {boolean} [options.trailing=true]
	 *  Specify invoking on the trailing edge of the timeout.
	 * @returns {Function} Returns the new debounced function.
	 * @example
	 *
	 * // Avoid costly calculations while the window size is in flux.
	 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
	 *
	 * // Invoke `sendMail` when clicked, debouncing subsequent calls.
	 * jQuery(element).on('click', _.debounce(sendMail, 300, {
	 *   'leading': true,
	 *   'trailing': false
	 * }));
	 *
	 * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
	 * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
	 * var source = new EventSource('/stream');
	 * jQuery(source).on('message', debounced);
	 *
	 * // Cancel the trailing debounced invocation.
	 * jQuery(window).on('popstate', debounced.cancel);
	 */
	function debounce(func, wait, options) {
	  var lastArgs,
	      lastThis,
	      maxWait,
	      result,
	      timerId,
	      lastCallTime,
	      lastInvokeTime = 0,
	      leading = false,
	      maxing = false,
	      trailing = true;

	  if (typeof func != 'function') {
	    throw new TypeError(FUNC_ERROR_TEXT);
	  }
	  wait = toNumber_1(wait) || 0;
	  if (isObject_1(options)) {
	    leading = !!options.leading;
	    maxing = 'maxWait' in options;
	    maxWait = maxing ? nativeMax(toNumber_1(options.maxWait) || 0, wait) : maxWait;
	    trailing = 'trailing' in options ? !!options.trailing : trailing;
	  }

	  function invokeFunc(time) {
	    var args = lastArgs,
	        thisArg = lastThis;

	    lastArgs = lastThis = undefined;
	    lastInvokeTime = time;
	    result = func.apply(thisArg, args);
	    return result;
	  }

	  function leadingEdge(time) {
	    // Reset any `maxWait` timer.
	    lastInvokeTime = time;
	    // Start the timer for the trailing edge.
	    timerId = setTimeout(timerExpired, wait);
	    // Invoke the leading edge.
	    return leading ? invokeFunc(time) : result;
	  }

	  function remainingWait(time) {
	    var timeSinceLastCall = time - lastCallTime,
	        timeSinceLastInvoke = time - lastInvokeTime,
	        timeWaiting = wait - timeSinceLastCall;

	    return maxing
	      ? nativeMin(timeWaiting, maxWait - timeSinceLastInvoke)
	      : timeWaiting;
	  }

	  function shouldInvoke(time) {
	    var timeSinceLastCall = time - lastCallTime,
	        timeSinceLastInvoke = time - lastInvokeTime;

	    // Either this is the first call, activity has stopped and we're at the
	    // trailing edge, the system time has gone backwards and we're treating
	    // it as the trailing edge, or we've hit the `maxWait` limit.
	    return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
	      (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
	  }

	  function timerExpired() {
	    var time = now_1();
	    if (shouldInvoke(time)) {
	      return trailingEdge(time);
	    }
	    // Restart the timer.
	    timerId = setTimeout(timerExpired, remainingWait(time));
	  }

	  function trailingEdge(time) {
	    timerId = undefined;

	    // Only invoke if we have `lastArgs` which means `func` has been
	    // debounced at least once.
	    if (trailing && lastArgs) {
	      return invokeFunc(time);
	    }
	    lastArgs = lastThis = undefined;
	    return result;
	  }

	  function cancel() {
	    if (timerId !== undefined) {
	      clearTimeout(timerId);
	    }
	    lastInvokeTime = 0;
	    lastArgs = lastCallTime = lastThis = timerId = undefined;
	  }

	  function flush() {
	    return timerId === undefined ? result : trailingEdge(now_1());
	  }

	  function debounced() {
	    var time = now_1(),
	        isInvoking = shouldInvoke(time);

	    lastArgs = arguments;
	    lastThis = this;
	    lastCallTime = time;

	    if (isInvoking) {
	      if (timerId === undefined) {
	        return leadingEdge(lastCallTime);
	      }
	      if (maxing) {
	        // Handle invocations in a tight loop.
	        clearTimeout(timerId);
	        timerId = setTimeout(timerExpired, wait);
	        return invokeFunc(lastCallTime);
	      }
	    }
	    if (timerId === undefined) {
	      timerId = setTimeout(timerExpired, wait);
	    }
	    return result;
	  }
	  debounced.cancel = cancel;
	  debounced.flush = flush;
	  return debounced;
	}

	var debounce_1 = debounce;

	/** Error message constants. */
	var FUNC_ERROR_TEXT$1 = 'Expected a function';

	/**
	 * Creates a throttled function that only invokes `func` at most once per
	 * every `wait` milliseconds. The throttled function comes with a `cancel`
	 * method to cancel delayed `func` invocations and a `flush` method to
	 * immediately invoke them. Provide `options` to indicate whether `func`
	 * should be invoked on the leading and/or trailing edge of the `wait`
	 * timeout. The `func` is invoked with the last arguments provided to the
	 * throttled function. Subsequent calls to the throttled function return the
	 * result of the last `func` invocation.
	 *
	 * **Note:** If `leading` and `trailing` options are `true`, `func` is
	 * invoked on the trailing edge of the timeout only if the throttled function
	 * is invoked more than once during the `wait` timeout.
	 *
	 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
	 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
	 *
	 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
	 * for details over the differences between `_.throttle` and `_.debounce`.
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Function
	 * @param {Function} func The function to throttle.
	 * @param {number} [wait=0] The number of milliseconds to throttle invocations to.
	 * @param {Object} [options={}] The options object.
	 * @param {boolean} [options.leading=true]
	 *  Specify invoking on the leading edge of the timeout.
	 * @param {boolean} [options.trailing=true]
	 *  Specify invoking on the trailing edge of the timeout.
	 * @returns {Function} Returns the new throttled function.
	 * @example
	 *
	 * // Avoid excessively updating the position while scrolling.
	 * jQuery(window).on('scroll', _.throttle(updatePosition, 100));
	 *
	 * // Invoke `renewToken` when the click event is fired, but not more than once every 5 minutes.
	 * var throttled = _.throttle(renewToken, 300000, { 'trailing': false });
	 * jQuery(element).on('click', throttled);
	 *
	 * // Cancel the trailing throttled invocation.
	 * jQuery(window).on('popstate', throttled.cancel);
	 */
	function throttle(func, wait, options) {
	  var leading = true,
	      trailing = true;

	  if (typeof func != 'function') {
	    throw new TypeError(FUNC_ERROR_TEXT$1);
	  }
	  if (isObject_1(options)) {
	    leading = 'leading' in options ? !!options.leading : leading;
	    trailing = 'trailing' in options ? !!options.trailing : trailing;
	  }
	  return debounce_1(func, wait, {
	    'leading': leading,
	    'maxWait': wait,
	    'trailing': trailing
	  });
	}

	var throttle_1 = throttle;

	class InputManager {
	    constructor() {
	        this.decorate = ({ configured = store.getState().configured, fillInProgress = store.getState().fillInProgress, inlineDisabled = store.getState().inlineDisabled, target = document.activeElement, }, callback) => {
	            var _a;
	            if (!configured || inlineDisabled || fillInProgress || !this.isDecoratableField(target))
	                return;
	            (_a = callback) === null || _a === void 0 ? void 0 : _a(target);
	        };
	        this.isDecoratableField = (target) => {
	            const fillableFieldTypes = ["text", "email", "number", "password", "url", "tel"];
	            const minWidth = 90;
	            const minHeight = 5;
	            /**
	             * Check `offsetWidth` and `offsetHeight` last as they will trigger reflow, which could be expensive.
	             */
	            return (target instanceof HTMLInputElement &&
	                fillableFieldTypes.includes(target.type.toLowerCase()) &&
	                !target.readOnly &&
	                !target.disabled &&
	                target.offsetWidth >= minWidth &&
	                target.offsetHeight >= minHeight);
	        };
	        this.onFocus = (event) => {
	            var _a, _b;
	            const { target } = event;
	            if (this.isOwnAsset(target))
	                return;
	            /**
	             * If we're already tracking an active field, simulate a blur event to dismiss inline components since the presence
	             * of this focus event indicates that the active field lost focus.
	             */
	            if (store.getState().activeField) {
	                (_b = (_a = this).onInputBlur) === null || _b === void 0 ? void 0 : _b.call(_a);
	            }
	            /**
	             * Explicitly pass a falsey value for `inlineDisabled` since the real value for `inlineDisabled` will be checked
	             * in the callback.
	             */
	            this.decorate({ inlineDisabled: false, target }, this.resolvePendingFill);
	        };
	        this.onInput = (event) => {
	            var _a, _b;
	            const { target } = event;
	            const { activeField } = store.getState();
	            if (activeField && target === activeField) {
	                (_b = (_a = this).onActiveInputChange) === null || _b === void 0 ? void 0 : _b.call(_a, target);
	            }
	        };
	        this.onKeyDown = (event) => {
	            var _a, _b;
	            const { activeField } = store.getState();
	            if (!activeField || event.target !== activeField)
	                return;
	            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
	                return;
	            if (!["ArrowUp", "ArrowDown", "Escape"].includes(event.key))
	                return;
	            event.preventDefault();
	            (_b = (_a = this).onActiveInputKeyDown) === null || _b === void 0 ? void 0 : _b.call(_a, event.key);
	        };
	        this.onMouseDown = (event) => {
	            var _a, _b;
	            const { target } = event;
	            if (this.isOwnAsset(target))
	                return;
	            /**
	             * Inline components may have been dismissed due to a scroll/resize event. Attempt to show them again when clicking
	             * on the currently focused element.
	             */
	            if (!store.getState().activeField && target === document.activeElement) {
	                this.decorate({ target }, this.onInputFocus);
	                return;
	            }
	            (_b = (_a = this).onInputBlur) === null || _b === void 0 ? void 0 : _b.call(_a);
	        };
	        this.resolvePendingFill = (target) => {
	            var _a, _b;
	            const { fillPendingUserInteraction, inlineDisabled } = store.getState();
	            if (fillPendingUserInteraction) {
	                /**
	                 * Use `then` to avoid blocking the focus handler when there is no pending fill, which is most of the time. This
	                 * results in duplication of the `inlineDisabled` check and `onInputFocus` invocation.
	                 */
	                bridge.resolvePendingFill().then(fillPendingUserInteraction => {
	                    var _a, _b;
	                    if (fillPendingUserInteraction)
	                        return;
	                    store.dispatch({ type: "cancel-pending-fill" });
	                    if (!inlineDisabled) {
	                        (_b = (_a = this).onInputFocus) === null || _b === void 0 ? void 0 : _b.call(_a, target);
	                    }
	                });
	                return;
	            }
	            if (!inlineDisabled) {
	                (_b = (_a = this).onInputFocus) === null || _b === void 0 ? void 0 : _b.call(_a, target);
	            }
	        };
	        this.activeFieldVisibilityObserver = new IntersectionObserver(entries => {
	            var _a, _b;
	            for (const entry of entries) {
	                const { width, height } = entry.boundingClientRect;
	                /**
	                 * IntersectionObserver doesn't report visibility changes from CSS properties like `transform`, `opacity`, or
	                 * `filter`. This will be improved with IntersectionObserver V2, but for now, we can still make use of
	                 * visibility changes when the observed element has a size of 0x0 and is no longer intersecting the page (e.g.
	                 * its CSS "display" property was set to "none" or it was removed from the DOM).
	                 */
	                if (!entry.isIntersecting && width === 0 && height === 0) {
	                    (_b = (_a = this).onInputBlur) === null || _b === void 0 ? void 0 : _b.call(_a);
	                }
	            }
	        });
	        window.addEventListener("focusin", throttle_1(this.onFocus, 10), true);
	        window.addEventListener("keydown", throttle_1(this.onKeyDown, 10), true);
	        window.addEventListener("input", this.onInput, true);
	        window.addEventListener("mousedown", this.onMouseDown, true);
	        onChange("inlineDisabled", inlineDisabled => {
	            this.decorate({ inlineDisabled }, this.onInputFocus);
	        });
	        onChange("configured", configured => {
	            /**
	             * Explicitly pass a falsey value for `inlineDisabled` since the real value for `inlineDisabled` will be checked
	             * in the callback.
	             */
	            this.decorate({ configured, inlineDisabled: false }, this.resolvePendingFill);
	        });
	        onChange("fillInProgress", fillInProgress => {
	            this.decorate({ fillInProgress }, this.onInputFocus);
	        });
	        onChange("activeField", field => {
	            field ? this.activeFieldVisibilityObserver.observe(field) : this.activeFieldVisibilityObserver.disconnect();
	        });
	    }
	    isOwnAsset(target) {
	        const { activeField } = store.getState();
	        if ((activeField && target === activeField) ||
	            (target instanceof Element && ["COM-1PASSWORD-BUTTON", "COM-1PASSWORD-MENU"].includes(target.tagName))) {
	            return true;
	        }
	        return false;
	    }
	}

	class FormManager {
	    constructor() {
	        this._isFieldOrFormEdited = (field) => {
	            const formState = this._getFormState(field);
	            return formState.editedFieldCount > 0;
	        };
	        this._onInputFocus = (target) => {
	            this._getDesignation(target)
	                .then(designation => {
	                if (shouldDecorate(designation)) {
	                    store.dispatch({
	                        type: "set-active-field",
	                        payload: target,
	                    });
	                    store.dispatch({
	                        type: "set-active-field-designation",
	                        payload: designation,
	                    });
	                    this._ensureFieldIsTracked(target);
	                    this.onActiveInputFocus && this.onActiveInputFocus(this.isEdited);
	                }
	            })
	                .catch(() => {
	                // Designation in progress, do nothing.
	            });
	        };
	        this._onInputBlur = () => {
	            this.onActiveInputBlur && this.onActiveInputBlur();
	        };
	        this._ensureFormIsTracked = (form) => {
	            let formState = this.trackedForms.get(form);
	            // create a new FormState for this form if we don't have one already
	            if (!formState) {
	                formState = {
	                    initialValues: new WeakMap(),
	                    editedFields: new WeakSet(),
	                    editedFieldCount: 0,
	                };
	                this.trackedForms.set(form, formState);
	            }
	            return formState;
	        };
	        this._ensureStandaloneFieldIsTracked = (input) => {
	            let formState = this.trackedStandaloneFields.get(input);
	            if (!formState) {
	                formState = {
	                    initialValues: new WeakMap(),
	                    editedFields: new WeakSet(),
	                    editedFieldCount: 0,
	                };
	                this.trackedStandaloneFields.set(input, formState);
	            }
	            return formState;
	        };
	        this._getFormState = (field) => {
	            return field.form ? this._ensureFormIsTracked(field.form) : this._ensureStandaloneFieldIsTracked(field);
	        };
	        this._ensureFieldIsTracked = (field) => {
	            const formState = this._getFormState(field);
	            // save the value for this field if we haven't already
	            if (!formState.initialValues.has(field)) {
	                formState.initialValues.set(field, field.value);
	            }
	        };
	        this._onActiveInputKeyDown = (key) => {
	            this.onActiveInputKeyDown && this.onActiveInputKeyDown(key, this.isEdited);
	        };
	        this._onActiveInputChange = (field) => {
	            const formState = this._getFormState(field);
	            // If we're filling then we don't need to track the edited status of this field
	            if (store.getState().fillInProgress) {
	                // However if we have tracked this as an edited field then reset it
	                if (formState.editedFields.has(field)) {
	                    formState.editedFields.delete(field);
	                    formState.editedFieldCount--;
	                }
	                return;
	            }
	            const previousEditState = this._isFieldOrFormEdited(field);
	            if (formState.initialValues.get(field) === field.value) {
	                if (formState.editedFields.has(field)) {
	                    formState.editedFields.delete(field);
	                    formState.editedFieldCount--;
	                }
	            }
	            else {
	                if (!formState.editedFields.has(field)) {
	                    formState.editedFields.add(field);
	                    formState.editedFieldCount++;
	                }
	            }
	            const newEditState = this._isFieldOrFormEdited(field);
	            if (previousEditState !== newEditState) {
	                bridge.editedStateChanged(newEditState);
	            }
	            // let FrameManager know the input value has changed
	            this.onActiveInputChange && this.onActiveInputChange(field);
	        };
	        this._onButtonClick = () => {
	            this.onButtonClick && this.onButtonClick(this.isEdited);
	        };
	        this._getDesignation = async (target) => {
	            const cachedDesignation = this.designations.get(target);
	            if (cachedDesignation) {
	                return cachedDesignation;
	            }
	            // entry exists but it's falsy
	            if (this.designations.has(target)) {
	                throw new Error("Field is already being designated.");
	            }
	            // Add a placeholder to prevent double-designation race conditions.
	            this.designations.set(target, undefined);
	            const designation = await bridge.getDesignation(collectFrame({
	                activeFormOnly: true,
	            }));
	            this.designations.set(target, designation);
	            return designation;
	        };
	        this.inputManager = new InputManager();
	        this.inputManager.onInputFocus = this._onInputFocus;
	        this.inputManager.onInputBlur = this._onInputBlur;
	        this.inputManager.onActiveInputKeyDown = this._onActiveInputKeyDown;
	        this.inputManager.onActiveInputChange = this._onActiveInputChange;
	        this.buttonManager = new ButtonManager();
	        this.buttonManager.onClick = this._onButtonClick;
	        this.trackedForms = new WeakMap();
	        this.trackedStandaloneFields = new WeakMap();
	        this.designations = new Map();
	        bridge.onHideSaveDialog(this._onInputBlur);
	    }
	    get isEdited() {
	        const { activeField } = store.getState();
	        if (!activeField)
	            return false;
	        return this._isFieldOrFormEdited(activeField);
	    }
	}

	class SaveItemRequestManager {
	    constructor() {
	        this._handleSaveItemRequest = () => {
	            const saveItemRequest = document.querySelector("input[data-onepassword-save-request]");
	            if (!saveItemRequest) {
	                throw new Error("No Save Item Request found.");
	            }
	            const saveItemRequestType = saveItemRequest.getAttribute("data-onepassword-type");
	            const saveItemRequestData = saveItemRequest.value;
	            if (typeof saveItemRequestType === "string") {
	                bridge.handleSaveItemRequest(saveItemRequestType, saveItemRequestData);
	            }
	        };
	        // TODO (mitch): What if the button isn't there yet, e.g. on a single-page app?
	        // Is it worth the performance penalty to set up a mutation observer?
	        const saveButton = document.querySelector("button[data-onepassword-save-button]");
	        if (saveButton) {
	            saveButton.disabled = false;
	            saveButton.addEventListener("click", this._handleSaveItemRequest);
	        }
	    }
	}

	class FrameManager {
	    constructor() {
	        this._isListeningForScrollAndResizeEvents = false;
	        this.onActiveInputKeyDown = (key, formEdited) => {
	            if (key === "ArrowDown") {
	                if (store.getState().inlineMenuOpen) {
	                    this.inlineMenuManager.focus();
	                }
	                else {
	                    this.inlineMenuManager.toggle(formEdited, true);
	                }
	            }
	            else {
	                this._handleKeyDown(key, formEdited);
	            }
	        };
	        this.onActiveInputChange = (input) => {
	            if (store.getState().inlineMenuOpen) {
	                this.inlineMenuManager.filter(input.value);
	            }
	        };
	        this.onButtonClick = (formEdited) => {
	            this.inlineMenuManager.toggle(formEdited);
	        };
	        this.onActiveInputFocus = (formEdited) => {
	            var _a;
	            this._onActiveInputFocus();
	            const { autoshowMenu, locked } = store.getState();
	            if (locked || !autoshowMenu)
	                return;
	            if (!((_a = store.getState().activeField) === null || _a === void 0 ? void 0 : _a.hasAttribute(FILLED_ATTRIBUTE))) {
	                this.inlineMenuManager.attach(formEdited);
	            }
	        };
	        this.onActiveInputBlur = () => {
	            store.dispatch({
	                type: "set-active-field",
	                payload: undefined,
	            });
	            this.inlineMenuManager.detach();
	        };
	        this.collectFrame = () => {
	            const activeField = store.getState().activeField;
	            if (!activeField) {
	                return collectFrame();
	            }
	            return collectFrame({
	                activeFieldOpid: getFieldElementOpid(activeField),
	                activeFormOnly: true,
	            });
	        };
	        this._onScrollOrResize = () => {
	            this._removeScrollAndResizeEventListeners();
	        };
	        this._addScrollAndResizeEventListeners = () => {
	            if (this._isListeningForScrollAndResizeEvents)
	                return;
	            window.addEventListener("scroll", this._onScrollOrResize, true);
	            window.addEventListener("resize", this._onScrollOrResize, true);
	            this._isListeningForScrollAndResizeEvents = true;
	        };
	        this._removeScrollAndResizeEventListeners = () => {
	            if (!this._isListeningForScrollAndResizeEvents)
	                return;
	            bridge.removeScrollAndResizeEventListeners();
	            window.removeEventListener("scroll", this._onScrollOrResize, true);
	            window.removeEventListener("resize", this._onScrollOrResize, true);
	            this._isListeningForScrollAndResizeEvents = false;
	            // Ensure all frames remove their active field.
	            this.onActiveInputBlur();
	        };
	        this.saveItemRequestManager = new SaveItemRequestManager();
	        this.formManager = new FormManager();
	        this.formManager.onActiveInputFocus = this.onActiveInputFocus;
	        this.formManager.onActiveInputBlur = this.onActiveInputBlur;
	        this.formManager.onActiveInputKeyDown = this.onActiveInputKeyDown;
	        this.formManager.onButtonClick = this.onButtonClick;
	        this.formManager.onActiveInputChange = this.onActiveInputChange;
	        bridge.getFrameManagerConfiguration().then(state => {
	            store.dispatch({
	                type: "configure",
	                payload: state,
	            });
	        });
	        //
	        // Listeners from other frames
	        //
	        bridge.onInlineMenuOpened(() => {
	            store.dispatch({
	                type: "set-inline-menu-open",
	                payload: true,
	            });
	        });
	        bridge.onInlineMenuClosed(() => {
	            store.dispatch({
	                type: "set-inline-menu-open",
	                payload: false,
	            });
	        });
	        bridge.onAddScrollAndResizeEventListeners(this._addScrollAndResizeEventListeners);
	        bridge.onRemoveScrollAndResizeEventListeners(this._removeScrollAndResizeEventListeners);
	        //
	        // Listeners from the background page
	        //
	        bridge.onLockStateChanged(({ locked }) => {
	            store.dispatch({
	                type: "lock-state-changed",
	                payload: locked,
	            });
	        });
	        bridge.onPageExcluded(excluded => {
	            store.dispatch({
	                type: "set-page-excluded",
	                payload: excluded,
	            });
	        });
	        bridge.onCollectFrameDetails(() => this.collectFrame());
	        bridge.onPerformFill(fillResponse => {
	            var _a, _b;
	            store.dispatch({
	                type: "fill-start",
	                payload: fillResponse.status === "inProgress" /* InProgress */,
	            });
	            /**
	             * All frames receive the "perform-fill" message but only the top frame needs to dismiss the inline menu.
	             * Use `_detachInlineMenu` instead of `inlineMenuManager.detach` to avoid unnecessary message sending from
	             * nested frames.
	             */
	            (_b = (_a = this)._detachInlineMenu) === null || _b === void 0 ? void 0 : _b.call(_a);
	            fillFrame(fillResponse.payload.frames || []).then(() => {
	                store.dispatch({ type: "fill-end" });
	            });
	        });
	        bridge.onPing(() => {
	            bridge.sayHello();
	        });
	        //
	        // Listeners from tbe inline menu
	        //
	        bridge.onFocusPage(() => {
	            const activeField = store.getState().activeField;
	            if (activeField) {
	                activeField.focus();
	            }
	        });
	    }
	}

	class SaveDialogFrame {
	    constructor() {
	        this.draw = (tabId) => {
	            this.createShadowRoot();
	            this.createDialog();
	            this.setDialogSrc(tabId);
	            this.addShadowHostToDOM();
	        };
	        this.erase = () => {
	            var _a;
	            if (!((_a = this.shadowRoot) === null || _a === void 0 ? void 0 : _a.host.parentElement))
	                return;
	            document.body.removeChild(this.shadowRoot.host);
	        };
	        this.createShadowRoot = () => {
	            if (this.shadowRoot || !document.body)
	                return;
	            this.shadowRoot = document.createElement("com-1password-save-dialog").attachShadow({ mode: "closed" });
	        };
	        this.createDialog = () => {
	            if (!this.shadowRoot || this.dialog)
	                return;
	            this.dialog = document.createElement("iframe");
	            this.dialog.id = "op-save-dialog";
	            this.dialog.setAttribute("style", `
        all: initial;
        position: fixed;
        z-index: 2147483647;
        top: 0px;
        left: 0px;
        min-width: 100vw;
        width: 100vw;
        max-width: 100vw;
        min-height: 100vh;
        height: 100vh;
        max-height: 100vh;
        border: none;
      `);
	            this.shadowRoot.appendChild(this.dialog);
	        };
	        this.setDialogSrc = (tabId) => {
	            if (!this.dialog)
	                return;
	            const { basePath, locale } = store.getState();
	            const src = new URL(`${basePath}/save-dialog/save-dialog.html`);
	            const params = new URLSearchParams({
	                language: locale,
	                tabId: tabId.toString(),
	                sessionId: tabId.toString(),
	            });
	            src.search = params.toString();
	            this.dialog.src = src.toString();
	        };
	    }
	    addShadowHostToDOM() {
	        if (!this.shadowRoot || this.shadowRoot.host.parentElement)
	            return;
	        document.body.appendChild(this.shadowRoot.host);
	    }
	}

	class SaveDialogManager {
	    constructor() {
	        this._add = (tabId) => {
	            this.saveDialogFrame.draw(tabId);
	        };
	        this._remove = () => {
	            this.saveDialogFrame.erase();
	        };
	        this.saveDialogFrame = new SaveDialogFrame();
	        bridge.onShowSaveDialog(({ sessionId }) => {
	            this._add(sessionId);
	        });
	        bridge.onHideSaveDialog(() => {
	            this._remove();
	        });
	    }
	}

	class InlineMenuFrame {
	    constructor() {
	        this.draw = (configuration) => {
	            this.createShadowRoot();
	            this.createMenu();
	            this.setMenuSrc(configuration);
	            this.positionMenu({ dir: configuration.dir, x: configuration.x, y: configuration.y });
	            this.addShadowHostToDOM();
	            bridge.sendInlineMenuOpened();
	        };
	        this.erase = () => {
	            var _a;
	            if (!((_a = this.shadowRoot) === null || _a === void 0 ? void 0 : _a.host.parentElement))
	                return;
	            document.body.removeChild(this.shadowRoot.host);
	            bridge.sendInlineMenuClosed();
	        };
	        this.show = () => {
	            var _a;
	            if (!((_a = this.menu) === null || _a === void 0 ? void 0 : _a.parentNode) || this.menu.style.visibility === "visible")
	                return;
	            this.menu.style.visibility = "visible";
	        };
	        this.resize = (height, width) => {
	            var _a;
	            if (!((_a = this.menu) === null || _a === void 0 ? void 0 : _a.parentNode))
	                return;
	            this.menu.style.height = `${height}px`;
	            if (width) {
	                this.menu.style.width = `${width}px`;
	            }
	        };
	        this.focus = () => {
	            var _a;
	            if (!((_a = this.menu) === null || _a === void 0 ? void 0 : _a.parentNode))
	                return;
	            bridge.focusInlineMenu();
	            this.menu.focus();
	        };
	        this.createShadowRoot = () => {
	            if (this.shadowRoot || !document.body)
	                return;
	            this.shadowRoot = document.createElement("com-1password-menu").attachShadow({ mode: "closed" });
	        };
	        this.createMenu = () => {
	            if (!this.shadowRoot || this.menu)
	                return;
	            this.menu = document.createElement("iframe");
	            this.menu.id = "op-menu";
	            this.shadowRoot.appendChild(this.menu);
	        };
	        this.setMenuSrc = (configuration) => {
	            if (!this.menu)
	                return;
	            const { fieldDesignation, formDesignation, context, edited, locale } = configuration;
	            const { basePath, inlineMenuToken, locked } = store.getState();
	            if (typeof inlineMenuToken !== "string") {
	                throw new Error("No inline menu token exists.");
	            }
	            const src = new URL(`${basePath}/menu/menu.html`);
	            const params = new URLSearchParams({
	                token: inlineMenuToken,
	                displayHost: window.location.hostname,
	                field: fieldDesignation,
	                form: formDesignation,
	                edited: edited.toString(),
	                locked: locked.toString(),
	                locale,
	            });
	            if (context) {
	                params.append("context", context);
	            }
	            src.search = params.toString();
	            this.menu.src = src.toString();
	        };
	        this.positionMenu = ({ dir, x, y }) => {
	            if (!this.menu)
	                return;
	            this.menu.setAttribute("style", `
        all: initial;
        position: fixed;
        top: ${y}px;
        ${dir === "rtl" ? "right" : "left"}: ${x}px;
        z-index: 2147483647;
        min-width: 250px;
        max-width: 350px;
        min-height: 0px;
        height: 242px;
        max-height: 242px;
        visibility: hidden;
        border: none;
        border-radius: 6px;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15), 0 2px 24px rgba(0, 0, 0, 0.07);
        background: white;
        outline: 0;
      `);
	        };
	    }
	    addShadowHostToDOM() {
	        if (!this.shadowRoot || this.shadowRoot.host.parentElement)
	            return;
	        document.body.appendChild(this.shadowRoot.host);
	    }
	}

	// For now just returns the detected username on Google.
	// Could be generalized to return some other context that isn't evident in the field.
	function getFieldContext() {
	    if (window.location.host !== "accounts.google.com") {
	        return;
	    }
	    const field = collectFrame().fields.find(field => field.type === "email" && field.htmlName === "identifier" && field.htmlId === "hiddenEmail");
	    return field && field.value;
	}

	class InlineMenuManager {
	    constructor() {
	        this.attach = (edited = false) => {
	            const configuration = this.getInlineMenuConfiguration(edited);
	            configuration && this._attach(configuration);
	        };
	        this.detach = () => {
	            this._detach();
	        };
	        this.toggle = (formEdited, forceShow) => {
	            const { inlineMenuOpen, locked } = store.getState();
	            const showMenu = typeof forceShow === "undefined" ? !inlineMenuOpen : forceShow;
	            store.dispatch({
	                type: "set-autoshow-menu",
	                payload: showMenu,
	            });
	            if (showMenu) {
	                if (locked) {
	                    // Give client opportunity to handle unlock externally
	                    bridge.requestManagedUnlock().then(unlockManaged => {
	                        if (unlockManaged)
	                            return;
	                        // Duplicate attach call to prevent unneccessary promise when unlocked
	                        this.attach(formEdited);
	                    });
	                }
	                else {
	                    this.attach(formEdited);
	                }
	            }
	            else {
	                this.detach();
	            }
	        };
	        this.focus = () => {
	            this._focus();
	        };
	        this.filter = (value) => {
	            bridge.filterInlineMenu(value);
	        };
	        this.getInlineMenuConfiguration = (edited) => {
	            const position = this.getMenuPosition();
	            if (!position)
	                return undefined;
	            const { fieldDesignation = "", formDesignation = "" } = store.getState().activeFieldDesignation || {};
	            const { locale } = store.getState();
	            const context = getFieldContext();
	            return Object.assign(Object.assign({}, position), { fieldDesignation,
	                formDesignation,
	                edited,
	                context,
	                locale });
	        };
	        this.getMenuPosition = () => {
	            const { activeFieldRect } = store.getState();
	            if (!activeFieldRect)
	                return undefined;
	            const { top, left, right, height } = activeFieldRect;
	            const { activeFieldDir: dir } = store.getState();
	            return {
	                dir,
	                x: dir === "rtl" ? window.innerWidth - right : left,
	                y: top + height,
	            };
	        };
	        this.handleInlineMenuPosition = ({ configuration, matchableFrameWindowProps }) => {
	            const frames = document.getElementsByTagName("iframe");
	            if (frames.length === 0)
	                return;
	            const mostEqualFrame = this.findMostEqualFrame([...frames], matchableFrameWindowProps);
	            if (mostEqualFrame.confidence === 0)
	                return;
	            const { top, left, right } = mostEqualFrame.frame.getBoundingClientRect();
	            this._attach(Object.assign(Object.assign({}, configuration), { x: configuration.x + (configuration.dir === "rtl" ? matchableFrameWindowProps.width - right : left), y: configuration.y + top }));
	        };
	        this.findMostEqualFrame = (frames, matchableFrameWindowProps) => {
	            const scoredFrames = frames.reduce((scoredFrames, frame) => {
	                const { width, height, src, name } = matchableFrameWindowProps;
	                const hasEqualSize = frame.clientWidth === width && frame.clientHeight === height;
	                const hasEqualSrc = frame.src && src && frame.src === src;
	                const hasEqualName = frame.name && name && frame.name === name;
	                let confidenceInMatchingFrame = 0;
	                if (hasEqualSize && hasEqualSrc && hasEqualName) {
	                    confidenceInMatchingFrame = 3;
	                }
	                else if ((hasEqualSize && (hasEqualSrc || hasEqualName)) || (hasEqualSrc && hasEqualName)) {
	                    confidenceInMatchingFrame = 2;
	                }
	                else if (hasEqualSize) {
	                    confidenceInMatchingFrame = 1;
	                }
	                scoredFrames.push({ frame, confidence: confidenceInMatchingFrame });
	                return scoredFrames;
	            }, []);
	            return scoredFrames.sort((a, b) => b.confidence - a.confidence)[0];
	        };
	        bridge.onForwardInlineMenuPosition(this.handleInlineMenuPosition);
	    }
	}

	class TopInlineMenuManager extends InlineMenuManager {
	    constructor() {
	        super();
	        this._focus = () => {
	            if (store.getState().locked)
	                return;
	            setTimeout(() => {
	                this.inlineMenuFrame.focus();
	            }, 1);
	        };
	        this._attach = (configuration) => {
	            this.inlineMenuFrame.draw(configuration);
	        };
	        this._detach = () => {
	            this.inlineMenuFrame.erase();
	        };
	        this.inlineMenuFrame = new InlineMenuFrame();
	        store.dispatch({
	            type: "set-inline-menu-token",
	            payload: window.crypto.getRandomValues(new Uint32Array(1))[0].toString(36),
	        });
	        // Listeners from the inline menu
	        bridge.onRequestVerificationToken(() => {
	            bridge.sendVerificationToken(store.getState().inlineMenuToken);
	        });
	        bridge.onResizeInlineMenu(({ height, width }) => {
	            this.inlineMenuFrame.resize(height, width);
	        });
	        bridge.onInlineMenuReady(() => {
	            this.inlineMenuFrame.show();
	        });
	        // Listeners from nested frames
	        bridge.onRemoveInlineMenu(disableAutoshow => {
	            this._detach();
	            if (disableAutoshow) {
	                store.dispatch({
	                    type: "set-autoshow-menu",
	                    payload: false,
	                });
	            }
	        });
	        bridge.onFocusInlineMenuFrame(this._focus);
	        // Safest to check for locked here instead of the various callers
	        onChange("locked", locked => {
	            if (locked)
	                this._detach();
	        });
	        onChange("inlineDisabled", isDisabled => {
	            isDisabled && this._detach();
	        });
	    }
	}

	class TopFrameManager extends FrameManager {
	    constructor() {
	        super();
	        this._detachInlineMenu = () => {
	            this.inlineMenuManager.detach();
	        };
	        this._handleKeyDown = (key, formEdited) => {
	            switch (key) {
	                case "ArrowUp":
	                case "Escape":
	                    this.inlineMenuManager.toggle(formEdited, false);
	            }
	        };
	        this._onActiveInputFocus = () => {
	            this._addScrollAndResizeEventListeners();
	        };
	        this.inlineMenuManager = new TopInlineMenuManager();
	        this.saveDialogManager = new SaveDialogManager();
	        const T = createLocale(store.getState().locale);
	        bridge.onRequestFillAuthorization(() => {
	            const { host, href } = window.location;
	            return {
	                url: href,
	                authorized: window.confirm(T.lookup("authorize-fill", { host })),
	            };
	        });
	        // Listeners from other frames
	        bridge.onKeyDown(({ key, formEdited }) => this._handleKeyDown(key, formEdited));
	    }
	}

	class NestedInlineMenuManager extends InlineMenuManager {
	    constructor() {
	        super(...arguments);
	        this._attach = (configuration) => {
	            bridge.forwardInlineMenuPosition(configuration, {
	                width: window.innerWidth,
	                height: window.innerHeight,
	                src: window.location.href,
	                name: window.name,
	            });
	        };
	        this._detach = () => {
	            bridge.removeInlineMenu();
	        };
	        this._focus = () => {
	            bridge.focusInlineMenuFrame();
	        };
	    }
	}

	class NestedFrameManager extends FrameManager {
	    constructor() {
	        super();
	        this._handleKeyDown = (key, formEdited) => {
	            switch (key) {
	                case "ArrowUp":
	                case "Escape":
	                    bridge.sendKeyDown(key, formEdited);
	            }
	        };
	        this._onActiveInputFocus = () => {
	            this._addScrollAndResizeEventListeners();
	            bridge.addScrollAndResizeEventListeners();
	        };
	        this.inlineMenuManager = new NestedInlineMenuManager();
	    }
	}

	if (window === window.top) {
	    new TopFrameManager();
	}
	else {
	    new NestedFrameManager();
	}

}());
//# sourceMappingURL=injected.js.map
