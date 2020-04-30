window.isVisible = function (element, cached) {
  let RTL = (document?.dir == 'rtl');
  let SAFARI = false;

  function getStyle(htmlElement, cached) {
    var style;
    if (cached == null) {
      cached = true;
    }
    if (cached && document.body.axt_stamp <= htmlElement.axt_styleStamp && (htmlElement.axt_style != null)) {
      style = htmlElement.axt_style;
    } else {
      style = htmlElement.axt_style = window.getComputedStyle(htmlElement);
      htmlElement.axt_styleStamp = document.body.axt_stamp;
    }
    style.px = function(name) {
      var _ref, _ref1, _ref2;
      return (_ref = +((_ref1 = this[name]) != null ? (_ref2 = _ref1.split(' ')[0]) != null ? _ref2.split('px')[0] : void 0 : void 0)) != null ? _ref : 0;
    };
    return style;
  };

  var visible, _isVisible;
  if (cached == null) {
    cached = true;
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
  if (window.axt_frameVisibility === false) {
    return false;
  }
  _isVisible = function(el, offsp, absolute, t, r, b, lft, w, h) {
    var SAFARI, box, element_type, height, horScroll, isOffsetParent, m, pBorderLeftWidth,
        pBorderRightWidth, pBorderTopWidth, pOffsetLeft, pOffsetTop, pOverflowX, pOverflowXScrolled,
        pOverflowY, pOverflowYScrolled, pPosition, parent, parent_style, pb, pl, pr, pt, result,
        sTransform, style, tag_name, transformOffsetX, transformOffsetY, vertScroll, width, _ref;
    element_type = el.type;
    if (typeof element_type === 'string') {
      element_type = element_type.toLowerCase();
    } else {
      element_type = '';
    }
    parent = el.parentNode;
    tag_name = el.tagName.toLowerCase();
    if ('input' === tag_name && 'hidden' === element_type) {
      return false;
    }
    style = getStyle(el);
    if (offsp === el) {
      offsp = el.offsetParent;
      absolute = (_ref = style['position']) === 'fixed' || _ref === 'absolute';
    }
    isOffsetParent = offsp === parent;
    if (1 === (1 & element.compareDocumentPosition(document))) {
      return false;
    }
    if ('none' === style['display']) {
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
      width = el.offsetWidth;
      height = el.offsetHeight;
      if (!width && !height && 'inline' === style['display']) {
        box = el.getBoundingClientRect();
        width = box.width;
        height = box.height;
      }
      t = el.offsetTop + style.px('border-top-width') + style.px('padding-top');
      lft = el.offsetLeft + style.px('border-left-width') + style.px('padding-left');
      r = el.offsetLeft + width - style.px('border-right-width') + style.px('padding-right');
      b = el.offsetTop + height - style.px('border-bottom-width') + style.px('padding-bottom');
      w = r - lft;
      h = b - t;
      if ('hidden' === style['visibility']) {
        return false;
      }
    }
    if (parent && !('HTML' === parent.nodeName || 9 === parent.nodeType)) {
      if (w <= 2 || h <= 2) {
        return false;
      }
      parent_style = getStyle(parent);
      pOffsetLeft = parent.offsetLeft;
      pOffsetTop = parent.offsetTop;
      pPosition = parent_style['position'];
      if (parent_style['clip'] === "rect(0px 0px 0px 0px)") {
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
        SAFARI = false;
        sTransform = style.transform;
        if (sTransform.startsWith('matrix')) {
          m = sTransform.match(/matrix\(\s*(-?[.\d]+)\s*,\s*(-?[.\d]+)\s*,\s*(-?[.\d]+)\s*,\s*(-?[.\d]+)\s*,\s*(-?[.\d]+)\s*,\s*(-?[.\d]+)\s*\)/);
          if ((m != null ? m[1] : void 0) === "1" && m[2] === "0" && m[3] === "0" && m[4] === "1") {
            transformOffsetX = +m[5];
            transformOffsetY = +m[6];
          }
        }
        if (el === document.body && typeof window.innerWidth === 'number') {
          pOverflowYScrolled = window.innerWidth > document.documentElement.clientWidth;
          pOverflowXScrolled = window.innerHeight > document.documentElement.clientHeight;
        } else {
          pOverflowY = parent_style['overflow-y'];
          pOverflowX = parent_style['overflow-x'];
          pOverflowXScrolled = pOverflowX === 'scroll' || pOverflowX === 'auto';
          pOverflowYScrolled = pOverflowY === 'scroll' || pOverflowY === 'auto';
        }
        if (pOverflowX !== 'visible') {
          pBorderLeftWidth = parent_style.px('border-left-width');
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
          w = r - lft;
        }
        if (pOverflowY !== 'visible') {
          pBorderTopWidth = parent_style.px('border-top-width');
          vertScroll = parent.scrollTop;
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
          return false;
        }
        if (pOverflowXScrolled || pOverflowYScrolled) {
          result = _isVisible(parent, parent);
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
      return result;
    }
    return !(r < 0 || b < 0);
  };
  visible = false;
  if (element != null) {
    if (cached && document.body.axt_stamp <= element.axt_vStamp && (element.axt_vCache != null)) {
      visible = element.axt_vCache;
    } else {
      visible = _isVisible(element, element);
      element.axt_vCache = visible;
      element.axt_vStamp = document.body.axt_stamp;
    }
  }
  return visible;
};



let BUTTON_SELECTORS = "button,input[type='button']," + //input[type='submit']," +
  "input[type='image']"; //",input[type='reset']";

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
  //"div[pb-role=submit]",
  //"div[class*=submit]",
  //"div[data-action=submit]",
  // -- spans --
  "span[onclick]",
  "span[id*=btn]:not([id*=text])",
  "span[id*=Btn]:not([id*=text])",
  "span[id*=button]:not([id*=text])",
  "span[id*=Button]:not([id*=text])",
  "span[id*=submit]:not([id*=text])",
  "span[id*=Submit]:not([id*=text])",
  "span[class*=btn]:not([class*=text])",
  "span[class*=Btn]:not([class*=text])",
  "span[class*=butt]:not([class*=text])",
  "span[class*=Butt]:not([class*=text])",
  "span[role*=butt]",
  //"span[pb-role=submit]",
  //"span[class*=submit]:not([class*=text])",
  //"span[data-action=submit]",
].map( (sel) => {
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

let ALL_BUTTON_SELECTORS = [ BUTTON_SELECTORS, ANCHOR_SELECTORS ].join(',');

/* * - any one world; = - entire string */
let tokens = {
  'loginButton': [
    '=log in', '=login', '=вхід', '=вход', '=登录', 'join / signin'
  ],

  'registerButton': [
    'sign up', //'sign up with email',
    'signup', '=sign in', 'signin', '=sign on', 'signon',
    '=register', '=реєстрація', '=регистрация', '=注册', // 'sign up for free'
    '=create a free account', '=create account', '=get started', '=open an account',
    'open account', 'join / sign in', 'join for free', 'try it free',
    '=try * free', '=try premium', 'join now for free'
  ],

  'accountButton': [
    'hamburger', 'nav button', 'menu button', '=account', '=my account', '=your account'
  ]
};

let buttons = Array.from(document.querySelectorAll(ALL_BUTTON_SELECTORS)).filter(
  (button) => isVisible(button) && !button.classList.contains('axt-element')
);


function equalsLabel(text, label) {
  let t =  text.toLowerCase().trim().replace(/[_\-\s]+/g, ' ');

  if (label.includes('*')) {
    if (label[0] === '=') {
      return RegExp(`^${label.substring(1).replace(/\*/g, '\\w+')}$`).test(text);
    } else {
      return RegExp(label.replace(/\*/g, '\\w+')).test(text);
    }
  } else if (label[0] === '=') {
    return t === label.substring(1);
  } else {
    return t.includes(label);
  }
}

let res = Object.keys(tokens).reduce( (acc, token) => {
  let btns  = buttons.filter((button) =>
    tokens[token].some((label) =>
      equalsLabel(button.innerText, label) ||
      Array.from(button.classList).some((c) => equalsLabel(c, label)))
  );
  if (btns.length > 0) {
    console.info(`${token}: ${btns}`);
    acc[token] = btns;
  }
  return acc;
}, {});

if ("loginButton" in res) {
  res["loginButton"].forEach( (btn) => btn.setAttribute('axt-button', 'login'));
}


let result = Array.from(Object.keys(res));
console.info("found buttons:", result);

return result;
