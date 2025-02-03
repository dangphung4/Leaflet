# Development Guide

This document provides detailed technical information for developers working on the Notes PWA project.

## Prerequisites

- Node.js 20+
- npm/yarn
- .NET 9.0+
- Firebase account
- Git
- VS Code (recommended)

## Recommended VS Code Extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)
- C# Dev Kit
- GitLens

## Local Development Environment Setup

1. **Clone the Repository**

```bash
git clone https://github.com/dangphung4/notes.git
cd notes
```

2. **Install Dependencies**

```bash
cd notes
npm install
```

3. **Firebase Setup**

- Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
- Enable Authentication and Firestore
- Create a web app in your Firebase project
- Copy the configuration values to your `.env` file

4. **Environment Configuration**

Create `.env` file in the `/notes` directory:

```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id  # Required for Google Docs import/export
```

5. **Google OAuth Setup**

For Google Docs integration:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable Google Drive API and Google Docs API
4. Create OAuth 2.0 credentials
5. Add authorized JavaScript origins:
   - `http://localhost:5173` (for development)
   - Your production domain
6. Add authorized redirect URIs:
   - `http://localhost:5173` (for development)
   - Your production domain
7. Copy the client ID to your `.env` file

5. **Development Server**

```bash
npm run dev
```

6. **Aspire Development**

```bash
cd NotesAspire/NotesAspire.Host
dotnet run
```

## Database Schema

### Notes

```typescript
interface Note {
  id?: number;
  firebaseId?: string;
  title: string;
  content: string;
  updatedAt: Date;
  createdAt: Date;
  tags?: Tags[];
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
```

### Calendar Events

```typescript
interface CalendarEvent {
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
  createdBy: string;
  createdByPhotoURL?: string;
  lastModifiedByDisplayName?: string;
  lastModifiedBy?: string;
  lastModifiedByPhotoURL?: string;
  lastModifiedAt?: Date;
  tags?: Tags[];
}
```

## Testing

1. **Running Tests**

```bash
npm run test
```

2. **Writing Tests**

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { YourComponent } from './YourComponent';

describe('YourComponent', () => {
  it('should render correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## Common Issues & Solutions

### Firebase Authentication Issues

- Ensure your Firebase config is correct in `.env`
- Check if the authentication methods are enabled in Firebase Console
- Verify the authorized domains in Firebase Console

### Build Issues

- Clear the cache: `npm run clean`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npm run type-check`

### Database Sync Issues

- Check Firebase Console for any permission errors
- Verify IndexedDB is working in your browser
- Check the network tab for API errors

## Performance Optimization

1. **Code Splitting**

- Use React.lazy for route-based code splitting
- Implement dynamic imports for heavy components

2. **Bundle Size**

- Monitor bundle size: `npm run analyze`
- Use tree-shaking friendly imports
- Implement proper code splitting

3. **Image Optimization**

- Use WebP format when possible
- Implement lazy loading for images
- Use appropriate image sizes

## Deployment

1. **Production Build**

```bash
npm run build
```

2. **Testing Production Build Locally**

```bash
npm run preview
```

3. **Deployment Checklist**

- Run all tests
- Check bundle size
- Verify PWA functionality
- Test offline capabilities
- Verify Firebase rules
