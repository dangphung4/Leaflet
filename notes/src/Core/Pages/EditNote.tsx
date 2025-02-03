/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '../Components/Editor';
import { db } from '../Database/db';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TrashIcon} from '@radix-ui/react-icons';
import debounce from 'lodash/debounce';
import { useAuth } from '../Auth/AuthContext';
import type { Note } from '../Database/db';
import ShareDialog from '../Components/ShareDialog';
import { doc, onSnapshot } from 'firebase/firestore';
import { db as firestore } from '../Auth/firebase';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { CheckIcon } from '@radix-ui/react-icons';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { 
  MoreVerticalIcon, 
  ChevronLeftIcon, 
  PrinterIcon, 
  DownloadIcon,
  Loader2Icon,
  XIcon,
  FileTextIcon,
  FileIcon,
  CodeIcon,
  BoldIcon,
  ListIcon,
  CheckSquareIcon,
  ArrowUpIcon,
  ArrowLeftIcon,
  WifiOffIcon,
  Heading1Icon,
  ItalicIcon,
  UnderlineIcon,
  Heading2Icon,
  Heading3Icon,
  StrikethroughIcon
} from 'lucide-react';
import { BlockNoteEditor } from '@blocknote/core';
import { useGoogleLogin } from '@react-oauth/google';

/**
 * A functional component that allows users to edit a note.
 * It handles fetching the note from a database, displaying it in an editor,
 * and providing options to save, delete, and export the note in various formats.
 *
 * @returns {JSX.Element} The rendered component.
 *
 * @throws {Error} Throws an error if there is an issue loading or saving the note.
 *
 * @example
 * // Usage in a parent component
 * <EditNote />
 */
