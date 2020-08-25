import {Credentials, ICredential, ICredentialsFactory} from "./credentials"
import fs from "fs"

export class CredentialsFactorDomains implements ICredentialsFactory {

    items: Array<ICredential> = new Array<ICredential>()


    public constructor() {
        this.loadFromDomains()
    }

    public credentials(testsCount: number): Credentials {
        let credentials = Array.from(this.items)
        if (testsCount > 0) {
            credentials = credentials.slice(0, testsCount)
        }
        return new Credentials(credentials)
    }

    protected loadFromDomains() {
        let items = this.items
        let domainsFile = './resources/domains.json'

        let domains = JSON.parse(
            fs.readFileSync(domainsFile, {encoding: 'utf8'})
        )

        let skip = false
        domains.forEach(function (url: string) {
            if (skip) {
                return;
            } else if (url[0] === "#" && url[1] === "#") {
                // skip comment
                if (url === "###---CONTINUE-FROM-HERE---###") {
                    skip = true;
                }
                return;
            } else if (url[0] === "#") {
                // skip commented
                return;
            }

            let urlParts = url.split(/[^\S]#/)
            url = urlParts[0].trim()

            let comment = undefined
            if (urlParts.length > 1) {
                comment = urlParts[1].trim()
                if (comment.startsWith("redirected: ")) {
                    let part = comment.split(";")
                    if (part.length > 1) {
                        comment = part[1].trim()
                    } else {
                        comment = undefined
                    }
                }
            }

            if (url !== undefined && url.length > 0) {
                items.push({
                    url: url.startsWith("http") ? url : `https://${url}`,
                    login: "d@gamil.ua",
                    password: "P1a2S3s5",
                    timeout: 2000,
                    comment: comment,
                    vpn: comment !== undefined && comment.includes("[VPN]"),
                    skip: comment !== undefined && comment.includes("[SKIP]")
                })
            }
        })
    }
}
