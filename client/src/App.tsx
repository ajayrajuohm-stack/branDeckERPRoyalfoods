import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import Masters from "@/pages/Masters";
import Transactions from "@/pages/Transactions";
import Sales from "@/pages/Sales";
import Production from "@/pages/Production";
import Reports from "@/pages/Reports";
import Backup from "@/pages/Backup";
import Stock from "@/pages/Stock";
import Trash from "@/pages/Trash";
import { Sidebar, SidebarContent } from "@/components/Sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

function Router() {
  const [open, setOpen] = useState(false);

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="*">
        <div className="flex flex-col lg:flex-row min-h-screen bg-background text-foreground">
          {/* Mobile Top Navigation */}
          <header className="lg:hidden flex items-center justify-between p-4 border-b sticky top-0 bg-background/80 backdrop-blur-md z-50">
            <div className="flex items-center gap-2 font-bold text-primary">
              <Package className="w-6 h-6" />
              <span>BranDeck ERP</span>
            </div>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <SidebarContent onInteract={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
          </header>

          <Sidebar />
          <main className="flex-1 overflow-auto bg-muted/5 min-h-0">
            <Switch>
              <ProtectedRoute path="/" component={Dashboard} />
              <ProtectedRoute path="/masters" component={Masters} />
              <ProtectedRoute path="/transactions" component={Transactions} />
              <ProtectedRoute path="/sales" component={Sales} />
              <ProtectedRoute path="/production" component={Production} />
              <ProtectedRoute path="/stock" component={Stock} />
              <ProtectedRoute path="/reports" component={Reports} />
              <ProtectedRoute path="/backup" component={Backup} />
              <ProtectedRoute path="/trash" component={Trash} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
