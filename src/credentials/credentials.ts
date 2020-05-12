import {passdb} from "../common/passdb";
import {Mutex} from "../common/mutex";


export interface ICredentialsFactory {
    credentials(): Credentials;
}

export interface ICredential {
    url: string;
    login: string;
    password: string;
    timeout: number;
}

export class Credentials {

    protected credentials: Array<ICredential>;
    protected mutex = new Mutex();


    public constructor(credentials: Array<ICredential>) {
        this.credentials = credentials;
    }

    public async shift(): Promise<ICredential | undefined> {
        return await this.mutex.dispatch(async () => {
            return this.credentials.shift();
        });
    }
}

