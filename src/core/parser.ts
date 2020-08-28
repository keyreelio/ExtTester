import {parserLogger as L} from "../common/log.config";
import {Timeouts} from "../common/timeouts";
import {IEngine} from "../engine/engine";
import {ButtonInfo, FrameInfo, PageInfo} from "./PageInfo";
import fs from "fs";
import {error} from "selenium-webdriver";
import WebDriverError = error.WebDriverError;
import NoSuchWindowError = error.NoSuchWindowError;
import {WebElementExt} from "../common/webElementExt";

const gather_page_info_module = fs.readFileSync(
    "./src/browser/gatherPageInfo.js",
    "utf8"
);
const optimalSelect_module = fs.readFileSync(
    //"./node_modules/optimal-select/dist/optimal-select.js",
    "./src/browser/optimal-select.js",
    "utf8"
)

export class Parser {
    //*[@axt-button="login"]
    //
    //   or
    //
    //body[@axt-parser-timing]
    //  *[@axt-form-type="login"]
    //      input[@axt-input-type="login"]
    //      input[@axt-input-type="password"]
    //      *[@axt-button-type="login"]
    //      *[@axt-button-type="next"]
    //  *[@axt-button-type="signin"]

    engine: IEngine;

    public constructor(engine: IEngine) {
        this.engine = engine;
    }

    private async parseFrame(
        pageInfo: PageInfo,
        frameSelector: string | undefined,
        frameId: number,
        isDone: boolean
    ): Promise<PageInfo> {
        L.trace('parseFrame');

        let driver = await this.engine.getDriver();
        let extDriver = await this.engine.getExtDriver();
        let outPageInfo: PageInfo = new PageInfo(JSON.parse(JSON.stringify(pageInfo)));
        let pInfo = new PageInfo();

        let startTime = new Date();
        let time = Timeouts.begin();

        await extDriver.switchInRootToFrame(frameSelector);
        while (true) {
            L.debug(`Scan ${
                frameId == -1 ? 'page' : `frame ${frameId} (${frameSelector})`
            }...`);

            await extDriver.loadOptimalSelectModule();
            pInfo = new PageInfo(await driver.executeAsyncScript(
                gather_page_info_module,
                optimalSelect_module,
                frameId,  // -1 - root page, 0..n - frameId
                frameSelector // this frame CSS selector (undefined for root)
            ) as PageInfo);

            L.warn(`-[ frameId = ${frameId} ]--------------------------`);
            L.warn(`-- buttons: ${Object.keys(pInfo.buttons)}`);
            L.warn(`-- forms:   ${Object.keys(pInfo.forms)}`);
            L.warn(`-- frames:  [${pInfo.frames.map( (f) => f.selector).join(', ')}]`);
            L.warn(`-- captcha frame: ${pInfo.frames.filter( (f) => f.isCaptcha)}`);

            if (pInfo.error != null) {
                if ('captchaError' == pInfo.error) {
                    L.warn("Captcha form was found")
                    let captchaNowTime = new Date();
                    let delta = captchaNowTime.getTime() - startTime.getTime();
                    let secsLeft = (Timeouts.WaitCaptchaFilling - delta) / 1000;

                    if (secsLeft > 0) {
                        L.info(
                            "Wait captcha form passing " +
                            `(${secsLeft.toFixed(0)} secs left)`
                        );

                        L.debug("Wait 1000ms...")
                        await driver.sleep(1000);

                        L.debug("Restart page scanning...");
                        continue;
                    }
                } else {
                    L.warn(`Page loading error: ${pInfo.error}`);
                }
            }
            break;
        }

        if (outPageInfo.error != null) {
            outPageInfo.error = pInfo.error;
        }

        if (frameId == -1) {
            outPageInfo.frames = pInfo.frames;
        }

        Object.keys(pInfo.buttons).forEach( (tag) => {
            if (outPageInfo.buttons[tag] == null) {
                outPageInfo.buttons[tag] = pInfo.buttons[tag];
            }
        })

        Object.keys(pInfo.forms).forEach( (tag) => {
           if (outPageInfo.forms[tag] == null) {
              outPageInfo.forms[tag] = pInfo.forms[tag];
           }
        })

        outPageInfo.duration = Math.max(outPageInfo.duration, pInfo.duration);
        outPageInfo.error = pInfo.error;

        L.debug(
            `${frameId == -1 ? 'Page' : `Frame ${frameId}`} was scanned in ` +
            `${Timeouts.end(time)}ms`
        );

        L.warn("============================================");
        L.warn(`>> forms:   ${Object.keys(outPageInfo.forms)}`);
        L.warn(`>> buttons: ${Object.keys(outPageInfo.buttons)}`);
        L.warn(`>> frames:  [${outPageInfo.frames.join(', ')}]`);
        L.warn(`>> error:   ${outPageInfo.error}`);
        L.warn("============================================");

        return outPageInfo;
    }

