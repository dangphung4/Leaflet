import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import "./App.css";
import { DesktopNav, MobileNav } from "./Core/Components/navbar";
import Auth from "./Core/Auth/Auth.tsx";
import Home from "./Core/Pages/Home.tsx";
import PWABadge from "./PWABadge.tsx";
import { auth } from "./Core/Auth/firebase.ts";
import { useAuth } from "./Core/Auth/AuthContext.tsx";
import Signup from "./Core/Auth/Signup";
import Footer from "./Core/Components/footer";
import Profile from "./Core/Pages/Profile";
import Layout from "./Core/Components/layout";
import Notes from './Core/Pages/Notes';
import NewNote from './Core/Pages/NewNote';
import EditNote from './Core/Pages/EditNote';
import Install from './Core/Pages/Install';
import Calendar from './Core/Pages/Calendar';
import Folders from './Core/Pages/Folders';
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, Command } from "@/components/ui/command";
import { ThemeProvider } from './Core/Theme/ThemeProvider';
import { ProductivityDashboard } from './Core/Pages/Productivity';

/**
 * CommandPalette component provides a command dialog for quick navigation and actions.
 * It listens for keyboard shortcuts and displays a command palette with various options.
 * 
 * @component
 * @returns {JSX.Element} The rendered CommandPalette component.
 */
