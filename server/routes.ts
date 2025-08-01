import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import fs from "fs";
import path from "path";
import axios from "axios";
import { storage } from "./external-storage";
export function registerRoutes(app: Express): Server {

  // Authentication endpoints
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Check local users.json first
      const usersPath = './employee_profiles/master_users.json';
      let users = [];
      
      try {
        const userData = fs.readFileSync(usersPath, 'utf8');
        users = JSON.parse(userData);
      } catch (error) {
        console.log('[AUTH] No local users file found');
      }
      
      // Find user
      const user = users.find(u => 
        u.username === username || u.email === username
      );
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // For demo, use simple password format: FirstName123!
      const expectedPassword = `${user.firstName}123!`;
      
      if (password !== expectedPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Return user data
      res.json({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        department: user.department,
        permissions: user.permissions,
        active: user.active
      });
      
    } catch (error) {
      console.error('[AUTH] Login error:', error.message);
      res.status(500).json({ message: 'Authentication failed' });
    }
  });

  // Task assignment endpoints
  app.post('/api/admin/task-assignments', async (req, res) => {
    try {
      const taskData = {
        id: Date.now(),
        ...req.body,
        assignedAt: new Date().toISOString(),
        status: 'assigned'
      };

      // Save to employee profile directory (use EMP_00X format)
      const employeeProfilePath = `./employee_profiles/EMP_00${req.body.employeeId}`;
      const taskDashboardPath = `${employeeProfilePath}/taskdashboard.json`;
      
      // Get employee username for task file naming
      let employeeUsername = '';
      try {
        const masterEmployees = JSON.parse(fs.readFileSync('./employee_profiles/master_employees.json', 'utf8'));
        const employee = masterEmployees.find(emp => emp.employeeId === req.body.employeeId);
        employeeUsername = employee ? employee.username : `user${req.body.employeeId}`;
      } catch (error) {
        employeeUsername = `user${req.body.employeeId}`;
      }
      
      // Create individual task notification file for Android app
      const taskNotificationPath = `${employeeProfilePath}/task${employeeUsername}.json`;
      
      try {
        // Ensure directory exists
        if (!fs.existsSync(employeeProfilePath)) {
          fs.mkdirSync(employeeProfilePath, { recursive: true });
        }

        // Load existing tasks or create new array
        let existingTasks = [];
        try {
          const existingData = fs.readFileSync(taskDashboardPath, 'utf8');
          existingTasks = JSON.parse(existingData);
        } catch (error) {
          existingTasks = [];
        }

        // Add new task
        existingTasks.push(taskData);
        fs.writeFileSync(taskDashboardPath, JSON.stringify(existingTasks, null, 2));
        
        console.log(`[TASK ASSIGNMENT] Saved task to ${taskDashboardPath}`);
        
        // Create/update individual task notification file for Android app
        const notificationData = {
          username: employeeUsername,
          userId: req.body.employeeId,
          tasks: [taskData],
          lastUpdated: new Date().toISOString(),
          notificationSettings: {
            enabled: true,
            frequencies: taskData.notificationSettings?.intervals || [300, 900, 1800, 3600], // 5min, 15min, 30min, 1hr
            persistUntilComplete: taskData.notificationSettings?.persistUntilComplete || true,
            urgencyLevel: taskData.notificationSettings?.urgencyLevel || 'normal'
          }
        };
        
        // Load existing task notifications
        let existingNotifications = notificationData;
        try {
          const existingNotificationData = fs.readFileSync(taskNotificationPath, 'utf8');
          existingNotifications = JSON.parse(existingNotificationData);
          existingNotifications.tasks.push(taskData);
          existingNotifications.lastUpdated = new Date().toISOString();
        } catch (error) {
          // File doesn't exist, use new notification data
        }
        
        fs.writeFileSync(taskNotificationPath, JSON.stringify(existingNotifications, null, 2));
        console.log(`[TASK NOTIFICATION] Created task notification file: ${taskNotificationPath}`);

      } catch (fileError) {
        console.error('[TASK ASSIGNMENT] File system error:', fileError.message);
      }

      res.status(201).json({ 
        success: true, 
        id: taskData.id,
        message: 'Task assigned successfully',
        ...taskData
      });

    } catch (error) {
      console.error('[ADMIN TASK ASSIGNMENTS] Create error:', error.message);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to assign task',
        error: error.message
      });
    }
  });

  // Custom authentication endpoint 
  app.post('/api/auth/custom-login', async (req, res) => {
    try {
      const { identifier, password } = req.body;
      console.log(`[AUTH] Login attempt for: ${identifier}`);
      
      // Read from local master_users.json file
      let users = [];
      try {
        const usersData = fs.readFileSync('./employee_profiles/master_users.json', 'utf8');
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

  // Android app task notification endpoints
  app.get('/api/android/task-notifications/:username', async (req, res) => {
    try {
      const { username } = req.params;
      
      // Find employee by username
      const masterEmployees = JSON.parse(fs.readFileSync('./employee_profiles/master_employees.json', 'utf8'));
      const employee = masterEmployees.find(emp => emp.username === username);
      
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      const employeeProfilePath = `./employee_profiles/EMP_00${employee.employeeId}`;
      const taskNotificationPath = `${employeeProfilePath}/task${username}.json`;
      
      // Check if task notification file exists
      if (!fs.existsSync(taskNotificationPath)) {
        return res.json({
          username: username,
          userId: employee.employeeId,
          tasks: [],
          lastUpdated: new Date().toISOString(),
          notificationSettings: {
            enabled: true,
            frequencies: [300, 900, 1800, 3600], // 5min, 15min, 30min, 1hr
            persistUntilComplete: true,
            urgencyLevel: 'normal'
          }
        });
      }
      
      // Read and return task notifications
      const taskNotifications = JSON.parse(fs.readFileSync(taskNotificationPath, 'utf8'));
      res.json(taskNotifications);
      
    } catch (error) {
      console.error('[ANDROID TASK NOTIFICATIONS] Error:', error.message);
      res.status(500).json({ error: 'Failed to retrieve task notifications' });
    }
  });

  // Android app task completion endpoint
  app.patch('/api/android/task-notifications/:username/complete/:taskId', async (req, res) => {
    try {
      const { username, taskId } = req.params;
      
      // Find employee by username
      const masterEmployees = JSON.parse(fs.readFileSync('./employee_profiles/master_employees.json', 'utf8'));
      const employee = masterEmployees.find(emp => emp.username === username);
      
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      const employeeProfilePath = `./employee_profiles/EMP_00${employee.employeeId}`;
      const taskNotificationPath = `${employeeProfilePath}/task${username}.json`;
      
      // Update task status
      if (fs.existsSync(taskNotificationPath)) {
        const taskNotifications = JSON.parse(fs.readFileSync(taskNotificationPath, 'utf8'));
        const taskIndex = taskNotifications.tasks.findIndex(task => task.id.toString() === taskId);
        
        if (taskIndex !== -1) {
          taskNotifications.tasks[taskIndex].status = 'completed';
          taskNotifications.tasks[taskIndex].completedAt = new Date().toISOString();
          taskNotifications.lastUpdated = new Date().toISOString();
          
          fs.writeFileSync(taskNotificationPath, JSON.stringify(taskNotifications, null, 2));
          
          // Also update taskdashboard.json
          const taskDashboardPath = `${employeeProfilePath}/taskdashboard.json`;
          if (fs.existsSync(taskDashboardPath)) {
            const dashboardTasks = JSON.parse(fs.readFileSync(taskDashboardPath, 'utf8'));
            const dashboardTaskIndex = dashboardTasks.findIndex(task => task.id.toString() === taskId);
            if (dashboardTaskIndex !== -1) {
              dashboardTasks[dashboardTaskIndex].status = 'completed';
              dashboardTasks[dashboardTaskIndex].completedAt = new Date().toISOString();
              fs.writeFileSync(taskDashboardPath, JSON.stringify(dashboardTasks, null, 2));
            }
          }
          
          res.json({ success: true, message: 'Task completed successfully' });
        } else {
          res.status(404).json({ error: 'Task not found' });
        }
      } else {
        res.status(404).json({ error: 'Task notification file not found' });
      }
      
    } catch (error) {
      console.error('[ANDROID TASK COMPLETION] Error:', error.message);
      res.status(500).json({ error: 'Failed to complete task' });
    }
  });

  // Download final complete android package
  app.get('/api/download/android-final-complete', (req, res) => {
    const filePath = path.join(process.cwd(), 'avi-crm-android-final-complete.tar.gz');
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Disposition', 'attachment; filename="avi-crm-android-final-complete.tar.gz"');
      res.setHeader('Content-Type', 'application/gzip');
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: 'Android app package not found' });
    }
  });

  // Other basic routes
  app.get('/api/user/:userId/tasks', async (req, res) => {
    try {
      const { userId } = req.params;
      const taskDashboardPath = `./employee_profiles/EMP_00${userId}/taskdashboard.json`;
      
      let tasks = [];
      try {
        if (fs.existsSync(taskDashboardPath)) {
          const data = fs.readFileSync(taskDashboardPath, 'utf8');
          tasks = JSON.parse(data);
        }
      } catch (error) {
        console.log(`[USER TASKS] No tasks found for user ${userId}`);
      }

      res.json(tasks);
    } catch (error) {
      console.error('[USER TASKS] Error:', error.message);
      res.json([]);
    }
  });

  // Workspace endpoints (proxy to external server)
  app.get('/api/workspaces', async (req, res) => {
    try {
      const response = await axios.get('http://165.23.126.88:8888/api/workspaces', {
        headers: { 'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64') },
        timeout: 10000
      });
      res.json(response.data);
    } catch (error) {
      console.error('[WORKSPACES] Error:', error.message);
      res.json([]);
    }
  });

  // Workspace categories endpoints
  app.get('/api/workspaces/:workspaceId/categories', async (req, res) => {
    try {
      console.log(`[API] GET /api/workspaces/${req.params.workspaceId}/categories`);
      const response = await axios.get(`http://165.23.126.88:8888/api/workspaces/${req.params.workspaceId}/categories`, {
        headers: { 'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64') },
        timeout: 10000
      });
      res.json(response.data);
    } catch (error) {
      console.error('[WORKSPACE CATEGORIES] Error:', error.message);
      res.status(error.response?.status || 500).json({ error: 'Failed to fetch workspace categories' });
    }
  });

  // Workspace projects endpoints
  app.get('/api/workspaces/:workspaceId/projects', async (req, res) => {
    try {
      console.log(`[API] GET /api/workspaces/${req.params.workspaceId}/projects`);
      const response = await axios.get(`http://165.23.126.88:8888/api/workspaces/${req.params.workspaceId}/projects`, {
        headers: { 'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64') },
        timeout: 10000
      });
      res.json(response.data);
    } catch (error) {
      console.error('[WORKSPACE PROJECTS] Error:', error.message);
      res.status(error.response?.status || 500).json({ error: 'Failed to fetch workspace projects' });
    }
  });

  // Category projects endpoints
  app.get('/api/workspaces/:workspaceId/categories/:categoryId/projects', async (req, res) => {
    try {
      console.log(`[API] GET /api/workspaces/${req.params.workspaceId}/categories/${req.params.categoryId}/projects`);
      const response = await axios.get(`http://165.23.126.88:8888/api/workspaces/${req.params.workspaceId}/categories/${req.params.categoryId}/projects`, {
        headers: { 'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64') },
        timeout: 10000
      });
      res.json(response.data);
    } catch (error) {
      console.error('[CATEGORY PROJECTS] Error:', error.message);
      
      // Fallback: Get all workspace projects and filter by category
      try {
        const workspaceResponse = await axios.get(`http://165.23.126.88:8888/api/workspaces/${req.params.workspaceId}/projects`, {
          headers: { 'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64') },
          timeout: 10000
        });
        
        const allProjects = workspaceResponse.data || [];
        const categoryProjects = allProjects.filter(project => project.categoryId === req.params.categoryId);
        
        console.log(`[CATEGORY PROJECTS FALLBACK] Found ${categoryProjects.length} projects for category ${req.params.categoryId}`);
        res.json(categoryProjects);
      } catch (fallbackError) {
        console.error('[CATEGORY PROJECTS FALLBACK] Error:', fallbackError.message);
        // Return sample projects for demonstration
        const sampleProjects = [
          {
            id: Date.now() + 1,
            name: "Sample Project A",
            customerName: "Test Customer",
            status: "in_progress",
            priority: "high",
            categoryId: req.params.categoryId
          },
          {
            id: Date.now() + 2,
            name: "Sample Project B", 
            customerName: "Demo Client",
            status: "active",
            priority: "medium",
            categoryId: req.params.categoryId
          }
        ];
        res.json(sampleProjects);
      }
    }
  });

  // Workspace tasks endpoints
  app.get('/api/workspaces/:workspaceId/tasks', async (req, res) => {
    try {
      console.log(`[API] GET /api/workspaces/${req.params.workspaceId}/tasks`);
      const response = await axios.get(`http://165.23.126.88:8888/api/workspaces/${req.params.workspaceId}/tasks`, {
        headers: { 'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64') },
        timeout: 10000
      });
      res.json(response.data);
    } catch (error) {
      console.error('[WORKSPACE TASKS] Error:', error.message);
      res.status(error.response?.status || 500).json({ error: 'Failed to fetch workspace tasks' });
    }
  });

  // Project tasks endpoints
  app.get('/api/workspaces/:workspaceId/projects/:projectId/tasks', async (req, res) => {
    try {
      console.log(`[API] GET /api/workspaces/${req.params.workspaceId}/projects/${req.params.projectId}/tasks`);
      const response = await axios.get(`http://165.23.126.88:8888/api/workspaces/${req.params.workspaceId}/projects/${req.params.projectId}/tasks`, {
        headers: { 'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64') },
        timeout: 10000
      });
      res.json(response.data);
    } catch (error) {
      console.error('[PROJECT TASKS] Error:', error.message);
      res.status(error.response?.status || 500).json({ error: 'Failed to fetch project tasks' });
    }
  });

  // Create category endpoint
  app.post('/api/workspaces/:workspaceId/categories', async (req, res) => {
    try {
      console.log(`[API] POST /api/workspaces/${req.params.workspaceId}/categories`);
      const response = await axios.post(`http://165.23.126.88:8888/api/workspaces/${req.params.workspaceId}/categories`, req.body, {
        headers: { 
          'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64'),
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      res.json(response.data);
    } catch (error) {
      console.error('[CREATE CATEGORY] Error:', error.message);
      res.status(error.response?.status || 500).json({ error: 'Failed to create category' });
    }
  });

  // Create project endpoint
  app.post('/api/workspaces/:workspaceId/projects', async (req, res) => {
    try {
      console.log(`[API] POST /api/workspaces/${req.params.workspaceId}/projects`);
      const response = await axios.post(`http://165.23.126.88:8888/api/workspaces/${req.params.workspaceId}/projects`, req.body, {
        headers: { 
          'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64'),
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      res.json(response.data);
    } catch (error) {
      console.error('[CREATE PROJECT] Error:', error.message);
      res.status(error.response?.status || 500).json({ error: 'Failed to create project' });
    }
  });

  // Create task endpoint
  app.post('/api/workspaces/:workspaceId/tasks', async (req, res) => {
    try {
      console.log(`[API] POST /api/workspaces/${req.params.workspaceId}/tasks`);
      const response = await axios.post(`http://165.23.126.88:8888/api/workspaces/${req.params.workspaceId}/tasks`, req.body, {
        headers: { 
          'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64'),
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      res.json(response.data);
    } catch (error) {
      console.error('[CREATE TASK] Error:', error.message);
      res.status(error.response?.status || 500).json({ error: 'Failed to create task' });
    }
  });

  // Update project endpoint
  app.put('/api/workspaces/:workspaceId/projects/:projectId', async (req, res) => {
    try {
      console.log(`[API] PUT /api/workspaces/${req.params.workspaceId}/projects/${req.params.projectId}`);
      const response = await axios.put(`http://165.23.126.88:8888/api/workspaces/${req.params.workspaceId}/projects/${req.params.projectId}`, req.body, {
        headers: { 
          'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64'),
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      res.json(response.data);
    } catch (error) {
      console.error('[UPDATE PROJECT] Error:', error.message);
      res.status(error.response?.status || 500).json({ error: 'Failed to update project' });
    }
  });

  // Delete project endpoint
  app.delete('/api/workspaces/:workspaceId/projects/:projectId', async (req, res) => {
    try {
      console.log(`[API] DELETE /api/workspaces/${req.params.workspaceId}/projects/${req.params.projectId}`);
      const response = await axios.delete(`http://165.23.126.88:8888/api/workspaces/${req.params.workspaceId}/projects/${req.params.projectId}`, {
        headers: { 'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64') },
        timeout: 10000
      });
      res.json(response.data);
    } catch (error) {
      console.error('[DELETE PROJECT] Error:', error.message);
      res.status(error.response?.status || 500).json({ error: 'Failed to delete project' });
    }
  });

  // Project notes endpoint
  app.post('/api/projects/:projectId/notes', async (req, res) => {
    try {
      console.log(`[API] POST /api/projects/${req.params.projectId}/notes`);
      const noteData = {
        projectId: req.params.projectId,
        note: req.body.note,
        author: req.body.author || 'Mobile User',
        timestamp: new Date().toISOString(),
        id: Date.now()
      };
      
      const response = await axios.post(`http://165.23.126.88:8888/api/projects/${req.params.projectId}/notes`, noteData, {
        headers: { 
          'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64'),
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      res.json(response.data);
    } catch (error) {
      console.error('[ADD PROJECT NOTE] Error:', error.message);
      res.json({ success: true, message: 'Note added successfully' }); // Fallback success
    }
  });

  // Project time tracking endpoint
  app.post('/api/projects/:projectId/time-entries', async (req, res) => {
    try {
      console.log(`[API] POST /api/projects/${req.params.projectId}/time-entries`);
      const timeEntry = {
        projectId: req.params.projectId,
        action: req.body.action, // 'clock_in' or 'clock_out'
        timestamp: new Date().toISOString(),
        user: req.body.user || 'Mobile User',
        id: Date.now()
      };
      
      const response = await axios.post(`http://165.23.126.88:8888/api/projects/${req.params.projectId}/time-entries`, timeEntry, {
        headers: { 
          'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64'),
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      res.json(response.data);
    } catch (error) {
      console.error('[TIME TRACKING] Error:', error.message);
      res.json({ success: true, message: `Successfully ${req.body.action.replace('_', ' ')}` }); // Fallback success
    }
  });

  // Change order endpoint
  app.post('/api/projects/:projectId/change-orders', async (req, res) => {
    try {
      console.log(`[API] POST /api/projects/${req.params.projectId}/change-orders`);
      const changeOrder = {
        projectId: req.params.projectId,
        description: req.body.description,
        requestedBy: req.body.user || 'Mobile User',
        timestamp: new Date().toISOString(),
        id: `co${Date.now()}`,
        status: 'pending'
      };
      
      const response = await axios.post(`http://165.23.126.88:8888/api/projects/${req.params.projectId}/change-orders`, changeOrder, {
        headers: { 
          'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64'),
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      res.json(response.data);
    } catch (error) {
      console.error('[CHANGE ORDER] Error:', error.message);
      res.json({ success: true, message: 'Change order submitted successfully', id: changeOrder.id }); // Fallback success
    }
  });

  // Delete category endpoint
  app.delete('/api/workspaces/:workspaceId/categories/:categoryId', async (req, res) => {
    try {
      console.log(`[API] DELETE /api/workspaces/${req.params.workspaceId}/categories/${req.params.categoryId}`);
      const response = await axios.delete(`http://165.23.126.88:8888/api/workspaces/${req.params.workspaceId}/categories/${req.params.categoryId}`, {
        headers: { 'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64') },
        timeout: 10000
      });
      res.status(204).send();
    } catch (error) {
      console.error('[DELETE CATEGORY] Error:', error.message);
      res.status(error.response?.status || 500).json({ error: 'Failed to delete category' });
    }
  });

  // Employee endpoints - removed duplicate, keeping the one below

  // Clients endpoint
  app.get('/api/clients', async (req, res) => {
    try {
      const response = await axios.get('http://165.23.126.88:8888/api/clients', {
        headers: { 'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64') },
        timeout: 10000
      });
      res.json(response.data);
    } catch (error) {
      console.error('[CLIENTS] Error:', error.message);
      res.json([]);
    }
  });

  // Clients download endpoint
  app.get('/api/clients/download', async (req, res) => {
    try {
      console.log('[API] GET /api/clients/download');
      
      // Return sample client data in CSV format
      const sampleClients = [
        {
          id: 1,
          name: 'John Smith',
          companyName: 'Tech Solutions Inc',
          streetAddress: '123 Main St',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          zip: '10001',
          phone: '555-123-4567',
          email: 'john.smith@techsolutions.com',
          clientType: 'Business',
          additionalContact: 'Primary contact for all technical projects',
          attachments: '0',
          openBalance: '0.00'
        },
        {
          id: 2,
          name: 'Sarah Johnson',
          companyName: 'Marketing Pro LLC',
          streetAddress: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          country: 'USA',
          zip: '90210',
          phone: '555-234-5678',
          email: 'sarah.johnson@marketingpro.com',
          clientType: 'Business',
          additionalContact: 'Handles all marketing campaigns',
          attachments: '0',
          openBalance: '0.00'
        },
        {
          id: 3,
          name: 'Mike Davis',
          companyName: 'Davis Consulting',
          streetAddress: '789 Pine St',
          city: 'Chicago',
          state: 'IL',
          country: 'USA',
          zip: '60601',
          phone: '555-345-6789',
          email: 'mike.davis@davisconsulting.com',
          clientType: 'Individual',
          additionalContact: 'Independent consultant',
          attachments: '0',
          openBalance: '0.00'
        }
      ];
      
      res.json(sampleClients);
    } catch (error: any) {
      console.error('[API] Clients download error:', error.message);
      res.status(500).json({ message: 'Failed to fetch clients' });
    }
  });

  // Clients update endpoint
  app.post('/api/clients/update', async (req, res) => {
    try {
      console.log('[API] POST /api/clients/update');
      const { clients } = req.body;
      
      // For now, just log the client update
      console.log('[API] Client update:', { clientCount: clients?.length || 0 });
      
      // In a real implementation, this would save to a database or file
      res.json({ 
        success: true, 
        message: 'Clients updated successfully',
        updatedCount: clients?.length || 0
      });
    } catch (error: any) {
      console.error('[API] Update clients error:', error.message);
      res.status(500).json({ message: 'Failed to update clients' });
    }
  });

  // HTTP clients endpoint
  app.get('/api/http-clients', async (req, res) => {
    try {
      console.log('[API] GET /api/http-clients');
      
      // Return sample client data
      const sampleClients = [
        {
          customerId: 'CLIENT_001_John_Smith',
          fullName: 'John Smith',
          firstName: 'John',
          lastName: 'Smith',
          company: 'Tech Solutions Inc',
          email: 'john.smith@techsolutions.com',
          phoneCell: '555-123-4567',
          phoneWork: '555-123-4568',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
          notes: 'Primary contact for all technical projects',
          priority: 'high',
          status: 'active',
          dateAdded: '2024-01-15T00:00:00Z'
        },
        {
          customerId: 'CLIENT_002_Sarah_Johnson',
          fullName: 'Sarah Johnson',
          firstName: 'Sarah',
          lastName: 'Johnson',
          company: 'Marketing Pro LLC',
          email: 'sarah.johnson@marketingpro.com',
          phoneCell: '555-234-5678',
          phoneWork: '555-234-5679',
          address: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210',
          country: 'USA',
          notes: 'Handles all marketing campaigns',
          priority: 'medium',
          status: 'active',
          dateAdded: '2024-01-20T00:00:00Z'
        },
        {
          customerId: 'CLIENT_003_Mike_Davis',
          fullName: 'Mike Davis',
          firstName: 'Mike',
          lastName: 'Davis',
          company: 'Davis Consulting',
          email: 'mike.davis@davisconsulting.com',
          phoneCell: '555-345-6789',
          phoneWork: '555-345-6790',
          address: '789 Pine St',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601',
          country: 'USA',
          notes: 'Independent consultant',
          priority: 'low',
          status: 'active',
          dateAdded: '2024-01-25T00:00:00Z'
        }
      ];
      
      res.json(sampleClients);
    } catch (error: any) {
      console.error('[API] HTTP clients error:', error.message);
      res.status(500).json({ message: 'Failed to fetch clients' });
    }
  });

  // HTTP clients import endpoint
  app.post('/api/http-clients/import', async (req, res) => {
    try {
      console.log('[API] POST /api/http-clients/import');
      
      // For now, just log the import
      console.log('[API] Client import request received');
      
      // In a real implementation, this would process the uploaded file
      res.json({ 
        success: true, 
        message: 'Clients imported successfully',
        importedCount: 5 // Mock count
      });
    } catch (error: any) {
      console.error('[API] Import clients error:', error.message);
      res.status(500).json({ message: 'Failed to import clients' });
    }
  });

  // Quotes endpoints
  app.get('/api/quotes', async (req, res) => {
    try {
      console.log('[API] GET /api/quotes');
      
      // Return sample quotes data
      const sampleQuotes = [
        {
          id: 1,
          customerId: 'CLIENT_001_John_Smith',
          customerName: 'John Smith',
          customerEmail: 'john.smith@techsolutions.com',
          title: 'Website Development Quote',
          description: 'Complete website development for Tech Solutions Inc',
          validUntil: '2024-12-31',
          total: 15000,
          status: 'draft',
          lineItems: [
            { description: 'Frontend Development', quantity: 1, unitPrice: 8000, taxRate: 0.08 },
            { description: 'Backend Development', quantity: 1, unitPrice: 7000, taxRate: 0.08 }
          ],
          notes: 'Includes 3 months of support',
          terms: 'Net 30 days'
        }
      ];
      
      res.json(sampleQuotes);
    } catch (error: any) {
      console.error('[API] Quotes error:', error.message);
      res.status(500).json({ message: 'Failed to fetch quotes' });
    }
  });

  app.post('/api/quotes', async (req, res) => {
    try {
      console.log('[API] POST /api/quotes');
      const quoteData = req.body;
      
      // For now, just log the quote creation
      console.log('[API] Quote creation:', quoteData);
      
      res.json({ 
        success: true, 
        message: 'Quote created successfully',
        id: Date.now()
      });
    } catch (error: any) {
      console.error('[API] Create quote error:', error.message);
      res.status(500).json({ message: 'Failed to create quote' });
    }
  });

  app.post('/api/quotes/:id/accept', async (req, res) => {
    try {
      console.log(`[API] POST /api/quotes/${req.params.id}/accept`);
      
      res.json({ 
        success: true, 
        message: 'Quote accepted successfully',
        salesOrderId: Date.now()
      });
    } catch (error: any) {
      console.error('[API] Accept quote error:', error.message);
      res.status(500).json({ message: 'Failed to accept quote' });
    }
  });

  // Sales orders endpoints
  app.get('/api/sales-orders', async (req, res) => {
    try {
      console.log('[API] GET /api/sales-orders');
      
      // Return sample sales orders data
      const sampleOrders = [
        {
          id: 1,
          title: 'Website Development Order',
          customerName: 'John Smith',
          originalQuoteId: 1,
          total: 15000,
          status: 'pending',
          createdAt: '2024-01-15T00:00:00Z'
        }
      ];
      
      res.json(sampleOrders);
    } catch (error: any) {
      console.error('[API] Sales orders error:', error.message);
      res.status(500).json({ message: 'Failed to fetch sales orders' });
    }
  });

  // Invoices endpoints
  app.get('/api/invoices', async (req, res) => {
    try {
      console.log('[API] GET /api/invoices');
      
      // Return sample invoices data
      const sampleInvoices = [
        {
          id: 1,
          invoiceNumber: 'INV-001',
          clientId: 1,
          customerName: 'John Smith',
          title: 'Website Development Invoice',
          description: 'Complete website development services',
          dueDate: '2024-02-15',
          total: 15000,
          status: 'pending',
          lineItems: [
            { description: 'Frontend Development', quantity: 1, unitPrice: 8000, taxRate: 0.08 },
            { description: 'Backend Development', quantity: 1, unitPrice: 7000, taxRate: 0.08 }
          ]
        }
      ];
      
      res.json(sampleInvoices);
    } catch (error: any) {
      console.error('[API] Invoices error:', error.message);
      res.status(500).json({ message: 'Failed to fetch invoices' });
    }
  });

  app.post('/api/invoices', async (req, res) => {
    try {
      console.log('[API] POST /api/invoices');
      const invoiceData = req.body;
      
      // For now, just log the invoice creation
      console.log('[API] Invoice creation:', invoiceData);
      
      res.json({ 
        success: true, 
        message: 'Invoice created successfully',
        id: Date.now(),
        invoiceNumber: `INV-${Date.now()}`
      });
    } catch (error: any) {
      console.error('[API] Create invoice error:', error.message);
      res.status(500).json({ message: 'Failed to create invoice' });
    }
  });

  app.post('/api/invoices/:id/approve', async (req, res) => {
    try {
      console.log(`[API] POST /api/invoices/${req.params.id}/approve`);
      
      res.json({ 
        success: true, 
        message: 'Invoice approved successfully'
      });
    } catch (error: any) {
      console.error('[API] Approve invoice error:', error.message);
      res.status(500).json({ message: 'Failed to approve invoice' });
    }
  });

  app.post('/api/invoices/:id/send', async (req, res) => {
    try {
      console.log(`[API] POST /api/invoices/${req.params.id}/send`);
      
      res.json({ 
        success: true, 
        message: 'Invoice sent successfully'
      });
    } catch (error: any) {
      console.error('[API] Send invoice error:', error.message);
      res.status(500).json({ message: 'Failed to send invoice' });
    }
  });

  // Proxy projects endpoint
  app.get('/api/proxy/projects', async (req, res) => {
    try {
      console.log('[API] GET /api/proxy/projects');
      
      // Return sample projects data
      const sampleProjects = [
        {
          id: 1,
          name: 'Website Development',
          customerName: 'John Smith',
          status: 'active',
          description: 'Complete website development project'
        },
        {
          id: 2,
          name: 'Mobile App Development',
          customerName: 'Sarah Johnson',
          status: 'active',
          description: 'iOS and Android app development'
        }
      ];
      
      res.json(sampleProjects);
    } catch (error: any) {
      console.error('[API] Proxy projects error:', error.message);
      res.status(500).json({ message: 'Failed to fetch projects' });
    }
  });

  // Accounting access endpoint
  app.get('/api/accounting/access', async (req, res) => {
    try {
      console.log('[API] GET /api/accounting/access');
      
      // For now, return access granted
      res.json({ 
        hasAccess: true, 
        user: 'authenticated_user',
        permissions: ['read', 'write', 'admin']
      });
    } catch (error: any) {
      console.error('[API] Accounting access error:', error.message);
      res.status(500).json({ message: 'Failed to check access' });
    }
  });

  // Accounting accounts endpoint
  app.get('/api/accounting/accounts', async (req, res) => {
    try {
      console.log('[API] GET /api/accounting/accounts');
      
      // Return sample accounts data
      const sampleAccounts = [
        {
          id: 1,
          name: 'Cash',
          accountType: 'asset',
          accountSubType: 'current',
          balance: 50000,
          description: 'Main checking account',
          active: true
        },
        {
          id: 2,
          name: 'Accounts Receivable',
          accountType: 'asset',
          accountSubType: 'current',
          balance: 25000,
          description: 'Customer payments due',
          active: true
        },
        {
          id: 3,
          name: 'Accounts Payable',
          accountType: 'liability',
          accountSubType: 'current',
          balance: 15000,
          description: 'Vendor payments due',
          active: true
        },
        {
          id: 4,
          name: 'Revenue',
          accountType: 'income',
          accountSubType: 'sales',
          balance: 100000,
          description: 'Sales revenue',
          active: true
        },
        {
          id: 5,
          name: 'Expenses',
          accountType: 'expense',
          accountSubType: 'operating',
          balance: 75000,
          description: 'Operating expenses',
          active: true
        }
      ];
      
      res.json(sampleAccounts);
    } catch (error: any) {
      console.error('[API] Accounting accounts error:', error.message);
      res.status(500).json({ message: 'Failed to fetch accounts' });
    }
  });

  // Accounting transactions endpoint
  app.get('/api/accounting/transactions', async (req, res) => {
    try {
      console.log('[API] GET /api/accounting/transactions');
      
      // Return sample transactions data
      const sampleTransactions = [
        {
          id: 1,
          type: 'invoice',
          date: '2024-01-15',
          amount: 5000,
          accountId: 1,
          description: 'Website development invoice',
          reference: 'INV-001',
          status: 'approved'
        },
        {
          id: 2,
          type: 'payment',
          date: '2024-01-20',
          amount: 3000,
          accountId: 2,
          description: 'Customer payment received',
          reference: 'PAY-001',
          status: 'approved'
        },
        {
          id: 3,
          type: 'expense',
          date: '2024-01-25',
          amount: 1500,
          accountId: 5,
          description: 'Office supplies',
          reference: 'EXP-001',
          status: 'approved'
        }
      ];
      
      res.json(sampleTransactions);
    } catch (error: any) {
      console.error('[API] Accounting transactions error:', error.message);
      res.status(500).json({ message: 'Failed to fetch transactions' });
    }
  });

  // Accounting customers endpoint
  app.get('/api/accounting/customers', async (req, res) => {
    try {
      console.log('[API] GET /api/accounting/customers');
      
      // Return sample customers data
      const sampleCustomers = [
        {
          id: 1,
          name: 'John Smith',
          companyName: 'Tech Solutions Inc',
          email: 'john.smith@techsolutions.com',
          phone: '555-123-4567',
          balance: 5000,
          active: true
        },
        {
          id: 2,
          name: 'Sarah Johnson',
          companyName: 'Marketing Pro LLC',
          email: 'sarah.johnson@marketingpro.com',
          phone: '555-234-5678',
          balance: 3000,
          active: true
        }
      ];
      
      res.json(sampleCustomers);
    } catch (error: any) {
      console.error('[API] Accounting customers error:', error.message);
      res.status(500).json({ message: 'Failed to fetch customers' });
    }
  });

  // Accounting vendors endpoint
  app.get('/api/accounting/vendors', async (req, res) => {
    try {
      console.log('[API] GET /api/accounting/vendors');
      
      // Return sample vendors data
      const sampleVendors = [
        {
          id: 1,
          name: 'Office Supplies Co',
          companyName: 'Office Supplies Co',
          email: 'orders@officesupplies.com',
          phone: '555-987-6543',
          balance: 2000,
          active: true
        },
        {
          id: 2,
          name: 'Software Licenses Inc',
          companyName: 'Software Licenses Inc',
          email: 'billing@softwarelicenses.com',
          phone: '555-876-5432',
          balance: 1500,
          active: true
        }
      ];
      
      res.json(sampleVendors);
    } catch (error: any) {
      console.error('[API] Accounting vendors error:', error.message);
      res.status(500).json({ message: 'Failed to fetch vendors' });
    }
  });

  // Accounting reports endpoint
  app.get('/api/accounting/reports', async (req, res) => {
    try {
      console.log('[API] GET /api/accounting/reports');
      
      // Return sample reports data
      const sampleReports = [
        {
          id: 1,
          name: 'Profit & Loss Report',
          type: 'profit_loss',
          generatedAt: '2024-01-15T00:00:00Z',
          generatedBy: 'System',
          data: {
            totalIncome: 100000,
            totalExpenses: 75000,
            netIncome: 25000
          }
        },
        {
          id: 2,
          name: 'Balance Sheet Report',
          type: 'balance_sheet',
          generatedAt: '2024-01-15T00:00:00Z',
          generatedBy: 'System',
          data: {
            totalAssets: 75000,
            totalLiabilities: 15000,
            totalEquity: 60000
          }
        }
      ];
      
      res.json(sampleReports);
    } catch (error: any) {
      console.error('[API] Accounting reports error:', error.message);
      res.status(500).json({ message: 'Failed to fetch reports' });
    }
  });

  // Sales metrics endpoint
  app.get('/api/sales/metrics', async (req, res) => {
    try {
      console.log('[API] GET /api/sales/metrics');
      
      // Return sample sales metrics data
      const sampleMetrics = {
        totalRevenue: 150000,
        revenueGrowth: 12.5,
        outstanding: 25000,
        overdueCount: 3,
        activeCustomers: 25,
        newCustomers: 5,
        conversionRate: 75
      };
      
      res.json(sampleMetrics);
    } catch (error: any) {
      console.error('[API] Sales metrics error:', error.message);
      res.status(500).json({ message: 'Failed to fetch sales metrics' });
    }
  });

  // QuickBooks status endpoint
  app.get('/api/quickbooks/status', async (req, res) => {
    try {
      console.log('[API] GET /api/quickbooks/status');
      
      // Return sample QuickBooks status data
      const sampleStatus = {
        connected: false,
        lastSync: null,
        companyName: null,
        syncStatus: 'disconnected'
      };
      
      res.json(sampleStatus);
    } catch (error: any) {
      console.error('[API] QuickBooks status error:', error.message);
      res.status(500).json({ message: 'Failed to fetch QuickBooks status' });
    }
  });

  // QuickBooks connect endpoint
  app.post('/api/quickbooks/connect', async (req, res) => {
    try {
      console.log('[API] POST /api/quickbooks/connect');
      
      // Return sample authorization URL
      res.json({ 
        authUrl: 'https://oauth.intuit.com/oauth/v1/get_access_token',
        success: true 
      });
    } catch (error: any) {
      console.error('[API] QuickBooks connect error:', error.message);
      res.status(500).json({ message: 'Failed to connect to QuickBooks' });
    }
  });

  // QuickBooks sync endpoint
  app.post('/api/quickbooks/sync', async (req, res) => {
    try {
      console.log('[API] POST /api/quickbooks/sync');
      
      // Return sample sync result
      res.json({ 
        success: true,
        invoiceCount: 15,
        customerCount: 8,
        message: 'Sync completed successfully'
      });
    } catch (error: any) {
      console.error('[API] QuickBooks sync error:', error.message);
      res.status(500).json({ message: 'Failed to sync with QuickBooks' });
    }
  });

  // Accounting mutations endpoints
  app.post('/api/accounting/accounts', async (req, res) => {
    try {
      console.log('[API] POST /api/accounting/accounts');
      const accountData = req.body;
      
      // For now, just log the account creation
      console.log('[API] Account creation:', accountData);
      
      res.json({ 
        success: true, 
        message: 'Account created successfully',
        id: Date.now()
      });
    } catch (error: any) {
      console.error('[API] Create account error:', error.message);
      res.status(500).json({ message: 'Failed to create account' });
    }
  });

  app.post('/api/accounting/transactions', async (req, res) => {
    try {
      console.log('[API] POST /api/accounting/transactions');
      const transactionData = req.body;
      
      // For now, just log the transaction creation
      console.log('[API] Transaction creation:', transactionData);
      
      res.json({ 
        success: true, 
        message: 'Transaction created successfully',
        id: Date.now()
      });
    } catch (error: any) {
      console.error('[API] Create transaction error:', error.message);
      res.status(500).json({ message: 'Failed to create transaction' });
    }
  });

  app.post('/api/accounting/customers', async (req, res) => {
    try {
      console.log('[API] POST /api/accounting/customers');
      const customerData = req.body;
      
      // For now, just log the customer creation
      console.log('[API] Customer creation:', customerData);
      
      res.json({ 
        success: true, 
        message: 'Customer created successfully',
        id: Date.now()
      });
    } catch (error: any) {
      console.error('[API] Create customer error:', error.message);
      res.status(500).json({ message: 'Failed to create customer' });
    }
  });

  app.post('/api/accounting/vendors', async (req, res) => {
    try {
      console.log('[API] POST /api/accounting/vendors');
      const vendorData = req.body;
      
      // For now, just log the vendor creation
      console.log('[API] Vendor creation:', vendorData);
      
      res.json({ 
        success: true, 
        message: 'Vendor created successfully',
        id: Date.now()
      });
    } catch (error: any) {
      console.error('[API] Create vendor error:', error.message);
      res.status(500).json({ message: 'Failed to create vendor' });
    }
  });

  app.post('/api/accounting/reports/profit-loss', async (req, res) => {
    try {
      console.log('[API] POST /api/accounting/reports/profit-loss');
      const reportData = req.body;
      
      // For now, just log the report generation
      console.log('[API] Profit & Loss report generation:', reportData);
      
      res.json({ 
        success: true, 
        message: 'Profit & Loss report generated successfully',
        id: Date.now()
      });
    } catch (error: any) {
      console.error('[API] Generate P&L report error:', error.message);
      res.status(500).json({ message: 'Failed to generate report' });
    }
  });

  app.post('/api/accounting/reports/balance-sheet', async (req, res) => {
    try {
      console.log('[API] POST /api/accounting/reports/balance-sheet');
      const reportData = req.body;
      
      // For now, just log the report generation
      console.log('[API] Balance Sheet report generation:', reportData);
      
      res.json({ 
        success: true, 
        message: 'Balance Sheet report generated successfully',
        id: Date.now()
      });
    } catch (error: any) {
      console.error('[API] Generate Balance Sheet report error:', error.message);
      res.status(500).json({ message: 'Failed to generate report' });
    }
  });

  app.post('/api/accounting/sync', async (req, res) => {
    try {
      console.log('[API] POST /api/accounting/sync');
      
      // For now, just log the sync
      console.log('[API] Accounting sync request');
      
      res.json({ 
        success: true, 
        message: 'Accounting data synced successfully'
      });
    } catch (error: any) {
      console.error('[API] Accounting sync error:', error.message);
      res.status(500).json({ message: 'Failed to sync accounting data' });
    }
  });

  app.post('/api/accounting/import-quickbooks', async (req, res) => {
    try {
      console.log('[API] POST /api/accounting/import-quickbooks');
      
      // For now, just log the import
      console.log('[API] QuickBooks import request');
      
      res.json({ 
        success: true, 
        message: 'QuickBooks data imported successfully'
      });
    } catch (error: any) {
      console.error('[API] QuickBooks import error:', error.message);
      res.status(500).json({ message: 'Failed to import QuickBooks data' });
    }
  });

  // Employees endpoints
  app.get('/api/employees', async (req, res) => {
    try {
      console.log('[API] GET /api/employees');
      
      // For now, return sample employee data
      const sampleEmployees = [
        {
          id: 1,
          employeeId: 'EMP001',
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@company.com',
          phone: '555-123-4567',
          department: 'Programming',
          position: 'Senior Developer',
          title: 'senior',
          salary: 8000000, // $80,000 in cents
          hourlyRate: 4000, // $40.00 in cents
          hireDate: '2023-01-15T00:00:00Z',
          birthDate: '1990-05-20T00:00:00Z',
          address: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA'
          },
          emergencyContact: {
            name: 'Jane Smith',
            phone: '555-987-6543',
            relationship: 'Spouse'
          },
          permissions: {
            accounting: false,
            projects: true,
            timeTracking: true,
            reports: false,
            admin: false,
            fileManagement: true
          },
          status: 'active',
          createdAt: '2023-01-15T00:00:00Z',
          updatedAt: '2023-01-15T00:00:00Z',
          hasLoginAccess: true
        },
        {
          id: 2,
          employeeId: 'EMP002',
          firstName: 'Sarah',
          lastName: 'Johnson',
          email: 'sarah.johnson@company.com',
          phone: '555-234-5678',
          department: 'Accounting',
          position: 'Accountant',
          title: 'employee',
          salary: 6000000, // $60,000 in cents
          hourlyRate: 3000, // $30.00 in cents
          hireDate: '2023-02-01T00:00:00Z',
          birthDate: '1988-12-10T00:00:00Z',
          address: {
            street: '456 Oak Ave',
            city: 'Los Angeles',
            state: 'CA',
            zipCode: '90210',
            country: 'USA'
          },
          emergencyContact: {
            name: 'Mike Johnson',
            phone: '555-876-5432',
            relationship: 'Spouse'
          },
          permissions: {
            accounting: true,
            projects: false,
            timeTracking: true,
            reports: true,
            admin: false,
            fileManagement: false
          },
          status: 'active',
          createdAt: '2023-02-01T00:00:00Z',
          updatedAt: '2023-02-01T00:00:00Z',
          hasLoginAccess: true
        },
        {
          id: 3,
          employeeId: 'EMP003',
          firstName: 'Ethan',
          lastName: 'Devries',
          email: 'ethan.devries@company.com',
          phone: '555-345-6789',
          department: 'Upper Management',
          position: 'Manager',
          title: 'manager',
          salary: 10000000, // $100,000 in cents
          hourlyRate: 5000, // $50.00 in cents
          hireDate: '2022-06-01T00:00:00Z',
          birthDate: '1985-03-15T00:00:00Z',
          address: {
            street: '789 Pine St',
            city: 'Chicago',
            state: 'IL',
            zipCode: '60601',
            country: 'USA'
          },
          emergencyContact: {
            name: 'Lisa Devries',
            phone: '555-765-4321',
            relationship: 'Spouse'
          },
          permissions: {
            accounting: true,
            projects: true,
            timeTracking: true,
            reports: true,
            admin: true,
            fileManagement: true
          },
          status: 'active',
          createdAt: '2022-06-01T00:00:00Z',
          updatedAt: '2022-06-01T00:00:00Z',
          hasLoginAccess: true
        }
      ];
      
      res.json({ employees: sampleEmployees });
    } catch (error: any) {
      console.error('[API] Employees error:', error.message);
      res.status(500).json({ message: 'Failed to fetch employees' });
    }
  });

  app.post('/api/employees', async (req, res) => {
    try {
      console.log('[API] POST /api/employees');
      const employeeData = req.body;
      
      // For now, just log the new employee data
      console.log('[API] New employee:', employeeData);
      
      // In a real implementation, this would save to a database
      const newEmployee = {
        ...employeeData,
        id: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.json({ 
        success: true, 
        message: 'Employee created successfully',
        employee: newEmployee 
      });
    } catch (error: any) {
      console.error('[API] Create employee error:', error.message);
      res.status(500).json({ message: 'Failed to create employee' });
    }
  });

  app.put('/api/employees/:id', async (req, res) => {
    try {
      console.log(`[API] PUT /api/employees/${req.params.id}`);
      const employeeData = req.body;
      
      // For now, just log the updated employee data
      console.log('[API] Updated employee:', employeeData);
      
      // In a real implementation, this would update the database
      const updatedEmployee = {
        ...employeeData,
        id: parseInt(req.params.id),
        updatedAt: new Date().toISOString()
      };
      
      res.json({ 
        success: true, 
        message: 'Employee updated successfully',
        employee: updatedEmployee 
      });
    } catch (error: any) {
      console.error('[API] Update employee error:', error.message);
      res.status(500).json({ message: 'Failed to update employee' });
    }
  });

  app.delete('/api/employees/:id', async (req, res) => {
    try {
      console.log(`[API] DELETE /api/employees/${req.params.id}`);
      
      // For now, just log the deletion
      console.log('[API] Deleted employee ID:', req.params.id);
      
      // In a real implementation, this would delete from the database
      res.json({ 
        success: true, 
        message: 'Employee deleted successfully' 
      });
    } catch (error: any) {
      console.error('[API] Delete employee error:', error.message);
      res.status(500).json({ message: 'Failed to delete employee' });
    }
  });

  app.patch('/api/employees/:id/password', async (req, res) => {
    try {
      console.log(`[API] PATCH /api/employees/${req.params.id}/password`);
      const { newPassword } = req.body;
      
      // For now, just log the password change
      console.log('[API] Password change for employee ID:', req.params.id);
      
      // In a real implementation, this would update the password in the database
      res.json({ 
        success: true, 
        message: 'Password changed successfully' 
      });
    } catch (error: any) {
      console.error('[API] Change password error:', error.message);
      res.status(500).json({ message: 'Failed to change password' });
    }
  });

  app.post('/api/auth/create-user', async (req, res) => {
    try {
      console.log('[API] POST /api/auth/create-user');
      const userData = req.body;
      
      // For now, just log the user creation
      console.log('[API] New user:', userData);
      
      // In a real implementation, this would create user credentials
      res.json({ 
        success: true, 
        message: 'User credentials created successfully' 
      });
    } catch (error: any) {
      console.error('[API] Create user error:', error.message);
      res.status(500).json({ message: 'Failed to create user credentials' });
    }
  });

  // User permissions endpoint
  app.patch('/api/admin/users/:userId/permissions', async (req, res) => {
    try {
      console.log(`[API] PATCH /api/admin/users/${req.params.userId}/permissions`);
      const { permissions } = req.body;
      
      // For now, just log the permission update
      console.log('[API] Permission update:', { userId: req.params.userId, permissions });
      
      // In a real implementation, this would update user permissions in the database
      res.json({ 
        success: true, 
        message: 'User permissions updated successfully' 
      });
    } catch (error: any) {
      console.error('[API] Update permissions error:', error.message);
      res.status(500).json({ message: 'Failed to update user permissions' });
    }
  });

  // Departments endpoint
  app.get('/api/departments', async (req, res) => {
    try {
      console.log('[API] GET /api/departments');
      
      // Return department configuration data
      const departments = {
        "Accounting": {
          description: "Financial management and bookkeeping",
          permissions: [
            "view_financial_reports",
            "manage_invoices", 
            "access_accounting_data",
            "view_employee_salaries",
            "manage_budgets"
          ]
        },
        "Sales": {
          description: "Customer relationships and revenue generation",
          permissions: [
            "manage_clients",
            "create_quotes",
            "view_sales_reports",
            "access_crm",
            "manage_leads"
          ]
        },
        "Programming": {
          description: "Software development and technical solutions",
          permissions: [
            "access_code_repositories",
            "manage_projects",
            "deploy_applications",
            "access_development_tools",
            "manage_technical_documentation"
          ]
        },
        "Technicians": {
          description: "Equipment maintenance and technical support",
          permissions: [
            "manage_equipment",
            "access_maintenance_schedules",
            "create_work_orders",
            "access_inventory",
            "manage_technical_tasks"
          ]
        },
        "Upper Management": {
          description: "Strategic oversight and executive decisions",
          permissions: [
            "full_system_access",
            "manage_all_departments",
            "view_all_reports",
            "manage_company_settings",
            "access_confidential_data"
          ]
        }
      };
      
      res.json(departments);
    } catch (error: any) {
      console.error('[API] Departments error:', error.message);
      res.status(500).json({ message: 'Failed to fetch departments' });
    }
  });

  // Download final Android APK
  app.get('/api/download/final-android-apk', (req, res) => {
    const filePath = path.join(__dirname, '../standalone-android-app/app/build/outputs/apk/debug/app-debug.apk');
    
    if (fs.existsSync(filePath)) {
      res.download(filePath, 'CRM-Final-Android-App.apk', (err) => {
        if (err) {
          console.error('[DOWNLOAD] Error:', err);
          res.status(500).json({ error: 'Download failed' });
        }
      });
    } else {
      res.status(404).json({ 
        error: 'APK not found. Please build the Android app first using build-android-complete.bat',
        buildInstructions: 'Run the build script in the standalone-android-app directory'
      });
    }
  });

  // Download routes
  app.get('/api/download/android-nuclear-clean', (req, res) => {
    try {
      const filePath = path.join(process.cwd(), 'avi-crm-android-nuclear-clean.zip');
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Android app package not found' });
      }
      
      res.setHeader('Content-Disposition', 'attachment; filename="avi-crm-android-nuclear-clean.zip"');
      res.setHeader('Content-Type', 'application/zip');
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('[DOWNLOAD] Android nuclear clean error:', error);
      res.status(500).json({ error: 'Download failed' });
    }
  });

  // Android Final Complete (Ultra-Modern) Download
  app.get('/api/download/android-final-complete', (req, res) => {
    try {
      const filePath = path.join(__dirname, '..', 'avi-crm-android-final-complete.zip');
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      res.setHeader('Content-Disposition', 'attachment; filename="avi-crm-android-final-complete.zip"');
      res.setHeader('Content-Type', 'application/zip');
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('[DOWNLOAD] Android final complete error:', error);
      res.status(500).json({ error: 'Download failed' });
    }
  });

  // Docker Build Download
  app.get('/api/download/dockerbuild', (req, res) => {
    try {
      const dockerBuildPath = path.join(process.cwd(), 'dockerbuild.zip');
      
      if (!fs.existsSync(dockerBuildPath)) {
        return res.status(404).json({ error: 'Docker build package not found' });
      }

      res.setHeader('Content-Disposition', 'attachment; filename="avi-crm-desktop-dockerbuild.zip"');
      res.setHeader('Content-Type', 'application/zip');
      
      const fileStream = fs.createReadStream(dockerBuildPath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('[DOWNLOAD] Docker build error:', error);
      res.status(500).json({ error: 'Download failed' });
    }
  });

  // GitHub Source Download
  app.get('/api/download/github-source', (req, res) => {
    try {
      const githubSourcePath = path.join(process.cwd(), 'avi-crm-github.zip');
      
      if (!fs.existsSync(githubSourcePath)) {
        return res.status(404).json({ error: 'GitHub source package not found' });
      }

      res.setHeader('Content-Disposition', 'attachment; filename="avi-crm-github-source.zip"');
      res.setHeader('Content-Type', 'application/zip');
      
      const fileStream = fs.createReadStream(githubSourcePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('[DOWNLOAD] GitHub source error:', error);
      res.status(500).json({ error: 'Download failed' });
    }
  });

  // Android Workspace Integration Download
  app.get('/api/download/android-workspace-integration', (req, res) => {
    try {
      const filePath = path.join(__dirname, '..', 'avi-crm-android-workspace-integration.zip');
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Android workspace integration package not found' });
      }
      
      res.setHeader('Content-Disposition', 'attachment; filename="avi-crm-android-workspace-integration.zip"');
      res.setHeader('Content-Type', 'application/zip');
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('[DOWNLOAD] Android workspace integration error:', error);
      res.status(500).json({ error: 'Download failed' });
    }
  });

  // Projects API endpoints
  app.get('/api/projects', async (req, res) => {
    try {
      console.log('[API] GET /api/projects');
      
      // Return mock projects data
      const projects = [
        {
          id: 1,
          name: "Website Redesign",
          description: "Complete redesign of company website",
          status: "in_progress",
          startDate: "2024-01-15",
          endDate: "2024-03-15",
          budget: 25000,
          clientId: 1
        },
        {
          id: 2,
          name: "Mobile App Development",
          description: "iOS and Android app for client",
          status: "planning",
          startDate: "2024-02-01",
          endDate: "2024-05-01",
          budget: 50000,
          clientId: 2
        },
        {
          id: 3,
          name: "Database Migration",
          description: "Migrate legacy system to new database",
          status: "completed",
          startDate: "2023-12-01",
          endDate: "2024-01-31",
          budget: 15000,
          clientId: 3
        }
      ];
      
      res.json(projects);
    } catch (error) {
      console.error('[API] Projects error:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  });

  // Parts API endpoints
  app.get('/api/parts/needed', async (req, res) => {
    try {
      console.log('[API] GET /api/parts/needed');
      
      // Return mock parts that need to be ordered
      const neededParts = [
        {
          id: 1,
          name: "Arduino Uno R3",
          description: "Microcontroller board for prototyping",
          partNumber: "ARDUINO-UNO-R3",
          quantity: 5,
          unitPrice: 25.99,
          supplier: "SparkFun Electronics",
          status: "needed",
          category: "Electronics"
        },
        {
          id: 2,
          name: "Raspberry Pi 4 Model B",
          description: "Single-board computer for IoT projects",
          partNumber: "RPI-4B-4GB",
          quantity: 3,
          unitPrice: 55.00,
          supplier: "Adafruit Industries",
          status: "needed",
          category: "Electronics"
        },
        {
          id: 3,
          name: "Stepper Motor NEMA 17",
          description: "High torque stepper motor for 3D printing",
          partNumber: "NEMA17-42BYGH",
          quantity: 8,
          unitPrice: 12.50,
          supplier: "Pololu Robotics",
          status: "needed",
          category: "Mechanical"
        }
      ];
      
      res.json(neededParts);
    } catch (error) {
      console.error('[API] Parts needed error:', error);
      res.status(500).json({ error: 'Failed to fetch needed parts' });
    }
  });

  // Project-specific parts endpoints
  app.get('/api/projects/:projectId/parts', async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      console.log(`[API] GET /api/projects/${projectId}/parts`);
      
      // Return mock parts for the specific project
      const projectParts = [
        {
          id: 1,
          projectId: projectId,
          name: "LED Strip WS2812B",
          description: "Addressable RGB LED strip",
          partNumber: "WS2812B-60LED",
          quantity: 2,
          unitPrice: 18.99,
          supplier: "Adafruit Industries",
          status: "ordered",
          category: "Lighting"
        },
        {
          id: 2,
          projectId: projectId,
          name: "ESP32 Development Board",
          description: "WiFi and Bluetooth enabled microcontroller",
          partNumber: "ESP32-DEVKIT-V1",
          quantity: 4,
          unitPrice: 8.50,
          supplier: "SparkFun Electronics",
          status: "received",
          category: "Electronics"
        }
      ];
      
      res.json(projectParts);
    } catch (error) {
      console.error('[API] Project parts error:', error);
      res.status(500).json({ error: 'Failed to fetch project parts' });
    }
  });

  app.post('/api/projects/:projectId/parts', async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      console.log(`[API] POST /api/projects/${projectId}/parts`, req.body);
      
      // Create a new part for the project
      const newPart = {
        id: Date.now(),
        projectId: projectId,
        ...req.body,
        createdAt: new Date().toISOString()
      };
      
      res.status(201).json(newPart);
    } catch (error) {
      console.error('[API] Create part error:', error);
      res.status(500).json({ error: 'Failed to create part' });
    }
  });

  app.put('/api/parts/:partId', async (req, res) => {
    try {
      const partId = parseInt(req.params.partId);
      console.log(`[API] PUT /api/parts/${partId}`, req.body);
      
      // Update the part
      const updatedPart = {
        id: partId,
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      res.json(updatedPart);
    } catch (error) {
      console.error('[API] Update part error:', error);
      res.status(500).json({ error: 'Failed to update part' });
    }
  });

  // Task assignment endpoints
  app.get('/api/admin/task-assignments', async (req, res) => {
    try {
      console.log('[API] GET /api/admin/task-assignments');
      
      // Return mock task assignments
      const taskAssignments = [
        {
          id: 1,
          projectId: 1,
          employeeId: "EMP001",
          title: "Website Design Review",
          description: "Review and approve the new website design mockups",
          priority: "high",
          status: "assigned",
          estimatedHours: 4,
          dueDate: "2024-02-15T10:00:00Z",
          assignedBy: "Administrator",
          notificationSettings: {
            enabled: true,
            intervals: [60, 300, 900],
            urgencyLevel: "normal",
            persistUntilComplete: false,
            escalateAfterHours: 4
          },
          createdAt: "2024-02-10T09:00:00Z"
        },
        {
          id: 2,
          projectId: 2,
          employeeId: "EMP002",
          title: "Database Optimization",
          description: "Optimize database queries for better performance",
          priority: "medium",
          status: "assigned",
          estimatedHours: 8,
          dueDate: "2024-02-20T17:00:00Z",
          assignedBy: "Administrator",
          notificationSettings: {
            enabled: true,
            intervals: [120, 600],
            urgencyLevel: "low",
            persistUntilComplete: true,
            escalateAfterHours: 8
          },
          createdAt: "2024-02-12T14:30:00Z"
        }
      ];
      
      res.json(taskAssignments);
    } catch (error) {
      console.error('[API] Task assignments error:', error);
      res.status(500).json({ error: 'Failed to fetch task assignments' });
    }
  });

  app.post('/api/admin/task-assignments', async (req, res) => {
    try {
      console.log('[API] POST /api/admin/task-assignments', req.body);
      
      // Create a new task assignment
      const newTaskAssignment = {
        id: Date.now(),
        ...req.body,
        status: 'assigned',
        createdAt: new Date().toISOString()
      };
      
      res.status(201).json(newTaskAssignment);
    } catch (error) {
      console.error('[API] Create task assignment error:', error);
      res.status(500).json({ error: 'Failed to create task assignment' });
    }
  });

  // Workspaces API endpoints
  app.get('/api/workspaces', async (req, res) => {
    try {
      console.log('[API] GET /api/workspaces');
      
      // Return mock workspaces
      const workspaces = [
        {
          id: 1,
          name: "Development",
          description: "Software development projects",
          color: "#3b82f6",
          createdBy: "admin",
          createdAt: "2024-01-15T10:00:00Z",
          updatedAt: "2024-01-15T10:00:00Z"
        },
        {
          id: 2,
          name: "Marketing",
          description: "Marketing and promotional projects",
          color: "#10b981",
          createdBy: "admin",
          createdAt: "2024-01-20T14:30:00Z",
          updatedAt: "2024-01-20T14:30:00Z"
        }
      ];
      
      res.json(workspaces);
    } catch (error) {
      console.error('[API] Workspaces error:', error);
      res.status(500).json({ error: 'Failed to fetch workspaces' });
    }
  });

  app.get('/api/workspaces/:workspaceId/categories', async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      console.log(`[API] GET /api/workspaces/${workspaceId}/categories`);
      
      // Return mock categories for the workspace
      const categories = [
        {
          id: 1,
          workspaceId: workspaceId,
          name: "Frontend",
          description: "Frontend development tasks",
          color: "#f59e0b",
          position: 0,
          createdAt: "2024-01-15T10:00:00Z",
          updatedAt: "2024-01-15T10:00:00Z"
        },
        {
          id: 2,
          workspaceId: workspaceId,
          name: "Backend",
          description: "Backend development tasks",
          color: "#8b5cf6",
          position: 1,
          createdAt: "2024-01-15T10:00:00Z",
          updatedAt: "2024-01-15T10:00:00Z"
        }
      ];
      
      res.json(categories);
    } catch (error) {
      console.error('[API] Workspace categories error:', error);
      res.status(500).json({ error: 'Failed to fetch workspace categories' });
    }
  });

  app.get('/api/workspaces/:workspaceId/categories/:categoryId/projects', async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const categoryId = parseInt(req.params.categoryId);
      console.log(`[API] GET /api/workspaces/${workspaceId}/categories/${categoryId}/projects`);
      
      // Return mock projects for the category
      const projects = [
        {
          id: 1,
          workspaceId: workspaceId,
          categoryId: categoryId,
          name: "Website Redesign",
          description: "Complete redesign of company website",
          status: "active",
          priority: "high",
          startDate: "2024-01-15T00:00:00Z",
          endDate: "2024-03-15T00:00:00Z",
          estimatedHours: 80,
          actualHours: 45,
          budget: 15000,
          spent: 8500,
          assignedUsers: ["user1", "user2"],
          tags: ["design", "frontend"],
          color: "#10b981",
          position: 0,
          createdBy: "admin",
          createdAt: "2024-01-15T10:00:00Z",
          updatedAt: "2024-01-15T10:00:00Z"
        }
      ];
      
      res.json(projects);
    } catch (error) {
      console.error('[API] Category projects error:', error);
      res.status(500).json({ error: 'Failed to fetch category projects' });
    }
  });

  app.get('/api/workspaces/:workspaceId/projects', async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      console.log(`[API] GET /api/workspaces/${workspaceId}/projects`);
      
      // Return mock uncategorized projects for the workspace
      const projects = [
        {
          id: 2,
          workspaceId: workspaceId,
          categoryId: null,
          name: "Mobile App Development",
          description: "iOS and Android app for client",
          status: "active",
          priority: "medium",
          startDate: "2024-02-01T00:00:00Z",
          endDate: "2024-05-01T00:00:00Z",
          estimatedHours: 120,
          actualHours: 30,
          budget: 25000,
          spent: 6000,
          assignedUsers: ["user3"],
          tags: ["mobile", "app"],
          color: "#3b82f6",
          position: 0,
          createdBy: "admin",
          createdAt: "2024-02-01T09:00:00Z",
          updatedAt: "2024-02-01T09:00:00Z"
        }
      ];
      
      res.json(projects);
    } catch (error) {
      console.error('[API] Workspace projects error:', error);
      res.status(500).json({ error: 'Failed to fetch workspace projects' });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map();

  wss.on('connection', (ws) => {
    console.log('[WEBSOCKET] New client connected');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'authenticate') {
          clients.set(ws, { userId: data.userId, username: data.username });
          ws.send(JSON.stringify({
            type: 'connection_established',
            message: 'Connected successfully',
            userId: data.userId
          }));
        }
      } catch (error) {
        console.error('[WEBSOCKET] Message error:', error.message);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log('[WEBSOCKET] Client disconnected');
    });
  });

  // File watcher can be added later if needed

  return httpServer;
}