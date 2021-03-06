import { Injectable, NgZone, Optional, NgModule, InjectionToken } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Subject, of, race, throwError } from 'rxjs';
import { filter, delay, first, tap, map, catchError } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { KEYUTIL, KJUR } from 'jsrsasign';

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * Additional options that can be passt to tryLogin.
 */
class LoginOptions {
    constructor() {
        /**
         * Normally, you want to clear your hash fragment after
         * the lib read the token(s) so that they are not displayed
         * anymore in the url. If not, set this to true.
         */
        this.preventClearHashAfterLogin = false;
    }
}
/**
 * Defines a simple storage that can be used for
 * storing the tokens at client side.
 * Is compatible to localStorage and sessionStorage,
 * but you can also create your own implementations.
 * @abstract
 */
class OAuthStorage {
}
/**
 * Represents the received tokens, the received state
 * and the parsed claims from the id-token.
 */
class ReceivedTokens {
}
/**
 * Represents the parsed and validated id_token.
 * @record
 */

/**
 * Represents the response from the token endpoint
 * http://openid.net/specs/openid-connect-core-1_0.html#TokenEndpoint
 * @record
 */

/**
 * Represents the response from the user info endpoint
 * http://openid.net/specs/openid-connect-core-1_0.html#UserInfo
 * @record
 */

/**
 * Represents an OpenID Connect discovery document
 * @record
 */

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * @record
 */

/**
 * Interface for Handlers that are hooked in to
 * validate tokens.
 * @abstract
 */
class ValidationHandler {
}
/**
 * This abstract implementation of ValidationHandler already implements
 * the method validateAtHash. However, to make use of it,
 * you have to override the method calcHash.
 * @abstract
 */
class AbstractValidationHandler {
    /**
     * Validates the at_hash in an id_token against the received access_token.
     * @param {?} params
     * @return {?}
     */
    validateAtHash(params) {
        let /** @type {?} */ hashAlg = this.inferHashAlgorithm(params.idTokenHeader);
        let /** @type {?} */ tokenHash = this.calcHash(params.accessToken, hashAlg); // sha256(accessToken, { asString: true });
        let /** @type {?} */ leftMostHalf = tokenHash.substr(0, tokenHash.length / 2);
        let /** @type {?} */ tokenHashBase64 = btoa(leftMostHalf);
        let /** @type {?} */ atHash = tokenHashBase64
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
        let /** @type {?} */ claimsAtHash = params.idTokenClaims['at_hash'].replace(/=/g, '');
        if (atHash !== claimsAtHash) {
            console.error('exptected at_hash: ' + atHash);
            console.error('actual at_hash: ' + claimsAtHash);
        }
        return atHash === claimsAtHash;
    }
    /**
     * Infers the name of the hash algorithm to use
     * from the alg field of an id_token.
     *
     * @param {?} jwtHeader the id_token's parsed header
     * @return {?}
     */
    inferHashAlgorithm(jwtHeader) {
        let /** @type {?} */ alg = jwtHeader['alg'];
        if (!alg.match(/^.S[0-9]{3}$/)) {
            throw new Error('Algorithm not supported: ' + alg);
        }
        return 'sha' + alg.substr(2);
    }
}

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
class UrlHelperService {
    /**
     * @param {?=} customHashFragment
     * @return {?}
     */
    getHashFragmentParams(customHashFragment) {
        let /** @type {?} */ hash = customHashFragment || window.location.hash;
        hash = decodeURIComponent(hash);
        if (hash.indexOf('#') !== 0) {
            return {};
        }
        const /** @type {?} */ questionMarkPosition = hash.indexOf('?');
        if (questionMarkPosition > -1) {
            hash = hash.substr(questionMarkPosition + 1);
        }
        else {
            hash = hash.substr(1);
        }
        return this.parseQueryString(hash);
    }
    /**
     * @param {?} queryString
     * @return {?}
     */
    parseQueryString(queryString) {
        const /** @type {?} */ data = {};
        let /** @type {?} */
        pairs, /** @type {?} */
        pair, /** @type {?} */
        separatorIndex, /** @type {?} */
        escapedKey, /** @type {?} */
        escapedValue, /** @type {?} */
        key, /** @type {?} */
        value;
        if (queryString === null) {
            return data;
        }
        pairs = queryString.split('&');
        for (let /** @type {?} */ i = 0; i < pairs.length; i++) {
            pair = pairs[i];
            separatorIndex = pair.indexOf('=');
            if (separatorIndex === -1) {
                escapedKey = pair;
                escapedValue = null;
            }
            else {
                escapedKey = pair.substr(0, separatorIndex);
                escapedValue = pair.substr(separatorIndex + 1);
            }
            key = decodeURIComponent(escapedKey);
            value = decodeURIComponent(escapedValue);
            if (key.substr(0, 1) === '/') {
                key = key.substr(1);
            }
            data[key] = value;
        }
        return data;
    }
}
UrlHelperService.decorators = [
    { type: Injectable },
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * @abstract
 */
class OAuthEvent {
    /**
     * @param {?} type
     */
    constructor(type) {
        this.type = type;
    }
}
class OAuthSuccessEvent extends OAuthEvent {
    /**
     * @param {?} type
     * @param {?=} info
     */
    constructor(type, info = null) {
        super(type);
        this.info = info;
    }
}
class OAuthInfoEvent extends OAuthEvent {
    /**
     * @param {?} type
     * @param {?=} info
     */
    constructor(type, info = null) {
        super(type);
        this.info = info;
    }
}
class OAuthErrorEvent extends OAuthEvent {
    /**
     * @param {?} type
     * @param {?} reason
     * @param {?=} params
     */
    constructor(type, reason, params = null) {
        super(type);
        this.reason = reason;
        this.params = params;
    }
}

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * @param {?} str
 * @return {?}
 */
function b64DecodeUnicode(str) {
    const /** @type {?} */ base64 = str.replace(/\-/g, '+').replace(/\_/g, '/');
    return decodeURIComponent(atob(base64)
        .split('')
        .map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    })
        .join(''));
}

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
class AuthConfig {
    /**
     * @param {?=} json
     */
    constructor(json) {
        /**
         * The client's id as registered with the auth server
         */
        this.clientId = '';
        /**
         * The client's redirectUri as registered with the auth server
         */
        this.redirectUri = '';
        /**
         * An optional second redirectUri where the auth server
         * redirects the user to after logging out.
         */
        this.postLogoutRedirectUri = '';
        /**
         * The auth server's endpoint that allows to log
         * the user in when using implicit flow.
         */
        this.loginUrl = '';
        /**
         * The requested scopes
         */
        this.scope = 'openid profile';
        this.resource = '';
        this.rngUrl = '';
        /**
         * Defines whether to use OpenId Connect during
         * implicit flow.
         */
        this.oidc = true;
        /**
         * Defines whether to request a access token during
         * implicit flow.
         */
        this.requestAccessToken = true;
        this.options = null;
        /**
         * The issuer's uri.
         */
        this.issuer = '';
        /**
         * The logout url.
         */
        this.logoutUrl = '';
        /**
         * Defines whether to clear the hash fragment after logging in.
         */
        this.clearHashAfterLogin = true;
        /**
         * Url of the token endpoint as defined by OpenId Connect and OAuth 2.
         */
        this.tokenEndpoint = null;
        /**
         * Url of the userinfo endpoint as defined by OpenId Connect.
         *
         */
        this.userinfoEndpoint = null;
        this.responseType = 'token';
        /**
         * Defines whether additional debug information should
         * be shown at the console. Note that in certain browsers
         * the verbosity of the console needs to be explicitly set
         * to include Debug level messages.
         */
        this.showDebugInformation = false;
        /**
         * The redirect uri used when doing silent refresh.
         */
        this.silentRefreshRedirectUri = '';
        this.silentRefreshMessagePrefix = '';
        /**
         * Set this to true to display the iframe used for
         * silent refresh for debugging.
         */
        this.silentRefreshShowIFrame = false;
        /**
         * Timeout for silent refresh.
         * \@internal
         * depreacted b/c of typo, see silentRefreshTimeout
         */
        this.siletRefreshTimeout = 1000 * 20;
        /**
         * Timeout for silent refresh.
         */
        this.silentRefreshTimeout = 1000 * 20;
        /**
         * Some auth servers don't allow using password flow
         * w/o a client secreat while the standards do not
         * demand for it. In this case, you can set a password
         * here. As this passwort is exposed to the public
         * it does not bring additional security and is therefore
         * as good as using no password.
         */
        this.dummyClientSecret = null;
        /**
         * Defines whether https is required.
         * The default value is remoteOnly which only allows
         * http for localhost, while every other domains need
         * to be used with https.
         */
        this.requireHttps = 'remoteOnly';
        /**
         * Defines whether every url provided by the discovery
         * document has to start with the issuer's url.
         */
        this.strictDiscoveryDocumentValidation = true;
        /**
         * JSON Web Key Set (https://tools.ietf.org/html/rfc7517)
         * with keys used to validate received id_tokens.
         * This is taken out of the disovery document. Can be set manually too.
         */
        this.jwks = null;
        /**
         * Map with additional query parameter that are appended to
         * the request when initializing implicit flow.
         */
        this.customQueryParams = null;
        this.silentRefreshIFrameName = 'angular-oauth-oidc-silent-refresh-iframe';
        /**
         * Defines when the token_timeout event should be raised.
         * If you set this to the default value 0.75, the event
         * is triggered after 75% of the token's life time.
         */
        this.timeoutFactor = 0.75;
        /**
         * If true, the lib will try to check whether the user
         * is still logged in on a regular basis as described
         * in http://openid.net/specs/openid-connect-session-1_0.html#ChangeNotification
         */
        this.sessionChecksEnabled = false;
        /**
         * Intervall in msec for checking the session
         * according to http://openid.net/specs/openid-connect-session-1_0.html#ChangeNotification
         */
        this.sessionCheckIntervall = 3 * 1000;
        /**
         * Url for the iframe used for session checks
         */
        this.sessionCheckIFrameUrl = null;
        /**
         * Name of the iframe to use for session checks
         */
        this.sessionCheckIFrameName = 'angular-oauth-oidc-check-session-iframe';
        /**
         * This property has been introduced to disable at_hash checks
         * and is indented for Identity Provider that does not deliver
         * an at_hash EVEN THOUGH its recommended by the OIDC specs.
         * Of course, when disabling these checks the we are bypassing
         * a security check which means we are more vulnerable.
         */
        this.disableAtHashCheck = false;
        this.skipSubjectCheck = false;
        this.useIdTokenHintForSilentRefresh = false;
        this.skipIssuerCheck = false;
        this.nonceStateSeparator = ';';
        this.useHttpBasicAuthForPasswordFlow = false;
        /**
         * This property allows you to override the method that is used to open the login url,
         * allowing a way for implementations to specify their own method of routing to new
         * urls.
         */
        this.openUri = uri => {
            location.href = uri;
        };
        if (json) {
            Object.assign(this, json);
        }
    }
}

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * This custom encoder allows charactes like +, % and / to be used in passwords
 */
