import { GoogleOAuthProvider } from '@react-oauth/google';

interface GoogleAuthProviderProps {
  children: React.ReactNode;
}

/**
 * A React component that provides Google OAuth authentication context to its children.
 * It retrieves the Google OAuth client ID from environment variables and wraps its children
 * with the GoogleOAuthProvider if the client ID is available.
 *
 * @param {Object} props - The properties for the component.
 * @param {React.ReactNode} props.children - The child components that will have access to the Google OAuth context.
 *
 * @returns {React.ReactNode} The rendered component, which either wraps the children in a GoogleOAuthProvider
 *                            or returns the children directly if the client ID is not found.
 *
 * @throws {Warning} Logs a warning to the console if the Google OAuth client ID is not found.
 *
 * @example
 * // Usage of GoogleAuthProvider in a React application
 * <GoogleAuthProvider>
 *   <YourComponent />
 * </GoogleAuthProvider>
 */
export function GoogleAuthProvider({ children }: GoogleAuthProviderProps) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    console.warn('Google OAuth client ID not found. Google Docs import will not work.');
    return <>{children}</>;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  );
} 