    public async parsePage(isDone: boolean): Promise<PageInfo> {
        L.trace("Start parsePage...");
        let time = Timeouts.begin();
        let pageInfo = new PageInfo();
        try {
            pageInfo = await this.parseFrame(
                pageInfo,
                undefined,
                -1,
                isDone
            );
            if (
                pageInfo.error == null &&
                !pageInfo.hasLoginForm() &&
                (!isDone || !pageInfo.isLoggedIn()) ||
                pageInfo.hasCaptchaFrames()
            ) {
                // login form was not found on the root iframe, try to search it in
                // the second level iframes:
                let frameId = -1;
                for (let frame of pageInfo.frames) {
                    frameId += 1;
                    pageInfo = await this.parseFrame(
                        pageInfo,
                        frame.selector,
                        frameId,
                        isDone
                    );
                    if (pageInfo.hasLoginForm() || (isDone && !pageInfo.isLoggedIn())) {
                        break;
                    }
                }
            }
        } catch (e) {
            if (e instanceof NoSuchWindowError) {
                return Promise.reject(e);
            } else if (e instanceof WebDriverError) {
                L.error('pageError', e);
                pageInfo.error = 'pageError';
            } else {
                return Promise.reject(e);
            }
        }

        L.trace("----------------------------------");
        await this.logPageInfo(pageInfo);
        L.trace("----------------------------------");

        L.trace(`parsePage finished in ${Timeouts.end(time)}ms${
            pageInfo.error ? ` with error: ${pageInfo.error}` : ''
        }`);
        return Promise.resolve(pageInfo);
    }

    /** logs ... */
    protected logButton(
        tag: string,
        button: ButtonInfo
    ) {
        L.trace(
            `- Button [${tag.toUpperCase()}] ` +
            `'${button.selector}'[ZI: ${button.zIndex}] in ${
              button.frame == null ? 'root page' : `frame: '${button.frame}'`
            }`
        );
    }

    protected logButtonSelector(
        tag: string,
        frameSelector: string | undefined,
        buttonSelector: string
    ) {
        L.trace(
            `- Button [${tag.toUpperCase()}] ` +
            `'${buttonSelector}' in ${
                frameSelector == null ? 'root page' : `frame: '${frameSelector}'`
            }`
        );
    }

    protected logButtons(
        frameSelector: string | undefined,
        buttons: {[tag: string]: Array<ButtonInfo> | string}
    ) {
        for (let btnTag of Object.keys(buttons)) {
            let btnInfo = buttons[btnTag];
            if (typeof btnInfo == 'string') {
                this.logButtonSelector(btnTag, frameSelector, btnInfo);
            } else {
                for (let btn of btnInfo) {
                    this.logButton(btnTag, btn);
                }
            }
        }
    }

    protected logInput(
        tag: string,
        frameSelector: string | undefined,
        inputSelector: string
    ) {
        L.trace(
            `- Input [${tag.toUpperCase()}] '${inputSelector}' in ${
                frameSelector == null ? 'root page' : `frame: '${frameSelector}'`
            }`
        );
    }

    protected logInputs(
        frameSelector: string | undefined,
        inputs: {[tag: string]: string}
    ) {
        for (let inputTag of Object.keys(inputs)) {
          this.logInput(inputTag, frameSelector, inputs[inputTag]);
        }
    }

    protected logForm(formTag: string, form: IFormInfo | undefined) {
        if (form == null) return;
        L.trace(
            `- Form [${formTag.toUpperCase()}] '${form.selector}' in ${
                form.frame == null ? 'root page' : `frame: '${form.frame}'`
            }${form.unsecured ? ', !! UNSECURED !!' : '' }`
        );
        this.logInputs(form.frame, form.inputs);
        this.logButtons(form.frame, form.buttons);
    }

    protected logPageInfo(page: PageInfo | undefined) {
        if (page === undefined) {
            L.trace("Found nothing...");
            return;
        }
        L.trace("Signin/menu buttons:");
        this.logButtons(undefined, page.buttons);

        L.trace("Login form:");
        this.logForm('login', page.forms['login']);

        L.trace(`Is logged in: ${page.isLoggedIn()}`);
    }
}
