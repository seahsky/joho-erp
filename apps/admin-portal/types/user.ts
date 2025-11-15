/**
 * Serializable user data type for passing from Server to Client Components
 *
 * This is a plain object that can be JSON-serialized across the Server/Client boundary.
 * It contains only the essential user information needed by Client Components.
 *
 * Unlike the Clerk User class instance (which has methods and prototypes),
 * this type can safely be passed as props to Client Components.
 */
export type SerializableUser = {
  firstName: string | null;
  lastName: string | null;
  emailAddress: string | null;
} | null;
