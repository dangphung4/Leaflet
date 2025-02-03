import { useState, useEffect, useMemo } from 'react';
import { Folder, Note } from '../Database/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  PlusIcon, 
  ChevronRightIcon, 
  MagnifyingGlassIcon, 
  Cross2Icon, 
  HamburgerMenuIcon,
  StarIcon
} from '@radix-ui/react-icons';
import { 
  ListBulletIcon as ListIcon,
  Squares2X2Icon as LayoutGridIcon,
  ClockIcon,
  DocumentTextIcon as FileTextIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  HashtagIcon as TextIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../Auth/AuthContext';
import { db } from '../Database/db';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { FolderIcon, TrashIcon, PencilIcon, ChevronLeftIcon } from 'lucide-react';
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { formatTimeAgo } from '../utils/noteUtils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface FolderData extends Folder {
  isFavorite: boolean;
}

interface FolderNode extends FolderData {
  children: FolderNode[];
  isExpanded?: boolean;
}

interface BlockNoteContent {
  type: string;
  content?: Array<{ type: string; text?: string }>;
  text?: string;
  children?: BlockNoteContent[];
}

const getBlockNoteContent = (jsonString: string): string => {
  try {
    const blocks = JSON.parse(jsonString) as BlockNoteContent | BlockNoteContent[];
    let text = '';
    
    const extractText = (block: BlockNoteContent) => {
      // Check if block has content array
      if (Array.isArray(block.content)) {
        block.content.forEach((item) => {
          if (item.type === 'text') {
            text += item.text || '';
          }
        });
      } else if (block.text) {
        // Some blocks might have direct text property
        text += block.text;
      }
      
      // Add newline after certain block types
      if (['paragraph', 'bulletListItem', 'numberedListItem', 'checkListItem'].includes(block.type)) {
        text += '\n';
      }

      // Process children recursively
      if (Array.isArray(block.children)) {
        block.children.forEach(extractText);
      }
    };

    // Handle if blocks is not an array (single block)
    if (!Array.isArray(blocks)) {
      extractText(blocks);
    } else {
      blocks.forEach(extractText);
    }

    return text.trim();
  } catch (error) {
    console.error('Error parsing BlockNote content:', error);
    return '';
  }
};

/**
 * Renders a folder tree item with its associated notes and subfolders.
 *
 * @param {Object} props - The properties for the folder tree item.
 * @param {FolderNode} props.folder - The folder data to display.
 * @param {number} [props.level=0] - The indentation level of the folder.
 * @param {function} props.onToggle - Callback function to toggle the folder's expanded state.
 * @param {function} props.onEdit - Callback function to edit the folder.
 * @param {function} props.onDelete - Callback function to delete the folder.
 * @param {function} props.onCreateSubfolder - Callback function to create a new subfolder.
 * @param {function} props.onToggleFavorite - Callback function to toggle the folder's favorite status.
 * @param {Note[]} props.notes - An array of notes associated with the folder.
 * @param {boolean} [props.isCompact=false] - Flag to render in compact mode.
 *
 * @returns {JSX.Element} The rendered folder tree item component.
 *
 * @example
 * <FolderTreeItem
 *   folder={folderData}
 *   level={1}
 *   onToggle={handleToggle}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 *   onCreateSubfolder={handleCreateSubfolder}
 *   onToggleFavorite={handleToggleFavorite}
 *   notes={notesArray}
 * />
 */
