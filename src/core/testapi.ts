import {IEngine, IEngineFactory} from "../engine/engine"
import {error} from "selenium-webdriver"
import {Credentials, ICredential, ICredentialsFactory} from "../credentials/credentials"

import {testapiLogger as L} from "../common/log.config"
import {EReportParsePart, EReportResult, EReportTest, ETimer, Report} from "../report/report"
import {LoginForm, Parser} from "./parser"
import {Input} from "../common/input"
import ElementNotInteractableError = error.ElementNotInteractableError;
import {Timeouts} from "../common/timeouts";
import TimeoutError = error.TimeoutError;
import UnsupportedOperationError = error.UnsupportedOperationError;


enum EState {
    init,
    waitLoginForm,
    waitSecondLoginForm,
    done,
}

enum ECheck {
    break,
    nextStep
}

// let ParseSearchMap: number[] = [
//     Parser.SearchFlagSignInButton | Parser.SearchFlagLoginOnForm | Parser.SearchFlagPasswordOnForm, // State.init
//     Parser.SearchFlagLoginOnForm | Parser.SearchFlagPasswordOnForm,                                 // State.waitLoginForm
//     Parser.SearchFlagPasswordOnForm,                                                                // State.waitSecondLoginForm
//     Parser.SearchFlagLoggedIn,                                                                      // State.waitFinishing
// ]

let failMessage = function (error: any) {
    if (error === undefined) return "undefined"
    if (error.message === undefined) return `${error}`
    return error.message
}

export class TestAPI {

    report: Report
    engineFactory: IEngineFactory
    credentialsFactory: ICredentialsFactory
    threadsCount: number
    testsCount: number
    useVpn: boolean


    public constructor(
        report: Report,
        engineFactory: IEngineFactory,
        credentialsFactory: ICredentialsFactory,
        threadsCount: number,
        testsCount: number,
        useVpn: boolean) {

        this.report = report
        this.engineFactory = engineFactory
        this.credentialsFactory = credentialsFactory
        this.threadsCount = threadsCount
        this.testsCount = testsCount
        this.useVpn = useVpn
    }

    private async goToNext(
        engine: IEngine,
        test: EReportTest,
        remark: string,
        loginForm: LoginForm,
        input: Input | undefined,
        useOnlyEnterButton: boolean
    ) {
        try {
            if (loginForm.loginButton !== undefined && !useOnlyEnterButton) {
                await loginForm.loginButton.press(engine, test,
                    `${remark}-click-login-button`)
            } else if (loginForm.nextButton !== undefined && !useOnlyEnterButton) {
                await loginForm.nextButton.press(engine, test,
                    `${remark}-click-next-button`)
            } else if (input !== undefined) {
                await input.pressEnter(engine, test,
                    `${remark}-press-enter`)
            }
        } catch (e) {
            let reason = `fail press login or next button or send enter to input with: ${e}`
            L.trace(reason)
            await Promise.reject(reason)
        }
    }


    public async checkWrites(useOnlyEnterButton: boolean): Promise<void> {

        await this.checkTests(
            `write: useOnlyEnterButton = ${useOnlyEnterButton}`,
            (engine, credentials) => {
                return this.checkWrite(engine, credentials, useOnlyEnterButton)
            })
    }

    public async checkFailWrites(useOnlyEnterButton: boolean): Promise<void> {

        await this.checkTests(
            `write: useOnlyEnterButton = ${useOnlyEnterButton}`,
            (engine, credentials) => {
                return this.checkFailWrite(engine, credentials, useOnlyEnterButton)
            })
    }

    public async checkFills(): Promise<void> {

        await this.checkTests(
            `read`,
            (engine, credentials) => {
                return this.checkRead(engine, credentials)
            })
    }

    protected async checkTests(
        testName: string,
        getTest: ((engine: IEngine, credentials: Credentials) => Promise<void>)) {

        L.debug("start engine factory")
        await this.engineFactory.start()

        L.debug(`testing ${testName}`)
        let credentials = this.credentialsFactory.credentials(this.testsCount)
        let tests: any[] = []
        for (let i = 0; i < this.threadsCount; i++) {
            let engine = await this.engineFactory.createEngine()
            tests.push(await getTest(engine, credentials))
        }
        await Promise.all(tests)

        L.debug("finish engine factory")
        await this.engineFactory.finish()
    }

