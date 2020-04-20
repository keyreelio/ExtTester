/**
 * Copyright (c) by auXoft
 *
 * This file describes database format used in KeyReel.
 *
 */


namespace java io.keyreel.common.thrift
namespace js AuxoftKeyReel
namespace cocoa AXT
namespace csharp Auxoft.KeyReel.Thrift


enum TwoFactorType {
    HOTP,
    TOTP
}

struct TwoFactorData {
    01: TwoFactorType type;

    // xOTP
    10: optional binary secret;
    11: optional string algorithm;
    12: optional i64 digits;
    // HOTP
    20: optional i64 counter;
    // TOTP
    30: optional double period;
}

struct YubikeyData {
    01: string keyHandle;
}


struct LoginData {
    1: optional string login;
    2: optional bool passwordProvided;
    3: optional string password;
    4: optional string email;
    5: optional string phone_prefix;
    6: optional string phone;
    7: optional i64 updatePasswordTimeStamp;
    8: optional string userName;
    9: optional string firstName;
   10: optional string lastName;
   11: optional string fullName;
   12: optional string company;
   13: optional string account;
   14: optional string applicantId;
   15: optional string zipcode;
   16: optional bool isLoginFinal;
   17: optional string notes;
   18: optional bool isSecured;
   19: optional bool isFavorited;
   20: optional i16 passwordStrength;
   21: optional string tags;
   22: optional string title;

   30: optional i64 accessCreateTimeStamp;
   31: optional i64 accessUpdateTimeStamp;
   32: optional i64 accessReadTimeStamp;

   50: optional TwoFactorData twoFactor;
   51: optional YubikeyData yubikey;
}

struct SiteData {
    1: optional string siteUrl;
    2: optional list<LoginData> loginData;
    3: optional set<string> formUrls;
    4: optional bool isFavorited;
    5: optional bool isSecured;
    6: optional string displayName;
    7: optional i64 updateTimeStamp;
    8: optional string domain;
}

struct AccountsCache {
    1: optional i64 updateTimeStamp;

    // list sha256(LoginData.login)
    2: optional set<string> loginsCache;
    // list sha256(LoginData.login + '_' + LoginData.password)
    3: optional set<string> passwordsCache;
}

struct SitesCache {
    1: optional i64 updateTimeStamp;

    // list sha256(SiteData.siteUrl)
    2: optional set<string> urlsCache;
    // map<sha256(SiteData.siteUrl), AccountsCache>
    3: optional map<string, AccountsCache> accountsCache;
    // list sha256(SiteData.siteUrl)
    4: optional set<string> protectedUrlsCache;
}

struct U2FData {
    1: optional binary applicationTag;
    2: optional binary privateKey;
}


struct HostUrl {
    1: optional string mobileUrl;
    2: optional string desktopUrl;
}

struct HostData {
    1: optional string siteUrl;
    2: optional string displayName;
    3: optional binary icon;
    4: optional binary logo;

    10: optional HostUrl loginUrl;
    11: optional bool suportAutoLogin;
}


enum AuditOperation {
    /*
     * service StorageService
     */
    GetSiteData = 0,
    GetSiteDataList = 1,
    DeleteSiteData = 2,
    GetLoginData = 3,
    AddLoginData = 4,
    DeleteLoginData = 5,
    UpdateLoginData = 6,
    Get2FACode = 7,

    /*
     * service MobileStorageService
     */
    ApproveClient = 20,
    GetSitesCache = 21,
    GetAccountsCache = 22,
    GetBackUp = 23,
    PutBackUp = 24,
    SendPassword = 25,

    /*
     * app manipulation
     */
     CreateAccount = 40,
     EditAccount = 41,
     DeleteAccount = 42,
     SetupBackUp = 43
}


struct AuditData {
    1: i64 time;
    2: AuditOperation operation;
    3: optional string operand1;
    4: optional string operand2;
    5: optional string operand3;
    6: optional string operand4;
    7: optional string operand5;
    8: optional string clientId;
}
