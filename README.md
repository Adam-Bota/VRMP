# Software Design Document: Virtual Cinema

## Introduction

The Virtual Cinema project is a web application designed to allow users to watch videos together in synchronized sessions. It enables users to create, join, and manage watch sessions, with features for real-time synchronization of video playback, chat (using Firebase Realtime Database), and participant management. The primary goal is to provide a shared viewing experience for remote users.

## System Overview

The system is a full-stack web application. The frontend is built with Next.js and React (TypeScript). Backend services include:
*   **Firebase**: For authentication, as a NoSQL database (Firestore), and for real-time chat (Realtime Database).
*   **Express.js Server (Node.js)**: Handles real-time WebSocket communication for session synchronization.
*   **Jitsi Meet Server**: A separate server dedicated to video/voice chat functionality during sessions.

The application allows users to search for videos, create synchronized watch sessions, and communicate via chat and video/voice.

*(Placeholder for System Overview Diagram: A high-level diagram showing the main components: Web Client, Firebase Authentication, NoSQL DB (Firebase), WebSocket Server, and potentially an external video service like YouTube.)*

## Design Considerations

*   **Real-time Synchronization**: Achieved via WebSockets managed by the Express.js server.
*   **Scalability**: Firebase for auth/DB; dedicated servers for WebSockets and Jitsi.
*   **User Experience**: Intuitive session management and integrated communication.
*   **Modularity**: Clear separation between frontend, Firebase services, WebSocket server, and Jitsi server.
*   **Security**: User authentication and authorization are critical. Firestore rules are used to manage data access.
*   **Maintainability**: Using TypeScript and a structured project layout aids in maintainability.

## Architectural Design

The application uses a distributed architecture:

*   **Client-Side (Frontend)**: Next.js/React application for UI and user interaction.
*   **Backend Services**:
    *   **Firebase**: Handles user authentication and data persistence (Firestore).
    *   **Express.js WebSocket Server**: Manages real-time data exchange for video sync, chat, and session state.
    *   **Jitsi Meet Server**: Provides video conferencing capabilities, integrated into the client.
*   **External Services**:
    *   Likely YouTube for video streaming.

*(Placeholder for a simplified Architectural Diagram)*

## Data Design

### Data Models

Key data entities include:

*   **User**: (Stored in Firestore `users` collection)
    *   `id` (UID from Firebase Auth)
    *   `email`
    *   `displayName`
    *   `photoURL`
    *   `createdAt`
    *   `lastLoginAt`
    *   `role` (e.g., 'user')
    

*   **Session**: (Stored in Firestore `sessions` collection)
    *   `id` (auto-generated or custom)
    *   `title`
    *   `videoId`
    *   `createdBy` (User ID)
    *   `moderator` (User ID)
    *   `participants`: Array of User IDs currently in the session.
    *   `invitedParticipants`: Map of User IDs to boolean (acceptance status for video-specific sessions).
    *   `startTime`: Default start time for the video in the session.
    *   `endTime`: Default end time for the video in the session.
    *   `createdAt`: Timestamp.
    *   `status`: "scheduled" | "live" | "ended".
    *   `currentVideoProgress`: (Potentially in Realtime DB for live updates)
    *   `isPlaying`: (Potentially in Realtime DB for live updates)
    *   `lastKnownHostTime`: (Potentially in Realtime DB for live updates)

*   **VideoDocument**: (Stored in Firestore `videos` collection)
    *   `id` (e.g., YouTube video ID)
    *   `title`
    *   `sessions`: Map of `sessionId` to `VideoSession` details (title, startTime, endTime, createdBy, createdAt, status, activeParticipants, invitedParticipants). This seems to allow multiple sessions per video.

*   **Realtime Session Data**: (Handled by WebSocket server, potentially stored temporarily or relayed directly)
    *   `currentTime`: Current playback time, frequently updated by the moderator/host.
    *   `isPlaying`: Boolean, current playback state.
    *   `lastUpdatedBy`: User ID of the person who last updated the state.
    *   `participants_status`: Map of `userId` to their status (e.g., 'active', 'inactive', 'buffering').
*   **Chat Messages**: (Stored in Firebase Realtime Database `chatMessages/{sessionId}`)
    *   `userId`
    *   `messageText`
    *   `timestamp`

### Database Schema

