const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'jsodms'
});

db.connect(err => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('MySQL Connected...');
});

// Multer Setup for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Register Endpoint
app.post('/api/register', async (req, res) => {
  const { name, email, password, phone } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, phone],
      (err, result) => {
        if (err) {
          console.error('Error during registration:', err);
          return res.status(500).json({ success: false, message: 'Registration failed' });
        }
        res.json({ success: true, message: 'Registration successful' });
      }
    );
  } catch (error) {
    console.error('Error hashing password:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Login Endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, result) => {
    if (err) {
      console.error('Error during login:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
    if (result.length === 0) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    const user = result[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Invalid password' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ success: true, token });
  });
});

// Middleware to verify JWT token
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    return res.status(401).json({ success: false, message: 'Invalid token format' });
  }

  const token = tokenParts[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Failed to authenticate token' });
    }
    req.user = decoded;
    next();
  });
};

// Get user details Endpoint
app.get('/api/user', authenticate, (req, res) => {
  db.query('SELECT id, name, email, phone FROM users WHERE id = ?', [req.user.userId], (err, result) => {
    if (err) {
      console.error('Error fetching user details:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json(result[0]);
  });
});

// Get user-specific responses Endpoint
app.get('/api/responses', authenticate, (req, res) => {
  db.query('SELECT * FROM responses WHERE user_id = ? AND is_deleted = FALSE', [req.user.userId], (err, result) => {
    if (err) {
      console.error('Error fetching responses:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
    res.json(result);
  });
});

// Upload file Endpoint
app.post('/api/upload', authenticate, upload.single('file'), (req, res) => {
  const { fileName, rowId } = req.body;
  const file = req.file.filename;

  db.query(
    'INSERT INTO responses (user_id, response, file, fileName, rowId) VALUES (?, ?, ?, ?, ?)',
    [req.user.userId, 'File uploaded', file, fileName, rowId],
    (err, result) => {
      if (err) {
        console.error('Error saving file info:', err);
        return res.status(500).json({ success: false, message: 'Failed to save file info' });
      }
      res.status(201).json({ success: true, file });
    }
  );
});

// Soft Delete file Endpoint
app.delete('/api/delete/:id', authenticate, (req, res) => {
  const { id } = req.params;

  console.log(`Received request to delete file with ID: ${id}`); // Logging the ID

  db.query('SELECT file FROM responses WHERE id = ? AND user_id = ? AND is_deleted = FALSE', [id, req.user.userId], (err, result) => {
    console.log(req.user.userId)
    if (err) {
      console.error('Error fetching file info:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
    if (result.length === 0) {
      console.log('File not found in database for ID:', id); // Logging if file not found
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    db.query('UPDATE responses SET is_deleted = TRUE WHERE id = ? AND user_id = ?', [id, req.user.userId], (dbErr, updateResult) => {
      if (dbErr) {
        console.error('Error marking file as deleted in database:', dbErr);
        return res.status(500).json({ success: false, message: 'Failed to mark file as deleted in database' });
      }
      res.json({ success: true, message: 'File marked as deleted successfully' });
    });
  });
});




// // Get all users Endpoint
// app.get('/api/users', authenticate, (req, res) => {
//   db.query('SELECT id, name, email, phone FROM users', (err, result) => {
//     if (err) {
//       console.error('Error fetching users:', err);
//       return res.status(500).json({ success: false, message: 'Internal server error' });
//     }
//     res.json(result);
//   });
// });

// Server Listening
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});





// Get all users Endpoint
app.get('/api/users', authenticate, (req, res) => {
  db.query('SELECT id, name, email, phone FROM users', (err, result) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
    res.json(result);
  });
});

// Get responses for a specific user by userName
app.get('/api/responses/:userName', authenticate, (req, res) => {
  const { userName } = req.params;
  db.query('SELECT * FROM users WHERE name = ?', [userName], (err, userResult) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
    if (userResult.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const userId = userResult[0].id;
    db.query('SELECT * FROM responses WHERE user_id = ? AND is_deleted = FALSE', [userId], (err, responseResult) => {
      if (err) {
        console.error('Error fetching responses:', err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
      }
      res.json(responseResult);
    });
  });
});


app.post('/api/upload', authenticate, upload.single('file'), (req, res) => {
  const { fileName, rowId, userId } = req.body;
  const file = req.file.filename;

  // Check if the authenticated user has permission to upload files for the selected user
  if (req.user.id !== parseInt(userId) && !req.user.isAdmin) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  db.query(
    'INSERT INTO responses (user_id, response, file, fileName, rowId) VALUES (?, ?, ?, ?, ?)',
    [userId, 'File uploaded', file, fileName, rowId],
    (err, result) => {
      if (err) {
        console.error('Error saving file info:', err);
        return res.status(500).json({ success: false, message: 'Failed to save file info' });
      }
      res.status(201).json({ success: true, file, id: result.insertId, user_id: userId });
    }
  );
});


// app.post('/api/upload', authenticate, upload.single('file'), (req, res) => {
//   const { fileName, rowId, userId } = req.body;
//   const file = req.file.filename;

//   // Check if the authenticated user has permission to upload files for the selected user
//   if (req.user.id !== parseInt(userId) && !req.user.isAdmin) {
//     return res.status(403).json({ success: false, message: 'Unauthorized' });
//   }

//   db.query(
//     'INSERT INTO responses (user_id, response, file, fileName, rowId) VALUES (?, ?, ?, ?, ?)',
//     [userId, 'File uploaded', file, fileName, rowId],
//     (err, result) => {
//       if (err) {
//         console.error('Error saving file info:', err);
//         return res.status(500).json({ success: false, message: 'Failed to save file info' });
//       }
//       res.status(201).json({ success: true, file, id: result.insertId, user_id: userId });
//     }
//   );
// });




// app.delete('/api/delete/:id', authenticate, (req, res) => {
//   const { id } = req.params;
//   const { userId } = req.body;

//   // Check if the authenticated user has permission to delete files for the selected user
//   if (req.user.id !== parseInt(userId) && !req.user.isAdmin) {
//     return res.status(403).json({ success: false, message: 'Unauthorized' });
//   }

//   db.query('SELECT file FROM responses WHERE id = ? AND user_id = ? AND is_deleted = FALSE', [id, userId], (err, result) => {
//     if (err) {
//       console.error('Error fetching file info:', err);
//       return res.status(500).json({ success: false, message: 'Internal server error' });
//     }
//     if (result.length === 0) {
//       return res.status(404).json({ success: false, message: 'File not found' });
//     }

//     db.query('UPDATE responses SET is_deleted = TRUE WHERE id = ? AND user_id = ?', [id, userId], (dbErr, updateResult) => {
//       if (dbErr) {
//         console.error('Error marking file as deleted in database:', dbErr);
//         return res.status(500).json({ success: false, message: 'Failed to mark file as deleted in database' });
//       }
//       res.json({ success: true, message: 'File marked as deleted successfully' });
//     });
//   });
// });
app.delete('/api/delete/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  // Check if the authenticated user has permission to delete files for the selected user
  if (req.user.id !== parseInt(userId) && !req.user.isAdmin) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  db.query('SELECT file FROM responses WHERE id = ? AND user_id = ? AND is_deleted = FALSE', [id, userId], (err, result) => {
    if (err) {
      console.error('Error fetching file info:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    db.query('UPDATE responses SET is_deleted = TRUE WHERE id = ? AND user_id = ?', [id, userId], (dbErr, updateResult) => {
      if (dbErr) {
        console.error('Error marking file as deleted in database:', dbErr);
        return res.status(500).json({ success: false, message: 'Failed to mark file as deleted in database' });
      }
      res.json({ success: true, message: 'File marked as deleted successfully' });
    });
  });
});




// Reset Password Endpoint
app.post('/api/reset-password', authenticate, async (req, res) => {
  const { userId, newPassword } = req.body;

  // Check if the authenticated user is an admin
  if (!req.user.isAdmin) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId],
      (err, result) => {
        if (err) {
          console.error('Error resetting password:', err);
          return res.status(500).json({ success: false, message: 'Failed to reset password' });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'Password reset successfully' });
      }
    );
  } catch (error) {
    console.error('Error hashing password:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});






// Generate JWT for a specific user
app.post('/api/login-as-user', authenticate, (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  const { userId } = req.body;

  db.query('SELECT id FROM users WHERE id = ?', [userId], (err, result) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const token = jwt.sign({ userId: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ success: true, token });
  });
});
