import { useState } from "react";
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
import { FileIcon } from "lucide-react";
import mammoth from "mammoth";
import { useToast } from "@/hooks/use-toast";
import { db } from "../Database/db";
import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import * as pdfjsLib from 'pdfjs-dist';

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

export function ImportDialog({ children, onImportComplete }: ImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const convertToBlockNoteContent = async (htmlContent: string) => {
    // Create a temporary editor to convert HTML to BlockNote format
    const editor = BlockNoteEditor.create();
    const blocks = await editor.tryParseHTMLToBlocks(htmlContent);
    return JSON.stringify(blocks);
  };

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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Document</DialogTitle>
          <DialogDescription>
            Import a document from your computer. Supported formats: .docx, .pdf, .txt
          </DialogDescription>
        </DialogHeader>

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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 