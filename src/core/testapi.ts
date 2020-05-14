import {IEngine, IEngineFactory} from "../engine/engine";
import {error} from "selenium-webdriver";
import {Credentials, ICredential, ICredentialsFactory} from "../credentials/credentials";

import {testapiLogger as L} from "../common/log.config";
import {EReportParsePart, EReportResult, EReportTest, Report} from "../report/report";
import fs from "fs";
import {LoginForm, Parser} from "./parser";
import {Input} from "../common/input";
import UnsupportedOperationError = error.UnsupportedOperationError;

let search_buttons_module = fs.readFileSync("./src/browser/searchButtons.js", "utf8");


enum EState {
    init,
    waitLoginForm,
    waitSecondLoginForm,
    waitLoggedIn,
    done
}

enum ECheck {
    break,
    nextStep
}

let ParseSearchMap: number[] = [
    Parser.SearchFlagSingInButton | Parser.SearchFlagLoginOnForm | Parser.SearchFlagPasswordOnForm, // State.init
    Parser.SearchFlagLoginOnForm | Parser.SearchFlagPasswordOnForm,                                 // State.waitLoginForm
    Parser.SearchFlagPasswordOnForm,                                                                // State.waitSecondLoginForm
    Parser.SearchFlagLoggedIn,                                                                      // State.waitLoggedIn
];

let failMessage = function (error: any) {
    if (error === undefined) return "undefined";
    if (error.message === undefined) return `${error}`;
    return error.message;
}

let goToNext = async function (loginForm: LoginForm, input: Input | undefined, useOnlyEnterButton: boolean) {
    try {
        if (loginForm.loginButton !== undefined && !useOnlyEnterButton) {
            await loginForm.loginButton.press();
        } else if (loginForm.nextButton !== undefined && !useOnlyEnterButton) {
            await loginForm.nextButton.press();
        } else if (input !== undefined) {
            await input.pressEnter();
        }
    } catch (e) {
        L.trace(`fail press login or next button or send enter to input with: ${e}`);
        Promise.reject(`fail press login/next button or send enter to input with: ${e}`);
    }
}


export class TestAPI {

    report: Report;
    engineFactory: IEngineFactory;
    credentialsFactory: ICredentialsFactory;
    threadCount: number;


    public constructor(
            report: Report,
            engineFactory: IEngineFactory,
            credentialsFactory: ICredentialsFactory,
            threadCount: number) {

        this.report = report;
        this.engineFactory = engineFactory;
        this.credentialsFactory = credentialsFactory;
        this.threadCount = threadCount;
    }


    public async checkWrites(useOnlyEnterButton: boolean): Promise<void> {

        await this.checkTests(
            `write: useOnlyEnterButton = ${useOnlyEnterButton}`,
            (engine, credentials) => {
                return this.checkWrite(engine, credentials, useOnlyEnterButton);
            });
    }

    public async checkFailWrites(): Promise<void> {

        // await this.checkTests(
        //     `write: useOnlyEnterButton = ${useOnlyEnterButton}`,
        //     (engine, credentials) => {
        //         return this.checkWrite(engine, credentials, useOnlyEnterButton);
        //     });
    }

    public async checkReads(): Promise<void> {

        await this.checkTests(
            `read`,
            (engine, credentials) => {
                return this.checkRead(engine, credentials);
            });
    }

    protected async checkTests(testName: string, getTest: ((engine: IEngine, credentials: Credentials) => Promise<void>)) {
        L.debug("start engine factory");
        await this.engineFactory.start();

        L.debug(`testing ${testName}`);
        let credentials = this.credentialsFactory.credentials();
        let tests: any[] = [];
        for (let i = 0; i < this.threadCount; i++) {
            let engine = await this.engineFactory.createEngine();
            tests.push(await getTest(engine, credentials));
        }
        await Promise.all(tests);

        L.debug("finish engine factory");
        await this.engineFactory.finish();
    }

    protected async checkWrite(engine: IEngine, credentials: Credentials, useOnlyEnterButton: boolean): Promise<void> {

        return await this.checkTest(
            useOnlyEnterButton ? EReportTest.saveWithoutButtons : EReportTest.saveWithButtons,
            engine,
            credentials,
            (credential: ICredential) => {
                return this.checkWriteCredential(engine, credential, { useOnlyEnterButton: useOnlyEnterButton });
            });
    }