export default function EditNote() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [note, setNote] = useState<Note | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [isRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const editorRef = useRef<BlockNoteEditor | null>(null);
  const [activeStyles, setActiveStyles] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false
  });
  const [isExporting, setIsExporting] = useState(false);

  // Set up real-time listener for the note
  useEffect(() => {
    if (!id || !user) return;

    // Listen for real-time updates to the note
    const unsubscribe = onSnapshot(
      doc(firestore, 'notes', id),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const updatedNote = {
            ...data,
            firebaseId: doc.id,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            lastEditedAt: data.lastEditedAt?.toDate()
          } as Note;

          setNote(updatedNote);
          setTitle(updatedNote.title);
          setContent(updatedNote.content);
          setIsLoading(false);
        } else {
          console.error('Note not found');
          setIsLoading(false);
          setSaveStatus('error');
        }
      },
      (error) => {
        console.error('Error loading note:', error);
        setIsLoading(false);
        setSaveStatus('error');
      }
    );

    return () => unsubscribe();
  }, [id, user]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save note changes
  const saveNote = useCallback(async (newTitle: string, newContent: string) => {
    if (!note) return;

    setSaveStatus('saving');
    try {
      // Update note
      const updatedNote: Note = {
        ...note,
        title: newTitle,
        content: newContent,
        updatedAt: new Date(),
        lastEditedByUserId: user?.uid,
        lastEditedByEmail: user?.email || '',
        lastEditedByDisplayName: user?.displayName || 'Unknown',
        lastEditedByPhotoURL: user?.photoURL || undefined,
        lastEditedAt: new Date()
      };

      if (note.id) {
        await db.notes.update(note.id, updatedNote);
      }

      // Sync with Firebase if user is authenticated
      if (user) {
        await db.syncNote(updatedNote);
      }

      setNote(updatedNote);
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error saving note:', error);
      setSaveStatus('error');
    }
  }, [note, user]);

  // Debounced save for title changes
  const debouncedSaveTitle = useCallback(
    debounce((newTitle: string) => {
      if (content) {
        saveNote(newTitle, content);
      }
    }, 500),
    [saveNote, content]
  );

  // Handle content changes
  const handleContentChange = useCallback(async (newContent: any[]) => {
    const contentStr = JSON.stringify(newContent);
    setContent(contentStr);
    saveNote(title, contentStr);
  }, [title, saveNote]);

  // Handle note deletion
  const handleDelete = async () => {
    if (!note?.firebaseId || !window.confirm('Are you sure you want to delete this note?')) return;

    try {
      if (note.id) {
        await db.notes.delete(note.id);
      }

      if (user) {
        await db.deleteNote(note.firebaseId);
      }

      navigate('/notes');
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const login = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        // Save the token
        await db.saveGoogleToken(response.access_token, response.expires_in);
        // Immediately try to export after saving the token
        await handleExport('googledoc');
      } catch (error) {
        console.error('Google Login Error:', error);
        toast({
          title: "Login Failed",
          description: "Failed to login to Google",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      console.error('Google Login Error:', error);
      toast({
        title: "Login Failed",
        description: "Failed to login to Google",
        variant: "destructive"
      });
      setIsExporting(false);
    },
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents'
  });

  // Update handleExport function
  /**
   * Exports a note in the specified format.
   *
   * This function handles the export of a note's content into various formats including
   * markdown, plain text, HTML, DOCX, and Google Docs. It manages the necessary authentication
   * for Google Docs and provides feedback on the success or failure of the export operation.
   *
   * @param {('markdown' | 'txt' | 'html' | 'docx' | 'googledoc')} format - The format to export the note to.
   * @returns {Promise<void>} A promise that resolves when the export operation is complete.
   *
   * @throws {Error} Throws an error if the export fails due to an invalid token or other issues.
   *
   * @example
   * // Export a note as markdown
   * await handleExport('markdown');
   *
   * @example
   * // Export a note as a Google Doc
   * await handleExport('googledoc');
   */
  const handleExport = async (format: 'markdown' | 'txt' | 'html' | 'docx' | 'googledoc') => {
    if (!note) return;

    try {
      setIsExporting(true);
      let content = '';
      const parsedContent = JSON.parse(note.content);
      let docxBlob: Blob | null = null;
      
      // Get token before switch if needed
      let token: string | null = null;
      if (format === 'googledoc') {
        token = await db.getGoogleToken();
        if (!token) {
          login();
          return;
        }
      }
      
      switch (format) {
        case 'markdown':
          content = convertToMarkdown(parsedContent);
          downloadFile(`${note.title || 'Untitled'}.md`, content);
          break;
        case 'txt':
          content = convertToPlainText(parsedContent);
          downloadFile(`${note.title || 'Untitled'}.txt`, content);
          break;
        case 'html':
          content = convertToHTML(parsedContent);
          downloadFile(`${note.title || 'Untitled'}.html`, content);
          break;
        case 'docx':
          docxBlob = await convertToDocx(parsedContent);
          if (docxBlob) {
            const url = URL.createObjectURL(docxBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${note.title || 'Untitled'}.docx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
          break;
        case 'googledoc':
          await exportToGoogleDocs(note.content, token!);
          break;
      }

      if (format !== 'googledoc' || format === 'googledoc' && await db.getGoogleToken()) {
        toast({
          title: "Note exported",
          description: `Successfully exported as ${format.toUpperCase()}`,
        });
      }
    } catch (error) {
      console.error('Error exporting note:', error);
      // If the error is due to an invalid token, try to login again
      if (format === 'googledoc' && error instanceof Error && error.message.includes('401')) {
        login();
      } else {
        toast({
          title: "Export failed",
          description: error instanceof Error ? error.message : "Failed to export note",
          variant: "destructive",
        });
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Helper function to download the file
  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Conversion functions
  const convertToMarkdown = (blocks: any[]) => {
    let markdown = '';
    
    const getTextContent = (content: any[]) => {
      if (!Array.isArray(content)) return '';
      return content.map(c => {
        let text = c.text || '';
        if (c.styles?.bold) text = `**${text}**`;
        if (c.styles?.italic) text = `*${text}*`;
        if (c.styles?.underline) text = `_${text}_`;
        if (c.styles?.strike) text = `~~${text}~~`;
        return text;
      }).join('');
    };

    blocks.forEach(block => {
      switch (block.type) {
        case 'heading': {
          const level = '#'.repeat(block.props?.level || 1);
          markdown += `${level} ${getTextContent(block.content)}\n\n`;
          break;
        }
        case 'paragraph':
          markdown += `${getTextContent(block.content)}\n\n`;
          break;
        case 'bulletListItem':
          markdown += `* ${getTextContent(block.content)}\n`;
          break;
        case 'numberedListItem':
          markdown += `1. ${getTextContent(block.content)}\n`;
          break;
        case 'checkListItem': {
          const checkbox = block.props?.checked ? '[x]' : '[ ]';
          markdown += `${checkbox} ${getTextContent(block.content)}\n`;
          break;
        }
      }
    });
    return markdown;
  };

  const convertToPlainText = (blocks: any[]) => {
    return blocks.map(block => {
      // Safely get text content from block
      const getTextContent = (content: any[]) => {
        if (!Array.isArray(content)) return '';
        return content.map(c => c.text || '').join('');
      };

      const text = getTextContent(block.content);
      
      switch (block.type) {
        case 'heading':
          return `${text}\n`;
        case 'bulletListItem':
          return `• ${text}\n`;
        case 'numberedListItem':
          return `1. ${text}\n`;
        case 'checkListItem':
          return `${block.props?.checked ? '☒' : '☐'} ${text}\n`;
        case 'paragraph':
          return `${text}\n`;
        default:
          return `${text}\n`;
      }
    }).join('\n');
  };

  const convertToHTML = (blocks: any[]) => {
    const getTextContent = (content: any[]) => {
      if (!Array.isArray(content)) return '';
      return content.map(c => {
        let text = c.text || '';
        if (c.styles?.bold) text = `<strong>${text}</strong>`;
        if (c.styles?.italic) text = `<em>${text}</em>`;
        if (c.styles?.underline) text = `<u>${text}</u>`;
        if (c.styles?.strike) text = `<del>${text}</del>`;
        return text;
      }).join('');
    };

    let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>';
    html += note?.title || 'Untitled';
    html += '</title></head><body style="max-width: 800px; margin: 40px auto; padding: 0 20px; font-family: system-ui, -apple-system, sans-serif;">';
    
    blocks.forEach(block => {
      switch (block.type) {
        case 'heading':
          html += `<h${block.props?.level || 1}>${getTextContent(block.content)}</h${block.props?.level || 1}>`;
          break;
        case 'paragraph':
          html += `<p>${getTextContent(block.content)}</p>`;
          break;
        case 'bulletListItem':
          html += `<ul><li>${getTextContent(block.content)}</li></ul>`;
          break;
        case 'numberedListItem':
          html += `<ol><li>${getTextContent(block.content)}</li></ol>`;
          break;
        case 'checkListItem': {
          const checked = block.props?.checked ? ' checked' : '';
          html += `<div><input type="checkbox"${checked} disabled> ${getTextContent(block.content)}</div>`;
          break;
        }
      }
    });
    
    html += '</body></html>';
    return html;
  };

  /**
   * Converts an array of content blocks into a DOCX Blob.
   *
   * This asynchronous function takes an array of blocks, where each block can represent different types of content,
   * such as headings, bullet lists, numbered lists, and checklist items. It constructs a DOCX document based on the
   * provided blocks and returns it as a Blob.
   *
   * @param {any[]} blocks - An array of content blocks to be converted into a DOCX document.
   * Each block should have a 'type' property indicating its type (e.g., 'heading', 'bulletListItem', etc.)
   * and a 'content' property containing the text content.
   *
   * @returns {Promise<Blob>} A promise that resolves to a Blob representing the generated DOCX document.
   *
   * @throws {Error} Throws an error if the document generation fails.
   *
   * @example
   * const blocks = [
   *   { type: 'heading', props: { level: 1 }, content: [{ text: 'Document Title', styles: {} }] },
   *   { type: 'bulletListItem', content: [{ text: 'First item', styles: {} }] },
   *   { type: 'numberedListItem', content: [{ text: 'Second item', styles: {} }] },
   * ];
   *
   * convertToDocx(blocks).then(blob => {
   *   // Handle the generated DOCX Blob (e.g., save it or upload it)
   * });
   */
  const convertToDocx = async (blocks: any[]): Promise<Blob> => {
    if (!Array.isArray(blocks)) {
      throw new Error('Invalid content format');
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: blocks.map(block => {
          if (!block || typeof block !== 'object') return new Paragraph({});

          // Safely get text runs from content
          const getTextRuns = (content: any[]): TextRun[] => {
            if (!Array.isArray(content)) return [];
            return content.reduce((runs: TextRun[], c) => {
              if (!c || typeof c !== 'object') return runs;
              const text = c.text || '';
              if (!text) return runs;
              
              runs.push(new TextRun({
                text,
                bold: c.styles?.bold,
                italics: c.styles?.italic,
                underline: c.styles?.underline,
                strike: c.styles?.strike,
              }));
              return runs;
            }, []);
          };

          const textRuns = block.content ? getTextRuns(block.content) : [];

          switch (block.type) {
            case 'heading': {
              const level = block.props?.level || 1;
              const headingType = `HEADING_${level}` as keyof typeof HeadingLevel;
              return new Paragraph({
                children: textRuns,
                heading: HeadingLevel[headingType],
              });
            }
            case 'bulletListItem':
              return new Paragraph({
                children: textRuns,
                bullet: {
                  level: 0
                },
                indent: {
                  left: 720,
                  firstLine: 360
                }
              });
            case 'numberedListItem':
              return new Paragraph({
                children: textRuns,
                numbering: {
                  reference: 'default-numbering',
                  level: 0
                },
                indent: {
                  left: 720,
                  firstLine: 360
                }
              });
            case 'checkListItem':
              return new Paragraph({
                children: [
                  new TextRun({
                    text: block.props?.checked ? '☒ ' : '☐ ',
                  }),
                  ...textRuns
                ],
              });
            default:
              return new Paragraph({
                children: textRuns,
              });
          }
        }).filter(Boolean), // Remove any undefined/null paragraphs
      }],
    });

    return await Packer.toBlob(doc);
  };

  /**
   * Exports content to a new Google Docs document.
   *
   * This asynchronous function takes content in the form of a string or an array of content blocks,
   * and a Google API token to authenticate the request. It creates a new document, inserts the content,
   * applies formatting, and opens the document in a new tab.
   *
   * @param {string | any[]} content - The content to be exported. Can be a JSON string or an array of content blocks.
   * @param {string} token - The OAuth 2.0 token for Google API authentication.
   * @throws {Error} Throws an error if the document creation or update fails, with details from the Google Docs API.
   * @returns {Promise<void>} A promise that resolves when the document has been successfully created and updated.
   *
   * @example
   * const content = [
   *   { type: 'heading', props: { level: 1 }, content: [{ text: 'Document Title', styles: {} }] },
   *   { type: 'bulletListItem', content: [{ text: 'First item', styles: { bold: true } }] },
   *   { type: 'numberedListItem', content: [{ text: 'Second item', styles: {} }] }
   * ];
   * const token = 'YOUR_GOOGLE_API_TOKEN';
   * exportToGoogleDocs(content, token)
   *   .then(() => console.log('Document exported successfully'))
   *   .catch(error => console.error('Export failed:', error));
   */
  const exportToGoogleDocs = async (content: string | any[], token: string) => {
    try {
      // Parse the blocks if they're a string
      const parsedBlocks = typeof content === 'string' ? JSON.parse(content) : content;
      if (!Array.isArray(parsedBlocks)) {
        throw new Error('Invalid content format');
      }

      // First create an empty document
      const createResponse = await fetch('https://docs.googleapis.com/v1/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: note?.title || 'Untitled Note'
        })
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        console.error('Google Docs API Error:', errorData);
        throw new Error(errorData.error?.message || 'Failed to create Google Doc');
      }

      const { documentId } = await createResponse.json();

      // Then batch update the document with content
      const requests: any[] = [
        // Insert title
        {
          insertText: {
            location: {
              index: 1
            },
            text: `${note?.title || 'Untitled Note'}\n\n`
          }
        },
        {
          updateParagraphStyle: {
            range: {
              startIndex: 1,
              endIndex: (note?.title || 'Untitled Note').length + 1
            },
            paragraphStyle: {
              namedStyleType: 'HEADING_1'
            },
            fields: 'namedStyleType'
          }
        }
      ];

      // Add content blocks
      let currentIndex = (note?.title || 'Untitled Note').length + 3; // +3 for title + two newlines

      parsedBlocks.forEach((block: any) => {
        if (!block || typeof block !== 'object') return;

        // Safely get text content from block
        const getTextContent = (content: any[]): string => {
          if (!Array.isArray(content)) return '';
          return content.reduce((text, c) => {
            if (!c || typeof c !== 'object') return text;
            return text + (c.text || '');
          }, '');
        };

        const text = (block.content ? getTextContent(block.content) : '') + '\n';
        
        // Insert text
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text
          }
        });

        const endIndex = currentIndex + text.length;

        // Apply text styling
        if (Array.isArray(block.content)) {
          let textOffset = 0;
          block.content.forEach((c: any) => {
            if (!c || typeof c !== 'object' || !c.text) return;

            const textStart = currentIndex + textOffset;
            const textEnd = textStart + c.text.length;
            textOffset += c.text.length;

            if (c.styles?.bold) {
              requests.push({
                updateTextStyle: {
                  range: { startIndex: textStart, endIndex: textEnd },
                  textStyle: { bold: true },
                  fields: 'bold'
                }
              });
            }
            if (c.styles?.italic) {
              requests.push({
                updateTextStyle: {
                  range: { startIndex: textStart, endIndex: textEnd },
                  textStyle: { italic: true },
                  fields: 'italic'
                }
              });
            }
            if (c.styles?.underline) {
              requests.push({
                updateTextStyle: {
                  range: { startIndex: textStart, endIndex: textEnd },
                  textStyle: { underline: true },
                  fields: 'underline'
                }
              });
            }
            if (c.styles?.strike) {
              requests.push({
                updateTextStyle: {
                  range: { startIndex: textStart, endIndex: textEnd },
                  textStyle: { strikethrough: true },
                  fields: 'strikethrough'
                }
              });
            }
          });
        }

        // Apply block styling
        switch (block.type) {
          case 'heading': {
            const level = block.props?.level || 1;
            requests.push({
              updateParagraphStyle: {
                range: { startIndex: currentIndex, endIndex },
                paragraphStyle: {
                  namedStyleType: `HEADING_${level}`
                },
                fields: 'namedStyleType'
              }
            });
            break;
          }
          case 'bulletListItem':
            requests.push({
              createParagraphBullets: {
                range: { startIndex: currentIndex, endIndex },
                bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE'
              }
            });
            break;
          case 'numberedListItem':
            requests.push({
              createParagraphBullets: {
                range: { startIndex: currentIndex, endIndex },
                bulletPreset: 'NUMBERED_DECIMAL_ALPHA_ROMAN'
              }
            });
            break;
        }

        currentIndex = endIndex;
      });

      const updateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests
        })
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        console.error('Google Docs API Error:', errorData);
        throw new Error(errorData.error?.message || 'Failed to update Google Doc');
      }

      // Open the new document in a new tab
      window.open(`https://docs.google.com/document/d/${documentId}/edit`, '_blank');
    } catch (error) {
      console.error('Error in exportToGoogleDocs:', error);
      throw error;
    }
  };

  // Update the effect with proper type checking
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const updateActiveStyles = () => {
      const styles = editor.getActiveStyles();
      setActiveStyles({
        bold: !!styles.bold,
        italic: !!styles.italic,
        underline: !!styles.underline,
        strikethrough: !!styles.strike
      });
    };

    // Update on selection change
    editor.onSelectionChange(() => {
      updateActiveStyles();
    });

    // Update on content change
    editor.onChange(() => {
      updateActiveStyles();
    });

    // Initial update
    updateActiveStyles();

    // No need to return cleanup as BlockNote handles this internally
  }, [editorRef.current]); // Only re-run if editor instance changes

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Note not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/notes')}
        >
          Back to Notes
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Pull to refresh indicator */}
      {isRefreshing && (
        <div className="absolute top-0 left-0 right-0 flex justify-center py-2 bg-background/80 backdrop-blur z-50">
          <Loader2Icon className="h-4 w-4 animate-spin" />
        </div>
      )}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        {/* Left Section: Back Button + Title */}
        <div className="flex-1 flex items-center gap-4 min-w-0">
          {/* Back button - Show on desktop, hide on mobile */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/notes')}
            className="hidden sm:flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            <span>Back</span>
          </Button>

          {/* Back button - Show on mobile only, positioned left of title */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/notes')}
            className="sm:hidden flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>

          <Input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              debouncedSaveTitle(e.target.value);
            }}
            className="text-xl sm:text-2xl font-semibold bg-transparent border-0 p-0 focus:outline-none focus-visible:ring-0 w-full truncate placeholder:text-muted-foreground/50 placeholder:font-normal"
            placeholder="Untitled"
          />
        </div>

        {/* Right Section: Status + Actions */}
        <div className="flex items-center gap-3">
          {/* Save Status */}
          <div className={cn(
            "hidden sm:flex items-center gap-2 text-sm",
            saveStatus === 'saving' && "text-muted-foreground",
            saveStatus === 'saved' && "text-green-500",
            saveStatus === 'error' && "text-destructive"
          )}>
            {saveStatus === 'saving' && <Loader2Icon className="h-3 w-3 animate-spin" />}
            {saveStatus === 'saved' && <CheckIcon className="h-3 w-3" />}
            {saveStatus === 'error' && <XIcon className="h-3 w-3" />}
            <span className="hidden md:inline">
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'saved' && 'All changes saved'}
              {saveStatus === 'error' && 'Error saving'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {/* Mobile Save Status - Shown inline on mobile */}
            <div className="sm:hidden">
              {saveStatus === 'saving' && (
                <Button variant="ghost" size="icon" className="pointer-events-none">
                  <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
                </Button>
              )}
              {saveStatus === 'saved' && (
                <Button variant="ghost" size="icon" className="pointer-events-none">
                  <CheckIcon className="h-4 w-4 text-green-500" />
                </Button>
              )}
              {saveStatus === 'error' && (
                <Button variant="ghost" size="icon" className="pointer-events-none">
                  <XIcon className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>

            <ShareDialog 
              note={note} 
              onShare={() => {
                toast({
                  title: "Note shared",
                  description: "The note has been shared successfully.",
                });
              }}
              onError={(error) => {
                toast({
                  title: "Error sharing note",
                  description: error,
                  variant: "destructive",
                });
              }}
            />
            
            {/* More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVerticalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => window.print()}>
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  Print
                </DropdownMenuItem>
                
                {/* Export Sub-menu */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Export as...
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => handleExport('markdown')}>
                      <FileTextIcon className="h-4 w-4 mr-2" />
                      Markdown (.md)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('txt')}>
                      <FileIcon className="h-4 w-4 mr-2" />
                      Plain Text (.txt)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('html')}>
                      <CodeIcon className="h-4 w-4 mr-2" />
                      HTML
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('docx')}>
                      <FileIcon className="h-4 w-4 mr-2" />
                      Word Document (.docx)
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleExport('googledoc')}
                      disabled={isExporting}
                    >
                      {isExporting ? (
                        <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileTextIcon className="h-4 w-4 mr-2" />
                      )}
                      Google Doc
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Desktop Toolbar - Show only on desktop */}
      <div className="hidden sm:flex items-center gap-1 p-2 overflow-x-auto bg-muted/50 border-b shrink-0">
        <Button 
          variant={activeStyles.bold ? "default" : "ghost"}
          size="sm" 
          className={cn(
            "shrink-0 transition-colors",
            activeStyles.bold && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              editor.focus();
              editor.toggleStyles({ bold: true });
            }
          }}
        >
          <BoldIcon className="h-4 w-4" />
        </Button>
        <Button 
          variant={activeStyles.italic ? "default" : "ghost"}
          size="sm" 
          className={cn(
            "shrink-0 transition-colors",
            activeStyles.italic && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              editor.focus();
              editor.toggleStyles({ italic: true });
            }
          }}
        >
          <ItalicIcon className="h-4 w-4" />
        </Button>
        <Button 
          variant={activeStyles.underline ? "default" : "ghost"}
          size="sm" 
          className={cn(
            "shrink-0 transition-colors",
            activeStyles.underline && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              editor.focus();
              editor.toggleStyles({ underline: true });
            }
          }}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        <Button 
          variant={activeStyles.strikethrough ? "default" : "ghost"}
          size="sm" 
          className={cn(
            "shrink-0 transition-colors",
            activeStyles.strikethrough && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              editor.focus();
              editor.toggleStyles({ strike: true });
            }
          }}
        >
          <StrikethroughIcon className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button 
          variant="ghost" 
          size="sm" 
          className="shrink-0"
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              editor.focus();
              editor.insertBlocks(
                [{ type: "heading", props: { level: 1 } }],
                editor.getTextCursorPosition().block,
                'after'
              );
            }
          }}
        >
          <Heading1Icon className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="shrink-0"
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              editor.focus();
              editor.insertBlocks(
                [{ type: "heading", props: { level: 2 } }],
                editor.getTextCursorPosition().block,
                'after'
              );
            }
          }}
        >
          <Heading2Icon className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="shrink-0"
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              editor.focus();
              editor.insertBlocks(
                [{ type: "heading", props: { level: 3 } }],
                editor.getTextCursorPosition().block,
                'after'
              );
            }
          }}
        >
          <Heading3Icon className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button 
          variant="ghost" 
          size="sm" 
          className="shrink-0"
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              editor.focus();
              editor.insertBlocks(
                [{ type: "bulletListItem" }],
                editor.getTextCursorPosition().block,
                'after'
              );
            }
          }}
        >
          <ListIcon className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="shrink-0"
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              editor.focus();
              editor.insertBlocks(
                [{ type: "checkListItem", props: { checked: false } }],
                editor.getTextCursorPosition().block,
                'after'
              );
            }
          }}
        >
          <CheckSquareIcon className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              editor.focus();
              editor.insertBlocks(
                [{ type: "codeBlock", props: {} }],
                editor.getTextCursorPosition().block,
                'after'
              );
            }
          }}
          className="shrink-0"
        >
          <CodeIcon className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => {
            const editorContainer = document.querySelector('.bn-editor');
            if (editorContainer) {
              editorContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="shrink-0"
        >
          <ArrowUpIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile Toolbar - Show only on mobile */}
      <div className="sm:hidden flex items-center gap-1 p-2 overflow-x-auto bg-muted/50 border-b shrink-0">
        <Button 
          variant={activeStyles.bold ? "default" : "ghost"}
          size="sm" 
          className={cn(
            "shrink-0 transition-colors",
            activeStyles.bold && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              editor.focus();
              editor.toggleStyles({ bold: true });
            }
          }}
        >
          <BoldIcon className="h-4 w-4" />
        </Button>
        <Button 
          variant={activeStyles.italic ? "default" : "ghost"}
          size="sm" 
          className={cn(
            "shrink-0 transition-colors",
            activeStyles.italic && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              editor.focus();
              editor.toggleStyles({ italic: true });
            }
          }}
        >
          <ItalicIcon className="h-4 w-4" />
        </Button>
        <Button 
          variant={activeStyles.underline ? "default" : "ghost"}
          size="sm" 
          className={cn(
            "shrink-0 transition-colors",
            activeStyles.underline && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              editor.focus();
              editor.toggleStyles({ underline: true });
            }
          }}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        <Button 
          variant={activeStyles.strikethrough ? "default" : "ghost"}
          size="sm" 
          className={cn(
            "shrink-0 transition-colors",
            activeStyles.strikethrough && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              editor.focus();
              editor.toggleStyles({ strike: true });
            }
          }}
        >
          <StrikethroughIcon className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-4 bg-border mx-1" />
        <Button 
          variant="ghost" 
          size="sm" 
          className="shrink-0"
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              editor.focus();
              editor.insertBlocks(
                [{ type: "heading", props: { level: 1 } }],
                editor.getTextCursorPosition().block,
                'after'
              );
            }
          }}
        >
          <Heading1Icon className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="shrink-0"
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              editor.focus();
              editor.insertBlocks(
                [{ type: "bulletListItem" }],
                editor.getTextCursorPosition().block,
                'after'
              );
            }
          }}
        >
          <ListIcon className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="shrink-0"
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              editor.focus();
              editor.insertBlocks(
                [{ type: "checkListItem", props: { checked: false } }],
                editor.getTextCursorPosition().block,
                'after'
              );
            }
          }}
        >
          <CheckSquareIcon className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => {
            const editorContainer = document.querySelector('.bn-editor');
            if (editorContainer) {
              editorContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="shrink-0"
        >
          <ArrowUpIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden min-h-[100dvh]">
        <Editor
          content={note.content}
          onChange={handleContentChange}
          editorRef={editorRef}
        />
      </div>

      {/* Mobile bottom toolbar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-center px-4 py-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const editor = editorRef.current;
                if (editor) {
                  editor.focus();
                  editor.insertBlocks(
                    [{ type: "heading", props: { level: 1 } }],
                    editor.getTextCursorPosition().block,
                    'after'
                  );
                }
              }}
              className="shrink-0"
            >
              <Heading1Icon className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const editor = editorRef.current;
                if (editor) {
                  editor.focus();
                  editor.insertBlocks(
                    [{ type: "heading", props: { level: 2 } }],
                    editor.getTextCursorPosition().block,
                    'after'
                  );
                }
              }}
              className="shrink-0"
            >
              <Heading2Icon className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const editor = editorRef.current;
                if (editor) {
                  editor.focus();
                  editor.insertBlocks(
                    [{ type: "heading", props: { level: 3 } }],
                    editor.getTextCursorPosition().block,
                    'after'
                  );
                }
              }}
              className="shrink-0"
            >
              <Heading3Icon className="h-4 w-4" />
            </Button>

            <div className="w-px h-4 bg-border mx-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const editor = editorRef.current;
                if (editor) {
                  editor.focus();
                  editor.insertBlocks(
                    [{ type: "codeBlock", props: {} }],
                    editor.getTextCursorPosition().block,
                    'after'
                  );
                }
              }}
              className="shrink-0"
            >
              <CodeIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Add padding to prevent content from being hidden behind the toolbar */}
      <div className="sm:hidden h-14" />

      {!isOnline && (
        <div className="absolute bottom-0 left-0 right-0 bg-yellow-500/10 text-yellow-500 text-xs py-0.5 text-center">
          <WifiOffIcon className="h-3 w-3 inline-block mr-1" />
          Offline - Changes will sync when connected
        </div>
      )}
    </div>
  );
} 