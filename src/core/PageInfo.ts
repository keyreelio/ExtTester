import {IEngine} from "../engine/engine";
import {EReportTest} from "../report/report";
import {Button} from "../common/button";
import {Input} from "../common/input";
import {testapiLogger as L} from "../common/log.config";

export class ButtonInfo {
    frame: string;
    selector: string;
    zIndex: number;

  public constructor(frame: string, selector: string, zIndex: number) {
      this.frame = frame;
      this.selector = selector;
      this.zIndex = zIndex;
  }
}

export class FrameInfo {
    selector: string;
    isCaptcha: boolean;

    public constructor(selector: string, isCaptcha: boolean) {
        this.selector = selector;
        this.isCaptcha = isCaptcha;
    }
}

export class PageInfo {
    duration: number = -1;
    error: string | undefined = undefined;
    forms: { [tag: string]: IFormInfo } = {};
    frames: Array<FrameInfo> = [];
    buttons: { [tag: string]: Array<ButtonInfo>} = {};

    public constructor(clone: PageInfo | undefined = undefined) {
        if (clone != null) {
            this.buttons = clone.buttons;
            this.forms = clone.forms;
            this.duration = clone.duration;
            this.error = clone.error;
            this.frames = clone.frames;
        }
    }

    public isLoggedIn(): boolean {
        return (
            (this.buttons['login'] || []).length === 0 &&
            (this.buttons['registration'] || []).length === 0 &&
            this.forms['login'] == null &&
            this.forms['registration'] == null
        );
    }

    public hasLoginForm(): boolean {
        return (this.forms['login'] != null);
    }

    public hasRegistrationForm(): boolean {
        return (this.forms['registration'] != null);
    }

    public hasCaptchaFrames(): boolean {
       return (this.frames.some( (f) => f.isCaptcha ));
    }

    public hasLoginInput(): boolean {
        return this.hasLoginForm() && this.forms['login'].inputs['login'] != null;
    }

    public hasCaptchaInput(): boolean {
        return this.hasLoginForm() && this.forms['login'].inputs['captcha'] != null;
    }


    public hasPasswordInput(): boolean {
        return this.hasLoginForm() && this.forms['login'].inputs['password'] != null;
    }

    public hasSigninButton(): boolean {
        return (
            (this.buttons['login'] || []).length != 0 ||
            (this.buttons['account'] || []).length != 0
        );
    }

    public hasRegistrationButton(): boolean {
        return ((this.buttons['registration'] || []).length != 0);
    }

    /**
     *  select first unused signin button selector.
     **/
    private static selectUnusedButton(
        buttons: Array<ButtonInfo> | undefined,
        history: Array<string>
    ): ButtonInfo | undefined {
        if (buttons == null || buttons.length == 0) return undefined;
        return buttons
            .filter( (button) => (!history.includes(button.selector)))
            .sort( (a,b) => b.zIndex - a.zIndex)[0]
    }

    /**
     * Press next available 'Sign in' button on the page
     *
     *  @param engine - selenium engine. needs to get webdriver and for making screenshots
     *  @param test: EReportTest - test mode
     *  @param remark: string - short title (added to the screenshot name)
     *  @param buttonsHistory: string[] - previously pressed buttons (to avoid pressing
     *                                    repeatedly)
     * @return boolean - true - button was pressed
     */
    public async pressSigninButton(
        engine: IEngine,
        test: EReportTest = EReportTest.unknown,
        remark: string = "",
        buttonsHistory: Array<string> = [],
    ): Promise<boolean> { // true - button was pressed
        let pressed = false;

        let loginButton = PageInfo.selectUnusedButton(
            this.buttons['login'],
            buttonsHistory
        )
        let accButton = PageInfo.selectUnusedButton(
            this.buttons['account'],
            buttonsHistory
        )

        let selector;
        let frameSelector;
        if (loginButton != null && accButton != null) {
           if (loginButton.zIndex >= accButton.zIndex) {
               selector = loginButton.selector;
               frameSelector = loginButton.frame;
           } else {
              selector = accButton.selector;
               frameSelector = accButton.frame;
           }
        } else if (loginButton != null) {
            selector = loginButton.selector;
            frameSelector = loginButton.frame;
        } else if (accButton != null) {
            selector = accButton.selector;
            frameSelector = accButton.frame;
        }

        if (selector != null) {
            L.info(`Click [SIGN IN]/[MENU] button ${selector} ${
                frameSelector ? `in frame ${frameSelector}`: 'in page'
            }`)
            await Button.press(
                frameSelector,
                selector,
                engine,
                test,
                `${remark}-click-signin-button`
            );
            buttonsHistory.push(selector);
            pressed = true;
        }
        return pressed;
    }

