import {passdb} from "./common/passdb";


export interface ICredential {
    url: string;
    login: string;
    password: string;
    timeout: number;
}

export class Credentials {
    credentials: Array<ICredential> = Array(
        {
            url: "https://dashboard.devmate.com/",
            login: "petro@auxoft.com",
            password: "K8yb1g6iw5f7GK238lHk",
            timeout: 2000
        },
        {// DONT work before parser update and need create account
            url: "https://www.dropbox.com/",
            login: "donna.simple.oluso@gmail.com",
            password: "CWxm66RzW3cNnGjKMHz2",
            timeout: 2000
        },
        {// need create account
            url: "https://www.facebook.com/",
            login: "donna.simple.oluso@gmail.com",
            password: "0dWX6iaRuRz9377PW45d",
            timeout: 2000
        },
        {// need fix url after parser update and create account
            url: "https://signin.ebay.com/ws/eBayISAPI.dll?SignIn&ru=https%3A%2F%2Fwww.ebay.com%2F",
            login: "donna.simple.oluso@gmail.com",
            password: "harJvjwNpMU2CRDPC8bx",
            timeout: 2000
        },
        {// need fix url after parser update and create account
            url: "https://accounts.craigslist.org/login?rt=L&rp=%2Flogin%2Fhome",
            login: "donna.simple.oluso@gmail.com",
            password: "Zh9XR36svufnwW7b6Znp",
            timeout: 2000
        },
        {// need fix url after parser update and create account
            url: "https://account.bbc.com/signin?context=homepage&ptrt=https%3A%2F%2Fwww.bbc.com%2F&userOrigin=HOMEPAGE_GNL&realm=&isCasso=false&action=sign-in&redirectUri=https%3A%2F%2Fsession.bbc.com%2Fsession%2Fcallback&service=IdSignInService&nonce=FwxbUkzk-2RMH0KvY_KXOaD3TusICWGI0KPU",
            login: "donna.simple.oluso@gmail.com",
            password: "DLWuzu73ahEZcYt4v5zf",
            timeout: 2000
        },
        {// need fix url after parser update and create account
            url: "https://www.amazon.com/ap/signin?_encoding=UTF8&ignoreAuthState=1&openid.assoc_handle=usflex&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.mode=checkid_setup&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.ns.pape=http%3A%2F%2Fspecs.openid.net%2Fextensions%2Fpape%2F1.0&openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.com%2F%3Fref_%3Dnav_custrec_signin&switch_account=",
            login: "donna.simple.oluso@gmail.com",
            password: "jwLLD99KHKGvd2eTpGxK",
            timeout: 2000
        },
        {// need fix url after parser update
            url: "https://twitter.com/login",
            login: "hdayfg6wq5sq@gmail.com",
            password: "5lKZfBc@L^PG",
            timeout: 2000
        },
        {// need fix url after parser update
            url: "https://appstoreconnect.apple.com/login",
            login: "hdayfg6wq5sq@gmail.com",
            password: "cYZ6HcG2Z7xd2t5DazXc",
            timeout: 5000
        },

        {// DONT work - need create account
            url: "https://auth.services.adobe.com/en_US/index.html#/",
            login: "donna.simple.oluso@gmail.com",
            password: "h+58t7WDXd6$Hp?$yrPS",
            timeout: 2000
        },
        {// DONT work before parser update and need create account
            url: "https://www.espn.com/",
            login: "donna.simple.oluso@gmail.com",
            password: "9v23c2TXXyCWHYdV377K",
            timeout: 2000
        },
    );

    public loadFromPassDB() {
        this.credentials = new Array<ICredential>();
        let credentials = this.credentials;

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

                credentials.push({
                    url: u.toString(),
                    login: login === undefined ? "" : login,
                    password: password === undefined ? "" : password,
                    timeout: 2000
                });
            });
        }

        parse(passdb["0"]);
        parse(passdb["1"]);
        parse(passdb["2"]);
    }

    public all(): Array<ICredential> {
        return this.credentials;
    }

    public dump() {
        for (let cred of (this.credentials as Array<ICredential>)) {
            console.log(`${cred.url}`);
            console.log(`  ${cred.login}  ${cred.password}`);
        }
    }
}