    protected async checkRead(engine: IEngine, credentials: Credentials): Promise<void> {

        return await this.checkTest(
            EReportTest.load,
            engine,
            credentials,
            (credential: ICredential) => {
                return this.checkReadCredential(engine, credential);
            });
    }

    protected async checkTest(
        test: EReportTest,
        engine: IEngine,
        credentials: Credentials,
        getCheckCredential: ((credential: ICredential) => Promise<void>)): Promise<void> {

        L.debug("startup engine");
        await engine.startup(true);

        let driver = await engine.getDriver();

        let credential = await credentials.shift();
        while (credential !== undefined) {
            let result = await this.report.getResult(credential.url, test);
            if (result !== undefined && result !== EReportResult.unknown) {
                L.debug(`skip credential (already checked - ${result})`);
                credential = await credentials.shift();
                continue;
            }

            L.debug(`report start: ${credential.url}`);
            await this.report.start(credential.url);

            L.debug(`engine start`);
            await engine.start(credential, test == EReportTest.load);

            try {
                L.debug("check write credential");
                let checkCredential = getCheckCredential(credential);
                await checkCredential.then().catch(e => { throw e; });
            } catch (e) {
                L.warn(`write credential filed with: '${e}'`);
            }

            L.debug("engine finish");
            await engine.finish();

            L.debug("report finish");
            await this.report.finish(credential.url, test);

            // await driver.sleep(500);

            credential = await credentials.shift();
        }

        L.debug("shutdown engine");
        await engine.shutdown();

        L.debug("driver quit");
        await driver.quit();
    }

    protected async checkWriteCredential(
        engine: IEngine,
        credential: ICredential,
        options:
            { useOnlyEnterButton: boolean } |
            undefined = undefined): Promise<void> {

        L.info("checkWriteCredential");

        let useOnlyEnterButton = false;
        if (options !== undefined) {
            if (options as { useOnlyEnterButton: boolean }) {
                useOnlyEnterButton = (<{ useOnlyEnterButton: boolean }>options).useOnlyEnterButton;
            }
        }

        let report = this.report;

        await this.checkCredentialFor(
            useOnlyEnterButton ? EReportTest.saveWithoutButtons : EReportTest.saveWithButtons,
            engine,
            credential,

            async function (loginForm: LoginForm, test: EReportTest): Promise<ECheck> {

                if (loginForm.loginInput === undefined || loginForm.passwordInput === undefined) return Promise.reject();
                await loginForm.loginInput.enterValue(credential.login);
                await loginForm.passwordInput.enterValue(credential.password);
                return Promise.resolve(ECheck.nextStep);
            },
            async function (loginForm: LoginForm, test: EReportTest): Promise<ECheck> {

                if (loginForm.loginInput === undefined) return Promise.reject();
                await loginForm.loginInput.enterValue(credential.login);

                await goToNext(loginForm, loginForm.loginInput, useOnlyEnterButton);

                return Promise.resolve(ECheck.nextStep);
            },
            async function (loginForm: LoginForm, test: EReportTest): Promise<ECheck> {

                if (loginForm.passwordInput === undefined) return Promise.reject();
                await loginForm.passwordInput.enterValue(credential.password);
                return Promise.resolve(ECheck.nextStep);
            },
            async function (loginForm: LoginForm, test: EReportTest): Promise<ECheck> {

                try {
                    L.debug("try engine process before login");

                    await engine.processBeforeLogin();

                    L.info("!!!!  credential SAVED as MANUAL before logged in");
                    await report.setResult(credential.url, EReportResult.waitApprove, EReportTest.load);
                    await report.setResult(credential.url, EReportResult.manualBeforeLoggedIn, test);
                } catch (e) {
                    if (e as UnsupportedOperationError) {
                        L.debug("engine process before login not supported");

                        await goToNext(loginForm, loginForm.passwordInput, useOnlyEnterButton);

                        return Promise.resolve(ECheck.nextStep);
                    }

                    L.debug("engine process before login is failed");
                    L.info("!!!!  credential FAILED SAVE as MANUAL before logged in");
                    await report.setFail(credential.url, `credential fail save before logged in with: ${failMessage(e)}`, test);
                }

                return Promise.resolve(ECheck.break);
            },
            async function (test: EReportTest): Promise<ECheck> {
                try {
                    L.debug("try engine process after login");

                    await engine.processAfterLogin();

                    L.info("!!!!  credential SAVED as MANUAL after logged in");
                    await report.setResult(credential.url, EReportResult.waitApprove, EReportTest.load);
                    await report.setResult(credential.url, EReportResult.manualAfterLoggedIn, test);

                    return Promise.resolve(ECheck.break);
                } catch (e) {
                    if (!(e instanceof UnsupportedOperationError)) {

                        L.debug("engine process after login is failed");
                        L.info("!!!!  credential FAILED SAVE as MANUAL after logged in");
                        await report.setFail(credential.url, `credential fail save after logged in with: ${failMessage(e)}`, test);
                        return Promise.resolve(ECheck.break);
                    }
                }

                try {
                    L.debug("try engine check saved");

                    await engine.checkSaved(credential.url, credential);

                    L.info("!!!!  credential SAVED as AUTO after logged in");
                    await report.setResult(credential.url, EReportResult.auto, test);
                } catch (e) {
                    if (e instanceof UnsupportedOperationError) {
                        L.debug("engine engine check saved not supported");

                        L.info("!!!! credential MAYBE SAVED as auto after logged in");
                        await report.setResult(credential.url, EReportResult.waitApprove, test);
                    } else {
                        L.debug("engine process after login is failed");
                        L.info("!!!!  credential FAILED SAVE as AUTO after logged in");
                        await report.setFail(credential.url, `credential fail autosave: ${failMessage(e)}`, test);
                    }
                }

                return Promise.resolve(ECheck.break);
            });

        return Promise.resolve();
    }

