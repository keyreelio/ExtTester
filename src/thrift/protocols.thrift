/**
 * Copyright (c) by auXoft
 *
 * This file describes database format used in KeyReel.
 *
 */


include "structures.thrift"


namespace java io.keyreel.common.thrift
namespace js AuxoftKeyReel
namespace cocoa AXT
namespace csharp Auxoft.KeyReel.Thrift


/**
 * List of response error categories.
 * Try to avoid extending this list.
 */
enum ErrorCategory {
    NOT_AUTHORIZED = 1,
    PERMISSION_DENIED = 2,
    NOT_FOUND = 3,
    INTERNAL_ERROR = 4,
    DB_ERROR = 5,
}

enum ErrorCode {
    // NOT_AUTHORIZED
    CLIENT_NOT_AUTHORIZED = 1,
    CLIENT_BANED = 2,
    DEVICE_IS_FREE = 23,

    // PERMISSION_DENIED
    USER_CANCELED = 3,
    USER_TIMEOUT = 4,

    // NOT_FOUND
    DEVICE_NOT_PAIRED = 5,
    DEVICE_NOT_FOUND = 6,
    DEVICE_NOT_AVAILABLE = 7,
    SITE_NOT_FOUND = 8,
    ACCOUNT_NOT_FOUND = 12,
    SERVICE_NOT_STARTED = 20,
    ACCOUNT_2FA_NOT_FOUND = 21,
    ACCOUNT_U2F_NOT_FOUND = 22,

    //INTERNAL_ERROR
    ACCOUNT_DUPLICATED = 9,
    APP_EXCEPTION = 10,
    METHOD_NOT_IMPLEMENTED = 11,
    DB_LOCKED = 13,
    ADD_ACCOUNT_BLOCKED = 14,
    NOT_FOUND = 15,
    PAUSED = 16,

    //DB_ERROR
    DB_CORRUPTED = 17,
    DB_DECRYPT_FAILED = 18,
    DB_VERSION_UNSUPPORTED = 19,
}

const string EDM_CLIENT_NOT_AUTHORIZED = "Client not authorized"
const string EDM_CLIENT_BANED = "Client baned"
const string EDM_DEVICE_IS_FREE = "Device has limited functionality"
const string EDM_USER_CANCELED = "User canceled"
const string EDM_USER_TIMEOUT = "User timeout"
const string EDM_DEVICE_NOT_PAIRED = "Device not paired"
const string EDM_DEVICE_NOT_FOUND = "Device not found"
const string EDM_DEVICE_NOT_AVAILABLE = "Device not available"
const string EDM_SITE_NOT_FOUND = "Site not found"
const string EDM_ACCOUNT_NOT_FOUND = "Account not found"
const string EDM_ACCOUNT_DUPLICATED = "Account duplicated"
const string EDM_METHOD_NOT_IMPLEMENTED = "Method not implemented"
const string EDM_DB_LOCKED = "DB locked"
const string EDM_ADD_ACCOUNT_BLOCKED = "Add account blocked"
const string EDM_NOT_FOUND = "Resource not found"
const string EDM_PAUSED = "Service paused"


/**
 * General error information.
 * Should be thrown by all APIs.
 */
struct Error {
    1: optional ErrorCategory category;

    /**
     * Unique ID used to identify specific error and to display message to users.
     */
    2: optional i64 id;

    /**
     * for debugging purposes. Should not be displayed to users. Should be disabled in production.
     */
    3: optional string debugMessage;
}

/**
 * General request information.
 * Should be a first parameter in all API request structs.
 */
struct RequestInfo {
    1: optional string id;
    2: optional i64 timeStampUtc;
    3: optional string contextName;
}


/**
 * General response information.
 * Should be a first parameter in all API response structs.
 */
struct ResponseInfo {
    1: optional string id;
    2: optional i64 timeStampUtc;
    3: optional string requestId;
    4: optional Error error;
    5: optional string contextName;
}

struct Authentication {
    /**
     * Client unique GUID.
     */
    1: optional string clientId;

    /**
     * Client authentication information.
     */
    2: optional string clientSecret;
}

struct GetLoginDataRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;
    3: optional string siteUrl;
    5: optional string domain;

    6: optional bool manual;

    /**
     * Optional user name if available from the client.
     */
    4: optional string login;
}

struct GetLoginDataResponse {
    1: optional ResponseInfo info;
    2: optional structures.LoginData data;
}