    protected async checkWrite(engine: IEngine, credentials: Credentials, useOnlyEnterButton: boolean): Promise<void> {

        return await this.checkTest(
            useOnlyEnterButton ? EReportTest.saveWithoutButtons : EReportTest.saveUsingButtons,
            engine,
            credentials,
            (credential: ICredential) => {
                return this.checkWriteCredential(
                    engine,
                    credential,
                    {useOnlyEnterButton: useOnlyEnterButton})
            })
    }

    protected async checkFailWrite(
        engine: IEngine,
        credentials: Credentials,
        useOnlyEnterButton: boolean
    ): Promise<void> {

        return await this.checkTest(
            useOnlyEnterButton
                ? EReportTest.falseSaveWithoutButtons
                : EReportTest.falseSaveUsingButtons,
            engine,
            credentials,
            (credential: ICredential) => {
                return this.checkFailWriteCredential(
                    engine,
                    credential,
                    {useOnlyEnterButton: useOnlyEnterButton})
            })
    }

    protected async checkRead(engine: IEngine, credentials: Credentials): Promise<void> {

        return await this.checkTest(
            EReportTest.fill,
            engine,
            credentials,
            (credential: ICredential) => {
                return this.checkReadCredential(engine, credential)
            })
    }

    protected async checkTest(
        test: EReportTest,
        engine: IEngine,
        credentials: Credentials,
        getCheckCredential: ((credential: ICredential) => Promise<void>)): Promise<void> {

        L.debug("startup engine")
        await engine.startup(false)

        let driver = await engine.getDriver()
        let extDriver = await engine.getExtDriver()

        let credential = await credentials.shift()

        while (credential !== undefined) {
            let url = credential.url
            L.debug(`test start: ${url}`)

            let result = await this.report.getResult(url, test)
            if (result !== undefined && result !== EReportResult.unknown) {
                L.debug(`skip credential (already checked - ${result})`)
                credential = await credentials.shift()
                continue
            }

            L.debug(`report start`)
            await this.report.start(url, test)

            if (credential.skip) {
                L.debug(`skip credential: credentials.skip = ${credential.skip}`)

                await this.report.finish(url, test)
                credential = await credentials.shift()
                continue
            }

            if (this.useVpn != credential.vpn) {
                L.debug(`skip credential: useVpn = ${this.useVpn}, crd.vpn = ${credential.vpn}`)

                await this.report.finish(url, test)
                credential = await credentials.shift()
                continue
            }

            L.debug(`engine start`)
            await engine.start(credential, test == EReportTest.fill)

            try {
                L.debug("check credential")
                await Promise.race([
                    getCheckCredential(credential),
                    Timeouts.createPromiseTimer(Timeouts.WaitCheckCredential, new TimeoutError())
                ])
            } catch (e) {
                if (e as TimeoutError) {
                    L.debug("check credential timeout")

                    await this.report.setFail(url, test, "check credential timeout")

                    L.debug("close current tab")
                    await extDriver.closeCurrentTab()
                } else {
                    L.warn(`write credential filed with: '${e}'`)
                }
            }

            L.debug("engine finish")
            await engine.finish()

            L.debug("report finish")
            await this.report.finish(url, test)

            L.debug("test finish")

            credential = await credentials.shift()
        }

        L.debug("shutdown engine")
        await engine.shutdown()

        L.debug("driver quit")
        await driver.quit()
    }

