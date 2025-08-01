import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { CrmLayout } from "./components/layout/mainCRMLayout";
import Dashboard from "./pages/dashboard/dashboard";
import Projects from "./pages/projects&workspaces/projects"
import TasksPage from "./pages/tasks/tasks"
import { queryClient } from "./lib/queryClient";
import TimeTracking from "./pages/timetracking/timetracking"
import CalendarPage from "./pages/calendar/calendar"
import Clients from "./pages/clients/clients"
import Sales from "./pages/sales/sales"
import Invoices from "./pages/invoices/invoices"
import Accounting from "./pages/accounting/accounting";
import Employees from "./pages/employees";
import Departments from "./pages/departments";
import Parts from "./pages/parts";
import Settings from "./pages/settings";
import AdministrationPage from "./pages/administration-page-simple"
import HttpFilesPage from "./pages/files"
import Suppliers from "./pages/suppliers"


// import { NotificationSocket } from "./components/NotificationSocket";
import HttpLogin from "@/pages/http-login";
import CustomLogin from "./pages/custom-login";
import { SoundWaveLoader } from "./components/SoundWaveLoader";
import { useHttpAuth } from "@/hooks/useHttpAuth";

function App() {
const httpAuth = useHttpAuth();

    // Use only HTTP authentication
  const isAuthenticated = httpAuth.isAuthenticated;
  const isLoading = httpAuth.isLoading;
  

  // Desktop App Logic - Show debug info at the top
  console.log('Rendering desktop app - Auth state:', { isAuthenticated, isLoading, user: httpAuth.user });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center space-y-4">
          <SoundWaveLoader size="lg" color="#9521c0" text="Loading authentication..." />
          <p className="text-xs text-neutral-400 mt-2">Debug: isLoading={String(isLoading)}, isAuthenticated={String(isAuthenticated)}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('User not authenticated, showing login');
    return (
      <div className="min-h-screen bg-red-50">
        <Switch>
          <Route path="/custom-login" component={CustomLogin} />
          <Route path="/http-login" component={HttpLogin} />
          <Route path="/" component={HttpLogin} />
          <Route component={HttpLogin} />
        </Switch>
      </div>
    );
  }

  
  // Authenticated desktop view
  console.log('User authenticated, showing CRM layout');

  return (
    <QueryClientProvider client={queryClient}>
       {/* <NotificationSocket /> */}
      <CrmLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/projects" component={Projects}/>
          <Route path="/tasks" component={TasksPage}/>
          <Route path="/timetracking" component={TimeTracking}/>
          <Route path="/calendar" component={CalendarPage}/>
          <Route path="/clients" component={Clients} />
          <Route path="/sales" component={Sales}/>
          <Route path="/invoices" component={Invoices}/>
          <Route path="/accounting" component={Accounting}/>
          <Route path="/employees" component={Employees}/>
          <Route path="/departments" component={Departments}/>
          <Route path="/parts" component={Parts}/>
          <Route path="/settings" component={Settings}/>
          <Route path="/departments" component={Departments} />
          <Route path="/administration" component={AdministrationPage} />
            <Route path="/files" component={HttpFilesPage} />
          <Route path="/suppliers" component={Suppliers} />
         

        </Switch>
      </CrmLayout>
    </QueryClientProvider>
  );
}

export default App;