*   **Firestore**:
    *   `users/{userId}`: Stores user profile information and their active session.
    *   `sessions/{sessionId}`: Stores persistent session information.
    *   `videos/{videoId}`: Stores metadata about videos and the sessions associated with them.
    *   `metadata/sessions`: Potentially stores aggregated metadata about sessions for quick lookups.
    *   `metadata/videos`: Potentially stores aggregated metadata about videos.
*   **Firebase Realtime Database**:
    *   `chatMessages/{sessionId}`: Stores chat messages for each session.
*   **WebSocket Communication**:
    *   Used for transient, frequently changing data related to active sessions, such as playback state and participant heartbeats. Data is typically broadcast to connected clients in a session.

### Data Flow

1.  **User Authentication**: User signs up/logs in via Firebase Auth. A corresponding user document is created/updated in Firestore.
2.  **Session Creation**: Authenticated user creates a session. A new document is added to the `sessions` collection in Firestore. If tied to a specific video, the `videos` collection might also be updated. The WebSocket server is notified to manage the real-time aspects of this new session.
3.  **Joining Session**: User joins an existing session. Their ID is added to the `participants` list in the Firestore session document. The WebSocket server manages their connection to the session's real-time updates. The user's `activeSession` field in their Firestore document is updated.
4.  **Video Playback Synchronization**: The session moderator's player state (play/pause, seek) is broadcast via WebSockets. Other participants' players subscribe to these messages and adjust their playback accordingly.
5.  **Chat**: User sends a chat message. The message is written to Firebase Realtime Database under the current `sessionId`. All clients subscribed to that session's chat data receive real-time updates.
6.  **Leaving Session**: User leaves a session. Their ID is removed from participants lists, and their `activeSession` field is cleared. The WebSocket server handles their disconnection from real-time updates.
7.  **Data Cleanup**: Functions might be in place (or planned, per `sessions.prompt.md`) to clean up old/inactive data from Firestore. WebSocket connections are inherently transient. Chat messages in Realtime Database might also have a cleanup strategy (e.g., TTL or periodic deletion).

*(Placeholder for Data Flow Diagram: A diagram illustrating how data moves between the client, Firestore, Firebase Realtime Database, and the WebSocket server for key operations like login, session creation, joining, playback sync, and chat.)*

## Component Design

The project is structured into a monorepo with `apps` and `packages`.

### `apps/web`

This is the main Next.js application.

*   **`app/`**: Contains the Next.js App Router structure.
    *   `(auth)/`: Layout and pages for authentication (login, signup).
        *   `AuthForm`: Reusable component for login/signup forms.
    *   `(dashboard)/`: Layout and pages for the main application dashboard.
        *   `page.tsx`: Handles creation and joining of sessions.
        *   `session/[id]/`: Dynamic route for an active session.
            *   `yt/client.tsx`: Likely the client component for rendering the YouTube player within a session.
        *   `components/`: UI components specific to the dashboard (e.g., `ActiveSessionUI`, `NoSessionUI`, `LoadingScreen`).
    *   `api/`: API routes (e.g., `/api/youtube` for YouTube service interaction).
*   **`components/`**: Global components used across the web application.
    *   `app-sidebar.tsx`: Main application sidebar, likely showing session controls, user info, etc.
    *   `auth-provider.tsx`: Context provider for authentication state.
    *   `youtube-player.tsx`: Core component for embedding and controlling a YouTube player.
    *   `youtube-player-sync.tsx`: Component responsible for synchronizing the YouTube player with Realtime DB state.
    *   `session-panel.tsx`: Panel for managing sessions, creating new ones, listing active ones.
    *   `session/`: Components related to session management.
        *   `session-creation-form.tsx`: Form for creating new watch sessions.
        *   `active-sessions-list.tsx`: Lists currently active sessions.
        *   `session-item.tsx`: Represents a single session in a list.
*   **`services/`**: Modules for interacting with backend services (Firebase).
    *   `users.ts`: Functions for user data management (CRUD operations on Firestore `users` collection).
    *   `sessions.ts`: Functions for session data management (CRUD on Firestore `sessions`, joining/leaving sessions).
    *   `videos.ts`: Functions for video metadata management (CRUD on Firestore `videos` collection).
    *   `realtime/sessions.ts`: (This would change to WebSocket client-side logic for sending/receiving synchronization messages).