    protected async checkWriteCredential(
        engine: IEngine,
        credential: ICredential,
        options: { useOnlyEnterButton: boolean } | undefined = undefined
    ): Promise<void> {
        L.info("checkWriteCredential")

        let url = credential.url
        let useOnlyEnterButton = false
        if (options !== undefined) {
            if (options as { useOnlyEnterButton: boolean }) {
                useOnlyEnterButton = (<{ useOnlyEnterButton: boolean }>options).useOnlyEnterButton
            }
        }

        let api = this
        let report = this.report

        let tDef = useOnlyEnterButton
            ? EReportTest.saveWithoutButtons
            : EReportTest.saveUsingButtons

        try {
            await this.checkCredentialFor(
                tDef,
                engine,
                credential,

                /************************************************************************/
                async function (
                    loginForm: LoginForm,
                    test: EReportTest
                ): Promise<ECheck> {
                    // if (loginForm.loginInput === undefined || loginForm.passwordInput === undefined) {
                    //     return Promise.reject()
                    // }

                    await loginForm!.loginInput!.enterValue(credential.login)
                    await loginForm!.passwordInput!.enterValue(credential.password)
                    return Promise.resolve(ECheck.nextStep)
                },

                /************************************************************************/
                async function (
                    loginForm: LoginForm,
                    test: EReportTest
                ): Promise<ECheck> {
                    //if (loginForm.loginInput === undefined) return Promise.reject()
                    await loginForm!.loginInput!.enterValue(credential.login)
                    await api.goToNext(
                        engine,
                        test,
                        "login-1",
                        loginForm,
                        loginForm.loginInput,
                        useOnlyEnterButton
                    )
                    return Promise.resolve(ECheck.nextStep)
                },

                /************************************************************************/
                async function (
                    loginForm: LoginForm,
                    test: EReportTest
                ): Promise<ECheck> {
                    //if (loginForm.passwordInput === undefined) return Promise.reject()
                    await loginForm!.passwordInput!.enterValue(credential.password)
                    return Promise.resolve(ECheck.nextStep)
                },

                /************************************************************************/
                async function (
                    loginForm: LoginForm,
                    test: EReportTest
                ): Promise<ECheck> {
                    try {
                        L.debug("try engine process before login")

                        await engine.processLoginFinishing()

                        L.info("!!!!  credential SAVED as MANUAL before logged in")
                        await report.setResult(url, EReportTest.fill, EReportResult.waitApprove)
                        await report.setResult(url, test, EReportResult.manualBeforeLoggedIn)
                    } catch (e) {
                        if (e as UnsupportedOperationError) {
                            L.debug("engine process before login not supported")
                            await api.goToNext(
                                engine,
                                test,
                                "login",
                                loginForm,
                                loginForm.passwordInput,
                                useOnlyEnterButton
                            )
                            return Promise.resolve(ECheck.nextStep)
                        }

                        L.debug("engine process before login is failed")
                        L.info("!!!!  credential FAILED SAVE as MANUAL before logged in")
                        await report.setFail(url, test,
                            `credential fail save before logged in with: ${failMessage(e)}`)
                    }
                    return Promise.resolve(ECheck.break)
                },

                /************************************************************************/
                async function (
                    isLoggedIn: boolean | undefined,
                    test: EReportTest
                ): Promise<void> {
                    try {
                        L.debug("try engine process after login")

                        await engine.processAfterPressLoginButton(false)

                        L.info("!!!!  credential SAVED as MANUAL after logged in")
                        await report.setResult(url, EReportTest.fill, EReportResult.waitApprove)
                        await report.setResult(url, test, EReportResult.manualAfterLoggedIn)

                        return Promise.resolve()
                    } catch (e) {
                        if (!(e instanceof UnsupportedOperationError)) {

                            L.debug("engine process after login is failed")
                            L.info("!!!!  credential FAILED SAVE as MANUAL after logged in")
                            await report.setFail(
                                url, test,
                                `credential fail save after logged in with: ${failMessage(e)}`)
                            return Promise.resolve()
                        }
                    }

                    try {
                        L.debug("try engine check saved")

                        await engine.checkSaved(url, credential)

                        L.info("!!!!  credential SAVED as AUTO after logged in")
                        await report.setResult(url, test, EReportResult.auto)
                    } catch (e) {
                        if (e instanceof UnsupportedOperationError) {
                            L.debug("engine check saved not supported")

                            L.info("!!!! credential MAYBE SAVED as auto after logged in")
                            await report.setResult(url, test, EReportResult.waitApprove)
                        } else {
                            L.debug("engine process after login is failed")
                            L.info("!!!!  credential FAILED SAVE as AUTO after logged in")
                            await report.setFail(
                                url,
                                test,
                                `credential fail autosave: ${failMessage(e)}`)
                        }
                    }

                    return Promise.resolve()
                })
        } catch (e) {
            L.error("ERROR", e)
        }
        return Promise.resolve()
    }

