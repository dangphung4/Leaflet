import "@blocknote/core/fonts/inter.css";
// TODO: eventually move to shadcn instead of mantime,  @blocknote/shadcn
// TODO: although this means we will have to edit styles again of editor component
// import { BlockNoteView } from "@blocknote/mantine";
import { BlockNoteView } from "@blocknote/shadcn";

// this will use shadcn styles ex: @blocknote/shadcn/style.css
// import "@blocknote/mantine/style.css";
// import "@blocknote/shadcn/style.css";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteEditor } from "@blocknote/core";
import { useEffect, useCallback, useMemo } from "react";
import debounce from "lodash/debounce";
import { useAuth } from '../Auth/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db as firestore } from '../Auth/firebase';
import { cn } from '@/lib/utils';
import { useTheme } from "../Theme/ThemeProvider";
import { themes } from "../Theme/themes";

import "@fontsource/monaspace-neon/400.css";
import "@fontsource/monaspace-neon/500.css";
import "@fontsource/monaspace-neon/700.css";

import "@fontsource/fira-code/500.css";
import "@fontsource/fira-code/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/700.css";
import "@fontsource/roboto/400.css";
import "@fontsource/open-sans/400.css";
import "@fontsource/source-sans-3/400.css";
import "@fontsource/merriweather/400.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/500.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/caveat/400.css";
import "@fontsource/caveat/500.css";
import "@fontsource/caveat/700.css";
import "@fontsource/dancing-script/400.css";
import "@fontsource/dancing-script/500.css";
import "@fontsource/dancing-script/700.css";
import "@fontsource/anonymous-pro/400.css";
import "@fontsource/anonymous-pro/700.css";
import "@fontsource/ubuntu-mono/400.css";
import "@fontsource/ubuntu-mono/700.css";
import "@fontsource/inconsolata/400.css";
import "@fontsource/inconsolata/700.css";
import "@fontsource/handlee/400.css";
import "@fontsource/patrick-hand/400.css";
import "@fontsource/kalam/400.css";
import "@fontsource/kalam/700.css";
import "@fontsource/indie-flower/400.css";
import "@fontsource/dm-mono/400.css";
import "@fontsource/dm-mono/500.css";
import "@fontsource/overpass-mono/400.css";
import "@fontsource/overpass-mono/700.css";

// Import shadcn components
import * as Button from "@/components/ui/button";
import * as Select from "@/components/ui/select";
import * as DropdownMenu from "@/components/ui/dropdown-menu";
import * as Popover from "@/components/ui/popover";
import * as Toggle from "@/components/ui/toggle";
import * as Form from "@/components/ui/form";
import * as Input from "@/components/ui/input";
import * as Label from "@/components/ui/label";
import * as Card from "@/components/ui/card";
import * as Tabs from "@/components/ui/tabs";
import * as Badge from "@/components/ui/badge";



interface EditorProps {
  content: string; // Change to expect string since that's how it's stored
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (content: any[]) => void;
  onSave?: () => void;
  editorRef?: React.MutableRefObject<BlockNoteEditor | null>;
}

/**
 *
 * @param root0
 * @param root0.content
 * @param root0.onChange
 * @param root0.onSave
 * @param root0.editorRef
 */

// TODO BLOCK NOTE THEME TYPES FOR INTEGRATING IN EDITOR
// type CombinedColor = Partial<{
//   text: string;
//   background: string;
// }>;

// type ColorScheme = Partial<{
//   editor: CombinedColor;
//   menu: CombinedColor;
//   tooltip: CombinedColor;
//   hovered: CombinedColor;
//   selected: CombinedColor;
//   disabled: CombinedColor;
//   shadow: string;
//   border: string;
//   sideMenu: string;
//   highlights: Partial<{
//     gray: CombinedColor;
//     brown: CombinedColor;
//     red: CombinedColor;
//     orange: CombinedColor;
//     yellow: CombinedColor;
//     green: CombinedColor;
//     blue: CombinedColor;
//     purple: CombinedColor;
//     pink: CombinedColor;
//   }>;
// }>;

// type BlockNoteTheme = Partial<{
//     colors: ColorScheme;
//     borderRadius: number;
//     fontFamily: string;
//   }>;

/**
 *
 * @param root0
 * @param root0.content
 * @param root0.onChange
 * @param root0.onSave
 * @param root0.editorRef
 */