*   **`types/`**: TypeScript type definitions (e.g., `User`, `Session`, `VideoDocument`).
*   **`providers/`**: React context providers (e.g., `youtube-player-provider.tsx`, `confirm-provider.tsx`).
*   **`lib/`**: Utility functions (e.g., `time-utils.ts`, `youtube.ts`).

### `packages/ui`

A shared UI component library.

*   **`src/components/`**: Contains reusable UI components built with Radix UI primitives and Tailwind CSS. Examples:
    *   `Button`
    *   `Card`
    *   `Dialog`
    *   `Input`
    *   `Sidebar`
    *   `Slider`
    *   `Form`
    *   `Sheet`
*   **`src/lib/utils.ts`**: Utility functions like `cn` for merging class names.
*   **`src/styles/globals.css`**: Global styles and Tailwind CSS setup.

*(Placeholder for Component Interaction Diagram: A diagram showing how major components like `AppSidebar`, `YoutubePlayerSync`, `SessionPanel`, and service modules interact.)*

## Interface Design

### Backend Service Interfaces (Firebase & WebSockets)

*   **Authentication**: Standard Firebase Authentication APIs (email/password, Google Sign-In).
*   **Firestore (`services/*.ts`)**:
    *   `createUserIfNotExists(authUser)`
    *   `getUserById(userId)`
    *   `setUserSession(userId, session)`
    *   `clearUserSession(userId)`
    *   `createSession(sessionData)`
    *   `getSessionById(sessionId)`
    *   `updateSessionDetails(sessionId, updateData)`
    *   `joinSession(sessionId, userId)`
    *   `leaveSession(sessionId, userId)`
    *   `deleteSession(sessionId)`
    *   `saveVideoDocument(videoId, data)`
    *   `addSessionToVideo(videoId, sessionId, sessionData)`
    *   `subscribeToSessionsMeta(callback)`
    *   `subscribeToUserDoc(userId, callback)`
*   **Firebase Realtime Database (for Chat)**:
    *   Client-side functions to write chat messages to `chatMessages/{sessionId}`.
    *   Client-side functions to subscribe to `chatMessages/{sessionId}` for real-time updates.
*   **WebSocket Messages (`services/realtime/sessions.ts` or equivalent client-side WebSocket handler)**:
    *   Client-side functions to connect to WebSocket server for a session.
    *   Client-side functions to send updates (e.g., moderator pushing new time, chat messages).
    *   Client-side event handlers for receiving session state changes (e.g., playback time, play/pause status, new chat messages, participant updates).
    *   `updateScreenState(sessionId, userId, state)` (message sent via WebSocket)

### Frontend Component Props

*   Components are designed with well-defined props for reusability and type safety (TypeScript).
*   Example: `SessionItemProps` in `session-item.tsx` includes `sessionId`, `session` (data), `videoId`, `currentUserId`.

### API Routes (`apps/web/api/`)

*   `/api/youtube`: Likely used for fetching YouTube video data or search results, abstracting direct client-side calls to YouTube API if needed.

## User Interface Design

The UI is built using React components, styled with Tailwind CSS, and leverages a shared UI library (`packages/ui`) based on Radix UI primitives.

*   **Layout**:
    *   A main dashboard layout (`apps/web/app/(dashboard)/layout.tsx`) likely featuring a persistent sidebar (`AppSidebar`) and a content area.
    *   Resizable panels are used for layout flexibility.
*   **Key UI Elements**:
    *   **Authentication Forms**: For login and signup (`AuthForm`).
    *   **Session Creation/Joining**:
        *   Forms to create new sessions (`session-creation-form.tsx`, `NoSessionUI` for create/join actions).
        *   Lists of active sessions (`active-sessions-list.tsx`).
    *   **Video Player View**:
        *   Embedded YouTube player (`youtube-player.tsx`).
        *   Controls for playback, potentially seeking previews (`VideoSeekingPreview`).
    *   **Sidebar (`AppSidebar`)**:
        *   Navigation.
        *   Session actions (Invite, Leave, Search for video if moderator).
        *   User profile/actions (`NavUser`).
        *   Jitsi meeting integration for voice/video chat (`JaasMeetingWrapper`).
*   **Styling**:
    *   Consistent styling is achieved through Tailwind CSS and shared UI components.
    *   Dark mode support is implemented (`next-themes`).
*   **Responsiveness**: The UI is expected to be responsive, with mobile-specific handling for elements like the sidebar (using `Sheet` component for off-canvas display).