    protected async checkFailWriteCredential(
        engine: IEngine,
        credential: ICredential,
        options: { useOnlyEnterButton: boolean } | undefined = undefined
    ): Promise<void> {
        L.info("checkFailWriteCredential")

        let url = credential.url
        let useOnlyEnterButton = false
        if (options !== undefined) {
            if (options as { useOnlyEnterButton: boolean }) {
                useOnlyEnterButton =
                    (<{ useOnlyEnterButton: boolean }>options).useOnlyEnterButton
            }
        }

        let report = this.report
        let isFormFilled = false

        let tDef = useOnlyEnterButton
            ? EReportTest.falseSaveWithoutButtons
            : EReportTest.falseSaveUsingButtons

        try {
            let api = this
            await this.checkCredentialFor(
                tDef,
                engine,
                credential,

                /************************************************************************/
                async function (
                    loginForm: LoginForm,
                    test: EReportTest
                ): Promise<ECheck> {
                    // if (loginForm.loginInput == null || loginForm.passwordInput == null) {
                    //     return Promise.reject()
                    // }

                    await loginForm!.loginInput!.enterValue(credential.login)
                    await loginForm!.passwordInput!.enterValue(credential.password)
                    return Promise.resolve(ECheck.nextStep)
                },

                /************************************************************************/
                async function (
                    loginForm: LoginForm,
                    test: EReportTest
                ): Promise<ECheck> {
                    //if (loginForm.loginInput === undefined) return Promise.reject()
                    await loginForm!.loginInput!.enterValue(credential.login)
                    await api.goToNext(
                        engine,
                        test,
                        "login-1",
                        loginForm,
                        loginForm.loginInput,
                        useOnlyEnterButton
                    )
                    return Promise.resolve(ECheck.nextStep)
                },

                /************************************************************************/
                async function (
                    loginForm: LoginForm,
                    test: EReportTest
                ): Promise<ECheck> {
                    // if (loginForm.passwordInput === undefined) return Promise.reject()
                    await loginForm!.passwordInput!.enterValue(credential.password)
                    return Promise.resolve(ECheck.nextStep)
                },

                /************************************************************************/
                async function (
                    loginForm: LoginForm,
                    test: EReportTest
                ): Promise<ECheck> {
                    try {
                        L.debug("try engine process before login")

                        await engine.processLoginFinishing()

                        L.info("!!!!  credential SAVED as MANUAL before logged in")
                        await report.setResult(url, EReportTest.fill, EReportResult.waitApprove)
                        await report.setResult(url, test, EReportResult.manualBeforeLoggedIn)
                    } catch (e) {
                        if (e as UnsupportedOperationError) {
                            L.debug("engine process before login not supported")
                            await api.goToNext(
                                engine,
                                test,
                                "login",
                                loginForm,
                                loginForm.passwordInput,
                                useOnlyEnterButton
                            )
                            return Promise.resolve(ECheck.nextStep)
                        }

                        L.debug("engine process before login is failed")
                        L.info("!!!!  credential FAILED SAVE as MANUAL before logged in")
                        await report.setFail(url, test,
                            `credential fail save before logged in with: ${failMessage(e)}`)
                    }

                    return Promise.resolve(ECheck.break)
                },

                /************************************************************************/
                async function (
                    isLoggedIn: boolean | undefined,
                    test: EReportTest
                ): Promise<void> {
                    L.debug(`finish with isLoggedIn: ${isLoggedIn}`)
                    try {
                        L.debug("try engine process after login")
                        let reason: string = ""

                        if (await engine.processAfterPressLoginButton(true)) {
                           reason = "!!!! ERROR: Wrong credentials were queried to" +
                               " SAVED as MANUAL just after login button pressing"

                            await report.setFail(
                                url,
                                test,
                                reason,
                                EReportResult.auto // wrong credentials were saved
                                                   // automatically
                            )
                            return Promise.resolve()
                        }

                        if (isLoggedIn) {
                            L.warn("Unexpected 'logged in' (or undetected 'logged out') state was detected!")
                        }

                        await report.setResult(url, EReportTest.fill, EReportResult.waitApprove)
                        await report.setResult(url, test, EReportResult.manualAfterLoggedIn)

                        return Promise.resolve()
                    } catch (e) {
                        if (e !instanceof UnsupportedOperationError) {
                            L.debug("engine process after login is failed")
                            L.info("!!!!  credential FAILED SAVE as MANUAL after logged in")
                            await report.setFail(url, test,
                                `Wrong credential fail save after logged in with: ${failMessage(e)}`)
                            return Promise.resolve()
                        }
                    }

                    try {
                        L.debug("Try engine check saved")

                        await engine.checkSaved(credential.url, credential)

                        L.debug("Engine process after login (wrong saved login) is failed")

                        let reason = "Wrong credentials were AUTO SAVED after logged in"
                        L.warn(reason)

                        await report.setFail(
                            url,
                            test,
                            reason,
                            EReportResult.auto // wrong credentials were saved
                            // automatically
                        )
                    } catch (e) {
                        if (e instanceof UnsupportedOperationError) {
                            L.debug("engine engine check saved not supported")

                            L.info("!!!! Wrong credentials MAYBE were AUTO SAVED after logged in")
                            //await report.setResult(credential.url, test, EReportResult.waitApprove)
                            await report.setFail(url, test,
                                `Login form was hidden after wrong credentials typing`)
                        } else {
                            L.debug("Engine process after login is failed")
                            L.info("SUCCESS!  AUTO SAVING of wrong credentials was failed")
                            await report.setResult(url, test, EReportResult.fail)
                        }
                    }
                    return Promise.resolve()
                })
        } catch (e) {
            if (isFormFilled) {
                await report.setResult(url, tDef, EReportResult.auto)
            } else {
                await report.setFail(url, tDef,
                    `false positive logged in state is detected with ${failMessage(e)}`
                )
                throw e
            }
        }

        return Promise.resolve()
    }


