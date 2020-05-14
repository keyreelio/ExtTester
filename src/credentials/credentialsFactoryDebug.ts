import {Credentials, ICredential, ICredentialsFactory} from "./credentials";


export class CredentialsFactoryDebug implements ICredentialsFactory {

    items: Array<ICredential> = Array(
        {
            url: "https://paypal.com/",
            login: "donna.simple.oluso@gmail.com",
            password: "g8MYA5wnLx8AfBKz3F5v",
            timeout: 2000
        },
        // {
        //     url: "https://www.dropbox.com/",
        //     login: "donna.simple.oluso@gmail.com",
        //     password: "CWxm66RzW3cNnGjKMHz2",
        //     timeout: 2000
        // },
        // {
        //     url: "https://twitter.com/login",
        //     login: "hdayfg6wq5sq@gmail.com",
        //     password: "5lKZfBc@L^PG",
        //     timeout: 2000
        // },
        // {
        //     url: "https://adobe.com/",
        //     login: "donna.simple.oluso@gmail.com",
        //     password: "h+58t7WDXd6$Hp?$yrPS",
        //     timeout: 2000
        // },
        // {
        //     url: "https://www.facebook.com/",
        //     login: "donna.simple.oluso@gmail.com",
        //     password: "0dWX6iaRuRz9377PW45d",
        //     timeout: 2000
        // },
        // {
        //     url: "https://appstoreconnect.apple.com/login",
        //     login: "hdayfg6wq5sq@gmail.com",
        //     password: "cYZ6HcG2Z7xd2t5DazXc",
        //     timeout: 2000
        // },
        // {
        //     url: "https://craigslist.org/",
        //     login: "donna.simple.auxoft@gmail.com",
        //     password: "Zh9XR36svufnwW7b6Znp",
        //     timeout: 2000
        // },
        // {
        //     url: "https://bbc.com/",
        //     login: "donna.simple.oluso@gmail.com",
        //     password: "DLWuzu73ahEZcYt4v5zf",
        //     timeout: 2000
        // },
        // {
        //     url: "https://reddit.com/",
        //     login: "donnasimple",
        //     password: "3jBFnSRNBfwZj86eDq4n",
        //     timeout: 2000
        // },
        // {
        //     url: "https://live.com/",
        //     login: "donna.simple.oluso@outlook.com",
        //     password: "94U7Gez4D87G6C42iub0",
        //     timeout: 2000
        // }

        // dont close tab
    // "booking.com": [
    //     {
    //         "login": "donna.simple.oluso@gmail.com",
    //         "password": "N9dCCc9rwRq95YUeuSUS"
    //     }
    // ],

        //https://www.rakuten.com/
        // висить
);

    public credentials(): Credentials {
        return new Credentials(Array.from(this.items));
    }
}
