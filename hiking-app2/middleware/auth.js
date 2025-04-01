const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    // Token kinyerése a headerből
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Nincs hitelesítési token' 
      });
    }

    // Token ellenőrzése
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Felhasználó hozzáadása a requesthez
    req.user = {
      id: decoded.id,
      username: decoded.username
    };
    
    next();
  } catch (error) {
    console.error('Hitelesítési hiba:', error);
    res.status(401).json({ 
      success: false,
      message: 'Érvénytelen token' 
    });
  }
};

module.exports = auth;