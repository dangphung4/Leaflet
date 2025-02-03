# Contributing to Notes PWA

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct. Please report unacceptable behavior to [dangphung4@gmail.com].

## How Can I Contribute?

### Reporting Bugs

Please check existing issues and if it's not already reported, please create a new issue using our [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml).

### Suggesting Enhancements

If you have a suggestion for the project, please first read the existing issues to see if it's already been proposed. If it hasn't, feel free to create a new issue using our [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml).

### Pull Requests

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code follows our coding standards.
6. Test your changes locally.
7. You can issue pull request if app is working as expected.

## Development Setup

1. Install dependencies:

```bash
cd notes
npm install
```

2. Set up environment variables:
Create a `.env` file in the `/notes` directory:

```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id  # Required for Google Docs import/export

# optional for now
VITE_GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
VITE_APP_URL=your_app_url
```

For Google OAuth setup, follow the instructions in DEVELOPMENT.md.

3. Start the development server:

```bash
npm run dev
```

### Development with .NET Aspire

```bash
cd NotesAspire/NotesAspire.Host
dotnet run
```

## Coding Standards

### TypeScript Guidelines

- Use TypeScript for all code files
- Prefer interfaces over types for object definitions
- Use strict type checking
- Define explicit return types for functions
- Use generics appropriately

Example:

```typescript
interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}
```

### React Patterns

Follow our component structure:

```typescript
export const Component = ({ prop1, prop2 }: ComponentProps) => {
  // 1. Hooks
  const [state, setState] = useState(initialState);
  
  // 2. Derived state
  const derivedValue = useMemo(() => {
    // Computation
  }, [dependencies]);
  
  // 3. Event handlers
  const handleEvent = useCallback(() => {
    // Handler logic
  }, [dependencies]);
  
  // 4. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};
```

### Directory Structure

```md
/src
  /components
    /[feature]
      /ui           # Reusable UI components
      /hooks        # Custom hooks
      /utils        # Helper functions
      /types        # TypeScript interfaces
  /lib             # Core utilities and configurations
  /stores          # State management
  /styles          # Global styles and Tailwind config
  /pages           # Route components
  /api             # API integration layer
```

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```git

<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:

- feat: A new feature
- fix: A bug fix
- docs: Documentation changes
- style: Code style changes (formatting, missing semi colons, etc)
- refactor: Code changes that neither fixes a bug nor adds a feature
- perf: Performance improvements
- test: Adding missing tests or correcting existing tests
- build: Changes that affect the build system or external dependencies
- ci: Changes to our CI configuration files and scripts
- chore: Other changes that don't modify src or test files

Example:

```m

feat(editor): add support for markdown shortcuts

Implements markdown shortcut functionality in the editor component.
Shortcuts include:
- # for headings
- ** for bold
- * for italic

Closes #123
```

## Testing

- Write unit tests for critical functionality
- Use React Testing Library for component tests
- Mock Firebase and IndexedDB appropriately

Example:

```typescript
describe('NoteEditor', () => {
  it('should save changes when clicking save button', async () => {
    // Test implementation
  });
});
```

## Documentation

- Document complex logic
- Add JSDoc comments for public APIs
- Keep README up to date

Example:

```typescript
/**
 * Synchronizes local notes with the remote server.
 * Handles conflict resolution and retry logic.
 * @param noteId - The ID of the note to sync
 * @returns Promise that resolves when sync is complete
 */
async function syncNote(noteId: string): Promise<void> {
  // Implementation
}
```

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
