const admin = require('../firebase-admin');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Attach decoded user onto req
    req.user = decodedToken;
    next();
  } catch (err) {
    console.error('Firebase Auth Error validating token:', err);
    return res.status(401).json({ error: 'Unauthorized: Invalid ID token' });
  }
};

module.exports = requireAuth;