function CommandPalette() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // Handle keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const location = useLocation();
  const isCalendarPage = location.pathname === "/calendar";
  

  const publicPages = [
    {
      id: "home",
      name: "Home",
      shortcut: ["G", "H"],
      action: () => {
        navigate("/");
        setOpen(false);
      },
    },
    {
      id: "install",
      name: "Install App",
      shortcut: ["G", "I"],
      action: () => {
        navigate("/install");
        setOpen(false);
      },
    },
  ];

  const filteredPublicPages = isCalendarPage 
    ? publicPages.filter(page => page.id !== "home")
    : publicPages;

  const commands = [
    {
      heading: "Public Pages",
      items: filteredPublicPages,
    },
    {
      heading: "Authentication",
      items: user
        ? [
            {
              id: "logout",
              name: "Logout",
              shortcut: ["G", "L"],
              action: () => {
                navigate("/logout");
                setOpen(false);
              },
            },
          ]
        : [
            {
              id: "login",
              name: "Login",
              shortcut: ["G", "L"],
              action: () => {
                navigate("/auth");
                setOpen(false);
              },
            },
            {
              id: "signup",
              name: "Sign Up",
              shortcut: ["G", "S"],
              action: () => {
                navigate("/signup");
                setOpen(false);
              },
            },
          ],
    },
    ...(user
      ? [
          {
            heading: "Protected Pages",
            items: [
              {
                id: "notes",
                name: "Notes",
                shortcut: ["G", "N"],
                action: () => {
                  navigate("/notes");
                  setOpen(false);
                },
              },
              {
                id: "productivity",
                name: "Productivity",
                shortcut: ["G", "D"],
                action: () => {
                  navigate("/productivity");
                  setOpen(false);
                },
              },
              {
                id: "folders",
                name: "Folders",
                shortcut: ["G", "F"],
                action: () => {
                  navigate("/folders");
                  setOpen(false);
                },
              },
              {
                id: "new-note",
                name: "New Note",
                shortcut: ["G", "M"],
                action: () => {
                  navigate("/notes/new");
                  setOpen(false);
                },
              },
              {
                id: "calendar",
                name: "Calendar",
                shortcut: ["G", "C"],
                action: () => {
                  navigate("/calendar");
                  setOpen(false);
                },
              },
              {
                id: "profile",
                name: "Profile",
                shortcut: ["G", "P"],
                action: () => {
                  navigate("/profile");
                  setOpen(false);
                },
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command className="rounded-lg border shadow-md">
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {commands.map((group) => (
            <CommandGroup key={group.heading} heading={group.heading}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={item.action}
                >
                  <span>{item.name}</span>
                  {item.shortcut && (
                    <div className="ml-auto flex items-center space-x-2">
                      {item.shortcut.map((key, index) => (
                        <span
                          key={index}
                          className="rounded bg-muted px-2 py-1 text-sm"
                        >
                          {key}
                        </span>
                      ))}
                    </div>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

/**
 * A functional component that conditionally renders the Footer component
 * based on the current location's pathname. The footer is hidden for specific
 * routes defined in the `hideFooterPaths` array.
 *
 * The following paths will hide the footer:
 * - '/notes/new'
 * - '/notes/:id' (where :id can be any value)
 *
 * It uses the `useLocation` hook from React Router to access the current
 * location and determine if the footer should be displayed.
 *
 * @returns {JSX.Element | null} Returns the Footer component if the current
 * location does not match any of the hide paths; otherwise, returns null.
 *
 * @example
 * // Example usage within a parent component
 * const App = () => (
 *   <div>
 *     <Header />
 *     <FooterWrapper />
 *     <MainContent />
 *   </div>
 * );
 */
function FooterWrapper() {
  const location = useLocation();
  const hideFooterPaths = ['/notes/new', '/notes/:id'];
  
  // Check if current path matches any path where footer should be hidden
  const shouldHideFooter = hideFooterPaths.some(path => {
    // Convert route pattern to regex
    const regex = new RegExp('^' + path.replace(/:[^\s/]+/g, '[^\\s/]+') + '$');
    return regex.test(location.pathname);
  });

  if (shouldHideFooter) {
    return null;
  }

  return <Footer />;
}

/**
 * The main application component that serves as the entry point for the application.
 * It wraps the application in a theme provider and sets up routing and layout.
 *
 * This component includes:
 * - A theme provider to manage styling.
 * - A router for handling navigation.
 * - A desktop navigation component.
 * - A mobile navigation component.
 * - Application routes defined in the AppRoutes component.
 * - A footer wrapper for the application's footer content.
 * - A PWA badge for progressive web app features.
 *
 * @returns {JSX.Element} The rendered application component.
 *
 * @example
 * // Usage of the App component in a React application
 * import React from 'react';
 * import ReactDOM from 'react-dom';
 * import App from './App';
 *
 * ReactDOM.render(<App />, document.getElementById('root'));
 */
function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-background text-foreground">
          <DesktopNav darkMode={false} toggleDarkMode={() => {}} />
          <MobileNav darkMode={false} toggleDarkMode={() => {}} />
          <AppRoutes />
          <FooterWrapper />
          <PWABadge />
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

/**
 * LogoutHandler component handles user logout by signing out the user
 * and navigating back to the home page.
 * 
 * @component
 * @returns {JSX.Element} The rendered LogoutHandler component.
 */
function LogoutHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    auth.signOut().then(() => {
      navigate("/");
    });
  }, [navigate]);

  return <div>Logging out...</div>;
}

/**
 * AppRoutes component defines the application's routes and renders the appropriate
 * components based on the current URL. It includes both public and private routes.
 * 
 * @component
 * @returns {JSX.Element} The rendered AppRoutes component.
 */
function AppRoutes() {
  return (
    <>
      <CommandPalette />
      <Layout>
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/productivity"
              element={
                <PrivateRoute>
                  <ProductivityDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/folders"
              element={
                <PrivateRoute>
                  <Folders />
                </PrivateRoute>
              }
            />
            <Route
              path="/notes"
              element={
                <PrivateRoute>
                  <Notes />
                </PrivateRoute>
              }
            />
            <Route
              path="/notes/new"
              element={
                <PrivateRoute>
                  <NewNote />
                </PrivateRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <PrivateRoute>
                  <Calendar />
                </PrivateRoute>
              }
            />
            <Route
              path="/notes/:id"
              element={
                <PrivateRoute>
                  <EditNote />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
            <Route path="/logout" element={<LogoutHandler />} />
            <Route path="/install" element={<Install />} />
          </Routes>
        </main>
      </Layout>
    </>
  );
}

/**
 * PrivateRoute component restricts access to certain routes based on user authentication.
 * If the user is not authenticated, they are redirected to the authentication page.
 * 
 * @component
 * @param {Object} props - The component props.
 * @param {React.ReactNode} props.children - The child components to render if authenticated.
 * @returns {JSX.Element} The rendered PrivateRoute component.
 */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/auth" />;

  return <>{children}</>;
}

export default App;
