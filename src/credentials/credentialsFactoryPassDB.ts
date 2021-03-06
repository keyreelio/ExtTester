import {Credentials, ICredential, ICredentialsFactory} from "./credentials";
import {passdb} from "../common/passdb";

export class CredentialsFactoryPassDB implements ICredentialsFactory {

    items: Array<ICredential> = new Array<ICredential>();


    public constructor() {
        this.loadFromPassDB();
    }

    public credentials(testsCount: number): Credentials {
        let credentials = Array.from(this.items)
        if (testsCount > 0) {
            credentials = credentials.slice(0, testsCount)
        }
        return new Credentials(credentials)
    }

    protected loadFromPassDB() {
        let items = this.items;

        let parse = function(sites: any) {
            if (sites === undefined) return;
            let map = new Map(Object.entries(sites));
            if (map === undefined) return;
            map.forEach(function (accounts: any, url: string) {
                let account = accounts[0];
                if (account === undefined) return;
                let login = account.login;
                let password = account.password;
                let u = new URL(`http://${url}`);

                items.push({
                    url: u.toString(),
                    login: login === undefined ? "" : login,
                    password: password === undefined ? "" : password,
                    timeout: 2000,
                    comment: undefined,
                    vpn: false,
                    skip: false
                });
            });
        }

        parse(passdb["0"]);
        parse(passdb["1"]);
        parse(passdb["2"]);
    }
}