class WebHttpUrlEncodingCodec {
    /**
     * @param {?} k
     * @return {?}
     */
    encodeKey(k) {
        return encodeURIComponent(k);
    }
    /**
     * @param {?} v
     * @return {?}
     */
    encodeValue(v) {
        return encodeURIComponent(v);
    }
    /**
     * @param {?} k
     * @return {?}
     */
    decodeKey(k) {
        return decodeURIComponent(k);
    }
    /**
     * @param {?} v
     * @return {?}
     */
    decodeValue(v) {
        return decodeURIComponent(v);
    }
}

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * Service for logging in and logging out with
 * OIDC and OAuth2. Supports implicit flow and
 * password flow.
 */
class OAuthService extends AuthConfig {
    /**
     * @param {?} ngZone
     * @param {?} http
     * @param {?} storage
     * @param {?} tokenValidationHandler
     * @param {?} config
     * @param {?} urlHelper
     */
    constructor(ngZone, http, storage, tokenValidationHandler, config, urlHelper) {
        super();
        this.ngZone = ngZone;
        this.http = http;
        this.config = config;
        this.urlHelper = urlHelper;
        /**
         * \@internal
         * Deprecated:  use property events instead
         */
        this.discoveryDocumentLoaded = false;
        /**
         * The received (passed around) state, when logging
         * in with implicit flow.
         */
        this.state = '';
        this.eventsSubject = new Subject();
        this.discoveryDocumentLoadedSubject = new Subject();
        this.grantTypesSupported = [];
        this.inImplicitFlow = false;
        this.discoveryDocumentLoaded$ = this.discoveryDocumentLoadedSubject.asObservable();
        this.events = this.eventsSubject.asObservable();
        if (tokenValidationHandler) {
            this.tokenValidationHandler = tokenValidationHandler;
        }
        if (config) {
            this.configure(config);
        }
        try {
            if (storage) {
                this.setStorage(storage);
            }
            else if (typeof sessionStorage !== 'undefined') {
                this.setStorage(sessionStorage);
            }
        }
        catch (/** @type {?} */ e) {
            console.error('cannot access sessionStorage. Consider setting an own storage implementation using setStorage', e);
        }
        this.setupRefreshTimer();
    }
    /**
     * Use this method to configure the service
     * @param {?} config the configuration
     * @return {?}
     */
    configure(config) {
        // For the sake of downward compatibility with
        // original configuration API
        Object.assign(this, new AuthConfig(), config);
        this.config = Object.assign(/** @type {?} */ ({}), new AuthConfig(), config);
        if (this.sessionChecksEnabled) {
            this.setupSessionCheck();
        }
        this.configChanged();
    }
    /**
     * @return {?}
     */
    configChanged() { }
    /**
     * @return {?}
     */
    restartSessionChecksIfStillLoggedIn() {
        if (this.hasValidIdToken()) {
            this.initSessionCheck();
        }
    }
    /**
     * @return {?}
     */
    restartRefreshTimerIfStillLoggedIn() {
        this.setupExpirationTimers();
    }
    /**
     * @return {?}
     */
    setupSessionCheck() {
        this.events.pipe(filter(e => e.type === 'token_received')).subscribe(e => {
            this.initSessionCheck();
        });
    }
    /**
     *
     * @param {?=} params Additional parameter to pass
     * @return {?}
     */
    setupAutomaticSilentRefresh(params = {}) {
        this.events.pipe(filter(e => e.type === 'token_expires')).subscribe(e => {
            this.silentRefresh(params).catch(_ => {
                this.debug('automatic silent refresh did not work');
            });
        });
        this.restartRefreshTimerIfStillLoggedIn();
    }
    /**
     * @param {?=} options
     * @return {?}
     */
    loadDiscoveryDocumentAndTryLogin(options = null) {
        return this.loadDiscoveryDocument().then(doc => {
            return this.tryLogin(options);
        });
    }
    /**
     * @param {?=} options
     * @return {?}
     */
    loadDiscoveryDocumentAndLogin(options = null) {
        return this.loadDiscoveryDocumentAndTryLogin(options).then(_ => {
            if (!this.hasValidIdToken() || !this.hasValidAccessToken()) {
                this.initImplicitFlow();
                return false;
            }
            else {
                return true;
            }
        });
    }
    /**
     * @param {...?} args
     * @return {?}
     */
    debug(...args) {
        if (this.showDebugInformation) {
            console.debug.apply(console, args);
        }
    }
    /**
     * @param {?} url
     * @return {?}
     */
    validateUrlFromDiscoveryDocument(url) {
        const /** @type {?} */ errors = [];
        const /** @type {?} */ httpsCheck = this.validateUrlForHttps(url);
        const /** @type {?} */ issuerCheck = this.validateUrlAgainstIssuer(url);
        if (!httpsCheck) {
            errors.push('https for all urls required. Also for urls received by discovery.');
        }
        if (!issuerCheck) {
            errors.push('Every url in discovery document has to start with the issuer url.' +
                'Also see property strictDiscoveryDocumentValidation.');
        }
        return errors;
    }
    /**
     * @param {?} url
     * @return {?}
     */
    validateUrlForHttps(url) {
        if (!url) {
            return true;
        }
        const /** @type {?} */ lcUrl = url.toLowerCase();
        if (this.requireHttps === false) {
            return true;
        }
        if ((lcUrl.match(/^http:\/\/localhost($|[:\/])/) ||
            lcUrl.match(/^http:\/\/localhost($|[:\/])/)) &&
            this.requireHttps === 'remoteOnly') {
            return true;
        }
        return lcUrl.startsWith('https://');
    }
    /**
     * @param {?} url
     * @return {?}
     */
    validateUrlAgainstIssuer(url) {
        if (!this.strictDiscoveryDocumentValidation) {
            return true;
        }
        if (!url) {
            return true;
        }
        return url.toLowerCase().startsWith(this.issuer.toLowerCase());
    }
    /**
     * @return {?}
     */
    setupRefreshTimer() {
        if (typeof window === 'undefined') {
            this.debug('timer not supported on this plattform');
            return;
        }
        if (this.hasValidIdToken()) {
            this.clearAccessTokenTimer();
            this.clearIdTokenTimer();
            this.setupExpirationTimers();
        }
        this.events.pipe(filter(e => e.type === 'token_received')).subscribe(_ => {
            this.clearAccessTokenTimer();
            this.clearIdTokenTimer();
            this.setupExpirationTimers();
        });
    }
    /**
     * @return {?}
     */
    setupExpirationTimers() {
        const /** @type {?} */ idTokenExp = this.getIdTokenExpiration() || Number.MAX_VALUE;
        const /** @type {?} */ accessTokenExp = this.getAccessTokenExpiration() || Number.MAX_VALUE;
        const /** @type {?} */ useAccessTokenExp = accessTokenExp <= idTokenExp;
        if (this.hasValidAccessToken() && useAccessTokenExp) {
            this.setupAccessTokenTimer();
        }
        if (this.hasValidIdToken() && !useAccessTokenExp) {
            this.setupIdTokenTimer();
        }
    }
    /**
     * @return {?}
     */
    setupAccessTokenTimer() {
        const /** @type {?} */ expiration = this.getAccessTokenExpiration();
        const /** @type {?} */ storedAt = this.getAccessTokenStoredAt();
        const /** @type {?} */ timeout = this.calcTimeout(storedAt, expiration);
        this.ngZone.runOutsideAngular(() => {
            this.accessTokenTimeoutSubscription = of(new OAuthInfoEvent('token_expires', 'access_token'))
                .pipe(delay(timeout))
                .subscribe(e => {
                this.ngZone.run(() => {
                    this.eventsSubject.next(e);
                });
            });
        });
    }
    /**
     * @return {?}
     */
    setupIdTokenTimer() {
        const /** @type {?} */ expiration = this.getIdTokenExpiration();
        const /** @type {?} */ storedAt = this.getIdTokenStoredAt();
        const /** @type {?} */ timeout = this.calcTimeout(storedAt, expiration);
        this.ngZone.runOutsideAngular(() => {
            this.idTokenTimeoutSubscription = of(new OAuthInfoEvent('token_expires', 'id_token'))
                .pipe(delay(timeout))
                .subscribe(e => {
                this.ngZone.run(() => {
                    this.eventsSubject.next(e);
                });
            });
        });
    }
    /**
     * @return {?}
     */
    clearAccessTokenTimer() {
        if (this.accessTokenTimeoutSubscription) {
            this.accessTokenTimeoutSubscription.unsubscribe();
        }
    }
    /**
     * @return {?}
     */
    clearIdTokenTimer() {
        if (this.idTokenTimeoutSubscription) {
            this.idTokenTimeoutSubscription.unsubscribe();
        }
    }
    /**
     * @param {?} storedAt
     * @param {?} expiration
     * @return {?}
     */
    calcTimeout(storedAt, expiration) {
        const /** @type {?} */ delta = (expiration - storedAt) * this.timeoutFactor;
        return delta;
    }
    /**
     * DEPRECATED. Use a provider for OAuthStorage instead:
     *
     * { provide: OAuthStorage, useValue: localStorage }
     *
     * Sets a custom storage used to store the received
     * tokens on client side. By default, the browser's
     * sessionStorage is used.
     * @ignore
     *
     * @param {?} storage
     * @return {?}
     */
    setStorage(storage) {
        this._storage = storage;
        this.configChanged();
    }
    /**
     * Loads the discovery document to configure most
     * properties of this service. The url of the discovery
     * document is infered from the issuer's url according
     * to the OpenId Connect spec. To use another url you
     * can pass it to to optional parameter fullUrl.
     *
     * @param {?=} fullUrl
     * @return {?}
     */
    loadDiscoveryDocument(fullUrl = null) {
        return new Promise((resolve, reject) => {
            if (!fullUrl) {
                fullUrl = this.issuer || '';
                if (!fullUrl.endsWith('/')) {
                    fullUrl += '/';
                }
                fullUrl += '.well-known/openid-configuration';
            }
            if (!this.validateUrlForHttps(fullUrl)) {
                reject('issuer must use Https. Also check property requireHttps.');
                return;
            }
            this.http.get(fullUrl).subscribe(doc => {
                if (!this.validateDiscoveryDocument(doc)) {
                    this.eventsSubject.next(new OAuthErrorEvent('discovery_document_validation_error', null));
                    reject('discovery_document_validation_error');
                    return;
                }
                this.loginUrl = doc.authorization_endpoint;
                this.logoutUrl = doc.end_session_endpoint || this.logoutUrl;
                this.grantTypesSupported = doc.grant_types_supported;
                this.issuer = doc.issuer;
                this.tokenEndpoint = doc.token_endpoint;
                this.userinfoEndpoint = doc.userinfo_endpoint;
                this.jwksUri = doc.jwks_uri;
                this.sessionCheckIFrameUrl = doc.check_session_iframe || this.sessionCheckIFrameUrl;
                this.discoveryDocumentLoaded = true;
                this.discoveryDocumentLoadedSubject.next(doc);
                if (this.sessionChecksEnabled) {
                    this.restartSessionChecksIfStillLoggedIn();
                }
                this.loadJwks()
                    .then(jwks => {
                    const /** @type {?} */ result = {
                        discoveryDocument: doc,
                        jwks: jwks
                    };
                    const /** @type {?} */ event = new OAuthSuccessEvent('discovery_document_loaded', result);
                    this.eventsSubject.next(event);
                    resolve(event);
                    return;
                })
                    .catch(err => {
                    this.eventsSubject.next(new OAuthErrorEvent('discovery_document_load_error', err));
                    reject(err);
                    return;
                });
            }, err => {
                console.error('error loading discovery document', err);
                this.eventsSubject.next(new OAuthErrorEvent('discovery_document_load_error', err));
                reject(err);
            });
        });
    }
    /**
     * @return {?}
     */
    loadJwks() {
        return new Promise((resolve, reject) => {
            if (this.jwksUri) {
                this.http.get(this.jwksUri).subscribe(jwks => {
                    this.jwks = jwks;
                    this.eventsSubject.next(new OAuthSuccessEvent('discovery_document_loaded'));
                    resolve(jwks);
                }, err => {
                    console.error('error loading jwks', err);
                    this.eventsSubject.next(new OAuthErrorEvent('jwks_load_error', err));
                    reject(err);
                });
            }
            else {
                resolve(null);
            }
        });
    }
    /**
     * @param {?} doc
     * @return {?}
     */
    validateDiscoveryDocument(doc) {
        let /** @type {?} */ errors;
        if (!this.skipIssuerCheck && doc.issuer !== this.issuer) {
            console.error('invalid issuer in discovery document', 'expected: ' + this.issuer, 'current: ' + doc.issuer);
            return false;
        }
        errors = this.validateUrlFromDiscoveryDocument(doc.authorization_endpoint);
        if (errors.length > 0) {
            console.error('error validating authorization_endpoint in discovery document', errors);
            return false;
        }
        errors = this.validateUrlFromDiscoveryDocument(doc.end_session_endpoint);
        if (errors.length > 0) {
            console.error('error validating end_session_endpoint in discovery document', errors);
            return false;
        }
        errors = this.validateUrlFromDiscoveryDocument(doc.token_endpoint);
        if (errors.length > 0) {
            console.error('error validating token_endpoint in discovery document', errors);
        }
        errors = this.validateUrlFromDiscoveryDocument(doc.userinfo_endpoint);
        if (errors.length > 0) {
            console.error('error validating userinfo_endpoint in discovery document', errors);
            return false;
        }
        errors = this.validateUrlFromDiscoveryDocument(doc.jwks_uri);
        if (errors.length > 0) {
            console.error('error validating jwks_uri in discovery document', errors);
            return false;
        }
        if (this.sessionChecksEnabled && !doc.check_session_iframe) {
            console.warn('sessionChecksEnabled is activated but discovery document' +
                ' does not contain a check_session_iframe field');
        }
        // this.sessionChecksEnabled = !!doc.check_session_iframe;
        return true;
    }
    /**
     * Uses password flow to exchange userName and password for an
     * access_token. After receiving the access_token, this method
     * uses it to query the userinfo endpoint in order to get information
     * about the user in question.
     *
     * When using this, make sure that the property oidc is set to false.
     * Otherwise stricter validations take happen that makes this operation
     * fail.
     *
     * @param {?} userName
     * @param {?} password
     * @param {?=} headers Optional additional http-headers.
     * @return {?}
     */
    fetchTokenUsingPasswordFlowAndLoadUserProfile(userName, password, headers = new HttpHeaders()) {
        return this.fetchTokenUsingPasswordFlow(userName, password, headers).then(() => this.loadUserProfile());
    }
    /**
     * Loads the user profile by accessing the user info endpoint defined by OpenId Connect.
     *
     * When using this with OAuth2 password flow, make sure that the property oidc is set to false.
     * Otherwise stricter validations take happen that makes this operation
     * fail.
     * @return {?}
     */
    loadUserProfile() {
        if (!this.hasValidAccessToken()) {
            throw new Error('Can not load User Profile without access_token');
        }
        if (!this.validateUrlForHttps(this.userinfoEndpoint)) {
            throw new Error('userinfoEndpoint must use Http. Also check property requireHttps.');
        }
        return new Promise((resolve, reject) => {
            const /** @type {?} */ headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.getAccessToken());
            this.http.get(this.userinfoEndpoint, { headers }).subscribe(info => {
                this.debug('userinfo received', info);
                const /** @type {?} */ existingClaims = this.getIdentityClaims() || {};
                if (!this.skipSubjectCheck) {
                    if (this.oidc &&
                        (!existingClaims['sub'] || info.sub !== existingClaims['sub'])) {
                        const /** @type {?} */ err = 'if property oidc is true, the received user-id (sub) has to be the user-id ' +
                            'of the user that has logged in with oidc.\n' +
                            'if you are not using oidc but just oauth2 password flow set oidc to false';
                        reject(err);
                        return;
                    }
                }
                info = Object.assign({}, existingClaims, info);
                this._storage.setItem('id_token_claims_obj', JSON.stringify(info));
                this.eventsSubject.next(new OAuthSuccessEvent('user_profile_loaded'));
                resolve(info);
            }, err => {
                console.error('error loading user info', err);
                this.eventsSubject.next(new OAuthErrorEvent('user_profile_load_error', err));
                reject(err);
            });
        });
    }
    /**
     * Uses password flow to exchange userName and password for an access_token.
     * @param {?} userName
     * @param {?} password
     * @param {?=} headers Optional additional http-headers.
     * @return {?}
     */
    fetchTokenUsingPasswordFlow(userName, password, headers = new HttpHeaders()) {
        if (!this.validateUrlForHttps(this.tokenEndpoint)) {
            throw new Error('tokenEndpoint must use Http. Also check property requireHttps.');
        }
        return new Promise((resolve, reject) => {
            /**
             * A `HttpParameterCodec` that uses `encodeURIComponent` and `decodeURIComponent` to
             * serialize and parse URL parameter keys and values.
             *
             * \@stable
             */
            let /** @type {?} */ params = new HttpParams({ encoder: new WebHttpUrlEncodingCodec() })
                .set('grant_type', 'password')
                .set('scope', this.scope)
                .set('username', userName)
                .set('password', password);
            if (this.useHttpBasicAuthForPasswordFlow) {
                const /** @type {?} */ header = btoa(`${this.clientId}:${this.dummyClientSecret}`);
                headers = headers.set('Authentication', 'BASIC ' + header);
            }
            if (!this.useHttpBasicAuthForPasswordFlow) {
                params = params.set('client_id', this.clientId);
            }
            if (!this.useHttpBasicAuthForPasswordFlow && this.dummyClientSecret) {
                params = params.set('client_secret', this.dummyClientSecret);
            }
            if (this.customQueryParams) {
                for (const /** @type {?} */ key of Object.getOwnPropertyNames(this.customQueryParams)) {
                    params = params.set(key, this.customQueryParams[key]);
                }
            }
            headers = headers.set('Content-Type', 'application/x-www-form-urlencoded');
            this.http
                .post(this.tokenEndpoint, params, { headers })
                .subscribe(tokenResponse => {
                this.debug('tokenResponse', tokenResponse);
                this.storeAccessTokenResponse(tokenResponse.access_token, tokenResponse.refresh_token, tokenResponse.expires_in, tokenResponse.scope);
                this.eventsSubject.next(new OAuthSuccessEvent('token_received'));
                resolve(tokenResponse);
            }, err => {
                console.error('Error performing password flow', err);
                this.eventsSubject.next(new OAuthErrorEvent('token_error', err));
                reject(err);
            });
        });
    }
    /**
     * Refreshes the token using a refresh_token.
     * This does not work for implicit flow, b/c
     * there is no refresh_token in this flow.
     * A solution for this is provided by the
     * method silentRefresh.
     * @return {?}
     */
    refreshToken() {
        if (!this.validateUrlForHttps(this.tokenEndpoint)) {
            throw new Error('tokenEndpoint must use Http. Also check property requireHttps.');
        }
        return new Promise((resolve, reject) => {
            let /** @type {?} */ params = new HttpParams()
                .set('grant_type', 'refresh_token')
                .set('client_id', this.clientId)
                .set('scope', this.scope)
                .set('refresh_token', this._storage.getItem('refresh_token'));
            if (this.dummyClientSecret) {
                params = params.set('client_secret', this.dummyClientSecret);
            }
            if (this.customQueryParams) {
                for (const /** @type {?} */ key of Object.getOwnPropertyNames(this.customQueryParams)) {
                    params = params.set(key, this.customQueryParams[key]);
                }
            }
            const /** @type {?} */ headers = new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded');
            this.http
                .post(this.tokenEndpoint, params, { headers })
                .subscribe(tokenResponse => {
                this.debug('refresh tokenResponse', tokenResponse);
                this.storeAccessTokenResponse(tokenResponse.access_token, tokenResponse.refresh_token, tokenResponse.expires_in, tokenResponse.scope);
                this.eventsSubject.next(new OAuthSuccessEvent('token_received'));
                this.eventsSubject.next(new OAuthSuccessEvent('token_refreshed'));
                resolve(tokenResponse);
            }, err => {
                console.error('Error performing password flow', err);
                this.eventsSubject.next(new OAuthErrorEvent('token_refresh_error', err));
                reject(err);
            });
        });
    }
    /**
     * @return {?}
     */
    removeSilentRefreshEventListener() {
        if (this.silentRefreshPostMessageEventListener) {
            window.removeEventListener('message', this.silentRefreshPostMessageEventListener);
            this.silentRefreshPostMessageEventListener = null;
        }
    }
    /**
     * @return {?}
     */
    setupSilentRefreshEventListener() {
        this.removeSilentRefreshEventListener();
        this.silentRefreshPostMessageEventListener = (e) => {
            let /** @type {?} */ expectedPrefix = '#';
            if (this.silentRefreshMessagePrefix) {
                expectedPrefix += this.silentRefreshMessagePrefix;
            }
            if (!e || !e.data || typeof e.data !== 'string') {
                return;
            }
            const /** @type {?} */ prefixedMessage = e.data;
            if (!prefixedMessage.startsWith(expectedPrefix)) {
                return;
            }
            const /** @type {?} */ message = '#' + prefixedMessage.substr(expectedPrefix.length);
            this.tryLogin({
                customHashFragment: message,
                preventClearHashAfterLogin: true,
                onLoginError: err => {
                    this.eventsSubject.next(new OAuthErrorEvent('silent_refresh_error', err));
                },
                onTokenReceived: () => {
                    this.eventsSubject.next(new OAuthSuccessEvent('silently_refreshed'));
                }
            }).catch(err => this.debug('tryLogin during silent refresh failed', err));
        };
        window.addEventListener('message', this.silentRefreshPostMessageEventListener);
    }
    /**
     * Performs a silent refresh for implicit flow.
     * Use this method to get a new tokens when/ before
     * the existing tokens expires.
     * @param {?=} params
     * @param {?=} noPrompt
     * @return {?}
     */
    silentRefresh(params = {}, noPrompt = true) {
        const /** @type {?} */ claims = this.getIdentityClaims() || {};
        if (this.useIdTokenHintForSilentRefresh && this.hasValidIdToken()) {
            params['id_token_hint'] = this.getIdToken();
        }
        /*
                    if (!claims) {
                        throw new Error('cannot perform a silent refresh as the user is not logged in');
                    }
                    */
        if (!this.validateUrlForHttps(this.loginUrl)) {
            throw new Error('tokenEndpoint must use Https. Also check property requireHttps.');
        }
        if (typeof document === 'undefined') {
            throw new Error('silent refresh is not supported on this platform');
        }
        const /** @type {?} */ existingIframe = document.getElementById(this.silentRefreshIFrameName);
        if (existingIframe) {
            document.body.removeChild(existingIframe);
        }
        this.silentRefreshSubject = claims['sub'];
        const /** @type {?} */ iframe = document.createElement('iframe');
        iframe.id = this.silentRefreshIFrameName;
        this.setupSilentRefreshEventListener();
        const /** @type {?} */ redirectUri = this.silentRefreshRedirectUri || this.redirectUri;
        this.createLoginUrl(null, null, redirectUri, noPrompt, params).then(url => {
            iframe.setAttribute('src', url);
            if (!this.silentRefreshShowIFrame) {
                iframe.style['display'] = 'none';
            }
            document.body.appendChild(iframe);
        });
        const /** @type {?} */ errors = this.events.pipe(filter(e => e instanceof OAuthErrorEvent), first());
        const /** @type {?} */ success = this.events.pipe(filter(e => e.type === 'silently_refreshed'), first());
        const /** @type {?} */ timeout = of(new OAuthErrorEvent('silent_refresh_timeout', null)).pipe(delay(this.silentRefreshTimeout));
        return race([errors, success, timeout])
            .pipe(tap(e => {
            if (e.type === 'silent_refresh_timeout') {
                this.eventsSubject.next(e);
            }
        }), map(e => {
            if (e instanceof OAuthErrorEvent) {
                throw e;
            }
            return e;
        }))
            .toPromise();
    }
    /**
     * @return {?}
     */
    canPerformSessionCheck() {
        if (!this.sessionChecksEnabled) {
            return false;
        }
        if (!this.sessionCheckIFrameUrl) {
            console.warn('sessionChecksEnabled is activated but there ' +
                'is no sessionCheckIFrameUrl');
            return false;
        }
        const /** @type {?} */ sessionState = this.getSessionState();
        if (!sessionState) {
            console.warn('sessionChecksEnabled is activated but there ' + 'is no session_state');
            return false;
        }
        if (typeof document === 'undefined') {
            return false;
        }
        return true;
    }
    /**
     * @return {?}
     */
    setupSessionCheckEventListener() {
        this.removeSessionCheckEventListener();
        this.sessionCheckEventListener = (e) => {
            const /** @type {?} */ origin = e.origin.toLowerCase();
            const /** @type {?} */ issuer = this.issuer.toLowerCase();
            this.debug('sessionCheckEventListener');
            if (!issuer.startsWith(origin)) {
                this.debug('sessionCheckEventListener', 'wrong origin', origin, 'expected', issuer);
            }
            switch (e.data) {
                case 'unchanged':
                    this.handleSessionUnchanged();
                    break;
                case 'changed':
                    this.handleSessionChange();
                    break;
                case 'error':
                    this.handleSessionError();
                    break;
            }
            this.debug('got info from session check inframe', e);
        };
        window.addEventListener('message', this.sessionCheckEventListener);
    }
    /**
     * @return {?}
     */
    handleSessionUnchanged() {
        this.debug('session check', 'session unchanged');
    }
    /**
     * @return {?}
     */
    handleSessionChange() {
        /* events: session_changed, relogin, stopTimer, logged_out*/
        this.eventsSubject.next(new OAuthInfoEvent('session_changed'));
        this.stopSessionCheckTimer();
        if (this.silentRefreshRedirectUri) {
            this.silentRefresh().catch(_ => this.debug('silent refresh failed after session changed'));
            this.waitForSilentRefreshAfterSessionChange();
        }
        else {
            this.eventsSubject.next(new OAuthInfoEvent('session_terminated'));
            this.logOut(true);
        }
    }
    /**
     * @return {?}
     */
    waitForSilentRefreshAfterSessionChange() {
        this.events
            .pipe(filter((e) => e.type === 'silently_refreshed' ||
            e.type === 'silent_refresh_timeout' ||
            e.type === 'silent_refresh_error'), first())
            .subscribe(e => {
            if (e.type !== 'silently_refreshed') {
                this.debug('silent refresh did not work after session changed');
                this.eventsSubject.next(new OAuthInfoEvent('session_terminated'));
                this.logOut(true);
            }
        });
    }
    /**
     * @return {?}
     */
    handleSessionError() {
        this.stopSessionCheckTimer();
        this.eventsSubject.next(new OAuthInfoEvent('session_error'));
    }
    /**
     * @return {?}
     */
    removeSessionCheckEventListener() {
        if (this.sessionCheckEventListener) {
            window.removeEventListener('message', this.sessionCheckEventListener);
            this.sessionCheckEventListener = null;
        }
    }
    /**
     * @return {?}
     */
    initSessionCheck() {
        if (!this.canPerformSessionCheck()) {
            return;
        }
        const /** @type {?} */ existingIframe = document.getElementById(this.sessionCheckIFrameName);
        if (existingIframe) {
            document.body.removeChild(existingIframe);
        }
        const /** @type {?} */ iframe = document.createElement('iframe');
        iframe.id = this.sessionCheckIFrameName;
        this.setupSessionCheckEventListener();
        const /** @type {?} */ url = this.sessionCheckIFrameUrl;
        iframe.setAttribute('src', url);
        // iframe.style.visibility = 'hidden';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        this.startSessionCheckTimer();
    }
    /**
     * @return {?}
     */
    startSessionCheckTimer() {
        this.stopSessionCheckTimer();
        this.sessionCheckTimer = setInterval(this.checkSession.bind(this), this.sessionCheckIntervall);
    }
    /**
     * @return {?}
     */
    stopSessionCheckTimer() {
        if (this.sessionCheckTimer) {
            clearInterval(this.sessionCheckTimer);
            this.sessionCheckTimer = null;
        }
    }
    /**
     * @return {?}
     */
    checkSession() {
        const /** @type {?} */ iframe = document.getElementById(this.sessionCheckIFrameName);
        if (!iframe) {
            console.warn('checkSession did not find iframe', this.sessionCheckIFrameName);
        }
        const /** @type {?} */ sessionState = this.getSessionState();
        if (!sessionState) {
            this.stopSessionCheckTimer();
        }
        const /** @type {?} */ message = this.clientId + ' ' + sessionState;
        iframe.contentWindow.postMessage(message, this.issuer);
    }
    /**
     * @param {?=} state
     * @param {?=} loginHint
     * @param {?=} customRedirectUri
     * @param {?=} noPrompt
     * @param {?=} params
     * @return {?}
     */
    createLoginUrl(state = '', loginHint = '', customRedirectUri = '', noPrompt = false, params = {}) {
        const /** @type {?} */ that = this;
        let /** @type {?} */ redirectUri;
        if (customRedirectUri) {
            redirectUri = customRedirectUri;
        }
        else {
            redirectUri = this.redirectUri;
        }
        return this.createAndSaveNonce().then((nonce) => {
            if (state) {
                state = nonce + this.config.nonceStateSeparator + state;
            }
            else {
                state = nonce;
            }
            if (!this.requestAccessToken && !this.oidc) {
                throw new Error('Either requestAccessToken or oidc or both must be true');
            }
            if (this.oidc && this.requestAccessToken) {
                this.responseType = 'id_token token';
            }
            else if (this.oidc && !this.requestAccessToken) {
                this.responseType = 'id_token';
            }
            else {
                this.responseType = 'token';
            }
            const /** @type {?} */ seperationChar = that.loginUrl.indexOf('?') > -1 ? '&' : '?';
            let /** @type {?} */ scope = that.scope;
            if (this.oidc && !scope.match(/(^|\s)openid($|\s)/)) {
                scope = 'openid ' + scope;
            }
            let /** @type {?} */ url = that.loginUrl +
                seperationChar +
                'response_type=' +
                encodeURIComponent(that.responseType) +
                '&client_id=' +
                encodeURIComponent(that.clientId) +
                '&state=' +
                encodeURIComponent(state) +
                '&redirect_uri=' +
                encodeURIComponent(redirectUri) +
                '&scope=' +
                encodeURIComponent(scope);
            if (loginHint) {
                url += '&login_hint=' + encodeURIComponent(loginHint);
            }
            if (that.resource) {
                url += '&resource=' + encodeURIComponent(that.resource);
            }
            if (that.oidc) {
                url += '&nonce=' + encodeURIComponent(nonce);
            }
            if (noPrompt) {
                url += '&prompt=none';
            }
            for (const /** @type {?} */ key of Object.keys(params)) {
                url +=
                    '&' + encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
            }
            if (this.customQueryParams) {
                for (const /** @type {?} */ key of Object.getOwnPropertyNames(this.customQueryParams)) {
                    url +=
                        '&' + key + '=' + encodeURIComponent(this.customQueryParams[key]);
                }
            }
            return url;
        });
    }
    /**
     * @param {?=} additionalState
     * @param {?=} params
     * @return {?}
     */
    initImplicitFlowInternal(additionalState = '', params = '') {
        if (this.inImplicitFlow) {
            return;
        }
        this.inImplicitFlow = true;
        if (!this.validateUrlForHttps(this.loginUrl)) {
            throw new Error('loginUrl must use Http. Also check property requireHttps.');
        }
        let /** @type {?} */ addParams = {};
        let /** @type {?} */ loginHint = null;
        if (typeof params === 'string') {
            loginHint = params;
        }
        else if (typeof params === 'object') {
            addParams = params;
        }
        this.createLoginUrl(additionalState, loginHint, null, false, addParams)
            .then(function (url) {
            location.href = url;
        })
            .catch(error => {
            console.error('Error in initImplicitFlow');
            console.error(error);
            this.inImplicitFlow = false;
        });
    }
    /**
     * Starts the implicit flow and redirects to user to
     * the auth servers login url.
     *
     * @param {?=} additionalState Optinal state that is passes around.
     *  You find this state in the property ``state`` after ``tryLogin`` logged in the user.
     * @param {?=} params Hash with additional parameter. If it is a string, it is used for the
     *               parameter loginHint (for the sake of compatibility with former versions)
     * @return {?}
     */
    initImplicitFlow(additionalState = '', params = '') {
        if (this.loginUrl !== '') {
            this.initImplicitFlowInternal(additionalState, params);
        }
        else {
            this.events
                .pipe(filter(e => e.type === 'discovery_document_loaded'))
                .subscribe(_ => this.initImplicitFlowInternal(additionalState, params));
        }
    }
    /**
     * @param {?} options
     * @return {?}
     */
    callOnTokenReceivedIfExists(options) {
        const /** @type {?} */ that = this;
        if (options.onTokenReceived) {
            const /** @type {?} */ tokenParams = {
                idClaims: that.getIdentityClaims(),
                idToken: that.getIdToken(),
                accessToken: that.getAccessToken(),
                state: that.state
            };
            options.onTokenReceived(tokenParams);
        }
    }
    /**
     * @param {?} accessToken
     * @param {?} refreshToken
     * @param {?} expiresIn
     * @param {?} grantedScopes
     * @return {?}
     */
    storeAccessTokenResponse(accessToken, refreshToken, expiresIn, grantedScopes) {
        this._storage.setItem('access_token', accessToken);
        if (grantedScopes) {
            this._storage.setItem('granted_scopes', JSON.stringify(grantedScopes.split('+')));
        }
        this._storage.setItem('access_token_stored_at', '' + Date.now());
        if (expiresIn) {
            const /** @type {?} */ expiresInMilliSeconds = expiresIn * 1000;
            const /** @type {?} */ now = new Date();
            const /** @type {?} */ expiresAt = now.getTime() + expiresInMilliSeconds;
            this._storage.setItem('expires_at', '' + expiresAt);
        }
        if (refreshToken) {
            this._storage.setItem('refresh_token', refreshToken);
        }
    }
    /**
     * Checks whether there are tokens in the hash fragment
     * as a result of the implicit flow. These tokens are
     * parsed, validated and used to sign the user in to the
     * current client.
     *
     * @param {?=} options Optinal options.
     * @return {?}
     */
    tryLogin(options = null) {
        options = options || {};
        let /** @type {?} */ parts;
        if (options.customHashFragment) {
            parts = this.urlHelper.getHashFragmentParams(options.customHashFragment);
        }
        else {
            parts = this.urlHelper.getHashFragmentParams();
        }
        this.debug('parsed url', parts);
        const /** @type {?} */ state = parts['state'];
        let /** @type {?} */ nonceInState = state;
        if (state) {
            const /** @type {?} */ idx = state.indexOf(this.config.nonceStateSeparator);
            if (idx > -1) {
                nonceInState = state.substr(0, idx);
                this.state = state.substr(idx + this.config.nonceStateSeparator.length);
            }
        }
        if (parts['error']) {
            this.debug('error trying to login');
            this.handleLoginError(options, parts);
            const /** @type {?} */ err = new OAuthErrorEvent('token_error', {}, parts);
            this.eventsSubject.next(err);
            return Promise.reject(err);
        }
        const /** @type {?} */ accessToken = parts['access_token'];
        const /** @type {?} */ idToken = parts['id_token'];
        const /** @type {?} */ sessionState = parts['session_state'];
        const /** @type {?} */ grantedScopes = parts['scope'];
        if (!this.requestAccessToken && !this.oidc) {
            return Promise.reject('Either requestAccessToken or oidc or both must be true.');
        }
        if (this.requestAccessToken && !accessToken) {
            return Promise.resolve();
        }
        if (this.requestAccessToken && !options.disableOAuth2StateCheck && !state) {
            return Promise.resolve();
        }
        if (this.oidc && !idToken) {
            return Promise.resolve();
        }
        if (this.sessionChecksEnabled && !sessionState) {
            console.warn('session checks (Session Status Change Notification) ' +
                'is activated in the configuration but the id_token ' +
                'does not contain a session_state claim');
        }
        if (this.requestAccessToken && !options.disableOAuth2StateCheck) {
            const /** @type {?} */ success = this.validateNonceForAccessToken(accessToken, nonceInState);
            if (!success) {
                const /** @type {?} */ event = new OAuthErrorEvent('invalid_nonce_in_state', null);
                this.eventsSubject.next(event);
                return Promise.reject(event);
            }
        }
        if (this.requestAccessToken) {
            this.storeAccessTokenResponse(accessToken, null, parts['expires_in'] || this.fallbackAccessTokenExpirationTimeInSec, grantedScopes);
        }
        if (!this.oidc) {
            this.eventsSubject.next(new OAuthSuccessEvent('token_received'));
            if (this.clearHashAfterLogin && !options.preventClearHashAfterLogin) {
                location.hash = '';
            }
            this.callOnTokenReceivedIfExists(options);
            return Promise.resolve();
        }
        return this.processIdToken(idToken, accessToken)
            .then(result => {
            if (options.validationHandler) {
                return options
                    .validationHandler({
                    accessToken: accessToken,
                    idClaims: result.idTokenClaims,
                    idToken: result.idToken,
                    state: state
                })
                    .then(_ => result);
            }
            return result;
        })
            .then(result => {
            this.storeIdToken(result);
            this.storeSessionState(sessionState);
            if (this.clearHashAfterLogin) {
                location.hash = '';
            }
            this.eventsSubject.next(new OAuthSuccessEvent('token_received'));
            this.callOnTokenReceivedIfExists(options);
            this.inImplicitFlow = false;
        })
            .catch(reason => {
            this.eventsSubject.next(new OAuthErrorEvent('token_validation_error', reason));
            console.error('Error validating tokens');
            console.error(reason);
            return Promise.reject(reason);
        });
    }
    /**
     * @param {?} accessToken
     * @param {?} nonceInState
     * @return {?}
     */
    validateNonceForAccessToken(accessToken, nonceInState) {
        const /** @type {?} */ savedNonce = this._storage.getItem('nonce');
        if (savedNonce !== nonceInState) {
            const /** @type {?} */ err = 'validating access_token failed. wrong state/nonce.';
            console.error(err, savedNonce, nonceInState);
            return false;
        }
        return true;
    }
    /**
     * @param {?} idToken
     * @return {?}
     */
    storeIdToken(idToken) {
        this._storage.setItem('id_token', idToken.idToken);
        this._storage.setItem('id_token_claims_obj', idToken.idTokenClaimsJson);
        this._storage.setItem('id_token_expires_at', '' + idToken.idTokenExpiresAt);
        this._storage.setItem('id_token_stored_at', '' + Date.now());
    }
    /**
     * @param {?} sessionState
     * @return {?}
     */
    storeSessionState(sessionState) {
        this._storage.setItem('session_state', sessionState);
    }
    /**
     * @return {?}
     */
    getSessionState() {
        return this._storage.getItem('session_state');
    }
    /**
     * @param {?} options
     * @param {?} parts
     * @return {?}
     */
    handleLoginError(options, parts) {
        if (options.onLoginError) {
            options.onLoginError(parts);
        }
        if (this.clearHashAfterLogin) {
            location.hash = '';
        }
    }
    /**
     * @ignore
     * @param {?} idToken
     * @param {?} accessToken
     * @return {?}
     */
    processIdToken(idToken, accessToken) {
        const /** @type {?} */ tokenParts = idToken.split('.');
        const /** @type {?} */ headerBase64 = this.padBase64(tokenParts[0]);
        const /** @type {?} */ headerJson = b64DecodeUnicode(headerBase64);
        const /** @type {?} */ header = JSON.parse(headerJson);
        const /** @type {?} */ claimsBase64 = this.padBase64(tokenParts[1]);
        const /** @type {?} */ claimsJson = b64DecodeUnicode(claimsBase64);
        const /** @type {?} */ claims = JSON.parse(claimsJson);
        const /** @type {?} */ savedNonce = this._storage.getItem('nonce');
        if (Array.isArray(claims.aud)) {
            if (claims.aud.every(v => v !== this.clientId)) {
                const /** @type {?} */ err = 'Wrong audience: ' + claims.aud.join(',');
                console.warn(err);
                return Promise.reject(err);
            }
        }
        else {
            if (claims.aud !== this.clientId) {
                const /** @type {?} */ err = 'Wrong audience: ' + claims.aud;
                console.warn(err);
                return Promise.reject(err);
            }
        }
        /*
                    if (this.getKeyCount() > 1 && !header.kid) {
                        let err = 'There needs to be a kid property in the id_token header when multiple keys are defined via the property jwks';
                        console.warn(err);
                        return Promise.reject(err);
                    }
                    */
        if (!claims.sub) {
            const /** @type {?} */ err = 'No sub claim in id_token';
            console.warn(err);
            return Promise.reject(err);
        }
        /* For now, we only check whether the sub against
                     * silentRefreshSubject when sessionChecksEnabled is on
                     * We will reconsider in a later version to do this
                     * in every other case too.
                     */
        if (this.sessionChecksEnabled &&
            this.silentRefreshSubject &&
            this.silentRefreshSubject !== claims['sub']) {
            const /** @type {?} */ err = 'After refreshing, we got an id_token for another user (sub). ' +
                `Expected sub: ${this.silentRefreshSubject}, received sub: ${claims['sub']}`;
            console.warn(err);
            return Promise.reject(err);
        }
        if (!claims.iat) {
            const /** @type {?} */ err = 'No iat claim in id_token';
            console.warn(err);
            return Promise.reject(err);
        }
        if (claims.iss !== this.issuer) {
            const /** @type {?} */ err = 'Wrong issuer: ' + claims.iss;
            console.warn(err);
            return Promise.reject(err);
        }
        if (claims.nonce !== savedNonce) {
            const /** @type {?} */ err = 'Wrong nonce: ' + claims.nonce;
            console.warn(err);
            return Promise.reject(err);
        }
        if (!this.disableAtHashCheck &&
            this.requestAccessToken &&
            !claims['at_hash']) {
            const /** @type {?} */ err = 'An at_hash is needed!';
            console.warn(err);
            return Promise.reject(err);
        }
        const /** @type {?} */ now = Date.now();
        const /** @type {?} */ issuedAtMSec = claims.iat * 1000;
        const /** @type {?} */ expiresAtMSec = claims.exp * 1000;
        const /** @type {?} */ tenMinutesInMsec = 1000 * 60 * 10;
        if (issuedAtMSec - tenMinutesInMsec >= now ||
            expiresAtMSec + tenMinutesInMsec <= now) {
            const /** @type {?} */ err = 'Token has been expired';
            console.error(err);
            console.error({
                now: now,
                issuedAtMSec: issuedAtMSec,
                expiresAtMSec: expiresAtMSec
            });
            return Promise.reject(err);
        }
        const /** @type {?} */ validationParams = {
            accessToken: accessToken,
            idToken: idToken,
            jwks: this.jwks,
            idTokenClaims: claims,
            idTokenHeader: header,
            loadKeys: () => this.loadJwks()
        };
        if (!this.disableAtHashCheck &&
            this.requestAccessToken &&
            !this.checkAtHash(validationParams)) {
            const /** @type {?} */ err = 'Wrong at_hash';
            console.warn(err);
            return Promise.reject(err);
        }
        return this.checkSignature(validationParams).then(_ => {
            const /** @type {?} */ result = {
                idToken: idToken,
                idTokenClaims: claims,
                idTokenClaimsJson: claimsJson,
                idTokenHeader: header,
                idTokenHeaderJson: headerJson,
                idTokenExpiresAt: expiresAtMSec
            };
            return result;
        });
    }
    /**
     * Returns the received claims about the user.
     * @return {?}
     */
    getIdentityClaims() {
        const /** @type {?} */ claims = this._storage.getItem('id_token_claims_obj');
        if (!claims) {
            return null;
        }
        return JSON.parse(claims);
    }
    /**
     * Returns the granted scopes from the server.
     * @return {?}
     */
    getGrantedScopes() {
        const /** @type {?} */ scopes = this._storage.getItem('granted_scopes');
        if (!scopes) {
            return null;
        }
        return JSON.parse(scopes);
    }
    /**
     * Returns the current id_token.
     * @return {?}
     */
    getIdToken() {
        return this._storage
            ? this._storage.getItem('id_token')
            : null;
    }
    /**
     * @param {?} base64data
     * @return {?}
     */
    padBase64(base64data) {
        while (base64data.length % 4 !== 0) {
            base64data += '=';
        }
        return base64data;
    }
    /**
     * Returns the current access_token.
     * @return {?}
     */
    getAccessToken() {
        return this._storage.getItem('access_token');
    }
    /**
     * @return {?}
     */
    getRefreshToken() {
        return this._storage.getItem('refresh_token');
    }
    /**
     * Returns the expiration date of the access_token
     * as milliseconds since 1970.
     * @return {?}
     */
    getAccessTokenExpiration() {
        if (!this._storage.getItem('expires_at')) {
            return null;
        }
        return parseInt(this._storage.getItem('expires_at'), 10);
    }
    /**
     * @return {?}
     */
    getAccessTokenStoredAt() {
        return parseInt(this._storage.getItem('access_token_stored_at'), 10);
    }
    /**
     * @return {?}
     */
    getIdTokenStoredAt() {
        return parseInt(this._storage.getItem('id_token_stored_at'), 10);
    }
    /**
     * Returns the expiration date of the id_token
     * as milliseconds since 1970.
     * @return {?}
     */
    getIdTokenExpiration() {
        if (!this._storage.getItem('id_token_expires_at')) {
            return null;
        }
        return parseInt(this._storage.getItem('id_token_expires_at'), 10);
    }
    /**
     * Checkes, whether there is a valid access_token.
     * @return {?}
     */
    hasValidAccessToken() {
        if (this.getAccessToken()) {
            const /** @type {?} */ expiresAt = this._storage.getItem('expires_at');
            const /** @type {?} */ now = new Date();
            if (expiresAt && parseInt(expiresAt, 10) < now.getTime()) {
                return false;
            }
            return true;
        }
        return false;
    }
    /**
     * Checkes, whether there is a valid id_token.
     * @return {?}
     */
    hasValidIdToken() {
        if (this.getIdToken()) {
            const /** @type {?} */ expiresAt = this._storage.getItem('id_token_expires_at');
            const /** @type {?} */ now = new Date();
            if (expiresAt && parseInt(expiresAt, 10) < now.getTime()) {
                return false;
            }
            return true;
        }
        return false;
    }
    /**
     * Returns the auth-header that can be used
     * to transmit the access_token to a service
     * @return {?}
     */
    authorizationHeader() {
        return 'Bearer ' + this.getAccessToken();
    }
    /**
     * Removes all tokens and logs the user out.
     * If a logout url is configured, the user is
     * redirected to it.
     * @param {?=} noRedirectToLogoutUrl
     * @return {?}
     */
    logOut(noRedirectToLogoutUrl = false) {
        const /** @type {?} */ id_token = this.getIdToken();
        this._storage.removeItem('access_token');
        this._storage.removeItem('id_token');
        this._storage.removeItem('refresh_token');
        this._storage.removeItem('nonce');
        this._storage.removeItem('expires_at');
        this._storage.removeItem('id_token_claims_obj');
        this._storage.removeItem('id_token_expires_at');
        this._storage.removeItem('id_token_stored_at');
        this._storage.removeItem('access_token_stored_at');
        this._storage.removeItem('granted_scopes');
        this._storage.removeItem('session_state');
        this.silentRefreshSubject = null;
        this.eventsSubject.next(new OAuthInfoEvent('logout'));
        if (!this.logoutUrl) {
            return;
        }
        if (noRedirectToLogoutUrl) {
            return;
        }
        if (!id_token && !this.postLogoutRedirectUri) {
            return;
        }
        let /** @type {?} */ logoutUrl;
        if (!this.validateUrlForHttps(this.logoutUrl)) {
            throw new Error('logoutUrl must use Http. Also check property requireHttps.');
        }
        // For backward compatibility
        if (this.logoutUrl.indexOf('{{') > -1) {
            logoutUrl = this.logoutUrl
                .replace(/\{\{id_token\}\}/, id_token)
                .replace(/\{\{client_id\}\}/, this.clientId);
        }
        else {
            let /** @type {?} */ params = new HttpParams();
            if (id_token) {
                params = params.set('id_token_hint', id_token);
            }
            const /** @type {?} */ postLogoutUrl = this.postLogoutRedirectUri || this.redirectUri;
            if (postLogoutUrl) {
                params = params.set('post_logout_redirect_uri', postLogoutUrl);
            }
            logoutUrl =
                this.logoutUrl +
                    (this.logoutUrl.indexOf('?') > -1 ? '&' : '?') +
                    params.toString();
        }
        location.href = logoutUrl;
    }
    /**
     * @ignore
     * @return {?}
     */
    createAndSaveNonce() {
        const /** @type {?} */ that = this;
        return this.createNonce().then(function (nonce) {
            that._storage.setItem('nonce', nonce);
            return nonce;
        });
    }
    /**
     * @return {?}
     */
    createNonce() {
        return new Promise((resolve, reject) => {
            if (this.rngUrl) {
                throw new Error('createNonce with rng-web-api has not been implemented so far');
            }
            else {
                let /** @type {?} */ text = '';
                const /** @type {?} */ possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                for (let /** @type {?} */ i = 0; i < 40; i++) {
                    text += possible.charAt(Math.floor(Math.random() * possible.length));
                }
                resolve(text);
            }
        });
    }
    /**
     * @param {?} params
     * @return {?}
     */
    checkAtHash(params) {
        if (!this.tokenValidationHandler) {
            console.warn('No tokenValidationHandler configured. Cannot check at_hash.');
            return true;
        }
        return this.tokenValidationHandler.validateAtHash(params);
    }
    /**
     * @param {?} params
     * @return {?}
     */
    checkSignature(params) {
        if (!this.tokenValidationHandler) {
            console.warn('No tokenValidationHandler configured. Cannot check signature.');
            return Promise.resolve(null);
        }
        return this.tokenValidationHandler.validateSignature(params);
    }
}
OAuthService.decorators = [
    { type: Injectable },
];
/** @nocollapse */
OAuthService.ctorParameters = () => [
    { type: NgZone, },
    { type: HttpClient, },
    { type: OAuthStorage, decorators: [{ type: Optional },] },
    { type: ValidationHandler, decorators: [{ type: Optional },] },
    { type: AuthConfig, decorators: [{ type: Optional },] },
    { type: UrlHelperService, },
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * @abstract
 */
class OAuthModuleConfig {
}
/**
 * @abstract
 */
class OAuthResourceServerConfig {
}

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * @abstract
 */
class OAuthResourceServerErrorHandler {
}
class OAuthNoopResourceServerErrorHandler {
    /**
     * @param {?} err
     * @return {?}
     */
    handleError(err) {
        return throwError(err);
    }
}

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
class DefaultOAuthInterceptor {
    /**
     * @param {?} authStorage
     * @param {?} errorHandler
     * @param {?} moduleConfig
     */
    constructor(authStorage, errorHandler, moduleConfig) {
        this.authStorage = authStorage;
        this.errorHandler = errorHandler;
        this.moduleConfig = moduleConfig;
    }
    /**
     * @param {?} url
     * @return {?}
     */
    checkUrl(url) {
        const /** @type {?} */ found = this.moduleConfig.resourceServer.allowedUrls.find(u => url.startsWith(u));
        return !!found;
    }
    /**
     * @param {?} req
     * @param {?} next
     * @return {?}
     */
    intercept(req, next) {
        const /** @type {?} */ url = req.url.toLowerCase();
        if (!this.moduleConfig) {
            return next.handle(req);
        }
        if (!this.moduleConfig.resourceServer) {
            return next.handle(req);
        }
        if (this.moduleConfig.resourceServer.allowedUrls && !this.checkUrl(url)) {
            return next.handle(req);
        }
        const /** @type {?} */ sendAccessToken = this.moduleConfig.resourceServer.sendAccessToken;
        if (sendAccessToken && this.authStorage.getItem('access_token')) {
            const /** @type {?} */ token = this.authStorage.getItem('access_token');
            const /** @type {?} */ header = 'Bearer ' + token;
            const /** @type {?} */ headers = req.headers.set('Authorization', header);
            req = req.clone({ headers });
        }
        return next
            .handle(req)
            .pipe(catchError(err => this.errorHandler.handleError(err)));
    }
}
DefaultOAuthInterceptor.decorators = [
    { type: Injectable },
];
/** @nocollapse */
DefaultOAuthInterceptor.ctorParameters = () => [
    { type: OAuthStorage, },
    { type: OAuthResourceServerErrorHandler, },
    { type: OAuthModuleConfig, decorators: [{ type: Optional },] },
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * A validation handler that isn't validating nothing.
 * Can be used to skip validation (on your own risk).
 */
class NullValidationHandler {
    /**
     * @param {?} validationParams
     * @return {?}
     */
    validateSignature(validationParams) {
        return Promise.resolve(null);
    }
    /**
     * @param {?} validationParams
     * @return {?}
     */
    validateAtHash(validationParams) {
        return true;
    }
}

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * @return {?}
 */
function createDefaultStorage() {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
}
class OAuthModule {
    /**
     * @param {?=} config
     * @param {?=} validationHandlerClass
     * @return {?}
     */
    static forRoot(config = null, validationHandlerClass = NullValidationHandler) {
        // const setupInterceptor = config && config.resourceServer && config.resourceServer.allowedUrls;
        return {
            ngModule: OAuthModule,
            providers: [
                OAuthService,
                UrlHelperService,
                { provide: OAuthStorage, useFactory: createDefaultStorage },
                { provide: ValidationHandler, useClass: validationHandlerClass },
                {
                    provide: OAuthResourceServerErrorHandler,
                    useClass: OAuthNoopResourceServerErrorHandler
                },
                { provide: OAuthModuleConfig, useValue: config },
                {
                    provide: HTTP_INTERCEPTORS,
                    useClass: DefaultOAuthInterceptor,
                    multi: true
                }
            ]
        };
    }
}
OAuthModule.decorators = [
    { type: NgModule, args: [{
                imports: [CommonModule],
                declarations: [],
                exports: []
            },] },
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * Validates the signature of an id_token against one
 * of the keys of an JSON Web Key Set (jwks).
 *
 * This jwks can be provided by the discovery document.
 */
class JwksValidationHandler extends AbstractValidationHandler {
    constructor() {
        super(...arguments);
        /**
         * Allowed algorithms
         */
        this.allowedAlgorithms = [
            'HS256',
            'HS384',
            'HS512',
            'RS256',
            'RS384',
            'RS512',
            'ES256',
            'ES384',
            'PS256',
            'PS384',
            'PS512'
        ];
        /**
         * Time period in seconds the timestamp in the signature can
         * differ from the current time.
         */
        this.gracePeriodInSec = 600;
    }
    /**
     * @param {?} params
     * @param {?=} retry
     * @return {?}
     */
    validateSignature(params, retry = false) {
        if (!params.idToken)
            throw new Error('Parameter idToken expected!');
        if (!params.idTokenHeader)
            throw new Error('Parameter idTokenHandler expected.');
        if (!params.jwks)
            throw new Error('Parameter jwks expected!');
        if (!params.jwks['keys'] ||
            !Array.isArray(params.jwks['keys']) ||
            params.jwks['keys'].length === 0) {
            throw new Error('Array keys in jwks missing!');
        }
        // console.debug('validateSignature: retry', retry);
        let /** @type {?} */ kid = params.idTokenHeader['kid'];
        let /** @type {?} */ keys = params.jwks['keys'];
        let /** @type {?} */ key;
        let /** @type {?} */ alg = params.idTokenHeader['alg'];
        if (kid) {
            key = keys.find(k => k['kid'] === kid /* && k['use'] === 'sig' */);
        }
        else {
            let /** @type {?} */ kty = this.alg2kty(alg);
            let /** @type {?} */ matchingKeys = keys.filter(k => k['kty'] === kty && k['use'] === 'sig');
            /*
                        if (matchingKeys.length == 0) {
                            let error = 'No matching key found.';
                            console.error(error);
                            return Promise.reject(error);
                        }*/
            if (matchingKeys.length > 1) {
                let /** @type {?} */ error = 'More than one matching key found. Please specify a kid in the id_token header.';
                console.error(error);
                return Promise.reject(error);
            }
            else if (matchingKeys.length === 1) {
                key = matchingKeys[0];
            }
        }
        if (!key && !retry && params.loadKeys) {
            return params
                .loadKeys()
                .then(loadedKeys => (params.jwks = loadedKeys))
                .then(_ => this.validateSignature(params, true));
        }
        if (!key && retry && !kid) {
            let /** @type {?} */ error = 'No matching key found.';
            console.error(error);
            return Promise.reject(error);
        }
        if (!key && retry && kid) {
            let /** @type {?} */ error = 'expected key not found in property jwks. ' +
                'This property is most likely loaded with the ' +
                'discovery document. ' +
                'Expected key id (kid): ' +
                kid;
            console.error(error);
            return Promise.reject(error);
        }
        let /** @type {?} */ keyObj = KEYUTIL.getKey(key);
        let /** @type {?} */ validationOptions = {
            alg: this.allowedAlgorithms,
            gracePeriod: this.gracePeriodInSec
        };
        let /** @type {?} */ isValid = KJUR.jws.JWS.verifyJWT(params.idToken, keyObj, validationOptions);
        if (isValid) {
            return Promise.resolve();
        }
        else {
            return Promise.reject('Signature not valid');
        }
    }
    /**
     * @param {?} alg
     * @return {?}
     */
    alg2kty(alg) {
        switch (alg.charAt(0)) {
            case 'R':
                return 'RSA';
            case 'E':
                return 'EC';
            default:
                throw new Error('Cannot infer kty from alg: ' + alg);
        }
    }
    /**
     * @param {?} valueToHash
     * @param {?} algorithm
     * @return {?}
     */
    calcHash(valueToHash, algorithm) {
        let /** @type {?} */ hashAlg = new KJUR.crypto.MessageDigest({ alg: algorithm });
        let /** @type {?} */ result = hashAlg.digestString(valueToHash);
        let /** @type {?} */ byteArrayAsString = this.toByteArrayAsString(result);
        return byteArrayAsString;
    }
    /**
     * @param {?} hexString
     * @return {?}
     */
    toByteArrayAsString(hexString) {
        let /** @type {?} */ result = '';
        for (let /** @type {?} */ i = 0; i < hexString.length; i += 2) {
            let /** @type {?} */ hexDigit = hexString.charAt(i) + hexString.charAt(i + 1);
            let /** @type {?} */ num = parseInt(hexDigit, 16);
            result += String.fromCharCode(num);
        }
        return result;
    }
}

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
const AUTH_CONFIG = new InjectionToken('AUTH_CONFIG');

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * Generated bundle index. Do not edit.
 */

export { createDefaultStorage, OAuthModule, OAuthService, JwksValidationHandler, NullValidationHandler, ValidationHandler, AbstractValidationHandler, UrlHelperService, AuthConfig, LoginOptions, OAuthStorage, ReceivedTokens, AUTH_CONFIG, OAuthEvent, OAuthSuccessEvent, OAuthInfoEvent, OAuthErrorEvent, DefaultOAuthInterceptor, OAuthResourceServerErrorHandler, OAuthNoopResourceServerErrorHandler, OAuthModuleConfig, OAuthResourceServerConfig };
//# sourceMappingURL=angular-oauth2-oidc.js.map
