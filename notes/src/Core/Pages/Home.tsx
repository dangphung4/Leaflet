import { Button } from "../../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui/card";
import { useAuth } from "../Auth/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  LightningBoltIcon,
  MixIcon,
  CodeIcon,
  DrawingPinIcon,
  ClockIcon,
  RocketIcon,
  UpdateIcon,
  GitHubLogoIcon,
  VercelLogoIcon,
  EnterIcon,
  CalendarIcon,
  Share2Icon,
  HomeIcon,
  FileTextIcon,
} from "@radix-ui/react-icons";
import demoImage from "../../assets/demo.png";
import agendaview from "../../assets/agendaview.png";
import dayview from "../../assets/dayview.png";
import weekview from "../../assets/weekview.png";
import logo from "../../assets/leaflet-maskable.png";
import { CloudIcon, SmartphoneIcon, UserIcon, CommandIcon, TagIcon, CpuIcon, PaletteIcon, LigatureIcon, TextIcon, LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../Theme/ThemeProvider";
import { themes, ThemeName } from "../Theme/themes";
import { cn } from "../../lib/utils";
import { Check } from "lucide-react";
import { SunIcon, MoonIcon } from "@radix-ui/react-icons";
import { ScrollArea } from "../../components/ui/scroll-area";

/**
 * Home page component that displays the landing page of the application
 * @component
 * @returns {JSX.Element} The rendered Home component
 */
export default function Home() {
  /** User authentication context */
  const { user } = useAuth();
  /** Navigation hook for routing */
  const navigate = useNavigate();
  const { theme, setTheme, currentTheme, setCurrentTheme, editorFont, setEditorFont } = useTheme();

  /** Detects if user is on MacOS for keyboard shortcuts */
  const isMacOs = navigator.userAgent.includes('Mac');

  const getEffectiveTheme = (mode: 'light' | 'dark' | 'system') => {
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode;
  };

  const groupThemes = () => {
    const groups = {
      'Default': ['default'],
      'Modern': ['materialDesign', 'tokyoNight', 'catppuccin', 'rosePine', 'discord'],
      'Classic': ['solarized', 'gruvbox', 'oneDark', 'monokaiPro'],
      'Vibrant': ['synthwave', 'cyberpunk', 'shadesOfPurple', 'yuzuMarmalade'],
      'Natural': ['horizon', 'palenight', 'ayu', 'tuscanWallAmpala', 'vesper', 'coffeeTime', 'disciplinarySunCrate', 'provincialCalmingRetro'],
      'Mechanical': ['gmkOlivia', 'denim', 'gmk9009', 'tiramisu'],
      'Professional': ['github', 'nord', 'cobalt', 'winterIsComing', 'bleachedLink', 'darcula'],
    };
    
    return Object.entries(groups).map(([groupName, themeNames]) => ({
      name: groupName,
      themes: themeNames.map(name => ({
        name: name as ThemeName,
        displayName: name === 'default' ? 'Default' : name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1')
      }))
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="flex justify-center mb-4">
          <img src={logo} alt="Leaflet Logo" className="h-32 w-32 rounded-lg" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-6">Leaflet</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          A minimalist note-taking app because screw apple notes. Clean, fast,
          and focused on what matters most - your thoughts.
        </p>
        <div className="flex justify-center gap-4">
          {user ? (
            <div className="space-y-4">
              <Button
                onClick={() => navigate("/notes")}
                size="lg"
                className="w-full"
              >
                <LightningBoltIcon className="mr-2 h-5 w-5" /> Open Notes
              </Button>
              <p className="text-sm text-muted-foreground">
                Welcome back, {user.email}!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => navigate("/auth")}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <EnterIcon className="mr-2 h-5 w-5" /> Sign In
                </Button>
                <Button
                  onClick={() => navigate("/signup")}
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Get Started
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate("/install")}
                  className="w-full sm:w-auto"
                >
                  <SmartphoneIcon className="mr-2 h-4 w-4" /> Install App
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Free to try, no credit card required
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Command pallete section instructions */}
      {/* Command palette section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          Command Palette
        </h2>
        <div className="max-w-2xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-center space-x-2">
                <CommandIcon className="h-10 w-10 text-primary" />
                <CardTitle className="text-2xl">Quick Navigation</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-1">
                  <kbd className="pointer-events-none h-7 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-sm font-medium flex">
                    {isMacOs ? "⌘" : "Ctrl"}
                  </kbd>
                  <span className="text-sm text-muted-foreground">+</span>
                  <kbd className="pointer-events-none h-7 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-sm font-medium flex">
                    K
                  </kbd>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Available Commands:</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <HomeIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm">Go Home</span>
                    <div className="ml-auto flex gap-1">
                      <kbd className="rounded bg-muted px-2 py-0.5 text-xs">
                        G
                      </kbd>
                      <kbd className="rounded bg-muted px-2 py-0.5 text-xs">
                        H
                      </kbd>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm">Calendar</span>
                    <div className="ml-auto flex gap-1">
                      <kbd className="rounded bg-muted px-2 py-0.5 text-xs">
                        G
                      </kbd>
                      <kbd className="rounded bg-muted px-2 py-0.5 text-xs">
                        C
                      </kbd>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileTextIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm">Notes</span>
                    <div className="ml-auto flex gap-1">
                      <kbd className="rounded bg-muted px-2 py-0.5 text-xs">
                        G
                      </kbd>
                      <kbd className="rounded bg-muted px-2 py-0.5 text-xs">
                        N
                      </kbd>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm">Profile</span>
                    <div className="ml-auto flex gap-1">
                      <kbd className="rounded bg-muted px-2 py-0.5 text-xs">
                        G
                      </kbd>
                      <kbd className="rounded bg-muted px-2 py-0.5 text-xs">
                        P
                      </kbd>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-muted/30">
                <p className="text-sm text-muted-foreground text-center">
                  Press <span className="font-semibold">Esc</span> to close the
                  command palette at any time
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
        
        {/* Theme & Font Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <PaletteIcon className="h-6 w-6 text-primary" />
                <CardTitle>Beautiful Themes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <CardDescription>
                Choose from over 15 carefully crafted themes, each with light and dark variants. From modern to classic, find the perfect look for your notes.
              </CardDescription>
              <div className="flex flex-wrap gap-2">
                {['primary', 'secondary', 'accent', 'muted'].map((color) => (
                  <div
                    key={color}
                    className={`w-6 h-6 rounded-full bg-${color}`}
                    title={`${color} color`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>• Light & Dark modes</span>
                <span>• Custom color schemes</span>
                <span>• Synced preferences</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <LigatureIcon className="h-6 w-6 text-primary" />
                <CardTitle>Typography Excellence</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <CardDescription>
                Express yourself with a wide selection of premium fonts. From coding-optimized monospace to elegant serifs and playful handwriting styles.
              </CardDescription>
              <div className="space-y-2">
                <p className="font-monaspace text-sm">Monaspace Neon for clean code</p>
                <p className="font-merriweather text-sm">Merriweather for elegant reading</p>
                <p className="font-caveat text-sm">Caveat for personal touch</p>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>• Multiple font families</span>
                <span>• Optimized readability</span>
                <span>• Custom styles</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <CommandIcon className="h-6 w-6 text-primary" />
                <CardTitle>Command Palette</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Quick navigation with keyboard shortcuts (⌘/Ctrl + K). Access all your notes and app features instantly.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-6 w-6 text-primary" />
                <CardTitle>Calendar Integration</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Seamlessly manage events, set reminders, and organize your schedule with our built-in calendar.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <TagIcon className="h-6 w-6 text-primary" />
                <CardTitle>Smart Tags</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Organize notes with customizable tags and colors. Filter and search your content effortlessly.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Share2Icon className="h-6 w-6 text-primary" />
                <CardTitle>Collaboration</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Share notes and events with others. Control permissions and work together in real-time.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <SmartphoneIcon className="h-6 w-6 text-primary" />
                <CardTitle>PWA Ready</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Install as a native app on any device. Work offline and sync when connected.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <LinkIcon className="h-6 w-6 text-primary" />
                <CardTitle>Linked Notes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Connect your notes together seamlessly, just like in Obsidian. Create a network of linked ideas and references.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Call to Action */}
      {!user && (
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="bg-primary/10 rounded-lg p-8 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Join up if you feel like dealing with bugs for now. It'll get
              better as long as I remember to work on it.
            </p>
            <Button onClick={() => navigate("/signup")} size="lg">
              Create Free Account
            </Button>
          </div>
        </section>
      )}

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-12">
          <div className="flex-1 space-y-8">
            <div className="flex items-start gap-4">
              <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Sign In</h3>
                <p className="text-muted-foreground">
                  Create an account or sign in to access your personal note
                  space.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Create Notes</h3>
                <p className="text-muted-foreground">
                  Start writing with our clean, distraction-free editor.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Organize</h3>
                <p className="text-muted-foreground">
                  Keep your thoughts organized with tags and categories.
                </p>
              </div>
            </div>
          </div>
          <div className="flex-1 rounded-lg overflow-hidden shadow-xl">
            <img
              src={demoImage}
              alt="App Screenshot"
              className="w-full h-auto"
              onError={(e) => {
                e.currentTarget.src =
                  "../../assets/agendaview.png";
              }}
            />
          </div>
        </div>
      </section>

      {/* Calendar Showcase Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Calendar Integration</h2>
        <div className="space-y-16">
          {/* Calendar Overview */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-12">
            <div className="flex-1 space-y-8">
              <div className="flex items-start gap-4">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Multiple Views</h3>
                  <p className="text-muted-foreground">
                    Switch between Day, Week, and Agenda views to manage your schedule effectively.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Event Management</h3>
                  <p className="text-muted-foreground">
                    Create, edit, and share events with customizable colors and reminders.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Collaboration</h3>
                  <p className="text-muted-foreground">
                    Share events with team members and manage permissions.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex-1 rounded-lg overflow-hidden shadow-xl">
              <img
                src={weekview}
                alt="Calendar Week View"
                className="w-full h-auto"
                onError={(e) => {
                  e.currentTarget.src =
                    "../../assets/weekview.png";
                }}
              />
            </div>
          </div>

          {/* Calendar Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-lg overflow-hidden shadow-xl">
              <img
                src={dayview}
                alt="Calendar Day View"
                className="w-full h-auto"
                onError={(e) => {
                  e.currentTarget.src =
                    "../../assets/dayview.png";
                }}
              />
            </div>
            <div className="rounded-lg overflow-hidden shadow-xl">
              <img
                src={agendaview}
                alt="Calendar Agenda View"
                className="w-full h-auto"
                onError={(e) => {
                  e.currentTarget.src =
                    "../../assets/agendaview.png";
                }}
              />
            </div>
          </div>

          {/* Calendar Features List */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Share2Icon className="h-6 w-6 text-primary" />
                  <CardTitle>Event Sharing</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Share events with team members and control viewing or editing permissions. Perfect for team coordination.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <CommandIcon className="h-6 w-6 text-primary" />
                  <CardTitle>Quick Search</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Instantly find events using the command palette (⌘/Ctrl + K). Search across all your calendar entries.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <TagIcon className="h-6 w-6 text-primary" />
                  <CardTitle>Event Tags</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Organize events with custom tags and colors. Filter and categorize your schedule efficiently.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Productivity Features Section */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <h2 className="text-3xl font-bold text-center mb-12">Productivity Tools</h2>
        <div className="space-y-16">
          {/* Pomodoro Timer */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-12">
            <div className="flex-1 space-y-8">
              <div className="flex items-start gap-4">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Pomodoro Timer</h3>
                  <p className="text-muted-foreground">
                    Stay focused with customizable work sessions and breaks. Track your productivity with detailed statistics and progress indicators.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Task Management</h3>
                  <p className="text-muted-foreground">
                    Create and organize tasks with priorities, due dates, and Pomodoro estimates. Track completion and progress over time.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Habit Tracking</h3>
                  <p className="text-muted-foreground">
                    Build and maintain habits with daily, weekly, or monthly tracking. Monitor streaks and celebrate consistency.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex-1 rounded-lg overflow-hidden shadow-xl">
              <div className="bg-card p-8 rounded-lg border">
                <div className="space-y-8">
                  <div className="flex justify-center">
                    <div className="w-48 h-48 rounded-full border-8 border-primary flex items-center justify-center">
                      <div className="text-4xl font-bold">25:00</div>
                    </div>
                  </div>
                  <div className="flex justify-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">8</div>
                      <div className="text-sm text-muted-foreground">Sessions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">200</div>
                      <div className="text-sm text-muted-foreground">Minutes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">5</div>
                      <div className="text-sm text-muted-foreground">Tasks</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <ClockIcon className="h-6 w-6 text-primary" />
                  <CardTitle>Custom Timers</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Customize work and break durations to match your productivity rhythm. Set short and long break intervals.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <MixIcon className="h-6 w-6 text-primary" />
                  <CardTitle>Task Integration</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Link Pomodoro sessions to specific tasks. Track time spent and progress on each task automatically.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <UpdateIcon className="h-6 w-6 text-primary" />
                  <CardTitle>Progress Tracking</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  View detailed statistics about your productivity. Track daily goals and celebrate achievements.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <DrawingPinIcon className="h-6 w-6 text-primary" />
                  <CardTitle>Task Priorities</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Set task priorities and organize your work. Focus on what matters most with clear visual indicators.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <RocketIcon className="h-6 w-6 text-primary" />
                  <CardTitle>Habit Streaks</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Build consistency with habit tracking. Monitor your streaks and get motivated by your progress.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Share2Icon className="h-6 w-6 text-primary" />
                  <CardTitle>Progress Sharing</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Share your productivity achievements. Inspire and get inspired by others' progress.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Daily Progress */}
          <div className="bg-card p-8 rounded-lg border mt-12">
            <h3 className="text-2xl font-bold text-center mb-8">Daily Progress Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">8/10</div>
                <div className="text-sm text-muted-foreground">Pomodoros</div>
                <div className="mt-2 h-2 bg-muted rounded-full">
                  <div className="h-full bg-primary rounded-full" style={{ width: '80%' }}></div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">5/7</div>
                <div className="text-sm text-muted-foreground">Tasks</div>
                <div className="mt-2 h-2 bg-muted rounded-full">
                  <div className="h-full bg-primary rounded-full" style={{ width: '71%' }}></div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">3/3</div>
                <div className="text-sm text-muted-foreground">Habits</div>
                <div className="mt-2 h-2 bg-muted rounded-full">
                  <div className="h-full bg-primary rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">200</div>
                <div className="text-sm text-muted-foreground">Minutes Focused</div>
                <div className="mt-2 h-2 bg-muted rounded-full">
                  <div className="h-full bg-primary rounded-full" style={{ width: '83%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h3 className="text-2xl font-bold text-center mb-8">
          Everything You Need in One Place
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-6 w-6 text-primary" />
                <CardTitle>Calendar Integration</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Seamlessly integrate your notes with calendar events. Plan your
                schedule, set reminders, and keep your tasks organized in a
                timeline view. Perfect for project planning and daily
                organization.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <CloudIcon className="h-6 w-6 text-primary" />
                <CardTitle>Event Synchronization</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Your notes and events stay in sync across all devices. Add an
                event in your calendar and automatically create linked notes.
                Never miss a meeting or deadline again.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <DrawingPinIcon className="h-6 w-6 text-primary" />
                <CardTitle>Quick Notes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Capture your thoughts instantly with our streamlined interface.
                Access from anywhere - web, mobile, or desktop app.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-6 w-6 text-primary" />
                <CardTitle>Real-time Cloud Sync</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Changes sync instantly across all your devices. Work seamlessly
                between your phone, tablet, and computer without missing a beat.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <UpdateIcon className="h-6 w-6 text-primary" />
                <CardTitle>Regular Updates</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                We're constantly improving with new features based on user
                feedback. Recent additions include calendar integration and
                enhanced sync capabilities.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <LightningBoltIcon className="h-6 w-6 text-primary" />
                <CardTitle>Lightning Fast</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Optimized for speed - your notes and calendar events load
                instantly. Quick search across all your content lets you find
                what you need fast.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <CpuIcon className="h-6 w-6 text-primary" />
                <CardTitle>Smart Features</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Advanced features including nested todos, markdown support,
                voice-to-text, and intelligent calendar suggestions to help you
                stay organized.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <RocketIcon className="h-6 w-6 text-primary" />
                <CardTitle>AI Enhancements</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Smart scheduling suggestions, meeting note templates, and
                AI-powered organization help you make the most of your time and
                notes.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Customization Showcase Section */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <h2 className="text-3xl font-bold text-center mb-12">Personalization</h2>
        
        {/* Theme & Font Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Theme Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <PaletteIcon className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Theme Options</CardTitle>
                  <CardDescription>Choose your preferred theme and mode</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mode Selection */}
              <div className="flex gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setTheme('light')}
                >
                  <SunIcon className="mr-2 h-4 w-4" />
                  Light
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setTheme('dark')}
                >
                  <MoonIcon className="mr-2 h-4 w-4" />
                  Dark
                </Button>
              </div>

              {/* Theme Selection */}
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {groupThemes().map((group) => (
                    <div key={group.name} className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">{group.name}</h4>
                      {group.themes.map((themeOption) => (
                        <Button
                          key={themeOption.name}
                          variant="outline"
                          className={cn(
                            "w-full justify-start gap-2",
                            currentTheme === themeOption.name && "border-primary"
                          )}
                          onClick={() => setCurrentTheme(themeOption.name)}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <div className="flex gap-1">
                              <div
                                className="h-4 w-4 rounded-full"
                                style={{
                                  backgroundColor: `hsl(${themes[themeOption.name][getEffectiveTheme(theme)].primary})`
                                }}
                              />
                              <div
                                className="h-4 w-4 rounded-full"
                                style={{
                                  backgroundColor: `hsl(${themes[themeOption.name][getEffectiveTheme(theme)].secondary})`
                                }}
                              />
                            </div>
                            <span>{themeOption.displayName}</span>
                            {currentTheme === themeOption.name && (
                              <Check className="h-4 w-4 ml-auto" />
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Font Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <LigatureIcon className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Font Selection</CardTitle>
                  <CardDescription>Choose your preferred font style</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {/* Font categories and their options */}
                  {[
                    {
                      category: 'Monospace Fonts',
                      fonts: [
                        { name: 'Monaspace Neon', class: 'font-monaspace' },
                        { name: 'JetBrains Mono', class: 'font-jetbrains' },
                        { name: 'Fira Code', class: 'font-fira-code' }
                      ]
                    },
                    {
                      category: 'Sans Serif Fonts',
                      fonts: [
                        { name: 'Inter', class: 'font-inter' },
                        { name: 'Roboto', class: 'font-roboto' },
                        { name: 'Open Sans', class: 'font-open-sans' }
                      ]
                    },
                    {
                      category: 'Serif Fonts',
                      fonts: [
                        { name: 'Merriweather', class: 'font-merriweather' },
                        { name: 'Playfair Display', class: 'font-playfair' }
                      ]
                    },
                    {
                      category: 'Handwriting Fonts',
                      fonts: [
                        { name: 'Caveat', class: 'font-caveat' },
                        { name: 'Dancing Script', class: 'font-dancing' },
                        { name: 'Comic Neue', class: 'font-comic-neue' }
                      ]
                    }
                  ].map(({ category, fonts }) => (
                    <div key={category} className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">{category}</h4>
                      {fonts.map(font => (
                        <Button
                          key={font.name}
                          variant="outline"
                          className={cn(
                            "w-full justify-between",
                            font.class,
                            editorFont === font.name && "border-primary"
                          )}
                          onClick={() => setEditorFont(font.name)}
                        >
                          <span>The quick brown fox</span>
                          {editorFont === font.name && <Check className="h-4 w-4" />}
                        </Button>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-4">
            All preferences are automatically saved and synced across your devices.
          </p>
          <Button variant="outline" asChild>
            <Link to="/profile">
              <TextIcon className="mr-2 h-4 w-4" />
              More Settings
            </Link>
          </Button>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          Built With Modern Tech
        </h2>
        <div className="flex flex-wrap justify-center gap-8 items-center max-w-3xl mx-auto">
          <div className="text-center p-4">
            <CodeIcon className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-semibold">React</p>
          </div>
          <div className="text-center p-4">
            <LightningBoltIcon className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-semibold">TypeScript</p>
          </div>
          <div className="text-center p-4">
            <MixIcon className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-semibold">Tailwind CSS</p>
          </div>
          <div className="text-center p-4">
            <VercelLogoIcon className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-semibold">Firebase & Vercel</p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-background py-20">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-6">About This Project</h2>
          <p className="text-muted-foreground mb-4">
            I built this app because I'm tired of apple notes, so im gonna make
            it better for what i want.
          </p>
          <p className="bg-muted/30 rounded-lg p-4 mb-4">
            The code base is public, so you can see how its made. Feel free to help me out and contribute lol.
          </p>
          <Button
            variant="outline"
            onClick={() =>
              window.open("https://github.com/dangphung4/notes", "_blank")
            }
          >
            <GitHubLogoIcon className="mr-2 h-4 w-4" /> View on GitHub
          </Button>
        </div>
      </section>
    </div>
  );
}
