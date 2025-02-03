import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FileIcon, FileTextIcon } from "lucide-react";
import mammoth from "mammoth";
import { useToast } from "@/hooks/use-toast";
import { db } from "../Database/db";
import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import * as pdfjsLib from 'pdfjs-dist';
import { useGoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { format } from 'date-fns';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface ImportDialogProps {
  children: React.ReactNode;
  onImportComplete?: () => void;
}

interface TextPosition {
  str: string;
  x: number;
  y: number;
  width: number;
}

interface GoogleDoc {
  id: string;
  name: string;
  modifiedTime: string;
}

interface GoogleDocsPickerProps {
  onSelect: (docId: string) => Promise<void>;
  onClose: () => void;
}

interface GoogleDocsParagraphElement {
  textRun?: {
    content?: string;
  };
}

/**
 * Asynchronously retrieves the content and title of a Google Document using the Google Docs API.
 *
 * @param {string} accessToken - The OAuth 2.0 access token for authenticating the request.
 * @param {string} docId - The unique identifier of the Google Document to fetch.
 *
 * @returns {Promise<{ content: string; title: string }>} A promise that resolves to an object containing
 * the document's content as plain text and its title. If the document is untitled, the title will be
 * set to 'Untitled Document'.
 *
 * @throws {Error} Throws an error if the document cannot be fetched or if no content is found in the document.
 *
 * @example
 * const accessToken = 'your_access_token';
 * const docId = 'your_document_id';
 *
 * getGoogleDocsContent(accessToken, docId)
 *   .then(doc => {
 *     console.log('Document Title:', doc.title);
 *     console.log('Document Content:', doc.content);
 *   })
 *   .catch(error => {
 *     console.error('Error:', error);
 *   });
 */
async function getGoogleDocsContent(accessToken: string, docId: string): Promise<{ content: string; title: string }> {
  try {
    const response = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch document');
    }

    const data = await response.json();
    if (!data.body?.content) {
      throw new Error('No content found in document');
    }

    // Convert Google Docs content to text format
    let content = '';
    for (const element of data.body.content) {
      if (element.paragraph?.elements) {
        const paragraphText = element.paragraph.elements
          .map((e: GoogleDocsParagraphElement) => e.textRun?.content || '')
          .join('');
        if (paragraphText.trim()) {
          content += paragraphText + '\n\n';
        }
      }
    }

    return {
      content: content.trim(),
      title: data.title || 'Untitled Document'
    };
  } catch (error) {
    console.error('Error fetching Google Doc:', error);
    throw error;
  }
}

/**
 * A dialog component for importing documents from Google Drive or local files.
 *
 * @param {Object} props - The properties for the ImportDialog component.
 * @param {React.ReactNode} props.children - The content to be displayed as the trigger for the dialog.
 * @param {Function} props.onImportComplete - Callback function to be called when the import is completed.
 *
 * @returns {JSX.Element} The rendered ImportDialog component.
 *
 * @example
 * <ImportDialog onImportComplete={() => console.log('Import completed!')}>
 *   <Button>Import Document</Button>
 * </ImportDialog>
 */
