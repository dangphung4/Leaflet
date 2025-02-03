/* eslint-disable @typescript-eslint/no-unused-vars */
import Dexie from "dexie";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  documentId,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { auth, db as firestore } from "../Auth/firebase";

export interface User {
  userId: string;
  email: string;
  displayName: string;
  photoURL: string;
  lastLoginAt: Date;
  preferences?: {
    editorFont?: string;
    theme?: string;        // for storing theme name (default, forest, ocean)
    colorMode?: string;    // for storing light/dark preference
  };
}

export interface Tags {
  id: string;
  name: string;
  metadata: string;
  group: string;
  createdAt: Date;
  createdBy: string;
  color: string;
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;
  ownerUserId: string;
  ownerEmail: string;
  ownerDisplayName: string;
  ownerPhotoURL?: string;
  createdAt: Date;
  updatedAt: Date;
  isShared?: boolean;
  isFavorite?: boolean;
}

export interface Note {
  type: string;
  id?: number;
  firebaseId?: string;
  title: string;
  content: string;
  updatedAt: Date;
  createdAt: Date;
  tags?: Tags[];
  folderId?: string;

  ownerUserId: string;
  ownerEmail: string;
  ownerDisplayName: string;
  ownerPhotoURL?: string;

  lastEditedByUserId?: string;
  lastEditedByEmail?: string;
  lastEditedByDisplayName?: string;
  lastEditedByPhotoURL?: string;
  lastEditedAt?: Date;

  isPinned?: boolean;
  isArchived?: boolean;
}

export interface SharePermission {
  id: string | null | undefined;
  noteId: string;
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  access: "view" | "edit";
  createdAt: Date;
  updatedAt?: Date;
  tags?: Tags[];
}

export interface CalendarEventShare {
  email: string;
  permission: "view" | "edit";
  status: "pending" | "accepted" | "declined";
  tags?: Tags[];
}

export interface CalendarEvent {
  firebaseId?: string;
  id: number;
  title: string;
  startDate: Date;
  endDate?: Date;
  description?: string;
  location?: string;
  allDay?: boolean;
  color?: string;
  reminderMinutes?: number;
  sharedWith?: CalendarEventShare[];
  createdBy: string; // user email
  createdByPhotoURL?: string;
  lastModifiedByDisplayName?: string;
  lastModifiedBy?: string;
  lastModifiedByPhotoURL?: string;
  lastModifiedAt?: Date;

  tags?: Tags[];
}

export interface PomodoroSession {
  id?: number;
  firebaseId?: string;
  noteId?: string;
  taskId?: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes
  status: 'active' | 'completed' | 'interrupted';
  type: 'work' | 'short-break' | 'long-break';
  createdBy: string;
  createdAt: Date;
}

