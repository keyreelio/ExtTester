function isVisible(element, cached) {
  //console.log ("isVisible START", element);

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
    //console.log ("isVisible FINISH 1");
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
      //console.log ("isVisible FINISH 2");
      return false;
    }
    style = getStyle(el);
    if (offsp === el) {
      offsp = el.offsetParent;
      absolute = (_ref = style['position']) === 'fixed' || _ref === 'absolute';
    }
    isOffsetParent = offsp === parent;
    if (1 === (1 & element.compareDocumentPosition(document))) {
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
        //console.log ("isVisible FINISH 6");
        return false;
      }
    }
    if (parent && !('HTML' === parent.nodeName || 9 === parent.nodeType)) {
      if (w <= 2 || h <= 2) {
        //console.log ("isVisible FINISH 7");
        return false;
      }
      parent_style = getStyle(parent);
      pOffsetLeft = parent.offsetLeft;
      pOffsetTop = parent.offsetTop;
      pPosition = parent_style['position'];
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
    if (cached && document.body.axt_stamp <= element.axt_vStamp && (element.axt_vCache != null)) {
      visible = element.axt_vCache;
    } else {
      visible = _isVisible(element, element);
      element.axt_vCache = visible;
      element.axt_vStamp = document.body.axt_stamp;
    }
  }
  //console.log ("isVisible FINISH 13");
  return visible;
}



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
  "div[class*=dropdown]"
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
    '=log in', '=login', '=login *', '=вхід', '=вход', '=увійти', '=ввойти', '=войти',
    '=ログイン', '=登录', '=*登录', 'signin', '=sign in', '=sign up in', '=авторизация',
    '=логін', 'connect ** burner account', 'есть аккаунт', 'possuo uma conta',
    'tengo ** cuenta', 'join / sign in', '=sign up or log in', '=sign in/up',
    '=login/register', 'log in/sign up', '快速登录', 'sign in to **', 'login / join',
    'sign in or register', '=account login', 'sign in or create account', '登录/注册',
    '로그인', 'log in to *', '=login to your account', 'log in register', '=get in',
    'sign in / register', '=login page', '=страница входа', 'user portal log in',
    'log in now', 'sign in my account', '=logowanie', '=zaloguj się', 'ienākt',
    '=login/sign up', 'sign in your account', '=login / register', '=log on',
    '=sign in / sign up', '=kirjaudu', '=register / sign in', 'returning?',
    '=sign in with *', 'login/register', 'belépés' /* HU */,
    '=* * login' /* "Payment Plan Login" (hugedomains.com) */,
    '=log in with ** id' /* "Log in with Saga Club ID" (icelandair.com) */,
    '=login to *' /* "Login to JewishGen" (jewishgen.org) */,
    '=sign in/register', '=login here', '=* login', '=log in or sign up',
    '=log in / sign up', '=sign in / create account', '=sign in / registger',
    'zaloguj się' /* PL */,
    '=sign in treats & account' /* petsmart.com */,
    '=login to royal orchid frequent flyer link' /* thaiairways.com */,
    '=entrar com seu email' /* portuguese */,
    '=sign in see your profile' /* aircanada.com */
  ],

  'registerButton': [
    '=sign up', '=sign up * *', '=signup', '=sign on', 'signon', '=sign up in',
    '=register', '=реєстрація', '=регистрация', '=зареєструватися', '=зарегистрироваться',
    '=注册', '=create a free account', '=create account', '=get started', '=registration',
    '=open an account', '=open account', '=join for free', '=try it free', 'join',
    '=try * free', '=try premium', '=join now for free', '=регистрация',
    '=создать аккаунт', '=registrar se', '=kayit ol', '=registrarse', '=crear cuenta',
    '=sign up & pricing', '=sign up now', '=rejestracja', '=załóż konto', 'rekisteröidy',
    '=make new account', '=open new account', "=sign up it's free", "=sign up free",
    '=regisztráció', '=create an account', '=enroll', '立即注册', '=create a profile'
  ],

  'accountButton': [
    'hamburger', 'nav button', 'menu button', '=account', '=my account', '=my account **',
    '=your account', "=мой профиль", '=profile', 'login account', '=личный кабинет',
    'hesabim', 'conta uol', '=menu', 'open my account menu', 'manage account',
    '=conta uol' /* portuguese */,
    '=frequent flyer' /* icelandair.com */,
    '=my area' /* luisaviaroma.com */,
    '=open menu' /* missguided.co.uk */
  ]
};


function sleep(m) {
  return new Promise(r => setTimeout(r, m))
}