    protected async checkReadCredential(
        engine: IEngine,
        credential: ICredential): Promise<void> {

        L.info("checkReadCredential")

        let report = this.report
        let url = credential.url
        let api = this

        await this.checkCredentialFor(
            EReportTest.fill,
            engine,
            credential,

            /****************************************************************************/
            async function (
                loginForm: LoginForm,
                test: EReportTest
            ): Promise<ECheck> {
                // if (loginForm.loginInput === undefined || loginForm.passwordInput === undefined) {
                //     return Promise.reject()
                // }

                //TODO: add check manual fill
                L.debug("check auto fill login and password inputs")
                let login = await loginForm!.loginInput!.getInputValue()
                let password = await loginForm!.passwordInput!.getInputValue()
                if (login === credential.login && password === credential.password) {
                    L.debug("!!!!  credential AUTO LOAD")
                    await report.setResult(url, test, EReportResult.auto)
                } else {
                    L.debug("credential AUTO LOAD failed")
                    L.trace(`  real login: '${credential.login}'  stored: '${login}'`)
                    L.trace(`  real password: '${credential.password}'  stored: '${password}'`)
                    await report.setFail(url, test, "login and/or password is not equal with ")
                }
                return Promise.resolve(ECheck.break)
            },

            /****************************************************************************/
            async function (
                loginForm: LoginForm,
                test: EReportTest
            ): Promise<ECheck> {

                //if (loginForm.loginInput === undefined) return Promise.reject()

                //TODO: add check manual fill
                L.debug("check auto fill login input")
                let login = await loginForm!.loginInput!.getInputValue()
                if (login !== credential.login) {

                    L.debug("credential AUTO LOAD failed")
                    L.trace(`  real login: '${credential.login}'  stored: '${login}'`)
                    await report.setFail(url, test, "login is not equal with ")
                    return Promise.resolve(ECheck.break)
                }

                await api.goToNext(
                    engine,
                    test,
                    "login-1",
                    loginForm,
                    loginForm.loginInput,
                    false
                )

                return Promise.resolve(ECheck.nextStep)
            },

            /****************************************************************************/
            async function (
                loginForm: LoginForm,
                test: EReportTest
            ): Promise<ECheck> {
                //if (loginForm.passwordInput === undefined) return Promise.reject()

                //TODO: add check manual fill
                L.debug("check auto fill password input")
                let password = await loginForm!.passwordInput!.getInputValue()
                if (password === credential.password) {
                    L.debug("!!!!  credential AUTO LOAD")
                    await report.setResult(url, test, EReportResult.auto)
                } else {
                    L.debug("credential AUTO LOAD failed")
                    L.trace(`  real password: '${credential.password}'  stored: '${password}'`)
                    await report.setFail(url, test, "password is not equal with ")
                }
                return Promise.resolve(ECheck.break)
            },

            /****************************************************************************/
            async function (
                loginForm: LoginForm,
                test: EReportTest
            ): Promise<ECheck> {
                return Promise.resolve(ECheck.break)
            },

            /****************************************************************************/
            async function (
                isLoggedIn: boolean | undefined,
                test: EReportTest
            ): Promise<void> {
                return Promise.resolve()
            })

        return Promise.resolve()
    }

