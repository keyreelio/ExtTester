import {Engine} from './engine'
import {lastpassEngineLogger as L} from "../common/log.config";


// export class LastPassEngine extends Engine {
//
//     public async startup(): Promise<WebDriver> {
//         let options = new chrome.Options();
//         options.addArguments("user-data-dir=./chrome_profiles/lastpass");
//         let crx = fs.readFileSync('./resources/crxs/lastpass.crx', {encoding: "base64"});
//         options.addExtensions(crx);
//         let krcrx = fs.readFileSync('./resources/crxs/keyreel.crx', {encoding: "base64"});
//         options.addExtensions(krcrx);
//
//         let driver = await this.createDriver(options);
//
//         await driver.sleep(1000);
//
//         await driver.get('chrome-extension://hdokiejnpimakedhajhdlcegeplioahd/extensionLogin.html');
//         try {
//             await driver.wait(until.urlContains("/extensionLogin.html"), 1000);
//             await driver.wait(until.elementLocated(By.id("loginDialogEmail")), 1000);
//
//             await driver.findElement(By.id("loginDialogEmail")).sendKeys("hdayfg6wq5sq@gmail.com");
//             await driver.findElement(By.id("loginDialogPassword")).sendKeys("QL=25LXd%NT2ca5");
//             await driver.findElement(By.id("logInButton")).click();
//         } catch (UnhandledPromiseRejectionWarning) {
//         }
//
//         //TODO: wait logged state
//
//         await driver.sleep(1000);
//
//         return Promise.resolve(driver);
//     }
// }
