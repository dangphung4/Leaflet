/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
import { SharePermission, Folder } from "../Database/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  AvatarIcon,
  FileTextIcon,
  Share2Icon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Auth/AuthContext";
import {
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  documentId,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db as firestore } from "../Auth/firebase";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPreviewText, formatTimeAgo } from "../utils/noteUtils";
import type { Note, Tags } from "../Database/db";
import {
  LayoutGridIcon,
  LayoutListIcon,
  FolderIcon,
  FolderPlusIcon,
  UserIcon,
  ClockIcon,
  BarChart2Icon,
  TagIcon,
  InfoIcon,
  PinIcon,
  CalendarIcon,
  XIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import ShareDialog from "../Components/ShareDialog";
import { cn } from "@/lib/utils";
import { db } from "../Database/db";
import { TagSelector } from "@/components/TagSelector";
import { ImportDialog } from "../Components/ImportDialog";
import { ImportIcon } from "lucide-react";

interface StoredNotesPreferences {
  activeTab: "my-notes" | "shared";
  view: "grid" | "list";
  sortBy: "updated" | "created" | "title";
  selectedTags: string[];
  selectedTagFilters: Tags[];
  searchQuery: string;
  dateFilter?: string;
  selectedFolderId?: string;
}

const getBlockNoteContent = (jsonString: string) => {
  try {
    const blocks = JSON.parse(jsonString);
    let text = "";

    const extractText = (block: any) => {
      // Check if block has content array
      if (Array.isArray(block.content)) {
        block.content.forEach((item: any) => {
          if (item.type === "text") {
            text += item.text || "";
          }
        });
      } else if (block.text) {
        // Some blocks might have direct text property
        text += block.text;
      }

      // Add newline after certain block types
      if (
        [
          "paragraph",
          "bulletListItem",
          "numberedListItem",
          "checkListItem",
        ].includes(block.type)
      ) {
        text += "\n";
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
    console.error("Error parsing BlockNote content:", error);
    return "";
  }
};

/**
 * A functional component that represents a note card in the application.
 * It displays note details, allows for interaction such as pinning, editing tags,
 * and sharing options.
 *
 * @param {Object} props - The properties for the NoteCard component.
 * @param {Note} props.note - The note object containing details such as title, content, and tags.
 * @param {any} props.user - The current user object to determine ownership and permissions.
 * @param {"grid" | "list"} props.view - The view mode for displaying the note card.
 * @param {Function} props.onClick - Callback function to handle click events on the card.
 * @param {Note[]} props.allNotes - An array of all notes for related notes functionality.
 * @param {Function} props.navigate - Function to navigate to different routes in the application.
 * @param {Folder[]} props.folders - An array of folder objects for categorizing notes.
 *
 * @returns {JSX.Element} The rendered NoteCard component.
 *
 * @throws {Error} Throws an error if there is an issue loading shares or updating tags/folders.
 *
 * @example
 * <NoteCard
 *   note={note}
 *   user={currentUser}
 *   view="grid"
 *   onClick={handleNoteClick}
 *   allNotes={notes}
 *   navigate={navigateTo}
 *   folders={userFolders}
 * />
 */
const NoteCard = ({
  note,
  user,
  view,
  onClick,
  allNotes,
  navigate,
  folders,
}: {
  note: Note;
  user: any;
  view: "grid" | "list";
  onClick: () => void;
  allNotes: Note[];
  navigate: (path: string) => void;
  folders: Folder[];
}) => {
  const isOwner = note.ownerUserId === user?.uid;
  const [noteShares, setNoteShares] = useState<SharePermission[]>([]);
  const [, setIsLoadingShares] = useState(false);
  const hasShares = noteShares.length > 0;
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tags[]>(note.tags || []);
  const [localNote, setLocalNote] = useState<Note>(note);

  // Add function to load shares
  const loadShares = async () => {
    if (!note.firebaseId) return;

    setIsLoadingShares(true);
    try {
      const sharesRef = collection(firestore, "shares");
      const sharesQuery = query(
        sharesRef,
        where("noteId", "==", note.firebaseId)
      );
      const snapshot = await getDocs(sharesQuery);

      const sharesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        email: doc.data().email,
        displayName: doc.data().displayName,
        photoURL: doc.data().photoURL,
        access: doc.data().access,
        noteId: doc.data().noteId,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));

      setNoteShares(sharesList as SharePermission[]);
    } catch (error) {
      console.error("Error loading shares:", error);
    } finally {
      setIsLoadingShares(false);
    }
  };

  // Load shares when sheet opens
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    if (isSheetOpen) {
      loadShares();
    }
  }, [isSheetOpen, note.firebaseId]);

  // Update local state when note prop changes
  useEffect(() => {
    setLocalNote(note);
    setSelectedTags(note.tags || []);
  }, [note]);

  const handlePinClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await db.toggleNotePin(note.firebaseId!, !note.isPinned);
    } catch (error) {
      console.error("Error toggling pin:", error);
    }
  };

  return (
    <Card
      className={cn(
        "group transition-all duration-200 relative overflow-hidden",
        "hover:shadow-lg hover:border-primary/20",
        "bg-gradient-to-br from-background to-background/50",
        localNote.isPinned &&
          note.ownerUserId === user?.uid &&
          "border-primary/30",
        view === "grid" ? "h-[280px]" : "h-[120px]"
      )}
    >
      {/* Folder indicator - New! */}
      {localNote.folderId && (
        <div
          className="absolute top-0 left-0 w-full h-1 opacity-80"
          style={{
            backgroundColor: folders.find((f) => f.id === localNote.folderId)
              ?.color,
          }}
        />
      )}

      {/* Action buttons with updated styling - Always visible */}
      <div
        className={cn(
          "absolute right-2 top-2 z-10 flex gap-1.5",
          view === "list" && "top-1/2 -translate-y-1/2 right-4"
        )}
      >
        {note.ownerUserId === user?.uid && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-full",
              "hover:bg-background/80 backdrop-blur-sm",
              localNote.isPinned && "text-primary"
            )}
            onClick={(e) => {
              e.stopPropagation();
              handlePinClick(e);
            }}
          >
            <PinIcon className="h-4 w-4" />
          </Button>
        )}

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full",
                "hover:bg-background/80 backdrop-blur-sm"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <InfoIcon className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Note Details</SheetTitle>
              <DialogDescription>
                View and manage note details, statistics, and sharing settings
              </DialogDescription>
            </SheetHeader>

            <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
              <div className="space-y-6 py-6">
                {/* Enhanced Note Stats */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <BarChart2Icon className="h-4 w-4 text-primary" />
                    Note Statistics
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <div className="text-lg font-semibold">
                        {getBlockNoteContent(localNote.content).length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Characters
                      </div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <div className="text-lg font-semibold">
                        {
                          getBlockNoteContent(localNote.content)
                            .split(/\s+/)
                            .filter(Boolean).length
                        }
                      </div>
                      <div className="text-xs text-muted-foreground">Words</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <div className="text-lg font-semibold">
                        {
                          getBlockNoteContent(localNote.content)
                            .split(/\n/)
                            .filter(Boolean).length
                        }
                      </div>
                      <div className="text-xs text-muted-foreground">Lines</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <div className="text-lg font-semibold">
                        {Math.ceil(
                          getBlockNoteContent(localNote.content)
                            .split(/\s+/)
                            .filter(Boolean).length / 200
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Min Read
                      </div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg col-span-2">
                      <div className="text-lg font-semibold">
                        {localNote.tags?.length || 0} Tags · {noteShares.length}{" "}
                        Shares
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Metadata
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Recent Activity */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <ClockIcon className="h-4 w-4 text-primary" />
                    Recent Activity
                  </h4>
                  <div className="space-y-3">
                    {/* Creation */}
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <PlusIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">
                          Created by {localNote.ownerDisplayName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(localNote.createdAt, "MMM d, yyyy h:mm a")}
                        </div>
                      </div>
                      {localNote.ownerPhotoURL && (
                        <img
                          src={localNote.ownerPhotoURL}
                          alt={localNote.ownerDisplayName}
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                    </div>

                    {/* Last Edit */}
                    {localNote.lastEditedAt && localNote.lastEditedByUserId && (
                      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <FileTextIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm">
                            Edited by {localNote.lastEditedByDisplayName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(
                              localNote.lastEditedAt,
                              "MMM d, yyyy h:mm a"
                            )}
                          </div>
                        </div>
                        {localNote.lastEditedByPhotoURL && (
                          <img
                            src={localNote.lastEditedByPhotoURL}
                            alt={localNote.lastEditedByDisplayName || ""}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                      </div>
                    )}

                    {/* Recent Shares */}
                    {noteShares.length > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Share2Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm">
                            Shared with {noteShares.length}{" "}
                            {noteShares.length === 1 ? "person" : "people"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Most recent:{" "}
                            {format(
                              Math.max(
                                ...noteShares.map((s) => s.createdAt.getTime())
                              ),
                              "MMM d, yyyy"
                            )}
                          </div>
                        </div>
                        <div className="flex -space-x-2">
                          {noteShares.slice(0, 3).map((share) =>
                            share.photoURL ? (
                              <img
                                key={share.id}
                                src={share.photoURL}
                                alt={share.displayName || share.email}
                                className="w-6 h-6 rounded-full ring-2 ring-background"
                              />
                            ) : (
                              <div
                                key={share.id}
                                className="w-6 h-6 rounded-full bg-muted ring-2 ring-background flex items-center justify-center"
                              >
                                <UserIcon className="h-3 w-3" />
                              </div>
                            )
                          )}
                          {noteShares.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-primary/10 ring-2 ring-background flex items-center justify-center">
                              <span className="text-xs">
                                +{noteShares.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags Section */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <TagIcon className="h-4 w-4 text-primary" />
                    Tags
                  </h4>
                  {isEditingTags ? (
                    <div className="space-y-4">
                      <TagSelector
                        selectedTags={selectedTags}
                        onTagsChange={(tags: Tags[]) => {
                          setSelectedTags(tags);
                          // Handle async operation after state update
                          db.updateNoteTags(note.firebaseId!, tags)
                            .then(() => {
                              toast({
                                title: "Tags updated",
                                description:
                                  "Your note's tags have been updated successfully",
                              });
                            })
                            .catch((error) => {
                              console.error("Error updating tags:", error);
                              toast({
                                title: "Error",
                                description: "Failed to update tags",
                                variant: "destructive",
                              });
                              // Revert on error
                              setSelectedTags(note.tags || []);
                            });
                        }}
                        onCreateTag={async (tag: Partial<Tags>) => {
                          try {
                            const newTag = await db.createTag(tag);
                            return newTag;
                          } catch (error) {
                            console.error("Error creating tag:", error);
                            throw error;
                          }
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setIsEditingTags(false)}
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedTags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {selectedTags.map((tag) => (
                            <div
                              key={tag.id}
                              className="px-2 py-1 rounded-full text-xs"
                              style={{
                                backgroundColor: tag.color + "20",
                                color: tag.color,
                              }}
                            >
                              {tag.name}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No tags added yet
                        </p>
                      )}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setIsEditingTags(true)}
                      >
                        {selectedTags.length > 0 ? "Edit Tags" : "Add Tags"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Add Folder Section */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <FolderIcon className="h-4 w-4 text-primary" />
                    Folder
                  </h4>
                  <div className="space-y-2">
                    {isOwner ? (
                      <>
                        <Select
                          value={localNote.folderId || "none"}
                          onValueChange={(value) => {
                            const folderId = value === "none" ? undefined : value;
                            db.updateNote(note.firebaseId!, { folderId })
                              .then(() => {
                                setLocalNote({ ...localNote, folderId });
                                toast({
                                  title: "Folder updated",
                                  description: folderId
                                    ? `Note moved to ${folders.find((f) => f.id === folderId)?.name}`
                                    : "Note removed from folder",
                                });
                              })
                              .catch((error) => {
                                console.error("Error updating folder:", error);
                                toast({
                                  title: "Error",
                                  description: "Failed to update folder",
                                  variant: "destructive",
                                });
                              });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a folder" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <div className="flex items-center gap-2">
                                <FolderIcon className="h-4 w-4 text-muted-foreground" />
                                <span>No Folder</span>
                              </div>
                            </SelectItem>
                            {folders.map((folder) => (
                              <SelectItem key={folder.id} value={folder.id}>
                                <div className="flex items-center gap-2">
                                  <FolderIcon
                                    className="h-4 w-4"
                                    style={{ color: folder.color }}
                                  />
                                  <span>{folder.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {localNote.folderId && (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              db.updateNote(note.firebaseId!, { folderId: undefined })
                                .then(() => {
                                  setLocalNote({ ...localNote, folderId: undefined });
                                  toast({
                                    title: "Folder removed",
                                    description: "Note removed from folder",
                                  });
                                })
                                .catch((error) => {
                                  console.error("Error removing folder:", error);
                                  toast({
                                    title: "Error",
                                    description: "Failed to remove folder",
                                    variant: "destructive",
                                  });
                                });
                            }}
                          >
                            Remove from Folder
                          </Button>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {localNote.folderId ? (
                          <div className="flex items-center gap-2">
                            <FolderIcon
                              className="h-4 w-4"
                              style={{ 
                                color: folders.find(f => f.id === localNote.folderId)?.color 
                              }}
                            />
                            <span>
                              {folders.find(f => f.id === localNote.folderId)?.name}
                            </span>
                          </div>
                        ) : (
                          <span>No folder</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Related Notes */}
                {localNote.tags && localNote.tags.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <FileTextIcon className="h-4 w-4 text-primary" />
                      Related Notes
                    </h4>
                    <div className="space-y-2">
                      {allNotes
                        .filter(
                          (n: Note) =>
                            n.firebaseId !== note.firebaseId &&
                            n.tags?.some((t: Tags) =>
                              localNote.tags?.some((lt) => lt.id === t.id)
                            )
                        )
                        .slice(0, 3)
                        .map((relatedNote: Note) => (
                          <Button
                            key={relatedNote.firebaseId}
                            variant="outline"
                            className="w-full justify-start text-left h-auto py-2"
                            onClick={() => {
                              setIsSheetOpen(false);
                              navigate(`/notes/${relatedNote.firebaseId}`);
                            }}
                          >
                            <div className="flex flex-col gap-1 items-start">
                              <div className="font-medium text-sm">
                                {relatedNote.title}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {relatedNote.tags
                                  ?.filter((tag) =>
                                    localNote.tags?.some((t) => t.id === tag.id)
                                  )
                                  .map((tag) => (
                                    <div
                                      key={tag.id}
                                      className="px-1.5 py-0.5 rounded-full text-[10px]"
                                      style={{
                                        backgroundColor: tag.color + "20",
                                        color: tag.color,
                                      }}
                                    >
                                      {tag.name}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </Button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Sharing Section */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Share2Icon className="h-4 w-4 text-primary" />
                    Sharing
                  </h4>
                  <div className="space-y-2">
                    {/* Owner */}
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                      {localNote.ownerPhotoURL ? (
                        <img
                          src={localNote.ownerPhotoURL}
                          alt={localNote.ownerDisplayName}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                          <UserIcon className="h-4 w-4" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {localNote.ownerDisplayName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Owner
                        </div>
                      </div>
                    </div>

                    {/* Shared Users */}
                    {noteShares.map((share) => (
                      <div
                        key={share.id}
                        className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
                      >
                        {share.photoURL ? (
                          <img
                            src={share.photoURL}
                            alt={share.displayName || share.email}
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                            <UserIcon className="h-4 w-4" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {share.displayName || share.email}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {share.access === "edit" ? "Can edit" : "Can view"}
                          </div>
                        </div>
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={async () => {
                              try {
                                const shareRef = doc(
                                  firestore,
                                  "shares",
                                  share.id!
                                );
                                await deleteDoc(shareRef);
                                await loadShares();
                                toast({
                                  title: "Access removed",
                                  description: `Removed access for ${share.email}`,
                                });
                              } catch (error) {
                                console.error("Error removing share:", error);
                                toast({
                                  title: "Error",
                                  description: "Failed to remove access",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}

                    {/* Share Button using ShareDialog */}
                    {isOwner && (
                      <ShareDialog
                        note={localNote}
                        onShare={loadShares}
                        onError={(error) => {
                          toast({
                            title: "Error",
                            description: error,
                            variant: "destructive",
                          });
                        }}
                      >
                        <Button
                          variant="outline"
                          className="w-full mt-2 text-sm"
                        >
                          <Share2Icon className="h-4 w-4 mr-2" />
                          Share Note
                        </Button>
                      </ShareDialog>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>

      {/* Clickable area with enhanced layout */}
      <div
        className={cn(
          "cursor-pointer h-full",
          "transition-transform duration-200",
          "hover:scale-[0.995]",
          view === "list" && "pr-24"
        )}
        onClick={onClick}
      >
        <CardContent
          className={cn(
            "p-4 h-full",
            view === "list" ? "flex items-center gap-6" : "flex flex-col"
          )}
        >
          {/* Content wrapper */}
          <div
            className={cn(
              "flex-1 min-w-0 flex flex-col h-full",
              view === "list" && "flex-row items-center gap-6"
            )}
          >
            {/* Header section */}
            <div
              className={cn(
                "space-y-3 mb-3",
                view === "list" && "mb-0 flex-1 min-w-0 space-y-1"
              )}
            >
              {/* Title and folder */}
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className={cn(
                      "font-semibold leading-tight group-hover:text-primary transition-colors",
                      view === "list"
                        ? "text-base line-clamp-1"
                        : "text-lg line-clamp-2"
                    )}
                  >
                    {localNote.title || "Untitled"}
                  </h3>
                </div>

                {/* Folder name if exists */}
                {localNote.folderId && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FolderIcon
                      className="h-3.5 w-3.5"
                      style={{
                        color: folders.find((f) => f.id === localNote.folderId)
                          ?.color,
                      }}
                    />
                    <span className="truncate">
                      {folders.find((f) => f.id === localNote.folderId)?.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Owner and share info */}
              <div
                className={cn(
                  "flex items-center gap-2",
                  view === "list" && "hidden sm:flex"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {localNote.ownerPhotoURL ? (
                    <img
                      src={localNote.ownerPhotoURL}
                      alt={localNote.ownerDisplayName}
                      className="w-5 h-5 rounded-full ring-1 ring-border"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center ring-1 ring-border">
                      <UserIcon className="h-3 w-3" />
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground truncate">
                    {isOwner ? "You" : localNote.ownerDisplayName}
                  </span>
                </div>
                {hasShares && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Share2Icon className="h-3 w-3" />
                    <span className="truncate">
                      {isOwner
                        ? `${noteShares.length} ${
                            noteShares.length === 1 ? "person" : "people"
                          }`
                        : "Shared"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Preview with enhanced typography */}
            {view === "grid" && (
              <div className="text-sm text-muted-foreground/90 space-y-1 line-clamp-3">
                {getPreviewText(localNote.content, 150)
                  .split("\n")
                  .map(
                    (line, i) =>
                      line && (
                        <div
                          key={i}
                          className={cn(
                            line.startsWith("#") &&
                              "font-medium text-foreground",
                            line.startsWith("•") && "pl-4",
                            line.startsWith("1.") && "pl-4",
                            line.startsWith("☐") && "pl-4"
                          )}
                        >
                          {line}
                        </div>
                      )
                  )}
              </div>
            )}

            {/* Tags with updated styling */}
            {localNote.tags && localNote.tags.length > 0 && (
              <div
                className={cn(
                  "flex flex-wrap gap-1.5",
                  view === "grid" ? "mt-3" : "mt-0 ml-auto"
                )}
              >
                {localNote.tags.map((tag) => (
                  <div
                    key={tag.id}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium",
                      "transition-colors duration-200",
                      "hover:saturate-150"
                    )}
                    style={{
                      backgroundColor: tag.color + "15",
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </div>
                ))}
              </div>
            )}

            {/* Footer with metadata */}
            {view === "grid" && (
              <div
                className={cn(
                  "mt-auto pt-3 flex items-center justify-between",
                  "text-xs text-muted-foreground/75"
                )}
              >
                <div className="flex items-center gap-2">
                  <span>Created {formatTimeAgo(localNote.createdAt)}</span>
                </div>
                {localNote.lastEditedByUserId && (
                  <div className="flex items-center gap-2">
                    {localNote.lastEditedByPhotoURL && (
                      <img
                        src={localNote.lastEditedByPhotoURL}
                        alt={localNote.lastEditedByDisplayName}
                        className="w-4 h-4 rounded-full ring-1 ring-border"
                      />
                    )}
                    <span>
                      Edited{" "}
                      {formatTimeAgo(
                        localNote.lastEditedAt || localNote.updatedAt
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

const groupNotesByDate = (notes: Note[]) => {
  const groups: { [key: string]: Note[] } = {};

  notes.forEach((note) => {
    const date = new Date(note.updatedAt);
    let groupKey: string;

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      groupKey = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = "Yesterday";
    } else if (date.getFullYear() === today.getFullYear()) {
      groupKey = format(date, "MMMM d");
    } else {
      groupKey = format(date, "MMMM d, yyyy");
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(note);
  });

  return groups;
};

const NoteSearch = ({
  notes,
  onNoteSelect,
}: {
  notes: Note[];
  onNoteSelect: (note: Note) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

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

  const filteredNotes = notes.filter((note) => {
    const searchLower = search.toLowerCase();
    return (
      note.title.toLowerCase().includes(searchLower) ||
      note.content?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="w-full max-w-md">
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="w-full justify-start text-sm text-muted-foreground"
      >
        <MagnifyingGlassIcon className="mr-2 h-4 w-4" />
        Search notes...
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search notes..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>No notes found.</CommandEmpty>
          <CommandGroup heading="Notes">
            {filteredNotes.map((note) => (
              <CommandItem
                key={note.firebaseId}
                value={note.title}
                onSelect={() => {
                  onNoteSelect(note);
                  setOpen(false);
                  setSearch("");
                }}
                className="flex-col items-start gap-1 !py-3"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <FileTextIcon className="h-4 w-4" />
                    <span className="font-medium">
                      {note.title || "Untitled"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{formatTimeAgo(note.updatedAt)}</span>
                    {note.isPinned && (
                      <PinIcon className="h-3 w-3 text-primary" />
                    )}
                  </div>
                </div>

                {/* Owner info */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground ml-6">
                  {note.ownerPhotoURL ? (
                    <img
                      src={note.ownerPhotoURL}
                      alt={note.ownerDisplayName}
                      className="w-4 h-4 rounded-full"
                    />
                  ) : (
                    <AvatarIcon className="w-4 h-4" />
                  )}
                  <span>{note.ownerDisplayName}</span>
                </div>

                {/* Preview */}
                {note.content && (
                  <div className="ml-6 text-xs text-muted-foreground line-clamp-2 mt-1">
                    {getPreviewText(note.content, 150)}
                  </div>
                )}

                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 ml-6 mt-1">
                    {note.tags.map((tag) => (
                      <div
                        key={tag.id}
                        className="px-1.5 py-0.5 rounded-full text-[10px]"
                        style={{
                          backgroundColor: tag.color + "20",
                          color: tag.color,
                        }}
                      >
                        {tag.name}
                      </div>
                    ))}
                  </div>
                )}

                {note.lastEditedAt &&
                  note.lastEditedByUserId &&
                  note.lastEditedByPhotoURL && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground ml-6">
                      {note.lastEditedByPhotoURL && (
                        <img
                          src={note.lastEditedByPhotoURL}
                          alt={note.lastEditedByDisplayName}
                          className="w-4 h-4 rounded-full"
                        />
                      )}
                      <span>Edited {formatTimeAgo(note.lastEditedAt)}</span>
                    </div>
                  )}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
};

/**
 * A functional component that manages and displays notes for the user.
 * It handles loading notes, shares, folders, and tags, as well as providing
 * filtering and sorting functionalities.
 *
 * @returns {JSX.Element} The rendered component.
 *
 * @throws {Error} Throws an error if there is an issue loading initial data or creating a folder.
 *
 * @example
 * // Usage in a parent component
 * <Notes />
 */
export default function Notes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [shares, setShares] = useState<SharePermission[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"my-notes" | "shared">(() => {
    const stored = localStorage.getItem("notes-preferences");
    if (stored) {
      const preferences = JSON.parse(stored) as StoredNotesPreferences;
      return preferences.activeTab;
    }
    return "my-notes";
  });
  const [view, setView] = useState<"grid" | "list">(() => {
    const stored = localStorage.getItem("notes-preferences");
    if (stored) {
      const preferences = JSON.parse(stored) as StoredNotesPreferences;
      return preferences.view;
    }
    return "grid";
  });
  const [sortBy, setSortBy] = useState<"updated" | "created" | "title">(() => {
    const stored = localStorage.getItem("notes-preferences");
    if (stored) {
      const preferences = JSON.parse(stored) as StoredNotesPreferences;
      return preferences.sortBy;
    }
    return "updated";
  });
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const stored = localStorage.getItem("notes-preferences");
    if (stored) {
      const preferences = JSON.parse(stored) as StoredNotesPreferences;
      return preferences.selectedTags;
    }
    return [];
  });
  const [dateFilter, setDateFilter] = useState<Date | undefined>(() => {
    const stored = localStorage.getItem("notes-preferences");
    if (stored) {
      const preferences = JSON.parse(stored) as StoredNotesPreferences;
      return preferences.dateFilter
        ? new Date(preferences.dateFilter)
        : undefined;
    }
    return undefined;
  });
  const [selectedTagFilters, setSelectedTagFilters] = useState<Tags[]>(() => {
    const stored = localStorage.getItem("notes-preferences");
    if (stored) {
      const preferences = JSON.parse(stored) as StoredNotesPreferences;
      return preferences.selectedTagFilters;
    }
    return [];
  });
  const [allTags, setAllTags] = useState<Tags[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#4f46e5"); // Default indigo color
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(
    () => {
      const stored = localStorage.getItem("notes-preferences");
      if (stored) {
        const preferences = JSON.parse(stored) as StoredNotesPreferences;
        return preferences.selectedFolderId;
      }
      return undefined;
    }
  );

  // Persist view preference
  useEffect(() => {
    localStorage.setItem("notes-view", view);
  }, [view]);

  const loadInitialData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Load owned notes
      const notesRef = collection(firestore, "notes");
      const ownedQuery = query(
        notesRef,
        where("ownerUserId", "==", user.uid)
      );
      const ownedSnapshot = await getDocs(ownedQuery);

      const ownedNotes = ownedSnapshot.docs.map((doc) => ({
        ...doc.data(),
        firebaseId: doc.id,
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        lastEditedAt: doc.data().lastEditedAt?.toDate(),
      })) as Note[];

      // Load all shares for owned notes
      const sharesRef = collection(firestore, "shares");
      const ownedNotesShares = query(
        sharesRef,
        where(
          "noteId",
          "in",
          ownedNotes.map((note) => note.firebaseId)
        )
      );

      // Load shares where current user is recipient
      const sharedWithMeQuery = query(
        sharesRef,
        where("email", "==", user.email)
      );

      // Get both share types
      const [ownedSharesSnapshot, sharedWithMeSnapshot] = await Promise.all([
        getDocs(ownedNotesShares),
        getDocs(sharedWithMeQuery),
      ]);

      // Combine all shares
      const allShares = [
        ...ownedSharesSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        })),
        ...sharedWithMeSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        })),
      ] as unknown as SharePermission[];

      setShares(allShares);

      // Load shared notes
      const sharedNoteIds = sharedWithMeSnapshot.docs.map(
        (doc) => doc.data().noteId
      );

      if (sharedNoteIds.length > 0) {
        const sharedQuery = query(
          collection(firestore, "notes"),
          where(documentId(), "in", sharedNoteIds)
        );

        const sharedSnapshot = await getDocs(sharedQuery);
        const sharedNotes = sharedSnapshot.docs.map((doc) => ({
          ...doc.data(),
          firebaseId: doc.id,
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
          lastEditedAt: doc.data().lastEditedAt?.toDate(),
        })) as Note[];

        // Combine owned and shared notes
        const uniqueNotes = [...ownedNotes];
        sharedNotes.forEach((sharedNote) => {
          if (
            !uniqueNotes.some(
              (note) => note.firebaseId === sharedNote.firebaseId
            )
          ) {
            uniqueNotes.push(sharedNote);
          }
        });
        setNotes(uniqueNotes);
      } else {
        setNotes(ownedNotes);
      }

      // Also load tags and folders
      const tags = await db.getTags();
      setAllTags(tags);

      const userFolders = await db.getFolders();
      setFolders(userFolders);
    } catch (error) {
      console.error("Error loading initial data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Use loadInitialData in useEffect
  useEffect(() => {
    if (!user) return;
    loadInitialData();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const notesQuery = query(
      collection(firestore, "notes"),
      where("ownerUserId", "==", user.uid)
    );

    const sharesQuery = query(
      collection(firestore, "shares"),
      where("email", "==", user.email)
    );

    // First subscription: Listen for shares
    const unsubscribeShares = onSnapshot(sharesQuery, async (snapshot) => {
      const sharesData = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as unknown as SharePermission[];
      setShares(sharesData);

      // After getting shares, fetch the shared notes
      if (sharesData.length > 0) {
        const sharedNoteIds = sharesData.map((share) => share.noteId);
        const sharedQuery = query(
          collection(firestore, "notes"),
          where(documentId(), "in", sharedNoteIds)
        );

        try {
          const sharedSnapshot = await getDocs(sharedQuery);
          const sharedNotes = sharedSnapshot.docs.map((doc) => ({
            ...doc.data(),
            firebaseId: doc.id,
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
            lastEditedAt: doc.data().lastEditedAt?.toDate(),
          })) as Note[];

          setNotes((prev) => {
            const ownedNotes = prev.filter(
              (note) => note.ownerUserId === user.uid
            );
            const uniqueNotes = [...ownedNotes];
            sharedNotes.forEach((sharedNote) => {
              if (
                !uniqueNotes.some(
                  (note) => note.firebaseId === sharedNote.firebaseId
                )
              ) {
                uniqueNotes.push(sharedNote);
              }
            });
            return uniqueNotes;
          });
        } catch (error) {
          console.error("Error loading shared notes:", error);
        }
      }
    });

    // Second subscription: Listen for owned notes
    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
      const ownedNotes = snapshot.docs.map((doc) => ({
        ...doc.data(),
        firebaseId: doc.id,
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        lastEditedAt: doc.data().lastEditedAt?.toDate(),
      })) as Note[];

      setNotes((prev) => {
        const sharedNotes = prev.filter(
          (note) => note.ownerUserId !== user.uid
        );
        const uniqueNotes = [...sharedNotes];
        ownedNotes.forEach((ownedNote) => {
          if (
            !uniqueNotes.some(
              (note) => note.firebaseId === ownedNote.firebaseId
            )
          ) {
            uniqueNotes.push(ownedNote);
          }
        });
        return uniqueNotes;
      });
    });

    return () => {
      unsubscribeNotes();
      unsubscribeShares();
    };
  }, [user]);

  // Add useEffect to load tags
  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await db.getTags();
        setAllTags(tags);
      } catch (error) {
        console.error("Error loading tags:", error);
      }
    };
    loadTags();
  }, []);

  // Load folders
  useEffect(() => {
    const loadFolders = async () => {
      try {
        const userFolders = await db.getFolders();
        setFolders(userFolders);
      } catch (error) {
        console.error("Error loading folders:", error);
      }
    };
    loadFolders();
  }, []);

  const myNotes = notes.filter((note) => note.ownerUserId === user?.uid);
  const sharedWithMe = notes.filter((note) => {
    if (!user) return false;
    return shares.some(
      (share) => share.noteId === note.firebaseId && share.email === user.email
    );
  });

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await db.createFolder({
        name: newFolderName.trim(),
        color: newFolderColor,
      });
      setNewFolderName("");
      setNewFolderColor("#4f46e5");
      setIsCreatingFolder(false);
      toast({
        title: "Folder created",
        description: "Your new folder has been created successfully",
      });
    } catch (error) {
      console.error("Error creating folder:", error);
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive",
      });
    }
  };

  // Enhanced filtering logic
  const filteredNotes = useMemo(() => {
    const baseFiltered = (activeTab === "my-notes" ? myNotes : sharedWithMe)
      .filter((note) => {
        // Search query
        if (!note?.title?.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }

        // Folder filter - only apply to personal notes
        if (selectedFolderId !== undefined && activeTab === "my-notes") {
          if (note.folderId !== selectedFolderId) {
            return false;
          }
        }

        // Tags filter
        if (selectedTags.length > 0) {
          if (
            !selectedTags.every((tag) =>
              note?.tags?.some((noteTag) => noteTag.id === tag)
            )
          ) {
            return false;
          }
        }

        // Date filter
        if (dateFilter) {
          const noteDate = note.updatedAt;
          return (
            format(noteDate, "yyyy-MM-dd") === format(dateFilter, "yyyy-MM-dd")
          );
        }

        return true;
      })
      .sort((a, b) => {
        // Only consider pins for notes owned by current user
        const aIsPinned = a.isPinned && a.ownerUserId === user?.uid;
        const bIsPinned = b.isPinned && b.ownerUserId === user?.uid;

        // First sort by pinned status (only for owned notes)
        if (aIsPinned && !bIsPinned) return -1;
        if (!aIsPinned && bIsPinned) return 1;

        // Then by selected sort
        switch (sortBy) {
          case "title":
            return a.title.localeCompare(b.title);
          case "created":
            return b.createdAt.getTime() - a.createdAt.getTime();
          default:
            return b.updatedAt.getTime() - a.updatedAt.getTime();
        }
      });

    // Add tag filtering
    if (selectedTagFilters.length === 0) return baseFiltered;

    return baseFiltered.filter((note) => {
      if (!note.tags) return false;
      return selectedTagFilters.every((filterTag) =>
        note?.tags?.some((noteTag) => noteTag.id === filterTag.id)
      );
    });
  }, [
    activeTab,
    myNotes,
    sharedWithMe,
    searchQuery,
    selectedTags,
    dateFilter,
    sortBy,
    selectedTagFilters,
    user?.uid,
    selectedFolderId,
  ]);

  // Add effect to save preferences whenever they change
  useEffect(() => {
    const preferences: StoredNotesPreferences = {
      activeTab,
      view,
      sortBy,
      selectedTags,
      selectedTagFilters,
      searchQuery,
      dateFilter: dateFilter?.toISOString(),
      selectedFolderId,
    };
    localStorage.setItem("notes-preferences", JSON.stringify(preferences));
  }, [
    activeTab,
    view,
    sortBy,
    selectedTags,
    selectedTagFilters,
    searchQuery,
    dateFilter,
    selectedFolderId,
  ]);

  /**
   *
   */
  function clearFilters(): void {
    setSearchQuery("");
    setSelectedTags([]);
    setDateFilter(undefined);
    setSelectedTagFilters([]);
    setSortBy("updated");
    setSelectedFolderId(undefined);

    const preferences: StoredNotesPreferences = {
      activeTab,
      view,
      sortBy: "updated",
      selectedTags: [],
      selectedTagFilters: [],
      searchQuery: "",
      dateFilter: undefined,
      selectedFolderId: undefined,
    };
    localStorage.setItem("notes-preferences", JSON.stringify(preferences));
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
      {/* Streamlined Header */}
      <div className="space-y-3 sm:space-y-4 mb-6">
        {/* Top Bar with Tabs */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "my-notes" | "shared")
            }
            className="hidden sm:block w-full sm:w-auto order-1 sm:order-none"
          >
            <TabsList className="h-9 bg-muted/50 rounded-full w-full sm:w-auto">
              <TabsTrigger
                value="my-notes"
                className={cn(
                  "rounded-full px-4",
                  activeTab === "my-notes" && "bg-background shadow-sm"
                )}
              >
                My Notes ({myNotes.length})
              </TabsTrigger>
              <TabsTrigger
                value="shared"
                className={cn(
                  "rounded-full px-4",
                  activeTab === "shared" && "bg-background shadow-sm"
                )}
              >
                Shared ({sharedWithMe.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 order-2 sm:order-none sm:ml-auto">
            {/* Search */}
            <div className="flex-1 sm:max-w-md">
              <NoteSearch
                notes={notes}
                onNoteSelect={(note) => navigate(`/notes/${note.firebaseId}`)}
              />
            </div>

            {/* Mobile Actions */}
            <div className="flex sm:hidden items-center gap-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                  >
                    <LayoutGridIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-1" align="end" side="bottom">
                  <div className="grid grid-cols-1 gap-1">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start",
                        view === "grid" && "bg-muted"
                      )}
                      onClick={() => setView("grid")}
                    >
                      <LayoutGridIcon className="h-4 w-4 mr-2" />
                      Grid View
                    </Button>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start",
                        view === "list" && "bg-muted"
                      )}
                      onClick={() => setView("list")}
                    >
                      <LayoutListIcon className="h-4 w-4 mr-2" />
                      List View
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Add Import Dialog here */}
              <ImportDialog onImportComplete={loadInitialData}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                >
                  <ImportIcon className="h-4 w-4" />
                </Button>
              </ImportDialog>

              <Button
                variant="default"
                size="icon"
                className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90"
                onClick={() => navigate("/notes/new")}
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center bg-muted/50 rounded-full p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-full",
                    view === "grid" && "bg-background shadow-sm"
                  )}
                  onClick={() => setView("grid")}
                >
                  <LayoutGridIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-full",
                    view === "list" && "bg-background shadow-sm"
                  )}
                  onClick={() => setView("list")}
                >
                  <LayoutListIcon className="h-4 w-4" />
                </Button>
              </div>
              <ImportDialog onImportComplete={loadInitialData}>
                <Button
                  variant="outline"
                  className="rounded-full h-8"
                >
                  <ImportIcon className="mr-2 h-4 w-4" /> Import
                </Button>
              </ImportDialog>
              <Button
                onClick={() => navigate("/notes/new")}
                className="bg-primary hover:bg-primary/90 rounded-full h-8"
              >
                <PlusIcon className="mr-2 h-4 w-4" /> New Note
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Tabs and Filters */}
        <div className="sm:hidden space-y-2">
          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "my-notes" | "shared")
            }
            className="w-full"
          >
            <TabsList className="h-9 p-1 bg-muted/50 rounded-full w-full grid grid-cols-2">
              <TabsTrigger
                value="my-notes"
                className={cn(
                  "text-xs rounded-full",
                  activeTab === "my-notes" && "bg-background shadow-sm"
                )}
              >
                My Notes ({myNotes.length})
              </TabsTrigger>
              <TabsTrigger
                value="shared"
                className={cn(
                  "text-xs rounded-full",
                  activeTab === "shared" && "bg-background shadow-sm"
                )}
              >
                Shared ({sharedWithMe.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Mobile Filter Controls */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <Select
                value={selectedFolderId || "root"}
                onValueChange={(value) =>
                  setSelectedFolderId(value === "root" ? undefined : value)
                }
              >
                <SelectTrigger className="h-9 w-[120px] bg-background/50 rounded-full border-0 ring-1 ring-border">
                  <SelectValue placeholder="All folders">
                    <div className="flex items-center gap-2">
                      <FolderIcon
                        className="h-4 w-4 flex-shrink-0"
                        style={{
                          color: selectedFolderId
                            ? folders.find((f) => f.id === selectedFolderId)
                                ?.color
                            : undefined,
                        }}
                      />
                      <span className="truncate text-xs">
                        {selectedFolderId
                          ? folders.find((f) => f.id === selectedFolderId)
                              ?.name || "All folders"
                          : "All folders"}
                      </span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">
                    <div className="flex items-center gap-2">
                      <FolderIcon className="h-4 w-4" />
                      All folders
                    </div>
                  </SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <FolderIcon
                            className="h-4 w-4"
                            style={{ color: folder.color }}
                          />
                          {folder.name}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                  <Button
                    variant="ghost"
                    className="w-full justify-start mt-2 rounded-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCreatingFolder(true);
                    }}
                  >
                    <FolderPlusIcon className="h-4 w-4 mr-2" />
                    New Folder
                  </Button>
                </SelectContent>
              </Select>

              <Select
                value={sortBy}
                onValueChange={(value: any) => setSortBy(value)}
              >
                <SelectTrigger className="h-9 w-[100px] bg-background/50 rounded-full border-0 ring-1 ring-border">
                  <SelectValue placeholder="Sort by">
                    <span className="text-xs truncate">
                      {sortBy === "updated"
                        ? "Updated"
                        : sortBy === "created"
                        ? "Created"
                        : "Title"}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Updated</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={dateFilter ? "default" : "outline"}
                    size="icon"
                    className={cn(
                      "h-9 w-9 rounded-full",
                      dateFilter && "bg-primary text-primary-foreground"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                      "h-9 w-9 rounded-full relative",
                      selectedTagFilters.length > 0 &&
                        "bg-primary text-primary-foreground"
                    )}
                  >
                    <TagIcon className="h-4 w-4" />
                    {selectedTagFilters.length > 0 && (
                      <div className="absolute -top-1 -right-1">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "h-4 w-4 p-0 flex items-center justify-center text-[10px]",
                            "bg-primary-foreground/20 text-primary-foreground"
                          )}
                        >
                          {selectedTagFilters.length}
                        </Badge>
                      </div>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="end">
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Search tags..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <ScrollArea className="h-52">
                    <div className="p-2">
                      {allTags
                        .filter((tag) =>
                          tag.name
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase())
                        )
                        .map((tag) => (
                          <div
                            key={tag.id}
                            className="flex items-center gap-2 p-1.5 hover:bg-muted rounded-md cursor-pointer"
                            onClick={() => {
                              setSelectedTagFilters((prev) => {
                                const isSelected = prev.some(
                                  (t) => t.id === tag.id
                                );
                                return isSelected
                                  ? prev.filter((t) => t.id !== tag.id)
                                  : [...prev, tag];
                              });
                            }}
                          >
                            <Checkbox
                              checked={selectedTagFilters.some(
                                (t) => t.id === tag.id
                              )}
                            />
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="text-sm">{tag.name}</span>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              {/* Mobile clear filters button */}
              {(selectedTags.length > 0 ||
                dateFilter ||
                searchQuery ||
                selectedTagFilters.length > 0 ||
                sortBy !== "updated" ||
                selectedFolderId) && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={clearFilters}
                  className="h-9 w-9 rounded-full hover:bg-destructive hover:text-destructive-foreground"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Filter Bar - hide on mobile */}
        <div className="hidden sm:flex items-center gap-2 overflow-x-auto scrollbar-none pb-2">
          {/* Compact Filter Controls */}
          <div className="flex items-center gap-1.5 flex-none">
            <Select
              value={selectedFolderId || "root"}
              onValueChange={(value) =>
                setSelectedFolderId(value === "root" ? undefined : value)
              }
            >
              <SelectTrigger className="h-9 w-[130px] sm:w-[160px] bg-background/50 rounded-full border-0 ring-1 ring-border">
                <SelectValue placeholder="All folders">
                  <div className="flex items-center gap-2">
                    <FolderIcon
                      className="h-4 w-4 flex-shrink-0"
                      style={{
                        color: selectedFolderId
                          ? folders.find((f) => f.id === selectedFolderId)
                              ?.color
                          : undefined,
                      }}
                    />
                    <span className="truncate text-xs">
                      {selectedFolderId
                        ? folders.find((f) => f.id === selectedFolderId)
                            ?.name || "All folders"
                        : "All folders"}
                    </span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">
                  <div className="flex items-center gap-2">
                    <FolderIcon className="h-4 w-4" />
                    All folders
                  </div>
                </SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <FolderIcon
                          className="h-4 w-4"
                          style={{ color: folder.color }}
                        />
                        {folder.name}
                      </div>
                    </div>
                  </SelectItem>
                ))}
                <Button
                  variant="ghost"
                  className="w-full justify-start mt-2 rounded-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCreatingFolder(true);
                  }}
                >
                  <FolderPlusIcon className="h-4 w-4 mr-2" />
                  New Folder
                </Button>
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(value: any) => setSortBy(value)}
            >
              <SelectTrigger className="h-9 w-[110px] bg-background/50 rounded-full border-0 ring-1 ring-border">
                <SelectValue placeholder="Sort by">
                  <span className="text-xs">
                    {sortBy === "updated"
                      ? "Last Updated"
                      : sortBy === "created"
                      ? "Created Date"
                      : "Title"}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Last Updated</SelectItem>
                <SelectItem value="created">Created Date</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={dateFilter ? "default" : "outline"}
                    size="icon"
                    className={cn(
                      "h-9 w-9 rounded-full",
                      dateFilter && "bg-primary text-primary-foreground"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                      "h-9 w-9 rounded-full relative",
                      selectedTagFilters.length > 0 &&
                        "bg-primary text-primary-foreground"
                    )}
                  >
                    <TagIcon className="h-4 w-4" />
                    {selectedTagFilters.length > 0 && (
                      <div className="absolute -top-1 -right-1">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "h-4 w-4 p-0 flex items-center justify-center text-[10px]",
                            "bg-primary-foreground/20 text-primary-foreground"
                          )}
                        >
                          {selectedTagFilters.length}
                        </Badge>
                      </div>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="end">
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Search tags..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <ScrollArea className="h-52">
                    <div className="p-2">
                      {allTags
                        .filter((tag) =>
                          tag.name
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase())
                        )
                        .map((tag) => (
                          <div
                            key={tag.id}
                            className="flex items-center gap-2 p-1.5 hover:bg-muted rounded-md cursor-pointer"
                            onClick={() => {
                              setSelectedTagFilters((prev) => {
                                const isSelected = prev.some(
                                  (t) => t.id === tag.id
                                );
                                return isSelected
                                  ? prev.filter((t) => t.id !== tag.id)
                                  : [...prev, tag];
                              });
                            }}
                          >
                            <Checkbox
                              checked={selectedTagFilters.some(
                                (t) => t.id === tag.id
                              )}
                            />
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="text-sm">{tag.name}</span>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              {/* Desktop clear filters button */}
              {(selectedTags.length > 0 ||
                dateFilter ||
                searchQuery ||
                selectedTagFilters.length > 0 ||
                sortBy !== "updated" ||
                selectedFolderId) && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={clearFilters}
                  className="h-9 w-9 rounded-full hover:bg-destructive hover:text-destructive-foreground"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Active Filters - More Compact */}
        {(selectedTags.length > 0 ||
          dateFilter ||
          selectedFolderId ||
          selectedTagFilters.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {selectedFolderId && (
              <Badge
                variant="secondary"
                className="pl-2 pr-1 py-0.5 gap-1 rounded-full"
              >
                <FolderIcon
                  className="h-3 w-3 mr-1"
                  style={{
                    color: folders.find((f) => f.id === selectedFolderId)
                      ?.color,
                  }}
                />
                <span className="truncate max-w-[100px]">
                  {folders.find((f) => f.id === selectedFolderId)?.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 hover:bg-secondary-foreground/10 rounded-full"
                  onClick={() => setSelectedFolderId(undefined)}
                >
                  <XIcon className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {selectedTagFilters.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="pl-2 pr-1 py-0.5 gap-1 rounded-full"
                style={{
                  backgroundColor: tag.color + "20",
                  color: tag.color,
                }}
              >
                {tag.name}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 hover:bg-secondary-foreground/10 rounded-full"
                  onClick={() =>
                    setSelectedTagFilters((prev) =>
                      prev.filter((t) => t.id !== tag.id)
                    )
                  }
                >
                  <XIcon className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            {dateFilter && (
              <Badge
                variant="secondary"
                className="pl-2 pr-1 py-0.5 gap-1 rounded-full"
              >
                {format(dateFilter, "MMM dd, yyyy")}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 hover:bg-secondary-foreground/10 rounded-full"
                  onClick={() => setDateFilter(undefined)}
                >
                  <XIcon className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Notes Grid/List with improved mobile layout */}
      <div className="px-0 sm:px-1">
        {Object.entries(groupNotesByDate(filteredNotes)).map(
          ([date, dateNotes]) => (
            <div key={date} className="mb-8 sm:mb-10">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 px-1">
                {date}
              </h3>
              <div
                className={cn(
                  view === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6"
                    : "flex flex-col gap-3 sm:gap-4"
                )}
              >
                {dateNotes.map((note) => (
                  <NoteCard
                    key={note.firebaseId}
                    note={note}
                    user={user}
                    view={view}
                    onClick={() => navigate(`/notes/${note.firebaseId}`)}
                    allNotes={notes}
                    navigate={navigate}
                    folders={folders}
                  />
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {/* Empty and Loading states with mobile optimization */}
      {filteredNotes.length === 0 && !isLoading && (
        <div className="text-center py-12 sm:py-16 px-4">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center">
            <FileTextIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No notes found</h3>
          <p className="text-muted-foreground">
            {searchQuery
              ? "Try a different search term"
              : "Create your first note to get started!"}
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              className="mt-6 rounded-xl"
              onClick={clearFilters}
            >
              Clear all filters
            </Button>
          )}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center items-center h-[300px] sm:h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
            <p className="text-sm text-muted-foreground">
              Loading your notes...
            </p>
          </div>
        </div>
      )}

      {/* Create Folder Dialog */}
      <Dialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Customize your folder with a name and color
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
                  "#ef4444", // Red
                  "#f97316", // Orange
                  "#f59e0b", // Amber
                  "#eab308", // Yellow
                  "#84cc16", // Lime
                  "#22c55e", // Green
                  "#10b981", // Emerald
                  "#14b8a6", // Teal
                  "#06b6d4", // Cyan
                  "#0ea5e9", // Sky
                  "#3b82f6", // Blue
                  "#6366f1", // Indigo
                  "#8b5cf6", // Violet
                  "#a855f7", // Purple
                  "#d946ef", // Fuchsia
                  "#ec4899", // Pink
                  "#f43f5e", // Rose
                  "#64748b", // Slate
                ].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "h-6 w-6 rounded-md border border-muted transition-all hover:scale-110",
                      newFolderColor === color &&
                        "ring-2 ring-primary ring-offset-2"
                    )}
                    style={{
                      backgroundColor: color,
                      borderColor: color,
                    }}
                    onClick={() => setNewFolderColor(color)}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: newFolderColor + "20" }}
              >
                <FolderIcon
                  className="w-5 h-5"
                  style={{ color: newFolderColor }}
                />
              </div>
              <div className="flex-1">
                <div className="font-medium" style={{ color: newFolderColor }}>
                  {newFolderName || "Untitled Folder"}
                </div>
                <div className="text-xs text-muted-foreground">Preview</div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewFolderName("");
                setNewFolderColor("#4f46e5");
                setIsCreatingFolder(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create Folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
