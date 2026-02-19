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