    protected async checkCredentialFor(
        test: EReportTest,
        engine: IEngine,
        credential: ICredential,
        hasFullLoginForm: ((loginForm: LoginForm, test: EReportTest) => Promise<ECheck>),
        hasFirstStepLoginForm: ((loginForm: LoginForm, test: EReportTest) => Promise<ECheck>),
        hasSecondStepLoginForm: ((loginForm: LoginForm, test: EReportTest) => Promise<ECheck>),
        afterLoginFormFilling: ((loginForm: LoginForm, test: EReportTest) => Promise<ECheck>),
        done: ((isLoggedIn: boolean | undefined, test: EReportTest) => Promise<void>)
    ): Promise<void> {
        L.info("checkCredentialFor")

        let url = credential.url
        let driver = await engine.getDriver()
        let extDriver = await engine.getExtDriver()
        let parser = new Parser(engine)
        var reason: string = ""

        L.debug(`open new tab with: ${url}`)
        await extDriver.openUrlOnNewTab(url)

        try {
            if (test === EReportTest.fill) {
                L.trace('wait 500ms')
                await driver.sleep(500)
            }

            var state = EState.init
            var startTime = Date.now()

            while (true) {
                try {
                    L.debug("parse page")
                    let page = await parser.parsePage(
                        credential.timeout,
                        state === EState.done
                    )

                    await this.report.setTimer(url, test, ETimer.parser, page.duration)
                    if (page.error != null) {
                        L.warn(`parsing error: ${page.error}`)
                        await this.report.setFail(
                            url,
                            test,
                            failMessage(page.error),
                            EReportResult.skip
                        )
                        return Promise.reject(page.error)
                    }

                    L.debug("Check page structure")

                    let hasLoginForm = (page.loginForm != null)
                    let hasLoginInput = (hasLoginForm && page.loginForm!.loginInput != null)
                    let hasPassInput = (hasLoginForm && page.loginForm!.passwordInput != null)

                    /** init state **********************************************************/
                    if (state === EState.init) {
                        L.debug("* INIT state *")
                        if (hasLoginForm) {
                            if (hasLoginInput) {
                                state = EState.waitLoginForm
                            } else if (hasPassInput) {
                                reason = "Found login form only with a password input " +
                                    "at the first step (init state)"
                                await this.report.setFail(url, test, reason)
                                return Promise.reject(reason)
                            }
                        } else if (page.signinButton != null) {
                            L.debug("Page has a signin button and doesn't have a login form")

                            await this.report.setParsePart(
                                url,
                                test,
                                EReportParsePart.signInButton
                            )

                            L.info("Click Signin/Menu button")
                            await page.signinButton.press(
                                engine,
                                test,
                                "click-menu_signin-button",
                                true
                            )
                            await driver.sleep(500)

                            // Re-parse the page
                            startTime = Date.now()
                            continue
                        } else {
                            if (Date.now() - startTime < 15000) {
                                continue
                            } else {
                                reason = '"Menu"/"Sign in" button was not found'
                                await this.report.setFail(url, test, reason)
                                return Promise.reject(reason)
                            }
                        }
                    }

                    /** waitLoginForm state *************************************************/
                    if (state === EState.waitLoginForm) {
                        L.debug("* WAIT-LOGIN-FORM state *")
                        if (hasLoginForm) {
                            if (hasLoginInput && hasPassInput) {
                                L.debug("Login form has login and password inputs")
                                await this.report.setParsePart(
                                    url,
                                    test,
                                    EReportParsePart.fullLoginForm
                                )

                                if (
                                    await hasFullLoginForm(
                                        page.loginForm!,
                                        test
                                    ) == ECheck.break
                                ) {
                                    break
                                }

                                if (
                                    await afterLoginFormFilling(
                                        page.loginForm!,
                                        test
                                    ) == ECheck.break
                                ) {
                                    break
                                }

                                state = EState.done
                                await driver.sleep(1000)
                                continue

                            } else if (hasLoginInput) {
                                L.debug("Login form has only login input (step 1)")
                                await this.report.setParsePart(
                                    url,
                                    test,
                                    EReportParsePart.firstStepLoginForm
                                )

                                if (
                                    await hasFirstStepLoginForm(
                                        page.loginForm!,
                                        test
                                    ) == ECheck.break
                                ) {
                                    break
                                }

                                state = EState.waitSecondLoginForm
                                await driver.sleep(500)
                                startTime = Date.now()
                                continue
                            } else if (hasPassInput) {
                                reason = "Found login form only with a password input " +
                                    "at the first step (waitLoginForm state)"
                                await this.report.setFail(url, test, reason)
                                return Promise.reject(reason)
                            }
                        } else {
                            if (Date.now() - startTime < 15000) {
                                continue
                            } else {
                                reason = "Login form was hidden"
                                await this.report.setFail(url, test, reason)
                                return Promise.reject(reason)
                            }
                        }
                    }

                    /** waitSecondLoginForm state *******************************************/
                    if (state === EState.waitSecondLoginForm) {
                        L.debug("* WAIT-SECOND-STEP-LOGIN-FORM state *")
                        if (hasLoginForm) {
                            if (hasLoginInput && hasPassInput) {
                                L.debug("Login form has login and password inputs (step 2)")

                                await this.report.setParsePart(
                                    url,
                                    test,
                                    EReportParsePart.fullLoginForm
                                )

                                if (
                                    await hasFullLoginForm(
                                        page.loginForm!,
                                        test
                                    ) == ECheck.break
                                ) {
                                    break
                                }

                                if (
                                    await afterLoginFormFilling(
                                        page.loginForm!,
                                        test
                                    ) == ECheck.break
                                ) {
                                    break
                                }
                            }
                            if (hasLoginInput) {
                                if (
                                    test === EReportTest.falseSaveUsingButtons ||
                                    test === EReportTest.falseSaveWithoutButtons
                                ) {
                                    L.debug("login form with one login input was found." +
                                        " It's Ok for falseSave tests")
                                    state = EState.done
                                } else {
                                    reason = "Login form with a login input at " +
                                        "the second step has been found (waitSecondLoginForm state)"
                                    await this.report.setFail(url, test, reason)
                                    return Promise.reject(reason)
                                }
                            } else if (hasPassInput) {
                                L.debug("Login form has only password input (step 2)")

                                await this.report.setParsePart(
                                    url,
                                    test,
                                    EReportParsePart.secondStepLoginForm
                                )

                                if (
                                    await hasSecondStepLoginForm(
                                        page.loginForm!,
                                        test
                                    ) == ECheck.break
                                ) {
                                    break
                                }

                                if (
                                    await afterLoginFormFilling(
                                        page.loginForm!,
                                        test
                                    ) == ECheck.break
                                ) {
                                    break
                                }

                                state = EState.done
                                await driver.sleep(1000)
                                continue
                            }
                        } else {
                            if (Date.now() - startTime < 15000) {
                                continue
                            } else {
                                reason = "Second step Login form was hidden"
                                await this.report.setFail(url, test, reason)
                                return Promise.reject(reason)
                            }
                        }
                    }

                    /** done state *************************************************/
                    if (state === EState.done) {
                        L.debug("* DONE State: Finish form parsing *")

                        let repParsePart: EReportParsePart

                        if (page.isLoggedIn != null) {
                            if (page.isLoggedIn) {
                                repParsePart = EReportParsePart.loggedIn
                            } else {
                                repParsePart = EReportParsePart.noLoggedIn
                            }
                            await this.report.setParsePart(url, test, repParsePart)
                        }

                        // save screenshot here
                        await engine.writeScreenshot(test, "done")

                        await done(page.isLoggedIn, test)
                    }

                    break
                } catch (e) {
                    L.error('checkCredentialFor error', e)

                    await engine.writeScreenshot( test,
                        `error-${("" + (e || "unknown")).split(':')[0]}`
                    )

                    if (e instanceof ElementNotInteractableError) {
                       state = EState.init
                       continue
                    }

                    await this.report.setFail(url, test, failMessage(e))
                    return Promise.reject(e)
                }
            }
        } finally {
            L.debug("close current tab")
            await extDriver.closeCurrentTab()
        }

        return Promise.resolve()
    }
}