struct AddLoginDataRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;
    3: optional string siteUrl;
    6: optional string domain;
    4: optional structures.LoginData loginData;
    5: optional bool isSecured;
}

struct UpdateLoginDataRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;
    3: optional string siteUrl;
    6: optional string domain;
    4: optional structures.LoginData loginData;
    5: optional string currentLogin;
}

struct AddLoginDataResponse {
    1: optional ResponseInfo info;
    2: optional bool isUpdated;
}

struct UpdateLoginDataResponse {
    1: optional ResponseInfo info;
}

struct DeleteLoginDataRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;
    3: optional string siteUrl;
    5: optional string domain;
    4: optional string login;
}

struct DeleteLoginDataResponse {
    1: optional ResponseInfo info;
}

struct GetSiteDataRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;
    3: optional string siteUrl;

    6: optional string domain;

    4: optional bool includeLoginData;
    5: optional bool includePasswords;

    7: optional bool manual;
}

struct GetSiteDataResponse {
    1: optional ResponseInfo info;
    2: optional structures.SiteData record;
}

struct GetSiteDataListRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;
    3: optional bool includeLoginData;
    4: optional bool includePasswords;
}

struct GetSiteDataListResponse {
    1: optional ResponseInfo info;
    2: optional list<structures.SiteData> records;
}

struct DeleteSiteDataRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;
    3: optional string siteUrl;
    4: optional string domain;
}

struct DeleteSiteDataResponse {
    1: optional ResponseInfo info;
}

struct Get2FACodeRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;
    3: optional string siteUrl;
    4: optional string domain;

    /**
     * Optional user name if available from the client.
     */
    5: optional string login;
}

struct Get2FACodeResponse {
    1: optional ResponseInfo info;
    2: optional string code;
    3: optional string prevCode;
    4: optional string nextCode;
    5: optional i16 period;         // seconds - if period == 0 then HTOP else TOTP
    6: optional i64 startTimestamp; // seconds - the interval between the date object and 00:00:00 UTC on 1 January 1970.
}


service StorageService {
    /*
     * Login data management APIs.
     */

    GetLoginDataResponse getLoginData(1: GetLoginDataRequest request);
    AddLoginDataResponse addLoginData(1: AddLoginDataRequest request);
    DeleteLoginDataResponse deleteLoginData(1: DeleteLoginDataRequest request);
    UpdateLoginDataResponse updateLoginData(1: UpdateLoginDataRequest request);

    /*
     * Site data management APIs.
     */

    GetSiteDataResponse getSiteData(1: GetSiteDataRequest request);
    GetSiteDataListResponse getSiteDataList(1: GetSiteDataListRequest request);
    DeleteSiteDataResponse deleteSiteData(1: DeleteSiteDataRequest request);

    /*
     * Two factor management APIs.
     */
    Get2FACodeResponse get2FACode(1: Get2FACodeRequest request);
}


struct ApproveClientRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;
    3: optional string clientName;
    4: optional string clientModel;
    5: optional string osVersion;
    6: optional string appVersion;
    7: optional i64 lastBackupTime;
    8: optional string publicKey;
    9: optional string secretKey;
}

struct ApproveClientResponse {
    1: optional ResponseInfo info;
}

struct GetSitesCacheRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;
    3: optional i64 updateTimeStamp;
    4: optional bool includeAccountsCache;
}

struct GetSitesCacheResponse {
    1: optional ResponseInfo info;
    2: optional structures.SitesCache sitesCache;
}

struct GetAccountsCacheRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;
    3: optional i64 updateTimeStamp;
    4: optional string siteUrl;
    5: optional string domain;
}

struct GetAccountsCacheResponse {
    1: optional ResponseInfo info;
    2: optional string siteUrl;
    4: optional string domain;
    3: optional structures.AccountsCache accountsCache;
}

struct GetBackUpRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;
    3: optional i64 lastBackUpTime;
}

struct GetBackUpResponse {
    1: optional ResponseInfo info;
    2: optional binary backUp;
    3: optional i64 lastBackUpTime;
}

struct SetBackUpResult {
    1: optional RequestInfo info;
    2: optional Authentication auth;
    3: optional Error result;
    4: optional i64 backupTime;
}

struct SetBackUp {
    1: optional RequestInfo info;
    2: optional Authentication auth;
    3: optional binary backUp;
    4: optional Error result;
}

