import { Switch, Route } from "wouter";
import { queryClient } from "./lib/api"; // Using the same file for queryClient re-export
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Dashboard from "./pages/dashboard";
import Documents from "./pages/documents";
import DocumentDetail from "./pages/document-detail";
import Categories from "./pages/categories";
import SuperuserDashboard from "@/pages/superuser-dashboard";
import SuperuserUploads from "@/pages/superuser-uploads";
import UserDashboard from "@/pages/user-dashboard";

import { api } from "./lib/api";
import AuthPage from "./pages/auth";

function Router() {
  const user = api.getCurrentUser();

  if (!user) {
    return <AuthPage />;
  }

  // Redirect regular users from dashboard to their user dashboard
  if (user.role === "user" && window.location.pathname === "/") {
    window.location.replace("/user-dashboard");
    return null; // Prevent rendering the old dashboard
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/user-dashboard" component={UserDashboard} />
        <Route path="/documents" component={Documents} />
        <Route path="/documents/:id" component={DocumentDetail} />
        {(user.role === "superuser" || user.role === "admin") && (
          <Route path="/categories" component={Categories} />
        )}
        {user.role === "superuser" && (
          <>
            <Route path="/superuser" component={SuperuserDashboard} />
            <Route path="/superuser/uploads" component={SuperuserUploads} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
