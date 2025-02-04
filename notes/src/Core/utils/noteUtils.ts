/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Note } from '../Database/db';

/**
 * Represents a preview block with text content and styles
 */
export interface PreviewBlock {
  type: 'text' | 'heading' | 'bulletList' | 'numberedList' | 'checkList';
  content: Array<{
    text: string;
    styles?: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      strikethrough?: boolean;
      textColor?: string;
      backgroundColor?: string;
      code?: boolean;
    };
  }>;
  level?: number;
  checked?: boolean;
}

/**
 * Converts BlockNote content to a structured preview format
 */
export function getPreviewText(content: string, maxLength: number = 200): PreviewBlock[] {
  try {
    const blocks = JSON.parse(content);
    const preview: PreviewBlock[] = [];
    let totalLength = 0;

    for (const block of blocks) {
      if (totalLength >= maxLength) break;

      const previewBlock: PreviewBlock = {
        type: 'text',
        content: []
      };

      switch (block.type) {
        case 'heading':
          previewBlock.type = 'heading';
          previewBlock.level = block.props?.level || 1;
          break;
        case 'bulletListItem':
          previewBlock.type = 'bulletList';
          break;
        case 'numberedListItem':
          previewBlock.type = 'numberedList';
          break;
        case 'checkListItem':
          previewBlock.type = 'checkList';
          previewBlock.checked = block.props?.checked || false;
          break;
        default:
          previewBlock.type = 'text';
      }

      // Process inline content with styles
      if (Array.isArray(block.content)) {
        for (const item of block.content) {
          if (totalLength >= maxLength) break;

          const textLength = item.text?.length || 0;
          if (totalLength + textLength > maxLength) {
            // Truncate text if it would exceed maxLength
            previewBlock.content.push({
              text: item.text.slice(0, maxLength - totalLength) + '...',
              styles: item.styles
            });
            totalLength = maxLength;
            break;
          }

          previewBlock.content.push({
            text: item.text,
            styles: item.styles
          });
          totalLength += textLength;
        }
      }

      if (previewBlock.content.length > 0) {
        preview.push(previewBlock);
      }
    }

    return preview;
  } catch (e) {
    console.error('Error parsing BlockNote content:', e);
    return [];
  }
}

/**
 * Formats a date into a localized string
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }).format(date);
}

/**
 * Formats the last edited information for a note
 * @param {Note} note - The note object
 * @returns {string} Formatted string showing who last edited the note and when
 * @see {@link formatTimeAgo} for time formatting
 */
export function formatLastEdited(note: Note): string {
  const date = note.lastEditedAt || note.updatedAt;
  const timeAgo = formatTimeAgo(date);
  
  if (note.lastEditedByUserId) {
    const editor = note.lastEditedByDisplayName || note?.lastEditedByEmail?.split('@')[0];
    return `Edited by ${editor} • ${timeAgo}`;
  }
  
  // If no lastEditedBy, show last updated
  return `Updated ${timeAgo}`;
}

/**
 *
 * @param date
 */
export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return formatDate(date);
} 