export function ImportDialog({ children, onImportComplete }: ImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [docs, setDocs] = useState<GoogleDoc[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [showGoogleDocs, setShowGoogleDocs] = useState(false);
  const { toast } = useToast();

  // Check for existing token on mount
  useEffect(() => {
    /**
     * Asynchronously checks for an existing Google token in the database.
     * If a token is found, it proceeds to load Google Docs using the retrieved token.
     *
     * @async
     * @function checkExistingToken
     * @returns {Promise<void>} A promise that resolves when the operation is complete.
     *
     * @throws {Error} Throws an error if there is an issue retrieving the token from the database.
     *
     * @example
     * // Example usage of checkExistingToken
     * checkExistingToken()
     *   .then(() => {
     *     console.log('Token checked and Google Docs loaded if token exists.');
     *   })
     *   .catch((error) => {
     *     console.error('Error checking token:', error);
     *   });
     */
    const checkExistingToken = async () => {
      const token = await db.getGoogleToken();
      if (token) {
        loadGoogleDocs(token);
      }
    };
    checkExistingToken();
  }, []);

  /**
   * Asynchronously loads Google Docs from the user's Google Drive.
   *
   * This function fetches documents of the MIME type 'application/vnd.google-apps.document'
   * from Google Drive using the provided access token. It updates the state to indicate
   * loading status and handles errors that may occur during the fetch operation.
   *
   * @param {string} accessToken - The OAuth 2.0 access token for authenticating the request.
   *
   * @throws {Error} Throws an error if the fetch operation fails or if the response is not ok.
   *
   * @returns {Promise<void>} A promise that resolves when the documents have been loaded and state updated.
   *
   * @example
   * const token = 'your_access_token_here';
   * loadGoogleDocs(token)
   *   .then(() => {
   *     console.log('Documents loaded successfully');
   *   })
   *   .catch((error) => {
   *     console.error('Error loading documents:', error);
   *   });
   */
  const loadGoogleDocs = async (accessToken: string) => {
    try {
      setIsLoadingDocs(true);
      const driveResponse = await fetch(
        'https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application/vnd.google-apps.document%27&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );

      if (!driveResponse.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await driveResponse.json();
      setDocs(data.files || []);
      setShowGoogleDocs(true);
    } catch (error) {
      console.error('Error listing docs:', error);
      toast({
        title: "Failed to load documents",
        description: "Could not fetch your Google Docs",
        variant: "destructive"
      });
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const login = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        // Save the token
        await db.saveGoogleToken(response.access_token, response.expires_in);
        // Load docs with the new token
        await loadGoogleDocs(response.access_token);
      } catch (error) {
        console.error('Error in Google login:', error);
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
    },
    scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents.readonly'
  });

  /**
   * Imports a Google Document by its ID and creates a note from its content.
   *
   * This asynchronous function retrieves the Google Document's content using a token,
   * converts the text into a block note format, and saves it to the database as a new note.
   * It handles token retrieval, user login if necessary, and displays success or error messages.
   *
   * @param {string} docId - The ID of the Google Document to import.
   * @returns {Promise<void>} - A promise that resolves when the import process is complete.
   *
   * @throws {Error} - Throws an error if the import process fails due to issues such as
   *                   invalid tokens or network errors.
   *
   * @example
   * handleGoogleDocsImport('12345abcde')
   *   .then(() => console.log('Import completed successfully'))
   *   .catch(err => console.error('Import failed:', err));
   *
   * @example
   * // If the token is invalid, the function will prompt the user to log in again.
   */
  const handleGoogleDocsImport = async (docId: string) => {
    try {
      setIsImporting(true);
      
      const token = await db.getGoogleToken();
      if (!token) {
        login();
        return;
      }

      const { content, title } = await getGoogleDocsContent(token, docId);
      const blocks = convertTextToBlockNoteContent(content);
      
      await db.createNote({
        title,
        content: blocks,
        type: "note",
      });
      
      toast({
        title: "Import successful",
        description: `Created note: ${title}`,
      });

      setIsOpen(false);
      onImportComplete?.();
    } catch (error) {
      console.error('Error importing Google Doc:', error);
      // If the error is due to an invalid token, try to login again
      if (error instanceof Error && error.message.includes('401')) {
        login();
      } else {
        toast({
          title: "Import failed",
          description: "Failed to import Google Doc",
          variant: "destructive"
        });
      }
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * Converts HTML content into BlockNote format.
   *
   * This asynchronous function creates a temporary BlockNote editor instance
   * to parse the provided HTML content and convert it into a structured BlockNote
   * format. The resulting blocks are then serialized into a JSON string.
   *
   * @param {string} htmlContent - The HTML content to be converted.
   * @returns {Promise<string>} A promise that resolves to a JSON string representing
   * the BlockNote format of the provided HTML content.
   *
   * @throws {Error} Throws an error if the HTML content cannot be parsed into
   * BlockNote blocks.
   *
   * @example
   * const html = '<h1>Hello World</h1>';
   * convertToBlockNoteContent(html).then(blockNoteJson => {
   *   console.log(blockNoteJson);
   * });
   */
  const convertToBlockNoteContent = async (htmlContent: string) => {
    // Create a temporary editor to convert HTML to BlockNote format
    const editor = BlockNoteEditor.create();
    const blocks = await editor.tryParseHTMLToBlocks(htmlContent);
    return JSON.stringify(blocks);
  };

  /**
   * Converts a plain text string into a BlockNote format, organizing the content into blocks
   * such as headings, paragraphs, and bullet list items based on specific formatting rules.
   *
   * The function processes the input text line by line, identifying section headers (all caps),
   * bullet points (starting with '•'), and indented text. It groups these elements into a structured
   * array of blocks that can be serialized into JSON format.
   *
   * @param {string} text - The input text to be converted into BlockNote format.
   * @returns {string} A JSON string representing the structured BlockNote content.
   *
   * @example
   * const inputText = "HEADER\n\n• Item 1\n• Item 2\n\nThis is a paragraph.";
   * const blockNoteContent = convertTextToBlockNoteContent(inputText);
   * console.log(blockNoteContent);
   *
   * @throws {Error} Throws an error if the input text is not a valid string.
   */
  const convertTextToBlockNoteContent = (text: string) => {
    // Convert text to BlockNote format with proper paragraphs
    const blocks: PartialBlock[] = [];
    const lines = text.split('\n');
    let currentList: PartialBlock[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        if (currentList.length > 0) {
          blocks.push(...currentList);
          currentList = [];
        }
        continue;
      }

      // Check for section headers (all caps)
      if (/^[A-Z][A-Z\s\d&:,.()-]+$/.test(line) && line.length < 100) {
        if (currentList.length > 0) {
          blocks.push(...currentList);
          currentList = [];
        }
        blocks.push({
          type: "heading",
          props: { level: 1 },
          content: [{ type: "text", text: line, styles: {} }]
        } as PartialBlock);
        continue;
      }

      // Check for bullet points or indented text
      if (line.startsWith('•') || lines[i].startsWith('    ')) {
        currentList.push({
          type: "bulletListItem",
          content: [{
            type: "text",
            text: line.replace(/^[•\s]+/, '').trim(),
            styles: {}
          }]
        } as PartialBlock);
      } else {
        if (currentList.length > 0) {
          blocks.push(...currentList);
          currentList = [];
        }
        blocks.push({
          type: "paragraph",
          content: [{ type: "text", text: line, styles: {} }]
        } as PartialBlock);
      }
    }

    // Add any remaining list items
    if (currentList.length > 0) {
      blocks.push(...currentList);
    }

    return JSON.stringify(blocks);
  };

  /**
   * Asynchronously extracts text from a PDF document represented as an ArrayBuffer.
   *
   * This function utilizes the pdfjsLib library to load the PDF document and processes each page
   * to extract text while preserving formatting such as bullet points and indentation. The extracted
   * text is returned as a single string.
   *
   * @param {ArrayBuffer} arrayBuffer - The ArrayBuffer containing the PDF data.
   * @returns {Promise<string>} A promise that resolves to the extracted text from the PDF.
   *
   * @throws {Error} Throws an error if the text extraction fails due to issues with the PDF document.
   *
   * @example
   * const pdfData = await fetch('path/to/pdf').then(res => res.arrayBuffer());
   * try {
   *   const text = await extractTextFromPDF(pdfData);
   *   console.log(text);
   * } catch (error) {
   *   console.error(error.message);
   * }
   */
  const extractTextFromPDF = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let extractedText = '';
      
      toast({
        title: "Processing PDF",
        description: `Extracting text from ${pdf.numPages} pages...`,
      });

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        
        // Group text items by their vertical position
        const lines: { [key: number]: TextPosition[] } = {};
        
        // First pass: collect all text items and their positions
        for (const item of content.items) {
          if (!('str' in item) || typeof item.str !== 'string') continue;
          
          const [, , , , x, y] = item.transform ?? [0, 0, 0, 0, 0, 0];
          const roundedY = Math.round(y); // Round y to group nearby items
          
          if (!lines[roundedY]) {
            lines[roundedY] = [];
          }
          
          lines[roundedY].push({
            str: item.str,
            x: x,
            y: roundedY,
            width: item.width ?? 0
          });
        }

        // Sort lines by y position (top to bottom)
        const sortedYPositions = Object.keys(lines)
          .map(Number)
          .sort((a, b) => b - a);

        let lastY = null;
        let isInBulletList = false;
        
        // Process each line
        for (const y of sortedYPositions) {
          // Sort items in line by x position (left to right)
          const lineItems = lines[y].sort((a, b) => a.x - b.x);
          
          // Check if this line starts with a bullet point or is indented
          const firstItem = lineItems[0];
          const isIndented = firstItem && firstItem.x > 50;
          const startsWithBullet = firstItem && firstItem.str.trim().startsWith('•');
          
          // Detect section breaks and formatting
          if (lastY !== null) {
            const gap = Math.abs(lastY - y);
            
            // Large vertical gap indicates section break
            if (gap > 20) {
              extractedText += '\n\n';
              isInBulletList = false;
            } 
            // New bullet point or continuation of indented text
            else if ((isIndented || startsWithBullet) && gap > 5) {
              if (!isInBulletList) {
                extractedText += '\n';
              }
              extractedText += '\n';
              isInBulletList = true;
            }
            // Normal line break
            else if (gap > 5) {
              extractedText += '\n';
              isInBulletList = false;
            }
          }
          
          // Add indentation for bullet points and indented lines
          if (isIndented && !startsWithBullet) {
            extractedText += '    '; // Add indentation
          }
          
          // Combine items in the line with appropriate spacing
          const lineText = lineItems.reduce((text, item, index) => {
            const nextItem = lineItems[index + 1];
            // Add space if there's a significant gap between items
            const space = nextItem && (nextItem.x - (item.x + item.width)) > 5 ? ' ' : '';
            return text + item.str + space;
          }, '');
          
          extractedText += lineText;
          lastY = y;
        }
        
        // Add extra newline between pages
        extractedText += '\n\n';
      }
      
      // Clean up the text while preserving intentional formatting
      return extractedText
        .replace(/\n{4,}/g, '\n\n\n') // Normalize multiple line breaks but keep some for sections
        .replace(/[ \t]+$/gm, '') // Remove trailing spaces from lines
        .replace(/^[ \t]+/gm, match => match.length > 4 ? '    ' : match) // Normalize leading spaces
        .replace(/([^.!?])\n\n(?=[a-z])/g, '$1\n') // Remove extra breaks between continued sentences
        .replace(/•\s*/g, '• ') // Normalize bullet point spacing
        .trim();
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error('Failed to extract text from PDF');
    }
  };

  /**
   * Handles the file upload event and processes the uploaded file.
   * Supports .docx, .pdf, and .txt file formats.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} event - The change event triggered by the file input.
   * @returns {Promise<void>} A promise that resolves when the file has been processed and the note created.
   *
   * @throws {Error} Throws an error if the uploaded file type is unsupported.
   *
   * @example
   * // Usage in a React component
   * <input type="file" onChange={handleFileUpload} />
   *
   * @async
   */
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const title = file.name.replace(/\.[^/.]+$/, ""); // Remove file extension
      let content = "";

      if (file.name.endsWith(".docx")) {
        // Handle Word documents
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        content = await convertToBlockNoteContent(result.value);
      } else if (file.name.endsWith(".pdf")) {
        // Handle PDF files
        const arrayBuffer = await file.arrayBuffer();
        const extractedText = await extractTextFromPDF(arrayBuffer);
        content = convertTextToBlockNoteContent(extractedText);
      } else if (file.name.endsWith(".txt")) {
        // Handle text files
        const text = await file.text();
        content = convertTextToBlockNoteContent(text);
      } else {
        throw new Error("Unsupported file type. Please upload a .docx, .pdf, or .txt file.");
      }

      // Create new note
      await db.createNote({
        title,
        content,
        type: "note",
      });

      toast({
        title: "Import successful",
        description: `Created new note: ${title}`,
      });

      setIsOpen(false);
      onImportComplete?.();
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import document",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        setShowGoogleDocs(false);
        setDocs([]);
      }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {showGoogleDocs ? (
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  className="p-0 h-auto" 
                  onClick={() => setShowGoogleDocs(false)}
                >
                  ←
                </Button>
                <span className="flex items-center gap-2">
                  <FileTextIcon className="h-5 w-5" />
                  Select Google Doc
                </span>
              </div>
            ) : (
              "Import Document"
            )}
          </DialogTitle>
          <DialogDescription>
            {showGoogleDocs 
              ? "Choose a document to import from your Google Drive"
              : "Import a document from your computer or Google Docs"}
          </DialogDescription>
        </DialogHeader>

        {showGoogleDocs ? (
          <div className="flex-1 min-h-0">
            {isLoadingDocs ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8">
                <Spinner size="large" />
                <p className="text-sm text-muted-foreground">Loading your documents...</p>
              </div>
            ) : docs.length > 0 ? (
              <ScrollArea className="h-[400px] rounded-md border p-2">
                <div className="space-y-1">
                  {docs.map((doc) => (
                    <Button
                      key={doc.id}
                      variant="ghost"
                      className="w-full justify-start px-2 py-4 h-auto"
                      onClick={() => handleGoogleDocsImport(doc.id)}
                      disabled={isImporting}
                    >
                      <div className="flex items-start gap-3">
                        <FileTextIcon className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0 text-left">
                          <div className="font-medium mb-1 truncate">{doc.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Modified {format(new Date(doc.modifiedTime), 'MMM d, yyyy h:mm a')}
                          </div>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <FileTextIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <h3 className="font-medium mb-1">No documents found</h3>
                  <p className="text-sm text-muted-foreground">
                    No Google Docs were found in your account
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col items-center justify-center gap-4 p-4 border-2 border-dashed rounded-lg">
              <FileIcon className="h-8 w-8 text-muted-foreground" />
              <Input
                type="file"
                accept=".docx,.pdf,.txt"
                onChange={handleFileUpload}
                disabled={isImporting}
                className="max-w-xs"
              />
            </div>
            
            <div className="flex items-center">
              <div className="flex-grow border-t border-gray-200" />
              <span className="px-4 text-gray-500 text-sm">OR</span>
              <div className="flex-grow border-t border-gray-200" />
            </div>

            <Button
              variant="outline"
              onClick={() => login()}
              disabled={isImporting || isLoadingDocs}
              className="w-full"
            >
              <FileTextIcon className="mr-2 h-4 w-4" />
              Import from Google Docs
            </Button>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <Button 
            variant="outline" 
            onClick={() => {
              setIsOpen(false);
              setShowGoogleDocs(false);
              setDocs([]);
            }}
          >
            Cancel
          </Button>
          {isImporting && (
            <div className="flex items-center gap-2">
              <Spinner size="small" />
              <span className="text-sm">Importing...</span>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A component that allows users to select Google Docs from their Google Drive.
 * It handles user authentication and fetches the list of documents available in the user's drive.
 *
 * @param {Object} params - The parameters for the component.
 * @param {Function} params.onSelect - Callback function that is called when a document is selected.
 * @param {Function} params.onClose - Callback function that is called when the dialog is closed.
 *
 * @returns {JSX.Element} The rendered component.
 *
 * @throws {Error} Throws an error if the document fetching fails or if Google login fails.
 *
 * @example
 * const handleSelect = (docId) => {
 *   console.log('Selected document ID:', docId);
 * };
 *
 * const handleClose = () => {
 *   console.log('Dialog closed');
 * };
 *
 * <GoogleDocsPicker onSelect={handleSelect} onClose={handleClose} />
 */
export function GoogleDocsPicker({ onSelect, onClose }: GoogleDocsPickerProps) {
  const [docs, setDocs] = useState<GoogleDoc[]>([]);
  const [loading, setLoading] = useState(false);

  const login = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        setLoading(true);
        
        const driveResponse = await fetch('https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application/vnd.google-apps.document%27&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc', {
          headers: {
            'Authorization': `Bearer ${response.access_token}`,
          }
        });

        if (!driveResponse.ok) {
          throw new Error('Failed to fetch documents');
        }

        const data = await driveResponse.json();
        setDocs(data.files || []);
      } catch (error) {
        console.error('Error listing docs:', error);
        toast.error('Failed to load Google Docs');
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      console.error('Google login failed:', error);
      toast.error('Google login failed');
    },
    scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents.readonly',
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileTextIcon className="h-5 w-5" />
            Select Google Doc
          </DialogTitle>
          <DialogDescription>
            Choose a document to import from your Google Drive
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <Spinner size="large" />
              <p className="text-sm text-muted-foreground">Loading your documents...</p>
            </div>
          ) : docs.length > 0 ? (
            <ScrollArea className="h-[400px] rounded-md border p-2">
              <div className="space-y-1">
                {docs.map((doc) => (
                  <Button
                    key={doc.id}
                    variant="ghost"
                    className="w-full justify-start px-2 py-4 h-auto"
                    onClick={() => onSelect(doc.id)}
                  >
                    <div className="flex items-start gap-3">
                      <FileTextIcon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="font-medium mb-1 truncate">{doc.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Modified {format(new Date(doc.modifiedTime), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <FileTextIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h3 className="font-medium mb-1">No documents found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Sign in with Google to access your documents
                </p>
                <Button onClick={() => login()} className="gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Sign in with Google
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 