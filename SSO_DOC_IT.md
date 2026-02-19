# Implementazione Single Sign-On (SSO) in Pwndoc con Keycloak

---

## Sommario

1. [Introduzione](#1-introduzione)
   - 1.1 [Contesto](#11-contesto)
   - 1.2 [Tecnologie Utilizzate](#12-tecnologie-utilizzate)
   - 1.3 [Flusso di Autenticazione OIDC](#13-flusso-di-autenticazione-oidc)
2. [Architettura della Soluzione](#2-architettura-della-soluzione)
   - 2.1 [Diagramma dell'Architettura](#21-diagramma-dellarchitettura)
   - 2.2 [Struttura del Progetto](#22-struttura-del-progetto)
3. [Fase 1: Installazione e Configurazione di Keycloak](#3-fase-1-installazione-e-configurazione-di-keycloak)
   - 3.1 [Creazione della Cartella Keycloak](#31-creazione-della-cartella-keycloak)
   - 3.2 [Creazione del File docker-compose.yml](#32-creazione-del-file-docker-composeyml)
   - 3.3 [Avvio di Keycloak](#33-avvio-di-keycloak)
   - 3.4 [Verifica dell'Installazione](#34-verifica-dellinstallazione)
4. [Fase 2: Configurazione del Realm e del Client in Keycloak](#4-fase-2-configurazione-del-realm-e-del-client-in-keycloak)
   - 4.1 [Accesso alla Console di Amministrazione](#41-accesso-alla-console-di-amministrazione)
   - 4.2 [Creazione del Realm](#42-creazione-del-realm)
   - 4.3 [Creazione del Client OIDC](#43-creazione-del-client-oidc)
   - 4.4 [Recupero del Client Secret](#44-recupero-del-client-secret)
   - 4.5 [Creazione di un Utente](#45-creazione-di-un-utente)
5. [Fase 3: Modifica del Backend Pwndoc](#5-fase-3-modifica-del-backend-pwndoc)
   - 5.1 [Modifica del docker-compose.yml di Pwndoc](#51-modifica-del-docker-composeyml-di-pwndoc)
   - 5.2 [Installazione delle Dipendenze Node.js](#52-installazione-delle-dipendenze-nodejs)
   - 5.3 [Creazione del File di Configurazione OIDC](#53-creazione-del-file-di-configurazione-oidc)
   - 5.4 [Creazione della Strategia Passport](#54-creazione-della-strategia-passport)
   - 5.5 [Modifica del File app.js](#55-modifica-del-file-appjs)
   - 5.6 [Modifica del File user.js (Routes)](#56-modifica-del-file-userjs-routes)
6. [Fase 4: Modifica del Frontend Pwndoc](#6-fase-4-modifica-del-frontend-pwndoc)
   - 6.1 [Modifica della Pagina di Login](#61-modifica-della-pagina-di-login)
7. [Fase 5: Test e Validazione](#7-fase-5-test-e-validazione)
   - 7.1 [Riavvio dei Container](#71-riavvio-dei-container)
   - 7.2 [Verifica dei Container](#72-verifica-dei-container)
   - 7.3 [Test della Connettività](#73-test-della-connettività)
   - 7.4 [Test del Login SSO](#74-test-del-login-sso)
   - 7.5 [Verifica dei Log](#75-verifica-dei-log)
8. [Troubleshooting](#8-troubleshooting)
9. [Considerazioni sulla Sicurezza](#9-considerazioni-sulla-sicurezza)
10. [Conclusioni](#10-conclusioni)
    - 10.1 [Riepilogo delle Attività Completate](#101-riepilogo-delle-attività-completate)
    - 10.2 [Prossimi Passi Consigliati](#102-prossimi-passi-consigliati)
    - 10.3 [Manutenzione](#103-manutenzione)
11. [Appendice A: File di Configurazione Completi](#11-appendice-a-file-di-configurazione-completi)

---

## 1. Introduzione

Questa guida descrive la configurazione del Single Sign-On (SSO) tra Pwndoc e Keycloak.
Una volta completata la configurazione, l'amministratore potrà creare gli utenti direttamente in Keycloak all'interno del realm pwndoc, assegnando loro una password temporanea. Quando un utente accede per la prima volta alla pagina di login di Pwndoc, troverà il pulsante "Login with SSO" come unico metodo di autenticazione disponibile. Cliccando sul pulsante, verrà reindirizzato alla pagina di login di Keycloak dove inserirà le credenziali temporanee fornite dall'amministratore. Al primo accesso, Keycloak richiederà di impostare una nuova password personale che verrà salvata esclusivamente in Keycloak.
A questo punto, l'utente viene creato automaticamente in Pwndoc tramite il meccanismo di auto-provisioning, con ruolo di default user. Per tutti gli accessi successivi, l'utente utilizzerà le credenziali impostate in Keycloak. La sessione ha una durata di 24 ore, dopodiché sarà necessario autenticarsi nuovamente.
È importante sottolineare che le credenziali sono gestite centralmente da Keycloak e gli utenti SSO non possono utilizzare il login tradizionale di Pwndoc

### 1.1 Contesto

Pwndoc è un'applicazione web open-source progettata per la gestione e la generazione di report di penetration testing. L'applicazione utilizza nativamente un sistema di autenticazione locale basato su username e password con token JWT.

L'implementazione di un sistema Single Sign-On (SSO) permette di:

- Centralizzare la gestione delle identità
- Migliorare la sicurezza attraverso autenticazione federata
- Semplificare l'accesso degli utenti a molteplici applicazioni
- Abilitare funzionalità avanzate come Multi-Factor Authentication (MFA)



### 1.2 Tecnologie Utilizzate

| Componente | Tecnologia | Versione |
|------------|------------|----------|
| Identity Provider | Keycloak | 26.5.1 |
| Applicazione Target | Pwndoc| Latest |
| Protocollo SSO | OpenID Connect (OIDC) | 1.0 |
| Container Runtime | Docker | Latest |
| Orchestrazione | Docker Compose | v2 |
| Database Keycloak | PostgreSQL | 16-alpine |
| Database Pwndoc| MongoDB | 4.2 |

### 1.3 Flusso di Autenticazione OIDC

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Utente  │────▶│   Pwndoc   │────▶│   Keycloak   │
│ (Browser)│     │  (Frontend)  │     │     (IdP)    │
└──────────┘     └──────────────┘     └──────────────┘
     │                  │                     │
     │  1. Click SSO    │                     │
     │─────────────────▶│                     │
     │                  │  2. Redirect to KC  │
     │                  │────────────────────▶│
     │                  │                     │
     │  3. Login Page   │◀────────────────────│
     │◀─────────────────│                     │
     │                  │                     │
     │  4. Credentials  │                     │
     │────────────────────────────────────────▶
     │                  │                     │
     │  5. Auth Code    │◀────────────────────│
     │◀─────────────────│                     │
     │                  │                     │
     │  6. Callback     │                     │
     │─────────────────▶│                     │
     │                  │  7. Token Exchange  │
     │                  │────────────────────▶│
     │                  │                     │
     │                  │  8. ID Token + AT   │
     │                  │◀────────────────────│
     │                  │                     │
     │  9. JWT Cookie   │                     │
     │◀─────────────────│                     │
     │                  │                     │
     │  10. Redirect    │                     │
     │  to Dashboard    │                     │
     │◀─────────────────│                     │
```

---

## 2. Architettura della Soluzione

### 2.1 Diagramma dell'Architettura

```
                    ┌─────────────────────────────────────────────────────┐
                    │                    Host System                       │
                    │                                                      │
┌──────────┐        │  ┌─────────────────────────────────────────────┐   │
│          │        │  │              Docker Network: sso-network     │   │
│  Browser │◀──────────▶                                              │   │
│          │        │  │  ┌─────────────┐      ┌─────────────────┐   │   │
└──────────┘        │  │  │  Keycloak   │◀────▶│   PostgreSQL    │   │   │
     :8080 ─────────┼──┼─▶│   :8080     │      │   (keycloak-db) │   │   │
                    │  │  └─────────────┘      └─────────────────┘   │   │
                    │  │         ▲                                    │   │
                    │  │         │ OIDC                               │   │
                    │  │         ▼                                    │   │
     :8443 ─────────┼──┼─▶┌─────────────┐      ┌─────────────────┐   │   │
                    │  │  │  Pwndoc   │      │        Pwndoc    │   │   │
                    │  │  │  Frontend   │◀────▶│    Backend      │   │   │
                    │  │  │   :8443     │      │    :4242        │   │   │
                    │  │  └─────────────┘      └────────┬────────┘   │   │
                    │  │                                │             │   │
                    │  │                                ▼             │   │
                    │  │                       ┌─────────────────┐   │   │
                    │  │                       │    MongoDB      │   │   │
                    │  │                       │   (pwndoc-db)   │   │   │
                    │  │                       └─────────────────┘   │   │
                    │  │                                              │   │
                    │  └─────────────────────────────────────────────┘   │
                    │                                                      │
                    └─────────────────────────────────────────────────────┘
```

### 2.2 Struttura del Progetto

```
/home/user/
├── keycloak/
│   └── docker-compose.yml          # Configurazione Keycloak standalone
│
└── pwndoc/
    ├── docker-compose.yml          # Configurazione Pwndoc (modificata)
    ├── backend/
    │   └── src/
    │       ├── app.js              # Entry point (modificato)
    │       ├── config/
    │       │   └── oidc.json       # Configurazione OIDC (nuovo)
    │       ├── lib/
    │       │   └── passport.js     # Strategia OIDC (nuovo)
    │       └── routes/
    │           └── user.js         # Route autenticazione (modificato)
    │
    └── frontend/
        └── src/
            └── pages/
                └── login.vue       # Pagina login (modificata)
```

---

## 3. Fase 1: Installazione e Configurazione di Keycloak

### 3.1 Creazione della Cartella Keycloak

```bash
# Posizionarsi nella directory home o nella directory desiderata
cd ~

# Creare la cartella per Keycloak e spostarsi dentro
mkdir keycloak && cd keycloak
```

### 3.2 Creazione del File docker-compose.yml

```bash
nano docker-compose.yml
```

Contenuto del file:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: keycloak-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: keycloak_password
    volumes:
      - keycloak_postgres_data:/var/lib/postgresql/data
    networks:
      - sso-network

  keycloak:
    image: quay.io/keycloak/keycloak:26.5.1
    container_name: keycloak
    restart: unless-stopped
    command: start-dev
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: keycloak_password
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
      KC_HOSTNAME: localhost
      KC_HOSTNAME_STRICT: false
      KC_HTTP_ENABLED: true
    ports:
      - "8080:8080"
    depends_on:
      - postgres
    networks:
      - sso-network

volumes:
  keycloak_postgres_data:

networks:
  sso-network:
    name: sso-network
    driver: bridge
```

### 3.3 Avvio di Keycloak

```bash
# Avviare i container Keycloak
docker-compose up -d

# Verificare lo stato dei container e logs
docker ps
docker logs keycloak --tail 20
```

### 3.4 Verifica dell'Installazione

Aprire un browser e navigare a: http://localhost:8080

Dovreste vedere la pagina di benvenuto di Keycloak.

---

## 4. Fase 2: Configurazione del Realm e del Client in Keycloak

### 4.1 Accesso alla Console di Amministrazione

1. Accedere a http://localhost:8080
2. Effettuare il login con le credenziali di default:
   - Username: `admin`
   - Password: `admin`

### 4.2 Creazione del Realm

1. Nel menù a sinistra, cliccare su "Create Realm"
2. Inserire i seguenti valori e premere "Create":
   - Realm name: `pwndoc`
   - Enabled: `ON`

### 4.3 Creazione del Client OIDC

#### 4.3.1 Configurazione Base

1. Nel realm pwndoc, navigare a **Clients** nel menu laterale
2. Cliccare su "Create client"
3. **General Settings**:
   - Client type: `OpenID Connect`
   - Client ID: `pwndoc`
4. Cliccare su "Next"

#### 4.3.2 Capability Config

- Client authentication: `ON`
- Authorization: `OFF`
- Standard flow: `Enabled` (default)
- Direct access grants: `Enabled`

Cliccare su "Next"

#### 4.3.3 Login Settings

- Root URL: `https://localhost:8443`
- Valid redirect URIs: `https://localhost:8443/*`
- Web origins: `https://localhost:8443`

Cliccare su "Save"

### 4.4 Recupero del Client Secret

1. Nella pagina del client pwndoc, cliccare sulla tab "Credentials"
2. Copiare il valore del campo "Client secret"
3. Conservare questo valore per la configurazione successiva

> **IMPORTANTE:** Il Client Secret è un valore sensibile. Nell'esempio useremo uno fittizio: `z7GhKpLfj0dFif3w90TsRZlbF3WLXbQr`. In ambiente di produzione, è opportuno utilizzare un secret generato casualmente e conservarlo in modo sicuro.

### 4.5 Creazione di un Utente

#### 4.5.1 Creazione dell'Utente

1. Nel menu laterale, cliccare su "Users"
2. Cliccare su "Add user"
3. Compilare i campi:
   - Username: `testuser`
   - Email: `test@example.com`
   - First name: `Test`
   - Last name: `User`
   - Email verified: `ON`
   - Enabled: `ON`
4. Cliccare su "Create"

#### 4.5.2 Impostazione della Password

1. Nella pagina dell'utente, cliccare sulla tab "Credentials"
2. Cliccare su "Set password"
3. Impostare una password:
   - Password: `password123`
   - Password confirmation: `password123`
   - Temporary: `OFF`
4. Cliccare su "Save"

---

## 5. Fase 3: Modifica del Backend Pwndoc

### 5.1 Modifica del docker-compose.yml di Pwndoc

#### 5.1.1 Backup del File Originale

```bash
cd ~/pwndoc
cp docker-compose.yml docker-compose.yml.backup
```

#### 5.1.2 Modifica del File

```bash
nano docker-compose.yml
```

Modificare il file per aggiungere la rete SSO ai servizi backend e frontend.

**Modifiche al servizio backend:** aggiungere `sso-network` alla lista delle networks.

**Modifiche al servizio frontend:** aggiungere `sso-network` alla lista delle networks.

**Aggiunta della definizione del network alla fine del file:**

```yaml
networks:
  backend:
    driver: bridge
  sso-network:
    external: true
    name: sso-network
```

### 5.2 Installazione delle Dipendenze Node.js

```bash
cd ~/pwndoc/backend

# Installare le librerie necessarie per OIDC
npm install passport passport-openidconnect openid-client express-session
```

### 5.3 Creazione del File di Configurazione OIDC

#### 5.3.1 Creazione del File oidc.json

```bash
cd ~/pwndoc/backend/src/config
nano oidc.json
```

Contenuto del file:

```json
{
    "enabled": true,
    "issuer": "http://localhost:8080/realms/pwndoc",
    "clientID": "pwndoc",
    "clientSecret": "z7GhKpLfj0dFif3w90TsRZlbF3WLXbQr",
    "callbackURL": "https://localhost:8443/api/users/oidc/callback",
    "scope": "openid profile email",
    "autoProvision": true,
    "defaultRole": "user"
}
```

> **Nota:** Sostituire `clientSecret` con il valore ottenuto dalla console Keycloak.

### 5.4 Creazione della Strategia Passport

#### 5.4.1 Creazione del File passport.js

```bash
cd ~/pwndoc/backend/src/lib
nano passport.js
```

Contenuto completo del file:

```javascript
var passport = require('passport');
var OpenIDConnectStrategy = require('passport-openidconnect').Strategy;
var User = require('mongoose').model('User');
var oidcConfig = require('../config/oidc.json');

// Configurazione OIDC
if (oidcConfig.enabled) {
    passport.use('oidc', new OpenIDConnectStrategy({
        issuer: oidcConfig.issuer,
        clientID: oidcConfig.clientID,
        clientSecret: oidcConfig.clientSecret,
        authorizationURL: 'http://localhost:8080/realms/pwndoc/protocol/openid-connect/auth',
        tokenURL: 'http://keycloak:8080/realms/pwndoc/protocol/openid-connect/token',
        userInfoURL: 'http://keycloak:8080/realms/pwndoc/protocol/openid-connect/userinfo',
        callbackURL: oidcConfig.callbackURL,
        scope: oidcConfig.scope
    },
    function(issuer, profile, done) {
        console.log('=== CHIAMATA OIDC ===');
        console.log('Profile username:', profile.username);
        
        var username = profile.username || profile.preferred_username;
        console.log('Cerco utente con username:', username);
        
        User.findOne({ username: username })
        .then(function(user) {
            console.log('Risultato findOne:', user ? user.username : 'NON TROVATO');
            
            if (user) {
                console.log('Utente esistente trovato!');
                return done(null, user);
            } else if (oidcConfig.autoProvision) {
                console.log('AutoProvision attivo, creo nuovo utente...');
                var newUser = {
                    username: username,
                    firstname: profile.name && profile.name.givenName ? profile.name.givenName : 'User',
                    lastname: profile.name && profile.name.familyName ? profile.name.familyName : '',
                    email: profile.emails && profile.emails[0] ? profile.emails[0].value : '',
                    role: oidcConfig.defaultRole,
                    enabled: true,
                    password: require('crypto').randomBytes(32).toString('hex')
                };
                console.log('Nuovo utente da creare:', newUser.username);
                
                return User.create([newUser])
                    .then(function(result) {
                        console.log('Risultato create:', result);
                        return User.findOne({ username: username });
                    })
                    .then(function(createdUser) {
                        if (createdUser) {
                            console.log('Utente creato e trovato:', createdUser.username);
                            return done(null, createdUser);
                        } else {
                            console.log('ERRORE: utente non trovato dopo creazione');
                            return done(null, false, { message: 'User creation failed' });
                        }
                    })
                    .catch(function(err) {
                        console.log('ERRORE creazione utente:', err);
                        return done(err);
                    });
            } else {
                console.log('AutoProvision disabilitato');
                return done(null, false, { message: 'User not found' });
            }
        })
        .catch(function(err) {
            console.log('ERRORE findOne:', err);
            return done(err);
        });
    }));

    passport.serializeUser(function(user, done) {
        console.log('serializeUser:', user._id);
        done(null, user._id);
    });

    passport.deserializeUser(function(id, done) {
        User.findById(id)
        .then(function(user) { done(null, user); })
        .catch(function(err) { done(err); });
    });
}

module.exports = passport;
```

> **Note:**
> - `authorizationURL`: Usa `localhost` perché viene chiamato dal browser dell'utente
> - `tokenURL` e `userInfoURL`: Usano `keycloak` perché sono chiamate server-to-server tra container Docker

### 5.5 Modifica del File app.js

#### 5.5.1 Apertura del File

```bash
cd ~/pwndoc/backend/src
nano app.js
```

#### 5.5.2 Aggiunta degli Import

Dopo la riga:
```javascript
var cookieParser = require('cookie-parser')
```

Aggiungere:
```javascript
var session = require('express-session');
var MongoStore = require('connect-mongo'); //necessario per aggiornare i nuovi utenti creati

```

#### 5.5.3 Spostamento dell'Import Passport

Dopo la riga:
```javascript
require('./models/settings');
```

Aggiungere:
```javascript
var passport = require('./lib/passport');
```

> **IMPORTANTE:** L'import di passport DEVE essere DOPO i require dei modelli, altrimenti si verificherà un errore "MissingSchemaError".

#### 5.5.4 Configurazione della Session


Prima della riga:
```javascript
app.use(cookieParser())

//Aggiungere le variabili d'ambiente:

const mongoHost = process.env.DB_SERVER || 'mongodb';
const mongoName = process.env.DB_NAME || 'pwndoc';
```
Dopo la riga:
```javascript
app.use(cookieParser())

// Aggiungere:

// Session store in MongoDB - serve per persistenza OIDC nei redirects degli utenti
app.use(session({
  secret: 'pwndoc-session-secret',
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({
    mongoUrl: `mongodb://${mongoHost}:27017/${mongoName}`,
    ttl: 24 * 60 * 60
  }),
  cookie: { 
    secure: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());
```

#### 5.5.5 Aggiunta dell'Error Handler (Opzionale ma Consigliato)

Prima della riga:
```javascript
app.get("*", function(req, res) {
```

Aggiungere:
```javascript
// Error handler per catturare errori non gestiti
app.use(function(err, req, res, next) {
    console.log('=== ERROR HANDLER GLOBALE ===');
    console.log('Error:', err);
    console.log('Stack:', err.stack);
    res.status(500).json({error: err.message});
});
```
** Assicurarsi che le variabili d'ambiente esistano anche in docker-compose.yml di Pwndoc, nella sezione pwndoc-backend.**

### 5.6 Modifica del File user.js (Routes)

#### 5.6.1 Apertura del File

```bash
cd ~/pwndoc/backend/src/routes
nano user.js
```

#### 5.6.2 Aggiunta dell'Import Passport

Dopo la riga:
```javascript
var acl = require('../lib/auth').acl;
```

Aggiungere:
```javascript
var passport = require('../lib/passport');
```

#### 5.6.3 Aggiunta delle Route OIDC

Alla fine del file, PRIMA della chiusura `}` finale, aggiungere:

```javascript
    // OIDC Login - Inizia autenticazione
    app.get('/api/users/oidc/login', function(req, res, next) {
        console.log('=== OIDC LOGIN CHIAMATO ===');
        next();
    }, passport.authenticate('oidc'));

    // OIDC Callback - Keycloak rimanda qui dopo login
    app.get('/api/users/oidc/callback', function(req, res, next) {
        console.log('=== ROUTE CALLBACK RAGGIUNTA ===');
        console.log('Query params:', req.query);
        
        passport.authenticate('oidc', function(err, user, info) {
            console.log('=== PASSPORT AUTHENTICATE RESULT ===');
            console.log('Error:', err);
            console.log('User:', user ? user.username : 'null');
            console.log('Info:', info);
            
            if (err) {
                console.log('ERRORE PASSPORT:', err.message);
                console.log('ERRORE STACK:', err.stack);
                return res.status(500).json({error: err.message, stack: err.stack});
            }
            if (!user) {
                console.log('NESSUN UTENTE - Info:', info);
                return res.status(401).json({error: 'Authentication failed', info: info});
            }
            
            req.logIn(user, function(loginErr) {
                if (loginErr) {
                    console.log('ERRORE LOGIN:', loginErr);
                    return res.status(500).json({error: loginErr.message});
                }
                
                console.log('=== LOGIN RIUSCITO ===');
                console.log('Username:', user.username);
                
                var userId = user._id;
                var refreshToken = jwt.sign({sessionId: null, userId: userId}, jwtRefreshSecret);
                
                User.updateRefreshToken(refreshToken, req.headers['user-agent'])
                .then(msg => {
                    console.log('Token generati con successo');
                    res.cookie('token', `JWT ${msg.token}`, {secure: true, sameSite: 'strict', httpOnly: true});
                    res.cookie('refreshToken', msg.refreshToken, {secure: true, sameSite: 'strict', httpOnly: true, path: '/api/users/refreshtoken'});
                    res.redirect('https://localhost:8443');
                })
                .catch(tokenErr => {
                    console.log('ERRORE TOKEN:', tokenErr);
                    res.status(500).json({error: tokenErr.message});
                });
            });
        })(req, res, next);
    });

    console.log('=== ROUTE OIDC REGISTRATE ===');
    console.log('Login: /api/users/oidc/login');
    console.log('Callback: /api/users/oidc/callback');
```

---

## 6. Fase 4: Modifica del Frontend Pwndoc

### 6.1 Modifica della Pagina di Login

#### 6.1.1 Apertura del File

```bash
cd ~/pwndoc/frontend/src/pages
nano login.vue
```

#### 6.1.2 Aggiunta del Pulsante SSO nel Template

Trovare la sezione:
```html
<q-card-section align="center">
    <q-btn :loading="loginLoading" color="blue" class="full-width" unelevated no-caps @click="getToken()">{{$t('login')}}</q-btn>
</q-card-section>
```

Aggiungere DOPO questa sezione:
```html
<q-card-section align="center" class="q-pt-none">
    <q-separator class="q-mb-md" />
    <p class="text-grey-6 q-mb-md">oppure</p>
    <q-btn color="orange" class="full-width" unelevated no-caps @click="loginSSO()">
        <q-icon name="mdi-shield-key" class="q-mr-sm" />
        Login with SSO
    </q-btn>
</q-card-section>
```

#### 6.1.3 Aggiunta del Metodo loginSSO

Nella sezione `methods:`, dopo il metodo `getToken()`, aggiungere:

```javascript
loginSSO() {
    window.location.href = '/api/users/oidc/login';
}
```

> **NOTA:** Assicurarsi che il metodo precedente (`getToken`) termini con una virgola prima di aggiungere `loginSSO()`.

---

## 7. Fase 5: Test e Validazione

### 7.1 Riavvio dei Container

```bash
# Fermare tutti i container
cd ~/pwndoc
docker-compose down
cd ~/keycloak
docker-compose down

# Riavviare Keycloak
cd ~/keycloak
docker-compose up -d

# Attendere 30 secondi per l'avvio di Keycloak
sleep 30

# Riavviare Pwndoc con rebuild
cd ~/pwndoc
docker-compose build --no-cache backend frontend
docker-compose up -d
```

### 7.2 Verifica dei Container

```bash
docker ps
```

### 7.3 Test della Connettività

```bash
# Verificare che il backend possa raggiungere Keycloak
docker exec -it pwndoc-backend wget -qO- http://keycloak:8080/realms/pwndoc/.well-known/openid-configuration | head -1
```

Output atteso (dovrebbe iniziare con):
```json
{"issuer":"http://localhost:8080/realms/pwndoc",...}
```

### 7.4 Test del Login SSO

1. Aprire un browser e navigare a: `https://localhost:8443`
2. Accettare l'avviso del certificato self-signed
3. Verificare che appaia la pagina di login con il pulsante "Login with SSO"
4. Cliccare su "Login with SSO"
5. Si verrà reindirizzati alla pagina di login di Keycloak
6. Inserire le credenziali precedentemente impostate:
   - Username: `testuser`
   - Password: `password123`
7. Dopo l'autenticazione, si verrà reindirizzati alla dashboard di Pwndoc

### 7.5 Verifica dei Log

```bash
# Monitorare i log del backend durante il login
docker logs -f pwndoc-backend
```

Log attesi per un login SSO riuscito:
```
=== OIDC LOGIN CHIAMATO ===
=== ROUTE CALLBACK RAGGIUNTA ===
Query params: { state: '...', session_state: '...', iss: 'http://localhost:8080/realms/pwndoc', code: '...' }
=== STRATEGIA OIDC CHIAMATA ===
Profile username: testuser
Cerco utente con username: testuser
Risultato findOne: NON TROVATO (o username se già esistente)
AutoProvision attivo, creo nuovo utente...
Utente creato e trovato: testuser
=== PASSPORT AUTHENTICATE RESULT ===
User: testuser
=== LOGIN RIUSCITO ===
Token generati con successo
```

---

## 8. Troubleshooting

### 8.1 Errore: "ID token not issued by expected OpenID provider"

**Causa probabile:** Mismatch tra l'issuer configurato e quello dichiarato da Keycloak.

**Soluzione:**
1. Verificare l'issuer in oidc.json:
   ```bash
   cat ~/pwndoc/backend/src/config/oidc.json | grep issuer
   ```
2. L'issuer deve essere esattamente: `http://localhost:8080/realms/pwndoc`
3. Verificare che `KC_HOSTNAME: localhost` sia configurato nel docker-compose di Keycloak

### 8.2 Errore: "MissingSchemaError: Schema hasn't been registered for model User"

**Causa probabile:** L'import di passport.js avviene prima del caricamento dei modelli Mongoose.

**Soluzione:** Spostare `var passport = require('./lib/passport');` DOPO tutti i `require('./models/...')` in app.js.

### 8.3 Errore: "Failed to obtain access token"

**Causa probabile:** Il backend non riesce a contattare Keycloak sulla rete interna.

**Soluzione:**
1. Verificare che entrambi i container siano sulla rete sso-network:
   ```bash
   docker network inspect sso-network
   ```
2. Verificare la connettività:
   ```bash
   docker exec -it pwndoc-backend ping -c 3 keycloak
   ```

### 8.4 Errore: "authentication_expired"

**Causa probabile:** La sessione scade tra la richiesta di autenticazione e il callback.

**Soluzione:** Verificare la configurazione della session in app.js:
```javascript
app.use(session({
  secret: 'pwndoc-session-secret',
  resave: false,
  saveUninitialized: true,  // Deve essere TRUE
  cookie: { 
    secure: true,
    sameSite: 'lax'  // Deve essere 'lax' per permettere redirect cross-site
  }
}));
```

### 8.5 Il Pulsante SSO Non Appare

**Causa probabile:** Il frontend non è stato ricompilato dopo le modifiche.

**Soluzione:**
```bash
cd ~/pwndoc
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d
```

### 8.6 Container in Restart Loop

**Causa probabile:** Errore di sintassi nei file JavaScript o configurazione errata.

**Soluzione:**
1. Controllare i log:
   ```bash
   docker logs pwndoc-backend --tail 100
   ```
2. Correggere eventuali errori di sintassi
3. Ricompilare il container

---

## 9. Considerazioni sulla Sicurezza

### 9.1 Configurazione HTTPS per Keycloak

```yaml
keycloak:
  environment:
    KC_HTTPS_CERTIFICATE_FILE: /opt/keycloak/conf/server.crt
    KC_HTTPS_CERTIFICATE_KEY_FILE: /opt/keycloak/conf/server.key
  volumes:
    - ./certs:/opt/keycloak/conf/
```

### 9.2 Protezione del Client Secret

Invece di memorizzare il secret in oidc.json, utilizzare variabili d'ambiente:

```json
// In oidc.json
{
    "clientSecret": "${OIDC_CLIENT_SECRET}"
}
```

```yaml
// Nel docker-compose
environment:
  - OIDC_CLIENT_SECRET=your-secret-here
```

---

## 10. Conclusioni

### 10.1 Riepilogo delle Attività Completate

-  Installazione e configurazione di Keycloak come Identity Provider
-  Creazione del Realm e del Client OIDC
-  Integrazione del protocollo OIDC nel backend di Pwndoc
-  Aggiunta del pulsante "Login with SSO" nel frontend
-  Test e validazione del flusso di autenticazione

### 10.2 Prossimi Passi Consigliati

1. **Integrazione MFA:** Abilitare l'autenticazione multi-fattore in Keycloak
2. **Integrazione LDAP/AD:** È possibile collegare Keycloak a una directory aziendale
3. **Estensione ad altre applicazioni:** Utilizzare lo stesso Realm per:
   - OpenVAS
   - Pentester Collaborator Framework
   - Altre applicazioni interne

### 10.3 Manutenzione

- **Backup regolari:** Eseguire backup del database PostgreSQL di Keycloak
- **Aggiornamenti:** Mantenere Keycloak aggiornato all'ultima versione stabile
- **Monitoring:** Implementare monitoring dei log per rilevare tentativi di accesso anomali

### Riferimenti

[1] Keycloak Documentation, "Server Administration Guide," Red Hat, 2024. [Online]. Available: https://www.keycloak.org/documentation

[2] OpenID Foundation, "OpenID Connect Core 1.0," 2014. [Online]. Available: https://openid.net/specs/openid-connect-core-1_0.html

[3] D. Hardt, "The OAuth 2.0 Authorization Framework," RFC 6749, Internet Engineering Task Force (IETF), October 2012. [Online]. Available: https://datatracker.ietf.org/doc/html/rfc6749


[5] Jared Hanson, "Passport.js - Simple, unobtrusive authentication for Node.js," 2024. [Online]. Available: https://www.passportjs.org/

[6] Jared Hanson, "passport-openidconnect - OpenID Connect authentication strategy for Passport," GitHub Repository. [Online]. Available: https://github.com/jaredhanson/passport-openidconnect
[7] Docker Inc., "Docker Compose Documentation," 2024. [Online]. Available: https://docs.docker.com/compose/

[8] MongoDB Inc., "connect-mongo - MongoDB session store for Express," GitHub Repository. [Online]. Available: https://github.com/jdesboeufs/connect-mongo

[9] OWASP Foundation, "Authentication Cheat Sheet," OWASP Cheat Sheet Series. [Online]. Available: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

[10] Red Hat, "Securing Applications and Services Guide - Keycloak," 2024. [Online]. Available: https://www.keycloak.org/docs/latest/securing_apps/


---



**Fine** ❤️