struct SendPasswordRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;
    3: optional string newPassword;
}

struct SendPasswordResponse {
    1: optional ResponseInfo info;
}

struct LoadDataForClipboardRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;
}

struct LoadDataForClipboardResponse {
    1: optional ResponseInfo info;
    2: optional string login;
    3: optional string password;
    4: optional string comment;
    5: optional string accountId;
    6: optional string twoFactorCode;

    10: optional i16 clearTimeout;
}

struct GetUrlToOpenRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;
}

struct GetUrlToOpenResponce {
    1: optional ResponseInfo info;
    2: optional string url;
}


enum TypeSerialize {
    NONE = 0,
    BZIP = 1,
}


enum ImportSourceType {
    KEYREEL_JSON = 0,
    KEYREEL_CSV = 1,
    LASTPASS_CSV = 2,
    DASHLANE_CSV = 3,
    KEEPASS_CSV = 4,
    TRUEKEY_CSV = 5,
    ONEPASSWORD_CSV = 6,
    DASHLANE_JSON = 7,

    GOOGLE_ACCOUNT = 50,
    KEYCHAIN_WIFI_PASS = 51,
    KEYCHAIN_INTERNET_PASS = 52
}

struct RequestForImportSiteDataRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;

    3: optional ImportSourceType source;
    4: optional string sourceDetail;
    6: optional string sourceName;

    5: optional i32 recordCount;
}

struct RequestForImportSiteDataResponse {
    1: optional ResponseInfo info;
    2: optional string token;
}

struct ImportSiteDataRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;

    3: optional string token;

    4: optional TypeSerialize typeSerialize;
    5: optional binary serializedRecords;
}

struct ImportSiteDataResponse {
    1: optional ResponseInfo info;
}


enum ExportDestinationType {
    KEYREEL_JSON = 0,
    KEYREEL_CSV = 1,
    LASTPASS_CSV = 2,
}

struct RequestForExportSiteDataRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;

    3: optional ExportDestinationType destination;
    4: optional string destinationDetail;
    6: optional string destinationName;
}

struct RequestForExportSiteDataResponse {
    1: optional ResponseInfo info;
    2: optional string token;
}

struct ExportSiteDataRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;
    3: optional string token;
}

struct ExportSiteDataResponse {
    1: optional ResponseInfo info;

    2: optional TypeSerialize typeSerialize;
    3: optional binary serializedRecords;
}

struct RegisterYubikeyRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;
    3: optional binary requestRaw;

    4: optional string siteUrl;
    5: optional string login;
}

struct RegisterYubikeyResponse {
    1: optional ResponseInfo info;
    2: optional binary responseRaw;
}

struct AuthenticationYubikeyRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;
    3: optional binary requestRaw;

    4: optional string siteUrl;
    5: optional string login;
}

struct AuthenticationYubikeyResponse {
    1: optional ResponseInfo info;
    2: optional binary responseRaw;
}


service MobileStorageService extends StorageService {
    /*
     * Device management APIs.
     */

    ApproveClientResponse approveClient(1: ApproveClientRequest request);

    GetSitesCacheResponse getSitesCache(1: GetSitesCacheRequest request);
    GetAccountsCacheResponse getAccountsCache(1: GetAccountsCacheRequest request);

    GetBackUpResponse getBackUp(1: GetBackUpRequest request);
    void setBackUpResult(1: SetBackUpResult result);

    void setBackUp(1: SetBackUp backUp);

    SendPasswordResponse sendPassword(1: SendPasswordRequest request);
    LoadDataForClipboardResponse loadDataForClipboard(1: LoadDataForClipboardRequest request);

    GetUrlToOpenResponce getUrlToOpen(1: GetUrlToOpenRequest request);

    /*
     * Import/Export
     */

    RequestForImportSiteDataResponse requestForImportSiteData(1: RequestForImportSiteDataRequest request);
    ImportSiteDataResponse importSiteData(1: ImportSiteDataRequest request);

    RequestForExportSiteDataResponse requestForExportSiteData(1: RequestForExportSiteDataRequest request);
    ExportSiteDataResponse exportSiteData(1: ExportSiteDataRequest request);

    /*
     * YubiKey
     */
    RegisterYubikeyResponse registerYubikey(1: RegisterYubikeyRequest request);
    AuthenticationYubikeyResponse authenticationYubikey(1: AuthenticationYubikeyRequest request);
}