export interface Task {
  id?: number;
  firebaseId?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  completedAt?: Date;
  noteId?: string;
  parentTaskId?: string;
  subtasks?: Task[];
  pomodoroEstimate?: number; // estimated pomodoros needed
  pomodoroCompleted?: number; // completed pomodoros
  tags?: Tags[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HabitTracker {
  id?: number;
  firebaseId?: string;
  habitName: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  targetCount: number;
  currentStreak: number;
  longestStreak: number;
  startDate: Date;
  completedDates: Date[];
  reminderTime?: string;
  tags?: Tags[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyProgress {
  id?: number;
  firebaseId?: string;
  date: Date;
  pomodorosCompleted: number;
  tasksCompleted: number;
  habitsCompleted: number;
  totalWorkMinutes: number;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoogleToken {
  id?: number;
  accessToken: string;
  expiresAt: Date;
  userId: string;
}

// Add to your existing interface for user preferences
interface UserPreferences {
  editorFont?: string;
  theme?: string;        // for storing theme name (default, forest, ocean)
  colorMode?: string;    // for storing light/dark preference
  fontSize?: number;     // for storing base font size
}

/**
 *
 */
class NotesDB extends Dexie {
  notes: Dexie.Table<Note, number>;
  calendarEvents!: Dexie.Table<CalendarEvent, number>;
  tags: Dexie.Table<Tags, string>;
  users?: Dexie.Table<User, string>;
  folders: Dexie.Table<Folder, string>;
  pomodoroSessions!: Dexie.Table<PomodoroSession, number>;
  tasks!: Dexie.Table<Task, number>;
  habitTrackers!: Dexie.Table<HabitTracker, number>;
  dailyProgress!: Dexie.Table<DailyProgress, number>;
  googleTokens!: Dexie.Table<GoogleToken, number>;

  /**
   *
   */
  constructor() {
    super("NotesDB");
    this.version(9).stores({
      notes: "++id, firebaseId, title, updatedAt, folderId",
      calendarEvents: "++id, firebaseId, startDate, endDate, ownerUserId",
      tags: "++id, name, group",
      users: "++userId, email, displayName, photoURL, lastLoginAt, preferences",
      folders: "++id, name, parentId, ownerUserId, isFavorite",
      pomodoroSessions: "++id, firebaseId, noteId, taskId, startTime, status, createdBy",
      tasks: "++id, firebaseId, title, status, dueDate, noteId, parentTaskId, createdBy",
      habitTrackers: "++id, firebaseId, habitName, frequency, startDate, createdBy",
      dailyProgress: "++id, firebaseId, date, createdBy",
      googleTokens: "++id, userId, accessToken, expiresAt"
    });
    this.notes = this.table("notes");
    this.tags = this.table("tags");
    this.users = this.table("users");
    this.folders = this.table("folders");
    this.pomodoroSessions = this.table("pomodoroSessions");
    this.tasks = this.table("tasks");
    this.habitTrackers = this.table("habitTrackers");
    this.dailyProgress = this.table("dailyProgress");
    this.googleTokens = this.table("googleTokens");
  }

  // Load notes from Firebase
  /**
   *
   */
  async loadFromFirebase() {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const notesRef = collection(firestore, "notes");
      const sharesRef = collection(firestore, "shares");

      // Get all notes I own
      const ownedSnapshot = await getDocs(
        query(notesRef, where("ownerUserId", "==", user.uid))
      );

      // Get all shares for me by email
      const mySharesSnapshot = await getDocs(
        query(sharesRef, where("email", "==", user.email))
      );
      /**
       * Asynchronously loads notes and folders from Firebase Firestore for the currently authenticated user.
       *
       * This method retrieves all notes owned by the user and all notes shared with the user via their email.
       * It also fetches folders owned by the user. The existing notes and folders in the local state are cleared
       * before loading new data from Firestore.
       *
       * @throws {Error} Throws an error if there is an issue retrieving data from Firebase.
       *
       * @example
       * // Usage example:
       * await this.loadFromFirebase();
       */
      const sharedNoteIds = mySharesSnapshot.docs.map(
        (doc) => doc.data().noteId
      );
      const sharedNotesSnapshot =
        sharedNoteIds.length > 0
          ? await getDocs(
              query(notesRef, where(documentId(), "in", sharedNoteIds))
            )
          : { docs: [] };

      // Load folders
      const foldersRef = collection(firestore, "folders");
      const foldersQuery = query(
        foldersRef,
        where("ownerUserId", "==", user.uid)
      );
      const foldersSnapshot = await getDocs(foldersQuery);
      
      // Clear existing notes
      await this.notes.clear();

      // Add owned notes
      for (const doc of ownedSnapshot.docs) {
        const data = doc.data();
        await this.notes.add({
          firebaseId: doc.id,
          type: 'note',
          title: data.title || "Untitled",
          content: data.content || "",
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),

          ownerUserId: data.ownerUserId || "",
          ownerEmail: data.ownerEmail || "",
          ownerDisplayName: data.ownerDisplayName || "Unknown",
          ownerPhotoURL: data.ownerPhotoURL,

          lastEditedByUserId: data.lastEditedByUserId,
          lastEditedByEmail: data.lastEditedByEmail,
          lastEditedByDisplayName: data.lastEditedByDisplayName,
          lastEditedByPhotoURL: data.lastEditedByPhotoURL,
          lastEditedAt: data.lastEditedAt?.toDate(),

          tags: data.tags || [],
          isPinned: data.isPinned || false,
          isArchived: data.isArchived || false,
          folderId: data.folderId || null,
        });
      }

      // Add shared notes
      for (const doc of sharedNotesSnapshot.docs) {
        const data = doc.data();
        const share = mySharesSnapshot.docs
          .find((s) => s.data().noteId === doc.id)
          ?.data();

        if (share) {
          await this.notes.add({
            firebaseId: doc.id,
            type: 'note',
            title: data.title || "Untitled",
            content: data.content || "",
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),

            ownerUserId: data.ownerUserId || "",
            ownerEmail: data.ownerEmail || "",
            ownerDisplayName: data.ownerDisplayName || "Unknown",
            ownerPhotoURL: data.ownerPhotoURL,

            lastEditedByUserId: data.lastEditedByUserId,
            lastEditedByEmail: data.lastEditedByEmail,
            lastEditedByDisplayName: data.lastEditedByDisplayName,
            lastEditedByPhotoURL: data.lastEditedByPhotoURL,
            lastEditedAt: data.lastEditedAt?.toDate(),

            tags: data.tags || [],
            isPinned: data.isPinned || false,
            isArchived: data.isArchived || false,
            folderId: data.folderId || null,
          });
        }
      }

      // Load folders
      await this.folders.clear();

      // Add folders
      for (const doc of foldersSnapshot.docs) {
        const data = doc.data();
        await this.folders.add({
          id: doc.id,
          name: data.name,
          description: data.description,
          color: data.color,
          icon: data.icon,
          parentId: data.parentId,
          ownerUserId: data.ownerUserId,
          ownerEmail: data.ownerEmail,
          ownerDisplayName: data.ownerDisplayName,
          ownerPhotoURL: data.ownerPhotoURL,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          isShared: data.isShared || false,
          isFavorite: data.isFavorite || false
        });
      }
    } catch (error) {
      console.error("Error loading from Firebase:", error);
      throw error;
    }
  }

  // Sync note with Firebase
  /**
   *
   * @param note
   */
  async syncNote(note: Note) {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // new notes, set current user as owner
      if (!note.ownerUserId) {
        note.ownerUserId = user.uid;
        note.ownerEmail = user.email || "";
        note.ownerDisplayName = user.displayName || "Unknown";
        note.ownerPhotoURL = user.photoURL || undefined;
      }

      const isOwner = note.ownerUserId === user.uid;

      // Check for edit access in shares collection
      const sharesRef = collection(firestore, "shares");
      const shareQuery = query(
        sharesRef,
        where("noteId", "==", note.firebaseId),
        where("email", "==", user.email),
        where("access", "==", "edit")
      );
      const shareSnapshot = await getDocs(shareQuery);
      const hasEditAccess = !shareSnapshot.empty;

      if (!isOwner && !hasEditAccess) {
        throw new Error("No permission to edit this note");
      }

      // Only include isPinned in the update if the user is the owner
      const noteData = {
        title: note.title,
        content: note.content || "",
        updatedAt: new Date(),
        lastEditedByUserId: user.uid,
        lastEditedByEmail: user.email,
        lastEditedByDisplayName: user.displayName || "Unknown",
        lastEditedByPhotoURL: user.photoURL,
        lastEditedAt: new Date(),
        // Only include isPinned if user is the owner
        ...(note.ownerUserId === user.uid && typeof note.isPinned === 'boolean' && { isPinned: note.isPinned })
      };

      // Remove any undefined or null values
      const cleanedNoteData = Object.fromEntries(
        Object.entries(noteData).filter(([_, value]) => value !== undefined && value !== null)
      );

      if (note.firebaseId) {
        await updateDoc(doc(firestore, "notes", note.firebaseId), cleanedNoteData);
      } else {
        const newNoteData = {
          ...cleanedNoteData,
          createdAt: new Date(),
          ownerUserId: user.uid,
          ownerEmail: user.email,
          ownerDisplayName: user.displayName || "Unknown",
          ownerPhotoURL: user.photoURL,
          tags: [],
          isPinned: false,
          isArchived: false,
          folderId: null,
        };
        const docRef = await addDoc(collection(firestore, "notes"), newNoteData);
        await this.notes.update(note.id!, { firebaseId: docRef.id });
      }

      await this.loadFromFirebase();
    } catch (error) {
      console.error("Error syncing with Firebase:", error);
      throw error;
    }
  }

  // Share note with another user
  /**
   *
   * @param noteId
   * @param recipientEmail
   * @param access
   */
  async shareNote(
    noteId: string,
    recipientEmail: string,
    access: "view" | "edit" = "view"
  ) {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Get note from Firebase to check permissions
      const noteRef = doc(firestore, "notes", noteId);
      const noteDoc = await getDoc(noteRef);

      if (!noteDoc.exists()) {
        throw new Error("Note not found");
      }

      const noteData = noteDoc.data();
      
      // Check if user is owner or has edit permissions
      const sharesRef = collection(firestore, "shares");
      const userShareQuery = query(
        sharesRef,
        where("noteId", "==", noteId),
        where("email", "==", user.email),
        where("access", "==", "edit")
      );
      const userShareSnapshot = await getDocs(userShareQuery);
      
      const isOwner = noteData.ownerUserId === user.uid;
      const hasEditAccess = !userShareSnapshot.empty;

      if (!isOwner && !hasEditAccess) {
        throw new Error("You don't have permission to share this note");
      }

      // Check if recipient already has access
      const existingShares = await getDocs(
        query(
          sharesRef,
          where("noteId", "==", noteId),
          where("email", "==", recipientEmail)
        )
      );

      if (!existingShares.empty) {
        const shareDoc = existingShares.docs[0];
        await updateDoc(doc(sharesRef, shareDoc.id), {
          access,
          updatedAt: new Date(),
        });
      } else {
        await addDoc(sharesRef, {
          noteId: noteId,
          userId: recipientEmail, // will be replaced later when user look up is added
          email: recipientEmail,
          displayName: recipientEmail.split("@")[0], // will be replaced later when user look up is added
          access,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await this.loadFromFirebase();
    } catch (error) {
      console.error("Error sharing note:", error);
      throw error;
    }
  }

  // Delete note
  /**
   *
   * @param firebaseId
   */
  async deleteNote(firebaseId: string) {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Get note to check ownership
      const noteRef = doc(firestore, "notes", firebaseId);
      const noteDoc = await getDoc(noteRef);

      if (!noteDoc.exists()) return;

      const noteData = noteDoc.data();
      if (noteData.ownerUserId !== user.uid) {
        throw new Error("Only the owner can delete this note");
      }

      // Delete all shares first
      const sharesRef = collection(firestore, "shares");
      const shares = await getDocs(
        query(sharesRef, where("noteId", "==", firebaseId))
      );

      const deletePromises = shares.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Then delete the note
      await deleteDoc(noteRef);
    } catch (error) {
      console.error("Error deleting note:", error);
      throw error;
    }
  }

  // Create new note
  /**
   *
   * @param note
   */
  async createNote(note: Partial<Note>): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
      const noteData = {
        ...note,
        ownerUserId: user.uid,
        ownerEmail: user.email,
        ownerDisplayName: user.displayName || "",
        ownerPhotoURL: user.photoURL || "",
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: note.tags || [],
        folderId: note.folderId || null,
      };

      const docRef = await addDoc(collection(firestore, "notes"), noteData);
      await this.loadFromFirebase();
      return docRef.id;
    } catch (error) {
      console.error("Error creating note:", error);
      throw error;
    }
  }

