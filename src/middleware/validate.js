/**
 * Middleware de validation des données
 * Vérifie les champs requis dans le body de la requête
 */
const validateRequired = (fields) => {
    return (req, res, next) => {
        const missing = [];
        for (const field of fields) {
            if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
                missing.push(field);
            }
        }

        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Champs requis manquants : ${missing.join(', ')}`,
            });
        }

        next();
    };
};

/**
 * Validation email
 */
const validateEmail = (req, res, next) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (req.body.email && !emailRegex.test(req.body.email)) {
        return res.status(400).json({
            success: false,
            message: 'Format d\'email invalide.',
        });
    }
    next();
};

/**
 * Validation mot de passe (min 6 caractères)
 */
const validatePassword = (req, res, next) => {
    if (req.body.password && req.body.password.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Le mot de passe doit contenir au moins 6 caractères.',
        });
    }
    next();
};

module.exports = { validateRequired, validateEmail, validatePassword };
