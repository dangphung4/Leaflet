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

interface ImportDialogProps {
  children: React.ReactNode;
  onImportComplete?: () => void;
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
    // Convert plain text to simple BlockNote format with paragraphs
    const blocks: PartialBlock[] = text
      .split(/\r?\n\r?\n/) // Split on empty lines
      .map(para => ({
        type: "paragraph",
        content: para.trim()
      }));
    return JSON.stringify(blocks);
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
      } else if (file.name.endsWith(".txt")) {
        // Handle text files
        const text = await file.text();
        content = convertTextToBlockNoteContent(text);
      } else {
        throw new Error("Unsupported file type. Please upload a .docx or .txt file.");
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
            Import a document from your computer. Supported formats: .docx, .txt
          </DialogDescription>
        </DialogHeader>

        <div className="grid w-full items-center gap-4">
          <div className="flex flex-col items-center justify-center gap-4 p-4 border-2 border-dashed rounded-lg">
            <FileIcon className="h-8 w-8 text-muted-foreground" />
            <Input
              type="file"
              accept=".docx,.txt"
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