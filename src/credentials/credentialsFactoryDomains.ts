import {Credentials, ICredential, ICredentialsFactory} from "./credentials";
import fs from "fs";

export class CredentialsFactorDomains implements ICredentialsFactory {

    items: Array<ICredential> = new Array<ICredential>();


    public constructor(debug: Boolean = false) {
        this.loadFromDomains(debug);
    }

    public credentials(): Credentials {
        return new Credentials(Array.from(this.items));
    }

    protected loadFromDomains(debug: Boolean = false) {
        let items = this.items;
        let domainsFile: string;
        if (debug) {
          domainsFile = './resources/test-domains.json';
        } else {
          domainsFile = './resources/good.json';
          //domainsFile = './resources/domains.json';
        }

        let domains = JSON.parse(
            fs.readFileSync(domainsFile, {encoding: 'utf8'})
        ).map( (str: string) => {
            // use '#' as a comment (e.g. '#apple.com': skip apple.com)
            return str.split('#')[0].trim()
        }).filter( (str: string) => str.length > 0 );

        if (domains !== undefined) {
            for (let domain of domains) {
                let u = new URL(`http://${domain}`);
                items.push({
                    url: u.toString(),
                    login: "login@gamil.com",
                    password: "P1a2S3s5W8o9R0d",
                    timeout: 2000
                });
            }
        }
    }
}