    protected async checkReadCredential(
            engine: IEngine,
            credential: ICredential): Promise<void> {

        L.info("checkReadCredential");

        let report = this.report;

        await this.checkCredentialFor(
            EReportTest.load,
            engine,
            credential,

            async function (loginForm: LoginForm, test: EReportTest): Promise<ECheck> {

                if (loginForm.loginInput === undefined || loginForm.passwordInput === undefined) return Promise.reject();

                //TODO: add check manual fill
                L.debug("check auto fill login and password inputs")
                let login = await loginForm.loginInput.getInputValue();
                let password = await loginForm.passwordInput.getInputValue();
                if (login === credential.login && password === credential.password) {
                    L.debug("!!!!  credential AUTO LOAD");
                    await report.setResult(credential.url, EReportResult.auto, test);
                } else {
                    L.debug("credential AUTO LOAD failed");
                    L.trace(`  real login: '${credential.login}'  stored: '${login}'`);
                    L.trace(`  real password: '${credential.password}'  stored: '${password}'`);
                    await report.setFail(credential.url, "login and/or password is not equal with ", test);
                }
                return Promise.resolve(ECheck.break);
            },
            async function (loginForm: LoginForm, test: EReportTest): Promise<ECheck> {

                if (loginForm.loginInput === undefined) return Promise.reject();

                //TODO: add check manual fill
                L.debug("check auto fill login input")
                let login = await loginForm.loginInput.getInputValue();
                if (login !== credential.login) {

                    L.debug("credential AUTO LOAD failed");
                    L.trace(`  real login: '${credential.login}'  stored: '${login}'`);
                    await report.setFail(credential.url, "login is not equal with ", test);
                    return Promise.resolve(ECheck.break);
                }

                await goToNext(loginForm, loginForm.loginInput, false);

                return Promise.resolve(ECheck.nextStep);
            },
            async function (loginForm: LoginForm, test: EReportTest): Promise<ECheck> {

                if (loginForm.passwordInput === undefined) return Promise.reject();

                //TODO: add check manual fill
                L.debug("check auto fill password input")
                let password = await loginForm.passwordInput.getInputValue();
                if (password === credential.password) {

                    L.debug("!!!!  credential AUTO LOAD");
                    await report.setResult(credential.url, EReportResult.auto, test);
                } else {
                    L.debug("credential AUTO LOAD failed");
                    L.trace(`  real password: '${credential.password}'  stored: '${password}'`);
                    await report.setFail(credential.url, "password is not equal with ", test);
                }
                return Promise.resolve(ECheck.break);
            },
            async function (loginForm: LoginForm, test: EReportTest): Promise<ECheck> {

                return Promise.resolve(ECheck.break);
            },
            async function (test: EReportTest): Promise<ECheck> {

                return Promise.resolve(ECheck.break);
            });

        return Promise.resolve();
    }

