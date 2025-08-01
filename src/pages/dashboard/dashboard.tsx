import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TaskDashboard } from "../../components/task-dashboard"
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Clock, 
  FolderOpen,
  // CheckCircle,
  // AlertTriangle,
  Calendar,
  ArrowUp,
  ArrowDown,
  ListTodo,
  // User,
  // Bell,
  // BellRing,
 
} from 'lucide-react';
// import { useQuery } from '@tanstack/react-query';
import { useHttpAuth } from '@/hooks/useHttpAuth';

export default function Dashboard() {
  const { user, isAuthenticated } = useHttpAuth();
  

  //Just comment out these things since there's a need setup again and and create seperate folder for the api functions in /components/api/dashboard.ts
  

  // // Fetch tasks assigned to the current user
  // const { data: taskData = [], isLoading: tasksLoading, error: tasksError } = useQuery({
  //   queryKey: ['/api/my-tasks'],
  //   enabled: false, // Disable until external server has this endpoint
  //   refetchInterval: false,
  // });

  // // // Fetch notifications for the current user
  // const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
  //   queryKey: [`/api/notifications/${user?.id}`],
  //   enabled: false, // Disable until external server has this endpoint
  //   refetchInterval: false,
  // });

  // Mock data for demonstration
  const stats = {
    totalProjects: 24,
    activeProjects: 8,
    completedProjects: 16,
    totalRevenue: 485000,
    monthlyRevenue: 45000,
    totalClients: 12,
    activeClients: 8,
    totalHours: 2840,
    billableHours: 2560,
    utilization: 90
  };

  // // Filter tasks for current user and get upcoming ones
  // const userTasksFiltered = taskData ? (Array.isArray(taskData) ? taskData.filter((task: any) => 
  //   task.assignedTo === user?.id && 
  //   task.status !== 'completed' && 
  //   task.status !== 'cancelled'
  // ).sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) : []) : [];

  // const dashboardTasks = userTasksFiltered.slice(0, 5); // Show first 5 upcoming tasks

  // // Calculate upcoming deadlines from actual tasks
  // const upcomingDeadlines = userTasksFiltered
  //   .filter((task: any) => task.dueDate)
  //   .map((task: any) => {
  //     const dueDate = new Date(task.dueDate);
  //     const today = new Date();
  //     const timeDiff = dueDate.getTime() - today.getTime();
  //     const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
  //     return {
  //       project: task.title,
  //       client: task.projectName || 'N/A',
  //       dueDate: task.dueDate,
  //       daysLeft: daysLeft
  //     };
  //   })
  //   .slice(0, 3); // Show top 3 upcoming deadlines

  // const getStatusColor = (status: string) => {
  //   switch (status) {
  //     case 'active': return 'bg-green-500 text-white';
  //     case 'completed': return 'bg-blue-500 text-white';
  //     case 'on_hold': return 'bg-yellow-500 text-white';
  //     default: return 'bg-slate-500 text-white';
  //   }
  // };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50  ">
      {/* Header */}
     <div className="bg-white border-b border-slate-300 p-4">
  <div className="flex flex-col md:flex-row md:items-center justify-between md:ml-0 ml-10 md:px-10 px-16 w-full">
    
    {/* Left side: Dashboard title and subtitle */}
    <div className="w-full flex justify-between items-start md:block">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
          <BarChart3 className="mr-3 text-blue-600" size={28} />
          Dashboard
        </h1>
        <p className="text-slate-600 mt-1 md:text-base text-sm">
          Overview of your business metrics and activities
        </p>
      </div>

      {/* Bell icon for small screens */}
      {/* <div className="md:hidden block">
        {isAuthenticated && (
          <div className="relative">
            <button className="relative p-2 text-neutral-600 hover:text-neutral-900 transition-colors">
              {notifications && notifications.length > 0 ? (
                <BellRing className="h-5 w-5" />
              ) : (
                <Bell className="h-5 w-5" />
              )}
              {notifications && notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div> */}
    </div>

    {/* Right side: Bell (md+), User Info, Last Updated */}
    <div className="flex items-center space-x-4 md:mt-0 mt-4 ">
      {/* <div className="hidden md:block">
        {isAuthenticated && (
          <div className="relative">
            <button className="relative p-2 text-neutral-600 hover:text-neutral-900 transition-colors">
              {notifications && notifications.length > 0 ? (
                <BellRing className="h-5 w-5" />
              ) : (
                <Bell className="h-5 w-5" />
              )}
              {notifications && notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div> */}

      {isAuthenticated && user && (
        <div className=" items-center space-x-2 md:flex hidden flex-row justify-between ">
          <div className="w-11 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
            {user.firstName?.[0]}{user.lastName?.[0]}
          </div>
          <span className="text-sm text-slate-600 ">
            {user.firstName} {user.lastName}
          </span>
        </div>
      )}
      
      <div className="text-sm text-slate-500 md:flex hidden">
        Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  </div>
</div>

      <div className="flex-1 overflow-y-auto py-6 xl:px-12 px-8 md:ml-0 ml-22 ">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <p className="text-xs text-slate-500">
                <span className="inline-flex items-center text-green-600">
                  <ArrowUp size={12} className="mr-1" />
                  +12%
                </span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div>
              <p className="text-xs text-slate-500">
                <span className="inline-flex items-center text-green-600">
                  <ArrowUp size={12} className="mr-1" />
                  +8%
                </span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              <Users className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeClients}</div>
              <p className="text-xs text-slate-500">
                <span className="inline-flex items-center text-red-600">
                  <ArrowDown size={12} className="mr-1" />
                  -2%
                </span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilization</CardTitle>
              <Clock className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.utilization}%</div>
              <p className="text-xs text-slate-500">
                <span className="inline-flex items-center text-green-600">
                  <ArrowUp size={12} className="mr-1" />
                  +5%
                </span> from last month
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <ListTodo className="mr-2 text-blue-600" size={20} />
                Upcoming Tasks
              </CardTitle>
              <CardDescription>Tasks assigned to you</CardDescription>
            </CardHeader>
            {/* <CardContent>
              {tasksLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  ))}
                </div>
              ) : tasksError ? (
                <div className="text-center py-4">
                  <p className="text-red-600 text-sm">Failed to load tasks</p>
                </div>
              ) : dashboardTasks.length === 0 ? (
                <div className="text-center py-8">
                  <ListTodo className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No upcoming tasks assigned</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardTasks.map((task: any) => {
                    const dueDate = new Date(task.dueDate);
                    const today = new Date();
                    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-slate-900">{task.title}</h4>
                            <Badge variant={task.priority === 'urgent' ? 'destructive' : task.priority === 'high' ? 'secondary' : 'outline'}>
                              {task.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{task.description}</p>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Due: {dueDate.toLocaleDateString()}</span>
                            <span className={`font-medium ${daysUntilDue <= 1 ? 'text-red-600' : daysUntilDue <= 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                              {daysUntilDue <= 0 ? 'Overdue' : `${daysUntilDue} days left`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent> */}
          </Card>

          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Calendar className="mr-2 text-yellow-600" size={20} />
                Upcoming Deadlines
              </CardTitle>
              <CardDescription>Projects requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              {/* <div className="space-y-4">
                {upcomingDeadlines.map((item, index) => (
                                  <div key={index} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900">{item.project}</h4>
                    <p className="text-sm text-slate-600">{item.client}</p>
                    <p className="text-xs text-slate-500 mt-1">Due: {item.dueDate}</p>
                  </div>
                    <div className="text-right">
                      <div className={`flex items-center ${item.daysLeft <= 7 ? 'text-red-600' : item.daysLeft <= 14 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {item.daysLeft <= 7 && <AlertTriangle size={16} className="mr-1" />}
                        <span className="font-medium">{item.daysLeft} days</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div> */}
            </CardContent>
          </Card>

          {/* Revenue Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <TrendingUp className="mr-2 text-green-600" size={20} />
                Revenue Overview
              </CardTitle>
              <CardDescription>Financial performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Total Revenue</span>
                  <span className="text-xl font-bold text-slate-900">{formatCurrency(stats.totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">This Month</span>
                  <span className="text-lg font-semibold text-green-600">{formatCurrency(stats.monthlyRevenue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Avg. per Project</span>
                  <span className="text-lg font-semibold text-slate-700">{formatCurrency(stats.totalRevenue / stats.totalProjects)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Clock className="mr-2 text-blue-600" size={20} />
                Team Performance
              </CardTitle>
              <CardDescription>Time tracking and utilization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Total Hours</span>
                  <span className="text-xl font-bold text-slate-900">{stats.totalHours.toLocaleString()}h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Billable Hours</span>
                  <span className="text-lg font-semibold text-green-600">{stats.billableHours.toLocaleString()}h</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Utilization Rate</span>
                    <span className="font-medium">{stats.utilization}%</span>
                  </div>
                  <Progress value={stats.utilization} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task Dashboard */}
        <div className="mt-6">
          <TaskDashboard userId={user?.id || ''} />
        </div>
      </div>
    </div>
  );
}