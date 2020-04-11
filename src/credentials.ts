

export interface ICredential {
    url: string;
    login: string;
    password: string;
}

export class Credentials {
    static credentials: Array<ICredential> = Array(
        {
            url: "https://twitter.com/login",
            login: "hdayfg6wq5sq@gmail.com",
            password: "5lKZfBc@L^PG"
        },
        // {
        //     url: "https://appstoreconnect.apple.com/login",
        //     login: "hdayfg6wq5sq@gmail.com",
        //     password: "cYZ6HcG2Z7xd2t5DazXc"
        // },
        // {
        //     url: "https://secure1.store.apple.com/shop/sign_in",
        //     login: "hdayfg6wq5sq@gmail.com",
        //     password: "cYZ6HcG2Z7xd2t5DazXc"
        // },
    );

    public static all(): Array<ICredential> {
        return this.credentials;
    }
}