    protected async checkCredentialFor(
        test: EReportTest,
        engine: IEngine,
        credential: ICredential,
        hasFullLoginForm: ((loginForm: LoginForm, test: EReportTest) => Promise<ECheck>),
        hasFirstStepLoginForm: ((loginForm: LoginForm, test: EReportTest) => Promise<ECheck>),
        hasSecondStepLoginForm: ((loginForm: LoginForm, test: EReportTest) => Promise<ECheck>),
        afterFillLoginForm: ((loginForm: LoginForm, test: EReportTest) => Promise<ECheck>),
        hasIsLoggedIn: ((test: EReportTest) => Promise<ECheck>)
    ): Promise<void> {

        L.info("checkWriteCredential");

        let driver = await engine.getDriver();
        let extDriver = await engine.getExtDriver();
        let parser = new Parser(engine);

        try {
            L.debug(`open new tab with: ${credential.url}`);
            await extDriver.openUrlOnNewTab(credential.url);

            let state = EState.init;

            if (test === EReportTest.load) await driver.sleep(500);

            try {
                L.debug("run scanner");
                let r: Array<string> = await driver.executeScript(search_buttons_module) as Array<string>;
                L.info(`Search buttons result: ${r}`);
            } catch (e) {
                L.info(`Search buttons error: ${e}`);
            }

            while (true) {

                L.debug("parse page");
                let page = await parser.parsePage(ParseSearchMap[state], credential.timeout);

                L.debug("check page structure");
                if (page.singinButton !== undefined && page.loginForm === undefined) {
                    L.debug("page has singin button and hasn't login form");

                    await this.report.setParsePart(credential.url, EReportParsePart.singInButton);
                    await page.singinButton.press();

                    state = EState.waitLoginForm;
                    continue;
                } else if (page.loginForm !== undefined) {
                    if (page.loginForm.loginInput !== undefined && page.loginForm.passwordInput !== undefined) {
                        L.debug("login form has login and password inputs");

                        await this.report.setParsePart(credential.url, EReportParsePart.fullLoginForm);
                        if (await hasFullLoginForm(page.loginForm, test) == ECheck.break) break;
                    } else if (page.loginForm.loginInput !== undefined) {
                        L.debug("login form has only login input");

                        await this.report.setParsePart(credential.url, EReportParsePart.firstStepLoginForm);
                        if (await hasFirstStepLoginForm(page.loginForm, test) == ECheck.break) break;

                        state = EState.waitSecondLoginForm;
                        continue;
                    } else if (page.loginForm.passwordInput !== undefined) {
                        L.debug("login form has only password input");

                        await this.report.setParsePart(credential.url, EReportParsePart.secondStepLoginForm);
                        if (await hasSecondStepLoginForm(page.loginForm, test) == ECheck.break) break;
                    } else {
                        L.debug("login form did not have login or password inputs");

                        await this.report.setFail(credential.url, "login form did not have login or password inputs", test);
                        break;
                    }

                    if (await afterFillLoginForm(page.loginForm, test) == ECheck.break) break;

                    state = EState.waitLoggedIn;
                    continue;
                } else if (page.isLoggedIn) {
                    L.debug("page is logged in");

                    await this.report.setParsePart(credential.url, EReportParsePart.loggedIn);

                    if (await hasIsLoggedIn(test) == ECheck.break) break;
                } else if (page.didNotParse) {
                    L.debug("page did not parsed");

                    await this.report.setParsePart(credential.url, EReportParsePart.notParsed);
                }

                break;
            }
        } catch (e) {
            L.warn(`fail: ${e}`);
            await this.report.setFail(credential.url, failMessage(e), test);
        }

        L.debug("close current tab");
        await extDriver.closeCurrentTab();

        return Promise.resolve();
    }
}
