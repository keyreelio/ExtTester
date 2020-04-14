

export interface ICredential {
    url: string;
    login: string;
    password: string;
    timeout: number;
}

export class Credentials {
    static credentials: Array<ICredential> = Array(
        {
            url: "https://twitter.com/login",
            login: "hdayfg6wq5sq@gmail.com",
            password: "5lKZfBc@L^PG",
            timeout: 2000
        },
        {
            url: "https://appstoreconnect.apple.com/login",
            login: "hdayfg6wq5sq@gmail.com",
            password: "cYZ6HcG2Z7xd2t5DazXc",
            timeout: 5000
        },
    );

    public static all(): Array<ICredential> {
        return this.credentials;
    }
}