  // Update note
  /**
   *
   * @param noteId
   * @param updates
   */
  async updateNote(noteId: string, updates: Partial<Note>) {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
      const noteRef = doc(firestore, "notes", noteId);
      const noteDoc = await getDoc(noteRef);

      if (!noteDoc.exists()) {
        throw new Error("Note not found");
      }

      const updateData = {
        ...updates,
        updatedAt: new Date(),
        lastEditedByUserId: user.uid,
        lastEditedByEmail: user.email,
        lastEditedByDisplayName: user.displayName || "",
        lastEditedByPhotoURL: user.photoURL || "",
        lastEditedAt: new Date(),
        tags: updates.tags || [],
        folderId: updates.folderId !== undefined ? updates.folderId : noteDoc.data().folderId,
      };

      await updateDoc(noteRef, updateData);
      await this.loadFromFirebase();
    } catch (error) {
      console.error("Error updating note:", error);
      throw error;
    }
  }

  // Add new method for toggling pin
  /**
   *
   * @param noteId
   * @param isPinned
   */
  async toggleNotePin(noteId: string, isPinned: boolean) {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
      const noteRef = doc(firestore, "notes", noteId);
      const noteDoc = await getDoc(noteRef);

      if (!noteDoc.exists()) {
        throw new Error("Note not found");
      }

      const noteData = noteDoc.data();
      
      // Strict ownership check
      if (noteData.ownerUserId !== user.uid) {
        throw new Error("Only the owner can pin/unpin notes");
      }

      await updateDoc(noteRef, {
        isPinned,
        updatedAt: new Date(),
        lastEditedByUserId: user.uid,
        lastEditedByEmail: user.email,
        lastEditedByDisplayName: user.displayName || "",
        lastEditedByPhotoURL: user.photoURL || "",
        lastEditedAt: new Date(),
      });

      await this.loadFromFirebase();
    } catch (error) {
      console.error("Error toggling pin:", error);
      throw error;
    }
  }

  // Add calendar event methods
  /**
   *
   */
  private generateUniqueId(): number {
    return Date.now() * 1000 + Math.floor(Math.random() * 1000);
  }

  /**
   *
   * @param event
   */
  async createCalendarEvent(
    event: Partial<CalendarEvent>
  ): Promise<CalendarEvent> {
    console.log("Creating event:", event);
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
      // Create the event in Firebase first
      const eventData = {
        ...event,
        createdBy: user.email || "",
        createdByPhotoURL: user.photoURL || "",
        lastModifiedBy: user.email || "",
        lastModifiedByPhotoURL: user.photoURL || "",
        lastModifiedByDisplayName: user.displayName || "",
        lastModifiedAt: new Date(),
        startDate: event.startDate || new Date(),
        endDate: event.endDate || new Date(),
        
        /**
         * Asynchronously creates a calendar event and stores it in Firestore.
         *
         * This function takes a partial calendar event object, enriches it with user information,
         * and saves it to the Firestore database. If a reminder is set for the event, it schedules
         * the reminder as well.
         *
         * @param {Partial<CalendarEvent>} event - The event details to be created. This can include
         * various properties of a calendar event such as start date, end date, tags, and shared users.
         *
         * @returns {Promise<CalendarEvent>} A promise that resolves to the created calendar event,
         * which includes the generated Firebase ID and other enriched properties.
         *
         * @throws {Error} Throws an error if the user is not authenticated or if there is an issue
         * during the event creation process.
         *
         * @example
         * const newEvent = await createCalendarEvent({
         *   title: "Team Meeting",
         *   startDate: new Date("2023-10-01T10:00:00"),
         *   endDate: new Date("2023-10-01T11:00:00"),
         *   reminderMinutes: 30,
         * });
         * console.log("Created Event:", newEvent);
         */
        sharedWith: event.sharedWith || [],
        tags: event.tags || [],
      };

      console.log("Creating event in Firestore:", eventData);
      const docRef = await addDoc(
        collection(firestore, "calendarEvents"),
        eventData
      );

      // add Firebase ID to the event
      const newEvent = {
        ...eventData,
        id: Date.now(),
        firebaseId: docRef.id,
      } as CalendarEvent;

      await this.calendarEvents.add(newEvent);

      // Schedule reminder if set
      if (newEvent.reminderMinutes) {
        await this.scheduleEventReminder(newEvent);
      }

      return newEvent;
    } catch (error) {
      console.error("Detailed error in createCalendarEvent:", error);
      throw error;
    }
  }

  /**
   * Schedules a reminder notification for a calendar event
   * @param event The calendar event to schedule a reminder for
   * @returns Promise that resolves when the reminder is scheduled
   */
  private async scheduleEventReminder(event: CalendarEvent): Promise<void> {
    if ("Notification" in window && Notification.permission === "granted") {
      const reminderTime = new Date(event.startDate);
      const reminderMinutes = event.reminderMinutes || 0;
      reminderTime.setMinutes(reminderTime.getMinutes() - reminderMinutes);

      await navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(event.title, {
          body: `Reminder: ${event.title} starts in ${event.reminderMinutes} minutes`,
          icon: "/note-maskable.png",
          tag: `event-${event.id}`,
          data: {
            eventId: event.id,
            url: `/calendar/${event.id}`,
          },
        });
      });
    }
  }

  /**
   *
   * @param id
   */
  async deleteCalendarEvent(id: number) {
    const event = await this.calendarEvents.get(id);
    if (!event) return;

    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
      if (event.firebaseId) {
        await deleteDoc(doc(firestore, "calendarEvents", event.firebaseId));
      }
      await this.calendarEvents.delete(id);
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      throw error;
    }
  }

  /**
   *
   * @param eventId
   * @param shareWith
   * @param permission
   */
  async shareCalendarEvent(
    eventId: number,
    shareWith: string[],
    permission: "view" | "edit" = "view"
  ) {
    const event = await this.calendarEvents.get(eventId);
    const user = auth.currentUser;

    if (!event || !user)
      throw new Error("Event not found or user not authenticated");

    try {
      const shares = shareWith.map((email) => ({
        email,
        permission,
        status: "pending" as const,
      }));

      if (event.firebaseId) {
        await updateDoc(doc(firestore, "calendarEvents", event.firebaseId), {
          sharedWith: [...(event.sharedWith || []), ...shares],
          lastModifiedBy: user.email,
          lastModifiedAt: new Date(),
        });
      }

      await this.calendarEvents.update(eventId, (obj) => {
        obj.sharedWith = [...(obj.sharedWith || []), ...shares];
        obj.lastModifiedBy = user.email || "";
        obj.lastModifiedAt = new Date();
      });

      console.log(`Sharing event with: ${shareWith.join(", ")}`);
    } catch (error) {
      console.error("Error sharing calendar event:", error);
      throw error;
    }
  }

  /**
   * Gets all calendar events including owned, shared, and pending invitations
   * @returns Promise that resolves with an array of calendar events
   */
  async getSharedEvents(): Promise<CalendarEvent[]> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
      const eventsRef = collection(firestore, "calendarEvents");
      
      // Get events where user is the creator
      const createdByQuery = query(eventsRef, where("createdBy", "==", user.email));
      const createdBySnapshot = await getDocs(createdByQuery);
      
      // Get events shared with the user (both pending and accepted)
      const sharedQuery = query(
        eventsRef,
        where("sharedWith", "array-contains", {
          email: user.email,
          permission: "view",
          status: "pending"
        })
      /**
       * Retrieves all calendar events that the current user has access to, including events they own, events shared with them, and pending invitations.
       *
       * This method performs the following actions:
       * - Fetches events created by the user.
       * - Fetches events shared with the user that are either pending or accepted.
       * - Fetches events where the user has edit permissions.
       *
       * The results are processed to ensure that duplicate events are not included, and pending invitations are handled appropriately.
       *
       * @returns {Promise<CalendarEvent[]>} A promise that resolves to an array of calendar events.
       *
       * @throws {Error} Throws an error if the user is not authenticated or if there is an issue fetching events from the database.
       *
       * @example
       * async function loadEvents() {
       *   try {
       *     const events = await getSharedEvents();
       *     console.log(events);
       *   } catch (error) {
       *     console.error("Failed to load events:", error);
       *   }
       * }
       */
      );
      const sharedSnapshot = await getDocs(sharedQuery);

      // Get events where user has edit permission
      const editableQuery = query(
        eventsRef,
        where("sharedWith", "array-contains", {
          email: user.email,
          permission: "edit",
          status: "pending"
        })
      );
      const editableSnapshot = await getDocs(editableQuery);

      const events: CalendarEvent[] = [];

      // Process all events from both queries
      /**
       * Processes a Firestore document snapshot and updates the local calendar events
       * based on the data contained within the document.
       *
       * This function checks if the event represented by the document snapshot has already
       * been added to the local events list. If not, it retrieves or generates a unique ID
       * for the event, constructs an event object, and updates the local database accordingly.
       *
       * @param {QueryDocumentSnapshot} doc - The Firestore document snapshot containing event data.
       *
       * @throws {Error} Throws an error if there is an issue accessing the Firestore document data
       *                 or if the database operations fail.
       *
       * @returns {Promise<void>} A promise that resolves when the processing is complete.
       *
       * @example
       * const docSnapshot = await firestore.collection('events').doc('eventId').get();
       * await processDoc(docSnapshot);
       */
      const processDoc = async (doc: QueryDocumentSnapshot) => {
        const eventData = doc.data();
        const startDate = eventData.startDate?.toDate() || new Date();
        const endDate = eventData.endDate?.toDate() || new Date();
        const lastModifiedAt = eventData.lastModifiedAt?.toDate();

        // Only add if we haven't added this event already
        if (!events.some(e => e.firebaseId === doc.id)) {
          // Check if we already have this event in local DB
          const existingEvent = await this.calendarEvents
            .where('firebaseId')
            .equals(doc.id)
            .first();

          const event: CalendarEvent = {
            // If we have the event locally, use its ID, otherwise generate new one
            id: existingEvent?.id || this.generateUniqueId(),
            firebaseId: doc.id,
            title: eventData.title || "",
            startDate,
            endDate,
            description: eventData.description,
            location: eventData.location,
            allDay: eventData.allDay || false,
            color: eventData.color,
            reminderMinutes: eventData.reminderMinutes,
            createdBy: eventData.createdBy,
            createdByPhotoURL: eventData.createdByPhotoURL,
            lastModifiedBy: eventData.lastModifiedBy,
            lastModifiedByDisplayName: eventData.lastModifiedByDisplayName,
            lastModifiedByPhotoURL: eventData.lastModifiedByPhotoURL,
            lastModifiedAt,
            sharedWith: eventData.sharedWith || [],
            tags: eventData.tags || [],
          };

          // For pending invitations, we don't store them locally
          const userShare = event.sharedWith?.find(share => share.email === user.email);
          if (userShare?.status === "pending") {
            events.push(event);
          } else {
            // Update or add to local DB for accepted shares
            if (existingEvent) {
              await this.calendarEvents.update(existingEvent.id, event);
            } else {
              await this.calendarEvents.add(event);
            }
            events.push(event);
          }
        }
      };

      // Process events sequentially to maintain consistency
      for (const doc of createdBySnapshot.docs) {
        await processDoc(doc);
      }
      
      for (const doc of sharedSnapshot.docs) {
        await processDoc(doc);
      }

      for (const doc of editableSnapshot.docs) {
        await processDoc(doc);
      }

      // Sort events by date
      events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      console.log('Firebase events:', events); // Debug log

      return events;
    } catch (error) {
      console.error("Error fetching shared events:", error);
      throw error;
    }
  }

  /**
   * Syncs a shared event with the local database
   * @param firebaseId The Firebase ID of the event to sync
   * @returns Promise that resolves when sync is complete
   */
  private async syncSharedEvent(firebaseId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const eventRef = doc(firestore, "calendarEvents", firebaseId);
      const eventDoc = await getDoc(eventRef);

      if (!eventDoc.exists()) return;

      const eventData = eventDoc.data();
      const userShare = eventData.sharedWith?.find(
        (share: CalendarEventShare) => share.email === user.email
      );

      // only sync if user has accepted the share
      if (userShare?.status === "accepted") {
        // convert timestamps to dates
        const startDate = eventData.startDate?.toDate() || new Date();
        const endDate = eventData.endDate?.toDate() || new Date();
        const lastModifiedAt = eventData.lastModifiedAt?.toDate();

        const existingEvent = await this.calendarEvents
          .where("firebaseId")
          .equals(firebaseId)
          .first();

        const updatedEvent = {
          id: existingEvent?.id || Date.now(),
          firebaseId,
          title: eventData.title || "",
          startDate,
          endDate,
          description: eventData.description,
          location: eventData.location,
          allDay: eventData.allDay || false,
          color: eventData.color,
          reminderMinutes: eventData.reminderMinutes,
          createdBy: eventData.createdBy,
          lastModifiedBy: eventData.lastModifiedBy,
          lastModifiedAt,
          sharedWith: eventData.sharedWith || [],
          tags: eventData.tags || [],
        };

        if (existingEvent) {
          await this.calendarEvents.update(existingEvent.id, updatedEvent);
        } else {
          await this.calendarEvents.add(updatedEvent);
        }

        // Schedule reminder if set
        if (updatedEvent.reminderMinutes) {
          await this.scheduleEventReminder(updatedEvent as CalendarEvent);
        }
      }
    } catch (error) {
      console.error("Error syncing shared event:", error);
    }
  }

  /**
   * Updates the sharing status of a calendar event for a specified user.
   *
   * This asynchronous function allows the current user to update the sharing status
   * of a calendar event identified by its ID. The function checks if the user is authenticated,
   * retrieves the event from Firestore, and updates the sharing status accordingly.
   *
   * @param {number | string} eventId - The ID of the event to be updated. This can be either a number or a string.
   * @param {string} email - The email address of the user with whom the event is shared.
   * @param {"accepted" | "declined"} status - The new sharing status for the event, either "accepted" or "declined".
   *
   * @throws {Error} Throws an error if the user is not authenticated.
   * @throws {Error} Throws an error if the Firebase ID for the event cannot be determined.
   * @throws {Error} Throws an error if the event does not exist in Firebase.
   *
   * @returns {Promise<boolean>} Returns a promise that resolves to true if the update was successful.
   *
   * @example
   * const result = await updateEventShare(123, 'user@example.com', 'accepted');
   * console.log(result); // true
   */
  async updateEventShare(
    eventId: number | string,
    email: string,
    status: "accepted" | "declined"
  ) {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
      console.log("Processing event share update:", { eventId, email, status });

      let firebaseId = typeof eventId === "string" ? eventId : null;
      let localEvent = null;

      if (typeof eventId === "number") {
        localEvent = await this.calendarEvents.get(eventId);
        if (localEvent?.firebaseId) {
          firebaseId = localEvent.firebaseId;
        }
      }

      if (!firebaseId) {
        throw new Error("Could not determine Firebase ID for event");
      }

      const eventRef = doc(firestore, "calendarEvents", firebaseId);
      const eventDoc = await getDoc(eventRef);

      if (!eventDoc.exists()) throw new Error("Event not found in Firebase");

      const eventData = eventDoc.data();
      const currentShare = eventData.sharedWith?.find(
        (share: CalendarEventShare) => share.email === email
      );

      if (currentShare?.status === status) {
        console.log("Share status already set to:", status);
        return true;
      }

      const updatedShares = (eventData.sharedWith || []).map(
        (share: CalendarEventShare) => {
          if (share.email === email) {
            return { ...share, status };
          }
          return share;
        }
      );

      await updateDoc(eventRef, {
        sharedWith: updatedShares,
        lastModifiedAt: new Date(),
        lastModifiedBy: user.email,
      });

      if (status === "accepted") {
        // Sync the shared event to local database
        await this.syncSharedEvent(firebaseId);
      } else if (status === "declined" && localEvent) {
        // remove from local DB if declined
        await this.calendarEvents.delete(localEvent.id);
      }

      return true;
    } catch (error) {
      console.error("Error updating event share:", error);
      throw error;
    }
  }

  /**
   * Updates a calendar event in both local storage and Firebase.
   *
   * This asynchronous method retrieves an event by its ID or Firebase ID, checks the user's permissions,
   * and applies the provided updates to the event. It handles both local and remote updates and returns
   * the updated event data.
   *
   * @param {number | string} id - The unique identifier of the event to be updated. This can be either a numeric ID
   *                                or a Firebase ID (string).
   * @param {Partial<CalendarEvent>} updates - An object containing the properties of the calendar event that need to be updated.
   *                                            Only the properties that are included in this object will be modified.
   * @returns {Promise<CalendarEvent>} A promise that resolves to the updated calendar event object.
   *
   * @throws {Error} Throws an error if the user is not authenticated, if the event is not found in the local database,
   *                 if the event is not found in Firebase, or if the user does not have permission to edit the event.
   *
   * @example
   * const updatedEvent = await updateCalendarEvent(123, { title: "New Event Title" });
   * console.log("Updated Event:", updatedEvent);
   */
  async updateCalendarEvent(id: number | string, updates: Partial<CalendarEvent>) {
    console.log("Updating event:", { id, updates });
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
      // First get the event from local DB
      let localEvent: CalendarEvent | undefined;
      
      if (typeof id === 'number') {
        localEvent = await this.calendarEvents.get(id);
      } else {
        // If we got a firebaseId, look it up in local DB
        localEvent = await this.calendarEvents
          .where('firebaseId')
          .equals(id)
          .first();
      }

      if (!localEvent || !localEvent.firebaseId) {
        throw new Error("Event not found in local database");
      }

      // Get the event from Firebase
      const eventRef = doc(firestore, "calendarEvents", localEvent.firebaseId);
      const eventDoc = await getDoc(eventRef);

      if (!eventDoc.exists()) {
        throw new Error("Event not found in Firebase");
      }

      const eventData = eventDoc.data();

      // Check permissions
      const isCreator = eventData.createdBy === user.email;
      const hasEditPermission = eventData.sharedWith?.some(
        (share: CalendarEventShare) => 
          share.email === user.email && 
          share.permission === "edit" &&
          share.status === "accepted"
      );

      if (!isCreator && !hasEditPermission) {
        throw new Error("No permission to edit this event");
      }

      const updatedEvent = {
        ...updates,
        lastModifiedBy: user.email || "",
        lastModifiedByDisplayName: user.displayName || "",
        lastModifiedByPhotoURL: user.photoURL || "",
        lastModifiedAt: new Date()
      };

      // Update in Firebase
      await updateDoc(eventRef, updatedEvent);

      // Update locally
      await this.calendarEvents.update(localEvent.id, {
        ...updatedEvent,
        firebaseId: localEvent.firebaseId,
        id: localEvent.id
      } as Partial<CalendarEvent>);

      return {
        ...localEvent,
        ...updatedEvent,
        id: localEvent.id,
        firebaseId: localEvent.firebaseId
      };
    } catch (error) {
      console.error("Error updating calendar event:", error);
      throw error;
    }
  }

  // Add tag methods
  /**
   *
   * @param tag
   */
  async createTag(tag: Partial<Tags>): Promise<Tags> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
      const tagData = {
        name: tag.name || "",
        color: tag.color || "#3b82f6",
        group: tag.group || "default",
        metadata: tag.metadata || "",
        createdAt: new Date(),
        createdBy: user.email || "",
      };

      const docRef = await addDoc(collection(firestore, "tags"), tagData);

      const newTag: Tags = {
        ...tagData,
        id: docRef.id,
      };

      // save locally - NEED fix potential issue with table not being ready
      if (this.tags) {
        await this.tags.add(newTag);
      } else {
        console.error("Tags table not initialized");
      }

      return newTag;
    } catch (error) {
      console.error("Detailed error in createTag:", error);
      throw error;
    }
  }

  /**
   *
   */
  async getTags(): Promise<Tags[]> {
    try {
      const snapshot = await getDocs(collection(firestore, "tags"));
      return snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as Tags[];
    } catch (error) {
      console.error("Error fetching tags:", error);
      throw error;
    }
  }

  // Add methods for handling note tags
  /**
   *
   * @param noteId
   * @param tags
   */
  async updateNoteTags(noteId: string, tags: Tags[]) {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
      // Get the note to check permissions
      const noteRef = doc(firestore, "notes", noteId);
      const noteDoc = await getDoc(noteRef);
      
      if (!noteDoc.exists()) {
        throw new Error("Note not found");
      }

      const noteData = noteDoc.data();
      const isOwner = noteData.ownerUserId === user.uid;

      // Check for edit permissions in shares collection if not owner
      if (!isOwner) {
        const sharesRef = collection(firestore, "shares");
        const shareQuery = query(
          sharesRef,
          where("noteId", "==", noteId),
          where("email", "==", user.email),
          where("access", "==", "edit")
        );
        const shareSnapshot = await getDocs(shareQuery);
        
        if (shareSnapshot.empty) {
          throw new Error("No permission to edit tags on this note");
        }
      }

      // Update tags in Firebase
      await updateDoc(noteRef, {
        tags: tags,
        lastModifiedBy: user.email,
        lastModifiedAt: new Date(),
        lastEditedByUserId: user.uid,
        lastEditedByEmail: user.email,
        lastEditedByDisplayName: user.displayName || "",
        lastEditedByPhotoURL: user.photoURL || "",
        lastEditedAt: new Date(),
      });

      // Update locally if using IndexedDB
      const noteIdNumber = parseInt(noteId, 10);
      if (!isNaN(noteIdNumber)) {
        await this.notes.update(noteIdNumber, { tags });
      }

    } catch (error) {
      console.error("Error updating note tags:", error);
      throw error;
    }
  }

  // Add method to get notes by tag
  /**
   *
   * @param tagId
   */
  async getNotesByTag(tagId: string): Promise<Note[]> {
    try {
      const snapshot = await getDocs(
        query(
          collection(firestore, "notes"),
          where("tags", "array-contains", tagId)
        )
      );
      return snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as unknown as Note[];
    } catch (error) {
      console.error("Error fetching notes by tag:", error);
      throw error;
    }
  }

  /**
   * Updates user preferences in both Firestore and IndexedDB
   * @param userId
   * @param preferences
   */
  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>) {
    try {
      // Update Firestore
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, {
        preferences: preferences,
        updatedAt: new Date()
      });

      // Update local IndexedDB
      await this.users?.update(userId, (user: User) => {
        user.preferences = {
          ...user.preferences,
          ...preferences
        };
      });

      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  // Find the syncNoteWithFirebase method and update it to filter out undefined values
  /**
   *
   * @param note
   */
  async syncNoteWithFirebase(note: Note) {
    if (!auth.currentUser) return;

    try {
      const noteData = {
        title: note.title,
        content: note.content,
        updatedAt: note.updatedAt,
        createdAt: note.createdAt,
        ownerUserId: note.ownerUserId,
        ownerEmail: note.ownerEmail,
        ownerDisplayName: note.ownerDisplayName,
        ownerPhotoURL: note.ownerPhotoURL,
        lastEditedByUserId: note.lastEditedByUserId,
        lastEditedByEmail: note.lastEditedByEmail,
        lastEditedByDisplayName: note.lastEditedByDisplayName,
        lastEditedByPhotoURL: note.lastEditedByPhotoURL,
        lastEditedAt: note.lastEditedAt,
        tags: note.tags || [],
        // Only include these fields if they are explicitly set to true or false
        ...(typeof note.isPinned === 'boolean' && { isPinned: note.isPinned }),
        ...(typeof note.isArchived === 'boolean' && { isArchived: note.isArchived }),
        folderId: note.folderId || null,
      };

      // Remove any undefined or null values
      const cleanedNoteData = Object.fromEntries(
        Object.entries(noteData).filter(([_, value]) => value !== undefined && value !== null)
      );

      if (note.firebaseId) {
        // Update existing document
        const noteRef = doc(firestore, 'notes', note.firebaseId);
        await updateDoc(noteRef, cleanedNoteData);
      } else {
        // Create new document
        const docRef = await addDoc(collection(firestore, 'notes'), cleanedNoteData);
        note.firebaseId = docRef.id;
        await this.notes.update(note.id!, { firebaseId: docRef.id });
      }
    } catch (error) {
      console.error('Error syncing with Firebase:', error);
      throw error;
    }
  }

  // Folder Methods
  /**
   *
   * @param folder
   */
  async createFolder(folder: Partial<Folder>): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
      const folderData = {
        ...folder,
        ownerUserId: user.uid,
        ownerEmail: user.email,
        ownerDisplayName: user.displayName || "",
        ownerPhotoURL: user.photoURL || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(collection(firestore, "folders"), folderData);
      await this.loadFromFirebase(); // Reload data
      return docRef.id;
    } catch (error) {
      console.error("Error creating folder:", error);
      throw error;
    }
  }

  /**
   *
   * @param folderId
   * @param updates
   */
  async updateFolder(folderId: string, updates: Partial<Folder>) {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
      const folderRef = doc(firestore, "folders", folderId);
      const folderDoc = await getDoc(folderRef);

      if (!folderDoc.exists()) {
        throw new Error("Folder not found");
      }

      const folderData = folderDoc.data();
      if (folderData.ownerUserId !== user.uid) {
        throw new Error("Only the owner can update this folder");
      }

      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      await updateDoc(folderRef, updateData);
      await this.loadFromFirebase(); // Reload data to ensure consistency
    } catch (error) {
      console.error("Error updating folder:", error);
      throw error;
    }
  }

  /**
   *
   * @param folderId
   */
  async deleteFolder(folderId: string) {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
      const folderRef = doc(firestore, "folders", folderId);
      const folderDoc = await getDoc(folderRef);

      if (!folderDoc.exists()) return;

      const folderData = folderDoc.data();
      if (folderData.ownerUserId !== user.uid) {
        throw new Error("Only the owner can delete this folder");
      }

      // Move all notes in this folder to root (no folder)
      const notesRef = collection(firestore, "notes");
      const notesInFolder = await getDocs(
        query(notesRef, where("folderId", "==", folderId))
      );

      const updatePromises = notesInFolder.docs.map(doc =>
        updateDoc(doc.ref, { folderId: null })
      );
      await Promise.all(updatePromises);

      // Delete the folder
      await deleteDoc(folderRef);
      await this.loadFromFirebase();
    } catch (error) {
      console.error("Error deleting folder:", error);
      throw error;
    }
  }

  /**
   *
   */
  async getFolders(): Promise<Folder[]> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
      const foldersRef = collection(firestore, "folders");
      const q = query(
        foldersRef,
        where("ownerUserId", "==", user.uid)
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Folder[];
    } catch (error) {
      console.error("Error fetching folders:", error);
      throw error;
    }
  }

  // Pomodoro Methods
  /**
   *
   * @param session
   */
  async startPomodoroSession(session: Partial<PomodoroSession>): Promise<PomodoroSession> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
      const sessionData = {
        ...session,
        startTime: new Date(),
        status: 'active',
        createdBy: user.email || "",
        createdAt: new Date()
      } as PomodoroSession;

      const docRef = await addDoc(collection(firestore, "pomodoroSessions"), sessionData);
      const newSession = { ...sessionData, firebaseId: docRef.id };
      await this.pomodoroSessions.add(newSession);

      return newSession;
    } catch (error) {
      console.error("Error starting pomodoro session:", error);
      throw error;
    }
  }

  /**
   *
   * @param sessionId
   */
  async completePomodoroSession(sessionId: number): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
      const session = await this.pomodoroSessions.get(sessionId);
      if (!session || !session.firebaseId) throw new Error("Session not found");

      const updateData = {
        status: 'completed' as const,
        endTime: new Date()
      };

      await updateDoc(doc(firestore, "pomodoroSessions", session.firebaseId), updateData);
      await this.pomodoroSessions.update(sessionId, updateData);

      // Update daily progress
      await this.updateDailyProgress();
    } catch (error) {
      console.error("Error completing pomodoro session:", error);
      throw error;
    }
  }

  // Task Methods
  /**
   *
   * @param task
   */
  async createTask(task: Partial<Task>): Promise<Task> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
      const taskData = {
        ...task,
        status: task.status || 'todo',
        createdBy: user.email || "",
        createdAt: new Date(),
        updatedAt: new Date()
      } as Task;

      const docRef = await addDoc(collection(firestore, "tasks"), taskData);
      const newTask = { ...taskData, firebaseId: docRef.id };
      await this.tasks.add(newTask);

      return newTask;
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  }

  /**
   *
   * @param taskId
   * @param updates
   */
  async updateTask(taskId: number, updates: Partial<Task>): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
      const task = await this.tasks.get(taskId);
      if (!task || !task.firebaseId) throw new Error("Task not found");

      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await updateDoc(doc(firestore, "tasks", task.firebaseId), updateData);
      await this.tasks.update(taskId, updateData);

      if (updates.status === 'completed') {
        await this.updateDailyProgress();
      }
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  }

  // Habit Tracking Methods
  /**
   *
   * @param habit
   */
  async createHabit(habit: Partial<HabitTracker>): Promise<HabitTracker> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
      const habitData = {
        ...habit,
        currentStreak: 0,
        longestStreak: 0,
        completedDates: [],
        createdBy: user.email || "",
        createdAt: new Date(),
        updatedAt: new Date()
      } as HabitTracker;

      const docRef = await addDoc(collection(firestore, "habitTrackers"), habitData);
      const newHabit = { ...habitData, firebaseId: docRef.id };
      await this.habitTrackers.add(newHabit);

      return newHabit;
    } catch (error) {
      console.error("Error creating habit:", error);
      throw error;
    }
  }

  /**
   *
   * @param habitId
   * @param date
   */
  async completeHabit(habitId: number, date: Date = new Date()): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
      const habit = await this.habitTrackers.get(habitId);
      if (!habit || !habit.firebaseId) throw new Error("Habit not found");

      const completedDates = [...(habit.completedDates || []), date];
      const { currentStreak, longestStreak } = this.calculateHabitStreaks(completedDates);

      const updateData = {
        completedDates,
        currentStreak,
        longestStreak,
        updatedAt: new Date()
      };

      await updateDoc(doc(firestore, "habitTrackers", habit.firebaseId), updateData);
      await this.habitTrackers.update(habitId, updateData);

      await this.updateDailyProgress();
    } catch (error) {
      console.error("Error completing habit:", error);
      throw error;
    }
  }

  /**
   *
   * @param completedDates
   */
  private calculateHabitStreaks(completedDates: Date[]): { currentStreak: number; longestStreak: number } {
    const sortedDates = completedDates
      .map(date => new Date(date).toISOString().split('T')[0])
      .sort();
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0 || this.isConsecutiveDay(sortedDates[i-1], sortedDates[i])) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
      
      longestStreak = Math.max(longestStreak, tempStreak);
      if (i === sortedDates.length - 1) {
        const today = new Date().toISOString().split('T')[0];
        if (this.isConsecutiveDay(sortedDates[i], today) || sortedDates[i] === today) {
          currentStreak = tempStreak;
        }
      }
    }

    return { currentStreak, longestStreak };
  }

  /**
   *
   * @param date1
   * @param date2
   */
  private isConsecutiveDay(date1: string, date2: string): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  }

  // Daily Progress Methods
  /**
   *
   */
  private async updateDailyProgress(): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Get today's progress or create new
      const progressRef = collection(firestore, "dailyProgress");
      const q = query(
        progressRef,
        where("createdBy", "==", user.email),
        where("date", "==", today)
      );
      const snapshot = await getDocs(q);

      // Calculate metrics
      const pomodorosCompleted = await this.pomodoroSessions
        .where("createdBy")
        .equals(user.email || "")
        .and(session => {
          const sessionDate = new Date(session.startTime);
          return sessionDate.toDateString() === today.toDateString();
        })
        .count();

      const tasksCompleted = await this.tasks
        .where("createdBy")
        .equals(user.email || "")
        .and(task => {
          if (!task.completedAt) return false;
          const taskDate = new Date(task.completedAt);
          return taskDate.toDateString() === today.toDateString();
        })
        .count();

      const habits = await this.habitTrackers
        .where("createdBy")
        .equals(user.email || "")
        .toArray();

      const habitsCompleted = habits.reduce((count, habit) => {
        const completedToday = habit.completedDates?.some(
          date => new Date(date).toDateString() === today.toDateString()
        );
        return completedToday ? count + 1 : count;
      }, 0);

      const totalWorkMinutes = pomodorosCompleted * 25; // assuming 25-minute pomodoros

      const progressData = {
        date: today,
        pomodorosCompleted,
        tasksCompleted,
        habitsCompleted,
        totalWorkMinutes,
        createdBy: user.email || "",
        updatedAt: new Date(),
        createdAt: new Date() // Add this for new entries
      };

      if (snapshot.empty) {
        // Create new progress entry
        const docRef = await addDoc(progressRef, progressData);
        await this.dailyProgress.add({ ...progressData, firebaseId: docRef.id });
      } else {
        // Update existing progress
        const docRef = snapshot.docs[0];
        await updateDoc(docRef.ref, progressData);
        const localProgress = await this.dailyProgress
          .where("firebaseId")
          .equals(docRef.id)
          .first();
        if (localProgress) {
          await this.dailyProgress.update(localProgress.id!, progressData);
        }
      }
    } catch (error) {
      console.error("Error updating daily progress:", error);
      throw error;
    }
  }

  // Google OAuth token methods
  /**
   * Saves a Google authentication token for the currently authenticated user.
   *
   * This method first checks if a user is authenticated. If not, it throws an error.
   * It then calculates the expiration date of the token based on the provided `expiresIn` value,
   * deletes any existing tokens associated with the user, and finally saves the new token
   * along with its expiration date.
   *
   * @param {string} token - The Google access token to be saved.
   * @param {number} expiresIn - The duration in seconds until the token expires.
   * @returns {Promise<void>} A promise that resolves when the token has been successfully saved.
   * @throws {Error} Throws an error if the user is not authenticated.
   *
   * @example
   * const token = "your_access_token";
   * const expiresIn = 3600; // 1 hour
   * await saveGoogleToken(token, expiresIn);
   */
  async saveGoogleToken(token: string, expiresIn: number): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    // Delete any existing tokens for this user
    await this.googleTokens.where('userId').equals(user.uid).delete();
    
    // Save new token
    await this.googleTokens.add({
      userId: user.uid,
      accessToken: token,
      expiresAt
    });
  }

  /**
   * Retrieves the Google access token for the currently authenticated user.
   *
   * This method checks if a user is currently authenticated. If not, it returns null.
   * If the user is authenticated, it attempts to find the user's Google token in the database.
   * If a token is found, it checks if the token has expired. If the token is expired, it deletes
   * the token from the database and returns null. If the token is valid, it returns the access token.
   *
   * @returns {Promise<string | null>} A promise that resolves to the Google access token as a string,
   * or null if no valid token is found or if the user is not authenticated.
   *
   * @throws {Error} Throws an error if there is an issue retrieving the token from the database.
   *
   * @example
   * const token = await getGoogleToken();
   * if (token) {
   *   console.log('Access Token:', token);
   * } else {
   *   console.log('No valid access token found.');
   * }
   */
  async getGoogleToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;

    const token = await this.googleTokens
      .where('userId')
      .equals(user.uid)
      .first();

    if (!token) return null;

    // Check if token is expired
    if (token.expiresAt < new Date()) {
      await this.googleTokens.delete(token.id!);
      return null;
    }

    return token.accessToken;
  }
}

export const db = new NotesDB();
