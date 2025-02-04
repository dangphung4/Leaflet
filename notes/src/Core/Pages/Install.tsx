import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppleIcon, SmartphoneIcon, MonitorIcon } from "lucide-react";

/**
 *
 */
export default function Install() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-center mb-8">Installation Guide</h1>
      <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
        Install Leaflet on your preferred device for the best offline-capable experience. Follow the instructions below for your platform.
      </p>

      <Tabs defaultValue="ios" className="max-w-3xl mx-auto">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="ios" className="flex items-center gap-2">
            <AppleIcon className="h-5 w-5" /> iOS
          </TabsTrigger>
          <TabsTrigger value="android" className="flex items-center gap-2">
            <SmartphoneIcon className="h-5 w-5" /> Android
          </TabsTrigger>
          <TabsTrigger value="desktop" className="flex items-center gap-2">
            <MonitorIcon className="h-5 w-5" /> Desktop
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ios">
          <Card>
            <CardHeader>
              <CardTitle>Install on iOS</CardTitle>
              <CardDescription>
                Follow these steps to install Leaflet on your iPhone or iPad
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-4">
                <li>Open Safari on your iOS device</li>
                <li>Visit <code className="bg-muted px-2 py-1 rounded">leaflet.at</code></li>
                <li>Tap the Share button (rectangle with arrow pointing up)</li>
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Tap "Add" in the top right corner</li>
              </ol>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Note: The app must be installed through Safari. Other browsers on iOS don't support PWA installation.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="android">
          <Card>
            <CardHeader>
              <CardTitle>Install on Android</CardTitle>
              <CardDescription>
                Follow these steps to install Leaflet on your Android device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-4">
                <li>Open Chrome on your Android device</li>
                <li>Visit <code className="bg-muted px-2 py-1 rounded">leaflet.at</code></li>
                <li>Tap the three-dot menu in the top right</li>
                <li>Tap "Install app" or "Add to Home screen"</li>
                <li>Follow the prompts to install</li>
              </ol>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  You'll be able to launch the app from your home screen just like any other app.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="desktop">
          <Card>
            <CardHeader>
              <CardTitle>Install on Desktop</CardTitle>
              <CardDescription>
                Follow these steps to install Leaflet on your computer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-4">
                <li>Open Chrome, Edge, or other Chromium-based browser</li>
                <li>Visit <code className="bg-muted px-2 py-1 rounded">leaflet.at</code></li>
                <li>Look for the install icon (⊕) in the address bar</li>
                <li>Click "Install" when prompted</li>
              </ol>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Once installed, you can launch Leaflet from your Start menu or dock like any other application.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}