*(Placeholder for UI Mockups/Sketches: A few key screen mockups, e.g., Dashboard, Session Creation, Active Session View with Player and Chat.)*

## Security Design

*   **Authentication**: Firebase Authentication handles user identity.
    *   Supports email/password and Google Sign-In.
*   **Authorization (Data Access Control)**:
    *   Firestore Security Rules (`firestore.rules`) are implemented to control access to data in the NoSQL DB.
        *   Users can typically read/write their own user documents.
        *   Rules for session creation, joining, updating, and deleting are defined (e.g., only session creator can delete).
        *   Read access to sessions might be public or restricted based on invitation.
    *   WebSocket connections would need their own authentication/authorization mechanism (e.g., token-based auth on connection, ensuring users can only join sessions they are permitted to).
*   **Input Validation**:
    *   Form validation is implemented using `zod` and `react-hook-form` (e.g., `AuthForm`, `session-creation-form.tsx`).
*   **API Security**:
    *   If custom API routes exist (e.g., `/api/youtube`), they should implement proper authentication and authorization checks.
*   **Dependencies**: Security of third-party libraries (NPM packages) is a consideration. Regular updates and audits are advisable.

## Performance Requirements

*   **Real-time Updates**: Low latency for session synchronization (playback state, chat) is critical. WebSockets are chosen for this.
*   **Page Load Times**: Optimized for fast initial load, leveraging Next.js features (SSR, SSG, code splitting).
*   **Database Queries**: Efficient Firestore queries and data structures to minimize read/write times. Denormalization or aggregated metadata (in `metadata` collections) might be used for performance.
*   **Scalability**: Firebase services are designed to scale, but application logic and data structures should also be designed with scalability in mind.
*   **Buffering**: Handling video buffering for users with slower connections is mentioned as a requirement (`sessions.prompt.md`), with a "catch up" button.

## Error Handling and Logging

*   **Client-Side Error Handling**:
    *   Try-catch blocks in service calls and component logic.
    *   User feedback for errors using toasts (`sonner` library).
    *   Form validation messages.
*   **Server-Side Error Handling (Firebase Functions, if any)**:
    *   Proper error responses and logging.
*   **Logging**:
    *   `console.error` and `console.log` are used for debugging during development.
    *   For production, a more robust logging solution (e.g., integrating with a cloud logging service) would be beneficial.
    *   Firestore debug log (`firestore-debug.log`) is present, likely for local Firebase emulator debugging.
*   **Firebase Error Codes**: Handling specific error codes from Firebase services.

## Design Constraints

*   **Technology Stack**: Primarily Next.js, React, TypeScript, Firebase (Auth, Firestore, Realtime Database), WebSockets, Tailwind CSS.
*   **External Dependencies**: Reliance on Firebase platform and potentially YouTube API.
*   **Real-time Nature**: The need for real-time synchronization imposes constraints on data flow and backend choices (WebSockets).
*   **Development Resources/Time**: (Not specified, but always a factor).
*   **Browser Compatibility**: (Not specified, but modern browsers are typically targeted).

## Assumptions and Dependencies

### Assumptions

*   Users have stable internet connections for a good experience, though buffering handling is considered.
*   YouTube videos are the primary content source.
*   Users will primarily interact via web browsers on desktop or mobile devices.
*   Firebase services meet the scalability and reliability needs.

### Dependencies

*   **Firebase SDKs**: `firebase` (for client-side), `firebase-admin` (potentially for server-side logic if any, though not explicitly seen in services).
*   **Next.js and React**: Core frontend framework.
*   **`@jitsi/react-sdk`**: For Jitsi video conferencing integration.
*   **`lucide-react`**: For icons.
*   **`@radix-ui/*`**: For UI primitives.
*   **`tailwindcss`**: For styling.
*   **`zod`**: For schema validation.
*   **`react-hook-form`**: For form handling.
*   **`sonner`**: For toast notifications.
*   **`pnpm`**: Package manager.
*   **`turbo`**: Monorepo build system.

## Appendices

*   **Project Structure**: (Can refer to the workspace structure provided in the context).
*   **Key Configuration Files**:
    *   `pnpm-workspace.yaml`
    *   `turbo.json`
    *   `apps/web/next.config.mjs`
    *   `apps/web/firebase.json`
    *   `apps/web/firestore.rules`
    *   `packages/ui/tailwind.config.js` (or equivalent postcss config)
