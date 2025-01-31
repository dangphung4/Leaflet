import "@blocknote/core/fonts/inter.css";
// TODO: eventually move to shadcn instead of mantime,  @blocknote/shadcn
// TODO: although this means we will have to edit styles again of editor component
import { BlockNoteView } from "@blocknote/mantine";
// this will use shadcn styles ex: @blocknote/shadcn/style.css
import "@blocknote/mantine/style.css";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteEditor } from "@blocknote/core";
import { useEffect, useState, useCallback, useMemo } from "react";
import debounce from "lodash/debounce";
import { useAuth } from '../Auth/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db as firestore } from '../Auth/firebase';
import { useTheme } from '../Theme/ThemeProvider';
import { cn } from '@/lib/utils';

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
export default function Editor({
  content,
  onChange,
  onSave,
  editorRef,
}: EditorProps) {
  const { user } = useAuth();
  const { currentTheme } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains("dark")
  );

  // Load font preference on mount and store it in state
  const [, setEditorFont] = useState<string>(() => {
    return localStorage.getItem('editor-font') || "Monaspace Neon";
  });

  // Create editor instance
  const editor = useCreateBlockNote({
    initialContent: useMemo(
      () =>
        content
          ? JSON.parse(content)
          : [
              {
                type: "paragraph",
                content: [],
              },
            ],
      [content]
    ),
  });

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
          setEditorFont(savedFont);
        }
        return;
      }
      
      try {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        const preferences = userDoc.data()?.preferences;
        if (preferences?.editorFont) {
          document.documentElement.style.setProperty('--editor-font', preferences.editorFont);
          localStorage.setItem('editor-font', preferences.editorFont);
          setEditorFont(preferences.editorFont);
        }
      } catch (error) {
        console.error('Error loading font preference:', error);
        // Fallback to localStorage if Firestore fails
        const savedFont = localStorage.getItem('editor-font');
        if (savedFont) {
          document.documentElement.style.setProperty('--editor-font', savedFont);
          setEditorFont(savedFont);
        }
      }
    };

    loadFontPreference();
  }, [user]);

  // Watch for theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          const isDark = document.documentElement.classList.contains("dark");
          setIsDarkMode(isDark);
          localStorage.setItem('color-theme', isDark ? 'dark' : 'light');
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Set initial theme from localStorage or system preference
    const savedTheme = localStorage.getItem('color-theme');
    if (savedTheme) {
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      setIsDarkMode(savedTheme === 'dark');
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', systemDark);
      setIsDarkMode(systemDark);
    }

    return () => observer.disconnect();
  }, []);

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
        theme={isDarkMode ? "dark" : "light"}
        onChange={() => debouncedSave(editor)}
        className={cn(
          "flex-1 h-full bg-background overflow-y-auto mobile-editor relative",
          "[&_.ProseMirror]:text-xl",
          "[&_.ProseMirror]:sm:text-2xl",
          "[&_.ProseMirror]:font-[var(--editor-font)]",
          "[&_.ProseMirror]:text-foreground",
          "[&_.ProseMirror_a]:text-primary",
          "[&_.ProseMirror_blockquote]:border-l-primary",
          "[&_.ProseMirror_pre]:bg-muted",
          "[&_.ProseMirror_hr]:border-border",
          "[&_.bn-container]:h-full",
          "[&_.ProseMirror]:h-full",
          "[&_.ProseMirror]:min-h-[calc(100vh-8rem)]"
        )}
      />
    </div>
  );
}