    public async pressLoginButton(
        engine: IEngine,
        test: EReportTest = EReportTest.unknown,
        remark: string = "",
    ): Promise<void> {
        if (!this.hasLoginForm()) return
        let btnTag = 'login';
        let selector = this.forms['login'].buttons[btnTag]

        if (selector == null) {
            btnTag = 'next'
            selector = this.forms['login'].buttons[btnTag]
        }

        if (selector != null) {
            L.info(`Press [${btnTag.toUpperCase()}] button`);
            await Button.press(
                this.forms['login'].frame,
                selector,
                engine,
                test,
                `${remark}-click-${btnTag}-button`
            );
        }
    }

    public async getLoginInputValue(engine: IEngine): Promise<string> {
        if (!this.hasLoginForm()) {
            return Promise.reject(
                'getLoginInputValue error: Login form is not found'
            )
        }
        let selector = this.forms['login'].inputs['login'];
        if (selector != null) {
            L.info("Read value from 'Login' input");
            return await Input.getInputValue(
                selector,
                this.forms['login'].frame,
                engine
            );
        }
        return Promise.reject(
            `getLoginInputValue error: Login form '${
                this.forms['login'].selector
            }' doesn't have a 'Login' input`
        )
    }

    public async getPasswordInputValue(engine: IEngine): Promise<string> {
        if (!this.hasLoginForm()) {
            return Promise.reject('Login form is not found');
        }

        let selector = this.forms['login'].inputs['password'];
        if (selector != null) {
            L.info("Read value from 'Password' input");
            return await Input.getInputValue(
                selector,
                this.forms['login'].frame,
                engine
            );
        }

        return Promise.reject(
            `'Login form' ('${this.forms['login'].selector}') doesn't have a 'password' input`
        );
    }

    public async enterValueToLoginInput(
        engine: IEngine,
        value: string,
        options:
            { attach: boolean } |
            { replace: boolean } |
            { attach: boolean, replace: boolean } |
            undefined = undefined
    ): Promise<void> {
        if (!this.hasLoginForm()) {
            return Promise.reject(
                'Login form is not found'
            )
        }
        let selector = this.forms['login'].inputs['login'];
        if (selector != null) {
            L.info(`Type text '${value}' into 'Login' input`);
            return await Input.enterValue(
                selector,
                this.forms['login'].frame,
                engine,
                value,
                options
            );
        }
        return Promise.reject(
            `'Login' form ('${this.forms['login'].selector}') doesn't have a 'Login' input`
        )
    }

    public async enterValueToPasswordInput(
        engine: IEngine,
        value: string,
        options:
            { attach: boolean } |
            { replace: boolean } |
            { attach: boolean, replace: boolean } |
            undefined = undefined
    ): Promise<void> {
        if (!this.hasLoginForm()) {
            return Promise.reject('Login form is not found');
        }
        let selector = this.forms['login'].inputs['password'];
        if (selector != null) {
            L.info(`Type secret into 'Password' input`);
            return await Input.enterValue(
                selector,
                this.forms['login'].frame,
                engine,
                value,
                options
            );
        }
        return Promise.reject(
            `'Login' form ('${this.forms['login'].selector}') doesn't have a 'Password' input`
        );
    }
}