export default function Editor({
  content,
  onChange,
  onSave,
  editorRef,
}: EditorProps) {
  const { user } = useAuth();
  const { theme: currentMode, currentTheme } = useTheme();
  
  const getEffectiveTheme = (mode: 'light' | 'dark' | 'system') => {
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode;
  };

  // Create editor instance
  const editor = useCreateBlockNote({
    initialContent: useMemo(
      () =>
        content
          ? JSON.parse(content)
          : [{ type: "paragraph", content: [] }],
      [content]
    ),
  });

  // Set CSS variables for theming
  useEffect(() => {
    const root = document.documentElement;
    const mode = getEffectiveTheme(currentMode);
    const colors = themes[currentTheme][mode];

    root.style.setProperty('--bn-colors-editor-text', `hsl(${colors.foreground})`);
    root.style.setProperty('--bn-colors-editor-background', `hsl(${colors.background})`);
    root.style.setProperty('--bn-colors-menu-text', `hsl(${colors.popoverForeground})`);
    root.style.setProperty('--bn-colors-menu-background', `hsl(${colors.popover})`);
    root.style.setProperty('--bn-colors-tooltip-text', `hsl(${colors.popoverForeground})`);
    root.style.setProperty('--bn-colors-tooltip-background', `hsl(${colors.popover})`);
    root.style.setProperty('--bn-colors-hovered-text', `hsl(${colors.accent})`);
    root.style.setProperty('--bn-colors-hovered-background', `hsl(${colors.accent}/10)`);
    root.style.setProperty('--bn-colors-selected-text', `hsl(${colors.primary})`);
    root.style.setProperty('--bn-colors-selected-background', `hsl(${colors.primary}/10)`);

    root.style.setProperty('--bn-colors-highlights-gray-text', `hsl(${colors.foreground})`);
    root.style.setProperty('--bn-colors-highlights-gray-background', `hsl(var(--muted) / 0.3)`);
    
    root.style.setProperty('--bn-colors-highlights-brown-text', `hsl(30 24% 20%)`);
    root.style.setProperty('--bn-colors-highlights-brown-background', `hsl(30 24% 80% / 0.3)`);
    
    root.style.setProperty('--bn-colors-highlights-red-text', `hsl(0 72% 35%)`);
    root.style.setProperty('--bn-colors-highlights-red-background', `hsl(0 72% 80% / 0.3)`);
    
    root.style.setProperty('--bn-colors-highlights-orange-text', `hsl(24 75% 35%)`);
    root.style.setProperty('--bn-colors-highlights-orange-background', `hsl(24 75% 80% / 0.3)`);
    
    root.style.setProperty('--bn-colors-highlights-yellow-text', `hsl(45 75% 35%)`);
    root.style.setProperty('--bn-colors-highlights-yellow-background', `hsl(45 75% 80% / 0.3)`);
    
    root.style.setProperty('--bn-colors-highlights-green-text', `hsl(120 45% 35%)`);
    root.style.setProperty('--bn-colors-highlights-green-background', `hsl(120 45% 80% / 0.3)`);
    
    root.style.setProperty('--bn-colors-highlights-blue-text', `hsl(210 75% 35%)`);
    root.style.setProperty('--bn-colors-highlights-blue-background', `hsl(210 75% 80% / 0.3)`);
    
    root.style.setProperty('--bn-colors-highlights-purple-text', `hsl(270 75% 35%)`);
    root.style.setProperty('--bn-colors-highlights-purple-background', `hsl(270 75% 80% / 0.3)`);
    
    root.style.setProperty('--bn-colors-highlights-pink-text', `hsl(330 75% 35%)`);
    root.style.setProperty('--bn-colors-highlights-pink-background', `hsl(330 75% 80% / 0.3)`);
  }, [currentMode, currentTheme, getEffectiveTheme]);

  // Set editor reference if provided
  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

  // Load user's font preference and sync with localStorage
  useEffect(() => {
    const loadFontPreference = async () => {
      if (!user) {
        // If no user, use localStorage preference
        const savedFont = localStorage.getItem('editor-font');
        if (savedFont) {
          document.documentElement.style.setProperty('--editor-font', savedFont);
        }
        return;
      }
      
      try {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        const preferences = userDoc.data()?.preferences;
        if (preferences?.editorFont) {
          document.documentElement.style.setProperty('--editor-font', preferences.editorFont);
          localStorage.setItem('editor-font', preferences.editorFont);
        }
      } catch (error) {
        console.error('Error loading font preference:', error);
        // Fallback to localStorage if Firestore fails
        const savedFont = localStorage.getItem('editor-font');
        if (savedFont) {
          document.documentElement.style.setProperty('--editor-font', savedFont);
        }
      }
    };

    loadFontPreference();
  }, [user]);

  // Debounced save function
  const debouncedSave = useCallback(
    debounce((editor: BlockNoteEditor) => {
      try {
        const blocks = editor.document;
        onChange(blocks);
        onSave?.();
      } catch (error) {
        console.error("Error saving editor content:", error);
      }
    }, 500),
    [onChange, onSave]
  );


  return (
    <div className="flex flex-col flex-1 h-full w-full bg-background overflow-hidden">
      <BlockNoteView
        editor={editor}
        theme={getEffectiveTheme(currentMode)}
        onChange={() => debouncedSave(editor)}
        shadCNComponents={{
          Button,
          Select,
          DropdownMenu,
          Popover,
          Toggle,
          Form,
          Input,
          Label,
          Card,
          Tabs,
          Badge
        }}
        className={cn(
          "flex-1 h-full overflow-y-auto mobile-editor relative",
          "[&_.ProseMirror]:min-h-[calc(100vh-8rem)] [&_.ProseMirror]:p-4",
          //  (desktop) size is smaller, mobile is slightly larger
          "[&_.ProseMirror]:text-base [&_.ProseMirror]:max-sm:text-lg",
        )}
      />
    </div>
  );
}
