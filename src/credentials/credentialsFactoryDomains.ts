import {Credentials, ICredential, ICredentialsFactory} from "./credentials";
import fs from "fs";

export class CredentialsFactorDomains implements ICredentialsFactory {

    items: Array<ICredential> = new Array<ICredential>();


    public constructor() {
        this.loadFromDomains();
    }

    public credentials(): Credentials {
        return new Credentials(Array.from(this.items));
    }

    protected loadFromDomains() {
        let items = this.items;

        let domainsFile = './resources/domains.json';
        let domains = JSON.parse(fs.readFileSync(domainsFile, {encoding: 'utf8'}));
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