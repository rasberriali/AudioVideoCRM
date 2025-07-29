const fs = require('fs');

// Authentication endpoint
function setupAuthRoutes(app) {
  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, password } = req.body;
      console.log(`[AUTH] Login attempt for: ${username}`);
      
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }

      // Load users from /mnt/server_data/users.json
      let users = [];
      const usersPath = '/mnt/server_data/users.json';
      
      try {
        if (fs.existsSync(usersPath)) {
          const userData = fs.readFileSync(usersPath, 'utf8');
          users = JSON.parse(userData);
          console.log(`[AUTH] Loaded ${users.length} users from server data`);
        } else {
          console.log(`[AUTH] Users file not found at ${usersPath}`);
          return res.status(500).json({
            success: false,
            message: 'User database not available'
          });
        }
      } catch (error) {
        console.error('[AUTH] Error loading users:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to load user database'
        });
      }

      // Find user by username or email
      const user = users.find(u => 
        (u.username && u.username.toLowerCase() === username.toLowerCase()) ||
        (u.email && u.email.toLowerCase() === username.toLowerCase())
      );

      if (!user || user.password !== password || !user.active) {
        console.log(`[AUTH] Authentication failed for: ${username}`);
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password'
        });
      }

      console.log(`[AUTH] Authentication successful for: ${user.firstName} ${user.lastName}`);

      // Return user data without password
      const { password: _, ...userData } = user;
      
      res.json({
        success: true,
        user: userData,
        message: 'Login successful'
      });

    } catch (error) {
      console.error('[AUTH] Server error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Custom authentication endpoint 
  app.post('/api/auth/custom-login', async (req, res) => {
    try {
      const { identifier, password } = req.body;
      console.log(`[AUTH] Custom login attempt for: ${identifier}`);
      
      // Read from local master_users.json file
      let users = [];
      try {
        const usersData = fs.readFileSync('../client/employee_profiles/master_users.json', 'utf8');
        users = JSON.parse(usersData);
        console.log(`[AUTH] Loaded ${users.length} users from master_users.json`);
      } catch (error) {
        console.error('[AUTH] Error reading master_users.json:', error.message);
        return res.status(500).json({ 
          success: false, 
          message: 'Authentication system error' 
        });
      }

      // Find user by username or email
      const user = users.find(u => 
        u.username === identifier || 
        u.email === identifier ||
        u.username.toLowerCase() === identifier.toLowerCase() ||
        u.email.toLowerCase() === identifier.toLowerCase()
      );

      if (!user) {
        console.log(`[AUTH] User not found for identifier: ${identifier}`);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }

      console.log(`[AUTH] User found: ${user.firstName} ${user.lastName} (${user.username})`);

      // Check password (expected format: FirstName123!)
      const expectedPassword = `${user.firstName}123!`;
      
      if (password !== expectedPassword) {
        console.log(`[AUTH] Password mismatch for ${identifier}. Expected: ${expectedPassword}, Got: ${password}`);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }

      console.log(`[AUTH] Successful login for ${user.firstName} ${user.lastName}`);
      
      // Return user data (excluding sensitive info)
      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        success: true, 
        user: userWithoutPassword,
        message: `Welcome back, ${user.firstName}!`
      });

    } catch (error) {
      console.error('[AUTH] Authentication error:', error.message);
      res.status(500).json({ 
        success: false, 
        message: 'Authentication system error' 
      });
    }
  });
}

module.exports = setupAuthRoutes;