const FolderTreeItem = ({ 
  folder, 
  level = 0,
  onToggle,
  onEdit,
  onDelete,
  onCreateSubfolder,
  onToggleFavorite,
  notes,
  isCompact = false
}: { 
  folder: FolderNode;
  level?: number;
  onToggle: (folderId: string) => void;
  onEdit: (folder: FolderNode) => void;
  onDelete: (folderId: string) => void;
  onCreateSubfolder: (folder: FolderNode) => void;
  onToggleFavorite: (folderId: string) => void;
  notes: Note[];
  isCompact?: boolean;
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const folderNotes = notes.filter(note => note.folderId === folder.id);
  const [showInfo, setShowInfo] = useState(false);
  const hasContent = folder.children.length > 0 || folderNotes.length > 0;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-2 py-2 px-3 hover:bg-muted/50 active:bg-muted rounded-lg cursor-pointer relative transition-all",
          level > 0 && "ml-4 sm:ml-6",
          folder.isExpanded && "bg-muted/50"
        )}
        onClick={(e) => {
          e.stopPropagation();
          if (hasContent) {
            onToggle(folder.id);
          }
        }}
      >
        {/* Expand/Collapse Button */}
        <div className="h-6 w-6 shrink-0 flex items-center justify-center">
          <ChevronRightIcon 
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              folder.isExpanded && "rotate-90",
              !hasContent && "opacity-0"
            )}
          />
        </div>
        
        <div 
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: folder.color + '20' }}
        >
          <FolderIcon className="h-4 w-4" style={{ color: folder.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{folder.name}</span>
            {!isCompact && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {folderNotes.length > 0 && (
                  <Badge variant="secondary" className="h-5 text-xs">
                    {folderNotes.length} {folderNotes.length === 1 ? 'note' : 'notes'}
                  </Badge>
                )}
                {folder.children.length > 0 && (
                  <Badge variant="secondary" className="h-5 text-xs">
                    {folder.children.length} {folder.children.length === 1 ? 'folder' : 'folders'}
                  </Badge>
                )}
              </div>
            )}
          </div>
          {!isCompact && folder.updatedAt && (
            <div className="text-xs text-muted-foreground mt-0.5">
              Updated {formatTimeAgo(folder.updatedAt)}
            </div>
          )}
        </div>

        {/* Actions Menu */}
        {folder.ownerUserId === user?.uid && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 rounded-full",
                folder.isFavorite ? "text-yellow-500" : "opacity-0 group-hover:opacity-100"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(folder.id);
              }}
            >
              <StarIcon className="h-4 w-4" fill={folder.isFavorite ? "currentColor" : "none"} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <HamburgerMenuIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  navigate('/notes/new', { state: { folderId: folder.id } });
                }}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  New Note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onCreateSubfolder(folder);
                }}>
                  <FolderIcon className="h-4 w-4 mr-2" />
                  New Subfolder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onEdit(folder);
                }}>
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  setShowInfo(true);
                }}>
                  <FolderIcon className="h-4 w-4 mr-2" />
                  Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(folder.id);
                  }}
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {folder.isExpanded && (
        <div>
          {/* Notes in this folder */}
          {folderNotes.length > 0 && (
            <div className="ml-12 space-y-1 mt-1">
              {folderNotes.map(note => (
                <div
                  key={`note-${folder.id}-${note.firebaseId}`}
                  className="flex flex-col gap-1 py-2 px-3 hover:bg-muted/50 active:bg-muted rounded-lg cursor-pointer text-sm group"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/notes/${note.firebaseId}`);
                  }}
                >
                  <div className="flex items-center gap-2">
                    {note.type === 'folder' ? (
                      <FolderIcon className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {note.title || 'Untitled'}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTimeAgo(note.updatedAt)}
                    </div>
                  </div>
                  {note.content && (
                    <div className="ml-6 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {getBlockNoteContent(note.content)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Subfolders */}
          {folder.children.map(childFolder => (
            <FolderTreeItem
              key={`folder-${childFolder.id}`}
              folder={childFolder}
              level={level + 1}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreateSubfolder={onCreateSubfolder}
              onToggleFavorite={onToggleFavorite}
              notes={notes}
              isCompact={isCompact}
            />
          ))}
        </div>
      )}

      {/* Enhanced Folder Info Sheet with Statistics */}
      <Sheet open={showInfo} onOpenChange={setShowInfo}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: folder.color + '20' }}
              >
                <FolderIcon className="h-5 w-5" style={{ color: folder.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate">{folder.name}</span>
                  {folder.isFavorite && (
                    <StarIcon className="h-4 w-4 text-yellow-500" fill="currentColor" />
                  )}
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
            <div className="space-y-6 pb-8">
              {/* Statistics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{folderNotes.length}</div>
                  <div className="text-xs text-muted-foreground">Notes</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{folder.children.length}</div>
                  <div className="text-xs text-muted-foreground">Subfolders</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {folderNotes.reduce((acc, note) => {
                      try {
                        const content = JSON.parse(note.content || '[]');
                        return acc + content.length;
                      } catch {
                        return acc;
                      }
                    }, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Blocks</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {folderNotes.filter(note => 
                      new Date(note.updatedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
                    ).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Updated This Week</div>
                </div>
              </div>

              {/* Activity Chart */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Activity</h4>
                <div className="grid grid-cols-7 gap-1">
                  {[...Array(7)].map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const count = folderNotes.filter(note => 
                      new Date(note.updatedAt).toDateString() === date.toDateString()
                    ).length;
                    return (
                      <div key={i} className="space-y-1">
                        <div 
                          className={cn(
                            "h-8 rounded-sm",
                            count === 0 ? "bg-muted" : "bg-primary",
                            count > 0 && "opacity-" + Math.min(count * 20, 100)
                          )}
                          title={`${count} updates on ${date.toLocaleDateString()}`}
                        />
                        <div className="text-[10px] text-muted-foreground text-center">
                          {date.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Notes */}
              {folderNotes.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Recent Notes</h4>
                  <div className="space-y-2">
                    {folderNotes
                      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
                      .slice(0, 5)
                      .map(note => (
                        <div
                          key={`sheet-note-${folder.id}-${note.firebaseId}`}
                          className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            setShowInfo(false);
                            navigate(`/notes/${note.firebaseId}`);
                          }}
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                              <FolderIcon className="h-4 w-4 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {note.title || 'Untitled'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Updated {formatTimeAgo(note.updatedAt)}
                                </div>
                              </div>
                            </div>
                            {note.content && (
                              <div className="ml-7 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {getBlockNoteContent(note.content)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Details Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{formatTimeAgo(folder.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last updated</span>
                    <span>{formatTimeAgo(folder.updatedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Owner</span>
                    <span>{folder.ownerDisplayName}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {folder.ownerUserId === user?.uid && (
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setShowInfo(false);
                      onEdit(folder);
                    }}
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Rename Folder
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => onToggleFavorite(folder.id)}
                  >
                    <StarIcon className="h-4 w-4 mr-2" fill={folder.isFavorite ? "currentColor" : "none"} />
                    {folder.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full justify-start"
                    onClick={() => {
                      setShowInfo(false);
                      onDelete(folder.id);
                    }}
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete Folder
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};

const FolderSkeleton = ({ level = 0 }: { level?: number }) => (
  <div className={cn("py-2 px-3", level > 0 && "ml-6")}>
    <div className="flex items-center gap-2">
      <Skeleton className="h-6 w-6 rounded-full" />
      <Skeleton className="h-6 w-6 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  </div>
);

// Add helper function to find folder in tree structure
const findFolderInTree = (folders: FolderNode[], folderId: string): FolderNode | undefined => {
  for (const folder of folders) {
    if (folder.id === folderId) {
      return folder;
    }
    if (folder.children.length > 0) {
      const found = findFolderInTree(folder.children, folderId);
      if (found) return found;
    }
  }
  return undefined;
};

/**
 * A functional component that represents a folder item in a grid view.
 * It displays the folder's name, notes, and provides options to manage the folder.
 *
 * @param {Object} props - The properties for the component.
 * @param {FolderNode} props.folder - The folder object containing details such as id, name, color, and children.
 * @param {Note[]} props.notes - An array of notes associated with the folder.
 * @param {function(string): void} props.onToggle - Callback function to toggle the folder's expanded state.
 * @param {function(string): void} props.onToggleFavorite - Callback function to toggle the folder's favorite status.
 * @param {function(FolderNode): void} props.onEdit - Callback function to edit the folder.
 * @param {function(string): void} props.onDelete - Callback function to delete the folder.
 * @param {function(FolderNode): void} props.onCreateSubfolder - Callback function to create a new subfolder within the folder.
 *
 * @returns {JSX.Element} The rendered folder item component.
 *
 * @example
 * <GridFolderItem
 *   folder={folder}
 *   notes={notes}
 *   onToggle={handleToggle}
 *   onToggleFavorite={handleToggleFavorite}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 *   onCreateSubfolder={handleCreateSubfolder}
 * />
 *
 * @throws {Error} Throws an error if the folder data is invalid or missing required properties.
 */
const GridFolderItem = ({ folder, notes, onToggle, onToggleFavorite, onEdit, onDelete, onCreateSubfolder }: {
  folder: FolderNode;
  notes: Note[];
  onToggle: (folderId: string) => void;
  onToggleFavorite: (folderId: string) => void;
  onEdit: (folder: FolderNode) => void;
  onDelete: (folderId: string) => void;
  onCreateSubfolder: (folder: FolderNode) => void;
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const folderNotes = notes.filter(note => note.folderId === folder.id);
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div
      className="group relative p-4 border rounded-lg hover:bg-muted/50 transition-colors flex flex-col"
    >
      <div className="flex items-start gap-3">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: folder.color + '20' }}
        >
          <FolderIcon className="h-6 w-6" style={{ color: folder.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div 
              className="flex-1 font-medium truncate cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(folder.id);
              }}
            >
              {folder.name}
            </div>
            {folder.ownerUserId === user?.uid && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7 rounded-full",
                    folder.isFavorite ? "text-yellow-500" : "opacity-0 group-hover:opacity-100"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(folder.id);
                  }}
                >
                  <StarIcon className="h-4 w-4" fill={folder.isFavorite ? "currentColor" : "none"} />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <HamburgerMenuIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate('/notes/new', { state: { folderId: folder.id } })}>
                      <PlusIcon className="h-4 w-4 mr-2" />
                      New Note
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCreateSubfolder(folder)}>
                      <FolderIcon className="h-4 w-4 mr-2" />
                      New Subfolder
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(folder)}>
                      <PencilIcon className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowInfo(true)}>
                      <FolderIcon className="h-4 w-4 mr-2" />
                      Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDelete(folder.id)}
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="text-sm text-muted-foreground">
              {folderNotes.length} notes
            </div>
            {folder.children.length > 0 && (
              <>
                <span className="text-muted-foreground">•</span>
                <div className="text-sm text-muted-foreground">
                  {folder.children.length} {folder.children.length === 1 ? 'subfolder' : 'subfolders'}
                </div>
              </>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Updated {formatTimeAgo(folder.updatedAt)}
          </div>
        </div>
      </div>
      {folder.isExpanded && (
        <div className="mt-4 space-y-4 border-t pt-4">
          {folder.children.length > 0 && (
            <div className="space-y-2">
              {folder.children.map(childFolder => (
                <GridFolderItem
                  key={childFolder.id}
                  folder={childFolder}
                  notes={notes}
                  onToggle={onToggle}
                  onToggleFavorite={onToggleFavorite}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onCreateSubfolder={onCreateSubfolder}
                />
              ))}
            </div>
          )}
          {folderNotes.length > 0 && (
            <div className="space-y-2">
              {folderNotes.map(note => (
                <div
                  key={`grid-note-${folder.id}-${note.firebaseId}`}
                  className="flex items-start gap-2 p-2 hover:bg-muted/50 rounded-lg cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/notes/${note.firebaseId}`);
                  }}
                >
                  <FileTextIcon className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {note.title || 'Untitled'}
                    </div>
                    {note.content && (
                      <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {getBlockNoteContent(note.content)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Folder Info Sheet */}
      <Sheet open={showInfo} onOpenChange={setShowInfo}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: folder.color + '20' }}
              >
                <FolderIcon className="h-5 w-5" style={{ color: folder.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate">{folder.name}</span>
                  {folder.isFavorite && (
                    <StarIcon className="h-4 w-4 text-yellow-500" fill="currentColor" />
                  )}
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
            <div className="space-y-6 pb-8">
              {/* Statistics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{folderNotes.length}</div>
                  <div className="text-xs text-muted-foreground">Notes</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{folder.children.length}</div>
                  <div className="text-xs text-muted-foreground">Subfolders</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {folderNotes.reduce((acc, note) => {
                      try {
                        const content = JSON.parse(note.content || '[]');
                        return acc + content.length;
                      } catch {
                        return acc;
                      }
                    }, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Blocks</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {folderNotes.filter(note => 
                      new Date(note.updatedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
                    ).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Updated This Week</div>
                </div>
              </div>

              {/* Activity Chart */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Activity</h4>
                <div className="grid grid-cols-7 gap-1">
                  {[...Array(7)].map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const count = folderNotes.filter(note => 
                      new Date(note.updatedAt).toDateString() === date.toDateString()
                    ).length;
                    return (
                      <div key={i} className="space-y-1">
                        <div 
                          className={cn(
                            "h-8 rounded-sm",
                            count === 0 ? "bg-muted" : "bg-primary",
                            count > 0 && "opacity-" + Math.min(count * 20, 100)
                          )}
                          title={`${count} updates on ${date.toLocaleDateString()}`}
                        />
                        <div className="text-[10px] text-muted-foreground text-center">
                          {date.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Notes */}
              {folderNotes.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Recent Notes</h4>
                  <div className="space-y-2">
                    {folderNotes
                      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
                      .slice(0, 5)
                      .map(note => (
                        <div
                          key={`sheet-note-${folder.id}-${note.firebaseId}`}
                          className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            setShowInfo(false);
                            navigate(`/notes/${note.firebaseId}`);
                          }}
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                              <FolderIcon className="h-4 w-4 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {note.title || 'Untitled'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Updated {formatTimeAgo(note.updatedAt)}
                                </div>
                              </div>
                            </div>
                            {note.content && (
                              <div className="ml-7 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {getBlockNoteContent(note.content)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Details Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{formatTimeAgo(folder.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last updated</span>
                    <span>{formatTimeAgo(folder.updatedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Owner</span>
                    <span>{folder.ownerDisplayName}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {folder.ownerUserId === user?.uid && (
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setShowInfo(false);
                      onEdit(folder);
                    }}
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Rename Folder
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => onToggleFavorite(folder.id)}
                  >
                    <StarIcon className="h-4 w-4 mr-2" fill={folder.isFavorite ? "currentColor" : "none"} />
                    {folder.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full justify-start"
                    onClick={() => {
                      setShowInfo(false);
                      onDelete(folder.id);
                    }}
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete Folder
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};

// Add new floating action bar component
const FloatingActionBar = ({ 
  viewMode,
  setViewMode,
  sortOption,
  setSortOption,
  sortDirection,
  setSortDirection,
  onNewFolder,
  onNewNote
}: {
  viewMode: 'list' | 'grid';
  setViewMode: (mode: 'list' | 'grid') => void;
  sortOption: 'name' | 'updated' | 'created' | 'notes';
  setSortOption: (option: 'name' | 'updated' | 'created' | 'notes') => void;
  sortDirection: 'asc' | 'desc';
  setSortDirection: (direction: 'asc' | 'desc') => void;
  onNewFolder: () => void;
  onNewNote: () => void;
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-full shadow-lg z-50">
      <div className="flex items-center border-r pr-2">
        <Button
          variant="ghost"
          size="icon"
          className={cn("rounded-full", viewMode === 'list' && "bg-muted")}
          onClick={() => setViewMode('list')}
        >
          <ListIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("rounded-full", viewMode === 'grid' && "bg-muted")}
          onClick={() => setViewMode('grid')}
        >
          <LayoutGridIcon className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex items-center border-r pr-2">
        <Button
          variant="ghost"
          size="icon"
          className={cn("rounded-full", sortOption === 'name' && "bg-muted")}
          onClick={() => setSortOption('name')}
        >
          <TextIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("rounded-full", sortOption === 'updated' && "bg-muted")}
          onClick={() => setSortOption('updated')}
        >
          <ClockIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("rounded-full", sortOption === 'notes' && "bg-muted")}
          onClick={() => setSortOption('notes')}
        >
          <FileTextIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
        >
          {sortDirection === 'asc' ? (
            <ArrowUpIcon className="h-4 w-4" />
          ) : (
            <ArrowDownIcon className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="default"
          size="icon"
          className="rounded-full"
          onClick={onNewNote}
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={onNewFolder}
        >
          <FolderIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Add interface for stored preferences
interface StoredFoldersPreferences {
  viewMode: 'list' | 'grid';
  sortOption: 'name' | 'updated' | 'created' | 'notes';
  sortDirection: 'asc' | 'desc';
  expandedFolders: string[];
}

/**
 * A functional component that manages and displays a list of folders and notes.
 * It provides functionalities to create, edit, delete, and organize folders,
 * as well as to search and sort them based on user preferences.
 *
 * @component
 * @returns {JSX.Element} The rendered component containing folder management UI.
 *
 * @example
 * // Usage in a parent component
 * <Folders />
 */
export default function Folders() {
  const navigate = useNavigate();
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#4f46e5');
  const [selectedFolder, setSelectedFolder] = useState<FolderNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearch, setIsMobileSearch] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    const stored = localStorage.getItem('folders-preferences');
    if (stored) {
      const preferences = JSON.parse(stored) as StoredFoldersPreferences;
      return preferences.viewMode;
    }
    return 'list';
  });
  const [sortOption, setSortOption] = useState<'name' | 'updated' | 'created' | 'notes'>(() => {
    const stored = localStorage.getItem('folders-preferences');
    if (stored) {
      const preferences = JSON.parse(stored) as StoredFoldersPreferences;
      return preferences.sortOption;
    }
    return 'name';
  });
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    const stored = localStorage.getItem('folders-preferences');
    if (stored) {
      const preferences = JSON.parse(stored) as StoredFoldersPreferences;
      return preferences.sortDirection;
    }
    return 'asc';
  });
  const [expandedFolders, setExpandedFolders] = useState<string[]>(() => {
    const stored = localStorage.getItem('folders-preferences');
    if (stored) {
      const preferences = JSON.parse(stored) as StoredFoldersPreferences;
      return preferences.expandedFolders || [];
    }
    return [];
  });

  const sortFolders = (foldersToSort: FolderNode[]): FolderNode[] => {
    return foldersToSort.sort((a, b) => {
      let comparison = 0;
      
      // First sort by favorites
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      
      // Then sort by selected option
      switch (sortOption) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'updated':
          comparison = b.updatedAt.getTime() - a.updatedAt.getTime();
          break;
        case 'created':
          comparison = b.createdAt.getTime() - a.createdAt.getTime();
          break;
        case 'notes':
          comparison = notes.filter(note => note.folderId === b.id).length - 
                      notes.filter(note => note.folderId === a.id).length;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    }).map(folder => ({
      ...folder,
      children: sortFolders(folder.children)
    }));
  };

  /**
   * Asynchronously loads user folders and notes from the database,
   * constructs a hierarchical structure of folders, and updates the
   * application state with the retrieved data.
   *
   * This function performs the following steps:
   * 1. Fetches user folders and notes concurrently using Promise.all.
   * 2. Maps notes to their respective folder IDs.
   * 3. Constructs a tree structure of folders based on parent-child relationships.
   * 4. Updates the state with sorted folders and notes.
   *
   * @async
   * @function loadData
   * @throws {Error} Throws an error if there is an issue loading folders or notes.
   *
   * @example
   * // Call the loadData function to load and display user data
   * loadData().then(() => {
   *   console.log('Data loaded successfully');
   * }).catch((error) => {
   *   console.error('Failed to load data:', error);
   * });
   */
  const loadData = async () => {
    try {
      const [userFolders, userNotes] = await Promise.all([
        db.getFolders(),
        db.notes.toArray()
      ]);

      // Create a map of folder IDs to notes
      const folderNotesMap = new Map<string | undefined, Note[]>();
      userNotes.forEach(note => {
        const folderId = note.folderId;
        if (!folderNotesMap.has(folderId)) {
          folderNotesMap.set(folderId, []);
        }
        folderNotesMap.get(folderId)!.push(note);
      });

      // Convert flat structure to tree
      const folderMap = new Map<string, FolderNode>();
      const rootFolders: FolderNode[] = [];

      // First pass: Create all folder nodes
      userFolders.forEach(folder => {
        folderMap.set(folder.id, { 
          ...folder, 
          children: [],
          isExpanded: expandedFolders.includes(folder.id),
          isFavorite: folder.isFavorite || false
        });
      });

      // Second pass: Build the tree structure
      userFolders.forEach(folder => {
        const node = folderMap.get(folder.id)!;
        if (folder.parentId) {
          const parent = folderMap.get(folder.parentId);
          if (parent) {
            parent.children.push(node);
          } else {
            rootFolders.push(node);
          }
        } else {
          rootFolders.push(node);
        }
      });

      setFolders(sortFolders(rootFolders));
      setNotes(userNotes);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load folders and notes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Add effect to persist preferences including expanded folders
  useEffect(() => {
    const preferences: StoredFoldersPreferences = {
      viewMode,
      sortOption,
      sortDirection,
      expandedFolders,
    };
    localStorage.setItem('folders-preferences', JSON.stringify(preferences));
  }, [viewMode, sortOption, sortDirection, expandedFolders]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const isCurrentlyExpanded = prev.includes(folderId);
      const newExpandedFolders = isCurrentlyExpanded
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId];
      return newExpandedFolders;
    });

    const toggleNode = (nodes: FolderNode[]): FolderNode[] => {
      return nodes.map(node => {
        if (node.id === folderId) {
          return { ...node, isExpanded: !node.isExpanded };
        }
        if (node.children.length > 0) {
          return { ...node, children: toggleNode(node.children) };
        }
        return node;
      });
    };

    setFolders(toggleNode(folders));
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const folderData: Partial<Folder> = {
        name: newFolderName.trim(),
        color: newFolderColor,
        isFavorite: false,
      };

      if (selectedFolder?.id) {
        folderData.parentId = selectedFolder.id;
      }

      await db.createFolder(folderData);
      setNewFolderName('');
      setNewFolderColor('#4f46e5');
      setIsCreatingFolder(false);
      setSelectedFolder(null);
      await loadData(); // Reload data after creating folder
      toast({
        title: "Folder created",
        description: "Your new folder has been created successfully"
      });
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive"
      });
    }
  };

  const handleEditFolder = async () => {
    if (!selectedFolder || !newFolderName.trim()) return;

    try {
      await db.updateFolder(selectedFolder.id, {
        name: newFolderName.trim(),
        color: newFolderColor
      });
      setNewFolderName('');
      setNewFolderColor('#4f46e5');
      setIsEditingFolder(false);
      setSelectedFolder(null);
      await loadData(); // Reload data after editing folder
      toast({
        title: "Folder updated",
        description: "Your folder has been updated successfully"
      });
    } catch (error) {
      console.error('Error updating folder:', error);
      toast({
        title: "Error",
        description: "Failed to update folder",
        variant: "destructive"
      });
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await db.deleteFolder(folderId);
      setFolderToDelete(null);
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(null);
      }
      await loadData(); // Reload data after deleting folder
      toast({
        title: "Folder deleted",
        description: "The folder has been deleted and its notes moved to root"
      });
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast({
        title: "Error",
        description: "Failed to delete folder",
        variant: "destructive"
      });
    }
  };

  const toggleFavorite = async (folderId: string) => {
    try {
      const folder = findFolderInTree(folders, folderId);
      if (folder) {
        const updatedFolder: Partial<FolderData> = {
          isFavorite: !folder.isFavorite
        };
        await db.updateFolder(folderId, updatedFolder);
        await loadData();
        toast({
          title: folder.isFavorite ? "Removed from favorites" : "Added to favorites",
          description: `${folder.name} has been ${folder.isFavorite ? 'removed from' : 'added to'} favorites`
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update folder favorite status",
        variant: "destructive"
      });
    }
  };

  const sortedAndFilteredFolders = useMemo(() => {
    let filtered = folders;
    if (searchQuery) {
      filtered = folders.filter(folder => 
        folder.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return sortFolders(filtered);
  }, [folders, searchQuery, sortOption, sortDirection, notes]);

  return (
    <div className="h-full flex flex-col">
      {/* Mobile Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex items-center gap-4 h-14 px-4">
          {isMobileSearch ? (
            <div className="flex-1 flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => setIsMobileSearch(false)}
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </Button>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search folders..."
                className="h-9"
                autoFocus
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setSearchQuery('')}
                >
                  <Cross2Icon className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold">Folders</h1>
                <p className="text-sm text-muted-foreground">
                  {folders.length} folders • {notes.length} notes
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileSearch(true)}
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Folders List/Grid */}
      <ScrollArea className="flex-1 px-4 py-4">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <FolderSkeleton key={i} level={i % 2} />
            ))}
          </div>
        ) : sortedAndFilteredFolders.length > 0 ? (
          viewMode === 'list' ? (
            <div className="space-y-1 pb-8">
              {sortedAndFilteredFolders.map(folder => (
                <FolderTreeItem
                  key={folder.id}
                  folder={folder}
                  onToggle={toggleFolder}
                  onEdit={(folder) => {
                    setSelectedFolder(folder);
                    setNewFolderName(folder.name);
                    setNewFolderColor(folder.color || '#4f46e5');
                    setIsEditingFolder(true);
                  }}
                  onDelete={(folderId) => setFolderToDelete(folderId)}
                  onCreateSubfolder={(folder) => {
                    setSelectedFolder(folder);
                    setNewFolderName('');
                    setNewFolderColor(folder.color || '#4f46e5');
                    setIsCreatingFolder(true);
                  }}
                  onToggleFavorite={toggleFavorite}
                  notes={notes}
                  isCompact={false}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-[min-content] gap-4 pb-8">
              {sortedAndFilteredFolders.map(folder => (
                <GridFolderItem
                  key={folder.id}
                  folder={folder}
                  notes={notes}
                  onToggle={toggleFolder}
                  onToggleFavorite={toggleFavorite}
                  onEdit={(folder) => {
                    setSelectedFolder(folder);
                    setNewFolderName(folder.name);
                    setNewFolderColor(folder.color || '#4f46e5');
                    setIsEditingFolder(true);
                  }}
                  onDelete={(folderId) => setFolderToDelete(folderId)}
                  onCreateSubfolder={(folder) => {
                    setSelectedFolder(folder);
                    setNewFolderName('');
                    setNewFolderColor(folder.color || '#4f46e5');
                    setIsCreatingFolder(true);
                  }}
                />
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-center px-4">
            {searchQuery ? (
              <>
                <FolderIcon className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">No folders found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Try searching with different keywords
                </p>
              </>
            ) : (
              <>
                <FolderIcon className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">No folders yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Create your first folder to organize your notes
                </p>
                <Button
                  className="mt-4"
                  onClick={() => {
                    setSelectedFolder(null);
                    setIsCreatingFolder(true);
                  }}
                >
                  <FolderIcon className="h-4 w-4 mr-2" />
                  Create Folder
                </Button>
              </>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Floating Action Bar */}
      <FloatingActionBar
        viewMode={viewMode}
        setViewMode={setViewMode}
        sortOption={sortOption}
        setSortOption={setSortOption}
        sortDirection={sortDirection}
        setSortDirection={setSortDirection}
        onNewNote={() => navigate('/notes/new')}
        onNewFolder={() => {
          setSelectedFolder(null);
          setIsCreatingFolder(true);
        }}
      />

      {/* Create/Edit Folder Dialog */}
      <Dialog 
        open={isCreatingFolder || isEditingFolder} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCreatingFolder(false);
            setIsEditingFolder(false);
            setNewFolderName('');
            setNewFolderColor('#4f46e5');
            setSelectedFolder(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditingFolder ? 'Edit Folder' : 'Create New Folder'}
            </DialogTitle>
            <DialogDescription>
              {isEditingFolder 
                ? "Update the folder's name and color"
                : selectedFolder
                  ? `Create a new folder inside ${selectedFolder.name}`
                  : "Create a new root folder"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <div className="grid grid-cols-6 gap-2">
                {[
                  '#ef4444', // Red
                  '#f97316', // Orange
                  '#f59e0b', // Amber
                  '#eab308', // Yellow
                  '#84cc16', // Lime
                  '#22c55e', // Green
                  '#10b981', // Emerald
                  '#14b8a6', // Teal
                  '#06b6d4', // Cyan
                  '#0ea5e9', // Sky
                  '#3b82f6', // Blue
                  '#6366f1', // Indigo
                  '#8b5cf6', // Violet
                  '#a855f7', // Purple
                  '#d946ef', // Fuchsia
                  '#ec4899', // Pink
                  '#f43f5e', // Rose
                  '#64748b', // Slate
                ].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "h-6 w-6 rounded-md border border-muted transition-all hover:scale-110",
                      newFolderColor === color && "ring-2 ring-primary ring-offset-2"
                    )}
                    style={{ 
                      backgroundColor: color,
                      borderColor: color
                    }}
                    onClick={() => setNewFolderColor(color)}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: newFolderColor + '20' }}
              >
                <FolderIcon className="w-5 h-5" style={{ color: newFolderColor }} />
              </div>
              <div className="flex-1">
                <div className="font-medium" style={{ color: newFolderColor }}>
                  {newFolderName || 'Untitled Folder'}
                </div>
                {selectedFolder && !isEditingFolder && (
                  <div className="text-xs text-muted-foreground">
                    Inside {selectedFolder.name}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewFolderName('');
                setNewFolderColor('#4f46e5');
                setIsCreatingFolder(false);
                setIsEditingFolder(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={isEditingFolder ? handleEditFolder : handleCreateFolder}>
              {isEditingFolder ? 'Save Changes' : 'Create Folder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Dialog */}
      <AlertDialog open={!!folderToDelete} onOpenChange={(open) => !open && setFolderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this folder? All notes inside will be moved to root.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => folderToDelete && handleDeleteFolder(folderToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 