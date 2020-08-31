import {IEngineFactory} from './engine/engine'
import {ConfigureLoggerForDebug, ConfigureLoggerForRelease, extLogFolder, testerLogger as L} from "./common/log.config"
import {ICredentialsFactory} from "./credentials/credentials"
import {Report, ReportExport} from "./report/report"
import {KeyReelEngineFactory} from './engine/keyreel'
import {CredentialsFactoryPassDB} from "./credentials/credentialsFactoryPassDB"
import {CredentialsFactoryDebug} from "./credentials/credentialsFactoryDebug"
import {CredentialsFactorDomains} from "./credentials/credentialsFactoryDomains"
import {TestAPI} from "./core/testapi"
import {Args} from "./common/args"
import {ReportExportLogger} from "./report/reportExportLogger"
import {ReportExportTxt} from "./report/reportExportTxt"
//import {DashlaneEngine} from "./engine/dashlane"
import {DashlaneEngineFactory} from "./engine/dashlane"
import fs from "fs";
import dateFormat from "dateformat";


//TODO: add export report from .json file to .txt/.csv/ etc files with format
//        --txt, --csv  -  formats
//        --flags print flags
//        --withoutTimes
//TODO: add test for negative save with ded credential
//TODO: add separates logs for credential


let timeFormat = function(d: Date): string {
    return `${d.getUTCFullYear()}.${d.getUTCMonth()}.${d.getUTCDate()}.${d.getUTCHours()}.${d.getUTCMinutes()}.${d.getUTCSeconds()}`
}


class Tester {

    static DumpFolderPath = "./dumps/"
    static ReportsFolderPath = "./reports/"


    public static async run(args: string[]) {

        L.debug(`${args}`)

        let debug = Args.parseArg(args, "debug")
        let toContinue = Args.parseArg(args, "continue")

        let domainDB = Args.parseArg(args, "--domains")                     // || true
        let saveDisable = Args.parseArg(args, "--withoutSave")              // || true
        let failSaveDisable = Args.parseArg(args, "--withoutFailSave")      // || true
        let fillDisable = Args.parseArg(args, "--withoutFill")              // || true
        let useVpn = Args.parseArg(args, "--vpn")                           // || true
        let recheckErrors = Args.parseArg(args, "--errors")                 || true
        let recheckWarnings = Args.parseArg(args, "--warnings")             || true

        let testsCount = Args.parseNumValueArg(args, "--tests", 0)
        let threadsCount = Args.parseNumValueArg(args, "--threads", 1)
        let engineName = Args.parseStrValueArg(args, "--engine", "keyreel") as string

        if (debug) {
            ConfigureLoggerForDebug()
        } else {
            ConfigureLoggerForRelease()
        }

        L.debug(`args:`)
        L.debug(`  debug: ${debug}`)
        L.debug(`  continue: ${toContinue}`)
        L.debug(`  domainDB: ${domainDB}`)
        L.debug(`  writeDisable: ${saveDisable}`)
        L.debug(`  failWriteDisable: ${failSaveDisable}`)
        L.debug(`  fillDisable: ${fillDisable}`)
        L.debug(`  useVpn: ${useVpn}`)
        L.debug(`  recheckErrors: ${recheckErrors}`)
        L.debug(`  recheckWarnings: ${recheckWarnings}`)
        L.debug(`  testsCount: ${testsCount}`)
        L.debug(`  threadsCount: ${threadsCount}`)
        L.debug(`  engine: ${engineName}`)

        if (!fs.existsSync(Tester.DumpFolderPath)) {
            fs.mkdirSync(Tester.DumpFolderPath)
        }

        if (!fs.existsSync(Tester.ReportsFolderPath)) {
            fs.mkdirSync(Tester.ReportsFolderPath)
        }

        try {
            let credentialsFactory: ICredentialsFactory
            if (domainDB) {
                credentialsFactory = new CredentialsFactorDomains(debug)
            } else if (debug) {
                credentialsFactory = new CredentialsFactoryDebug()
            } else {
                credentialsFactory = new CredentialsFactoryPassDB()
            }

            let dumpFilePath = `${Tester.DumpFolderPath}tester.${engineName}.dump.json`
            let reportFilePath: string | undefined = `${Tester.ReportsFolderPath}tester-${timeFormat(new Date())}.${engineName}.json`
            if (debug) {
                dumpFilePath = `${Tester.DumpFolderPath}tester-debug.${engineName}.dump.json`
                reportFilePath = undefined
            }
            let report = new Report(engineName, dumpFilePath, reportFilePath, toContinue)

            let engineFactory: IEngineFactory
            if (engineName === "keyreel") {
                engineFactory = new KeyReelEngineFactory({withoutProfile: true})
            } else if (engineName === "dashlane") {
                engineFactory = new DashlaneEngineFactory({ withoutProfile: true })
            } else /* by default use KeyReel engine*/ {
                engineFactory = new KeyReelEngineFactory({ withoutProfile: true })
            }

            L.debug("startup report")
            await report.startup(toContinue)

            let test = new TestAPI(
                report,
                engineFactory,
                credentialsFactory,
                threadsCount,
                testsCount,
                useVpn,
                recheckErrors,
                recheckWarnings)

            if (!saveDisable) {
                L.debug("testing save")
                await test.checkWrites(false)

                L.debug("testing save without click on buttons")
                await test.checkWrites(true)
            }

            if (!failSaveDisable) {
                L.debug("testing fail save")
                await test.checkFailWrites(false)

                L.debug("testing fail save without click on buttons")
                await test.checkFailWrites(true)
            }

            if (!fillDisable) {
                L.debug("testing fill")
                await test.checkFills()
            }

            L.debug("shutdown report")
            await report.shutdown()

            let reportExport: ReportExport
            if (debug) {
                reportExport = new ReportExportLogger(dumpFilePath)
            } else {
                let reportTxtFilePath = `${Tester.ReportsFolderPath}tester-${timeFormat(new Date())}.${engineName}.txt`
                reportExport = new ReportExportTxt(dumpFilePath, reportTxtFilePath)
            }
            await reportExport.export()
        }
        catch (e) {
            L.warn(`testing fail with: ${e}`)
            return Promise.reject(e)
        }

        return Promise.resolve()
    }
}


Tester.run(process.argv)
    .then(() => {
    })
    .catch(e => {
        L.warn(`tester error: ${e}`)
    })

