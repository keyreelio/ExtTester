import {Engine} from './engine'
import {keyreelEngineLogger as L} from "../common/log.config";


// export class KeyReelEngine extends Engine {
//     public async startup(): Promise<WebDriver> {
//         let options = new chrome.Options();
//         options.addArguments("user-data-dir=./chrome_profiles/keyreel");
//         let crx = fs.readFileSync('./resources/crxs/keyreel.crx', {encoding: "base64"});
//         options.addExtensions(crx);
//
//         let driver = await this.createDriver(options);
//
//         await driver.sleep(1000);
//
//         return Promise.resolve(driver);
//     }
// }

