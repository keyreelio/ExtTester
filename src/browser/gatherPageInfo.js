try {
  //noinspection JSReferencingArgumentsOutsideOfFunction
  arguments;
} catch(e) {
  arguments = [
    "",
    -1,
    undefined,
    function (result) { console.info(`check[-1]: done with result:`, result); }
  ];
}

!function(args) {
  let optimalSelectModule =
        "if ('object'!=typeof window.module){ window.module={}};" +
        "if ('object'!=typeof window.exports){ window.exports={}};" + args[0];
  let frameId = args[1];
  let frameSelector = args[2];
  let done = args[args.length - 1];
  let t = `check[${frameId}]:`;
  let sel_fun = null;
  let initStartTime = performance.now();

  function tEnd(start) {
    return `${(performance.now() - start).toFixed(2)}ms`;
  }

  function getOptimalSelectFunction(win) {
    console.log(`${t} window exists:`, window != null);
    console.log(`${t} this == window:`, this === window);
    console.log(`${t} body exists:`, document.body != null);

   try {
     if (!('object' === typeof win.module &&
       'object' === typeof win.module.exports &&
       'function' === typeof win.module.exports.select
     )) {
       eval(optimalSelectModule);
     }
   } catch (e) {
     console.error("OptimalError Loading Error", e);
   }

    console.log(`${t} this.OptimalSelect:`, 'object' === win.OptimalSelect);
    console.log(`${t} this.exports.OptimalSelect:`,
      'object' === win.exports
        ? 'object' === win.exports.OptimalSelect
        : false
    );
    console.log(`${t} this.module.exports.select:`,
      ('object' === typeof win.module &&
        'object' === typeof win.module.exports)
        ? 'function' === typeof win.module.exports.getSingleSelector //select
        : false
    );

    let sel_fun = (
      'object' === typeof this.module &&
      'object' === typeof this.module.exports &&
      'function' === typeof this.module.exports.getSingleSelector //select
    ) ? this.module.exports.select : (
      'object' === typeof this.exports &&
      'object' === typeof this.exports.OptimalSelect &&
      'function' === typeof this.exports.OptimalSelect.getSingleSelector //select
    ) ? this.exports.OptimalSelect.select : (
      'object' === typeof this.OptimalSelect &&
      'function' === typeof this.OptimalSelect.getSingleSelector //select
    ) ? this.OptimalSelect.getSingleSelector /*select*/ : null;

    return sel_fun;
  }


  function select(element, reAddons) {
    try {
      let selectors = [];
      while (element != null) {
        let addons = reAddons ? reAddons + '|' : '';
        let re = `^(${addons}axt-|gigya-|type|data-|ng-|action|name|title|disabled|onsubmit|style|[{}\\[\\]()])`;
        let selector = sel_fun(element, {
          root:   element.getRootNode(),
          priority: ['id', 'class', 'href', 'src'],
          ignore: {
            attribute: (name) =>
                RegExp(re).test(name) || (element.getAttribute(name) || "").length > 56
          }
        });
        selectors.push(selector);
        element = element.getRootNode().host;
      }
      return selectors.reverse().join(" ::: ");
    } catch (e) {
      let _ref = e.stack;
      console.error(
        `${t} optimal_Select error on element:`, element, _ref != null ? _ref : e
      );
      return "#ERROR#";
    }
  }


  function getStyle(win, htmlElement, cached) {
    let style;
    if (cached == null) {
      cached = true;
    }
    if (
      cached && win.document.body.axt_stamp <= htmlElement.axt_styleStamp &&
      (htmlElement.axt_style != null)
    ) {
      style = htmlElement.axt_style;
    } else {
      style = htmlElement.axt_style = win.getComputedStyle(htmlElement);
      htmlElement.axt_styleStamp = win.document.body.axt_stamp;
    }
    style.px = function (name) {
      var _ref, _ref1, _ref2;
      return (_ref = +(
        (_ref1 = this[name]) != null ?
          (_ref2 = _ref1.split(' ')[0]) != null ?
            _ref2.split('px')[0] : void 0 :
          void 0
      )) != null ? _ref : 0;
    };
    return style;
  }


  function getZIndex(htmlElement) {
    let style, zIndex;
    if (htmlElement == null) {
      return 0;
    }
    style = getStyle(window, htmlElement);
    zIndex = +style.zIndex;
    if (isNaN(zIndex)) {
      zIndex = 0;
    }
    zIndex = Math.max(zIndex, getZIndex(htmlElement.parentElement));
    return zIndex;
  }


  function isVisible(win, element, cached) {
    //console.log ("isVisible START", element);

    let RTL    = (win.document?.dir === 'rtl');
    let visible, _isVisible;
    if (cached == null) {
      cached = false; //true;
    }

    /*
     * Checks if a DOM element is visible. Takes into
     * consideration its parents and overflow.
     *
     * @param (el)      the DOM element to check if is visible
     * @param (offsp)   OffsetParent (we use it to calculate correct offset)
     *                  this parameter should be equal el for the first call
     * @param (absolute) true if element or one of its successors has position
     *                   fixed or absolute
     *
     * These params are optional that are sent in recursively,
     * you typically won't use these:
     *
     * @param (t)       Top corner position number
     * @param (r)       Right corner position number
     * @param (b)       Bottom corner position number
     * @param (lft)     Left corner position number
     * @param (w)       Element width number
     * @param (h)       Element height number
     */
    if (win.axt_frameVisibility === false) {
      //console.log ("isVisible FINISH 1");
      return false;
    }
    _isVisible = function (el, offsp, absolute, t, r, b, lft, w, h) {
      var SAFARI, box, element_type, height, horScroll, isOffsetParent, m,
          pBorderLeftWidth, pBorderRightWidth, pBorderTopWidth, pOffsetLeft, pOffsetTop,
          pOverflowX, pOverflowXScrolled, pOverflowY, pOverflowYScrolled, pPosition,
          parent, parent_style, pb, pl, pr, pt, result, sTransform, style, tag_name,
          transformOffsetX, transformOffsetY, vertScroll, width, _ref;
      element_type = el.type;
      if (typeof element_type === 'string') {
        element_type = element_type.toLowerCase();
      } else {
        element_type = '';
      }
      parent   = el.parentNode;
      tag_name = el.tagName.toLowerCase();
      if ('input' === tag_name && 'hidden' === element_type) {
        //console.log ("isVisible FINISH 2");
        return false;
      }
      style = getStyle(win, el);
      if (offsp === el) {
        offsp    = el.offsetParent;
        absolute = (_ref = style['position']) === 'fixed' || _ref === 'absolute';
      }
      isOffsetParent = offsp === parent;
      if (1 === (1 & element.compareDocumentPosition(win.document))) {
        //console.log ("isVisible FINISH 3");
        return false;
      }
      if ('none' === style['display']) {
        //console.log ("isVisible FINISH 4");
        return false;
      }
      if (
        '0' === style['opacity'] && !(
          'button' === tag_name || (
            'input' === tag_name && (
              element_type === 'submit' ||
              element_type === 'image' ||
              element_type === 'button' ||
              element_type === 'radio' ||
              element_type === 'checkbox'
            )
          )
        )
      ) {
        //console.log ("isVisible FINISH 5");
        return false;
      }
      if (
        'undefined' === typeof t ||
        'undefined' === typeof r ||
        'undefined' === typeof b ||
        'undefined' === typeof lft ||
        'undefined' === typeof w ||
        'undefined' === typeof h
      ) {
        width  = el.offsetWidth;
        height = el.offsetHeight;
        if (!width && !height && 'inline' === style['display']) {
          box    = el.getBoundingClientRect();
          width  = box.width;
          height = box.height;
        }
        t   = el.offsetTop + style.px('border-top-width') + style.px('padding-top');
        lft = el.offsetLeft + style.px('border-left-width') + style.px('padding-left');
        r   = el.offsetLeft + width - style.px('border-right-width') + style.px('padding-right');
        b   = el.offsetTop + height - style.px('border-bottom-width') + style.px('padding-bottom');
        w   = r - lft;
        h   = b - t;
        if ('hidden' === style['visibility']) {
          //console.log ("isVisible FINISH 6");
          return false;
        }
      }
      if (parent && !('HTML' === parent.nodeName || 9 === parent.nodeType)) {
        if (w <= 2 || h <= 2) {
          //console.log ("isVisible FINISH 7");
          return false;
        }
        parent_style = getStyle(win, parent);
        pOffsetLeft  = parent.offsetLeft;
        pOffsetTop   = parent.offsetTop;
        pPosition    = parent_style['position'];
        if (parent_style['clip'] === "rect(0px 0px 0px 0px)") {
          //console.log ("isVisible FINISH 8");
          return false;
        }
        transformOffsetX = 0;
        transformOffsetY = 0;
        if (
          !absolute || (
            absolute && (
              pPosition === 'absolute' ||
              pPosition === 'fixed' ||
              pPosition === 'relative'
            )
          )
        ) {
          SAFARI     = false;
          sTransform = style.transform;
          if (sTransform.startsWith('matrix')) {
            m = sTransform.match(/matrix\(\s*(-?[.\d]+)\s*,\s*(-?[.\d]+)\s*,\s*(-?[.\d]+)\s*,\s*(-?[.\d]+)\s*,\s*(-?[.\d]+)\s*,\s*(-?[.\d]+)\s*\)/);
            if (
              (m != null ? m[1] : void 0) === "1" &&
              m[2] === "0" &&
              m[3] === "0" &&
              m[4] === "1"
            ) {
              transformOffsetX = +m[5];
              transformOffsetY = +m[6];
            }
          }
          if (el === win.document.body && typeof win.innerWidth === 'number') {
            pOverflowYScrolled = win.innerWidth > win.document.documentElement.clientWidth;
            pOverflowXScrolled = win.innerHeight > win.document.documentElement.clientHeight;
          } else {
            pOverflowY         = parent_style['overflow-y'];
            pOverflowX         = parent_style['overflow-x'];
            pOverflowXScrolled = pOverflowX === 'scroll' || pOverflowX === 'auto';
            pOverflowYScrolled = pOverflowY === 'scroll' || pOverflowY === 'auto';
          }
          if (pOverflowX !== 'visible') {
            pBorderLeftWidth  = parent_style.px('border-left-width');
            pBorderRightWidth = parent_style.px('border-right-width');
            if (RTL) {
              horScroll = -(parent.scrollWidth - parent.scrollLeft - parent.clientWidth);
            } else {
              horScroll = parent.scrollLeft;
            }
            if (isOffsetParent) {
              if (RTL && !SAFARI) {
                pr = parent.offsetWidth - pBorderRightWidth;
                pl = pr - parent.clientWidth;
              } else {
                pl = pBorderLeftWidth;
                pr = pl + parent.clientWidth;
              }
            } else {
              if (RTL && !SAFARI) {
                pr = pOffsetLeft + parent.offsetWidth - pBorderRightWidth;
                pl = pr - parent.clientWidth;
              } else {
                pl = pOffsetLeft + pBorderLeftWidth;
                pr = pl + parent.clientWidth;
              }
            }
            if (pOverflowXScrolled) {
              r = Math.max(r - horScroll + transformOffsetX, pl);
            } else {
              r = Math.min(r - horScroll + transformOffsetX, pr);
            }
            lft = Math.max(lft - horScroll + transformOffsetX, pl);
            w   = r - lft;
          }
          if (pOverflowY !== 'visible') {
            pBorderTopWidth = parent_style.px('border-top-width');
            vertScroll      = parent.scrollTop;
            if (isOffsetParent) {
              pt = pBorderTopWidth;
              pb = pt + parent.clientHeight;
            } else {
              pt = pOffsetTop + pBorderTopWidth;
              pb = pt + parent.clientHeight;
            }
            if (pOverflowYScrolled) {
              b = Math.max(b - vertScroll + transformOffsetY, pt);
            } else {
              b = Math.min(b - vertScroll + transformOffsetY, pb);
            }
            t = Math.max(t - vertScroll + transformOffsetY, pt);
            h = b - t;
          }
          if (h <= 1 || w <= 1) {
            //console.log ("isVisible FINISH 9");
            return false;
          }
          if (pOverflowXScrolled || pOverflowYScrolled) {
            result = _isVisible(parent, parent);
            //console.log ("isVisible FINISH 10");
            return result;
          }
        }
        if (isOffsetParent) {
          lft += pOffsetLeft + transformOffsetX;
          r += pOffsetLeft + transformOffsetX;
          t += pOffsetTop + transformOffsetY;
          b += pOffsetTop + transformOffsetY;
        }
        result = _isVisible(parent, offsp, absolute, t, r, b, lft, w, h);
        //console.log ("isVisible FINISH 11");
        return result;
      }
      //console.log ("isVisible FINISH 12");
      return !(r < 0 || b < 0);
    };

    visible = false;
    if (element != null) {
      if (
        cached && win.document.body.axt_stamp <= element.axt_vStamp &&
        (element.axt_vCache != null)
      ) {
        visible = element.axt_vCache;
      } else {
        visible            = _isVisible(element, element);
        element.axt_vCache = visible;
        element.axt_vStamp = win.document.body.axt_stamp;
      }
    }
    //console.log ("isVisible FINISH 13");
    return visible;
  }

  let CHECK_SELECTORS = "select:not(.axt-element),textarea," +
    "div[data-role=textarea],input:not([type=button]):not([type=submit])" +
    ":not([type=image]):not([type=hidden]):not(.axt-element)";

  let BUTTON_SELECTORS = "button:not([type=submit]),input[type=button]," + //input[type=submit]," +
    "input[type=image]"; //",input[type=reset]";

  let ANCHOR_SELECTORS = [
    "a",
    "a[href^='javascript:']",
    "a[id*=login][href='#']",
    "a[onclick]",
    "a[id*=btn]",
    "a[id*=Btn]",
    "a[id*=butt]",
    "a[id*=Butt]",
    "a[class*=butt]",
    "a[class*=Butt]",
    "a[class*=Btn]",
    "a[class*=btn]",
    "a[role=button]",
    //"a[pb-role=submit]",
    //"a[class*=submit]",
    //"a[data-action=submit]",
    // -- divs --
    "div[onclick]",
    "div[id*=btn]",
    "div[id*=Btn]",
    "div[id*=butt]",
    "div[id*=Butt]",
    "div[class*=btn]",
    "div[class*=Btn]",
    "div[class*=butt]", //:not([class*=buttons])",
    "div[class*=Butt]", //:not([class*=Buttons])",
    "div[role*=button]",
    "div[class^=Responsive]",
    "div[class^=responsive]",
    "div[class*=mode-switch]",
    //"div[pb-role=submit]",
    //"div[class*=submit]",
    //"div[data-action=submit]",
    // -- spans --
    "span[onclick]",
    "span[id*=btn]:not([id*=text])",
    "span[id*=Btn]:not([id*=text])",
    "span[id*=button]:not([id*=text])",
    "span[id*=Button]:not([id*=text])",
    //"span[id*=submit]:not([id*=text])",
    //"span[id*=Submit]:not([id*=text])",
    "span[class*=btn]:not([class*=text])",
    "span[class*=Btn]:not([class*=text])",
    "span[class*=butt]:not([class*=text])",
    "span[class*=Butt]:not([class*=text])",
    "span[role*=butt]:not([class*=text])",
    "li[role=link]",
    "li[role*=button]",
    "li[class=login]",
    "svg[data-type*=button]",
    "div[class*=Dropdown]",
    "div[class*=dropdown]",
    "section[class=auth-block]"
    //"span[pb-role=submit]",
    //"span[class*=submit]:not([class*=text])",
    //"span[data-action=submit]",
  ].map((sel) => {
    // -- instead of --
    return sel + ':not(' + [
      '[id*=group]',
      '[id*=Group]',
      '[id*=tooltip]',
      '[id*=Tooltip]',
      '[id*=inner]',
      '[id*=checkBox]',
      //'[class*=group]',
      //'[class*=Group]',
      '[class*=tooltip]',
      '[class*=Tooltip]',
      '[class*=inner]',
      '[class*=Inner]',
      '[class*=checkBox]',
      //'[class*=Dropdown]',
      //'[class*=dropdown]',
      '[role=tooltip]',
    ].join('):not(') + ')'
  }).join(',');

  //console.warn("======================================================================");
  //console.warn(`anchor_selectors = ${ANCHOR_SELECTORS}`);
  //console.warn("======================================================================");

  let ALL_BUTTON_SELECTORS = [BUTTON_SELECTORS, ANCHOR_SELECTORS].join(',');

  /** * - any one world
   *  ** - any characters (many words);
   * "= - entire string
   * ! - not. e.g. "use this words ! not this words ! and not this words ! etc"
   **/
  let tokens = {
    'login': [
      '=log in', '=login', '=login *', '=вхід', '=вход', '=увійти', '=ввойти', '=войти',
      '=ログイン', '=登录', '=*登录', '=signin', '=sign in', '=sign up in', '=авторизация',
      '=логін', 'connect ** burner account', 'есть аккаунт', 'possuo uma conta',
      'tengo ** cuenta', 'join / sign in', '=sign up or log in', '=sign in/up',
      '=account log in', '=continue with email', '=use your email', '=login/signup',
      '=login/register', 'log in/sign up', '快速登录', 'sign in to **', 'login / join',
      'sign in or register', '=account login', 'sign in or create account', '登录/注册',
      '로그인', 'log in to *', '=login to your account', 'log in register', '=get in',
      'sign in / register', '=login page', '=страница входа', 'user portal log in',
      '=already a member?sign in', '=use my email',
      'log in now', 'sign in my account', '=logowanie', '=zaloguj się', 'ienākt',
      '=login/sign up', 'sign in your account', '=login / register', '=log on',
      '=sign in / sign up', '=kirjaudu', '=register / sign in', 'returning?',
      '=sign in with your username', '=sign in with your email', '=log into **',
      '=sign in with * ! facebook ! google', '=log in with * ! google ! facebook',
      'login/register', 'belépés' /* HU */,
      '=账密登录' /* alipay.com */,
      '=* * login ! nom ! username' /* "Payment Plan Login" (hugedomains.com) */,
      '=log in with ** id' /* "Log in with Saga Club ID" (icelandair.com) */,
      '=login to *' /* "Login to JewishGen" (jewishgen.org) */,
      '=sign in/register', '=login here', '=* login', '=log in or sign up',
      '=log in / sign up', '=sign in / create account', '=sign in / registger',
      'zaloguj się' /* PL */,
      '=sign in treats & account' /* petsmart.com */,
      '=login to royal orchid frequent flyer link' /* thaiairways.com */,
      '=entrar com seu email' /* portuguese */,
      '=sign in see your profile' /* aircanada.com */,
      'select this button to login' /* gmu.joinhandshake.com */,
      '=log in opens flyout' /* southwest.com */
    ],

    'registration': [
      '=sign up', '=sign up * *', '=signup', '=sign on', 'signon', '=sign up in',
      '=register', '=реєстрація', '=регистрация', '=зареєструватися', '=зарегистрироваться',
      '=注册', '=create a free account', '=create account', '=get started', '=registration',
      '=open an account', '=open account', '=join for free', '=try it free', '=join',
      '=try * free', '=try premium', '=join now for free', '=регистрация',
      '=создать аккаунт', '=registrar se', '=kayit ol', '=registrarse', '=crear cuenta',
      '=sign up & pricing', '=sign up now', '=rejestracja', '=załóż konto', 'rekisteröidy',
      '=make new account', '=open new account', "=sign up it's free", "=sign up free",
      '=regisztráció', '=create an account', '=enroll', '立即注册', '=create a profile',
      '=sign up here'
    ],

    'account': [
      'hamburger', 'nav button', 'menu button', '=account', '=my account', '=my account **',
      '=your account', "=мой профиль", '=profile', 'login account', '=личный кабинет',
      'hesabim', '=menu', 'open my account menu', 'manage account',
      '=conta uol' /* portuguese */,
      '=frequent flyer' /* icelandair.com */,
      '=my area' /* luisaviaroma.com */,
      '=open menu' /* missguided.co.uk */,
      '=особистий кабінет' /* lenovo.com/ua/uk */
    ]
  };


  function sleep(m) {
    return new Promise(r => setTimeout(r, m))
  }


  function checkPage(message) {
    function search(win, msg) {
      const founded = win.document.evaluate(
        `//*[name(.) != 'script' and name(.) != 'style' and contains(., "${msg}")]`,
        win.document.body,
        null,
        XPathResult.ANY_TYPE,
        null
      )
      let elem      = founded.iterateNext();
      let elements  = Array()
      while (elem) {
        if (
          Array.from(elem.childNodes)
          .some((e) =>
            e.nodeType === Node.TEXT_NODE &&
            e.data.toString().includes(msg) &&
            isVisible(win, elem)
          )
        ) {
          elements.push(elem);
        }
        elem = founded.iterateNext();
      }
      return (elements.length > 0);
    }

    let found = false;
    try {
      found = search(window, message);
      if (!found && window.frames.length === 1) {
        found = search(window.frames[0], message);
      }
    } catch (e) {
    }
    return found
  }


  function checkLabel(text, label) {
    const l = label.trim()
    if (l.length === 0) return false

    const t = text
    ?.toLowerCase()
    ?.replace(/[_.!:+›\-\n\s]+/g, ' ')
    ?.trim();

    if (l.includes('*')) {
      if (l[0] === '=') {
        return RegExp(`^${
          l.substring(1)
          .replace(/\*\*/g, '.+')
          .replace(/\*/g, '[^ \\t]+')
        }$`).test(t);
      } else {
        return RegExp(
          l.replace(/\*\*/g, '.+')
          .replace(/\*/g, '[^ \\t]+')
        ).test(t);
      }
    } else if (l[0] === '=') {
      return (t === l.substring(1));
    } else {
      return !!t?.includes(l);
    }
  }

  function equalsLabel(text, label) {
    const s            = label.split('!');
    const label_plus   = s[0].trim();
    const labels_minus = s.slice(1);

    return (
      checkLabel(text, label_plus) &&
      !labels_minus.some((l) => checkLabel(text, l.trim()))
    );
  }

  /**
   * Scan "Sign In"/"Menu" buttons in the body structure
   *
   * @returns << Promise<{[tag: string]: Array<{frame: string, selector: string, zIndex: number}]> >>
   */
  async function scanButtons() {
    console.info(`${t} START BUTTON SCANNING...`);
    //console.debug(`${t} ALL_BUTTONS_SELECTORS =`, ALL_BUTTON_SELECTORS);
    const b = document.body.querySelectorAll(ALL_BUTTON_SELECTORS);

    console.info(`${t} get buttons elements....`, b);
    const qbuttons = Array.from(b)

    console.info(`${t} filter buttons elements....`, qbuttons);
    const buttons = qbuttons.filter(
      (button) => {
        let v = isVisible(window, button);
        let e = !button.classList.contains('axt-element');
        return v && e;
      }
    );
    console.log(`${t} selected buttons:`, buttons);

    const res = Object.keys(tokens).reduce((acc, token) => {
      const btns = buttons.filter((button) => {
        //console.log(`${t} button: id = '${button.id}' class = '${button.class}' title =
        // '${button.title}'`); console.log(`button.aria-label =
        // ${button.getAttribute('aria-label')}`);

        return tokens[token].some((label) => {
          //console.log(`${t} button=`, button, "label=", label, "button.textContent=",
          // button.textContent);
          return (
            button.textContent == null ||
            button.textContent.trim().length < 45
          ) && (
            equalsLabel(button.title, label) ||
            equalsLabel(button.getAttribute("aria-label"), label) ||
            equalsLabel(button.textContent, label) ||
            equalsLabel(button.innerText, label) ||
            equalsLabel(button.id, label) ||
            Array.from(button.classList).some((c) => equalsLabel(c, label)) ||
            Array.from(button.children)
            .filter((c) => c.tagName.toUpperCase() === 'IMG')
            .some((c) => equalsLabel(c.alt, label))
          )
        })
      });

      if (btns.length > 0) {
        btns.forEach((btn) => {
          console.info(`${t} ${token}: ${select(btn, 'class')}`, btn);
        })
        acc[token] = btns;
      }
      return acc;
    }, {});

    /** custom raters:
     * @param tag - button tag: login, account or registration
     * @param selector - CSS selector of element to mark with the given tag.
     *   if element is a custom element, then 'has' is a CSS selector to find the inner
     *   element in this custom element
     * @param has - another CSS selector of an element inside a given element or
     *              a content text, if 'has' parameter starts with "text:"
     *              e.g. "text:Login". Text will be lower cased and trimmed before use
     */
    // TODO: selector mоже повертати більше одного елементу. це потрібно враховувати(!)
    function addCustomButton(tag, selector, has) {
      let butt= null;
      if (has != null) {
        let hasSelector = "";
        let hasText = "";

        if (has.startsWith('text:')) {
          hasText = has.substr(has.indexOf(':') + 1).toLowerCase().trim();
        } else {
          hasSelector = has;
        }

        function _add_button(root, selectors) {
          let button = null;

          //console.log(`${t} selectors =`, selectors.join(','));
          if (selectors.length > 1) {
            let customElementSelector = selectors.shift();
            let customElement = root.querySelector(customElementSelector);
            //console.log(`${t} customElement:`, customElement);
            if (
              customElement != null &&
              customElements.get(customElement.tagName.toLowerCase()) != null
            ) {
              let newRoot = customElement.shadowRoot;
              return _add_button(newRoot, selectors);
            }
            console.warn(`${t} customElement not found`);
            return null;
          }

          let sel = selectors[0];
          //console.log(`${t} sel =`, sel, "root=", root);
          for (let i of Array.from(root.querySelectorAll(sel))) {
            //console.log(`${t} element tagName=`, i.tagName);
            if (customElements.get(i.tagName.toLowerCase())) {
              if (hasSelector) {
                //console.log(`${t} hasSelector=`, hasSelector);
                button = i.shadowRoot.querySelector(hasSelector)
                //console.log(`${t} butt=`, button);
              } else {
                //NOTE: 'text:' prefix is not allowed for custom elements
                console.warn(`${t} addCustomButton('${tag}', '${sel}', '${has}') warning:`);
                console.warn(`${t} The 'text:' prefix is not allowed for custom elements`);
                break;
              }
            } else {
              if (hasSelector) {
                button = i.querySelector(hasSelector);
              } else if (i.textContent.toLowerCase().trim() === hasText) {
                button = i
              }
            }
            if (button != null) break;
          }
          return button;
        }

        butt = _add_button(document, selector.split(':::'))
        //console.log(`${t} (2) butt:`, butt);
      } else {
        // return only the first element for the given selector
        butt = document.querySelector(selector);
      }

      if (isVisible(window, butt)) {
        console.debug(`${t} Manually add button:`, butt);
        if (res[tag] == null) {
          res[tag] = [];
        }
        res[tag].push(butt);
      }
    }

    switch (document.location.host) {
      case "www.hgtv.com":
      case "www.foodnetwork.com":
        addCustomButton("account", "svg[data-type=button-header-nav]");
        break;

      case "www.bhphotovideo.com":
        addCustomButton("account", "div[class*=login-account]");
        break;

      case "gizmodo.com" :
        addCustomButton("account", "a[class*=header-userbutton]");
        break;

      case "www.bet365.com":
        addCustomButton("login", "div[class*=LoginContainer]");
        addCustomButton("registration", "div[class*=JoinContainer]");
        break;

      case "www.airasia.com":
        addCustomButton("login", "div[class~=login]");
        break;

      case "amfam.com":
        addCustomButton("login", "li[data-selected-on=MyAccount]");
        break;

      case "www.apple.com":
        addCustomButton("account", "a[aria-label='Shopping Bag']");
        break;

      case "www.cbsnews.com":
        addCustomButton("account", "li[class*='site-nav__item--more']");
        break;

      case "www.cctv.com":
        addCustomButton("account", "div[class*='navli icon user_icon']");
        break;

      case "cellufun.com":
        addCustomButton("login", "a", "img[alt=Login]");
        addCustomButton("registration", "a", "img[alt=Join]");
        break;

      case "www.christcenteredgamer.com":
        addCustomButton("login", 'div[id*=loginreg] div[id*=login]');
        break;

      case "www.fandom.com":
        addCustomButton("account",
          "div[class*=account-menu][class~=wds-dropdown]");
        break;

      case "www.uol.com.br":
        addCustomButton("account", "div.widget-username");
        break;

      case "www.forever21.com":
        addCustomButton("account", "span.top_new_account.show_desktop");
        break;

      case "www.gematsu.com":
        addCustomButton("account", "i.fa-user");
        break

      case "www.globo.com":
        addCustomButton("account", "div#user-bar");
        break

      case "www.healthline.com":
        addCustomButton("account", "button[data-auto=header-menu]");
        break

      case "hyvesgames.nl":
        addCustomButton("account", "i.fa-sign-in-alt");
        break

      case "www.travelo.hu":
        addCustomButton("account", "a.hmenu");
        break

      case "kotaku.com":
        addCustomButton("account", "a[class*=userbutton]");
        addCustomButton("login", "a[role=button][class*=burner-login]");
        break

      case "www.macworld.com":
      case "www.pcworld.com":
        addCustomButton("account", "a[href*=subscriber_login]");
        break

      case "www.missselfridge.com":
        addCustomButton("account", "a[href*=login][class*=Account]");
        break

      case "mixi.jp":
        addCustomButton("account", "a[href='#mainNav']");
        break

      case "nichegamer.com":
        addCustomButton("account", "a[href*=wp-login]");
        break

      case "www.okezone.com":
        addCustomButton("account", "a", "img[alt*=profil]");
        break

      case "www.qatarairways.com":
        addCustomButton("login", "div#login-container");
        break

      case "www.samsung.com":
        addCustomButton("account", "a.user[role=presentation]");
        break

      case "www.sas.com":
        addCustomButton("login", "li.profile-login");
        break

      case "www.softpedia.com":
        addCustomButton("account", "li.fa-user");
        break

      case "www.splunk.com":
        addCustomButton("account", "a", "span.icon-expanded-user-icon");
        break

      case "www.statista.com":
        addCustomButton("login", "input[type=submit][value=Login]");
        break

      case "www.theiconic.com.au":
        addCustomButton(
          "account",
          "a[data-ga-label='Member Menu icon']",
          "svg.inline-icon--profile-1"
        );
        break

      case "www.theonion.com":
        addCustomButton("account", "a[class*=userbutton]", "svg");
        break

      case "www.youporn.com":
        addCustomButton("account", "div.user-menu");
        break

      case "www.allrecipes.com":
        addCustomButton("login", "a", "div.img-profile");
        break

      case "edition.cnn.com":
        addCustomButton("account", "div#account-icon-button");
        break

      case "www.busuu.com":
        addCustomButton("account", "div#js-responsive-nav");
        break

      case "www.carfax.eu":
        addCustomButton("account", "button.navbar-toggle");
        break

      case "www.cosstores.com":
        addCustomButton("account", "button.a-icon-menu");
        break

      case "www.lowes.com":
        addCustomButton("account", 'a.js-account[title=MyLowes]', 'svg');
        break

      case "www.kbb.com":
        addCustomButton("account", 'div', 'input#mykbbToggle');
        break

      case "chaturbate.com":
        addCustomButton("account", '#close_entrance_terms');
        break

      case "www.ea.com":
        addCustomButton("account", 'ea-network-nav',
          '#content > header > ul > li:nth-child(1)');
        break

      case "nest.com":
        addCustomButton(
          "account",
          'nl-header:::header-desktop:::nl-global-header-utility-navigation',
          'button');
        break

      case "www.nintendo.com":
        addCustomButton("login", 'button.alps-login-door-button');
        break

      case "www.adobe.com":
        addCustomButton("login",
          'a[class*=modal_button]',
          'text:Continue to United States'
        );
        break

      case "www.checkout.com":
        addCustomButton("login", 'h6#logInTab');
        addCustomButton("login", 'button', 'text:Accept cookies');
        break

      case "en.bongacams.com":
        addCustomButton("login", 'a[class*=btn]', 'text:Continue');
        break;

      case "www.airbnb.com":
        addCustomButton("account", 'button', '[aria-label="Main navigation menu"]');
        break;

      case "aliexpress.ru":
        addCustomButton("account", 'a.close-layer');
        break;

      case "auth.alipay.com":
        addCustomButton("login", '[data-status=show_login]');
        break;

      case "aws.amazon.com":
        addCustomButton(
          "login",
          'div[data-id=popover-my-account] > ul > li:nth-child(1) > a',
          'text:AWS Management Console'
        );
        break;

      case "all.accor.com":
        addCustomButton(
          "account", // select us language on the first ste page
          'a[value="en_united-states-of-america"]'
        );
        break;

      case "www.aircanada.com":
        addCustomButton(
          "account", // select us-canada language in the popup-window
          '#enCAEdition'
        );
        break;

      //case "" : TODO: заповнити sitename!!!!!
      //  addCustomButton(
      //    "account", // to close "Privacy Settings" popup window
      //    'button[id$=selectAllCheckboxes]'
      //  );
      //  break;

      case "www.bestbuy.com":
         addCustomButton(
           "account", // to close "We'd like your feedback" popup window
           'button#survey_invite_no'
         );
         break;

      case "www.blackboard.com":
        addCustomButton(
          "account", // to close "Welcome to Blackboard" popup window
          "#modal-closer-change-region"
        );
        break;

      case "accounts.google.com":
        addCustomButton(
          "login", // select another account
          "div", "use another account"
        );
        break;

      case "www.bhphotovideo.com":
        addCustomButton("login", "[data-selenium=userLogin]");
        break;
      case "code.org":
        addCustomButton("account", "#selectLanguage button.btn-primary");
        break;
      case "www.airfrance.co.uk":
        addCustomButton("account", "button", "text:Agree");
        break;

    }

    if (Object.keys(res).length === 0) {
      await sleep(1000);

      const inputs = Array.from(document.getElementsByTagName('input'))
      .filter((e) =>
        ['hidden', 'submit', 'checkbox', 'radio'].indexOf(e.type) < 0
      )

      if (inputs.length === 0) {
        if (
          checkPage('Your connection is not private') ||
          checkPage('ERR_CERT_DATE_INVALID')
        ) {
          res['suspiciousSiteError'] = [];
        }

        if (
          checkPage("This site can’t be reached") ||
          checkPage("This page isn't working") ||
          checkPage('ERR_EMPTY_RESPONSE')
        ) {
          res['siteNotFoundError'] = [];
        }

        if (checkPage('is temporarily unavailable')) {
          res['temporarilyUnavailableError'] = [];
        }

        if (
          checkPage('Application Blocked') ||
          checkPage('403 Forbidden') ||
          checkPage('403 ERROR') ||
          checkPage('Access Denied') ||
          checkPage('Access denied') ||
          checkPage('Error 1009') ||
          checkPage('Sorry for the Detour') ||
          checkPage('requested URL was rejected') ||
          checkPage("You've been blocked") ||
          checkPage('is not available in your country') || // grubhub.com
          checkPage('is not available to customers') || // cvs.com
          checkPage('request looks similar to automated requests') || // anthem.com
          checkPage('is currently not available in your country') || // officedepot.com, spotify.com
          checkPage('We Are Currently Unable to Provide a Shopping Experience for This Country') || // jcpenney.com
          checkPage('Your access to this site has been limited') || // marcos.com
          checkPage('is not available for you') || // officedepot.com
          checkPage('we are unable to process international online transactions') || // pch.com
          checkPage('is not available outside of the United States') || // goodrx.com
          document.querySelector('div.blockedCountrySplash') != null // hannaandersson.com
        ) {
          res['accessDeniedError'] = [];
        }

        if (checkPage("Error 522")) {
          res['timeoutError'] = [];
        }

        if (
          checkPage("I am human") ||
          checkPage("I'm not a robot") ||
          //checkPage("CAPTCHA") ||
          checkPage("verify you are a human") ||
          document.querySelector('#recaptcha-reload-button,' +
            '#recaptcha-audio-button,#recaptcha-image-button,' +
            '#recaptcha-help-button'
          )
        ) {
          res['captchaError'] = [];
        }

        if (checkPage('Gateway Timeout')) {
          res['gatewayTimeoutError'] = [];
        }

        if (checkPage('Error 902')) {
          res['unknownError'] = [];
        }
      }
    }

    let buttonsTags = Object.keys(res);
    let r = {};
    if (buttonsTags.length === 1 && buttonsTags[0].endsWith('Error')) {
      r[buttonsTags[0]] = {};
    } else {
      console.log(`${t} found buttons:`, res);
      let unique = [];
      ['login', 'account', 'registration'].forEach((tag) => {
        r[tag] = [];
        (res[tag] || []).forEach((b) => {
          if (unique.every((u) => !(b.contains(u) || u.contains(b)))) {
            r[tag].push({
              frame:    frameSelector,
              selector: select(b),
              zIndex:   getZIndex(b)
            });
            unique.push(b);
          }
        });
        if (r[tag].length === 0) {
          delete r[tag];
        }
      })
      console.log(`${t} after cleaning:`, r);
    }
    console.info(`${t} BUTTON SCANNING FINISHED: found buttons:`,
      Object.keys(r).join(','));

    return r;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function stopObserver(observer) {
    if (observer != null) {
      observer.disconnect();
      observer = null;
    }
  }

  /**
   * startAddNodesObserver() - return promise when [cssSelectors] nodes are found
   * during [timeout], reject promise when time is out
   *
   * @param cssSelectors
   * @param timeout
   * @return Promise - resolved when cssSelectors where found or rejected when timeout is
   *                   occurred
   */
  function startAddNodesObserver(cssSelectors, timeout) {
    return new Promise((resolve, reject) => {
      let finished = false;
      let timerId  = null;

      let observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
          if ('childList' === mutation.type) {
            for (let node of mutation.addedNodes) {
              if (
                node.nodeType === 1 && (
                  node.matches(cssSelectors) ||
                  node.querySelector(cssSelectors)
                )
              ) {
                //console.log(`${t} addNode`, node);
                clearTimeout(timerId);
                timerId = null;
                stopObserver(observer);

                if (!finished) {
                  finished = true;
                  resolve();
                }
                break;
              }
            }
          }
        }
      })

      setTimeout(() => {
        if (document.querySelector(cssSelectors) != null) {
          console.info(`${t} expected nodes already present in the layout`);
          if (!finished) {
            finished = true;
            resolve();
          }
        } else {
          // wait for input elements in the page
          if (observer != null) {
            observer.observe(document, {childList: true, subtree: true});
          }

          timerId = setTimeout(() => {
            console.info(`${t} timeout: expected nodes were not found`);
            stopObserver(observer);
            if (!finished) {
              finished = true;
              reject();
            }
          }, timeout);
        }
      }, 0)
    })
  }

  /**
   * startAttribObserver() - return promise when on [node] attribute with [attributeName]
   * is changed during [timeout], reject promise when time is out
   *
   * @param node
   * @param attributeName
   * @param timeout
   * @return Promise - resolved when attribute [attributeName] was changed or rejected when
   *                   when timeout is occurred
   */
  function startAttribObserver(node, attributeName, timeout) {
    return new Promise((resolve, reject) => {
      let finished = false;
      let timerId  = null;

      let observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
          if ('attributes' === mutation.type) {
            let node = mutation.target;
            let attrName = mutation.attributeName
            //let oldValue = mutation.oldValue
            //let newValue = node.getAttribute(attrName)
            //console.log("OldValue=", oldValue, "NewValue=", newValue);
            //if (oldValue !== newValue) {
            //console.log("attrName=", attrName, "attributeNameNewValue=", newValue);
            if (attrName === attributeName) {
              console.log(
                `${t} expected attribute updated: node=`, node, "attrName=", attrName
              );

              clearTimeout(timerId);
              timerId = null;
              stopObserver(observer);

              if (!finished) {
                finished = true;
                resolve();
              }
              break;
            }
          }
        }
      })

      setTimeout(() => {
        if (node.getAttribute(attributeName) != null) {
          console.info(
            `${t} node already has expected attribute in the layout`
          );

          if (!finished) {
            finished = true;
            resolve();
          }
        } else {
          // wait for input elements in the page
          if (observer != null) {
            observer.observe(node, {
              attributes: true,
              attributeFilter: [attributeName],
              attributeOldValue: true
            });
          }

          timerId = setTimeout(() => {
            stopObserver(observer);
            if (!finished) {
              finished = true;
              if (node.getAttribute(attributeName) != null) {
                console.info(`${t} timeout: expected attribute was found`);
                resolve();
              } else {
                console.info(`${t} timeout: expected attribute was not found`);
                reject();
              }
            }
          }, timeout);
        }
      }, 0)
    })
  }


  /**
   * Scan page and gather form information
   *
   * @returns << Promise<{
   *               {[form_tag: string]: {
   *                 frame: string,                          // CSS selector
   *                 selector: string,                       // CSS selector
   *                 inputs: {[input_tag: string]: string},  // CSS selector
   *                 buttons: {[button_tag: string]: string} // CSS selector
   *               }}
   *             }>
   *          >>
   */
  async function parseForms() {
    let forms   = {};
    console.log(`${t} parse forms.....`);

    document.querySelectorAll(
      "[axt-form-type=login],[axt-form-type=registration]"
    ).forEach((form) => {
      let form_tag  = form.getAttribute('axt-form-type');
      let form_warn = form.getAttribute('axt-warn');
      let form_info = {
        frame:    frameSelector,
        selector: select(form),
        inputs:   {},
        buttons:  {},
        unsecured: form_warn !== undefined && (form_warn === "http" || form_warn === "diff-frame")
      }

      form.querySelectorAll("[axt-input-type]").forEach((input) => {
        let tag               = input.getAttribute('axt-input-type');
        form_info.inputs[tag] = select(input);
      })

      form.querySelectorAll("[axt-button-type]").forEach((button) => {
        let tag                = button.getAttribute('axt-button-type');
        form_info.buttons[tag] = select(button);
      })

      forms[form_tag] = form_info;
    })

    return forms;
  }

  function withError(error) {
    return {
      duration: -1,
      buttons:  {},
      forms:    {},
      frames:   [],
      errors:   error
    }
  }

  /** ====================================================================================
   * doCheck() - main algorithm of gathering page information:
   *
   * @returns {Promise<{duration: *, buttons: {}, forms: {}, frames: [], error: null}>}
   */
  async function doCheck() {
    let forms = {};
    let buttons = {}
    let frames  = [];
    let duration = -1;
    let error   = undefined;

    let buttonsScanStartTime = performance.now();
    buttons = await scanButtons();
    let buttonsTags = Object.keys(buttons);
    console.info(`buttons scanned in ${tEnd(buttonsScanStartTime)}`);

    if (1 === buttonsTags.length && buttonsTags[0].endsWith('Error')) {
      buttons = {};
      error   = buttonsTags[0];
    }

    if (error == null) {
      try {
        let checkInputsStartTime = performance.now();
        await startAddNodesObserver(CHECK_SELECTORS, 10000);
        console.info(`Inputs found in ${tEnd(checkInputsStartTime)}`);

        // inputs were found! wait finishing of form parsing:
        let waitAttribStartTime = performance.now();
        await startAttribObserver(document.body, 'axt-parser-timing', 2000);
        console.info(`body[axt-parser-timing] found in ${tEnd(waitAttribStartTime)}`);

        let startTime = performance.now();
        while (performance.now() - startTime < 9000) {
          forms = await parseForms();
          if (Object.keys(forms).length !== 0) break;
          await sleep(500);
        }
        console.info(`${Object.keys(forms).length} forms parsed in ${tEnd(startTime)}`);

        // rescan buttons:
        let buttonsScanStartTime = performance.now();
        buttons = await scanButtons();
        console.info(`Buttons rescanned in ${tEnd(buttonsScanStartTime)}`);

        // remove from the 'Sign up'/'Menu' button's list all forms' buttons which were
        // detected as 'Sign up'/'Menu' buttons
        function removeContainedButtons(tag) {
          if (buttons[tag] != null && forms[tag] != null) {
            let formBtnSelector = forms[tag].buttons[tag];
            if (formBtnSelector != null) {
              let formBtn  = document.querySelector(formBtnSelector);
              buttons[tag] = buttons[tag].filter((btn) => {
                if (btn.selector.includes(':::')) //(now) do not check btn in custom els
                  return true;
                let b = document.querySelector(btn.selector);
                return !(formBtn.contains(b) || b.contains(formBtn))
              })
            }
          }
        }
        removeContainedButtons('login');
        removeContainedButtons('registration');
      } catch (e) {
        // timeout or other error
        buttons = await scanButtons();
      }
    }

    if (
      Object.keys(buttons).length === 0 &&
      Object.keys(forms).length ===0 &&
      error == null &&
      document.body.childElementCount === 0
    ) {
      if (document.body.getAttribute('axt-stop-by-timeout') != null) {
        error = "timeoutError";
      } else {
        error = "blankPageError";
      }
    }

    // get visible iframes and create a list of their CSS selectors:
    document.querySelectorAll('iframe').forEach( (f) => {
      if (isVisible(window, f)) {
        console.warn("CHECK IFRAME:", f, select(f));
        // ignore _ads_ iframes:
        let id = f.getAttribute('id');
        if (id == null || !id.toLowerCase().includes('_ads')) {
          let isrc = f.getAttribute('src');
          let rect = f.getBoundingClientRect()
          let isCaptchaFrame = (isrc != null && isrc.includes('captcha'));
          if (!isCaptchaFrame || rect.height > 70) {
            frames.push({selector: select(f), isCaptcha: isCaptchaFrame});
          }
        }
      }
    })

    console.log(`${t} buttons=`, buttons);
    console.log(`${t} forms=`, forms);
    console.log(`${t} frames=`, frames);
    console.log(`${t} error=`, error);

    duration = document.body.getAttribute('axt-parser-timing') || -1;

    let result = {
      duration: duration,
      error:   error,
      forms:   forms,
      buttons: buttons,
      frames:  frames
    };

    console.info(`${t} Found buttons:`, Object.keys(buttons).join(','));
    console.info(`${t} Found forms:`, Object.keys(forms).join(','));
    console.info(`${t} Forms parsing duration: ${duration}`);

    return result;
  }

  let started = false;
  let contentLoadedHandler = () => {
    console.log(`${t} try to start...`);
    if (
      started ||
      document.body == null ||
      document.body.classList.contains('axt-element')
    ) return

    document.removeEventListener('DOMContentLoaded', contentLoadedHandler);
    document.removeEventListener("load", contentLoadedHandler);
    document.removeEventListener("readystatechange", contentLoadedHandler);
    started = true;
    console.info(`${t} START PAGE CHECKING...`);

    let onUnload = new Promise( (resolve, reject) => {
        document.addEventListener('beforeunload', () => {
          console.warn("Page is unloaded!");
          resolve(withError("pageError"));
        })
    });

    sel_fun = getOptimalSelectFunction(this);
    console.info("sel_fun = ", 'function' === typeof sel_fun);
    console.info(`Initialized in ${tEnd(initStartTime)}`);

    if (sel_fun != null) {
      let sTime = performance.now();
      Promise.race([onUnload, doCheck()]).then((result) => {
        console.warn(`${t} Result=`, result, `in ${tEnd(sTime)}`);
        done(result); done = null;
      }).catch((error) => {
        console.error(`${t} Error=`, error, `in ${tEnd(sTime)}`);
        done(withError(error.message));
        done = null;
      })
    } else {
      done(withError("optimalSelectNotLoadedError"));
      done = null;
    }
  };

  console.info(`${t} START SCRIPT...`);
  document.addEventListener('DOMContentLoaded', contentLoadedHandler);
  document.addEventListener("load", contentLoadedHandler);
  document.addEventListener("readystatechange", contentLoadedHandler);
  contentLoadedHandler();
  console.error("restart");
}(arguments);