// log level:
//  00000000000000000000000000000000000000000000000000000000000000xx
//
// google analytics state:
//  0000000000000000000000000000000000000000000000000000000000000x00
//
// ext extended mode:
//  000000000000000000000000000000000000000000000000000000000000x000
//
// device state:
//  0000000000000000000000000000000000000000000000000000000000xx0000

const i64 LOG_LEVEL_MASK            = 0x0000000000000003
const i64 GA_MASK                   = 0x0000000000000004
const i64 EXTENDED_MODE_MASK        = 0x0000000000000008
const i64 DEVICE_STATE_MASK         = 0x0000000000000030


const i64 LOG_LEVEL_OFF             = 0x0000000000000000
const i64 LOG_LEVEL_INFO            = 0x0000000000000001
const i64 LOG_LEVEL_DEBUG           = 0x0000000000000002
const i64 LOG_LEVEL_VERBOSE         = 0x0000000000000003

const i64 GA_ENABLED                = 0x0000000000000004
const i64 EXTENDED_MODE_ENABLED     = 0x0000000000000008
    
const i64 DEVICE_STATE_ONLINE       = 0x0000000000000000
const i64 DEVICE_STATE_OFFLINE      = 0x0000000000000010
const i64 DEVICE_STATE_DONTPAIRED   = 0x0000000000000020


/**
 * Ping/pong test request
 * uses to check connection between extension and service
 */
struct PingTestRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;
    3: optional string appIdentifier;
    4: optional string appVersion;
}

struct PongTestResponse {
    1: optional ResponseInfo info;
    2: optional bool extendedMode;
    3: optional i64 flags;

    /**
     * Client authentication information.
     */
    4: optional string clientSecret;
}


struct ChooseSiteDataRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;
    3: optional string siteUrl;
    5: optional string domain;
    4: optional list<string> accounts;
}

struct ChooseSiteDataResponse {
    1: optional ResponseInfo info;
    2: optional string choosedAccount;
}

struct ImportSiteDataFromGoogleRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;
    3: optional list<structures.SiteData> records;
    4: optional string detail;
}

struct ImportSiteDataFromGoogleResponse {
    1: optional ResponseInfo info;
}


enum GeneratePasswordConfig {
    DEFAULT = 0,
    FORCE_ENABLE = 1,
    FORCE_DESABLE = 2,
}

struct GeneratePasswordRequest {
    1: optional RequestInfo info;
    2: optional Authentication auth;
    3: optional bool interactive;
    4: optional i32 minLength;
    5: optional i32 maxLength;

    6: optional GeneratePasswordConfig capitalization;
    7: optional GeneratePasswordConfig digits;
    8: optional GeneratePasswordConfig symbols;
}

struct GeneratePasswordResponse {
    1: optional ResponseInfo info;
    2: optional string generatedPassword;
}


service HostStorageService extends StorageService {
    /*
     * testing connection APIs
     */
    PongTestResponse sendPing(1: PingTestRequest request);

    ChooseSiteDataResponse chooseSiteData(1: ChooseSiteDataRequest request);
    ImportSiteDataFromGoogleResponse importSiteDataFromGoogle(1: ImportSiteDataFromGoogleRequest request);

    GeneratePasswordResponse generatePassword(1: GeneratePasswordRequest request);
}


enum LogType {
    MESSAGE,            // ?
    METHOD_BEGIN,       // level = INFO
    METHOD_END,         // level = INFO
    METHOD_ALTEND,      // level = INFO
    METHOD_FAIL,        // level = ERROR
    TIME_BEGIN,         // level = INFO
    TIME_END,           // level = INFO
    VALUE,              // level = DEBUG
}

enum LogLevel {
    ERROR,
    WARNING,
    INFO,
    DEBUG,
    VERBOSE,
}


# value:                                               message = 'name = value'
# METHOD_BEGIN/METHOD_END/METHOD_ALTEND/METHOD_FAIL    message = func_name
# TIME_BEGIN/TIME_END                                  message = func_name

struct LogMessage {
    1: optional string appId;
    2: optional string appVersion;
    3: optional string tags;
    4: optional LogType type;
    5: optional LogLevel level;
    6: optional string timestamp;
    7: optional string fileName;
    8: optional string funcName;
    9: optional i32 fileLine;
    10: optional string contextName;
    11: optional string message;
    12: optional string threadName;
}

service LoggingService {
    void sendLog(1: LogMessage logMessage);
}