function checkPage(message) {
  return !!document.evaluate(
    `//*[name(.) != 'script' and contains(., "${message}")]`,
    document.body,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue
}


function equalsLabel(text, label) {
  let t =  text
      ?.toLowerCase()
      ?.replace(/[_.!:+›\-\n\s]+/g, ' ')
      ?.trim();

  if (label.includes('*')) {
    if (label[0] === '=') {
      return RegExp(`^${label.substring(1).replace(/\*\*/g, '.+').replace(/\*/g, '[^ \\t]+')}$`).test(t);
    } else {
      return RegExp(label.replace(/\*\*/g, '.+').replace(/\*/g, '[^ \\t]+')).test(t);
    }
  } else if (label[0] === '=') {
    return t === label.substring(1);
  } else {
    return !!t?.includes(label);
  }
}


async function scanButtons() {
  console.info("START BUTTON SCANNING...");
  //console.debug("ALL_BUTTONS_SELECTORS = ", ALL_BUTTON_SELECTORS);
  let b = document.body.querySelectorAll(ALL_BUTTON_SELECTORS);

  //console.info('get buttons elements....', b);
  let qbuttons =  Array.from(b)

  //console.info('filter buttons elements....', qbuttons);
  let buttons = qbuttons.filter(
    (button) => {
      //console.log('e0', button);
      let v = isVisible(button);
      //console.log('e1');
      let e = button.classList.contains('axt-element');
      //console.log('e2');
      return v && !e;
    }
  );
  //console.log("selected buttons:", buttons);

  let res = Object.keys(tokens).reduce((acc, token) => {
    let btns = buttons.filter((button) => {
      //console.log(`button: id = '${button.id}' class = '${button.class}' title = '${button.title}'`);
      //console.log(`button.aria-label = ${button.getAttribute('aria-label')}`);

      return tokens[token].some((label) => {
        //console.log("button=", button, "label=", label, "button.innerText=", button.innerText);
        return (
          button.innerText == null ||
          button.innerText.trim().length < 45
        ) && (
          equalsLabel(button.title, label) ||
          equalsLabel(button.getAttribute("aria-label"), label) ||
          equalsLabel(button.innerText, label) ||
          equalsLabel(button.id, label) ||
          Array.from(button.classList).some((c) => equalsLabel(c, label)) ||
          Array.from(button.children)
          .filter((c) => c.tagName.toUpperCase() === 'IMG')
          .some((c) => equalsLabel(c.alt, label))
        )
      })
    });
    //console.log("btns=", btns);
    if (btns.length > 0) {
      console.info(`${token}: ${btns}`);
      acc[token] = btns;
    }
    return acc;
  }, {});

  // custom raters:
  function addCustomButton(tag, selector, has) {
    let butt;
    if (has != null) {
      butt = Array.from(document.querySelectorAll(selector)).filter((i) =>
        i.querySelector(has) != null
      )[0];
    } else {
      butt = document.querySelector(selector);
    }
    if (butt != null) {
      if (res[tag] == null) {
        res[tag] = [];
      }
      res[tag].push(butt);
      butt.setAttribute('axt-button', tag.split('Button')[0]);
    }
  }

  function addCustomButtonXpath(tag, xpath, has) {
    let butt;
    if (has != null) {
      butt = Array.from(document.querySelectorAll(selector)).filter((i) =>
        i.querySelector(has) != null
      )[0];
    } else {
      butt = document.querySelector(selector);
    }
    if (butt != null) {
      if (res[tag] == null) {
        res[tag] = []
      }
      res[tag].push(butt)
    }
  }

  Object.keys(res).forEach( (key) => {
    if (key.endsWith('Button')) {
      res[key].forEach((btn) => btn.setAttribute(
        'axt-button',
         key.split('Button')[0]
      ));
    }
  })

  //if ("loginButton" in res) {
  //  res["loginButton"].forEach((btn) => btn.setAttribute('axt-button', 'login'));
  //}
  //
  //if ("accountButton" in res) {
  //  console.log("account buttons: ", res["accountButton"]);
  //  res["accountButton"].forEach((btn) => btn.setAttribute('axt-button', 'account'));
  //}
  //
  //if ("registerButton" in res) {
  //  res["registerButton"].forEach((btn) => btn.setAttribute('axt-button', 'register'));
  //}
  //
  switch (document.location.host) {
    case "www.hgtv.com":
    case "www.foodnetwork.com":
      addCustomButton("accountButton", "svg[data-type=button-header-nav]");
      break;

    case "www.bhphotovideo.com":
      addCustomButton("accountButton", "div[class*=login-account]");
      break;

    case "gizmodo.com" :
      addCustomButton("accountButton", "a[class*=header-userbutton]");
      break;

    case "www.bet365.com":
      addCustomButton("loginButton", "div[class*=LoginContainer]");
      addCustomButton("registerButton", "div[class*=JoinContainer]");
      break;

    case "www.airasia.com":
      addCustomButton("loginButton", "div[class~=login]");
      break;

    case "amfam.com":
      addCustomButton("loginButton", "li[data-selected-on=MyAccount]");
      break;

    case "www.apple.com":
      addCustomButton("accountButton", "a[aria-label='Shopping Bag']");
      break;

    case "www.cbsnews.com":
      addCustomButton("accountButton", "li[class*='site-nav__item--more']");
      break;

    case "www.cctv.com":
      addCustomButton("accountButton", "div[class*='navli icon user_icon']");
      break;

    case "cellufun.com":
      addCustomButton("loginButton", "a", "img[alt=Login]");
      addCustomButton("registerButton", "a", "img[alt=Join]");
      break;

    case "www.christcenteredgamer.com":
      addCustomButton("loginButton", 'div[id*=loginreg] div[id*=login]');
      break;

    case "www.fandom.com":
      addCustomButton("accountButton", "div[class*=account-menu][class~=wds-dropdown]");
      break;

    case "www.uol.com.br":
      addCustomButton("accountButton", "div.widget-username");
      break;

    case "www.forever21.com":
      addCustomButton("accountButton", "span.top_new_account.show_desktop");
      break;

    case "www.gematsu.com":
      addCustomButton("accountButton", "i.fa-user");
      break

    case "www.globo.com":
      addCustomButton("accountButton", "div#user-bar");
      break

    case "www.healthline.com":
      addCustomButton("accountButton", "button[data-auto=header-menu]");
      break

    case "hyvesgames.nl":
      addCustomButton("accountButton", "i.fa-sign-in-alt");
      break

    case "www.travelo.hu":
      addCustomButton("accountButton", "a.hmenu");
      break

    case "kotaku.com":
      addCustomButton("accountButton", "a[class*=userbutton]");
      addCustomButton("loginButton", "a[role=button][class*=burner-login]");
      break

    case "www.macworld.com":
    case "www.pcworld.com":
      addCustomButton("accountButton", "a[href*=subscriber_login]");
      break

    case "www.missselfridge.com":
      addCustomButton("accountButton", "a[href*=login][class*=Account]");
      break

    case "mixi.jp":
      addCustomButton("accountButton", "a[href='#mainNav']");
      break

    case "nichegamer.com":
      addCustomButton("accountButton", "a[href*=wp-login]");
      break

    case "www.okezone.com":
      addCustomButton("accountButton", "a", "img[alt*=profil]");
      break

    case "www.qatarairways.com":
      addCustomButton("loginButton", "div#login-container");
      break

    case "www.samsung.com":
      addCustomButton("accountButton", "a.user[role=presentation]");
      break

    case "www.sas.com":
      addCustomButton("loginButton", "li.profile-login");
      break

    case "www.softpedia.com":
      addCustomButton("accountButton", "li.fa-user");
      break

    case "www.splunk.com":
      addCustomButton("accountButton", "a", "span.icon-expanded-user-icon");
      break

    case "www.statista.com":
      addCustomButton("loginButton", "input[type=submit][value=Login]");
      break

    case "www.theiconic.com.au":
      addCustomButton(
        "accountButton",
        "a[data-ga-label='Member Menu icon']",
        "svg.inline-icon--profile-1"
      );
      break

    case "www.theonion.com":
      addCustomButton("accountButton", "a[class*=userbutton]", "svg");
      break

    case "www.youporn.com":
      addCustomButton("accountButton", "div.user-menu");
      break

    case "www.allrecipes.com":
      addCustomButton("loginButton", "a", "div.img-profile");
      break

    case "edition.cnn.com":
      addCustomButton("accountButton", "div#account-icon-button");
      break

    case "www.busuu.com":
      addCustomButton("accountButton", "div#js-responsive-nav");
      break

    case "www.carfax.eu":
      addCustomButton("accountButton", "button.navbar-toggle");
      break

    case "www.cosstores.com":
      addCustomButton("accountButton", "button.a-icon-menu");
      break

    case "www.lowes.com":
      addCustomButton("accountButton", 'a.js-account[title=MyLowes]', 'svg');
      break
  }

  if (Object.keys(res).length === 0) {
    await sleep(1000);

    let inputs = Array.from(document.getElementsByTagName('input'))
    .filter((e) => ['hidden', 'submit', 'checkbox'].indexOf(e.type) < 0)

    if (inputs.length === 0) {


      if (
        checkPage('Your connection is not private') ||
        checkPage('ERR_CERT_DATE_INVALID')
      ) {
        res['suspiciousSiteError'] = [];
      }

      if (checkPage('This site can’t be reached')) {
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
        checkPage('is not available in your country') || // (grubhub.com)
        checkPage('is not available to customers') || // (cvs.com)
        checkPage('We Are Currently Unable to Provide a Shopping Experience for This Country') || // (jcpenney.com)
        checkPage('Your access to this site has been limited') || // (marcos.com)
        checkPage('is not available for you') || // (officedepot.com)
        checkPage('we are unable to process international online transactions') || // pch.com
        document.querySelector('div.blockedCountrySplash') != null // hannaandersson.com
      ) {

        res['accessDeniedError'] = [];
      }

      if (
        checkPage("Error 522")
      ) {
        res['timeoutError'] = [];
      }

      if (
        checkPage("I am human") ||
        checkPage("I'm not a robot") ||
        checkPage("reCAPTCHA") ||
        checkPage("CAPTCHA")
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

  let r = Array.from(Object.keys(res));
  console.info("found buttons:", r);

  return r;
}
let result = scanButtons();

return result
