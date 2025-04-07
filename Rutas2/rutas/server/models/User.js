const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9_]+$/.test(v);
      },
      message: 'Username can only contain letters, numbers and underscores'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Soha nem kerül visszaküldésre lekérdezéseknél
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // Lehet null is, de ha megvan, akkor egyedi
    trim: true,
    lowercase: true,
    validate: {
      validator: validator.isEmail,
      message: 'Please provide a valid email'
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Automatikus createdAt és updatedAt kezelés
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Jelszó hashelése mindig mentés előtt
userSchema.pre('save', async function(next) {
  // Csak akkor hash-eljük, ha módosult a jelszó
  if (!this.isModified('password')) return next();

  try {
    // Extra biztonságos hash-elés
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Jelszó összehasonlítás (timing safe)
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Token generálás metódus
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
};

// Statikus metódus felhasználó kereséshez
userSchema.statics.findByCredentials = async function(username, password) {
  const user = await this.findOne({ username }).select('+password');
  
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isMatch = await user.comparePassword(password);
  
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  return user;
};

// Frissítés dátumának automatikus beállítása
userSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('User', userSchema);